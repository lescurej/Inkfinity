import * as PIXI from 'pixi.js'

export interface BrushStamp {
  x: number
  y: number
  size: number
  opacity: number
  rotation: number
  pressure: number
  velocity: number
  color: string
}

export interface BrushConfig {
  name: string
  type: 'dry' | 'wet' | 'pen' | 'special'
  stampTexture?: string
  baseSize: number
  spacing: number
  pressureSensitivity: boolean
  textureIntensity: number
  blendMode: string
  jitter: number
  smudge: boolean
}

export type Stroke = {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  brush: string;
  timestamp: number;
};

export function createStroke(points: { x: number; y: number }[], color: string, size: number, brush: string): Stroke {
  return {
    points,
    color,
    size,
    brush,
    timestamp: Date.now(),
  };
}

export class BrushEngine {
  private configs: Map<string, BrushConfig> = new Map()
  private loaded = false

  async initialize() {
    if (this.loaded) return

    const startTime = performance.now();
    console.log('🖌️ Initializing brush engine...');

    // Skip texture loading for now - use fallback rendering only
    this.setupDefaultConfigs();
    
    const initTime = performance.now() - startTime;
    console.log(`✅ Brush engine initialized in ${initTime.toFixed(2)}ms`);
    
    this.loaded = true;
  }

  private setupDefaultConfigs() {
    const configs: BrushConfig[] = [
      {
        name: 'pencil',
        type: 'dry',
        stampTexture: 'pencil',
        baseSize: 8,
        spacing: 0.4,
        pressureSensitivity: true,
        textureIntensity: 0.9,
        blendMode: 'multiply',
        jitter: 0.3,
        smudge: false
      },
      {
        name: 'charcoal',
        type: 'dry',
        stampTexture: 'charcoal',
        baseSize: 12,
        spacing: 0.6,
        pressureSensitivity: true,
        textureIntensity: 1.0,
        blendMode: 'multiply',
        jitter: 0.8,
        smudge: true
      },
      {
        name: 'pastel',
        type: 'dry',
        stampTexture: 'pastel',
        baseSize: 14,
        spacing: 0.5,
        pressureSensitivity: true,
        textureIntensity: 0.8,
        blendMode: 'screen',
        jitter: 0.6,
        smudge: true
      },
      {
        name: 'watercolor',
        type: 'wet',
        stampTexture: 'watercolor',
        baseSize: 15,
        spacing: 0.3,
        pressureSensitivity: true,
        textureIntensity: 0.7,
        blendMode: 'screen',
        jitter: 0.2,
        smudge: true
      },
      {
        name: 'ink',
        type: 'pen',
        stampTexture: 'ink',
        baseSize: 6,
        spacing: 0.2,
        pressureSensitivity: true,
        textureIntensity: 0.9,
        blendMode: 'source-over',
        jitter: 0.1,
        smudge: false
      },
      {
        name: 'gouache',
        type: 'wet',
        stampTexture: 'gouache',
        baseSize: 16,
        spacing: 0.4,
        pressureSensitivity: true,
        textureIntensity: 0.8,
        blendMode: 'source-over',
        jitter: 0.3,
        smudge: false
      },
      {
        name: 'oil',
        type: 'wet',
        stampTexture: 'oil',
        baseSize: 18,
        spacing: 0.5,
        pressureSensitivity: true,
        textureIntensity: 1.0,
        blendMode: 'source-over',
        jitter: 0.4,
        smudge: true
      },
      {
        name: 'marker',
        type: 'pen',
        stampTexture: 'marker',
        baseSize: 10,
        spacing: 0.5,
        pressureSensitivity: true,
        textureIntensity: 0.8,
        blendMode: 'source-over',
        jitter: 0.4,
        smudge: false
      },
      {
        name: 'highlighter',
        type: 'pen',
        stampTexture: 'highlighter',
        baseSize: 12,
        spacing: 0.6,
        pressureSensitivity: true,
        textureIntensity: 0.6,
        blendMode: 'screen',
        jitter: 0.2,
        smudge: false
      },
      {
        name: 'calligraphic',
        type: 'pen',
        stampTexture: 'calligraphic',
        baseSize: 8,
        spacing: 0.3,
        pressureSensitivity: true,
        textureIntensity: 0.9,
        blendMode: 'source-over',
        jitter: 0.1,
        smudge: false
      },
      {
        name: 'crayon',
        type: 'dry',
        stampTexture: 'crayon',
        baseSize: 11,
        spacing: 0.5,
        pressureSensitivity: true,
        textureIntensity: 0.8,
        blendMode: 'multiply',
        jitter: 0.5,
        smudge: false
      },
      {
        name: 'eraser',
        type: 'special',
        stampTexture: 'eraser',
        baseSize: 8,
        spacing: 0.3,
        pressureSensitivity: false,
        textureIntensity: 0,
        blendMode: 'multiply',
        jitter: 0.5,
        smudge: false
      }
    ]

    configs.forEach(config => {
      this.configs.set(config.name, config)
    })
  }

