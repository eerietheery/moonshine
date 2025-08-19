// Player UI logic: progress bar, volume, and UI event listeners
import { formatTime } from '../ui/ui.js';
import { togglePlay, playPrevious, playNext, toggleShuffle, toggleLoop } from './playerCore.js';
import { updateFilters } from '../shared/state.js';
import { updateSidebarFilters } from '../sidebar/sidebar.js';
import * as dom from '../../dom.js';
import { renderList, renderGrid } from '../shared/view.js';

export function setupPlayerUI(audio, playBtn, prevBtn, nextBtn, progressBar, progressFill, progressHandle, currentTime, totalTime, volume, currentArt, currentTitle, currentArtist, renderListFn, shuffleBtn, loopBtn) {
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
    if (window.state.loopMode === 'one') {
      audio.currentTime = 0;
      audio.play();
      return;
    }
    if (window.state.currentTrack) {
      const qIdx = window.state.queue.findIndex(t => t.filePath === window.state.currentTrack.filePath);
      if (qIdx !== -1) {
        window.state.queue.splice(qIdx, 1);
        import('../queue/queue.js').then(m => m.renderQueuePanel && m.renderQueuePanel()).catch(()=>{});
      }
    }
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
  volume.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = Math.sign(e.deltaY);
    let newVal = Number(volume.value) - delta * 5;
    newVal = Math.max(0, Math.min(100, newVal));
    volume.value = newVal;
    audio.volume = newVal / 100;
    setVolumeTrackBg();
  }, { passive: false });
  const volumeContainer = document.querySelector('.volume-container');
  if (volumeContainer) {
    volumeContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      let newVal = Number(volume.value) - delta * 5;
      newVal = Math.max(0, Math.min(100, newVal));
      volume.value = newVal;
      audio.volume = newVal / 100;
      setVolumeTrackBg();
    }, { passive: false });
  }
  setVolumeTrackBg();

  // Click handlers for now playing title/artist
  const enableSidebarFiltering = () => {
    if (!window.state.sidebarFilteringEnabled) window.state.sidebarFilteringEnabled = true;
  };
  if (currentArtist) {
    const handleArtist = () => {
      const artist = currentArtist.dataset.artist;
      if (!artist) return;
      enableSidebarFiltering();
      window.state.activeArtist = artist;
      if (window.state.activeAlbum) {
        const match = (window.state.currentTrack?.tags?.album || 'Unknown') === window.state.activeAlbum;
        if (!match) window.state.activeAlbum = null;
      }
      const filterInput = document.getElementById('filter');
      updateFilters(filterInput, window.state.sidebarFilteringEnabled);
      // Choose renderer dynamically so we don't force-list when grid is active
      const renderer = (dom.gridViewBtn && dom.gridViewBtn.classList.contains('active')) ? renderGrid : renderList;
      updateSidebarFilters(filterInput, document.getElementById('artist-list'), document.getElementById('album-list'), () => renderer(dom.list), window.state.sidebarFilteringEnabled);
      renderer(dom.list);
    };
    currentArtist.addEventListener('click', handleArtist);
    currentArtist.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleArtist(); } });
  }
  if (currentTitle) {
    const handleAlbum = () => {
      const album = currentTitle.dataset.album;
      if (!album) return;
      enableSidebarFiltering();
      window.state.activeAlbum = album;
      if (window.state.activeArtist) {
        const match = (window.state.currentTrack?.tags?.artist || 'Unknown') === window.state.activeArtist;
        if (!match) window.state.activeArtist = null;
      }
      const filterInput = document.getElementById('filter');
      updateFilters(filterInput, window.state.sidebarFilteringEnabled);
      // Choose renderer dynamically so we don't force-list when grid is active
      const renderer2 = (dom.gridViewBtn && dom.gridViewBtn.classList.contains('active')) ? renderGrid : renderList;
      updateSidebarFilters(filterInput, document.getElementById('artist-list'), document.getElementById('album-list'), () => renderer2(dom.list), window.state.sidebarFilteringEnabled);
      renderer2(dom.list);
    };
    currentTitle.addEventListener('click', handleAlbum);
    currentTitle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAlbum(); } });
  }
}
