// Game model for EDH game tracking
import dbManager from '../config/database.js'

class Game {
  static async create(gameData) {
    try {
      const result = await dbManager.query(
        `
        INSERT INTO games (
          date, player_count, commander_id, won, rounds,
          starting_player_won, sol_ring_turn_one_won, notes, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
        [
          gameData.date,
          gameData.player_count,
          gameData.commander_id,
          gameData.won || false,
          gameData.rounds,
          gameData.startingPlayerWon || false,
          gameData.solRingTurnOneWon || false,
          gameData.notes || null,
          gameData.userId
        ]
      )

      return await this.findById(result.rows[0].id)
    } catch (error) {
      throw new Error('Failed to create game')
    }
  }

  static async findById(id) {
    try {
      const game = await dbManager.get(
        `
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
        FROM games g
        LEFT JOIN commanders cmdr ON g.commander_id = cmdr.id
        WHERE g.id = $1
      `,
        [id]
      )

      return game
    } catch (error) {
      throw new Error('Failed to find game')
    }
  }

  static async findByUserId(userId, limit = 50, offset = 0, filters = {}) {
    try {
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
        FROM games g
        LEFT JOIN commanders cmdr ON g.commander_id = cmdr.id
        WHERE g.user_id = $1
      `

      const params = [userId]
      let paramCount = 2

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

      query += ` ORDER BY g.date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`
      params.push(limit, offset)

      const games = await dbManager.all(query, params)

      // Parse dates for frontend and transform to camelCase
      return games.map((game) => ({
        id: game.id,
        date: new Date(game.date).toLocaleDateString('en-US'),
        playerCount: game.player_count,
        commanderId: game.commander_id,
        won: game.won,
        rounds: game.rounds || 0,
        startingPlayerWon: game.starting_player_won,
        solRingTurnOneWon: game.sol_ring_turn_one_won,
        notes: game.notes,
        commanderName: game.name,
        commanderColors: game.colors || [],
        createdAt: game.created_at,
        updatedAt: game.updated_at
      }))
    } catch (error) {
      throw new Error('Failed to find games by user')
    }
  }

  static async exportByUserId(userId, filters = {}) {
    try {
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
        FROM games g
        LEFT JOIN commanders cmdr ON g.commander_id = cmdr.id
        WHERE g.user_id = $1
      `

      const params = [userId]
      let paramCount = 2

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

      query += ` ORDER BY g.date DESC`

      const games = await dbManager.all(query, params)

      // Return data for export (minimal transformation)
      return games.map((game) => ({
        id: game.id,
        date: game.date,
        playerCount: game.player_count,
        commanderId: game.commander_id,
        commanderName: game.commander_name,
        commanderColors: game.commander_colors || [],
        won: game.won,
        rounds: game.rounds || 0,
        startingPlayerWon: game.starting_player_won,
        solRingTurnOneWon: game.sol_ring_turn_one_won,
        notes: game.notes,
        createdAt: game.created_at,
        updatedAt: game.updated_at
      }))
    } catch (error) {
      throw new Error('Failed to export games')
    }
  }

  static async update(id, updateData, userId) {
    try {
      // Check if game exists and belongs to user
      const existing = await this.findById(id)
      if (!existing || existing.user_id !== userId) {
        throw new Error('Game not found or access denied')
      }

      const updates = []
      const values = []
      let paramCount = 1

      if (updateData.date !== undefined) {
        updates.push(`date = $${paramCount}`)
        values.push(updateData.date)
        paramCount++
      }

      if (updateData.commander_id !== undefined) {
        updates.push(`commander_id = $${paramCount}`)
        values.push(updateData.commander_id)
        paramCount++
      }

      if (updateData.player_count !== undefined) {
        updates.push(`player_count = $${paramCount}`)
        values.push(updateData.player_count)
        paramCount++
      }

      if (updateData.won !== undefined) {
        updates.push(`won = $${paramCount}`)
        values.push(updateData.won || false)
        paramCount++
      }

      if (updateData.rounds !== undefined) {
        updates.push(`rounds = $${paramCount}`)
        values.push(updateData.rounds)
        paramCount++
      }

      if (updateData.starting_player_won !== undefined) {
        updates.push(`starting_player_won = $${paramCount}`)
        values.push(updateData.starting_player_won || false)
        paramCount++
      }

      if (updateData.sol_ring_turn_one_won !== undefined) {
        updates.push(`sol_ring_turn_one_won = $${paramCount}`)
        values.push(updateData.sol_ring_turn_one_won || false)
        paramCount++
      }

      if (updateData.notes !== undefined) {
        updates.push(`notes = $${paramCount}`)
        values.push(updateData.notes)
        paramCount++
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update')
      }

      values.push(id, userId)

      const result = await dbManager.query(
        `
        UPDATE games
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      `,
        values
      )

      return result.rowCount > 0
    } catch (error) {
      throw new Error('Failed to update game')
    }
  }

  static async delete(id, userId) {
    try {
      // Check if game exists and belongs to user
      const existing = await this.findById(id)
      if (!existing || existing.user_id !== userId) {
        throw new Error('Game not found or access denied')
      }

      const result = await dbManager.query(
        `
        DELETE FROM games
        WHERE id = $1 AND user_id = $2
      `,
        [id, userId]
      )

      return result.rowCount > 0
    } catch (error) {
      throw new Error('Failed to delete game')
    }
  }
}

export default Game
