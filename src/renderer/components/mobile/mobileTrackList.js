/**
 * Mobile Track List - Main track list management for mobile view
 */

import { initTrackObserver, setupLazyTrack, cleanupTrackObserver, optimizedTrackUpdate } from './mobileTrackPerformance.js';
import { extractTrackDataFromElement, createMobileTrackContent, renderMobileTrackContent, setTrackAlbumArtBackground } from './mobileTrackContent.js';
import { addLongPressToElement } from './gestures.js';

/**
 * Update track list display for mobile
 */
export function updateMobileTrackList(isMobileView) {
  if (!isMobileView) return;
  
  try {
    const tracks = document.querySelectorAll('.track');
    console.log(`📱 Updating ${tracks.length} tracks for mobile view`);
    
    // Debug: log first few tracks to see their structure
    if (tracks.length > 0) {
      console.log('📱 Sample track structure:', tracks[0]);
      console.log('📱 Track HTML sample:', tracks[0].innerHTML.substring(0, 200));
    }
    
    // Initialize intersection observer for performance
    initTrackObserver();
    
    // Use optimized track update
    optimizedTrackUpdate(tracks, (track, index) => {
      // For performance, only render visible tracks immediately
      // Increase immediate render count for better initial experience
      if (index < 50) { // Render first 50 tracks immediately (up from 20)
        updateMobileTrack(track);
      } else {
        // Set up lazy loading for remaining tracks
        setupLazyTrack(track);
      }
    });
  } catch (error) {
    console.error('Error updating mobile track list:', error);
  }
}

/**
 * Update individual track for mobile display
 */
export function updateMobileTrack(track) {
  if (!track) return;
  
  try {
    // Skip if already converted to mobile
    if (track.classList.contains('mobile-track')) {
      console.log('📱 Track already in mobile format, skipping');
      return;
    }
    
    // IMPORTANT: Extract track data BEFORE clearing innerHTML
    const trackData = track.__track || extractTrackDataFromElement(track);
    if (!trackData) {
      console.warn('📱 Failed to extract track data, skipping track');
      return;
    }
    
    // Even if it's a fallback, proceed to show something
    console.log('📱 Converting track to mobile:', trackData.title, trackData.isFallback ? '(fallback)' : '');
    
    // Store extracted data for future reference
    track.__track = trackData;
    
    // Preserve original onclick handler before modifications
    const originalOnClick = track.onclick;
    
    // Create mobile track structure
    const mobileContent = createMobileTrackContent(trackData);
    
    // Replace track content entirely
    track.innerHTML = '';
    track.appendChild(mobileContent);
    track.classList.add('mobile-track');
    
    // Set album art as CSS background for the mask effect
    setTrackAlbumArtBackground(track, trackData.albumArt);
    
    // Restore click handler for playback (preserve original functionality)
    track.addEventListener('click', (e) => {
      // Prevent triggering if clicking the menu button
      if (e.target.closest('.mobile-track-menu')) return;
      
      e.stopPropagation(); // Prevent event bubbling issues
      
      if (originalOnClick) {
        originalOnClick.call(track, e);
      } else if (trackData.onClick) {
        trackData.onClick(trackData);
      }
    }, { once: false }); // Allow multiple clicks
    
    // Add long press support
    addLongPressToElement(track);
    
  } catch (error) {
    console.error('Error updating mobile track:', error);
    console.log('Track element:', track);
    
    // Create emergency fallback content
    const fallbackContent = document.createElement('div');
    fallbackContent.className = 'track-content track-error';
    fallbackContent.innerHTML = `
      <div class="track-info">
        <div class="track-title-mobile">Track Unavailable</div>
        <div class="track-meta-mobile">Error loading track data</div>
      </div>
    `;
    
    track.innerHTML = '';
    track.appendChild(fallbackContent);
    track.classList.add('mobile-track', 'track-error');
  }
}

/**
 * Restore desktop track list when switching back from mobile
 */
export function restoreDesktopTrackList(autoRender = true) {
  console.log('💻 Restoring desktop track list');
  
  try {
    // Clean up performance optimizations
    cleanupTrackObserver();
    
    // Instead of trying to manually restore track elements, 
    // trigger a complete re-render which will recreate proper event listeners
    const musicList = document.getElementById('music-list');
    if (musicList) {
      // Clear the mobile tracks completely
      const mobileTracks = document.querySelectorAll('.track.mobile-track');
      console.log(`💻 Clearing ${mobileTracks.length} mobile tracks for complete re-render`);
      
      mobileTracks.forEach((track) => {
        try {
          track.classList.remove('mobile-track', 'mobile-track-lazy', 'mobile-track-rendered', 'track-error');
          track.style.removeProperty('--track-album-art');
          delete track.__track;
        } catch (error) {
          console.error('Error cleaning up mobile track:', error);
        }
      });
    }
    
    // Only trigger re-render if requested (to avoid conflicts)
    if (autoRender) {
      dispatchTrackListRefresh();
      console.log('💻 Desktop track list restoration completed - triggered re-render');
    } else {
      console.log('💻 Desktop track list restoration completed - skipped auto-render');
    }
    
  } catch (error) {
    console.error('Error restoring desktop track list:', error);
  }
}

/**
 * Dispatch track list refresh event
 */
function dispatchTrackListRefresh() {
  try {
    // Trigger the main app to re-render the track list
    import('../list/listView.js').then(({ renderList }) => {
      const musicList = document.getElementById('music-list');
      if (musicList) {
        console.log('💻 Triggering complete track list re-render');
        renderList(musicList);
      }
    }).catch(error => {
      console.warn('Could not trigger track list re-render:', error);
      
      // Fallback: dispatch event for other listeners
      const event = new CustomEvent('forceTrackListRefresh');
      document.dispatchEvent(event);
    });
  } catch (error) {
    console.warn('Could not trigger track list refresh:', error);
  }
}
