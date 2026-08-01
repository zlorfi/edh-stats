#!/bin/bash

##############################################################################
# EDH Stats Tracker - Production Deployment Script
#
# This script builds Docker images and pushes them to GitHub Container Registry
# Usage: ./deploy.sh [VERSION] [GHCR_TOKEN]
#
# Example: ./deploy.sh 1.0.0 ghcr_xxxxxxxxxxxxx
#
# Prerequisites:
#   - Docker and Docker Compose installed
#   - GitHub Personal Access Token (with write:packages permission)
#   - Set GITHUB_REGISTRY_USER environment variable or pass as argument
##############################################################################

set -euo pipefail  # Exit on error, unset variable, or any failure in a pipeline

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Restore any working-tree changes we made (e.g. version.txt) if we exit early.
_ORIGINAL_VERSION_FILE_CONTENT=""
_VERSION_FILE_PATH="./frontend/static/version.txt"
_VERSION_FILE_MODIFIED="false"

cleanup_on_exit() {
    local exit_code=$?
    if [ "$exit_code" -ne 0 ] && [ "$_VERSION_FILE_MODIFIED" = "true" ]; then
        printf '%b\n' "${YELLOW}⚠ Deployment failed; restoring ${_VERSION_FILE_PATH}${NC}" >&2
        printf '%s' "$_ORIGINAL_VERSION_FILE_CONTENT" > "$_VERSION_FILE_PATH"
    fi
    return $exit_code
}
trap cleanup_on_exit EXIT

# Configuration
REGISTRY="ghcr.io"
# GITHUB_USER is the GitHub username/org that owns the GHCR namespace.
# It MUST match your GitHub login (not your display name), otherwise the image
# paths (ghcr.io/<user>/...) will be wrong. Set it explicitly to be safe.
GITHUB_USER="${GITHUB_USER:-}"
PROJECT_NAME="edh-stats"
VERSION="${1:-latest}"
GHCR_TOKEN="${2:-${GHCR_TOKEN:-}}"

# Image names
BACKEND_IMAGE="${REGISTRY}/${GITHUB_USER}/${PROJECT_NAME}-backend:${VERSION}"
FRONTEND_IMAGE="${REGISTRY}/${GITHUB_USER}/${PROJECT_NAME}-frontend:${VERSION}"
BACKEND_IMAGE_LATEST="${REGISTRY}/${GITHUB_USER}/${PROJECT_NAME}-backend:latest"
FRONTEND_IMAGE_LATEST="${REGISTRY}/${GITHUB_USER}/${PROJECT_NAME}-frontend:latest"

##############################################################################
# Helper Functions
##############################################################################

print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

##############################################################################
# Validation
##############################################################################

validate_prerequisites() {
    print_header "Validating Prerequisites"

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker is installed"

    # Check if Docker daemon is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    print_success "Docker daemon is running"

    # Check if Docker buildx is available
    if ! docker buildx version > /dev/null 2>&1; then
        print_error "Docker buildx is required but not available."
        print_error "Install Docker Desktop or the docker-buildx-plugin package."
        exit 1
    fi
    print_success "Docker buildx is available"

    # Ensure a working builder instance exists and is bootstrapped.
    local builder_name="edh-stats-builder"
    if ! docker buildx inspect "$builder_name" > /dev/null 2>&1; then
        print_info "Creating buildx builder '${builder_name}'..."
        docker buildx create --name "$builder_name" --driver docker-container > /dev/null
    fi
    docker buildx use "$builder_name"
    if ! docker buildx inspect --bootstrap "$builder_name" > /dev/null 2>&1; then
        print_error "Failed to bootstrap buildx builder '${builder_name}'."
        exit 1
    fi
    print_success "Buildx builder '${builder_name}' ready"

    # Check if Git is installed
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    print_success "Git is installed"

    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a Git repository. Please run this script from the project root."
        exit 1
    fi
    print_success "Running from Git repository"

    # Resolve the GHCR namespace (GitHub username/org)
    if [ -z "$GITHUB_USER" ]; then
        # Best-effort guess from the 'origin' remote (github.com/<user>/<repo>)
        local guessed_user=""
        local origin_url
        origin_url="$(git config --get remote.origin.url 2>/dev/null || true)"
        if [[ "$origin_url" =~ github\.com[:/]([^/]+)/ ]]; then
            guessed_user="$(printf '%s' "${BASH_REMATCH[1]}" | tr '[:upper:]' '[:lower:]')"
        fi

        if [ -n "$guessed_user" ]; then
            GITHUB_USER="$guessed_user"
            print_warning "GITHUB_USER not set; guessed '${GITHUB_USER}' from git remote."
            print_info "If this is wrong, re-run with: GITHUB_USER=<login> ./deploy.sh ..."
        else
            print_error "GITHUB_USER is not set and could not be inferred from the git remote."
            print_error "Set it explicitly: GITHUB_USER=<github-login> ./deploy.sh ${VERSION}"
            exit 1
        fi
    fi
    print_success "GHCR namespace: ${GITHUB_USER}"

    # Recompute image names now that GITHUB_USER is finalized
    BACKEND_IMAGE="${REGISTRY}/${GITHUB_USER}/${PROJECT_NAME}-backend:${VERSION}"
    FRONTEND_IMAGE="${REGISTRY}/${GITHUB_USER}/${PROJECT_NAME}-frontend:${VERSION}"
    BACKEND_IMAGE_LATEST="${REGISTRY}/${GITHUB_USER}/${PROJECT_NAME}-backend:latest"
    FRONTEND_IMAGE_LATEST="${REGISTRY}/${GITHUB_USER}/${PROJECT_NAME}-frontend:latest"

    # Warn about the 'latest' anti-pattern for reproducible deploys
    if [ "$VERSION" = "latest" ]; then
        print_warning "No version supplied; deploying as 'latest' only (not reproducible)."
        print_info "Recommended: ./deploy.sh <semver>  e.g.  ./deploy.sh 2.5.0"
    fi
}

