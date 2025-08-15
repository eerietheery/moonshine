
import { renderGrid } from '../shared/view.js';
import { renderPlaylistBrowseGrid } from '../playlist/playlistBrowse.js';
import * as dom from '../../dom.js';
import { state, resetSidebarFilters, updateFilters } from '../shared/state.js';
import { updateSidebarFilters } from '../sidebar/sidebar.js';

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

export function setupGridEvents(list) {
  // Compatibility shim: previous implementation exposed setupGridEvents to
  // wire grid-specific event handlers. The modern grid wiring is handled
  // elsewhere; keep this as a no-op to preserve API compatibility.
  // If a consumer passes a list element, we can ensure basic keyboard
  // accessibility hooks if needed in future.
  return;
}
