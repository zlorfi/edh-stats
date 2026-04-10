<script>
	import { onMount } from 'svelte';
	import { authenticatedFetch } from '$stores/auth';
	import NavBar from '$components/NavBar.svelte';
	import ProtectedRoute from '$components/ProtectedRoute.svelte';
	
	let stats = {
		totalGames: 0,
		winRate: 0,
		totalCommanders: 0,
		avgRounds: 0
	};
	
	let recentGames = [];
	let topCommanders = [];
	let loading = true;
	
	onMount(async () => {
		await loadDashboardData();
	});
	
	async function loadDashboardData() {
		loading = true;
		try {
			// Load user stats
			const statsResponse = await authenticatedFetch('/api/stats/overview');
			if (statsResponse.ok) {
				stats = await statsResponse.json();
			}
			
			// Load recent games
			const gamesResponse = await authenticatedFetch('/api/games?limit=5');
			if (gamesResponse.ok) {
				const gamesData = await gamesResponse.json();
				recentGames = gamesData.games || [];
			}
			
			// Load top commanders
			const commandersResponse = await authenticatedFetch('/api/stats/commanders');
			if (commandersResponse.ok) {
				const commandersData = await commandersResponse.json();
				const commanders = Array.isArray(commandersData.stats) ? commandersData.stats : [];
				topCommanders = commanders.slice(0, 5);
			}
		} catch (error) {
			console.error('Failed to load dashboard data:', error);
		} finally {
			loading = false;
		}
	}
	
	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
		});
	}
	
	function getColorName(color) {
		const colorNames = {
			W: 'White',
			U: 'Blue',
			B: 'Black',
			R: 'Red',
			G: 'Green'
		};
		return colorNames[color] || color;
	}
</script>

<svelte:head>
	<title>Dashboard - EDH Stats Tracker</title>
	<meta name="description" content="Your EDH/Commander game statistics dashboard" />
</svelte:head>

<ProtectedRoute>
	<div class="min-h-screen bg-gray-50">
		<NavBar />
		
		<main class="container mx-auto px-4 py-8">
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<div class="loading-spinner w-12 h-12"></div>
				</div>
			{:else}
				<!-- Stats Overview -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<!-- Total Games -->
					<div class="card">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gray-600 mb-1">Total Games</p>
								<p class="text-3xl font-bold text-gray-900">{stats.totalGames}</p>
							</div>
							<div class="text-4xl">🎮</div>
						</div>
					</div>
					
					<!-- Win Rate -->
					<div class="card">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gray-600 mb-1">Win Rate</p>
								<p class="text-3xl font-bold text-gray-900">{stats.winRate}%</p>
							</div>
							<div class="text-4xl">🏆</div>
						</div>
					</div>
					
					<!-- Commanders -->
					<div class="card">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm text-gray-600 mb-1">Commanders</p>
								<p class="text-3xl font-bold text-gray-900">{stats.totalCommanders}</p>
							</div>
							<div class="text-4xl">👑</div>
						</div>
					</div>
					
					<!-- Avg Rounds -->
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
				
				<!-- Quick Actions -->
				<div class="mb-8">
					<h2 class="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<a
							href="/games"
							class="card hover:shadow-lg transition-shadow cursor-pointer bg-indigo-50 border-2 border-indigo-200"
						>
							<div class="flex items-center space-x-4">
								<div class="text-4xl">📝</div>
								<div>
									<h3 class="font-bold text-lg">Log a Game</h3>
									<p class="text-sm text-gray-600">Record your latest match</p>
								</div>
							</div>
						</a>
						
						<a
							href="/round-counter"
							class="card hover:shadow-lg transition-shadow cursor-pointer bg-green-50 border-2 border-green-200"
						>
							<div class="flex items-center space-x-4">
								<div class="text-4xl">⏱️</div>
								<div>
									<h3 class="font-bold text-lg">Round Timer</h3>
									<p class="text-sm text-gray-600">Track game progress</p>
								</div>
							</div>
						</a>
						
						<a
							href="/stats"
							class="card hover:shadow-lg transition-shadow cursor-pointer bg-purple-50 border-2 border-purple-200"
						>
							<div class="flex items-center space-x-4">
								<div class="text-4xl">📊</div>
								<div>
									<h3 class="font-bold text-lg">View Stats</h3>
									<p class="text-sm text-gray-600">Analyze your performance</p>
								</div>
							</div>
						</a>
					</div>
				</div>
				
				<!-- Recent Games and Top Commanders -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Recent Games -->
					<div class="card">
						<div class="flex justify-between items-center mb-4">
							<h2 class="text-xl font-bold text-gray-900">Recent Games</h2>
							<a href="/games" class="text-sm text-indigo-600 hover:text-indigo-800">
								View All →
							</a>
						</div>
						
						{#if recentGames.length === 0}
							<div class="text-center py-8 text-gray-500">
								<p>No games logged yet</p>
								<a href="/games" class="text-indigo-600 hover:text-indigo-800 mt-2 inline-block">
									Log your first game
								</a>
							</div>
						{:else}
							<div class="space-y-3">
								{#each recentGames as game}
									<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
										<div class="flex-1">
											<p class="font-medium text-gray-900">{game.commander_name}</p>
											<p class="text-sm text-gray-600">
												{formatDate(game.date)} • {game.rounds} rounds • {game.player_count} players
											</p>
										</div>
										<div class="ml-4">
											{#if game.won}
												<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
													Won
												</span>
											{:else}
												<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
													Loss
												</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
					
					<!-- Top Commanders -->
					<div class="card">
						<div class="flex justify-between items-center mb-4">
							<h2 class="text-xl font-bold text-gray-900">Top Commanders</h2>
							<a href="/commanders" class="text-sm text-indigo-600 hover:text-indigo-800">
								View All →
							</a>
						</div>
						
						{#if topCommanders.length === 0}
							<div class="text-center py-8 text-gray-500">
								<p>No commanders yet</p>
								<a href="/commanders" class="text-indigo-600 hover:text-indigo-800 mt-2 inline-block">
									Add your first commander
								</a>
							</div>
						{:else}
							<div class="space-y-3">
								{#each topCommanders as commander}
									<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
										<div class="flex-1">
											<p class="font-medium text-gray-900">{commander.name}</p>
											<p class="text-sm text-gray-600">
												{commander.total_games} games • {commander.win_rate}% win rate
											</p>
										</div>
										<div class="ml-4">
											<div class="text-2xl">
												{#if commander.win_rate >= 50}
													🏆
												{:else if commander.win_rate >= 25}
													⚔️
												{:else}
													🎲
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
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
