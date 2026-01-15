# Quick Deployment Guide

Fast-track guide to deploy EDH Stats Tracker to production in minutes.

## TL;DR - 5 Minute Setup

### Step 1: Generate GitHub Token (GitHub UI - 2 min)
```
1. Visit: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Check: write:packages
4. Copy token (save it safely!)
```

### Step 2: Build & Push Images (Local - 3 min)
```bash
cd edh-stats

# Export your details
export GITHUB_USER=your-username
export GHCR_TOKEN=ghcr_xxxxx

# Run deployment
./deploy.sh v1.0.0 $GHCR_TOKEN
```

### Step 3: Deploy to Server
```bash
# Copy generated config
scp docker-compose.prod.deployed.yml user@server:~/edh-stats/

# On server:
ssh user@server
cd ~/edh-stats

# Create secret
openssl rand -base64 32 > jwt_secret.txt
docker secret create jwt_secret jwt_secret.txt

# Start
docker-compose -f docker-compose.prod.deployed.yml up -d
```

**Done!** 🎉 Visit your domain to see it live.

---

## Full Steps with Explanations

### 1. Prepare Credentials

**Create GitHub Personal Access Token:**
- Go to https://github.com/settings/tokens
- Click "Generate new token (classic)"
- Select scopes:
  - ☑️ `write:packages` (push Docker images)
  - ☑️ `read:packages` (pull Docker images)
