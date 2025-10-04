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

// Oscilloscope for toolbar (GPU-accelerated with WebGL, fallback to 2D)
const oscCanvas = document.getElementById('toolbar-osc');
if (oscCanvas) {
  let audioCtx, analyser, source, dataArray;

  // HiDPI scaling
  function sizeCanvas() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = oscCanvas.getBoundingClientRect();
    const w = Math.max(50, Math.floor(rect.width * dpr));
    const h = Math.max(20, Math.floor(rect.height * dpr));
    if (oscCanvas.width !== w || oscCanvas.height !== h) {
      oscCanvas.width = w;
      oscCanvas.height = h;
    }
    return { w, h, dpr };
  }

  // Try WebGL context first
  let gl = null;
  try {
    gl = oscCanvas.getContext('webgl', { antialias: false, alpha: true, preserveDrawingBuffer: false });
    if (!gl) gl = oscCanvas.getContext('experimental-webgl');
  } catch (_) { gl = null; }

  // Utility: compile shader
  const compileShader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('osc shader error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  };

  // Utility: robust CSS color -> rgb [0..1]
  let _colorProbeEl = null;
  const cssToRGB = (css) => {
    try {
      if (!_colorProbeEl) {
        _colorProbeEl = document.createElement('div');
        _colorProbeEl.style.display = 'none';
        document.body.appendChild(_colorProbeEl);
      }
      _colorProbeEl.style.color = css;
      const cs = getComputedStyle(_colorProbeEl).color; // e.g., "rgb(140, 64, 184)"
      const m = cs.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (m) return [parseInt(m[1],10)/255, parseInt(m[2],10)/255, parseInt(m[3],10)/255];
    } catch(_) {}
    // Fallback: try hex
    const mh = (css||'').trim().match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    if (mh) return [parseInt(mh[1],16)/255, parseInt(mh[2],16)/255, parseInt(mh[3],16)/255];
    return [0.56, 0.25, 0.72];
  };

  // WebGL program setup
  let program = null, posLoc = -1, colorLoc = null, uYOffsetLoc = null, vbo = null;
  let vertices = null; // Float32Array of xy pairs
  function initGL(pointCount) {
    const vs = `
      attribute vec2 aPos; // clip-space position
      uniform float uYOffset; // clip-space Y offset per pass
      void main() { gl_Position = vec4(aPos.x, aPos.y + uYOffset, 0.0, 1.0); }
    `;
    const fs = `
      precision mediump float;
      uniform vec3 uColor;
      void main(){ gl_FragColor = vec4(uColor, 1.0); }
    `;
    const vsh = compileShader(gl.VERTEX_SHADER, vs);
    const fsh = compileShader(gl.FRAGMENT_SHADER, fs);
    if (!vsh || !fsh) return false;
    program = gl.createProgram();
    gl.attachShader(program, vsh);
    gl.attachShader(program, fsh);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('osc program link error:', gl.getProgramInfoLog(program));
      return false;
    }
    posLoc = gl.getAttribLocation(program, 'aPos');
  colorLoc = gl.getUniformLocation(program, 'uColor');
  uYOffsetLoc = gl.getUniformLocation(program, 'uYOffset');
    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    vertices = new Float32Array(pointCount * 2);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.useProgram(program);
    return true;
  }

  // Update color uniform from CSS var (listen for theme changes)
  let colorRGB = [0.56, 0.25, 0.72];
  const refreshColor = () => {
    const css = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#8C40B8';
    colorRGB = cssToRGB(css);
  };
  document.addEventListener('theme:accent', refreshColor);
  document.addEventListener('theme:changed', refreshColor);
  refreshColor();
  // Ensure initial load picks up persisted accent before any manual theme change
  window.addEventListener('DOMContentLoaded', refreshColor);
  window.addEventListener('load', refreshColor);
  setTimeout(refreshColor, 300);

  // 2D fallback drawing
  let ctx2d = null;
  function draw2D() {
    requestAnimationFrame(draw2D);
    if (!analyser) return;
    const { w, h } = sizeCanvas();
    analyser.getByteTimeDomainData(dataArray);
    if (!ctx2d) ctx2d = oscCanvas.getContext('2d');
    ctx2d.clearRect(0, 0, w, h);
    // Increase base thickness by ~1px
    ctx2d.lineWidth = Math.max(1, Math.floor(h / 24)) + 1;
    // Recompose hex for stroke
    const [r,g,b] = colorRGB.map(c => Math.round(c*255));
    ctx2d.strokeStyle = `rgb(${r},${g},${b})`;
    ctx2d.beginPath();
    const slice = w / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] - 128) / 128; // -1..1
      const y = h * (0.5 - v * 0.45);
      if (i === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
      x += slice;
    }
    ctx2d.stroke();
  }

  function drawGL() {
    requestAnimationFrame(drawGL);
    if (!analyser || !gl || !program) return;
    const { w, h } = sizeCanvas();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    analyser.getByteTimeDomainData(dataArray);
    // Fill vertices as clip-space line strip
    const n = dataArray.length;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1; // -1..1
      const v = (dataArray[i] - 128) / 128; // -1..1
      const y = -v * 0.9; // flip to screen coords and scale a bit
      vertices[i * 2] = x;
      vertices[i * 2 + 1] = y;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
    gl.useProgram(program);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posLoc);
    gl.uniform3f(colorLoc, colorRGB[0], colorRGB[1], colorRGB[2]);
    // Emulate thicker lines by drawing multiple offsets in clip-space
    const basePx = Math.max(1, Math.floor(h / 24)) + 1; // ~1px thicker than before
    const passes = Math.max(1, basePx);
    const dyClip = 2 / h; // 1px in clip-space
    if (uYOffsetLoc) {
      const half = (passes - 1) / 2;
      for (let i = 0; i < passes; i++) {
        const offsetPx = (i - half); // center around 0
        gl.uniform1f(uYOffsetLoc, offsetPx * dyClip);
        gl.drawArrays(gl.LINE_STRIP, 0, n);
      }
    } else {
      gl.drawArrays(gl.LINE_STRIP, 0, n);
    }
  }

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
    
    // Expose globally for dashboard
    window.audioCtx = audioCtx;
    window.analyser = analyser;
    
    sizeCanvas();
    if (gl) {
      if (initGL(dataArray.length)) drawGL(); else { gl = null; draw2D(); }
    } else {
      draw2D();
    }
    
    // Setup dashboard button
    setupDashboardButton();
  }

  // Dashboard button setup
  function setupDashboardButton() {
    const dashboardBtn = document.getElementById('dashboard-btn');
    if (!dashboardBtn) {
      console.warn('Dashboard button not found');
      return;
    }
    
    console.log('Setting up dashboard button');
    
    dashboardBtn.addEventListener('click', (e) => {
      console.log('Dashboard button clicked! Loading dashboard...');
      
      // Load and show dashboard
      import('../components/ui/dashboardCore.js').then(module => {
        console.log('Dashboard core loaded successfully');
        module.showDashboard();
      }).catch(err => {
        console.error('Failed to load dashboard core:', err);
      });
      
      e.preventDefault();
    });
    
    console.log('Dashboard button event listener attached successfully');
  }

  window.addEventListener('resize', () => sizeCanvas(), { passive: true });
  window.addEventListener('DOMContentLoaded', () => { 
    setTimeout(setupOscilloscope, 400);
  });
}

