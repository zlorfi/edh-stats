// Game management routes
import { z } from 'zod'
import Game from '../models/Game.js'

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
  notes: z.string().max(1000).optional()
})

const gameQuerySchema = z.object({
  q: z.string().min(1).max(50).optional(),
  limit: z.coerce.number().min(1).default(50),
  offset: z.coerce.number().default(0)
})

export default async function gameRoutes(fastify, options) {
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
          filters.commander = `%${q}%`
        }

        let games = await Game.findByUserId(userId, limit, offset, filters)

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

        const game = await Game.findById(id)

        if (!game || game.user_id !== userId) {
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
            commanderColors: JSON.parse(game.commander_colors || '[]'),
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
          won: validatedData.won ? 1 : 0,
          rounds: validatedData.rounds,
          starting_player_won: validatedData.startingPlayerWon ? 1 : 0,
          sol_ring_turn_one_won: validatedData.solRingTurnOneWon ? 1 : 0,
          notes: validatedData.notes,
          userId
        }

        const game = await Game.create(gameData)

        reply.code(201).send({
          message: 'Game logged successfully',
          game
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

        const updated = await Game.update(id, gameData, userId)

        if (!updated) {
          reply.code(400).send({
            error: 'Update Failed',
            message: 'No valid fields to update or game not found'
          })
          return
        }

        const game = await Game.findById(id)

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

        const deleted = await Game.delete(id, userId)

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
}
