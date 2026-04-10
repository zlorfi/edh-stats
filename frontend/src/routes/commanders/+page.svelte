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
			const response = await authenticatedFetch('/api/commanders');
			if (response.ok) {
				const data = await response.json();
				commanders = data.commanders || [];
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
				const data = await response.json();
				commanders = [...commanders, data.commander];
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
	
	function getColorBadges(colors) {
		if (!colors || colors.length === 0) return 'Colorless';
		
		// Handle both string and array formats
		const colorArray = typeof colors === 'string' ? colors.split('') : colors;
		
		return colorArray.map((c) => {
			const color = mtgColors.find((mc) => mc.id === c);
			return color ? color.name : c;
		}).join(', ');
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
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each commanders as commander}
						<div class="card hover:shadow-lg transition-shadow">
							<h3 class="text-lg font-bold text-gray-900 mb-2">{commander.name}</h3>
							<p class="text-sm text-gray-600">{getColorBadges(commander.colors)}</p>
						</div>
					{/each}
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
