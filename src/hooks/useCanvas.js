import { useState, useRef, useCallback, useEffect } from 'react'

const CHUNK_SIZE = 1000

export const useCanvas = () => {
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 })
  const [drawing, setDrawing] = useState(false)
  const [lastPoint, setLastPoint] = useState(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const drawingChunksRef = useRef(new Map())
  const containerRef = useRef(null)

  // Fonction pour obtenir la clé d'un chunk
  const getChunkKey = useCallback((x, y) => {
    const chunkX = Math.floor(x / CHUNK_SIZE)
    const chunkY = Math.floor(y / CHUNK_SIZE)
    return `${chunkX},${chunkY}`
  }, [])

  // Fonction pour ajouter un segment à un chunk
  const addSegmentToChunk = useCallback((seg) => {
    const chunkKey = getChunkKey(seg.x2, seg.y2)
    if (!drawingChunksRef.current.has(chunkKey)) {
      drawingChunksRef.current.set(chunkKey, [])
    }
    drawingChunksRef.current.get(chunkKey).push(seg)
  }, [getChunkKey])

  // Fonction pour effacer tous les chunks
  const clearChunks = useCallback(() => {
    drawingChunksRef.current.clear()
  }, [])

  // Fonction pour obtenir tous les segments
  const getAllSegments = useCallback(() => {
    const segments = []
    drawingChunksRef.current.forEach(chunk => {
      segments.push(...chunk)
    })
    return segments
  }, [])

  // Fonction pour charger l'historique
  const loadHistory = useCallback((history) => {
    clearChunks()
    history.forEach(seg => addSegmentToChunk(seg))
  }, [clearChunks, addSegmentToChunk])

  // Conversion souris -> monde virtuel
  const screenToWorld = useCallback((screenX, screenY) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = (screenX - rect.left) / viewport.scale + viewport.x
    const y = (screenY - rect.top) / viewport.scale + viewport.y
    return { x, y }
  }, [viewport])

  // Gestion du zoom
  const zoomIn = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 5)
    }))
  }, [])

  const zoomOut = useCallback(() => {
    setViewport(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.1)
    }))
  }, [])

  const resetView = useCallback(() => {
    setViewport({ x: 0, y: 0, scale: 1 })
  }, [])

  // Gestion du pan/zoom avec la molette
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    if (e.ctrlKey || e.metaKey || e.shiftKey || Math.abs(e.deltaX) > 0) {
      // Pan (trackpad ou shift/ctrl)
      const panSpeed = 1.5 / viewport.scale
      setViewport(prev => ({
        ...prev,
        x: prev.x + e.deltaX * panSpeed,
        y: prev.y + e.deltaY * panSpeed
      }))
    } else {
      // Zoom centré sur la souris
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const wx = mouseX / viewport.scale + viewport.x
      const wy = mouseY / viewport.scale + viewport.y
      const newScale = Math.max(0.1, Math.min(5, viewport.scale * zoomFactor))
      
      setViewport(prev => ({
        scale: newScale,
        x: wx - mouseX / newScale,
        y: wy - mouseY / newScale
      }))
    }
  }, [viewport])

  // Gestion du dessin
  const handleMouseDown = useCallback((e) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      setDrawing(true)
      setLastPoint(null)
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    setDrawing(false)
    setLastPoint(null)
  }, [])

  const handleMouseMove = useCallback((e) => {
    const worldPos = screenToWorld(e.clientX, e.clientY)
    setMousePosition({ x: e.clientX, y: e.clientY })
    
    if (drawing) {
      setLastPoint(worldPos)
    }
  }, [drawing, screenToWorld])

  const handleMouseLeave = useCallback(() => {
    setDrawing(false)
    setLastPoint(null)
  }, [])

  return {
    viewport,
    drawing,
    lastPoint,
    mousePosition,
    containerRef,
    drawingChunks: drawingChunksRef.current,
    addSegmentToChunk,
    clearChunks,
    getAllSegments,
    loadHistory,
    screenToWorld,
    zoomIn,
    zoomOut,
    resetView,
    handleWheel,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleMouseLeave
  }
} 