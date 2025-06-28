import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketStats {
  totalStrokes: number;
  maxStrokes: number;
  memoryUsage: string;
  connectedClients: number;
  activeUsers: number;
}

export const useCanvasSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventListenersRef = useRef<Map<string, Function[]>>(new Map());
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [stats, setStats] = useState<SocketStats | null>(null);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const removeAllListeners = useCallback(() => {
    if (socketRef.current) {
      const listeners = eventListenersRef.current;
      listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          socketRef.current?.off(event, callback as any);
        });
      });
      eventListenersRef.current.clear();
    }
  }, []);

  const addListener = useCallback((event: string, callback: Function) => {
    if (socketRef.current) {
      if (!eventListenersRef.current.has(event)) {
        eventListenersRef.current.set(event, []);
      }
      eventListenersRef.current.get(event)?.push(callback);
      socketRef.current.on(event, callback as any);
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const serverUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : window.location.origin;
    
    socketRef.current = io(serverUrl, {
      transports: ['websocket'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    addListener('connect', () => {
      console.log('🔗 Connected to server');
      setIsConnected(true);
      setIsLoading(false);
      setConnectionAttempts(0);
      
      heartbeatIntervalRef.current = setInterval(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('ping');
        }
      }, 30000);
    });

    addListener('disconnect', (reason: string) => {
      console.log('🔴 Disconnected from server:', reason);
      setIsConnected(false);
      cleanup();
      
      if (reason === 'io server disconnect') {
        setTimeout(() => {
          socketRef.current?.connect();
        }, 1000);
      }
    });

    addListener('connect_error', (error: any) => {
      console.error('❌ Connection error:', error);
      setIsConnected(false);
      setIsLoading(false);
      setConnectionAttempts(prev => prev + 1);
    });

    addListener('pong', () => {
      console.log('💓 Heartbeat received');
    });

    addListener('stats', (data: SocketStats) => {
      setStats(data);
      console.log('📊 Stats received:', data);
    });

    addListener('userDisconnect', (uuid: string) => {
      console.log('👤 User disconnected:', uuid);
    });
  }, [addListener, cleanup]);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    addListener(event, callback);
  }, [addListener]);

  const off = useCallback((event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
      const listeners = eventListenersRef.current.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }, []);

  const getStats = useCallback(() => {
    emit('get-stats', {});
  }, [emit]);

  const requestState = useCallback(() => {
    emit('request-state', {});
  }, [emit]);

  const disconnect = useCallback(() => {
    cleanup();
    removeAllListeners();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, [cleanup, removeAllListeners]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { 
    emit, 
    on, 
    off, 
    isConnected, 
    isLoading, 
    stats, 
    getStats, 
    requestState,
    disconnect,
    connectionAttempts
  };
}; 