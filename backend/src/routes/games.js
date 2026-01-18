// Game management routes
import { z } from 'zod'
import GameRepository from '../repositories/GameRepository.js'
import CommanderRepository from '../repositories/CommanderRepository.js'
import {
  validateDateRange,
  isNotSpam,
  formatValidationErrors
} from '../utils/validators.js'

// Validation schemas with comprehensive validation
const createGameSchema = z.object({
  date: z
    .string('Date must be a string')
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format (use YYYY-MM-DD)'
    })
    .refine((date) => validateDateRange(date), {
      message: 'Game date must be within the last year and not in the future'
    }),
  
  playerCount: z
    .number('Player count must be a number')
    .int('Player count must be a whole number')
    .min(2, 'Minimum 2 players required')
    .max(8, 'Maximum 8 players allowed'),
  
  commanderId: z
    .number('Commander ID must be a number')
    .int('Commander ID must be a whole number')
    .positive('Commander ID must be positive')
    .max(2147483647, 'Invalid commander ID'),
  
  won: z.boolean('Won must be true or false'),
  
  rounds: z
    .number('Rounds must be a number')
    .int('Rounds must be a whole number')
    .min(1, 'Minimum 1 round')
    .max(50, 'Maximum 50 rounds'),
  
  startingPlayerWon: z.boolean('Starting player won must be true or false'),
  solRingTurnOneWon: z.boolean('Sol ring turn one won must be true or false'),
  
  notes: z
    .string('Notes must be a string')
    .max(1000, 'Notes limited to 1000 characters')
    .optional()
    .transform((val) => val?.trim() || null)
    .refine((notes) => isNotSpam(notes), {
      message: 'Notes appear to be spam'
    })
})

const updateGameSchema = z.object({
  date: z
    .string('Date must be a string')
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format (use YYYY-MM-DD)'
    })
    .refine((date) => validateDateRange(date), {
      message: 'Game date must be within the last year and not in the future'
    })
    .optional(),
  
  commanderId: z
    .number('Commander ID must be a number')
    .int('Commander ID must be a whole number')
    .positive('Commander ID must be positive')
    .optional(),
  
  playerCount: z
    .number('Player count must be a number')
    .int('Player count must be a whole number')
    .min(2, 'Minimum 2 players required')
    .max(8, 'Maximum 8 players allowed')
    .optional(),
  
  won: z.boolean('Won must be true or false').optional(),
  
  rounds: z
    .number('Rounds must be a number')
    .int('Rounds must be a whole number')
    .min(1, 'Minimum 1 round')
    .max(50, 'Maximum 50 rounds')
    .optional(),
  
  startingPlayerWon: z.boolean('Starting player won must be true or false').optional(),
  solRingTurnOneWon: z.boolean('Sol ring turn one won must be true or false').optional(),
  
  notes: z
    .string('Notes must be a string')
    .max(1000, 'Notes limited to 1000 characters')
    .optional()
    .transform((val) => val?.trim() || null)
    .refine((notes) => isNotSpam(notes), {
      message: 'Notes appear to be spam'
    })
    .nullable()
})

const gameQuerySchema = z.object({
  q: z
    .string('Search query must be a string')
    .min(1, 'Search query cannot be empty')
    .max(50, 'Search query limited to 50 characters')
    .optional(),
  playerCount: z
    .coerce
    .number('Player count must be a number')
    .int('Player count must be a whole number')
    .min(2, 'Minimum 2 players required')
    .max(8, 'Maximum 8 players allowed')
    .optional(),
  commanderId: z
    .coerce
    .number('Commander ID must be a number')
    .int('Commander ID must be a whole number')
    .positive('Commander ID must be positive')
    .optional(),
  dateFrom: z
    .string('dateFrom must be a string')
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid dateFrom format (use YYYY-MM-DD)'
    })
    .optional(),
  dateTo: z
    .string('dateTo must be a string')
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid dateTo format (use YYYY-MM-DD)'
    })
    .optional(),
  won: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  limit: z
    .coerce
    .number('Limit must be a number')
    .int('Limit must be a whole number')
    .min(1, 'Minimum 1 game per page')
    .max(100, 'Maximum 100 games per page')
    .default(50),
  offset: z
    .coerce
    .number('Offset must be a number')
    .int('Offset must be a whole number')
    .min(0, 'Offset cannot be negative')
    .default(0)
}).refine(
  (data) => {
    if (data.dateFrom && data.dateTo) {
      return new Date(data.dateFrom) <= new Date(data.dateTo)
    }
    return true
  },
  {
    message: 'dateFrom must be before or equal to dateTo',
    path: ['dateFrom']
  }
)