##############################################################################
# Git working tree check
##############################################################################

check_git_clean() {
    print_header "Checking Git Working Tree"

    if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
        print_warning "You have uncommitted changes. Images built now will NOT be reproducible from a commit."
        git status --short
        printf '%b' "${YELLOW}Continue anyway? [y/N]: ${NC}"
        read -r reply
        case "$reply" in
            [yY][eE][sS]|[yY]) print_info "Proceeding with a dirty working tree." ;;
            *) print_error "Aborting. Commit or stash your changes first."; exit 1 ;;
        esac
    else
        print_success "Working tree is clean"
    fi

    print_info "Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
}

check_github_token() {
    if [ -z "$GHCR_TOKEN" ]; then
        print_warning "GitHub token not provided."
        print_info "Set GHCR_TOKEN env var or pass it as the second argument to skip this prompt."
        read -rsp "Enter GitHub Container Registry Token (or press Enter to use existing 'docker login'): " GHCR_TOKEN
        echo
    fi
}

update_version_file() {
    print_header "Updating Version File"

    local version_file="$_VERSION_FILE_PATH"

    # Snapshot current content so the EXIT trap can restore it on failure.
    if [ -f "$version_file" ]; then
        _ORIGINAL_VERSION_FILE_CONTENT="$(cat "$version_file")"
        print_info "Current version: $(printf '%s' "$_ORIGINAL_VERSION_FILE_CONTENT" | tr -d '\n')"
    fi

    # Update version file with new version (strip 'v' prefix if present)
    local new_version="${VERSION#v}"
    printf '%s\n' "$new_version" > "$version_file"
    _VERSION_FILE_MODIFIED="true"
    print_success "Updated version file to: $new_version"
}

##############################################################################
# Build Functions
##############################################################################

build_backend() {
    print_header "Building Backend Image"

    print_info "Building: ${BACKEND_IMAGE}"
    print_info "Building for architectures: linux/amd64"

    docker buildx build \
        --platform linux/amd64 \
        --file ./backend/Dockerfile \
        --target production \
        --tag "${BACKEND_IMAGE}" \
        --tag "${BACKEND_IMAGE_LATEST}" \
        --build-arg NODE_ENV=production \
        --push \
        ./backend

    print_success "Backend image built and pushed successfully"
}

build_frontend() {
    print_header "Building Frontend Image (SvelteKit)"

    print_info "Building: ${FRONTEND_IMAGE}"
    print_info "Building for architectures: linux/amd64"

    # SvelteKit multi-stage build with Vite bundler
    # Automatically handles cache busting with hashed filenames

    docker buildx build \
        --platform linux/amd64 \
        --file ./frontend/Dockerfile.svelte \
        --tag "${FRONTEND_IMAGE}" \
        --tag "${FRONTEND_IMAGE_LATEST}" \
        --push \
        ./frontend

    print_success "Frontend image built and pushed successfully"
}

##############################################################################
# Push Functions
##############################################################################

