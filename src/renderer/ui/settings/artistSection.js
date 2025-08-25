function createArtistSection(state) {
  const artistSection = document.createElement('div');
  artistSection.style.marginTop = '18px';
  artistSection.style.display = 'flex';
  artistSection.style.alignItems = 'center';

  const artistToggle = document.createElement('input');
  artistToggle.type = 'checkbox';
  artistToggle.checked = !!state.explicitArtistNames;
  artistToggle.style.transform = 'scale(1.2)';
  artistToggle.style.marginRight = '10px';
  artistToggle.addEventListener('change', () => {
    state.explicitArtistNames = artistToggle.checked;
    window.etune.updateConfig({ explicitArtistNames: state.explicitArtistNames });
    document.dispatchEvent(new CustomEvent('artist-lumping-updated', { detail: state.explicitArtistNames }));
    import('../../components/sidebar/sidebar.js').then(({ updateSidebarFilters }) => {
      import('../../components/shared/view.js').then(({ renderList }) => {
        updateSidebarFilters(window.dom.filterInput, window.dom.artistList, window.dom.albumList, () => renderList(window.dom.list), state.sidebarFilteringEnabled);
        renderList(window.dom.list);
      });
    });
  });

  const artistLabel = document.createElement('label');
  artistLabel.textContent = 'Explicit Artist Names';
  artistLabel.style.fontWeight = '600';
  artistLabel.style.fontFamily = 'inherit';
  artistLabel.style.fontSize = '15px';
  artistLabel.style.color = '#fff';
  artistLabel.style.letterSpacing = '0.01em';

  artistSection.appendChild(artistToggle);
  artistSection.appendChild(artistLabel);

  const teardown = () => {
    // No global listeners to clean up
  };

  return { element: artistSection, teardown };
}

export { createArtistSection };