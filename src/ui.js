// UI helpers for rendering tracks, album art, etc.
export function createTrackElement(track, onClick) {
  const div = document.createElement('div');
  div.className = 'track';
  const art = track.albumArtDataUrl || 'assets/default-art.png';
  const titleText = (track.tags && track.tags.title) || track.file;
  const artistText = (track.tags && track.tags.artist) || 'Unknown';
  const albumText = (track.tags && track.tags.album) || 'Unknown';
  const yearText = (track.tags && track.tags.year) || '';
  const genreText = (track.tags && track.tags.genre) || '';
  
  div.innerHTML = `
    <div class="track-title">
      <img class="album-art" src="${art}" alt="Album Art" />
      <span class="track-name" title="${titleText}">${titleText}</span>
    </div>
    <div class="track-artist" title="${artistText}">${artistText}</div>
    <div class="track-album" title="${albumText}">${albumText}</div>
    <div class="track-year" title="${yearText}">${yearText}</div>
    <div class="track-genre track-genre-actions" title="${genreText}">
      <span class="genre-text">${genreText}</span>
      <button class="queue-add-btn" title="Add to Queue">📝</button>
    </div>
  `;
  // Add to queue button
  div.querySelector('.queue-add-btn').onclick = (e) => {
    e.stopPropagation();
    import('./state.js').then(({ addToQueue }) => {
      addToQueue(track);
  // Toast
  showToast(`Added to queue: ${(track.tags && track.tags.title) || track.file}`);
    });
  };
  
  div.onclick = () => onClick(track);
  return div;
}

// Lightweight toast
export function showToast(message, timeout = 1800) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  // trigger transition
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  }, timeout);
}

export function createFilterItem(name, count, isActive) {
  const div = document.createElement('div');
  div.className = `filter-item ${isActive ? 'active' : ''}`;
  div.setAttribute('role', 'button');
  div.setAttribute('tabindex', '0');
  div.dataset.value = name;
  div.innerHTML = `
    <span>${name}</span>
    <span class="filter-count">${count}</span>
  `;
  // Note: Click handling is delegated at the container level in renderer.js
  return div;
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
