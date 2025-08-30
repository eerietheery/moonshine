import { playlists, getPlaylistTracks } from './playlists.js';
import { state } from '../shared/state.js';
import * as dom from '../../dom.js';
import { renderList } from '../shared/view.js';
import { showToast } from '../ui/ui.js';

// Public API: render playlist browse using current toolbar mode (list/grid)
export function renderPlaylistBrowse(container) {
  const useGrid = dom.gridViewBtn.classList.contains('active');
  if (useGrid) return renderPlaylistBrowseGrid(container);
  return renderPlaylistBrowseList(container);
}

function getAllPlaylistItems() {
  const items = [];
  // User playlists
  for (const pl of playlists.user) {
    items.push({ key: pl.id, title: pl.name, type: 'user', id: pl.id });
  }
  // Smart (genres)
  Object.keys(playlists.smart).sort((a,b) => a.localeCompare(b)).forEach(genre => {
    items.push({ key: `g:${genre}`, title: genre, type: 'smart', genre });
  });
  return items;
}

function resolveTracks(item) {
  if (item.type === 'user') return getPlaylistTracks({ type: 'user', id: item.id });
  return getPlaylistTracks({ type: 'smart', genre: item.genre });
}

function openPlaylist(item) {
  const tracks = resolveTracks(item);
  state.viewMode = 'playlist';
  state.activePlaylist = item.type === 'user'
    ? { type: 'user', id: item.id, name: item.title }
    : { type: 'smart', genre: item.genre };
  state.filteredTracks = tracks.slice();
  state.sortBy = 'artist';
  state.sortOrder = 'asc';
  // Ensure toolbar reflects List mode when opening a playlist from Grid/Browse
  try {
    const gridBtn = document.getElementById('grid-view');
    const listBtn = document.getElementById('list-view');
    gridBtn?.classList.remove('active');
    listBtn?.classList.add('active');
  } catch (_) {}
  // Unhide main header container in case browse grid hid it
  const header = document.querySelector('#music-table .table-header');
  if (header) { header.classList.remove('hidden'); header.style.display = ''; }
  renderList(dom.list);
}

async function queueAll(item) {
  const tracks = resolveTracks(item);
  if (!tracks.length) return showToast('Playlist is empty');
  const { addToQueue } = await import('../shared/state.js');
  tracks.forEach(t => addToQueue(t));
  showToast(`Queued ${tracks.length} track${tracks.length===1?'':'s'}`);
}

async function playNow(item) {
  const tracks = resolveTracks(item);
  if (!tracks.length) return showToast('Playlist is empty');
  state.viewMode = 'playlist';
  state.activePlaylist = item.type === 'user'
    ? { type: 'user', id: item.id, name: item.title }
    : { type: 'smart', genre: item.genre };
  state.filteredTracks = tracks.slice();
  renderList(dom.list);
  const { playTrack } = await import('../player/playerCore.js');
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
}

export function renderPlaylistBrowseGrid(container) {
  const items = getAllPlaylistItems();
  // Hide the main table header while in playlist browse grid mode
  const header = document.querySelector('#music-table .table-header');
  if (header) { header.classList.add('hidden'); header.style.display = 'none'; }
  container.innerHTML = '';
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(160px, 1fr))';
  container.style.gap = '12px';
  container.classList.add('grid');
  for (const it of items) {
    const tracks = resolveTracks(it);
    const count = tracks.length;
    const art = tracks[0]?.albumArtDataUrl || 'assets/images/default-art.png';
    const card = document.createElement('div');
    card.className = 'track-card playlist-card';
    card.innerHTML = `
      <div class="playlist-card-actions">
        <button class="pl-action play" title="Play">▶</button>
        <button class="pl-action queue" title="Queue All">＋</button>
      </div>
      <img class="album-art" src="${art}" alt="Playlist" />
      <div class="track-name" title="${it.title}">${it.title}</div>
      <div class="track-artist">${count} track${count===1?'':'s'} • ${it.type==='user'?'Playlist':'Genre'}</div>
    `;
    card.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.classList && t.classList.contains('pl-action')) return; // button handled separately
      openPlaylist(it);
    });
    // Right-click context menu (use shared helper)
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      import('./playlists.js').then(({ showPlaylistContextMenu }) => showPlaylistContextMenu(e, card, it, it.title));
    });
    card.querySelector('.pl-action.play').onclick = (e) => { e.stopPropagation(); playNow(it); };
    card.querySelector('.pl-action.queue').onclick = (e) => { e.stopPropagation(); queueAll(it); };
    container.appendChild(card);
  }
}