  generateStamps(
    points: [number, number][],
    brushType: string,
    baseSize: number,
    pressure: number = 1,
    velocity: number = 1
  ): BrushStamp[] {
    const startTime = performance.now();
    console.log(`🎨 Generating stamps for ${points.length} points, brush: ${brushType}`);

    const config = this.configs.get(brushType)
    if (!config) return []

    // Tool-specific spacing boost for perf
    let effectiveSpacing = config.spacing
    if (brushType === 'charcoal') effectiveSpacing *= 5
    if (['pastel', 'gouache', 'oil', 'watercolor', 'marker', 'highlighter'].includes(brushType)) effectiveSpacing *= 3

    const stamps: BrushStamp[] = []
    const spacing = effectiveSpacing * (1 + velocity * 0.5)

    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i]
      const [x2, y2] = points[i + 1]
      
      const dx = x2 - x1
      const dy = y2 - y1
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      const steps = Math.max(1, Math.floor(distance / (baseSize * spacing)))
      
      for (let j = 0; j <= steps; j++) {
        const t = j / steps
        const x = x1 + dx * t + (Math.random() - 0.5) * config.jitter * baseSize
        const y = y1 + dy * t + (Math.random() - 0.5) * config.jitter * baseSize
        
        const stampPressure = config.pressureSensitivity ? pressure : 1
        let size = baseSize * stampPressure * (0.8 + Math.random() * 0.4)
        size = Math.min(size, 32) // Clamp max dab size
        const opacity = (0.6 + Math.random() * 0.4) * stampPressure
        
        stamps.push({
          x,
          y,
          size,
          opacity,
          rotation: Math.random() * Math.PI * 2,
          pressure: stampPressure,
          velocity,
          color: '#000'
        })
      }
    }

    const stampTime = performance.now() - startTime;
    console.log(`✅ Generated ${stamps.length} stamps in ${stampTime.toFixed(2)}ms`);
    
    return stamps
  }

  renderStamps(
    graphics: PIXI.Graphics,
    stamps: BrushStamp[],
    brushType: string,
    color: string
  ) {
    const startTime = performance.now();
    console.log(`🎨 Rendering ${stamps.length} stamps for ${brushType}`);

    const config = this.configs.get(brushType)
    if (!config) return

    if (brushType === 'charcoal') {
      // Batch all dabs into a single Graphics for performance, no blur
      const g = new PIXI.Graphics()
      stamps.forEach(stamp => {
        let c = color
        let alpha = stamp.opacity * (0.5 + Math.random() * 0.3)
        let w = stamp.size * (0.8 + Math.random() * 0.7)
        let h = stamp.size * (1.2 + Math.random() * 0.7)
        g.beginFill(PIXI.Color.shared.setValue(c).toNumber(), alpha)
        g.drawEllipse(stamp.x, stamp.y, w, h)
        g.endFill()
      })
      g.blendMode = PIXI.BLEND_MODES.DARKEN
      graphics.addChild(g)
      return
    }

    // Always use fallback rendering for now
    this.renderFallbackStamps(graphics, stamps, color, config)

    const renderTime = performance.now() - startTime;
    console.log(`✅ Rendered stamps in ${renderTime.toFixed(2)}ms`);
    
    if (renderTime > 16) {
      console.warn(`🐌 Slow stamp render: ${renderTime.toFixed(2)}ms`);
    }
  }

  private renderFallbackStamps(
    graphics: PIXI.Graphics,
    stamps: BrushStamp[],
    color: string,
    config: BrushConfig
  ) {
    stamps.forEach(stamp => {
      const g = new PIXI.Graphics()
      let c = color
      let alpha = stamp.opacity
      let blend = PIXI.BLEND_MODES.NORMAL
      let shape = 'circle'
      let w = stamp.size, h = stamp.size
      let blur = 0
      switch (config.name) {
        case 'eraser':
          blend = PIXI.BLEND_MODES.DST_OUT
          g.blendMode = blend
          g.position.set(stamp.x, stamp.y)
          g.drawCircle(0, 0, w / 2)
          graphics.addChild(g)
          return
        case 'pencil':
          blend = PIXI.BLEND_MODES.MULTIPLY
          alpha *= 0.5 + 0.5 * stamp.pressure
          w *= 0.7 + Math.random() * 0.2
          h *= 0.9 + Math.random() * 0.2
          shape = 'ellipse'
          break
        case 'colored-pencil':
          blend = PIXI.BLEND_MODES.MULTIPLY
          c = colorSaturate(color, 0.7)
          alpha *= 0.6 + 0.4 * stamp.pressure
          w *= 0.7 + Math.random() * 0.2
          h *= 0.9 + Math.random() * 0.2
          shape = 'ellipse'
          break
        case 'charcoal':
          blend = PIXI.BLEND_MODES.DARKEN
          alpha *= 0.7 * (0.7 + Math.random() * 0.5)
          w *= 0.8 + Math.random() * 0.7
          h *= 1.2 + Math.random() * 0.7
          shape = 'ellipse'
          blur = 0 // No blur for perf
          break
        case 'pastel':
          blend = PIXI.BLEND_MODES.LIGHTEN
          c = colorSaturate(color, 1.2)
          alpha *= 0.3 + Math.random() * 0.3
          w *= 0.5 + Math.random() * 0.5
          h *= 0.5 + Math.random() * 0.5
          shape = 'circle'
          blur = 0 // No blur for perf
          break
        case 'watercolor':
          blend = PIXI.BLEND_MODES.SCREEN
          alpha *= 0.15 + Math.random() * 0.15
          w *= 1.1 + Math.random() * 0.2
          h *= 0.8 + Math.random() * 0.2
          shape = 'ellipse'
          blur = 1 // Only watercolor keeps a little blur
          break
        case 'gouache':
          blend = PIXI.BLEND_MODES.OVERLAY
          alpha *= 0.9
          w *= 1.1
          h *= 0.9
          shape = 'ellipse'
          blur = 0 // No blur for perf
          break
        case 'oil':
          blend = PIXI.BLEND_MODES.OVERLAY
          alpha *= 0.8
          w *= 1.2 + Math.random() * 0.2
          h *= 1.1 + Math.random() * 0.2
          c = colorTint(color, 0.9 + Math.random() * 0.2)
          shape = 'ellipse'
          blur = 0 // No blur for perf
          break
        case 'marker':
          blend = PIXI.BLEND_MODES.NORMAL
          alpha *= 0.7
          w *= 0.7
          h *= 0.4
          shape = 'ellipse'
          blur = 0 // No blur for perf
          break
        case 'highlighter':
          blend = PIXI.BLEND_MODES.SCREEN
          c = colorSaturate(color, 1.5)
          alpha *= 0.18
          w *= 1.2
          h *= 0.3
          shape = 'rect'
          blur = 0 // No blur for perf
          break
        default:
          blend = PIXI.BLEND_MODES.NORMAL
          shape = 'circle'
      }
      g.blendMode = blend
      g.beginFill(PIXI.Color.shared.setValue(c).toNumber(), alpha)
      g.position.set(stamp.x, stamp.y)
      g.rotation = stamp.rotation
      if (shape === 'ellipse') g.drawEllipse(0, 0, w, h)
      else if (shape === 'rect') g.drawRect(-w/2, -h/2, w, h)
      else g.drawCircle(0, 0, w/2)
      g.endFill()
      if (blur > 0) g.filters = [new PIXI.BlurFilter(blur)]
      graphics.addChild(g)
    })
  }

  getConfig(brushType: string): BrushConfig | undefined {
    return this.configs.get(brushType)
  }

  updateConfig(brushType: string, config: Partial<BrushConfig>) {
    const existing = this.configs.get(brushType)
    if (existing) {
      this.configs.set(brushType, { ...existing, ...config })
    }
  }
}

// Utility: saturate color (approximate, works for #rrggbb)
function colorSaturate(hex: string, factor: number) {
  let rgb = hexToRgb(hex)
  if (!rgb) return hex
  let hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  hsl[1] = Math.min(1, hsl[1] * factor)
  let rgb2 = hslToRgb(hsl[0], hsl[1], hsl[2])
  return rgbToHex(rgb2[0], rgb2[1], rgb2[2])
}
function colorTint(hex: string, factor: number) {
  let rgb = hexToRgb(hex)
  if (!rgb) return hex
  let hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  hsl[2] = Math.max(0, Math.min(1, hsl[2] * factor))
  let rgb2 = hslToRgb(hsl[0], hsl[1], hsl[2])
  return rgbToHex(rgb2[0], rgb2[1], rgb2[2])
}
function hexToRgb(hex: string) {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('')
  if (hex.length !== 6) return null
  const num = parseInt(hex, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return [h, s, l]
}
function hslToRgb(h: number, s: number, l: number) {
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
} 