const exportGameQuerySchema = z.object({
  commander: z
    .string('Commander filter must be a string')
    .max(100, 'Commander filter limited to 100 characters')
    .optional(),
  playerCount: z
    .coerce
    .number('Player count must be a number')
    .int('Player count must be a whole number')
    .min(2, 'Minimum 2 players required')
    .max(8, 'Maximum 8 players allowed')
    .optional(),
  commanderId: z
    .coerce
    .number('Commander ID must be a number')
    .int('Commander ID must be a whole number')
    .positive('Commander ID must be positive')
    .optional(),
  dateFrom: z
    .string('dateFrom must be a string')
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid dateFrom format (use YYYY-MM-DD)'
    })
    .optional(),
  dateTo: z
    .string('dateTo must be a string')
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid dateTo format (use YYYY-MM-DD)'
    })
    .optional(),
  won: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional()
}).refine(
  (data) => {
    if (data.dateFrom && data.dateTo) {
      return new Date(data.dateFrom) <= new Date(data.dateTo)
    }
    return true
  },
  {
    message: 'dateFrom must be before or equal to dateTo',
    path: ['dateFrom']
  }
)

export default async function gameRoutes(fastify, options) {
  // Initialize repositories
  const gameRepo = new GameRepository()
  const commanderRepo = new CommanderRepository()

  // Get all games for authenticated user with pagination and filtering
  fastify.get(
    '/',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
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
           const validatedQuery = gameQuerySchema.parse(request.query)
           const { q, limit, offset, playerCount, commanderId, dateFrom, dateTo, won } = validatedQuery
           const userId = request.user.id

           const filters = {}
           if (q) {
             filters.commander = q
           }
           if (playerCount !== undefined) {
             filters.playerCount = playerCount
           }
           if (commanderId !== undefined) {
             filters.commanderId = commanderId
           }
           if (dateFrom !== undefined) {
             filters.dateFrom = dateFrom
           }
           if (dateTo !== undefined) {
             filters.dateTo = dateTo
           }
           if (won !== undefined) {
             filters.won = won
           }

           let games = await gameRepo.getGamesByUserId(userId, limit, offset, filters)

          // Transform database results to camelCase with commander info
          const transformedGames = games.map((game) => ({
            id: game.id,
            date: new Date(game.date).toLocaleDateString('en-US'),
            playerCount: game.player_count,
            commanderId: game.commander_id,
            won: game.won,
            rounds: game.rounds,
            startingPlayerWon: game.starting_player_won,
            solRingTurnOneWon: game.sol_ring_turn_one_won,
            notes: game.notes || null,
            commanderName: game.name,
            commanderColors: game.colors || [],
            userId: game.user_id,
            createdAt: game.created_at,
            updatedAt: game.updated_at
          }))

         reply.send({
           games: transformedGames,
           pagination: {
             total: transformedGames.length,
             page: Math.floor(limit / 20) + 1,
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
            fastify.log.error('Get games error:', error)
            reply.code(500).send({
              error: 'Internal Server Error',
              message: 'Failed to fetch games'
            })
          }
        }
     }
  )

  // Get specific game
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

          // Validate game ID parameter
          const gameId = parseInt(id)
          if (isNaN(gameId) || gameId <= 0) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: 'Invalid game ID',
              details: ['Game ID must be a positive integer']
            })
          }

          const game = await gameRepo.getGameById(gameId, userId)

         if (!game) {
          reply.code(404).send({
            error: 'Not Found',
            message: 'Game not found'
          })
          return
        }

         reply.send({
             game: {
               id: game.id,
               date: new Date(game.date).toLocaleDateString('en-US'),
               playerCount: game.player_count,
               commanderId: game.commander_id,
               won: game.won,
               rounds: game.rounds,
               startingPlayerWon: game.starting_player_won,
               solRingTurnOneWon: game.sol_ring_turn_one_won,
               notes: game.notes || null,
               commanderName: game.commander_name,
               commanderColors: game.commander_colors || [],
               createdAt: game.created_at,
               updatedAt: game.updated_at
             }
           })
      } catch (error) {
        fastify.log.error('Get game error:', error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch game'
        })
      }
    }
  )

  // Create new game
  fastify.post(
    '/',
    {
      config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
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
        const validatedData = createGameSchema.parse(request.body)

         // LAYER 2: Business logic validation
         // Check commander exists and belongs to user
         const commander = await commanderRepo.findById(validatedData.commanderId)
         
         if (!commander || commander.user_id !== userId) {
           return reply.code(400).send({
             error: 'Bad Request',
             message: 'Invalid commander ID or commander not found',
             details: ['Commander does not exist or does not belong to you']
           })
         }

        // Convert camelCase to snake_case for database
        const gameData = {
          date: validatedData.date,
          player_count: validatedData.playerCount,
          commander_id: validatedData.commanderId,
          won: validatedData.won,
          rounds: validatedData.rounds,
          starting_player_won: validatedData.startingPlayerWon,
          sol_ring_turn_one_won: validatedData.solRingTurnOneWon,
          notes: validatedData.notes,
          user_id: userId
        }

        const game = await gameRepo.createGame(gameData)
        
        // Fetch the game with commander details
        const gameWithCommander = await gameRepo.getGameById(game.id, userId)

        reply.code(201).send({
          message: 'Game logged successfully',
          game: {
            id: gameWithCommander.id,
            date: new Date(gameWithCommander.date).toLocaleDateString('en-US'),
            playerCount: gameWithCommander.player_count,
            commanderId: gameWithCommander.commander_id,
            won: gameWithCommander.won,
            rounds: gameWithCommander.rounds,
            startingPlayerWon: gameWithCommander.starting_player_won,
            solRingTurnOneWon: gameWithCommander.sol_ring_turn_one_won,
            notes: gameWithCommander.notes || null,
            commanderName: gameWithCommander.commander_name,
            commanderColors: gameWithCommander.commander_colors || [],
            createdAt: gameWithCommander.created_at,
            updatedAt: gameWithCommander.updated_at
          }
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid input data',
            details: formatValidationErrors(error)
          })
        } else {
          fastify.log.error('Create game error:', error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to log game'
          })
        }
      }
    }
  )

  // Update game
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
          
          // Validate game ID parameter
          const gameId = parseInt(id)
          if (isNaN(gameId) || gameId <= 0) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: 'Invalid game ID',
              details: ['Game ID must be a positive integer']
            })
          }

          const updateData = updateGameSchema.parse(request.body)

           // LAYER 2: Business logic validation
           // Check commander exists and belongs to user if updating commander
           if (updateData.commanderId !== undefined) {
             const commander = await commanderRepo.findById(updateData.commanderId)
             
             if (!commander || commander.user_id !== userId) {
               return reply.code(400).send({
                 error: 'Bad Request',
                 message: 'Invalid commander ID or commander not found',
                 details: ['Commander does not exist or does not belong to you']
               })
             }
           }

         // Convert camelCase to snake_case for database
         const gameData = {}
         if (updateData.date !== undefined) gameData.date = updateData.date
         if (updateData.commanderId !== undefined)
           gameData.commander_id = updateData.commanderId
         if (updateData.playerCount !== undefined)
           gameData.player_count = updateData.playerCount
         if (updateData.won !== undefined) gameData.won = updateData.won
         if (updateData.rounds !== undefined) gameData.rounds = updateData.rounds
         if (updateData.startingPlayerWon !== undefined)
           gameData.starting_player_won = updateData.startingPlayerWon
         if (updateData.solRingTurnOneWon !== undefined)
           gameData.sol_ring_turn_one_won = updateData.solRingTurnOneWon
         if (updateData.notes !== undefined) gameData.notes = updateData.notes

         const updated = await gameRepo.updateGame(gameId, userId, gameData)

        if (!updated) {
          reply.code(400).send({
            error: 'Update Failed',
            message: 'No valid fields to update or game not found'
          })
          return
        }

         const game = await gameRepo.getGameById(gameId, userId)

            reply.send({
              message: 'Game updated successfully',
             game: {
               id: game.id,
               date: new Date(game.date).toLocaleDateString('en-US'),
               playerCount: game.player_count,
               commanderId: game.commander_id,
               won: game.won,
               rounds: game.rounds,
               startingPlayerWon: game.starting_player_won,
               solRingTurnOneWon: game.sol_ring_turn_one_won,
               notes: game.notes || null,
               commanderName: game.commander_name,
               commanderColors: game.commander_colors || [],
               createdAt: game.created_at,
               updatedAt: game.updated_at
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
          fastify.log.error('Update game error:', error)
          reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Failed to update game'
          })
        }
      }
    }
  )

  // Delete game
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

          // Validate game ID parameter
          const gameId = parseInt(id)
          if (isNaN(gameId) || gameId <= 0) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: 'Invalid game ID',
              details: ['Game ID must be a positive integer']
            })
          }

          const deleted = await gameRepo.deleteGame(gameId, userId)

         if (!deleted) {
          reply.code(404).send({
            error: 'Not Found',
            message: 'Game not found'
          })
          return
        }

        reply.send({
          message: 'Game deleted successfully'
        })
      } catch (error) {
        fastify.log.error('Delete game error:', error)
        reply.code(500).send({
          error: 'Failed to delete game'
        })
        }
      }
  )

  // Export games as JSON
  fastify.get(
    '/export',
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
         
         // Validate and parse export query parameters
         const validatedQuery = exportGameQuerySchema.parse(request.query)
         
         const filters = {}
         if (validatedQuery.commander !== undefined) filters.commander = validatedQuery.commander
         if (validatedQuery.playerCount !== undefined) filters.playerCount = validatedQuery.playerCount
         if (validatedQuery.commanderId !== undefined) filters.commanderId = validatedQuery.commanderId
         if (validatedQuery.dateFrom !== undefined) filters.dateFrom = validatedQuery.dateFrom
         if (validatedQuery.dateTo !== undefined) filters.dateTo = validatedQuery.dateTo
         if (validatedQuery.won !== undefined) filters.won = validatedQuery.won

          const games = await gameRepo.exportGamesByUserId(userId, filters)
         
         // Generate filename with current date
        const today = new Date().toLocaleDateString('en-US').replace(/\//g, '_')
        const filename = `edh_games_${today}.json`
        
        // Set appropriate headers for file download
        reply.header('Content-Type', 'application/json')
        reply.header('Content-Disposition', `attachment; filename="${filename}"`)
        
        const exportData = {
          metadata: {
            exportDate: new Date().toISOString(),
            totalGames: games.length,
            userId: userId
          },
          games: games
        }
        
         reply.send(exportData)
       } catch (error) {
         if (error instanceof z.ZodError) {
           return reply.code(400).send({
             error: 'Validation Error',
             message: 'Invalid filter parameters',
             details: formatValidationErrors(error)
           })
         } else {
           fastify.log.error('Export games error:', error)
           reply.code(500).send({
             error: 'Internal Server Error',
             message: 'Failed to export games'
           })
         }
       }
     }
   )
}
