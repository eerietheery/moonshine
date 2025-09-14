/**
 * Mobile Track Content - Track content creation and rendering utilities
 */

import { addLongPressToElement } from './gestures.js';

/**
 * Extract track data from existing track element
 */
export function extractTrackDataFromElement(trackElement) {
  try {
    // Priority 1: Use cached track data if available and valid
    if (trackElement.__track && trackElement.__track.title && trackElement.__track.title !== 'Unknown Track') {
      console.log('📱 Using cached track data:', trackElement.__track.title);
      return trackElement.__track;
    }
    
    // Priority 2: Check data attributes (set during track creation)
    if (trackElement.dataset.title && trackElement.dataset.title !== 'Unknown Track') {
      const trackData = {
        title: trackElement.dataset.title,
        artist: trackElement.dataset.artist || 'Unknown Artist',
        album: trackElement.dataset.album || 'Unknown Album',
        year: trackElement.dataset.year || '',
        genre: trackElement.dataset.genre || '',
        albumArt: trackElement.dataset.albumArt || 'assets/images/default-art.png',
        filePath: trackElement.dataset.filePath || trackElement.__filePath,
        favorite: trackElement.dataset.favorite === 'true',
        originalElement: trackElement,
        isFallback: false
      };
      
      // Cache for future use
      trackElement.__track = trackData;
      console.log('📱 Extracted track data from attributes:', trackData.title);
      return trackData;
    }
    
    // Store original HTML before any modifications for fallback
    if (!trackElement.__originalHTML) {
      trackElement.__originalHTML = trackElement.innerHTML;
    }
    
    // Priority 3: DOM extraction strategies (as before)
    let title = null;
    let artist = null;
    let album = null;
    
    // Strategy 1: Check cached data attributes first
    if (trackElement.dataset.title) {
      title = trackElement.dataset.title;
      artist = trackElement.dataset.artist || 'Unknown Artist';
      album = trackElement.dataset.album || 'Unknown Album';
    }
    
    // Strategy 2: Try DOM selectors if no cached data
    if (!title) {
      const titleElement = trackElement.querySelector('.track-title .track-name') || 
                          trackElement.querySelector('.track-name') ||
                          trackElement.querySelector('[data-title]') ||
                          trackElement.querySelector('.track-title');
      
      const artistElement = trackElement.querySelector('.track-artist .linkish[data-artist]') || 
                           trackElement.querySelector('.track-artist') ||
                           trackElement.querySelector('[data-artist]');
      
      const albumElement = trackElement.querySelector('.track-album .linkish[data-album]') || 
                          trackElement.querySelector('.track-album') ||
                          trackElement.querySelector('[data-album]');
      
      // Extract text content with proper trimming
      title = titleElement?.textContent?.trim() || titleElement?.title?.trim();
      artist = artistElement?.textContent?.trim() || artistElement?.title?.trim();
      album = albumElement?.textContent?.trim() || albumElement?.title?.trim();
    }
    
    // Strategy 3: Fallback to any text content in track
    if (!title) {
      const textContent = trackElement.textContent?.trim();
      if (textContent && textContent.length > 0 && textContent !== 'Loading...') {
        // Try to parse as "Title - Artist" format
        const parts = textContent.split(' - ');
        if (parts.length >= 2) {
          title = parts[0]?.trim();
          artist = parts[1]?.trim();
        } else {
          title = textContent.substring(0, 50); // Use first 50 chars as title
        }
      }
    }
    
    // Final validation - reject if still no meaningful title
    if (!title || title.length === 0 || title === 'Loading...' || title === 'Unknown Track') {
      console.warn('📱 No valid title found for track, using fallback');
      return {
        title: 'Unknown Track',
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        albumArt: 'assets/images/default-art.png',
        filePath: trackElement.dataset.filePath || trackElement.__filePath,
        originalElement: trackElement,
        isFallback: true
      };
    }
    
    // Find album art
    const albumArt = trackElement.querySelector('.track-title .album-art') ||
                    trackElement.querySelector('.album-art') ||
                    trackElement.querySelector('img[src*="album"]');
    
    const albumArtSrc = albumArt?.src || 'assets/images/default-art.png';
    
    const trackData = {
      title: title || 'Unknown Track',
      artist: artist || 'Unknown Artist', 
      album: album || 'Unknown Album',
      albumArt: albumArtSrc,
      filePath: trackElement.dataset.filePath || trackElement.__filePath,
      originalElement: trackElement,
      isFallback: false
    };
    
    // Cache the data for future use
    trackElement.__track = trackData;
    
    // Enhanced logging for debugging
    console.log('📱 Successfully extracted track data:', {
      title: trackData.title,
      artist: trackData.artist,
      album: trackData.album,
      hasAlbumArt: !!albumArt,
      isFallback: trackData.isFallback
    });
    
    return trackData;
  } catch (error) {
    console.error('Error extracting track data:', error);
    
    // Emergency fallback
    return {
      title: 'Unknown Track',
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      albumArt: 'assets/images/default-art.png',
      filePath: trackElement.dataset.filePath || trackElement.__filePath,
      originalElement: trackElement,
      isFallback: true,
      error: error.message
    };
  }
}

