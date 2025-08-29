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

// ---- Bitrate formatting helpers ----
function snapCommonKbps(kbps) {
  const commons = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const tol = 0.03; // ±3%
  for (const c of commons) {
    if (Math.abs(kbps - c) / c <= tol) return c;
  }
  return kbps;
}

// style: 'cell' -> compact number for table cell (no unit)
//         'cellUnit' -> compact number with unit (e.g., "192 kbps" / "1 Mbps")
//         'short' -> compact with unit suffix for badges (e.g. "1M")
//         'long' -> full text with units (e.g. "VBR 192 kbps")
function formatBitrate(bps, opts = {}) {
  const { vbr = false, style = 'cell' } = opts;
  if (!bps || !Number.isFinite(bps) || bps <= 0) {
    return style === 'cell' ? '—' : 'Unknown';
  }
  // Accept kbps inputs too; treat >= 10000 as bps, otherwise as kbps
  const kbpsRaw = bps >= 10000 ? (bps / 1000) : bps;
  const kbps = snapCommonKbps(kbpsRaw);
  if (kbps >= 1000) {
  const mbps = kbps / 1000;
  // If Mbps > 1, show two decimals; otherwise keep integer style
  const useTwoDecimals = mbps > 1;
  const val = useTwoDecimals ? mbps.toFixed(2) : String(Math.round(mbps));
  if (style === 'cell') return val;                // number only
  if (style === 'cellUnit') return `${val} Mbps`;  // with unit
  if (style === 'short') return `${useTwoDecimals ? Number(val).toFixed(2) : val}M`;
  return `${vbr ? 'VBR ' : ''}${val} Mbps`;
  }
  const val = String(Math.round(kbps)); // no decimals in kbps
  if (style === 'cell') return val;
  if (style === 'cellUnit') return `${val} kbps`;
  if (style === 'short') return `${vbr ? '~' : ''}${val}`;
  return `${vbr ? 'VBR ' : ''}${val} kbps`;
}

