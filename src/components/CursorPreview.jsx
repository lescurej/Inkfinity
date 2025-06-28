import React from 'react'
import { useBrush } from '../hooks/useBrush'
import { useCanvas } from '../hooks/useCanvas'

const CursorPreview = () => {
  const { brushColor, brushSize } = useBrush()
  const { viewport, mousePosition } = useCanvas()

  const size = brushSize * viewport.scale
  const left = mousePosition.x - size / 2
  const top = mousePosition.y - size / 2

  return (
    <div
      className="cursor-preview"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${left}px`,
        top: `${top}px`,
        background: brushColor,
        display: mousePosition.x > 0 && mousePosition.y > 0 ? 'block' : 'none'
      }}
    />
  )
}

export default CursorPreview 