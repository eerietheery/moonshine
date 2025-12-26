import { state, updateFilters, resetSidebarFilters, rebuildTrackIndex } from './components/shared/state.js';
import { updateSidebarFilters } from './components/sidebar/sidebar.js';
import { renderList, renderGrid } from './components/shared/view.js';
import * as dom from './dom.js';
import { initializeAlbumArtCache, getAlbumArtStats } from './utils/albumArtCache.js';
import { scanMusicCached } from './utils/cachedMusicScanner.js';

function showSpinner(show = true) {
  let spinner = document.getElementById('center-spinner');
  if (show) {
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.id = 'center-spinner';
      spinner.style.position = 'absolute';
      spinner.style.top = '50%';
      spinner.style.left = '50%';
      spinner.style.transform = 'translate(-50%, -50%)';
      spinner.style.display = 'flex';
      spinner.style.alignItems = 'center';
      spinner.style.justifyContent = 'center';
  spinner.style.width = '96px';
  spinner.style.height = '96px';
      spinner.style.opacity = '0.85';
      spinner.style.pointerEvents = 'none';
   spinner.innerHTML = `
     <div style="position:relative;width:100%;height:100%;">
    <!-- Logo behind spinner (colored via mask with --primary-color) -->
    <div aria-hidden="true"
      style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) translate(-5px, -25px);width:175%;height:175%;
          background: var(--primary-color);
          -webkit-mask: url('assets/images/moonshinebottlelogo.svg') no-repeat center / contain;
          mask: url('assets/images/moonshinebottlelogo.svg') no-repeat center / contain;
          filter: drop-shadow(0 0 10px color-mix(in srgb, var(--primary-color) 60%, transparent));">
    </div>
    <!-- Spinner on top -->
    <img src="assets/images/clock.svg" alt="Loading..." 
      style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:58%;height:58%;object-fit:contain;filter:invert(1) drop-shadow(0 0 6px rgba(0,0,0,0.6));" />
     </div>`;
      // Ensure music table parent is positioned
      const container = document.getElementById('music-table') || dom.list.parentElement;
      if (container && getComputedStyle(container).position === 'static') {
        container.style.position = 'relative';
      }
      (container || document.body).appendChild(spinner);
    }
  } else {
    if (spinner) spinner.remove();
  }
}

async function addMusic(userPath) {
  showSpinner(true);
  dom.list.innerHTML = '';
  try {
    // Use cached scanner with progress tracking
    const tracks = await scanMusicCached(userPath, {
      forceFull: false,
      onProgress: (current, total, message) => {
        console.log(`📦 Scan progress: ${message} (${current}/${total})`);
        try { window.__setScanProgress(Math.round((current/total)*100), message); } catch (_) {}
      }
    });
    
    // Filter out tracks with all Unknown fields and/or error
    const validTracks = tracks.filter(t => {
      if (!t || !t.filePath) return false;
      if (t.error) return false;
      const tags = t.tags || {};
      const isUnknown = [tags.artist, tags.album, tags.title].every(v => v === 'Unknown');
      return !isUnknown;
    });
    // Append new tracks, avoiding duplicates by filePath
    const existingPaths = new Set(state.tracks.map(t => t.filePath));
    const newTracks = validTracks.filter(t => !existingPaths.has(t.filePath));
    
    // Initialize album art cache for new tracks
    if (newTracks.length > 0) {
      console.log(`🎨 Initializing album art cache for ${newTracks.length} new tracks...`);
      initializeAlbumArtCache(newTracks);
      
      // Log cache stats
      const stats = getAlbumArtStats();
      console.log(`📊 Album art cache stats:`, stats);
    }
    
    state.tracks = state.tracks.concat(newTracks);
    rebuildTrackIndex();
    // Track the folder added
    if (userPath && !state.libraryDirs.includes(userPath)) {
      state.libraryDirs.push(userPath);
      document.dispatchEvent(new CustomEvent('library-dirs-updated', { detail: state.libraryDirs.slice() }));
  window.moonshine.updateConfig({ libraryDirs: state.libraryDirs.slice() });
    }
  updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
  const renderer = (dom.gridViewBtn && dom.gridViewBtn.classList.contains('active')) ? renderGrid : renderList;
  updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderer(dom.list), state.sidebarFilteringEnabled);
  renderer(dom.list);
  showSpinner(false);
  } catch (err) {
    dom.list.innerHTML = `<div style='color:#e74c3c;padding:16px;'>Error adding music: ${err.message}</div>`;
  showSpinner(false);
  }
}

