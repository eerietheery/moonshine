// Playlist system: user playlists and smart (genre) playlists
import { state } from '../shared/state.js';
import { createFilterItem } from '../ui/ui.js';
import { getAlbumArtUrl } from '../../utils/albumArtCache.js';

/**
 * Get representative album art for a playlist (from its first track)
 */
function getPlaylistAlbumArt(playlist) {
  if (!playlist.trackPaths || !playlist.trackPaths.length) return null;
  const firstTrackPath = playlist.trackPaths[0];
  const track = state.tracks.find(t => t.filePath === firstTrackPath);
  return track ? getAlbumArtUrl(track) : null;
}

/**
 * Get representative album art for a genre (from first track of that genre)
 */
function getGenreAlbumArt(genre) {
  const track = state.tracks.find(t => (t.tags && t.tags.genre || 'Unknown') === genre);
  return track ? getAlbumArtUrl(track) : null;
}

// Data model (renderer-side cache). Persisted in main config under `playlists`.
// User playlist shape: { id, name, trackPaths: string[], createdAt, updatedAt }
export const playlists = {
  user: [], // loaded from config
  smart: {}, // computed: { GenreName: string[] filePaths }
};

// Load from persisted config
export async function loadPlaylists() {
  const cfg = await window.etune.getConfig();
  playlists.user = Array.isArray(cfg?.playlists) ? cfg.playlists : [];
  buildSmartPlaylists();
}

// Persist to config
export async function savePlaylists() {
  await window.etune.updateConfig({ playlists: playlists.user });
}

// Smart playlists by genre (derived, not persisted)
export function buildSmartPlaylists() {
  const map = {};
  for (const t of state.tracks) {
    const g = (t.tags?.genre || 'Unknown').toString().trim();
    if (!map[g]) map[g] = new Set();
    map[g].add(t.filePath);
  }
  playlists.smart = Object.fromEntries(Object.entries(map).map(([g, set]) => [g, Array.from(set)]));
}

// CRUD for user playlists
export function createPlaylist(name) {
  const id = 'pl_' + Math.random().toString(36).slice(2, 10);
  const now = Date.now();
  const pl = { id, name: name?.trim() || 'New Playlist', trackPaths: [], createdAt: now, updatedAt: now };
  playlists.user.push(pl);
  savePlaylists();
  document.dispatchEvent(new CustomEvent('playlists:changed'));
  return pl;
}

export function renamePlaylist(id, nextName) {
  const pl = playlists.user.find(p => p.id === id);
  if (!pl) return;
  pl.name = nextName?.trim() || pl.name;
  pl.updatedAt = Date.now();
  savePlaylists();
  document.dispatchEvent(new CustomEvent('playlists:changed'));
}

export function deletePlaylist(id) {
  const idx = playlists.user.findIndex(p => p.id === id);
  if (idx !== -1) {
    playlists.user.splice(idx, 1);
  savePlaylists();
  document.dispatchEvent(new CustomEvent('playlists:changed'));
  }
}

// Track open menu so only one exists at a time
let _openPlaylistMenu = null;

// Reusable context menu for playlist entries (used by sidebar, grid, and list views)
export async function showPlaylistContextMenu(e, anchorEl, data, label) {
  e.preventDefault(); e.stopPropagation();
  // If a menu is open, close it. If the same anchor triggered and menu is open, this acts like a toggle (close only).
  if (_openPlaylistMenu) {
    const prev = _openPlaylistMenu;
    _openPlaylistMenu = null;
    prev.remove();
    // If the previous menu was opened for the same anchor, don't reopen
    if (prev.__anchor === anchorEl) return;
  }
  // Close any ephemeral add-to-playlist panels to avoid overlap
  document.querySelectorAll('.playlist-popup').forEach(p => p.remove());

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  // mark anchor for toggle detection
  menu.__anchor = anchorEl;
  Object.assign(menu.style, {
    position: 'fixed', zIndex: '10000', background: 'var(--sidebar-bg, #1f1f1f)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', minWidth: '180px', padding: '6px 0'
  });
  const addItem = (labelText, handler) => {
    const item = document.createElement('div');
    item.textContent = labelText; item.tabIndex = 0; item.style.padding = '8px 12px'; item.style.cursor = 'pointer';
    item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.06)';
    item.onmouseleave = () => item.style.background = 'transparent';
    item.onclick = () => { handler(); close(); };
    item.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); item.click(); } };
    menu.appendChild(item);
  };

  // Play now
  addItem('Play now', async () => {
    const tracks = getPlaylistTracks(data);
    const listEl = document.getElementById('music-list');
    import('../shared/state.js').then(({ state }) => { state.filteredTracks = tracks.slice(); });
    const { renderList } = await import('../shared/view.js');
    renderList(listEl);
    if (tracks.length) {
      const { playTrack } = await import('./player/playerCore.js');
      playTrack(
        tracks[0],
        0,
        document.getElementById('audio'),
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        () => renderList(listEl)
      );
    } else {
      const { showToast } = await import('../ui/ui.js');
      showToast('Playlist is empty');
    }
  });

  // Queue all
  addItem('Queue all', async () => {
    const tracks = getPlaylistTracks(data);
    const { addToQueue } = await import('../shared/state.js');
    tracks.forEach(t => addToQueue(t));
    const { showToast } = await import('../ui/ui.js');
    showToast(`Queued ${tracks.length} track${tracks.length===1?'':'s'}`);
  });

  // User-only actions
  if (data.type === 'user') {
    addItem('Rename…', () => {
      const next = prompt('Rename playlist', label);
      if (next) renamePlaylist(data.id, next);
    });
    addItem('Delete…', () => {
      import('../../ui/confirmModal.js').then(({ showConfirmModal }) => {
        showConfirmModal({ title: 'Delete playlist', message: `Delete playlist "${label}"? This cannot be undone.`, okText: 'Delete', cancelText: 'Cancel' })
          .then((ok) => { if (ok) deletePlaylist(data.id); });
      });
    });
    addItem('Export as M3U…', async () => {
      const { exportM3U } = await import('../../utils/exportM3U.js');
      const pl = playlists.user.find(p => p.id === data.id);
      if (!pl) return;
      const m3u = exportM3U(pl, state.tracks);
      const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (pl.name || 'playlist') + '.m3u';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    });
  }

  // Position and attach
  const rect = anchorEl.getBoundingClientRect();
  menu.style.left = `${Math.min(e.clientX || rect.left, window.innerWidth - 220)}px`;
  menu.style.top = `${Math.min(e.clientY || rect.bottom + 4, window.innerHeight - 260)}px`;
  document.body.appendChild(menu);
  _openPlaylistMenu = menu;
  const close = () => { if (!_openPlaylistMenu) return; _openPlaylistMenu.remove(); _openPlaylistMenu = null; document.removeEventListener('click', onDoc, true); document.removeEventListener('keydown', onKey, true); };
  const onDoc = (ev) => { if (!_openPlaylistMenu) return; if (!menu.contains(ev.target)) close(); };
  const onKey = (ev) => { if (ev.key === 'Escape') close(); };
  setTimeout(() => { document.addEventListener('click', onDoc, true); document.addEventListener('keydown', onKey, true); }, 0);
}

