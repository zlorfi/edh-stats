// Authentication Check - Validates token with backend and redirects if already authenticated
// Only runs on login.html and register.html pages
(function() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html'
  const authPages = ['login.html', 'register.html']
  
  // Only run on auth pages
  if (!authPages.includes(currentPage)) {
    return
  }

  // Check if token exists in storage
  const token = localStorage.getItem('edh-stats-token') || sessionStorage.getItem('edh-stats-token')
  
  // If no token, user is already logged out, no need to check
  if (!token) {
    return
  }

  // Validate token with backend before redirecting
  validateToken(token)

  async function validateToken(token) {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Token is valid, user is authenticated - redirect to dashboard
        window.location.href = '/dashboard.html'
      } else if (response.status === 401) {
        // Token is invalid or expired, clear storage
        localStorage.removeItem('edh-stats-token')
        sessionStorage.removeItem('edh-stats-token')
        // User stays on login/register page
      } else {
        // Other error, log but don't block user
        console.warn('Token validation failed with status:', response.status)
      }
    } catch (error) {
      // Network error or other issue, log but don't block user
      console.warn('Token validation error:', error)
    }
  }
})()
