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
  pointer-events: auto;
  z-index: 1000;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  
  &:hover {
    opacity: 1;
    background: rgba(255,255,255,0.8);
  }
`

const ArtistNameInput = styled.input`
  position: fixed;
  top: 16px;
  left: 16px;
  font-size: 0.75rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-weight: 300;
  letter-spacing: 0.5px;
  background: rgba(255,255,255,0.95);
  color: #000;
  border: 1px solid rgba(0,0,0,0.3);
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  z-index: 1001;
  min-width: 120px;
  
  &:focus {
    border-color: rgba(0,0,0,0.6);
    box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
    background: rgba(255,255,255,1);
  }
  
  &::placeholder {
    color: rgba(0,0,0,0.5);
  }
`

const ArtistNameLabel = styled.div`
  position: fixed;
  top: 14px;
  left: 24px;
  font-size: 0.68rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-weight: 400;
  color: rgba(0,0,0,0.7);
  z-index: 1002;
  pointer-events: none;
  letter-spacing: 0.3px;
  user-select: none;
  @media (max-width: 600px) {
    top: 10px;
    left: 12px;
  }
`

const ArtistNameRow = styled.div`
  position: fixed;
  top: 32px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 1002;
  cursor: pointer;
  color: rgba(0,0,0,0.8);
  font-size: 0.95rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-weight: 300;
  letter-spacing: 0.5px;
  opacity: 0.8;
  transition: opacity 0.2s;
  &:hover {
    opacity: 1;
    color: #222;
  }
  @media (max-width: 600px) {
    top: 24px;
    left: 12px;
    font-size: 0.9rem;
  }
`

const EditIcon = styled.span<{ hovered: boolean }>`
  font-size: 1em;
  margin-left: 2px;
  opacity: ${props => (props.hovered ? 1 : 0.7)};
  transition: opacity 0.2s;
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
  const [isEditingName, setIsEditingName] = useState(false)
  const [customArtistName, setCustomArtistName] = useState<string>('')
  const [remoteArtistNames, setRemoteArtistNames] = useState<{[uuid: string]: string}>({})
  const myUUID = useUUID()
  const { viewport } = useCanvasStore()
  const { on, off, emit } = useSocket()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const handleRemoteCursor = (data: RemoteCursor & { size?: number; color?: string }) => {
      if (data.uuid && data.uuid !== myUUID) {
        setRemoteCursors(prev => ({
          ...prev,
          [data.uuid]: { cursor: data, lastSeen: Date.now() }
        }))
      }
    }
    
    const handleUserConnect = (data: RemoteCursor & { size?: number; color?: string }) => {
      if (data.uuid && data.uuid !== myUUID) {
        setRemoteCursors(prev => ({
          ...prev,
          [data.uuid]: { cursor: data, lastSeen: Date.now() }
        }))
      }
    }
    
    const handleUserDisconnect = (uuid: string) => {
      if (uuid !== myUUID) {
        setRemoteCursors(prev => {
          const newCursors = { ...prev }
          delete newCursors[uuid]
          return newCursors
        })
      }
    }
    
    const handleCanvasCleared = () => {
      setRemoteCursors({})
    }
    
    const handleArtistNameChange = (data: { uuid: string; name: string }) => {
      console.log('🎨 Received artistNameChange:', data)
      if (data.uuid !== myUUID) {
        setRemoteArtistNames(prev => ({
          ...prev,
          [data.uuid]: data.name
        }))
        console.log('🎨 Updated remote artist name for:', data.uuid, '->', data.name)
      }
    }
    
    on('remoteCursor', handleRemoteCursor)
    on('userConnect', handleUserConnect)
    on('userDisconnect', handleUserDisconnect)
    on('canvas-cleared', handleCanvasCleared)
    on('artistNameChange', handleArtistNameChange)
    
    return () => {
      off('remoteCursor', handleRemoteCursor)
      off('userConnect', handleUserConnect)
      off('userDisconnect', handleUserDisconnect)
      off('canvas-cleared', handleCanvasCleared)
      off('artistNameChange', handleArtistNameChange)
    }
  }, [on, off, myUUID])

  // Select all text when entering edit mode
  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.select()
    }
  }, [isEditingName])

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

  const handleNameClick = () => {
    setIsEditingName(true)
    setCustomArtistName(getArtistForUUID(myUUID))
  }

  const handleNameSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newName = e.currentTarget.value.trim()
      if (newName) {
        setCustomArtistName(newName)
        // Emit the new name to other users
        const nameChangeData = { uuid: myUUID, name: newName }
        console.log('🎨 Emitting artistNameChange:', nameChangeData)
        emit('artistNameChange', nameChangeData)
      }
      setIsEditingName(false)
    } else if (e.key === 'Escape') {
      setIsEditingName(false)
    }
  }

  const handleNameBlur = () => {
    setIsEditingName(false)
  }

  const getDisplayName = (uuid: string) => {
    if (uuid === myUUID) {
      return customArtistName || getArtistForUUID(uuid)
    }
    // For remote users, we'll need to store their custom names
    return remoteArtistNames[uuid] || getArtistForUUID(uuid)
  }

  return (
    <>
      <ArtistNameLabel>Enter your name here:</ArtistNameLabel>
      {isEditingName ? (
        <ArtistNameInput
          value={customArtistName}
          onChange={(e) => setCustomArtistName(e.target.value)}
          onKeyDown={handleNameSubmit}
          onBlur={handleNameBlur}
          autoFocus
          placeholder="Enter your name here..."
          ref={inputRef}
          style={{ top: 32, left: 24, position: 'fixed', zIndex: 1003 }}
        />
      ) : (
        <ArtistNameRow
          onClick={handleNameClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {getDisplayName(myUUID)}
          <EditIcon hovered={isHovered} title="Edit name">✏️</EditIcon>
        </ArtistNameRow>
      )}
      {visibleCursors.map(cursor => (
        <RemoteCursor
          key={cursor.uuid}
          x={cursor.screenX}
          y={cursor.screenY}
          color={cursor.color || '#00f'}
          size={cursor.size}
        >
          <UUIDLabel>{getDisplayName(cursor.uuid)}</UUIDLabel>
        </RemoteCursor>
      ))}
    </>
  )
}

export default RemoteCursors 