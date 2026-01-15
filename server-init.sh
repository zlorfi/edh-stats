#!/bin/bash

##############################################################################
# EDH Stats Server Initialization Script
#
# This script prepares your Docker host for running EDH Stats Tracker
# Run this ONCE on your server before first deploy
#
# Usage: ./server-init.sh
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Main script
main() {
    print_header "EDH Stats Tracker - Server Initialization"
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker is installed"
    
    # Check if Docker daemon is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    print_success "Docker daemon is running"
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose is installed"
    
    print_header "Checking Volume Permissions"
    
    # Try to create volumes directory
    print_info "Ensuring /var/lib/docker/volumes directory exists..."
    sudo mkdir -p /var/lib/docker/volumes
    print_success "Volume directory exists"
    
    # Set proper permissions on Docker volume directory
    print_info "Setting Docker volume directory permissions..."
    sudo chmod 755 /var/lib/docker/volumes
    print_success "Volume directory permissions set"
    
    print_header "Preparing EDH Stats Directory"
    
    if [ ! -d "edh-stats" ]; then
        print_info "Creating edh-stats directory..."
        mkdir -p edh-stats
        cd edh-stats
        print_success "Created ~/edh-stats"
    else
        cd edh-stats
        print_success "Using existing ~/edh-stats directory"
    fi
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_warning ".env file not found - creating template"
        cat > .env << 'ENVFILE'
# Generate a secure JWT secret:
# openssl rand -base64 32
JWT_SECRET=CHANGE_ME_TO_SECURE_VALUE

# Your domain
CORS_ORIGIN=https://yourdomain.com

# Allow registration (true/false)
ALLOW_REGISTRATION=false

# Log level (debug, info, warn, error)
LOG_LEVEL=warn
ENVFILE
        print_warning "Created .env template - EDIT THIS FILE with your values!"
        echo ""
        echo "Edit the .env file with your actual values:"
        echo "  nano .env"
        return
    else
        print_success ".env file already exists"
    fi
    
    print_header "Pre-creating Volume Directories"
    
    # Pull the init image so it's cached
    print_info "Pre-pulling Alpine image for initialization..."
    docker pull alpine:latest > /dev/null 2>&1
    print_success "Alpine image ready"
    
    print_header "Server Ready!"
    echo ""
    echo "Next steps:"
    echo "  1. Edit .env file with your configuration:"
    echo "     nano .env"
    echo ""
    echo "  2. Copy docker-compose.yml to this directory:"
    echo "     scp docker-compose.yml user@server:~/edh-stats/"
    echo ""
    echo "  3. Start the services:"
    echo "     docker-compose up -d"
    echo ""
    echo "  4. Check status:"
    echo "     docker-compose ps"
    echo "     docker-compose logs -f backend"
    echo ""
}

main
