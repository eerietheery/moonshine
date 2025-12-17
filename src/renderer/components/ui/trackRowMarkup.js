import { formatBitrate } from './formatters.js';
import { showToast } from './toast.js';
import { getAlbumArtUrl, ensureAlbumArtUrl } from '../../utils/albumArtCache.js';

export function createTrackElement(track, onClick, headers = ['title','artist','album','year','genre','bitrate']) {
  const div = document.createElement('div');
  div.className = 'track';
  try {
    if (track && track.filePath) {
      div.__filePath = track.filePath;
      div.dataset.filePath = track.filePath;
      
      // Store track data directly on element for mobile use
      div.__track = {
        title: (track.tags?.title) || track.file || 'Unknown Track',
        artist: (track.tags?.artist) || 'Unknown Artist',
        album: (track.tags?.album) || 'Unknown Album',
        year: (track.tags?.year) || '',
        genre: (track.tags?.genre) || '',
        albumArt: getAlbumArtUrl(track),
        filePath: track.filePath,
        favorite: track.favorite,
        bitrate: track.bitrate,
        originalTrack: track,
        isFallback: false
      };
      
      // Store essential data as data attributes for mobile extraction
      div.dataset.title = div.__track.title;
      div.dataset.artist = div.__track.artist;
      div.dataset.album = div.__track.album;
    }
  } catch(_) {}
  const art = getAlbumArtUrl(track);
  const titleText = (track.tags?.title) || track.file;
  const artistText = (track.tags?.artist) || 'Unknown';
  const albumText = (track.tags?.album) || 'Unknown';
  const yearText = (track.tags?.year) || '';
  const genreText = (track.tags?.genre) || '';
  const isVbr = Boolean(
    track?.vbr || track?.variableBitrate ||
    track?.bitrateMode === 'vbr' || track?.bitrate_mode === 'vbr' ||
    /vbr/i.test(String(track?.profile || track?.codecProfile || ''))
  );
  let bitrateCellText = '—';
  let bitrateTitleText = 'Unknown';
  if (track.bitrate != null && Number.isFinite(track.bitrate) && track.bitrate > 0) {
    const bps = track.bitrate >= 10000 ? track.bitrate : track.bitrate * 1000;
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
  <img src="assets/images/heart.svg" alt="Favorite" class="${track.favorite ? 'favorited' : ''}" style="width:22px;height:22px;transition:filter .2s;" /></button>
    <button class="queue-add-btn" title="Add to Queue" style="background:none;border:none;cursor:pointer;padding:0;vertical-align:middle;">
      <img src="assets/images/addtoqueue.svg" alt="Add to Queue" style="width:22px;height:22px;transition:filter .2s;" /></button>
      <button class="playlist-add-btn" title="Add to Playlist" style="background:none;border:none;cursor:pointer;padding:0;vertical-align:middle;">
        <img src="assets/images/queue.svg" alt="Add to Playlist" style="width:20px;height:20px;transition:filter .2s;" />
      </button>
      </div>`;
  div.innerHTML = rowHtml;

  // Lazy-load album art on-demand (keeps scan payload tiny).
  try {
    const img = div.querySelector('img.album-art');
    if (img && track && track.filePath) {
      ensureAlbumArtUrl(track).then((url) => {
        if (!div.isConnected) return;
        if (div.dataset.filePath !== track.filePath) return;
        if (url && img.src !== url) img.src = url;
        try {
          if (div.__track) div.__track.albumArt = url;
        } catch (_) {}
      });
    }
  } catch (_) {}

  const favBtn = div.querySelector('.favorite-btn');
  const favImg = favBtn?.querySelector('img');
  if (favBtn && favImg) {
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      import('../shared/state.js').then(({ toggleFavorite }) => {
        toggleFavorite(track);
        // Update favorite state and CSS class
        if (track.favorite) {
          favImg.classList.add('favorited');
        } else {
          favImg.classList.remove('favorited');
        }
        favImg.title = track.favorite ? 'Unfavorite' : 'Favorite';
      });
    });
  }

  const queueBtn = div.querySelector('.queue-add-btn');
  queueBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    import('../shared/state.js').then(({ addToQueue }) => {
      addToQueue(track);
      showToast(`Added to queue: ${titleText}`);
    });
  });

  const playlistBtn = div.querySelector('.playlist-add-btn');
  playlistBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    try {
      document.querySelectorAll('.playlist-popup').forEach(p => p.remove());
      const { playlists } = await import('../playlist/playlists.js');
      const { showPlaylistPopup } = await import(new URL('../shared/playlistPopup.js', import.meta.url).href);
      showPlaylistPopup(btn.getBoundingClientRect(), [track], { playlists });
    } catch (err) {
      console.error('Failed to open playlist popup', err);
      try {
        showToast('Could not open playlist menu');
      } catch (_) {}
    }
  });

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
          renderer(document.getElementById('music-list'));
        });
      });
    });
  };

  const artistSpan = div.querySelector('.track-artist .linkish[data-artist]');
  artistSpan?.addEventListener('click', (e) => {
    e.stopPropagation();
    const filterInput = document.getElementById('filter');
    if (filterInput) {
      filterInput.value = '';
    }
    import('../shared/state.js').then(({ state, resetSidebarFilters }) => {
      resetSidebarFilters();
      if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true;
      state.activeArtist = artistText;
      state.activeAlbum = null;
    }).finally(() => {
      applyFilter({ artist: artistText });
    });
    setTimeout(() => {
      const esc = artistText.replace(/"/g, '\\"');
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
    const filterInput = document.getElementById('filter');
    if (filterInput) filterInput.value = '';
    import('../shared/state.js').then(({ state }) => { if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true; }).finally(() => {
      applyFilter({ album: albumText });
    });
    setTimeout(() => {
      const esc = albumText.replace(/"/g, '\\"');
      const target = document.querySelector(`#album-list .filter-item[data-value="${esc}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });
  albumSpan?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); e.stopPropagation(); albumSpan.click();
    }
  });

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
      const esc = String(yearText).replace(/"/g, '\\"');
      const target = document.querySelector(`#year-list .filter-item[data-value="${esc}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });
  yearSpan?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); yearSpan.click(); }
  });

  div.addEventListener('click', () => onClick(track));

  div.addEventListener('contextmenu', async (e) => {
    e.preventDefault(); e.stopPropagation();
    
    const { showContextMenu } = await import('../shared/contextMenu.js');
    const { state } = await import('../shared/state.js');
    
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
            try { showToast('Could not open playlist menu'); } catch (_) {}
          });
      }
    }});
    
    // Add "Remove from Playlist" option when viewing a user playlist
    if (state.viewMode === 'playlist' && state.activePlaylist && state.activePlaylist.type === 'user') {
      items.push({ label: 'Remove from Playlist', onClick: async () => {
        const { removeFromPlaylist } = await import('../playlist/playlists.js');
        removeFromPlaylist(state.activePlaylist.id, track.filePath);
        // Re-render the list to reflect the change
        const { renderList } = await import('../shared/view.js');
        const listEl = document.getElementById('music-list');
        if (listEl) renderList(listEl);
        // Show confirmation toast
        try {
          const trackName = track.tags?.title || track.file || 'track';
          showToast(`Removed "${trackName}" from ${state.activePlaylist.name}`);
        } catch (_) {}
      }});
    }
    
    items.push({ label: 'Queue', onClick: () => import('../shared/state.js').then(({ addToQueue }) => addToQueue(track)) });
    items.push({ label: 'Reveal in Explorer', onClick: () => {
      const path = track.filePath || track.file || null;
      if (!path) { showToast('No file path available'); return; }
      if (window.etune && typeof window.etune.revealFile === 'function') window.etune.revealFile(path);
      else if (window.etune && typeof window.etune.revealInFolder === 'function') window.etune.revealInFolder(path);
      else if (window.require) { try { const { shell } = window.require('electron'); shell.showItemInFolder(path); } catch (err) { showToast('Reveal not available'); } }
      else showToast('Reveal not supported');
    }});
    items.push({ label: 'Copy file path', onClick: () => { navigator.clipboard?.writeText(track.filePath || track.file || '').catch(() => {}); } });

    showContextMenu(e, items);
  });
  
  // Update for mobile view if needed
  try {
    // Use dynamic import to avoid circular dependencies
    import('../mobile/mobileUI.js').then(({ isMobile, updateMobileTrackElement }) => {
      if (isMobile && updateMobileTrackElement) {
        setTimeout(() => updateMobileTrackElement(div), 0);
      }
    }).catch(() => {
      // Mobile module not available or error - safe to ignore
    });
  } catch (_) {
    // Safe to ignore
  }
  
  return div;
}
