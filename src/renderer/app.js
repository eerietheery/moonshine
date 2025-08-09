import { setupPlayer } from '../player.js';
import { initialScan } from './library.js';
import { setupEventListeners } from './events.js';
import { getComplementaryColor } from './ui/colorUtils.js';
import { preloadGridView } from './grid.js';
import * as dom from './dom.js';
import { renderList } from '../view.js';
import { setupQueuePanel } from '../queue.js';
import { state } from '../state.js';

export function initializeApp() {
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
      // Apply library dirs
      if (Array.isArray(cfg.libraryDirs)) state.libraryDirs = cfg.libraryDirs.slice();
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
  });
}

