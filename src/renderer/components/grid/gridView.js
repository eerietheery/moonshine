// Grid view rendering logic
import { state, updateFilters } from '../shared/state.js';
import { updateSidebarFilters } from '../sidebar/sidebar.js';
import { renderList } from '../shared/view.js';
import * as dom from '../../dom.js';
import { showToast } from '../ui/ui.js';
import { getPlaylistTracks } from '../playlist/playlists.js';

export function renderGrid(list) {
  try { document.body.classList.toggle('playlists-active', state.viewMode === 'playlist' && !state.activePlaylist); } catch(e) {}
  // Declare headerEl and gridHeaders once at the top
  const headerEl = document.querySelector('#music-table .table-header');
  const gridHeaders = state.listHeaders && state.listHeaders.length ? state.listHeaders : ['title','artist','album','year','genre'];

  // Show header in grid view, but hide it while browsing playlists (no selection)
  if (!(state.viewMode === 'playlist' && !state.activePlaylist) && headerEl) headerEl.classList.remove('hidden');

  // Add click/keyboard handlers for sorting in grid view
  if (headerEl && state.tracks && state.tracks.length) {
    // Ensure header labels and active-sort arrow reflect current state (similar to list view)
    const headerLabels = { title: 'Title', artist: 'Artist', album: 'Album', year: 'Year', genre: 'Genre', bitrate: 'Bit Rate' };
    headerEl.innerHTML = gridHeaders.map(h => {
      const isActive = state.sortBy === h;
      const arrow = isActive ? (state.sortOrder === 'asc' ? '↑' : '↓') : '';
      return `<div class="col-${h} sort-header${isActive ? ' active-sort' : ''}" tabindex="0" role="button" data-sort="${h}" title="Sort by ${headerLabels[h] || h}">${headerLabels[h] || h} <span class="sort-arrow">${arrow}</span></div>`;
    }).join('') + '<div class="col-actions"></div>';
    headerEl.style.gridTemplateColumns = (state.listHeaders && state.listHeaders.length ? state.listHeaders : ['title','artist','album','year','genre']).map(h => ({ title: '3fr', artist: '2fr', album: '2fr', year: '1fr', genre: '1fr', bitrate: '1fr' }[h] || '1fr')).concat('140px').join(' ');

    gridHeaders.forEach(h => {
      const cell = headerEl.querySelector(`[data-sort="${h}"]`);
      if (!cell) return;
      cell.onclick = () => {
        if (state.sortBy === h) {
          state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortBy = h;
          state.sortOrder = 'asc';
        }
        console.log('grid header clicked ->', h, state.sortBy, state.sortOrder);
        renderGrid(list);
      };
      cell.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cell.click();
        }
      };
    });
  }

  // Tear down any list virtualization
  if (list.vlist) list.vlist.destroy();

  // Prepare grid container
  list.innerHTML = '';
  list.style.display = 'grid';
  list.style.gridTemplateColumns = 'repeat(auto-fit, minmax(160px, 1fr))';
  list.style.gap = '12px';
  list.classList.add('grid');

  // Build album-centric view: group by album + condensed artist name
  const albumMap = new Map();
  for (const track of state.filteredTracks) {
    const tgs = track.tags || {};
    const album = tgs.album || 'Unknown';
    const artistRaw = tgs.artist || 'Unknown';
    // Condense artist: take first before comma or semicolon
    const artist = artistRaw.split(/[,;]/)[0].trim();
    const key = `${album}|||${artist}`;
    if (!albumMap.has(key)) {
      albumMap.set(key, {
        album,
        artist,
        artistRaw,
        art: track.albumArtDataUrl || 'assets/images/default-art.png',
        year: tgs.year || null,
        genre: tgs.genre || '',
        tracks: [],
      });
    }
    const entry = albumMap.get(key);
    if (!entry.art && track.albumArtDataUrl) entry.art = track.albumArtDataUrl;
    if (!entry.year && tgs.year) entry.year = tgs.year;
    entry.tracks.push(track);
  }

  let albums = Array.from(albumMap.values());
  // Determine sort: primary key is always state.sortBy (header-driven).
  // If gridSortByAlbum or sidebarMode==='album' is set, use album/artist as secondary tie-breakers.
  const preferAlbumSort = !!state.gridSortByAlbum || state.sidebarMode === 'album';
  const dir = state.sortOrder === 'asc' ? 1 : -1;
  const keyFor = (a) => {
    switch (state.sortBy) {
      case 'title':
      case 'album':
        return (a.album || '').toString().toLowerCase();
      case 'artist':
        return (a.artist || '').toString().toLowerCase();
      case 'year':
        return Number(a.year) || 0;
      case 'genre':
        return (a.genre || '').toString().toLowerCase();
      default:
        return (a.artist || '').toString().toLowerCase();
    }
  };
  albums.sort((A, B) => {
    const aKey = keyFor(A);
    const bKey = keyFor(B);
    // numeric vs string
    if (typeof aKey === 'number' || typeof bKey === 'number') {
      const ncmp = (aKey - bKey) * dir;
      if (ncmp !== 0) return ncmp;
    } else {
      const cmp = aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
      if (cmp !== 0) return cmp * dir;
    }
    // tie-breakers: if preferAlbumSort, try album then artist; otherwise fall back to album then artist for stability
    const albumCmp = A.album.localeCompare(B.album);
    if (albumCmp !== 0) return albumCmp * dir;
    return A.artist.localeCompare(B.artist) * dir;
  });

  if (albums.length === 0) {
    list.innerHTML = '<div style="color:#666;padding:20px;text-align:center;grid-column:1/-1;">No albums found</div>';
    return;
  }

  // Helper to apply filters and stay in grid view
  const applyGridFilter = (opts) => {
    // When clicking an album card, switch to list view showing the album's tracks.
    if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true;
    if (opts.album !== undefined) state.activeAlbum = opts.album;
    if (opts.artist !== undefined) state.activeArtist = opts.artist;
    if (opts.year !== undefined) state.activeYear = opts.year;
    // Ensure view switches to list and UI buttons reflect it
    state.viewMode = 'library';
    const filterInput = document.getElementById('filter');
    updateFilters(filterInput, state.sidebarFilteringEnabled);
    updateSidebarFilters(
      filterInput,
      document.getElementById('artist-list'),
      document.getElementById('album-list'),
      () => renderList(list),
      state.sidebarFilteringEnabled
    );
    // Render list view (tracks for selected album)
    renderList(list);
    // Update view button UI
    dom.gridViewBtn.classList.remove('active');
    dom.listViewBtn.classList.add('active');
  };

  // Determine source title when in playlist view
  const sourceTitle = (state.viewMode === 'playlist' && state.activePlaylist)
    ? (state.activePlaylist.name || state.activePlaylist.genre || '')
    : '';

  // Render album cards
  for (const a of albums) {
    const card = document.createElement('div');
    card.className = 'track-card album-card';
    const yearText = a.year ? String(a.year) : '';
    card.innerHTML = `
      <div class="queue-btn-container">
        <button class="queue-add-btn" title="Add album to Queue" style="background:none;border:none;cursor:pointer;padding:0;vertical-align:middle;"><img src="assets/images/addtoqueue.svg" alt="Add to Queue" style="width:22px;height:22px;filter:invert(1) brightness(2);transition:filter .2s;" /></button>
      </div>
      <img class="album-art" src="${a.art}" alt="Album Art" />
      <div class="track-name linkish" data-album title="${a.album}" tabindex="0">${a.album}</div>
      <div class="track-artist linkish" data-artist title="${a.artistRaw}" tabindex="0">${a.artist}</div>
      ${sourceTitle ? `<div class="grid-source" title="${sourceTitle}">${sourceTitle}</div>` : ''}
      <div class="track-year ${yearText ? 'linkish' : ''}" ${yearText ? 'data-year tabindex="0"' : ''} title="${yearText}">${a.year ? a.year + ' • ' : ''}${a.tracks.length} track${a.tracks.length !== 1 ? 's' : ''}</div>
    `;
    // Add to queue button for album (adds all tracks in album)
    card.querySelector('.queue-add-btn').onclick = (e) => {
      e.stopPropagation();
      import('../shared/state.js').then(({ addToQueue }) => {
        a.tracks.forEach(track => addToQueue(track));
        import('../ui/ui.js').then(({ showToast }) => showToast(`Added ${a.tracks.length} track${a.tracks.length!==1?'s':''} from "${a.album}" to queue`));
      });
    };
    // Card click defaults to album+artist filter and stay in grid view
    card.addEventListener('click', (e) => {
      // If inner element clicked has specific filter, let dedicated handlers run
      if (e.target && (e.target.dataset.album || e.target.dataset.artist || e.target.dataset.year)) return;
      applyGridFilter({ album: a.album, artist: a.artist });
    });
    // Right-click context menu for album cards (use shared helper)
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      const items = [];
      items.push({ label: 'Open album', onClick: () => applyGridFilter({ album: a.album, artist: a.artist }) });
      items.push({ label: 'Play album', onClick: async () => { if (!a.tracks || !a.tracks.length) return; state.viewMode = 'library'; state.activeAlbum = a.album; state.filteredTracks = a.tracks.slice(); renderList(list); const { playTrack } = await import('../player/playerCore.js'); playTrack(a.tracks[0], 0, document.getElementById('audio'), document.getElementById('play-btn'), document.getElementById('current-art'), document.getElementById('current-title'), document.getElementById('current-artist'), () => renderList(list)); } });
      items.push({ label: 'Queue album', onClick: () => import('../shared/state.js').then(({ addToQueue }) => { a.tracks.forEach(track => addToQueue(track)); import('../ui/ui.js').then(({ showToast }) => showToast(`Added ${a.tracks.length} track${a.tracks.length!==1?'s':''} from "${a.album}" to queue`)); }) });
      items.push({ label: 'Add to playlist…', onClick: () => {
        // Close any open ephemeral panels first
        document.querySelectorAll('.playlist-popup').forEach(p => p.remove());
        import('../playlist/playlists.js')
          .then(({ playlists }) => import(new URL('../shared/playlistPopup.js', import.meta.url).href).then(({ showPlaylistPopup }) => showPlaylistPopup(e, a.tracks.slice(), { playlists })))
          .catch(async (err) => {
            console.error('Failed to open playlist popup for album', err);
            try { const { showToast } = await import('../ui/ui.js'); showToast('Could not open playlist menu'); } catch (_) {}
          });
      } });
      items.push({ label: 'Reveal in Explorer', onClick: () => { const path = a.tracks[0]?.filePath || a.tracks[0]?.file || null; if (!path) { import('../ui/ui.js').then(({ showToast }) => showToast('No file path available')); return; } if (window.etune && typeof window.etune.revealFile === 'function') window.etune.revealFile(path); else if (window.etune && typeof window.etune.revealInFolder === 'function') window.etune.revealInFolder(path); else if (window.require) { try { const { shell } = window.require('electron'); shell.showItemInFolder(path); } catch (err) { import('../ui/ui.js').then(({ showToast }) => showToast('Reveal not available')); } } else import('../ui/ui.js').then(({ showToast }) => showToast('Reveal not supported')); } });
      items.push({ label: 'Copy file path', onClick: () => { const path = a.tracks[0]?.filePath || a.tracks[0]?.file || ''; navigator.clipboard?.writeText(path).catch(() => {}); } });

      import('../shared/contextMenu.js').then(({ showContextMenu }) => showContextMenu(e, items));
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyGridFilter({ album: a.album, artist: a.artist }); }
    });
    card.setAttribute('tabindex', '0');
    // Click-to-filter within grid, stay in grid
    const nameEl = () => card.querySelector('[data-album]');
    const artistEl = () => card.querySelector('[data-artist]');
    const yearEl = () => card.querySelector('[data-year]');
    card.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.hasAttribute('data-album')) {
        e.stopPropagation();
        applyGridFilter({ album: a.album });
      } else if (t.hasAttribute('data-artist')) {
        e.stopPropagation();
        applyGridFilter({ artist: a.artist });
      } else if (t.hasAttribute('data-year')) {
        e.stopPropagation();
        applyGridFilter({ year: yearText });
      }
    });
    const focusables = card.querySelectorAll('[data-album],[data-artist],[data-year]');
    focusables.forEach((el) => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (el.hasAttribute('data-album')) applyGridFilter({ album: a.album });
          else if (el.hasAttribute('data-artist')) applyGridFilter({ artist: a.artist });
          else if (el.hasAttribute('data-year')) applyGridFilter({ year: yearText });
        }
      });
    });
    list.appendChild(card);
  }
}