export function renderPlaylistBrowseList(container) {
  const items = getAllPlaylistItems();
  container.classList.remove('grid');
  container.style.display = '';
  container.style.gridTemplateColumns = '';
  container.style.gap = '';
  container.innerHTML = '';
  const actionsWidthPx = window.innerWidth <= 700 ? 90 : window.innerWidth <= 768 ? 100 : 140;
  const tpl = `3fr 1.5fr 1fr ${actionsWidthPx}px`;
  const musicTable = document.getElementById('music-table');
  // Move header outside the music list container for proper alignment
  let header = musicTable?.querySelector('.table-header');
  if (!header) {
    header = document.createElement('div');
    header.className = 'table-header';
    const headerInner = document.createElement('div');
    headerInner.className = 'table-header-inner';
    header.appendChild(headerInner);
  }
  // Always insert header before #music-list
  if (musicTable && header.nextSibling !== container) {
    musicTable.insertBefore(header, container);
  }
  header.classList.remove('hidden');
  header.style.display = '';
  let headerInner = header.querySelector('.table-header-inner');
  if (!headerInner) {
    headerInner = document.createElement('div');
    headerInner.className = 'table-header-inner';
    header.appendChild(headerInner);
  }
  // Reset header offset to ensure no stale transform
  headerInner.style.setProperty('--header-offset', '0px');
  // Use standard header classes for consistent padding
  headerInner.innerHTML = '<div class="col-title">Name</div><div class="col-artist">Type</div><div class="col-album">Count</div><div class="col-actions"></div>';
  // Apply grid template via CSS var for alignment with rows
  musicTable?.style.setProperty('--music-grid-template', tpl);
  musicTable?.style.setProperty('--actions-width', `${actionsWidthPx}px`);
  header.style.gridTemplateColumns = tpl; // harmless, inner uses CSS var
  headerInner.style.gridTemplateColumns = '';
  for (const it of items) {
    const tracks = resolveTracks(it);
    const count = tracks.length;
    const art = tracks[0]?.albumArtDataUrl || 'assets/images/default-art.png';
    const row = document.createElement('div');
    row.className = 'track playlist-browse-row';
    row.innerHTML = `
      <div class="track-title"><img class="album-art" src="${art}" alt="" /><span class="track-name">${it.title}</span></div>
      <div class="track-artist">${it.type==='user'?'Playlist':'Genre'}</div>
      <div class="track-album">${count}</div>
      <div class="track-actions">
        <button class="queue-add-btn" title="Queue All"><img src="assets/images/addtoqueue.svg" alt="Queue All" style="width:22px;height:22px;filter:grayscale(1) opacity(0.7);"/></button>
        <button class="playlist-add-btn" title="Play"><img src="assets/images/play-centered.svg" alt="Play" style="width:22px;height:22px;filter:grayscale(1) opacity(0.7);"/></button>
      </div>
    `;
    row.addEventListener('click', () => openPlaylist(it));
    // Right-click context menu
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault(); e.stopPropagation();
      import('./playlists.js').then(({ showPlaylistContextMenu }) => showPlaylistContextMenu(e, row, it, it.title));
    });
    row.querySelector('.queue-add-btn').onclick = (e) => { e.stopPropagation(); queueAll(it); };
    row.querySelector('.playlist-add-btn').onclick = (e) => { e.stopPropagation(); playNow(it); };
    container.appendChild(row);
  }
}
