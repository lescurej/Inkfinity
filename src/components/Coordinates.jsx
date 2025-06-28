import React from 'react'
import { useCanvas } from '../hooks/useCanvas'

const Coordinates = () => {
  const { viewport, mousePosition, screenToWorld } = useCanvas()

  const worldPos = screenToWorld(mousePosition.x, mousePosition.y)

  return (
    <div className="coordinates">
      X: {Math.round(worldPos.x)}, Y: {Math.round(worldPos.y)}
    </div>
  )
}

export default Coordinates 