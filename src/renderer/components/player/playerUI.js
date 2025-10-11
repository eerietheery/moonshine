// Player UI logic: progress bar, volume, and UI event listeners
import { formatTime } from '../ui/ui.js';
import { togglePlay, playPrevious, playNext, toggleShuffle, toggleLoop } from './playerCore.js';
import { updateFilters, state } from '../shared/state.js';
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
    // Handle loop-one mode: replay the same track
    if (state.loopMode === 'one') {
      audio.currentTime = 0;
      audio.play();
      return;
    }
    // Let playNext() handle all queue management and track progression
    playNext(audio, renderListFn);
  });
  
  // Enhanced progress bar interaction with smooth dragging
  let isDraggingProgress = false;
  let wasPlayingBeforeDrag = false;
  let dragStartTime = 0;
  
  const updateProgressFromEvent = (e) => {
    if (!audio.duration) return 0;
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * audio.duration;
    
    // Update visual feedback immediately
    progressFill.style.width = `${percent * 100}%`;
    progressHandle.style.left = `${percent * 100}%`;
    currentTime.textContent = formatTime(newTime);
    
    return newTime;
  };
  
  const startProgressDrag = (e) => {
    isDraggingProgress = true;
    wasPlayingBeforeDrag = state.isPlaying;
    dragStartTime = Date.now();
    
    // Pause audio while dragging for smoother experience
    if (state.isPlaying) {
      audio.pause();
    }
    
    // Add visual feedback classes
    progressBar.classList.add('dragging');
    progressHandle.classList.add('dragging');
    progressHandle.style.opacity = '1';
    
    // Update to initial position
    updateProgressFromEvent(e);
    
    // Prevent text selection during drag
    e.preventDefault();
    document.body.style.userSelect = 'none';
  };
  
  const continueProgressDrag = (e) => {
    if (!isDraggingProgress) return;
    updateProgressFromEvent(e);
  };
  
  const endProgressDrag = (e) => {
    if (!isDraggingProgress) return;
    
    isDraggingProgress = false;
    
    // Remove visual feedback classes
    progressBar.classList.remove('dragging');
    progressHandle.classList.remove('dragging');
    document.body.style.userSelect = '';
    
    // Set the actual audio time
    const newTime = updateProgressFromEvent(e);
    audio.currentTime = newTime;
    
    // Resume playing if it was playing before drag
    if (wasPlayingBeforeDrag) {
      audio.play();
    }
    
    // Hide handle after a brief delay unless hovering
    setTimeout(() => {
      if (!progressBar.matches(':hover')) {
        progressHandle.style.opacity = '0';
      }
    }, 200);
  };
  
  // Mouse events for progress bar
  progressBar.addEventListener('mousedown', startProgressDrag);
  document.addEventListener('mousemove', continueProgressDrag);
  document.addEventListener('mouseup', endProgressDrag);
  
  // Touch events for mobile support
  progressBar.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startProgressDrag({ clientX: touch.clientX, preventDefault: () => e.preventDefault() });
  });
  
  document.addEventListener('touchmove', (e) => {
    if (!isDraggingProgress) return;
    e.preventDefault(); // Prevent scrolling while dragging
    const touch = e.touches[0];
    continueProgressDrag({ clientX: touch.clientX });
  }, { passive: false });
  
  document.addEventListener('touchend', (e) => {
    if (!isDraggingProgress) return;
    // Use the last touch position or current mouse position
    const touch = e.changedTouches[0];
    endProgressDrag({ clientX: touch.clientX });
  });
  
  // Enhanced hover effects
  progressBar.addEventListener('mouseenter', () => {
    progressHandle.style.opacity = '1';
  });
  
  progressBar.addEventListener('mouseleave', () => {
    if (!isDraggingProgress) {
      progressHandle.style.opacity = '0';
    }
  });
  
  // Prevent the old click handler conflicts by detecting quick vs drag actions
  progressBar.addEventListener('click', (e) => {
    // Only handle click if we're not in the middle of a drag operation
    // and it was a quick click (not a drag that ended recently)
    const timeSinceLastDrag = Date.now() - dragStartTime;
    if (!isDraggingProgress && timeSinceLastDrag > 200) {
      const newTime = updateProgressFromEvent(e);
      audio.currentTime = newTime;
    }
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
    if (!state.sidebarFilteringEnabled) state.sidebarFilteringEnabled = true;
  };
  if (currentArtist) {
    const handleArtist = () => {
      const artist = currentArtist.dataset.artist;
      if (!artist) return;
      enableSidebarFiltering();
      
      // Allow swapping between artist and album filters
      // Clear album filter to focus on artist, unless both filters would show valid results
      if (state.activeAlbum && state.activeAlbum !== (state.currentTrack?.tags?.album || 'Unknown')) {
        state.activeAlbum = null;
      }
      
      state.activeArtist = artist;
      const filterInput = document.getElementById('filter');
      updateFilters(filterInput, state.sidebarFilteringEnabled);
      // Choose renderer dynamically so we don't force-list when grid is active
      const renderer = (dom.gridViewBtn && dom.gridViewBtn.classList.contains('active')) ? renderGrid : renderList;
      updateSidebarFilters(filterInput, document.getElementById('artist-list'), document.getElementById('album-list'), () => renderer(dom.list), state.sidebarFilteringEnabled);
      renderer(dom.list);
      
      // Dispatch event for other components (mobile, etc.)
      document.dispatchEvent(new CustomEvent('filterChanged', { 
        detail: { type: 'artist', value: artist, activeAlbum: state.activeAlbum } 
      }));
    };
    currentArtist.addEventListener('click', handleArtist);
    currentArtist.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleArtist(); } });
  }
  if (currentTitle) {
    const handleAlbum = () => {
      const album = currentTitle.dataset.album;
      if (!album) return;
      enableSidebarFiltering();
      
      // Allow swapping between album and artist filters  
      // Clear artist filter to focus on album, unless both filters would show valid results
      if (state.activeArtist && state.activeArtist !== (state.currentTrack?.tags?.artist || 'Unknown')) {
        state.activeArtist = null;
      }
      
      state.activeAlbum = album;
      const filterInput = document.getElementById('filter');
      updateFilters(filterInput, state.sidebarFilteringEnabled);
      // Choose renderer dynamically so we don't force-list when grid is active
      const renderer2 = (dom.gridViewBtn && dom.gridViewBtn.classList.contains('active')) ? renderGrid : renderList;
      updateSidebarFilters(filterInput, document.getElementById('artist-list'), document.getElementById('album-list'), () => renderer2(dom.list), state.sidebarFilteringEnabled);
      renderer2(dom.list);
      
      // Dispatch event for other components (mobile, etc.)
      document.dispatchEvent(new CustomEvent('filterChanged', { 
        detail: { type: 'album', value: album, activeArtist: state.activeArtist } 
      }));
    };
    currentTitle.addEventListener('click', handleAlbum);
    currentTitle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAlbum(); } });
  }
}
