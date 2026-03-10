// App state and filtering logic (canonical location)
import { filterTracks, normalizeArtist } from './filter.js';

export const state = {
  tracks: [],
  filteredTracks: [],
  sortedTracks: [], // The sorted and filtered tracks as displayed in the list (includes track number ordering)
  // Index maps for fast filePath -> index lookups (rebuilt as lists change)
  tracksIndexByPath: null,
  filteredIndexByPath: null,
  sortedIndexByPath: null,
  currentTrack: null,
  currentTrackIndex: -1,
  isPlaying: false,
  isShuffle: false,
  playOrder: null,
  loopMode: 'off',
  sortBy: 'artist',
  sortOrder: 'asc',
  activeArtist: null,
  activeAlbum: null,
  activeYear: null,
  queue: [],
  libraryDirs: [],
  sidebarMode: 'artist',
  viewMode: 'library',
  activePlaylist: null,
  explicitArtistNames: false,
  themeStyle: 'flat',
  favorites: [],
  listHeaders: ['title','artist','album','year','genre'],
  favoriteViewEnabled: false,
  // User-defined column widths in pixels, keyed by header id (e.g., { title: 300, artist: 180 })
  columnWidths: {},
  // Grid sorting preference: when true, grid prefers album-first sorting
  gridSortByAlbum: false,
  // Global UI: Full Art Display Card toggle
  fullArtCardDisplay: false,
  // Whether sidebar artist/album/year filters should be applied
  sidebarFilteringEnabled: false,
  // Detector flag: enable native/high-performance ingestor for very large libraries
  useHighPerformanceIngestor: false,
};

// Expose to window for legacy modules that expect window.state immediately
try { if (typeof window !== 'undefined') window.state = state; } catch(e) {}

export function isFavorite(track) { return !!track && state.favorites.includes(track.filePath); }

export function toggleFavorite(track) {
  if (!track || !track.filePath) return;
  const idx = state.favorites.indexOf(track.filePath);
  if (idx === -1) { state.favorites.push(track.filePath); track.favorite = true; }
  else { state.favorites.splice(idx, 1); track.favorite = false; }
  if (window.moonshine?.updateConfig) window.moonshine.updateConfig({ favorites: state.favorites.slice() });
}

export function addToQueue(track) {
  if (!track || state.queue.some(t => t.filePath === track.filePath)) return;
  state.queue.push(track);
}
export function removeFromQueue(index) { if (index>=0 && index<state.queue.length) state.queue.splice(index,1); }
export function moveQueueItem(from,to){ if(from===to||from<0||to<0||from>=state.queue.length||to>=state.queue.length)return; const [it]=state.queue.splice(from,1); state.queue.splice(to,0,it);} 
export function clearQueue(){ state.queue = []; }

function buildIndexByPath(list) {
  const map = new Map();
  if (!Array.isArray(list) || list.length === 0) return map;
  for (let i = 0; i < list.length; i++) {
    const filePath = list[i]?.filePath;
    if (filePath) map.set(filePath, i);
  }
  return map;
}

export function rebuildTrackIndex() {
  state.tracksIndexByPath = buildIndexByPath(state.tracks);
  return state.tracksIndexByPath;
}

export function rebuildFilteredIndex() {
  state.filteredIndexByPath = buildIndexByPath(state.filteredTracks);
  return state.filteredIndexByPath;
}

export function rebuildSortedIndex() {
  state.sortedIndexByPath = buildIndexByPath(state.sortedTracks);
  return state.sortedIndexByPath;
}

export function rebuildAllIndexes() {
  rebuildTrackIndex();
  rebuildFilteredIndex();
  rebuildSortedIndex();
}

export function updateFilters(filterInput, sidebarFilteringEnabled=false) {
  const searchFilter = filterInput?.value || '';
  state.filteredTracks = state.tracks.slice();
  if (searchFilter) state.filteredTracks = filterTracks(state.filteredTracks, searchFilter);
  // Apply all sidebar filters in a single pass to avoid creating multiple intermediate arrays
  if (sidebarFilteringEnabled) {
    const filterArtist = state.activeArtist && state.activeArtist !== 'All' ? state.activeArtist : null;
    const filterAlbum  = state.activeAlbum  && state.activeAlbum  !== 'All' ? state.activeAlbum  : null;
    const filterYear   = state.activeYear   && state.activeYear   !== 'All' ? String(state.activeYear) : null;
    if (filterArtist || filterAlbum || filterYear) {
      const targetNorm = filterArtist ? normalizeArtist(filterArtist) : null;
      state.filteredTracks = state.filteredTracks.filter(t => {
        const tags = t.tags || {};
        if (filterArtist) {
          const raw = tags.artist || 'Unknown';
          if (state.explicitArtistNames) {
            if (raw !== filterArtist) return false;
          } else {
            if (normalizeArtist(raw) !== targetNorm && raw !== filterArtist) return false;
          }
        }
        if (filterAlbum  && (tags.album  || 'Unknown') !== filterAlbum)          return false;
        if (filterYear   && String(tags.year  || '')   !== filterYear)            return false;
        return true;
      });
    }
  }
  rebuildFilteredIndex();
  if (state.isShuffle) rebuildPlayOrder(); else state.playOrder = null;
}

export function resetSidebarFilters(){ state.activeArtist=null; state.activeAlbum=null; state.activeYear=null; }

export function rebuildPlayOrder(startAtCurrent=true){
  const n = state.filteredTracks.length;
  const order = Array.from({length:n}, (_,i)=>i);
  for (let i=n-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
  if (startAtCurrent && state.currentTrack){
    let idx = state.filteredIndexByPath?.get(state.currentTrack.filePath);
    if (typeof idx !== 'number') idx = state.filteredTracks.findIndex(t=>t.filePath===state.currentTrack.filePath);
    if (idx!==-1){ const pos = order.indexOf(idx); if (pos>0){ state.playOrder = order.slice(pos).concat(order.slice(0,pos)); return state.playOrder; } }
  }
  state.playOrder = order; return order;
}

export function setUseHighPerformanceIngestor(flag) {
  state.useHighPerformanceIngestor = !!flag;
  document.dispatchEvent(new CustomEvent('state:hpIngestorChanged', { detail: { flag: state.useHighPerformanceIngestor } }));
}
