import dbManager from '../config/database.js'

export default async function statsRoutes(fastify, options) {
  fastify.get(
    '/overview',
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

        const stats = await dbManager.get(
          `
        SELECT
          total_games,
          win_rate,
          total_commanders,
          avg_rounds
        FROM user_stats
        WHERE user_id = $1
      `,
          [userId]
        )

        // Also query games directly to verify
        const directGameCount = await dbManager.get(
          `
        SELECT COUNT(*) as count FROM games WHERE user_id = $1
      `,
          [userId]
        )

        reply.send({
          totalGames: stats?.total_games || 0,
          winRate: stats?.win_rate || 0,
          totalCommanders: stats?.total_commanders || 0,
          avgRounds: Math.round(stats?.avg_rounds || 0)
        })
      } catch (error) {
        fastify.log.error('Get stats overview error:', error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch stats overview'
        })
      }
    }
  )

  // Detailed commander stats and chart data
  fastify.get(
    '/commanders',
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

        // Get detailed commander stats with at least 5 games, sorted by total games then win rate
        const rawStats = await dbManager.all(
          `
          SELECT * FROM commander_stats
          WHERE user_id = $1 AND total_games >= 5
          ORDER BY total_games DESC, win_rate DESC
        `,
          [userId]
        )

        // Convert snake_case to camelCase
        const stats = rawStats.map((stat) => ({
          commanderId: stat.commander_id,
          name: stat.name,
          colors: stat.colors,
          userId: stat.user_id,
          totalGames: stat.total_games,
          totalWins: stat.total_wins,
          winRate: stat.win_rate,
          avgRounds: stat.avg_rounds,
          startingPlayerWins: stat.starting_player_wins,
          solRingWins: stat.sol_ring_wins,
          lastPlayed: stat.last_played
        }))

        // Calculate chart data: Win Rate by Player Count
        const playerCountStats = await dbManager.all(
          `
         SELECT
           player_count,
           COUNT(*) as total,
           SUM(CASE WHEN won = TRUE THEN 1 ELSE 0 END) as wins
         FROM games
         WHERE user_id = $1
         GROUP BY player_count
         ORDER BY player_count
       `,
          [userId]
        )

        // Calculate chart data: Win Rate by Color (simple single color approximation for now)
        // Note: Real multi-color handling is complex in SQL, this matches exact color identity strings
        const colorStats = await dbManager.all(
          `
         SELECT
           c.colors,
           COUNT(g.id) as total,
           SUM(CASE WHEN g.won = TRUE THEN 1 ELSE 0 END) as wins
         FROM games g
         JOIN commanders c ON g.commander_id = c.id
         WHERE g.user_id = $1
         GROUP BY c.colors
       `,
          [userId]
        )

        reply.send({
          stats,
          charts: {
            playerCounts: {
              labels: playerCountStats.map((s) => `${s.player_count} Players`),
              data: playerCountStats.map((s) =>
                Math.round((s.wins / s.total) * 100)
              )
            },
             colors: {
               labels: colorStats.map((s) => (Array.isArray(s.colors) ? s.colors.join('') : '')),
               data: colorStats.map((s) => Math.round((s.wins / s.total) * 100))
             }
          }
        })
      } catch (error) {
        fastify.log.error('Get commander stats error:', error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch detailed stats'
        })
      }
    }
  )
}
