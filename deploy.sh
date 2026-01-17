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

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="ghcr.io"
GITHUB_USER="${GITHUB_USER:=$(git config --get user.name | tr ' ' '-' | tr '[:upper:]' '[:lower:]')}"
PROJECT_NAME="edh-stats"
VERSION="${1:-latest}"
GHCR_TOKEN="${2}"

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
        print_warning "Docker buildx not found. Creating builder..."
        docker buildx create --use --name multiarch-builder > /dev/null 2>&1 || true

        if ! docker buildx version > /dev/null 2>&1; then
            print_error "Docker buildx is required for multi-architecture builds."
            print_error "Please ensure you have Docker with buildx support."
            exit 1
        fi
        print_success "Docker buildx enabled"
    else
        print_success "Docker buildx is available"
    fi

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
}

check_github_token() {
    if [ -z "$GHCR_TOKEN" ]; then
        print_warning "GitHub token not provided. You'll be prompted for credentials when pushing."
        print_info "Set GHCR_TOKEN environment variable or pass as second argument to skip this prompt"
        read -sp "Enter GitHub Container Registry Token (or press Enter to use 'docker login'): " GHCR_TOKEN
        echo

        if [ -z "$GHCR_TOKEN" ]; then
            print_info "Attempting to use existing Docker credentials..."
            if ! docker info | grep -q "Username"; then
                print_warning "No Docker credentials found. Running 'docker login'..."
                docker login "${REGISTRY}"
            fi
        fi
    fi
}

update_version_file() {
    print_header "Updating Version File"

    local version_file="./frontend/public/version.txt"
    local current_version=""

    # Check if version file exists
    if [ -f "$version_file" ]; then
        current_version=$(cat "$version_file")
        print_info "Current version: $current_version"
    fi

    # Update version file with new version (strip 'v' prefix if present)
    local new_version="${VERSION#v}"
    echo "$new_version" > "$version_file"
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
    print_header "Building Frontend Image"

    print_info "Building: ${FRONTEND_IMAGE}"
    print_info "Building for architectures: linux/amd64"

    # Note: Dockerfile.prod is now a permanent file in the repository
    # It uses a multi-stage build to compile Tailwind CSS in production

    docker buildx build \
        --platform linux/amd64 \
        --file ./frontend/Dockerfile.prod \
        --tag "${FRONTEND_IMAGE}" \
        --tag "${FRONTEND_IMAGE_LATEST}" \
        --push \
        .

    print_success "Frontend image built and pushed successfully"
}

##############################################################################
# Push Functions
##############################################################################

login_to_registry() {
    print_header "Authenticating with GitHub Container Registry"

    if [ -n "$GHCR_TOKEN" ]; then
        print_info "Logging in with provided token..."
        echo "$GHCR_TOKEN" | docker login "${REGISTRY}" -u "${GITHUB_USER}" --password-stdin > /dev/null 2>&1
    else
        print_info "Using existing Docker authentication..."
    fi

    print_success "Successfully authenticated with registry"
}

push_backend() {
    print_header "Pushing Backend Image"

    # Images are already pushed during buildx build step
    print_success "Backend image already pushed: ${BACKEND_IMAGE}"
    print_success "Latest backend image pushed: ${BACKEND_IMAGE_LATEST}"
}

push_frontend() {
    print_header "Pushing Frontend Image"

    # Images are already pushed during buildx build step
    print_success "Frontend image already pushed: ${FRONTEND_IMAGE}"
    print_success "Latest frontend image pushed: ${FRONTEND_IMAGE_LATEST}"
}

##############################################################################
# Verification Functions
##############################################################################

