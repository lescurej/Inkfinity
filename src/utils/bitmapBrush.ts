import * as PIXI from 'pixi.js'

interface BrushStamp {
  texture: PIXI.Texture
  size: number
  rotation: number
  opacity: number
}

export class BitmapBrush {
  private brushTextures: Map<string, PIXI.Texture> = new Map()
  private loaded = false

  async loadBrushTextures() {
    if (this.loaded) return

    const brushTypes = ['crayon', 'marker', 'calligraphic']
    
    for (const type of brushTypes) {
      try {
        const texture = await PIXI.Assets.load(`/brushes/${type}.png`)
        this.brushTextures.set(type, texture)
      } catch (error) {
        console.warn(`Failed to load brush texture: ${type}`, error)
      }
    }
    
    this.loaded = true
  }

  createStamp(brushType: string, size: number, pressure: number = 1): BrushStamp | null {
    const texture = this.brushTextures.get(brushType)
    if (!texture) return null

    return {
      texture,
      size: size * pressure,
      rotation: Math.random() * Math.PI * 2,
      opacity: 0.7 + Math.random() * 0.3
    }
  }

  drawStampsAlongPath(
    graphics: PIXI.Graphics,
    points: [number, number][],
    brushType: string,
    baseSize: number,
    spacing: number = 0.8
  ) {
    if (!this.loaded) return

    for (let i = 0; i < points.length; i += Math.max(1, Math.floor(spacing * 10))) {
      const point = points[i]
      const pressure = 0.8 + Math.random() * 0.4
      const stamp = this.createStamp(brushType, baseSize, pressure)
      
      if (stamp) {
        const sprite = new PIXI.Sprite(stamp.texture)
        sprite.anchor.set(0.5)
        sprite.position.set(point[0], point[1])
        sprite.width = stamp.size
        sprite.height = stamp.size
        sprite.rotation = stamp.rotation
        sprite.alpha = stamp.opacity
        graphics.addChild(sprite)
      }
    }
  }
} 