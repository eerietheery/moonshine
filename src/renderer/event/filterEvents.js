import { state, updateFilters, resetSidebarFilters } from '../../state.js';
import { updateSidebarFilters } from '../../sidebar.js';
import { renderList } from '../../view.js';
import * as dom from '../dom.js';

export function setupFilterEventListeners() {
  dom.filterInput.addEventListener('input', () => {
    updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
    updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderList(dom.list), state.sidebarFilteringEnabled);
    renderList(dom.list);
  });

  dom.sortBySelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderList(dom.list);
  });

  dom.sortOrderBtn.addEventListener('click', () => {
    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    dom.sortOrderBtn.textContent = state.sortOrder === 'asc' ? '↑' : '↓';
    renderList(dom.list);
  });

  const filterToggle = document.createElement('label');
  filterToggle.style.marginLeft = '24px';
  filterToggle.style.fontSize = '0.95em';
  filterToggle.innerHTML = `<input type="checkbox" id="sidebar-filter-toggle"> Enable sidebar filtering`;
  dom.toolbar.appendChild(filterToggle);
  const sidebarFilterCheckbox = document.getElementById('sidebar-filter-toggle');
  sidebarFilterCheckbox.checked = false;
  sidebarFilterCheckbox.addEventListener('change', (e) => {
    state.sidebarFilteringEnabled = e.target.checked;
    if (!state.sidebarFilteringEnabled) {
      resetSidebarFilters();
    }
    updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
    updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderList(dom.list), state.sidebarFilteringEnabled);
    renderList(dom.list);
  });

  const handleFilterClick = (container, type) => {
    container.addEventListener('click', (e) => {
      const item = e.target.closest('.filter-item');
      if (!item || !container.contains(item)) return;
      e.stopPropagation();
      const value = item.dataset.value;
      if (type === 'artist') {
        state.activeArtist = value === 'All' ? null : value;
      } else if (type === 'album') {
        state.activeAlbum = value === 'All' ? null : value;
      }

      const checkbox = document.getElementById('sidebar-filter-toggle');
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        state.sidebarFilteringEnabled = true;
      }

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
