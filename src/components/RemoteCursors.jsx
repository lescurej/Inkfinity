import React, { useState, useEffect, useRef } from 'react'
import { useSocket } from '../hooks/useSocket'
import { useCanvas } from '../hooks/useCanvas'
import { uuidv4 } from '../utils/uuid'

const RemoteCursors = () => {
  const [remoteCursors, setRemoteCursors] = useState({})
  const [myUUID] = useState(uuidv4())
  const { viewport } = useCanvas()
  const { on, off } = useSocket()
  const timeoutsRef = useRef({})

  useEffect(() => {
    const handleRemoteCursor = (data) => {
      if (data.uuid !== myUUID) {
        setRemoteCursors(prev => ({
          ...prev,
          [data.uuid]: data
        }))

        // Nettoyer le timeout précédent
        if (timeoutsRef.current[data.uuid]) {
          clearTimeout(timeoutsRef.current[data.uuid])
        }

        // Créer un nouveau timeout
        timeoutsRef.current[data.uuid] = setTimeout(() => {
          setRemoteCursors(prev => {
            const newCursors = { ...prev }
            delete newCursors[data.uuid]
            return newCursors
          })
          delete timeoutsRef.current[data.uuid]
        }, 2000)
      }
    }

    const handleUserDisconnect = (uuid) => {
      setRemoteCursors(prev => {
        const newCursors = { ...prev }
        delete newCursors[uuid]
        return newCursors
      })
      
      if (timeoutsRef.current[uuid]) {
        clearTimeout(timeoutsRef.current[uuid])
        delete timeoutsRef.current[uuid]
      }
    }

    on('remoteCursor', handleRemoteCursor)
    on('userDisconnect', handleUserDisconnect)

    return () => {
      off('remoteCursor', handleRemoteCursor)
      off('userDisconnect', handleUserDisconnect)
      
      // Nettoyer tous les timeouts
      Object.values(timeoutsRef.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [on, off, myUUID])

  return (
    <>
      {Object.values(remoteCursors).map(cursor => {
        const size = (cursor.size || 16) * viewport.scale
        const screenX = (cursor.x - viewport.x) * viewport.scale
        const screenY = (cursor.y - viewport.y) * viewport.scale

        // Ne pas afficher si hors de l'écran
        if (screenX < 0 || screenY < 0 || screenX > window.innerWidth || screenY > window.innerHeight) {
          return null
        }

        return (
          <div
            key={cursor.uuid}
            className="remote-cursor"
            style={{
              left: `${screenX - size/2}px`,
              top: `${screenY - size/2}px`,
              width: `${size}px`,
              height: `${size}px`,
              background: cursor.color || '#00f'
            }}
          >
            <span style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: cursor.color || '#00f',
              background: '#fff',
              padding: '1px 4px',
              borderRadius: '4px',
              boxShadow: '0 1px 4px #0002'
            }}>
              {cursor.uuid.slice(0, 8)}
            </span>
          </div>
        )
      })}
    </>
  )
}

export default RemoteCursors 