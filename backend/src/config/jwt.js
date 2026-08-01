import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Load environment variables from root directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '../../..')

config({ path: resolve(rootDir, '.env') })

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'fallback-secret-for-development'
}

export const corsConfig = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:80',
  credentials: true
}

export const serverConfig = {
  port: parseInt(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
}

export const registrationConfig = {
  // NOTE: the registration on/off toggle now lives in the database
  // (settings table, key 'allow_registration'). Only the optional user cap
  // remains env-configurable here.
  maxUsers: process.env.MAX_USERS ? parseInt(process.env.MAX_USERS) : null
}

export const rateLimitConfig = {
  // Global rate limit - applies to all endpoints unless overridden
  // Window is in milliseconds, convert from environment variable (default in minutes)
  window: process.env.RATE_LIMIT_WINDOW 
    ? parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 
    : 15 * 60 * 1000, // 15 minutes default
  max: process.env.RATE_LIMIT_MAX 
    ? parseInt(process.env.RATE_LIMIT_MAX) 
    : 100 // requests per window
}
