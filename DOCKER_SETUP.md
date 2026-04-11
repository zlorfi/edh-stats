# Docker Setup Guide

This project uses two different Docker Compose configurations for development and production environments.

## 🛠️ Development Setup (docker-compose.yml)

**Purpose**: Local development with hot reload and live code updates

### Features
- ✅ **Hot Reload**: Code changes instantly reflected without rebuilding
- ✅ **Volume Mounts**: Source code mounted for real-time updates
- ✅ **Vite Dev Server**: Fast HMR (Hot Module Replacement)
- ✅ **Development Dependencies**: Includes all dev tools

### Starting Development Environment

```bash
# Start all services (Postgres, Backend, Frontend)
docker compose up

# Start in detached mode
docker compose up -d

# Rebuild containers after dependency changes
docker compose up --build

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Access Points
- **Frontend Dev Server**: http://localhost:5173 (Vite with hot reload)
- **Backend API**: http://localhost:3002
- **PostgreSQL**: localhost:5432

### Important: CORS Configuration
The backend's `CORS_ORIGIN` is set to `http://localhost:5173` in development to match the Vite dev server port. If you change the frontend port, you must also update the `CORS_ORIGIN` environment variable in `docker-compose.yml`.

### How It Works

The frontend service:
- Uses `Dockerfile.dev` which runs `npm run dev`
- Mounts source directories as volumes
- Runs Vite dev server on port 5173
- Code changes trigger instant updates in the browser

### Volume Mounts
```yaml
volumes:
  - ./frontend/src:/app/src              # Svelte components
  - ./frontend/static:/app/static        # Static assets
  - ./frontend/svelte.config.js:/app/svelte.config.js
  - ./frontend/vite.config.js:/app/vite.config.js
  - ./frontend/tailwind.config.js:/app/tailwind.config.js
  - ./frontend/postcss.config.js:/app/postcss.config.js
  - /app/node_modules                    # Exclude from mount
  - /app/.svelte-kit                     # Exclude from mount
```

### Common Development Commands

```bash
# Restart just the frontend after config changes
docker compose restart frontend

# Rebuild frontend after package.json changes
docker compose up --build frontend

# View frontend logs
docker compose logs -f frontend

# Shell into frontend container
docker compose exec frontend sh

# Run npm commands in container
docker compose exec frontend npm run build
docker compose exec frontend npm install <package>
```

---

## 🚀 Production Setup (docker-compose.prod.deployed.yml)

**Purpose**: Production deployment with optimized builds

### Features
- ✅ **Production Build**: Optimized SvelteKit static build
- ✅ **Nginx Server**: Serves pre-built static files
- ✅ **No Volume Mounts**: Everything baked into the image
- ✅ **Resource Limits**: Memory and CPU constraints
- ✅ **Traefik Integration**: Automatic HTTPS with Let's Encrypt

### Generation

The production compose file is **automatically generated** by:

1. **GitHub Actions** (`.github/workflows/publish.yml`)
   - Runs on every push to `main` branch
   - Builds Docker images
   - Publishes to GitHub Container Registry
   - Generates `docker-compose.prod.deployed.yml`
   - Attaches to GitHub Release

2. **Local Script** (`deploy.sh`)
   ```bash
   ./deploy.sh --build-local
   ```

### Deployment

```bash
# Deploy to production
docker compose -f docker-compose.prod.deployed.yml up -d

# View logs
docker compose -f docker-compose.prod.deployed.yml logs -f

# Stop production
docker compose -f docker-compose.prod.deployed.yml down

# Update to new version
docker compose -f docker-compose.prod.deployed.yml pull
docker compose -f docker-compose.prod.deployed.yml up -d
```

### Access Points
- **Frontend**: https://edh.zlor.fi (via Traefik)
- **Backend API**: http://localhost:3002

### How It Works

The frontend service:
- Uses `Dockerfile.svelte` (production multi-stage build)
- Runs `npm run build` to create optimized static files
- Serves via Nginx on port 80
- Includes cache headers and compression
- No source code in the container

---

## 📊 Comparison

