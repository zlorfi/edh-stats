# Docker Compose Test Instructions

## Prerequisites
- Docker installed and running
- Docker Compose installed
- Port 5432 (PostgreSQL) available
- Port 3002 (Backend) available
- Port 8081 (Frontend) available

## Step 1: Clean Previous Containers (if any)

```bash
# Stop all containers
docker-compose down

# Remove all volumes (WARNING: deletes data)
docker volume rm edh-stats_postgres_data
```

## Step 2: Start Services

```bash
# Build and start all services
docker-compose up

# Expected output sequence:
# 1. postgres: "database system is ready to accept connections"
# 2. postgres: "PostgreSQL init process complete; ready for start up."
# 3. db-migrate: "Running database migrations..."
# 4. db-migrate: "Migrations completed successfully!"
# 5. backend: "Server listening on http://0.0.0.0:3000"
```

## Step 3: Verify Services

```bash
# In another terminal, check if services are running
docker-compose ps

# Expected output:
# NAME                   STATUS
# edh-stats-postgres     Up (healthy)
# edh-stats-db-migrate   Exited (0) - migration completed
# edh-stats-backend      Up (healthy)
# edh-stats-frontend     Up
```

## Step 4: Test API

```bash
# Test health endpoint
curl http://localhost:3002/api/health

# Expected response:
# {"status":"healthy","timestamp":"2026-01-17T...","uptime":...,"database":"connected"}
```

## Step 5: Test Database

```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d edh_stats

# In psql prompt, test queries:
psql> SELECT * FROM users LIMIT 5;
psql> SELECT * FROM commanders LIMIT 5;
psql> SELECT * FROM games LIMIT 5;
psql> \q
```

## Step 6: Verify Frontend

```bash
# Open browser and visit
http://localhost:8081

# Should see EDH Stats application
```

## Troubleshooting

### "role postgres does not exist"
```bash
# The postgres superuser should exist. If not:
docker-compose down -v
docker-compose up
```

### "database edh_stats does not exist"
```bash
# Check if init script ran
docker-compose logs postgres | grep "init"

# If not, restart:
docker-compose restart postgres
docker-compose restart db-migrate
```

### "Connection refused"
```bash
# Wait longer for postgres to start
docker-compose logs postgres

# Should see "PostgreSQL init process complete"
```

### "Backend can't connect to database"
```bash
# Check backend logs
docker-compose logs backend

# Check if db-migrate completed successfully
docker-compose logs db-migrate

# If migrations failed, review the error and run manually:
docker-compose exec backend node src/database/migrate.js migrate
```

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (optional, deletes database)
docker volume rm edh-stats_postgres_data

# Remove images (optional)
docker rmi edh-stats-backend edh-stats-db-migrate postgres:16-alpine nginx:alpine
```

## Expected Results

✅ PostgreSQL running and healthy  
✅ Database migrations completed successfully  
✅ Backend API responding to health checks  
✅ Frontend accessible via HTTP  
✅ Test data available in database  

If all above checks pass, the migration is successful!
