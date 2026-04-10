<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth, isAuthenticated } from '$stores/auth';
	
	let loading = true;
	
	onMount(() => {
		const unsubscribe = auth.subscribe(($auth) => {
			loading = $auth.loading;
			
			if (!$auth.loading && !$auth.token) {
				// Not authenticated, redirect to login
				goto('/login');
			}
		});
		
		return unsubscribe;
	});
</script>

{#if loading}
	<div class="flex items-center justify-center min-h-screen">
		<div class="loading-spinner w-12 h-12"></div>
	</div>
{:else if $isAuthenticated}
	<slot />
{/if}
