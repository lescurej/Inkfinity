import React, { useEffect, useState } from 'react'
import Canvas from './components/Canvas'
import Controls from './components/Controls'
import CursorPreview from './components/CursorPreview'
import RemoteCursors from './components/RemoteCursors'
import GPSDisplay from './components/GPSDisplay'
import { BrushProvider } from './hooks/useBrush'
import { UUIDProvider } from './hooks/useUUID'
import { useCanvasStore } from './store/canvasStore'
import styled from '@emotion/styled'

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
`

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
`

const ControlsFixed = styled.div`
  position: fixed;
  top: 40px;
  left: 40px;
  z-index: 200;
`

const App: React.FC = () => {
  const [hasAppliedUrlParams, setHasAppliedUrlParams] = useState(false)
  const [canvasStateLoaded, setCanvasStateLoaded] = useState(false)
  const canvasStore = useCanvasStore()

  useEffect(() => {
    if (hasAppliedUrlParams) return
    
    const urlParams = new URLSearchParams(window.location.search)
    const x = urlParams.get('x')
    const y = urlParams.get('y')
    const z = urlParams.get('z')
    
    if (x && y) {
      const xCoord = parseFloat(x)
      const yCoord = parseFloat(y)
      const scale = z ? parseFloat(z) : undefined
      
      if (!isNaN(xCoord) && !isNaN(yCoord)) {
        console.log('🎯 QR coordinates detected:', { x: xCoord, y: yCoord, scale })
        
        const applyCoordinates = () => {
          if (canvasStateLoaded) {
            console.log('✅ Canvas state loaded, applying coordinates')
            canvasStore.navigateToCoordinates(xCoord, yCoord, scale)
            window.dispatchEvent(new CustomEvent('coordinates-applied'))
            setHasAppliedUrlParams(true)
          } else {
            console.log('⏳ Waiting for canvas state...')
            setTimeout(applyCoordinates, 20)
          }
        }
        
        setTimeout(applyCoordinates, 50)
        
        setTimeout(() => {
          if (!hasAppliedUrlParams) {
            console.log('⚠️ Fallback: applying coordinates without canvas state')
            canvasStore.navigateToCoordinates(xCoord, yCoord, scale)
            window.dispatchEvent(new CustomEvent('coordinates-applied'))
            setHasAppliedUrlParams(true)
          }
        }, 1000)
      } else {
        setHasAppliedUrlParams(true)
      }
    } else {
      setHasAppliedUrlParams(true)
    }
  }, [canvasStore, hasAppliedUrlParams, canvasStateLoaded])

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

  return (
    <UUIDProvider>
      <BrushProvider>
        <AppContainer>
          <Canvas />
          <Overlay>
            <RemoteCursors />
            <CursorPreview />
          </Overlay>
          <ControlsFixed>
            <Controls />
          </ControlsFixed>
          <GPSDisplay />
        </AppContainer>
      </BrushProvider>
    </UUIDProvider>
  )
}

export default App 