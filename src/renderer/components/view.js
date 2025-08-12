// List and grid rendering logic
import { state, updateFilters } from './state.js';
import { createTrackElement } from './ui.js';
import { VirtualList } from './virtualList.js';
import { playTrack } from './playerCore.js';
import { updateSidebarFilters } from './sidebar.js';
import * as dom from '../dom.js';
import { getPlaylistTracks } from './playlists.js';
import { showToast } from './ui.js';
import { renderPlaylistBrowse } from './playlistBrowse.js';

export function renderList(list) {
  // If in playlist mode and we have an active playlist, show header
  const headerHost = dom.playlistHeader;
  if (state.viewMode === 'playlist' && state.activePlaylist && headerHost) {
    renderPlaylistHeader(headerHost, state.activePlaylist);
    // Replace main table headers with playlist-specific headers
    const headerEl = document.querySelector('#music-table .table-header');
    if (headerEl) {
      headerEl.innerHTML = [
        '<div class="col-title">Title</div>',
        '<div class="col-artist">Artist</div>',
        '<div class="col-album">Album</div>',
        '<div class="col-year">Year</div>',
        '<div class="col-genre">Genre</div>',
        '<div class="col-actions"></div>'
      ].join('');
      headerEl.style.gridTemplateColumns = '3fr 2fr 2fr 1fr 1fr 140px';
      headerEl.classList.remove('hidden');
    }
  } else if (headerHost) {
    headerHost.classList.remove('visible');
    headerHost.style.display = 'none';
    headerHost.innerHTML = '';
  }
  // If browsing playlists (no specific selection), render browser and exit
  if (state.viewMode === 'playlist' && !state.activePlaylist) {
    renderPlaylistBrowse(list);
    return;
  }
  let filtered = [...state.filteredTracks];
  // If favorite view is enabled, filter to favorites only
  if (state.favoriteViewEnabled) {
    filtered = filtered.filter(t => t.favorite);
  }
  // If user is viewing a specific album, prefer sorting by track number (when available)
  const isAlbumFocused = !!state.activeAlbum && filtered.length > 1 && filtered.every(t => (t.tags.album || 'Unknown') === state.activeAlbum);
  const sorted = isAlbumFocused
    ? filtered.slice().sort((a, b) => {
        const aNum = (typeof a.tags.track === 'number' ? a.tags.track : parseInt(a.tags.track)) || 0;
        const bNum = (typeof b.tags.track === 'number' ? b.tags.track : parseInt(b.tags.track)) || 0;
        if (aNum !== bNum) return state.sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
        // Fallback to title to keep ordering stable when track numbers are missing or equal
        const aTitle = (a.tags.title || a.file).toLowerCase();
        const bTitle = (b.tags.title || b.file).toLowerCase();
        const tcmp = aTitle < bTitle ? -1 : aTitle > bTitle ? 1 : 0;
        return state.sortOrder === 'asc' ? tcmp : -tcmp;
      })
    : filtered.sort((a, b) => {
        let aVal = (a.tags[state.sortBy] || '').toString().toLowerCase();
        let bVal = (b.tags[state.sortBy] || '').toString().toLowerCase();
        if (state.sortBy === 'year') {
          aVal = parseInt(aVal) || 0;
          bVal = parseInt(bVal) || 0;
        }
        const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return state.sortOrder === 'asc' ? result : -result;
      });
  list.style.display = '';
  list.style.gridTemplateColumns = '';
  list.style.gap = '';
  list.classList.remove('grid');
  if (list.vlist) list.vlist.destroy();

  // Hide header if loading spinner is present
  const headerEl = document.querySelector('#music-table .table-header');
  if (headerEl && (!state.tracks || !state.tracks.length)) {
    headerEl.classList.add('hidden');
  }

  if (sorted.length === 0) {
    list.innerHTML = `<div style="color:#666;padding:20px;text-align:center;">${state.favoriteViewEnabled ? 'No favorite tracks found' : 'No tracks found'}</div>`;
    return;
  }
// Add favorite view toggle button to the UI (one-time setup)
if (!window.favoriteViewBtnSetup) {
  window.favoriteViewBtnSetup = true;
  window.addEventListener('DOMContentLoaded', () => {
    const controls = document.getElementById('main-controls') || document.body;
    const favBtn = document.createElement('button');
    favBtn.id = 'favorite-view-btn';
    favBtn.title = 'Show only favorites';
    favBtn.style.background = 'none';
    favBtn.style.border = 'none';
    favBtn.style.cursor = 'pointer';
    favBtn.style.marginLeft = '12px';
    favBtn.innerHTML = `<img src="assets/images/heart.svg" style="width:24px;height:24px;vertical-align:middle;filter:grayscale(1) opacity(0.7);transition:filter 0.2s;" />`;
    favBtn.onclick = () => {
      import('./state.js').then(({ state }) => {
        state.favoriteViewEnabled = !state.favoriteViewEnabled;
        favBtn.querySelector('img').style.filter = state.favoriteViewEnabled ? 'drop-shadow(0 0 4px #e74c3c) saturate(2)' : 'grayscale(1) opacity(0.7)';
        favBtn.title = state.favoriteViewEnabled ? 'Show all tracks' : 'Show only favorites';
        renderList(document.getElementById('music-list'));
      });
    };
    controls.appendChild(favBtn);
  });
}

// Render playlist header section when viewing a playlist
function renderPlaylistHeader(container, source) {
  const tracks = getPlaylistTracks(source);
  const title = source.type === 'user' ? (source.name || 'Playlist') : (source.genre || 'Playlist');
  const count = tracks.length;
  container.innerHTML = '';
  const artUrl = tracks[0]?.albumArtDataUrl || 'assets/images/default-art.png';
  const meta = document.createElement('div');
  meta.className = 'playlist-meta';
  const row = document.createElement('div');
  row.className = 'playlist-title-row';
  // Optional cover image (small) for quick visual cue
  const img = document.createElement('img');
  img.className = 'album-art';
  img.src = artUrl;
  img.alt = 'Playlist cover';
  img.style.width = '44px';
  img.style.height = '44px';
  img.style.objectFit = 'cover';
  img.style.borderRadius = '6px';
  const titleEl = document.createElement('div');
  titleEl.className = 'playlist-title';
  titleEl.textContent = title;
  titleEl.title = title;
  const badge = document.createElement('div');
  badge.className = 'playlist-badge';
  badge.textContent = source.type === 'user' ? 'Playlist' : 'Genre';
  row.appendChild(img);
  row.appendChild(titleEl);
  row.appendChild(badge);
  const subtitle = document.createElement('div');
  subtitle.className = 'playlist-subtitle';
  subtitle.textContent = `${count} track${count===1?'':'s'}`;
  meta.appendChild(row);
  meta.appendChild(subtitle);
  const actions = document.createElement('div');
  actions.className = 'playlist-actions-bar';
  const playBtn = document.createElement('button');
  playBtn.id = 'pl-play';
  playBtn.className = 'primary';
  playBtn.textContent = 'Play';
  const queueBtn = document.createElement('button');
  queueBtn.id = 'pl-queue';
  queueBtn.textContent = 'Queue All';
  actions.appendChild(playBtn);
  actions.appendChild(queueBtn);
  container.appendChild(meta);
  container.appendChild(actions);
  container.style.display = 'grid';
  container.classList.add('visible');
  playBtn.onclick = async () => {
    if (!tracks.length) return showToast('Playlist is empty');
    state.filteredTracks = tracks.slice();
    renderList(dom.list);
    const { playTrack } = await import('./playerCore.js');
    playTrack(
      tracks[0],
      0,
      document.getElementById('audio'),
      document.getElementById('play-btn'),
      document.getElementById('current-art'),
      document.getElementById('current-title'),
      document.getElementById('current-artist'),
      () => renderList(dom.list)
    );
  };
  queueBtn.onclick = async () => {
    if (!tracks.length) return showToast('Playlist is empty');
    const { addToQueue } = await import('./state.js');
    tracks.forEach(t => addToQueue(t));
    showToast(`Queued ${tracks.length} track${tracks.length===1?'':'s'}`);
  };
}
  // Remove legacy dynamic header row if present
  const legacyHeader = document.getElementById('music-list-headers');
  if (legacyHeader) legacyHeader.remove();

  // Use existing static header container from index.html and populate dynamically
  const headerContainer = document.querySelector('#music-table .table-header');
  const headers = state.listHeaders && state.listHeaders.length ? state.listHeaders : ['title','artist','album','year','genre'];
  if (headerEl && state.tracks && state.tracks.length) {
    headerEl.classList.remove('hidden');
    const headerLabels = {
      title: 'Title',
      artist: 'Artist',
      album: 'Album',
      year: 'Year',
      genre: 'Genre',
      bitrate: 'Bit Rate'
    };
    headerEl.innerHTML = headers.map(h => {
      const isActive = state.sortBy === h;
      const arrow = isActive ? (state.sortOrder === 'asc' ? '↑' : '↓') : '';
      return `<div class="col-${h} sort-header${isActive ? ' active-sort' : ''}" tabindex="0" role="button" data-sort="${h}" title="Sort by ${headerLabels[h] || h}">${headerLabels[h] || h} <span class="sort-arrow">${arrow}</span></div>`;
    }).join('') + '<div class="col-actions"></div>';
    // Column width mapping similar to original proportions
  const colWidths = { title: '3fr', artist: '2fr', album: '2fr', year: '1fr', genre: '1fr', bitrate: '1fr' };
  const template = headers.map(h => colWidths[h] || '1fr').concat('140px').join(' ');
    headerEl.style.gridTemplateColumns = template;

    // Add click/keyboard handlers for sorting
    headers.forEach(h => {
      const cell = headerEl.querySelector(`[data-sort="${h}"]`);
      if (!cell) return;
      cell.addEventListener('click', () => {
        if (state.sortBy === h) {
          state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortBy = h;
          state.sortOrder = 'asc';
        }
        renderList(document.getElementById('music-list'));
      });
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cell.click();
        }
      });
    });
  }

  // Precompute grid template for rows (headers + actions)
  const colWidths = { title: '3fr', artist: '2fr', album: '2fr', year: '1fr', genre: '1fr', bitrate: '1fr' };
  const rowTemplate = (state.listHeaders && state.listHeaders.length ? state.listHeaders : ['title','artist','album','year','genre'])
    .map(h => colWidths[h] || '1fr').concat('140px').join(' ');
  // Render rows using original track element for styling and selection, but only selected headers
  list.vlist = new VirtualList({
    container: list,
    rowHeight: 56,
    total: sorted.length,
    renderRow: (i) => {
      const track = sorted[i];
      const filteredIndex = state.filteredTracks.findIndex(t => t.filePath === track.filePath);
      const el = createTrackElement(
        track,
        () => playTrack(
          track,
          filteredIndex,
          document.getElementById('audio'),
          document.getElementById('play-btn'),
          document.getElementById('current-art'),
          document.getElementById('current-title'),
          document.getElementById('current-artist'),
          () => renderList(list)
        ),
        state.listHeaders
      );
      el.style.gridTemplateColumns = rowTemplate;
      if (state.currentTrack && state.currentTrack.filePath === track.filePath) {
        el.classList.add('playing');
      }
      return el;
    }
  });
}

