import { renderGrid } from './components/shared/view.js';
import { renderPlaylistBrowseGrid } from './components/playlist/playlistBrowse.js';
import * as dom from './dom.js';
import { state, resetSidebarFilters, updateFilters } from './components/shared/state.js';
import { updateSidebarFilters } from './components/sidebar/sidebar.js';

export function preloadGridView() {
  // No-op with new dynamic grid; keep function for compatibility
}

export function displayGridView() {
  // Reset filters when switching to grid view
  resetSidebarFilters();
  const filterInput = document.getElementById('filter');
  updateFilters(filterInput, state.sidebarFilteringEnabled);
  updateSidebarFilters(filterInput, document.getElementById('artist-list'), document.getElementById('album-list'), () => {}, state.sidebarFilteringEnabled);
  if (state.viewMode === 'playlist' && !state.activePlaylist) {
    renderPlaylistBrowseGrid(dom.list);
  } else {
    renderGrid(dom.list);
  }
  dom.listViewBtn.classList.remove('active');
  dom.gridViewBtn.classList.add('active');
}
