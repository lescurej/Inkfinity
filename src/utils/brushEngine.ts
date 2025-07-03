import * as PIXI from 'pixi.js'
import { GraphicsPool, StampPool } from './objectPool'
import { CONFIG } from '../../types'

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
  private stampPool: BrushStamp[] = []
  private poolSize = 1000
  private graphicsPool: GraphicsPool
  private stampPool: StampPool
  private instancedRenderer: InstancedRenderer

  constructor() {
    this.graphicsPool = new GraphicsPool(CONFIG.OBJECT_POOL_SIZE)
    this.stampPool = new StampPool(CONFIG.OBJECT_POOL_SIZE * 2)
    this.instancedRenderer = new InstancedRenderer()
  }

  private getStampFromPool(): BrushStamp {
    if (this.stampPool.length > 0) {
      return this.stampPool.pop()!;
    }
    return {
      x: 0, y: 0, size: 0, opacity: 0, rotation: 0, pressure: 0, velocity: 0, color: ''
    };
  }

  private returnStampToPool(stamp: BrushStamp) {
    if (this.stampPool.length < this.poolSize) {
      // Reset stamp properties
      stamp.x = 0;
      stamp.y = 0;
      stamp.size = 0;
      stamp.opacity = 0;
      stamp.rotation = 0;
      stamp.pressure = 0;
      stamp.velocity = 0;
      stamp.color = '';
      this.stampPool.push(stamp);
    }
  }

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
        size = Math.min(size, 32)
        const opacity = (0.6 + Math.random() * 0.4) * stampPressure
        
        const stamp = this.getStampFromPool();
        stamp.x = x;
        stamp.y = y;
        stamp.size = size;
        stamp.opacity = opacity;
        stamp.rotation = Math.random() * Math.PI * 2;
        stamp.pressure = stampPressure;
        stamp.velocity = velocity;
        stamp.color = '#000';
        
        stamps.push(stamp);
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
    
    if (stamps.length > 50 && this.instancedRenderer.isSupported()) {
      this.renderInstancedStamps(graphics, stamps, brushType, color);
    } else {
      this.renderPooledStamps(graphics, stamps, brushType, color);
    }

    const renderTime = performance.now() - startTime;
    if (renderTime > 16) {
      console.warn(`🐌 Slow stamp render: ${renderTime.toFixed(2)}ms`);
    }
  }

  private renderPooledStamps(
    graphics: PIXI.Graphics,
    stamps: BrushStamp[],
    brushType: string,
    color: string
  ) {
    const config = this.configs.get(brushType);
    if (!config) return;

    const stampGraphics = this.stampPool.acquire();
    
    stamps.forEach(stamp => {
      const alpha = stamp.opacity * (0.5 + Math.random() * 0.3);
      const w = stamp.size * (0.8 + Math.random() * 0.7);
      const h = stamp.size * (1.2 + Math.random() * 0.7);
      
      stampGraphics.beginFill(PIXI.Color.shared.setValue(color).toNumber(), alpha);
      stampGraphics.drawEllipse(stamp.x, stamp.y, w, h);
      stampGraphics.endFill();
    });

    stampGraphics.blendMode = PIXI.BLEND_MODES.DARKEN;
    graphics.addChild(stampGraphics);
    
    setTimeout(() => {
      this.stampPool.release(stampGraphics);
    }, 100);
  }

  private renderInstancedStamps(
    graphics: PIXI.Graphics,
    stamps: BrushStamp[],
    brushType: string,
    color: string
  ) {
    this.instancedRenderer.renderStamps(stamps, color, brushType);
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

  // Add cleanup method
  cleanupStamps(stamps: BrushStamp[]) {
    stamps.forEach(stamp => this.returnStampToPool(stamp));
  }

  destroy(): void {
    this.graphicsPool.clear();
    this.stampPool.clear();
    this.instancedRenderer.destroy();
  }
}

class InstancedRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private instanceBuffer: WebGLBuffer | null = null;

  constructor() {
    this.initWebGL();
  }

  private initWebGL(): void {
    const canvas = document.createElement('canvas');
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!this.gl) {
      console.warn('WebGL not supported, falling back to standard rendering');
      return;
    }

    this.createShaders();
    this.createBuffers();
  }

  private createShaders(): void {
    const vertexShader = `
      attribute vec2 a_position;
      attribute vec2 a_offset;
      attribute float a_size;
      attribute float a_alpha;
      
      uniform mat3 u_matrix;
      uniform vec2 u_resolution;
      
      varying float v_alpha;
      
      void main() {
        vec2 position = (u_matrix * vec3(a_position * a_size + a_offset, 1.0)).xy;
        gl_Position = vec4(position / u_resolution * 2.0 - 1.0, 0, 1);
        v_alpha = a_alpha;
      }
    `;

    const fragmentShader = `
      precision mediump float;
      uniform vec3 u_color;
      varying float v_alpha;
      
      void main() {
        gl_FragColor = vec4(u_color, v_alpha);
      }
    `;

    this.program = this.createProgram(vertexShader, fragmentShader);
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
    
    if (!vertexShader || !fragmentShader) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  private createBuffers(): void {
    if (!this.gl) return;

    this.vertexBuffer = this.gl.createBuffer();
    this.instanceBuffer = this.gl.createBuffer();
  }

  renderStamps(stamps: BrushStamp[], color: string, brushType: string): void {
    if (!this.gl || !this.program || stamps.length === 0) return;

    const colorVec = this.hexToRgb(color);
    if (!colorVec) return;

    this.gl.useProgram(this.program);
    this.gl.uniform3f(
      this.gl.getUniformLocation(this.program, 'u_color'),
      colorVec[0], colorVec[1], colorVec[2]
    );

    const instanceData = new Float32Array(stamps.length * 4);
    stamps.forEach((stamp, i) => {
      const offset = i * 4;
      instanceData[offset] = stamp.x;
      instanceData[offset + 1] = stamp.y;
      instanceData[offset + 2] = stamp.size;
      instanceData[offset + 3] = stamp.opacity;
    });

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, instanceData, this.gl.DYNAMIC_DRAW);

    this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, stamps.length);
  }

  private hexToRgb(hex: string): number[] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : null;
  }

  isSupported(): boolean {
    return this.gl !== null && this.program !== null;
  }

  destroy(): void {
    if (this.gl) {
      if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
      if (this.instanceBuffer) this.gl.deleteBuffer(this.instanceBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
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