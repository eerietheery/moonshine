function createFilterSection(state) {
  const filterSection = document.createElement('div');

  const filterToggle = document.createElement('label');
  filterToggle.style.display = 'flex';
  filterToggle.style.alignItems = 'center';
  filterToggle.style.gap = '10px';
  filterToggle.style.color = '#fff';

  const filterCheckbox = document.createElement('input');
  filterCheckbox.type = 'checkbox';
  filterCheckbox.checked = !!state.sidebarFilteringEnabled;
  filterCheckbox.style.transform = 'scale(1.2)';
  filterCheckbox.style.marginRight = '0px';
  filterCheckbox.addEventListener('change', () => {
    state.sidebarFilteringEnabled = filterCheckbox.checked;
    if (!state.sidebarFilteringEnabled) {
      state.activeArtist = null;
      state.activeAlbum = null;
    }
    window.moonshine.updateConfig({ sidebarFilteringEnabled: state.sidebarFilteringEnabled });
    const filterInput = document.getElementById('filter');
    const list = document.getElementById('music-list');
    const artistList = document.getElementById('artist-list');
    const albumList = document.getElementById('album-list');
    const doRenderList = () => window.renderList ? window.renderList(list) : undefined;
    import('../../components/shared/state.js').then(({ updateFilters }) => {
      updateFilters(filterInput, state.sidebarFilteringEnabled);
      import('../../components/sidebar/sidebar.js').then(({ updateSidebarFilters }) => {
        updateSidebarFilters(filterInput, artistList, albumList, doRenderList, state.sidebarFilteringEnabled);
        doRenderList();
      });
    });
  });

  const filterLabel = document.createElement('span');
  filterLabel.textContent = 'Enable sidebar filtering';
  filterLabel.style.fontWeight = '600';
  filterLabel.style.fontFamily = 'inherit';
  filterLabel.style.fontSize = '15px';
  filterLabel.style.color = '#fff';
  filterLabel.style.letterSpacing = '0.01em';

  filterToggle.appendChild(filterCheckbox);
  filterToggle.appendChild(filterLabel);

  filterSection.appendChild(filterToggle);

  const teardown = () => {
    // No global listeners to clean up
  };

  return { element: filterSection, teardown };
}

export { createFilterSection };