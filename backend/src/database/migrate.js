// Database migration and seed utility
import dbManager from '../config/database.js'

async function runMigrations() {
  console.log('Running database migrations...')

  try {
    await dbManager.initialize()
    console.log('Migrations completed successfully!')
    
    // Check if seeding is enabled via environment variable
    const seedingEnabled = process.env.DB_SEED === 'true' || process.env.DB_SEED === '1'
    if (seedingEnabled) {
      console.log('Seeding enabled via DB_SEED environment variable')
      await dbManager.seedData()
      console.log('Database seeded successfully!')
    }
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await dbManager.close()
  }
}

async function seedDatabase() {
  console.log('Seeding database with sample data...')

  try {
    await dbManager.initialize()
    await dbManager.seedData()
    console.log('Database seeded successfully!')
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await dbManager.close()
  }
}

async function resetDatabase() {
  console.log('Resetting database...')

  try {
    await dbManager.initialize()

    // Drop all tables and views using async queries
    const dropStatements = [
      'DROP TRIGGER IF EXISTS update_games_timestamp ON games',
      'DROP TRIGGER IF EXISTS update_commanders_timestamp ON commanders',
      'DROP TRIGGER IF EXISTS update_users_timestamp ON users',
      'DROP FUNCTION IF EXISTS update_timestamp()',
      'DROP VIEW IF EXISTS commander_stats CASCADE',
      'DROP VIEW IF EXISTS user_stats CASCADE',
      'DROP TABLE IF EXISTS games CASCADE',
      'DROP TABLE IF EXISTS commanders CASCADE',
      'DROP TABLE IF EXISTS users CASCADE'
    ]

    for (const statement of dropStatements) {
      try {
        await dbManager.query(statement)
      } catch (error) {
        // Ignore errors for non-existent objects
        if (!error.message.includes('does not exist')) {
          console.warn(`Warning during cleanup: ${error.message}`)
        }
      }
    }

    console.log('Database reset completed!')

    // Run migrations and seeding
    await runMigrations()
    await seedDatabase()
  } catch (error) {
    console.error('Database reset failed:', error)
    process.exit(1)
  } finally {
    await dbManager.close()
  }
}

// Command line interface
const command = process.argv[2]

switch (command) {
  case 'migrate':
    runMigrations()
    break
  case 'seed':
    seedDatabase()
    break
  case 'reset':
    resetDatabase()
    break
  default:
    console.log('Usage:')
    console.log('  node migrate.js migrate  - Run database migrations')
    console.log('  node migrate.js seed     - Seed database with sample data')
    console.log('  node migrate.js reset    - Reset database (drop, migrate, seed)')
    process.exit(1)
}
