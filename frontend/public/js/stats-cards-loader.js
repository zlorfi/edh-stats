// Stats cards loader - dynamically loads stats-cards.html partial into pages
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('stats-cards-container');

  // Skip if there's no container element
  if (!container) {
    return;
  }

  // Fetch and insert stats cards
  fetch('/stats-cards.html')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load stats cards: ${response.statusText}`);
      }
      return response.text();
    })
    .then((html) => {
      container.innerHTML = html;
    })
    .catch((error) => {
      console.error('Error loading stats cards:', error);
    });
});
