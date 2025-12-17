// List view rendering logic
import { state, rebuildFilteredIndex, rebuildSortedIndex } from '../shared/state.js';
import { getGridTemplate } from '../shared/layout.js';
import { createTrackElement } from '../ui/ui.js';
import { VirtualList } from '../ui/virtualList.js';
import { playTrack } from '../player/playerCore.js';
import { updateSidebarFilters } from '../sidebar/sidebar.js';
import * as dom from '../../dom.js';
import { getPlaylistTracks } from '../playlist/playlists.js';
import { showToast } from '../ui/ui.js';
import { renderPlaylistBrowse } from '../playlist/playlistBrowse.js';
import { sortTracks } from './listSort.js';
import { setupListEvents } from './listEvents.js';
import { renderListHeader } from './listHeader.js';
// import { renderPlaylistHeader as renderPlaylistHeaderModule } from './playlistHeader.js';

export function renderList(list) {
  // Ensure body has a class indicating playlist *browse* mode so CSS can react
  try { document.body.classList.toggle('playlists-active', state.viewMode === 'playlist' && !state.activePlaylist); } catch(e) {}
  
  // Centralize header element lookup so we can reliably hide/show it below
  const headerEl = document.querySelector('#music-table .table-header');
  const headerHost = dom.playlistHeader;
  
  if (state.viewMode === 'playlist') {
    if (state.activePlaylist) {
      // Active playlist: use the standard table header ONLY, hide playlist meta header completely
      if (headerHost) {
        headerHost.classList.remove('visible');
        headerHost.style.display = 'none';
        headerHost.innerHTML = '';
      }
      // Show the standard table header
      if (headerEl) {
    headerEl.classList.remove('hidden');
    headerEl.style.display = '';
      }
    } else {
      // Browsing playlists: use the standard header container for a simple 4-col browse header
      if (headerHost) {
        headerHost.classList.remove('visible');
        headerHost.style.display = 'none';
        headerHost.innerHTML = '';
      }
      if (headerEl) {
        headerEl.classList.remove('hidden');
        headerEl.style.display = '';
      }
    }
  } else {
    // Not in playlist mode: hide playlist header, show standard header
    if (headerHost) {
      headerHost.classList.remove('visible');
      headerHost.style.display = 'none';
      headerHost.innerHTML = '';
    }
    if (headerEl) {
      headerEl.style.display = '';
      headerEl.classList.remove('hidden');
    }
  }
  // If browsing playlists (no specific selection), render browser and exit
  if (state.viewMode === 'playlist' && !state.activePlaylist) {
  // Clean up header sync listeners from track view to prevent interference
  try { list._headerSyncCleanup && list._headerSyncCleanup(); } catch (_) {}
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

  // Keep lookup maps in sync even if other modules replaced arrays directly.
  rebuildFilteredIndex();

  // Use sortTracks from listSort.js
  const sorted = sortTracks(filtered, state.sortBy, state.sortOrder, state.activeAlbum);
  
  // Store the sorted tracks in state so playback can use the correct order
  state.sortedTracks = sorted;
  rebuildSortedIndex();

  const filteredIndexByPath = state.filteredIndexByPath || new Map();
  
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

  // Only populate/show main headers when NOT browsing playlists
  if (!(state.viewMode === 'playlist' && !state.activePlaylist) && headerEl && state.tracks && state.tracks.length) {
    renderListHeader(); // No callback needed - sorting handled centrally in uiEvents.js
  }

  // Precompute grid template for rows (headers + actions)
  // Reuse the `template` computed for the header so header and rows are identical.
  // If `template` is not present (header not rendered), fall back to computing one.
  const rowTemplate = (typeof template !== 'undefined' && template) ? template : getGridTemplate(state.listHeaders && state.listHeaders.length ? state.listHeaders : ['title','artist','album','year','genre']);
  
  // Check if we're in mobile view to avoid VirtualList conflicts
  const isMobileView = window.innerWidth <= 768 || document.body.classList.contains('mobile-view');

  // When mobile, we normally render the full DOM for compatibility with mobile UI.
  // However for very large lists this causes jank — use VirtualList when over threshold.
  const MOBILE_VLIST_THRESHOLD = 400; // rows; tuneable

  if (isMobileView) {
    // If large list on mobile, use VirtualList to avoid creating thousands of DOM nodes.
    if (sorted.length > MOBILE_VLIST_THRESHOLD) {
      // Switch to virtualized rendering on mobile for large lists
      if (list.vlist) list.vlist.destroy();
      list.vlist = new VirtualList({
        container: list,
        rowHeight: 56,
        total: sorted.length,
        renderRow: (i) => {
          const track = sorted[i];
          const filteredIndex = filteredIndexByPath.get(track.filePath);
          const el = createTrackElement(
            track,
            () => playTrack(
              track,
              typeof filteredIndex === 'number' ? filteredIndex : i,
              document.getElementById('audio'),
              document.getElementById('play-btn'),
              document.getElementById('current-art'),
              document.getElementById('current-title'),
              document.getElementById('current-artist'),
              () => renderList(list)
            ),
            state.listHeaders
          );
          if (state.currentTrack && state.currentTrack.filePath === track.filePath) el.classList.add('playing');
          return el;
        }
      });
    } else {
      // Mobile view: Use simple DOM rendering without VirtualList
      // This prevents conflicts with mobile track lazy loading system
      if (list.vlist) {
        list.vlist.destroy();
        list.vlist = null;
      }

      // Simple mobile-friendly rendering
      list.innerHTML = '';
      const fragment = document.createDocumentFragment();

      sorted.forEach((track, i) => {
        const filteredIndex = filteredIndexByPath.get(track.filePath);
        const el = createTrackElement(
          track,
          () => playTrack(
            track,
            typeof filteredIndex === 'number' ? filteredIndex : i,
            document.getElementById('audio'),
            document.getElementById('play-btn'),
            document.getElementById('current-art'),
            document.getElementById('current-title'),
            document.getElementById('current-artist'),
            () => renderList(list)
          ),
          state.listHeaders
        );
        if (state.currentTrack && state.currentTrack.filePath === track.filePath) {
          el.classList.add('playing');
        }
        fragment.appendChild(el);
      });

      list.appendChild(fragment);
    }
  } else {
    // Desktop view: Use VirtualList for performance
    // Destroy any existing VirtualList first
    if (list.vlist) list.vlist.destroy();
    
    // Render rows using original track element for styling and selection, but only selected headers
    list.vlist = new VirtualList({
      container: list,
      rowHeight: 56,
      total: sorted.length,
      renderRow: (i) => {
        const track = sorted[i];
        const filteredIndex = filteredIndexByPath.get(track.filePath);
        const el = createTrackElement(
          track,
          () => playTrack(
            track,
            typeof filteredIndex === 'number' ? filteredIndex : i,
            document.getElementById('audio'),
            document.getElementById('play-btn'),
            document.getElementById('current-art'),
            document.getElementById('current-title'),
            document.getElementById('current-artist'),
            () => renderList(list)
          ),
          state.listHeaders
        );
        if (state.currentTrack && state.currentTrack.filePath === track.filePath) {
          el.classList.add('playing');
        }
        return el;
      }
    });
  }

  // Setup list events (keyboard, sorting, etc.)
  setupListEvents(list);
}
