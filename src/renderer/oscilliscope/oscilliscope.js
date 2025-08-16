/* NEWSCOPE 
// Hide only music table header and list while loading, spinner always visible
import { state } from '../components/shared/state.js';
function updateMusicTableContentVisibility() {
  const header = document.getElementById('music-table-header');
  const list = document.getElementById('music-list');
  const spinner = document.getElementById('center-spinner');
  const isLoading = !!spinner || window.__appLoading;
  // Be passive: only control header visibility when browsing playlists (no selection).
  // If a specific playlist is selected we should not override the header display.
  if (header && !(state.viewMode === 'playlist' && !state.activePlaylist)) header.style.display = isLoading ? 'none' : '';
  if (list) list.style.display = isLoading ? 'none' : '';
}
window.addEventListener('DOMContentLoaded', () => {
  updateMusicTableContentVisibility();
  const observer = new MutationObserver(updateMusicTableContentVisibility);
  observer.observe(document.body, { childList: true, subtree: true });
});

// Oscilloscope for toolbar
const oscCanvas = document.getElementById('toolbar-osc');
if (oscCanvas) {
  oscCanvas.width = 180;
  oscCanvas.height = 32;
  const oscCtx = oscCanvas.getContext('2d');
  let audioCtx, analyser, source, dataArray;

  function setupOscilloscope() {
    const audio = document.getElementById('audio');
    if (!audio) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!source) source = audioCtx.createMediaElementSource(audio);
    if (!analyser) analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 512;
    dataArray = new Uint8Array(analyser.fftSize);
    drawOscilloscope();
  }

  function drawOscilloscope() {
    requestAnimationFrame(drawOscilloscope);
    if (!analyser) return;
    analyser.getByteTimeDomainData(dataArray);
    // Draw normalized waveform so visual does not follow playback volume
    // (normalize each frame to ignore amplitude changes caused by volume)
    oscCtx.clearRect(0, 0, oscCanvas.width, oscCanvas.height);
    oscCtx.lineWidth = 2;
    oscCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || 'lime';
    oscCtx.beginPath();
    let sliceWidth = oscCanvas.width / dataArray.length;
    let x = 0;

    // Compute per-frame min/max to normalize amplitude
    let min = 255, max = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    // Half-range around center (128). Avoid divide-by-zero by ensuring at least 1.
    const halfRange = Math.max((max - min) / 2, 1);
    // Scale to map halfRange -> 128 (original unscaled midpoint span)
    let scale = 128 / halfRange;
    // Keep scale within reasonable bounds to avoid crazy spikes when data is nearly flat
    const MAX_SCALE = 4;
    const MIN_SCALE = 1;
    if (scale > MAX_SCALE) scale = MAX_SCALE;
    if (scale < MIN_SCALE) scale = MIN_SCALE;

    // Draw using normalized samples (centered at 128 but scaled by computed factor)
    for (let i = 0; i < dataArray.length; i++) {
      const vRaw = dataArray[i];
      // center around 0 then scale
      const v = (vRaw - 128) * scale;
      // compute y inside canvas
      const y = (oscCanvas.height / 2) + (v * (oscCanvas.height / 2) / 128);
      if (i === 0) {
        oscCtx.moveTo(x, y);
      } else {
        oscCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    oscCtx.lineTo(oscCanvas.width, oscCanvas.height / 2);
    oscCtx.stroke();
  }

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupOscilloscope, 800);
  });
}
 */

// OG SCOPE 
// Hide only music table header and list while loading, spinner always visible
function updateMusicTableContentVisibility() {
  const header = document.getElementById('music-table-header');
  const list = document.getElementById('music-list');
  const spinner = document.getElementById('center-spinner');
  const isLoading = !!spinner || window.__appLoading;
  if (header) header.style.display = isLoading ? 'none' : '';
  if (list) list.style.display = isLoading ? 'none' : '';
}
window.addEventListener('DOMContentLoaded', () => {
  updateMusicTableContentVisibility();
  const observer = new MutationObserver(updateMusicTableContentVisibility);
  observer.observe(document.body, { childList: true, subtree: true });
});

// Oscilloscope for toolbar
const oscCanvas = document.getElementById('toolbar-osc');
if (oscCanvas) {
  oscCanvas.width = 180;
  oscCanvas.height = 32;
  const oscCtx = oscCanvas.getContext('2d');
  let audioCtx, analyser, source, dataArray;

  function setupOscilloscope() {
    const audio = document.getElementById('audio');
    if (!audio) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!source) source = audioCtx.createMediaElementSource(audio);
    if (!analyser) analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 512;
    dataArray = new Uint8Array(analyser.fftSize);
    drawOscilloscope();
  }

  function drawOscilloscope() {
    requestAnimationFrame(drawOscilloscope);
    if (!analyser) return;
    analyser.getByteTimeDomainData(dataArray);
    oscCtx.clearRect(0, 0, oscCanvas.width, oscCanvas.height);
  oscCtx.lineWidth = 2;
  oscCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || 'lime';
    oscCtx.beginPath();
    let sliceWidth = oscCanvas.width / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      let v = dataArray[i] / 128.0;
      let y = (v * oscCanvas.height) / 2;
      if (i === 0) {
        oscCtx.moveTo(x, y);
      } else {
        oscCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    oscCtx.lineTo(oscCanvas.width, oscCanvas.height / 2);
    oscCtx.stroke();
  }

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(setupOscilloscope, 800);
  });
}

