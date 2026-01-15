# Production Release - Complete Setup Guide

The EDH Stats Tracker is now ready for production deployment! This document summarizes all deployment resources and how to use them.

## 📦 What Was Created

### Scripts
- **`deploy.sh`** - Automated deployment script for building and pushing Docker images to GHCR
  - Validates prerequisites
  - Builds backend and frontend images
  - Pushes to GitHub Container Registry
  - Generates production configuration
  - ~5 minutes to run

### Documentation
- **`QUICK_DEPLOY.md`** - Fast-track 5-10 minute deployment guide (START HERE!)
- **`DEPLOYMENT.md`** - Comprehensive production deployment guide with all details
- **`PRODUCTION_CHECKLIST.md`** - Pre/during/post deployment verification checklist
- **`PRODUCTION_RELEASE.md`** - This file

### Docker Configuration
- **`frontend/Dockerfile.prod`** - Production-optimized nginx frontend Dockerfile
- **`frontend/nginx.prod.conf`** - Already exists, fully configured for production
- **`.github/workflows/publish.yml`** - GitHub Actions CI/CD pipeline (automated builds)

### Updated Files
- **`.gitignore`** - Added deployment and secrets files to ignore list

## 🚀 Quick Start (Choose One)

### Path 1: Manual Build & Deploy (Recommended for First Release)

```bash
# 1. Create GitHub token at https://github.com/settings/tokens
#    Select: write:packages scope
#    Copy: the token value

# 2. Build and push images
export GITHUB_USER=your-github-username
export GHCR_TOKEN=ghcr_xxxxxxxxxxxxx

./deploy.sh v1.0.0 $GHCR_TOKEN

# 3. Copy generated docker-compose.prod.deployed.yml to server
# 4. Follow QUICK_DEPLOY.md steps 3-8 to complete setup

# Done! Your app is in production.
```

**Time: ~20-30 minutes**
**Best for: First release, production verification**

### Path 2: GitHub Actions (Fully Automated)

```bash
# 1. Push release tag
git tag v1.0.0
git push origin v1.0.0

# 2. GitHub Actions automatically:
#    - Builds Docker images
#    - Pushes to GHCR
#    - Generates docker-compose.yml
#    - Creates release with artifacts

# 3. Download docker-compose.prod.deployed.yml from GitHub Releases
# 4. Follow QUICK_DEPLOY.md steps 3-8 to complete setup

# Done! CI/CD pipeline handled the building.
```

**Time: ~15-20 minutes**
**Best for: Subsequent releases, automated workflows**

## 📋 Documentation Map

### If you want to...

| Goal | Document | Time |
|------|----------|------|
| **Get app running in 10 min** | QUICK_DEPLOY.md | 10-15 min |
| **Understand full process** | DEPLOYMENT.md | Read through |
| **Verify before deploying** | PRODUCTION_CHECKLIST.md | Use as checklist |
| **Troubleshoot issues** | DEPLOYMENT.md (Troubleshooting section) | Variable |
| **Setup SSL/HTTPS** | DEPLOYMENT.md (SSL/TLS Configuration) | 15-20 min |
| **Automate future releases** | .github/workflows/publish.yml | Already configured |
| **Backup & restore** | DEPLOYMENT.md (Database Management) | As needed |
| **Update to new version** | DEPLOYMENT.md (Updating to New Version) | 5-10 min |

## 🔐 Security Considerations

### Secrets (Never Commit These)
- `.env` file with real values
- Docker secret files
- SSL/TLS certificates
- JWT_SECRET values
- `/etc/docker/daemon.json` (contains base64-encoded GHCR credentials)

All are properly in `.gitignore` ✓

