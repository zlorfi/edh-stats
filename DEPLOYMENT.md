# Production Deployment Guide

This guide covers deploying the EDH Stats Tracker to production using Docker and GitHub Container Registry (GHCR).

## Prerequisites

- Docker and Docker Compose installed on your server
- GitHub account with access to this repository
- GitHub Personal Access Token (PAT) with `write:packages` permission
- Domain name (for CORS_ORIGIN configuration)
- SSL certificates (optional, for HTTPS)

## Quick Start

### Option 1: Automatic Deployment Script (Local)

1. **Generate GitHub Token**
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Create a new token with `write:packages` scope
   - Copy the token

2. **Run Deployment Script**
   ```bash
   chmod +x deploy.sh
   
   # With token as argument
   ./deploy.sh v1.0.0 ghcr_xxxxxxxxxxxxx
   
   # Or set as environment variable
   export GHCR_TOKEN=ghcr_xxxxxxxxxxxxx
   export GITHUB_USER=your-github-username
   ./deploy.sh v1.0.0
   
   # Or use interactive mode
   ./deploy.sh v1.0.0
   ```
   
   **What the script does:**
   - Validates Docker and Docker buildx prerequisites
   - Builds images for **both** `linux/amd64` (AMD64 servers) and `linux/arm64` (Apple Silicon)
   - Pushes to GHCR automatically (no separate push step needed)
   - Generates deployment configuration

3. **Review Generated Configuration**
   - Check `docker-compose.prod.deployed.yml`
   - Verify image tags and versions

### Option 2: Automated CI/CD (GitHub Actions)

1. **Push Release Tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions Automatically:**
   - Builds Docker images
   - Pushes to GHCR
   - Generates deployment config
   - Creates release with artifacts

3. **Download Deployment Config**
   - Go to GitHub Releases
   - Download `docker-compose.prod.deployed.yml`

## Server Setup

### 1. Install Docker & Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker-compose --version
```

### 2. Create Production Directory

```bash
mkdir -p ~/edh-stats/data/database
mkdir -p ~/edh-stats/data/logs
cd ~/edh-stats
```

### 3. Copy Deployment Configuration

```bash
# Copy the docker-compose.prod.deployed.yml file to server
scp docker-compose.prod.deployed.yml user@server:~/edh-stats/docker-compose.yml
```

### 4. Create Environment File

```bash
# Create .env file on server
cat > ~/edh-stats/.env << EOF
# Required: Set your domain
CORS_ORIGIN=https://yourdomain.com

# Optional: Enable user registration (default: false)
ALLOW_REGISTRATION=false

# Database backup path (optional)
DATABASE_BACKUP_PATH=/data/backups
EOF
```

### 5. Generate JWT Secret

The JWT_SECRET is already included in your `.env` file. The secret is generated automatically when you create the `.env` file:

```bash
# Already done in step 4, but if you need to regenerate:
openssl rand -base64 32

# Copy the output and update JWT_SECRET in .env
```

Your JWT secret is stored in the `.env` file which is protected by `.gitignore` (not committed to git).

## Deployment

### 1. Configure Docker Authentication to GHCR

You need to authenticate Docker to pull private images from GitHub Container Registry (GHCR). Choose one of these methods:

#### Option A: Store Credentials in `/etc/docker/daemon.json` (Recommended for Docker Services)

This approach is recommended if you're using Dockge, systemd services, or other Docker management tools that run as services. The credentials are stored globally so all Docker processes can use them.

**Step 1: Generate base64-encoded credentials**
```bash
# Replace with your actual GitHub username and token
echo -n "YOUR_GITHUB_USERNAME:YOUR_GITHUB_TOKEN" | base64

# Output example:
# WU9VUl9HSVRIVUJfVVNFUk5BTUU6WU9VUl9HSVRIVUJfVE9LRU4=
```

**Step 2: Update Docker daemon configuration**
```bash
sudo nano /etc/docker/daemon.json
```

Add or update the `auths` section. The full file should look like:
```json
{
  "auths": {
    "ghcr.io": {
      "auth": "YOUR_BASE64_CREDENTIALS_HERE"
    }
  }
}
```

**Step 3: Restart Docker**
```bash
sudo systemctl restart docker

