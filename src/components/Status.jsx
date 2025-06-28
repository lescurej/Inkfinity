import React, { useState, useEffect } from 'react'
import { useSocket } from '../hooks/useSocket'

const Status = () => {
  const [status, setStatus] = useState('En attente de connexion...')
  const { on, off, connected } = useSocket()

  useEffect(() => {
    const handleConnect = () => {
      setStatus('Connecté - En attente de l\'historique...')
    }

    const handleDisconnect = () => {
      setStatus('Déconnecté - Tentative de reconnexion...')
    }

    const handleDrawingHistory = (history) => {
      setStatus(`Connecté - ${history.length} segments chargés`)
    }

    const handleClearCanvas = () => {
      setStatus('Canvas effacé par un autre utilisateur')
    }

    on('connect', handleConnect)
    on('disconnect', handleDisconnect)
    on('drawingHistory', handleDrawingHistory)
    on('clearCanvas', handleClearCanvas)

    return () => {
      off('connect', handleConnect)
      off('disconnect', handleDisconnect)
      off('drawingHistory', handleDrawingHistory)
      off('clearCanvas', handleClearCanvas)
    }
  }, [on, off])

  return (
    <div className="status" style={{
      marginTop: '10px',
      fontSize: '12px',
      color: '#666'
    }}>
      {status}
    </div>
  )
}

export default Status 