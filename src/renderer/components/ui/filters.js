export function createFilterItem(name, count, isActive) {
  const div = document.createElement('div');
  div.className = `filter-item ${isActive ? 'active' : ''}`;
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');
  div.dataset.value = name;

  const nameSpan = document.createElement('span');
  nameSpan.textContent = name;
  const countSpan = document.createElement('span');
  countSpan.className = 'filter-count';
  countSpan.textContent = String(count);

  div.appendChild(nameSpan);
  div.appendChild(countSpan);
  return div;
}

// Export a small helper that callers can use to run the same applyFilter logic if needed.
export function applyFilter(opts, rendererCallback) {
  import('../shared/state.js').then(({ state, updateFilters }) => {
    import('../sidebar/sidebar.js').then(({ updateSidebarFilters }) => {
      if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true;
      if (opts.album !== undefined) {
        state.activeAlbum = opts.album;
        state.currentTrack = null;
        state.currentTrackIndex = -1;
      }
      if (opts.artist !== undefined) {
        state.activeArtist = opts.artist;
        state.activeAlbum = null;
      }
      const filterInput = document.getElementById('filter');
      updateFilters(filterInput, state.sidebarFilteringEnabled);
      import('../shared/view.js').then(({ renderList, renderGrid }) => {
        const renderer = document.getElementById('grid-view')?.classList.contains('active') ? renderGrid : renderList;
        updateSidebarFilters(
          filterInput,
          document.getElementById('artist-list'),
          document.getElementById('album-list'),
          () => renderer(document.getElementById('music-list')),
          state.sidebarFilteringEnabled
        );
        (rendererCallback || renderer)(document.getElementById('music-list'));
      });
    });
  });
}
