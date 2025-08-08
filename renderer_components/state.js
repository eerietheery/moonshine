let state = {
  tracks: []
};

const listeners = [];

function getTracks() {
  return state.tracks;
}

function setTracks(tracks) {
  state.tracks = tracks;
  notifyListeners();
}

function subscribe(listener) {
  listeners.push(listener);
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

module.exports = { getTracks, setTracks, subscribe };