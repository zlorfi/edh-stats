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
   ./deploy.sh 1.0.0 ghcr_xxxxxxxxxxxxx
   
   # Or set as environment variable
   export GHCR_TOKEN=ghcr_xxxxxxxxxxxxx
   export GITHUB_USER=your-github-username
   ./deploy.sh 1.0.0
   
   # Or use interactive mode
   ./deploy.sh 1.0.0
   ```

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

### 5. Create Docker Secret

```bash
# Generate secure JWT secret
openssl rand -base64 32 > ~/edh-stats/jwt_secret.txt

# Create Docker secret (one-time setup)
docker secret create jwt_secret ~/edh-stats/jwt_secret.txt

# Verify
docker secret ls
```

## Deployment

### 1. Log in to GHCR

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### 2. Pull Latest Images

```bash
cd ~/edh-stats

# Pull images
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-backend:latest
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-frontend:latest
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

### Images Won't Pull

```bash
# Verify GHCR login
docker login ghcr.io

# Check image exists
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-backend:latest
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
   - Never commit secrets to Git
   - Use Docker secrets for sensitive data
   - Rotate JWT_SECRET periodically

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
