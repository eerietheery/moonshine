// App state and filtering logic
import { filterTracks } from './filter.js';

export const state = {
  tracks: [],
  filteredTracks: [],
  currentTrack: null,
  currentTrackIndex: -1,
  isPlaying: false,
  // Shuffle/queue state
  isShuffle: false,
  // Array of indices mapping play order when shuffle is on; otherwise null
  playOrder: null,
  // Loop mode: 'off' | 'all' | 'one'
  loopMode: 'off',
  sortBy: 'artist',
  sortOrder: 'asc',
  activeArtist: null,
  activeAlbum: null,
  activeYear: null,
  queue: [], // Array of tracks
  // Top-level music folders the user has scanned/added
  libraryDirs: [],
  // Sidebar mode: 'artist' or 'album'
  sidebarMode: 'artist',
  // Artist lumping toggle
  explicitArtistNames: false,
};

// Queue helpers
export function addToQueue(track) {
  // Prevent duplicates by filePath
  if (!track || state.queue.some(t => t.filePath === track.filePath)) return;
  state.queue.push(track);
}

export function removeFromQueue(index) {
  if (index >= 0 && index < state.queue.length) state.queue.splice(index, 1);
}

export function moveQueueItem(from, to) {
  if (from === to || from < 0 || to < 0 || from >= state.queue.length || to >= state.queue.length) return;
  const [item] = state.queue.splice(from, 1);
  state.queue.splice(to, 0, item);
}

export function clearQueue() {
  state.queue = [];
}

export function updateFilters(filterInput, sidebarFilteringEnabled = false) {
  const searchFilter = filterInput.value;
  state.filteredTracks = state.tracks.slice();
  
  // Apply search filter
  if (searchFilter) {
    state.filteredTracks = filterTracks(state.filteredTracks, searchFilter);
  }
  
  // Apply sidebar filters only if enabled
  if (sidebarFilteringEnabled) {
    if (state.activeArtist && state.activeArtist !== 'All') {
      state.filteredTracks = state.filteredTracks.filter(t => (t.tags.artist || 'Unknown') === state.activeArtist);
    }
    if (state.activeAlbum && state.activeAlbum !== 'All') {
      state.filteredTracks = state.filteredTracks.filter(t => (t.tags.album || 'Unknown') === state.activeAlbum);
    }
    if (state.activeYear && state.activeYear !== 'All') {
      state.filteredTracks = state.filteredTracks.filter(t => String(t.tags.year || '') === String(state.activeYear));
    }
  }
  // Note: We don't reset activeArtist/activeAlbum here anymore
  // They should only be reset when sidebar filtering is toggled off

  // Rebuild shuffle order if needed to match new filtered list length
  if (state.isShuffle) {
    rebuildPlayOrder();
  } else {
    state.playOrder = null;
  }
}

export function resetSidebarFilters() {
  state.activeArtist = null;
  state.activeAlbum = null;
}

// Utility: rebuild play order as a random permutation of filtered track indices
export function rebuildPlayOrder(startAtCurrent = true) {
  const n = state.filteredTracks.length;
  const order = Array.from({ length: n }, (_, i) => i);
  // Fisher–Yates shuffle
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // If we have a current track in filtered list and want it to be first, rotate
  if (startAtCurrent && state.currentTrack) {
    const idx = state.filteredTracks.findIndex(t => t.filePath === state.currentTrack.filePath);
    if (idx !== -1) {
      const pos = order.indexOf(idx);
      if (pos > 0) {
        state.playOrder = order.slice(pos).concat(order.slice(0, pos));
        return state.playOrder;
      }
    }
  }
  state.playOrder = order;
  return order;
}
