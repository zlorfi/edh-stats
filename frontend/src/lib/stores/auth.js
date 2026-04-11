import { writable, derived } from 'svelte/store'
import { browser } from '$app/environment'
import { goto } from '$app/navigation'

const initialState = {
  token: null,
  user: null,
  loading: true,
  allowRegistration: true
}

function createAuthStore() {
  const { subscribe, update } = writable(initialState)

  const markAuthenticated = (user) => {
    update((state) => ({ ...state, token: 'cookie', user }))
  }

  return {
    subscribe,
    init: async () => {
      if (!browser) return

      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-store'
        })

        if (!response.ok) {
          update((state) => ({ ...state, token: null, user: null, loading: false }))
          return
        }

        const data = await response.json()

        if (data.authenticated) {
          update((state) => ({
            ...state,
            token: 'cookie',
            user: data.user,
            loading: false
          }))
        } else {
          update((state) => ({ ...state, token: null, user: null, loading: false }))
        }
      } catch (error) {
        console.error('Auth init error:', error)
        update((state) => ({ ...state, loading: false }))
      }
    },
    login: async (username, password, remember = false) => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password, remember })
        })

        const data = await response.json()

        if (response.ok) {
          markAuthenticated(data.user)
          return { success: true }
        }

        return {
          success: false,
          error: data.message || 'Login failed'
        }
      } catch (error) {
        console.error('Login error:', error)
        return {
          success: false,
          error: 'Network error. Please try again.'
        }
      }
    },
    register: async (username, email, password) => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            email: email || undefined,
            password
          })
        })

        const data = await response.json()

        if (response.ok) {
          markAuthenticated(data.user)
          return { success: true }
        }

        let errorMessage = data.message || 'Registration failed'
        if (data.details && Array.isArray(data.details)) {
          errorMessage = data.details.join(', ')
        }

        return {
          success: false,
          error: errorMessage
        }
      } catch (error) {
        console.error('Registration error:', error)
        return {
          success: false,
          error: 'Network error. Please try again.'
        }
      }
    },
    logout: async () => {
      if (browser) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
          })
        } catch (error) {
          console.error('Logout error:', error)
        }
      }

      update((state) => ({ ...state, token: null, user: null, loading: false }))
      goto('/login')
    },
    updateUser: (user) => {
      update((state) => ({ ...state, user }))
    },
    checkRegistrationConfig: async () => {
      try {
        const response = await fetch('/api/auth/config', {
          credentials: 'include'
        })
        if (response.ok) {
          const data = await response.json()
          update((state) => ({ ...state, allowRegistration: data.allowRegistration }))
        }
      } catch (error) {
        console.error('Failed to check registration config:', error)
      }
    }
  }
}

export const auth = createAuthStore()

export const isAuthenticated = derived(auth, ($auth) => !!$auth.token && !!$auth.user)

export const currentUser = derived(auth, ($auth) => $auth.user)

export async function authenticatedFetch(url, options = {}) {
  const shouldSetJsonHeader =
    options.body !== undefined &&
    (typeof options.body === 'string' || options.body instanceof String)

  const defaultHeaders = {
    ...(shouldSetJsonHeader && { 'Content-Type': 'application/json' })
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  })

  if (response.status === 401) {
    await auth.logout()
    throw new Error('Authentication required')
  }

  return response
}
