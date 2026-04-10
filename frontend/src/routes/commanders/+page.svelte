<script>
	import { onMount } from 'svelte';
	import { authenticatedFetch } from '$stores/auth';
	import NavBar from '$components/NavBar.svelte';
	import ProtectedRoute from '$components/ProtectedRoute.svelte';
	
	let showAddForm = false;
	let commanders = [];
	let loading = false;
	let submitting = false;
	let serverError = '';
	
	let newCommander = {
		name: '',
		colors: []
	};
	
	const mtgColors = [
		{ id: 'W', name: 'White', hex: '#F0E6D2' },
		{ id: 'U', name: 'Blue', hex: '#0E68AB' },
		{ id: 'B', name: 'Black', hex: '#2C2B2D' },
		{ id: 'R', name: 'Red', hex: '#C44536' },
		{ id: 'G', name: 'Green', hex: '#5A7A3B' }
	];
	
	onMount(async () => {
		await loadCommanders();
	});
	
	async function loadCommanders() {
		loading = true;
		try {
			const response = await authenticatedFetch('/api/stats/commanders');
			if (response.ok) {
				const data = await response.json();
				commanders = data.stats || [];
				if (commanders.length > 0) {
					console.log('First commander data:', commanders[0]);
				}
			}
		} catch (error) {
			console.error('Load commanders error:', error);
			serverError = 'Failed to load commanders';
		} finally {
			loading = false;
		}
	}
	
	function toggleColor(colorId) {
		if (newCommander.colors.includes(colorId)) {
			newCommander.colors = newCommander.colors.filter((c) => c !== colorId);
		} else {
			newCommander.colors = [...newCommander.colors, colorId];
		}
	}
	
	async function handleAddCommander(e) {
		e.preventDefault();
		serverError = '';
		
		if (!newCommander.name.trim()) {
			serverError = 'Commander name is required';
			return;
		}
		
		submitting = true;
		try {
			const response = await authenticatedFetch('/api/commanders', {
				method: 'POST',
				body: JSON.stringify({
					name: newCommander.name.trim(),
					colors: newCommander.colors // Send as array, not joined string
				})
			});
			
			if (response.ok) {
				// Reload commanders to get stats
				await loadCommanders();
				resetForm();
				showAddForm = false;
			} else {
				const errorData = await response.json();
				serverError = errorData.message || 'Failed to add commander';
			}
		} catch (error) {
			console.error('Add commander error:', error);
			serverError = 'Network error occurred';
		} finally {
			submitting = false;
		}
	}
	
	function resetForm() {
		newCommander = {
			name: '',
			colors: []
		};
	}
	
	function getColorComponents(colors) {
		if (!colors || colors.length === 0) return [];
		
		// Handle both string and array formats
		const colorArray = typeof colors === 'string' ? colors.split('') : colors;
		
		return colorArray.map((c) => mtgColors.find((mc) => mc.id === c)).filter(Boolean);
	}
	
	function formatDate(dateString) {
		if (!dateString) return 'N/A';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		} catch {
			return 'N/A';
		}
	}
	
	let deleteConfirm = {
		show: false,
		commanderId: null,
		commanderName: '',
		deleting: false
	};
	
	function showDeleteConfirm(commanderId, commanderName) {
		console.log('showDeleteConfirm called with:', { commanderId, commanderName });
		deleteConfirm = {
			show: true,
			commanderId,
			commanderName,
			deleting: false
		};
	}
	
	async function handleDelete() {
		console.log('handleDelete called, commanderId:', deleteConfirm.commanderId);
		deleteConfirm.deleting = true;
		try {
			const url = `/api/commanders/${deleteConfirm.commanderId}`;
			console.log('DELETE request URL:', url);
			const response = await authenticatedFetch(url, {
				method: 'DELETE'
			});
			
			if (response.ok) {
				await loadCommanders();
				deleteConfirm.show = false;
			} else {
				const errorData = await response.json();
				serverError = errorData.message || 'Failed to delete commander';
			}
		} catch (error) {
			console.error('Delete commander error:', error);
			serverError = 'Network error occurred';
		} finally {
			deleteConfirm.deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Commanders - EDH Stats Tracker</title>
	<meta name="description" content="Manage your EDH/Commander decks" />
</svelte:head>

<ProtectedRoute>
	<div class="min-h-screen bg-gray-50">
		<NavBar />
		
		<main class="container mx-auto px-4 py-8">
			<div class="flex justify-between items-center mb-6">
				<h1 class="text-3xl font-bold text-gray-900">Commanders</h1>
				<button
					on:click={() => {
						showAddForm = !showAddForm;
						if (!showAddForm) resetForm();
					}}
					class="btn btn-primary"
				>
					{#if showAddForm}
						Cancel
					{:else}
						Add Commander
					{/if}
				</button>
			</div>
			
			<!-- Add Commander Form -->
			{#if showAddForm}
				<div class="card mb-8">
					<h2 class="text-xl font-bold mb-4">Add New Commander</h2>
					
					<form on:submit={handleAddCommander} class="space-y-4">
						<div>
							<label for="name" class="block text-sm font-medium text-gray-700 mb-1">
								Commander Name *
							</label>
							<input
								id="name"
								type="text"
								bind:value={newCommander.name}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
								placeholder="Enter commander name"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">
								Color Identity
							</label>
							<div class="flex gap-3">
								{#each mtgColors as color}
									<button
										type="button"
										on:click={() => toggleColor(color.id)}
										class="w-12 h-12 rounded-full border-2 transition-all {newCommander.colors.includes(
											color.id
										)
											? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
											: 'border-gray-300 hover:border-gray-400'}"
										style="background-color: {color.hex}"
										title={color.name}
									>
										<span class="sr-only">{color.name}</span>
									</button>
								{/each}
							</div>
							<p class="text-xs text-gray-500 mt-2">
								Leave empty for colorless commanders
							</p>
						</div>
						
						{#if serverError}
							<div class="rounded-md bg-red-50 p-4">
								<p class="text-sm font-medium text-red-800">{serverError}</p>
							</div>
						{/if}
						
						<button
							type="submit"
							disabled={submitting}
							class="btn btn-primary disabled:opacity-50"
						>
							{#if submitting}
								<div class="loading-spinner w-5 h-5 mx-auto"></div>
							{:else}
								Add Commander
							{/if}
						</button>
					</form>
				</div>
			{/if}
			
			<!-- Commanders List -->
			{#if loading}
				<div class="flex items-center justify-center py-12">
					<div class="loading-spinner w-12 h-12"></div>
				</div>
			{:else if commanders.length === 0}
				<div class="card text-center py-12">
					<p class="text-gray-600 mb-4">No commanders yet</p>
					<button on:click={() => (showAddForm = true)} class="btn btn-primary">
						Add Your First Commander
					</button>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each commanders as commander}
						<div class="card hover:shadow-lg transition-shadow">
							<!-- Header with name and actions -->
							<div class="flex items-start justify-between mb-4">
								<h3 class="text-xl font-bold text-gray-900">{commander.name}</h3>
								<div class="flex gap-2">
									<button
										on:click={() => alert('Edit functionality coming soon')}
										class="text-gray-600 hover:text-indigo-600"
										title="Edit commander"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>
									<button
										on:click={() => showDeleteConfirm(commander.commanderId || commander.id, commander.name)}
										class="text-gray-600 hover:text-red-600"
										title="Delete commander"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</div>
							</div>
							
							<!-- Color badges -->
							<div class="flex gap-2 mb-6">
								{#each getColorComponents(commander.colors) as color}
									<div
										class="w-8 h-8 rounded"
										style="background-color: {color.hex}"
										title={color.name}
									></div>
								{:else}
									<span class="text-sm text-gray-500 italic">Colorless</span>
								{/each}
							</div>
							
							<!-- Stats Grid -->
							<div class="grid grid-cols-2 gap-6">
								<div class="text-center">
									<div class="text-3xl font-bold text-gray-900">{commander.totalGames || 0}</div>
									<div class="text-sm text-gray-600 mt-1">Games Played</div>
								</div>
								<div class="text-center">
									<div class="text-3xl font-bold text-gray-900">{Number(commander.winRate || 0).toFixed(1)}%</div>
									<div class="text-sm text-gray-600 mt-1">Win Rate</div>
								</div>
								<div class="text-center">
									<div class="text-3xl font-bold text-gray-900">{Number(commander.avgRounds || 0).toFixed(1)}</div>
									<div class="text-sm text-gray-600 mt-1">Avg Rounds</div>
								</div>
								<div class="text-center">
									<div class="text-sm text-gray-500 mt-2">Added</div>
									<div class="text-sm text-gray-700">{formatDate(commander.createdAt || commander.created_at || commander.lastPlayed)}</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
			
			<!-- Delete Confirmation Modal -->
			{#if deleteConfirm.show}
				<div
					class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
					on:click={() => !deleteConfirm.deleting && (deleteConfirm.show = false)}
					role="dialog"
					aria-modal="true"
				>
					<div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4" on:click|stopPropagation role="document">
						<h3 class="text-lg font-bold text-gray-900 mb-2">Delete Commander</h3>
						<p class="text-gray-600 mb-6">
							Are you sure you want to delete "{deleteConfirm.commanderName}"? This action cannot be undone.
						</p>
						<div class="flex gap-3 justify-end">
							<button
								on:click={() => (deleteConfirm.show = false)}
								disabled={deleteConfirm.deleting}
								class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								on:click={handleDelete}
								disabled={deleteConfirm.deleting}
								class="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
							>
								{#if deleteConfirm.deleting}
									Deleting...
								{:else}
									Delete
								{/if}
							</button>
						</div>
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
