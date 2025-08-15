// Player event handler setup: keyboard, filter, and global events
import { playTrack, togglePlay, playPrevious, playNext, toggleShuffle, toggleLoop } from './playerCore.js';

export function setupPlayerEvents(audio, playBtn, prevBtn, nextBtn, shuffleBtn, loopBtn, renderListFn) {
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case ' ': // Spacebar
        e.preventDefault();
        togglePlay(audio, playBtn);
        break;
      case 'ArrowLeft':
        playPrevious(audio, renderListFn);
        break;
      case 'ArrowRight':
        playNext(audio, renderListFn);
        break;
      case 's':
        if (shuffleBtn) toggleShuffle(shuffleBtn);
        break;
      case 'l':
        if (loopBtn) toggleLoop(loopBtn);
        break;
    }
  });

  // Filter input (for search/filtering)
  const filterInput = document.getElementById('filter');
  if (filterInput) {
    filterInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        renderListFn();
      }
    });
  }

  // Global events (window focus, blur, etc.)
  window.addEventListener('focus', () => {
  if (audio.paused && window.state?.autoResumeOnFocus) {
      togglePlay(audio, playBtn);
    }
  });
}
