/**
 * Mobile Navigation - Bottom navigation and view switching
 */

import { showAllTracks, showArtistsView, showAlbumsView, showSearchView } from './mobileViews.js';

let mobileNavItems = [];
let currentMobileView = 'tracks';

/**
 * Initialize mobile bottom navigation
 */
export function initializeMobileNavigation() {
  mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  
  mobileNavItems.forEach(item => {
    item.addEventListener('click', handleMobileNavClick);
  });
}

/**
 * Handle mobile navigation clicks
 */
export function handleMobileNavClick(event) {
  const button = event.currentTarget;
  const view = button.dataset.view;
  
  if (view && view !== currentMobileView) {
    switchMobileView(view);
  }
}

/**
 * Switch mobile view (tracks, artists, albums, search)
 */
export function switchMobileView(view) {
  console.log(`📱 Switching to mobile view: ${view}`);
  
  // Update active state
  mobileNavItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  
  currentMobileView = view;
  
  // Update toolbar title
  updateMobileToolbar(view);
  
  // Handle view-specific logic
  switch (view) {
    case 'tracks':
      showAllTracks();
      break;
    case 'artists':
      showArtistsView();
      break;
    case 'albums':
      showAlbumsView();
      break;
    case 'search':
      showSearchView();
      break;
  }
}

/**
 * Update mobile toolbar based on current view
 */
export function updateMobileToolbar(view = currentMobileView) {
  const toolbar = document.getElementById('toolbar');
  if (!toolbar) return;
  
  // Update toolbar content for mobile
  const titles = {
    tracks: 'All Tracks',
    artists: 'Artists',
    albums: 'Albums',
    search: 'Search'
  };
  
  const title = titles[view] || 'Moonshine';
  
  // Update or create mobile title
  let titleElement = toolbar.querySelector('.mobile-view-title');
  if (!titleElement) {
    titleElement = document.createElement('div');
    titleElement.className = 'mobile-view-title';
    
    // Don't completely replace toolbar content, just modify it for mobile
    toolbar.style.gridTemplateColumns = '1fr';
    toolbar.style.justifyContent = 'center';
    
    // Hide existing toolbar content but don't remove it
    const existingChildren = toolbar.children;
    for (let child of existingChildren) {
      child.style.display = 'none';
    }
    
    toolbar.appendChild(titleElement);
  }
  
  titleElement.textContent = title;
}

/**
 * Restore desktop toolbar when switching back from mobile
 */
export function restoreDesktopToolbar() {
  const toolbar = document.getElementById('toolbar');
  if (!toolbar) return;
  
  // Remove mobile title element
  const mobileTitle = toolbar.querySelector('.mobile-view-title');
  if (mobileTitle) {
    mobileTitle.remove();
  }
  
  // Restore original toolbar styling
  toolbar.style.removeProperty('grid-template-columns');
  toolbar.style.removeProperty('justify-content');
  
  // Explicitly restore desktop display mode
  toolbar.style.display = 'grid';
  
  // Show hidden toolbar children
  const existingChildren = toolbar.children;
  for (let child of existingChildren) {
    child.style.removeProperty('display');
  }
}

/**
 * Get current mobile view
 */
export function getCurrentMobileView() {
  return currentMobileView;
}

/**
 * Get mobile view title for toolbar
 */
export function getMobileViewTitle(view = currentMobileView) {
  const titles = {
    tracks: 'All Tracks',
    artists: 'Artists',
    albums: 'Albums',
    search: 'Search'
  };
  
  return titles[view] || 'Moonshine';
}
