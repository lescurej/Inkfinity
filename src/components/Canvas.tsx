import React, { useEffect, useRef, useCallback, useState } from 'react'
import * as PIXI from 'pixi.js'
import { useBrush } from '../hooks/useBrush'
import { useCanvasSocket } from '../hooks/useCanvasSocket'
import { useUUID } from '../hooks/useUUID'
import type { DrawingSegment, Stroke } from '../types'
import CanvasGrid from './CanvasGrid'
import styled from '@emotion/styled'
import { useCanvasStore } from '../store/canvasStore'
import { createStroke } from '../utils/brushEngine'

const CanvasContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  outline: none;
  background: #f0f0f0;
  cursor: none !important;
  touch-action: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  z-index: 100;
  pointer-events: auto !important;
`;

const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
`;

const StatsDisplay = styled.div`
  position: fixed;
  top: 60px;
  right: 20px;
  padding: 12px;
  border-radius: 8px;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 1000;
  min-width: 150px;
`;

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const pixiAppRef = useRef<PIXI.Application | null>(null)
  const drawingGraphicsRef = useRef<PIXI.Graphics | null>(null)
  const eraserGraphicsRef = useRef<PIXI.Graphics | null>(null)
  const remoteCursorsRef = useRef<Map<string, PIXI.Container>>(new Map())
  const myUUID = useUUID()
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([])
  const [remoteUsers, setRemoteUsers] = useState<Map<string, { name: string; color: string }>>(new Map())
  const [pendingCanvasState, setPendingCanvasState] = useState<any>(null)

  const canvasStore = useCanvasStore()
  const {
    viewport,
    drawing,
    lastPoint,
    mousePosition,
    screenToWorld,
    handleWheel,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleMouseLeave,
    setCanvasRef,
    fitToContentWithServer
  } = canvasStore

  const { brushColor, brushSizePercent, brushType, getBrushSizeInPixels } = useBrush()
  const { emit, on, off, isConnected, isLoading, stats } = useCanvasSocket()

  // Initialize PIXI
  useEffect(() => {
    if (!canvasRef.current) {
      return
    }

    try {
      const app = new PIXI.Application({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundAlpha: 0,
        antialias: true,
        resolution: 1
      })
      
      if (app.view) {
        canvasRef.current.appendChild(app.view as HTMLCanvasElement)
        
        if (app.view.style) {
          (app.view.style as any).width = '100vw';
          (app.view.style as any).height = '100vh';
          (app.view.style as any).position = 'absolute';
          (app.view.style as any).zIndex = '1';
          (app.view.style as any).pointerEvents = 'none';
        }
      } else {
        return
      }
      
      const drawingContainer = new PIXI.Container()
      app.stage.addChild(drawingContainer)
      
      const drawingGraphics = new PIXI.Graphics()
      drawingContainer.addChild(drawingGraphics)
      drawingGraphicsRef.current = drawingGraphics

      const remoteCursorsContainer = new PIXI.Container()
      app.stage.addChild(remoteCursorsContainer)

      pixiAppRef.current = app

    } catch (error) {
      console.error('❌ Error initializing PIXI:', error)
    }

    return () => {
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true)
        pixiAppRef.current = null
        drawingGraphicsRef.current = null
        eraserGraphicsRef.current = null
      }
    }
  }, [canvasRef.current])

  useEffect(() => {
    setCanvasRef(canvasRef)
  }, [setCanvasRef])

  useEffect(() => {
    const handleFitToContent = () => {
      fitToContentWithServer(emit, on, off)
    }

    window.addEventListener('fitToContent', handleFitToContent)
    
    return () => {
      window.removeEventListener('fitToContent', handleFitToContent)
    }
  }, [fitToContentWithServer, emit, on, off])

  // Handle viewport changes
  useEffect(() => {
    const app = pixiAppRef.current
    if (!app) return
    app.renderer.resize(window.innerWidth, window.innerHeight)
    app.stage.scale.set(viewport.scale)
    app.stage.x = -viewport.x * viewport.scale
    app.stage.y = -viewport.y * viewport.scale
  }, [viewport.x, viewport.y, viewport.scale])

  // Socket events
  useEffect(() => {
    // Set to track already rendered stroke IDs
    const renderedStrokeIds = new Set<string | number>()
    const graphics = drawingGraphicsRef.current

    const handleCanvasState = (data: any) => {
      if (!drawingGraphicsRef.current) {
        setPendingCanvasState(data)
        return
      }
      
      if (data.strokes) {
        data.strokes.forEach((stroke: any) => {
          if (stroke.points && stroke.points.length >= 2) {
            const size = stroke.size * viewport.scale
            
            if (stroke.brush === 'eraser') {
              const eraserGraphics = eraserGraphicsRef.current
              if (eraserGraphics) {
                eraserGraphics.beginFill(0xFFFFFF, 1)
                for (let i = 0; i < stroke.points.length; i++) {
                  eraserGraphics.drawCircle(stroke.points[i].x, stroke.points[i].y, size / 2)
                }
                eraserGraphics.endFill()
              }
            } else {
              const graphics = drawingGraphicsRef.current
              if (graphics) {
                const color = PIXI.Color.shared.setValue(stroke.color || '#000').toNumber()
                graphics.lineStyle(size, color, 1)
                graphics.blendMode = PIXI.BLEND_MODES.NORMAL
                graphics.moveTo(stroke.points[0].x, stroke.points[0].y)
                for (let i = 1; i < stroke.points.length; i++) {
                  graphics.lineTo(stroke.points[i].x, stroke.points[i].y)
                }
              }
            }
          }
        })
      }
    }
    
    const handleStrokeAdded = (stroke: any) => {
      if (stroke.points && stroke.points.length >= 2) {
        const size = stroke.size * viewport.scale
        
        if (stroke.brush === 'eraser') {
          const eraserGraphics = eraserGraphicsRef.current
          if (eraserGraphics) {
            eraserGraphics.beginFill(0xFFFFFF, 1)
            for (let i = 0; i < stroke.points.length; i++) {
              eraserGraphics.drawCircle(stroke.points[i].x, stroke.points[i].y, size / 2)
            }
            eraserGraphics.endFill()
          }
        } else {
          const graphics = drawingGraphicsRef.current
          if (graphics) {
            const color = PIXI.Color.shared.setValue(stroke.color || '#000').toNumber()
            graphics.lineStyle(size, color, 1)
            graphics.blendMode = PIXI.BLEND_MODES.NORMAL
            graphics.moveTo(stroke.points[0].x, stroke.points[0].y)
            
            for (let i = 1; i < stroke.points.length; i++) {
              graphics.lineTo(stroke.points[i].x, stroke.points[i].y)
            }
          }
        }
      }
    }
    
    const handleStrokeSegment = (segment: any) => {
      if (segment.from && segment.to) {
        const size = segment.size * viewport.scale
        
        if (segment.brush === 'eraser') {
          // For eraser segments, we'll let the server handle the redrawing
          // This ensures proper erasing that allows repainting
        } else {
          const graphics = drawingGraphicsRef.current
          if (graphics) {
            graphics.blendMode = PIXI.BLEND_MODES.NORMAL
            const color = PIXI.Color.shared.setValue(segment.color || '#000').toNumber()
            graphics.lineStyle(size, color, 1)
            graphics.moveTo(segment.from.x, segment.from.y)
            graphics.lineTo(segment.to.x, segment.to.y)
          }
        }
      }
    }
    
    const handleCanvasCleared = () => {
      const graphics = drawingGraphicsRef.current
      if (graphics) {
        graphics.clear()
      }
    }
    
    const handleStrokesRemoved = () => {
      // Redraw the entire canvas when strokes are removed
      const graphics = drawingGraphicsRef.current
      if (graphics) {
        graphics.clear()
        // Request the full canvas state to redraw
        emit('request-state')
      }
    }
    
    on('canvas-state', handleCanvasState)
    on('stroke-added', handleStrokeAdded)
    on('stroke-segment', handleStrokeSegment)
    on('canvas-cleared', handleCanvasCleared)
    on('strokes-removed', handleStrokesRemoved)
    
    return () => {
      off('canvas-state', handleCanvasState)
      off('stroke-added', handleStrokeAdded)
      off('stroke-segment', handleStrokeSegment)
      off('canvas-cleared', handleCanvasCleared)
      off('strokes-removed', handleStrokesRemoved)
    }
  }, [on, off, viewport.scale])

  // Apply pending canvas state when graphics become available
  useEffect(() => {
    if (pendingCanvasState && drawingGraphicsRef.current) {
      if (pendingCanvasState.strokes) {
        pendingCanvasState.strokes.forEach((stroke: any) => {
          if (stroke.points && stroke.points.length >= 2) {
            const size = stroke.size * viewport.scale
            
            if (stroke.brush === 'eraser') {
              const eraserGraphics = eraserGraphicsRef.current
              if (eraserGraphics) {
                eraserGraphics.beginFill(0xFFFFFF, 1)
                for (let i = 0; i < stroke.points.length; i++) {
                  eraserGraphics.drawCircle(stroke.points[i].x, stroke.points[i].y, size / 2)
                }
                eraserGraphics.endFill()
              }
            } else {
              const graphics = drawingGraphicsRef.current
              if (graphics) {
                const color = PIXI.Color.shared.setValue(stroke.color || '#000').toNumber()
                graphics.lineStyle(size, color, 1)
                graphics.blendMode = PIXI.BLEND_MODES.NORMAL
                graphics.moveTo(stroke.points[0].x, stroke.points[0].y)
                for (let i = 1; i < stroke.points.length; i++) {
                  graphics.lineTo(stroke.points[i].x, stroke.points[i].y)
                }
              }
            }
          }
        })
      }
      setPendingCanvasState(null)
    }
  }, [pendingCanvasState, viewport.scale])

  // Cursor emission
  useEffect(() => {
    const worldPos = screenToWorld(mousePosition.x, mousePosition.y)
    const cursorData = {
      uuid: myUUID,
      x: worldPos.x,
      y: worldPos.y,
      size: getBrushSizeInPixels(),
      color: brushColor,
      brush: brushType
    }
    emit('cursorMove', cursorData)
  }, [mousePosition.x, mousePosition.y, brushColor, getBrushSizeInPixels, brushType, screenToWorld, emit, myUUID])

  // Remote cursors and users
  useEffect(() => {
    const handleCursorMove = (data: any) => {
      if (data.uuid === myUUID) return
      
      const app = pixiAppRef.current
      if (!app) return
      
      let cursorContainer = remoteCursorsRef.current.get(data.uuid)
      if (!cursorContainer) {
        cursorContainer = new PIXI.Container()
        remoteCursorsRef.current.set(data.uuid, cursorContainer)
        app.stage.addChild(cursorContainer)
      }
      
      cursorContainer.x = data.x
      cursorContainer.y = data.y
      
      cursorContainer.removeChildren()
      
      const cursor = new PIXI.Graphics()
      const color = PIXI.Color.shared.setValue(data.color).toNumber()
      cursor.lineStyle(2, color, 1)
      cursor.drawCircle(0, 0, data.size)
      cursorContainer.addChild(cursor)
      
      const user = remoteUsers.get(data.uuid)
      if (user) {
        const text = new PIXI.Text(user.name, {
          fontSize: 12,
          fill: color,
          stroke: 0xffffff,
          strokeThickness: 2
        })
        text.anchor.set(0.5, 1)
        text.y = -data.size - 5
        cursorContainer.addChild(text)
      }
    }
    
    const handleUserLeft = (data: any) => {
      setRemoteUsers(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.uuid)
        return newMap
      })
      
      const cursorContainer = remoteCursorsRef.current.get(data.uuid)
      if (cursorContainer) {
        cursorContainer.destroy()
        remoteCursorsRef.current.delete(data.uuid)
      }
    }
    
    on('remoteCursor', handleCursorMove)
    on('userDisconnect', handleUserLeft)
    
    return () => {
      off('remoteCursor', handleCursorMove)
      off('userDisconnect', handleUserLeft)
    }
  }, [on, off, myUUID])

  // Mouse handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleMouseDown(e)
    if (e.button === 0 && !canvasStore.spacePressed) {
      const { x, y } = screenToWorld(e.clientX, e.clientY)
      setCurrentStroke([{ x, y }])
      canvasStore.setLastPoint({ x, y })
    }
  }, [handleMouseDown, canvasStore.spacePressed, screenToWorld, canvasStore.setLastPoint])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleMouseMove(e)
    if (drawing && lastPoint) {
      const { x, y } = screenToWorld(e.clientX, e.clientY)
      const newStroke = [...currentStroke, { x, y }]
      setCurrentStroke(newStroke)
      canvasStore.setLastPoint({ x, y })
      
      if (newStroke.length >= 2) {
        const size = getBrushSizeInPixels() * viewport.scale
        
        const graphics = drawingGraphicsRef.current
        if (graphics) {
          if (brushType === 'eraser') {
            // For eraser, we'll just emit the segment and let the server handle it
            // The server will redraw the canvas without the erased areas
          } else {
            const color = PIXI.Color.shared.setValue(brushColor).toNumber()
            graphics.lineStyle(size, color, 1)
            graphics.blendMode = PIXI.BLEND_MODES.NORMAL
            graphics.moveTo(newStroke[newStroke.length - 2].x, newStroke[newStroke.length - 2].y)
            graphics.lineTo(x, y)
          }
        }
        
        if (newStroke.length >= 2) {
          const segment = {
            from: newStroke[newStroke.length - 2],
            to: { x, y },
            color: brushType === 'eraser' ? '#FFFFFF' : brushColor,
            size: getBrushSizeInPixels(),
            brush: brushType,
            uuid: myUUID
          }
          emit('stroke-segment', segment)
        }
      }
    }
  }, [drawing, lastPoint, currentStroke, brushColor, getBrushSizeInPixels, screenToWorld, handleMouseMove, canvasStore.setLastPoint, viewport.scale, emit, myUUID, brushType])

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleMouseUp()
    if (currentStroke.length > 1) {
      const stroke = createStroke(currentStroke, brushColor, getBrushSizeInPixels(), brushType)
      emit('draw', stroke)
    }
    setCurrentStroke([])
    canvasStore.setLastPoint(null)
  }, [handleMouseUp, currentStroke, brushColor, getBrushSizeInPixels, brushType, emit, canvasStore.setLastPoint])

  const handleCanvasMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleMouseLeave()
  }, [handleMouseLeave])


  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '18px',
        color: '#666'
      }}>
        Connexion au serveur...
      </div>
    )
  }

  return (
    <>
      {stats && (
        <StatsDisplay>
          <div>📊 Strokes: {stats.totalStrokes}/{stats.maxStrokes}</div>
          <div>👥 Clients: {stats.connectedClients}</div>
          <div>💾 Mémoire: {stats.memoryUsage}</div>
        </StatsDisplay>
      )}
      
      <CanvasContainer
        ref={canvasRef}
        tabIndex={0}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseUp={handleCanvasMouseUp}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        style={{ touchAction: 'none' }}
      >
        <GridOverlay>
          <CanvasGrid viewport={{
            x: viewport.x,
            y: viewport.y,
            scale: viewport.scale,
            width: window.innerWidth,
            height: window.innerHeight
          }} />
        </GridOverlay>
      </CanvasContainer>
    </>
  )
}

export default Canvas 