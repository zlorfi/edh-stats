// Game management Alpine.js component
function gameManager() {
  return {
    showLogForm: false,
    games: [],
    commanders: [],
    loading: false,
    submitting: false,
    editSubmitting: false,
    editingGame: null,
    serverError: '',

    // Game form data
    newGame: {
      date: new Date().toISOString().split('T')[0],
      commanderId: '',
      playerCount: 4,
      won: false,
      rounds: 8,
      startingPlayerWon: false,
      solRingTurnOneWon: false,
      notes: ''
    },

    // Pagination
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      hasMore: false
    },

    // Computed form data - returns editingGame if editing, otherwise newGame
    get formData() {
      return this.editingGame || this.newGame
    },

    async init() {
      await Promise.all([this.loadCommanders(), this.loadGames()])
      this.loadPrefilled()
    },

    async reloadStats() {
      try {
        const token =
          localStorage.getItem('edh-stats-token') ||
          sessionStorage.getItem('edh-stats-token')
        const response = await fetch('/api/stats/overview', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          // Set a flag for dashboard to refresh when user navigates back
          localStorage.setItem('edh-stats-dirty', 'true')
        }
      } catch (error) {
        console.error('Failed to reload stats:', error)
      }
    },

    loadPrefilled() {
      const prefilled = localStorage.getItem('edh-prefill-game')
      if (prefilled) {
        try {
          const data = JSON.parse(prefilled)

          // Populate the form with prefilled values
          this.newGame.date =
            data.date || new Date().toISOString().split('T')[0]
          this.newGame.rounds = data.rounds || 8
          this.newGame.notes =
            `Ended after ${data.rounds} rounds in ${data.duration}` || ''

          // Show the form automatically
          this.showLogForm = true

          // Clear the prefilled data from localStorage
          localStorage.removeItem('edh-prefill-game')

          // Scroll to the form
          setTimeout(() => {
            document
              .querySelector('form')
              ?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        } catch (error) {
          console.error('Error loading prefilled game data:', error)
        }
      }
    },

    async loadCommanders() {
      try {
        const response = await fetch('/api/commanders', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('edh-stats-token') || sessionStorage.getItem('edh-stats-token')}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          this.commanders = data.commanders || []
        }
      } catch (error) {
        console.error('Load commanders error:', error)
      }
    },

    async loadGames(page = 1) {
      this.loading = true
      const offset = (page - 1) * this.pagination.limit

      try {
        const response = await fetch(
          `/api/games?limit=${this.pagination.limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('edh-stats-token') || sessionStorage.getItem('edh-stats-token')}`
            }
          }
        )

        if (response.ok) {
          const data = await response.json()

          if (page === 1) {
            this.games = data.games || []
          } else {
            this.games = [...this.games, ...(data.games || [])]
          }

          this.pagination.total = data.pagination?.total || 0
          this.pagination.page = page
          this.pagination.hasMore = this.games.length < this.pagination.total
        } else {
          this.serverError = 'Failed to load games'
        }
      } catch (error) {
        console.error('Load games error:', error)
        this.serverError = 'Network error occurred'
      } finally {
        this.loading = false
      }
    },

    async handleLogGame() {
      this.serverError = ''

      // Basic validation
      if (!this.formData.commanderId) {
        this.serverError = 'Please select a commander'
        return
      }

      if (this.editingGame) {
        await this.handleUpdateGame()
      } else {
        await this.handleCreateGame()
      }
    },

     async handleCreateGame() {
       this.submitting = true

       try {
         // Ensure boolean values are actual booleans, not strings
         const payload = {
           date: this.newGame.date,
           commanderId: parseInt(this.newGame.commanderId),
           playerCount: parseInt(this.newGame.playerCount),
           rounds: parseInt(this.newGame.rounds),
           won: this.newGame.won === true || this.newGame.won === 'true',
           startingPlayerWon:
             this.newGame.startingPlayerWon === true ||
             this.newGame.startingPlayerWon === 'true',
           solRingTurnOneWon:
             this.newGame.solRingTurnOneWon === true ||
             this.newGame.solRingTurnOneWon === 'true'
         }
         
         // Only include notes if it's not empty
         if (this.newGame.notes && this.newGame.notes.trim()) {
           payload.notes = this.newGame.notes
         }

        const response = await fetch('/api/games', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('edh-stats-token') || sessionStorage.getItem('edh-stats-token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          const data = await response.json()
          this.games.unshift(data.game)
          this.resetForm()
          this.showLogForm = false
          await this.reloadStats()
        } else {
          const errorData = await response.json()
          this.serverError = errorData.message || 'Failed to log game'
        }
      } catch (error) {
        console.error('Log game error:', error)
        this.serverError = 'Network error occurred'
      } finally {
        this.submitting = false
      }
    },

     async handleUpdateGame() {
       this.editSubmitting = true

       try {
         const payload = {
           date: this.editingGame.date,
           commanderId: parseInt(this.editingGame.commanderId),
           playerCount: parseInt(this.editingGame.playerCount),
           rounds: parseInt(this.editingGame.rounds),
           won: this.editingGame.won === true || this.editingGame.won === 'true',
           startingPlayerWon:
             this.editingGame.startingPlayerWon === true ||
             this.editingGame.startingPlayerWon === 'true',
           solRingTurnOneWon:
             this.editingGame.solRingTurnOneWon === true ||
             this.editingGame.solRingTurnOneWon === 'true'
         }
         
         // Only include notes if it's not empty
         if (this.editingGame.notes && this.editingGame.notes.trim()) {
           payload.notes = this.editingGame.notes
         }

        const response = await fetch(`/api/games/${this.editingGame.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('edh-stats-token') || sessionStorage.getItem('edh-stats-token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          const data = await response.json()
          const index = this.games.findIndex(
            (g) => g.id === this.editingGame.id
          )
          if (index !== -1) {
            this.games[index] = data.game
          }
          this.cancelEdit()
          await this.reloadStats()
        } else {
          const errorData = await response.json()
          this.serverError = errorData.message || 'Failed to update game'
        }
      } catch (error) {
        console.error('Update game error:', error)
        this.serverError = 'Network error occurred'
      } finally {
        this.editSubmitting = false
      }
    },

    editGame(gameId) {
      const game = this.games.find((g) => g.id === gameId)
      if (game) {
        // Convert date from MM/DD/YYYY to YYYY-MM-DD format for input type="date"
        let dateForInput = game.date
        if (dateForInput && dateForInput.includes('/')) {
          const [month, day, year] = dateForInput.split('/')
          dateForInput = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        }

        this.editingGame = {
          id: game.id,
          date: dateForInput,
          commanderId: game.commanderId,
          playerCount: game.playerCount,
          won: game.won === 1 || game.won === true,
          rounds: game.rounds,
          startingPlayerWon:
            game.startingPlayerWon === 1 || game.startingPlayerWon === true,
          solRingTurnOneWon:
            game.solRingTurnOneWon === 1 || game.solRingTurnOneWon === true,
          notes: game.notes
        }
        this.showLogForm = true
        this.serverError = ''
        setTimeout(() => {
          document.querySelector('form')?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    },

    cancelEdit() {
      this.editingGame = null
      this.resetForm()
      this.showLogForm = false
    },

    async deleteGame(gameId) {
      if (!confirm('Are you sure you want to delete this game record?')) {
        return
      }

      try {
        const response = await fetch(`/api/games/${gameId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('edh-stats-token') || sessionStorage.getItem('edh-stats-token')}`
          }
        })

        if (response.ok) {
          this.games = this.games.filter((g) => g.id !== gameId)
          await this.reloadStats()
        } else {
          alert('Failed to delete game')
        }
      } catch (error) {
        console.error('Delete game error:', error)
      }
    },

    resetForm() {
      this.newGame = {
        date: new Date().toISOString().split('T')[0],
        commanderId: '',
        playerCount: 4,
        won: false,
        rounds: 8,
        startingPlayerWon: false,
        solRingTurnOneWon: false,
        notes: ''
      }
      this.editingGame = null
      this.serverError = ''
    },

    loadMore() {
      if (this.pagination.hasMore) {
        this.loadGames(this.pagination.page + 1)
      }
    },

    getCommanderName(id) {
      const commander = this.commanders.find((c) => c.id === id)
      return commander ? commander.name : 'Unknown Commander'
    },

    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }
  }
}

document.addEventListener('alpine:init', () => {
  Alpine.data('gameManager', gameManager)
})
