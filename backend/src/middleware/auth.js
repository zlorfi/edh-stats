// Verify JWT token
export const verifyJWT = async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    })
  }
}

// Optional JWT verification (doesn't fail if no token)
export const optionalJWT = async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    // Token is optional, so we don't fail
    request.user = null
  }
}

// Check if user exists and is active
export const validateUser = async (request, reply) => {
  try {
    const user = request.user
    if (!user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'User not authenticated'
      })
    }

    // You could add additional user validation here
    // e.g., check if user is active, banned, etc.
  } catch (err) {
    reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Failed to validate user'
    })
  }
}

// Extract user ID from token and validate resource ownership
export const validateOwnership = (
  resourceParam = 'id',
  resourceTable = 'commanders'
) => {
  return async (request, reply) => {
    try {
      const user = request.user
      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'User not authenticated'
        })
      }

      const resourceId = request.params[resourceParam]
      if (!resourceId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Resource ID not provided'
        })
      }

      const db = await import('../config/database.js').then((m) => m.default)
      const database = await db.initialize()

      // Check if user owns the resource
      const query = `SELECT user_id FROM ${resourceTable} WHERE id = ?`
      const resource = database.prepare(query).get([resourceId])

      if (!resource) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Resource not found'
        })
      }

      if (resource.user_id !== user.id) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Access denied to this resource'
        })
      }

      // Add resource to request object for later use
      request.resourceId = resourceId
    } catch (err) {
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to validate ownership'
      })
    }
  }
}

// Rate limiting middleware for sensitive endpoints
export const rateLimitAuth = {
  config: {
    rateLimit: {
      max: 5, // 5 requests
      timeWindow: '1 minute', // per minute
      skipOnError: false
    }
  }
}

// Rate limiting for general API endpoints
export const rateLimitGeneral = {
  config: {
    rateLimit: {
      max: 100, // 100 requests
      timeWindow: '1 minute', // per minute
      skipOnError: false
    }
  }
}