### Required Before Deployment
- [ ] GitHub Personal Access Token with `write:packages` and `read:packages` scopes
- [ ] Secure JWT secret (generated via `openssl rand -base64 32`)
- [ ] Domain name with DNS configured
- [ ] SSL certificates (Let's Encrypt is free)
- [ ] Docker authentication configured (see QUICK_DEPLOY.md step 5)

### Production Settings
- `NODE_ENV=production` ✓
- `LOG_LEVEL=warn` (not debug) ✓
- `ALLOW_REGISTRATION=false` (by default) ✓
- Rate limiting enabled ✓
- Security headers configured ✓
- CORS restricted to your domain ✓

## 🐳 Image Information

### Backend Image
- **Base**: Node.js (slim)
- **Size**: ~150-180 MB
- **Registry**: ghcr.io/YOUR_USER/edh-stats-backend:v1.0.0
- **Health Check**: /api/health endpoint
- **Ports**: 3000 (internal only, proxied through nginx)

### Frontend Image  
- **Base**: nginx:alpine
- **Size**: ~50-60 MB
- **Registry**: ghcr.io/YOUR_USER/edh-stats-frontend:v1.0.0
- **Health Check**: / (root)
- **Ports**: 80 (HTTP), 443 (HTTPS)

### Volumes
- `sqlite_data` - Database persistence (required)
- `app_logs` - Application logs (optional)

## ✅ Deployment Verification

After deployment, verify with these commands:

```bash
# Service status
docker-compose ps

# Backend health
curl http://localhost:3000/api/health

# Frontend connectivity
curl http://localhost/

# Logs (if issues)
docker-compose logs --tail 50

# Resource usage
docker stats
```

## 📈 Monitoring & Maintenance

### Daily Checks
```bash
# View error logs
docker-compose logs backend | grep -i error

# Check resource usage
docker stats --no-stream

# Database integrity
docker-compose exec backend sqlite3 /app/database/data/edh-stats.db "PRAGMA integrity_check;"
```

### Weekly Tasks
- Review logs for errors
- Monitor disk usage
- Backup database
- Check for available updates

### Monthly Tasks
- Security patch updates
- SSL certificate renewal (automatic with certbot)
- Review application metrics
- Update dependencies

## 🔄 Release Cycle

### Versioning
Follow semantic versioning:
- `v1.0.0` - Initial release
- `v1.1.0` - Minor features/improvements
- `v1.0.1` - Bugfixes
- `v2.0.0` - Major breaking changes

### Release Process
1. Make code changes and test locally
2. Update version in README and documentation
3. Create git tag: `git tag v1.1.0`
4. Push tag: `git push origin v1.1.0`
5. GitHub Actions builds and pushes automatically
6. Download docker-compose from GitHub Releases
7. Deploy to server: `docker-compose pull && docker-compose up -d`

**Total time for release: ~30 minutes**

## 🆘 Need Help?

1. **First time deployment?**
   - Read: QUICK_DEPLOY.md
   - Follow step-by-step
   - Check PRODUCTION_CHECKLIST.md

2. **Issues during deployment?**
   - Check: DEPLOYMENT.md → Troubleshooting section
   - View logs: `docker-compose logs`
   - Run: `docker-compose config` to verify configuration

3. **Server problems?**
   - SSH to server
   - Run: `docker-compose ps` (service status)
   - Run: `docker-compose logs backend` (error details)
   - Run: `docker stats` (resource usage)

4. **Database issues?**
   - See: DEPLOYMENT.md → Database Management
   - Backup before making changes
   - Test restore procedure

## 🎯 Success Criteria

Your deployment is successful when:

✅ All containers running: `docker-compose ps` shows all "Up"
✅ Backend responding: `curl http://localhost:3000/api/health` returns 200
✅ Frontend accessible: Browser can view the application
✅ Authentication works: Can login with test credentials
✅ No critical errors: `docker-compose logs | grep ERROR` shows nothing
✅ Performance good: API responses < 500ms
✅ Database intact: Can query games and users
✅ Logs clean: Only INFO/WARN level messages, no exceptions
✅ Memory stable: `docker stats` doesn't show increasing memory

## 📚 Complete File Structure

```
edh-stats/
├── deploy.sh                          # Main deployment script
├── DEPLOYMENT.md                      # Comprehensive guide
├── PRODUCTION_CHECKLIST.md            # Pre/during/post checklist
├── QUICK_DEPLOY.md                    # Fast-track guide (START HERE!)
├── PRODUCTION_RELEASE.md              # This file
├── .github/
│   └── workflows/
│       └── publish.yml                # GitHub Actions CI/CD
├── .gitignore                         # Updated with deployment files
├── frontend/
│   ├── Dockerfile.prod                # Production Dockerfile
│   ├── nginx.prod.conf                # Production nginx config
│   └── public/                        # Static files
└── backend/
    ├── Dockerfile                     # Backend Dockerfile
    └── src/                           # Application code
```

## 🎓 Learning Resources

- Docker documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- GitHub Container Registry: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- GitHub Actions: https://docs.github.com/en/actions
- Let's Encrypt: https://letsencrypt.org/
- Nginx configuration: https://nginx.org/en/docs/

## 🏁 Next Steps

1. **Create GitHub Token**
   - Visit: https://github.com/settings/tokens
   - Create token with `write:packages` scope
   - Save securely

2. **Build First Release**
   - Choose Path 1 or Path 2 above
   - Follow either QUICK_DEPLOY.md or use GitHub Actions

3. **Deploy to Server**
   - Set up server (see QUICK_DEPLOY.md)
   - Configure domain and SSL
   - Start services

4. **Verify & Monitor**
   - Test all features
   - Check logs and metrics
   - Plan backup strategy

5. **Iterate & Update**
   - Continue developing features
   - Create new git tags for releases
   - Deploy updates (zero-downtime with health checks)

---

**Congratulations!** 🎉 You now have everything needed to deploy EDH Stats Tracker to production.

**Questions? Start with QUICK_DEPLOY.md and follow the step-by-step instructions.**

**Version**: 1.0.0
**Date**: 2024-01-15
**Status**: Ready for Production ✓
