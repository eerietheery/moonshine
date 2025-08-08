import { state, updateFilters } from './state.js';
import { updateSidebarFilters } from './sidebar.js';
import { setupPlayer, playTrack } from './player.js';
import { renderList, renderGrid } from './view.js';
import { createFilterItem, formatTime } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
  const filterInput = document.getElementById('filter');
  const list = document.getElementById('music-list');
  const audio = document.getElementById('audio');
  const artistList = document.getElementById('artist-list');
  const albumList = document.getElementById('album-list');
  const playBtn = document.getElementById('play-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const progressBar = document.getElementById('progress-bar');
  const progressFill = document.getElementById('progress-fill');
  const progressHandle = document.getElementById('progress-handle');
  const currentTime = document.getElementById('current-time');
  const totalTime = document.getElementById('total-time');
  const volume = document.getElementById('volume');
  const currentArt = document.getElementById('current-art');
  const currentTitle = document.getElementById('current-title');
  const currentArtist = document.getElementById('current-artist');
  const sortBySelect = document.getElementById('sort-by');
  const sortOrderBtn = document.getElementById('sort-order');

  // Add sidebar filtering checkbox
  let sidebarFilteringEnabled = false;
  const toolbar = document.getElementById('toolbar');
  const filterToggle = document.createElement('label');
  filterToggle.style.marginLeft = '24px';
  filterToggle.style.fontSize = '0.95em';
  filterToggle.innerHTML = `<input type="checkbox" id="sidebar-filter-toggle"> Enable sidebar filtering`;
  toolbar.appendChild(filterToggle);
  const sidebarFilterCheckbox = document.getElementById('sidebar-filter-toggle');
  sidebarFilterCheckbox.checked = false;
  sidebarFilterCheckbox.addEventListener('change', (e) => {
    sidebarFilteringEnabled = e.target.checked;
    updateFilters(filterInput, sidebarFilteringEnabled);
    updateSidebarFilters(filterInput, artistList, albumList, () => renderList(list));
    renderList(list);
  });

  // Auto-load initial scan if available
  (async () => {
    list.innerHTML = `<div class='loading-message'>Preparing your library...</div>`;
    try {
      const res = await window.etune.initialScan();
      if (Array.isArray(res) && res.length) {
        state.tracks = res.filter(t => t && t.filePath);
        updateFilters(filterInput, sidebarFilteringEnabled);
        updateSidebarFilters(filterInput, artistList, albumList, () => renderList(list));
        renderList(list);
      } else {
        list.innerHTML = '';
      }
    } catch {
      list.innerHTML = '';
    }
  })();

  document.getElementById('scan-btn').onclick = async () => {
    let dirPath = 'C:/Users/Eerie/Music';
    if (!window.confirm('Scan default music folder? (C:/Users/Eerie/Music)\nPress Cancel to choose another folder.')) {
      const userPath = prompt('Enter the path to your music folder:');
      if (userPath) dirPath = userPath;
    }
    list.innerHTML = `<div class='loading-message'>Loading music files...</div>`;
    try {
      let tracks = await window.etune.scanMusic(dirPath);
      state.tracks = tracks.filter(t => t && t.filePath);
      updateFilters(filterInput, sidebarFilteringEnabled);
      updateSidebarFilters(filterInput, artistList, albumList, () => renderList(list));
      renderList(list);
    } catch (err) {
      list.innerHTML = `<div style='color:#e74c3c;padding:16px;'>Error loading music: ${err.message}</div>`;
    }
  };

  // Event listeners
  filterInput.addEventListener('input', () => {
    updateFilters(filterInput, sidebarFilteringEnabled);
    updateSidebarFilters(filterInput, artistList, albumList, () => renderList(list));
    renderList(list);
  });
  
  sortBySelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderList(list);
  });
  
  sortOrderBtn.addEventListener('click', () => {
    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    sortOrderBtn.textContent = state.sortOrder === 'asc' ? '↑' : '↓';
    renderList(list);
  });

  // Player setup
  setupPlayer(audio, playBtn, prevBtn, nextBtn, progressBar, progressFill, progressHandle, currentTime, totalTime, volume, currentArt, currentTitle, currentArtist, () => renderList(list));

  // Table header sorting
  document.querySelectorAll('.table-header > div').forEach((header, idx) => {
    header.onclick = () => {
      const keys = ['title', 'artist', 'album', 'year', 'genre'];
      state.sortBy = keys[idx];
      renderList(list);
    };
  });

  // Grid view toggle
  document.getElementById('grid-view').onclick = () => {
    renderGrid(list);
    document.getElementById('list-view').classList.remove('active');
    document.getElementById('grid-view').classList.add('active');
  };
  document.getElementById('list-view').onclick = () => {
    renderList(list);
    document.getElementById('grid-view').classList.remove('active');
    document.getElementById('list-view').classList.add('active');
  };
});
