import { state, updateFilters, resetSidebarFilters } from '../components/state.js';
import { updateSidebarFilters } from '../components/sidebar.js';
import { renderList } from '../components/view.js';
import * as dom from '../dom.js';

export function setupFilterEventListeners() {
  if (dom.filterInput) {
    dom.filterInput.addEventListener('input', () => {
      updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
      updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderList(dom.list), state.sidebarFilteringEnabled);
      renderList(dom.list);
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
      updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderList(dom.list), state.sidebarFilteringEnabled);
      renderList(dom.list);
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
