/**
 * Mobile Views - Handle different mobile view modes (tracks, artists, albums, search)
 */

import { showArtistGrid as renderArtistGrid } from './mobileArtists.js';
import { showAlbumGrid as renderAlbumGrid } from './mobileAlbums.js';
import { showTrackList } from './mobileTracks.js';

// Mobile view container - single source of truth for mobile content
let mobileViewContainer = null;

// Navigation state for back button
let navigationState = {
  previousView: null,
  currentFilter: null
};

/**
 * Get or create the dedicated mobile view container
 */
function getMobileViewContainer() {
  if (!mobileViewContainer || !document.body.contains(mobileViewContainer)) {
    // Remove any existing mobile containers
    const existing = document.querySelectorAll('.mobile-view-container, .mobile-artist-grid-container, .mobile-album-grid-container, .mobile-coming-soon');
    existing.forEach(el => el.remove());
    
    // Create new container (styles provided by CSS class)
    mobileViewContainer = document.createElement('div');
    mobileViewContainer.className = 'mobile-view-container';
    
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.appendChild(mobileViewContainer);
    } else {
      document.body.appendChild(mobileViewContainer);
    }
  }
  
  return mobileViewContainer;
}

/**
 * Clear mobile container and show/hide music table
 */
function resetMobileView(showMusicTable = false) {
  const container = getMobileViewContainer();
  container.innerHTML = ''; // Clear all content
  
  const musicTable = document.getElementById('music-table');
  if (musicTable) {
    // Strong hide/show to avoid other code flipping it back
    if (showMusicTable) {
      musicTable.style.display = 'flex';
      musicTable.style.visibility = 'visible';
      musicTable.style.pointerEvents = 'auto';
      musicTable.removeAttribute('aria-hidden');
    } else {
      musicTable.style.display = 'none';
      musicTable.style.visibility = 'hidden';
      musicTable.style.pointerEvents = 'none';
      musicTable.setAttribute('aria-hidden', 'true');
    }
  }
  
  // Show or hide mobile container
  if (showMusicTable) {
    container.style.display = 'none';
    container.style.pointerEvents = 'none';
    document.body.setAttribute('data-mobile-view', 'tracks');
  } else {
    container.style.display = 'block';
    container.style.pointerEvents = 'auto';
    document.body.setAttribute('data-mobile-view', 'overlay');
  }
}

/**
 * Show all tracks view (default mobile view)
 */
export function showAllTracks() {
  console.log('📱 Showing all tracks view');
  
  // Clear navigation state when showing all tracks
  navigationState.previousView = null;
  navigationState.currentFilter = null;
  // Remove back button if present
  const existingButton = document.querySelector('.mobile-back-button');
  if (existingButton) existingButton.remove();
  
  // Show music table via tracks module and hide mobile container
  resetMobileView(true);
  showTrackList();
}

/**
 * Show filtered tracks with back button
 */
export function showFilteredTracks(filterType, filterValue, fromView) {
  console.log(`📱 Showing filtered tracks: ${filterType} = ${filterValue}`);
  
  // Set navigation state
  navigationState.previousView = fromView;
  navigationState.currentFilter = { type: filterType, value: filterValue };
  
  // Show music table with back button
  resetMobileView(true);
  showTrackList();
  addBackButton();
}

/**
 * Add back button to filtered tracks view
 */
function addBackButton() {
  // Remove existing back button
  const existingButton = document.querySelector('.mobile-back-button');
  if (existingButton) existingButton.remove();
  
  // Create back button
  const backButton = document.createElement('button');
  backButton.className = 'mobile-back-button';
  backButton.setAttribute('aria-label', 'Back');
  backButton.innerHTML = `
    <span style="font-size:18px;line-height:1;">&#8592;</span>
    <span>Back to ${navigationState.previousView === 'artists' ? 'Artists' : 'Albums'}</span>
  `;
  
  // Click handler to go back
  backButton.addEventListener('click', () => {
    goBack();
  });
  
  document.body.appendChild(backButton);
}

/**
 * Go back to previous view
 */
function goBack() {
  const prevView = navigationState.previousView;
  
  // Clear filter state (matches desktop behavior)
  import('../shared/state.js').then(({ state, updateFilters, resetSidebarFilters }) => {
    // Reset all filters
    resetSidebarFilters();
    state.sidebarFilteringEnabled = false;
    
    // Clear text filter
    const filterInput = document.getElementById('filter');
    if (filterInput) filterInput.value = '';
    
    // Update filters to clear them
    updateFilters(filterInput, false);
  });
  
  // Remove back button
  const backButton = document.querySelector('.mobile-back-button');
  if (backButton) backButton.remove();
  
  // Switch to previous view
  import('./mobileNavigation.js').then(({ switchMobileView }) => {
    switchMobileView(prevView);
  });
}

/**
 * Show artists view
 */
export function showArtistsView() {
  console.log('📱 Showing artists view');
  
  // Reset and use mobile container
  resetMobileView(false);
  // Remove back button if present
  const existingButton = document.querySelector('.mobile-back-button');
  if (existingButton) existingButton.remove();
  
  // Show artist grid
  showArtistGrid();
}

/**
 * Show albums view
 */
export function showAlbumsView() {
  console.log('📱 Showing albums view');
  
  // Reset and use mobile container
  resetMobileView(false);
  // Remove back button if present
  const existingButton = document.querySelector('.mobile-back-button');
  if (existingButton) existingButton.remove();
  
  // Show album grid
  showAlbumGrid();
}

/**
 * Show search view
 */
export function showSearchView() {
  console.log('📱 Showing search view');
  
  // Reset and use mobile container
  resetMobileView(false);
  
  // Show coming soon message
  showComingSoonMessage('Enhanced mobile search coming soon!');
}

/**
 * Create and show artist grid with circular thumbnails
 */
function showArtistGrid() {
  const container = getMobileViewContainer();
  renderArtistGrid(container);
}

/**
 * Create and show album grid with rounded square thumbnails
 */
function showAlbumGrid() {
  const container = getMobileViewContainer();
  renderAlbumGrid(container);
}

/**
 * Show a temporary "coming soon" message for unimplemented views
 */
function showComingSoonMessage(message) {
  const container = getMobileViewContainer();
  
  // Create and show message
  const messageDiv = document.createElement('div');
  messageDiv.className = 'mobile-coming-soon';
  messageDiv.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg-color);
    color: var(--text-color);
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    text-align: center;
    font-size: 1.2rem;
    max-width: 80%;
  `;
  messageDiv.textContent = message;
  
  container.appendChild(messageDiv);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 3000);
}
