const { getTracks, subscribe } = require('./state');
const { filterTracks } = require('./filter');
const { updateTrackList } = require('./view');

function renderList() {
  const filterValue = document.getElementById('filter').value;
  const allTracks = getTracks();
  const filteredTracks = filterTracks(allTracks, filterValue);
  updateTrackList(filteredTracks);
}

function initializeUI() {
    document.getElementById('filter').addEventListener('input', renderList);
    subscribe(renderList);
}

module.exports = { initializeUI };
