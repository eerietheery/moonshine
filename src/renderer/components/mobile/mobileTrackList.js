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
      if (index < 20) { // Render first 20 tracks immediately
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
    if (!trackData || !trackData.title || trackData.title === 'Unknown Track') {
      console.warn('📱 Failed to extract valid track data, skipping track');
      return;
    }
    
    console.log('📱 Converting track to mobile:', trackData.title);
    
    // Store extracted data for future reference
    track.__track = trackData;
    
    // Create mobile track structure
    const mobileContent = createMobileTrackContent(trackData);
    
    // Replace track content entirely
    track.innerHTML = '';
    track.appendChild(mobileContent);
    track.classList.add('mobile-track');
    
    // Set album art as CSS background for the mask effect
    setTrackAlbumArtBackground(track, trackData.albumArt);
    
    // Add click handler for playback (preserve original functionality)
    const originalOnClick = track.onclick;
    track.addEventListener('click', (e) => {
      // Prevent triggering if clicking the menu button
      if (e.target.closest('.mobile-track-menu')) return;
      
      if (originalOnClick) {
        originalOnClick.call(track, e);
      } else if (trackData.onClick) {
        trackData.onClick(trackData);
      }
    });
    
    // Add long press support
    addLongPressToElement(track);
    
  } catch (error) {
    console.error('Error updating mobile track:', error);
    console.log('Track element:', track);
  }
}

/**
 * Restore desktop track list when switching back from mobile
 */
export function restoreDesktopTrackList() {
  console.log('💻 Restoring desktop track list');
  
  try {
    // Clean up performance optimizations
    cleanupTrackObserver();
    
    // Get all mobile tracks and restore them to desktop format
    const mobileTracks = document.querySelectorAll('.track.mobile-track');
    
    mobileTracks.forEach(track => {
      track.classList.remove('mobile-track', 'mobile-track-lazy', 'mobile-track-rendered');
      
      // Remove mobile-specific styling
      track.style.removeProperty('--track-album-art');
      
      // Remove mobile-specific event listeners by cloning the element
      const newTrack = track.cloneNode(false);
      newTrack.className = track.className;
      
      // Copy data attributes
      if (track.dataset.filePath) {
        newTrack.dataset.filePath = track.dataset.filePath;
      }
      if (track.__filePath) {
        newTrack.__filePath = track.__filePath;
      }
      
      track.parentNode.replaceChild(newTrack, track);
    });
    
    // Force re-render of the track list to restore desktop layout
    dispatchTrackListRefresh();
    
  } catch (error) {
    console.error('Error restoring desktop track list:', error);
  }
}

/**
 * Dispatch track list refresh event
 */
function dispatchTrackListRefresh() {
  try {
    const event = new CustomEvent('forceTrackListRefresh');
    document.dispatchEvent(event);
  } catch (error) {
    console.warn('Could not trigger track list refresh:', error);
  }
}
