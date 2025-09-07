/**
 * Mobile Track Performance - Lazy loading and optimization utilities
 */

// Performance optimization: Intersection observer for lazy loading
let trackObserver = null;

/**
 * Initialize intersection observer for mobile track optimization
 */
export function initTrackObserver() {
  if (trackObserver) return;
  
  trackObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const track = entry.target;
        if (!track.classList.contains('mobile-track-rendered')) {
          // Import and call render function
          import('./mobileTrackContent.js').then(module => {
            module.renderMobileTrackContent(track);
            track.classList.add('mobile-track-rendered');
          });
        }
      }
    });
  }, {
    rootMargin: '100px', // Start loading 100px before track enters view
    threshold: 0.1
  });
}

/**
 * Set up track for lazy loading
 */
export function setupLazyTrack(track) {
  track.classList.add('mobile-track-lazy');
  
  // Add basic mobile track class and structure placeholder
  track.classList.add('mobile-track');
  
  // Create minimal placeholder content
  const placeholder = document.createElement('div');
  placeholder.className = 'track-placeholder';
  placeholder.style.cssText = `
    height: 72px;
    background: var(--surface-0);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 16px;
    color: var(--text-muted);
  `;
  placeholder.textContent = 'Loading...';
  
  track.innerHTML = '';
  track.appendChild(placeholder);
  
  // Observe for intersection
  if (trackObserver) {
    trackObserver.observe(track);
  }
}

/**
 * Clean up observer when switching to desktop
 */
export function cleanupTrackObserver() {
  if (trackObserver) {
    trackObserver.disconnect();
    trackObserver = null;
  }
}

/**
 * Optimize track rendering with requestAnimationFrame
 */
export function optimizedTrackUpdate(tracks, updateCallback) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      tracks.forEach((track, index) => {
        try {
          updateCallback(track, index);
        } catch (error) {
          console.error(`Error updating track ${index}:`, error);
        }
      });
      resolve();
    });
  });
}
