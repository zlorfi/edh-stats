// Commander management routes
import { z } from 'zod'
import CommanderRepository from '../repositories/CommanderRepository.js'
import {
  hasNoDuplicateColors,
  formatValidationErrors
} from '../utils/validators.js'

// Validation schemas with enhanced validation
const createCommanderSchema = z.object({
  name: z
    .string('Commander name must be a string')
    .min(2, 'Commander name must be at least 2 characters')
    .max(100, 'Commander name must be less than 100 characters')
    .transform((val) => val.trim())
    .refine((val) => /^[a-zA-Z0-9\s,.\'-]+$/.test(val), {
      message: 'Commander name contains invalid characters'
    }),
  
  colors: z
    .array(
      z.enum(['W', 'U', 'B', 'R', 'G'], {
        errorMap: () => ({ message: 'Invalid color (must be W, U, B, R, or G)' })
      }),
      {
        errorMap: () => ({ message: 'Colors must be an array' })
      }
    )
    .min(1, 'Select at least one color')
    .max(5, 'Maximum 5 colors allowed')
    .refine((colors) => hasNoDuplicateColors(colors), {
      message: 'Duplicate colors are not allowed'
    })
})

const updateCommanderSchema = z.object({
  name: z
    .string('Commander name must be a string')
    .min(2, 'Commander name must be at least 2 characters')
    .max(100, 'Commander name must be less than 100 characters')
    .transform((val) => val.trim())
    .refine((val) => /^[a-zA-Z0-9\s,.\'-]+$/.test(val), {
      message: 'Commander name contains invalid characters'
    })
    .optional(),
  
  colors: z
    .array(
      z.enum(['W', 'U', 'B', 'R', 'G'], {
        errorMap: () => ({ message: 'Invalid color (must be W, U, B, R, or G)' })
      })
    )
    .min(1, 'Select at least one color')
    .max(5, 'Maximum 5 colors allowed')
    .refine((colors) => hasNoDuplicateColors(colors), {
      message: 'Duplicate colors are not allowed'
    })
    .optional()
})

const commanderQuerySchema = z.object({
  q: z
    .string('Search query must be a string')
    .min(1, 'Search query cannot be empty')
    .max(50, 'Search query limited to 50 characters')
    .optional(),
  limit: z
    .coerce
    .number('Limit must be a number')
    .int('Limit must be a whole number')
    .min(1, 'Minimum 1 commander per page')
    .max(50, 'Maximum 50 commanders per page')
    .default(20)
})

// Helper function to transform commander from DB format to API format
function transformCommander(cmd) {
  return {
    id: cmd.id,
    name: cmd.name,
    colors: cmd.colors || [],
    userId: cmd.user_id,
    totalGames: parseInt(cmd.total_games) || 0,
    totalWins: parseInt(cmd.total_wins) || 0,
    winRate: cmd.win_rate ? parseFloat(cmd.win_rate) : 0,
    avgRounds: cmd.avg_rounds ? parseFloat(cmd.avg_rounds) : 0,
    lastPlayed: cmd.last_played,
    createdAt: cmd.created_at,
    updatedAt: cmd.updated_at
  }
}

export default async function commanderRoutes(fastify, options) {
  // Initialize repository
  const commanderRepo = new CommanderRepository()

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
           commanders = await commanderRepo.searchCommandersByName(userId, q, limit)
         } else {
           commanders = await commanderRepo.getCommandersByUserId(userId, limit)
         }

        reply.send({
          commanders: commanders.map(transformCommander),
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

         const commander = await commanderRepo.findById(id)

         if (!commander || commander.user_id !== userId) {
           reply.code(404).send({
             error: 'Not Found',
             message: 'Commander not found'
           })
           return
         }

         reply.send({
           commander: {
             ...commander,
             colors: commander.colors || []
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
        const userId = request.user.id
        
        // LAYER 1: Schema validation
        const validatedData = createCommanderSchema.parse(request.body)

        // LAYER 2: Business logic validation
        // Check for duplicate commander name (case-insensitive)
        const existing = await commanderRepo.findByNameAndUserId(
          validatedData.name.toLowerCase(),
          userId
        )
        
        if (existing) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'Commander already exists',
            details: [`You already have a commander named "${validatedData.name}"`]
          })
        }

        // Convert colors array to JSON string for storage
        const colorsJson = JSON.stringify(validatedData.colors)
        const commander = await commanderRepo.createCommander(
          userId,
          validatedData.name,
          colorsJson
        )

         reply.code(201).send({
           message: 'Commander created successfully',
           commander: transformCommander(commander)
         })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: formatValidationErrors(error)
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

         // Convert colors array to JSON if provided
         const updatePayload = { ...updateData }
         if (updatePayload.colors) {
           updatePayload.colors = JSON.stringify(updatePayload.colors)
         }

         const updated = await commanderRepo.updateCommander(id, userId, updatePayload)

         if (!updated) {
           reply.code(400).send({
             error: 'Update Failed',
             message: 'No valid fields to update or commander not found'
           })
           return
         }

         const commander = await commanderRepo.findById(id)

          reply.send({
            message: 'Commander updated successfully',
            commander: transformCommander(commander)
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

         const deleted = await commanderRepo.deleteCommander(id, userId)

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

         const stats = await commanderRepo.getCommanderStats(id, userId)

         reply.send({
           stats: {
             ...stats,
             win_rate: Math.round(stats.win_rate || 0),
             avg_rounds: Math.round(stats.avg_rounds || 0)
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
         const commanders = await commanderRepo.getPopularCommandersByUserId(userId)

         reply.send({
           commanders: commanders.map(transformCommander)
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
