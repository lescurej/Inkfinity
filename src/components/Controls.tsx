import React, { useState, useEffect, useRef } from 'react'
import styled from '@emotion/styled'
import { useBrush } from '../hooks/useBrush'
import { useSocket } from '../hooks/useSocket'
import { useUUID } from '../hooks/useUUID'
import { useCanvasStore } from '../store/canvasStore'
import ColorPickerWheel from './ColorPickerWheel'

const Toolbar = styled.div`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  padding: 8px 16px;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  border: 1px solid rgba(220,220,220,0.5);
  min-width: 0;
  height: 56px;
  box-sizing: border-box;
  overflow: visible;
  pointer-events: auto;
  width: auto;
`

const ToolButton = styled.button`
  background: rgba(255,255,255,0.8);
  color: #333;
  border: none;
  padding: 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  &:hover {
    background: #f3f3f3;
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  }
`

const ColorSection = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ColorPickerContainer = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
`

const ColorInput = styled.input`
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: none;
  padding: 0;
  display: block;
  position: static;
  opacity: 1;
`

const ColorPreviewButton = styled.button<{ color: string }>`
  background: ${props => props.color};
  color: #333;
  border: 2px solid rgba(255,255,255,0.8);
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
`

const SizeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
`

const SizeSlider = styled.div`
  position: relative;
  width: 80px;
  height: 36px;
  background: rgba(255,255,255,0.8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
`

const SizeInput = styled.input`
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(to right, #e0e0e0, #333);
  outline: none;
  cursor: pointer;
  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #333;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.10);
  }
  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #333;
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 4px rgba(0,0,0,0.10);
  }
`

const SizeDisplay = styled.div`
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 3px 7px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
`

const ToolSection = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
`

const ToolSelect = styled.div`
  position: relative;
  width: 48px;
  height: 48px;
`

const ToolButtonWithPreview = styled.button<{ active: boolean }>`
  width: 36px;
  height: 36px;
  background: ${props => props.active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.8)'};
  border: ${props => props.active ? '2px solid rgba(59,130,246,0.4)' : '1px solid #eee'};
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: #f3f3f3;
    box-shadow: 0 2px 8px rgba(0,0,0,0.10);
  }
`

const ToolDropdown = styled.div<{ open: boolean }>`
  position: absolute;
  bottom: 110%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255,255,255,0.98);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.10);
  padding: 8px;
  display: ${props => props.open ? 'grid' : 'none'};
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  min-width: 120px;
  border: 1px solid #eee;
  z-index: 20;
`

const ToolOption = styled.button<{ active: boolean }>`
  background: ${props => props.active ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.8)'};
  border: ${props => props.active ? '2px solid rgba(59,130,246,0.5)' : '1px solid rgba(0,0,0,0.1)'};
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  &:hover {
    background: rgba(255,255,255,1);
    transform: translateY(-1px);
  }
`

const ToolName = styled.span`
  font-size: 0.7rem;
  color: #666;
  text-align: center;
`

const Divider = styled.div`
  width: 1px;
  height: 40px;
  background: rgba(0,0,0,0.1);
  margin: 0 8px;
`

const TOOLS = [
  { id: 'round', name: 'Round', icon: '●' },
  { id: 'eraser', name: 'Eraser', icon: '🧽' }
]

const ColorPopover = styled.div`
  position: absolute;
  z-index: 300;
  left: 0;
  right: 0;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  top: -290px;
`

const Controls: React.FC = () => {
  const { brushColor, brushSizePercent, updateBrushColor, updateBrushSize, brushType, updateBrushType } = useBrush()
  const { emit, on, off } = useSocket()
  const myUUID = useUUID()
  const { zoomIn, zoomOut, resetView, clearChunks, fitToContent, fitToContentWithServer } = useCanvasStore()
  const [toolDropdownOpen, setToolDropdownOpen] = useState(false)
  const toolSelectRef = useRef<HTMLDivElement>(null)
  const [colorOpen, setColorOpen] = useState(false)
  const colorBtnRef = useRef<HTMLButtonElement>(null)
  const colorPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolSelectRef.current && !toolSelectRef.current.contains(event.target as Node)) {
        setToolDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!colorOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        colorBtnRef.current && colorBtnRef.current.contains(e.target as Node)
      ) return
      if (
        colorPopoverRef.current && colorPopoverRef.current.contains(e.target as Node)
      ) return
      setColorOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [colorOpen])

  const handleClearCanvas = () => {
    clearChunks()
    emit('clear-canvas')
  }

  const handleFitToContent = () => {
    console.log('🔍 Fit to content button clicked')
    fitToContentWithServer(emit, on, off)
  }

  const currentTool = TOOLS.find(t => t.id === brushType) || TOOLS[0]

  return (
    <>
      <Toolbar>
        <ToolSection>
          <ToolButton onClick={handleClearCanvas} title="Clear Canvas">🧹</ToolButton>
        </ToolSection>
        <Divider />
        <ColorSection>
          <ColorPreviewButton 
            ref={colorBtnRef} 
            onClick={() => setColorOpen(v => !v)} 
            title="Color Picker"
            color={brushColor}
          />
          {colorOpen && (
            <ColorPopover ref={colorPopoverRef}>
              <ColorPickerWheel />
            </ColorPopover>
          )}
        </ColorSection>
        <SizeSection>
          <SizeSlider>
            <SizeInput
              type="range"
              min={1}
              max={20}
              step={0.5}
              value={brushSizePercent}
              onChange={e => updateBrushSize(Number(e.target.value))}
            />
            <SizeDisplay>{brushSizePercent.toFixed(1)}%</SizeDisplay>
          </SizeSlider>
        </SizeSection>
        <ToolSection>
          <ToolSelect ref={toolSelectRef}>
            <ToolButtonWithPreview
              active={false}
              onClick={() => setToolDropdownOpen(!toolDropdownOpen)}
              title={currentTool.name}
            >
              {currentTool.icon}
            </ToolButtonWithPreview>
            <ToolDropdown open={toolDropdownOpen}>
              {TOOLS.map(tool => (
                <ToolOption
                  key={tool.id}
                  active={tool.id === brushType}
                  onClick={() => {
                    updateBrushType(tool.id as any)
                    setToolDropdownOpen(false)
                  }}
                >
                  <span style={{fontSize: '1.2rem'}}>{tool.icon}</span>
                  <ToolName>{tool.name}</ToolName>
                </ToolOption>
              ))}
            </ToolDropdown>
          </ToolSelect>
        </ToolSection>
        <Divider />
        <ToolSection>
          <ToolButton onClick={zoomIn} title="Zoom In">🔍+</ToolButton>
          <ToolButton onClick={zoomOut} title="Zoom Out">🔍-</ToolButton>
          <ToolButton onClick={resetView} title="Reset View">🏠</ToolButton>
          <ToolButton onClick={handleFitToContent} title="Fit to Content">📐</ToolButton>
        </ToolSection>
      </Toolbar>
    </>
  )
}

export default Controls 