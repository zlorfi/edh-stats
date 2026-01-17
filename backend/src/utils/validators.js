/**
 * Validation Helpers for EDH Stats
 * Provides reusable validation functions for all routes
 */

/**
 * Validate date is within acceptable range
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if date is valid
 */
export const validateDateRange = (date) => {
  try {
    const parsed = new Date(date)
    const now = new Date()
    
    // Can't be in the future
    if (parsed > now) return false
    
    // Can't be more than 1 year old
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    
    return parsed >= oneYearAgo
  } catch {
    return false
  }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export const validatePasswordStrength = (password) => {
  const errors = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters')
  }
  if (password.length > 100) {
    errors.push('Password must be less than 100 characters')
  }
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}



/**
 * Check if text contains spam patterns
 * @param {string} text - Text to check
 * @returns {boolean} - True if text is NOT spam
 */
export const isNotSpam = (text) => {
  if (!text) return true
  
  // Reject if same character repeated 20+ times
  if (/^(.)\1{20,}$/.test(text)) return false
  
  // Reject if mostly special characters
  const specialCharCount = (text.match(/[!@#$%^&*()_+=\-\[\]{};:'",.<>?/]/g) || []).length
  if (specialCharCount / text.length > 0.8) return false
  
  return true
}

/**
 * Sanitize string input (trim, collapse spaces, limit length)
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeString = (input) => {
  if (!input) return null
  
  return input
    .trim()
    .replace(/\s+/g, ' ')  // Collapse multiple spaces into one
    .substring(0, 1000)    // Limit to 1000 chars
}

/**
 * Check if string contains invalid characters
 * @param {string} str - String to check
 * @param {string} allowedPattern - Regex pattern of allowed characters
 * @returns {boolean} - True if valid
 */
export const isValidFormat = (str, allowedPattern) => {
  return allowedPattern.test(str)
}

/**
 * Check if username is reserved
 * @param {string} username - Username to check
 * @returns {boolean} - True if not reserved
 */
export const isNotReservedUsername = (username) => {
  const reserved = ['admin', 'root', 'system', 'test', 'api', 'support']
  return !reserved.includes(username.toLowerCase())
}

/**
 * Check if email is disposable
 * @param {string} email - Email to check
 * @returns {boolean} - True if not disposable
 */
export const isNotDisposableEmail = (email) => {
  const disposableDomains = [
    'tempmail.com',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'temp-mail.org',
    'throwaway.email'
  ]
  
  const domain = email.split('@')[1]?.toLowerCase()
  return !disposableDomains.includes(domain)
}

/**
 * Validate color array has no duplicates
 * @param {string[]} colors - Array of color codes
 * @returns {boolean} - True if no duplicates
 */
export const hasNoDuplicateColors = (colors) => {
  return new Set(colors).size === colors.length
}

/**
 * Format validation errors for API response
 * @param {object} zodError - Zod error object
 * @returns {object[]} - Formatted errors
 */
export const formatValidationErrors = (zodError) => {
  return zodError.errors.map((error) => ({
    field: error.path.join('.') || 'root',
    message: error.message
  }))
}

/**
 * Create a detailed error response
 * @param {string} message - Error message
 * @param {string[]} details - Additional details
 * @returns {object} - Error response object
 */
export const createErrorResponse = (message, details = []) => {
  return {
    error: 'Validation Error',
    message,
    details: details.length > 0 ? details : undefined
  }
}
