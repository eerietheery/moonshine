// Sidebar filter rendering
import { state, updateFilters } from './state.js';
import { createFilterItem } from './ui.js';
import { normalizeArtist } from './filter.js';

export function updateSidebarFilters(filterInput, artistList, albumList, renderList, sidebarFilteringEnabled = false) {
  const searchFilter = filterInput.value;
  let baseTracks = state.tracks.slice();
  if (searchFilter) {
    const searchLower = searchFilter.toLowerCase();
    baseTracks = baseTracks.filter(t => {
      const tgs = t.tags || {};
      return (
        (tgs.artist && tgs.artist.toLowerCase().includes(searchLower)) ||
        (tgs.album && tgs.album.toLowerCase().includes(searchLower)) ||
        (tgs.title && tgs.title.toLowerCase().includes(searchLower))
      );
    });
  }

  // Artist filter
  let artists, artistMap;
  if (state.explicitArtistNames) {
    artists = [...new Set(state.tracks.map(t => t.tags.artist || 'Unknown'))].sort();
    artistMap = {};
    artists.forEach(a => { artistMap[a] = a; });
  } else {
    // Lump artists by normalized name
    const normMap = {};
    state.tracks.forEach(t => {
      const norm = normalizeArtist(t.tags.artist || 'Unknown');
      if (!normMap[norm]) normMap[norm] = [];
      normMap[norm].push(t);
    });
    artists = Object.keys(normMap).sort();
    artistMap = {};
    // Use first original artist string for display
    artists.forEach(norm => {
      const first = normMap[norm][0]?.tags.artist || norm;
      artistMap[norm] = first;
    });
  }
  artistList.innerHTML = '';
  const allArtistsCount = baseTracks.filter(t => !state.activeAlbum || (t.tags.album || 'Unknown') === state.activeAlbum).length;
  const allArtists = createFilterItem('All', allArtistsCount, !state.activeArtist);
  artistList.appendChild(allArtists);
  artists.forEach(artistKey => {
    let count;
    if (state.explicitArtistNames) {
      count = baseTracks.filter(t => (t.tags.artist || 'Unknown') === artistKey);
    } else {
      count = baseTracks.filter(t => normalizeArtist(t.tags.artist || 'Unknown') === artistKey);
    }
    if (state.activeAlbum && state.activeAlbum !== 'All') {
      count = count.filter(t => (t.tags.album || 'Unknown') === state.activeAlbum);
    }
    if (count.length > 0) {
      const item = createFilterItem(artistMap[artistKey], count.length, state.activeArtist === artistMap[artistKey] || state.activeArtist === artistKey);
      artistList.appendChild(item);
    }
  });

  // Album filter
  const albums = [...new Set(state.tracks.map(t => t.tags.album || 'Unknown'))].sort();
  albumList.innerHTML = '';
  let allAlbumsCount;
  if (state.activeArtist && state.activeArtist !== 'All') {
    if (state.explicitArtistNames) {
      allAlbumsCount = baseTracks.filter(t => (t.tags.artist || 'Unknown') === state.activeArtist).length;
    } else {
      allAlbumsCount = baseTracks.filter(t => normalizeArtist(t.tags.artist || 'Unknown') === state.activeArtist || t.tags.artist === state.activeArtist).length;
    }
  } else {
    allAlbumsCount = baseTracks.length;
  }
  const allAlbums = createFilterItem('All', allAlbumsCount, !state.activeAlbum);
  albumList.appendChild(allAlbums);
  albums.forEach(album => {
    let count = baseTracks.filter(t => (t.tags.album || 'Unknown') === album);
    if (state.activeArtist && state.activeArtist !== 'All') {
      if (state.explicitArtistNames) {
        count = count.filter(t => (t.tags.artist || 'Unknown') === state.activeArtist);
      } else {
        count = count.filter(t => normalizeArtist(t.tags.artist || 'Unknown') === state.activeArtist || t.tags.artist === state.activeArtist);
      }
    }
    if (count.length > 0) {
      const item = createFilterItem(album, count.length, state.activeAlbum === album);
      albumList.appendChild(item);
    }
  });

  // Respect current mode for visibility; elements are toggled in UI events too
  if (state.sidebarMode === 'album') {
    artistList.style.display = 'none';
    albumList.style.display = '';
  } else {
    artistList.style.display = '';
    albumList.style.display = 'none';
  }
}
