// Advanced Spectrum Analyzer - Converted from TypeScript
// Professional spectrum analyzer with musical frequency mapping and peak detection

import { colorMapper } from './colorMapping.js';

export class AdvancedSpectrumRenderer {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isActive = false;
    this.animationFrame = null;
    this.getFrequencyData = null;
    
    // Performance optimization - 60 FPS limiter
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    
    // Configuration
    this.config = {
      mode: 'linear', // 'linear' or 'circular'
      colorPalette: 'classic',
      barCount: 96,
      barWidth: 6,
      logarithmic: true,
      showPeaks: true,
      showGrid: true,
      ...config
    };
    
    // State arrays
    this.barHeights = [];
    this.smoothedHeights = [];
    this.peakHeights = [];
    this.peakDecayTimers = [];
    
    // Circular mode properties
    this.maxRadius = 0;
    this.angleStep = 0;
    
    // Internal settings
    this.smoothingFactor = 0.8;
    this.peakHoldTime = 30;
    this.dynamicRange = true;
    
    this.setupCircularMode();
  }

  start(getFrequencyData) {
    this.getFrequencyData = getFrequencyData;
    this.isActive = true;
    this.loop();
  }

  stop() {
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  setMode(mode) {
    this.config.mode = mode;
    if (mode === 'circular') {
      this.setupCircularMode();
    }
  }

  setColorPalette(palette) {
    this.config.colorPalette = palette;
  }

  resize() {
    if (this.config.mode === 'circular') {
      this.setupCircularMode();
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

  setupCircularMode() {
    this.maxRadius = Math.min(this.canvas.width, this.canvas.height) / 2 * 0.85;
    this.angleStep = (2 * Math.PI) / (this.config.barCount || 96);
  }

  render() {
    if (!this.getFrequencyData) return;
    const frequencyData = this.getFrequencyData();
    if (!frequencyData) return;
    
    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawSpectrum(frequencyData);
  }

  drawSpectrum(data) {
    const numBars = this.config.barCount || 96;
    
    // Initialize arrays if needed
    if (this.barHeights.length !== numBars) {
      this.barHeights = new Array(numBars).fill(0);
      this.smoothedHeights = new Array(numBars).fill(0);
      this.peakHeights = new Array(numBars).fill(0);
      this.peakDecayTimers = new Array(numBars).fill(0);
      this.angleStep = (2 * Math.PI) / numBars;
    }
    
    // Process frequency data
    this.processFrequencyData(data, numBars);
    
    if (this.config.mode === 'circular') {
      this.drawCircularSpectrum(numBars);
    } else {
      this.drawLinearSpectrum(numBars);
    }
  }

  processFrequencyData(data, numBars) {
    // Musical frequency mapping - logarithmic with better bass resolution
    const minFreq = 20; // Hz
    const maxFreq = 20000; // Hz
    const nyquist = 22050; // Assuming 44.1kHz sample rate
    
    for (let i = 0; i < numBars; i++) {
      // Logarithmic frequency distribution with extra bass emphasis
      const logMin = Math.log10(minFreq);
      const logMax = Math.log10(maxFreq);
      const t = i / (numBars - 1);
      
      // Apply a curve that gives more resolution to lower frequencies
      const curved_t = Math.pow(t, 0.6);
      const frequency = Math.pow(10, logMin + curved_t * (logMax - logMin));
      
      // Convert frequency to FFT bin
      const freqIndex = Math.floor((frequency / nyquist) * (data.length / 2));
      const clampedIndex = Math.max(1, Math.min(freqIndex, data.length - 1));
      
      // Get raw value and apply dynamic range compression
      let rawValue = data[clampedIndex] / 255.0;
      
      // Dynamic range compression - makes quiet sounds more visible
      if (this.dynamicRange) {
        rawValue = this.dynamicRangeCompression(rawValue);
      }
      
      // Apply smoothing with different rates for rise/fall
      const riseFactor = this.smoothingFactor;
      const fallFactor = 0.92;
      const smoothingFactor = rawValue > this.smoothedHeights[i] ? riseFactor : fallFactor;
      this.smoothedHeights[i] = this.smoothedHeights[i] * smoothingFactor + rawValue * (1 - smoothingFactor);
      this.barHeights[i] = this.smoothedHeights[i];
      
      // Peak detection and decay
      if (rawValue > this.peakHeights[i]) {
        this.peakHeights[i] = rawValue;
        this.peakDecayTimers[i] = this.peakHoldTime;
      } else {
        this.peakDecayTimers[i] = Math.max(0, this.peakDecayTimers[i] - 1);
        if (this.peakDecayTimers[i] === 0) {
          this.peakHeights[i] *= 0.96;
        }
      }
    }
  }

  drawLinearSpectrum(numBars) {
    const { width, height } = this.canvas;
    
    // Configuration
    const padding = Math.min(width * 0.02, 20);
    const drawWidth = width - (padding * 2);
    const drawHeight = height * 0.7;
    const bottomPadding = height * 0.15;
    
    const barWidth = drawWidth / numBars;
    const barSpacing = barWidth * 0.08;
    const actualBarWidth = barWidth - barSpacing;
    
    // Draw grid if enabled
    if (this.config.showGrid) {
      this.drawMusicalFrequencyLabels(width, height, padding, drawWidth);
      this.drawAmplitudeGrid(width, height, padding, drawHeight, bottomPadding);
    }
    
    // Draw bars
    this.drawEnhancedBars(numBars, padding, barWidth, actualBarWidth, drawHeight, height, bottomPadding);
  }

  drawCircularSpectrum(numBars) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Draw center reference if grid is enabled
    if (this.config.showGrid) {
      this.drawCircularGrid(centerX, centerY);
    }
    
    // Draw bars in circular arrangement
    for (let i = 0; i < numBars; i++) {
      const angle = i * this.angleStep - Math.PI / 2; // Start from top
      const barHeight = this.barHeights[i] * this.maxRadius * 0.8;
      
      // Calculate positions
      const innerRadius = this.maxRadius * 0.1;
      const outerRadius = innerRadius + barHeight;
      
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Calculate bar endpoints
      const x1 = centerX + cos * innerRadius;
      const y1 = centerY + sin * innerRadius;
      const x2 = centerX + cos * outerRadius;
      const y2 = centerY + sin * outerRadius;
      
      // Color based on frequency
      const color = this.getFrequencyColor(i, numBars);
      
      // Draw the bar as a line
      this.ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      this.ctx.lineWidth = Math.max(2, (numBars > 64 ? 1.5 : 3));
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
      
      // Draw peak indicator
      if (this.peakHeights[i] > 0.05) {
        const peakRadius = innerRadius + (this.peakHeights[i] * this.maxRadius * 0.8);
        const peakX = centerX + cos * peakRadius;
        const peakY = centerY + sin * peakRadius;
        
        this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, this.peakDecayTimers[i] / 15)})`;
        this.ctx.beginPath();
        this.ctx.arc(peakX, peakY, 2, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    }
  }

  drawCircularGrid(centerX, centerY) {
    // Draw center dot
    this.ctx.fillStyle = '#004444';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Draw amplitude rings
    this.ctx.strokeStyle = '#001111';
    this.ctx.lineWidth = 0.5;
    
    for (let ring = 1; ring <= 4; ring++) {
      const radius = this.maxRadius * 0.1 + (this.maxRadius * 0.8 * ring) / 4;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
  }

  dynamicRangeCompression(value) {
    if (value < 0.05) {
      return value * 1.5;
    } else if (value < 0.2) {
      return 0.075 + (value - 0.05) * 1.2;
    } else if (value < 0.7) {
      return 0.255 + (value - 0.2) * 1.0;
    } else {
      return 0.755 + (value - 0.7) * 0.5;
    }
  }

  getFrequencyColor(i, numBars) {
    const frequencyPosition = i / numBars;
    const baseIntensity = Math.min(1, this.barHeights[i] + 0.3);
    
    // Use colorMapper for intelligent color generation
    return colorMapper.getFrequencyColor(frequencyPosition, baseIntensity);
  }

  drawMusicalFrequencyLabels(width, height, padding, drawWidth) {
    this.ctx.fillStyle = '#003333';
    this.ctx.font = '9px Courier New';
    this.ctx.textAlign = 'center';
    
    const musicalFreqs = [
      { freq: 32.7, label: 'C1' },
      { freq: 65.4, label: 'C2' },
      { freq: 130.8, label: 'C3' },
      { freq: 261.6, label: 'C4' },
      { freq: 523.3, label: 'C5' },
      { freq: 1046.5, label: 'C6' },
      { freq: 2093, label: 'C7' }
    ];
    
    for (const point of musicalFreqs) {
      const t = Math.log10(point.freq / 20) / Math.log10(20000 / 20);
      const curveInverse = Math.pow(t, 1 / 0.6);
      const x = padding + curveInverse * drawWidth;
      
      if (x >= padding && x <= width - padding) {
        this.ctx.fillText(point.label, x, height - 2);
      }
    }
  }

  drawEnhancedBars(numBars, padding, barWidth, actualBarWidth, drawHeight, height, bottomPadding) {
    for (let i = 0; i < numBars; i++) {
      const x = padding + i * barWidth;
      const barHeight = this.barHeights[i] * drawHeight;
      const y = height - bottomPadding - barHeight;
      
      // Color based on frequency position
      const color = this.getFrequencyColor(i, numBars);
      
      // Create gradient
      const gradient = this.ctx.createLinearGradient(0, y + barHeight, 0, y);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
      
      // Draw main bar
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, y, actualBarWidth, barHeight);
      
      // Draw peak indicator
      if (this.config.showPeaks && this.peakHeights[i] > 0.05) {
        const peakY = height - bottomPadding - (this.peakHeights[i] * drawHeight);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, this.peakDecayTimers[i] / 15)})`;
        this.ctx.fillRect(x, peakY - 1, actualBarWidth, 2);
      }
    }
  }

  drawAmplitudeGrid(width, height, padding, drawHeight, bottomPadding) {
    this.ctx.strokeStyle = '#001111';
    this.ctx.lineWidth = 0.3;
    this.ctx.setLineDash([1, 4]);
    
    const amplitudeLevels = [0.25, 0.5, 0.75, 1.0];
    for (const level of amplitudeLevels) {
      const y = height - bottomPadding - (level * drawHeight);
      this.ctx.beginPath();
      this.ctx.moveTo(padding, y);
      this.ctx.lineTo(width - padding, y);
      this.ctx.stroke();
    }
    
    this.ctx.setLineDash([]);
  }
}