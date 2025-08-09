// Queue panel rendering and drag-and-drop logic
import { state, removeFromQueue, moveQueueItem } from './state.js';

export function renderQueuePanel() {
  const list = document.getElementById('queue-list');
  list.innerHTML = '';
  state.queue.forEach((track, i) => {
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.draggable = true;
    item.setAttribute('data-index', i);
    item.innerHTML = `
      <span class="queue-title" title="${track.tags?.title || track.file}">${track.tags?.title || track.file}</span>
      <span class="queue-artist" title="${track.tags?.artist || 'Unknown'}">${track.tags?.artist || 'Unknown'}</span>
      <button class="queue-remove" title="Remove">✖</button>
      <span class="queue-drag" title="Drag to reorder">☰</span>
    `;
    // Remove button
    item.querySelector('.queue-remove').onclick = (e) => {
      removeFromQueue(i);
      renderQueuePanel();
    };
    // Drag-and-drop
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', i);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const from = Number(e.dataTransfer.getData('text/plain'));
      const to = i;
      moveQueueItem(from, to);
      renderQueuePanel();
    });
    list.appendChild(item);
  });
  // Render upcoming (ghost) tracks after queue ends
  const upcomingContainer = document.getElementById('queue-upcoming');
  if (upcomingContainer) {
    upcomingContainer.innerHTML = '';
    let upcoming = [];
    const curQueueIdx = state.queue.findIndex(t => t.filePath === state.currentTrack?.filePath);
    if (state.queue.length && curQueueIdx !== -1) {
      // Show remainder of queue after current
      upcoming = state.queue.slice(curQueueIdx + 1);
    }
    // If queue is empty or no more items, show main list (all) after current
    if (!state.queue.length || upcoming.length < 5) {
      const needed = 5 - upcoming.length;
      const lib = state.tracks; // always show from full library
      const currentIdx = state.currentTrack ? lib.findIndex(t => t.filePath === state.currentTrack.filePath) : -1;
      if (currentIdx !== -1) {
        const after = lib.slice(currentIdx + 1, currentIdx + 1 + needed);
        upcoming = upcoming.concat(after);
      } else if (!state.currentTrack && lib.length) {
        upcoming = upcoming.concat(lib.slice(0, needed));
      }
    }
    upcoming.slice(0, 10).forEach(track => {
      const ghost = document.createElement('div');
      ghost.className = 'queue-upcoming-item';
      ghost.innerHTML = `
        <span class="queue-title" title="${track.tags?.title || track.file}">${track.tags?.title || track.file}</span>
        <span class="queue-artist" title="${track.tags?.artist || 'Unknown'}">${track.tags?.artist || 'Unknown'}</span>
      `;
      upcomingContainer.appendChild(ghost);
    });
    if (!upcoming.length) {
      const none = document.createElement('div');
      none.className = 'queue-upcoming-empty';
      none.textContent = 'No upcoming tracks';
      upcomingContainer.appendChild(none);
    }
  }
}

export function setupQueuePanel() {
  const panel = document.getElementById('queue-panel');
  const toggleBtn = document.getElementById('queue-toggle');
  const closeBtn = document.getElementById('queue-close');
  toggleBtn.onclick = () => {
    panel.classList.toggle('hidden');
    renderQueuePanel();
  };
  closeBtn.onclick = () => {
    panel.classList.add('hidden');
  };
}