# Wait a few seconds for Docker to restart
sleep 3

# Verify authentication works
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-backend:latest
```

#### Option B: Interactive Docker Login (Simpler but User-Specific)

Use this if you're deploying manually and don't have other services pulling images.

```bash
docker login ghcr.io

# You'll be prompted for:
# Username: YOUR_GITHUB_USERNAME
# Password: YOUR_GITHUB_TOKEN (NOT your GitHub password!)

# Verify login worked
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-backend:latest
```

**Note:** With this approach, credentials are stored in `~/.docker/config.json` and only the current user can use them. If Docker runs as a different user (like in Dockge), authentication will fail.

### 2. Pull Latest Images

```bash
cd ~/edh-stats

# Pull images (this will use credentials from daemon.json or docker login)
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-backend:latest
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-frontend:latest

# If pull fails, verify authentication
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-backend:v1.0.0
```

### 3. Start Services

```bash
cd ~/edh-stats

# Start in background
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. Verify Deployment

```bash
# Check backend health
curl http://localhost:3000/api/health

# Check frontend
curl http://localhost/

# View logs
docker-compose logs backend
docker-compose logs frontend
```

## SSL/TLS Configuration (Optional)

### Using Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Create SSL volume mapping in docker-compose.yml:
# volumes:
#   - /etc/letsencrypt/live/yourdomain.com:/etc/nginx/certs:ro
```

### Update nginx.prod.conf

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # ... rest of config
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Database Management

### Backup

```bash
# Manual backup
docker-compose exec backend cp /app/database/data/edh-stats.db /app/database/data/backup-$(date +%Y%m%d-%H%M%S).db

# Or mount backup volume
docker run -v edh-stats_sqlite_data:/data -v ~/backups:/backup \
  busybox sh -c "cp /data/edh-stats.db /backup/edh-stats-$(date +%Y%m%d-%H%M%S).db"
```

### Restore

```bash
# Stop services
docker-compose down

# Restore from backup
docker run -v edh-stats_sqlite_data:/data -v ~/backups:/backup \
  busybox sh -c "cp /backup/edh-stats-YYYYMMDD-HHMMSS.db /data/edh-stats.db"

# Start services
docker-compose up -d
```

## Updating to New Version

### 1. Pull New Images

```bash
docker-compose pull
```

### 2. Restart Services (Zero-Downtime Update)

```bash
# Update and restart with health checks ensuring availability
docker-compose up -d --no-deps --build
```

### 3. Verify Update

```bash
# Check version/logs
docker-compose logs -f backend
```

## Monitoring & Maintenance

### View Logs

```bash
# Real-time logs
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail 100

# Specific time range
docker-compose logs --since 2024-01-15T10:00:00Z --until 2024-01-15T11:00:00Z
```

### Resource Monitoring

```bash
# View resource usage
docker stats

# View service details
docker-compose ps
docker-compose stats
```

### Health Checks

```bash
# Backend health
curl -s http://localhost:3000/api/health | jq .

# Frontend connectivity
curl -s http://localhost/ | head -20
```

## Troubleshooting

### Images Won't Pull / "No Matching Manifest" Error

**Error Example:**
```
no matching manifest for linux/amd64 in the manifest list entries
```

This means the Docker image was built for a different CPU architecture than your server.

**Common Cause:**
- You built the image on Apple Silicon (ARM64) but your server is AMD64 (x86-64)
- Or vice versa

**Solution: Rebuild with Multi-Architecture Support**

The updated `deploy.sh` script now automatically builds for both architectures:

```bash
# Simply run deploy.sh again - it now handles multi-arch builds
./deploy.sh v1.0.4 $GHCR_TOKEN

# The script will:
# - Use Docker buildx to build for linux/amd64 and linux/arm64
# - Push both architectures to GHCR
# - Your server can then pull the amd64 version
```

**Manual Fix (if needed):**
```bash
# Enable buildx
docker buildx create --use --name multiarch-builder

# Rebuild backend for both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --file ./backend/Dockerfile \
  --target production \
  --tag ghcr.io/YOUR_USER/edh-stats-backend:v1.0.4 \
  --push \
  ./backend
