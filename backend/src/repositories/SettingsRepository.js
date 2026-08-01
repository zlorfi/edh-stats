// Settings Repository - key/value store for runtime-configurable options
import dbManager from '../config/database.js'

const ALLOW_REGISTRATION_KEY = 'allow_registration'

export class SettingsRepository {
  /**
   * Get a raw setting value by key. Returns null if not set.
   */
  async get(key) {
    const row = await dbManager.get(
      'SELECT value FROM settings WHERE key = $1',
      [key]
    )
    return row ? row.value : null
  }

  /**
   * Upsert a setting value.
   */
  async set(key, value) {
    await dbManager.query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [key, String(value)]
    )
    return true
  }

  /**
   * Whether new user registration is currently allowed.
   * Defaults to true if the setting is missing.
   */
  async isRegistrationAllowed() {
    const value = await this.get(ALLOW_REGISTRATION_KEY)
    if (value === null) return true
    return value === 'true'
  }

  /**
   * Enable/disable new user registration.
   */
  async setRegistrationAllowed(allowed) {
    return this.set(ALLOW_REGISTRATION_KEY, allowed ? 'true' : 'false')
  }
}

export default SettingsRepository
