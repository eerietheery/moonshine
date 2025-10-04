import { FrequencyDataProvider } from '../../types/AudioTypes';
import { ColorPalette, intensityToColor } from '../../utils/ColorUtils';

type SpectrogramMode = 'linear' | 'circular';
/**
 * High-performance SpectrogramRenderer for real-time audio visualization.
 * Linear spectrogram + new circular radar-style mode.
 */
export class SpectrogramRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private colorMap: Uint8ClampedArray;
    private currentPalette: ColorPalette = 'classic';
    private mode: SpectrogramMode = 'linear';
    private getFrequencyData: FrequencyDataProvider | null = null;
    private animationFrame: number | null = null;
    private isActive: boolean = false;
    
    // Circular radar mode properties
    private centerX: number = 0;
    private centerY: number = 0;
    private radius: number = 0;
    private currentAngle: number = 0;
    private angleStep: number = 0.002; // Finer angle increment for smoother rendering

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.colorMap = this.generateColorMap(this.currentPalette);
        this.updateCircularDimensions();
    }

    static generateColorMap(): Uint8ClampedArray {
        // This method is deprecated - use generateColorMapForPalette instead
        return SpectrogramRenderer.generateColorMapForPalette('classic');
    }

    static generateColorMapForPalette(palette: ColorPalette): Uint8ClampedArray {
        const map = new Uint8ClampedArray(256 * 4);
        for (let i = 0; i < 256; i++) {
            const intensity = i / 255;
            const color = intensityToColor(intensity, palette);
            map[i * 4 + 0] = color.r; // R
            map[i * 4 + 1] = color.g; // G
            map[i * 4 + 2] = color.b; // B
            map[i * 4 + 3] = 255;     // A
        }
        return map;
    }

    private generateColorMap(palette: ColorPalette): Uint8ClampedArray {
        return SpectrogramRenderer.generateColorMapForPalette(palette);
    }

    start(getFrequencyData: FrequencyDataProvider): void {
        this.getFrequencyData = getFrequencyData;
        this.isActive = true;
        this.currentAngle = 0; // Reset sweep angle
        this.loop();
    }

    stop(): void {
        this.isActive = false;
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    setMode(mode: SpectrogramMode): void {
        this.mode = mode;
        if (mode === 'circular') {
            this.updateCircularDimensions();
            // Clear canvas when switching to circular mode
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.currentAngle = 0;
        }
    }

    private updateCircularDimensions(): void {
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.radius = Math.min(this.centerX, this.centerY) * 0.8;
    }

    setColorPalette(palette: ColorPalette): void {
        this.currentPalette = palette;
        this.colorMap = this.generateColorMap(palette);
    }

    resize(): void {
        if (this.mode === 'circular') {
            this.updateCircularDimensions();
        }
    }

    private loop = (): void => {
        if (!this.isActive) return;
        this.render();
        this.animationFrame = requestAnimationFrame(this.loop);
    };

    private render(): void {
        if (!this.getFrequencyData) return;
        const spectrum = this.getFrequencyData();
        if (!spectrum) return;
        
        if (this.mode === 'circular') {
            this.renderCircularRadar(spectrum);
        } else {
            this.renderLinear(spectrum);
        }
    }

    private renderLinear(spectrum: Uint8Array): void {
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

    private renderCircularRadar(spectrum: Uint8Array): void {
        const spokesPerFrame = 10; // Draw multiple spokes per frame for smoother filling

        for (let i = 0; i < spokesPerFrame; i++) {
            const angle = this.currentAngle + i * this.angleStep;

            // Calculate end point of the radial line
            const endX = this.centerX + Math.cos(angle) * this.radius;
            const endY = this.centerY + Math.sin(angle) * this.radius;

            // Create gradient for the radial line
            const gradient = this.ctx.createLinearGradient(this.centerX, this.centerY, endX, endY);

            // Add color stops based on frequency data (sample every few bins for performance)
            const numStops = 100;
            for (let j = 0; j <= numStops; j++) {
                const pos = j / numStops;
                const bin = Math.floor(pos * (spectrum.length - 1));
                const intensity = spectrum[bin] / 255;
                const color = intensityToColor(intensity, this.currentPalette);
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
            this.currentAngle = 0; // Reset after full rotation
        }
    }
}