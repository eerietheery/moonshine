// Normalize artist name for lumping
export function normalizeArtist(name) {
  if (!name) return 'Unknown';
  let n = name.toLowerCase().trim();
  // Remove (feat. ...), [anything], and after 'feat.'
  n = n.replace(/\s*\(feat\..*|ft\..*|featuring.*\)/gi, '');
  n = n.replace(/\s*\[.*?\]/g, '');
  // Split on ',', '&', ';', 'feat.', 'ft.', 'featuring' and only use the first part
  n = n.split(/,|&|;|feat\.|ft\.|featuring/)[0];
  n = n.replace(/[^a-z0-9 ]+/g, ''); // Remove punctuation except spaces
  n = n.replace(/\s+/g, ' '); // Collapse whitespace
  return n.trim();
}

// Group tracks by normalized artist
export function lumpArtists(tracks) {
  const groups = {};
  tracks.forEach(track => {
    const t = track.tags || {};
    const norm = normalizeArtist(t.artist);
    if (!groups[norm]) groups[norm] = [];
    groups[norm].push(track);
  });
  return groups;
}
// Filtering and grouping logic
export function filterTracks(tracks, filter) {
  const q = (filter || '').toLowerCase();
  if (!q) return tracks;
  return tracks.filter(track => {
    // Fast path: use pre-computed search key when available
    if (track._searchKey) return track._searchKey.includes(q);
    // Fallback: search individual fields
    const t = track.tags || {};
    return (
      (t.artist && t.artist.toLowerCase().includes(q)) ||
      (t.album && t.album.toLowerCase().includes(q)) ||
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.year && String(t.year).toLowerCase().includes(q))
    );
  });
}

export function groupBy(tracks, key) {
  return tracks.reduce((groups, track) => {
    const t = track.tags || {};
    const value = String(t[key] || 'Unknown').trim();
    if (!groups[value]) groups[value] = [];
    groups[value].push(track);
    return groups;
  }, {});
}