export function createTrackElement(track, onClick, headers = ['title','artist','album','year','genre','bitrate']) {
  const div = document.createElement('div');
  div.className = 'track';
  // Tag row with its filePath for quick highlight updates without re-render
  try {
    if (track && track.filePath) {
      div.__filePath = track.filePath;
      div.dataset.filePath = track.filePath;
    }
  } catch(_) {}
  const art = track.albumArtDataUrl || 'assets/images/default-art.png';
  const titleText = (track.tags?.title) || track.file;
  const artistText = (track.tags?.artist) || 'Unknown';
  const albumText = (track.tags?.album) || 'Unknown';
  const yearText = (track.tags?.year) || '';
  const genreText = (track.tags?.genre) || '';
  // Robust bitrate formatting
  const isVbr = Boolean(
    track?.vbr || track?.variableBitrate ||
    track?.bitrateMode === 'vbr' || track?.bitrate_mode === 'vbr' ||
    /vbr/i.test(String(track?.profile || track?.codecProfile || ''))
  );
  let bitrateCellText = '—';
  let bitrateTitleText = 'Unknown';
  if (track.bitrate != null && Number.isFinite(track.bitrate) && track.bitrate > 0) {
    const bps = track.bitrate >= 10000 ? track.bitrate : track.bitrate * 1000; // accept kbps or bps
    bitrateCellText = formatBitrate(bps, { vbr: isVbr, style: 'cellUnit' });
    bitrateTitleText = formatBitrate(bps, { vbr: isVbr, style: 'long' });
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
        rowHtml += `<div class="track-year"><span class="linkish" data-year title="${yearText}" tabindex="0">${yearText}</span></div>`; break;
      case 'genre':
        rowHtml += `<div class="track-genre" title="${genreText}"><span class="genre-text">${genreText}</span></div>`; break;
      case 'bitrate':
        rowHtml += `<div class="track-bitrate" title="${bitrateTitleText}" aria-label="${bitrateTitleText}">${bitrateCellText}</div>`; break;
      default:
        rowHtml += `<div>${track[h] || ''}</div>`;
    }
  });
  rowHtml += `<div class="track-actions"><button class="favorite-btn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;padding:0;vertical-align:middle;">
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
    try {
      // Clean up any existing ephemeral panels before opening a new one
      document.querySelectorAll('.playlist-popup').forEach(p => p.remove());

  const { playlists } = await import('../playlist/playlists.js');
  // Use URL-based specifier for robust path resolution
  const { showPlaylistPopup } = await import(new URL('../shared/playlistPopup.js', import.meta.url).href);
      showPlaylistPopup(btn.getBoundingClientRect(), [track], { playlists });
    } catch (err) {
      console.error('Failed to open playlist popup', err);
      try {
        const { showToast } = await import('../ui/ui.js');
        showToast('Could not open playlist menu');
      } catch (_) {}
    }
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
        // choose renderer dynamically so grid view is preserved when active
        import('../shared/view.js').then(({ renderList, renderGrid }) => {
          const renderer = document.getElementById('grid-view')?.classList.contains('active') ? renderGrid : renderList;
          updateSidebarFilters(
            filterInput,
            document.getElementById('artist-list'),
            document.getElementById('album-list'),
            () => renderer(document.getElementById('music-list')),
            state.sidebarFilteringEnabled
          );
          renderer(document.getElementById('music-list'));
        });
      });
    });
  };

  const artistSpan = div.querySelector('.track-artist .linkish[data-artist]');
  artistSpan?.addEventListener('click', (e) => {
    e.stopPropagation();
    // Reset the main text filter so sidebar shows the full artist list context
    const filterInput = document.getElementById('filter');
    if (filterInput) {
      filterInput.value = '';
    }
    // Ensure sidebar filtering mode is enabled so artist selection takes effect
    import('../shared/state.js').then(({ state }) => { if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true; }).finally(() => {
      applyFilter({ artist: artistText });
    });
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
    // Reset the main text filter so sidebar shows the full album list context
    const filterInput = document.getElementById('filter');
    if (filterInput) filterInput.value = '';
    // Ensure sidebar filtering is enabled before applying album selection
    import('../shared/state.js').then(({ state }) => { if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true; }).finally(() => {
      applyFilter({ album: albumText });
    });
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

  // Year click -> apply year filter
  const yearSpan = div.querySelector('.track-year .linkish[data-year]');
  yearSpan?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!yearText) return;
    const filterInput = document.getElementById('filter');
    if (filterInput) filterInput.value = '';
    import('../shared/state.js').then(({ state }) => { if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true; }).finally(() => {
      applyFilter({ year: yearText });
    });
    setTimeout(() => {
      const esc = String(yearText).replace(/"/g, '\"');
      const target = document.querySelector(`#year-list .filter-item[data-value="${esc}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });
  yearSpan?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); yearSpan.click(); }
  });

  div.addEventListener('click', () => onClick(track));

  // Right-click context menu for track rows (use shared helper)
  div.addEventListener('contextmenu', (e) => {
    e.preventDefault(); e.stopPropagation();
    import('../shared/contextMenu.js').then(({ showContextMenu }) => {
      const items = [];
      items.push({ label: track.favorite ? 'Unfavorite' : 'Favorite', onClick: () => import('../shared/state.js').then(({ toggleFavorite }) => toggleFavorite(track)) });
      items.push({ label: 'Add to playlist…', onClick: () => {
        const btn = div.querySelector('.playlist-add-btn');
        if (btn) {
          btn.click();
        } else {
          import('../playlist/playlists.js')
            .then(({ playlists }) => import(new URL('../shared/playlistPopup.js', import.meta.url).href).then(({ showPlaylistPopup }) => showPlaylistPopup(e, [track], { playlists })))
            .catch(async (err) => {
              console.error('Failed to open playlist popup from context menu', err);
              try { const { showToast } = await import('../ui/ui.js'); showToast('Could not open playlist menu'); } catch (_) {}
            });
        }
      }});
      items.push({ label: 'Queue', onClick: () => import('../shared/state.js').then(({ addToQueue }) => addToQueue(track)) });
      items.push({ label: 'Reveal in Explorer', onClick: () => {
        const path = track.filePath || track.file || null;
        if (!path) { import('./ui.js').then(({ showToast }) => showToast('No file path available')); return; }
        if (window.etune && typeof window.etune.revealFile === 'function') window.etune.revealFile(path);
        else if (window.etune && typeof window.etune.revealInFolder === 'function') window.etune.revealInFolder(path);
        else if (window.require) { try { const { shell } = window.require('electron'); shell.showItemInFolder(path); } catch (err) { import('./ui.js').then(({ showToast }) => showToast('Reveal not available')); } }
        else import('./ui.js').then(({ showToast }) => showToast('Reveal not supported'));
      }});
      items.push({ label: 'Copy file path', onClick: () => { navigator.clipboard?.writeText(track.filePath || track.file || '').catch(() => {}); } });

      import('../shared/contextMenu.js').then(({ showContextMenu }) => showContextMenu(e, items));
    });
  });
  return div;
}

export function createFilterItem(name, count, isActive) {
  const div = document.createElement('div');
  div.className = `filter-item ${isActive ? 'active' : ''}`;
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');
  // store raw value for event handlers; callers may rely on exact string equality
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