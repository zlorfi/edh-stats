import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class DatabaseManager {
  constructor() {
    this.db = null
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) {
      return this.db
    }

    const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../../database/data/edh-stats.db')
    
    try {
      // Create database directory if it doesn't exist
      const dbDir = dirname(dbPath)
      const fs = await import('fs')
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      this.db = new Database(dbPath)
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('foreign_keys = ON')
      this.db.pragma('query_only = false')

      // Run migrations
      await this.runMigrations()

      this.isInitialized = true
      console.log('Database initialized successfully')
      return this.db
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

  async runMigrations() {
    try {
      const migrationPath = join(__dirname, '../database/migrations.sql')
      const migrationSQL = readFileSync(migrationPath, 'utf8')
      
      this.db.exec(migrationSQL)
      console.log('Database migrations completed')
    } catch (error) {
      console.error('Failed to run migrations:', error)
      throw error
    }
  }

  async seedData() {
    try {
      const seedPath = join(__dirname, '../database/seeds.sql')
      const seedSQL = readFileSync(seedPath, 'utf8')
      
      this.db.exec(seedSQL)
      console.log('Database seeding completed')
    } catch (error) {
      console.error('Failed to seed database:', error)
      throw error
    }
  }

  async close() {
    if (this.db) {
      this.db.close()
      this.db = null
      this.isInitialized = false
      console.log('Database connection closed')
    }
  }

  getDatabase() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.db
  }

  // Helper methods for common operations
  prepare(query) {
    return this.getDatabase().prepare(query)
  }

  exec(query) {
    return this.getDatabase().exec(query)
  }

  run(query, params = []) {
    return this.getDatabase().prepare(query).run(params)
  }

  get(query, params = []) {
    return this.getDatabase().prepare(query).get(params)
  }

  all(query, params = []) {
    return this.getDatabase().prepare(query).all(params)
  }

  // Transaction support
  transaction(fn) {
    return this.getDatabase().transaction(fn)
  }

  // Health check method
  async healthCheck() {
    try {
      const result = this.get('SELECT 1 as test')
      return result?.test === 1
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  }
}

// Create and export singleton instance
const dbManager = new DatabaseManager()

export default dbManager

// Helper for async database operations
export const withDatabase = async (callback) => {
  const db = await dbManager.initialize()
  try {
    return await callback(db)
  } finally {
    // Don't close here, let the manager handle connection lifecycle
  }
}