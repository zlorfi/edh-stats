// Commander management Alpine.js components
function commanderManager() {
  return {
    // State
    showAddForm: false,
    editingCommander: null,
    commanders: [],
    popular: [],
    loading: false,
    showPopular: false,
    searchQuery: '',
    submitting: false,
    editSubmitting: false,
    serverError: '',

    // Form Data
    newCommander: {
      name: '',
      colors: []
    },
    errors: {},
    editErrors: {},

    // Constants
    mtgColors: [
      { id: 'W', name: 'White', hex: '#F0E6D2' },
      { id: 'U', name: 'Blue', hex: '#0E68AB' },
      { id: 'B', name: 'Black', hex: '#2C2B2D' },
      { id: 'R', name: 'Red', hex: '#C44536' },
      { id: 'G', name: 'Green', hex: '#5A7A3B' }
    ],

    // Lifecycle
    async init() {
      await this.loadCommanders()
    },

    // API Methods
    async loadCommanders() {
      this.loading = true
      try {
        const token =
          localStorage.getItem('edh-stats-token') ||
          sessionStorage.getItem('edh-stats-token')
        const response = await fetch('/api/commanders', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          this.commanders = data.commanders || []
        } else {
          this.serverError = 'Failed to load commanders'
        }
      } catch (error) {
        console.error('Load commanders error:', error)
        this.serverError = 'Network error occurred'
      } finally {
        this.loading = false
      }
    },

    async loadPopular() {
      this.loading = true
      try {
        const token =
          localStorage.getItem('edh-stats-token') ||
          sessionStorage.getItem('edh-stats-token')
        const response = await fetch('/api/commanders/popular', {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          this.popular = data.commanders || []
          // Swap commanders with popular for display
          const temp = this.commanders
          this.commanders = this.popular
          this.popular = temp
          this.showPopular = true
        } else {
          this.serverError = 'Failed to load popular commanders'
        }
      } catch (error) {
        console.error('Load popular error:', error)
        this.serverError = 'Network error occurred'
      } finally {
        this.loading = false
      }
    },

    async togglePopular() {
      if (this.showPopular) {
        // Show all commanders
        const temp = this.commanders
        this.commanders = this.popular
        this.popular = temp
        this.showPopular = false
      } else {
        // Show popular commanders
        await this.loadPopular()
      }
    },

    // Validation
    validateCommanderName() {
      if (!this.newCommander.name.trim()) {
        this.errors.name = 'Commander name is required'
      } else if (this.newCommander.name.length < 2) {
        this.errors.name = 'Commander name must be at least 2 characters'
      } else if (this.newCommander.name.length > 100) {
        this.errors.name = 'Commander name must be less than 100 characters'
      } else {
        delete this.errors.name
      }
    },

    validateEditCommanderName() {
      if (!this.editingCommander) return
      if (!this.editingCommander.name.trim()) {
        this.editErrors.name = 'Commander name is required'
      } else if (this.editingCommander.name.length < 2) {
        this.editErrors.name = 'Commander name must be at least 2 characters'
      } else if (this.editingCommander.name.length > 100) {
        this.editErrors.name = 'Commander name must be less than 100 characters'
      } else {
        delete this.editErrors.name
      }
    },

    // Actions
    async handleAddCommander() {
      this.validateCommanderName()
      if (this.errors.name) return

      this.submitting = true
      this.serverError = ''

      try {
        const token =
          localStorage.getItem('edh-stats-token') ||
          sessionStorage.getItem('edh-stats-token')
        const response = await fetch('/api/commanders', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.newCommander)
        })

        if (response.ok) {
          const data = await response.json()
          this.commanders.unshift(data.commander)
          this.resetAddForm()
        } else {
          const errorData = await response.json()
          this.serverError = errorData.message || 'Failed to create commander'
        }
      } catch (error) {
        console.error('Add commander error:', error)
        this.serverError = 'Network error occurred'
      } finally {
        this.submitting = false
      }
    },

    async handleUpdateCommander() {
      if (!this.editingCommander) return

      this.validateEditCommanderName()
      if (this.editErrors.name) return

      this.editSubmitting = true
      this.serverError = ''

      try {
        const token =
          localStorage.getItem('edh-stats-token') ||
          sessionStorage.getItem('edh-stats-token')
        const response = await fetch(
          `/api/commanders/${this.editingCommander.id}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: this.editingCommander.name,
              colors: this.editingCommander.colors
            })
          }
        )

         if (response.ok) {
           const data = await response.json()
           const index = this.commanders.findIndex(
             (c) => c.id === this.editingCommander.id
           )
           if (index !== -1) {
             this.commanders[index] = data.commander
           }
           this.cancelEdit()
         } else {
           const errorData = await response.json()
           // Format validation errors if they exist
           if (errorData.details && Array.isArray(errorData.details)) {
             this.serverError = errorData.details
               .map((err) => err.message || err)
               .join(', ')
           } else {
             this.serverError = errorData.message || 'Failed to update commander'
           }
         }
      } catch (error) {
        console.error('Update commander error:', error)
        this.serverError = 'Network error occurred'
      } finally {
        this.editSubmitting = false
      }
    },

    async deleteCommander(commander) {
      if (!confirm(`Are you sure you want to delete "${commander.name}"?`))
        return

      try {
        const token =
          localStorage.getItem('edh-stats-token') ||
          sessionStorage.getItem('edh-stats-token')
        const response = await fetch(`/api/commanders/${commander.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          this.commanders = this.commanders.filter((c) => c.id !== commander.id)
        } else {
          this.serverError = 'Failed to delete commander'
        }
      } catch (error) {
        console.error('Delete error:', error)
        this.serverError = 'Network error occurred'
      }
    },

    // Search
    async searchCommanders() {
      if (!this.searchQuery.trim()) {
        await this.loadCommanders()
        return
      }
      this.loading = true
      try {
        const token =
          localStorage.getItem('edh-stats-token') ||
          sessionStorage.getItem('edh-stats-token')
        const response = await fetch(
          `/api/commanders?q=${encodeURIComponent(this.searchQuery)}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )
        if (response.ok) {
          const data = await response.json()
          this.commanders = data.commanders || []
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        this.loading = false
      }
    },

    debounceSearch() {
      clearTimeout(this._searchTimeout)
      this._searchTimeout = setTimeout(() => {
        if (this.showPopular) {
          this.loadCommanders() // Reset to normal view if searching
          this.showPopular = false
        }
        this.searchCommanders()
      }, 300)
    },

    // UI Helpers
    toggleNewColor(colorId) {
      const index = this.newCommander.colors.indexOf(colorId)
      if (index > -1) {
        this.newCommander.colors.splice(index, 1)
      } else {
        this.newCommander.colors.push(colorId)
      }
    },

    toggleEditColor(colorId) {
      if (!this.editingCommander) return
      if (!this.editingCommander.colors) this.editingCommander.colors = []
      const index = this.editingCommander.colors.indexOf(colorId)
      if (index > -1) {
        this.editingCommander.colors = this.editingCommander.colors.filter(
          (c) => c !== colorId
        )
      } else {
        this.editingCommander.colors.push(colorId)
      }
    },

    isNewColorSelected(colorId) {
      return this.newCommander.colors.includes(colorId)
    },

    isEditColorSelected(colorId) {
      return (
        this.editingCommander &&
        this.editingCommander.colors &&
        this.editingCommander.colors.includes(colorId)
      )
    },

    getButtonClass(isSelected) {
      return isSelected
        ? 'ring-2 ring-offset-2 border-white'
        : 'ring-1 ring-offset-1 border-gray-300 hover:border-gray-400'
    },

    // Form Management
    editCommander(commander) {
      this.editingCommander = JSON.parse(JSON.stringify(commander))
      if (!Array.isArray(this.editingCommander.colors)) {
        this.editingCommander.colors = []
      }
      this.editErrors = {}
      this.serverError = ''
    },

    cancelEdit() {
      this.editingCommander = null
      this.editErrors = {}
    },

    resetAddForm() {
      this.showAddForm = false
      this.newCommander = { name: '', colors: [] }
      this.errors = {}
      this.serverError = ''
    }
  }
}

// Global Utilities
function getColorName(colorId) {
  const map = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' }
  return map[colorId] || colorId
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Register Alpine component
document.addEventListener('alpine:init', () => {
  Alpine.data('commanderManager', commanderManager)
})
