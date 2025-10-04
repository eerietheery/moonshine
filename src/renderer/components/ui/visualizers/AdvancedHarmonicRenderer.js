// Advanced Harmonic Visualization - Converted from TypeScript
// Wheel of fifths visualization with harmonic detection and particle effects

import { colorMapper } from './colorMapping.js';

export class AdvancedHarmonicRenderer {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.getFrequencyData = null;
    this.animationFrame = null;
    this.active = false;

    // Performance optimization - 60 FPS limiter
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
    this.lastFrameTime = 0;

    // Configuration
    this.config = {
      mode: 'circular',
      colorPalette: 'rainbow',
      harmonicCount: 8,
      maxHarmonics: 16,
      showLabels: false,
      showGrid: true,
      smoothingFactor: 0.3,
      ...config
    };

    // Wheel of fifths mapping
    this.wheelOfFifths = [
      { note: 'C', frequency: 261.63, angle: 0 },
      { note: 'G', frequency: 392.00, angle: Math.PI * 2 / 12 * 1 },
      { note: 'D', frequency: 293.66, angle: Math.PI * 2 / 12 * 2 },
      { note: 'A', frequency: 440.00, angle: Math.PI * 2 / 12 * 3 },
      { note: 'E', frequency: 329.63, angle: Math.PI * 2 / 12 * 4 },
      { note: 'B', frequency: 493.88, angle: Math.PI * 2 / 12 * 5 },
      { note: 'F#', frequency: 369.99, angle: Math.PI * 2 / 12 * 6 },
      { note: 'C#', frequency: 277.18, angle: Math.PI * 2 / 12 * 7 },
      { note: 'G#', frequency: 415.30, angle: Math.PI * 2 / 12 * 8 },
      { note: 'D#', frequency: 311.13, angle: Math.PI * 2 / 12 * 9 },
      { note: 'A#', frequency: 466.16, angle: Math.PI * 2 / 12 * 10 },
      { note: 'F', frequency: 349.23, angle: Math.PI * 2 / 12 * 11 }
    ];

    this.useWheelOfFifths = true;
    this.mostProminentNote = null;

    // Animation properties
    this.time = 0;
    this.particles = [];

    // Harmonic analysis
    this.fundamentalFrequency = 0;
    this.harmonicAmplitudes = new Array(this.config.maxHarmonics).fill(0);
    this.smoothedAmplitudes = new Array(this.config.maxHarmonics).fill(0);
    this.peakAmplitudes = new Array(this.config.maxHarmonics).fill(0);

    // Visual properties
    this.centerX = 0;
    this.centerY = 0;
    this.radius = 0;

