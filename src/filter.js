// Filtering and grouping logic
export function filterTracks(tracks, filter) {
  const q = (filter || '').toLowerCase();
  return tracks.filter(track => {
    const t = track.tags || {};
    return (
      !q ||
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
