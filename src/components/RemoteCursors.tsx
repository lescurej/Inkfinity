import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useSocket } from '../hooks/useSocket'
import { useUUID } from '../hooks/useUUID'
import type { RemoteCursor } from '../types'
import styled from '@emotion/styled'
import { useCanvasStore } from '../store/canvasStore'

interface RemoteCursorMap {
  [uuid: string]: { cursor: RemoteCursor & { size?: number; color?: string }, lastSeen: number }
}

interface VisibleCursor extends RemoteCursor {
  size: number
  screenX: number
  screenY: number
  color?: string
}

const RemoteCursor = styled.div<{ x: number; y: number; color: string; size: number }>`
  position: absolute;
  left: ${props => props.x}px;
  top: ${props => props.y}px;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  background: ${props => props.color};
  border-radius: 50%;
  border: 2px solid #222;
  opacity: 0.7;
  pointer-events: none;
  z-index: 99;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-family: monospace;
  color: #222;
  box-shadow: 0 0 6px rgba(0,0,0,0.3);
`

const UUIDLabel = styled.span`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translate(-50%, 0.2em);
  background: rgba(255,255,255,0.85);
  color: #222;
  font-size: 0.7rem;
  font-family: monospace;
  padding: 1px 4px;
  border-radius: 4px;
  margin-top: 2px;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
`

const CurrentArtistLabel = styled.div`
  position: fixed;
  top: 16px;
  left: 16px;
  color: rgba(0,0,0,0.4);
  font-size: 0.75rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-weight: 300;
  letter-spacing: 0.5px;
  pointer-events: none;
  z-index: 1000;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 1;
  }
`

const ARTISTS = [
  "Leonardo da Vinci","Michelangelo","Raphaël","Caravage","Rembrandt","Johannes Vermeer","Diego Velázquez","Francisco Goya","Claude Monet","Édouard Manet","Vincent van Gogh","Paul Cézanne","Paul Gauguin","Henri Matisse","Pablo Picasso","Salvador Dalí","Joan Miró","Marc Chagall","Wassily Kandinsky","Jackson Pollock","Mark Rothko","Andy Warhol","Roy Lichtenstein","Jean-Michel Basquiat","Frida Kahlo","Diego Rivera","Artemisia Gentileschi","Tamara de Lempicka","Georges Braque","Kazimir Malevich","Piet Mondrian","David Hockney","Gerhard Richter","Pierre Soulages","Yayoi Kusama","Takashi Murakami","Zao Wou-Ki","Jean Dubuffet","Niki de Saint Phalle","Gustav Klimt","Egon Schiele","Hergé","Albert Uderzo","René Goscinny","Morris","Franquin","Peyo","Moebius (Jean Giraud)","Enki Bilal","Tardi","Manu Larcenet","Lewis Trondheim","Marjane Satrapi","Art Spiegelman","Osamu Tezuka","Akira Toriyama","Katsuhiro Otomo","Naoki Urasawa","Hajime Isayama","Eiichiro Oda","Takehiko Inoue","Hirohiko Araki","Frank Miller","Alan Moore","Mike Mignola","Jim Lee","Saul Bass","Paul Rand","Milton Glaser","David Carson","Massimo Vignelli","Neville Brody","April Greiman","Paula Scher","Stefan Sagmeister","Jessica Walsh","Chip Kidd","Peter Saville","Barbara Kruger","Shepard Fairey","Shigeo Fukuda","Tadanori Yokoo","Alex Trochut","Christoph Niemann","Malika Favre","Jean Jullien","Oliviero Toscani","Luba Lukova","Eric Carle","Charley Harper","Mary Blair","Christoph Niemann","Banksy","Keith Haring","Laurent Durieux","Tom Whalen"
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function getArtistForUUID(uuid: string): string {
  const hash = hashString(uuid)
  const index = hash % ARTISTS.length
  return ARTISTS[index]
}

const RemoteCursors: React.FC = () => {
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursorMap>({})
  const myUUID = useUUID()
  const { viewport } = useCanvasStore()
  const { on, off } = useSocket()

  useEffect(() => {
    const handleRemoteCursor = (data: RemoteCursor & { size?: number; color?: string }) => {
      if (data.uuid && data.uuid !== myUUID) {
        setRemoteCursors(prev => ({
          ...prev,
          [data.uuid]: { cursor: data, lastSeen: Date.now() }
        }))
      }
    }
    on('remoteCursor', handleRemoteCursor)
    return () => {
      off('remoteCursor', handleRemoteCursor)
    }
  }, [on, off, myUUID])

  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteCursors(prev => {
        const now = Date.now()
        const newCursors: RemoteCursorMap = {}
        Object.entries(prev).forEach(([uuid, { cursor, lastSeen }]) => {
          if (now - lastSeen < 100) {
            newCursors[uuid] = { cursor, lastSeen }
          }
        })
        return newCursors
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const visibleCursors = useMemo((): VisibleCursor[] => {
    const cursors = Object.values(remoteCursors)
      .map(({ cursor }) => cursor)
      .filter(cursor => cursor.uuid && cursor.uuid !== myUUID && typeof cursor.x === 'number' && typeof cursor.y === 'number')
      .map(cursor => {
        const baseSize = cursor.size || 8
        const size = Math.max(baseSize * viewport.scale, 12)
        const screenX = (cursor.x - viewport.x) * viewport.scale
        const screenY = (cursor.y - viewport.y) * viewport.scale
        
        if (screenX < -100 || screenY < -100 || 
            screenX > window.innerWidth + 100 || 
            screenY > window.innerHeight + 100) {
          return null
        }

        return {
          ...cursor,
          size,
          screenX,
          screenY
        }
      })
      .filter((cursor): cursor is VisibleCursor => cursor !== null)

    return cursors
  }, [remoteCursors, viewport.x, viewport.y, viewport.scale, myUUID])

  return (
    <>
      <CurrentArtistLabel>
        {getArtistForUUID(myUUID)}
      </CurrentArtistLabel>
      {visibleCursors.map(cursor => (
        <RemoteCursor
          key={cursor.uuid}
          x={cursor.screenX}
          y={cursor.screenY}
          color={cursor.color || '#00f'}
          size={cursor.size}
        >
          <UUIDLabel>{getArtistForUUID(cursor.uuid)}</UUIDLabel>
        </RemoteCursor>
      ))}
    </>
  )
}

export default RemoteCursors 