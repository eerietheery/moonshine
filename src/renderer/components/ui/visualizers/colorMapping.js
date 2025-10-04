// Clever Color Mapping System
// Generates harmonious color schemes based on user's --primary-color

export class ColorMapper {
  constructor() {
    this.primaryColor = null;
    this.hsl = null;
    this.refreshPrimaryColor();
    
    // Listen for theme changes
    document.addEventListener('theme:accent', () => this.refreshPrimaryColor());
    document.addEventListener('theme:changed', () => this.refreshPrimaryColor());
  }

  refreshPrimaryColor() {
    const css = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-color').trim() || '#8C40B8';
    this.primaryColor = this.parseColor(css);
    this.hsl = this.rgbToHsl(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
  }

  parseColor(colorStr) {
    // Try RGB/RGBA first
    const rgbMatch = colorStr.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10)
      };
    }

    // Try hex format
    if (colorStr.startsWith('#')) {
      const hex = colorStr.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }

    // Default to Moonshine purple
    return { r: 140, g: 64, b: 184 };
  }

  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: h * 360, // 0-360
      s: s * 100, // 0-100
      l: l * 100  // 0-100
    };
  }

  hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  // Get complementary color (opposite on color wheel)
  getComplementary() {
    const h = (this.hsl.h + 180) % 360;
    return this.hslToRgb(h, this.hsl.s, this.hsl.l);
  }

  // Get triadic colors (120° apart)
  getTriadic() {
    return [
      this.primaryColor,
      this.hslToRgb((this.hsl.h + 120) % 360, this.hsl.s, this.hsl.l),
      this.hslToRgb((this.hsl.h + 240) % 360, this.hsl.s, this.hsl.l)
    ];
  }

  // Get analogous colors (30° apart)
  getAnalogous() {
    return [
      this.hslToRgb((this.hsl.h - 30 + 360) % 360, this.hsl.s, this.hsl.l),
      this.primaryColor,
      this.hslToRgb((this.hsl.h + 30) % 360, this.hsl.s, this.hsl.l)
    ];
  }

  // Get split complementary (complement ± 30°)
  getSplitComplementary() {
    const complementHue = (this.hsl.h + 180) % 360;
    return [
      this.primaryColor,
      this.hslToRgb((complementHue - 30 + 360) % 360, this.hsl.s, this.hsl.l),
      this.hslToRgb((complementHue + 30) % 360, this.hsl.s, this.hsl.l)
    ];
  }

  // Smart intensity-based color for spectrograms
  // Maps intensity (0-1) to a color gradient based on primary color
  getIntensityColor(intensity, scheme = 'theme') {
    switch (scheme) {
      case 'fire':
        // Classic fire colors: dark red -> orange -> yellow -> white
        return this.getFireColor(intensity);
      
      case 'ocean':
        // Ocean colors: dark blue -> cyan -> light blue
        return this.getOceanColor(intensity);
      
      case 'spectrum':
        // Rainbow spectrum
        return this.getSpectrumColor(intensity);
      
      case 'theme':
      default:
        // Theme-based intelligent gradient
        return this.getThemeIntensityColor(intensity);
    }
  }

  getThemeIntensityColor(intensity) {
    const { h, s } = this.hsl;
    
    if (intensity < 0.15) {
      // Very dark, nearly black with hint of hue
      return this.hslToRgb(h, s * 0.6, intensity * 15);
    } else if (intensity < 0.4) {
      // Dark to mid tones - use primary hue with increasing lightness
      const progress = (intensity - 0.15) / 0.25;
      return this.hslToRgb(h, s * (0.6 + progress * 0.4), 15 + progress * 35);
    } else if (intensity < 0.7) {
      // Mid to bright - full saturation, increasing lightness
      const progress = (intensity - 0.4) / 0.3;
      return this.hslToRgb(h, s, 50 + progress * 25);
    } else if (intensity < 0.85) {
      // Bright - shift towards analogous color
      const progress = (intensity - 0.7) / 0.15;
      const shiftedHue = h + (progress * 20); // Slight hue shift
      return this.hslToRgb(shiftedHue, s * (1 - progress * 0.2), 75 + progress * 10);
    } else {
      // Very bright - wash out towards white with color tint
      const progress = (intensity - 0.85) / 0.15;
      return this.hslToRgb(h, s * (0.8 - progress * 0.5), 85 + progress * 15);
    }
  }

  getFireColor(intensity) {
    if (intensity < 0.3) {
      // Dark red to red
      return {
        r: Math.floor(255 * (0.3 + intensity * 2.3)),
        g: Math.floor(255 * intensity * 0.5),
        b: 0
      };
    } else if (intensity < 0.6) {
      // Red to orange
      const progress = (intensity - 0.3) / 0.3;
      return {
        r: 255,
        g: Math.floor(255 * (0.15 + progress * 0.65)),
        b: 0
      };
    } else if (intensity < 0.85) {
      // Orange to yellow
      const progress = (intensity - 0.6) / 0.25;
      return {
        r: 255,
        g: Math.floor(255 * (0.8 + progress * 0.2)),
        b: Math.floor(255 * progress * 0.3)
      };
    } else {
      // Yellow to white
      const progress = (intensity - 0.85) / 0.15;
      return {
        r: 255,
        g: 255,
        b: Math.floor(255 * (0.3 + progress * 0.7))
      };
    }
  }

  getOceanColor(intensity) {
    const baseHue = 200; // Cyan-blue
    if (intensity < 0.3) {
      // Very dark blue
      return this.hslToRgb(baseHue, 80, intensity * 50);
    } else if (intensity < 0.7) {
      // Dark to bright blue/cyan
      const progress = (intensity - 0.3) / 0.4;
      return this.hslToRgb(baseHue - progress * 20, 80 - progress * 20, 15 + progress * 50);
    } else {
      // Bright cyan to light blue
      const progress = (intensity - 0.7) / 0.3;
      return this.hslToRgb(baseHue - 30, 60 - progress * 30, 65 + progress * 30);
    }
  }

  getSpectrumColor(intensity) {
    // Rainbow: violet -> blue -> cyan -> green -> yellow -> orange -> red
    const hue = 280 - (intensity * 280); // 280° (violet) to 0° (red)
    const saturation = 70;
    const lightness = 30 + (intensity * 50); // 30% to 80%
    return this.hslToRgb(hue, saturation, lightness);
  }

  // Get color for frequency position (useful for circular visualizations)
  getFrequencyColor(frequencyPosition, intensity = 1.0) {
    // Map frequency to hue rotation around primary color
    const baseHue = this.hsl.h;
    const hueRange = 60; // ±30° from primary
    const hue = (baseHue + (frequencyPosition - 0.5) * hueRange + 360) % 360;
    
    // Use intensity to modulate saturation and lightness
    const saturation = this.hsl.s * (0.6 + intensity * 0.4);
    const lightness = 30 + (intensity * 50);
    
    return this.hslToRgb(hue, saturation, lightness);
  }

  // Get gradient stops for smooth gradients
  getGradientStops(count, scheme = 'theme') {
    const stops = [];
    for (let i = 0; i < count; i++) {
      const intensity = i / (count - 1);
      stops.push(this.getIntensityColor(intensity, scheme));
    }
    return stops;
  }

  // Convert RGB to CSS string
  rgbToString(color, alpha = 1) {
    if (alpha < 1) {
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    }
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  // Get RGB as normalized 0-1 array (for WebGL/shaders)
  rgbToNormalized(color) {
    return [color.r / 255, color.g / 255, color.b / 255];
  }
}

// Singleton instance
export const colorMapper = new ColorMapper();
