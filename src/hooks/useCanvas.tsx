import create from 'zustand'
import { useRef, useCallback, useEffect, useMemo, createContext, useContext, ReactNode } from 'react'
import type { DrawingSegment, Point } from '../types'

const CHUNK_SIZE = 1000

interface Viewport {
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
  setViewport: (v: Partial<Viewport>) => void
  setDrawing: (d: boolean) => void
  setLastPoint: (p: Point | null) => void
  setMousePosition: (p: Point) => void
  setIsPanning: (p: boolean) => void
  setSpacePressed: (s: boolean) => void
  addSegmentToChunk: (seg: DrawingSegment) => void
  clearChunks: () => void
  getAllSegments: () => DrawingSegment[]
  loadHistory: (history: DrawingSegment[]) => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  viewport: { x: 0, y: 0, scale: 1 },
  drawing: false,
  lastPoint: null,
  mousePosition: { x: 0, y: 0 },
  isPanning: false,
  spacePressed: false,
  drawingChunks: new Map(),
  setViewport: (v) => set(state => ({ viewport: { ...state.viewport, ...v } })),
  setDrawing: (d) => set({ drawing: d }),
  setLastPoint: (p) => set({ lastPoint: p }),
  setMousePosition: (p) => set({ mousePosition: p }),
  setIsPanning: (p) => set({ isPanning: p }),
  setSpacePressed: (s) => set({ spacePressed: s }),
  addSegmentToChunk: (seg) => {
    const chunkKey = `${Math.floor(seg.x2 / CHUNK_SIZE)},${Math.floor(seg.y2 / CHUNK_SIZE)}`
    const map = new Map(get().drawingChunks)
    if (!map.has(chunkKey)) map.set(chunkKey, [])
    map.get(chunkKey)!.push(seg)
    set({ drawingChunks: map })
  },
  clearChunks: () => set({ drawingChunks: new Map() }),
  getAllSegments: () => {
    const segs: DrawingSegment[] = []
    get().drawingChunks.forEach(chunk => segs.push(...chunk))
    return segs
  },
  loadHistory: (history) => {
    const map = new Map()
    history.forEach(seg => {
      const chunkKey = `${Math.floor(seg.x2 / CHUNK_SIZE)},${Math.floor(seg.y2 / CHUNK_SIZE)}`
      if (!map.has(chunkKey)) map.set(chunkKey, [])
      map.get(chunkKey).push(seg)
    })
    set({ drawingChunks: map })
  }
}))

// Remove all React state from this file and use useCanvasStore in components instead.

interface CanvasContextType {
  viewport: Viewport
  drawing: boolean
  lastPoint: Point | null
  mousePosition: Point
  isPanning: boolean
  spacePressed: boolean
  canvasRef: React.RefObject<HTMLDivElement>
  drawingChunks: Map<string, DrawingSegment[]>
  addSegmentToChunk: (seg: DrawingSegment) => void
  clearChunks: () => void
  getAllSegments: () => DrawingSegment[]
  loadHistory: (history: DrawingSegment[]) => void
  screenToWorld: (screenX: number, screenY: number) => Point
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  handleWheel: (e: React.WheelEvent<HTMLDivElement>) => void
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  handleMouseUp: () => void
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  handleMouseLeave: () => void
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>
  setLastPoint: (point: Point | null) => void
}

const CanvasContext = createContext<CanvasContextType | null>(null)

export const useCanvas = () => {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider')
  }
  return context
}