verify_images() {
    print_header "Verifying Built Images"

    print_info "Note: Using buildx for optimized builds"
    print_info "Images are built for linux/amd64"
    print_info "Images are pushed directly to registry (not stored locally)"
    print_success "Backend image built and pushed: ${BACKEND_IMAGE}"
    print_success "Frontend image built and pushed: ${FRONTEND_IMAGE}"
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
     # IMPORTANT: Create a .env file with these variables:
     #   DB_HOST=postgres
     #   DB_PORT=5432
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
# 1. Create .env file with above variables
# 2. Run: docker-compose -f docker-compose.prod.deployed.yml up -d
# 3. Database migrations will run automatically via db-migrate service
# 4. Monitor logs: docker-compose logs -f db-migrate

services:
    # PostgreSQL database service
    postgres:
      image: postgres:16-alpine
      environment:
        - POSTGRES_USER=postgres
        - POSTGRES_PASSWORD=\${DB_PASSWORD}
        - POSTGRES_DB=\${DB_NAME}
      ports:
        - '\${DB_PORT:-5432}:5432'
      volumes:
        - postgres_data:/var/lib/postgresql/data
      healthcheck:
        test: ['CMD-SHELL', 'PGPASSWORD=\${DB_PASSWORD} pg_isready -U postgres -h localhost']
       interval: 10s
       timeout: 5s
       retries: 5
     networks:
       - edh-stats-network
     restart: unless-stopped
     command:
       - "postgres"
       - "-c"
       - "listen_addresses=*"
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
          - DB_PORT=\${DB_PORT:-5432}
          - DB_NAME=\${DB_NAME}
          - DB_USER=\${DB_USER:-postgres}
          - DB_PASSWORD=\${DB_PASSWORD}
          # Set DB_SEED=true to automatically seed database with sample data after migrations
          - DB_SEED=\${DB_SEED:-false}
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
        - DB_PORT=\${DB_PORT:-5432}
        - DB_NAME=\${DB_NAME}
        - DB_USER=\${DB_USER:-postgres}
        - DB_PASSWORD=\${DB_PASSWORD}
        - JWT_SECRET=\${JWT_SECRET}
        - CORS_ORIGIN=\${CORS_ORIGIN:-https://yourdomain.com}
        - LOG_LEVEL=\${LOG_LEVEL:-warn}
        - ALLOW_REGISTRATION=\${ALLOW_REGISTRATION:-false}
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
     ports:
       - '38080:80'
       - '30443:443'
     restart: unless-stopped
     healthcheck:
       test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:80/']
       interval: 10s
       timeout: 5s
       retries: 5
     networks:
       - edh-stats-network
     depends_on:
       - backend
     deploy:
       resources:
         limits:
           memory: 256M
           cpus: '0.25'
         reservations:
           memory: 128M
           cpus: '0.125'

volumes:
  postgres_data:
    driver: local

networks:
  edh-stats-network:
    driver: bridge
x-dockge:
  urls:
    - https://edh.zlor.fi
EOF

    print_success "Deployment configuration generated: ${config_file}"
}

##############################################################################
# Cleanup
##############################################################################

cleanup_temp_files() {
    print_header "Cleaning Up Temporary Files"

    # Note: Dockerfile.prod is now a permanent file in the repository
    # and should not be deleted after the build completes
    print_info "No temporary files to clean up"
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
    echo "  Frontend version file updated: ./frontend/public/version.txt"
    echo "  Version displayed in footer: v${VERSION#v}"
    echo ""
    echo "Next Steps:"
    echo "  1. Commit version update:"
     echo "     git add frontend/public/version.txt"
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
    print_info "GitHub User: ${GITHUB_USER}"
    print_info "Registry: ${REGISTRY}"
    echo ""

    # Validation
    validate_prerequisites

    # Check token
    check_github_token

    # Update version file
    update_version_file

    # Build images
    build_backend
    build_frontend

    # Verify images
    verify_images

    # Authenticate
    login_to_registry

    # Push images
    push_backend
    push_frontend

    # Generate config
    generate_deployment_config

    # Cleanup
    cleanup_temp_files

    # Summary
    print_summary

    print_success "Deployment completed successfully!"
}

# Run main function
main
