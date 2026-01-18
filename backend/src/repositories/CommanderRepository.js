// Commander Repository for all commander-related database operations
import { Repository } from './Repository.js'
import dbManager from '../config/database.js'

export class CommanderRepository extends Repository {
  constructor() {
    super('commanders')
  }

  /**
   * Create a new commander
   */
  async createCommander(userId, name, colors) {
    try {
      const result = await dbManager.query(
        `
        INSERT INTO ${this.tableName} (name, colors, user_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, colors, user_id, created_at, updated_at
      `,
        [name, colors, userId]
      )

      return result.rows[0]
    } catch (error) {
      throw new Error('Failed to create commander')
    }
  }

  /**
   * Get commanders for a user with pagination and sorting
   */
  async getCommandersByUserId(
    userId,
    limit = 50,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  ) {
    // Validate pagination parameters
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new Error('Limit must be an integer between 1 and 50')
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('Offset must be a non-negative integer')
    }

    // Whitelist allowed sort columns
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
      FROM ${this.tableName} c
      WHERE c.user_id = $1
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT $2 OFFSET $3
    `

    return dbManager.all(query, [userId, limit, offset])
  }

  /**
   * Search commanders by name for a user
   */
  async searchCommandersByName(userId, query, limit = 20, offset = 0) {
    // Validate parameters
    if (typeof query !== 'string' || query.length === 0 || query.length > 100) {
      throw new Error('Search query must be a non-empty string with max 100 characters')
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new Error('Limit must be an integer between 1 and 50')
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('Offset must be a non-negative integer')
    }

    const searchQuery = `%${query}%`

    const sql = `
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
      FROM ${this.tableName} c
      WHERE c.user_id = $1 AND c.name ILIKE $2
      ORDER BY c.name ASC
      LIMIT $3 OFFSET $4
    `

    return dbManager.all(sql, [userId, searchQuery, limit, offset])
  }

  /**
   * Get popular commanders for a user (with 5+ games)
   */
  async getPopularCommandersByUserId(userId, limit = 10) {
    // Validate limit parameter
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new Error('Limit must be an integer between 1 and 50')
    }

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
      FROM ${this.tableName} c
      WHERE c.user_id = $1 AND (SELECT COUNT(*) FROM games WHERE commander_id = c.id) >= 5
      ORDER BY win_rate DESC, c.name ASC
      LIMIT $2
    `

    return dbManager.all(query, [userId, limit])
  }

  /**
   * Get commander statistics
   */
  async getCommanderStats(commanderId, userId) {
    // Validate parameters
    if (!Number.isInteger(commanderId) || commanderId <= 0) {
      throw new Error('Commander ID must be a positive integer')
    }

    const query = `
      SELECT
        c.id,
        c.name,
        c.colors,
        (SELECT COUNT(*) FROM games WHERE commander_id = c.id) as total_games,
        (SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = TRUE) as total_wins,
        ROUND((SELECT COUNT(*) FROM games WHERE commander_id = c.id AND won = TRUE)::NUMERIC * 100.0 / NULLIF((SELECT COUNT(*) FROM games WHERE commander_id = c.id), 0), 2) as win_rate,
        (SELECT AVG(rounds) FROM games WHERE commander_id = c.id) as avg_rounds,
        (SELECT MAX(date) FROM games WHERE commander_id = c.id) as last_played
      FROM ${this.tableName} c
      WHERE c.id = $1 AND c.user_id = $2
    `

    return dbManager.get(query, [commanderId, userId])
  }

  /**
   * Update a commander
   */
  async updateCommander(commanderId, userId, updateData) {
    // Verify ownership
    const existing = await this.findById(commanderId)
    if (!existing || existing.user_id !== userId) {
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

    values.push(commanderId, userId)

    const query = `
      UPDATE ${this.tableName}
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `

    const result = await dbManager.query(query, values)
    return result.rows[0]
  }

  /**
   * Find commander by name and user
   */
  async findByNameAndUserId(name, userId) {
    try {
      const result = await dbManager.query(
        `SELECT * FROM ${this.tableName} WHERE LOWER(name) = LOWER($1) AND user_id = $2`,
        [name, userId]
      )
      return result.rows[0] || null
    } catch (error) {
      throw new Error('Failed to find commander')
    }
  }

  /**
   * Delete a commander
   */
  async deleteCommander(commanderId, userId) {
    // Verify ownership
    const existing = await this.findById(commanderId)
    if (!existing || existing.user_id !== userId) {
      throw new Error('Commander not found or access denied')
    }

    const result = await dbManager.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 AND user_id = $2`,
      [commanderId, userId]
    )

    return result.rowCount > 0
  }
}

export default CommanderRepository