export function addToPlaylist(id, track) {
  const pl = playlists.user.find(p => p.id === id);
  if (!pl || !track) return;
  if (!pl.trackPaths.includes(track.filePath)) {
    pl.trackPaths.push(track.filePath);
    pl.updatedAt = Date.now();
  savePlaylists();
  document.dispatchEvent(new CustomEvent('playlists:changed'));
  }
}

export function removeFromPlaylist(id, filePath) {
  const pl = playlists.user.find(p => p.id === id);
  if (!pl) return;
  const i = pl.trackPaths.indexOf(filePath);
  if (i !== -1) {
    pl.trackPaths.splice(i, 1);
    pl.updatedAt = Date.now();
  savePlaylists();
  document.dispatchEvent(new CustomEvent('playlists:changed'));
  }
}

// Resolve playlist to tracks for rendering/playing
export function getPlaylistTracks(source) {
  // source can be { type: 'user', id } or { type: 'smart', genre }
  if (!source) return [];
  if (source.type === 'user') {
    const pl = playlists.user.find(p => p.id === source.id);
    if (!pl) return [];
    const map = new Map(state.tracks.map(t => [t.filePath, t]));
    return pl.trackPaths.map(p => map.get(p)).filter(Boolean);
  }
  if (source.type === 'smart') {
    const paths = playlists.smart[source.genre] || [];
    const map = new Map(state.tracks.map(t => [t.filePath, t]));
    return paths.map(p => map.get(p)).filter(Boolean);
  }
  return [];
}

// Sidebar wiring helpers (non-invasive)
export function renderPlaylistsSidebar(sectionUser, sectionSmart, onSelect) {
  sectionUser.innerHTML = '';
  // User playlists: build with createFilterItem so structure matches artist/album lists
  const userFrag = document.createDocumentFragment();
  playlists.user.forEach(pl => {
    const count = Array.isArray(pl.trackPaths) ? pl.trackPaths.length : 0;
    const isActive = state.activePlaylist && state.activePlaylist.type === 'user' && state.activePlaylist.id === pl.id;
    const albumArt = getPlaylistAlbumArt(pl);
    const item = createFilterItem(pl.name, count, !!isActive, albumArt);
    // attach handlers similar to other filter-items
    item.onclick = (e) => { e.stopPropagation(); onSelect({ type: 'user', id: pl.id }); };
    item.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); } };
    item.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); showPlaylistContextMenu(e, item, { type: 'user', id: pl.id }, pl.name); };
    userFrag.appendChild(item);
  });
  sectionUser.appendChild(userFrag);

  // Smart playlists by genre
  sectionSmart.innerHTML = '';
  const smartFrag = document.createDocumentFragment();
  Object.keys(playlists.smart).sort((a,b) => a.localeCompare(b)).forEach(genre => {
    const cnt = Array.isArray(playlists.smart[genre]) ? playlists.smart[genre].length : 0;
    const isActive = state.activePlaylist && state.activePlaylist.type === 'smart' && state.activePlaylist.genre === genre;
    const albumArt = getGenreAlbumArt(genre);
    const item = createFilterItem(genre, cnt, !!isActive, albumArt);
    item.onclick = (e) => { e.stopPropagation(); onSelect({ type: 'smart', genre }); };
    item.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); } };
    item.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); showPlaylistContextMenu(e, item, { type: 'smart', genre }, genre); };
    smartFrag.appendChild(item);
  });
  sectionSmart.appendChild(smartFrag);
}
