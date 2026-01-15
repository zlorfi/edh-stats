// Footer loader - dynamically loads footer.html partial into pages
document.addEventListener('DOMContentLoaded', () => {
  const existingFooter = document.querySelector('footer');

  // Skip if footer already exists on the page
  if (existingFooter) {
    return;
  }

  // Fetch and insert footer before closing body tag
  fetch('/footer.html')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load footer: ${response.statusText}`);
      }
      return response.text();
    })
    .then((html) => {
      // Create a temporary container for the fetched HTML
      const footerContainer = document.createElement('div');
      footerContainer.innerHTML = html;

      // Append footer to the end of body
      document.body.appendChild(footerContainer.firstElementChild);
    })
    .catch((error) => {
      console.error('Error loading footer:', error);
    });
});
