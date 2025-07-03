import { create } from 'zustand'
import type { DrawingSegment, Point } from '../types'
import { RefObject } from 'react'
import { EVENTS } from "../../types"

const CHUNK_SIZE = 1000

export interface Viewport {
  x: number
  y: number
  scale: number
}

interface CanvasState {
  viewport: Viewport
  drawing: boolean
  lastPoint: Point | null
  mousePosition: Point
  isPanning: boolean
  spacePressed: boolean
  drawingChunks: Map<string, DrawingSegment[]>
  canvasRef: RefObject<HTMLDivElement> | null
  panStart: { x: number; y: number; mouseX: number; mouseY: number } | null
  touchStart: { x: number; y: number; touchX: number; touchY: number } | null
  isTouchPanning: boolean
  pinchStart: { distance: number; centerX: number; centerY: number; scale: number } | null
  isPinching: boolean
  setViewport: (v: Partial<Viewport>) => void
  setDrawing: (d: boolean) => void
  setLastPoint: (p: Point | null) => void
  setMousePosition: (p: Point) => void
  setIsPanning: (p: boolean) => void
  setSpacePressed: (s: boolean) => void
  setCanvasRef: (ref: RefObject<HTMLDivElement>) => void
  setPanStart: (p: { x: number; y: number; mouseX: number; mouseY: number } | null) => void
  setTouchStart: (p: { x: number; y: number; touchX: number; touchY: number } | null) => void
  setIsTouchPanning: (p: boolean) => void
  addSegmentToChunk: (seg: DrawingSegment) => void
  clearChunks: () => void
  getAllSegments: () => DrawingSegment[]
  loadHistory: (history: DrawingSegment[]) => void
  screenToWorld: (screenX: number, screenY: number) => Point
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  fitToContent: () => void
  fitToContentWithServer: (emit: any, on: any, off: any) => void
  navigateToCoordinates: (x: number, y: number, scale?: number) => void
  handleWheel: (e: React.WheelEvent<HTMLDivElement>) => void
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  handleMouseUp: () => void
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  handleMouseLeave: () => void
  handleTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void
  handleTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void
  handleTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => void
  fitToContentFromHistory: (history: any[]) => void
  setDrawingState: (updates: Partial<{
    drawing: boolean
    lastPoint: Point | null
    isPanning: boolean
  }>) => void
  addSegmentsToChunks: (segments: DrawingSegment[]) => void
  setPinchStart: (p: { distance: number; centerX: number; centerY: number; scale: number } | null) => void
  setIsPinching: (p: boolean) => void
  touchStartTime: number | null
  touchStartPosition: { x: number; y: number } | null
  touchPanThreshold: number
  touchTimeThreshold: number
}

// Helper function to calculate distance between two points
const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

// Helper function to calculate center point between two touches
const getCenterPoint = (touch1: React.Touch, touch2: React.Touch) => {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  };
};

