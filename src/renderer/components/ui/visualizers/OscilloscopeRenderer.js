// Oscilloscope Renderer - Modular waveform visualization
// GPU-accelerated oscilloscope with WebGL fallback to Canvas 2D

import { colorMapper } from './colorMapping.js';

export class OscilloscopeRenderer {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.isActive = false;
    this.animationFrame = null;
    this.getTimeDomainData = null;
    
    // Performance optimization
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    
    // Configuration
    this.config = {
      mode: 'linear', // 'linear' or 'circular'
      colorPalette: 'spectrum',
      lineWidth: 2,
      glowEffect: true,
      showGrid: false,
      ...config
    };
    
    // Try WebGL first
    this.gl = null;
    this.useWebGL = false;
    this.initWebGL();
    
    // Fallback to 2D context
    if (!this.useWebGL) {
      this.ctx = canvas.getContext('2d');
    }
    
    // Circular mode properties
    this.centerX = 0;
    this.centerY = 0;
    this.radius = 0;
    
    this.setupCircularMode();
  }

  initWebGL() {
    try {
      this.gl = this.canvas.getContext('webgl', { 
        antialias: false, 
        alpha: true, 
        preserveDrawingBuffer: false 
      });
      
      if (!this.gl) {
        this.gl = this.canvas.getContext('experimental-webgl');
      }
      
      if (this.gl) {
        // Simple vertex shader
        const vertexShaderSource = `
          attribute vec2 a_position;
          void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
          }
        `;
        
        // Simple fragment shader with color
        const fragmentShaderSource = `
          precision mediump float;
          uniform vec4 u_color;
          void main() {
            gl_FragColor = u_color;
          }
        `;
        
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        if (vertexShader && fragmentShader) {
          this.program = this.gl.createProgram();
          this.gl.attachShader(this.program, vertexShader);
          this.gl.attachShader(this.program, fragmentShader);
          this.gl.linkProgram(this.program);
          
          if (this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
            this.colorLocation = this.gl.getUniformLocation(this.program, 'u_color');
            this.positionBuffer = this.gl.createBuffer();
            this.useWebGL = true;
          }
        }
      }
    } catch (e) {
      console.warn('WebGL initialization failed, falling back to Canvas 2D:', e);
      this.gl = null;
      this.useWebGL = false;
    }
  }

  compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.warn('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  start(getTimeDomainData) {
    this.getTimeDomainData = getTimeDomainData;
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
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.radius = Math.min(this.canvas.width, this.canvas.height) / 2 * 0.85;
  }

  render() {
    if (!this.getTimeDomainData) return;
    
    const dataArray = this.getTimeDomainData();
    if (!dataArray || dataArray.length === 0) return;
    
    if (this.useWebGL && this.gl) {
      this.renderWebGL(dataArray);
    } else {
      this.renderCanvas2D(dataArray);
    }
  }

  renderWebGL(dataArray) {
    const gl = this.gl;
    
    // Clear canvas
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this.program);
    
    // Get color from mapper - use frequency color for consistent theming
    const colorRgb = colorMapper.getFrequencyColor(0.5, 0.8);
    const r = colorRgb.r / 255;
    const g = colorRgb.g / 255;
    const b = colorRgb.b / 255;
    
    gl.uniform4f(this.colorLocation, r, g, b, 0.9);
    
    // Convert waveform data to WebGL coordinates
    const vertices = [];
    const bufferLength = dataArray.length;
    const sliceWidth = 2.0 / bufferLength;
    
    if (this.config.mode === 'linear') {
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v - 1.0;
        const x = i * sliceWidth - 1.0;
        vertices.push(x, y);
      }
    } else {
      // Circular mode
      const angleStep = (2 * Math.PI) / bufferLength;
      const radiusScale = this.radius / Math.min(this.canvas.width, this.canvas.height);
      
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] / 128.0 - 1.0) * 0.5; // Scale down amplitude
        const angle = i * angleStep;
        const r = radiusScale + v * radiusScale * 0.3;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        vertices.push(x, y);
      }
      
      // Close the circle
      if (bufferLength > 0) {
        vertices.push(vertices[0], vertices[1]);
      }
    }
    
    // Upload vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw
    gl.lineWidth(this.config.lineWidth);
    gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 2);
  }

  renderCanvas2D(dataArray) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get color from mapper - use frequency color for consistent theming
    const colorRgb = colorMapper.getFrequencyColor(0.5, 0.8);
    const color = colorMapper.rgbToString(colorRgb);
    
    // Set line style
    ctx.strokeStyle = color;
    ctx.lineWidth = this.config.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Optional glow effect
    if (this.config.glowEffect) {
      ctx.shadowBlur = 4;
      ctx.shadowColor = color;
    }
    
    ctx.beginPath();
    
    const bufferLength = dataArray.length;
    
    if (this.config.mode === 'linear') {
      const sliceWidth = width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
    } else {
      // Circular mode
      const angleStep = (2 * Math.PI) / bufferLength;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const amplitude = (v - 1.0) * this.radius * 0.3;
        const angle = i * angleStep;
        const r = this.radius + amplitude;
        const x = this.centerX + r * Math.cos(angle);
        const y = this.centerY + r * Math.sin(angle);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // Close the circle
      ctx.closePath();
    }
    
    ctx.stroke();
    
    // Reset shadow
    if (this.config.glowEffect) {
      ctx.shadowBlur = 0;
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.mode) {
      this.setMode(newConfig.mode);
    }
  }

  destroy() {
    this.stop();
    
    if (this.useWebGL && this.gl) {
      if (this.positionBuffer) {
        this.gl.deleteBuffer(this.positionBuffer);
      }
      if (this.program) {
        this.gl.deleteProgram(this.program);
      }
    }
    
    this.gl = null;
    this.ctx = null;
    this.canvas = null;
  }
}
