import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class DatabaseManager {
  constructor() {
    this.pool = null
    this.isInitialized = false
    this.currentUserId = null
  }

  async initialize() {
    if (this.isInitialized) {
      return this.pool
    }

    try {
      // Get database configuration from environment variables
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'edh_stats',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'edh_password'
      }

      // Create connection pool
      this.pool = new pg.Pool(dbConfig)

      // Test the connection
      const client = await this.pool.connect()
      try {
        const result = await client.query('SELECT 1 as test')
        console.log('Database connected successfully')
      } finally {
        client.release()
      }

      // Run migrations
      if (process.env.NODE_ENV !== 'test') {
        await this.runMigrations()
      }

      this.isInitialized = true
      console.log('Database initialized successfully')
      return this.pool
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

   async runMigrations() {
     const client = await this.pool.connect()
     try {
       const migrationPath = join(__dirname, '../database/migrations.sql')
       const migrationSQL = readFileSync(migrationPath, 'utf8')

       // Execute the entire migration file as a single query
       // This is safer for complex SQL with functions and views
       await client.query(migrationSQL)
       console.log('Database migrations completed')
     } catch (error) {
       console.error('Failed to run migrations:', error)
       throw error
     } finally {
       client.release()
     }
   }

   async seedData() {
     const client = await this.pool.connect()
     try {
       const seedPath = join(__dirname, '../database/seeds.sql')
       const seedSQL = readFileSync(seedPath, 'utf8')

       // Execute the entire seed file as a single query
       await client.query(seedSQL)
       console.log('Database seeding completed')
     } catch (error) {
       console.error('Failed to seed database:', error)
       throw error
     } finally {
       client.release()
     }
   }

  async close() {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      this.isInitialized = false
      console.log('Database connection closed')
    }
  }

  getPool() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.pool
  }

  setCurrentUser(userId) {
    this.currentUserId = userId
  }

  getCurrentUser() {
    return this.currentUserId
  }

  // Helper methods for common operations
  async query(query, params = []) {
    const client = await this.pool.connect()
    try {
      return await client.query(query, params)
    } finally {
      client.release()
    }
  }

  async run(query, params = []) {
    return this.query(query, params)
  }

  async get(query, params = []) {
    const result = await this.query(query, params)
    return result.rows[0]
  }

  async all(query, params = []) {
    const result = await this.query(query, params)
    return result.rows
  }

  // Transaction support
  async transaction(fn) {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await fn(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const result = await this.get('SELECT 1 as test')
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
  const pool = await dbManager.initialize()
  try {
    return await callback(pool)
  } finally {
    // Don't close here, let the manager handle connection lifecycle
  }
}