async function loadMusic(dirPath) {
  showSpinner(true);
  dom.list.innerHTML = '';
  try {
    // Use cached scanner for faster startup
    const tracks = await scanMusicCached(dirPath, {
      forceFull: false,
      onProgress: (current, total, message) => {
        console.log(`📦 Load progress: ${message} (${current}/${total})`);
        try { window.__setScanProgress(Math.round((current/total)*100), message); } catch (_) {}
      }
    });
    
    state.tracks = tracks.filter(t => {
      if (!t || !t.filePath) return false;
      if (t.error) return false;
      const tags = t.tags || {};
      const isUnknown = [tags.artist, tags.album, tags.title].every(v => v === 'Unknown');
      return !isUnknown;
    });
    rebuildTrackIndex();
    
    // Initialize album art cache
    if (state.tracks.length > 0) {
      console.log(`🎨 Initializing album art cache for ${state.tracks.length} tracks...`);
      initializeAlbumArtCache(state.tracks);
      
      // Log cache stats
      const stats = getAlbumArtStats();
      console.log(`📊 Album art cache stats:`, stats);
    }
    
    // Set favorite property on loaded tracks
    if (Array.isArray(state.favorites) && state.favorites.length) {
      state.tracks.forEach(t => {
        t.favorite = state.favorites.includes(t.filePath);
      });
    }
    // When explicitly loading a directory, set it as the only library (for initial scan or reset)
    if (dirPath && !state.libraryDirs.includes(dirPath)) {
      state.libraryDirs.push(dirPath);
      document.dispatchEvent(new CustomEvent('library-dirs-updated', { detail: state.libraryDirs.slice() }));
  window.moonshine.updateConfig({ libraryDirs: state.libraryDirs.slice() });
    }
  updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
  const renderer2 = (dom.gridViewBtn && dom.gridViewBtn.classList.contains('active')) ? renderGrid : renderList;
  updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderer2(dom.list), state.sidebarFilteringEnabled);
  renderer2(dom.list);
  showSpinner(false);
  } catch (err) {
    dom.list.innerHTML = `<div style='color:#e74c3c;padding:16px;'>Error loading music: ${err.message}</div>`;
  showSpinner(false);
  }
}

async function initialScan() {
  showSpinner(true);
  dom.list.innerHTML = '';
  try {
    const res = await window.moonshine.initialScan();
    if (Array.isArray(res) && res.length) {
      state.tracks = res.filter(t => {
        if (!t || !t.filePath) return false;
        if (t.error) return false;
        const tags = t.tags || {};
        const isUnknown = [tags.artist, tags.album, tags.title].every(v => v === 'Unknown');
        return !isUnknown;
      });
      rebuildTrackIndex();
      
      // Initialize album art cache
      if (state.tracks.length > 0) {
        console.log(`🎨 Initializing album art cache for ${state.tracks.length} tracks from initial scan...`);
        initializeAlbumArtCache(state.tracks);
        
        // Log cache stats
        const stats = getAlbumArtStats();
        console.log(`📊 Album art cache stats:`, stats);
      }
      
      // Set favorite property on loaded tracks
      if (Array.isArray(state.favorites) && state.favorites.length) {
        state.tracks.forEach(t => {
          t.favorite = state.favorites.includes(t.filePath);
        });
      }
      // Best effort to infer root dir from first track
      try {
        const first = state.tracks[0];
        if (first && first.filePath) {
          const root = first.filePath.split(/[\\/]/).slice(0, 3).join('/');
          if (root && !state.libraryDirs.includes(root)) {
            state.libraryDirs.push(root);
          }
        }
      } catch {}
      document.dispatchEvent(new CustomEvent('library-dirs-updated', { detail: state.libraryDirs.slice() }));
  window.moonshine.updateConfig({ libraryDirs: state.libraryDirs.slice() });
  updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
  const renderer3 = (dom.gridViewBtn && dom.gridViewBtn.classList.contains('active')) ? renderGrid : renderList;
  updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderer3(dom.list), state.sidebarFilteringEnabled);
  renderer3(dom.list);
      showSpinner(false);
    } else {
      // If initial scan is empty, load default directory
  const defaultDir = await window.moonshine.getDefaultMusicPath();
  loadMusic(defaultDir);
      showSpinner(false);
    }
  } catch {
    dom.list.innerHTML = '';
    showSpinner(false);
  }
}

export { addMusic, loadMusic, initialScan };
