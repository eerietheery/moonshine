// Core playback logic for player (migrated to player/ folder)
import { state, rebuildPlayOrder } from '../shared/state.js';

export function playTrack(track, index, audio, playBtn, currentArt, currentTitle, currentArtist, renderList) {
  state.currentTrack = track;
  const filteredIdx = state.filteredTracks.findIndex(t => t.filePath === track.filePath);
  state.currentTrackIndex = filteredIdx !== -1 ? filteredIdx : index;
  const fileUrl = `file:///${track.filePath.replace(/\\/g, '/')}`;
  audio.src = fileUrl;
  audio.play();
  const titleText = track.tags.title || track.file;
  const artistText = track.tags.artist || 'Unknown';
  const albumText = track.tags.album || 'Unknown';
  currentTitle.textContent = titleText;
  currentArtist.textContent = artistText;
  currentTitle.title = titleText;
  currentArtist.title = artistText;
  currentTitle.dataset.album = albumText;
  currentArtist.dataset.artist = artistText;
  currentArt.src = track.albumArtDataUrl || 'assets/images/default-art.png';
  playBtn.innerHTML = '<img src="assets/images/pause.svg" alt="Pause" style="width:18px;height:18px;vertical-align:middle;" />';
  state.isPlaying = true;
  // Lightweight: update playing highlight without re-render to prevent flicker
  try {
    const listEl = document.getElementById('music-list');
    if (listEl) {
      listEl.querySelectorAll('.track.playing').forEach(el => el.classList.remove('playing'));
      // Find a visible row whose attached filePath matches
      const rows = listEl.querySelectorAll('.track');
      for (const el of rows) {
        if (el.__filePath && el.__filePath === track.filePath) {
          el.classList.add('playing');
          break;
        }
      }
    }
  } catch (_) { /* ignore */ }
  import('../queue/queue.js').then(m => m.renderQueuePanel && m.renderQueuePanel()).catch(()=>{});
}

export function togglePlay(audio, playBtn) {
  if (!state.currentTrack) return;
  if (state.isPlaying) {
    audio.pause();
    playBtn.innerHTML = '<img src="assets/images/play-centered.svg" alt="Play" style="width:32px;height:32px;vertical-align:middle;" />';
    state.isPlaying = false;
  } else {
    audio.play();
    playBtn.innerHTML = '<img src="assets/images/pause.svg" alt="Pause" style="width:18px;height:18px;vertical-align:middle;" />';
    state.isPlaying = true;
  }
}

export function playPrevious(audio, renderList) {
  // Strict queue: if queue has tracks, play previous in queue
  if (state.queue.length) {
    const curIdx = state.queue.findIndex(t => t.filePath === state.currentTrack?.filePath);
    if (curIdx > 0) {
      playTrack(
        state.queue[curIdx - 1],
        curIdx - 1,
        audio,
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        renderList
      );
      return;
    }
    // If current isn't in queue, jump to last queued item
    if (curIdx === -1) {
      const last = state.queue[state.queue.length - 1];
      playTrack(
        last,
        state.queue.length - 1,
        audio,
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        renderList
      );
      return;
    }
    // If at first queued track, do nothing
    return;
  }
  // If queue is empty, use filteredTracks
  if (!state.filteredTracks.length) return;
  if (state.isShuffle && state.playOrder && state.playOrder.length) {
    const curIdx = state.currentTrackIndex;
    let pos = state.playOrder.indexOf(curIdx);
    if (pos === -1) {
      rebuildPlayOrder();
      pos = state.playOrder.indexOf(curIdx);
    }
    if (pos > 0) {
      const prevIdx = state.playOrder[pos - 1];
      playTrack(
        state.filteredTracks[prevIdx],
        prevIdx,
        audio,
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        renderList
      );
    }
  } else {
    if (state.currentTrackIndex > 0) {
      playTrack(
        state.filteredTracks[state.currentTrackIndex - 1],
        state.currentTrackIndex - 1,
        audio,
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        renderList
      );
    }
  }
}

