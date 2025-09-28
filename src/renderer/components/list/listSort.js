// src/renderer/components/list/listSort.js

// Lightweight memoization cache to avoid repeated sorts when inputs are unchanged.
let _lastSortKey = null;
let _lastSorted = null;

export function sortTracks(tracks, sortBy, sortOrder, activeAlbum) {
  if (!Array.isArray(tracks)) return [];

  // Build a cheap key: length + first/last filePath + sort params. This avoids expensive hashing
  // while catching the common case where the filtered array hasn't changed.
  const firstPath = tracks.length ? (tracks[0].filePath || tracks[0].file || '') : '';
  const lastPath = tracks.length ? (tracks[tracks.length - 1].filePath || tracks[tracks.length - 1].file || '') : '';
  const key = `${tracks.length}|${firstPath}|${lastPath}|${sortBy}|${sortOrder}|${activeAlbum || ''}`;
  if (key === _lastSortKey && Array.isArray(_lastSorted)) {
    return _lastSorted;
  }

  const isAlbumFocused = !!activeAlbum && tracks.length > 1 && tracks.every(t => (t.tags && (t.tags.album || 'Unknown')) === activeAlbum);

  const sortedTracks = [...tracks];

  if (isAlbumFocused) {
    sortedTracks.sort((a, b) => {
      const aNum = (typeof a.tags?.track === 'number' ? a.tags.track : parseInt(a.tags?.track)) || 0;
      const bNum = (typeof b.tags?.track === 'number' ? b.tags.track : parseInt(b.tags?.track)) || 0;
      if (aNum !== bNum) return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      // Fallback to title to keep ordering stable when track numbers are missing or equal
      const aTitle = (a.tags?.title || a.file || '').toString().toLowerCase();
      const bTitle = (b.tags?.title || b.file || '').toString().toLowerCase();
      const tcmp = aTitle < bTitle ? -1 : aTitle > bTitle ? 1 : 0;
      return sortOrder === 'asc' ? tcmp : -tcmp;
    });
  } else {
    sortedTracks.sort((a, b) => {
      let aVal = (a.tags?.[sortBy] || '').toString().toLowerCase();
      let bVal = (b.tags?.[sortBy] || '').toString().toLowerCase();
      if (sortBy === 'year') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }
      const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? result : -result;
    });
  }

  // Cache result
  _lastSortKey = key;
  _lastSorted = sortedTracks;

  return sortedTracks;
}
