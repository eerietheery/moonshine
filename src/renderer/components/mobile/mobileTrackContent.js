/**
 * Mobile Track Content - Track content creation and rendering utilities
 */

import { addLongPressToElement } from './gestures.js';

/**
 * Extract track data from existing track element
 */
export function extractTrackDataFromElement(trackElement) {
  try {
    // Try multiple selectors to find track elements
    const titleElement = trackElement.querySelector('.track-name, .track-title') || 
                        trackElement.querySelector('[data-title]') ||
                        trackElement.querySelector('.title');
    
    const artistElement = trackElement.querySelector('.track-artist .linkish, .track-artist') || 
                         trackElement.querySelector('[data-artist]') ||
                         trackElement.querySelector('.artist');
    
    const albumElement = trackElement.querySelector('.track-album .linkish, .track-album') || 
                        trackElement.querySelector('[data-album]') ||
                        trackElement.querySelector('.album');
    
    const albumArt = trackElement.querySelector('.album-art, img[src*="album"], img[alt*="album"]');
    
    // Log what we found for debugging
    console.log('📱 Extracting track data:', {
      titleElement: titleElement?.textContent,
      artistElement: artistElement?.textContent,
      albumElement: albumElement?.textContent,
      albumArt: albumArt?.src,
      trackElement
    });
    
    return {
      title: titleElement?.textContent || trackElement.dataset.title || 'Unknown Track',
      artist: artistElement?.textContent || trackElement.dataset.artist || 'Unknown Artist',
      album: albumElement?.textContent || trackElement.dataset.album || 'Unknown Album',
      albumArt: albumArt?.src || 'assets/images/default-art.png',
      filePath: trackElement.dataset.filePath || trackElement.__filePath,
      originalElement: trackElement
    };
  } catch (error) {
    console.error('Error extracting track data:', error);
    return null;
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
  
  // Track meta (artist • album) - improved formatting
  const meta = document.createElement('div');
  meta.className = 'track-meta-mobile';
  
  // Create separate spans for better text control and hierarchy
  const artistSpan = document.createElement('span');
  artistSpan.className = 'track-artist-mobile';
  artistSpan.textContent = trackData.artist;
  artistSpan.title = trackData.artist;
  
  const separator = document.createElement('span');
  separator.className = 'separator';
  separator.textContent = '•';
  separator.setAttribute('aria-hidden', 'true'); // Hide from screen readers
  
  const albumSpan = document.createElement('span');
  albumSpan.className = 'track-album-mobile';
  albumSpan.textContent = trackData.album;
  albumSpan.title = trackData.album;
  
  // Smart truncation for very long artist/album names
  if (trackData.artist.length > 20) {
    artistSpan.style.maxWidth = '60%';
  }
  if (trackData.album.length > 25) {
    albumSpan.style.maxWidth = '40%';
  }
  
  meta.appendChild(artistSpan);
  meta.appendChild(separator);
  meta.appendChild(albumSpan);
  
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
