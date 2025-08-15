// Lightweight toast (with fade styling expectation via CSS .toast)
export function showToast(message, timeout = 1800) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, timeout);
}

export function createTrackElement(track, onClick, headers = ['title','artist','album','year','genre','bitrate']) {
  const div = document.createElement('div');
  div.className = 'track';
  const art = track.albumArtDataUrl || 'assets/images/default-art.png';
  const titleText = (track.tags?.title) || track.file;
  const artistText = (track.tags?.artist) || 'Unknown';
  const albumText = (track.tags?.album) || 'Unknown';
  const yearText = (track.tags?.year) || '';
  const genreText = (track.tags?.genre) || '';
  let bitrateText = '';
  if (track.bitrate) {
    const rounded = Math.round(track.bitrate);
    bitrateText = `${String(rounded).slice(0,3)} kbps`;
  }
  const userColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#8C40B8';
  let rowHtml = '';
  headers.forEach(h => {
    switch (h) {
      case 'title':
        rowHtml += `<div class="track-title"><img class="album-art" src="${art}" alt="Album Art" /><span class="track-name" title="${titleText}">${titleText}</span></div>`; break;
      case 'artist':
        rowHtml += `<div class="track-artist"><span class="linkish" data-artist title="${artistText}" tabindex="0">${artistText}</span></div>`; break;
      case 'album':
        rowHtml += `<div class="track-album"><span class="linkish" data-album title="${albumText}" tabindex="0">${albumText}</span></div>`; break;
      case 'year':
        rowHtml += `<div class="track-year" title="${yearText}">${yearText}</div>`; break;
      case 'genre':
        rowHtml += `<div class="track-genre" title="${genreText}"><span class="genre-text">${genreText}</span></div>`; break;
      case 'bitrate':
        rowHtml += `<div class="track-bitrate" title="${bitrateText}">${bitrateText}</div>`; break;
      default:
        rowHtml += `<div>${track[h] || ''}</div>`;
    }
  });
  rowHtml += `<div class="track-actions"><button class="favorite-btn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;padding:0;margin-right:8px;vertical-align:middle;">
  <img src="assets/images/heart.svg" alt="Favorite" style="width:22px;height:22px;filter:${track.favorite ? `drop-shadow(0 0 4px ${userColor}) saturate(2)`:'grayscale(1) opacity(0.5)'};transition:filter .2s;" /></button>
    <button class="queue-add-btn" title="Add to Queue" style="background:none;border:none;cursor:pointer;padding:0;vertical-align:middle;">
      <img src="assets/images/addtoqueue.svg" alt="Add to Queue" style="width:22px;height:22px;filter:grayscale(1) opacity(0.7);transition:filter .2s;" /></button>
      <button class="playlist-add-btn" title="Add to Playlist" style="background:none;border:none;cursor:pointer;padding:0;vertical-align:middle;">
        <img src="assets/images/queue.svg" alt="Add to Playlist" style="width:20px;height:20px;filter:grayscale(1) opacity(0.7);transition:filter .2s;" />
      </button>
      </div>`;
  div.innerHTML = rowHtml;

  // Favorite button
  const favBtn = div.querySelector('.favorite-btn');
  const favImg = favBtn?.querySelector('img');
  if (favBtn && favImg) {
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
        import('../shared/state.js').then(({ toggleFavorite }) => {
        toggleFavorite(track);
        const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#8C40B8';
        favImg.style.filter = track.favorite ? `drop-shadow(0 0 4px ${color}) saturate(2)` : 'grayscale(1) opacity(0.5)';
        favImg.title = track.favorite ? 'Unfavorite' : 'Favorite';
      });
    });
  }

  // Queue button
  const queueBtn = div.querySelector('.queue-add-btn');
  queueBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
        import('../shared/state.js').then(({ addToQueue }) => {
      addToQueue(track);
      showToast(`Added to queue: ${titleText}`);
    });
  });

  // Add to Playlist (lazy menu)
  const playlistBtn = div.querySelector('.playlist-add-btn');
  playlistBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
  const { playlists, addToPlaylist } = await import('../playlist/playlists.js');
  const { showNewPlaylistModal } = await import('../../ui/playlistModal.js');
    // Build upgraded popup panel
    const panel = document.createElement('div');
    panel.className = 'playlist-popup';
    Object.assign(panel.style, {
      position: 'fixed', zIndex: 10000, background: 'var(--sidebar-bg, #1f1f1f)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
      width: '260px', padding: '10px', boxSizing: 'border-box'
    });
    // Primary action: New playlist
    const newBtn = document.createElement('button');
    newBtn.textContent = 'New playlist…';
    Object.assign(newBtn.style, {
      width: '100%', background: 'var(--primary-color)', color: '#000', border: 'none',
      borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', textAlign: 'center',
      fontWeight: 700, textTransform: 'none', marginBottom: '10px'
    });
    newBtn.onclick = () => {
      showNewPlaylistModal({ defaultName: track.tags?.album || 'New Playlist', track, onCreate: (pl) => {
        document.dispatchEvent(new CustomEvent('playlists:changed'));
        showToast(`Added to new playlist: ${pl.name}`);
      }});
      close();
    };
    panel.appendChild(newBtn);

    // Subheader
    const sub = document.createElement('div');
    sub.textContent = 'Add to:';
    Object.assign(sub.style, { color: '#bfbfbf', fontSize: '0.8rem', letterSpacing: '0.5px', margin: '2px 4px 6px 4px' });
    panel.appendChild(sub);

    // Scrollable list of playlists
    const listWrap = document.createElement('div');
    Object.assign(listWrap.style, { maxHeight: '220px', overflowY: 'auto', paddingRight: '2px' });
    if (playlists.user.length) {
      playlists.user.forEach(pl => {
        const item = document.createElement('div');
        item.textContent = pl.name;
        item.setAttribute('title', pl.name);
        item.tabIndex = 0;
        Object.assign(item.style, {
          padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
          margin: '2px 0', outline: 'none'
        });
        item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.06)';
        item.onmouseleave = () => item.style.background = 'transparent';
        item.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); item.click(); } };
        item.onclick = () => {
          addToPlaylist(pl.id, track);
          showToast(`Added to playlist: ${pl.name}`);
          document.dispatchEvent(new CustomEvent('playlists:changed'));
          close();
        };
        listWrap.appendChild(item);
      });
    } else {
      const empty = document.createElement('div');
      empty.textContent = 'No playlists yet';
      Object.assign(empty.style, { color: '#9a9a9a', fontSize: '0.85rem', padding: '8px 10px' });
      listWrap.appendChild(empty);
    }
    panel.appendChild(listWrap);

    // Position near button
    const rect = btn.getBoundingClientRect();
    panel.style.left = `${Math.min(rect.left, window.innerWidth - 280)}px`;
    panel.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - 280)}px`;
    document.body.appendChild(panel);

    const close = () => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKey, true);
      panel.remove();
    };
    const onDocClick = (ev) => { if (!panel.contains(ev.target)) close(); };
    const onKey = (ev) => { if (ev.key === 'Escape') close(); };
    setTimeout(() => {
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKey, true);
      (listWrap.querySelector('[tabindex="0"]') || newBtn).focus();
    }, 0);
  });

  // Filtering helpers
  const applyFilter = (opts) => {
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
          // Clear album filter so selecting an artist after an album shows all albums for that artist
          state.activeAlbum = null;
        }
        const filterInput = document.getElementById('filter');
        updateFilters(filterInput, state.sidebarFilteringEnabled);
        updateSidebarFilters(
          filterInput,
          document.getElementById('artist-list'),
          document.getElementById('album-list'),
          () => {},
          state.sidebarFilteringEnabled
        );
  import('../shared/view.js').then(({ renderList }) => renderList(document.getElementById('music-list')));
      });
    });
  };

  const artistSpan = div.querySelector('.track-artist .linkish[data-artist]');
  artistSpan?.addEventListener('click', (e) => {
    e.stopPropagation();
    applyFilter({ artist: artistText });
    setTimeout(() => {
      const esc = artistText.replace(/"/g, '\"');
      const target = document.querySelector(`#artist-list .filter-item[data-value="${esc}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });
  artistSpan?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); e.stopPropagation(); artistSpan.click();
    }
  });

  const albumSpan = div.querySelector('.track-album .linkish[data-album]');
  albumSpan?.addEventListener('click', (e) => {
    e.stopPropagation();
    applyFilter({ album: albumText });
    setTimeout(() => {
      const esc = albumText.replace(/"/g, '\"');
      const target = document.querySelector(`#album-list .filter-item[data-value="${esc}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });
  albumSpan?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); e.stopPropagation(); albumSpan.click();
    }
  });

  div.addEventListener('click', () => onClick(track));
  return div;
}

export function createFilterItem(name, count, isActive) {
  const div = document.createElement('div');
  div.className = `filter-item ${isActive ? 'active' : ''}`;
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');
  div.dataset.value = name;
  div.innerHTML = `<span>${name}</span><span class="filter-count">${count}</span>`;
  return div;
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function renderPlayerFavoriteIcon() {
  const info = document.querySelector('.track-info');
  if (!info) return;
  let favBtn = document.getElementById('player-favorite-btn');
  if (!favBtn) {
    favBtn = document.createElement('button');
    favBtn.id = 'player-favorite-btn';
    favBtn.title = 'Toggle Favorite';
    favBtn.style.background = 'none';
    favBtn.style.border = 'none';
    favBtn.style.cursor = 'pointer';
    favBtn.style.padding = '0 0 0 8px';
    favBtn.innerHTML = `<img src="assets/images/heart.svg" alt="Favorite" style="width:22px;height:22px;filter:grayscale(1) opacity(.5);transition:filter .2s;" />`;
    info.appendChild(favBtn);
  }
  const favImg = favBtn.querySelector('img');
  import('../shared/state.js').then(({ state, toggleFavorite }) => {
    const track = state.currentTrack;
    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#8C40B8';
    favImg.style.filter = track && track.favorite ? `drop-shadow(0 0 4px ${color}) saturate(2)` : 'grayscale(1) opacity(.5)';
    favBtn.onclick = (e) => {
      e.stopPropagation();
      if (!track) return;
      toggleFavorite(track);
      favImg.style.filter = track.favorite ? `drop-shadow(0 0 4px ${color}) saturate(2)` : 'grayscale(1) opacity(.5)';
    };
  });
}