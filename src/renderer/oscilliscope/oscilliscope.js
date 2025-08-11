
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
