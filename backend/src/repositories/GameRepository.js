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

    // Apply filters
    if (filters.commander) {
      query += ` AND cmdr.name ILIKE $${paramCount}`
      params.push(`%${filters.commander}%`)
      paramCount++
    }

    if (filters.playerCount) {
      query += ` AND g.player_count = $${paramCount}`
      params.push(filters.playerCount)
      paramCount++
    }

    if (filters.commanderId) {
      query += ` AND g.commander_id = $${paramCount}`
      params.push(filters.commanderId)
      paramCount++
    }

    if (filters.dateFrom) {
      query += ` AND g.date >= $${paramCount}`
      params.push(filters.dateFrom)
      paramCount++
    }

    if (filters.dateTo) {
      query += ` AND g.date <= $${paramCount}`
      params.push(filters.dateTo)
      paramCount++
    }

     if (filters.won !== undefined) {
       query += ` AND g.won = $${paramCount}`
       params.push(filters.won)
       paramCount++
     }

     if (filters.roundsMin !== undefined) {
       query += ` AND g.rounds >= $${paramCount}`
       params.push(filters.roundsMin)
       paramCount++
     }

     if (filters.roundsMax !== undefined) {
       query += ` AND g.rounds <= $${paramCount}`
       params.push(filters.roundsMax)
       paramCount++
     }

     if (filters.colors && filters.colors.length > 0) {
       // Filter by commander color identity - checks if colors array contains any of the specified colors
       const colorConditions = filters.colors.map(() => {
         const condition = `cmdr.colors @> $${paramCount}::jsonb`
         paramCount++
         return condition
       })
       query += ` AND (${colorConditions.join(' OR ')})`
       filters.colors.forEach(color => {
         params.push(JSON.stringify([color]))
       })
       paramCount -= filters.colors.length
       paramCount += filters.colors.length
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

    // Apply filters
    if (filters.commander) {
      query += ` AND cmdr.name ILIKE $${paramCount}`
      params.push(`%${filters.commander}%`)
      paramCount++
    }

    if (filters.playerCount) {
      query += ` AND g.player_count = $${paramCount}`
      params.push(filters.playerCount)
      paramCount++
    }

    if (filters.commanderId) {
      query += ` AND g.commander_id = $${paramCount}`
      params.push(filters.commanderId)
      paramCount++
    }

    if (filters.dateFrom) {
      query += ` AND g.date >= $${paramCount}`
      params.push(filters.dateFrom)
      paramCount++
    }

     if (filters.dateTo) {
       query += ` AND g.date <= $${paramCount}`
       params.push(filters.dateTo)
       paramCount++
     }

     if (filters.won !== undefined) {
       query += ` AND g.won = $${paramCount}`
       params.push(filters.won)
       paramCount++
     }

     if (filters.roundsMin !== undefined) {
       query += ` AND g.rounds >= $${paramCount}`
       params.push(filters.roundsMin)
       paramCount++
     }

     if (filters.roundsMax !== undefined) {
       query += ` AND g.rounds <= $${paramCount}`
       params.push(filters.roundsMax)
       paramCount++
     }

     if (filters.colors && filters.colors.length > 0) {
       // Filter by commander color identity
       const colorConditions = filters.colors.map(() => {
         const condition = `cmdr.colors @> $${paramCount}::jsonb`
         paramCount++
         return condition
       })
       query += ` AND (${colorConditions.join(' OR ')})`
       filters.colors.forEach(color => {
         params.push(JSON.stringify([color]))
       })
       paramCount -= filters.colors.length
       paramCount += filters.colors.length
     }

     query += ` ORDER BY g.date DESC`

     return dbManager.all(query, params)
  }

  /**
   * Get game by ID with commander details
   */
  async getGameById(gameId, userId) {
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
