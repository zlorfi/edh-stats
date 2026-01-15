import bcrypt from 'bcryptjs'
import dbManager from '../config/database.js'

class User {
  static async create(userData) {
    const db = await dbManager.initialize()
    
    const { username, password, email } = userData
    
    // Check if username already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get([username, email])
    if (existingUser) {
      throw new Error('Username or email already exists')
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)
    
    try {
      const result = db.prepare(`
        INSERT INTO users (username, password_hash, email)
        VALUES (?, ?, ?)
      `).run([username, passwordHash, email])
      
      return this.findById(result.lastInsertRowid)
    } catch (error) {
      throw new Error('Failed to create user')
    }
  }
  
  static async findById(id) {
    const db = await dbManager.initialize()
    
    const user = db.prepare(`
      SELECT id, username, email, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get([id])
    
    return user
  }
  
  static async findByUsername(username) {
    const db = await dbManager.initialize()
    
    const user = db.prepare(`
      SELECT id, username, password_hash, email, created_at, updated_at
      FROM users
      WHERE username = ?
    `).get([username])
    
    return user
  }
  
  static async findByEmail(email) {
    const db = await dbManager.initialize()
    
    const user = db.prepare(`
      SELECT id, username, password_hash, email, created_at, updated_at
      FROM users
      WHERE email = ?
    `).get([email])
    
    return user
  }
  
  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword)
  }
  
  static async updatePassword(userId, newPassword) {
    const db = await dbManager.initialize()
    
    const passwordHash = await bcrypt.hash(newPassword, 12)
    
    const result = db.prepare(`
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run([passwordHash, userId])
    
    return result.changes > 0
  }
  
  static async updateUsername(userId, newUsername) {
    const db = await dbManager.initialize()
    
    // Check if new username is already taken
    const existingUser = db.prepare(`
      SELECT id FROM users 
      WHERE username = ? AND id != ?
    `).get([newUsername, userId])
    
    if (existingUser) {
      throw new Error('Username already exists')
    }
    
    const result = db.prepare(`
      UPDATE users 
      SET username = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run([newUsername, userId])
    
    return result.changes > 0
  }
  
  static async updateProfile(userId, profileData) {
    const db = await dbManager.initialize()
    
    const { email } = profileData
    
    // Check if email is already taken by another user
    if (email) {
      const existingUser = db.prepare(`
        SELECT id FROM users 
        WHERE email = ? AND id != ?
      `).get([email, userId])
      
      if (existingUser) {
        throw new Error('Email already exists')
      }
    }
    
    const updates = []
    const values = []
    
    if (email !== undefined) {
      updates.push('email = ?')
      values.push(email)
    }
    
    if (updates.length === 0) {
      throw new Error('No valid fields to update')
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(userId)
    
    const result = db.prepare(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(values)
    
    return result.changes > 0
  }
  
  static async delete(userId) {
    const db = await dbManager.initialize()
    
    // This will cascade delete commanders and games due to foreign key constraints
    const result = db.prepare('DELETE FROM users WHERE id = ?').run([userId])
    
    return result.changes > 0
  }
  
  static async getStats(userId) {
    const db = await dbManager.initialize()
    
    const stats = db.prepare(`
      SELECT * FROM user_stats WHERE user_id = ?
    `).get([userId])
    
    return stats
  }
}

export default User