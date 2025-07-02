import { useEffect, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { EVENTS } from "../../types"
import { useUserStore } from '../store/userStore';

interface SocketStats {
  totalStrokes: number;
  maxStrokes: number;
  memoryUsage: string;
  connectedClients: number;
  activeUsers: number;
}

// Singleton socket instance
let globalSocket: Socket | null = null;
let globalEventListeners = new Map<string, Function[]>();
let globalConnectionState = {
  isConnected: false,
  isLoading: true,
  connectionAttempts: 0,
  stats: null as SocketStats | null
};

// Singleton cleanup functions
let globalReconnectTimeout: NodeJS.Timeout | null = null;
let globalHeartbeatInterval: NodeJS.Timeout | null = null;

const cleanupGlobal = () => {
  if (globalReconnectTimeout) {
    clearTimeout(globalReconnectTimeout);
    globalReconnectTimeout = null;
  }
  if (globalHeartbeatInterval) {
    clearInterval(globalHeartbeatInterval);
    globalHeartbeatInterval = null;
  }
};

const removeAllGlobalListeners = () => {
  if (globalSocket) {
    globalEventListeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        globalSocket?.off(event, callback as any);
      });
    });
    globalEventListeners.clear();
  }
};

const addGlobalListener = (event: string, callback: Function) => {
  if (globalSocket) {
    if (!globalEventListeners.has(event)) {
      globalEventListeners.set(event, []);
    }
    globalEventListeners.get(event)?.push(callback);
    globalSocket.on(event, callback as any);
  }
};

const connectGlobal = () => {
  if (globalSocket?.connected) return;

  const serverUrl = window.location.origin;
  
  
  
  globalSocket = io(serverUrl, {
    transports: ['websocket'],
    timeout: 20000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });

  addGlobalListener('connect', () => {

    globalConnectionState.isConnected = true;
    globalConnectionState.isLoading = false;
    globalConnectionState.connectionAttempts = 0;
    
    globalHeartbeatInterval = setInterval(() => {
      if (globalSocket?.connected) {
        globalSocket.emit(EVENTS.PING);
      }
    }, 30000);
  });

  addGlobalListener('disconnect', (reason: string) => {

    globalConnectionState.isConnected = false;
    cleanupGlobal();
    
    if (reason === 'io server disconnect') {
      globalReconnectTimeout = setTimeout(() => {
        globalSocket?.connect();
      }, 1000);
    }
  });

  addGlobalListener('connect_error', (error: any) => {
    console.error('❌ Connection error:', error);
    globalConnectionState.isConnected = false;
    globalConnectionState.isLoading = false;
    globalConnectionState.connectionAttempts++;
  });

  addGlobalListener(EVENTS.PONG, () => {

  });

  addGlobalListener(EVENTS.STATS, (data: SocketStats) => {
    globalConnectionState.stats = data;

  });

  addGlobalListener(EVENTS.USER_DISCONNECT, (uuid: string) => {

  });

  addGlobalListener(EVENTS.SESSION_INIT, (data: { uuid: string; name: string }) => {

    // Update user store
    const { setUUID, setArtistName } = useUserStore.getState();
    setUUID(data.uuid);
    setArtistName(data.name);

  });
};

export const useCanvasSocket = () => {
  const [isConnected, setIsConnected] = useState(globalConnectionState.isConnected);
  const [isLoading, setIsLoading] = useState(globalConnectionState.isLoading);
  const [connectionAttempts, setConnectionAttempts] = useState(globalConnectionState.connectionAttempts);
  const [stats, setStats] = useState<SocketStats | null>(globalConnectionState.stats);
  
  const emit = useCallback((event: string, data?: any) => {
    if (globalSocket?.connected) {
      globalSocket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }, []);

  const requestState = useCallback(() => {
    emit('requestState', {});
  }, [emit]);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    addGlobalListener(event, callback);
  }, []);

  const off = useCallback((event: string, callback: (data: any) => void) => {
    if (globalSocket) {
      globalSocket.off(event, callback);
      const listeners = globalEventListeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }, []);

  const getStats = useCallback(() => {
    emit(EVENTS.GET_STATS, {});
  }, [emit]);

  const disconnect = useCallback(() => {
    cleanupGlobal();
    removeAllGlobalListeners();
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
    }
    globalConnectionState.isConnected = false;
    setIsConnected(false);
  }, []);

  // Sync state with global state
  useEffect(() => {
    const updateState = () => {
      setIsConnected(globalConnectionState.isConnected);
      setIsLoading(globalConnectionState.isLoading);
      setConnectionAttempts(globalConnectionState.connectionAttempts);
      setStats(globalConnectionState.stats);
    };

    // Initial sync
    updateState();

    // Set up interval to sync state
    const interval = setInterval(updateState, 100);

    return () => clearInterval(interval);
  }, []);

  // Initialize connection only once
  useEffect(() => {
    if (!globalSocket) {
      connectGlobal();
    }

    return () => {
      // Don't disconnect on unmount, let the singleton handle it
    };
  }, []);

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