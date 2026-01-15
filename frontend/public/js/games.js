// Game management Alpine.js component
function gameManager() {
  return {
    showLogForm: false,
    games: [],
    commanders: [],
    loading: false,
    submitting: false,
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

    async init() {
      await Promise.all([this.loadCommanders(), this.loadGames()])
      this.loadPrefilled()
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
      if (!this.newGame.commanderId) {
        this.serverError = 'Please select a commander'
        return
      }

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
            this.newGame.solRingTurnOneWon === 'true',
          notes: this.newGame.notes
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
          // Reload stats if we want to update them immediately,
          // but for now just adding to the list is fine.
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
