// Base Repository class providing common database operations
import dbManager from '../config/database.js'

export class Repository {
  constructor(tableName) {
    this.tableName = tableName
  }

  /**
   * Find a single record by ID
   */
  async findById(id) {
    return dbManager.get(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    )
  }

  /**
   * Find all records with optional pagination
   */
  async findAll(limit = 50, offset = 0) {
    return dbManager.all(
      `SELECT * FROM ${this.tableName} LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
  }

  /**
   * Find records with a WHERE condition
   */
  async findWhere(whereCondition, params, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE ${whereCondition}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `
    return dbManager.all(query, [...params, limit, offset])
  }

  /**
   * Get count of records
   */
  async count() {
    const result = await dbManager.get(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    )
    return result?.count || 0
  }

  /**
   * Get count with WHERE condition
   */
  async countWhere(whereCondition, params = []) {
    const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereCondition}`
    const result = await dbManager.get(query, params)
    return result?.count || 0
  }

  /**
   * Insert a new record
   */
  async insert(data) {
    const columns = Object.keys(data)
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
    const values = Object.values(data)

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `
    const result = await dbManager.query(query, values)
    return result.rows[0]
  }

  /**
   * Update a record
   */
  async update(id, data) {
    const columns = Object.keys(data)
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ')
    const values = [...Object.values(data), id]

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${columns.length + 1}
      RETURNING *
    `
    const result = await dbManager.query(query, values)
    return result.rows[0]
  }

  /**
   * Delete a record
   */
  async delete(id) {
    const result = await dbManager.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    )
    return result.rowCount > 0
  }

  /**
   * Execute a raw query (use with caution)
   */
  async query(sql, params = []) {
    return dbManager.query(sql, params)
  }

  /**
   * Execute a transaction
   */
  async transaction(callback) {
    return dbManager.transaction(callback)
  }
}

export default Repository
