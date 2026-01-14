// Statistics management Alpine.js component
function statsManager() {
    return {
        loading: true,
        overview: {
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
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('edh-stats-token') || sessionStorage.getItem('edh-stats-token')}` }
                })
                
                if (overviewResponse.ok) {
                    this.overview = await overviewResponse.json()
                }

                // Load commander detailed stats
                const detailsResponse = await fetch('/api/stats/commanders', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('edh-stats-token') || sessionStorage.getItem('edh-stats-token')}` }
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

            // Color Identity Win Rate Chart
            const colorCtx = document.getElementById('colorWinRateChart').getContext('2d')
            this.charts.colorWinRate = new Chart(colorCtx, {
                type: 'doughnut',
                data: {
                    labels: chartData?.colors?.labels || [],
                    datasets: [{
                        data: chartData?.colors?.data || [],
                        backgroundColor: [
                            '#F0E6D2', // White
                            '#0E68AB', // Blue
                            '#2C2B2D', // Black
                            '#C44536', // Red
                            '#5A7A3B'  // Green
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' }
                    }
                }
            })

            // Player Count Win Rate Chart
            const playerCtx = document.getElementById('playerCountChart').getContext('2d')
            this.charts.playerCount = new Chart(playerCtx, {
                type: 'bar',
                data: {
                    labels: chartData?.playerCounts?.labels || [],
                    datasets: [{
                        label: 'Win Rate (%)',
                        data: chartData?.playerCounts?.data || [],
                        backgroundColor: '#6366f1',
                        borderRadius: 4
                    }]
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
