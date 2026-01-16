// Commander model for MTG commanders
import dbManager from '../config/database.js'

class Commander {
  static async create(commanderData) {
    const db = await dbManager.initialize()

    try {
      const result = db
        .prepare(
          `
        INSERT INTO commanders (name, colors, user_id)
        VALUES (?, ?, ?)
      `
        )
        .run([
          commanderData.name,
          JSON.stringify(commanderData.colors),
          commanderData.userId
        ])

      return await this.findById(result.lastInsertRowid)
    } catch (error) {
      throw new Error('Failed to create commander')
    }
  }

  static async findById(id) {
    const db = await dbManager.initialize()

    try {
      const commander = db
        .prepare(
          `
        SELECT id, name, colors, user_id, created_at, updated_at
        FROM commanders
        WHERE id = ?
      `
        )
        .get([id])

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
    const db = await dbManager.initialize()

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
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = 1) as total_wins,
          (SELECT ROUND(COALESCE(COUNT(CASE WHEN won = 1 THEN 1 END), 0) * 100.0 / NULLIF(COUNT(*), 0), 2) FROM games WHERE commander_id = c.id) as win_rate,
          (SELECT ROUND(AVG(rounds), 2) FROM games WHERE commander_id = c.id) as avg_rounds,
          (SELECT MAX(date) FROM games WHERE commander_id = c.id) as last_played
        FROM commanders c
        WHERE c.user_id = ?
        ORDER BY ${safeSort} ${safeOrder}
        LIMIT ? OFFSET ?
      `

      const commanders = db.prepare(query).all([userId, limit, offset])

      // Parse colors JSON for frontend and convert to camelCase
      return commanders.map((cmd) => ({
        id: cmd.id,
        name: cmd.name,
        colors: JSON.parse(cmd.colors || '[]'),
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
    const db = await dbManager.initialize()

    try {
      // Check if commander exists and belongs to user
      const existing = await this.findById(id)
      if (!existing || existing.userId !== userId) {
        throw new Error('Commander not found or access denied')
      }

      const updates = []
      const values = []

      if (updateData.name !== undefined) {
        updates.push('name = ?')
        values.push(updateData.name)
      }

      if (updateData.colors !== undefined) {
        updates.push('colors = ?')
        values.push(JSON.stringify(updateData.colors))
      }

      updates.push('updated_at = CURRENT_TIMESTAMP')

      if (updates.length === 0) {
        throw new Error('No valid fields to update')
      }

      const result = db
        .prepare(
          `
        UPDATE commanders
        SET ${updates.join(', ')}
        WHERE id = ? AND user_id = ?
      `
        )
        .run([...values, id, userId])

      return result.changes > 0
    } catch (error) {
      throw new Error('Failed to update commander')
    }
  }

  static async delete(id, userId) {
    const db = await dbManager.initialize()

    try {
      // Check if commander exists and belongs to user
      const existing = await this.findById(id)
      if (!existing || existing.userId !== userId) {
        throw new Error('Commander not found or access denied')
      }

      const result = db
        .prepare(
          `
        DELETE FROM commanders
        WHERE id = ? AND user_id = ?
      `
        )
        .run([id, userId])

      return result.changes > 0
    } catch (error) {
      throw new Error('Failed to delete commander')
    }
  }

  static async getStats(id, userId) {
    const db = await dbManager.initialize()

    try {
      const stats = db
        .prepare(
          `
        SELECT
          c.id,
          c.name,
          c.colors,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id) as total_games,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = 1) as total_wins,
          ROUND((SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = 1) * 100.0 / NULLIF((SELECT COUNT(*) FROM games WHERE commander_id = c.id), 0), 2) as win_rate,
          (SELECT AVG(rounds) FROM games WHERE commander_id = c.id) as avg_rounds,
          (SELECT MAX(date) FROM games WHERE commander_id = c.id) as last_played
        FROM commanders c
        WHERE c.id = ? AND c.user_id = ?
      `
        )
        .get([id, userId])

      if (!stats) {
        throw new Error('Commander not found')
      }

      return {
        id: stats.id,
        name: stats.name,
        colors: JSON.parse(stats.colors),
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
    const db = await dbManager.initialize()

    try {
      const searchQuery = `%${query}%`
      const commanders = db
        .prepare(
          `
        SELECT
          c.id,
          c.name,
          c.colors,
          c.user_id,
          c.created_at,
          c.updated_at,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id) as total_games,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = 1) as total_wins,
          (SELECT ROUND(COALESCE(COUNT(CASE WHEN won = 1 THEN 1 END), 0) * 100.0 / NULLIF(COUNT(*), 0), 2) FROM games WHERE commander_id = c.id) as win_rate,
          (SELECT ROUND(AVG(rounds), 2) FROM games WHERE commander_id = c.id) as avg_rounds,
          (SELECT MAX(date) FROM games WHERE commander_id = c.id) as last_played
        FROM commanders c
        WHERE c.user_id = ? AND c.name LIKE ?
        ORDER BY c.name ASC
        LIMIT ?
      `
        )
        .all([userId, searchQuery, limit])

      return commanders.map((cmd) => ({
        id: cmd.id,
        name: cmd.name,
        colors: JSON.parse(cmd.colors || '[]'),
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
    const db = await dbManager.initialize()

    try {
      const commanders = db
        .prepare(
          `
        SELECT
          c.id,
          c.name,
          c.colors,
          c.user_id,
          c.created_at,
          c.updated_at,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id) as total_games,
          (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = 1) as total_wins,
          (SELECT ROUND(COALESCE(COUNT(CASE WHEN won = 1 THEN 1 END), 0) * 100.0 / NULLIF(COUNT(*), 0), 2) FROM games WHERE commander_id = c.id) as win_rate,
          (SELECT ROUND(AVG(rounds), 2) FROM games WHERE commander_id = c.id) as avg_rounds,
          (SELECT MAX(date) FROM games WHERE commander_id = c.id) as last_played
        FROM commanders c
        WHERE c.user_id = ? AND (SELECT COUNT(*) FROM games WHERE commander_id = c.id) >= 5
        ORDER BY win_rate DESC, c.name ASC
        LIMIT ?
      `
        )
        .all([userId, limit])

      return commanders.map((cmd) => ({
        id: cmd.id,
        name: cmd.name,
        colors: JSON.parse(cmd.colors || '[]'),
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
