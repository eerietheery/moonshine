import { state, updateFilters, resetSidebarFilters } from '../state.js';
import { updateSidebarFilters } from '../sidebar.js';
import { renderList } from '../view.js';
import * as dom from './dom.js';

async function addMusic(userPath) {
  dom.list.innerHTML = `<div class='loading-message'>Adding music files...</div>`;
  try {
    const tracks = await window.etune.scanMusic(userPath);
    // Append new tracks, avoiding duplicates by filePath
    const existingPaths = new Set(state.tracks.map(t => t.filePath));
    const newTracks = tracks.filter(t => t && t.filePath && !existingPaths.has(t.filePath));
    state.tracks = state.tracks.concat(newTracks);
    updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
    updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderList(dom.list), state.sidebarFilteringEnabled);
    renderList(dom.list);
  } catch (err) {
    dom.list.innerHTML = `<div style='color:#e74c3c;padding:16px;'>Error adding music: ${err.message}</div>`;
  }
}

async function loadMusic(dirPath) {
  dom.list.innerHTML = `<div class='loading-message'>Loading music files...</div>`;
  try {
    const tracks = await window.etune.scanMusic(dirPath);
    state.tracks = tracks.filter(t => t && t.filePath);
    updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
    updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderList(dom.list), state.sidebarFilteringEnabled);
    renderList(dom.list);
  } catch (err) {
    dom.list.innerHTML = `<div style='color:#e74c3c;padding:16px;'>Error loading music: ${err.message}</div>`;
  }
}

async function initialScan() {
  dom.list.innerHTML = `<div class='loading-message'>Preparing your library...</div>`;
  try {
    const res = await window.etune.initialScan();
    if (Array.isArray(res) && res.length) {
      state.tracks = res.filter(t => t && t.filePath);
      updateFilters(dom.filterInput, state.sidebarFilteringEnabled);
      updateSidebarFilters(dom.filterInput, dom.artistList, dom.albumList, () => renderList(dom.list), state.sidebarFilteringEnabled);
      renderList(dom.list);
    } else {
      dom.list.innerHTML = '';
    }
  } catch {
    dom.list.innerHTML = '';
  }
}

export { addMusic, loadMusic, initialScan };
