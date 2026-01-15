// Main application Alpine.js data and methods
function app() {
  return {
    currentUser: null,
    loading: true,
    mobileMenuOpen: false,
    roundCounter: {
      active: false,
      current: 1,
      startTime: null
    },
    stats: {
      totalGames: 0,
      winRate: 0,
      totalCommanders: 0,
      avgRounds: 0
    },
    recentGames: [],
    topCommanders: [],

    async init() {
      // Check authentication on load
      await this.checkAuth()

      // Load dashboard data if authenticated
      if (this.currentUser) {
        await this.loadDashboardData()
      }

      // Load round counter from localStorage
      this.loadRoundCounter()

      // Listen for page visibility changes to refresh stats
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && localStorage.getItem('edh-stats-dirty')) {
          localStorage.removeItem('edh-stats-dirty')
          this.loadDashboardData()
        }
      })
    },

    async checkAuth() {
      const token =
        localStorage.getItem('edh-stats-token') ||
        sessionStorage.getItem('edh-stats-token')
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            this.currentUser = data.user
          } else {
            // Token invalid, remove it
            localStorage.removeItem('edh-stats-token')
            sessionStorage.removeItem('edh-stats-token')
            if (window.location.pathname !== '/login.html') {
              window.location.href = '/login.html'
            }
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          localStorage.removeItem('edh-stats-token')
          sessionStorage.removeItem('edh-stats-token')
        }
      } else {
        if (
          window.location.pathname !== '/login.html' &&
          window.location.pathname !== '/register.html'
        ) {
          window.location.href = '/login.html'
        }
      }

      this.loading = false
    },

    async loadDashboardData() {
      try {
        const token =
          localStorage.getItem('edh-stats-token') ||
          sessionStorage.getItem('edh-stats-token')

        // Load user stats
        const statsResponse = await fetch('/api/stats/overview', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          this.stats = {
            totalGames: statsData.total_games || 0,
            winRate: Math.round(statsData.win_rate || 0),
            totalCommanders: statsData.total_commanders || 0,
            avgRounds: Math.round(statsData.avg_rounds || 0)
          }
        }

        // Load recent games
        const gamesResponse = await fetch('/api/games?limit=5', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (gamesResponse.ok) {
          const gamesData = await gamesResponse.json()
          this.recentGames = gamesData.games || []
        }

        // Load top commanders with stats
        const commandersResponse = await fetch('/api/stats/commanders', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (commandersResponse.ok) {
          const commandersData = await commandersResponse.json()
          // Sort by total_games descending and limit to 5, removing duplicates
          const commanders = Array.isArray(commandersData.stats)
            ? commandersData.stats
            : []
          const uniqueCommanders = [
            ...new Map(commanders.map((c) => [c.id, c])).values()
          ]
          this.topCommanders = uniqueCommanders.slice(0, 5)
        } else {
          this.topCommanders = []
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      }
    },

    logout() {
      localStorage.removeItem('edh-stats-token')
      sessionStorage.removeItem('edh-stats-token')
      window.location.href = '/login.html'
    },

    // Round counter methods
    startRoundCounter() {
      this.roundCounter.active = true
      this.roundCounter.current = 1
      this.roundCounter.startTime = new Date()
      this.saveRoundCounter()
    },

    incrementRound() {
      this.roundCounter.current++
      this.saveRoundCounter()
    },

    resetRoundCounter() {
      this.roundCounter.active = false
      this.roundCounter.current = 1
      this.roundCounter.startTime = null
      this.saveRoundCounter()
    },

    saveRoundCounter() {
      localStorage.setItem(
        'edh-round-counter',
        JSON.stringify({
          active: this.roundCounter.active,
          current: this.roundCounter.current,
          startTime: this.roundCounter.startTime
        })
      )
    },

    loadRoundCounter() {
      const saved = localStorage.getItem('edh-round-counter')
      if (saved) {
        const data = JSON.parse(saved)
        this.roundCounter = data

        // If counter is older than 24 hours, reset it
        if (
          data.startTime &&
          new Date() - new Date(data.startTime) > 24 * 60 * 60 * 1000
        ) {
          this.resetRoundCounter()
        }
      }
    },

    // Utility methods
    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year:
          date.getFullYear() !== new Date().getFullYear()
            ? 'numeric'
            : undefined
      })
    },

    getColorName(color) {
      const colorNames = {
        W: 'White',
        U: 'Blue',
        B: 'Black',
        R: 'Red',
        G: 'Green'
      }
      return colorNames[color] || color
    },

    // API helper method
    async apiCall(endpoint, options = {}) {
      const token =
        localStorage.getItem('edh-stats-token') ||
        sessionStorage.getItem('edh-stats-token')
      const defaultOptions = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      }

      const response = await fetch(endpoint, {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers
        }
      })

      if (response.status === 401) {
        // Token expired, redirect to login
        this.logout()
        throw new Error('Authentication required')
      }

      return response
    }
  }
}

// Make the app function globally available
document.addEventListener('alpine:init', () => {
  Alpine.data('app', app)
})
