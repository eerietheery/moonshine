/**
 * Reactive Mobile UI Controller - Proof of Concept
 * Demonstrates how reactive state simplifies mobile UI management
 */

import { mobileState, mobileTrackState, isMobile, switchView, setTracks } from './reactiveMobileState.js';
import { updateMobileTrackList, restoreDesktopTrackList } from './mobileTrackList.js';
import { initializeMobileNavigation, updateMobileToolbar, restoreDesktopToolbar } from './mobileNavigation.js';
import { initMiniPlayer, syncMiniPlayer } from './mobilePlayer.js';
import { initLongPressSupport } from './gestures.js';

let isInitialized = false;

/**
 * Initialize reactive mobile UI system
 */
export function initReactiveMobile() {
  if (isInitialized) return;
  
  console.log('🚀 Initializing reactive mobile UI...');
  
  // Initialize mobile components once
  initializeMobileNavigation();
  initMiniPlayer();
  initLongPressSupport();
  
  // === REACTIVE SUBSCRIPTIONS ===
  
  // Subscribe to mobile state changes - automatically handles mobile/desktop switching
  mobileState.subscribe(state => {
    console.log('📱 Mobile state changed:', state);
    handleMobileStateChange(state);
  });
  
  // Subscribe to track state changes - automatically handles track list updates
  mobileTrackState.subscribe(state => {
    console.log('📱 Track state changed:', { 
      trackCount: state.tracks.length, 
      isMobile: state.isMobile,
      needsConversion: state.needsConversion 
    });
    
    if (state.needsConversion) {
      // Automatically update mobile track list when needed
      requestAnimationFrame(() => {
        updateMobileTrackList(true);
      });
    }
  });
  
  // Subscribe to mobile detection changes for debugging
  isMobile.subscribe(mobile => {
    console.log(`📱 Mobile detection changed: ${mobile} (${window.innerWidth}px)`);
  });
  
  // Auto-detect existing tracks on initialization
  detectExistingTracks();
  
  isInitialized = true;
  console.log('✅ Reactive mobile UI initialized');
}

/**
 * Handle mobile state changes reactively
 */
function handleMobileStateChange(state) {
  const body = document.body;
  const mobilePlayer = document.getElementById('mobile-mini-player');
  const mobileNav = document.getElementById('mobile-bottom-nav');
  const musicTable = document.getElementById('music-table');
  const musicList = document.getElementById('music-list');
  
  if (state.isMobile) {
    // === MOBILE MODE ===
    console.log('📱 Switching to mobile view (reactive)');
    
    // Add mobile class
    body.classList.add('mobile-view');
    
    // Show/hide mobile elements
    if (mobilePlayer) mobilePlayer.style.display = state.showMiniPlayer ? 'flex' : 'none';
    if (mobileNav) mobileNav.style.display = state.showMobileNav ? 'flex' : 'none';
    
    // Update table display
    if (musicTable) musicTable.style.display = 'flex';
    if (musicList) musicList.style.display = 'block';
    
    // Update toolbar
    updateMobileToolbar(state.view);
    
    // Sync mini player
    syncMiniPlayer();
    
  } else {
    // === DESKTOP MODE ===
    console.log('💻 Switching to desktop view (reactive)');
    
    // Remove mobile class
    body.classList.remove('mobile-view');
    
    // Hide mobile elements
    if (mobilePlayer) mobilePlayer.style.display = 'none';
    if (mobileNav) mobileNav.style.display = 'none';
    
    // Reset table display
    if (musicTable) musicTable.style.removeProperty('display');
    if (musicList) musicList.style.removeProperty('display');
    
    // Restore desktop toolbar
    restoreDesktopToolbar();
    
    // Restore desktop track list
    restoreDesktopTrackList();
  }
}

/**
 * Auto-detect existing tracks and update reactive state
 */
function detectExistingTracks() {
  const tracks = document.querySelectorAll('.track');
  if (tracks.length > 0) {
    console.log(`📱 Auto-detected ${tracks.length} existing tracks`);
    setTracks(Array.from(tracks));
  }
  
  // Set up mutation observer to detect new tracks
  const musicList = document.getElementById('music-list');
  if (musicList) {
    const observer = new MutationObserver((mutations) => {
      let tracksChanged = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.classList && node.classList.contains('track')) {
              tracksChanged = true;
            }
          });
        }
      });
      
      if (tracksChanged) {
        const newTracks = document.querySelectorAll('.track');
        console.log(`📱 Tracks updated: ${newTracks.length} tracks detected`);
        setTracks(Array.from(newTracks));
      }
    });
    
    observer.observe(musicList, { childList: true, subtree: true });
  }
}

/**
 * Public API for manual control
 */
export function switchMobileView(view) {
  switchView(view);
}

export function refreshTracks() {
  detectExistingTracks();
}

export function getCurrentMobileState() {
  return mobileState.get();
}

export function getIsMobile() {
  return isMobile.get();
}

// Debug function
export function debugReactiveState() {
  console.log('🔍 REACTIVE STATE DEBUG:');
  console.log('Mobile state:', mobileState.get());
  console.log('Is mobile:', isMobile.get());
  console.log('Track state:', mobileTrackState.get());
  console.log('Current view:', currentView.get());
}