login_to_registry() {
    print_header "Authenticating with GitHub Container Registry"

    if [ -n "$GHCR_TOKEN" ]; then
        print_info "Logging in to ${REGISTRY} as ${GITHUB_USER}..."
        if ! printf '%s' "$GHCR_TOKEN" | docker login "${REGISTRY}" -u "${GITHUB_USER}" --password-stdin; then
            print_error "Docker login failed. Check GITHUB_USER and that the token has 'write:packages'."
            exit 1
        fi
        print_success "Authenticated with registry"
    else
        # No token: verify we already have working credentials for this registry.
        print_info "No token provided; checking for existing credentials for ${REGISTRY}..."
        if docker system info 2>/dev/null | grep -qi "${REGISTRY}" \
           || [ -f "${HOME}/.docker/config.json" ] && grep -q "${REGISTRY}" "${HOME}/.docker/config.json" 2>/dev/null; then
            print_success "Using existing Docker credentials for ${REGISTRY}"
        else
            print_warning "No stored credentials for ${REGISTRY} detected. Running 'docker login'..."
            if ! docker login "${REGISTRY}"; then
                print_error "Docker login failed."
                exit 1
            fi
            print_success "Authenticated with registry"
        fi
    fi
}

verify_images() {
    print_header "Verifying Pushed Images"

    # Confirm the versioned images are actually present in the registry.
    local ok=true
    for img in "${BACKEND_IMAGE}" "${FRONTEND_IMAGE}"; do
        if docker buildx imagetools inspect "$img" > /dev/null 2>&1; then
            print_success "Verified in registry: ${img}"
        else
            print_error "Could not verify image in registry: ${img}"
            ok=false
        fi
    done

    if [ "$ok" != "true" ]; then
        print_error "Image verification failed."
        exit 1
    fi
}

##############################################################################
# Generate Configuration
##############################################################################

