// List and grid rendering logic
import { state, updateFilters } from './state.js';
import { createTrackElement } from './ui.js';
import { VirtualList } from './virtualList.js';
import { playTrack } from './player.js';
import { updateSidebarFilters } from './sidebar.js';

export function renderList(list) {
  let filtered = [...state.filteredTracks];
  // If favorite view is enabled, filter to favorites only
  if (state.favoriteViewEnabled) {
    filtered = filtered.filter(t => t.favorite);
  }
  const sorted = filtered.sort((a, b) => {
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
    const template = headers.map(h => colWidths[h] || '1fr').concat('96px').join(' ');
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
    .map(h => colWidths[h] || '1fr').concat('96px').join(' ');
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

  // Helper to apply filters and switch to list view
  const applyAndShowList = (album, artist) => {
    if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true;
    state.activeAlbum = album || null;
    state.activeArtist = artist || null;
    const filterInput = document.getElementById('filter');
    updateFilters(filterInput, state.sidebarFilteringEnabled);
    updateSidebarFilters(
      filterInput,
      document.getElementById('artist-list'),
      document.getElementById('album-list'),
      () => renderList(list),
      state.sidebarFilteringEnabled
    );
    // Switch buttons
    const gridBtn = document.getElementById('grid-view');
    const listBtn = document.getElementById('list-view');
    if (gridBtn && listBtn) {
      gridBtn.classList.remove('active');
      listBtn.classList.add('active');
    }
    // Switch container to list
    list.classList.remove('grid');
    list.style.display = '';
    list.style.gridTemplateColumns = '';
    list.style.gap = '';
    renderList(list);
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
    // Card click defaults to album+artist filter and switch to list
    card.addEventListener('click', (e) => {
      // If inner element clicked has specific filter, let dedicated handlers run
      if (e.target && (e.target.dataset.album || e.target.dataset.artist || e.target.dataset.year)) return;
      applyAndShowList(a.album, a.artist);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyAndShowList(a.album, a.artist); }
    });
    card.setAttribute('tabindex', '0');
    // Click-to-filter within grid, stay in grid
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
