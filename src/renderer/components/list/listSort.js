// src/renderer/components/list/listSort.js

export function sortTracks(tracks, sortBy, sortOrder, activeAlbum) {
  const isAlbumFocused = !!activeAlbum && tracks.length > 1 && tracks.every(t => (t.tags.album || 'Unknown') === activeAlbum);

  const sortedTracks = [...tracks];

  if (isAlbumFocused) {
    return sortedTracks.sort((a, b) => {
      const aNum = (typeof a.tags.track === 'number' ? a.tags.track : parseInt(a.tags.track)) || 0;
      const bNum = (typeof b.tags.track === 'number' ? b.tags.track : parseInt(b.tags.track)) || 0;
      if (aNum !== bNum) return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      // Fallback to title to keep ordering stable when track numbers are missing or equal
      const aTitle = (a.tags.title || a.file).toLowerCase();
      const bTitle = (b.tags.title || b.file).toLowerCase();
      const tcmp = aTitle < bTitle ? -1 : aTitle > bTitle ? 1 : 0;
      return sortOrder === 'asc' ? tcmp : -tcmp;
    });
  }

  return sortedTracks.sort((a, b) => {
    let aVal = (a.tags[sortBy] || '').toString().toLowerCase();
    let bVal = (b.tags[sortBy] || '').toString().toLowerCase();
    if (sortBy === 'year') {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    }
    const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'asc' ? result : -result;
  });
}
