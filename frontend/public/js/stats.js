// Statistics management Alpine.js component
function statsManager() {
  return {
    loading: true,
    stats: {
      totalGames: 0,
      winRate: 0,
      totalCommanders: 0,
      avgRounds: 0
    },
    commanderStats: [],
    charts: {},

    async init() {
      await this.loadStats()
    },

    async loadStats() {
      this.loading = true
      try {
        // Load overview stats
        const overviewResponse = await fetch('/api/stats/overview', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('edh-stats-token') || sessionStorage.getItem('edh-stats-token')}`
          }
        })

        if (overviewResponse.ok) {
          this.stats = await overviewResponse.json()
        }

        // Load commander detailed stats
        const detailsResponse = await fetch('/api/stats/commanders', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('edh-stats-token') || sessionStorage.getItem('edh-stats-token')}`
          }
        })

        if (detailsResponse.ok) {
          const data = await detailsResponse.json()
          this.commanderStats = data.stats || []

          // Initialize charts after data load
          this.$nextTick(() => {
            this.initCharts(data.charts)
          })
        }
      } catch (error) {
        console.error('Load stats error:', error)
      } finally {
        this.loading = false
      }
    },

    initCharts(chartData) {
      // Destroy existing charts if any
      if (this.charts.colorWinRate) this.charts.colorWinRate.destroy()
      if (this.charts.playerCount) this.charts.playerCount.destroy()

      // Pastel color palette (15 colors) - mixed to avoid similar colors adjacent
      const pastelColors = [
        '#FFD93D', // Pastel Yellow
        '#D4A5FF', // Pastel Violet
        '#FF9E9E', // Pastel Rose
        '#B4E7FF', // Pastel Cyan
        '#FFA94D', // Pastel Orange
        '#9D84B7', // Pastel Purple
        '#FF85B3', // Pastel Pink
        '#4D96FF', // Pastel Blue
        '#FFCB69', // Pastel Peach
        '#56AB91', // Pastel Teal
        '#FF6B6B', // Pastel Red
        '#FFB3D9', // Pastel Magenta
        '#A8E6CF', // Pastel Mint
        '#6BCB77', // Pastel Green
        '#C7CEEA' // Pastel Lavender
      ]

      // Filter out color combinations with no win rate
      const colorLabels = chartData?.colors?.labels || []
      const colorData = chartData?.colors?.data || []
      const filteredIndices = colorData
        .map((value, index) => (value > 0 ? index : -1))
        .filter((index) => index !== -1)

      const filteredLabels = filteredIndices.map((i) => colorLabels[i])
      const filteredData = filteredIndices.map((i) => colorData[i])
      const filteredColors = filteredIndices.map(
        (_, index) => pastelColors[index % pastelColors.length]
      )

      // Color Identity Win Rate Chart
      const colorCtx = document
        .getElementById('colorWinRateChart')
        .getContext('2d')
      this.charts.colorWinRate = new Chart(colorCtx, {
        type: 'doughnut',
        data: {
          labels: filteredLabels,
          datasets: [
            {
              data: filteredData,
              backgroundColor: filteredColors,
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' }
          }
        }
      })

      // Player Count Win Rate Chart - filter out player counts with no wins
      const playerLabels = chartData?.playerCounts?.labels || []
      const playerData = chartData?.playerCounts?.data || []
      const playerFilteredIndices = playerData
        .map((value, index) => (value > 0 ? index : -1))
        .filter((index) => index !== -1)

      const playerFilteredLabels = playerFilteredIndices.map((i) => playerLabels[i])
      const playerFilteredData = playerFilteredIndices.map((i) => playerData[i])

      const playerCtx = document
        .getElementById('playerCountChart')
        .getContext('2d')
      this.charts.playerCount = new Chart(playerCtx, {
        type: 'bar',
        data: {
          labels: playerFilteredLabels,
          datasets: [
            {
              label: 'Win Rate (%)',
              data: playerFilteredData,
              backgroundColor: '#6366f1',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      })
    },

    calculatePercentage(value, total) {
      if (!total) return 0
      return Math.round((value / total) * 100)
    }
  }
}

document.addEventListener('alpine:init', () => {
  Alpine.data('statsManager', statsManager)
})
