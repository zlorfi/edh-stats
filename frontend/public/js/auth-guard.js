// Authentication Guard - Checks for valid token on page load and redirects to login if needed
(function() {
  // Check if we're on a protected page (not login/register/index/status)
  const unprotectedPages = ['login.html', 'register.html', 'index.html', 'status.html']
  const currentPage = window.location.pathname.split('/').pop() || 'index.html'
  
  if (!unprotectedPages.includes(currentPage)) {
    // This is a protected page, check for valid token
    const token = localStorage.getItem('edh-stats-token') || sessionStorage.getItem('edh-stats-token')
    
    if (!token) {
      // No token, redirect to login
      window.location.href = '/login.html'
    }
  }

  // Override global fetch to handle 401 responses
  const originalFetch = window.fetch
  window.fetch = function(...args) {
    return originalFetch.apply(this, args)
      .then(response => {
        if (response.status === 401) {
          // Unauthorized - clear tokens and redirect to login
          localStorage.removeItem('edh-stats-token')
          sessionStorage.removeItem('edh-stats-token')
          window.location.href = '/login.html'
          // Throw error to prevent further processing
          throw new Error('Authentication required - redirecting to login')
        }
        return response
      })
      .catch(error => {
        // Re-throw unless it's our auth error
        if (error.message !== 'Authentication required - redirecting to login') {
          throw error
        }
      })
  }
})()
