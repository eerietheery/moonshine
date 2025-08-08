import { setupPlayer } from '../player.js';
import { initialScan } from './library.js';
import { setupEventListeners } from './events.js';
import { getComplementaryColor } from './ui.js';
import { preloadGridView } from './grid.js';
import * as dom from './dom.js';
import { renderList } from '../view.js';
import { setupQueuePanel } from '../queue.js';

export function initializeApp() {
  // Set initial complementary color
  document.documentElement.style.setProperty('--complementary-color', getComplementaryColor(getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()));

  // Initial library scan
  initialScan().then(() => {
    preloadGridView();
  });

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
  dom.shuffleBtn
  );

  // Setup queue panel
  setupQueuePanel();
}
