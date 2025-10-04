// Dashboard UI - creates and manages the dashboard DOM structure
// Separated UI creation from business logic

export function createDashboardUI() {
  // Create main container
  const container = document.createElement('div');
  container.id = 'secret-audio-dashboard';
  container.className = 'secret-dashboard';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(18, 18, 18, 0.95);
    backdrop-filter: blur(10px);
    z-index: 10000;
    display: none;
    padding: 20px;
    box-sizing: border-box;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #E0E0E0;
  `;

  // Create dashboard content
  const content = document.createElement('div');
  content.className = 'dashboard-content';
  content.style.cssText = `
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  `;
  
  // Create visualization grid (no control panel)
  const vizGrid = document.createElement('div');
  vizGrid.className = 'visualization-grid';
  vizGrid.style.cssText = `
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 2px;
    background: #222;
    border-radius: 8px;
    overflow: hidden;
  `;

  // Create spectrogram panel (spans full width across top)
  const spectrogramPanel = createVisualizerPanel('Spectrogram', 'spectrogram-canvas');
  spectrogramPanel.style.cssText += `
    grid-column: 1 / -1;
    grid-row: 1;
  `;

  // Create spectrum panel (bottom left)
  const spectrumPanel = createVisualizerPanel('Spectrum', 'spectrum-canvas');
  spectrumPanel.style.cssText += `
    grid-column: 1;
    grid-row: 2;
  `;

  // Create harmonic panel (bottom center)
  const harmonicPanel = createVisualizerPanel('Harmonic', 'harmonic-canvas');
  harmonicPanel.style.cssText += `
    grid-column: 2;
    grid-row: 2;
  `;

  // Create oscilloscope panel (bottom right)
  const oscilloscopePanel = createVisualizerPanel('Oscilloscope', 'oscilloscope-canvas');
  oscilloscopePanel.style.cssText += `
    grid-column: 3;
    grid-row: 2;
  `;

  vizGrid.appendChild(spectrogramPanel);
  vizGrid.appendChild(spectrumPanel);
  vizGrid.appendChild(harmonicPanel);
  vizGrid.appendChild(oscilloscopePanel);

  content.appendChild(vizGrid);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'dashboard-close';
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    font-size: 20px;
    cursor: pointer;
    z-index: 10001;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  `;
  
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'var(--primary-color)';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'var(--primary-color)';
  });

  container.appendChild(content);
  container.appendChild(closeBtn);
  document.body.appendChild(container);

  return container;
}

function createControlPanel() {
  const panel = document.createElement('div');
  panel.className = 'control-panel';
  panel.style.cssText = `
    background: rgba(30, 30, 30, 0.9);
    border-radius: 8px;
    border: 1px solid #333;
    padding: 15px;
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    align-items: center;
  `;

  // Mode selector
  const modeGroup = createControlGroup('Mode', [
    { value: 'circular', label: 'Circular' },
    { value: 'linear', label: 'Linear' }
  ], 'mode-select');

  // Color palette selector
  const colorGroup = createControlGroup('Colors', [
    { value: 'spectrum', label: 'Spectrum' },
    { value: 'fire', label: 'Fire' },
    { value: 'ocean', label: 'Ocean' },
    { value: 'theme', label: 'Theme' }
  ], 'color-select');

  // Settings toggles
  const settingsGroup = document.createElement('div');
  settingsGroup.className = 'settings-group';
  settingsGroup.style.cssText = `
    display: flex;
    gap: 10px;
    align-items: center;
  `;

  const labelsToggle = createToggle('Show Labels', 'labels-toggle', false);
  const smoothingSlider = createSlider('Smoothing', 'smoothing-slider', 0.7, 0, 1, 0.1);

  settingsGroup.appendChild(labelsToggle);
  settingsGroup.appendChild(smoothingSlider);

  panel.appendChild(modeGroup);
  panel.appendChild(colorGroup);
  panel.appendChild(settingsGroup);

  return panel;
}

function createVisualizerPanel(title, canvasId) {
  const panel = document.createElement('div');
  panel.className = 'visualizer-panel';
  panel.style.cssText = `
    background: rgba(20, 20, 20, 0.95);
    border: 1px solid #333;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  `;

  const canvas = document.createElement('canvas');
  canvas.id = canvasId;
  canvas.className = 'visualization-canvas';
  canvas.style.cssText = `
    width: 100%;
    height: 100%;
    display: block;
    border-radius: 0;
    position: relative;
    z-index: 1;
    opacity: 1;
  `;

  panel.appendChild(canvas);

  return panel;
}

function createControlGroup(label, options, selectId) {
  const group = document.createElement('div');
  group.className = 'control-group';
  group.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 5px;
  `;

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  labelEl.style.cssText = `
    font-size: 0.9rem;
    color: #B0B0B0;
    margin: 0;
  `;

  const select = document.createElement('select');
  select.id = selectId;
  select.style.cssText = `
    background: rgba(50, 50, 50, 0.9);
    color: #E0E0E0;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 0.9rem;
    min-width: 120px;
  `;

  options.forEach(option => {
    const optionEl = document.createElement('option');
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    select.appendChild(optionEl);
  });

  group.appendChild(labelEl);
  group.appendChild(select);
  
  return group;
}

function createToggle(label, id, defaultValue = false) {
  const group = document.createElement('div');
  group.className = 'toggle-group';
  group.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = id;
  checkbox.checked = defaultValue;
  checkbox.style.cssText = `
    width: 16px;
    height: 16px;
    accent-color: var(--primary-color, #8C40B8);
  `;

  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = label;
  labelEl.style.cssText = `
    font-size: 0.9rem;
    color: #B0B0B0;
    cursor: pointer;
  `;

  group.appendChild(checkbox);
  group.appendChild(labelEl);

  return group;
}

function createSlider(label, id, defaultValue, min, max, step) {
  const group = document.createElement('div');
  group.className = 'slider-group';
  group.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 5px;
  `;

  const labelEl = document.createElement('label');
  labelEl.textContent = `${label}: ${defaultValue}`;
  labelEl.style.cssText = `
    font-size: 0.9rem;
    color: #B0B0B0;
  `;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = id;
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = defaultValue;
  slider.style.cssText = `
    width: 100px;
    accent-color: var(--primary-color, #8C40B8);
  `;

  slider.addEventListener('input', () => {
    labelEl.textContent = `${label}: ${slider.value}`;
  });

  group.appendChild(labelEl);
  group.appendChild(slider);

  return group;
}

export function getCanvas(canvasId) {
  return document.getElementById(canvasId);
}

export function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { width: rect.width, height: rect.height };
}