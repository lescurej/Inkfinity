import * as PIXI from 'pixi.js'

export interface ShaderUniforms {
  uTime: number
  uPressure: number
  uSampler: PIXI.Texture
}

export class ShaderManager {
  private shaders: Map<string, PIXI.Filter> = new Map()
  private time: number = 0

  async loadShaders() {
    const shaderFiles = [
      'charcoal', 'watercolor', 'marker', 'crayon',
      'ink', 'pastel', 'gouache', 'oil', 'highlighter', 'calligraphic'
    ]

    for (const shaderName of shaderFiles) {
      try {
        const vertexShader = await this.loadShaderFile(`${shaderName}.vert`)
        const fragmentShader = await this.loadShaderFile(`${shaderName}.frag`)
        
        const filter = new PIXI.Filter(vertexShader, fragmentShader, {
          uTime: 0,
          uPressure: 1.0,
          uSampler: PIXI.Texture.WHITE
        })
        
        this.shaders.set(shaderName, filter)
      } catch (error) {
        console.warn(`Failed to load shader: ${shaderName}`, error)
        // Create fallback shader
        const fallbackFilter = new PIXI.Filter(
          this.getDefaultVertexShader(),
          this.getDefaultFragmentShader(),
          {
            uTime: 0,
            uPressure: 1.0,
            uSampler: PIXI.Texture.WHITE
          }
        )
        this.shaders.set(shaderName, fallbackFilter)
      }
    }
  }

  private async loadShaderFile(filename: string): Promise<string> {
    try {
      const response = await fetch(`/src/brushShaders/${filename}`)
      if (!response.ok) {
        throw new Error(`Failed to load shader: ${filename}`)
      }
      return await response.text()
    } catch (error) {
      console.warn(`Could not load shader file: ${filename}`, error)
      return filename.endsWith('.vert') ? this.getDefaultVertexShader() : this.getDefaultFragmentShader()
    }
  }

  private getDefaultVertexShader(): string {
    return `
      attribute vec2 aVertexPosition;
      attribute vec2 aTextureCoord;
      
      uniform mat3 projectionMatrix;
      
      varying vec2 vTextureCoord;
      
      void main() {
          gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
          vTextureCoord = aTextureCoord;
      }
    `
  }

  private getDefaultFragmentShader(): string {
    return `
      precision mediump float;
      
      varying vec2 vTextureCoord;
      uniform sampler2D uSampler;
      uniform float uTime;
      uniform float uPressure;
      
      void main() {
          vec4 color = texture2D(uSampler, vTextureCoord);
          gl_FragColor = color;
      }
    `
  }

  getShader(brushType: string): PIXI.Filter | null {
    return this.shaders.get(brushType) || null
  }

  updateShaderUniforms(brushType: string, pressure: number = 1.0) {
    const shader = this.shaders.get(brushType)
    if (shader) {
      this.time += 0.016 // ~60fps
      shader.uniforms.uTime = this.time
      shader.uniforms.uPressure = pressure
    }
  }

  applyShaderToGraphics(graphics: PIXI.Graphics, brushType: string, pressure: number = 1.0) {
    const shader = this.getShader(brushType)
    if (shader) {
      this.updateShaderUniforms(brushType, pressure)
      graphics.filters = [shader]
    } else {
      graphics.filters = []
    }
  }
}

export const shaderManager = new ShaderManager() 