interface CanvasProviderProps {
  children: ReactNode
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 })
  const [drawing, setDrawing] = useState<boolean>(false)
  const [lastPoint, setLastPoint] = useState<Point | null>(null)
  const [mousePosition, setMousePosition] = useState<Point>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const panStart = useRef<{ x: number; y: number; mouseX: number; mouseY: number } | null>(null)
  const drawingChunksRef = useRef<Map<string, DrawingSegment[]>>(new Map())
  const canvasRef = useRef<HTMLDivElement | null>(null)

  // Gestion des touches (barre espace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Fonction pour obtenir la clé d'un chunk - stable
  const getChunkKey = useCallback((x: number, y: number): string => {
    const chunkX = Math.floor(x / CHUNK_SIZE)
    const chunkY = Math.floor(y / CHUNK_SIZE)
    return `${chunkX},${chunkY}`
  }, [])

  // Fonction pour ajouter un segment à un chunk - stable
  const addSegmentToChunk = useCallback((seg: DrawingSegment) => {
    const chunkKey = getChunkKey(seg.x2, seg.y2)
    if (!drawingChunksRef.current.has(chunkKey)) {
      drawingChunksRef.current.set(chunkKey, [])
    }
    drawingChunksRef.current.get(chunkKey)!.push(seg)
  }, [getChunkKey])

  // Fonction pour effacer tous les chunks - stable
  const clearChunks = useCallback(() => {
    drawingChunksRef.current.clear()
  }, [])

  // Fonction pour obtenir tous les segments - stable
  const getAllSegments = useCallback((): DrawingSegment[] => {
    const segments: DrawingSegment[] = []
    drawingChunksRef.current.forEach(chunk => {
      segments.push(...chunk)
    })
    return segments
  }, [])

  // Fonction pour charger l'historique - stable
  const loadHistory = useCallback((history: DrawingSegment[]) => {
    clearChunks()
    history.forEach(seg => addSegmentToChunk(seg))
  }, [clearChunks, addSegmentToChunk])

  // Conversion souris -> monde virtuel - optimisé avec useMemo
  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    if (!canvasRef.current) {
      return { x: 0, y: 0 }
    }
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (screenX - rect.left) / viewport.scale + viewport.x
    const y = (screenY - rect.top) / viewport.scale + viewport.y
    return { x, y }
  }, [viewport.x, viewport.y, viewport.scale])

  // Gestion du zoom/pan avec la molette ou le trackpad
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    // Si ctrl/cmd/shift → zoom (pinch ou modif)
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      const mouseX = e.clientX - (canvasRef.current?.getBoundingClientRect().left || 0)
      const mouseY = e.clientY - (canvasRef.current?.getBoundingClientRect().top || 0)
      const wx = mouseX / viewport.scale + viewport.x
      const wy = mouseY / viewport.scale + viewport.y
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.max(0.1, Math.min(5, viewport.scale * zoomFactor))
      setViewport(prev => ({
        scale: newScale,
        x: wx - mouseX / newScale,
        y: wy - mouseY / newScale
      }))
    } else {
      // Sinon, tout scroll = pan (trackpad ou souris)
      e.preventDefault()
      e.stopPropagation()
      setViewport(prev => ({
        ...prev,
        x: prev.x + e.deltaX / prev.scale,
        y: prev.y + e.deltaY / prev.scale
      }))
    }
  }, [viewport.x, viewport.y, viewport.scale])

  // Pan avec molette cliquée ou barre espace
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Pan si bouton du milieu OU barre espace
    if (e.button === 1 || spacePressed) {
      setIsPanning(true)
      panStart.current = {
        x: viewport.x,
        y: viewport.y,
        mouseX: e.clientX,
        mouseY: e.clientY
      }
      e.preventDefault()
      return
    }
    // Sinon, début du dessin
    if (e.button === 0 && !spacePressed) {
      const worldPos = screenToWorld(e.clientX, e.clientY)
      setDrawing(true)
      setLastPoint(worldPos)
    }
  }, [viewport.x, viewport.y, spacePressed, screenToWorld])

  const handleMouseUp = useCallback(() => {
    setDrawing(false)
    setIsPanning(false)
    setLastPoint(null)
    panStart.current = null
  }, [drawing, isPanning])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
    // Pan
    if (isPanning && panStart.current) {
      const dx = e.clientX - panStart.current.mouseX
      const dy = e.clientY - panStart.current.mouseY
      setViewport(prev => ({
        ...prev,
        x: panStart.current!.x - dx / prev.scale,
        y: panStart.current!.y - dy / prev.scale
      }))
      return
    }
    // Dessin
    if (drawing) {
      const worldPos = screenToWorld(e.clientX, e.clientY)
      setLastPoint(worldPos)
    }
  }, [drawing, isPanning, screenToWorld])

  const handleMouseLeave = useCallback(() => {
    setDrawing(false)
    setIsPanning(false)
    setLastPoint(null)
    panStart.current = null
  }, [])

  // Événement global pour capturer tous les mouvements de souris - optimisé
  useEffect(() => {
    let rafId: number | null = null
    let lastX = 0
    let lastY = 0
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (e.clientX === lastX && e.clientY === lastY) return
      lastX = e.clientX
      lastY = e.clientY
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY })
        rafId = null
      })
    }
    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [])

  // Référence stable pour drawingChunks
  const drawingChunks = useMemo(() => drawingChunksRef.current, [])

  const contextValue: CanvasContextType = {
    viewport,
    drawing,
    lastPoint,
    mousePosition,
    isPanning,
    spacePressed,
    canvasRef,
    drawingChunks,
    addSegmentToChunk,
    clearChunks,
    getAllSegments,
    loadHistory,
    screenToWorld,
    zoomIn: () => setViewport(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 5) })),
    zoomOut: () => setViewport(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.1) })),
    resetView: () => {
      setViewport({ x: 0, y: 0, scale: 1 })
    },
    handleWheel,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleMouseLeave,
    setViewport,
    setLastPoint
  }

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  )
} 