    this.updateDimensions();
  }

  start(getFrequencyData) {
    this.getFrequencyData = getFrequencyData;
    this.active = true;
    this.time = 0;
    this.loop();
  }

  stop() {
    this.active = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  setMode(mode) {
    this.config.mode = mode;
    this.updateDimensions();
  }

  setColorPalette(palette) {
    this.config.colorPalette = palette;
  }

  resize() {
    this.updateDimensions();
    // Clear canvas after resize
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  updateDimensions() {
    // Fit to vertical height and center horizontally
    // Use the smaller dimension to ensure it fits properly
    const availableWidth = this.canvas.width;
    const availableHeight = this.canvas.height;
    
    // Calculate radius based on height (since it's mostly round)
    // Leave some padding for labels
    const maxRadius = (availableHeight / 2) * 0.85;
    
    // Center horizontally and vertically
    this.centerX = availableWidth / 2;
    this.centerY = availableHeight / 2;
    this.radius = maxRadius;
  }

  loop = () => {
    if (!this.active) return;
    
    // FPS limiting
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    if (elapsed >= this.frameInterval) {
      this.lastFrameTime = now - (elapsed % this.frameInterval);
      this.time += 0.016; // ~60fps
      this.render();
    }
    
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  render() {
    if (!this.getFrequencyData) return;

    const frequencyData = this.getFrequencyData();
    if (!frequencyData) return;

    // Analyze harmonics
    this.analyzeHarmonics(frequencyData);

    // Clear canvas with fade effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw background grid if enabled
    if (this.config.showGrid) {
      this.drawGrid();
    }

    // Draw radial spectrum
    this.drawRadialSpectrum(frequencyData);

    // Draw particles
    this.updateAndDrawParticles();

    // Draw central fundamental indicator
    this.drawFundamental();

    // Draw wheel of fifths labels and prominent note indicator
    if (this.useWheelOfFifths) {
      this.drawWheelOfFifthsLabels();
      this.drawProminentNoteIndicator();
    }

    // Draw labels if enabled
    if (this.config.showLabels) {
      this.drawLabels();
    }
  }

  analyzeHarmonics(frequencyData) {
    // Simple fundamental frequency detection
    let maxAmplitude = 0;
    let fundamentalBin = 0;

    const startBin = Math.floor((60 / 22050) * frequencyData.length);
    const endBin = Math.floor((500 / 22050) * frequencyData.length);

    for (let i = startBin; i < Math.min(endBin, frequencyData.length); i++) {
      if (frequencyData[i] > maxAmplitude) {
        maxAmplitude = frequencyData[i];
        fundamentalBin = i;
      }
    }

    this.fundamentalFrequency = (fundamentalBin / frequencyData.length) * 22050;
    this.findMostProminentNote(frequencyData);

    // Calculate harmonic amplitudes
    const harmonicCount = this.config.harmonicCount || 8;
    for (let h = 1; h <= harmonicCount; h++) {
      const harmonicBin = Math.floor(fundamentalBin * h);
      if (harmonicBin < frequencyData.length) {
        const amplitude = frequencyData[harmonicBin] / 255;
        this.harmonicAmplitudes[h - 1] = amplitude;

        const smoothing = this.config.smoothingFactor || 0.3;
        this.smoothedAmplitudes[h - 1] =
          this.smoothedAmplitudes[h - 1] * smoothing +
          amplitude * (1 - smoothing);

        if (amplitude > this.peakAmplitudes[h - 1]) {
          this.peakAmplitudes[h - 1] = amplitude;
        } else {
          this.peakAmplitudes[h - 1] *= 0.99;
        }
      }
    }
  }

  findMostProminentNote(frequencyData) {
    let maxAmplitude = 0;
    let maxBin = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxAmplitude) {
        maxAmplitude = frequencyData[i];
        maxBin = i;
      }
    }

    if (maxAmplitude > 10) {
      const frequency = this.binToFrequency(maxBin, frequencyData.length);
      const noteInfo = this.getWheelOfFifthsNoteInfo(frequency);
      this.mostProminentNote = {
        note: noteInfo.note,
        angle: noteInfo.angle,
        amplitude: maxAmplitude / 255
      };
    } else {
      this.mostProminentNote = null;
    }
  }

  drawGrid() {
    this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    this.ctx.lineWidth = 1;

    // Draw concentric circles
    const circleCount = 4;
    for (let i = 1; i <= circleCount; i++) {
      const radius = (this.radius / circleCount) * i;
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Draw radial lines
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.ctx.beginPath();
      this.ctx.moveTo(this.centerX, this.centerY);
      this.ctx.lineTo(
        this.centerX + Math.cos(angle) * this.radius,
        this.centerY + Math.sin(angle) * this.radius
      );
      this.ctx.stroke();
    }
  }

  drawRadialSpectrum(frequencyData) {
    const binCount = Math.min(frequencyData.length, 1024);

    // Pre-calculate harmonic angles
    const harmonicAngles = [];
    if (this.fundamentalFrequency > 0) {
      const nyquist = 22050;
      for (let h = 1; h <= (this.config.harmonicCount || 8); h++) {
        const harmonicFreq = this.fundamentalFrequency * h;
        const normalizedFreq = harmonicFreq / nyquist;
        const angle = normalizedFreq * Math.PI * 2;
        if (angle < Math.PI * 2) {
          harmonicAngles.push(angle);
        }
      }
    }

    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';

    for (let i = 0; i < binCount; i++) {
      const amplitude = frequencyData[i] / 255;
      const normalizedFreq = i / binCount;

      let angle;
      if (this.useWheelOfFifths) {
        const frequency = this.binToFrequency(i, binCount);
        angle = this.getWheelOfFifthsAngle(frequency);
      } else {
        angle = normalizedFreq * Math.PI * 2;
      }

      const radius = amplitude * this.radius * 0.9;

      // Check if this frequency is near a harmonic
      const isHarmonic = harmonicAngles.some(hAngle =>
        Math.abs(angle - hAngle) < 0.1
      );

      // Create color
      const color = this.getFrequencyColor(normalizedFreq, amplitude, isHarmonic);

      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;

      // Enhanced dot size
      const baseSize = isHarmonic ? 4 : 2;
      const amplitudeSize = amplitude * 6;
      const dotSize = baseSize + amplitudeSize;

      // Pulsing effect
      const pulse = Math.sin(this.time * 4 + angle * 2) * 0.3 + 0.7;
      const finalSize = dotSize * (0.8 + pulse * 0.4);

      // Draw outer glow for strong signals
      if (amplitude > 0.4) {
        this.ctx.shadowColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.shadowBlur = amplitude * 15;
        this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.min(0.7, amplitude * 0.5 + 0.3)})`;
        this.ctx.beginPath();
        this.ctx.arc(x, y, finalSize * 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }

      // Draw main dot
      this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.8 + amplitude * 0.2})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, finalSize, 0, Math.PI * 2);
      this.ctx.fill();

      // Add particles for strong harmonics
      if (isHarmonic && amplitude > 0.4 && Math.random() < 0.02) {
        this.addParticle(x, y, angle, amplitude, 1);
      }
    }
  }

  getFrequencyColor(frequencyPosition, amplitude, isHarmonic) {
    if (isHarmonic) {
      // Use fire colors for harmonics
      return colorMapper.getIntensityColor(amplitude, 'fire');
    }

    // Use colorMapper for intelligent frequency-based coloring
    return colorMapper.getFrequencyColor(frequencyPosition, amplitude);
  }

  drawFundamental() {
    const fundamentalAmplitude = this.smoothedAmplitudes[0] || 0;
    const centerRadius = Math.max(20, fundamentalAmplitude * 50);

    // Get theme color from colorMapper
    const color = colorMapper.primaryColor;

    // Create radial gradient
    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, centerRadius
    );

    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`);
    gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`);

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, centerRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Pulsing effect
    const pulseRadius = centerRadius * (1 + Math.sin(this.time * 4) * 0.2 * fundamentalAmplitude);
    this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, pulseRadius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  addParticle(x, y, angle, amplitude, harmonic) {
    const color = this.getFrequencyColor(0.5, amplitude, true);

    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * amplitude * 2 + (Math.random() - 0.5) * 4,
      vy: Math.sin(angle) * amplitude * 2 + (Math.random() - 0.5) * 4,
      life: 1,
      maxLife: 60 + Math.random() * 60,
      size: amplitude * 8 + Math.random() * 4,
      color: `rgb(${color.r}, ${color.g}, ${color.b})`,
      harmonic
    });
  }

  updateAndDrawParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Update particle
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // Gravity
      particle.life--;

      // Draw particle
      const alpha = particle.life / particle.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  drawWheelOfFifthsLabels() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const labelRadius = this.radius + 25;
    for (const note of this.wheelOfFifths) {
      const x = this.centerX + Math.cos(note.angle) * labelRadius;
      const y = this.centerY + Math.sin(note.angle) * labelRadius;
      
      // Draw note background
      this.ctx.fillStyle = 'rgba(0, 50, 100, 0.9)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 16, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw note text
      this.ctx.fillStyle = 'white';
      this.ctx.fillText(note.note, x, y);
    }
    
    this.ctx.restore();
  }

  drawProminentNoteIndicator() {
    if (!this.mostProminentNote) return;

    this.ctx.save();
    
    const arcRadius = this.radius + 8;
    const arcWidth = 20;
    const startAngle = this.mostProminentNote.angle - 0.3;
    const endAngle = this.mostProminentNote.angle + 0.3;
    
    const intensity = this.mostProminentNote.amplitude;
    const color = this.getFrequencyColor(0.5, intensity, true);

    this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity})`;
    this.ctx.lineWidth = arcWidth;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, arcRadius, startAngle, endAngle);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  drawLabels() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';

    this.ctx.fillText(
      'Harmonic Wheel Visualizer',
      this.centerX,
      this.centerY - this.radius - 30
    );

    if (this.fundamentalFrequency > 0) {
      this.ctx.font = '11px Arial';
      this.ctx.fillText(
        `Fundamental: ${Math.round(this.fundamentalFrequency)}Hz`,
        this.centerX,
        this.centerY - this.radius - 10
      );
    }
  }

  // Helper methods
  binToFrequency(bin, totalBins) {
    const nyquist = 22050;
    return (bin / totalBins) * nyquist;
  }

  getWheelOfFifthsAngle(frequency) {
    const noteInfo = this.getWheelOfFifthsNoteInfo(frequency);
    return noteInfo.angle;
  }

  getWheelOfFifthsNoteInfo(frequency) {
    let closestDistance = Infinity;
    let closestNote = this.wheelOfFifths[0];

    for (const note of this.wheelOfFifths) {
      for (let octave = 1; octave <= 8; octave++) {
        const octaveFreq = note.frequency * Math.pow(2, octave - 4);
        const distance = Math.abs(frequency - octaveFreq);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestNote = note;
        }
      }
    }

    return { note: closestNote.note, angle: closestNote.angle };
  }
}