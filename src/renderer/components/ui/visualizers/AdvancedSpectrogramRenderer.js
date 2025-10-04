// Advanced Spectrogram Visualization - Converted from TypeScript
// Real-time scrolling spectrogram with linear and circular radar modes

import { colorMapper } from './colorMapping.js';

export class AdvancedSpectrogramRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.colorMap = this.generateColorMap('classic');
    this.currentPalette = 'classic';
    this.mode = 'linear'; // 'linear' or 'circular'
    this.getFrequencyData = null;
    this.animationFrame = null;
    this.isActive = false;
    
    // Performance optimization - 60 FPS limiter
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    
    // Circular radar mode properties
    this.centerX = 0;
    this.centerY = 0;
    this.radius = 0;
    this.currentAngle = 0;
    this.angleStep = 0.002;
    
    this.updateCircularDimensions();
  }

  generateColorMap(palette) {
    const map = new Uint8ClampedArray(256 * 4);
    
    // Refresh colorMapper to ensure we have latest theme color
    colorMapper.refreshPrimaryColor();
    
    for (let i = 0; i < 256; i++) {
      const intensity = i / 255;
      const color = this.intensityToColor(intensity, palette);
      map[i * 4 + 0] = color.r;
      map[i * 4 + 1] = color.g;
      map[i * 4 + 2] = color.b;
      map[i * 4 + 3] = 255;
    }
    return map;
  }

  intensityToColor(intensity, palette) {
    // Use the colorMapper for intelligent color mapping
    const color = colorMapper.getIntensityColor(intensity, palette);
    return {
      r: color.r,
      g: color.g,
      b: color.b
    };
  }

  hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r, g, b;
    if (h < 1/6) { r = c; g = x; b = 0; }
    else if (h < 2/6) { r = x; g = c; b = 0; }
    else if (h < 3/6) { r = 0; g = c; b = x; }
    else if (h < 4/6) { r = 0; g = x; b = c; }
    else if (h < 5/6) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
      r: Math.floor((r + m) * 255),
      g: Math.floor((g + m) * 255),
      b: Math.floor((b + m) * 255)
    };
  }

  start(getFrequencyData) {
    this.getFrequencyData = getFrequencyData;
    this.isActive = true;
    this.currentAngle = 0;
    this.loop();
  }

  stop() {
    this.isActive = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'circular') {
      this.updateCircularDimensions();
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.currentAngle = 0;
    }
  }

  updateCircularDimensions() {
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.radius = Math.min(this.centerX, this.centerY) * 0.8;
  }

  setColorPalette(palette) {
    this.currentPalette = palette;
    this.colorMap = this.generateColorMap(palette);
  }

  resize() {
    if (this.mode === 'circular') {
      this.updateCircularDimensions();
    }
  }

  loop = () => {
    if (!this.isActive) return;
    
    // FPS limiting
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    if (elapsed >= this.frameInterval) {
      this.lastFrameTime = now - (elapsed % this.frameInterval);
      this.render();
    }
    
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  render() {
    if (!this.getFrequencyData) return;
    const spectrum = this.getFrequencyData();
    if (!spectrum) return;
    
    if (this.mode === 'circular') {
      this.renderCircularRadar(spectrum);
    } else {
      this.renderLinear(spectrum);
    }
  }

  renderLinear(spectrum) {
    const { width, height } = this.canvas;
    
    // Scroll the entire canvas content left by 1 pixel
    this.ctx.drawImage(this.canvas, 1, 0, width - 1, height, 0, 0, width - 1, height);
    
    // Create a new column imageData for the rightmost edge
    const columnData = this.ctx.createImageData(1, height);
    
    // Fill the new column with frequency data
    for (let y = 0; y < height; y++) {
      // Map y position to frequency bin (inverted so low frequencies are at bottom)
      const bin = Math.floor(((height - 1 - y) / height) * spectrum.length);
      const value = Math.min(255, spectrum[bin]);
      const idx = y * 4;
      
      columnData.data[idx + 0] = this.colorMap[value * 4 + 0]; // R
      columnData.data[idx + 1] = this.colorMap[value * 4 + 1]; // G
      columnData.data[idx + 2] = this.colorMap[value * 4 + 2]; // B
      columnData.data[idx + 3] = 255; // A
    }
    
    // Draw the new column at the right edge
    this.ctx.putImageData(columnData, width - 1, 0);
  }

  renderCircularRadar(spectrum) {
    const spokesPerFrame = 10;

    for (let i = 0; i < spokesPerFrame; i++) {
      const angle = this.currentAngle + i * this.angleStep;

      // Calculate end point of the radial line
      const endX = this.centerX + Math.cos(angle) * this.radius;
      const endY = this.centerY + Math.sin(angle) * this.radius;

      // Create gradient for the radial line
      const gradient = this.ctx.createLinearGradient(this.centerX, this.centerY, endX, endY);

      // Add color stops based on frequency data
      const numStops = 100;
      for (let j = 0; j <= numStops; j++) {
        const pos = j / numStops;
        const bin = Math.floor(pos * (spectrum.length - 1));
        const intensity = spectrum[bin] / 255;
        const color = this.intensityToColor(intensity, this.currentPalette);
        gradient.addColorStop(pos, `rgb(${color.r}, ${color.g}, ${color.b})`);
      }

      // Draw the antialiased radial line
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(this.centerX, this.centerY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }

    // Advance the current angle
    this.currentAngle += spokesPerFrame * this.angleStep;
    if (this.currentAngle >= Math.PI * 2) {
      this.currentAngle = 0;
    }
  }
}