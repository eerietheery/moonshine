// Playlist header rendering extracted from listView.js
import { getPlaylistTracks } from '../playlist/playlists.js';
import { state, addToQueue } from '../shared/state.js';
import { showToast } from '../ui/ui.js';
import * as dom from '../../dom.js';
import { playTrack } from '../player/playerCore.js';
import { getGridTemplate } from '../shared/layout.js';
import { getAlbumArtUrl, ensureAlbumArtUrl } from '../../utils/albumArtCache.js';

export function renderPlaylistHeader(container, source, renderListCallback) {
  const tracks = getPlaylistTracks(source);
  const title = source.type === 'user' ? (source.name || 'Playlist') : (source.genre || 'Playlist');
  const count = tracks.length;
  container.innerHTML = '';
  const artUrl = getAlbumArtUrl(tracks[0]) || 'assets/images/default-art.png';

  // Create inner wrapper for grid layout (use .table-header-inner for perfect alignment)
  const innerWrapper = document.createElement('div');
  innerWrapper.className = 'table-header-inner';

  // Main container with horizontal layout
  const mainContent = document.createElement('div');
  mainContent.className = 'playlist-main-content';
  // Place the main content into the grid left area (all columns except the last actions column)
  try { mainContent.style.gridColumn = '1 / -2'; } catch (_) {}

  // Left side - large thumbnail
  const thumbnailContainer = document.createElement('div');
  thumbnailContainer.className = 'playlist-thumbnail';
  const img = document.createElement('img');
  img.className = 'playlist-cover';
  img.src = artUrl;
  img.alt = 'Playlist cover';
  thumbnailContainer.appendChild(img);

  try {
    const rep = tracks && tracks[0];
    if (rep) {
      ensureAlbumArtUrl(rep).then((url) => {
        if (!img.isConnected) return;
        if (url && img.src !== url) img.src = url;
      }).catch(() => {});
    }
  } catch (_) {}

  // Right side - text content
  const textContent = document.createElement('div');
  textContent.className = 'playlist-text-content';

  const badge = document.createElement('div');
  badge.className = 'playlist-badge';
  badge.textContent = source.type === 'user' ? 'Playlist' : 'Genre';

  const titleEl = document.createElement('h1');
  titleEl.className = 'playlist-title';
  titleEl.textContent = title;
  titleEl.title = title;

  const subtitle = document.createElement('div');
  subtitle.className = 'playlist-subtitle';
  subtitle.textContent = `${count} track${count===1?'':'s'}`;

  // We'll render action buttons in the right-most grid column so they align with table actions
  const actions = document.createElement('div');
  actions.className = 'playlist-actions-bar';
  // action host sits in the last grid column
  const actionsHost = document.createElement('div');
  actionsHost.style.display = 'flex';
  actionsHost.style.alignItems = 'center';
  actionsHost.style.justifyContent = 'flex-end';
  try { actionsHost.style.gridColumn = '-2 / -1'; } catch (_) {}
  const playBtn = document.createElement('button');
  playBtn.id = 'pl-play';
  playBtn.className = 'primary';
  playBtn.textContent = 'Play';
  const queueBtn = document.createElement('button');
  queueBtn.id = 'pl-queue';
  queueBtn.textContent = 'Queue All';
  actions.appendChild(playBtn);
  actions.appendChild(queueBtn);

  // Assemble text content
  textContent.appendChild(badge);
  textContent.appendChild(titleEl);
  textContent.appendChild(subtitle);
  // Actions will render in the last grid column; don't place inside text block

  // Assemble main content into left area and place actions into the last column
  mainContent.appendChild(thumbnailContainer);
  mainContent.appendChild(textContent);
  // action host receives the action elements (keeps them aligned to last column)
  actionsHost.appendChild(actions);
  
  // Add elements to inner wrapper instead of directly to container
  innerWrapper.appendChild(mainContent);
  innerWrapper.appendChild(actionsHost);
  container.appendChild(innerWrapper);
  container.classList.add('visible');

  playBtn.onclick = async () => {
    if (!tracks.length) return showToast('Playlist is empty');
    state.filteredTracks = tracks.slice();
    // Request the list view to re-render
    try { renderListCallback && renderListCallback(dom.list); } catch (_) {}
    // Start playing first track
    try {
      playTrack(
        tracks[0],
        0,
        document.getElementById('audio'),
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        () => { try { renderListCallback && renderListCallback(dom.list); } catch (_) {} }
      );
    } catch (e) {
      // fallback: dynamic import if static import fails
      try {
        const mod = await import('../player/playerCore.js');
        mod.playTrack(
          tracks[0],
          0,
          document.getElementById('audio'),
          document.getElementById('play-btn'),
          document.getElementById('current-art'),
          document.getElementById('current-title'),
          document.getElementById('current-artist'),
          () => { try { renderListCallback && renderListCallback(dom.list); } catch (_) {} }
        );
      } catch (_) { /* noop */ }
    }
  };

  queueBtn.onclick = async () => {
    if (!tracks.length) return showToast('Playlist is empty');
    try {
      tracks.forEach(t => addToQueue(t));
      showToast(`Queued ${tracks.length} track${tracks.length===1?'':'s'}`);
    } catch (e) {
      // fallback: try dynamic import of state if addToQueue wasn't available
      try {
        const s = await import('../shared/state.js');
        tracks.forEach(t => s.addToQueue && s.addToQueue(t));
        showToast(`Queued ${tracks.length} track${tracks.length===1?'':'s'}`);
      } catch (_) { /* noop */ }
    }
  };
}
