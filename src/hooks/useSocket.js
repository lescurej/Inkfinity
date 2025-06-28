import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

export const useSocket = () => {
  const socketRef = useRef(null)

  useEffect(() => {
    // Initialiser la connexion Socket.IO
    socketRef.current = io()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data)
    }
  }, [])

  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }, [])

  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback)
    }
  }, [])

  const connected = useCallback(() => {
    return socketRef.current?.connected || false
  }, [])

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    connected
  }
} 