/**
 * Create mobile-optimized track content
 */
export function createMobileTrackContent(trackData) {
  const content = document.createElement('div');
  content.className = 'track-content';
  
  // Album art (small thumbnail)
  const albumArt = document.createElement('img');
  albumArt.className = 'album-art';
  albumArt.src = trackData.albumArt;
  albumArt.alt = 'Album Art';
  albumArt.loading = 'lazy'; // Optimize performance
  albumArt.decoding = 'async'; // Improve scroll performance
  
  // Track info container
  const trackInfo = document.createElement('div');
  trackInfo.className = 'track-info';
  
  // Track title (large) - enhanced typography
  const title = document.createElement('div');
  title.className = 'track-title-mobile';
  title.textContent = trackData.title;
  title.title = trackData.title; // Full title on hover/long press
  
  // Enhanced text handling for better display
  if (trackData.title.length > 35) {
    title.style.fontSize = '16px'; // Slightly smaller for very long titles
  }
  
  // Track meta (artist • album) - simplified as single text string
  const meta = document.createElement('div');
  meta.className = 'track-meta-mobile';
  
  // Create a simple text string instead of complex spans
  const metaText = `${trackData.artist} • ${trackData.album}`;
  meta.textContent = metaText;
  meta.title = metaText; // Full text on hover
  
  trackInfo.appendChild(title);
  trackInfo.appendChild(meta);
  
  // Actions
  const actions = document.createElement('div');
  actions.className = 'track-actions-mobile';
  
  const menuBtn = document.createElement('button');
  menuBtn.className = 'mobile-track-menu';
  menuBtn.innerHTML = '⋮';
  menuBtn.title = 'Track options';
  menuBtn.setAttribute('aria-label', 'Track options');
  
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showMobileTrackMenu(trackData, e);
  });
  
  actions.appendChild(menuBtn);
  
  // Assemble content
  content.appendChild(albumArt);
  content.appendChild(trackInfo);
  content.appendChild(actions);
  
  return content;
}

/**
 * Render mobile track content when it becomes visible
 */
export function renderMobileTrackContent(track) {
  // Get track data
  const trackData = track.__track || extractTrackDataFromElement(track);
  if (!trackData) return;
  
  // Create mobile track structure
  const mobileContent = createMobileTrackContent(trackData);
  
  // Replace placeholder content
  track.innerHTML = '';
  track.appendChild(mobileContent);
  
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
}

/**
 * Set album art as CSS custom property for background mask
 */
export function setTrackAlbumArtBackground(trackElement, albumArtUrl) {
  if (trackElement && albumArtUrl && albumArtUrl !== 'assets/images/default-art.png') {
    trackElement.style.setProperty('--track-album-art', `url('${albumArtUrl}')`);
  }
}

/**
 * Show mobile track menu (context menu)
 */
function showMobileTrackMenu(trackData, event) {
  console.log('📱 Show mobile track menu for:', trackData.title);
  
  // Try to trigger the existing context menu system
  try {
    const originalElement = trackData.originalElement;
    if (originalElement) {
      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY
      });
      originalElement.dispatchEvent(contextMenuEvent);
    } else {
      // Fallback: create a simple mobile menu
      showSimpleMobileMenu(trackData, event);
    }
  } catch (error) {
    console.error('Error showing mobile track menu:', error);
    showSimpleMobileMenu(trackData, event);
  }
}

/**
 * Show a simple mobile menu as fallback
 */
function showSimpleMobileMenu(trackData, event) {
  // TODO: Implement a mobile-optimized context menu
  console.log('📱 TODO: Implement mobile context menu for:', trackData.title);
}
