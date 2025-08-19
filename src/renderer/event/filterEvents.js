import { state, updateFilters, resetSidebarFilters } from '../components/shared/state.js';
import { updateSidebarFilters } from '../components/sidebar/sidebar.js';
import { renderList, renderGrid } from '../components/shared/view.js';
import * as dom from '../dom.js';

export function setupFilterEventListeners() {
  if (dom.filterInput) {
    dom.filterInput.addEventListener('input', () => {
  updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
  // Choose renderer based on current view toggle
  const renderer = dom.gridViewBtn && dom.gridViewBtn.classList.contains('active') ? renderGrid : renderList;
  updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderer(dom.list), state.sidebarFilteringEnabled);
  renderer(dom.list);
    });
  } else {
    console.warn('filterInput not found in DOM');
  }

  const handleFilterClick = (container, type) => {
    container.addEventListener('click', (e) => {
      const item = e.target.closest('.filter-item');
      if (!item || !container.contains(item)) return;
      e.stopPropagation();
      const value = item.dataset.value;
      if (value === 'All') {
        // Selecting All in one list clears both artist and album filters
        state.activeArtist = null;
        state.activeAlbum = null;
      } else if (type === 'artist') {
        state.activeArtist = value;
        // Clear album filter when a new artist is explicitly chosen to avoid lingering album constraint
        state.activeAlbum = null;
      } else if (type === 'album') {
        state.activeAlbum = value;
      }

  // Ensure sidebar filtering is enabled when a filter item is clicked
  if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true;

  updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
  const renderer = dom.gridViewBtn && dom.gridViewBtn.classList.contains('active') ? renderGrid : renderList;
  updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderer(dom.list), state.sidebarFilteringEnabled);
  renderer(dom.list);
    });

    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest('.filter-item');
        if (!item || !container.contains(item)) return;
        e.preventDefault();
        item.click();
      }
    });
  };

  handleFilterClick(dom.artistList, 'artist');
  handleFilterClick(dom.albumList, 'album');
}
