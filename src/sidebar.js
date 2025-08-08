// Sidebar filter rendering
import { state, updateFilters } from './state.js';
import { createFilterItem } from './ui.js';

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
  const artists = [...new Set(state.tracks.map(t => t.tags.artist || 'Unknown'))].sort();
  artistList.innerHTML = '';
  const allArtistsCount = baseTracks.filter(t => !state.activeAlbum || (t.tags.album || 'Unknown') === state.activeAlbum).length;
  const allArtists = createFilterItem('All', allArtistsCount, !state.activeArtist);
  artistList.appendChild(allArtists);
  artists.forEach(artist => {
    let count = baseTracks.filter(t => (t.tags.artist || 'Unknown') === artist);
    if (state.activeAlbum && state.activeAlbum !== 'All') {
      count = count.filter(t => (t.tags.album || 'Unknown') === state.activeAlbum);
    }
    if (count.length > 0) {
      const item = createFilterItem(artist, count.length, state.activeArtist === artist);
      artistList.appendChild(item);
    }
  });

  // Album filter
  const albums = [...new Set(state.tracks.map(t => t.tags.album || 'Unknown'))].sort();
  albumList.innerHTML = '';
  const allAlbumsCount = baseTracks.filter(t => !state.activeArtist || (t.tags.artist || 'Unknown') === state.activeArtist).length;
  const allAlbums = createFilterItem('All', allAlbumsCount, !state.activeAlbum);
  albumList.appendChild(allAlbums);
  albums.forEach(album => {
    let count = baseTracks.filter(t => (t.tags.album || 'Unknown') === album);
    if (state.activeArtist && state.activeArtist !== 'All') {
      count = count.filter(t => (t.tags.artist || 'Unknown') === state.activeArtist);
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
