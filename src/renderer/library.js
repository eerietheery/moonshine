import { state, updateFilters, resetSidebarFilters } from './components/state.js';
import { updateSidebarFilters } from './components/sidebar.js';
import { renderList } from './components/view.js';
import * as dom from './dom.js';

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
      spinner.style.width = '72px';
      spinner.style.height = '72px';
      spinner.style.opacity = '0.85';
      spinner.style.pointerEvents = 'none';
      spinner.innerHTML = `<img src="assets/images/clock.svg" alt="Loading..." style="width:100%;height:100%;filter:invert(1) drop-shadow(0 0 6px rgba(0,0,0,0.6));">`;
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
    const tracks = await window.etune.scanMusic(userPath);
    // Append new tracks, avoiding duplicates by filePath
    const existingPaths = new Set(state.tracks.map(t => t.filePath));
    const newTracks = tracks.filter(t => t && t.filePath && !existingPaths.has(t.filePath));
    state.tracks = state.tracks.concat(newTracks);
    // Track the folder added
    if (userPath && !state.libraryDirs.includes(userPath)) {
      state.libraryDirs.push(userPath);
      document.dispatchEvent(new CustomEvent('library-dirs-updated', { detail: state.libraryDirs.slice() }));
  window.etune.updateConfig({ libraryDirs: state.libraryDirs.slice() });
    }
    updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
    updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderList(dom.list), state.sidebarFilteringEnabled);
    renderList(dom.list);
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
    const tracks = await window.etune.scanMusic(dirPath);
    state.tracks = tracks.filter(t => t && t.filePath);
    // When explicitly loading a directory, set it as the only library (for initial scan or reset)
    if (dirPath && !state.libraryDirs.includes(dirPath)) {
      state.libraryDirs.push(dirPath);
      document.dispatchEvent(new CustomEvent('library-dirs-updated', { detail: state.libraryDirs.slice() }));
  window.etune.updateConfig({ libraryDirs: state.libraryDirs.slice() });
    }
    updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
    updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderList(dom.list), state.sidebarFilteringEnabled);
    renderList(dom.list);
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
    const res = await window.etune.initialScan();
    if (Array.isArray(res) && res.length) {
      state.tracks = res.filter(t => t && t.filePath);
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
  window.etune.updateConfig({ libraryDirs: state.libraryDirs.slice() });
      updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
      updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderList(dom.list), state.sidebarFilteringEnabled);
      renderList(dom.list);
      showSpinner(false);
    } else {
      // If initial scan is empty, load default directory
  const defaultDir = await window.etune.getDefaultMusicPath();
  loadMusic(defaultDir);
      showSpinner(false);
    }
  } catch {
    dom.list.innerHTML = '';
    showSpinner(false);
  }
}

export { addMusic, loadMusic, initialScan };
