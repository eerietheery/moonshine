// Spectrum analyzer visualization renderer using modular architecture

import { VisualizationBase } from '../../core/VisualizationBase.js';
import { RenderingEngine } from '../../core/RenderingEngine.js';
import { CanvasRenderer } from '../base/CanvasRenderer.js';
import { ExtendedVisualizationComponent } from '../base/VisualizationComponent.js';
import { 
  VisualizationConfig, 
  VisualizationMode, 
  VisualizationType,
  SpectrumConfig 
} from '../../types/VisualizationTypes.js';
import { rgbToString, intensityToColor, ColorPalette } from '../../utils/ColorUtils.js';

export class SpectrumRenderer extends VisualizationBase implements ExtendedVisualizationComponent {
  private renderingEngine: RenderingEngine;
  private canvasRenderer: CanvasRenderer;
  private spectrumConfig: SpectrumConfig;
  
  // State arrays
  private barHeights: number[] = [];
  private smoothedHeights: number[] = [];
  private peakHeights: number[] = [];
  private peakDecayTimers: number[] = [];
  
  // Circular mode properties
  private maxRadius: number = 0;
  private angleStep: number = 0;
  
  // Internal settings
  private showGrid: boolean = true;
  private smoothingFactor: number = 0.8;
  private peakHoldTime: number = 30;
  private dynamicRange: boolean = true;
  
  constructor(canvas: HTMLCanvasElement, config: SpectrumConfig = {}) {
    const fullConfig: VisualizationConfig = {
      mode: 'linear',
      colorPalette: 'classic',
      isActive: false,
      frameRate: 60,
      ...config
    };
    
    super(canvas, fullConfig);
    
    this.spectrumConfig = {
      barCount: 96,
      barWidth: 6,
      logarithmic: true,
      showPeaks: true,
      ...config
    };
    
    // Internal configuration not in the interface
    this.showGrid = true;
    this.smoothingFactor = 0.8;
    this.peakHoldTime = 30;
    this.dynamicRange = true;
    
    this.renderingEngine = new RenderingEngine(canvas);
    this.canvasRenderer = new CanvasRenderer(this.renderingEngine);
    
    this.setupCircularMode();
  }

  protected renderFrame(_timestamp: number, _deltaTime: number): void {
    const frequencyData = this.getFrequency();
    if (!frequencyData) return;
    
    // Clear canvas using rendering engine
    const canvasInfo = this.renderingEngine.getCanvasInfo();
    const ctx = this.renderingEngine.getContext();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasInfo.width, canvasInfo.height);
    
