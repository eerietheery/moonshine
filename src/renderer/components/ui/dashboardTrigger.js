// Dashboard Event Handler - handles triple-click detection on oscilloscope
// Part of the secret audio visualization dashboard system

let clickCount = 0;
let clickTimer = null;

export function setupDashboardTrigger() {
  const oscCanvas = document.getElementById('toolbar-osc');
  console.log('🎯 Dashboard trigger setup:', oscCanvas ? 'Canvas found' : 'Canvas NOT found');
  if (!oscCanvas) return;
  
  // Enable clicking on oscilloscope canvas
  oscCanvas.style.pointerEvents = 'auto';
  oscCanvas.style.cursor = 'pointer';
  
  console.log('🎯 Dashboard trigger attached to oscilloscope canvas');
  oscCanvas.addEventListener('click', handleOscilloscopeClick);
}

function handleOscilloscopeClick(e) {
  console.log('🎯 Oscilloscope clicked! Count:', clickCount + 1);
  clickCount++;
  
  if (clickCount === 1) {
    clickTimer = setTimeout(() => {
      console.log('🎯 Click timer reset');
      clickCount = 0;
    }, 500); // Reset after 500ms
  } else if (clickCount === 3) {
    console.log('🎯 TRIPLE CLICK DETECTED! Loading dashboard...');
    clearTimeout(clickTimer);
    clickCount = 0;
    
    // Lazy load and show dashboard
    import('./dashboardCore.js').then(module => {
      console.log('🎯 Dashboard module loaded, showing dashboard');
      module.showDashboard();
    }).catch(err => {
      console.error('🎯 Failed to load dashboard:', err);
    });
    
    e.preventDefault();
    e.stopPropagation();
  }
}

export function cleanup() {
  const oscCanvas = document.getElementById('toolbar-osc');
  if (oscCanvas) {
    oscCanvas.removeEventListener('click', handleOscilloscopeClick);
  }
  if (clickTimer) {
    clearTimeout(clickTimer);
  }
}