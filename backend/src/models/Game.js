// Game model for EDH game tracking
import dbManager from '../config/database.js'

class Game {
  static async create(gameData) {
    const db = await dbManager.initialize()

    try {
      const result = db
        .prepare(
          `
        INSERT INTO games (
          date, player_count, commander_id, won, rounds,
          starting_player_won, sol_ring_turn_one_won, notes, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run([
          gameData.date,
          gameData.player_count,
          gameData.commander_id,
          gameData.won ? 1 : 0,
          gameData.rounds,
          gameData.startingPlayerWon ? 1 : 0,
          gameData.solRingTurnOneWon ? 1 : 0,
          gameData.notes || null,
          gameData.userId
        ])

      return await this.findById(result.lastInsertRowid)
    } catch (error) {
      throw new Error('Failed to create game')
    }
  }

  static async findById(id) {
    const db = await dbManager.initialize()

    try {
      const game = db
        .prepare(
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
        WHERE g.id = ?
          `
        )
        .get([id])

      return game
    } catch (error) {
      throw new Error('Failed to find game')
    }
  }

  static async findByUserId(userId, limit = 50, offset = 0, filters = {}) {
    const db = await dbManager.initialize()

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
        WHERE g.user_id = ?
        ${filters.commander ? `AND cmdr.name LIKE ?` : ''}
        ORDER BY g.date DESC
      `

      if (filters.playerCount) {
        query += ` AND g.player_count = ?`
      }

      if (filters.commanderId) {
        query += ` AND g.commander_id = ?`
      }

      if (filters.dateFrom) {
        query += ` AND g.date >= ?`
      }

      if (filters.dateTo) {
        query += ` AND g.date <= ?`
      }

      query += ` LIMIT ? OFFSET ?`

      const games = db.prepare(query).all([userId, limit, offset])

      // Parse dates for frontend
      return games.map((game) => ({
        ...game,
        date: new Date(game.date).toLocaleDateString('en-US'),
        won: game.won,
        rounds: game.rounds || 0,
        commanderName: game.name,
        commanderColors: JSON.parse(game.colors || '[]'),
        id: game.id
      }))
    } catch (error) {
      throw new Error('Failed to find games by user')
    }
  }

  static async update(id, updateData, userId) {
    const db = await dbManager.initialize()

    try {
      // Check if game exists and belongs to user
      const existing = await this.findById(id)
      if (!existing || existing.user_id !== userId) {
        throw new Error('Game not found or access denied')
      }

      const updates = []
      const values = []

      if (updateData.date !== undefined) {
        updates.push('date = ?')
        values.push(updateData.date)
      }

      if (updateData.playerCount !== undefined) {
        updates.push('player_count = ?')
        values.push(updateData.playerCount)
      }

      if (updateData.won !== undefined) {
        updates.push('won = ?')
        values.push(updateData.won)
      }

      if (updateData.rounds !== undefined) {
        updates.push('rounds = ?')
        values.push(updateData.rounds)
      }

      if (updateData.startingPlayerWon !== undefined) {
        updates.push('starting_player_won = ?')
        values.push(updateData.startingPlayerWon)
      }

      if (updateData.solRingTurnOneWon !== undefined) {
        updates.push('sol_ring_turn_one_won = ?')
        values.push(updateData.solRingTurnOneWon)
      }

      if (updateData.notes !== undefined) {
        updates.push('notes = ?')
        values.push(updateData.notes)
      }

      updates.push('updated_at = CURRENT_TIMESTAMP')

      if (updates.length === 0) {
        throw new Error('No valid fields to update')
      }

      const result = db
        .prepare(
          `
        UPDATE games
        SET ${updates.join(', ')}
        WHERE id = ? AND user_id = ?
      `
        )
        .run([...values, id, userId])

      return result.changes > 0
    } catch (error) {
      throw new Error('Failed to update game')
    }
  }

  static async delete(id, userId) {
    const db = await dbManager.initialize()

    try {
      // Check if game exists and belongs to user
      const existing = await this.findById(id)
      if (!existing || existing.user_id !== userId) {
        throw new Error('Game not found or access denied')
      }

      const result = db
        .prepare(
          `
        DELETE FROM games
        WHERE id = ? AND user_id = ?
      `
        )
        .run([id, userId])

      return result.changes > 0
    } catch (error) {
      throw new Error('Failed to delete game')
    }
  }
}

export default Game
