<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { auth } from '$stores/auth';
	
	onMount(() => {
		auth.init();
		auth.checkRegistrationConfig();
	});
</script>

<slot />
