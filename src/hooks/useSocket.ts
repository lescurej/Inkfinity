import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const eventListenersRef = useRef<Map<string, Function[]>>(new Map())
  const [isConnected, setIsConnected] = useState(false)

  const cleanup = useCallback(() => {
    if (socketRef.current) {
      const listeners = eventListenersRef.current
      listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          socketRef.current?.off(event, callback as any)
        })
      })
      eventListenersRef.current.clear()
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  const addListener = useCallback((event: string, callback: Function) => {
    if (socketRef.current) {
      if (!eventListenersRef.current.has(event)) {
        eventListenersRef.current.set(event, [])
      }
      eventListenersRef.current.get(event)?.push(callback)
      socketRef.current.on(event, callback as any)
    }
  }, [])

  useEffect(() => {
    socketRef.current = io(undefined, {
      transports: ['websocket'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    addListener('connect', () => {
      setIsConnected(true)
    })

    addListener('disconnect', () => {
      setIsConnected(false)
    })

    addListener('connect_error', (error: any) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
    })

    return cleanup
  }, [addListener, cleanup])

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot emit:', event)
    }
  }, [])

  const on = useCallback((event: string, callback: (data: any) => void) => {
    addListener(event, callback)
  }, [addListener])

  const off = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback)
      const listeners = eventListenersRef.current.get(event) || []
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  const connected = useCallback((): boolean => {
    return socketRef.current?.connected || false
  }, [])

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    connected,
    isConnected
  }
} 