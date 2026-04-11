<script>
	import { auth } from '$stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	
	let formData = {
		username: '',
		email: '',
		password: '',
		confirmPassword: '',
		terms: false
	};
	
	let errors = {};
	let showPassword = false;
	let showConfirmPassword = false;
	let loading = false;
	let serverError = '';
	let successMessage = '';
	let allowRegistration = true;
	
	onMount(async () => {
		await auth.checkRegistrationConfig();
		auth.subscribe(($auth) => {
			allowRegistration = $auth.allowRegistration;
		});
	});
	
	function validateUsername() {
		if (!formData.username.trim()) {
			errors.username = 'Username is required';
		} else if (formData.username.length < 3) {
			errors.username = 'Username must be at least 3 characters';
		} else if (formData.username.length > 50) {
			errors.username = 'Username must be less than 50 characters';
		} else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
			errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
		} else {
			errors.username = '';
		}
	}
	
	function validateEmail() {
		if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errors.email = 'Please enter a valid email address';
		} else {
			errors.email = '';
		}
	}
	
	function validatePassword() {
		if (!formData.password) {
			errors.password = 'Password is required';
		} else if (formData.password.length < 8) {
			errors.password = 'Password must be at least 8 characters';
		} else if (formData.password.length > 100) {
			errors.password = 'Password must be less than 100 characters';
		} else if (!/(?=.*[a-z])/.test(formData.password)) {
			errors.password = 'Password must contain at least one lowercase letter';
		} else if (!/(?=.*[A-Z])/.test(formData.password)) {
			errors.password = 'Password must contain at least one uppercase letter';
		} else if (!/(?=.*\d)/.test(formData.password)) {
			errors.password = 'Password must contain at least one number';
		} else {
			errors.password = '';
		}
	}
	
	function validateConfirmPassword() {
		if (!formData.confirmPassword) {
			errors.confirmPassword = 'Please confirm your password';
		} else if (formData.password !== formData.confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
		} else {
			errors.confirmPassword = '';
		}
	}
	
	function validateTerms() {
		if (!formData.terms) {
			errors.terms = 'You must agree to the Terms of Service';
		} else {
			errors.terms = '';
		}
	}
	
	async function handleRegister(e) {
		e.preventDefault();
		
		// Validate all fields
		validateUsername();
		validateEmail();
		validatePassword();
		validateConfirmPassword();
		validateTerms();
		
		if (Object.values(errors).some((error) => error)) {
			return;
		}
		
		loading = true;
		serverError = '';
		
		const result = await auth.register(formData.username, formData.email, formData.password);
		
		if (result.success) {
			successMessage = 'Account created successfully! Redirecting...';
			setTimeout(() => {
				goto('/dashboard');
			}, 1000);
		} else {
			serverError = result.error;
		}
		
		loading = false;
	}
</script>

<svelte:head>
	<title>Register - EDH Stats Tracker</title>
	<meta
		name="description"
		content="Create an account to track your Magic: The Gathering EDH/Commander games"
	/>
</svelte:head>

<div class="min-h-full flex flex-col py-12 px-4 sm:px-6 lg:px-8">
	<div class="flex items-center justify-center flex-1">
		<div class="max-w-md w-full space-y-8">
			<!-- Header -->
			<div class="text-center">
				<h1 class="text-4xl font-bold font-mtg text-edh-primary mb-2">EDH Stats</h1>
				<h2 class="text-xl text-gray-600">Create your account</h2>
			</div>

			{#if !allowRegistration}
				<div class="card">
					<div class="text-center py-8">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
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
						<h3 class="mt-2 text-lg font-medium text-gray-900">Registration Closed</h3>
						<p class="mt-1 text-sm text-gray-500">
							New user registration is currently disabled.
						</p>
						<div class="mt-6">
							<a href="/login" class="btn btn-primary"> Go to Login </a>
						</div>
					</div>
				</div>
			{:else}
				<!-- Registration Form -->
				<div class="card">
					<form class="space-y-6" on:submit={handleRegister}>
						<!-- Username -->
						<div>
							<label for="username" class="block text-sm font-medium text-gray-700 mb-1">
								Username *
							</label>
							<input
								id="username"
								type="text"
								required
								bind:value={formData.username}
								on:input={validateUsername}
								class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 {errors.username
									? 'border-red-500'
									: ''}"
								placeholder="Choose a username"
							/>
							{#if errors.username}
								<p class="mt-1 text-sm text-red-600">{errors.username}</p>
							{/if}
						</div>

						<!-- Email (Optional) -->
						<div>
							<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
								Email (optional)
							</label>
							<input
								id="email"
								type="email"
								bind:value={formData.email}
								on:input={validateEmail}
								class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 {errors.email
									? 'border-red-500'
									: ''}"
								placeholder="your.email@example.com"
							/>
							{#if errors.email}
								<p class="mt-1 text-sm text-red-600">{errors.email}</p>
							{/if}
						</div>

						<!-- Password -->
						<div>
							<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
								Password *
							</label>
							<div class="relative">
								<input
									id="password"
									type={showPassword ? 'text' : 'password'}
									required
									bind:value={formData.password}
									on:input={validatePassword}
									class="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 {errors.password
										? 'border-red-500'
										: ''}"
									placeholder="Create a strong password"
								/>
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

						<!-- Confirm Password -->
						<div>
							<label
								for="confirmPassword"
								class="block text-sm font-medium text-gray-700 mb-1"
							>
								Confirm Password *
							</label>
							<div class="relative">
								<input
									id="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									required
									bind:value={formData.confirmPassword}
									on:input={validateConfirmPassword}
									class="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 {errors.confirmPassword
										? 'border-red-500'
										: ''}"
									placeholder="Confirm your password"
								/>
								<button
									type="button"
									on:click={() => (showConfirmPassword = !showConfirmPassword)}
									class="absolute inset-y-0 right-0 pr-3 flex items-center"
								>
									<svg
										class="h-5 w-5 text-gray-400 hover:text-gray-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										{#if showConfirmPassword}
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
							{#if errors.confirmPassword}
								<p class="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
							{/if}
						</div>

						<!-- Terms -->
						<div>
							<div class="flex items-start">
								<input
									id="terms"
									type="checkbox"
									bind:checked={formData.terms}
									on:change={validateTerms}
									class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mt-1"
								/>
								<label for="terms" class="ml-2 block text-sm text-gray-900">
									I agree to the Terms of Service and Privacy Policy
								</label>
							</div>
							{#if errors.terms}
								<p class="mt-1 text-sm text-red-600">{errors.terms}</p>
							{/if}
						</div>

						<!-- Success Message -->
						{#if successMessage}
							<div class="rounded-md bg-green-50 p-4">
								<p class="text-sm font-medium text-green-800">{successMessage}</p>
							</div>
						{/if}

						<!-- Server Error -->
						{#if serverError}
							<div class="rounded-md bg-red-50 p-4">
								<p class="text-sm font-medium text-red-800">{serverError}</p>
							</div>
						{/if}

						<!-- Submit -->
						<button
							type="submit"
							disabled={loading}
							class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
						>
							{#if loading}
								<div class="loading-spinner w-5 h-5"></div>
							{:else}
								Create Account
							{/if}
						</button>
					</form>

					<!-- Links -->
					<div class="mt-6 text-center space-y-2">
						<p class="text-sm text-gray-600">
							Already have an account?
							<a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
								Sign in
							</a>
						</p>
						<p class="text-sm text-gray-600">
							<a href="/" class="font-medium text-indigo-600 hover:text-indigo-500">
								← Back to Home
							</a>
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
