const { scanMusic } = require('./renderer_components/music');
const { initializeUI } = require('./renderer_components/ui');

// Expose scanMusic to the global scope for the HTML onclick attribute
window.scanMusic = scanMusic;

// Set up UI event listeners and initial render
initializeUI();