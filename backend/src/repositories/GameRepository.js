// Game Repository for all game-related database operations
import { Repository } from './Repository.js'
import dbManager from '../config/database.js'

export class GameRepository extends Repository {
  constructor() {
    super('games')
  }

  /**
   * Create a new game record
   */
  async createGame(gameData) {
    try {
      const result = await dbManager.query(
        `
        INSERT INTO ${this.tableName} (
          date, player_count, commander_id, won, rounds,
          starting_player_won, sol_ring_turn_one_won, notes, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
        [
          gameData.date,
          gameData.player_count,
          gameData.commander_id,
          gameData.won || false,
          gameData.rounds,
          gameData.starting_player_won || false,
          gameData.sol_ring_turn_one_won || false,
          gameData.notes || null,
          gameData.user_id
        ]
      )

      return result.rows[0]
    } catch (error) {
      throw new Error('Failed to create game')
    }
  }

  /**
   * Get games for a user with filtering and pagination
   */
  async getGamesByUserId(userId, limit = 50, offset = 0, filters = {}) {
    // Validate pagination parameters
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('Limit must be an integer between 1 and 100')
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('Offset must be a non-negative integer')
    }

    let query = `
      SELECT
        g.id,
        g.date,
        g.player_count,
        g.commander_id,
        g.won,
        g.rounds,
        g.starting_player_won,
        g.sol_ring_turn_one_won,
        g.notes,
        cmdr.name,
        cmdr.colors,
        g.created_at,
        g.updated_at
      FROM ${this.tableName} g
      LEFT JOIN commanders cmdr ON g.commander_id = cmdr.id
      WHERE g.user_id = $1
    `

    const params = [userId]
    let paramCount = 2

    // Apply filters with validation
    if (filters.commander) {
      if (typeof filters.commander !== 'string' || filters.commander.length > 100) {
        throw new Error('Commander filter must be a string with max 100 characters')
      }
      query += ` AND cmdr.name ILIKE $${paramCount}`
      params.push(`%${filters.commander}%`)
      paramCount++
    }

    if (filters.playerCount !== undefined) {
      if (!Number.isInteger(filters.playerCount) || filters.playerCount < 2 || filters.playerCount > 8) {
        throw new Error('Player count must be an integer between 2 and 8')
      }
      query += ` AND g.player_count = $${paramCount}`
      params.push(filters.playerCount)
      paramCount++
    }

    if (filters.commanderId !== undefined) {
      if (!Number.isInteger(filters.commanderId) || filters.commanderId <= 0) {
        throw new Error('Commander ID must be a positive integer')
      }
      query += ` AND g.commander_id = $${paramCount}`
      params.push(filters.commanderId)
      paramCount++
    }

    if (filters.dateFrom) {
      if (isNaN(Date.parse(filters.dateFrom))) {
        throw new Error('dateFrom must be a valid date')
      }
      query += ` AND g.date >= $${paramCount}`
      params.push(filters.dateFrom)
      paramCount++
    }

    if (filters.dateTo) {
      if (isNaN(Date.parse(filters.dateTo))) {
        throw new Error('dateTo must be a valid date')
      }
      query += ` AND g.date <= $${paramCount}`
      params.push(filters.dateTo)
      paramCount++
    }

    // Validate date range if both provided
    if (filters.dateFrom && filters.dateTo) {
      if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
        throw new Error('dateFrom must be before or equal to dateTo')
      }
    }

    if (filters.won !== undefined) {
      if (typeof filters.won !== 'boolean') {
        throw new Error('Won filter must be a boolean')
      }
      query += ` AND g.won = $${paramCount}`
      params.push(filters.won)
      paramCount++
    }

    query += ` ORDER BY g.date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`
    params.push(limit, offset)

    return dbManager.all(query, params)
  }

  /**
   * Export games for a user with filtering
   */
  async exportGamesByUserId(userId, filters = {}) {
    let query = `
      SELECT
        g.id,
        g.date,
        g.player_count,
        g.commander_id,
        g.won,
        g.rounds,
        g.starting_player_won,
        g.sol_ring_turn_one_won,
        g.notes,
        cmdr.name as commander_name,
        cmdr.colors as commander_colors,
        g.created_at,
        g.updated_at
      FROM ${this.tableName} g
      LEFT JOIN commanders cmdr ON g.commander_id = cmdr.id
      WHERE g.user_id = $1
    `

    const params = [userId]
    let paramCount = 2

    // Apply filters with validation
    if (filters.commander) {
      if (typeof filters.commander !== 'string' || filters.commander.length > 100) {
        throw new Error('Commander filter must be a string with max 100 characters')
      }
      query += ` AND cmdr.name ILIKE $${paramCount}`
      params.push(`%${filters.commander}%`)
      paramCount++
    }

    if (filters.playerCount !== undefined) {
      if (!Number.isInteger(filters.playerCount) || filters.playerCount < 2 || filters.playerCount > 8) {
        throw new Error('Player count must be an integer between 2 and 8')
      }
      query += ` AND g.player_count = $${paramCount}`
      params.push(filters.playerCount)
      paramCount++
    }

    if (filters.commanderId !== undefined) {
      if (!Number.isInteger(filters.commanderId) || filters.commanderId <= 0) {
        throw new Error('Commander ID must be a positive integer')
      }
      query += ` AND g.commander_id = $${paramCount}`
      params.push(filters.commanderId)
      paramCount++
    }

    if (filters.dateFrom) {
      if (isNaN(Date.parse(filters.dateFrom))) {
        throw new Error('dateFrom must be a valid date')
      }
      query += ` AND g.date >= $${paramCount}`
      params.push(filters.dateFrom)
      paramCount++
    }

    if (filters.dateTo) {
      if (isNaN(Date.parse(filters.dateTo))) {
        throw new Error('dateTo must be a valid date')
      }
      query += ` AND g.date <= $${paramCount}`
      params.push(filters.dateTo)
      paramCount++
    }

    // Validate date range if both provided
    if (filters.dateFrom && filters.dateTo) {
      if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
        throw new Error('dateFrom must be before or equal to dateTo')
      }
    }

    if (filters.won !== undefined) {
      if (typeof filters.won !== 'boolean') {
        throw new Error('Won filter must be a boolean')
      }
      query += ` AND g.won = $${paramCount}`
      params.push(filters.won)
      paramCount++
    }

    query += ` ORDER BY g.date DESC`

    return dbManager.all(query, params)
  }

  /**
   * Get game by ID with commander details
   */
  async getGameById(gameId, userId) {
    // Validate parameters
    if (!Number.isInteger(parseInt(gameId)) || parseInt(gameId) <= 0) {
      throw new Error('Game ID must be a positive integer')
    }
    
    const query = `
      SELECT
        g.id,
        g.date,
        g.player_count,
        g.commander_id,
        g.won,
        g.rounds,
        g.starting_player_won,
        g.sol_ring_turn_one_won,
        g.notes,
        g.user_id,
        cmdr.name as commander_name,
        cmdr.colors as commander_colors,
        g.created_at,
        g.updated_at
      FROM ${this.tableName} g
      LEFT JOIN commanders cmdr ON g.commander_id = cmdr.id
      WHERE g.id = $1 AND g.user_id = $2
    `

    return dbManager.get(query, [gameId, userId])
  }

  /**
   * Update a game record
   */
  async updateGame(gameId, userId, updateData) {
    // Verify ownership
    const existing = await this.getGameById(gameId, userId)
    if (!existing) {
      throw new Error('Game not found or access denied')
    }

    const updates = []
    const values = []
    let paramCount = 1

    const fieldMap = {
      date: 'date',
      commander_id: 'commanderId',
      player_count: 'playerCount',
      won: 'won',
      rounds: 'rounds',
      starting_player_won: 'startingPlayerWon',
      sol_ring_turn_one_won: 'solRingTurnOneWon',
      notes: 'notes'
    }

    // Handle both snake_case and camelCase
    for (const [dbField, dataField] of Object.entries(fieldMap)) {
      if (updateData[dbField] !== undefined) {
        updates.push(`${dbField} = $${paramCount}`)
        values.push(
          dbField.includes('won')
            ? updateData[dbField] || false
            : updateData[dbField]
        )
        paramCount++
      } else if (updateData[dataField] !== undefined) {
        updates.push(`${dbField} = $${paramCount}`)
        values.push(
          dbField.includes('won')
            ? updateData[dataField] || false
            : updateData[dataField]
        )
        paramCount++
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update')
    }

    values.push(gameId, userId)

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
   * Delete a game
   */
  async deleteGame(gameId, userId) {
    // Verify ownership
    const existing = await this.getGameById(gameId, userId)
    if (!existing) {
      throw new Error('Game not found or access denied')
    }

    const result = await dbManager.query(
      `DELETE FROM ${this.tableName} WHERE id = $1 AND user_id = $2`,
      [gameId, userId]
    )

    return result.rowCount > 0
  }

  /**
   * Find game by date and commander (for duplicate checking)
   */
  async findGameByDateAndCommander(userId, date, commanderId) {
    // Validate parameters
    if (isNaN(Date.parse(date))) {
      throw new Error('Date must be a valid date')
    }
    if (!Number.isInteger(commanderId) || commanderId <= 0) {
      throw new Error('Commander ID must be a positive integer')
    }

    try {
      const result = await dbManager.query(
        `
        SELECT * FROM ${this.tableName}
        WHERE user_id = $1 AND date = $2 AND commander_id = $3
        LIMIT 1
      `,
        [userId, date, commanderId]
      )
      return result.rows[0] || null
    } catch (error) {
      throw new Error('Failed to find game')
    }
  }

  /**
   * Get game statistics for a commander
   */
  async getCommanderGameStats(commanderId, userId) {
    // Validate parameters
    if (!Number.isInteger(commanderId) || commanderId <= 0) {
      throw new Error('Commander ID must be a positive integer')
    }

    const query = `
      SELECT
        COUNT(*) as total_games,
        SUM(CASE WHEN won = TRUE THEN 1 ELSE 0 END) as total_wins,
        AVG(rounds) as avg_rounds,
        AVG(CASE WHEN rounds > 0 THEN rounds ELSE NULL END) as avg_rounds_with_data,
        MAX(date) as last_played,
        SUM(CASE WHEN starting_player_won = TRUE THEN 1 ELSE 0 END) as starting_player_wins,
        SUM(CASE WHEN sol_ring_turn_one_won = TRUE THEN 1 ELSE 0 END) as sol_ring_wins
      FROM ${this.tableName}
      WHERE commander_id = $1 AND user_id = $2
    `

    return dbManager.get(query, [commanderId, userId])
  }
}

export default GameRepository
