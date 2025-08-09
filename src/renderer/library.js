import { state, updateFilters, resetSidebarFilters } from '../state.js';
import { updateSidebarFilters } from '../sidebar.js';
import { renderList } from '../view.js';
import * as dom from './dom.js';

function showSpinner(show = true) {
  let spinner = document.getElementById('toolbar-spinner');
  if (show) {
    if (!spinner) {
      spinner = document.createElement('span');
      spinner.id = 'toolbar-spinner';
      spinner.style.display = 'inline-flex';
      spinner.style.width = '24px';
      spinner.style.height = '24px';
      spinner.style.marginLeft = '8px';
      spinner.style.marginRight = '0';
      spinner.innerHTML = `<img src="assets/clock.svg" alt="Loading..." style="width:100%;height:100%;filter:invert(1);vertical-align:middle;">`;
      dom.toolbar.appendChild(spinner);
    }
    // Always move spinner to the end of toolbar
    if (spinner && spinner.parentNode === dom.toolbar) {
      dom.toolbar.appendChild(spinner);
    }
  } else {
    if (spinner) spinner.remove();
  }
}

async function addMusic(userPath) {
  showSpinner(true);
  dom.list.innerHTML = `<div class='loading-message'>Adding music files...</div>`;
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
  dom.list.innerHTML = `<div class='loading-message'>Loading music files...</div>`;
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
  dom.list.innerHTML = `<div class='loading-message'>Preparing your library...</div>`;
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
