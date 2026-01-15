// Load and inject footer.html into the page
(async function loadFooter() {
  try {
    const response = await fetch('/footer.html');
    if (response.ok) {
      const footerHTML = await response.text();
      // Create a temporary container to parse the HTML
      const temp = document.createElement('div');
      temp.innerHTML = footerHTML;
      // Append the actual footer element (not the temp div)
      const footerElement = temp.querySelector('footer');
      if (footerElement) {
        document.body.appendChild(footerElement);
      }
      
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
