import { z } from 'zod'

export default async function statsRoutes(fastify, options) {
  fastify.get('/overview', {
    preHandler: [async (request, reply) => {
      try {
        await request.jwtVerify()
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
      }
    }]
  }, async (request, reply) => {
    // Placeholder response - to be implemented in Phase 3
    reply.send({
      total_games: 0,
      win_rate: 0,
      total_commanders: 0,
      avg_rounds: 0
    })
  })
}