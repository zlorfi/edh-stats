// Round Counter Alpine.js Component
function roundCounterApp() {
  return {
    counterActive: false,
    currentRound: 1,
    startTime: null,
    elapsedTime: '00:00:00',
    avgTimePerRound: '00:00',
    timerInterval: null,
    hasPausedGame: false,
    pausedElapsedTime: 0, // Track elapsed time when paused

    // Reset confirmation modal
    resetConfirm: {
      show: false,
      resetting: false
    },

    async init() {
      // Load saved counter state
      this.loadCounter()

      // Start timer if counter is active
      if (this.counterActive) {
        this.startTimer()
      }
    },

    toggleCounter() {
      if (this.counterActive) {
        this.stopCounter()
      } else {
        this.startCounter()
      }
    },

    startCounter() {
      this.counterActive = true
      this.hasPausedGame = false
      // Only set new start time if this isn't a resumed game
      if (!this.startTime) {
        this.startTime = new Date()
      } else {
        // Resuming: adjust start time to account for paused duration
        this.startTime = new Date(Date.now() - this.pausedElapsedTime * 1000)
      }
      this.saveCounter()
      this.startTimer()
    },

    stopCounter() {
      this.counterActive = false
      this.hasPausedGame = true
      // Store the current elapsed time when pausing
      if (this.startTime) {
        this.pausedElapsedTime = Math.floor((Date.now() - new Date(this.startTime)) / 1000)
      }
      this.clearTimer()
      this.saveCounter()
    },

    resetCounter() {
      this.counterActive = false
      this.hasPausedGame = false
      this.currentRound = 1
      this.startTime = null
      this.elapsedTime = '00:00:00'
      this.avgTimePerRound = '00:00'
      this.pausedElapsedTime = 0
      this.clearTimer()
      this.stopErrorChecking()
      this.saveCounter()
    },

    stopErrorChecking() {
      // Prevent infinite error checking
    },

    confirmReset() {
      this.resetConfirm.resetting = true

      // Small delay to simulate work and show loading state
      setTimeout(() => {
        this.counterActive = false
        this.hasPausedGame = false
        this.currentRound = 1
        this.startTime = null
        this.elapsedTime = '00:00:00'
        this.avgTimePerRound = '00:00'
        this.pausedElapsedTime = 0
        this.clearTimer()
        this.saveCounter()
        this.resetConfirm.show = false
        this.resetConfirm.resetting = false
      }, 300)
    },

    incrementRound() {
      this.currentRound++
      this.saveCounter()
    },

    decrementRound() {
      if (this.currentRound > 1) {
        this.currentRound--
        this.saveCounter()
      }
    },

    startTimer() {
      // Clear existing timer if any
      this.clearTimer()
      
      this.timerInterval = setInterval(() => {
        if (this.counterActive && this.startTime) {
          const now = new Date()
          const elapsed = Math.floor((now - new Date(this.startTime)) / 1000)

          const hours = Math.floor(elapsed / 3600)
          const minutes = Math.floor((elapsed % 3600) / 60)
          const seconds = elapsed % 60

          this.elapsedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

          // Calculate average time per round
          if (this.currentRound > 1 && elapsed > 0) {
            const avgSeconds = Math.floor(elapsed / this.currentRound)
            const avgMins = Math.floor(avgSeconds / 60)
            const avgSecs = avgSeconds % 60
            this.avgTimePerRound = `${avgMins}:${String(avgSecs).padStart(2, '0')}`
          }
        }
      }, 1000)
    },

    clearTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval)
        this.timerInterval = null
      }
    },

    saveCounter() {
      this.stopErrorChecking()
      localStorage.setItem(
        'edh-round-counter-state',
        JSON.stringify({
          counterActive: this.counterActive,
          currentRound: this.currentRound,
          startTime: this.startTime,
          elapsedTime: this.elapsedTime,
          avgTimePerRound: this.avgTimePerRound,
          hasPausedGame: this.hasPausedGame,
          pausedElapsedTime: this.pausedElapsedTime
        })
      )
    },

    loadCounter() {
      this.stopErrorChecking()
      const saved = localStorage.getItem('edh-round-counter-state')
      if (saved) {
        try {
          const data = JSON.parse(saved)
          this.counterActive = data.counterActive || false
          this.currentRound = data.currentRound || 1
          this.startTime = data.startTime ? new Date(data.startTime) : null
          this.elapsedTime = data.elapsedTime || '00:00:00'
          this.avgTimePerRound = data.avgTimePerRound || '00:00'
          this.hasPausedGame = data.hasPausedGame || false
          this.pausedElapsedTime = data.pausedElapsedTime || 0
          this.startTimer()
        } catch (error) {
          console.error('Error loading counter:', error)
          this.resetCounter()
        }
      }
    },

    saveAndGoToGameLog() {
      // Save the complete game data to localStorage for the game log page
      const now = new Date()
      localStorage.setItem(
        'edh-prefill-game',
        JSON.stringify({
          date: now.toISOString().split('T')[0], // YYYY-MM-DD format for date input
          rounds: this.currentRound,
          duration: this.elapsedTime,
          startTime: this.startTime
            ? new Date(this.startTime).toISOString()
            : null,
          endTime: now.toISOString(),
          avgTimePerRound: this.avgTimePerRound
        })
      )

      // Redirect to game log page
      window.location.href = '/games.html'
    },

    // Utility
    destroy() {
      this.clearTimer()
    }
  }
}

// Register the Alpine component
document.addEventListener('alpine:init', () => {
  Alpine.data('roundCounterApp', roundCounterApp)
})
