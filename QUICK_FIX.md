# Quick Fix for EDH Stats Deployment Issues

## Issue 1: Backend - "unable to open database file"
## Issue 2: Frontend - "host not found in upstream 'backend'"

This guide fixes both issues immediately.

## Step 1: Stop Services

```bash
docker-compose down
```

## Step 2: Update nginx.prod.conf

The nginx config needs to dynamically resolve the backend hostname. On your server, edit the nginx config:

Replace the HTTP/HTTPS server blocks with this simpler version:

```nginx
# Use resolver to dynamically resolve backend hostname
resolver 127.0.0.11 valid=10s;
set $backend_backend "backend:3000";

server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Rate limited API proxy
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://$backend_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Rate limited static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        limit_req zone=static burst=50 nodelay;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Main application routes
    location / {
        limit_req zone=static burst=10 nodelay;
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

## Step 3: Update docker-compose.yml - Frontend Ports

If other containers are using ports 80 and 443, update the frontend service to use alternate ports:

```yaml
  frontend:
    image: ghcr.io/zlorfi/edh-stats-frontend:v1.0.5
    ports:
      - '38080:80'  # Changed from 80:80
      - '30443:443' # Changed from 443:443
    restart: unless-stopped
    networks:
      - edh-stats-network
```

Then access the app at:
- HTTP: `http://your-server:38080`
- HTTPS: `https://your-server:30443` (when SSL configured)

## Step 4: Update docker-compose.yml - Init Service

Update the `init-db` service to use more permissive permissions:

```yaml
  init-db:
    image: alpine:latest
    volumes:
      - sqlite_data:/app/database/data
      - app_logs:/app/logs
    command: sh -c "mkdir -p /app/database/data /app/logs && chmod 777 /app/database/data /app/logs && touch /app/database/data/.initialized && echo 'Database directories initialized'"
    networks:
      - edh-stats-network
    restart: "no"
```

Key changes:
- Changed `chmod 755` to `chmod 777` for full read/write permissions
- Added `touch /app/database/data/.initialized` to create a test file
- Added `restart: "no"` so the init service doesn't restart

## Step 5: Clear Existing Volumes (Fresh Start)

⚠️ **WARNING: This will DELETE your database if you have data!**

If you want to start fresh:

```bash
docker volume rm edh-stats_sqlite_data edh-stats_app_logs 2>/dev/null || true
```

## Step 6: Start Services

```bash
docker-compose up -d
```

## Step 7: Monitor Startup

```bash
# Watch the init-db service create directories
docker-compose logs -f init-db

# Then watch the backend startup
docker-compose logs -f backend

# Check if all services are running
docker-compose ps
```

## Expected Output

After init-db runs and exits, you should see:

```
backend-1   | Database initialized successfully
backend-1   | Server started on port 3000
```

And:

```
frontend-1  | ... ready for start up
```

## Verify Everything Works

```bash
# Check API is responding (backend runs on port 3000 internally)
curl http://localhost:3000/api/health

# Check frontend is responding (now on port 38080)
curl http://localhost:38080/

# All containers running?
docker-compose ps
# Should show: backend (running), frontend (running), init-db (exited)

# Access the app in your browser
# HTTP: http://your-server-ip:38080
# HTTPS: https://your-server-ip:30443 (when SSL is configured)
```

## What Changed and Why

### Nginx Config Issue
The old config tried to resolve `backend` hostname at startup time before the backend container was ready. By using `resolver` and `set $backend_backend`, nginx defers resolution until request time, when the backend is running.

### Database Permissions Issue
Docker volumes sometimes have restricted permissions. By changing to `chmod 777`, the container has full permission to create and write the database file. The `touch` command creates a test file to verify permissions work.

### Init Service
The `init-db` service runs BEFORE the backend and ensures:
1. Directories exist
2. Directories are writable
3. Backend can then create the database successfully

## Still Having Issues?

### Check volume exists:
```bash
docker volume ls | grep edh-stats
```

### Check volume path is writable:
```bash
VOLUME_PATH=$(docker volume inspect edh-stats_sqlite_data | grep -o '"Mountpoint": "[^"]*' | cut -d'"' -f4)
echo "Volume at: $VOLUME_PATH"
ls -la "$VOLUME_PATH"
```

### Remove and recreate volumes:
```bash
docker-compose down
docker volume rm edh-stats_sqlite_data edh-stats_app_logs
docker-compose up -d
```

### Check logs for specific errors:
```bash
docker-compose logs --tail 100 backend
docker-compose logs --tail 100 frontend
```
