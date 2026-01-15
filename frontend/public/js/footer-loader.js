// Load and inject footer.html into the page
(async function loadFooter() {
  try {
    const response = await fetch('/footer.html');
    if (response.ok) {
      const footerHTML = await response.text();
      const footer = document.createElement('div');
      footer.innerHTML = footerHTML;
      document.body.appendChild(footer);
      
      // Load and display version in footer after it's been injected
      loadVersion();
    }
  } catch (error) {
    console.debug('Footer not available');
  }
})();

// Load and display version in footer
async function loadVersion() {
  try {
    const response = await fetch('/version.txt');
    if (response.ok) {
      const version = await response.text();
      const versionEl = document.getElementById('version-footer');
      if (versionEl) {
        versionEl.textContent = `v${version.trim()}`;
      }
    }
  } catch (error) {
    console.debug('Version file not available');
  }
}
