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
