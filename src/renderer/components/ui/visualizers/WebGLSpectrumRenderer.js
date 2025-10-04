// WebGL-Accelerated Spectrum Renderer - Converted from TypeScript
// GPU-accelerated high-performance spectrum visualization

export class WebGLSpectrumRenderer {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.gl = null;
    this.program = null;
    this.buffers = {};
    this.uniforms = {};
    this.textures = {};
    this.getFrequencyData = null;
    this.animationFrame = null;
    this.active = false;

    // Configuration
    this.config = {
      mode: 'linear',
      colorPalette: 'spectrum',
      renderMode: '3d',
      smoothingFactor: 0.7,
      resolution: 512,
      heightScale: 2.0,
      perspective: 1.0,
      ...config
    };

    // Performance tracking
    this.frameCount = 0;
    this.lastFPSTime = performance.now();
    this.fps = 60;

    // Data arrays
    this.frequencyData = new Float32Array(this.config.resolution);
    this.previousData = new Float32Array(this.config.resolution);
    this.smoothedData = new Float32Array(this.config.resolution);

    // Animation state
    this.time = 0;
    this.rotation = { x: 0, y: 0, z: 0 };

    this.initWebGL();
  }

  initWebGL() {
    try {
      this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
      
      if (!this.gl) {
        console.warn('WebGL not supported, falling back to 2D canvas');
        this.fallbackTo2D();
        return;
      }

      this.initShaders();
      this.initBuffers();
      this.initTextures();
      this.setupGL();

    } catch (error) {
      console.error('WebGL initialization failed:', error);
      this.fallbackTo2D();
    }
  }

  fallbackTo2D() {
    this.ctx = this.canvas.getContext('2d');
    this.webglEnabled = false;
    console.log('Using 2D fallback for spectrum renderer');
  }

  initShaders() {
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      
      uniform mat4 u_matrix;
      uniform float u_time;
      uniform float u_heightScale;
      uniform sampler2D u_frequency;
      
      varying vec2 v_texCoord;
      varying float v_height;
      varying vec3 v_worldPos;
      
      void main() {
        v_texCoord = a_texCoord;
        
        // Sample frequency data for height
        float frequency = texture2D(u_frequency, vec2(a_texCoord.x, 0.5)).r;
        v_height = frequency * u_heightScale;
        
        // Create 3D position
        vec3 position = vec3(a_position.x, v_height, a_position.y);
        v_worldPos = position;
        
        // Apply wave effect
        position.y += sin(u_time * 2.0 + a_position.x * 10.0) * 0.1 * frequency;
        
        gl_Position = u_matrix * vec4(position, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform int u_colorPalette;
      
      varying vec2 v_texCoord;
      varying float v_height;
      varying vec3 v_worldPos;
      
      vec3 hueToRgb(float hue) {
        float c = 1.0;
        float x = 1.0 - abs(mod(hue * 6.0, 2.0) - 1.0);
        
        if (hue < 1.0/6.0) return vec3(c, x, 0.0);
        else if (hue < 2.0/6.0) return vec3(x, c, 0.0);
        else if (hue < 3.0/6.0) return vec3(0.0, c, x);
        else if (hue < 4.0/6.0) return vec3(0.0, x, c);
        else if (hue < 5.0/6.0) return vec3(x, 0.0, c);
        else return vec3(c, 0.0, x);
      }
      
      vec3 getColor(float intensity, float position) {
        if (u_colorPalette == 0) {
          // Spectrum palette
          float hue = position * 0.8 + u_time * 0.1;
          return hueToRgb(hue) * intensity;
        } else if (u_colorPalette == 1) {
          // Fire palette
          return vec3(
            intensity,
            intensity * intensity * 0.8,
            intensity * intensity * intensity * 0.6
          );
        } else if (u_colorPalette == 2) {
          // Ocean palette
          return vec3(
            intensity * 0.3,
            intensity * 0.6,
            intensity
          );
        } else {
          // Default - theme color
          return vec3(0.55, 0.25, 0.72) * intensity;
        }
      }
      
      void main() {
        float intensity = clamp(v_height / 2.0, 0.0, 1.0);
        vec3 color = getColor(intensity, v_texCoord.x);
        
        // Add glow effect
        float glow = exp(-length(v_worldPos.xz) * 2.0) * intensity * 0.5;
        color += vec3(glow);
        
        // Add depth-based fog
        float depth = length(v_worldPos) / 10.0;
        color = mix(color, vec3(0.0), clamp(depth, 0.0, 0.8));
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    this.program = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
    this.gl.useProgram(this.program);

    // Get attribute and uniform locations
    this.attributes = {
      position: this.gl.getAttribLocation(this.program, 'a_position'),
      texCoord: this.gl.getAttribLocation(this.program, 'a_texCoord')
    };

    this.uniforms = {
      matrix: this.gl.getUniformLocation(this.program, 'u_matrix'),
      time: this.gl.getUniformLocation(this.program, 'u_time'),
      resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
      heightScale: this.gl.getUniformLocation(this.program, 'u_heightScale'),
      colorPalette: this.gl.getUniformLocation(this.program, 'u_colorPalette'),
      frequency: this.gl.getUniformLocation(this.program, 'u_frequency')
    };
  }

  createShaderProgram(vertexSource, fragmentSource) {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Shader program link error:', this.gl.getProgramInfoLog(program));
      throw new Error('Failed to link shader program');
    }

    return program;
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      throw new Error('Failed to compile shader');
    }

    return shader;
  }

  initBuffers() {
    // Create grid geometry
    const gridSize = 64;
    const vertices = [];
    const texCoords = [];
    const indices = [];

    for (let z = 0; z <= gridSize; z++) {
      for (let x = 0; x <= gridSize; x++) {
        const xPos = (x / gridSize) * 2 - 1; // -1 to 1
        const zPos = (z / gridSize) * 2 - 1; // -1 to 1
        
        vertices.push(xPos, zPos);
        texCoords.push(x / gridSize, z / gridSize);
      }
    }

    // Create indices for triangles
    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const topLeft = z * (gridSize + 1) + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * (gridSize + 1) + x;
        const bottomRight = bottomLeft + 1;

        // First triangle
        indices.push(topLeft, bottomLeft, topRight);
        // Second triangle
        indices.push(topRight, bottomLeft, bottomRight);
      }
    }

    // Create position buffer
    this.buffers.position = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

    // Create texture coordinate buffer
    this.buffers.texCoord = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.texCoord);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);

    // Create index buffer
    this.buffers.index = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);

    this.indexCount = indices.length;
  }

  initTextures() {
    // Create frequency data texture
    this.textures.frequency = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.frequency);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  }

  setupGL() {
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
    this.gl.clearColor(0, 0, 0, 1);
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
  }

  setColorPalette(palette) {
    this.config.colorPalette = palette;
  }

  resize() {
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  loop = () => {
    if (!this.active) return;
    
    this.time += 0.016; // ~60fps
    this.updateFPS();
    
    if (this.gl && this.webglEnabled !== false) {
      this.renderWebGL();
    } else {
      this.render2D();
    }
    
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  updateFPS() {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFPSTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFPSTime));
      this.frameCount = 0;
      this.lastFPSTime = now;
    }
  }

  renderWebGL() {
    if (!this.getFrequencyData || !this.gl) return;

    const rawData = this.getFrequencyData();
    if (!rawData) return;

    // Process frequency data
    this.processFrequencyData(rawData);

    // Update frequency texture
    this.updateFrequencyTexture();

    // Clear and setup
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.useProgram(this.program);

    // Update uniforms
    this.gl.uniform1f(this.uniforms.time, this.time);
    this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.uniforms.heightScale, this.config.heightScale);
    this.gl.uniform1i(this.uniforms.colorPalette, this.getPaletteIndex());

    // Set up view matrix
    const matrix = this.createViewMatrix();
    this.gl.uniformMatrix4fv(this.uniforms.matrix, false, matrix);

    // Bind frequency texture
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.frequency);
    this.gl.uniform1i(this.uniforms.frequency, 0);

    // Bind buffers and set attributes
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
    this.gl.enableVertexAttribArray(this.attributes.position);
    this.gl.vertexAttribPointer(this.attributes.position, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.texCoord);
    this.gl.enableVertexAttribArray(this.attributes.texCoord);
    this.gl.vertexAttribPointer(this.attributes.texCoord, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);

    // Draw
    this.gl.drawElements(this.gl.TRIANGLES, this.indexCount, this.gl.UNSIGNED_SHORT, 0);
  }

  processFrequencyData(rawData) {
    const smoothing = this.config.smoothingFactor;

    for (let i = 0; i < this.config.resolution && i < rawData.length; i++) {
      const normalized = rawData[i] / 255;
      
      // Apply smoothing
      this.smoothedData[i] = this.smoothedData[i] * smoothing + normalized * (1 - smoothing);
      
      // Store for texture
      this.frequencyData[i] = this.smoothedData[i];
    }
  }

  updateFrequencyTexture() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textures.frequency);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.LUMINANCE,
      this.config.resolution,
      1,
      0,
      this.gl.LUMINANCE,
      this.gl.FLOAT,
      this.frequencyData
    );
  }

  createViewMatrix() {
    const aspect = this.canvas.width / this.canvas.height;
    const fovy = Math.PI / 4;
    const near = 0.1;
    const far = 100;

    // Create perspective matrix
    const f = 1.0 / Math.tan(fovy * 0.5);
    const perspectiveMatrix = new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) / (near - far), -1,
      0, 0, (2 * far * near) / (near - far), 0
    ]);

    // Create view matrix
    const eye = [0, 3, 5];
    const center = [0, 0, 0];
    const up = [0, 1, 0];

    // Auto-rotation
    this.rotation.y += 0.01;
    const cosY = Math.cos(this.rotation.y);
    const sinY = Math.sin(this.rotation.y);

    eye[0] = 5 * sinY;
    eye[2] = 5 * cosY;

    const viewMatrix = this.lookAt(eye, center, up);

    // Combine matrices
    return this.multiplyMatrices(perspectiveMatrix, viewMatrix);
  }

  lookAt(eye, center, up) {
    const zAxis = this.normalize([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
    const xAxis = this.normalize(this.cross(up, zAxis));
    const yAxis = this.cross(zAxis, xAxis);

    return new Float32Array([
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -this.dot(xAxis, eye), -this.dot(yAxis, eye), -this.dot(zAxis, eye), 1
    ]);
  }

  multiplyMatrices(a, b) {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = 
          a[i * 4 + 0] * b[0 * 4 + j] +
          a[i * 4 + 1] * b[1 * 4 + j] +
          a[i * 4 + 2] * b[2 * 4 + j] +
          a[i * 4 + 3] * b[3 * 4 + j];
      }
    }
    return result;
  }

  normalize(v) {
    const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / length, v[1] / length, v[2] / length];
  }

  cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  getPaletteIndex() {
    switch (this.config.colorPalette) {
      case 'spectrum': return 0;
      case 'fire': return 1;
      case 'ocean': return 2;
      default: return 3;
    }
  }

  render2D() {
    if (!this.getFrequencyData || !this.ctx) return;

    const rawData = this.getFrequencyData();
    if (!rawData) return;

    // Process data
    this.processFrequencyData(rawData);

    // Clear canvas
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw 2D spectrum fallback
    this.draw2DSpectrum();
  }

  draw2DSpectrum() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const barWidth = width / this.config.resolution;

    for (let i = 0; i < this.config.resolution; i++) {
      const amplitude = this.smoothedData[i];
      const barHeight = amplitude * height * 0.8;
      
      const x = i * barWidth;
      const y = height - barHeight;

      // Get color
      const hue = (i / this.config.resolution) * 360;
      this.ctx.fillStyle = `hsl(${hue}, 70%, ${50 + amplitude * 30}%)`;
      
      this.ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    // Draw FPS counter
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
  }

  cleanup() {
    if (this.gl) {
      // Clean up WebGL resources
      if (this.buffers.position) this.gl.deleteBuffer(this.buffers.position);
      if (this.buffers.texCoord) this.gl.deleteBuffer(this.buffers.texCoord);
      if (this.buffers.index) this.gl.deleteBuffer(this.buffers.index);
      if (this.textures.frequency) this.gl.deleteTexture(this.textures.frequency);
      if (this.program) this.gl.deleteProgram(this.program);
    }
  }
}