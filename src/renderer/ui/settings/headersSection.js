function createHeadersSection(state) {
  const headersSection = document.createElement('div');
  headersSection.style.marginTop = '18px';
  headersSection.style.display = 'flex';
  headersSection.style.flexDirection = 'column';
  headersSection.style.gap = '10px';

  const headersTitle = document.createElement('div');
  headersTitle.textContent = 'List View Headers';
  headersTitle.style.fontWeight = '600';
  headersTitle.style.color = '#fff';
  headersTitle.style.marginBottom = '8px';

  // Default headers for now
  const possibleHeaders = [
    { key: 'title', label: 'Title' },
    { key: 'artist', label: 'Artist' },
    { key: 'album', label: 'Album' },
    { key: 'year', label: 'Year' },
    { key: 'genre', label: 'Genre' },
    { key: 'bitrate', label: 'Bit Rate' }
  ];
  if (!state.listHeaders) state.listHeaders = possibleHeaders.map(h => h.key);

  const headerCheckboxes = document.createElement('div');
  headerCheckboxes.style.display = 'grid';
  headerCheckboxes.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))';
  headerCheckboxes.style.gap = '8px';

  possibleHeaders.forEach(h => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '6px';
    label.style.color = '#ddd';
    label.style.fontWeight = '500';
    label.style.fontSize = '14px';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.listHeaders.includes(h.key);
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (!state.listHeaders.includes(h.key)) state.listHeaders.push(h.key);
      } else {
        state.listHeaders = state.listHeaders.filter(k => k !== h.key);
      }
      if (window.etune && typeof window.etune.updateConfig === 'function') {
        window.etune.updateConfig({ listHeaders: state.listHeaders });
      }
      // Re-render list view immediately
      import('../../components/shared/view.js').then(({ renderList }) => {
        const musicList = document.getElementById('music-list');
        if (musicList) renderList(musicList);
      });
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(h.label));
    headerCheckboxes.appendChild(label);
  });

  headersSection.appendChild(headersTitle);
  headersSection.appendChild(headerCheckboxes);

  const teardown = () => {
    // no global listeners to remove; individual element listeners will be GC'd when removed
  };

  return { element: headersSection, teardown };
}

export { createHeadersSection };
