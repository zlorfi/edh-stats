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

##############################################################################
# Build Functions
##############################################################################

build_backend() {
    print_header "Building Backend Image"
    
    print_info "Building: ${BACKEND_IMAGE}"
    docker build \
        --file ./backend/Dockerfile \
        --target production \
        --tag "${BACKEND_IMAGE}" \
        --tag "${BACKEND_IMAGE_LATEST}" \
        --build-arg NODE_ENV=production \
        ./backend
    
    print_success "Backend image built successfully"
}

build_frontend() {
    print_header "Building Frontend Image"
    
    print_info "Building: ${FRONTEND_IMAGE}"
    
    # Create a temporary Dockerfile for frontend if it doesn't exist
    if [ ! -f "./frontend/Dockerfile.prod" ]; then
        print_info "Creating production Dockerfile for frontend..."
        cat > "./frontend/Dockerfile.prod" << 'EOF'
FROM nginx:alpine

# Copy nginx configuration
COPY ./nginx.prod.conf /etc/nginx/nginx.conf

# Copy frontend files
COPY ./public /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
EOF
        print_success "Created temporary Dockerfile for frontend"
    fi
    
    docker build \
        --file ./frontend/Dockerfile.prod \
        --tag "${FRONTEND_IMAGE}" \
        --tag "${FRONTEND_IMAGE_LATEST}" \
        ./frontend
    
    print_success "Frontend image built successfully"
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
    
    print_info "Pushing: ${BACKEND_IMAGE}"
    docker push "${BACKEND_IMAGE}"
    print_success "Backend image pushed: ${BACKEND_IMAGE}"
    
    print_info "Pushing latest tag: ${BACKEND_IMAGE_LATEST}"
    docker push "${BACKEND_IMAGE_LATEST}"
    print_success "Latest backend image pushed: ${BACKEND_IMAGE_LATEST}"
}

push_frontend() {
    print_header "Pushing Frontend Image"
    
    print_info "Pushing: ${FRONTEND_IMAGE}"
    docker push "${FRONTEND_IMAGE}"
    print_success "Frontend image pushed: ${FRONTEND_IMAGE}"
    
    print_info "Pushing latest tag: ${FRONTEND_IMAGE_LATEST}"
    docker push "${FRONTEND_IMAGE_LATEST}"
    print_success "Latest frontend image pushed: ${FRONTEND_IMAGE_LATEST}"
}

##############################################################################
# Verification Functions
##############################################################################

verify_images() {
    print_header "Verifying Built Images"
    
    print_info "Checking backend image..."
    if docker image inspect "${BACKEND_IMAGE}" > /dev/null 2>&1; then
        SIZE=$(docker image inspect "${BACKEND_IMAGE}" --format='{{.Size}}' | numfmt --to=iec 2>/dev/null || docker image inspect "${BACKEND_IMAGE}" --format='{{.Size}}')
        print_success "Backend image verified (Size: ${SIZE})"
    else
        print_error "Backend image verification failed"
        exit 1
    fi
    
    print_info "Checking frontend image..."
    if docker image inspect "${FRONTEND_IMAGE}" > /dev/null 2>&1; then
        SIZE=$(docker image inspect "${FRONTEND_IMAGE}" --format='{{.Size}}' | numfmt --to=iec 2>/dev/null || docker image inspect "${FRONTEND_IMAGE}" --format='{{.Size}}')
        print_success "Frontend image verified (Size: ${SIZE})"
    else
        print_error "Frontend image verification failed"
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
# IMPORTANT: Create a .env file with these variables:
#   JWT_SECRET=\$(openssl rand -base64 32)
#   CORS_ORIGIN=https://yourdomain.com
#   ALLOW_REGISTRATION=false

version: '3.8'

services:
  backend:
    image: ${BACKEND_IMAGE}
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/database/data/edh-stats.db
      - JWT_SECRET=\${JWT_SECRET}
      - CORS_ORIGIN=\${CORS_ORIGIN:-https://yourdomain.com}
      - LOG_LEVEL=warn
      - RATE_LIMIT_WINDOW=15
      - RATE_LIMIT_MAX=100
      - ALLOW_REGISTRATION=\${ALLOW_REGISTRATION:-false}
    volumes:
      - sqlite_data:/app/database/data
      - app_logs:/app/logs
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
      - '80:80'
      - '443:443'
    restart: unless-stopped
    networks:
      - edh-stats-network

volumes:
  sqlite_data:
    driver: local
  app_logs:
    driver: local

networks:
  edh-stats-network:
    driver: bridge
EOF

    print_success "Deployment configuration generated: ${config_file}"
}

##############################################################################
# Cleanup
##############################################################################

cleanup_temp_files() {
    print_header "Cleaning Up Temporary Files"
    
    if [ -f "./frontend/Dockerfile.prod" ] && [ ! -f "./frontend/Dockerfile" ]; then
        print_info "Removing temporary frontend Dockerfile..."
        rm -f "./frontend/Dockerfile.prod"
        print_success "Temporary files cleaned up"
    fi
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
    echo "Next Steps:"
    echo "  1. Pull images: docker pull ${BACKEND_IMAGE}"
    echo "  2. Configure production secrets (JWT_SECRET)"
    echo "  3. Set environment variables (CORS_ORIGIN, ALLOW_REGISTRATION)"
    echo "  4. Deploy: docker-compose -f docker-compose.prod.deployed.yml up -d"
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
