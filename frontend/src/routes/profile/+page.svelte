<script>
	import { onMount } from 'svelte';
	import { auth, currentUser } from '$stores/auth';
	import { authenticatedFetch } from '$stores/auth';
	import NavBar from '$components/NavBar.svelte';
	import ProtectedRoute from '$components/ProtectedRoute.svelte';
	
	let loading = false;
	let serverError = '';
	let successMessage = '';
	let showPasswordForm = false;
	
	let passwordData = {
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	};
	
	let errors = {};
	
	function validatePasswords() {
		errors = {};
		
		if (!passwordData.currentPassword) {
			errors.currentPassword = 'Current password is required';
		}
		
		if (!passwordData.newPassword) {
			errors.newPassword = 'New password is required';
		} else if (passwordData.newPassword.length < 8) {
			errors.newPassword = 'Password must be at least 8 characters';
		}
		
		if (passwordData.newPassword !== passwordData.confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
		}
		
		return Object.keys(errors).length === 0;
	}
	
	async function handleChangePassword(e) {
		e.preventDefault();
		serverError = '';
		successMessage = '';
		
		if (!validatePasswords()) return;
		
		loading = true;
		try {
			const response = await authenticatedFetch('/api/auth/change-password', {
				method: 'POST',
				body: JSON.stringify({
					currentPassword: passwordData.currentPassword,
					newPassword: passwordData.newPassword
				})
			});
			
			if (response.ok) {
				successMessage = 'Password changed successfully!';
				passwordData = {
					currentPassword: '',
					newPassword: '',
					confirmPassword: ''
				};
				showPasswordForm = false;
			} else {
				const errorData = await response.json();
				serverError = errorData.message || 'Failed to change password';
			}
		} catch (error) {
			console.error('Change password error:', error);
			serverError = 'Network error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Profile - EDH Stats Tracker</title>
	<meta name="description" content="Manage your profile and settings" />
</svelte:head>

<ProtectedRoute>
	<div class="min-h-screen bg-gray-50">
		<NavBar />
		
		<main class="container mx-auto px-4 py-8 max-w-2xl">
			<h1 class="text-3xl font-bold text-gray-900 mb-6">Profile Settings</h1>
			
			<!-- User Info -->
			<div class="card mb-6">
				<h2 class="text-xl font-bold mb-4">Account Information</h2>
				<div class="space-y-3">
					<div>
						<p class="text-sm text-gray-600">Username</p>
						<p class="text-lg font-medium text-gray-900">{$currentUser?.username || 'User'}</p>
					</div>
					{#if $currentUser?.email}
						<div>
							<p class="text-sm text-gray-600">Email</p>
							<p class="text-lg font-medium text-gray-900">{$currentUser.email}</p>
						</div>
					{/if}
				</div>
			</div>
			
			<!-- Change Password -->
			<div class="card">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-xl font-bold">Change Password</h2>
					{#if !showPasswordForm}
						<button on:click={() => (showPasswordForm = true)} class="btn btn-primary btn-sm">
							Change Password
						</button>
					{/if}
				</div>
				
				{#if showPasswordForm}
					<form on:submit={handleChangePassword} class="space-y-4">
						<div>
							<label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-1">
								Current Password
							</label>
							<input
								id="currentPassword"
								type="password"
								bind:value={passwordData.currentPassword}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 {errors.currentPassword
									? 'border-red-500'
									: ''}"
							/>
							{#if errors.currentPassword}
								<p class="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
							{/if}
						</div>
						
						<div>
							<label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">
								New Password
							</label>
							<input
								id="newPassword"
								type="password"
								bind:value={passwordData.newPassword}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 {errors.newPassword
									? 'border-red-500'
									: ''}"
							/>
							{#if errors.newPassword}
								<p class="mt-1 text-sm text-red-600">{errors.newPassword}</p>
							{/if}
						</div>
						
						<div>
							<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
								Confirm New Password
							</label>
							<input
								id="confirmPassword"
								type="password"
								bind:value={passwordData.confirmPassword}
								required
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 {errors.confirmPassword
									? 'border-red-500'
									: ''}"
							/>
							{#if errors.confirmPassword}
								<p class="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
							{/if}
						</div>
						
						{#if successMessage}
							<div class="rounded-md bg-green-50 p-4">
								<p class="text-sm font-medium text-green-800">{successMessage}</p>
							</div>
						{/if}
						
						{#if serverError}
							<div class="rounded-md bg-red-50 p-4">
								<p class="text-sm font-medium text-red-800">{serverError}</p>
							</div>
						{/if}
						
						<div class="flex gap-3">
							<button
								type="submit"
								disabled={loading}
								class="flex-1 btn btn-primary disabled:opacity-50"
							>
								{#if loading}
									<div class="loading-spinner w-5 h-5 mx-auto"></div>
								{:else}
									Update Password
								{/if}
							</button>
							<button
								type="button"
								on:click={() => {
									showPasswordForm = false;
									passwordData = {
										currentPassword: '',
										newPassword: '',
										confirmPassword: ''
									};
									errors = {};
								}}
								class="btn btn-secondary"
							>
								Cancel
							</button>
						</div>
					</form>
				{/if}
			</div>
			
			<!-- Danger Zone -->
			<div class="card mt-6 border-red-200">
				<h2 class="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>
				<p class="text-sm text-gray-600 mb-4">
					Need to delete your account? Contact support or remove your data manually.
				</p>
				<button class="btn btn-danger" disabled>
					Delete Account (Coming Soon)
				</button>
			</div>
		</main>
		
		<!-- Footer -->
		<footer class="bg-white border-t border-gray-200 mt-12">
			<div class="container mx-auto px-4 py-6 text-center text-sm text-gray-600">
				<p>EDH Stats Tracker • Track your Commander games</p>
			</div>
		</footer>
	</div>
</ProtectedRoute>
