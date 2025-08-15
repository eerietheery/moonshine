// Playlist system: user playlists and smart (genre) playlists
import { state } from '../shared/state.js';

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
  // User playlists
  sectionUser.innerHTML = '';
  const makeItem = (label, data) => {
    const li = document.createElement('div');
    li.className = 'filter-item';
    li.tabIndex = 0;
    li.textContent = label;
    li.onclick = () => onSelect(data);
    li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); } };
    // Context menu actions
    li.oncontextmenu = async (e) => {
      e.preventDefault(); e.stopPropagation();
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      Object.assign(menu.style, {
        position: 'fixed', zIndex: '10000', background: 'var(--sidebar-bg, #1f1f1f)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', minWidth: '180px', padding: '6px 0'
      });
      const addItem = (label, handler) => {
        const item = document.createElement('div');
        item.textContent = label; item.tabIndex = 0; item.style.padding = '8px 12px'; item.style.cursor = 'pointer';
        item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.06)';
        item.onmouseleave = () => item.style.background = 'transparent';
        item.onclick = () => { handler(); close(); };
        item.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); item.click(); } };
        menu.appendChild(item);
      };
      // Actions
      addItem('Play now', async () => {
        const tracks = getPlaylistTracks(data);
        const listEl = document.getElementById('music-list');
        state.filteredTracks = tracks.slice();
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
      addItem('Queue all', async () => {
        const tracks = getPlaylistTracks(data);
  const { addToQueue } = await import('../shared/state.js');
        tracks.forEach(t => addToQueue(t));
        const { showToast } = await import('../ui/ui.js');
        showToast(`Queued ${tracks.length} track${tracks.length===1?'':'s'}`);
      });
      if (data.type === 'user') {
        addItem('Rename…', () => {
          const next = prompt('Rename playlist', label);
          if (next) renamePlaylist(data.id, next);
        });
        addItem('Delete…', () => {
          if (confirm('Delete this playlist?')) deletePlaylist(data.id);
        });
      }
      // Position and attach
      const rect = li.getBoundingClientRect();
      menu.style.left = `${Math.min(e.clientX || rect.left, window.innerWidth - 220)}px`;
      menu.style.top = `${Math.min(e.clientY || rect.bottom + 4, window.innerHeight - 260)}px`;
      document.body.appendChild(menu);
      const close = () => { document.removeEventListener('click', onDoc, true); document.removeEventListener('keydown', onKey, true); menu.remove(); };
      const onDoc = (ev) => { if (!menu.contains(ev.target)) close(); };
      const onKey = (ev) => { if (ev.key === 'Escape') close(); };
      setTimeout(() => { document.addEventListener('click', onDoc, true); document.addEventListener('keydown', onKey, true); }, 0);
    };
    return li;
  };
  playlists.user.forEach(pl => {
    sectionUser.appendChild(makeItem(pl.name, { type: 'user', id: pl.id }));
  });

  // Smart playlists by genre
  sectionSmart.innerHTML = '';
  Object.keys(playlists.smart).sort((a,b) => a.localeCompare(b)).forEach(genre => {
    sectionSmart.appendChild(makeItem(genre, { type: 'smart', genre }));
  });
}
