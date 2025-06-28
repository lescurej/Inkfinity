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
  const [coordinatesApplied, setCoordinatesApplied] = useState(false)
  const [coordinatesLoading, setCoordinatesLoading] = useState(false)
  const [windowDimensions, setWindowDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [canvasJustCleared, setCanvasJustCleared] = useState(false)
  
  const touchStateRef = useRef<{
    isDrawing: boolean
    isPanning: boolean
    startX: number
    startY: number
    lastTouchX: number
    lastTouchY: number
    initialDistance: number
    initialScale: number
    worldAtStart?: { x: number; y: number } // Point | undefined
  }>({
    isDrawing: false,
    isPanning: false,
    startX: 0,
    startY: 0,
    lastTouchX: 0,
    lastTouchY: 0,
    initialDistance: 0,
    initialScale: 1,
    worldAtStart: undefined
  })

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

    const handleCoordinatesApplied = () => {
      console.log('🎯 Coordinates applied, enabling rendering')
      setCoordinatesApplied(true)
      setCoordinatesLoading(false)
    }

    const urlParams = new URLSearchParams(window.location.search)
    const hasUrlCoordinates = urlParams.get('x') && urlParams.get('y')
    if (!hasUrlCoordinates) {
      setCoordinatesApplied(true)
    } else {
      setCoordinatesLoading(true)
      setTimeout(() => {
        if (coordinatesLoading) {
          setCoordinatesLoading(false)
        }
      }, 500)
    }

    window.addEventListener('fitToContent', handleFitToContent)
    window.addEventListener('coordinates-applied', handleCoordinatesApplied)
    
    return () => {
      window.removeEventListener('fitToContent', handleFitToContent)
      window.removeEventListener('coordinates-applied', handleCoordinatesApplied)
    }
  }, [fitToContentWithServer, emit, on, off])

  useEffect(() => {
    const app = pixiAppRef.current
    if (!app) return
    app.renderer.resize(window.innerWidth, window.innerHeight)
    app.stage.scale.set(viewport.scale)
    app.stage.x = -viewport.x * viewport.scale
    app.stage.y = -viewport.y * viewport.scale
  }, [viewport.x, viewport.y, viewport.scale])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const app = pixiAppRef.current
      if (!app) return
      
      app.renderer.resize(window.innerWidth, window.innerHeight)
      
      // Update window dimensions state
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight })
      
      // Update viewport to maintain the same center point
      const viewport = canvasStore.viewport
      const centerX = viewport.x + window.innerWidth / 2 / viewport.scale
      const centerY = viewport.y + window.innerHeight / 2 / viewport.scale
      
      canvasStore.setViewport({
        x: centerX - window.innerWidth / 2 / viewport.scale,
        y: centerY - window.innerHeight / 2 / viewport.scale
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [canvasStore])

  // Socket events
  useEffect(() => {
    const graphics = drawingGraphicsRef.current;

    const handleCanvasState = (data: any) => {
      console.log('CLIENT: Received canvasState', data);
      window.dispatchEvent(new CustomEvent('canvas-state-loaded'));
      if (!graphics) {
        console.log('⏳ Graphics not ready, storing pending state');
        setPendingCanvasState(data);
        return;
      }
      graphics.clear();
      if (data.strokes && Array.isArray(data.strokes)) {
        data.strokes.forEach((stroke: any) => {
          if (stroke.points && stroke.points.length >= 2) {
            const color = PIXI.Color.shared.setValue(stroke.color).toNumber();
            const size = stroke.size * viewport.scale;
            graphics.lineStyle(size, color, 1);
            graphics.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
              graphics.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
          }
        });
      }
    };

    const handleStrokeAdded = (stroke: any) => {
      const graphics = drawingGraphicsRef.current
      if (graphics && stroke.points && stroke.points.length >= 2) {
        const color = PIXI.Color.shared.setValue(stroke.color).toNumber()
        const size = stroke.size * viewport.scale
        graphics.lineStyle(size, color, 1)
        graphics.moveTo(stroke.points[0].x, stroke.points[0].y)
        for (let i = 1; i < stroke.points.length; i++) {
          graphics.lineTo(stroke.points[i].x, stroke.points[i].y)
        }
      }
    }

    const handleStrokeSegment = (segment: any) => {
      const graphics = drawingGraphicsRef.current
      if (graphics && segment.from && segment.to) {
        const color = PIXI.Color.shared.setValue(segment.color).toNumber()
        const size = segment.size * viewport.scale
        graphics.lineStyle(size, color, 1)
        graphics.moveTo(segment.from.x, segment.from.y)
        graphics.lineTo(segment.to.x, segment.to.y)
      }
    }

    const handleCanvasCleared = () => {
      console.log('🧹 Canvas cleared event received')
      try {
        if (graphics) {
          graphics.clear()
          console.log('🧹 Graphics cleared')
        }
        setPendingCanvasState(null)
        setCurrentStroke([])
        remoteCursorsRef.current.forEach((cursorContainer) => {
          cursorContainer.destroy()
        })
        remoteCursorsRef.current.clear()
        console.log('🧹 Remote cursors cleared')
        // Force the store to empty to prevent redraw
        canvasStore.loadHistory([])
        canvasStore.clearChunks()
        console.log('🧹 Canvas store cleared')
      } catch (error) {
        console.error('❌ Error clearing canvas:', error)
      }
    }

    const handleStrokesRemoved = () => {
      if (graphics) {
        graphics.clear()
      }
    }

    on('canvas-state', handleCanvasState)
    on('strokeAdded', handleStrokeAdded)
    on('strokeSegment', handleStrokeSegment)
    on('canvas-cleared', handleCanvasCleared)
    on('strokes-removed', handleStrokesRemoved)

    return () => {
      off('canvas-state', handleCanvasState)
      off('strokeAdded', handleStrokeAdded)
      off('strokeSegment', handleStrokeSegment)
      off('canvas-cleared', handleCanvasCleared)
      off('strokes-removed', handleStrokesRemoved)
    }
  }, [on, off, viewport.scale, canvasStore])

  useEffect(() => {
    if (pendingCanvasState && drawingGraphicsRef.current) {
      // Apply pending canvas state as soon as graphics are ready
      const graphics = drawingGraphicsRef.current;
      graphics.clear();
      const data = pendingCanvasState;
      if (data.strokes && Array.isArray(data.strokes)) {
        data.strokes.forEach((stroke: any) => {
          if (stroke.points && stroke.points.length >= 2) {
            const color = PIXI.Color.shared.setValue(stroke.color).toNumber();
            const size = stroke.size * viewport.scale;
            graphics.lineStyle(size, color, 1);
            graphics.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
              graphics.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
          }
        });
      }
      setPendingCanvasState(null);
    }
  }, [pendingCanvasState, viewport.scale]);

  // Emit initial cursor position when component mounts or socket connects
  useEffect(() => {
    if (isConnected) {
      const cursorData = {
        uuid: myUUID,
        x: mousePosition.x,
        y: mousePosition.y,
        color: brushColor,
        size: getBrushSizeInPixels(),
        brush: brushType
      }
      emit('cursorMove', cursorData)
    }
  }, [isConnected, myUUID, mousePosition.x, mousePosition.y, brushColor, getBrushSizeInPixels, brushType, emit])

  useEffect(() => {
    const cursorData = {
      uuid: myUUID,
      x: mousePosition.x,
      y: mousePosition.y,
      color: brushColor,
      size: getBrushSizeInPixels(),
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
    
    const handleUserConnect = (data: any) => {
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
    }
    
    const handleUserDisconnect = (uuid: string) => {
      if (uuid === myUUID) return
      
      setRemoteUsers(prev => {
        const newMap = new Map(prev)
        newMap.delete(uuid)
        return newMap
      })
      
      const cursorContainer = remoteCursorsRef.current.get(uuid)
      if (cursorContainer) {
        cursorContainer.destroy()
        remoteCursorsRef.current.delete(uuid)
      }
    }
    
    on('remoteCursor', handleCursorMove)
    on('userConnect', handleUserConnect)
    on('userDisconnect', handleUserDisconnect)
    
    return () => {
      off('remoteCursor', handleCursorMove)
      off('userConnect', handleUserConnect)
      off('userDisconnect', handleUserDisconnect)
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
          console.log('CLIENT: Emitting strokeSegment', segment)
          emit('strokeSegment', segment)
        }
      }
    }
  }, [drawing, lastPoint, currentStroke, brushColor, getBrushSizeInPixels, screenToWorld, handleMouseMove, canvasStore.setLastPoint, viewport.scale, emit, myUUID, brushType])

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleMouseUp()
    if (currentStroke.length > 1) {
      const stroke = createStroke(currentStroke, brushColor, getBrushSizeInPixels(), brushType)
      console.log('CLIENT: Emitting strokeAdded', stroke)
      emit('strokeAdded', stroke)
    }
    setCurrentStroke([])
    canvasStore.setLastPoint(null)
  }, [handleMouseUp, currentStroke, brushColor, getBrushSizeInPixels, brushType, emit, canvasStore])

  const handleCanvasMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleMouseLeave()
  }, [handleMouseLeave])

  // Touch handlers
  const getTouchDistance = useCallback((touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  const getTouchCenter = useCallback((touches: React.TouchList) => {
    if (touches.length === 0) return { x: 0, y: 0 }
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY }
    }
    const x = (touches[0].clientX + touches[1].clientX) / 2
    const y = (touches[0].clientY + touches[1].clientY) / 2
    return { x, y }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const touches = e.touches
    
    if (touches.length === 1) {
      const touch = touches[0]
      const { x, y } = screenToWorld(touch.clientX, touch.clientY)
      
      // Emit cursor position for mobile
      const cursorData = {
        uuid: myUUID,
        x: x,
        y: y,
        color: brushColor,
        size: getBrushSizeInPixels(),
        brush: brushType
      }
      emit('cursorMove', cursorData)
      
      touchStateRef.current.isDrawing = true
      touchStateRef.current.startX = touch.clientX
      touchStateRef.current.startY = touch.clientY
      touchStateRef.current.lastTouchX = touch.clientX
      touchStateRef.current.lastTouchY = touch.clientY
      
      setCurrentStroke([{ x, y }])
      canvasStore.setLastPoint({ x, y })
      canvasStore.setDrawing(true)
    } else if (touches.length === 2) {
      touchStateRef.current.isPanning = true
      touchStateRef.current.initialDistance = getTouchDistance(touches)
      touchStateRef.current.initialScale = viewport.scale
      touchStateRef.current.startX = getTouchCenter(touches).x
      touchStateRef.current.startY = getTouchCenter(touches).y
      const center = getTouchCenter(touches)
      const worldAtStart = screenToWorld(center.x, center.y)
      touchStateRef.current.worldAtStart = worldAtStart
    }
  }, [screenToWorld, canvasStore, getTouchDistance, getTouchCenter, viewport.scale])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const touches = e.touches
    
    if (touches.length === 1 && touchStateRef.current.isDrawing) {
      const touch = touches[0]
      const { x, y } = screenToWorld(touch.clientX, touch.clientY)
      
      // Emit cursor position for mobile
      const cursorData = {
        uuid: myUUID,
        x: x,
        y: y,
        color: brushColor,
        size: getBrushSizeInPixels(),
        brush: brushType
      }
      emit('cursorMove', cursorData)
      
      const newStroke = [...currentStroke, { x, y }]
      setCurrentStroke(newStroke)
      canvasStore.setLastPoint({ x, y })
      
      if (newStroke.length >= 2) {
        const size = getBrushSizeInPixels() * viewport.scale
        
        const graphics = drawingGraphicsRef.current
        if (graphics && brushType !== 'eraser') {
          const color = PIXI.Color.shared.setValue(brushColor).toNumber()
          graphics.lineStyle(size, color, 1)
          graphics.blendMode = PIXI.BLEND_MODES.NORMAL
          graphics.moveTo(newStroke[newStroke.length - 2].x, newStroke[newStroke.length - 2].y)
          graphics.lineTo(x, y)
        }
        
        const segment = {
          from: newStroke[newStroke.length - 2],
          to: { x, y },
          color: brushType === 'eraser' ? '#FFFFFF' : brushColor,
          size: getBrushSizeInPixels(),
          brush: brushType,
          uuid: myUUID
        }
        console.log('CLIENT: Emitting strokeSegment', segment)
        emit('strokeSegment', segment)
      }
    } else if (touches.length === 2 && touchStateRef.current.isPanning) {
      const currentDistance = getTouchDistance(touches)
      const currentCenter = getTouchCenter(touches)
      if (touchStateRef.current.initialDistance > 0 && touchStateRef.current.worldAtStart) {
        const scaleFactor = currentDistance / touchStateRef.current.initialDistance
        const newScale = Math.max(0.1, Math.min(5, touchStateRef.current.initialScale * scaleFactor))
        const worldAtStart = touchStateRef.current.worldAtStart
        const newX = worldAtStart.x - (currentCenter.x / newScale)
        const newY = worldAtStart.y - (currentCenter.y / newScale)
        canvasStore.setViewport({
          scale: newScale,
          x: newX,
          y: newY
        })
      }
    }
  }, [currentStroke, screenToWorld, canvasStore, getBrushSizeInPixels, viewport.scale, brushColor, brushType, emit, myUUID, getTouchDistance, getTouchCenter])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (touchStateRef.current.isDrawing && currentStroke.length > 1) {
      const stroke = createStroke(currentStroke, brushColor, getBrushSizeInPixels(), brushType)
      console.log('CLIENT: Emitting strokeAdded', stroke)
      emit('strokeAdded', stroke)
    }
    
    setCurrentStroke([])
    canvasStore.setLastPoint(null)
    canvasStore.setDrawing(false)
    
    touchStateRef.current.isDrawing = false
    touchStateRef.current.isPanning = false
    touchStateRef.current.initialDistance = 0
    touchStateRef.current.worldAtStart = undefined
  }, [currentStroke, brushColor, getBrushSizeInPixels, brushType, emit, canvasStore])

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
        Connecting to server...
      </div>
    )
  }

  return (
    <>
      {stats && (
        <StatsDisplay>
          <div>📊 Strokes: {stats.totalStrokes}/{stats.maxStrokes}</div>
          <div>👥 Clients: {stats.connectedClients}</div>
          <div>💾 Memory: {stats.memoryUsage}</div>
        </StatsDisplay>
      )}
      
      <div 
        ref={canvasRef}
        className="canvas-container"
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseUp={handleCanvasMouseUp}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ position: 'relative' }}
      >
        {coordinatesLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(240, 240, 240, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            fontSize: '14px',
            color: '#666'
          }}>
            Loading canvas...
          </div>
        )}
        <GridOverlay>
          <CanvasGrid viewport={{
            x: viewport.x,
            y: viewport.y,
            scale: viewport.scale,
            width: windowDimensions.width,
            height: windowDimensions.height
          }} />
        </GridOverlay>
      </div>
    </>
  )
}

export default Canvas 