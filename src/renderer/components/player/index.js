// Player controls and playback logic
import { playTrack, togglePlay, playPrevious, playNext, toggleShuffle, toggleLoop } from './playerCore.js';
import { setupPlayerUI } from './playerUI.js';
import { setupPlayerEvents } from './playerEvents.js';
import { formatTime, clamp } from './playerUtils.js';

// Setup player UI and events using new modules
export function setupPlayer(audio, playBtn, prevBtn, nextBtn, progressBar, progressFill, progressHandle, currentTime, totalTime, volume, currentArt, currentTitle, currentArtist, renderListFn, shuffleBtn, loopBtn) {
  setupPlayerUI(audio, playBtn, prevBtn, nextBtn, progressBar, progressFill, progressHandle, currentTime, totalTime, volume, currentArt, currentTitle, currentArtist, renderListFn, shuffleBtn, loopBtn);
  setupPlayerEvents(audio, playBtn, prevBtn, nextBtn, shuffleBtn, loopBtn, renderListFn);
}

// Core logic is now in playerCore.js, UI logic in playerUI.js, events in playerEvents.js, utils in playerUtils.js
// This file only sets up the player using those modules.
