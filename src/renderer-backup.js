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

  function updateFilters() {
    const searchFilter = filterInput.value;
    
    // Start with all tracks and apply all filters together
    filteredTracks = tracks.slice(); // Create a copy of tracks
    
    // Apply search filter
    if (searchFilter) {
      filteredTracks = filterTracks(filteredTracks, searchFilter);
    }
    
    // Apply artist filter
    if (activeArtist && activeArtist !== 'All') {
      filteredTracks = filteredTracks.filter(t => (t.tags.artist || 'Unknown') === activeArtist);
    }
    
    // Apply album filter  
    if (activeAlbum && activeAlbum !== 'All') {
      filteredTracks = filteredTracks.filter(t => (t.tags.album || 'Unknown') === activeAlbum);
    }
    
    // Update sidebar filters
    updateSidebarFilters();
  }
  
  function updateSidebarFilters() {
    // Get base tracks for counting (respecting search filter but not artist/album filters)
    const searchFilter = filterInput.value;
    let baseTracks = tracks.slice();
    if (searchFilter) {
      baseTracks = filterTracks(baseTracks, searchFilter);
    }
    
    // Artist filter
    const artists = [...new Set(tracks.map(t => t.tags.artist || 'Unknown'))].sort();
    artistList.innerHTML = '';
    
    const allArtistsCount = baseTracks.filter(t => !activeAlbum || (t.tags.album || 'Unknown') === activeAlbum).length;
    const allArtists = createFilterItem('All', allArtistsCount, !activeArtist, (name) => {
      activeArtist = name === 'All' ? null : name;
      updateFilters();
      renderList();
    });
    artistList.appendChild(allArtists);
    
    artists.forEach(artist => {
      let count = baseTracks.filter(t => (t.tags.artist || 'Unknown') === artist);
      if (activeAlbum && activeAlbum !== 'All') {
        count = count.filter(t => (t.tags.album || 'Unknown') === activeAlbum);
      }
      if (count.length > 0) {
        const item = createFilterItem(artist, count.length, activeArtist === artist, (name) => {
          activeArtist = name;
          updateFilters();
          renderList();
        });
        artistList.appendChild(item);
      }
    });
    
    // Album filter
    const albums = [...new Set(tracks.map(t => t.tags.album || 'Unknown'))].sort();
    albumList.innerHTML = '';
    
    const allAlbumsCount = baseTracks.filter(t => !activeArtist || (t.tags.artist || 'Unknown') === activeArtist).length;
    const allAlbums = createFilterItem('All', allAlbumsCount, !activeAlbum, (name) => {
      activeAlbum = name === 'All' ? null : name;
      updateFilters();
      renderList();
    });
    albumList.appendChild(allAlbums);
    
    albums.forEach(album => {
      let count = baseTracks.filter(t => (t.tags.album || 'Unknown') === album);
      if (activeArtist && activeArtist !== 'All') {
        count = count.filter(t => (t.tags.artist || 'Unknown') === activeArtist);
      }
      if (count.length > 0) {
        const item = createFilterItem(album, count.length, activeAlbum === album, (name) => {
          activeAlbum = name;
          updateFilters();
          renderList();
        });
        albumList.appendChild(item);
      }
    });
  }

  function renderList() {
    // Sort tracks
    const sorted = [...filteredTracks].sort((a, b) => {
      let aVal = (a.tags[sortBy] || '').toString().toLowerCase();
      let bVal = (b.tags[sortBy] || '').toString().toLowerCase();
      
      if (sortBy === 'year') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }
      
      const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? result : -result;
    });

    // Safety check - ensure list is in list mode
    list.style.display = '';
    list.style.gridTemplateColumns = '';
    list.style.gap = '';
    list.classList.remove('grid');

    if (vlist) vlist.destroy();
    
    if (sorted.length === 0) {
      list.innerHTML = '<div style="color:#666;padding:20px;text-align:center;">No tracks found</div>';
      return;
    }
    
    vlist = new VirtualList({
      container: list,
      rowHeight: 56,
      total: sorted.length,
      renderRow: (i) => {
        const track = sorted[i];
        const el = createTrackElement(track, (t) => playTrack(t, i));
        if (currentTrack && currentTrack.filePath === track.filePath) {
          el.classList.add('playing');
        }
        return el;
      }
    });
  }

  function renderGrid() {
    if (vlist) vlist.destroy();
    list.innerHTML = '';
    list.style.display = 'grid';
    list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
    list.style.gap = '18px';
    list.classList.add('grid');
    
    // Sort tracks same as list view
    const sorted = [...filteredTracks].sort((a, b) => {
      let aVal = (a.tags[sortBy] || '').toString().toLowerCase();
      let bVal = (b.tags[sortBy] || '').toString().toLowerCase();
      
      if (sortBy === 'year') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }
      
      const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? result : -result;
    });
    
    if (sorted.length === 0) {
      list.innerHTML = '<div style="color:#666;padding:20px;text-align:center;grid-column:1/-1;">No tracks found</div>';
      return;
    }
    
    sorted.forEach((track, i) => {
      const card = document.createElement('div');
      card.className = 'track-card';
      card.innerHTML = `
        <img class="album-art" src="${track.albumArtDataUrl || 'assets/default-art.png'}" alt="Album Art" />
        <div class="track-name">${track.tags.title || track.file}</div>
        <div class="track-artist">${track.tags.artist || 'Unknown'}</div>
        <div class="track-album">${track.tags.album || 'Unknown'}</div>
        <div class="track-year">${track.tags.year || ''}</div>
        <div class="track-genre">${track.tags.genre || ''}</div>
      `;
      card.onclick = () => playTrack(track, i);
      if (currentTrack && currentTrack.filePath === track.filePath) card.classList.add('playing');
      list.appendChild(card);
    });
  }

  function playTrack(track, index = -1) {
    currentTrack = track;
    currentTrackIndex = index;
    
    const fileUrl = `file:///${track.filePath.replace(/\\/g, '/')}`;
    audio.src = fileUrl;
    audio.play();
    
    // Update player UI
    currentTitle.textContent = track.tags.title || track.file;
    currentArtist.textContent = track.tags.artist || 'Unknown';
    currentArt.src = track.albumArtDataUrl || 'assets/default-art.png';
    
    // Update play button
    playBtn.textContent = '⏸';
    isPlaying = true;
    
    // Update track styling
    renderList();
  }
  
  function togglePlay() {
    if (!currentTrack) return;
    
    if (isPlaying) {
      audio.pause();
      playBtn.textContent = '▶';
      isPlaying = false;
    } else {
      audio.play();
      playBtn.textContent = '⏸';
      isPlaying = true;
    }
  }
  
  function playPrevious() {
    if (currentTrackIndex > 0) {
      playTrack(filteredTracks[currentTrackIndex - 1], currentTrackIndex - 1);
    }
  }
  
  function playNext() {
    if (currentTrackIndex < filteredTracks.length - 1) {
      playTrack(filteredTracks[currentTrackIndex + 1], currentTrackIndex + 1);
    }
  }
});