- Click "Generate token"
- **Copy and save** the token (you won't see it again!)

**Set Environment Variables:**
```bash
export GITHUB_USER=your-github-username
export GHCR_TOKEN=ghcr_xxxxxxxxxxxxx
```

### 2. Build Docker Images

**Option A: Manual Script**
```bash
cd edh-stats

# Run deployment script
./deploy.sh v1.0.0 $GHCR_TOKEN

# Or without token (will prompt)
./deploy.sh v1.0.0
```

**Option B: GitHub Actions (Automated)**
```bash
# Push tag to trigger automatic build
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will:
# - Build images automatically
# - Push to GHCR
# - Generate deployment config
# - Create release with artifacts

# Download docker-compose.prod.deployed.yml from GitHub Releases
```

### 3. Prepare Server

**Login to Your Server:**
```bash
ssh user@your-server.com
cd ~
mkdir edh-stats
cd edh-stats
```

**Create Directories:**
```bash
mkdir -p data/database
mkdir -p data/logs
```

**Copy Configuration Files:**
```bash
# From your local machine:
scp docker-compose.prod.deployed.yml user@your-server.com:~/edh-stats/docker-compose.yml
scp frontend/nginx.prod.conf user@your-server.com:~/edh-stats/
```

**Create .env File on Server:**
```bash
cat > ~/.env << EOF
# Required
CORS_ORIGIN=https://yourdomain.com

# Optional
ALLOW_REGISTRATION=false
LOG_LEVEL=warn
EOF
```

### 4. Setup Docker Secrets

**Generate JWT Secret:**
```bash
# On server
openssl rand -base64 32 > jwt_secret.txt
cat jwt_secret.txt
# Save this somewhere safe for backups!
```

**Create Docker Secret:**
```bash
docker secret create jwt_secret jwt_secret.txt

# Verify
docker secret ls
docker secret inspect jwt_secret
```

**Cleanup:**
```bash
# Remove local secret file after import
rm jwt_secret.txt
```

### 5. Start Services

**Pull Latest Images:**
```bash
docker login ghcr.io  # Use your GitHub token as password

docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-backend:v1.0.0
docker pull ghcr.io/YOUR_GITHUB_USER/edh-stats-frontend:v1.0.0
```

**Start Docker Compose:**
```bash
docker-compose up -d

# Wait 10-15 seconds for services to start
sleep 15

# Check status
docker-compose ps
```

**Verify Services:**
```bash
# Backend health
curl http://localhost:3000/api/health

# Frontend
curl http://localhost/

# View logs (if needed)
docker-compose logs -f backend
```

### 6. Configure SSL (Optional but Recommended)

**Install Certbot:**
```bash
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com

# Certificates stored in /etc/letsencrypt/live/yourdomain.com/
```

**Update docker-compose.yml to mount certificates:**
```yaml
frontend:
  image: ghcr.io/...
  volumes:
    - /etc/letsencrypt/live/yourdomain.com/fullchain.pem:/etc/nginx/certs/fullchain.pem:ro
    - /etc/letsencrypt/live/yourdomain.com/privkey.pem:/etc/nginx/certs/privkey.pem:ro
```

**Uncomment SSL section in nginx.prod.conf:**
```nginx
ssl_certificate /etc/nginx/certs/fullchain.pem;
ssl_certificate_key /etc/nginx/certs/privkey.pem;
```

**Restart:**
```bash
docker-compose up -d
```

### 7. Setup Auto-Renewal (SSL)

**Create renewal script:**
```bash
cat > /home/user/renew-ssl.sh << 'EOF'
#!/bin/bash
certbot renew --quiet
docker-compose -f /home/user/edh-stats/docker-compose.yml restart frontend
EOF

chmod +x /home/user/renew-ssl.sh
```

**Add to crontab (runs monthly):**
```bash
crontab -e

# Add line:
0 2 1 * * /home/user/renew-ssl.sh
```

### 8. Verify Everything Works

**Test the Application:**
```bash
# From your browser
https://yourdomain.com

# You should see:
1. Login page loads
2. Can click to register (if enabled)
3. Can login with test credentials
4. Can access dashboard
5. Can log games
6. Can view statistics
```

**Quick Health Check:**
```bash
curl -s https://yourdomain.com/api/health | jq .

# Should return: { "status": "ok", ... }
```

**Monitor Logs:**
```bash
# Watch for errors
docker-compose logs -f

# Should see startup messages, then silence
```

---

## Troubleshooting Quick Fixes

### Services Won't Start
```bash
# Check what's wrong
docker-compose logs

# Common issues:
# 1. Port 80/443 already in use: sudo lsof -i :80
# 2. Secret not created: docker secret ls
# 3. Image pull failed: docker pull ghcr.io/...

# Fix and retry
docker-compose down
docker-compose up -d
```

### Can't Login to GHCR
```bash
# Verify token
docker login ghcr.io
# Username: YOUR_GITHUB_USERNAME
# Password: YOUR_GITHUB_TOKEN (not your password!)

# Test login
docker pull ghcr.io/YOUR_USER/edh-stats-backend:v1.0.0
```

### Frontend Shows Blank Page
```bash
# Check frontend logs
docker-compose logs frontend

# Check browser console (F12)
# Common: CORS error = wrong CORS_ORIGIN in .env

# Fix and restart
docker-compose down
docker-compose up -d
```

### Database Issues
```bash
# Check database exists
docker-compose exec backend ls -lh /app/database/data/

# Verify integrity
docker-compose exec backend sqlite3 /app/database/data/edh-stats.db "PRAGMA integrity_check;"

# Check permissions
docker-compose exec backend chmod 666 /app/database/data/edh-stats.db
```

---

## Useful Commands

```bash
# View logs (real-time)
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# View last 50 lines
docker-compose logs --tail 50

# Restart services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Stop services
docker-compose down

# Start services
docker-compose up -d

# Check resource usage
docker stats

# Get shell access
docker-compose exec backend sh

# Backup database
docker-compose exec backend cp /app/database/data/edh-stats.db /app/database/data/backup-$(date +%s).db

# Test API
curl http://localhost:3000/api/health | jq .
```

---

## Updating to New Version

```bash
# New images are pushed automatically when you:
# 1. Create a git tag: git tag v1.1.0 && git push origin v1.1.0
# 2. Or GitHub Actions builds and pushes to GHCR

# On server, pull and restart:
docker-compose pull
docker-compose up -d

# Done! Zero-downtime update with health checks.
```

---

## Need Help?

1. **Read full docs**: See `DEPLOYMENT.md`
2. **Check logs**: `docker-compose logs`
3. **Review checklist**: `PRODUCTION_CHECKLIST.md`
4. **Common issues**: See troubleshooting section above
5. **Create GitHub issue**: Include logs and configuration

---

**Estimated time: 15-30 minutes** ⏱️
