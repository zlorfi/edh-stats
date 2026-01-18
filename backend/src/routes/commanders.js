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
    .default(20),
  offset: z
    .coerce
    .number('Offset must be a number')
    .int('Offset must be a whole number')
    .min(0, 'Offset cannot be negative')
    .default(0),
  sortBy: z
    .enum(['created_at', 'updated_at', 'name', 'total_games'])
    .default('created_at')
    .optional(),
  sortOrder: z
    .enum(['ASC', 'DESC'])
    .default('DESC')
    .optional()
})

const popularCommandersQuerySchema = z.object({
  limit: z
    .coerce
    .number('Limit must be a number')
    .int('Limit must be a whole number')
    .min(1, 'Minimum 1 commander')
    .max(50, 'Maximum 50 commanders')
    .default(10)
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
         const { q, limit, offset, sortBy, sortOrder } = commanderQuerySchema.parse(request.query)
         const userId = request.user.id

         let commanders
         if (q) {
           commanders = await commanderRepo.searchCommandersByName(userId, q, limit, offset)
         } else {
           commanders = await commanderRepo.getCommandersByUserId(userId, limit, offset, sortBy, sortOrder)
         }

        reply.send({
          commanders: commanders.map(transformCommander),
          pagination: {
            total: commanders.length,
            limit,
            offset
          }
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid query parameters',
            details: formatValidationErrors(error)
          })
        } else {
          fastify.log.error('Get commanders error:', error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to fetch commanders'
          })
        }
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

         // Validate commander ID parameter
         const commanderId = parseInt(id)
         if (isNaN(commanderId) || commanderId <= 0) {
           return reply.code(400).send({
             error: 'Bad Request',
             message: 'Invalid commander ID',
             details: ['Commander ID must be a positive integer']
           })
         }

         const commander = await commanderRepo.findById(commanderId)

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
         // Check if user has reached max commander limit (100)
         const commanderCount = await commanderRepo.countCommandersByUserId(userId)
         if (commanderCount >= 100) {
           return reply.code(409).send({
             error: 'Conflict',
             message: 'Commander limit reached',
             details: ['You have reached the maximum of 100 commanders. Delete some to add more.']
           })
         }

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
           const formattedErrors = formatValidationErrors(error)
           const firstError = formattedErrors[0]?.message || 'Invalid input data'
           return reply.code(400).send({
             error: 'Validation Error',
             message: firstError,
             details: formattedErrors
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

         // Validate commander ID parameter
         const commanderId = parseInt(id)
         if (isNaN(commanderId) || commanderId <= 0) {
           return reply.code(400).send({
             error: 'Bad Request',
             message: 'Invalid commander ID',
             details: ['Commander ID must be a positive integer']
           })
         }

         const updateData = updateCommanderSchema.parse(request.body)

         // Convert colors array to JSON if provided
         const updatePayload = { ...updateData }
         if (updatePayload.colors) {
           updatePayload.colors = JSON.stringify(updatePayload.colors)
         }

         const updated = await commanderRepo.updateCommander(commanderId, userId, updatePayload)

         if (!updated) {
           reply.code(400).send({
             error: 'Update Failed',
             message: 'No valid fields to update or commander not found'
           })
           return
         }

          const commander = await commanderRepo.findById(commanderId)

           reply.send({
             message: 'Commander updated successfully',
             commander: transformCommander(commander)
           })
       } catch (error) {
         if (error instanceof z.ZodError) {
           const formattedErrors = formatValidationErrors(error)
           const firstError = formattedErrors[0]?.message || 'Invalid input data'
           reply.code(400).send({
             error: 'Validation Error',
             message: firstError,
             details: formattedErrors
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

         // Validate commander ID parameter
         const commanderId = parseInt(id)
         if (isNaN(commanderId) || commanderId <= 0) {
           return reply.code(400).send({
             error: 'Bad Request',
             message: 'Invalid commander ID',
             details: ['Commander ID must be a positive integer']
           })
         }

         const deleted = await commanderRepo.deleteCommander(commanderId, userId)

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

         // Validate commander ID parameter
         const commanderId = parseInt(id)
         if (isNaN(commanderId) || commanderId <= 0) {
           return reply.code(400).send({
             error: 'Bad Request',
             message: 'Invalid commander ID',
             details: ['Commander ID must be a positive integer']
           })
         }

         const stats = await commanderRepo.getCommanderStats(commanderId, userId)

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
         const { limit } = popularCommandersQuerySchema.parse(request.query)
         const userId = request.user.id
         const commanders = await commanderRepo.getPopularCommandersByUserId(userId, limit)

         reply.send({
           commanders: commanders.map(transformCommander),
           pagination: {
             total: commanders.length,
             limit
           }
         })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid query parameters',
            details: formatValidationErrors(error)
          })
        } else {
          fastify.log.error('Get popular commanders error:', error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to fetch popular commanders'
          })
        }
      }
    }
  )
}
