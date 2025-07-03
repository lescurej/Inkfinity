import { useEffect, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { EVENTS } from "../../types"
import { useUserStore } from '../store/userStore';
import { MessageBatcher } from '../utils/messageBatcher';
import { ProgressiveLoader } from '../utils/progressiveLoader';

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

// Add cleanup tracking
let cleanupCallbacks = new Set<() => void>();

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

  // Log all socket events for debugging
  globalSocket.onAny((eventName, ...args) => {
    console.log(`📡 Socket event: ${eventName}`, args);
    
    // Handle SESSION_INIT event directly here
    if (eventName === EVENTS.SESSION_INIT) {
      const data = args[0] as { uuid: string; name: string };
      const sessionTime = performance.now() - startTime;
      console.log(`🎭 SESSION_INIT received in ${sessionTime.toFixed(2)}ms:`, data);
      console.log(`🆔 UUID from server: "${data.uuid}"`);
      console.log(`🎨 Artist name from server: "${data.name}"`);
      
      const { setUUID, setArtistName } = useUserStore.getState();
      setUUID(data.uuid);
      setArtistName(data.name);
      console.log(`✅ UUID and artist name set in store`);
      
      // Verify the values were set correctly
      const storeState = useUserStore.getState();
      console.log(`🔍 Store state after SESSION_INIT:`, {
        uuid: storeState.uuid,
        artistName: storeState.artistName,
        customName: storeState.customName,
        isInitialized: storeState.isInitialized
      });
    }
  });

  addGlobalListener('connect', () => {
    const connectTime = performance.now() - startTime;
    console.log(`✅ Connected to server in ${connectTime.toFixed(2)}ms`);
    console.log(`🔍 Socket ID: ${globalSocket?.id}`);
    console.log(`🔍 Waiting for SESSION_INIT event...`);
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
  const { uuid } = useUserStore();
  
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

  const [batcher] = useState(() => new MessageBatcher(emit));
  const [progressiveLoader] = useState(() => 
    new ProgressiveLoader(
      (chunkIndex, viewport) => emit(EVENTS.REQUEST_PROGRESSIVE_STROKES, viewport),
      (chunk, chunkIndex) => {
        // Handle chunk loaded
        console.log(`📦 Progressive chunk ${chunkIndex} loaded:`, chunk.length, 'strokes');
      }
    )
  );

  // Enhanced event handlers
  useEffect(() => {
    if (!isConnected) return;

    const handleStrokeSegmentBatch = (batch: StrokeSegmentBatch) => {
      batch.segments.forEach(segment => {
        // Handle individual segments from batch
        console.log(' Processing batched segment:', segment);
      });
    };

    const handleProgressiveChunk = (chunk: ProgressiveStrokeChunk) => {
      progressiveLoader.handleChunkLoaded(chunk.strokes, chunk.chunkIndex);
    };

    on(EVENTS.STROKE_SEGMENT_BATCH, handleStrokeSegmentBatch);
    on(EVENTS.PROGRESSIVE_STROKE_CHUNK, handleProgressiveChunk);

    return () => {
      off(EVENTS.STROKE_SEGMENT_BATCH, handleStrokeSegmentBatch);
      off(EVENTS.PROGRESSIVE_STROKE_CHUNK, handleProgressiveChunk);
    };
  }, [isConnected, on, off, progressiveLoader]);

  // Enhanced emit function with batching
  const emitStrokeSegment = useCallback((segment: StrokeSegment) => {
    batcher.addSegment(uuid, segment);
  }, [batcher, uuid]);

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
    cleanupCallbacks.add(updateState);

    return () => {
      const listeners = globalEventListeners.get('stateUpdate') || [];
      const index = listeners.indexOf(updateState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      cleanupCallbacks.delete(updateState);
      
      // Clean up if no more components are using the socket
      if (cleanupCallbacks.size === 0) {
        cleanupGlobal();
        removeAllGlobalListeners();
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
    disconnect,
    emitStrokeSegment,
    requestProgressiveStrokes: (viewport: Viewport) => 
      progressiveLoader.requestVisibleChunks(viewport, []),
    getLoaderStats: () => progressiveLoader.getCacheStats()
  };
}; 