import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import underPressure from '@fastify/under-pressure'
import rateLimit from '@fastify/rate-limit'
import closeWithGrace from 'close-with-grace'

// Import configurations
import { jwtConfig, corsConfig, rateLimitConfig, serverConfig } from './config/jwt.js'
import dbManager from './config/database.js'

// Import routes
import authRoutes from './routes/auth.js'
import commanderRoutes from './routes/commanders.js'
import gameRoutes from './routes/games.js'
import statsRoutes from './routes/stats.js'

export default async function build(opts = {}) {
  const app = fastify(opts)

  // Register plugins
  await app.register(cors, corsConfig)
  
  await app.register(jwt, {
    secret: jwtConfig.secret
  })

  // Authentication decorator
  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ 
        error: 'Unauthorized',
        message: 'Invalid or expired token' 
      })
    }
  })

  // Health check endpoint
  app.get('/api/health', async (request, reply) => {
    try {
      const db = await dbManager.initialize()
      const dbHealthy = await db.healthCheck()
      
      const status = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: dbHealthy ? 'connected' : 'disconnected'
      }
      
      if (dbHealthy) {
        return status
      } else {
        reply.code(503).send({
          ...status,
          status: 'unhealthy'
        })
      }
    } catch (error) {
      app.log.error('Health check failed:', error)
      reply.code(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      })
    }
  })

  // API routes
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(commanderRoutes, { prefix: '/api/commanders' })
  await app.register(gameRoutes, { prefix: '/api/games' })
  await app.register(statsRoutes, { prefix: '/api/stats' })

  // Test endpoint
  app.route({
    method: 'GET',
    url: '/test',
    handler: async (request, reply) => {
      return { message: 'Test endpoint works!' }
    }
  })

  // Root endpoint
  app.get('/', async (request, reply) => {
    return { 
      message: 'EDH/Commander Stats API',
      version: '1.0.0',
      status: 'running'
    }
  })

  // 404 handler
  app.setNotFoundHandler(async (request, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      message: 'The requested resource was not found'
    })
  })

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    app.log.error(error)
    
    // Handle validation errors
    if (error.validation) {
      reply.code(400).send({
        error: 'Validation Error',
        message: 'Request validation failed',
        details: error.validation
      })
      return
    }

    // Handle JWT errors
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authorization token required'
      })
      return
    }

    if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Token has expired'
      })
      return
    }

    if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid token'
      })
      return
    }

    // Handle rate limit errors
    if (error.statusCode === 429) {
      reply.code(429).send({
        error: 'Too Many Requests',
        message: error.message
      })
      return
    }

    // Generic error response
    reply.code(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    })
  })

  // Graceful shutdown
  closeWithGrace({ delay: 5000 }, async function ({ err, signal }) {
    if (err) {
      app.log.error({ err }, 'Error during shutdown')
    } else {
      app.log.info({ signal }, 'Received signal')
    }
    
    try {
      await dbManager.close()
      await app.close()
      process.exit(0)
    } catch (shutdownError) {
      app.log.error(shutdownError, 'Error during shutdown')
      process.exit(1)
    }
  })

  return app
}

// Start the server
async function start() {
  try {
    const app = await build({
      logger: {
        level: process.env.LOG_LEVEL || 'info'
        // transport: {
        //   target: 'pino-pretty'
        // }
      }
    })
    
    // Initialize database
    await dbManager.initialize()
    
    const port = serverConfig.port
    const host = serverConfig.host
    
    await app.listen({ port, host })
    
    app.log.info(`Server listening on http://${host}:${port}`)
    app.log.info(`Health check available at http://${host}:${port}/api/health`)
    
    return app
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start()
}
