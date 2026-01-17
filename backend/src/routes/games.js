// Game management routes
import { z } from 'zod'
import GameRepository from '../repositories/GameRepository.js'

// Validation schemas
const createGameSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format'
  }),
  playerCount: z.number().int().min(2).max(8),
  commanderId: z.number().int().positive(),
  won: z.boolean(),
  rounds: z.number().int().min(1).max(50),
  startingPlayerWon: z.boolean(),
  solRingTurnOneWon: z.boolean(),
  notes: z.string().max(1000).optional()
})

const updateGameSchema = z.object({
  date: z.string().optional(),
  commanderId: z.number().int().positive().optional(),
  playerCount: z.number().int().min(2).max(8).optional(),
  won: z.boolean().optional(),
  rounds: z.number().int().min(1).max(50).optional(),
  startingPlayerWon: z.boolean().optional(),
  solRingTurnOneWon: z.boolean().optional(),
  notes: z.string().max(1000).optional().nullable()
})

const gameQuerySchema = z.object({
  q: z.string().min(1).max(50).optional(),
  limit: z.coerce.number().min(1).default(50),
  offset: z.coerce.number().default(0)
})

export default async function gameRoutes(fastify, options) {
  // Initialize repository
  const gameRepo = new GameRepository()

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
         const { q, limit, offset } = gameQuerySchema.parse(request.query)
         const userId = request.user.id

         const filters = {}
         if (q) {
           filters.commander = q
         }

         let games = await gameRepo.getGamesByUserId(userId, limit, offset, filters)

        reply.send({
          games,
          pagination: {
            total: games.length,
            page: Math.floor(limit / 20) + 1,
            limit,
            offset
          }
        })
      } catch (error) {
        fastify.log.error('Get games error:', error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch games'
        })
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

         const game = await gameRepo.getGameById(id, userId)

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
              userId: game.user_id,
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
         const validatedData = createGameSchema.parse(request.body)
         const userId = request.user.id

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

          reply.code(201).send({
            message: 'Game logged successfully',
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
              userId: game.user_id,
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
        const updateData = updateGameSchema.parse(request.body)

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

         const updated = await gameRepo.updateGame(id, userId, gameData)

        if (!updated) {
          reply.code(400).send({
            error: 'Update Failed',
            message: 'No valid fields to update or game not found'
          })
          return
        }

         const game = await gameRepo.getGameById(id, userId)

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
              userId: game.user_id,
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

         const deleted = await gameRepo.deleteGame(id, userId)

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
        const filters = {}
        
        // Parse optional query filters
        if (request.query.commander) filters.commander = request.query.commander
        if (request.query.playerCount) filters.playerCount = parseInt(request.query.playerCount)
        if (request.query.commanderId) filters.commanderId = parseInt(request.query.commanderId)
        if (request.query.dateFrom) filters.dateFrom = request.query.dateFrom
        if (request.query.dateTo) filters.dateTo = request.query.dateTo

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
        fastify.log.error('Export games error:', error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to export games'
        })
      }
    }
  )
}