    this.drawSpectrum(frequencyData);
  }

  protected getVisualizationType(): string {
    return 'spectrum';
  }

  protected onColorPaletteChange(_palette: ColorPalette): void {
    // Color palette change is handled automatically by the getFrequencyColor method
    // No additional caching or state reset needed
  }

  getType(): VisualizationType {
    return 'spectrum';
  }

  isActive(): boolean {
    return this.config.isActive ?? false;
  }

  protected onModeChange(mode: VisualizationMode): void {
    if (mode === 'circular') {
      this.setupCircularMode();
    }
  }

  protected onResize(): void {
    this.renderingEngine.setupCanvas();
    this.canvasRenderer.updateCanvasInfo();
    if (this.config.mode === 'circular') {
      this.setupCircularMode();
    }
  }

  private setupCircularMode(): void {
    const maxRadius = this.renderingEngine.getMaxRadius();
    this.maxRadius = Math.max(maxRadius * 0.85, 50);
    this.angleStep = (2 * Math.PI) / (this.spectrumConfig.barCount || 96);
    console.log(`Spectrum circular setup: radius: ${this.maxRadius}`);
  }

  private drawSpectrum(data: Uint8Array): void {
    const canvasInfo = this.renderingEngine.getCanvasInfo();
    
    // Update circular mode if needed
    if (this.config.mode === 'circular') {
      const padding = 20;
      const maxPossibleRadius = Math.min(
        (canvasInfo.width - padding * 2) / 2,
        (canvasInfo.height - padding * 2) / 2
      );
      this.maxRadius = Math.max(maxPossibleRadius * 0.85, 50);
    }
    
    const numBars = this.spectrumConfig.barCount || 96;
    
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
      this.drawLinearSpectrum(numBars, canvasInfo);
    }
  }

  private processFrequencyData(data: Uint8Array, numBars: number): void {
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
      const curved_t = Math.pow(t, 0.6); // Flattens the curve for more bass resolution
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
        this.peakDecayTimers[i] = this.peakHoldTime; // Hold peak for configured frames
      } else {
        this.peakDecayTimers[i] = Math.max(0, this.peakDecayTimers[i] - 1);
        if (this.peakDecayTimers[i] === 0) {
          this.peakHeights[i] *= 0.96; // Slow decay
        }
      }
    }
  }

  private drawLinearSpectrum(numBars: number, canvasInfo: any): void {
    const { width, height } = canvasInfo;
    
    // Configuration
    const padding = Math.min(width * 0.02, 20);
    const drawWidth = width - (padding * 2);
    const drawHeight = height * 0.7; // Reduce height to 70% to prevent easy capping
    const bottomPadding = height * 0.15; // More bottom padding for labels
    
    const barWidth = drawWidth / numBars;
    const barSpacing = barWidth * 0.08;
    const actualBarWidth = barWidth - barSpacing;
    
    // Draw grid and labels if enabled
    if (this.showGrid) {
      this.drawMusicalFrequencyLabels(width, height, padding, drawWidth);
      this.drawAmplitudeGrid(width, height, padding, drawHeight, bottomPadding);
    }
    
    // Draw bars with enhanced visuals
    this.drawEnhancedBars(numBars, padding, barWidth, actualBarWidth, drawHeight, height, bottomPadding);
  }

  private drawCircularSpectrum(numBars: number): void {
    const canvasInfo = this.renderingEngine.getCanvasInfo();
    
    // Draw center reference if grid is enabled
    if (this.showGrid) {
      this.drawCircularGrid();
    }
    
    // Draw bars in circular arrangement
    for (let i = 0; i < numBars; i++) {
      const angle = i * this.angleStep - Math.PI / 2; // Start from top
      const barHeight = this.barHeights[i] * this.maxRadius * 0.8; // Use 80% of radius for bars
      
      // Calculate positions
      const innerRadius = this.maxRadius * 0.1; // 10% inner circle
      const outerRadius = innerRadius + barHeight;
      
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Calculate bar endpoints
      const x1 = canvasInfo.centerX + cos * innerRadius;
      const y1 = canvasInfo.centerY + sin * innerRadius;
      const x2 = canvasInfo.centerX + cos * outerRadius;
      const y2 = canvasInfo.centerY + sin * outerRadius;
      
      // Color based on frequency
      const color = this.getFrequencyColor(i, numBars);
      
      // Draw the bar as a line
      const ctx = this.renderingEngine.getContext();
      ctx.strokeStyle = rgbToString(color);
      ctx.lineWidth = Math.max(2, (numBars > 64 ? 1.5 : 3));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      // Draw peak indicator
      if (this.peakHeights[i] > 0.05) {
        const peakRadius = innerRadius + (this.peakHeights[i] * this.maxRadius * 0.8);
        const peakX = canvasInfo.centerX + cos * peakRadius;
        const peakY = canvasInfo.centerY + sin * peakRadius;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, this.peakDecayTimers[i] / 15)})`;
        ctx.beginPath();
        ctx.arc(peakX, peakY, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Add glow effect for high energy
      if (this.barHeights[i] > 0.3) {
        const glowColor = this.getFrequencyColor(i, numBars);
        ctx.shadowColor = rgbToString(glowColor);
        ctx.shadowBlur = Math.min(6, this.barHeights[i] * 8);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  private drawCircularGrid(): void {
    const canvasInfo = this.renderingEngine.getCanvasInfo();
    const ctx = this.renderingEngine.getContext();
    
    // Draw center dot
    ctx.fillStyle = '#004444';
    ctx.beginPath();
    ctx.arc(canvasInfo.centerX, canvasInfo.centerY, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw amplitude rings
    ctx.strokeStyle = '#001111';
    ctx.lineWidth = 0.5;
    
    for (let ring = 1; ring <= 4; ring++) {
      const radius = this.maxRadius * 0.1 + (this.maxRadius * 0.8 * ring) / 4;
      ctx.beginPath();
      ctx.arc(canvasInfo.centerX, canvasInfo.centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
    
    // Draw frequency division lines (every 30 degrees)
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      
      ctx.beginPath();
      ctx.moveTo(canvasInfo.centerX + cos * this.maxRadius * 0.1, canvasInfo.centerY + sin * this.maxRadius * 0.1);
      ctx.lineTo(canvasInfo.centerX + cos * this.maxRadius * 0.9, canvasInfo.centerY + sin * this.maxRadius * 0.9);
      ctx.stroke();
    }
  }

  private dynamicRangeCompression(value: number): number {
    // Apply more natural, gentle processing for authentic representation
    if (value < 0.05) {
      return value * 1.5; // Gentle boost for very quiet sounds
    } else if (value < 0.2) {
      return 0.075 + (value - 0.05) * 1.2; // Light boost for quiet sounds
    } else if (value < 0.7) {
      return 0.255 + (value - 0.2) * 1.0; // More linear region for authentic feel
    } else {
      return 0.755 + (value - 0.7) * 0.5; // Light compression only for very loud sounds
    }
  }

  private getFrequencyColor(i: number, numBars: number): { r: number; g: number; b: number } {
    // Calculate frequency-based position (0 = bass, 1 = treble)
    const frequencyPosition = i / numBars;
    
    // Base intensity from bar height
    const baseIntensity = Math.min(1, this.barHeights[i] + 0.3);
    
    // For classic palette, use frequency position to modulate the intensity
    // to achieve frequency-specific coloring
    let adjustedIntensity = baseIntensity;
    
    if (this.config.colorPalette === 'classic') {
      // Classic palette: Map frequency ranges to different intensity ranges
      // to get frequency-specific colors while using the palette system
      if (frequencyPosition < 0.3) {
        // Bass frequencies: map to lower intensity range (blues/cyans)
        adjustedIntensity = 0.2 + (baseIntensity * 0.4);
      } else if (frequencyPosition > 0.7) {
        // Treble frequencies: map to higher intensity range (yellows/whites)
        adjustedIntensity = 0.6 + (baseIntensity * 0.4);
      } else {
        // Mid frequencies: map to middle intensity range (greens)
        adjustedIntensity = 0.4 + (baseIntensity * 0.3);
      }
    }
    
    // Use the selected color palette from ColorUtils
    return intensityToColor(adjustedIntensity, this.config.colorPalette);
  }

  private drawMusicalFrequencyLabels(width: number, height: number, padding: number, drawWidth: number): void {
    const ctx = this.renderingEngine.getContext();
    
    ctx.fillStyle = '#003333';
    ctx.font = '9px Courier New';
    ctx.textAlign = 'center';
    
    // Musical frequency points that are meaningful
    const musicalFreqs = [
      { freq: 32.7, label: 'C1' },
      { freq: 65.4, label: 'C2' },
      { freq: 130.8, label: 'C3' },
      { freq: 261.6, label: 'C4' },
      { freq: 523.3, label: 'C5' },
      { freq: 1046.5, label: 'C6' },
      { freq: 2093, label: 'C7' },
      { freq: 4186, label: 'C8' },
      { freq: 8372, label: 'C9' }
    ];
    
    const minFreq = 20;
    const maxFreq = 20000;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    
    for (const point of musicalFreqs) {
      if (point.freq >= minFreq && point.freq <= maxFreq) {
        const logFreq = Math.log10(point.freq);
        const t = (logFreq - logMin) / (logMax - logMin);
        const curveInverse = Math.pow(t, 1 / 0.6); // Inverse of the curve used in frequency mapping
        const x = padding + curveInverse * drawWidth;
        
        if (x >= padding && x <= width - padding) {
          ctx.fillText(point.label, x, height - 2);
        }
      }
    }
  }

  private drawEnhancedBars(numBars: number, padding: number, barWidth: number, actualBarWidth: number, drawHeight: number, height: number, bottomPadding: number): void {
    const ctx = this.renderingEngine.getContext();
    
    for (let i = 0; i < numBars; i++) {
      const x = padding + i * barWidth;
      const barHeight = this.barHeights[i] * drawHeight;
      const y = height - bottomPadding - barHeight;
      
      // Enhanced gradient based on frequency
      const lowFreqFactor = Math.max(0, 1 - i / (numBars * 0.3)); // More red for bass
      const highFreqFactor = Math.max(0, (i - numBars * 0.7) / (numBars * 0.3)); // More white for treble
      
      const gradient = ctx.createLinearGradient(0, y + barHeight, 0, y);
      
      if (lowFreqFactor > 0.5) {
        // Bass frequencies - red to orange to yellow
        gradient.addColorStop(0, '#440011');
        gradient.addColorStop(0.3, '#cc2244');
        gradient.addColorStop(0.7, '#ff6644');
        gradient.addColorStop(1, '#ffaa44');
      } else if (highFreqFactor > 0.5) {
        // Treble frequencies - blue to cyan to white
        gradient.addColorStop(0, '#001144');
        gradient.addColorStop(0.3, '#0066cc');
        gradient.addColorStop(0.7, '#44aaff');
        gradient.addColorStop(1, '#aaffff');
      } else {
        // Mid frequencies - classic blue to cyan
        gradient.addColorStop(0, '#001144');
        gradient.addColorStop(0.3, '#0066cc');
        gradient.addColorStop(0.7, '#00aaff');
        gradient.addColorStop(1, '#44ffff');
      }
      
      // Draw main bar
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, actualBarWidth, barHeight);
      
      // Draw peak indicator
      if (this.peakHeights[i] > 0.05) {
        const peakY = height - bottomPadding - (this.peakHeights[i] * drawHeight);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, this.peakDecayTimers[i] / 15)})`;
        ctx.fillRect(x, peakY - 1, actualBarWidth, 2);
      }
      
      // Add glow effect for high energy
      if (this.barHeights[i] > 0.3) {
        ctx.shadowColor = lowFreqFactor > 0.5 ? '#ff6644' : '#44aaff';
        ctx.shadowBlur = Math.min(8, this.barHeights[i] * 12);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.barHeights[i] * 0.3})`;
        ctx.fillRect(x, y, actualBarWidth, Math.max(3, barHeight * 0.1));
        ctx.shadowBlur = 0;
      }
    }
  }

  private drawAmplitudeGrid(width: number, height: number, padding: number, drawHeight: number, bottomPadding: number): void {
    const ctx = this.renderingEngine.getContext();
    
    ctx.strokeStyle = '#001111';
    ctx.lineWidth = 0.3;
    ctx.setLineDash([1, 4]);
    
    // Draw horizontal grid lines for amplitude levels
    const amplitudeLevels = [0.25, 0.5, 0.75, 1.0];
    for (const level of amplitudeLevels) {
      const y = height - bottomPadding - (level * drawHeight);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  }

  // Configuration methods
  setShowGrid(show: boolean): void {
    this.showGrid = show;
  }

  setNumBars(numBars: number): void {
    const barCount = Math.max(16, Math.min(256, numBars));
    this.spectrumConfig.barCount = barCount;
    // Reset arrays when bar count changes
    this.barHeights = [];
    this.smoothedHeights = [];
    this.peakHeights = [];
    this.peakDecayTimers = [];
  }

  setSmoothingFactor(factor: number): void {
    this.smoothingFactor = Math.max(0.1, Math.min(0.99, factor));
  }

  setPeakHoldTime(frames: number): void {
    this.peakHoldTime = Math.max(0, Math.min(120, frames));
  }

  setDynamicRange(enabled: boolean): void {
    this.dynamicRange = enabled;
  }

  getSpectrumConfig(): SpectrumConfig {
    return { ...this.spectrumConfig };
  }
}