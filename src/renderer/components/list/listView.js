// List view rendering logic
import { state, updateFilters } from '../shared/state.js';
import { createTrackElement } from '../ui/ui.js';
import { VirtualList } from '../ui/virtualList.js';
import { playTrack } from '../player/playerCore.js';
import { updateSidebarFilters } from '../sidebar/sidebar.js';
import * as dom from '../../dom.js';
import { getPlaylistTracks } from '../playlist/playlists.js';
import { showToast } from '../ui/ui.js';
import { renderPlaylistBrowse } from '../playlist/playlistBrowse.js';

export function renderList(list) {
  // Ensure body has a class indicating playlist *browse* mode so CSS can react
  try { document.body.classList.toggle('playlists-active', state.viewMode === 'playlist' && !state.activePlaylist); } catch(e) {}
  // If in playlist mode and we have an active playlist, show header
  const headerHost = dom.playlistHeader;
  // Centralize header element lookup so we can reliably hide/show it below
  const headerEl = document.querySelector('#music-table .table-header');
  if (state.viewMode === 'playlist' && headerHost) {
    // Playlist mode: if a specific playlist is active show the playlist meta header,
    // otherwise keep the playlist header area empty/hidden for browse mode.
    if (state.activePlaylist) {
      renderPlaylistHeader(headerHost, state.activePlaylist);
      // When a specific playlist is selected we want the main music-table header visible
      if (headerEl) {
        headerEl.classList.remove('hidden');
        headerEl.style.display = '';
      }
      const staticHeader = document.getElementById('music-table-header');
      if (staticHeader) staticHeader.style.display = '';
    } else {
      headerHost.classList.remove('visible');
      headerHost.style.display = 'none';
      headerHost.innerHTML = '';
      // Hide the main music table header while browsing playlists (no selection)
      if (headerEl) {
        headerEl.classList.add('hidden');
        headerEl.style.display = 'none';
      }
      const staticHeader = document.getElementById('music-table-header');
      if (staticHeader) staticHeader.style.display = 'none';
    }
  } else if (headerHost) {
    headerHost.classList.remove('visible');
    headerHost.style.display = 'none';
    headerHost.innerHTML = '';
    // Ensure main header is available when not in playlist mode
    if (headerEl) {
      headerEl.style.display = '';
      headerEl.classList.remove('hidden');
    }
    const staticHeader = document.getElementById('music-table-header');
    if (staticHeader) staticHeader.style.display = '';
  }
  // If browsing playlists (no specific selection), render browser and exit
  if (state.viewMode === 'playlist' && !state.activePlaylist) {
    renderPlaylistBrowse(list);
    return;
  }
  // If favorite view is enabled, show all favorites from the entire library (ignore current sidebar filters)
  let filtered;
  if (state.favoriteViewEnabled) {
    filtered = (state.tracks || []).filter(t => t.favorite);
  } else {
    filtered = [...state.filteredTracks];
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
  import('../shared/state.js').then(({ state }) => {
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
    
    // Main container with horizontal layout
    const mainContent = document.createElement('div');
    mainContent.className = 'playlist-main-content';
    
    // Left side - large thumbnail
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.className = 'playlist-thumbnail';
    const img = document.createElement('img');
    img.className = 'playlist-cover';
    img.src = artUrl;
    img.alt = 'Playlist cover';
    thumbnailContainer.appendChild(img);
    
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
    
    // Actions row
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
    
    // Assemble text content
    textContent.appendChild(badge);
    textContent.appendChild(titleEl);
    textContent.appendChild(subtitle);
    textContent.appendChild(actions);
    
    // Assemble main content
    mainContent.appendChild(thumbnailContainer);
    mainContent.appendChild(textContent);
    
    container.appendChild(mainContent);
    container.style.display = 'block';
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
  const { addToQueue } = await import('../shared/state.js');
      tracks.forEach(t => addToQueue(t));
      showToast(`Queued ${tracks.length} track${tracks.length===1?'':'s'}`);
    };
  }
  // Remove legacy dynamic header row if present
  const legacyHeader = document.getElementById('music-list-headers');
  if (legacyHeader) legacyHeader.remove();

  // Use existing static header container from index.html and populate dynamically
  const headers = state.listHeaders && state.listHeaders.length ? state.listHeaders : ['title','artist','album','year','genre'];
  // Only populate/show main headers when NOT browsing playlists
  if (!(state.viewMode === 'playlist' && !state.activePlaylist) && headerEl && state.tracks && state.tracks.length) {
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
