// Commander model for MTG commanders
import dbManager from '../config/database.js'

class Commander {
  static async create(commanderData) {
    try {
      const result = await dbManager.query(
        `
        INSERT INTO commanders (name, colors, user_id)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
        [commanderData.name, commanderData.colors, commanderData.userId]
      )

      return await this.findById(result.rows[0].id)
    } catch (error) {
      throw new Error('Failed to create commander')
    }
  }

  static async findById(id) {
    try {
      const commander = await dbManager.get(
        `
        SELECT id, name, colors, user_id, created_at, updated_at
        FROM commanders
        WHERE id = $1
      `,
        [id]
      )

      return commander
        ? {
            id: commander.id,
            name: commander.name,
            colors: commander.colors,
            userId: commander.user_id,
            createdAt: commander.created_at,
            updatedAt: commander.updated_at
          }
        : null
    } catch (error) {
      throw new Error('Failed to find commander')
    }
  }

  static async findByUserId(
    userId,
    limit = 50,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  ) {
    try {
      // Whitelist allowed sort columns to prevent SQL injection
      const allowedSortColumns = [
        'created_at',
        'updated_at',
        'name',
        'total_games'
      ]
      const safeSort = allowedSortColumns.includes(sortBy)
        ? sortBy
        : 'created_at'
      const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

      const query = `
        SELECT
          c.id,
          c.name,
          c.colors,
          c.user_id,
          c.created_at,
          c.updated_at,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id) as total_games,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = TRUE) as total_wins,
          (SELECT ROUND(COALESCE(COUNT(CASE WHEN won = TRUE THEN 1 END), 0)::NUMERIC * 100.0 / NULLIF(COUNT(*), 0), 2) FROM games WHERE commander_id = c.id) as win_rate,
          (SELECT ROUND(AVG(rounds)::NUMERIC, 2) FROM games WHERE commander_id = c.id) as avg_rounds,
          (SELECT MAX(date) FROM games WHERE commander_id = c.id) as last_played
        FROM commanders c
        WHERE c.user_id = $1
        ORDER BY ${safeSort} ${safeOrder}
        LIMIT $2 OFFSET $3
      `

      const commanders = await dbManager.all(query, [userId, limit, offset])

      // Parse colors JSONB for frontend and convert to camelCase
      return commanders.map((cmd) => ({
        id: cmd.id,
        name: cmd.name,
        colors: cmd.colors,
        userId: cmd.user_id,
        createdAt: cmd.created_at,
        updatedAt: cmd.updated_at,
        totalGames: cmd.total_games || 0,
        totalWins: cmd.total_wins || 0,
        winRate: cmd.win_rate || 0,
        avgRounds: cmd.avg_rounds || 0,
        lastPlayed: cmd.last_played
      }))
    } catch (error) {
      throw new Error('Failed to find commanders by user')
    }
  }

  static async update(id, updateData, userId) {
    try {
      // Check if commander exists and belongs to user
      const existing = await this.findById(id)
      if (!existing || existing.userId !== userId) {
        throw new Error('Commander not found or access denied')
      }

      const updates = []
      const values = []
      let paramCount = 1

      if (updateData.name !== undefined) {
        updates.push(`name = $${paramCount}`)
        values.push(updateData.name)
        paramCount++
      }

      if (updateData.colors !== undefined) {
        updates.push(`colors = $${paramCount}`)
        values.push(updateData.colors)
        paramCount++
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update')
      }

      values.push(id, userId)

      const result = await dbManager.query(
        `
        UPDATE commanders
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      `,
        values
      )

      return result.rowCount > 0
    } catch (error) {
      throw new Error('Failed to update commander')
    }
  }

  static async delete(id, userId) {
    try {
      // Check if commander exists and belongs to user
      const existing = await this.findById(id)
      if (!existing || existing.userId !== userId) {
        throw new Error('Commander not found or access denied')
      }

      const result = await dbManager.query(
        `
        DELETE FROM commanders
        WHERE id = $1 AND user_id = $2
      `,
        [id, userId]
      )

      return result.rowCount > 0
    } catch (error) {
      throw new Error('Failed to delete commander')
    }
  }

  static async getStats(id, userId) {
    try {
      const stats = await dbManager.get(
        `
        SELECT
          c.id,
          c.name,
          c.colors,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id) as total_games,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = TRUE) as total_wins,
          ROUND((SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = TRUE)::NUMERIC * 100.0 / NULLIF((SELECT COUNT(*) FROM games WHERE commander_id = c.id), 0), 2) as win_rate,
          (SELECT AVG(rounds) FROM games WHERE commander_id = c.id) as avg_rounds,
          (SELECT MAX(date) FROM games WHERE commander_id = c.id) as last_played
        FROM commanders c
        WHERE c.id = $1 AND c.user_id = $2
      `,
        [id, userId]
      )

      if (!stats) {
        throw new Error('Commander not found')
      }

      return {
        id: stats.id,
        name: stats.name,
        colors: stats.colors,
        totalGames: stats.total_games || 0,
        totalWins: stats.total_wins || 0,
        winRate: stats.win_rate || 0,
        avgRounds: stats.avg_rounds || 0,
        lastPlayed: stats.last_played
      }
    } catch (error) {
      throw new Error('Failed to get commander stats')
    }
  }

  static async search(userId, query, limit = 20) {
    try {
      const searchQuery = `%${query}%`
      const commanders = await dbManager.all(
        `
        SELECT
          c.id,
          c.name,
          c.colors,
          c.user_id,
          c.created_at,
          c.updated_at,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id) as total_games,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = TRUE) as total_wins,
          (SELECT ROUND(COALESCE(COUNT(CASE WHEN won = TRUE THEN 1 END), 0)::NUMERIC * 100.0 / NULLIF(COUNT(*), 0), 2) FROM games WHERE commander_id = c.id) as win_rate,
          (SELECT ROUND(AVG(rounds)::NUMERIC, 2) FROM games WHERE commander_id = c.id) as avg_rounds,
          (SELECT MAX(date) FROM games WHERE commander_id = c.id) as last_played
        FROM commanders c
        WHERE c.user_id = $1 AND c.name ILIKE $2
        ORDER BY c.name ASC
        LIMIT $3
      `,
        [userId, searchQuery, limit]
      )

      return commanders.map((cmd) => ({
        id: cmd.id,
        name: cmd.name,
        colors: cmd.colors,
        userId: cmd.user_id,
        createdAt: cmd.created_at,
        updatedAt: cmd.updated_at,
        totalGames: cmd.total_games || 0,
        totalWins: cmd.total_wins || 0,
        winRate: cmd.win_rate || 0,
        avgRounds: cmd.avg_rounds || 0,
        lastPlayed: cmd.last_played
      }))
    } catch (error) {
      throw new Error('Failed to search commanders')
    }
  }

  static async getPopular(userId, limit = 10) {
    try {
      const commanders = await dbManager.all(
        `
        SELECT
          c.id,
          c.name,
          c.colors,
          c.user_id,
          c.created_at,
          c.updated_at,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id) as total_games,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = TRUE) as total_wins,
          (SELECT ROUND(COALESCE(COUNT(CASE WHEN won = TRUE THEN 1 END), 0)::NUMERIC * 100.0 / NULLIF(COUNT(*), 0), 2) FROM games WHERE commander_id = c.id) as win_rate,
          (SELECT ROUND(AVG(rounds)::NUMERIC, 2) FROM games WHERE commander_id = c.id) as avg_rounds,
          (SELECT MAX(date) FROM games WHERE commander_id = c.id) as last_played
        FROM commanders c
        WHERE c.user_id = $1 AND (SELECT COUNT(*) FROM games WHERE commander_id = c.id) >= 5
        ORDER BY win_rate DESC, c.name ASC
        LIMIT $2
      `,
        [userId, limit]
      )

      return commanders.map((cmd) => ({
        id: cmd.id,
        name: cmd.name,
        colors: cmd.colors,
        userId: cmd.user_id,
        createdAt: cmd.created_at,
        updatedAt: cmd.updated_at,
        totalGames: cmd.total_games || 0,
        totalWins: cmd.total_wins || 0,
        winRate: cmd.win_rate || 0,
        avgRounds: cmd.avg_rounds || 0,
        lastPlayed: cmd.last_played
      }))
    } catch (error) {
      throw new Error('Failed to get popular commanders')
    }
  }
}

export default Commander
