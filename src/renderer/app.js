import { setupPlayer } from './components/player/index.js';
import { initialScan } from './library.js';
import { setupEventListeners } from './events.js';
import { getComplementaryColor } from './ui/colorUtils.js';
import { preloadGridView } from './components/grid/gridEvents.js';
import * as dom from './dom.js';
import { renderList } from './components/shared/view.js';
import { setupQueuePanel } from './components/queue/queue.js';
import { state } from './components/shared/state.js';
import { loadPlaylists, buildSmartPlaylists, renderPlaylistsSidebar, createPlaylist, getPlaylistTracks } from './components/playlist/playlists.js';
import { playlists } from './components/playlist/playlists.js';

function playlistsName(source) {
  if (source?.type !== 'user') return null;
  const pl = playlists.user.find(p => p.id === source.id);
  return pl?.name || null;
}

export function initializeApp() {
  // Expose canonical state as window.state for legacy modules that still reference it
  // Provide safe defaults for legacy settings
  window.state = state;
  if (typeof window.state.autoResumeOnFocus === 'undefined') window.state.autoResumeOnFocus = false;

  // Set initial complementary color
  document.documentElement.style.setProperty('--complementary-color', getComplementaryColor(getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()));

  // Load persisted config
  window.etune.getConfig().then(async (cfg) => {
    if (cfg) {
      // Apply theme
      if (cfg.theme && cfg.theme.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', cfg.theme.primaryColor);
        document.documentElement.style.setProperty('--complementary-color', getComplementaryColor(cfg.theme.primaryColor));
      }
      // Apply filtering prefs
      if (typeof cfg.sidebarFilteringEnabled === 'boolean') state.sidebarFilteringEnabled = cfg.sidebarFilteringEnabled;
      if (cfg.sidebarMode === 'album' || cfg.sidebarMode === 'artist') state.sidebarMode = cfg.sidebarMode;
  // Apply grid sorting preference if present
  if (typeof cfg.gridSortByAlbum === 'boolean') state.gridSortByAlbum = cfg.gridSortByAlbum;
      // Apply library dirs
      if (Array.isArray(cfg.libraryDirs)) state.libraryDirs = cfg.libraryDirs.slice();
      // Apply explicit artist names toggle
      if (typeof cfg.explicitArtistNames === 'boolean') state.explicitArtistNames = cfg.explicitArtistNames;
      // Load persisted favorites
      if (Array.isArray(cfg.favorites)) state.favorites = cfg.favorites.slice();
      if (typeof cfg.favoriteViewEnabled === 'boolean') state.favoriteViewEnabled = cfg.favoriteViewEnabled;
      // Restore list view headers from config
      if (Array.isArray(cfg.listHeaders) && cfg.listHeaders.length) state.listHeaders = cfg.listHeaders.slice();
  // Load playlists
  await loadPlaylists();
      // Load all remembered library directories
      if (state.libraryDirs.length > 0) {
        for (const dir of state.libraryDirs) {
          await import('./library.js').then(lib => lib.loadMusic(dir));
        }
        preloadGridView();
        return;
      }
    }
    // If no remembered dirs, do initial scan
    await initialScan();
  await loadPlaylists();
    preloadGridView();
  }).finally(() => {
    // Setup all event listeners
    setupEventListeners();

    // Setup the audio player
    setupPlayer(
      dom.audio,
      dom.playBtn,
      dom.prevBtn,
      dom.nextBtn,
      dom.progressBar,
      dom.progressFill,
      dom.progressHandle,
      dom.currentTime,
      dom.totalTime,
      dom.volume,
      dom.currentArt,
      dom.currentTitle,
      dom.currentArtist,
      () => renderList(dom.list),
      dom.shuffleBtn,
      dom.loopBtn
    );

    // Setup queue panel
    setupQueuePanel();

    // Build smart playlists after tracks load changes
    const renderPlaylists = () => {
      buildSmartPlaylists();
      const userEl = document.getElementById('playlist-user');
      const smartEl = document.getElementById('playlist-smart');
      if (!userEl || !smartEl) return;
      renderPlaylistsSidebar(userEl, smartEl, (source) => {
        const tracks = getPlaylistTracks(source);
        state.viewMode = 'playlist';
        state.activePlaylist = { ...source, name: source.type === 'user' ? (playlistsName(source) || 'Playlist') : source.genre };
        state.filteredTracks = tracks.slice();
        state.sortBy = 'artist';
        state.sortOrder = 'asc';
        renderList(dom.list);
      });
    };
    renderPlaylists();
  document.addEventListener('playlists:changed', renderPlaylists);
    // Hook create button
    const createBtn = document.getElementById('playlist-create');
    if (createBtn) {
      createBtn.onclick = async () => {
        const { showNewPlaylistModal } = await import('./ui/playlistModal.js');
        showNewPlaylistModal({ onCreate: () => renderPlaylists() });
      };
    }
  });
}

