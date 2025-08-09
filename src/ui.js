// UI helpers for rendering tracks, album art, etc.

// Lightweight toast
export function showToast(message, timeout = 1800) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  // trigger transition
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, timeout);
}

export function createTrackElement(track, onClick) {
  const div = document.createElement('div');
  div.className = 'track';
  const art = track.albumArtDataUrl || 'assets/default-art.png';
  const titleText = (track.tags && track.tags.title) || track.file;
  const artistText = (track.tags && track.tags.artist) || 'Unknown';
  const albumText = (track.tags && track.tags.album) || 'Unknown';
  const yearText = (track.tags && track.tags.year) || '';
  const genreText = (track.tags && track.tags.genre) || '';
  
  div.innerHTML = `
    <div class="track-title">
      <img class="album-art" src="${art}" alt="Album Art" />
      <span class="track-name" title="${titleText}">${titleText}</span>
    </div>
    <div class="track-artist linkish" data-artist title="${artistText}" tabindex="0">${artistText}</div>
    <div class="track-album linkish" data-album title="${albumText}" tabindex="0">${albumText}</div>
    <div class="track-year" title="${yearText}">${yearText}</div>
    <div class="track-genre track-genre-actions" title="${genreText}">
      <span class="genre-text">${genreText}</span>
      <button class="queue-add-btn" title="Add to Queue">📝</button>
    </div>
  `;
  // Add to queue button
  div.querySelector('.queue-add-btn').onclick = (e) => {
    e.stopPropagation();
    import('./state.js').then(({ addToQueue }) => {
      addToQueue(track);
  // Toast
  showToast(`Added to queue: ${(track.tags && track.tags.title) || track.file}`);
    });
  };
  
  // Click-to-filter for artist/album
  const applyFilter = (opts) => {
    import('./state.js').then(({ state, updateFilters }) => {
      import('./sidebar.js').then(({ updateSidebarFilters }) => {
        if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true;
        // Always reset active track when filtering by album
        if (opts.album !== undefined) {
          state.activeAlbum = opts.album;
          state.currentTrack = null;
          state.currentTrackIndex = -1;
        }
        if (opts.artist !== undefined) state.activeArtist = opts.artist;
        const filterInput = document.getElementById('filter');
        updateFilters(filterInput, state.sidebarFilteringEnabled);
        updateSidebarFilters(
          filterInput,
          document.getElementById('artist-list'),
          document.getElementById('album-list'),
          () => {},
          state.sidebarFilteringEnabled
        );
        // Re-render list to show filtered
        import('./view.js').then(({ renderList }) => renderList(document.getElementById('music-list')));
      });
    });
  };
  const artistEl = div.querySelector('[data-artist]');
  const albumEl = div.querySelector('[data-album]');
  artistEl?.addEventListener('click', (e) => {
    e.stopPropagation();
    applyFilter({ artist: artistText });
    // Scroll sidebar to artist
    setTimeout(() => {
      const sidebarArtist = document.querySelector(`#artist-list .filter-item[data-value="${artistText.replace(/"/g, '\"')}"]`);
      if (sidebarArtist) sidebarArtist.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });
  albumEl?.addEventListener('click', (e) => {
    e.stopPropagation();
    applyFilter({ album: albumText });
    // Scroll sidebar to album
    setTimeout(() => {
      const sidebarAlbum = document.querySelector(`#album-list .filter-item[data-value="${albumText.replace(/"/g, '\"')}"]`);
      if (sidebarAlbum) sidebarAlbum.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });
  artistEl?.addEventListener('keydown', (e) => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); e.stopPropagation(); applyFilter({ artist: artistText }); setTimeout(() => { const sidebarArtist = document.querySelector(`#artist-list .filter-item[data-value="${artistText.replace(/"/g, '\"')}"]`); if (sidebarArtist) sidebarArtist.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); }});
  albumEl?.addEventListener('keydown', (e) => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); e.stopPropagation(); applyFilter({ album: albumText }); setTimeout(() => { const sidebarAlbum = document.querySelector(`#album-list .filter-item[data-value="${albumText.replace(/"/g, '\"')}"]`); if (sidebarAlbum) sidebarAlbum.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); }});

  // Row click plays track
  div.onclick = () => onClick(track);
  return div;
}

export function createFilterItem(name, count, isActive) {
  const div = document.createElement('div');
  div.className = `filter-item ${isActive ? 'active' : ''}`;
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');
  div.dataset.value = name;
  div.innerHTML = `
    <span>${name}</span>
    <span class="filter-count">${count}</span>
  `;
  // Note: Click handling is delegated at the container level in renderer.js
  return div;
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
