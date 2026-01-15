// Profile management Alpine.js component
function profileManager() {
  return {
    // Current user data
    currentUser: null,
    
    // Navigation state
    mobileMenuOpen: false,
    
    // Form data
    formData: {
      username: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },

    // State
    submitting: {
      username: false,
      password: false
    },
    errors: {},
    serverError: {
      username: '',
      password: ''
    },
    successMessage: {
      username: '',
      password: ''
    },

    // Lifecycle
    async init() {
      await this.loadCurrentUser()
    },

    // Logout function
    logout() {
      localStorage.removeItem('edh-stats-token')
      sessionStorage.removeItem('edh-stats-token')
      window.location.href = '/login.html'
    },

    // Load current user data
    async loadCurrentUser() {
      try {
        const token =
          localStorage.getItem('edh-stats-token') ||
          sessionStorage.getItem('edh-stats-token')
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          this.currentUser = data.user
          this.formData.username = data.user.username
        }
      } catch (error) {
        console.error('Load current user error:', error)
      }
    },

    // Validation - Username
    validateUsername() {
      this.successMessage.username = ''
      if (!this.formData.username.trim()) {
        this.errors.username = 'Username is required'
      } else if (this.formData.username.length < 3) {
        this.errors.username = 'Username must be at least 3 characters'
      } else if (this.formData.username.length > 50) {
        this.errors.username = 'Username must be less than 50 characters'
      } else if (!/^[a-zA-Z0-9_-]+$/.test(this.formData.username)) {
        this.errors.username =
          'Username can only contain letters, numbers, underscores, and hyphens'
      } else if (this.formData.username === this.currentUser?.username) {
        this.errors.username = 'Username is the same as current username'
      } else {
        delete this.errors.username
      }
    },

    // Validation - Current Password
    validateCurrentPassword() {
      this.serverError.password = ''
      if (!this.formData.currentPassword) {
        this.errors.currentPassword = 'Current password is required'
      } else {
        delete this.errors.currentPassword
      }
    },

    // Validation - New Password
    validateNewPassword() {
      if (!this.formData.newPassword) {
        this.errors.newPassword = 'New password is required'
      } else if (this.formData.newPassword.length < 8) {
        this.errors.newPassword = 'Password must be at least 8 characters'
      } else if (this.formData.newPassword.length > 100) {
        this.errors.newPassword = 'Password must be less than 100 characters'
      } else if (!/(?=.*[a-z])/.test(this.formData.newPassword)) {
        this.errors.newPassword =
          'Password must contain at least one lowercase letter'
      } else if (!/(?=.*[A-Z])/.test(this.formData.newPassword)) {
        this.errors.newPassword =
          'Password must contain at least one uppercase letter'
      } else if (!/(?=.*\d)/.test(this.formData.newPassword)) {
        this.errors.newPassword = 'Password must contain at least one number'
      } else {
        delete this.errors.newPassword
      }
    },

    // Validation - Confirm Password
    validateConfirmPassword() {
      if (!this.formData.confirmPassword) {
        this.errors.confirmPassword = 'Please confirm your password'
      } else if (this.formData.newPassword !== this.formData.confirmPassword) {
        this.errors.confirmPassword = 'Passwords do not match'
      } else {
        delete this.errors.confirmPassword
      }
    },

    // Handle Update Username
    async handleUpdateUsername() {
      this.validateUsername()
      if (this.errors.username) return

      this.submitting.username = true
      this.serverError.username = ''

      try {
        const token =
          localStorage.getItem('edh-stats-token') ||
          sessionStorage.getItem('edh-stats-token')
        const response = await fetch('/api/auth/update-username', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            newUsername: this.formData.username
          })
        })

        if (response.ok) {
          this.successMessage.username = 'Username updated successfully!'
          this.currentUser.username = this.formData.username
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage.username = ''
          }, 3000)
        } else {
          const errorData = await response.json()
          this.serverError.username = errorData.message || 'Failed to update username'
        }
      } catch (error) {
        console.error('Update username error:', error)
        this.serverError.username = 'Network error occurred'
      } finally {
        this.submitting.username = false
      }
    },

    // Handle Change Password
    async handleChangePassword() {
      this.validateCurrentPassword()
      this.validateNewPassword()
      this.validateConfirmPassword()

      if (
        this.errors.currentPassword ||
        this.errors.newPassword ||
        this.errors.confirmPassword
      ) {
        return
      }

      this.submitting.password = true
      this.serverError.password = ''

      try {
        const token =
          localStorage.getItem('edh-stats-token') ||
          sessionStorage.getItem('edh-stats-token')
        const response = await fetch('/api/auth/change-password', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            currentPassword: this.formData.currentPassword,
            newPassword: this.formData.newPassword
          })
        })

        if (response.ok) {
          this.successMessage.password = 'Password changed successfully!'
          // Reset form
          this.formData.currentPassword = ''
          this.formData.newPassword = ''
          this.formData.confirmPassword = ''
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage.password = ''
          }, 3000)
        } else {
          const errorData = await response.json()
          this.serverError.password = errorData.message || 'Failed to change password'
        }
      } catch (error) {
        console.error('Change password error:', error)
        this.serverError.password = 'Network error occurred'
      } finally {
        this.submitting.password = false
      }
    }
  }
}

// Register Alpine component
document.addEventListener('alpine:init', () => {
  Alpine.data('profileManager', profileManager)
})
