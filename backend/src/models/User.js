import bcrypt from 'bcryptjs'
import dbManager from '../config/database.js'

class User {
  static async create(userData) {
    const { username, password, email } = userData

    // Check if username already exists
    const existingUser = await dbManager.get(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    )
    if (existingUser) {
      throw new Error('Username or email already exists')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    try {
      const result = await dbManager.query(
        `
        INSERT INTO users (username, password_hash, email)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
        [username, passwordHash, email]
      )

      return this.findById(result.rows[0].id)
    } catch (error) {
      throw new Error('Failed to create user')
    }
  }

  static async findById(id) {
    const user = await dbManager.get(
      `
      SELECT id, username, email, created_at, updated_at
      FROM users
      WHERE id = $1
    `,
      [id]
    )

    return user
  }

  static async findByUsername(username) {
    const user = await dbManager.get(
      `
      SELECT id, username, password_hash, email, created_at, updated_at
      FROM users
      WHERE username = $1
    `,
      [username]
    )

    return user
  }

  static async findByEmail(email) {
    const user = await dbManager.get(
      `
      SELECT id, username, password_hash, email, created_at, updated_at
      FROM users
      WHERE email = $1
    `,
      [email]
    )

    return user
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword)
  }

  static async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12)

    const result = await dbManager.query(
      `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [passwordHash, userId]
    )

    return result.rowCount > 0
  }

  static async updateUsername(userId, newUsername) {
    // Check if new username is already taken
    const existingUser = await dbManager.get(
      `
      SELECT id FROM users
      WHERE username = $1 AND id != $2
    `,
      [newUsername, userId]
    )

    if (existingUser) {
      throw new Error('Username already exists')
    }

    const result = await dbManager.query(
      `
      UPDATE users
      SET username = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [newUsername, userId]
    )

    return result.rowCount > 0
  }

  static async updateProfile(userId, profileData) {
    const { email } = profileData

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await dbManager.get(
        `
        SELECT id FROM users
        WHERE email = $1 AND id != $2
      `,
        [email, userId]
      )

      if (existingUser) {
        throw new Error('Email already exists')
      }
    }

    const updates = []
    const values = []
    let paramCount = 1

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`)
      values.push(email)
      paramCount++
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update')
    }

    values.push(userId)

    const result = await dbManager.query(
      `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
    `,
      values
    )

    return result.rowCount > 0
  }

  static async delete(userId) {
    // This will cascade delete commanders and games due to foreign key constraints
    const result = await dbManager.query('DELETE FROM users WHERE id = $1', [
      userId
    ])

    return result.rowCount > 0
  }

  static async getStats(userId) {
    const stats = await dbManager.get(
      `
      SELECT * FROM user_stats WHERE user_id = $1
    `,
      [userId]
    )

    return stats
  }
}

export default User
