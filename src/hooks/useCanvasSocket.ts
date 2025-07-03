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
  stats: null as SocketStats | null,
  drawingHistory: [] as any[]
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

  const startTime = performance.now();
  console.log('🔌 Starting socket connection...');

  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';
  
  // Use the current hostname and port for development to support mobile access
  const serverUrl = isDevelopment 
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : window.location.origin;
  
  console.log(`🌐 Connecting to: ${serverUrl}`);
  
  globalSocket = io(serverUrl, {
    transports: ['websocket'],
    timeout: 5000,
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
    forceNew: false,
    upgrade: true,
    rememberUpgrade: true
  });

  addGlobalListener('connect', () => {
    const connectTime = performance.now() - startTime;
    console.log(`✅ Connected to server in ${connectTime.toFixed(2)}ms`);
    globalConnectionState.isConnected = true;
    globalConnectionState.isLoading = false;
    globalConnectionState.connectionAttempts = 0;
    
    updateGlobalState();
    
    globalHeartbeatInterval = setInterval(() => {
      if (globalSocket?.connected) {
        globalSocket.emit(EVENTS.PING);
      }
    }, 30000);
  });

  addGlobalListener('disconnect', (reason: string) => {
    console.log(`🔌 Disconnected: ${reason}`);
    globalConnectionState.isConnected = false;
    cleanupGlobal();
    
    if (reason === 'io server disconnect') {
      globalReconnectTimeout = setTimeout(() => {
        console.log('🔄 Attempting reconnection...');
        globalSocket?.connect();
      }, 1000);
    }
  });

  addGlobalListener('connect_error', (error: any) => {
    const errorTime = performance.now() - startTime;
    console.error(`❌ Connection failed after ${errorTime.toFixed(2)}ms:`, error);
    globalConnectionState.isConnected = false;
    globalConnectionState.isLoading = false;
    globalConnectionState.connectionAttempts++;
  });

  addGlobalListener(EVENTS.PONG, () => {
    // Heartbeat response
  });

  addGlobalListener(EVENTS.STATS, (data: SocketStats) => {
    globalConnectionState.stats = data;
  });

  addGlobalListener(EVENTS.SESSION_INIT, (data: { uuid: string; name: string }) => {
    const sessionTime = performance.now() - startTime;
    console.log(`🎭 Session initialized in ${sessionTime.toFixed(2)}ms:`, data);
    const { setUUID, setArtistName } = useUserStore.getState();
    setUUID(data.uuid);
    setArtistName(data.name);
  });

  addGlobalListener(EVENTS.CANVAS_STATE, (data: any) => {
    const stateTime = performance.now() - startTime;
    console.log(`📊 Canvas state received in ${stateTime.toFixed(2)}ms:`, data.strokes?.length || 0, 'strokes');
    globalConnectionState.drawingHistory = data.strokes || [];
    
    updateGlobalState();
  });

  addGlobalListener(EVENTS.DRAWING_HISTORY, (history: any[]) => {
    const historyTime = performance.now() - startTime;
    console.log(`📚 Drawing history received in ${historyTime.toFixed(2)}ms:`, history.length, 'strokes');
    globalConnectionState.drawingHistory = history;
  });

  const updateGlobalState = () => {
    globalEventListeners.forEach((callbacks, event) => {
      if (event === 'stateUpdate') {
        callbacks.forEach(callback => callback());
      }
    });
  };
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

  useEffect(() => {
    if (!globalSocket) {
      connectGlobal();
    }

    const updateState = () => {
      setIsConnected(globalConnectionState.isConnected);
      setIsLoading(globalConnectionState.isLoading);
      setConnectionAttempts(globalConnectionState.connectionAttempts);
      setStats(globalConnectionState.stats);
    };

    globalEventListeners.set('stateUpdate', [...(globalEventListeners.get('stateUpdate') || []), updateState]);

    return () => {
      const listeners = globalEventListeners.get('stateUpdate') || [];
      const index = listeners.indexOf(updateState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    isConnected,
    isLoading,
    connectionAttempts,
    stats,
    emit,
    requestState,
    on,
    off,
    getStats,
    disconnect
  };
}; 