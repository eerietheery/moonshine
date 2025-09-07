/**
 * Mobile Player - Mini player functionality and controls
 */

let isMobilePlayerVisible = false;

/**
 * Initialize mini player functionality
 */
export function initMiniPlayer() {
  const miniPlayer = document.getElementById('mobile-mini-player');
  const miniPlayBtn = document.getElementById('mini-play-btn');
  
  if (miniPlayer) {
    // Tap to expand (future feature)
    miniPlayer.addEventListener('click', (event) => {
      if (event.target === miniPlayBtn || miniPlayBtn.contains(event.target)) {
        return; // Let play button handle its own click
      }
      // Future: expand player
      console.log('📱 Mini player tapped - expand player (TODO)');
    });
  }
  
  if (miniPlayBtn) {
    miniPlayBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      togglePlayback();
    });
  }
  
  // Set up event listeners for player state changes
  setupPlayerEventListeners();
}

/**
 * Show/hide mini player based on mobile view state
 */
export function toggleMiniPlayer(show, isMobile = true) {
  const miniPlayer = document.getElementById('mobile-mini-player');
  
  if (miniPlayer) {
    const shouldShow = show && isMobile;
    miniPlayer.style.display = shouldShow ? 'flex' : 'none';
    isMobilePlayerVisible = shouldShow;
    
    if (shouldShow) {
      syncMiniPlayer();
    }
  }
}

/**
 * Sync mini player with current track
 */
export function syncMiniPlayer() {
  if (!isMobilePlayerVisible) return;
  
  const miniArt = document.getElementById('mini-player-art');
  const miniTitle = document.getElementById('mini-player-title');
  const miniArtist = document.getElementById('mini-player-artist');
  const miniPlayBtn = document.getElementById('mini-play-btn');
  
  // Get current track info from main player
  const currentTitleEl = document.getElementById('current-title');
  const currentArtistEl = document.getElementById('current-artist');
  const currentArtEl = document.querySelector('.current-album-art');
  const audio = document.getElementById('audio');
  
  if (miniTitle && currentTitleEl) {
    miniTitle.textContent = currentTitleEl.textContent || 'No track selected';
  }
  
  if (miniArtist && currentArtistEl) {
    miniArtist.textContent = currentArtistEl.textContent || 'Unknown artist';
  }
  
  if (miniArt && currentArtEl) {
    miniArt.src = currentArtEl.src || 'assets/images/default-art.png';
  }
  
  // Update play button state
  updatePlayButtonState(miniPlayBtn, audio);
}

/**
 * Update play button state based on audio state
 */
function updatePlayButtonState(playBtn, audio) {
  if (!playBtn || !audio) return;
  
  const isPlaying = !audio.paused;
  const playImg = playBtn.querySelector('img');
  
  if (playImg) {
    playImg.src = isPlaying ? 'assets/images/pause.svg' : 'assets/images/play-centered.svg';
    playImg.alt = isPlaying ? 'Pause' : 'Play';
  }
  
  playBtn.title = isPlaying ? 'Pause' : 'Play';
}

/**
 * Toggle playback (for mini player)
 */
function togglePlayback() {
  const mainPlayBtn = document.getElementById('play-btn');
  
  if (mainPlayBtn) {
    mainPlayBtn.click(); // Reuse existing play/pause logic
  } else {
    console.warn('Main play button not found');
  }
}

/**
 * Set up event listeners for player state changes
 */
function setupPlayerEventListeners() {
  // Listen for track changes from main player
  const audio = document.getElementById('audio');
  
  if (audio) {
    audio.addEventListener('play', syncMiniPlayer);
    audio.addEventListener('pause', syncMiniPlayer);
    audio.addEventListener('ended', syncMiniPlayer);
    audio.addEventListener('loadstart', syncMiniPlayer);
  }
  
  // Listen for custom track change events
  document.addEventListener('trackChanged', syncMiniPlayer);
  document.addEventListener('playerStateChanged', syncMiniPlayer);
}

/**
 * Check if mini player is currently visible
 */
export function isMiniPlayerVisible() {
  return isMobilePlayerVisible;
}

/**
 * Update mini player state (external API)
 */
export function updateMiniPlayerState() {
  syncMiniPlayer();
}
