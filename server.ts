import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import { 
  EVENTS, 
  CONFIG, 
  isValidStroke, 
  isValidCursorData, 
  isValidViewport,
  isValidStrokeSegment,
  Stroke,
  CursorData,
  Viewport,
  ArtistNameChange,
  StrokeSegment,
  CanvasState,
  ServerStats,
  StrokeSegmentBatch
} from './types.js';
import { MessageBatcher } from './src/utils/messageBatcher.js';
import { ProgressiveLoader } from './src/utils/progressiveLoader.js';

const ARTISTS = [
  "Leonardo da Vinci","Michelangelo","Raphaël","Caravage","Rembrandt","Johannes Vermeer","Diego Velázquez","Francisco Goya","Claude Monet","Édouard Manet","Vincent van Gogh","Paul Cézanne","Paul Gauguin","Henri Matisse","Pablo Picasso","Salvador Dalí","Joan Miró","Marc Chagall","Wassily Kandinsky","Jackson Pollock","Mark Rothko","Andy Warhol","Roy Lichtenstein","Jean-Michel Basquiat","Frida Kahlo","Diego Rivera","Artemisia Gentileschi","Tamara de Lempicka","Georges Braque","Kazimir Malevich","Piet Mondrian","David Hockney","Gerhard Richter","Pierre Soulages","Yayoi Kusama","Takashi Murakami","Zao Wou-Ki","Jean Dubuffet","Niki de Saint Phalle","Gustav Klimt","Egon Schiele","Hergé","Albert Uderzo","René Goscinny","Morris","Franquin","Peyo","Moebius (Jean Giraud)","Enki Bilal","Tardi","Manu Larcenet","Lewis Trondheim","Marjane Satrapi","Art Spiegelman","Osamu Tezuka","Akira Toriyama","Katsuhiro Otomo","Naoki Urasawa","Hajime Isayama","Eiichiro Oda","Takehiko Inoue","Hirohiko Araki","Frank Miller","Alan Moore","Mike Mignola","Jim Lee","Saul Bass","Paul Rand","Milton Glaser","David Carson","Massimo Vignelli","Neville Brody","April Greiman","Paula Scher","Stefan Sagmeister","Jessica Walsh","Chip Kidd","Peter Saville","Barbara Kruger","Shepard Fairey","Shigeo Fukuda","Tadanori Yokoo","Alex Trochut","Christoph Niemann","Malika Favre","Jean Jullien","Oliviero Toscani","Luba Lukova","Eric Carle","Charley Harper","Mary Blair","Christoph Niemann","Banksy","Keith Haring","Laurent Durieux","Tom Whalen"
];

const MAX_CONCURRENT_CONNECTIONS = 1000;
const MAX_STROKE_SIZE = 10000;
const CLEANUP_INTERVAL = 60000; // 1 minute
const RATE_LIMIT_CLEANUP_INTERVAL = 300000; // 5 minutes
const CLEAR_COOLDOWN = 5000;

