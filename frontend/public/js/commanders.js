// Commander management Alpine.js components
function commanderManager() {
    return {
        showAddForm: false,
        editingCommander: null,
        commanders: [],
        popular: [],
        loading: false,
        showPopular: false,
        searchQuery: '',
        submitting: false,
        editSubmitting: false,
        newCommander: {
            name: '',
            colors: []
        },
        editingCommander: {
            name: '',
            colors: []
        },
        errors: {},
        editErrors: {},
        serverError: '',

        // MTG Color data
        mtgColors: [
            { id: 'W', name: 'White', hex: '#F0E6D2' },
            { id: 'U', name: 'Blue', hex: '#0E68AB' },
            { id: 'B', name: 'Black', hex: '#2C2B2D' },
            { id: 'R', name: 'Red', hex: '#C44536' },
            { id: 'G', name: 'Green', hex: '#5A7A3B' }
        ],

        async init() {
            await this.loadCommanders()
        },

        async loadCommanders() {
            this.loading = true
            try {
                const response = await fetch('/api/commanders', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('edh-stats-token')}`
                    }
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
            this.showPopular = true
            try {
                const response = await fetch('/api/commanders/popular', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('edh-stats-token')}`
                    }
                })
                
                if (response.ok) {
                    const data = await response.json()
                    this.popular = data.commanders || []
                } else {
                    this.serverError = 'Failed to load popular commanders'
                }
            } catch (error) {
                console.error('Load popular commanders error:', error)
                this.serverError = 'Network error occurred'
            } finally {
                this.loading = false
            }
        },

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

        async handleAddCommander() {
            this.validateCommanderName()
            
            if (this.errors.name) {
                return
            }

            this.submitting = true
            this.serverError = ''

            try {
                const response = await fetch('/api/commanders', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('edh-stats-token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.newCommander)
                })

                if (response.ok) {
                    const data = await response.json()
                    this.commanders.unshift(data.commander)
                    this.resetAddForm()
                    await this.loadCommanders() // Refresh the list
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
            this.validateEditCommanderName()
            
            if (this.editErrors.name) {
                return
            }

            this.editSubmitting = true
            this.serverError = ''

            try {
                const response = await fetch(`/api/commanders/${this.editingCommander.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('edh-stats-token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: this.editingCommander.name
                    })
                })

                if (response.ok) {
                    const data = await response.json()
                    // Update the commander in the list
                    const index = this.commanders.findIndex(c => c.id === this.editingCommander.id)
                    if (index !== -1) {
                        this.commanders[index] = data.commander
                    }
                    this.cancelEdit()
                } else {
                    this.serverError = 'Failed to update commander'
                }
            } catch (error) {
                console.error('Update commander error:', error)
                this.serverError = 'Network error occurred'
            } finally {
                this.editSubmitting = false
            }
        },

        async deleteCommander(commander) {
            if (!confirm(`Are you sure you want to delete "${commander.name}"? This action cannot be undone.`)) {
                return
            }

            try {
                const response = await fetch(`/api/commanders/${commander.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('edh-stats-token')}`
                    }
                })

                if (response.ok) {
                    // Remove from local list
                    this.commanders = this.commanders.filter(c => c.id !== commander.id)
                } else {
                    this.serverError = 'Failed to delete commander'
                }
            } catch (error) {
                console.error('Delete commander error:', error)
                this.serverError = 'Network error occurred'
            }
        },

        editCommander(commander) {
            this.editingCommander = { ...commander }
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
        },

        resetEditForm() {
            this.editingCommander = null
            this.editErrors = {}
            this.serverError = ''
        },

        async debounceSearch() {
            this.$nextTick(() => {
                if (this.showPopular) {
                    await this.loadCommanders()
                } else {
                    await this.searchCommanders()
                }
            })
        },

        async searchCommanders() {
            if (!this.searchQuery.trim()) {
                await this.loadCommanders()
                return
            }

            this.loading = true
            this.serverError = ''

            try {
                const response = await fetch(`/api/commanders?q=${encodeURIComponent(this.searchQuery)}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('edh-stats-token')}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    this.commanders = data.commanders || []
                } else {
                    this.serverError = 'Search failed'
                }
            } catch (error) {
                console.error('Search commanders error:', error)
                this.serverError = 'Network error occurred'
            } finally {
                this.loading = false
            }
        }
    }
}

// MTG Color Identity Picker Component
function colorIdentityPicker() {
    return {
        selectedColors: [],
        
        toggleColor(colorId) {
            const index = this.selectedColors.indexOf(colorId)
            if (index > -1) {
                this.selectedColors.splice(index, 1)
            } else {
                this.selectedColors.push(colorId)
            }
        },

        getButtonClass(colorId) {
            return this.selectedColors.includes(colorId) 
                ? 'ring-2 ring-offset-2 border-white' 
                : 'ring-1 ring-offset-1 border-gray-300 hover:border-gray-400'
        }
    }
}

// Utility functions
function getColorName(colorId) {
    const colorNames = {
        'W': 'White',
        'U': 'Blue', 
        'B': 'Black',
        'R': 'Red',
        'G': 'Green'
    }
    return colorNames[colorId] || colorId
}

function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
}

// Make functions globally available
document.addEventListener('alpine:init', () => {
    Alpine.data('commanderManager', commanderManager)
    Alpine.data('colorIdentityPicker', colorIdentityPicker)
})