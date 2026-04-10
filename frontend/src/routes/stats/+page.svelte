<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { authenticatedFetch } from '$stores/auth';
	import NavBar from '$components/NavBar.svelte';
	import ProtectedRoute from '$components/ProtectedRoute.svelte';
	
	let Chart;
	let loading = true;
	let stats = {
		totalGames: 0,
		winRate: 0,
		totalCommanders: 0,
		avgRounds: 0
	};
	let commanderStats = [];
	let charts = {};
	
	onMount(async () => {
		if (browser) {
			// Dynamically import Chart.js
			const ChartModule = await import('chart.js/auto');
			Chart = ChartModule.default;
		}
		await loadStats();
	});
	
	onDestroy(() => {
		// Clean up charts
		if (charts.colorWinRate) charts.colorWinRate.destroy();
		if (charts.playerCount) charts.playerCount.destroy();
	});
	
	async function loadStats() {
		loading = true;
		try {
			// Load overview stats
			const overviewResponse = await authenticatedFetch('/api/stats/overview');
			if (overviewResponse.ok) {
				stats = await overviewResponse.json();
			}
			
			// Load commander detailed stats
			const detailsResponse = await authenticatedFetch('/api/stats/commanders');
			if (detailsResponse.ok) {
				const data = await detailsResponse.json();
				commanderStats = data.stats || [];
				
				// Initialize charts after data is loaded
				setTimeout(() => initCharts(data.charts), 100);
			}
		} catch (error) {
			console.error('Load stats error:', error);
		} finally {
			loading = false;
		}
	}
	
	function initCharts(chartData) {
		if (!browser || !Chart) return;
		
		// Destroy existing charts if any
		if (charts.colorWinRate) charts.colorWinRate.destroy();
		if (charts.playerCount) charts.playerCount.destroy();
		
		// Pastel color palette (15 colors)
		const pastelColors = [
			'#FFD93D', '#D4A5FF', '#FF9E9E', '#B4E7FF', '#FFA94D',
			'#9D84B7', '#FF85B3', '#4D96FF', '#FFCB69', '#56AB91',
			'#FF6B6B', '#FFB3D9', '#A8E6CF', '#6BCB77', '#C7CEEA'
		];
		
		// Color Identity Win Rate Chart
		const colorLabels = chartData?.colors?.labels || [];
		const colorData = chartData?.colors?.data || [];
		const filteredIndices = colorData
			.map((value, index) => (value > 0 ? index : -1))
			.filter((index) => index !== -1);
		
		const filteredLabels = filteredIndices.map((i) => colorLabels[i]);
		const filteredData = filteredIndices.map((i) => colorData[i]);
		const filteredColors = filteredIndices.map(
			(_, index) => pastelColors[index % pastelColors.length]
		);
		
		const colorCanvas = document.getElementById('colorWinRateChart');
		if (colorCanvas) {
			const colorCtx = colorCanvas.getContext('2d');
			charts.colorWinRate = new Chart(colorCtx, {
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
			});
		}
		
		// Player Count Win Rate Chart
		const playerLabels = chartData?.playerCounts?.labels || [];
		const playerData = chartData?.playerCounts?.data || [];
		const playerFilteredIndices = playerData
			.map((value, index) => (value > 0 ? index : -1))
			.filter((index) => index !== -1);
		
		const playerFilteredLabels = playerFilteredIndices.map((i) => playerLabels[i]);
		const playerFilteredData = playerFilteredIndices.map((i) => playerData[i]);
		
		const playerCanvas = document.getElementById('playerCountChart');
		if (playerCanvas) {
			const playerCtx = playerCanvas.getContext('2d');
			charts.playerCount = new Chart(playerCtx, {
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
			});
		}
	}
</script>

<svelte:head>
	<title>Statistics - EDH Stats Tracker</title>
	<meta name="description" content="View detailed statistics for your EDH/Commander games" />
</svelte:head>

<ProtectedRoute>
	<div class="min-h-screen bg-gray-50">
		<NavBar />
		
		<main class="container mx-auto px-4 py-8">
			<div class="flex justify-between items-center mb-6">
				<h1 class="text-3xl font-bold text-gray-900">Statistics</h1>
				<a href="/dashboard" class="text-indigo-600 hover:text-indigo-800">
					← Back to Dashboard
				</a>
			</div>
			
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<div class="loading-spinner w-12 h-12"></div>
				</div>
			{:else}
				<!-- Stats Overview -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div class="card">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gray-600 mb-1">Total Games</p>
								<p class="text-3xl font-bold text-gray-900">{stats.totalGames}</p>
							</div>
							<div class="text-4xl">🎮</div>
						</div>
					</div>
					
					<div class="card">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gray-600 mb-1">Win Rate</p>
								<p class="text-3xl font-bold text-gray-900">{stats.winRate}%</p>
							</div>
							<div class="text-4xl">🏆</div>
						</div>
					</div>
					
					<div class="card">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gray-600 mb-1">Commanders</p>
								<p class="text-3xl font-bold text-gray-900">{stats.totalCommanders}</p>
							</div>
							<div class="text-4xl">👑</div>
						</div>
					</div>
					
					<div class="card">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gray-600 mb-1">Avg Rounds</p>
								<p class="text-3xl font-bold text-gray-900">{stats.avgRounds}</p>
							</div>
							<div class="text-4xl">🔄</div>
						</div>
					</div>
				</div>
				
				<!-- Charts -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
					<!-- Color Win Rate Chart -->
					<div class="card">
						<h3 class="text-lg font-semibold mb-6">Win Rate by Color Identity</h3>
						<div class="h-64 relative">
							<canvas id="colorWinRateChart"></canvas>
						</div>
					</div>
					
					<!-- Player Count Chart -->
					<div class="card">
						<h3 class="text-lg font-semibold mb-6">Win Rate by Player Count</h3>
						<div class="h-64 relative">
							<canvas id="playerCountChart"></canvas>
						</div>
					</div>
				</div>
				
				<!-- Commander Stats Table -->
				<div class="card">
					<h2 class="text-xl font-bold mb-4">Commander Performance</h2>
					
					{#if commanderStats.length === 0}
						<div class="text-center py-8 text-gray-500">
							<p>No commander stats yet</p>
							<a href="/games" class="text-indigo-600 hover:text-indigo-800 mt-2 inline-block">
								Log games to see stats
							</a>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Commander
										</th>
										<th
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Games
										</th>
										<th
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Wins
										</th>
										<th
											class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
										>
											Win Rate
										</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each commanderStats as commander}
										<tr class="hover:bg-gray-50">
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm font-medium text-gray-900">
													{commander.name}
												</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm text-gray-900">{commander.totalGames}</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm text-gray-900">{commander.wins}</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm">
													<span
														class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {commander.winRate >=
														50
															? 'bg-green-100 text-green-800'
															: 'bg-gray-100 text-gray-800'}"
													>
														{commander.winRate}%
													</span>
												</div>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/if}
		</main>
		
		<!-- Footer -->
		<footer class="bg-white border-t border-gray-200 mt-12">
			<div class="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
				<p>EDH Stats Tracker • Track your Commander games</p>
			</div>
		</footer>
	</div>
</ProtectedRoute>
