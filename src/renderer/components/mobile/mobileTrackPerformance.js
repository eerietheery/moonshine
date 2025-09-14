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
            
            // Stop observing this track once it's rendered
            trackObserver.unobserve(track);
          }).catch(error => {
            console.error('Error rendering mobile track content:', error);
            // Remove the track from observation even if rendering failed
            trackObserver.unobserve(track);
          });
        }
      }
    });
  }, {
    rootMargin: '200px', // Increased to start loading earlier (was 100px)
    threshold: 0.01 // Lowered threshold for more responsive loading (was 0.1)
  });
}

/**
 * Set up track for lazy loading
 */
export async function setupLazyTrack(track) {
  track.classList.add('mobile-track-lazy');
  
  // CRITICAL: Extract and preserve track data BEFORE creating placeholder
  let trackData = track.__track;
  if (!trackData) {
    // Try to extract data from the original track element
    try {
      const { extractTrackDataFromElement } = await import('./mobileTrackContent.js');
      trackData = extractTrackDataFromElement(track);
      if (trackData) {
        track.__track = trackData;
        // Store as data attributes for persistence
        track.dataset.title = trackData.title;
        track.dataset.artist = trackData.artist;
        track.dataset.album = trackData.album;
      }
    } catch (error) {
      console.warn('Failed to extract track data for lazy track:', error);
    }
  }
  
  // Add basic mobile track class and structure placeholder
  track.classList.add('mobile-track');
  
  // Create minimal placeholder content with track info if available
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
  
  if (trackData && trackData.title && trackData.title !== 'Unknown Track') {
    // Show track info while loading
    placeholder.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column;">
        <div style="font-weight: 500; margin-bottom: 4px; color: var(--text-primary);">${trackData.title}</div>
        <div style="font-size: 13px; color: var(--text-muted);">${trackData.artist} • ${trackData.album}</div>
      </div>
      <div style="color: var(--text-muted); font-size: 12px;">Loading...</div>
    `;
  } else {
    placeholder.textContent = 'Loading...';
  }
  
  track.innerHTML = '';
  track.appendChild(placeholder);
  
  // Observe for intersection
  if (trackObserver) {
    trackObserver.observe(track);
    console.log('📱 Added track to lazy loading observer');
  } else {
    console.warn('📱 Track observer not initialized, cannot set up lazy loading');
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