function getArtistForUUID(uuid: string): string {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % ARTISTS.length;
  return ARTISTS[index];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  // In dev, don't serve static files (Vite handles it)
  app.use(compression());
} else {
  // In production, serve static files from dist
  app.use(compression());
  app.use(express.static(__dirname));
  
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

const io = new Server(server, {
  cors: { 
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e6,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  allowUpgrades: true,
  transports: ['websocket', 'polling']
});

const canvasState: {
  strokes: Stroke[];
  maxStrokes: number;
} = {
  strokes: [],
  maxStrokes: CONFIG.MAX_STROKES
};

const connectedUsers = new Map<string, number>();
const socketIdToUuid = new Map<string, string>();
const socketHeartbeats = new Map<string, number>();
const socketLastActivity = new Map<string, number>();
const lastClearTime = new Map<string, number>();
const userViewports = new Map<string, Viewport>();
const messageThrottles = new Map<string, { [event: string]: number }>();

const HISTORY_FILE = './canvas-history.json';

const messageBatches = new Map<string, MessageBatcher>();
const progressiveLoaders = new Map<string, ProgressiveLoader>();

function getStrokesInViewport(viewport: Viewport | null): Stroke[] {
  if (!viewport) return canvasState.strokes;
  
  const { x, y, width, height, scale } = viewport;
  const padding = CONFIG.VIEWPORT_PADDING / scale;
  const minX = x - padding;
  const maxX = x + width + padding;
  const minY = y - padding;
  const maxY = y + height + padding;
  
  return canvasState.strokes.filter(stroke => {
    return stroke.points.some(point => 
      point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
    );
  });
}

async function loadHistory(): Promise<void> {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    const history = JSON.parse(data);
    canvasState.strokes = history.strokes || [];
    
    if (canvasState.strokes.length > canvasState.maxStrokes) {
      canvasState.strokes = canvasState.strokes.slice(-canvasState.maxStrokes);
    }
  } catch (error) {
    // File doesn't exist or is invalid, start with empty canvas
  }
}

async function saveHistory(): Promise<void> {
  try {
    const data: CanvasState = {
      strokes: canvasState.strokes,
      totalStrokes: canvasState.strokes.length,
      maxStrokes: canvasState.maxStrokes
    };
    await fs.writeFile(HISTORY_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Save error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

function cleanupOldStrokes(): void {
  if (canvasState.strokes.length > canvasState.maxStrokes) {
    const toRemove = canvasState.strokes.length - canvasState.maxStrokes;
    canvasState.strokes.splice(0, toRemove);
  }
}

function cleanupZombieConnections(): void {
  const now = Date.now();
  const timeout = CONFIG.HEARTBEAT_INTERVAL;
  const zombieUuids: string[] = [];
  
  for (const [uuid, lastSeen] of connectedUsers.entries()) {
    if (now - lastSeen > timeout) {
      zombieUuids.push(uuid);
    }
  }
  
  zombieUuids.forEach(uuid => {
    connectedUsers.delete(uuid);
    userViewports.delete(uuid);
    lastClearTime.delete(uuid);
    
    const socketId = Array.from(socketIdToUuid.entries())
      .find(([, userUuid]) => userUuid === uuid)?.[0];
    
    if (socketId) {
      socketIdToUuid.delete(socketId);
      socketHeartbeats.delete(socketId);
      socketLastActivity.delete(socketId);
      messageThrottles.delete(socketId);
      
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }
    
    io.emit(EVENTS.USER_DISCONNECT, uuid);
  });
}

function cleanupRateLimits(): void {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_CLEANUP_INTERVAL;
  
  for (const [socketId, throttles] of messageThrottles.entries()) {
    const activeThrottles = Object.entries(throttles)
      .filter(([, timestamp]) => timestamp > cutoff)
      .reduce((acc, [event, timestamp]) => {
        acc[event] = timestamp;
        return acc;
      }, {} as { [event: string]: number });
    
    if (Object.keys(activeThrottles).length === 0) {
      messageThrottles.delete(socketId);
    } else {
      messageThrottles.set(socketId, activeThrottles);
    }
  }
}

function isRateLimited(socketId: string, event: string, limit: number = 100): boolean {
  const now = Date.now();
  const userThrottles = messageThrottles.get(socketId) || {};
  
  if (!userThrottles[event]) {
    userThrottles[event] = now;
    messageThrottles.set(socketId, userThrottles);
    return false;
  }
  
  if (now - userThrottles[event] < limit) {
    return true;
  }
  
  userThrottles[event] = now;
  return false;
}

function validateStrokeSize(stroke: Stroke): boolean {
  return stroke.points.length <= MAX_STROKE_SIZE;
}

// Store interval IDs for cleanup
const intervals: NodeJS.Timeout[] = [];

// Capture interval IDs for proper cleanup
intervals.push(setInterval(saveHistory, CONFIG.SAVE_INTERVAL));
intervals.push(setInterval(cleanupZombieConnections, CONFIG.HEARTBEAT_INTERVAL));
intervals.push(setInterval(cleanupRateLimits, RATE_LIMIT_CLEANUP_INTERVAL));

// Add performance logging
const connectionTimes = new Map<string, number>();

// Set up periodic cleanup
setInterval(() => {
  cleanupRateLimits();
  cleanupZombieConnections();
  
  // Log memory usage
  const memUsage = process.memoryUsage();
  console.log(`🧠 Memory usage: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
}, CLEANUP_INTERVAL);

io.on('connection', (socket: Socket) => {
  const connectionStart = performance.now();
  console.log(`🔌 New connection attempt: ${socket.id}`);
  
  if (io.engine.clientsCount > MAX_CONCURRENT_CONNECTIONS) {
    console.log(`❌ Connection rejected - max clients reached: ${io.engine.clientsCount}`);
    socket.disconnect(true);
    return;
  }
  
  const serverAssignedUUID = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const defaultName = getArtistForUUID(serverAssignedUUID);
  
  console.log(`📝 Session init for ${serverAssignedUUID} (${defaultName})`);
  socket.emit(EVENTS.SESSION_INIT, { uuid: serverAssignedUUID, name: defaultName });
  
  // CRITICAL FIX: Send canvas state immediately without waiting for history request
  const canvasStateResponse: CanvasState = {
    strokes: canvasState.strokes,
    totalStrokes: canvasState.strokes.length,
    maxStrokes: canvasState.maxStrokes
  };
  
  console.log(`📊 Sending canvas state with ${canvasState.strokes.length} strokes`);
  socket.emit(EVENTS.CANVAS_STATE, canvasStateResponse);
  
  const now = Date.now();
  connectedUsers.set(serverAssignedUUID, now);
  socketIdToUuid.set(socket.id, serverAssignedUUID);
  socketHeartbeats.set(socket.id, now);
  socketLastActivity.set(socket.id, now);
  
  const connectionTime = performance.now() - connectionStart;
  connectionTimes.set(socket.id, connectionTime);
  console.log(`✅ Connection established in ${connectionTime.toFixed(2)}ms for ${serverAssignedUUID}`);
  
  const batcher = new MessageBatcher((event, data) => {
    socket.broadcast.emit(event, data);
  });
  messageBatches.set(socket.id, batcher);

  socket.on(EVENTS.STROKE_ADDED, (stroke: Stroke) => {
    if (isRateLimited(socket.id, EVENTS.STROKE_ADDED, 50)) return;
    
    if (!isValidStroke(stroke) || !validateStrokeSize(stroke)) return;
    
    const validatedStroke: Stroke = {
      ...stroke,
      id: stroke.id || `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: stroke.timestamp || Date.now()
    };
    
    canvasState.strokes.push(validatedStroke);
    cleanupOldStrokes();
    
    socket.broadcast.emit(EVENTS.STROKE_ADDED, validatedStroke);
    socketLastActivity.set(socket.id, Date.now());
  });
  
  socket.on(EVENTS.STROKE_SEGMENT, (segment: StrokeSegment) => {
    if (isRateLimited(socket.id, EVENTS.STROKE_SEGMENT, 16)) return;
    if (!isValidStrokeSegment(segment)) return;
    
    batcher.addSegment(serverAssignedUUID, segment);
    socketLastActivity.set(socket.id, Date.now());
  });
  
  socket.on(EVENTS.STROKE_SEGMENT_BATCH, (batch: StrokeSegmentBatch) => {
    if (!isValidStrokeSegmentBatch(batch)) return;
    
    batch.segments.forEach(segment => {
      socket.broadcast.emit(EVENTS.STROKE_SEGMENT, segment);
    });
  });
  
  socket.on(EVENTS.CURSOR_MOVE, (cursorData: CursorData) => {
    if (isRateLimited(socket.id, EVENTS.CURSOR_MOVE, 100)) return;
    
    if (!isValidCursorData(cursorData)) return;
    
    if (cursorData.viewport && !isValidViewport(cursorData.viewport)) return;
    const validatedCursorData: CursorData = {
      ...cursorData,
      uuid: serverAssignedUUID,
      name: cursorData.name || defaultName
    };
    
    const isFirstMove = !userViewports.has(serverAssignedUUID);

    if (isFirstMove) {
      const userConnectData: CursorData = {
        uuid: serverAssignedUUID,
        name: validatedCursorData.name,
        x: cursorData.x,
        y: cursorData.y,
        size: cursorData.size,
        color: cursorData.color,
        brush: cursorData.brush,
        viewport: cursorData.viewport
      };
      socket.broadcast.emit(EVENTS.USER_CONNECT, userConnectData);
    }
    
    if (cursorData.viewport) {
      userViewports.set(serverAssignedUUID, cursorData.viewport);
    }
    socket.broadcast.emit(EVENTS.REMOTE_CURSOR, validatedCursorData);
    socketLastActivity.set(socket.id, Date.now());
  });
  
  socket.on(EVENTS.CLEAR_CANVAS, () => {
    const now = Date.now();
    const lastClear = lastClearTime.get(serverAssignedUUID) || 0;
    
    if (now - lastClear < CLEAR_COOLDOWN) return;
    
    canvasState.strokes = [];
    lastClearTime.set(serverAssignedUUID, now);
    
    io.emit(EVENTS.CANVAS_CLEARED);
  });
  
  socket.on(EVENTS.REQUEST_STATE, () => {
    const viewport = userViewports.get(serverAssignedUUID) || null;
    const strokesInViewport = getStrokesInViewport(viewport);
    
    const canvasStateResponse: CanvasState = {
      strokes: strokesInViewport,
      totalStrokes: canvasState.strokes.length,
      maxStrokes: canvasState.maxStrokes
    };
    
    socket.emit(EVENTS.CANVAS_STATE, canvasStateResponse);
  });
  
  socket.on(EVENTS.REQUEST_DRAWING_HISTORY, () => {
    const historyStart = performance.now();
    console.log(`📚 History request from ${serverAssignedUUID}`);
    socket.emit(EVENTS.DRAWING_HISTORY, canvasState.strokes);
    const historyTime = performance.now() - historyStart;
    console.log(`✅ History sent in ${historyTime.toFixed(2)}ms (${canvasState.strokes.length} strokes)`);
  });
  
  socket.on(EVENTS.ARTIST_NAME_CHANGE, (data: ArtistNameChange) => {
    if (typeof data.name !== 'string' || data.name.length > 50) return;
    
    const validatedData: ArtistNameChange = {
      ...data,
      uuid: serverAssignedUUID
    };
    io.emit(EVENTS.ARTIST_NAME_CHANGE, validatedData);
  });
  
  socket.on(EVENTS.PING, () => {
    socket.emit(EVENTS.PONG);
    socketHeartbeats.set(socket.id, Date.now());
  });
  
  socket.on(EVENTS.GET_STATS, () => {
    const stats: ServerStats = {
      totalStrokes: canvasState.strokes.length,
      maxStrokes: canvasState.maxStrokes,
      memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      connectedClients: io.engine.clientsCount,
      activeUsers: connectedUsers.size
    };
    
    socket.emit(EVENTS.STATS, stats);
  });
  
  socket.on(EVENTS.REQUEST_PROGRESSIVE_STROKES, (viewport: Viewport) => {
    const chunks = getProgressiveChunks(viewport, canvasState.strokes);
    chunks.forEach((chunk, index) => {
      socket.emit(EVENTS.PROGRESSIVE_STROKE_CHUNK, {
        strokes: chunk,
        chunkIndex: index,
        totalChunks: chunks.length,
        viewport
      });
    });
  });
  
  socket.on('disconnect', () => {
    connectedUsers.delete(serverAssignedUUID);
    socketIdToUuid.delete(socket.id);
    socketHeartbeats.delete(socket.id);
    socketLastActivity.delete(socket.id);
    messageThrottles.delete(socket.id);
    userViewports.delete(serverAssignedUUID);
    lastClearTime.delete(serverAssignedUUID);
    
    io.emit(EVENTS.USER_DISCONNECT, serverAssignedUUID);
    
    const batcher = messageBatches.get(socket.id);
    if (batcher) {
      batcher.flushAll();
      messageBatches.delete(socket.id);
    }
  });
});

function getProgressiveChunks(viewport: Viewport, strokes: Stroke[]): Stroke[][] {
  const visibleStrokes = getStrokesInViewport(viewport);
  const chunks: Stroke[][] = [];
  
  for (let i = 0; i < visibleStrokes.length; i += CONFIG.PROGRESSIVE_CHUNK_SIZE) {
    chunks.push(visibleStrokes.slice(i, i + CONFIG.PROGRESSIVE_CHUNK_SIZE));
  }
  
  return chunks;
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, shutting down...`);
  
  try {
    // Clear intervals
    intervals.forEach(clearInterval);
    
    // Save state
    await saveHistory();
    
    // Close everything
    io.close();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
    
    // Force exit after 3 seconds
    setTimeout(() => {
      console.log('⏰ Force exit');
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('❌ Shutdown error:', error);
    process.exit(1);
  }
};

loadHistory().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  });
});

// Handle different shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
}); 