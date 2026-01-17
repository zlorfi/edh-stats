# syntax=docker/dockerfile:1

# Builder stage with full Node.js image for compilation
FROM node:20-alpine AS builder

# Install build dependencies for any native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY . .

# Note: No build step needed for plain Node.js, but keeping structure for future TypeScript

# Production stage with minimal base image
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling and wget for health checks
RUN apk add --no-cache dumb-init wget

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs

WORKDIR /app

# Copy only production files from builder
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package.json ./
COPY --from=builder --chown=appuser:nodejs /app/src ./src

# Create directories for data and logs
RUN mkdir -p /app/data /app/logs && \
    chown -R appuser:nodejs /app/data /app/logs

USER appuser

EXPOSE 3000

# Health check with timeout and retries
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use dumb-init as PID 1 for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]