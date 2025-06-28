import { useState, useCallback } from 'react'

export const useBrush = () => {
  const [brushColor, setBrushColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(2)
  const [brushType, setBrushType] = useState('round')

  const updateBrushColor = useCallback((color) => {
    setBrushColor(color)
  }, [])

  const updateBrushSize = useCallback((size) => {
    setBrushSize(parseInt(size))
  }, [])

  const updateBrushType = useCallback((type) => {
    setBrushType(type)
  }, [])

  return {
    brushColor,
    brushSize,
    brushType,
    updateBrushColor,
    updateBrushSize,
    updateBrushType
  }
} 