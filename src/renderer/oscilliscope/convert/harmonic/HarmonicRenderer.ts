import { FrequencyDataProvider } from '../../types/AudioTypes';
import { ColorPalette, intensityToColor } from '../../utils/ColorUtils';
import { VisualizationMode, HarmonicConfig } from '../../types/VisualizationTypes';

/**
 * Cool Harmonic Audiovisualizer
 * Displays fundamental frequency and harmonics in an animated, visually appealing way
 */
export class HarmonicRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private getFrequencyData: FrequencyDataProvider | null = null;
    private animationFrame: number | null = null;
    private active: boolean = false;

    // Configuration
    private config: HarmonicConfig = {
        mode: 'circular',
        colorPalette: 'rainbow',
        harmonicCount: 8,
        maxHarmonics: 16,
        showLabels: false,
        showGrid: true,
        smoothingFactor: 0.3
    };

    // Wheel of fifths mapping
    private wheelOfFifths = [
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

    private useWheelOfFifths: boolean = true;

    // Most prominent note tracking
    private mostProminentNote: { note: string; angle: number; amplitude: number } | null = null;

    // Animation properties
    private time: number = 0;
    private particles: Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        life: number;
        maxLife: number;
        size: number;
        color: string;
        harmonic: number;
    }> = [];

    // Harmonic analysis
    private fundamentalFrequency: number = 0;
    private harmonicAmplitudes: number[] = [];
    private smoothedAmplitudes: number[] = [];
    private peakAmplitudes: number[] = [];

    // Visual properties
    private centerX: number = 0;
    private centerY: number = 0;
    private radius: number = 0;

    constructor(canvas: HTMLCanvasElement, config?: Partial<HarmonicConfig>) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.updateConfig(config || {});
        this.updateDimensions();
    }

    start(getFrequencyData: FrequencyDataProvider): void {
        this.getFrequencyData = getFrequencyData;
        this.active = true;
        this.time = 0;
        this.loop();
    }

    stop(): void {
        this.active = false;
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    setMode(mode: VisualizationMode): void {
        this.config.mode = mode;
        this.updateDimensions();
    }

    setColorPalette(palette: ColorPalette): void {
        this.config.colorPalette = palette;
    }

    setShowGrid(showGrid: boolean): void {
        this.config.showGrid = showGrid;
    }

    setMaxHarmonics(maxHarmonics: number): void {
        this.config.maxHarmonics = maxHarmonics;
        this.config.harmonicCount = Math.min(this.config.harmonicCount || 8, maxHarmonics);
        this.harmonicAmplitudes = new Array(maxHarmonics).fill(0);
        this.smoothedAmplitudes = new Array(maxHarmonics).fill(0);
        this.peakAmplitudes = new Array(maxHarmonics).fill(0);
    }

    updateConfig(config: Partial<HarmonicConfig>): void {
        this.config = { ...this.config, ...config };
        this.harmonicAmplitudes = new Array(this.config.maxHarmonics || 16).fill(0);
        this.smoothedAmplitudes = new Array(this.config.maxHarmonics || 16).fill(0);
        this.peakAmplitudes = new Array(this.config.maxHarmonics || 16).fill(0);
    }

    resize(): void {
        this.updateDimensions();
    }

    private updateDimensions(): void {
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.radius = Math.min(this.centerX, this.centerY) * 0.8;
    }

    private loop = (): void => {
        if (!this.active) return;

        this.time += 0.016; // ~60fps
        this.render();
        this.animationFrame = requestAnimationFrame(this.loop);
    };

    private render(): void {
        if (!this.getFrequencyData) return;

        const frequencyData = this.getFrequencyData();
        if (!frequencyData) return;

        // Analyze harmonics for highlighting
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

        // Draw wheel of fifths labels and prominent note indicator if enabled
        if (this.useWheelOfFifths) {
            this.drawWheelOfFifthsLabels();
            this.drawProminentNoteIndicator();
        }

        // Draw labels if enabled
        if (this.config.showLabels) {
            this.drawLabels();
        }
    }

    private analyzeHarmonics(frequencyData: Uint8Array): void {
        // Simple fundamental frequency detection (find strongest low-frequency peak)
        let maxAmplitude = 0;
        let fundamentalBin = 0;

        // Look in low frequency range (roughly 60-500Hz for musical notes)
        const startBin = Math.floor((60 / 22050) * frequencyData.length);
        const endBin = Math.floor((500 / 22050) * frequencyData.length);

        for (let i = startBin; i < Math.min(endBin, frequencyData.length); i++) {
            if (frequencyData[i] > maxAmplitude) {
                maxAmplitude = frequencyData[i];
                fundamentalBin = i;
            }
        }

        // Calculate fundamental frequency
        this.fundamentalFrequency = (fundamentalBin / frequencyData.length) * 22050;

        // Find most prominent note for wheel of fifths indicator
        this.findMostProminentNote(frequencyData);

        // Calculate harmonic amplitudes
        const harmonicCount = this.config.harmonicCount || 8;
        for (let h = 1; h <= harmonicCount; h++) {
            const harmonicBin = Math.floor(fundamentalBin * h);
            if (harmonicBin < frequencyData.length) {
                const amplitude = frequencyData[harmonicBin] / 255;
                this.harmonicAmplitudes[h - 1] = amplitude;

                // Smooth the amplitude
                const smoothing = this.config.smoothingFactor || 0.3;
                this.smoothedAmplitudes[h - 1] =
                    this.smoothedAmplitudes[h - 1] * smoothing +
                    amplitude * (1 - smoothing);

                // Track peaks
                if (amplitude > this.peakAmplitudes[h - 1]) {
                    this.peakAmplitudes[h - 1] = amplitude;
                } else {
                    this.peakAmplitudes[h - 1] *= 0.99; // Decay peaks
                }
            }
        }
    }

    private findMostProminentNote(frequencyData: Uint8Array): void {
        // Find the most prominent frequency across the spectrum
        let maxAmplitude = 0;
        let maxBin = 0;

        // Look across the full frequency range
        for (let i = 0; i < frequencyData.length; i++) {
            if (frequencyData[i] > maxAmplitude) {
                maxAmplitude = frequencyData[i];
                maxBin = i;
            }
        }

        if (maxAmplitude > 10) { // Only show if there's significant amplitude
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

    private drawGrid(): void {
        this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
        this.ctx.lineWidth = 1;

        // Draw concentric circles for amplitude levels
        const circleCount = 4;
        for (let i = 1; i <= circleCount; i++) {
            const radius = (this.radius / circleCount) * i;
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
            this.ctx.stroke();

            // Add amplitude labels
            if (this.config.showLabels && i < circleCount) {
                const amplitude = i / circleCount;
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`${Math.round(amplitude * 100)}%`, this.centerX, this.centerY - radius - 5);
            }
        }

        // Draw radial frequency lines (every 30 degrees)
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.lineTo(
                this.centerX + Math.cos(angle) * this.radius,
                this.centerY + Math.sin(angle) * this.radius
            );
            this.ctx.stroke();

            // Add frequency labels
            if (this.config.showLabels && i % 3 === 0) {
                const freq = Math.round((i / 12) * 22050);
                const labelRadius = this.radius + 15;
                const x = this.centerX + Math.cos(angle) * labelRadius;
                const y = this.centerY + Math.sin(angle) * labelRadius;
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                this.ctx.font = '9px Arial';
                this.ctx.fillText(`${freq}Hz`, x, y);
            }
        }
    }

    private drawRadialSpectrum(frequencyData: Uint8Array): void {
        const binCount = Math.min(frequencyData.length, 1024); // More bins for smoother mapping

        // Pre-calculate harmonic angles for highlighting
        const harmonicAngles: number[] = [];
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

        // Draw frequency spectrum as polar coordinates
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';

        for (let i = 0; i < binCount; i++) {
            const amplitude = frequencyData[i] / 255;
            const normalizedFreq = i / binCount;

            // Map frequency to angle around the circle
            let angle: number;
            if (this.useWheelOfFifths) {
                // Map frequency bins to wheel of fifths positions
                const frequency = this.binToFrequency(i, binCount);
                angle = this.getWheelOfFifthsAngle(frequency);
            } else {
                // Original circular mapping
                angle = normalizedFreq * Math.PI * 2;
            }

            // Amplitude determines the radius from center
            const radius = amplitude * this.radius * 0.9;

            // Check if this frequency is near a harmonic
            const isHarmonic = harmonicAngles.some(hAngle =>
                Math.abs(angle - hAngle) < 0.1 // Small tolerance for harmonic detection
            );

            // Create color based on frequency and amplitude using existing color schemes
            let color;
            if (isHarmonic) {
                // Harmonics get a special fiery color
                color = intensityToColor(Math.min(1, amplitude * 1.5), 'fire');
            } else {
                // Use existing color palettes with enhanced blue emphasis
                let paletteToUse = this.config.colorPalette;

                // For wheel of fifths, prefer ocean palette for more blues
                if (this.useWheelOfFifths && this.config.colorPalette === 'rainbow') {
                    paletteToUse = 'ocean'; // More blue-heavy than rainbow
                }

                // Use frequency for hue variation, amplitude for intensity
                const freqIntensity = normalizedFreq;
                const ampIntensity = amplitude;

                // Get colors from existing palettes
                const freqColor = intensityToColor(freqIntensity, paletteToUse);
                const ampColor = intensityToColor(ampIntensity, paletteToUse);

                // Blend frequency and amplitude colors with blue emphasis
                const blueBoost = this.useWheelOfFifths ? 1.2 : 1.0; // Extra blue for wheel mode
                color = {
                    r: Math.floor((freqColor.r * 0.6 + ampColor.r * 0.4) * 0.9), // Slight red reduction
                    g: Math.floor((freqColor.g * 0.6 + ampColor.g * 0.4) * 0.95), // Slight green reduction
                    b: Math.floor((freqColor.b * 0.6 + ampColor.b * 0.4) * blueBoost) // Blue boost
                };

                // Ensure values stay in valid range
                color.r = Math.max(0, Math.min(255, color.r));
                color.g = Math.max(0, Math.min(255, color.g));
                color.b = Math.max(0, Math.min(255, color.b));
            }

            // Draw the frequency point with enhanced visuals
            const x = this.centerX + Math.cos(angle) * radius;
            const y = this.centerY + Math.sin(angle) * radius;

            // Enhanced dot size based on amplitude and harmonic status
            const baseSize = isHarmonic ? 4 : 2;
            const amplitudeSize = amplitude * 6;
            const dotSize = baseSize + amplitudeSize;

            // Create pulsing effect
            const pulse = Math.sin(this.time * 4 + angle * 2) * 0.3 + 0.7;
            const finalSize = dotSize * (0.8 + pulse * 0.4);

            // Draw outer glow ring for strong signals
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

            // Add inner highlight for harmonics
            if (isHarmonic) {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${amplitude * 0.6})`;
                this.ctx.beginPath();
                this.ctx.arc(x - finalSize * 0.3, y - finalSize * 0.3, finalSize * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Add connecting lines between nearby strong frequencies
            if (amplitude > 0.5 && i > 0) {
                const prevAmplitude = frequencyData[i - 1] / 255;
                if (prevAmplitude > 0.4) {
                    const prevAngle = this.useWheelOfFifths ? 
                        this.getWheelOfFifthsAngle(this.binToFrequency(i - 1, binCount)) : 
                        ((i - 1) / binCount) * Math.PI * 2;
                    const prevRadius = prevAmplitude * this.radius * 0.9;
                    const prevX = this.centerX + Math.cos(prevAngle) * prevRadius;
                    const prevY = this.centerY + Math.sin(prevAngle) * prevRadius;

                    // Only connect if angles are reasonably close (within 0.5 radians)
                    if (Math.abs(angle - prevAngle) < 0.5) {
                        this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.min(0.8, amplitude * 0.6 + 0.4)})`;
                        this.ctx.lineWidth = amplitude * 2;
                        this.ctx.beginPath();
                        this.ctx.moveTo(prevX, prevY);
                        this.ctx.lineTo(x, y);
                        this.ctx.stroke();
                    }
                }
            }

            // Connect strong frequencies with lines for a web effect
            if (amplitude > 0.5 && i > 0) {
                const prevAmplitude = frequencyData[i - 1] / 255;
                if (prevAmplitude > 0.3) {
                    // Use consistent angle calculation
                    let prevAngle: number;
                    if (this.useWheelOfFifths) {
                        const prevFrequency = this.binToFrequency(i - 1, binCount);
                        prevAngle = this.getWheelOfFifthsAngle(prevFrequency);
                    } else {
                        prevAngle = (i - 1) / binCount * Math.PI * 2;
                    }
                    
                    const prevRadius = prevAmplitude * this.radius * 0.9;
                    const prevX = this.centerX + Math.cos(prevAngle) * prevRadius;
                    const prevY = this.centerY + Math.sin(prevAngle) * prevRadius;

                    // Draw connecting line
                    this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.min(0.8, amplitude * 0.6 + 0.4)})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(prevX, prevY);
                    this.ctx.lineTo(x, y);
                    this.ctx.stroke();
                }
            }

            // Add particles for strong harmonics
            if (isHarmonic && amplitude > 0.4 && Math.random() < 0.02) {
                this.addParticle(x, y, angle, amplitude, harmonicAngles.indexOf(
                    harmonicAngles.find(hAngle => Math.abs(angle - hAngle) < 0.1) || 0
                ) + 1);
            }
        }

        // Draw harmonic rings for extra visual interest
        this.drawHarmonicRings();
    }

    private drawHarmonicRings(): void {
        if (this.fundamentalFrequency <= 0) return;

        this.ctx.strokeStyle = 'rgba(255, 100, 50, 0.6)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);

        const nyquist = 22050;
        for (let h = 2; h <= (this.config.harmonicCount || 8); h++) {
            const harmonicFreq = this.fundamentalFrequency * h;
            if (harmonicFreq > nyquist) break;

            // Use wheel of fifths mapping for consistency
            let angle: number;
            if (this.useWheelOfFifths) {
                angle = this.getWheelOfFifthsAngle(harmonicFreq);
            } else {
                const normalizedFreq = harmonicFreq / nyquist;
                angle = normalizedFreq * Math.PI * 2;
            }

            // Draw a dashed circle at this harmonic frequency
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, this.radius * 0.9, 0, Math.PI * 2);
            this.ctx.stroke();

            // Mark the harmonic position
            const x = this.centerX + Math.cos(angle) * this.radius * 0.95;
            const y = this.centerY + Math.sin(angle) * this.radius * 0.95;

            this.ctx.fillStyle = 'rgba(50, 255, 94, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.setLineDash([]);
    }

    private drawFundamental(): void {
        const fundamentalAmplitude = this.smoothedAmplitudes[0] || 0;

        // Draw central circle for fundamental
        const centerRadius = Math.max(20, fundamentalAmplitude * 50);

        // Create radial gradient
        const gradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, centerRadius
        );

        const color = intensityToColor(fundamentalAmplitude, this.config.colorPalette);
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`);

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, centerRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Add pulsing effect
        const pulseRadius = centerRadius * (1 + Math.sin(this.time * 4) * 0.2 * fundamentalAmplitude);
        this.ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, pulseRadius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    private addParticle(x: number, y: number, angle: number, amplitude: number, harmonic: number): void {
        const color = intensityToColor(amplitude, this.config.colorPalette);

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

    private updateAndDrawParticles(): void {
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

            // Add glow
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = particle.size * 2;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;

            this.ctx.restore();

            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    private drawLabels(): void {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';

        // Draw title
        this.ctx.fillText(
            'Polar Spectrum Analyzer',
            this.centerX,
            this.centerY - this.radius - 30
        );

        // Draw fundamental frequency
        if (this.fundamentalFrequency > 0) {
            this.ctx.font = '11px Arial';
            this.ctx.fillText(
                `Fundamental: ${Math.round(this.fundamentalFrequency)}Hz`,
                this.centerX,
                this.centerY - this.radius - 10
            );
        }

        // Draw instructions
        this.ctx.font = '10px Arial';
        this.ctx.fillStyle = 'rgba(255, 200, 100, 0.9)';
        this.ctx.fillText(
            'Angle = Frequency • Distance = Amplitude • Orange = Harmonics',
            this.centerX,
            this.centerY + this.radius + 25
        );
    }

    private drawWheelOfFifthsLabels(): void {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw note labels around the perimeter
        const labelRadius = this.radius + 25;
        for (const note of this.wheelOfFifths) {
            const x = this.centerX + Math.cos(note.angle) * labelRadius;
            const y = this.centerY + Math.sin(note.angle) * labelRadius;
            
            // Draw note background circle
            this.ctx.fillStyle = 'rgba(0, 50, 100, 0.9)';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 16, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw note text
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillText(note.note, x, y);
        }
        
        this.ctx.restore();
    }

    private drawProminentNoteIndicator(): void {
        if (!this.mostProminentNote) return;

        this.ctx.save();
        
        // Draw a glowing arc around the perimeter at the note position
        const arcRadius = this.radius + 8;
        const arcWidth = 20; // Width of the indicator arc
        const startAngle = this.mostProminentNote.angle - 0.3; // Arc spans 0.6 radians (~34 degrees)
        const endAngle = this.mostProminentNote.angle + 0.3;
        
        // Create gradient for the indicator using existing color schemes
        const gradient = this.ctx.createRadialGradient(
            this.centerX, this.centerY, arcRadius - arcWidth/2,
            this.centerX, this.centerY, arcRadius + arcWidth/2
        );
        const intensity = this.mostProminentNote.amplitude;

        // Use fire palette for the prominent note indicator
        const innerColor = intensityToColor(intensity * 0.7, 'fire');
        const midColor = intensityToColor(intensity * 0.85, 'fire');
        const outerColor = intensityToColor(intensity, 'fire');

        gradient.addColorStop(0, `rgba(${innerColor.r}, ${innerColor.g}, ${innerColor.b}, ${intensity * 0.8})`);
        gradient.addColorStop(0.5, `rgba(${midColor.r}, ${midColor.g}, ${midColor.b}, ${intensity * 0.9})`);
        gradient.addColorStop(1, `rgba(${outerColor.r}, ${outerColor.g}, ${outerColor.b}, ${intensity})`);
        
        // Draw the indicator arc
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = arcWidth;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, arcRadius, startAngle, endAngle);
        this.ctx.stroke();
        
        // Add glow effect using the same color scheme
        this.ctx.shadowColor = `rgba(${outerColor.r}, ${outerColor.g}, ${outerColor.b}, ${intensity})`;
        this.ctx.shadowBlur = 15;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        
        // Draw note label in the center of the indicator
        const labelAngle = this.mostProminentNote.angle;
        const labelRadius = arcRadius;
        const labelX = this.centerX + Math.cos(labelAngle) * labelRadius;
        const labelY = this.centerY + Math.sin(labelAngle) * labelRadius;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.mostProminentNote.note, labelX, labelY);
        
        this.ctx.restore();
    }

    // Additional methods for the extended interface
    getType(): string {
        return 'harmonic';
    }

    getConfig(): HarmonicConfig {
        return { ...this.config };
    }

    isActive(): boolean {
        return this.active;
    }

    // Wheel of fifths helper methods
    private binToFrequency(bin: number, totalBins: number): number {
        // Convert bin index to frequency using sample rate
        const nyquist = 22050; // Half of typical 44.1kHz sample rate
        return (bin / totalBins) * nyquist;
    }

    private getWheelOfFifthsAngle(frequency: number): number {
        const noteInfo = this.getWheelOfFifthsNoteInfo(frequency);
        return noteInfo.angle;
    }

    private getWheelOfFifthsNoteInfo(frequency: number): { note: string; angle: number; octave: number } {
        // Find the closest note in the wheel of fifths across multiple octaves
        let closestDistance = Infinity;
        let closestNote = this.wheelOfFifths[0];
        let closestOctave = 4;

        for (const note of this.wheelOfFifths) {
            // Check multiple octaves (C1-C8)
            for (let octave = 1; octave <= 8; octave++) {
                const octaveFreq = note.frequency * Math.pow(2, octave - 4); // C4 = middle C
                const distance = Math.abs(frequency - octaveFreq);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestNote = note;
                    closestOctave = octave;
                }
            }
        }

        return {
            note: closestNote.note,
            angle: closestNote.angle,
            octave: closestOctave
        };
    }
}
