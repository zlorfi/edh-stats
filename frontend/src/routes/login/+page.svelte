<script>
	import { auth } from '$stores/auth';
	import { goto } from '$app/navigation';
	
	let formData = {
		username: '',
		password: '',
		remember: false
	};
	
	let errors = {};
	let showPassword = false;
	let loading = false;
	let serverError = '';
	
	function validateUsername() {
		if (!formData.username.trim()) {
			errors.username = 'Username is required';
		} else if (formData.username.length < 3) {
			errors.username = 'Username must be at least 3 characters';
		} else {
			errors.username = '';
		}
	}
	
	function validatePassword() {
		if (!formData.password) {
			errors.password = 'Password is required';
		} else if (formData.password.length < 8) {
			errors.password = 'Password must be at least 8 characters';
		} else {
			errors.password = '';
		}
	}
	
	async function handleLogin(e) {
		e.preventDefault();
		
		// Validate form
		validateUsername();
		validatePassword();
		
		if (errors.username || errors.password) {
			return;
		}
		
		loading = true;
		serverError = '';
		
		const result = await auth.login(
			formData.username,
			formData.password,
			formData.remember
		);
		
		if (result.success) {
			goto('/dashboard');
		} else {
			serverError = result.error;
		}
		
		loading = false;
	}
</script>

<svelte:head>
	<title>Login - EDH Stats Tracker</title>
	<meta
		name="description"
		content="Login to track your Magic: The Gathering EDH/Commander games"
	/>
</svelte:head>

<div class="min-h-full flex flex-col py-12 px-4 sm:px-6 lg:px-8">
	<div class="flex items-center justify-center flex-1">
		<div class="max-w-md w-full space-y-8">
			<!-- Header -->
			<div class="text-center">
				<h1 class="text-4xl font-bold font-mtg text-edh-primary mb-2">EDH Stats</h1>
				<h2 class="text-xl text-gray-600">Sign in to your account</h2>
			</div>

			<!-- Login Form -->
			<div class="card">
				<form class="space-y-6" on:submit={handleLogin}>
					<!-- Username Field -->
					<div>
						<label for="username" class="block text-sm font-medium text-gray-700 mb-1">
							Username
						</label>
						<div class="relative">
							<input
								id="username"
								name="username"
								type="text"
								required
								bind:value={formData.username}
								on:input={validateUsername}
								class="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {errors.username
									? 'border-red-500'
									: ''}"
								placeholder="Enter your username"
							/>
							<div
								class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
							>
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									></path>
								</svg>
							</div>
						</div>
						{#if errors.username}
							<p class="mt-1 text-sm text-red-600">{errors.username}</p>
						{/if}
					</div>

					<!-- Password Field -->
					<div>
						<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
							Password
						</label>
						<div class="relative">
							<input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								required
								bind:value={formData.password}
								on:input={validatePassword}
								class="appearance-none block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm {errors.password
									? 'border-red-500'
									: ''}"
								placeholder="Enter your password"
							/>
							<div
								class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
							>
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
									></path>
								</svg>
							</div>
							<button
								type="button"
								on:click={() => (showPassword = !showPassword)}
								class="absolute inset-y-0 right-0 pr-3 flex items-center"
							>
								<svg
									class="h-5 w-5 text-gray-400 hover:text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									{#if showPassword}
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
										></path>
									{:else}
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										></path>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
										></path>
									{/if}
								</svg>
							</button>
						</div>
						{#if errors.password}
							<p class="mt-1 text-sm text-red-600">{errors.password}</p>
						{/if}
					</div>

					<!-- Remember Me -->
					<div class="flex items-center">
						<input
							id="remember"
							name="remember"
							type="checkbox"
							bind:checked={formData.remember}
							class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
						/>
						<label for="remember" class="ml-2 block text-sm text-gray-900">
							Remember me
						</label>
					</div>

					<!-- Server Error -->
					{#if serverError}
						<div class="rounded-md bg-red-50 p-4">
							<div class="flex">
								<div class="flex-shrink-0">
									<svg
										class="h-5 w-5 text-red-400"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
											clip-rule="evenodd"
										></path>
									</svg>
								</div>
								<div class="ml-3">
									<p class="text-sm font-medium text-red-800">{serverError}</p>
								</div>
							</div>
						</div>
					{/if}

					<!-- Submit Button -->
					<div>
						<button
							type="submit"
							disabled={loading}
							class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if loading}
								<div class="loading-spinner w-5 h-5"></div>
							{:else}
								Sign in
							{/if}
						</button>
					</div>
				</form>

				<!-- Links -->
				<div class="mt-6 text-center space-y-2">
					<p class="text-sm text-gray-600">
						Don't have an account?
						<a href="/register" class="font-medium text-indigo-600 hover:text-indigo-500">
							Sign up
						</a>
					</p>
					<p class="text-sm text-gray-600">
						<a href="/" class="font-medium text-indigo-600 hover:text-indigo-500">
							← Back to Home
						</a>
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
