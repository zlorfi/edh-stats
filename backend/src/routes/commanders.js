// Commander management routes
import { z } from 'zod'
import Commander from '../models/Commander.js'

// Validation schemas
const createCommanderSchema = z.object({
  name: z.string().min(2).max(100),
  colors: z
    .array(z.enum(['W', 'U', 'B', 'R', 'G']))
    .min(1)
    .max(5)
})

const updateCommanderSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  colors: z
    .array(z.enum(['W', 'U', 'B', 'R', 'G']))
    .min(1)
    .max(5)
    .optional()
})

const commanderQuerySchema = z.object({
  q: z.string().min(1).max(50).optional(),
  limit: z.coerce.number().min(1).max(50).default(20)
})

export default async function commanderRoutes(fastify, options) {
  // Get all commanders for the authenticated user
  fastify.get(
    '/',
    {
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ]
    },
    async (request, reply) => {
      try {
        const { q, limit } = commanderQuerySchema.parse(request.query)
        const userId = request.user.id

        let commanders
        if (q) {
          commanders = await Commander.search(userId, q, limit)
        } else {
          commanders = await Commander.findByUserId(userId, limit)
        }

        reply.send({
          commanders,
          total: commanders.length
        })
      } catch (error) {
        fastify.log.error('Get commanders error:', error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch commanders'
        })
      }
    }
  )

  // Get specific commander
  fastify.get(
    '/:id',
    {
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ]
    },
    async (request, reply) => {
      try {
        const { id } = request.params
        const userId = request.user.id

        const commander = await Commander.findById(id)

        if (!commander || commander.userId !== userId) {
          reply.code(404).send({
            error: 'Not Found',
            message: 'Commander not found'
          })
          return
        }

        reply.send({
          commander: {
            ...commander,
            colors: JSON.parse(commander.colors)
          }
        })
      } catch (error) {
        fastify.log.error('Get commander error:', error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch commander'
        })
      }
    }
  )

  // Create new commander
  fastify.post(
    '/',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ]
    },
    async (request, reply) => {
      try {
        // Manually parse since fastify.decorate request.user is set by jwtVerify
        const userId = request.user.id
        const validatedData = createCommanderSchema.parse(request.body)

        const commander = await Commander.create({
          ...validatedData,
          userId
        })

        reply.code(201).send({
          message: 'Commander created successfully',
          commander: {
            ...commander,
            colors: JSON.parse(commander.colors)
          }
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors.map((e) => e.message)
          })
        } else {
          fastify.log.error('Create commander error:', error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to create commander'
          })
        }
      }
    }
  )

  // Update commander
  fastify.put(
    '/:id',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ]
    },
    async (request, reply) => {
      try {
        const { id } = request.params
        const userId = request.user.id
        const updateData = updateCommanderSchema.parse(request.body)

        const updated = await Commander.update(id, updateData, userId)

        if (!updated) {
          reply.code(400).send({
            error: 'Update Failed',
            message: 'No valid fields to update or commander not found'
          })
          return
        }

        const commander = await Commander.findById(id)

        reply.send({
          message: 'Commander updated successfully',
          commander: {
            ...commander,
            colors: JSON.parse(commander.colors)
          }
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: error.errors.map((e) => e.message)
          })
        } else {
          fastify.log.error('Update commander error:', error.message || error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to update commander'
          })
        }
      }
    }
  )

  // Delete commander
  fastify.delete(
    '/:id',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ]
    },
    async (request, reply) => {
      try {
        const { id } = request.params
        const userId = request.user.id

        const deleted = await Commander.delete(id, userId)

        if (!deleted) {
          reply.code(404).send({
            error: 'Not Found',
            message: 'Commander not found'
          })
          return
        }

        reply.send({
          message: 'Commander deleted successfully'
        })
      } catch (error) {
        fastify.log.error('Delete commander error:', error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete commander'
        })
      }
    }
  )

  // Get commander stats
  fastify.get(
    '/:id/stats',
    {
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ]
    },
    async (request, reply) => {
      try {
        const { id } = request.params
        const userId = request.user.id

        const stats = await Commander.getStats(id, userId)

        reply.send({
          stats: {
            ...stats,
            win_rate: Math.round(stats.winRate || 0),
            avg_rounds: Math.round(stats.avgRounds || 0)
          }
        })
      } catch (error) {
        fastify.log.error('Get commander stats error:', error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch commander stats'
        })
      }
    }
  )

  // Get popular commanders
  fastify.get(
    '/popular',
    {
      preHandler: [
        async (request, reply) => {
          try {
            await request.jwtVerify()
          } catch (err) {
            reply.code(401).send({
              error: 'Unauthorized',
              message: 'Invalid or expired token'
            })
          }
        }
      ]
    },
    async (request, reply) => {
      try {
        const userId = request.user.id
        const commanders = await Commander.getPopular(userId)

        reply.send({
          commanders
        })
      } catch (error) {
        fastify.log.error('Get popular commanders error:', error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch popular commanders'
        })
      }
    }
  )
}
