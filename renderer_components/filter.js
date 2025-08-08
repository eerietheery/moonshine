function filterTracks(tracks, filter) {
  if (!filter) {
    return tracks;
  }
  const lowerCaseFilter = filter.toLowerCase();
  return tracks.filter(track => {
    const { tags } = track;
    return (
      (tags.artist && tags.artist.toLowerCase().includes(lowerCaseFilter)) ||
      (tags.album && tags.album.toLowerCase().includes(lowerCaseFilter)) ||
      (tags.title && tags.title.toLowerCase().includes(lowerCaseFilter))
    );
  });
}

module.exports = { filterTracks };
