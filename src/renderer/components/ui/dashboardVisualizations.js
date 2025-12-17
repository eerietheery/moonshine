// Dashboard Visualizations - handles all audio visualization rendering
// Advanced modular visualization system for the secret dashboard

import { getCanvas, resizeCanvas } from './dashboardUI.js';
import { AdvancedSpectrogramRenderer } from './visualizers/AdvancedSpectrogramRenderer.js';
import { AdvancedSpectrumRenderer } from './visualizers/AdvancedSpectrumRenderer.js';
import { AdvancedHarmonicRenderer } from './visualizers/AdvancedHarmonicRenderer.js';
import { OscilloscopeRenderer } from './visualizers/OscilloscopeRenderer.js';

export class DashboardVisualizations {
  constructor(audioCtx, analyser) {
    this.audioCtx = audioCtx;
    this.analyser = analyser;
    this.isRunning = false;
    this.animationFrames = {};
    
    // Audio data arrays
    this.dataArray = null;
    this.freqArray = null;
    
    // Advanced visualizers - now all active simultaneously
    this.visualizers = {};
    this.activeVisualizers = []; // Array of currently running visualizers
    
    // Configuration applied to all visualizers
    this.config = {
      mode: 'circular', // linear or circular
      colorPalette: 'spectrum', // spectrum, fire, ocean, theme
      smoothingFactor: 0.7,
      showLabels: false // Disabled for grid view to reduce clutter
    };
    
    // Legacy spectrogram data for fallback
    this.spectrogramData = [];
    this.maxSpectrogramFrames = 200;

    this._boundResizeHandler = this.handleResize.bind(this);
    
    this.initializeAudioData();
    this.initializeAllVisualizers();
  }

  initializeAudioData() {
    if (!this.analyser) return;
    
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  initializeAllVisualizers() {
    try {
      // Initialize all visualizers with their dedicated canvases
      const canvasMap = {
        'spectrogram': 'spectrogram-canvas',
        'spectrum': 'spectrum-canvas', 
        'harmonic': 'harmonic-canvas',
        'oscilloscope': 'oscilloscope-canvas'
      };

      // Initialize spectrogram
      const spectrogramCanvas = this.getOrCreateCanvas(canvasMap.spectrogram);
      if (spectrogramCanvas) {
        this.visualizers.spectrogram = new AdvancedSpectrogramRenderer(spectrogramCanvas, {
          mode: 'linear', // Force linear for top banner
          colorPalette: this.config.colorPalette,
          scrollSpeed: 2,
          showLabels: this.config.showLabels
        });
      }

      // Initialize spectrum analyzer
      const spectrumCanvas = this.getOrCreateCanvas(canvasMap.spectrum);
      if (spectrumCanvas) {
        this.visualizers.spectrum = new AdvancedSpectrumRenderer(spectrumCanvas, {
          mode: this.config.mode,
          colorPalette: this.config.colorPalette,
          smoothingFactor: this.config.smoothingFactor,
          showLabels: this.config.showLabels
        });
      }

      // Initialize harmonic wheel
      const harmonicCanvas = this.getOrCreateCanvas(canvasMap.harmonic);
      if (harmonicCanvas) {
        this.visualizers.harmonic = new AdvancedHarmonicRenderer(harmonicCanvas, {
          mode: 'circular', // Force circular for harmonic wheel
          colorPalette: this.config.colorPalette,
          harmonicCount: 8,
          showLabels: this.config.showLabels
        });
      }

      // Initialize oscilloscope
      const oscilloscopeCanvas = this.getOrCreateCanvas(canvasMap.oscilloscope);
      if (oscilloscopeCanvas) {
        this.visualizers.oscilloscope = new OscilloscopeRenderer(oscilloscopeCanvas, {
          mode: 'linear',
          colorPalette: this.config.colorPalette,
          lineWidth: 2,
          glowEffect: true,
          showGrid: false
        });
      }

      // Track active visualizers
      this.activeVisualizers = Object.keys(this.visualizers).filter(key => 
        this.visualizers[key] !== null
      );
      
      console.log('Initialized visualizers:', this.activeVisualizers);
      
    } catch (error) {
      console.error('Failed to initialize visualizers:', error);
      this.fallbackToLegacyMode();
    }
  }

  getOrCreateCanvas(canvasId) {
    let canvas = getCanvas(canvasId);
    if (!canvas) {
      // Try to find the canvas in the current document
      canvas = document.getElementById(canvasId);
    }
    
    if (canvas) {
      resizeCanvas(canvas);
    }
    
    return canvas;
  }

  fallbackToLegacyMode() {
    console.log('Using legacy visualization mode');
    this.visualizers = {};
    this.activeVisualizers = [];
  }

  getFrequencyData = () => {
    if (this.analyser && this.freqArray) {
      this.analyser.getByteFrequencyData(this.freqArray);
      return this.freqArray;
    }
    return null;
  };

  getTimeDomainData = () => {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteTimeDomainData(this.dataArray);
      return this.dataArray;
    }
    return null;
  };

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.resizeAllCanvases();
    
