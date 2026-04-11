import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

// Auth token management
function createAuthStore() {
	const { subscribe, set, update } = writable({
		token: null,
		user: null,
		loading: true,
		allowRegistration: true
	});

	return {
		subscribe,
		
		/**
		 * Initialize auth store - load token from storage
		 */
		init: async () => {
			if (!browser) return;
			
			const token = localStorage.getItem('edh-stats-token') || 
			              sessionStorage.getItem('edh-stats-token');
			
			if (token) {
				try {
					// Verify token with backend
					const response = await fetch('/api/auth/me', {
						headers: {
							'Authorization': `Bearer ${token}`
						}
					});
					
					if (response.ok) {
						const data = await response.json();
						update(state => ({ ...state, token, user: data.user, loading: false }));
					} else {
						// Invalid token
						localStorage.removeItem('edh-stats-token');
						sessionStorage.removeItem('edh-stats-token');
						update(state => ({ ...state, token: null, user: null, loading: false }));
					}
				} catch (error) {
					console.error('Auth init error:', error);
					update(state => ({ ...state, loading: false }));
				}
			} else {
				update(state => ({ ...state, loading: false }));
			}
		},
		
		/**
		 * Login with username and password
		 */
		login: async (username, password, remember = false) => {
			try {
				const response = await fetch('/api/auth/login', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ username, password, remember })
				});
				
				const data = await response.json();
				
				if (response.ok) {
					// Store token
					if (remember) {
						localStorage.setItem('edh-stats-token', data.token);
					} else {
						sessionStorage.setItem('edh-stats-token', data.token);
					}
					
					update(state => ({ 
						...state, 
						token: data.token, 
						user: data.user 
					}));
					
					return { success: true };
				} else {
					return { 
						success: false, 
						error: data.message || 'Login failed' 
					};
				}
			} catch (error) {
				console.error('Login error:', error);
				return { 
					success: false, 
					error: 'Network error. Please try again.' 
				};
			}
		},
		
		/**
		 * Register a new user
		 */
		register: async (username, email, password) => {
			try {
				const response = await fetch('/api/auth/register', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ 
						username, 
						email: email || undefined, 
						password 
					})
				});
				
				const data = await response.json();
				
				if (response.ok) {
					// Store token
					localStorage.setItem('edh-stats-token', data.token);
					
					update(state => ({ 
						...state, 
						token: data.token, 
						user: data.user 
					}));
					
					return { success: true };
				} else {
					let errorMessage = data.message || 'Registration failed';
					if (data.details && Array.isArray(data.details)) {
						errorMessage = data.details.join(', ');
					}
					return { 
						success: false, 
						error: errorMessage 
					};
				}
			} catch (error) {
				console.error('Registration error:', error);
				return { 
					success: false, 
					error: 'Network error. Please try again.' 
				};
			}
		},
		
		/**
		 * Logout user
		 */
		logout: () => {
			if (browser) {
				localStorage.removeItem('edh-stats-token');
				sessionStorage.removeItem('edh-stats-token');
			}
			set({ token: null, user: null, loading: false, allowRegistration: true });
			goto('/login');
		},
		
		/**
		 * Update the current user data in the store
		 */
		updateUser: (user) => {
			update(state => ({ ...state, user }));
		},

		/**
		 * Check registration config
		 */
		checkRegistrationConfig: async () => {
			try {
				const response = await fetch('/api/auth/config');
				if (response.ok) {
					const data = await response.json();
					update(state => ({ ...state, allowRegistration: data.allowRegistration }));
				}
			} catch (error) {
				console.error('Failed to check registration config:', error);
			}
		}
	};
}

export const auth = createAuthStore();

// Derived store for authentication status
export const isAuthenticated = derived(
	auth,
	$auth => !!$auth.token && !!$auth.user
);

// Derived store for current user
export const currentUser = derived(
	auth,
	$auth => $auth.user
);

/**
 * Get auth token from storage
 */
export function getAuthToken() {
	if (!browser) return null;
	return localStorage.getItem('edh-stats-token') || 
	       sessionStorage.getItem('edh-stats-token');
}

/**
 * Authenticated fetch wrapper
 */
export async function authenticatedFetch(url, options = {}) {
	const token = getAuthToken();
	
	// Only set Content-Type for requests with a body
	const defaultHeaders = {
		...(options.body && { 'Content-Type': 'application/json' }),
		...(token && { Authorization: `Bearer ${token}` })
	};
	
	const response = await fetch(url, {
		...options,
		headers: {
			...defaultHeaders,
			...options.headers
		}
	});
	
	if (response.status === 401) {
		// Token expired or invalid, clear and redirect
		auth.logout();
		throw new Error('Authentication required');
	}
	
	return response;
}
