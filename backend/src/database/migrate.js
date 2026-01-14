// Database migration and seed utility
import dbManager from '../config/database.js'

async function runMigrations() {
  console.log('Running database migrations...')
  
  try {
    await dbManager.initialize()
    console.log('Migrations completed successfully!')
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
    
    // Drop all tables
    const db = dbManager.getDatabase()
    db.exec(`
      DROP TABLE IF EXISTS games;
      DROP TABLE IF EXISTS commanders;
      DROP TABLE IF EXISTS users;
      DROP VIEW IF EXISTS user_stats;
      DROP VIEW IF EXISTS commander_stats;
    `)
    
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