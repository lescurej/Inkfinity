import React, { useRef, useEffect } from 'react'
import styled from '@emotion/styled'

interface CanvasGridProps {
  viewport: {
    x: number
    y: number
    scale: number
    width: number
    height: number
  }
}

const DOT_OPACITY = 0.15
const DOT_SIZE_RANGE = { min: 0.9, max: 1.5 }
const GRID_SIZE = 64

const GridCanvas = styled.canvas`
  position: fixed;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 20;
  display: block;
`

function randomSize(x: number, y: number) {
  // Deterministic pseudo-random for each intersection
  const seed = Math.sin(x * 92821.13 + y * 43917.77) * 10000
  const t = seed - Math.floor(seed)
  return DOT_SIZE_RANGE.min + (DOT_SIZE_RANGE.max - DOT_SIZE_RANGE.min) * t
}

const CanvasGrid: React.FC<CanvasGridProps> = ({ viewport }) => {
  const ref = useRef<HTMLCanvasElement>(null)

  const drawGrid = () => {
    const canvas = ref.current
    if (!canvas) return
    
    const dpr = window.devicePixelRatio || 1
    canvas.width = viewport.width * dpr
    canvas.height = viewport.height * dpr
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)
    
    const step = GRID_SIZE * viewport.scale
    const startX = -((viewport.x * viewport.scale) % step)
    const startY = -((viewport.y * viewport.scale) % step)
    
    for (let x = startX; x < viewport.width; x += step) {
      for (let y = startY; y < viewport.height; y += step) {
        const size = randomSize(Math.round((x - startX) / step), Math.round((y - startY) / step))
        ctx.beginPath()
        ctx.arc(x, y, size, 0, 2 * Math.PI)
        ctx.fillStyle = `rgba(0,0,0,${DOT_OPACITY})`
        ctx.fill()
      }
    }
    ctx.restore()
  }

  useEffect(() => {
    drawGrid()
  }, [viewport.x, viewport.y, viewport.scale])

  useEffect(() => {
    const handleResize = () => {
      drawGrid()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [viewport.x, viewport.y, viewport.scale])

  return <GridCanvas ref={ref} />
}

export default CanvasGrid 