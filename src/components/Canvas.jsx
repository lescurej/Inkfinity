import React, { useEffect, useRef, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { useCanvas } from '../hooks/useCanvas'
import { useBrush } from '../hooks/useBrush'
import { useSocket } from '../hooks/useSocket'
import { uuidv4 } from '../utils/uuid'

const Canvas = () => {
  const canvasRef = useRef(null)
  const pixiAppRef = useRef(null)
  const segmentLayerRef = useRef(null)
  const myUUID = useRef(uuidv4())
  
  const {
    viewport,
    drawing,
    lastPoint,
    mousePosition,
    containerRef,
    drawingChunks,
    addSegmentToChunk,
    screenToWorld,
    handleWheel,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleMouseLeave
  } = useCanvas()

  const { brushColor, brushSize, brushType } = useBrush()
  const { emit, on, off } = useSocket()

  // Initialisation PixiJS
  useEffect(() => {
    if (!canvasRef.current) return

    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })

    canvasRef.current.appendChild(app.view)
    app.view.style.width = '100vw'
    app.view.style.height = '100vh'
    app.stage.sortableChildren = true

    const segmentLayer = new PIXI.Container()
    app.stage.addChild(segmentLayer)

    pixiAppRef.current = app
    segmentLayerRef.current = segmentLayer

    return () => {
      if (app) {
        app.destroy(true)
      }
    }
  }, [])

  // Redimensionnement
  useEffect(() => {
    const handleResize = () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.renderer.resize(window.innerWidth, window.innerHeight)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Mise à jour de la grille
  useEffect(() => {
    if (containerRef.current) {
      const grid = containerRef.current.querySelector('.grid')
      if (grid) {
        grid.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`
      }
    }
  }, [viewport])

  // Fonction de redraw PixiJS
  const redrawSegments = useCallback(() => {
    if (!segmentLayerRef.current) return

    segmentLayerRef.current.removeChildren()
    
    drawingChunks.forEach(chunk => {
      chunk.forEach(seg => {
        const g = new PIXI.Graphics()
        const color = seg.color || '#000'
        const size = (seg.size || 2) * viewport.scale

        switch(seg.brush) {
          case 'calligraphic': {
            const x1 = (seg.x1 - viewport.x) * viewport.scale
            const y1 = (seg.y1 - viewport.y) * viewport.scale
            const x2 = (seg.x2 - viewport.x) * viewport.scale
            const y2 = (seg.y2 - viewport.y) * viewport.scale
            const angle = Math.atan2(y2 - y1, x2 - x1) - Math.PI/6
            g.beginFill(PIXI.utils.string2hex(color), 0.8)
            g.drawEllipse(x1, y1, size, size*0.5, angle)
            g.endFill()
            break
          }
          case 'crayon': {
            for (let i = 0; i < 6; i++) {
              g.lineStyle(size + Math.random()*2-1, PIXI.utils.string2hex(color), 0.2 + Math.random()*0.3)
              g.moveTo((seg.x1 - viewport.x) * viewport.scale, (seg.y1 - viewport.y) * viewport.scale)
              g.lineTo((seg.x2 - viewport.x) * viewport.scale, (seg.y2 - viewport.y) * viewport.scale)
            }
            break
          }
          case 'marker': {
            const x1 = (seg.x1 - viewport.x) * viewport.scale + (Math.random()-0.5)*2
            const y1 = (seg.y1 - viewport.y) * viewport.scale + (Math.random()-0.5)*2
            const x2 = (seg.x2 - viewport.x) * viewport.scale + (Math.random()-0.5)*2
            const y2 = (seg.y2 - viewport.y) * viewport.scale + (Math.random()-0.5)*2
            g.lineStyle(size, PIXI.utils.string2hex(color), 0.8)
            g.moveTo(x1, y1)
            g.lineTo(x2, y2)
            break
          }
          case 'eraser': {
            g.lineStyle(size, 0xffffff, 1)
            g.blendMode = PIXI.BLEND_MODES.ERASE
            g.moveTo((seg.x1 - viewport.x) * viewport.scale, (seg.y1 - viewport.y) * viewport.scale)
            g.lineTo((seg.x2 - viewport.x) * viewport.scale, (seg.y2 - viewport.y) * viewport.scale)
            break
          }
          case 'rainbow': {
            const t = (seg.x1 + seg.y1 + seg.x2 + seg.y2) * 0.5
            const rainbow = PIXI.utils.string2hex(`hsl(${(t*10)%360},100%,50%)`)
            g.lineStyle(size, rainbow, 0.9)
            g.moveTo((seg.x1 - viewport.x) * viewport.scale, (seg.y1 - viewport.y) * viewport.scale)
            g.lineTo((seg.x2 - viewport.x) * viewport.scale, (seg.y2 - viewport.y) * viewport.scale)
            break
          }
          case 'pattern': {
            g.lineStyle(size, PIXI.utils.string2hex(color), 0.8)
            g.moveTo((seg.x1 - viewport.x) * viewport.scale, (seg.y1 - viewport.y) * viewport.scale)
            g.lineTo((seg.x2 - viewport.x) * viewport.scale, (seg.y2 - viewport.y) * viewport.scale)
            break
          }
          case 'round':
          default: {
            g.lineStyle(size, PIXI.utils.string2hex(color), 0.7)
            g.moveTo((seg.x1 - viewport.x) * viewport.scale, (seg.y1 - viewport.y) * viewport.scale)
            g.lineTo((seg.x2 - viewport.x) * viewport.scale, (seg.y2 - viewport.y) * viewport.scale)
            break
          }
        }
        
        segmentLayerRef.current.addChild(g)
      })
    })
  }, [drawingChunks, viewport])

  // Redraw quand les segments ou le viewport changent
  useEffect(() => {
    redrawSegments()
  }, [redrawSegments])

  // Gestion du dessin en temps réel
  useEffect(() => {
    if (drawing && lastPoint) {
      const worldPos = screenToWorld(mousePosition.x, mousePosition.y)
      
      const seg = {
        x1: lastPoint.x,
        y1: lastPoint.y,
        x2: worldPos.x,
        y2: worldPos.y,
        color: brushColor,
        size: brushSize,
        brush: brushType
      }

      addSegmentToChunk(seg)
      emit('draw', seg)
    }
  }, [drawing, lastPoint, mousePosition, brushColor, brushSize, brushType, screenToWorld, addSegmentToChunk, emit])

  // Émission de la position du curseur
  useEffect(() => {
    const worldPos = screenToWorld(mousePosition.x, mousePosition.y)
    emit('cursorMove', {
      uuid: myUUID.current,
      x: worldPos.x,
      y: worldPos.y,
      size: brushSize,
      color: brushColor,
      brush: brushType
    })
  }, [mousePosition, brushColor, brushSize, brushType, screenToWorld, emit])

  // Écoute des événements Socket.IO
  useEffect(() => {
    const handleDraw = (data) => {
      addSegmentToChunk(data)
    }

    const handleClearCanvas = () => {
      // Géré par le composant parent
    }

    on('draw', handleDraw)
    on('clearCanvas', handleClearCanvas)

    return () => {
      off('draw', handleDraw)
      off('clearCanvas', handleClearCanvas)
    }
  }, [on, off, addSegmentToChunk])

  return (
    <div 
      ref={containerRef}
      className="canvas-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="grid" />
      <div ref={canvasRef} />
    </div>
  )
}

export default Canvas 