```

---

### Images Won't Pull / "Unauthorized" Error

**Error Example:**
```
Error response from daemon: Head "https://ghcr.io/v2/...": unauthorized
```

This usually means Docker isn't authenticated to pull from GHCR.

**Solution 1: Verify daemon.json Configuration (Recommended)**
```bash
# Check the configuration file
cat /etc/docker/daemon.json

# Should contain valid base64 credentials for ghcr.io
# If missing or malformed, edit it:
sudo nano /etc/docker/daemon.json

# Then restart Docker
sudo systemctl restart docker

# Test pull
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-backend:latest
```

**Solution 2: Use Interactive Login**
```bash
docker login ghcr.io
# Username: YOUR_GITHUB_USERNAME
# Password: YOUR_GITHUB_TOKEN (NOT your password!)

# Verify login worked
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-backend:latest
```

**Solution 3: Test with a Public Image First**
```bash
# If pulling private images fails, test with a public image
docker pull nginx:latest

# If this works, your Docker daemon is OK
# If this fails, restart Docker: sudo systemctl restart docker
```

**Solution 4: Check Token Scope**
```bash
# Make sure your GitHub token has read:packages scope
# Go to: https://github.com/settings/tokens
# Click on the token and verify it has:
# - read:packages
# - write:packages (for pushing)
```

**Solution 5: For Dockge or Other Services**
```bash
# If Dockge or other services can't pull, ensure daemon.json is used
# Not ~/.docker/config.json which is user-specific

# Check who's running Docker
ps aux | grep docker

# Verify /etc/docker/daemon.json has correct permissions
ls -l /etc/docker/daemon.json

# Restart Docker to apply daemon.json changes
sudo systemctl restart docker
```

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Verify secrets exist
docker secret ls

# Verify configuration
docker-compose config

# Check ports are available
sudo netstat -tulpn | grep LISTEN
```

### Database Issues

```bash
# Check database file exists
docker-compose exec backend ls -lh /app/database/data/

# Verify permissions
docker-compose exec backend chmod 666 /app/database/data/edh-stats.db

# Check database integrity
docker-compose exec backend sqlite3 /app/database/data/edh-stats.db "PRAGMA integrity_check;"
```

### Performance Issues

```bash
# Check resource limits in docker-compose.yml
# Backend limits:
#   memory: 512M
#   cpus: '0.5'

# Monitor actual usage
docker stats edh-stats-backend-1

# Increase limits if needed
docker update --memory 1G --cpus 1.0 edh-stats-backend-1
```

## Security Best Practices

1. **Secrets Management**
   - Never commit `.env` file to Git (already in .gitignore)
   - Keep `.env` file secure on your server (chmod 600)
   - Rotate JWT_SECRET periodically by updating .env and restarting services
   - Backup `.env` file securely (offsite)

2. **Environment Variables**
   - Set CORS_ORIGIN to your domain
   - Keep LOG_LEVEL as 'warn' in production
   - Set ALLOW_REGISTRATION=false unless needed

3. **Network Security**
   - Use firewall to restrict access
   - Enable SSL/TLS for production
   - Use strong passwords for admin accounts

4. **Database**
   - Regular backups (daily recommended)
   - Monitor database size
   - Archive old game records periodically

5. **Monitoring**
   - Set up log aggregation
   - Monitor resource usage
   - Health checks enabled by default

## Rollback

If issues occur after deployment:

```bash
# Stop current version
docker-compose down

# Pull and start previous version
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-backend:v1.0.0
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-frontend:v1.0.0

# Update docker-compose.yml to use previous version
# Then restart
docker-compose up -d
```

## Support & Issues

For deployment issues:

1. Check logs: `docker-compose logs`
2. Verify configuration: `docker-compose config`
3. Test connectivity: `docker-compose exec backend wget -O- http://localhost:3000/api/health`
4. Create GitHub issue with logs and configuration

## Versioning Strategy

- **Stable Releases**: `v1.0.0`, `v1.1.0`, etc.
- **Release Candidates**: `v1.0.0-rc1`, `v1.0.0-rc2`
- **Development**: `main-abcd1234` (branch-commit)

Always use tagged versions in production. Avoid using `latest` tag without pinning to specific version.
