import React, { useEffect, useState } from 'react'
import styled from '@emotion/styled'
import { useCanvasStore } from '../store/canvasStore'
import QRCode from 'qrcode'

const GPSContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 7px;
  font-weight: 500;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 300;
  pointer-events: none;
  user-select: none;
`

const CoordinatesLine = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 4px;
`

const Coordinate = styled.span`
  color: #888;
  font-size: 6px;
  
  &:after {
    content: ':';
    margin-right: 2px;
  }
`

const Value = styled.span`
  color: #fff;
  font-weight: 600;
  font-size: 7px;
`

const QRCodeContainer = styled.div`
  display: flex;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
`

const QRCodeImage = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 4px;
  background: white;
  padding: 2px;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
  }
`

const GPSDisplay: React.FC = () => {
  const { viewport } = useCanvasStore()
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [currentPositionUrl, setCurrentPositionUrl] = useState<string>('')
  
  const formatCoordinate = (value: number) => {
    const absValue = Math.abs(value)
    const degrees = Math.floor(absValue)
    const minutes = Math.floor((absValue - degrees) * 60)
    const seconds = Math.floor(((absValue - degrees) * 60 - minutes) * 60 * 100) / 100
    
    const direction = value >= 0 ? '' : '-'
    return `${direction}${degrees}°${minutes}'${seconds}"`
  }
  
  const centerX = viewport.x + window.innerWidth / 2 / viewport.scale
  const centerY = viewport.y + window.innerHeight / 2 / viewport.scale
  
  const handleQRCodeClick = async () => {
    try {
      await navigator.clipboard.writeText(currentPositionUrl)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }
  
  useEffect(() => {
    const generateQRCode = async () => {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('x', centerX.toFixed(2))
      currentUrl.searchParams.set('y', centerY.toFixed(2))
      currentUrl.searchParams.set('z', viewport.scale.toFixed(2))
      
      const positionUrl = currentUrl.toString()
      setCurrentPositionUrl(positionUrl)
      
      try {
        const qrDataUrl = await QRCode.toDataURL(positionUrl, {
          width: 120,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeUrl(qrDataUrl)
      } catch (err) {
        console.error('Failed to generate QR code:', err)
      }
    }
    
    generateQRCode()
  }, [centerX, centerY, viewport.scale])
  
  return (
    <GPSContainer>
      <CoordinatesLine>
        <div><Coordinate>X</Coordinate><Value>{formatCoordinate(centerX)}</Value></div>
        <div><Coordinate>Y</Coordinate><Value>{formatCoordinate(centerY)}</Value></div>
        <div><Coordinate>Z</Coordinate><Value>{viewport.scale.toFixed(2)}x</Value></div>
      </CoordinatesLine>
      {qrCodeUrl && (
        <QRCodeContainer onClick={handleQRCodeClick}>
          <QRCodeImage src={qrCodeUrl} alt="QR Code for current position" />
        </QRCodeContainer>
      )}
    </GPSContainer>
  )
}

export default GPSDisplay 