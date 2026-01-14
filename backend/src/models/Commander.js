// Commander model for MTG commanders
import dbManager from '../config/database.js'

class Commander {
  static async create(commanderData) {
    const db = await dbManager.initialize()
    
    try {
      const result = db.prepare(`
        INSERT INTO commanders (name, colors, user_id)
        VALUES (?, ?, ?)
      `).run([
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
      const commander = db.prepare(`
        SELECT id, name, colors, user_id, created_at, updated_at
        FROM commanders 
        WHERE id = ?
      `).get([id])
      
      return commander
    } catch (error) {
      throw new Error('Failed to find commander')
    }
  }
  
  static async findByUserId(userId, limit = 50, offset = 0, sortBy = 'created_at', sortOrder = 'DESC') {
    const db = await dbManager.initialize()
    
    try {
      const query = `
        SELECT id, name, colors, user_id, created_at, updated_at
        FROM commanders 
        WHERE user_id = ?
      `
      
      if (sortBy) {
        query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`
      }
      
      query += ` LIMIT ? OFFSET ?`
      
      const commanders = db.prepare(query).all([userId, limit, offset])
      
      // Apply sorting in JavaScript instead of SQL
      let sortedCommanders = commanders.sort((a, b) => {
        if (sortBy === 'DESC') {
          return new Date(b[sortBy]) - new Date(a[sortBy])
        } else {
          return new Date(a[sortBy]) - new Date(b[sortBy])
        }
      })
      
      // Apply pagination
      const startIndex = parseInt(offset) || 0
      const endIndex = startIndex + parseInt(limit || 50)
      
      // Parse colors JSON for frontend
        return sortedCommanders.slice(startIndex, endIndex).map(cmd => ({
        ...cmd,
        colors: JSON.parse(cmd.colors || '[]')
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
      if (!existing || existing.user_id !== userId) {
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
      
      const result = db.prepare(`
        UPDATE commanders 
        SET ${updates.join(', ')}
        WHERE id = ? AND user_id = ?
      `).run([...values, id, userId])
      
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
      if (!existing || existing.user_id !== userId) {
        throw new Error('Commander not found or access denied')
      }
      
      const result = db.prepare(`
        DELETE FROM commanders 
        WHERE id = ? AND user_id = ?
      `).run([id, userId])
      
      return result.changes > 0
    } catch (error) {
      throw new Error('Failed to delete commander')
    }
  }
  
  static async getStats(id, userId) {
    const db = await dbManager.initialize()
    
    try {
      const stats = db.prepare(`
        SELECT 
          c.id,
          c.name,
          c.colors,
          COUNT(g.id) as total_games,
          SUM(CASE WHEN g.won = 1 THEN 1 ELSE 0 END) as total_wins,
          ROUND((SUM(CASE WHEN g.won = 1 THEN 1 ELSE 0 END) * 100.0) / COUNT(g.id), 2) as win_rate,
          AVG(g.rounds) as avg_rounds,
          MAX(g.date) as last_played
        FROM commanders c
        LEFT JOIN games g ON c.id = g.commander_id
        WHERE c.id = ? AND c.user_id = ?
        GROUP BY c.id, c.name, c.colors, c.created_at
        HAVING total_games > 0
        ORDER BY total_games DESC, c.name ASC
        LIMIT ?
      `).get([id, userId])
      
      if (!stats) {
        throw new Error('Commander not found')
      }
      
      return {
        ...stats,
        colors: JSON.parse(stats.colors)
      }
    } catch (error) {
      throw new Error('Failed to get commander stats')
    }
  }
  
  static async search(userId, query, limit = 20) {
    const db = await dbManager.initialize()
    
    try {
      const searchQuery = `%${query}%`
      const commanders = db.prepare(`
        SELECT id, name, colors, user_id, created_at, updated_at
        FROM commanders 
        WHERE user_id = ?
        ORDER BY name ASC
        LIMIT ?
      `).all([userId, searchQuery, limit])
      
      return commanders.map(cmd => ({
        ...cmd,
        colors: JSON.parse(cmd.colors || '[]')
      }))
    } catch (error) {
      throw new Error('Failed to search commanders')
    }
  }
  
  static async getPopular(userId, limit = 10) {
    const db = await dbManager.initialize()
    
    try {
      const commanders = db.prepare(`
        SELECT 
          c.id,
          c.name,
          c.colors,
          COUNT(g.id) as total_games,
          c.created_at
        FROM commanders c
        LEFT JOIN games g ON c.id = g.commander_id
        WHERE c.user_id = ?
        GROUP BY c.id, c.name, c.colors, c.created_at
        HAVING total_games > 0
        ORDER BY total_games DESC, c.name ASC
        LIMIT ?
      `).all([userId, limit])
      
      return commanders.map(cmd => ({
        ...cmd,
        colors: JSON.parse(cmd.colors)
      }))
    } catch (error) {
      throw new Error('Failed to get popular commanders')
    }
  }
}

export default Commander