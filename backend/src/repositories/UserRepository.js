// User Repository for all user-related database operations
import { Repository } from './Repository.js'
import dbManager from '../config/database.js'
import bcrypt from 'bcryptjs'

export class UserRepository extends Repository {
  constructor() {
    super('users')
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    return dbManager.get(
      `SELECT * FROM ${this.tableName} WHERE username = $1`,
      [username]
    )
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    return dbManager.get(
      `SELECT * FROM ${this.tableName} WHERE email = $1`,
      [email]
    )
  }

  /**
   * Create a new user with password hashing
   */
  async createUser(username, password, email) {
    // Check if user already exists
    const existing = await dbManager.get(
      `SELECT id FROM ${this.tableName} WHERE username = $1 OR email = $2`,
      [username, email]
    )

    if (existing) {
      throw new Error('Username or email already exists')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Insert user
    const result = await dbManager.query(
      `
      INSERT INTO ${this.tableName} (username, password_hash, email)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at
    `,
      [username, passwordHash, email]
    )

    return result.rows[0]
  }

  /**
   * Verify user password
   */
  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword)
  }

  /**
   * Update user password
   */
  async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12)

    const result = await dbManager.query(
      `
      UPDATE ${this.tableName}
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id
    `,
      [passwordHash, userId]
    )

    return result.rowCount > 0
  }

  /**
   * Update user username
   */
  async updateUsername(userId, newUsername) {
    // Check if username is already taken
    const existing = await dbManager.get(
      `SELECT id FROM ${this.tableName} WHERE username = $1 AND id != $2`,
      [newUsername, userId]
    )

    if (existing) {
      throw new Error('Username already exists')
    }

    const result = await dbManager.query(
      `
      UPDATE ${this.tableName}
      SET username = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id
    `,
      [newUsername, userId]
    )

    return result.rowCount > 0
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, profileData) {
    const { email } = profileData

    // Check if email is already taken by another user
    if (email) {
      const existing = await dbManager.get(
        `SELECT id FROM ${this.tableName} WHERE email = $1 AND id != $2`,
        [email, userId]
      )

      if (existing) {
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
      UPDATE ${this.tableName}
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING id
    `,
      values
    )

    return result.rowCount > 0
  }

  /**
   * Count total users in the system
   */
  async countUsers() {
    try {
      const result = await dbManager.query(
        `SELECT COUNT(*) as count FROM ${this.tableName}`
      )
      return parseInt(result.rows[0].count, 10) || 0
    } catch (error) {
      throw new Error('Failed to count users')
    }
  }

  /**
   * Get user statistics
   */
  async getStats(userId) {
    return dbManager.get(
      `SELECT * FROM user_stats WHERE user_id = $1`,
      [userId]
    )
  }

  /**
   * Delete user (cascades to commanders and games)
   */
  async deleteUser(userId) {
    const result = await dbManager.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [userId]
    )

    return result.rowCount > 0
  }
}

export default UserRepository