generate_deployment_config() {
    print_header "Generating Deployment Configuration"

    local config_file="docker-compose.prod.deployed.yml"

    print_info "Creating deployment configuration: ${config_file}"

    cat > "${config_file}" << EOF
# Generated production deployment configuration
# Version: ${VERSION}
# Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')
# GitHub User: ${GITHUB_USER}
#
# IMPORTANT: Prerequisites
#   - Traefik must be running with 'traefik-network' created
#   - Create a .env file with these variables:
#   DB_NAME=edh_stats
#   DB_USER=postgres
#   DB_PASSWORD=\$(openssl rand -base64 32)
#   JWT_SECRET=\$(openssl rand -base64 32)
#   CORS_ORIGIN=https://yourdomain.com
#   LOG_LEVEL=warn
#   ALLOW_REGISTRATION=false
#   DB_SEED=false
#
# FIRST TIME SETUP:
# 1. Ensure Traefik is running and traefik-network exists
# 2. Update frontend domain in labels (edh.example.com -> yourdomain.com)
# 3. Create .env file with above variables
# 4. Run: docker-compose -f docker-compose.prod.deployed.yml up -d
# 5. Database migrations will run automatically via db-migrate service
# 6. Monitor logs: docker-compose logs -f db-migrate

services:
  # PostgreSQL database service
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=\${DB_USER:-postgres}
      - POSTGRES_PASSWORD=\${DB_PASSWORD}
      - POSTGRES_DB=\${DB_NAME}
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
      - ./scripts:/scripts:ro
      - ./backups:/backups
    healthcheck:
      test: ['CMD-SHELL', 'PGPASSWORD=\${DB_PASSWORD} pg_isready -U postgres -h localhost']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - edh-stats-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  # Database migration service - runs once on startup
  db-migrate:
    image: ${BACKEND_IMAGE}
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - NODE_ENV=production
      - DB_HOST=\${DB_HOST:-postgres}
      - DB_NAME=\${DB_NAME}
      - DB_USER=\${DB_USER:-postgres}
      - DB_PASSWORD=\${DB_PASSWORD}
    command: node src/database/migrate.js migrate
    networks:
      - edh-stats-network
    restart: 'no'

  backend:
    image: ${BACKEND_IMAGE}
    ports:
      - '3002:3000'
    depends_on:
      db-migrate:
        condition: service_completed_successfully
    environment:
      - NODE_ENV=production
      - DB_HOST=\${DB_HOST:-postgres}
      - DB_NAME=\${DB_NAME}
      - DB_USER=\${DB_USER:-postgres}
      - DB_PASSWORD=\${DB_PASSWORD}
      - JWT_SECRET=\${JWT_SECRET}
      - CORS_ORIGIN=\${CORS_ORIGIN:-https://yourdomain.com}
      - LOG_LEVEL=\${LOG_LEVEL:-warn}
      - ALLOW_REGISTRATION=\${ALLOW_REGISTRATION:-false}
      - MAX_USERS=\${MAX_USERS:-}
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - edh-stats-network
    stop_grace_period: 30s

  frontend:
    image: ${FRONTEND_IMAGE}
    restart: unless-stopped
    healthcheck:
      # nginx:alpine ships wget (used by the image's own HEALTHCHECK), not curl.
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:80/health']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - edh-stats-network
      - traefik-network
    depends_on:
      backend:
        condition: service_healthy
    labels:
      - traefik.enable=true
      - traefik.http.routers.edh-stats-frontend.rule=Host(\`edh.zlor.fi\`)
      - traefik.http.routers.edh-stats-frontend.entrypoints=websecure
      - traefik.http.routers.edh-stats-frontend.service=edh-stats-frontend
      - traefik.http.services.edh-stats-frontend.loadbalancer.server.port=80
      - traefik.http.routers.edh-stats-frontend.tls=true
      - traefik.http.routers.edh-stats-frontend.tls.certresolver=letsencrypt-cloudflare
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'
        reservations:
          memory: 128M
          cpus: '0.125'

# Note: postgres uses a bind mount (./postgres_data) above, so no named
# volume is declared here. Ensure ./postgres_data, ./scripts and ./backups
# exist next to this compose file before starting.

networks:
  edh-stats-network:
    driver: bridge

  traefik-network:
    external: true
    name: traefik-network
EOF

    print_success "Deployment configuration generated: ${config_file}"
}

##############################################################################
# Summary
##############################################################################

print_summary() {
    print_header "Deployment Summary"

    echo "Backend Image:  ${BACKEND_IMAGE}"
    echo "Frontend Image: ${FRONTEND_IMAGE}"
    echo ""
    echo "Latest Tags:"
    echo "  Backend:  ${BACKEND_IMAGE_LATEST}"
    echo "  Frontend: ${FRONTEND_IMAGE_LATEST}"
    echo ""
    echo "Registry: ${REGISTRY}"
    echo "GitHub User: ${GITHUB_USER}"
    echo "Version: ${VERSION}"
    echo ""
    echo "Version Management:"
    echo "  Frontend version file updated: ./frontend/static/version.txt"
    echo "  SvelteKit with automatic cache busting (hashed filenames)"
    echo ""
    echo "Next Steps:"
    echo "  1. Commit version update:"
    echo "     git add frontend/static/version.txt"
    echo "     git commit -m \"Bump version to ${VERSION#v}\""
    echo "  2. Pull images: docker pull ${BACKEND_IMAGE}"
    echo "  3. Create .env file with PostgreSQL credentials:"
    echo "     DB_PASSWORD=\$(openssl rand -base64 32)"
    echo "     JWT_SECRET=\$(openssl rand -base64 32)"
    echo "  4. Set production secrets:"
    echo "     - CORS_ORIGIN=https://yourdomain.com"
    echo "     - ALLOW_REGISTRATION=false"
    echo "  5. Deploy: docker-compose -f docker-compose.prod.deployed.yml up -d"
    echo "  6. Monitor migrations: docker-compose logs -f db-migrate"
    echo ""
}

##############################################################################
# Main Execution
##############################################################################

main() {
    print_header "EDH Stats Tracker - Production Deployment"

    print_info "Starting deployment process..."
    print_info "Version: ${VERSION}"
    print_info "Registry: ${REGISTRY}"
    echo ""

    # 1. Validate tooling and resolve GITHUB_USER / image names
    validate_prerequisites

    # 2. Refuse (or confirm) building from a dirty tree for reproducibility
    check_git_clean

    # 3. Obtain a token if needed
    check_github_token

    # 4. Authenticate (must happen before build so --push works)
    login_to_registry

    # 5. Bump version file (baked into frontend build; restored on failure by trap)
    update_version_file

    # 6. Build + push images (buildx --push handles the upload)
    build_backend
    build_frontend

    # 7. Confirm the images actually landed in the registry
    verify_images

    # 8. Generate the deployment compose file
    generate_deployment_config

    # 9. Summary / next steps
    print_summary

    print_success "Deployment completed successfully!"
}

# Run main function
main "$@"
