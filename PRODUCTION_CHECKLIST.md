# Production Release Checklist

Use this checklist before deploying to production. Ensure all items are completed and verified.

## Pre-Deployment (1-2 weeks before)

### Code Quality & Testing
- [ ] All tests pass locally (`npm test` or equivalent)
- [ ] Code review completed for all changes
- [ ] No console warnings or errors in development
- [ ] Dependencies are up-to-date and security scanning passed
- [ ] Linting passes (`npm run lint`)

### Documentation
- [ ] README.md is updated with latest features
- [ ] DEPLOYMENT.md is complete and accurate
- [ ] API documentation is current
- [ ] Configuration options are documented

### Security Review
- [ ] No hardcoded secrets in codebase
- [ ] All API endpoints validate input properly
- [ ] Database queries use parameterized statements (no SQL injection)
- [ ] CORS configuration is restrictive (specific domains)
- [ ] Password hashing is using bcryptjs with 12+ rounds
- [ ] JWT tokens have proper expiration (15 minutes)
- [ ] Rate limiting is configured (enabled in docker-compose.prod.yml)

### Database
- [ ] Database schema is final and tested
- [ ] All migrations are tested and reversible
- [ ] Database views are optimized
- [ ] Indexes are in place for frequently queried columns
- [ ] Backup and restore procedures are documented and tested

### Performance
- [ ] Bundle size is reasonable (< 5MB for frontend)
- [ ] Database queries are optimized
- [ ] API response times are acceptable (< 500ms for 95th percentile)
- [ ] Static assets have caching enabled
- [ ] Gzip compression is enabled

## Deployment Week

### Image Build & Push
- [ ] Version number is incremented (semantic versioning)
- [ ] Git tag is created: `git tag v1.0.0`
- [ ] Deployment script runs successfully: `./deploy.sh 1.0.0`
- [ ] Images are pushed to GitHub Container Registry
- [ ] Image sizes are reasonable (backend < 200MB, frontend < 100MB)
- [ ] Image scanning shows no critical vulnerabilities

### Server Preparation
- [ ] Server has Docker and Docker Compose installed
- [ ] Firewall rules allow necessary ports (80, 443)
- [ ] SSL certificates are ready (if using HTTPS)
- [ ] Domain DNS is configured and resolving
- [ ] Disk space is sufficient (>10GB recommended)
- [ ] Server has adequate resources (2GB RAM minimum, 1 CPU)

### Configuration
- [ ] `.env` file created with all required variables
- [ ] `CORS_ORIGIN` set to correct domain
- [ ] `ALLOW_REGISTRATION` set appropriately (false by default)
- [ ] JWT_SECRET is securely generated and stored
- [ ] Log level is set to 'warn' in production
- [ ] Database path points to persistent volume

### Secrets Management
- [ ] Docker secret 'jwt_secret' is created
- [ ] Secret file is securely stored and deleted after import
- [ ] Docker secret command tested: `docker secret ls`
- [ ] Backup of jwt_secret stored securely (offsite)

## Day Before Deployment

### Final Verification
- [ ] Run latest images locally with `docker-compose up -d`
- [ ] Test all major features work correctly
- [ ] Check database is created and migrations run
- [ ] Verify API endpoints respond correctly
- [ ] Test authentication (login, registration if enabled)
- [ ] Test game logging and statistics
- [ ] Verify frontend loads and is responsive

### Backup Everything
- [ ] Current database backed up (if migrating existing data)
- [ ] Configuration files backed up
- [ ] DNS settings noted and ready to switch
- [ ] Rollback plan documented and tested

### Team Communication
- [ ] Team notified of deployment schedule
- [ ] Maintenance window communicated to users
- [ ] Rollback contact information shared
- [ ] Deployment plan reviewed with team

## Deployment Day

### Pre-Deployment (1 hour before)

- [ ] All services currently running and stable
- [ ] Database integrity verified
- [ ] Recent backups completed
- [ ] Monitoring tools configured and running
- [ ] Team members available for issues

### Deployment Steps

1. [ ] Pull latest images from GHCR
   ```bash
   docker pull ghcr.io/YOUR_USER/edh-stats-backend:1.0.0
   docker pull ghcr.io/YOUR_USER/edh-stats-frontend:1.0.0
   ```

2. [ ] Stop current services (if upgrading)
   ```bash
   docker-compose down
   ```

3. [ ] Update docker-compose.yml with new versions

4. [ ] Start new services
   ```bash
   docker-compose up -d
   ```

5. [ ] Wait for services to become healthy (check health checks)
   ```bash
   docker-compose ps
   ```

### Post-Deployment Verification (immediate)

- [ ] All containers are running: `docker-compose ps`
- [ ] Backend health check passes: `curl http://localhost:3000/api/health`
- [ ] Frontend loads: `curl http://localhost/`
- [ ] No error logs: `docker-compose logs | grep ERROR`
- [ ] Database is accessible and has data
- [ ] API endpoints respond (test authentication)
- [ ] UI loads correctly in browser
- [ ] Forms work (try logging a game if applicable)

### Testing (15-30 minutes after)

- [ ] Test user login functionality
- [ ] Test game logging (if enabled)
- [ ] Test viewing statistics
- [ ] Test editing/deleting records
- [ ] Check browser console for JavaScript errors
- [ ] Verify HTTPS/SSL (if configured)
- [ ] Test on mobile device

### Monitoring (first 24 hours)

- [ ] Monitor error logs every 30 minutes
- [ ] Monitor resource usage (CPU, memory)
- [ ] Check database size and integrity
- [ ] Monitor API response times
- [ ] Review user feedback/issues reported
- [ ] Ensure backups are being created

## If Issues Occur

### Quick Diagnostics
```bash
# Check service status
docker-compose ps

# View recent logs
docker-compose logs --tail 50 backend
docker-compose logs --tail 50 frontend

# Check resource usage
docker stats

# Test backend connectivity
curl -v http://localhost:3000/api/health

# Test database
docker-compose exec backend sqlite3 /app/database/data/edh-stats.db "SELECT COUNT(*) FROM users;"
```

### Rollback Procedure
1. [ ] Stop current version: `docker-compose down`
2. [ ] Update docker-compose.yml to previous version
3. [ ] Restore database backup if needed
4. [ ] Restart with previous version: `docker-compose up -d`
5. [ ] Verify service health
6. [ ] Notify team and users

## Post-Deployment (Next 24-48 hours)

### Stability Monitoring
- [ ] No error spikes in logs
- [ ] Database size is stable
- [ ] API response times are acceptable
- [ ] No memory leaks or increasing CPU usage
- [ ] User authentication working smoothly
- [ ] No reported critical issues

### Documentation & Communication
- [ ] Update version number in documentation
- [ ] Post release notes (what was changed)
- [ ] Thank team for their efforts
- [ ] Respond to any user questions/feedback

### Metrics & Learning
- [ ] Deployment time was within expectations
- [ ] Zero downtime achieved (if applicable)
- [ ] Document any unexpected issues and resolutions
- [ ] Identify improvements for next deployment
- [ ] Update deployment checklist based on learnings

## Success Criteria

Deployment is successful when:

✅ All services are running and healthy
✅ All endpoints respond correctly
✅ Database has all data and is accessible
✅ Users can login and use the application
✅ No critical errors in logs
✅ Performance is acceptable (< 500ms response time)
✅ SSL/HTTPS working (if configured)
✅ Backups are being created regularly
✅ Team is confident in stability
✅ Users are satisfied with functionality

---

**Version**: 1.0.0
**Last Updated**: 2024-01-15
**Maintained by**: [Your Team Name]
