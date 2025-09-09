/**
 * Mobile UI Controller - Coordinates mobile-specific interface components
 */

import { initLongPressSupport } from './gestures.js';
import { initializeMobileNavigation, handleMobileNavClick, switchMobileView, updateMobileToolbar, restoreDesktopToolbar } from './mobileNavigation.js';
import { initMiniPlayer, syncMiniPlayer, toggleMiniPlayer } from './mobilePlayer.js';
import { updateMobileTrackList, restoreDesktopTrackList } from './mobileTrackList.js';

let isMobileView = false;
let currentMobileView = 'tracks';
let resizeTimeout = null;

/**
 * Initialize mobile UI components
 */
export function initMobile() {
  console.log('🔧 Initializing mobile UI...');
  
  // Check if we're in mobile view
  checkMobileView();
  
  // Set up debounced responsive listeners
  window.addEventListener('resize', debouncedHandleResize);
  
  // Initialize mobile components
  initializeMobileNavigation();
  initMiniPlayer();
  initLongPressSupport();
  
  // Update track list for mobile
  updateMobileTrackList(isMobileView);
  
  console.log('📱 Mobile UI initialized');
}

/**
 * Check current screen size and toggle mobile view
 */
function checkMobileView() {
  const wasMobile = isMobileView;
  isMobileView = window.innerWidth <= 768;
  
  if (isMobileView !== wasMobile) {
    console.log(`📱 Mobile view changed: ${wasMobile} → ${isMobileView}`);
    toggleMobileView(isMobileView);
  }
}

/**
 * Debounced resize handler to prevent rapid firing
 */
function debouncedHandleResize() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    handleResize();
  }, 150); // 150ms debounce
}

/**
 * Handle window resize events
 */
function handleResize() {
  checkMobileView();
}

/**
 * Toggle between mobile and desktop views
 */
function toggleMobileView(mobile) {
  const body = document.body;
  const mobilePlayer = document.getElementById('mobile-mini-player');
  const mobileNav = document.getElementById('mobile-bottom-nav');
  const musicTable = document.getElementById('music-table');
  const musicList = document.getElementById('music-list');
  
  console.log(`📱 Toggling mobile view: ${mobile}`, { musicTable: !!musicTable, musicList: !!musicList });
  
  if (mobile) {
    console.log('📱 Switching to mobile view');
    
    // Add mobile class to body for CSS targeting
    body.classList.add('mobile-view');
    
    // Show mobile elements
    if (mobilePlayer) mobilePlayer.style.display = 'flex';
    if (mobileNav) mobileNav.style.display = 'flex';
    
    // Ensure music table and list are visible
    if (musicTable) {
      musicTable.style.display = 'flex';
      console.log('📱 Music table display set to flex');
    }
    
    // Wait a frame before updating tracks to ensure DOM is ready
    requestAnimationFrame(() => {
      updateMobileTrackList(true);
    });
    if (musicList) {
      musicList.style.display = 'block';
      console.log('📱 Music list display set to block');
    }
    
    // Update toolbar for mobile
    updateMobileToolbar(currentMobileView);
    
    // Update track display
    updateMobileTrackList(true);
    
    // Sync mini player with current track
    syncMiniPlayer();
    
  } else {
    console.log('💻 Switching to desktop view');
    
    // Remove mobile class from body
    body.classList.remove('mobile-view');
    
    // Hide mobile elements
    if (mobilePlayer) mobilePlayer.style.display = 'none';
    if (mobileNav) mobileNav.style.display = 'none';
    
    // Reset music table/list display (let CSS handle it)
    if (musicTable) musicTable.style.removeProperty('display');
    if (musicList) musicList.style.removeProperty('display');
    
    // Restore desktop toolbar
    restoreDesktopToolbar();
    
    // Restore desktop track list
    restoreDesktopTrackList();
  }
}

/**
 * Public API for other modules
 */
export function isMobile() {
  return isMobileView;
}

export function updateMiniPlayerState() {
  syncMiniPlayer();
}

export function refreshMobileTrackList() {
  updateMobileTrackList(isMobileView);
}

export function getMobileView() {
  return currentMobileView;
}

export function setMobileView(view) {
  currentMobileView = view;
  switchMobileView(view);
}

// Global event listeners for player state changes
document.addEventListener('DOMContentLoaded', () => {
  // Listen for track changes
  const audio = document.getElementById('audio');
  if (audio) {
    audio.addEventListener('play', syncMiniPlayer);
    audio.addEventListener('pause', syncMiniPlayer);
    audio.addEventListener('ended', syncMiniPlayer);
  }
  
  // Listen for track changes from other parts of the app
  document.addEventListener('trackChanged', syncMiniPlayer);
  
  // Listen for track list updates to refresh mobile view
  document.addEventListener('tracksLoaded', () => {
    if (isMobileView) {
      console.log('📱 Tracks loaded - refreshing mobile view');
      setTimeout(() => updateMobileTrackList(true), 100); // Small delay to ensure DOM is ready
    }
  });
  
  // Listen for DOM mutations to catch when tracks are added
  const musicList = document.getElementById('music-list');
  if (musicList) {
    const observer = new MutationObserver((mutations) => {
      let tracksAdded = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (let node of mutation.addedNodes) {
            if (node.classList && node.classList.contains('track')) {
              tracksAdded = true;
              break;
            }
          }
        }
      });
      
      if (tracksAdded && isMobileView) {
        console.log('📱 New tracks detected - refreshing mobile view');
        setTimeout(() => updateMobileTrackList(true), 50);
      }
    });
    
    observer.observe(musicList, { childList: true, subtree: true });
  }
});

/**
 * Debug function to check mobile view state
 */
export function debugMobileView() {
  const isMobile = document.body.classList.contains('mobile-view');
  const musicTable = document.getElementById('music-table');
  const musicList = document.getElementById('music-list');
  const mainContent = document.querySelector('.main-content');
  const tracks = document.querySelectorAll('.track');
  
  console.log('🔍 MOBILE DEBUG INFO:');
  console.log(`Window width: ${window.innerWidth}px`);
  console.log(`Is mobile view: ${isMobile}`);
  console.log(`Music table display: ${musicTable ? getComputedStyle(musicTable).display : 'NOT FOUND'}`);
  console.log(`Music table visibility: ${musicTable ? getComputedStyle(musicTable).visibility : 'NOT FOUND'}`);
  console.log(`Music list display: ${musicList ? getComputedStyle(musicList).display : 'NOT FOUND'}`);
  console.log(`Main content display: ${mainContent ? getComputedStyle(mainContent).display : 'NOT FOUND'}`);
  console.log(`Total tracks found: ${tracks.length}`);
  
  if (musicTable) {
    const rect = musicTable.getBoundingClientRect();
    console.log(`Music table dimensions: ${rect.width}x${rect.height}`);
    console.log(`Music table position: top=${rect.top}, left=${rect.left}`);
  }
  
  if (musicList) {
    const trackRows = musicList.querySelectorAll('.track-row, .track');
    console.log(`Track rows found: ${trackRows.length}`);
    
    // Sample a few tracks to see their structure
    tracks.slice(0, 3).forEach((track, i) => {
      console.log(`Track ${i} structure:`, {
        classList: track.classList.toString(),
        innerHTML: track.innerHTML.substring(0, 200) + '...',
        dataset: track.dataset
      });
    });
  }
  
  return { isMobile, musicTable, musicList, tracks: tracks.length };
}

// Make debug function globally accessible for testing
if (typeof window !== 'undefined') {
  window.debugMobileView = debugMobileView;
}
