/**
 * Reactive Mobile State - DISABLED TO PREVENT CONFLICTS
 * This file is temporarily disabled to prevent conflicts with the main mobile UI system.
 * TODO: Implement proper reactive state system when the app is stable.
 */

// DISABLED: Commenting out all functionality to prevent import errors and conflicts

/*
import { state, derived, debounced } from '../shared/reactiveState.js';

// === CORE REACTIVE STATE ===

// Viewport state - automatically updated on resize
export const viewport = state({
  width: window.innerWidth,
  height: window.innerHeight
});

// Current view state
export const currentView = state('tracks');

// Track data state
export const trackData = state([]);

// === DERIVED REACTIVE STATE ===

// Automatically determines if we're in mobile view
export const isMobile = derived(viewport, v => v.width <= 768);

// Combined mobile state - automatically recalculates when dependencies change
export const mobileState = derived([isMobile, currentView], ([mobile, view]) => ({
  isMobile: mobile,
  view: mobile ? view : 'desktop',
  showSidebar: !mobile,
  showMobileNav: mobile,
  showMiniPlayer: mobile,
  showDesktopHeader: !mobile
}));

// Mobile track state - automatically converts tracks when in mobile view
export const mobileTrackState = derived([trackData, isMobile], ([tracks, mobile]) => ({
  tracks: tracks,
  isMobile: mobile,
  needsConversion: mobile && tracks.length > 0
}));

// === REACTIVE ACTIONS ===

// Update viewport (called on window resize)
export const updateViewport = debounced(() => {
  viewport.set({
    width: window.innerWidth,
    height: window.innerHeight
  });
}, 150);

// Switch mobile view
export function switchView(newView) {
  currentView.set(newView);
}

// Update track data
export function setTracks(tracks) {
  trackData.set(tracks);
}

// === AUTO-SETUP ===

// Automatically handle window resize
window.addEventListener('resize', updateViewport);

// Auto-update viewport on page load
document.addEventListener('DOMContentLoaded', updateViewport);

console.log('🔧 Reactive mobile state initialized');
*/

console.log('⚠️  Reactive mobile state is disabled to prevent conflicts');

// Export empty functions to prevent import errors
export const viewport = null;
export const currentView = null;
export const trackData = null;
export const isMobile = null;
export const mobileState = null;
export const mobileTrackState = null;
export const updateViewport = () => console.log('updateViewport disabled');
export function switchView() { console.log('switchView disabled'); }
export function setTracks() { console.log('setTracks disabled'); }