export const useCanvasStore = create<CanvasState>((set: (fn: (state: CanvasState) => Partial<CanvasState> | CanvasState) => void, get: () => CanvasState) => ({
  viewport: { x: 0, y: 0, scale: 1 },
  drawing: false,
  lastPoint: null,
  mousePosition: { x: 0, y: 0 },
  isPanning: false,
  spacePressed: false,
  drawingChunks: new Map(),
  canvasRef: null,
  panStart: null,
  touchStart: null,
  isTouchPanning: false,
  pinchStart: null,
  isPinching: false,
  touchStartTime: null,
  touchStartPosition: null,
  touchPanThreshold: 10,
  touchTimeThreshold: 200,
  setViewport: (v: Partial<Viewport>) => set(state => ({ 
    ...state, 
    viewport: { ...state.viewport, ...v } 
  })),
  setDrawing: (d: boolean) => set(state => ({ ...state, drawing: d })),
  setLastPoint: (p: Point | null) => set(state => ({ ...state, lastPoint: p })),
  setMousePosition: (p: Point) => set(state => ({ ...state, mousePosition: p })),
  setIsPanning: (p: boolean) => set(state => ({ ...state, isPanning: p })),
  setSpacePressed: (s: boolean) => set(state => ({ ...state, spacePressed: s })),
  setCanvasRef: (ref: RefObject<HTMLDivElement>) => set(state => ({ ...state, canvasRef: ref })),
  setPanStart: (p: { x: number; y: number; mouseX: number; mouseY: number } | null) => set(state => ({ ...state, panStart: p })),
  setTouchStart: (p: { x: number; y: number; touchX: number; touchY: number } | null) => set(state => ({ ...state, touchStart: p })),
  setIsTouchPanning: (p: boolean) => set(state => ({ ...state, isTouchPanning: p })),
  addSegmentToChunk: (seg: DrawingSegment) => {
    const chunkKey = `${Math.floor(seg.x2 / CHUNK_SIZE)},${Math.floor(seg.y2 / CHUNK_SIZE)}`
    set(state => {
      const map = new Map(state.drawingChunks)
      if (!map.has(chunkKey)) map.set(chunkKey, [])
      map.get(chunkKey)!.push(seg)
      return { ...state, drawingChunks: map }
    })
  },
  addSegmentsToChunks: (segments: DrawingSegment[]) => {
    set(state => {
      const map = new Map(state.drawingChunks)
      segments.forEach(seg => {
        const chunkKey = `${Math.floor(seg.x2 / CHUNK_SIZE)},${Math.floor(seg.y2 / CHUNK_SIZE)}`
        if (!map.has(chunkKey)) map.set(chunkKey, [])
        map.get(chunkKey)!.push(seg)
      })
      return { ...state, drawingChunks: map }
    })
  },
  clearChunks: () => set(state => ({ ...state, drawingChunks: new Map() })),
  getAllSegments: () => {
    const segs: DrawingSegment[] = []
    get().drawingChunks.forEach(chunk => segs.push(...chunk))
    return segs
  },
  loadHistory: (history: DrawingSegment[]) => {
    const map = new Map<string, DrawingSegment[]>()
    history.forEach(seg => {
      const chunkKey = `${Math.floor(seg.x2 / CHUNK_SIZE)},${Math.floor(seg.y2 / CHUNK_SIZE)}`
      if (!map.has(chunkKey)) map.set(chunkKey, [])
      map.get(chunkKey)!.push(seg)
    })
    set(state => ({ ...state, drawingChunks: map }))
  },
  screenToWorld: (screenX: number, screenY: number) => {
    const ref = get().canvasRef
    const viewport = get().viewport
    if (!ref || !ref.current) return { x: 0, y: 0 }
    const rect = ref.current.getBoundingClientRect()
    const x = (screenX - rect.left) / viewport.scale + viewport.x
    const y = (screenY - rect.top) / viewport.scale + viewport.y
    return { x, y }
  },
  zoomIn: () => {
    const viewport = get().viewport
    const centerX = viewport.x + window.innerWidth / 2 / viewport.scale
    const centerY = viewport.y + window.innerHeight / 2 / viewport.scale
    const newScale = Math.min(viewport.scale * 1.2, 5)
    set(state => ({
      ...state,
      viewport: {
        scale: newScale,
        x: centerX - window.innerWidth / 2 / newScale,
        y: centerY - window.innerHeight / 2 / newScale
      }
    }))
  },
  zoomOut: () => {
    const viewport = get().viewport
    const centerX = viewport.x + window.innerWidth / 2 / viewport.scale
    const centerY = viewport.y + window.innerHeight / 2 / viewport.scale
    const newScale = Math.max(viewport.scale / 1.2, 0.1)
    set(state => ({
      ...state,
      viewport: {
        scale: newScale,
        x: centerX - window.innerWidth / 2 / newScale,
        y: centerY - window.innerHeight / 2 / newScale
      }
    }))
  },
  resetView: () => {
    set(state => ({ ...state, viewport: { x: 0, y: 0, scale: 1 } }))
  },
  fitToContent: () => {
    const segments = get().getAllSegments()
    if (segments.length === 0) {
      get().resetView()
      return
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    segments.forEach(seg => {
      minX = Math.min(minX, seg.x1, seg.x2)
      minY = Math.min(minY, seg.y1, seg.y2)
      maxX = Math.max(maxX, seg.x1, seg.x2)
      maxY = Math.max(maxY, seg.y1, seg.y2)
    })
    let contentWidth = maxX - minX
    let contentHeight = maxY - minY
    const minContentSize = 200
    if (contentWidth < minContentSize) {
      const center = minX + contentWidth / 2
      minX = center - minContentSize / 2
      maxX = center + minContentSize / 2
      contentWidth = minContentSize
    }
    if (contentHeight < minContentSize) {
      const center = minY + contentHeight / 2
      minY = center - minContentSize / 2
      maxY = center + minContentSize / 2
      contentHeight = minContentSize
    }
    const padding = 100
    const scaleX = (window.innerWidth - padding * 2) / contentWidth
    const scaleY = (window.innerHeight - padding * 2) / contentHeight
    const scale = Math.min(scaleX, scaleY, 5)
    const centerX = minX + contentWidth / 2
    const centerY = minY + contentHeight / 2
    const viewportX = centerX - window.innerWidth / 2 / scale
    const viewportY = centerY - window.innerHeight / 2 / scale
    set(state => ({
      ...state,
      viewport: {
        x: viewportX,
        y: viewportY,
        scale
      }
    }))
  },
  fitToContentWithServer: (emit: any, on: any, off: any) => {
    const handleDrawingHistory = (history: any[]) => {
      if (history.length === 0) {
        get().resetView()
        return
      }
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      
      history.forEach(stroke => {
        if (stroke.points && Array.isArray(stroke.points)) {
          stroke.points.forEach((point: { x: number; y: number }) => {
            minX = Math.min(minX, point.x)
            minY = Math.min(minY, point.y)
            maxX = Math.max(maxX, point.x)
            maxY = Math.max(maxY, point.y)
          })
        }
      })
      
      let contentWidth = maxX - minX
      let contentHeight = maxY - minY
      const minContentSize = 200
      
      if (contentWidth < minContentSize) {
        const center = minX + contentWidth / 2
        minX = center - minContentSize / 2
        maxX = center + minContentSize / 2
        contentWidth = minContentSize
      }
      if (contentHeight < minContentSize) {
        const center = minY + contentHeight / 2
        minY = center - minContentSize / 2
        maxY = center + minContentSize / 2
        contentHeight = minContentSize
      }
      
      const padding = 100
      const scaleX = (window.innerWidth - padding * 2) / contentWidth
      const scaleY = (window.innerHeight - padding * 2) / contentHeight
      const scale = Math.min(scaleX, scaleY, 5)
      const centerX = minX + contentWidth / 2
      const centerY = minY + contentHeight / 2
      const viewportX = centerX - window.innerWidth / 2 / scale
      const viewportY = centerY - window.innerHeight / 2 / scale
      
      set(state => ({
        ...state,
        viewport: {
          x: viewportX,
          y: viewportY,
          scale
        }
      }))
      
      off(EVENTS.DRAWING_HISTORY, handleDrawingHistory)
    }
    
    on(EVENTS.DRAWING_HISTORY, handleDrawingHistory)
    emit(EVENTS.REQUEST_DRAWING_HISTORY)
  },
  fitToContentFromHistory: (history: any[]) => {
    if (history.length === 0) {
      get().resetView()
      return
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    
    history.forEach(stroke => {
      if (stroke.points && Array.isArray(stroke.points)) {
        stroke.points.forEach((point: { x: number; y: number }) => {
          minX = Math.min(minX, point.x)
          minY = Math.min(minY, point.y)
          maxX = Math.max(maxX, point.x)
          maxY = Math.max(maxY, point.y)
        })
      }
    })
    
    let contentWidth = maxX - minX
    let contentHeight = maxY - minY
    const minContentSize = 200
    
    if (contentWidth < minContentSize) {
      const center = minX + contentWidth / 2
      minX = center - minContentSize / 2
      maxX = center + minContentSize / 2
      contentWidth = minContentSize
    }
    if (contentHeight < minContentSize) {
      const center = minY + contentHeight / 2
      minY = center - minContentSize / 2
      maxY = center + minContentSize / 2
      contentHeight = minContentSize
    }
    
    const padding = 100
    const scaleX = (window.innerWidth - padding * 2) / contentWidth
    const scaleY = (window.innerHeight - padding * 2) / contentHeight
    const scale = Math.min(scaleX, scaleY, 5)
    const centerX = minX + contentWidth / 2
    const centerY = minY + contentHeight / 2
    const viewportX = centerX - window.innerWidth / 2 / scale
    const viewportY = centerY - window.innerHeight / 2 / scale
    
    set(state => ({
      ...state,
      viewport: {
        x: viewportX,
        y: viewportY,
        scale
      }
    }))
  },
  navigateToCoordinates: (x: number, y: number, scale?: number) => {
    const newScale = scale || get().viewport.scale
    set(state => ({
      ...state,
      viewport: {
        x: x - window.innerWidth / 2 / newScale,
        y: y - window.innerHeight / 2 / newScale,
        scale: newScale
      }
    }))
  },
  handleWheel: (e: React.WheelEvent<HTMLDivElement>) => {
    const viewport = get().viewport
    const ref = get().canvasRef
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      const mouseX = e.clientX - (ref?.current?.getBoundingClientRect().left || 0)
      const mouseY = e.clientY - (ref?.current?.getBoundingClientRect().top || 0)
      const wx = mouseX / viewport.scale + viewport.x
      const wy = mouseY / viewport.scale + viewport.y
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.1, Math.min(5, viewport.scale * zoomFactor))
      set(state => ({
        ...state,
        viewport: {
          scale: newScale,
          x: wx - mouseX / newScale,
          y: wy - mouseY / newScale
        }
      }))
    } else {
      e.preventDefault()
      e.stopPropagation()
      set(state => ({
        ...state,
        viewport: {
          ...viewport,
          x: viewport.x + e.deltaX / viewport.scale,
          y: viewport.y + e.deltaY / viewport.scale
        }
      }))
    }
  },
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
    const viewport = get().viewport
    const spacePressed = get().spacePressed
    if (e.button === 1 || spacePressed) {
      set(state => ({
        ...state,
        isPanning: true,
        panStart: {
          x: viewport.x,
          y: viewport.y,
          mouseX: e.clientX,
          mouseY: e.clientY
        }
      }))
      e.preventDefault()
      return
    }
    if (e.button === 0 && !spacePressed) {
      const ref = get().canvasRef
      if (ref && ref.current) {
        const rect = ref.current.getBoundingClientRect()
        const x = (e.clientX - rect.left) / viewport.scale + viewport.x
        const y = (e.clientY - rect.top) / viewport.scale + viewport.y
        set(state => ({ ...state, drawing: true, lastPoint: { x, y } }))
      }
    }
  },
  handleMouseUp: () => {
    set(state => ({ ...state, drawing: false, isPanning: false, lastPoint: null, panStart: null }))
  },
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
    const updates: Partial<CanvasState> = {}
    
    updates.mousePosition = { x: e.clientX, y: e.clientY }
    
    if (get().isPanning && get().panStart) {
      const dx = e.clientX - get().panStart!.mouseX
      const dy = e.clientY - get().panStart!.mouseY
      updates.viewport = {
        ...get().viewport,
        x: get().panStart!.x - dx / get().viewport.scale,
        y: get().panStart!.y - dy / get().viewport.scale,
      }
    }
    
    if (get().drawing) {
      const worldPos = get().screenToWorld(e.clientX, e.clientY)
      updates.lastPoint = worldPos
    }
    
    set(state => ({ ...state, ...updates }))
  },
  handleMouseLeave: () => {
    set(state => ({ ...state, drawing: false, isPanning: false, lastPoint: null, panStart: null }))
  },
  handleTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    const viewport = get().viewport
    const ref = get().canvasRef
    
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const rect = ref?.current?.getBoundingClientRect()
      if (rect) {
        set(state => ({ 
          ...state, 
          touchStartTime: Date.now(),
          touchStartPosition: { x: touch.clientX, y: touch.clientY },
          touchStart: {
            x: viewport.x,
            y: viewport.y,
            touchX: touch.clientX,
            touchY: touch.clientY
          }
        }))
      }
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = getDistance(touch1.clientX, touch1.clientY, touch2.clientX, touch2.clientY)
      const center = getCenterPoint(touch1, touch2)
      
      set(state => ({ 
        ...state, 
        isPinching: true,
        pinchStart: {
          distance,
          centerX: center.x,
          centerY: center.y,
          scale: viewport.scale
        }
      }))
    }
  },
  handleTouchMove: (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    const updates: Partial<CanvasState> = {}
    
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const state = get()
      
      if (state.touchStartPosition && state.touchStartTime) {
        const distance = getDistance(
          state.touchStartPosition.x,
          state.touchStartPosition.y,
          touch.clientX,
          touch.clientY
        )
        const timeElapsed = Date.now() - state.touchStartTime
        
        if (distance > state.touchPanThreshold || timeElapsed > state.touchTimeThreshold) {
          if (!state.isTouchPanning && !state.drawing) {
            set(state => ({ ...state, isTouchPanning: true }))
          }
          
          if (state.isTouchPanning && state.touchStart) {
            const dx = touch.clientX - state.touchStart.touchX
            const dy = touch.clientY - state.touchStart.touchY
            updates.viewport = {
              ...state.viewport,
              x: state.touchStart.x - dx / state.viewport.scale,
              y: state.touchStart.y - dy / state.viewport.scale,
            }
          }
        } else if (!state.drawing) {
          const rect = state.canvasRef?.current?.getBoundingClientRect()
          if (rect) {
            const worldX = (touch.clientX - rect.left) / state.viewport.scale + state.viewport.x
            const worldY = (touch.clientY - rect.top) / state.viewport.scale + state.viewport.y
            updates.drawing = true
            updates.lastPoint = { x: worldX, y: worldY }
          }
        }
      }
      
      if (state.drawing) {
        const worldPos = state.screenToWorld(touch.clientX, touch.clientY)
        updates.lastPoint = worldPos
      }
    } else if (e.touches.length === 2 && get().isPinching && get().pinchStart) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const currentDistance = getDistance(touch1.clientX, touch1.clientY, touch2.clientX, touch2.clientY)
      const currentCenter = getCenterPoint(touch1, touch2)
      
      const scaleRatio = currentDistance / get().pinchStart!.distance
      const newScale = Math.max(0.1, Math.min(5, get().pinchStart!.scale * scaleRatio))
      
      const ref = get().canvasRef
      const rect = ref?.current?.getBoundingClientRect()
      if (rect) {
        const centerX = (currentCenter.x - rect.left) / get().viewport.scale + get().viewport.x
        const centerY = (currentCenter.y - rect.top) / get().viewport.scale + get().viewport.y
        
        updates.viewport = {
          scale: newScale,
          x: centerX - currentCenter.x / newScale,
          y: centerY - currentCenter.y / newScale
        }
      }
    }
    
    set(state => ({ ...state, ...updates }))
  },
  handleTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    set(state => ({ 
      ...state, 
      drawing: false, 
      isTouchPanning: false, 
      isPinching: false,
      lastPoint: null, 
      touchStart: null,
      pinchStart: null,
      touchStartTime: null,
      touchStartPosition: null
    }))
  },
  setDrawingState: (updates: Partial<{
    drawing: boolean
    lastPoint: Point | null
    isPanning: boolean
  }>) => set(state => ({ ...state, ...updates })),
  setPinchStart: (p: { distance: number; centerX: number; centerY: number; scale: number } | null) => set(state => ({ ...state, pinchStart: p })),
  setIsPinching: (p: boolean) => set(state => ({ ...state, isPinching: p })),
})) 