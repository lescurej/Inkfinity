import * as PIXI from 'pixi.js'

function getDeviceProfile() {
  const ua = navigator.userAgent
  const ratio = window.devicePixelRatio || 1
  if (/iPhone/i.test(ua)) return { maxDabs: 800, blur: 2, name: 'iPhone' }
  if (/iPad/i.test(ua)) return { maxDabs: 1200, blur: 3, name: 'iPad' }
  return { maxDabs: 2000, blur: 4, name: 'desktop' }
}

const profile = getDeviceProfile()
let MAX_DABS = profile.maxDabs
let BASE_BLUR = profile.blur

class DabPool {
  private pool: PIXI.Sprite[] = []
  get(texture: PIXI.Texture) {
    return this.pool.pop() || new PIXI.Sprite(texture)
  }
  release(sprite: PIXI.Sprite) {
    sprite.filters = []
    sprite.alpha = 1
    sprite.visible = true
    this.pool.push(sprite)
  }
}

export class WatercolorSimulation {
  private enabled = false
  private container: PIXI.Container
  private dabs: { sprite: PIXI.Sprite; color: number; alpha: number }[] = []
  private pool = new DabPool()
  private lastFpsCheck = performance.now()
  private frameCount = 0

  constructor(private app: PIXI.Application) {
    this.container = new PIXI.Container()
    this.app.stage.addChild(this.container)
  }

  getSprite() {
    return this.container
  }

  setEnabled(state: boolean) {
    this.enabled = state
    this.container.visible = state
  }

  clear() {
    this.dabs.forEach(dab => {
      this.container.removeChild(dab.sprite)
      this.pool.release(dab.sprite)
    })
    this.dabs = []
  }

  addPigment(x: number, y: number, intensity: number = 0.8, humidity: number = 0.9, color: number = 0x000000) {
    if (!this.enabled) return
    if (this.dabs.length >= MAX_DABS) {
      const old = this.dabs.shift()
      if (old) {
        this.container.removeChild(old.sprite)
        this.pool.release(old.sprite)
      }
    }
    const size = 18 + humidity * 22
    const alpha = 0.12 + intensity * 0.18
    const graphics = new PIXI.Graphics()
    graphics.beginFill(color, 1)
    graphics.drawCircle(0, 0, size)
    graphics.endFill()
    const texture = this.app.renderer.generateTexture(graphics)
    const sprite = this.pool.get(texture)
    sprite.position.set(x, y)
    sprite.anchor.set(0.5)
    sprite.alpha = alpha
    sprite.filters = [new PIXI.BlurFilter(BASE_BLUR + humidity * 2)]
    this.container.addChild(sprite)
    this.dabs.push({ sprite, color, alpha })
  }

  update() {
    if (!this.enabled) return
    this.dabs.forEach(dab => {
      dab.sprite.alpha *= 0.995
      if (dab.sprite.alpha < 0.01) {
        this.container.removeChild(dab.sprite)
        this.pool.release(dab.sprite)
      }
    })
    this.dabs = this.dabs.filter(dab => dab.sprite.alpha >= 0.01)
    // FPS adaptation
    this.frameCount++
    const now = performance.now()
    if (now - this.lastFpsCheck > 1000) {
      const fps = this.frameCount * 1000 / (now - this.lastFpsCheck)
      if (fps < 50) {
        MAX_DABS = Math.max(400, Math.floor(MAX_DABS * 0.8))
        BASE_BLUR = Math.max(1, BASE_BLUR - 1)
      } else if (fps > 58 && MAX_DABS < profile.maxDabs) {
        MAX_DABS = Math.min(profile.maxDabs, Math.floor(MAX_DABS * 1.1))
        BASE_BLUR = Math.min(profile.blur, BASE_BLUR + 1)
      }
      this.lastFpsCheck = now
      this.frameCount = 0
    }
  }
}
