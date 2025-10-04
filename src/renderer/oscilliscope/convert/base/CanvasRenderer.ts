// Shared canvas rendering utilities for visualization components

import { CanvasInfo } from '../../types/VisualizationTypes.js';
import { rgbToString, intensityToColor, ColorPalette } from '../../utils/ColorUtils.js';
import { mapFrequencyBin, processIntensity, polarToCartesian } from '../../utils/MathUtils.js';
import { RenderingEngine } from '../../core/RenderingEngine.js';

export class CanvasRenderer {
  protected renderEngine: RenderingEngine;
  protected canvasInfo: CanvasInfo;

  constructor(renderEngine: RenderingEngine) {
    this.renderEngine = renderEngine;
    this.canvasInfo = renderEngine.getCanvasInfo();
  }

  /**
   * Update canvas info (call after resize)
   */
  updateCanvasInfo(): void {
    this.canvasInfo = this.renderEngine.updateCanvasInfo();
  }

  /**
   * Render linear oscilloscope waveform
   */
  renderLinearOscilloscope(
    audioData: Uint8Array, 
    colorPalette: ColorPalette = 'classic',
    removeDCOffset: boolean = true
  ): void {
    if (audioData.length === 0) return;

    const safeArea = this.renderEngine.getSafeArea();
    
    // Calculate DC offset if needed
    let dcOffset = 0;
    if (removeDCOffset) {
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i];
      }
      dcOffset = sum / audioData.length;
    }

    // Draw waveform
    this.renderEngine.save();
    
    const color = intensityToColor(0.8, colorPalette);
    const ctx = this.renderEngine.getContext();
    ctx.strokeStyle = rgbToString(color);
    ctx.lineWidth = 2;
    ctx.beginPath();

    const centerY = safeArea.y + safeArea.height / 2;
    const stepX = safeArea.width / audioData.length;

    for (let i = 0; i < audioData.length; i++) {
      const correctedValue = audioData[i] - dcOffset;
      const amplitude = (correctedValue - 128) / 128; // Convert to -1 to 1 range
      const plotY = centerY + amplitude * (safeArea.height / 2);
      const plotX = safeArea.x + i * stepX;

      if (i === 0) {
        ctx.moveTo(plotX, plotY);
      } else {
        ctx.lineTo(plotX, plotY);
      }
    }

    ctx.stroke();
    this.renderEngine.restore();
  }

  /**
   * Render circular oscilloscope waveform
   */
  renderCircularOscilloscope(
    audioData: Uint8Array, 
    colorPalette: ColorPalette = 'classic',
    removeDCOffset: boolean = true
  ): void {
    if (audioData.length === 0) return;

    const radius = this.renderEngine.getMaxRadius() * 0.8;
    
    // Calculate DC offset if needed
    let dcOffset = 0;
    if (removeDCOffset) {
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += audioData[i];
      }
      dcOffset = sum / audioData.length;
    }

    this.renderEngine.save();
    
    const color = intensityToColor(0.8, colorPalette);
    const ctx = this.renderEngine.getContext();
    ctx.strokeStyle = rgbToString(color);
    ctx.lineWidth = 2;
    ctx.beginPath();

    const angleStep = (2 * Math.PI) / audioData.length;

    for (let i = 0; i < audioData.length; i++) {
      const correctedValue = audioData[i] - dcOffset;
      const amplitude = (correctedValue - 128) / 128;
      const angle = i * angleStep - Math.PI / 2;
      const r = radius + amplitude * radius * 0.3;

      const point = polarToCartesian(r, angle, this.canvasInfo.centerX, this.canvasInfo.centerY);

      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }

    ctx.closePath();
    ctx.stroke();
    this.renderEngine.restore();
  }

  /**
   * Render linear spectrum analyzer
   */
  renderLinearSpectrum(
    frequencyData: Uint8Array, 
    colorPalette: ColorPalette = 'classic',
    barCount: number = 64
  ): void {
    if (frequencyData.length === 0) return;

    const safeArea = this.renderEngine.getSafeArea();
    const barWidth = safeArea.width / barCount;

    for (let i = 0; i < barCount; i++) {
      const mappedIndex = mapFrequencyBin(i, barCount, frequencyData.length);
      const clampedIndex = Math.min(mappedIndex, frequencyData.length - 1);
      const rawIntensity = frequencyData[clampedIndex] / 255.0;
      const intensity = processIntensity(rawIntensity);

      if (intensity > 0.01) {
        const barHeight = intensity * safeArea.height;
        const barX = safeArea.x + i * barWidth;
        const barY = safeArea.y + safeArea.height - barHeight;

        const color = intensityToColor(intensity, colorPalette);
        this.renderEngine.drawRect(barX, barY, barWidth - 1, barHeight, color, true);
      }
    }
  }

  /**
   * Render circular spectrum analyzer
   */
  renderCircularSpectrum(
    frequencyData: Uint8Array, 
    colorPalette: ColorPalette = 'classic',
    barCount: number = 64
  ): void {
    if (frequencyData.length === 0) return;

    const maxRadius = this.renderEngine.getMaxRadius() * 0.9;
    const minRadius = maxRadius * 0.3;
    const angleStep = (2 * Math.PI) / barCount;

    for (let i = 0; i < barCount; i++) {
      const mappedIndex = mapFrequencyBin(i, barCount, frequencyData.length);
      const clampedIndex = Math.min(mappedIndex, frequencyData.length - 1);
      const rawIntensity = frequencyData[clampedIndex] / 255.0;
      const intensity = processIntensity(rawIntensity);

      if (intensity > 0.01) {
        const angle = i * angleStep - Math.PI / 2;
        const barLength = intensity * (maxRadius - minRadius);
        
        const innerPoint = polarToCartesian(minRadius, angle, this.canvasInfo.centerX, this.canvasInfo.centerY);
        const outerPoint = polarToCartesian(minRadius + barLength, angle, this.canvasInfo.centerX, this.canvasInfo.centerY);

        const color = intensityToColor(intensity, colorPalette);
        this.renderEngine.drawLine(innerPoint.x, innerPoint.y, outerPoint.x, outerPoint.y, color, 3);
      }
    }
  }

  /**
   * Render radar-style spectrogram
   */
  renderRadarSpectrogram(
    frequencyData: Uint8Array, 
    colorPalette: ColorPalette = 'classic',
    showGrid: boolean = true
  ): void {
    if (frequencyData.length === 0) return;

    const maxRadius = this.renderEngine.getMaxRadius() * 0.9;
    
    // Draw grid if enabled
    if (showGrid) {
      this.renderEngine.drawRadarGrid(
        this.canvasInfo.centerX, 
        this.canvasInfo.centerY, 
        maxRadius
      );
    }

    // Draw frequency data as radar sweep
    const angleStep = (2 * Math.PI) / frequencyData.length;

    for (let i = 0; i < frequencyData.length; i++) {
      const mappedIndex = mapFrequencyBin(i, frequencyData.length, frequencyData.length);
      const rawIntensity = frequencyData[Math.min(mappedIndex, frequencyData.length - 1)] / 255.0;
      const intensity = processIntensity(rawIntensity);

      if (intensity > 0.01) {
        const angle = i * angleStep - Math.PI / 2;
        const radius = intensity * maxRadius * 0.9;

        const point = polarToCartesian(radius, angle, this.canvasInfo.centerX, this.canvasInfo.centerY);
        const color = intensityToColor(intensity, colorPalette);

        // Draw line from center to point
        this.renderEngine.drawLine(
          this.canvasInfo.centerX, 
          this.canvasInfo.centerY, 
          point.x, 
          point.y, 
          rgbToString(color, 0.7), 
          2
        );

        // Draw point at end
        this.renderEngine.drawCircle(point.x, point.y, 2, color, true);
      }
    }
  }

  /**
   * Render simple spectrogram (time-frequency display)
   */
  renderSpectrogram(
    frequencyData: Uint8Array, 
    colorPalette: ColorPalette = 'classic',
    isLinear: boolean = true
  ): void {
    if (frequencyData.length === 0) return;

    const safeArea = this.renderEngine.getSafeArea();
    
    if (isLinear) {
      // Linear spectrogram - frequency bands as vertical strips
      const bandWidth = safeArea.width / frequencyData.length;
      
      for (let i = 0; i < frequencyData.length; i++) {
        const intensity = frequencyData[i] / 255.0;
        const processedIntensity = processIntensity(intensity);
        
        if (processedIntensity > 0.01) {
          const color = intensityToColor(processedIntensity, colorPalette);
          const x = safeArea.x + i * bandWidth;
          
          this.renderEngine.drawRect(x, safeArea.y, bandWidth, safeArea.height, color, true);
        }
      }
    } else {
      // Circular spectrogram
      this.renderRadarSpectrogram(frequencyData, colorPalette, false);
    }
  }

  /**
   * Render debug information overlay
   */
  renderDebugOverlay(
    frameRate: number, 
    frameTime: number, 
    renderTime: number, 
    mode: string
  ): void {
    const debugInfo = [
      `Mode: ${mode}`,
      `FPS: ${frameRate.toFixed(1)}`,
      `Frame: ${frameTime.toFixed(2)}ms`,
      `Render: ${renderTime.toFixed(2)}ms`
    ];

    this.renderEngine.save();
    
    // Semi-transparent background
    this.renderEngine.drawRect(10, 10, 150, debugInfo.length * 15 + 10, 'rgba(0,0,0,0.7)', true);
    
    // Debug text
    debugInfo.forEach((text, index) => {
      this.renderEngine.drawText(text, 15, 25 + index * 15, '#ffffff', '12px monospace');
    });
    
    this.renderEngine.restore();
  }

  /**
   * Get the rendering engine instance
   */
  getRenderingEngine(): RenderingEngine {
    return this.renderEngine;
  }
}