export function renderGrid(list) {
  // Declare headerEl and gridHeaders once at the top
  const headerEl = document.querySelector('#music-table .table-header');
  const gridHeaders = state.listHeaders && state.listHeaders.length ? state.listHeaders : ['title','artist','album','year','genre'];

  // Show header in grid view
  if (headerEl) headerEl.classList.remove('hidden');

  // Add click/keyboard handlers for sorting in grid view
  if (headerEl && state.tracks && state.tracks.length) {
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

  // Build album-centric view: group by album + artist
  const albumMap = new Map();
  for (const track of state.filteredTracks) {
    const tgs = track.tags || {};
    const album = tgs.album || 'Unknown';
    const artist = tgs.artist || 'Unknown';
    const key = `${album}|||${artist}`;
    if (!albumMap.has(key)) {
      albumMap.set(key, {
        album,
        artist,
        art: track.albumArtDataUrl || 'assets/images/default-art.png',
        year: tgs.year || null,
        tracks: [],
      });
    }
    const entry = albumMap.get(key);
    if (!entry.art && track.albumArtDataUrl) entry.art = track.albumArtDataUrl;
    if (!entry.year && tgs.year) entry.year = tgs.year;
    entry.tracks.push(track);
  }

  const albums = Array.from(albumMap.values())
    .sort((a, b) => a.artist.localeCompare(b.artist) || a.album.localeCompare(b.album));

  if (albums.length === 0) {
    list.innerHTML = '<div style="color:#666;padding:20px;text-align:center;grid-column:1/-1;">No albums found</div>';
    return;
  }

  // Helper to apply filters and stay in grid view
  const applyGridFilter = (opts) => {
    if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true;
    if (opts.album !== undefined) state.activeAlbum = opts.album;
    if (opts.artist !== undefined) state.activeArtist = opts.artist;
    if (opts.year !== undefined) state.activeYear = opts.year;
    const filterInput = document.getElementById('filter');
    updateFilters(filterInput, state.sidebarFilteringEnabled);
    updateSidebarFilters(
      filterInput,
      document.getElementById('artist-list'),
      document.getElementById('album-list'),
      () => renderList(list),
      state.sidebarFilteringEnabled
    );
    // Re-render grid to reflect filtered set
    renderGrid(list);
  };

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
      <div class="track-artist linkish" data-artist title="${a.artist}" tabindex="0">${a.artist}</div>
      <div class="track-year ${yearText ? 'linkish' : ''}" ${yearText ? 'data-year tabindex="0"' : ''} title="${yearText}">${a.year ? a.year + ' • ' : ''}${a.tracks.length} track${a.tracks.length !== 1 ? 's' : ''}</div>
    `;
    // Add to queue button for album (adds all tracks in album)
    card.querySelector('.queue-add-btn').onclick = (e) => {
      e.stopPropagation();
      import('./state.js').then(({ addToQueue }) => {
        a.tracks.forEach(track => addToQueue(track));
        import('./ui.js').then(({ showToast }) => showToast(`Added ${a.tracks.length} track${a.tracks.length!==1?'s':''} from "${a.album}" to queue`));
      });
    };
    // Card click defaults to album+artist filter and stay in grid view
    card.addEventListener('click', (e) => {
      // If inner element clicked has specific filter, let dedicated handlers run
      if (e.target && (e.target.dataset.album || e.target.dataset.artist || e.target.dataset.year)) return;
      applyGridFilter({ album: a.album, artist: a.artist });
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
