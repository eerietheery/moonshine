// Player controls and playback logic
import { state, rebuildPlayOrder, updateFilters } from './state.js';
import { updateSidebarFilters } from './sidebar.js';
import { formatTime } from './ui.js';

export function setupPlayer(audio, playBtn, prevBtn, nextBtn, progressBar, progressFill, progressHandle, currentTime, totalTime, volume, currentArt, currentTitle, currentArtist, renderListFn, shuffleBtn, loopBtn) {
  playBtn.addEventListener('click', () => togglePlay(audio, playBtn));
  prevBtn.addEventListener('click', () => playPrevious(audio, renderListFn));
  nextBtn.addEventListener('click', () => playNext(audio, renderListFn));

  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => toggleShuffle(shuffleBtn));
  }

  if (loopBtn) {
    loopBtn.addEventListener('click', () => toggleLoop(loopBtn));
  }

  const setVolumeTrackBg = () => {
    try {
      const pct = Math.max(0, Math.min(100, Number(volume.value)));
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#8C40B8';
      // Two-layer background: colored fill up to pct, then base track
      volume.style.background = `linear-gradient(${primary} 0 0) 0/ ${pct}% 100% no-repeat, #333`;
    } catch {}
  };

  audio.addEventListener('loadedmetadata', () => {
    totalTime.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      const progress = (audio.currentTime / audio.duration) * 100;
      progressFill.style.width = `${progress}%`;
      progressHandle.style.left = `${progress}%`;
      currentTime.textContent = formatTime(audio.currentTime);
    }
  });
  audio.addEventListener('ended', () => {
    if (state.loopMode === 'one') {
      // Restart same track (do not remove from queue so it can loop)
      audio.currentTime = 0;
      audio.play();
      return;
    }
    // If current track was in queue, remove it (consumed)
    if (state.currentTrack) {
      const qIdx = state.queue.findIndex(t => t.filePath === state.currentTrack.filePath);
      if (qIdx !== -1) {
        state.queue.splice(qIdx, 1);
        import('./queue.js').then(m => m.renderQueuePanel && m.renderQueuePanel()).catch(()=>{});
      }
    }
    // Advance
    playNext(audio, renderListFn);
  });
  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
  });
  volume.addEventListener('input', (e) => {
    audio.volume = e.target.value / 100;
  setVolumeTrackBg();
  });

  // Scroll to change volume when hovering over slider
  volume.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation(); // prevent container handler from double firing
    const delta = Math.sign(e.deltaY);
    let newVal = Number(volume.value) - delta * 5;
    newVal = Math.max(0, Math.min(100, newVal));
    volume.value = newVal;
    audio.volume = newVal / 100;
  setVolumeTrackBg();
  }, { passive: false });

  // Also allow scrolling anywhere in the volume area (icon + slider)
  const volumeContainer = document.querySelector('.volume-container');
  if (volumeContainer) {
    volumeContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      // If the slider already handled it, ignore (we stop-propagation there)
      const delta = Math.sign(e.deltaY);
      let newVal = Number(volume.value) - delta * 5;
      newVal = Math.max(0, Math.min(100, newVal));
      volume.value = newVal;
      audio.volume = newVal / 100;
    setVolumeTrackBg();
    }, { passive: false });
  }

  // Initialize volume track background
  setVolumeTrackBg();

  // Click handlers for now playing title/artist
  const enableSidebarFiltering = () => {
    if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true;
  };
  if (currentArtist) {
    const handleArtist = () => {
      const artist = currentArtist.dataset.artist;
      if (!artist) return;
      enableSidebarFiltering();
      state.activeArtist = artist;
      // Keep album context only if matching
      if (state.activeAlbum) {
        const match = (state.currentTrack?.tags?.album || 'Unknown') === state.activeAlbum;
        if (!match) state.activeAlbum = null;
      }
      const filterInput = document.getElementById('filter');
      updateFilters(filterInput, state.sidebarFilteringEnabled);
      updateSidebarFilters(filterInput, document.getElementById('artist-list'), document.getElementById('album-list'), () => renderListFn(), state.sidebarFilteringEnabled);
      renderListFn();
    };
    currentArtist.addEventListener('click', handleArtist);
    currentArtist.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleArtist(); } });
  }
  if (currentTitle) {
    const handleAlbum = () => {
      const album = currentTitle.dataset.album;
      if (!album) return;
      enableSidebarFiltering();
      state.activeAlbum = album;
      // Keep artist context only if matching
      if (state.activeArtist) {
        const match = (state.currentTrack?.tags?.artist || 'Unknown') === state.activeArtist;
        if (!match) state.activeArtist = null;
      }
      const filterInput = document.getElementById('filter');
      updateFilters(filterInput, state.sidebarFilteringEnabled);
      updateSidebarFilters(filterInput, document.getElementById('artist-list'), document.getElementById('album-list'), () => renderListFn(), state.sidebarFilteringEnabled);
      renderListFn();
    };
    currentTitle.addEventListener('click', handleAlbum);
    currentTitle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAlbum(); } });
  }
}

export function playTrack(track, index, audio, playBtn, currentArt, currentTitle, currentArtist, renderList) {
  state.currentTrack = track;
  // Ensure index reflects position in filteredTracks so playNext/playPrevious work after queue exhausted
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
  // Store data for click filters
  currentTitle.dataset.album = albumText;
  currentArtist.dataset.artist = artistText;
  currentArt.src = track.albumArtDataUrl || 'assets/default-art.png';
  playBtn.textContent = '⏸';
  state.isPlaying = true;
  renderList();
  // Update queue panel (for upcoming after-queue preview)
  import('./queue.js').then(m => m.renderQueuePanel && m.renderQueuePanel()).catch(()=>{});
}

export function togglePlay(audio, playBtn) {
  if (!state.currentTrack) return;
  if (state.isPlaying) {
    audio.pause();
    playBtn.textContent = '▶';
    state.isPlaying = false;
  } else {
    audio.play();
    playBtn.textContent = '⏸';
    state.isPlaying = true;
  }
}

export function playPrevious(audio, renderList) {
  // If queue has items, play previous in queue
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
  }
  // ...existing code for filteredTracks...
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
  // If queue has items handle advancing through queue or starting it
  if (state.queue.length) {
    const curIdx = state.queue.findIndex(t => t.filePath === state.currentTrack?.filePath);
    if (curIdx === -1) {
      // Current track not from queue: start queue
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
    } else if (curIdx < state.queue.length - 1) {
      // Advance within queue
      playTrack(
        state.queue[curIdx + 1],
        curIdx + 1,
        audio,
        document.getElementById('play-btn'),
        document.getElementById('current-art'),
        document.getElementById('current-title'),
        document.getElementById('current-artist'),
        renderList
      );
      return;
    } else if (curIdx === state.queue.length - 1) {
      // End of queue reached: fall through to normal library (unless looping queue)
      if (state.loopMode === 'all') {
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
      // Otherwise continue into normal filtered tracks below
    }
  }
  // ...existing code for filteredTracks...
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
      // wrap to first
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
      // wrap to first
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
  // Cycle: off -> all -> one -> off
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
    // Add superscript 1 indicator
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