    // Listen for window resize
    window.addEventListener('resize', this._boundResizeHandler);
    
    // Start all active visualizers simultaneously
    this.activeVisualizers.forEach(vizType => {
      const visualizer = this.visualizers[vizType];
      if (visualizer && typeof visualizer.start === 'function') {
        // Oscilloscope needs time domain data for waveform
        if (vizType === 'oscilloscope') {
          visualizer.start(this.getTimeDomainData);
        } else {
          visualizer.start(this.getFrequencyData);
        }
        console.log(`Started ${vizType} visualizer`);
      }
    });

    // Force a first resize notification so renderers created while hidden
    // (canvas 0x0 at construction time) can update their internal buffers/viewports.
    this.handleResize();

    // If no advanced visualizers are available, start legacy
    if (this.activeVisualizers.length === 0) {
      this.startLegacyVisualizations();
    }
  }

  stop() {
    this.isRunning = false;
    
    // Stop all active visualizers
    this.activeVisualizers.forEach(vizType => {
      const visualizer = this.visualizers[vizType];
      if (visualizer && typeof visualizer.stop === 'function') {
        visualizer.stop();
      }
    });
    
    // Cancel all animation frames
    Object.values(this.animationFrames).forEach(id => {
      if (id) cancelAnimationFrame(id);
    });
    this.animationFrames = {};
    
    // Remove resize listener
    window.removeEventListener('resize', this._boundResizeHandler);
  }

  handleResize() {
    if (this.isRunning) {
      this.resizeAllCanvases();
      
      // Notify all active visualizers of resize
      this.activeVisualizers.forEach(vizType => {
        const visualizer = this.visualizers[vizType];
        if (visualizer && typeof visualizer.resize === 'function') {
          visualizer.resize();
        }
      });
    }
  }

  resizeAllCanvases() {
    const canvasIds = ['spectrogram-canvas', 'spectrum-canvas', 'harmonic-canvas', 'oscilloscope-canvas'];
    canvasIds.forEach(id => {
      const canvas = getCanvas(id);
      if (canvas) resizeCanvas(canvas);
    });
  }

  // Configuration methods - now apply to all visualizers
  setMode(mode) {
    this.config.mode = mode;
    this.applyConfigToAll();
  }

  setColorPalette(palette) {
    this.config.colorPalette = palette;
    this.applyConfigToAll();
  }

  setSmoothingFactor(factor) {
    this.config.smoothingFactor = factor;
    this.applyConfigToAll();
  }

  setShowLabels(show) {
    this.config.showLabels = show;
    this.applyConfigToAll();
  }

  applyConfigToAll() {
    this.activeVisualizers.forEach(vizType => {
      const visualizer = this.visualizers[vizType];
      if (visualizer) {
        // Apply mode (but respect forced modes for some visualizers)
        if (typeof visualizer.setMode === 'function') {
          if (vizType === 'spectrogram') {
            visualizer.setMode('linear'); // Keep spectrogram linear
          } else if (vizType === 'harmonic') {
            visualizer.setMode('circular'); // Keep harmonic circular
          } else {
            visualizer.setMode(this.config.mode);
          }
        }
        
        // Apply other settings to all
        if (typeof visualizer.setColorPalette === 'function') {
          visualizer.setColorPalette(this.config.colorPalette);
        }
        if (typeof visualizer.setSmoothingFactor === 'function') {
          visualizer.setSmoothingFactor(this.config.smoothingFactor);
        }
        if (typeof visualizer.setShowLabels === 'function') {
          visualizer.setShowLabels(this.config.showLabels);
        }
      }
    });
  }

  getAvailableVisualizers() {
    return this.activeVisualizers;
  }

  getCurrentVisualizerInfo() {
    return {
      activeVisualizers: this.activeVisualizers,
      config: { ...this.config },
      gridMode: true
    };
  }

  // Legacy visualization methods (fallback)
  startLegacyVisualizations() {
    this.startSpectrogram();
    this.startSpectrum();
    this.startWaveform();
  }

  startSpectrogram() {
    const canvas = getCanvas('spectrogram-canvas');
    if (!canvas) return;
    
    const animate = () => {
      if (!this.isRunning) return;
      
      const ctx = canvas.getContext('2d');
      const { width, height } = resizeCanvas(canvas);
      
      if (this.analyser && this.freqArray) {
        this.analyser.getByteFrequencyData(this.freqArray);
        
        // Add current frame to spectrogram data
        this.spectrogramData.push([...this.freqArray]);
        if (this.spectrogramData.length > this.maxSpectrogramFrames) {
          this.spectrogramData.shift();
        }
        
        // Clear with slight fade
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw spectrogram
        const frameWidth = width / this.maxSpectrogramFrames;
        const binHeight = height / this.freqArray.length;
        
        this.spectrogramData.forEach((frame, frameIndex) => {
          frame.forEach((value, binIndex) => {
            const intensity = value / 255;
            const hue = 280 - (intensity * 80); // Purple to blue gradient
            const saturation = 70 + (intensity * 30);
            const lightness = intensity * 60;
            
            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            ctx.fillRect(
              frameIndex * frameWidth,
              height - (binIndex + 1) * binHeight,
              frameWidth,
              binHeight
            );
          });
        });
      }
      
      this.animationFrames.spectrogram = requestAnimationFrame(animate);
    };
    
    animate();
  }

  startSpectrum() {
    const canvas = getCanvas('spectrum-canvas');
    if (!canvas) return;
    
    const animate = () => {
      if (!this.isRunning) return;
      
      const ctx = canvas.getContext('2d');
      const { width, height } = resizeCanvas(canvas);
      
      if (this.analyser && this.freqArray) {
        this.analyser.getByteFrequencyData(this.freqArray);
        
        // Clear with fade
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw vertical spectrum bars
        const barHeight = height / this.freqArray.length;
        
        for (let i = 0; i < this.freqArray.length; i++) {
          const barWidth = (this.freqArray[i] / 255) * width * 0.8;
          const y = height - (i + 1) * barHeight;
          
          const intensity = this.freqArray[i] / 255;
          const hue = 280 - (intensity * 80);
          const lightness = 40 + (intensity * 30);
          
          ctx.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;
          ctx.fillRect(0, y, barWidth, barHeight);
        }
      }
      
      this.animationFrames.spectrum = requestAnimationFrame(animate);
    };
    
    animate();
  }

  startWaveform() {
    const canvas = getCanvas('waveform-canvas');
    if (!canvas) return;
    
    const animate = () => {
      if (!this.isRunning) return;
      
      const ctx = canvas.getContext('2d');
      const { width, height } = resizeCanvas(canvas);
      
      if (this.analyser && this.dataArray) {
        this.analyser.getByteTimeDomainData(this.dataArray);
        
        // Clear with fade
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = getComputedStyle(document.documentElement)
          .getPropertyValue('--primary-color').trim() || '#8C40B8';
        
        ctx.beginPath();
        const sliceWidth = width / this.dataArray.length;
        let x = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
          const v = (this.dataArray[i] - 128) / 128; // Normalize to -1 to 1
          const y = (v * height / 2) + height / 2;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          
          x += sliceWidth;
        }
        
        ctx.stroke();
      }
      
      this.animationFrames.waveform = requestAnimationFrame(animate);
    };
    
    animate();
  }

  // Enhanced cleanup with performance monitoring
  cleanup() {
    this.stop();
    
    // Cleanup all visualizers
    Object.values(this.visualizers).forEach(visualizer => {
      if (visualizer && typeof visualizer.cleanup === 'function') {
        visualizer.cleanup();
      }
    });
    
    // Clear visualizer references
    this.visualizers = {};
    this.currentVisualizer = null;
    
    // Clear audio data arrays
    this.frequencyData = null;
    this.timeDomainData = null;
    this.getFrequencyData = null;
    this.getTimeDomainData = null;
    
    // Clear legacy data
    this.spectrogramData = [];
    this.dataArray = null;
    this.freqArray = null;
    
    // Remove canvas and event listeners
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    console.log('Dashboard visualizations cleaned up');
  }

  // Performance monitoring
  getPerformanceInfo() {
    const info = {
      isRunning: this.active,
      currentVisualizer: this.visualizerType,
      availableVisualizers: this.getAvailableVisualizers(),
      memoryUsage: this.getMemoryUsage(),
      frameRate: this.getFrameRate()
    };

    if (this.currentVisualizer && typeof this.currentVisualizer.getPerformanceInfo === 'function') {
      info.visualizerSpecific = this.currentVisualizer.getPerformanceInfo();
    }

    return info;
  }

  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
      };
    }
    return { available: false };
  }

  getFrameRate() {
    // Simple frame rate tracking
    if (!this._frameCount) {
      this._frameCount = 0;
      this._lastFrameTime = performance.now();
      this._frameRate = 0;
    }

    this._frameCount++;
    const now = performance.now();
    const deltaTime = now - this._lastFrameTime;

    if (deltaTime >= 1000) {
      this._frameRate = Math.round((this._frameCount * 1000) / deltaTime);
      this._frameCount = 0;
      this._lastFrameTime = now;
    }

    return this._frameRate;
  }

  // Force cleanup for all visualizers
  forceCleanup() {
    this.activeVisualizers.forEach(vizType => {
      const visualizer = this.visualizers[vizType];
      if (visualizer && typeof visualizer.stop === 'function') {
        visualizer.stop();
      }
    });

    // Clear all canvases
    const canvasIds = ['spectrogram-canvas', 'spectrum-canvas', 'harmonic-canvas', 'oscilloscope-canvas'];
    canvasIds.forEach(canvasId => {
      const canvas = getCanvas(canvasId);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    });

    // Suggest garbage collection (if available)
    if (window.gc) {
      window.gc();
    }
  }
}