export function playNext(audio, renderList) {
  // Strict queue: always play next from queue if any tracks remain
  if (state.queue.length) {
    // If current track is not in queue, play first queued track
    const curIdx = state.queue.findIndex(t => t.filePath === state.currentTrack?.filePath);
    if (curIdx === -1) {
      const next = state.queue.shift();
      import('./queue.js').then(m => m.renderQueuePanel && m.renderQueuePanel()).catch(()=>{});
      playTrack(
        next,
        0,
        audio,
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        renderList
      );
      return;
    } else {
      // Remove the just-played track from the queue
      state.queue.splice(curIdx, 1);
      import('./queue.js').then(m => m.renderQueuePanel && m.renderQueuePanel()).catch(()=>{});
      // If there are more tracks in the queue, play the next one
      if (state.queue.length) {
        playTrack(
          state.queue[0],
          0,
          audio,
          document.getElementById('play-btn'),
          document.getElementById('current-art'),
          document.getElementById('current-title'),
          document.getElementById('current-artist'),
          renderList
        );
        return;
      }
      // If queue is now empty, fall back to filteredTracks
    }
  }
  // If queue is empty, use filteredTracks
  if (!state.filteredTracks.length) return;
  if (state.isShuffle && state.playOrder && state.playOrder.length) {
    const curIdx = state.currentTrackIndex;
    let pos = state.playOrder.indexOf(curIdx);
    if (pos === -1) {
      rebuildPlayOrder();
      pos = state.playOrder.indexOf(curIdx);
    }
    const nextPos = pos === -1 ? 0 : pos + 1;
    if (nextPos < state.playOrder.length) {
      const nextIdx = state.playOrder[nextPos];
      playTrack(
        state.filteredTracks[nextIdx],
        nextIdx,
        audio,
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        renderList
      );
    } else if (state.loopMode === 'all') {
      const nextIdx = state.playOrder[0];
      playTrack(
        state.filteredTracks[nextIdx],
        nextIdx,
        audio,
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        renderList
      );
    }
  } else {
    if (state.currentTrackIndex < state.filteredTracks.length - 1) {
      playTrack(
        state.filteredTracks[state.currentTrackIndex + 1],
        state.currentTrackIndex + 1,
        audio,
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        renderList
      );
    } else if (state.loopMode === 'all') {
      playTrack(
        state.filteredTracks[0],
        0,
        audio,
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        renderList
      );
    }
  }
}

export function toggleShuffle(shuffleBtn) {
  state.isShuffle = !state.isShuffle;
  if (state.isShuffle) {
    rebuildPlayOrder(true);
    shuffleBtn.classList.add('active');
    shuffleBtn.title = 'Shuffle: On';
  } else {
    state.playOrder = null;
    shuffleBtn.classList.remove('active');
    shuffleBtn.title = 'Shuffle: Off';
  }
}

export function toggleLoop(loopBtn) {
  const next = state.loopMode === 'off' ? 'all' : state.loopMode === 'all' ? 'one' : 'off';
  state.loopMode = next;
  loopBtn.classList.toggle('active', next !== 'off');
  if (next === 'off') {
    loopBtn.title = 'Loop: Off';
    const indicator = loopBtn.querySelector('.loop-indicator');
    if (indicator) indicator.remove();
  } else if (next === 'all') {
    loopBtn.title = 'Loop: All';
    const indicator = loopBtn.querySelector('.loop-indicator');
    if (indicator) indicator.remove();
  } else {
    loopBtn.title = 'Loop: One';
    let indicator = loopBtn.querySelector('.loop-indicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'loop-indicator';
      indicator.style.cssText = 'position: absolute; top: 2px; right: 2px; font-size: 10px; font-weight: bold; color: currentColor;';
      loopBtn.style.position = 'relative';
      loopBtn.appendChild(indicator);
    }
    indicator.textContent = '1';
  }
}
