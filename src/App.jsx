import React, { useEffect } from 'react'
import Canvas from './components/Canvas'
import Controls from './components/Controls'
import CursorPreview from './components/CursorPreview'
import Coordinates from './components/Coordinates'
import RemoteCursors from './components/RemoteCursors'
import Status from './components/Status'
import { useSocket } from './hooks/useSocket'
import { useCanvas } from './hooks/useCanvas'

const App = () => {
  const { on, off } = useSocket()
  const { clearChunks, loadHistory } = useCanvas()

  useEffect(() => {
    const handleClearCanvas = () => {
      clearChunks()
    }

    const handleDrawingHistory = (history) => {
      loadHistory(history)
    }

    on('clearCanvas', handleClearCanvas)
    on('drawingHistory', handleDrawingHistory)

    return () => {
      off('clearCanvas', handleClearCanvas)
      off('drawingHistory', handleDrawingHistory)
    }
  }, [on, off, clearChunks, loadHistory])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <Canvas />
      <Controls />
      <CursorPreview />
      <Coordinates />
      <RemoteCursors />
      <Status />
    </div>
  )
}

export default App 