| Feature | Development | Production |
|---------|-------------|------------|
| **Compose File** | `docker-compose.yml` | `docker-compose.prod.deployed.yml` |
| **Frontend Dockerfile** | `Dockerfile.dev` | `Dockerfile.svelte` |
| **Frontend Server** | Vite Dev Server | Nginx |
| **Frontend Port** | 5173 | 80 |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Volume Mounts** | ✅ Yes | ❌ No |
| **Build Time** | Fast (no build) | Slower (full build) |
| **File Size** | Large | Small |
| **Resource Usage** | Higher | Lower |
| **Cache Busting** | Not needed | Automatic (Vite hashes) |
| **HTTPS/Traefik** | ❌ No | ✅ Yes |

---

## 🔧 Configuration Files

### Development
- `docker-compose.yml` - Main development compose file
- `frontend/Dockerfile.dev` - Dev container with Vite
- `frontend/vite.config.js` - Dev server config with API proxy

### Production  
- `docker-compose.prod.deployed.yml` - **Generated**, do not edit
- `frontend/Dockerfile.svelte` - Production multi-stage build
- `frontend/nginx.conf` - Nginx configuration for SPA

---

## 🐛 Troubleshooting

### Development Issues

**Problem**: Changes not reflecting  
**Solution**: Check that volumes are mounted correctly
```bash
docker compose down
docker compose up --build
```

**Problem**: Port 5173 already in use  
**Solution**: Change port in `docker-compose.yml`
```yaml
ports:
  - '5174:5173'  # Use different external port
```

**Problem**: Frontend can't connect to backend / CORS errors  
**Solution**: Ensure CORS_ORIGIN matches the frontend URL
```bash
# Check backend CORS configuration
docker compose logs backend | grep CORS

# Frontend is on port 5173, so backend needs:
# CORS_ORIGIN=http://localhost:5173

# Restart backend after changing CORS_ORIGIN
docker compose restart backend
```

### Production Issues

**Problem**: Old code being served  
**Solution**: Pull new images and restart
```bash
docker compose -f docker-compose.prod.deployed.yml pull
docker compose -f docker-compose.prod.deployed.yml up -d
```

**Problem**: 404 on page refresh  
**Solution**: Check nginx.conf has SPA fallback
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 📝 Best Practices

### Development Workflow

1. **Start Docker services once**:
   ```bash
   docker compose up -d
   ```

2. **Code normally**: Changes auto-reload in browser

3. **After package.json changes**:
   ```bash
   docker compose down
   docker compose up --build frontend
   ```

4. **Before committing**: Test production build
   ```bash
   cd frontend
   npm run build
   ```

### Production Deployment

1. **Let GitHub Actions build**: Push to `main` branch
2. **Download compose file**: From GitHub Release
3. **Deploy on server**:
   ```bash
   docker compose -f docker-compose.prod.deployed.yml pull
   docker compose -f docker-compose.prod.deployed.yml up -d
   ```

---

## 🔒 Environment Variables

### Development (.env or docker-compose.yml)
```bash
# Database
DB_NAME=edh_stats
DB_USER=postgres
DB_PASSWORD=edh_password

# Backend
JWT_SECRET=dev-jwt-secret-change-in-production
CORS_ORIGIN=http://localhost
ALLOW_REGISTRATION=true

# Frontend
VITE_API_URL=http://localhost:3002
```

### Production (.env on server)
```bash
# Database
DB_NAME=edh_stats
DB_USER=postgres
DB_PASSWORD=$(openssl rand -base64 32)

# Backend
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=https://yourdomain.com
ALLOW_REGISTRATION=false
LOG_LEVEL=warn

# No VITE_ vars needed - API proxy in nginx
```

---

## 🎯 Quick Reference

```bash
# Development
docker compose up                    # Start dev environment
docker compose logs -f frontend      # Watch frontend logs
docker compose restart frontend      # Restart after config change
docker compose down                  # Stop everything

# Production
docker compose -f docker-compose.prod.deployed.yml pull
docker compose -f docker-compose.prod.deployed.yml up -d
docker compose -f docker-compose.prod.deployed.yml logs -f
```

---

## 📚 Additional Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Vite Configuration](https://vitejs.dev/config/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Nginx SPA Configuration](https://www.nginx.com/blog/deploying-nginx-nginx-plus-docker/)
