/**
 * Mobile Tracks View - uses the existing music table/list
 */

/**
 * Show the standard track list and hide the mobile overlay container
 */
export function showTrackList() {
  const musicTable = document.getElementById('music-table');
  const musicList = document.getElementById('music-list');
  const container = document.querySelector('.mobile-view-container');

  if (container) container.style.display = 'none';
  if (musicTable) musicTable.style.display = 'flex';
  if (musicList) musicList.style.display = 'block';
}