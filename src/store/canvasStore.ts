import { create } from 'zustand'
import type { DrawingSegment, Point } from '../types'
import { RefObject } from 'react'
import { EVENTS } from '../../shared/types'

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
  setViewport: (v: Partial<Viewport>) => void
  setDrawing: (d: boolean) => void
  setLastPoint: (p: Point | null) => void
  setMousePosition: (p: Point) => void
  setIsPanning: (p: boolean) => void
  setSpacePressed: (s: boolean) => void
  setCanvasRef: (ref: RefObject<HTMLDivElement>) => void
  setPanStart: (p: { x: number; y: number; mouseX: number; mouseY: number } | null) => void
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
  fitToContentFromHistory: (history: any[]) => void
}

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
  setViewport: (v: Partial<Viewport>) => set(state => ({ ...state, viewport: { ...state.viewport, ...v } })),
  setDrawing: (d: boolean) => set(state => ({ ...state, drawing: d })),
  setLastPoint: (p: Point | null) => set(state => ({ ...state, lastPoint: p })),
  setMousePosition: (p: Point) => set(state => ({ ...state, mousePosition: p })),
  setIsPanning: (p: boolean) => set(state => ({ ...state, isPanning: p })),
  setSpacePressed: (s: boolean) => set(state => ({ ...state, spacePressed: s })),
  setCanvasRef: (ref: RefObject<HTMLDivElement>) => set(state => ({ ...state, canvasRef: ref })),
  setPanStart: (p: { x: number; y: number; mouseX: number; mouseY: number } | null) => set(state => ({ ...state, panStart: p })),
  addSegmentToChunk: (seg: DrawingSegment) => {
    const chunkKey = `${Math.floor(seg.x2 / CHUNK_SIZE)},${Math.floor(seg.y2 / CHUNK_SIZE)}`
    const map = new Map(get().drawingChunks)
    if (!map.has(chunkKey)) map.set(chunkKey, [])
    map.get(chunkKey)!.push(seg)
    set(state => ({ ...state, drawingChunks: map }))
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
    console.log('🔍 fitToContentWithServer called')
    
    const handleDrawingHistory = (history: any[]) => {
      console.log('🔍 Received drawing history:', history.length, 'strokes')
      
      if (history.length === 0) {
        console.log('🔍 No strokes found, resetting view')
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
      
      console.log('🔍 Boundary box:', { minX, minY, maxX, maxY })
      
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
      
      console.log('🔍 New viewport:', { x: viewportX, y: viewportY, scale })
      
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
    console.log('🔍 Requesting drawing history from server')
    emit(EVENTS.REQUEST_DRAWING_HISTORY)
  },
  fitToContentFromHistory: (history: any[]) => {
    console.log('🔍 fitToContentFromHistory called with', history.length, 'strokes')
    
    if (history.length === 0) {
      console.log('🔍 No strokes found, resetting view')
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
    
    console.log('🔍 Boundary box:', { minX, minY, maxX, maxY })
    
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
    
    console.log('🔍 New viewport:', { x: viewportX, y: viewportY, scale })
    
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
    set(state => ({ ...state, mousePosition: { x: e.clientX, y: e.clientY } }))
    const isPanning = get().isPanning
    const panStart = get().panStart
    const viewport = get().viewport
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.mouseX
      const dy = e.clientY - panStart.mouseY
      set(state => ({
        ...state,
        viewport: {
          ...viewport,
          x: panStart.x - dx / viewport.scale,
          y: panStart.y - dy / viewport.scale
        }
      }))
      return
    }
    if (get().drawing) {
      const ref = get().canvasRef
      if (ref && ref.current) {
        const rect = ref.current.getBoundingClientRect()
        const x = (e.clientX - rect.left) / viewport.scale + viewport.x
        const y = (e.clientY - rect.top) / viewport.scale + viewport.y
        set(state => ({ ...state, lastPoint: { x, y } }))
      }
    }
  },
  handleMouseLeave: () => {
    set(state => ({ ...state, drawing: false, isPanning: false, lastPoint: null, panStart: null }))
  }
})) 