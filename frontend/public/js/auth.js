// Authentication form logic for login and registration
function loginForm() {
  return {
    formData: {
      username: '',
      password: '',
      remember: false
    },
    errors: {},
    showPassword: false,
    loading: false,
    serverError: '',

    validateUsername() {
      if (!this.formData.username.trim()) {
        this.errors.username = 'Username is required'
      } else if (this.formData.username.length < 3) {
        this.errors.username = 'Username must be at least 3 characters'
      } else {
        this.errors.username = ''
      }
    },

    validatePassword() {
      if (!this.formData.password) {
        this.errors.password = 'Password is required'
      } else if (this.formData.password.length < 8) {
        this.errors.password = 'Password must be at least 8 characters'
      } else {
        this.errors.password = ''
      }
    },

    async handleLogin() {
      // Validate form
      this.validateUsername()
      this.validatePassword()

      if (this.errors.username || this.errors.password) {
        return
      }

      this.loading = true
      this.serverError = ''

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: this.formData.username,
            password: this.formData.password
          })
        })

        const data = await response.json()

        if (response.ok) {
          // Store token
          if (this.formData.remember) {
            localStorage.setItem('edh-stats-token', data.token)
          } else {
            sessionStorage.setItem('edh-stats-token', data.token)
          }

          // Redirect to dashboard
          window.location.href = '/dashboard.html'
        } else {
          this.serverError = data.message || 'Login failed'
        }
      } catch (error) {
        console.error('Login error:', error)
        this.serverError = 'Network error. Please try again.'
      } finally {
        this.loading = false
      }
    }
  }
}

function registerForm() {
  return {
    formData: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false
    },
    errors: {},
    showPassword: false,
    showConfirmPassword: false,
    loading: false,
    serverError: '',
    successMessage: '',
    allowRegistration: true,

    async init() {
      // Check registration config on page load
      await this.checkRegistrationConfig()
    },

    async checkRegistrationConfig() {
      try {
        const response = await fetch('/api/auth/config')
        if (response.ok) {
          const data = await response.json()
          this.allowRegistration = data.allowRegistration
        } else {
          this.allowRegistration = true
        }
      } catch (error) {
        console.error('Failed to check registration config:', error)
        this.allowRegistration = true
      }
    },

    validateUsername() {
      if (!this.formData.username.trim()) {
        this.errors.username = 'Username is required'
      } else if (this.formData.username.length < 3) {
        this.errors.username = 'Username must be at least 3 characters'
      } else if (this.formData.username.length > 50) {
        this.errors.username = 'Username must be less than 50 characters'
      } else if (!/^[a-zA-Z0-9_-]+$/.test(this.formData.username)) {
        this.errors.username =
          'Username can only contain letters, numbers, underscores, and hyphens'
      } else {
        this.errors.username = ''
      }
    },

    validateEmail() {
      if (
        this.formData.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)
      ) {
        this.errors.email = 'Please enter a valid email address'
      } else {
        this.errors.email = ''
      }
    },

    validatePassword() {
      if (!this.formData.password) {
        this.errors.password = 'Password is required'
      } else if (this.formData.password.length < 8) {
        this.errors.password = 'Password must be at least 8 characters'
      } else if (this.formData.password.length > 100) {
        this.errors.password = 'Password must be less than 100 characters'
      } else if (!/(?=.*[a-z])/.test(this.formData.password)) {
        this.errors.password =
          'Password must contain at least one lowercase letter'
      } else if (!/(?=.*[A-Z])/.test(this.formData.password)) {
        this.errors.password =
          'Password must contain at least one uppercase letter'
      } else if (!/(?=.*\d)/.test(this.formData.password)) {
        this.errors.password = 'Password must contain at least one number'
      } else {
        this.errors.password = ''
      }
    },

    validateConfirmPassword() {
      if (!this.formData.confirmPassword) {
        this.errors.confirmPassword = 'Please confirm your password'
      } else if (this.formData.password !== this.formData.confirmPassword) {
        this.errors.confirmPassword = 'Passwords do not match'
      } else {
        this.errors.confirmPassword = ''
      }
    },

    validateTerms() {
      if (!this.formData.terms) {
        this.errors.terms = 'You must agree to the Terms of Service'
      } else {
        this.errors.terms = ''
      }
    },

    async handleRegister() {
      // Validate all fields
      this.validateUsername()
      this.validateEmail()
      this.validatePassword()
      this.validateConfirmPassword()
      this.validateTerms()

      if (Object.values(this.errors).some((error) => error)) {
        return
      }

      this.loading = true
      this.serverError = ''

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: this.formData.username,
            email: this.formData.email || undefined,
            password: this.formData.password
          })
        })

        const data = await response.json()

        if (response.ok) {
          // Store token and redirect
          this.successMessage = 'Account created successfully! Redirecting...'
          localStorage.setItem('edh-stats-token', data.token)
          setTimeout(() => {
            window.location.href = '/dashboard.html'
          }, 1000)
        } else {
          if (data.details && Array.isArray(data.details)) {
            this.serverError = data.details.join(', ')
          } else {
            this.serverError = data.message || 'Registration failed'
          }
        }
      } catch (error) {
        console.error('Registration error:', error)
        this.serverError = 'Network error. Please try again.'
      } finally {
        this.loading = false
      }
    }
  }
}

// Make functions globally available
document.addEventListener('alpine:init', () => {
  Alpine.data('loginForm', loginForm)
  Alpine.data('registerForm', registerForm)
})

// Utility function to get auth token
function getAuthToken() {
  return (
    localStorage.getItem('edh-stats-token') ||
    sessionStorage.getItem('edh-stats-token')
  )
}

// API helper with automatic token handling
async function authenticatedFetch(url, options = {}) {
  const token = getAuthToken()

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  })

  if (response.status === 401) {
    // Token expired or invalid, redirect to login
    localStorage.removeItem('edh-stats-token')
    sessionStorage.removeItem('edh-stats-token')
    window.location.href = '/login.html'
    throw new Error('Authentication required')
  }

  return response
}
