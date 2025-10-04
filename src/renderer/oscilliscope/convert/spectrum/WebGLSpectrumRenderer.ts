// WebGL-accelerated spectrum analyzer for improved performance

import { WebGLVisualizationBase } from '../../core/WebGLVisualizationBase';
import { VisualizationConfig } from '../../types/VisualizationTypes';
import { FrequencyDataProvider } from '../../types/AudioTypes';
import { intensityToColor } from '../../utils/ColorUtils';

export class WebGLSpectrumRenderer extends WebGLVisualizationBase {
  private showGrid: boolean = true;
  private mode: 'linear' | 'circular' = 'linear';
  private gridLines: number = 10;

  // WebGL buffers and attributes
  private vertexBuffer: WebGLBuffer | null = null;
  private vertices: Float32Array | null = null;
  private maxBars: number = 1024;

  constructor(canvas: HTMLCanvasElement, config: VisualizationConfig = {}) {
    super(canvas, config);
    this.initializeShaders();
    this.setupBuffers();
  }

  private initializeShaders(): void {
    if (!this.isWebGLAvailable()) return;

    // Simple vertex shader for 2D positions
    const vertexShader = `
      attribute vec2 aPosition;
      uniform float uYOffset;
      void main() {
        gl_Position = vec4(aPosition.x, aPosition.y + uYOffset, 0.0, 1.0);
      }
    `;

    // Fragment shader for colored bars
    const fragmentShader = `
      precision mediump float;
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
      }
    `;

    this.createProgram(vertexShader, fragmentShader, 'spectrum');
  }

  private setupBuffers(): void {
    if (!this.gl) return;

    // Create vertex buffer for spectrum bars
    this.vertices = new Float32Array(this.maxBars * 12); // 2 triangles per bar, 6 vertices, 2 components each
    this.vertexBuffer = this.createBuffer(this.vertices, this.gl.DYNAMIC_DRAW);
  }

  start(getFrequencyData: FrequencyDataProvider): void {
    super.start(getFrequencyData);
  }

  protected renderFrame(_timestamp: number, _deltaTime: number): void {
    if (!this.getFrequencyData) return;

    const frequencyData = this.getFrequencyData();
    if (!frequencyData) return;

    if (this.isWebGLAvailable()) {
      this.renderWebGL(frequencyData);
    } else {
      this.renderCanvas2D(frequencyData);
    }
  }

  private renderWebGL(frequencyData: Uint8Array): void {
    if (!this.gl || !this.useProgram('spectrum')) return;

    const { width, height } = this.canvasInfo;
    this.gl.viewport(0, 0, width * this.canvasInfo.devicePixelRatio, height * this.canvasInfo.devicePixelRatio);

    // Clear
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    if (this.mode === 'circular') {
      this.renderCircularSpectrumWebGL(frequencyData);
    } else {
      this.renderLinearSpectrumWebGL(frequencyData);
    }

    // Draw grid if enabled
    if (this.showGrid) {
      this.renderGridWebGL();
    }
  }

  private renderLinearSpectrumWebGL(frequencyData: Uint8Array): void {
    if (!this.gl || !this.vertices || !this.vertexBuffer) return;

    const { height } = this.canvasInfo;
    const barCount = Math.min(frequencyData.length / 4, this.maxBars); // Use fewer bars for performance

    // Update vertex data for bars
    let vertexIndex = 0;
    for (let i = 0; i < barCount; i++) {
      const amplitude = frequencyData[i * 4] / 255; // Sample every 4th bin for performance
      const barHeight = amplitude * height * 0.8;
      const x = (i / barCount) * 2 - 1; // Convert to clip space (-1 to 1)
      const nextX = ((i + 1) / barCount) * 2 - 1;
      const y = -1; // Bottom of screen in clip space
      const topY = (barHeight / height) * 2 - 1; // Top of bar in clip space

      // Triangle 1
      this.vertices[vertexIndex++] = x;     this.vertices[vertexIndex++] = y;
      this.vertices[vertexIndex++] = nextX; this.vertices[vertexIndex++] = y;
      this.vertices[vertexIndex++] = x;     this.vertices[vertexIndex++] = topY;

      // Triangle 2
      this.vertices[vertexIndex++] = nextX; this.vertices[vertexIndex++] = y;
      this.vertices[vertexIndex++] = nextX; this.vertices[vertexIndex++] = topY;
      this.vertices[vertexIndex++] = x;     this.vertices[vertexIndex++] = topY;
    }

    // Update buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.vertices);

    // Set up attributes
    const positionLoc = this.getAttribLocation('aPosition');
    if (positionLoc >= 0) {
      this.gl.enableVertexAttribArray(positionLoc);
      this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);
    }

    // Draw bars with varying colors
    for (let i = 0; i < barCount; i++) {
      const amplitude = frequencyData[i * 4] / 255;
      const color = intensityToColor(amplitude, this.config.colorPalette);
      const colorLoc = this.getUniformLocation('uColor');

      if (colorLoc) {
        this.gl.uniform3f(colorLoc, color.r / 255, color.g / 255, color.b / 255);
      }

      // Draw 2 triangles (6 vertices) per bar
      this.gl.drawArrays(this.gl.TRIANGLES, i * 6, 6);
    }
  }

  private renderCircularSpectrumWebGL(frequencyData: Uint8Array): void {
    // Circular mode implementation would go here
    // For now, fall back to linear
    this.renderLinearSpectrumWebGL(frequencyData);
  }

  private renderGridWebGL(): void {
    if (!this.gl) return;

    // Simple grid using Canvas2D overlay for now
    // Could be optimized to WebGL lines in the future
    this.renderGridCanvas2D();
  }

  private renderCanvas2D(frequencyData: Uint8Array): void {
    // Fallback Canvas2D rendering
    const { width, height } = this.canvasInfo;
    const barCount = Math.min(frequencyData.length / 4, 256);
    const barWidth = width / barCount;

    for (let i = 0; i < barCount; i++) {
      const amplitude = frequencyData[i * 4] / 255;
      const barHeight = amplitude * height * 0.8;
      const x = i * barWidth;
      const y = height - barHeight;

      const color = intensityToColor(amplitude, this.config.colorPalette);
      this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      this.ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    if (this.showGrid) {
      this.renderGridCanvas2D();
    }
  }

  private renderGridCanvas2D(): void {
    const { width, height } = this.canvasInfo;
    this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    this.ctx.lineWidth = 1;

    // Vertical lines
    const vLines = this.gridLines;
    for (let i = 1; i < vLines; i++) {
      const x = (width / vLines) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    // Horizontal lines
    const hLines = 5;
    for (let i = 1; i < hLines; i++) {
      const y = (height / hLines) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  protected getVisualizationType(): string {
    return 'spectrum-webgl';
  }

  protected updateColorFromPalette(): void {
    // Colors are handled per-bar in the rendering loop
    // This could be optimized by pre-computing color arrays
  }

  // Public API methods
  setShowGrid(showGrid: boolean): void {
    this.showGrid = showGrid;
  }

  setMode(mode: 'linear' | 'circular'): void {
    this.mode = mode;
  }

  getShowGrid(): boolean {
    return this.showGrid;
  }

  getMode(): 'linear' | 'circular' {
    return this.mode;
  }
}