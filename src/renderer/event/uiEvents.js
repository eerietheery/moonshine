import { renderList } from '../components/view.js';
import { showSettingsModal } from '../ui/settingsModal.js';
import { displayGridView } from '../grid.js';
import * as dom from '../dom.js';
import { state } from '../components/state.js';

export function setupUiEventListeners() {
  dom.settingsBtn.addEventListener('click', showSettingsModal);

  // Mode toggle events for sidebar (Artists/Albums/Playlists)
  const applyMode = (mode) => {
    state.sidebarMode = mode;
  // Persist mode
  window.etune.updateConfig({ sidebarMode: mode });
    if (mode === 'artist') {
      state.viewMode = 'library';
      state.activePlaylist = null;
      dom.artistList.style.display = '';
      dom.albumList.style.display = 'none';
      // Hide playlist sections
      if (dom.playlistUserSection) dom.playlistUserSection.style.display = 'none';
      if (dom.playlistSmartSection) dom.playlistSmartSection.style.display = 'none';
      dom.modeArtistsBtn?.classList.add('active');
      dom.modeAlbumsBtn?.classList.remove('active');
      dom.modePlaylistsBtn?.classList.remove('active');
    } else if (mode === 'album') {
      state.viewMode = 'library';
      state.activePlaylist = null;
      dom.artistList.style.display = 'none';
      dom.albumList.style.display = '';
      // Hide playlist sections
      if (dom.playlistUserSection) dom.playlistUserSection.style.display = 'none';
      if (dom.playlistSmartSection) dom.playlistSmartSection.style.display = 'none';
      dom.modeArtistsBtn?.classList.remove('active');
      dom.modeAlbumsBtn?.classList.add('active');
      dom.modePlaylistsBtn?.classList.remove('active');
    } else if (mode === 'playlist') {
      state.viewMode = 'playlist';
      // Hide artist/album lists; show playlist sections
      dom.artistList.style.display = 'none';
      dom.albumList.style.display = 'none';
      if (dom.playlistUserSection) dom.playlistUserSection.style.display = '';
      if (dom.playlistSmartSection) dom.playlistSmartSection.style.display = '';
      dom.modeArtistsBtn?.classList.remove('active');
      dom.modeAlbumsBtn?.classList.remove('active');
      dom.modePlaylistsBtn?.classList.add('active');
    }
  };
  dom.modeArtistsBtn?.addEventListener('click', () => {
    state.activeArtist = null;
    state.activeAlbum = null;
    state.activeYear = null;
    applyMode('artist');
    renderList(dom.list);
  });
  dom.modeAlbumsBtn?.addEventListener('click', () => {
    state.activeArtist = null;
    state.activeAlbum = null;
    state.activeYear = null;
    applyMode('album');
    renderList(dom.list);
  });
  dom.modePlaylistsBtn?.addEventListener('click', async () => {
    state.activeArtist = null;
    state.activeAlbum = null;
    state.activeYear = null;
    state.activePlaylist = null; // no specific playlist yet - browse mode
    applyMode('playlist');
    renderList(dom.list);
  });
  // Initialize (ensure sidebar sections visibility reflects mode)
  applyMode(state.sidebarMode || 'artist');

  dom.gridViewBtn.addEventListener('click', () => {
    displayGridView();
  });

  dom.listViewBtn.addEventListener('click', () => {
    renderList(dom.list);
    dom.gridViewBtn.classList.remove('active');
    dom.listViewBtn.classList.add('active');
  });

  dom.tableHeaders.forEach((header, idx) => {
    header.onclick = () => {
      const keys = ['title', 'artist', 'album', 'year', 'genre'];
      state.sortBy = keys[idx];
      renderList(dom.list);
    };
  });

  // Favorites view toggle in toolbar
  const favToggle = document.getElementById('favorite-toggle');
  if (favToggle) {
    const applyFavState = () => {
      favToggle.classList.toggle('active', state.favoriteViewEnabled);
      favToggle.title = state.favoriteViewEnabled ? 'Show All Tracks' : 'Show Favorites';
    };
    applyFavState();
    favToggle.addEventListener('click', () => {
      state.favoriteViewEnabled = !state.favoriteViewEnabled;
      window.etune.updateConfig({ favoriteViewEnabled: state.favoriteViewEnabled });
      applyFavState();
      renderList(dom.list);
    });
  }
}
