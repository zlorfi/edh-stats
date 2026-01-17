# EDH Stats - Deployment Checklist

## Pre-Deployment Verification

### Code Quality
- [x] No SQLite references remain
- [x] All database operations use async/await
- [x] All queries are parameterized
- [x] Error handling implemented
- [x] Transaction support working
- [x] Repository pattern applied

### Docker & Build
- [x] package-lock.json synchronized
- [x] Dockerfile using correct npm syntax
- [x] All dependencies installed
- [x] Docker build completes without errors

### Configuration
- [x] .env.example created with PostgreSQL variables
- [x] docker-compose.yml updated for PostgreSQL
- [x] deploy.sh updated for production
- [x] GitHub Actions workflow updated

### Documentation
- [x] POSTGRES_MIGRATION_COMPLETE.md created
- [x] MIGRATION_STATUS.md created
- [x] Repository pattern documented
- [x] Deployment procedures documented

---

## Development Deployment

### Prerequisites
- Docker installed
- Docker Compose installed
- Git repository cloned

### Deployment Steps

```bash
# 1. Navigate to project directory
cd /path/to/edh-stats

# 2. Start all services
docker-compose up

# 3. Wait for services to start
# Expected output:
# - postgres: "database system is ready to accept connections"
# - db-migrate: "Migrations completed successfully!"
# - backend: "Server listening on http://0.0.0.0:3000"
# - frontend: "nginx running"

# 4. Verify services are running
docker-compose ps

# 5. Test API endpoint
curl http://localhost:3002/api/health
```

### Verification
- [ ] PostgreSQL is running
- [ ] Migrations completed successfully
- [ ] Backend API is responsive
- [ ] Frontend is accessible at http://localhost:8081
- [ ] Database has test data

### Testing
```bash
# Run migrations manually
docker-compose exec backend node src/database/migrate.js migrate

# Seed sample data
docker-compose exec backend node src/database/migrate.js seed

# Query database
docker-compose exec postgres psql -U edh_user -d edh_stats
```

---

## Production Deployment

### Prerequisites
- Docker and Docker Compose installed
- GitHub Container Registry access
- GHCR token with write:packages permission
- `.env` file with production secrets

### Build & Push Images

```bash
# 1. Navigate to project directory
cd /path/to/edh-stats

# 2. Set GitHub user (if not already set)
export GITHUB_USER=your-github-username

# 3. Build and push images
./deploy.sh 1.0.0 <GHCR_TOKEN>

# Expected output:
# - Version file updated
# - Backend image built and pushed
# - Frontend image built and pushed
# - Deployment config generated
```

### Create Environment File

```bash
# 1. Create .env file
cat > .env << 'ENVEOF'
# PostgreSQL Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=edh_stats
DB_USER=edh_user
DB_PASSWORD=$(openssl rand -base64 32)

# Application
NODE_ENV=production
LOG_LEVEL=warn

# Security
JWT_SECRET=$(openssl rand -base64 32)

# CORS
CORS_ORIGIN=https://yourdomain.com

# Registration
ALLOW_REGISTRATION=false
ENVEOF

# 2. Review .env file
cat .env

# 3. Make sure passwords are secure
# The script generates random passwords above, but review them!
```

### Deploy Services

```bash
# 1. Pull latest images
docker pull ghcr.io/your-username/edh-stats-backend:1.0.0
docker pull ghcr.io/your-username/edh-stats-frontend:1.0.0

# 2. Start services
docker-compose -f docker-compose.prod.deployed.yml up -d

# 3. Monitor migrations
docker-compose logs -f db-migrate

# 4. Wait for migrations to complete
# Expected output:
# db-migrate: "Migrations completed successfully!"

# 5. Check all services are running
docker-compose ps

# 6. Verify services are healthy
docker-compose exec backend curl http://localhost:3000/api/health
```

### Post-Deployment Verification

- [ ] PostgreSQL is running and healthy
- [ ] Database migrations completed successfully
- [ ] Backend API is responding to health checks
- [ ] Frontend is accessible via reverse proxy
- [ ] SSL/TLS certificate is valid (if behind proxy)
- [ ] Application logs show no errors
- [ ] Database has expected schema

### Testing Production Deployment

```bash
# Test API health
curl https://yourdomain.com/api/health

# Check version
curl https://yourdomain.com/api/auth/config

# Monitor logs
docker-compose logs -f backend

# Database check
docker-compose exec postgres pg_isready -U edh_user
```

---

## Rollback Procedure (if needed)

### If Build Fails
```bash
# Review logs
docker-compose logs backend

# Stop services
docker-compose down

# Check Dockerfile changes
git diff HEAD~1 backend/Dockerfile

# Revert if necessary
git revert HEAD
```

### If Migration Fails
```bash
# Check migration logs
docker-compose logs db-migrate

# Review migration SQL
cat backend/src/database/migrations.sql

# Restart migration container
docker-compose restart db-migrate

# Monitor migration progress
docker-compose logs -f db-migrate
```

### If Database Issues
```bash
# Stop all services
docker-compose down

# Remove database volume (WARNING: deletes data!)
docker volume rm edh-stats_postgres_data

# Restart services
docker-compose -f docker-compose.prod.deployed.yml up -d

# Migrations will run automatically on fresh start
```

### Complete Rollback to Previous Version

```bash
# Checkout previous commit
git checkout HEAD~5

# Rebuild everything
docker-compose down -v
docker-compose build --no-cache

# Start fresh
docker-compose up -d

# Monitor startup
docker-compose logs -f
```

---

## Monitoring & Maintenance

### Regular Checks
```bash
# Daily health check
docker-compose exec backend curl http://localhost:3000/api/health

# Weekly database backup
docker exec edh-stats-postgres pg_dump -U edh_user -d edh_stats > backup-$(date +%Y%m%d).sql

# Monitor container resources
docker stats
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Connection refused" | Check PostgreSQL is running: `docker-compose ps` |
| "Migrations failed" | Review logs: `docker-compose logs db-migrate` |
| "Database is locked" | Stop and restart container: `docker-compose restart postgres` |
| "Out of memory" | Increase Docker memory limit or reduce connection pool |
| "Port already in use" | Change port in docker-compose.yml or stop conflicting service |

### Performance Monitoring

```bash
# Connection pool status
docker-compose exec postgres psql -U edh_user -d edh_stats -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Slow queries (if enabled)
docker-compose exec postgres psql -U edh_user -d edh_stats -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Database size
docker-compose exec postgres psql -U edh_user -d edh_stats -c "SELECT pg_size_pretty(pg_database_size('edh_stats'));"
```

---

## Sign-Off

| Task | Status | Date |
|------|--------|------|
| Code Review | ✅ Complete | |
| Docker Build Test | ✅ Complete | |
| Documentation Review | ✅ Complete | |
| Development Deployment | ⬜ Pending | |
| Production Deployment | ⬜ Pending | |
| Health Verification | ⬜ Pending | |
| Performance Testing | ⬜ Pending | |

---

## Support

For issues or questions:
1. Check MIGRATION_STATUS.md
2. Review POSTGRES_MIGRATION_COMPLETE.md
3. Check docker-compose logs
4. Review Dockerfile changes
5. Verify environment configuration

---

**Last Updated**: January 17, 2026
**Version**: PostgreSQL Migration Complete
**Status**: Ready for Deployment
