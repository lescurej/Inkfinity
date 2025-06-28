import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Canvas from './components/Canvas'
import Controls from './components/Controls'
import CursorPreview from './components/CursorPreview'
import RemoteCursors from './components/RemoteCursors'
import CanvasGrid from './components/CanvasGrid'
import GPSDisplay from './components/GPSDisplay'
import { BrushProvider } from './hooks/useBrush'
import { UUIDProvider } from './hooks/useUUID'
import { useCanvasStore } from './store/canvasStore'
import styled from '@emotion/styled'
import './index.css'

const AppContainer = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #f0f0f0;
`

const ControlsFixed = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  pointer-events: none;
  
  > * {
    pointer-events: auto;
  }
`

const MainApp: React.FC = () => {
  const [hasAppliedUrlParams, setHasAppliedUrlParams] = useState(false)
  const [canvasStateLoaded, setCanvasStateLoaded] = useState(false)
  const { viewport } = useCanvasStore()

  useEffect(() => {
    const handleCanvasStateLoaded = () => {
      setCanvasStateLoaded(true)
    }

    window.addEventListener('canvas-state-loaded', handleCanvasStateLoaded)
    return () => {
      window.removeEventListener('canvas-state-loaded', handleCanvasStateLoaded)
    }
  }, [])

  useEffect(() => {
    if (canvasStateLoaded && !hasAppliedUrlParams) {
      const urlParams = new URLSearchParams(window.location.search)
      const x = urlParams.get('x')
      const y = urlParams.get('y')
      const scale = urlParams.get('scale')

      if (x && y && scale) {
        setHasAppliedUrlParams(true)
      }
    }
  }, [canvasStateLoaded, hasAppliedUrlParams])

  useEffect(() => {
    const preventHorizontalScroll = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('wheel', preventHorizontalScroll, { passive: false })
    
    const preventZoom = (e: any) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.type === 'wheel' || e.type === 'gesturestart' || e.type === 'gesturechange')
      ) {
        e.preventDefault()
      }
    }
    window.addEventListener('wheel', preventZoom, { passive: false })
    window.addEventListener('gesturestart', preventZoom, { passive: false })
    window.addEventListener('gesturechange', preventZoom, { passive: false })
    return () => {
      window.removeEventListener('wheel', preventHorizontalScroll)
      window.removeEventListener('wheel', preventZoom)
      window.removeEventListener('gesturestart', preventZoom)
      window.removeEventListener('gesturechange', preventZoom)
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    
    document.documentElement.style.overscrollBehaviorX = 'none'
    document.documentElement.style.overscrollBehaviorY = 'none'
    document.body.style.overscrollBehaviorX = 'none'
    document.body.style.overscrollBehaviorY = 'none'
    
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.documentElement.style.overscrollBehaviorX = ''
      document.documentElement.style.overscrollBehaviorY = ''
      document.body.style.overscrollBehaviorX = ''
      document.body.style.overscrollBehaviorY = ''
    }
  }, [])

  useEffect(() => {
    const preventKeyboardNavigation = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    
    document.addEventListener('keydown', preventKeyboardNavigation)
    return () => {
      document.removeEventListener('keydown', preventKeyboardNavigation)
    }
  }, [])

  useEffect(() => {
    const preventHistoryNavigation = (e: PopStateEvent) => {
      e.preventDefault()
      window.location.reload()
    }
    
    window.addEventListener('popstate', preventHistoryNavigation)
    return () => {
      window.removeEventListener('popstate', preventHistoryNavigation)
    }
  }, [])

  useEffect(() => {
    let startX = 0
    let startY = 0
    let isTracking = false
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX
        startY = e.touches[0].clientY
        isTracking = true
      }
    }
    
    const handleTouchMove = (e: Event) => {
      if (!isTracking) return
      
      const touchEvent = e as TouchEvent
      if (touchEvent.touches.length === 1) {
        const deltaX = Math.abs(touchEvent.touches[0].clientX - startX)
        const deltaY = Math.abs(touchEvent.touches[0].clientY - startY)
        
        if (deltaX > deltaY && deltaX > 30) {
          e.preventDefault()
          e.stopPropagation()
        }
      }
    }
    
    const handleTouchEnd = () => {
      isTracking = false
    }
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: false })
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  const gridViewport = {
    ...viewport,
    width: window.innerWidth,
    height: window.innerHeight
  }

  return (
    <AppContainer>
      <Canvas />
      <ControlsFixed>
        <Controls />
      </ControlsFixed>
      <RemoteCursors />
      <CursorPreview />
      <CanvasGrid viewport={gridViewport} />
      <GPSDisplay />
    </AppContainer>
  )
}

const AdminPage: React.FC = () => {
  const { viewport } = useCanvasStore()
  
  const gridViewport = {
    ...viewport,
    width: window.innerWidth,
    height: window.innerHeight
  }
  
  return (
    <AppContainer>
      <Canvas />
      <ControlsFixed>
        <Controls showClearButton={true} />
      </ControlsFixed>
      <RemoteCursors />
      <CursorPreview />
      <CanvasGrid viewport={gridViewport} />
      <GPSDisplay />
    </AppContainer>
  )
}

const App: React.FC = () => {
  return (
    <BrushProvider>
      <UUIDProvider>
        <Router>
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Router>
      </UUIDProvider>
    </BrushProvider>
  )
}

export default App 