// Base interface and utilities for visualization components

import { 
  VisualizationComponent, 
  VisualizationConfig, 
  VisualizationMode,
  VisualizationType 
} from '../../types/VisualizationTypes.js';
import { 
  FrequencyDataProvider, 
  TimeDomainDataProvider 
} from '../../types/AudioTypes.js';
import { ColorPalette } from '../../utils/ColorUtils.js';

/**
 * Extended interface for visualization components with additional methods
 */
export interface ExtendedVisualizationComponent extends VisualizationComponent {
  // Required methods from base interface
  start(getFrequencyData: FrequencyDataProvider, getTimeDomainData?: TimeDomainDataProvider): void;
  stop(): void;
  
  // Optional methods with default implementations
  setMode?(mode: VisualizationMode): void;
  setColorPalette?(palette: ColorPalette): void;
  resize?(): void;
  
  // Extended methods
  getType(): VisualizationType;
  getConfig(): VisualizationConfig;
  updateConfig(config: Partial<VisualizationConfig>): void;
  isActive(): boolean;
  getPerformanceInfo?(): { fps: number; frameTime: number };
}

/**
 * Configuration validator for visualization components
 */
export class VisualizationConfigValidator {
  static validateMode(mode: VisualizationMode, supportedModes: VisualizationMode[]): boolean {
    return supportedModes.includes(mode);
  }
  
  static validateColorPalette(palette: ColorPalette): boolean {
    const validPalettes: ColorPalette[] = ['classic', 'fire', 'ocean', 'rainbow', 'grayscale'];
    return validPalettes.includes(palette);
  }
  
  static validateConfig(config: VisualizationConfig, componentType: VisualizationType): VisualizationConfig {
    const validated: VisualizationConfig = {
      mode: config.mode || 'linear',
      colorPalette: config.colorPalette || 'classic',
      isActive: config.isActive || false,
      frameRate: config.frameRate || 60
    };
    
    // Component-specific validation
    switch (componentType) {
      case 'oscilloscope':
        // Oscilloscope supports both linear and circular modes
        if (!['linear', 'circular'].includes(validated.mode!)) {
          validated.mode = 'linear';
        }
        break;
        
      case 'spectrum':
        // Spectrum analyzer supports linear and circular modes
        if (!['linear', 'circular'].includes(validated.mode!)) {
          validated.mode = 'linear';
        }
        break;
        
      case 'spectrogram':
        // Spectrogram supports linear and circular modes
        if (!['linear', 'circular'].includes(validated.mode!)) {
          validated.mode = 'linear';
        }
        break;
        
      case 'radar':
        // Radar only supports circular/radar mode
        validated.mode = 'radar';
        break;
        
      case 'harmonic':
        // Harmonic analyzer supports linear and circular modes
        if (!['linear', 'circular'].includes(validated.mode!)) {
          validated.mode = 'linear';
        }
        break;
        
      case 'dodecagon':
        // 3D dodecagon only supports 3D mode
        validated.mode = '3d';
        break;
    }
    
    return validated;
  }
}

/**
 * Factory for creating visualization components
 */
export class VisualizationFactory {
  private static registeredComponents = new Map<VisualizationType, new (canvas: HTMLCanvasElement, config?: VisualizationConfig) => ExtendedVisualizationComponent>();
  
  /**
   * Register a visualization component class
   */
  static register(type: VisualizationType, componentClass: new (canvas: HTMLCanvasElement, config?: VisualizationConfig) => ExtendedVisualizationComponent): void {
    this.registeredComponents.set(type, componentClass);
  }
  
  /**
   * Create a visualization component instance
   */
  static create(type: VisualizationType, canvas: HTMLCanvasElement, config?: VisualizationConfig): ExtendedVisualizationComponent | null {
    const ComponentClass = this.registeredComponents.get(type);
    if (!ComponentClass) {
      console.error(`Visualization component not registered: ${type}`);
      return null;
    }
    
    const validatedConfig = VisualizationConfigValidator.validateConfig(config || {}, type);
    return new ComponentClass(canvas, validatedConfig);
  }
  
  /**
   * Get all registered component types
   */
  static getRegisteredTypes(): VisualizationType[] {
    return Array.from(this.registeredComponents.keys());
  }
  
  /**
   * Check if a component type is registered
   */
  static isRegistered(type: VisualizationType): boolean {
    return this.registeredComponents.has(type);
  }
}

/**
 * Utility functions for visualization components
 */
export class VisualizationUtils {
  /**
   * Get supported modes for a visualization type
   */
  static getSupportedModes(type: VisualizationType): VisualizationMode[] {
    switch (type) {
      case 'oscilloscope':
      case 'spectrum':
      case 'spectrogram':
      case 'harmonic':
        return ['linear', 'circular'];
      case 'radar':
        return ['radar'];
      case 'dodecagon':
        return ['3d'];
      default:
        return ['linear'];
    }
  }
  
  /**
   * Check if a mode is supported by a visualization type
   */
  static isModeSupported(type: VisualizationType, mode: VisualizationMode): boolean {
    return this.getSupportedModes(type).includes(mode);
  }
  
  /**
   * Get default mode for a visualization type
   */
  static getDefaultMode(type: VisualizationType): VisualizationMode {
    const supportedModes = this.getSupportedModes(type);
    return supportedModes[0];
  }
  
  /**
   * Create a default configuration for a visualization type
   */
  static createDefaultConfig(type: VisualizationType): VisualizationConfig {
    return {
      mode: this.getDefaultMode(type),
      colorPalette: 'classic',
      isActive: false,
      frameRate: 60
    };
  }
  
  /**
   * Normalize frequency data for visualization
   */
  static normalizeFrequencyData(data: Uint8Array, minValue: number = 0, maxValue: number = 255): Uint8Array {
    const normalized = new Uint8Array(data.length);
    const range = maxValue - minValue;
    
    for (let i = 0; i < data.length; i++) {
      const normalizedValue = ((data[i] - minValue) / range) * 255;
      normalized[i] = Math.max(0, Math.min(255, normalizedValue));
    }
    
    return normalized;
  }
  
  /**
   * Apply smoothing to frequency data
   */
  static smoothFrequencyData(data: Uint8Array, smoothingFactor: number = 0.8): Uint8Array {
    const smoothed = new Uint8Array(data.length);
    smoothed[0] = data[0];
    
    for (let i = 1; i < data.length; i++) {
      smoothed[i] = Math.round(data[i] * (1 - smoothingFactor) + smoothed[i - 1] * smoothingFactor);
    }
    
    return smoothed;
  }
}

/**
 * Base error class for visualization components
 */
export class VisualizationError extends Error {
  constructor(message: string, public componentType?: VisualizationType) {
    super(message);
    this.name = 'VisualizationError';
  }
}

/**
 * Performance monitoring mixin
 */
export class PerformanceMixin {
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;
  private frameTimeStart: number = 0;
  private lastFrameTime: number = 0;
  
  startFrameTimer(): void {
    this.frameTimeStart = performance.now();
  }
  
  endFrameTimer(): void {
    this.lastFrameTime = performance.now() - this.frameTimeStart;
    this.frameCount++;
    
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }
  
  getPerformanceInfo(): { fps: number; frameTime: number } {
    return {
      fps: this.currentFps,
      frameTime: this.lastFrameTime
    };
  }
  
  resetPerformanceCounters(): void {
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.currentFps = 0;
    this.lastFrameTime = 0;
  }
}