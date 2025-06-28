const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e4,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  allowUpgrades: true,
  transports: ['websocket']
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// In-memory storage with limit of 2000 strokes
const canvasState = {
  strokes: [],
  maxStrokes: 2000
};

// Connected users management
const connectedUsers = new Map();
const socketIdToUuid = new Map();
const socketHeartbeats = new Map();
const socketLastActivity = new Map();

const HISTORY_FILE = './canvas-history.json';

// Load history on startup
async function loadHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    const history = JSON.parse(data);
    canvasState.strokes = history.strokes || [];
    
    // Ensure we don't exceed the limit when loading
    if (canvasState.strokes.length > canvasState.maxStrokes) {
      canvasState.strokes = canvasState.strokes.slice(-canvasState.maxStrokes);
      console.log('🧹 History truncated to', canvasState.maxStrokes, 'strokes');
    }
    
    console.log('📚 History loaded:', canvasState.strokes.length, 'strokes');
  } catch (error) {
    console.log('📚 No history file found, starting fresh');
  }
}

// Save history
async function saveHistory() {
  try {
    const data = {
      strokes: canvasState.strokes,
      totalStrokes: canvasState.strokes.length,
      maxStrokes: canvasState.maxStrokes,
      lastUpdate: new Date().toISOString()
    };
    await fs.writeFile(HISTORY_FILE, JSON.stringify(data, null, 2));
    console.log('💾 Saved:', canvasState.strokes.length, '/', canvasState.maxStrokes, 'strokes');
  } catch (error) {
    console.error('❌ Save error:', error.message);
  }
}

// Save every 30 seconds
setInterval(saveHistory, 30 * 1000);

// Clean up oldest strokes if necessary
function cleanupOldStrokes() {
  if (canvasState.strokes.length > canvasState.maxStrokes) {
    const toRemove = canvasState.strokes.length - canvasState.maxStrokes;
    canvasState.strokes.splice(0, toRemove);
    console.log('🧹 Removed', toRemove, 'old strokes (limit:', canvasState.maxStrokes, ')');
  }
}

function cleanupZombieConnections() {
  const now = Date.now();
  const heartbeatTimeout = 90000;
  const activityTimeout = 120000;
  
  for (const [socketId, lastHeartbeat] of socketHeartbeats.entries()) {
    if (now - lastHeartbeat > heartbeatTimeout) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        console.log('🧟 Zombie connection detected, forcing disconnection:', socketId);
        socket.disconnect(true);
      }
      socketHeartbeats.delete(socketId);
      socketLastActivity.delete(socketId);
    }
  }
  
  for (const [uuid, lastActivity] of connectedUsers.entries()) {
    if (now - lastActivity > activityTimeout) {
      connectedUsers.delete(uuid);
      io.emit('userDisconnect', uuid);
      console.log('🧹 Inactive user removed:', uuid);
    }
  }
}

// Clean up inactive users every 10 seconds
setInterval(cleanupZombieConnections, 30000);

io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);
  
  socketHeartbeats.set(socket.id, Date.now());
  socketLastActivity.set(socket.id, Date.now());
  
  // 1. Send complete state to new client
  socket.emit('canvas-state', {
    strokes: canvasState.strokes,
    totalStrokes: canvasState.strokes.length,
    maxStrokes: canvasState.maxStrokes
  });
  
  console.log('📤 State sent to', socket.id, ':', canvasState.strokes.length, 'strokes');
  
  // 2. Listen for new strokes
  socket.on('draw', (stroke) => {
    socketLastActivity.set(socket.id, Date.now());
    
    // Stroke validation
    if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) {
      return;
    }
    
    // If it's an eraser, remove intersecting strokes
    if (stroke.brush === 'eraser') {
      const eraserRadius = stroke.size / 2;
      const strokesToRemove = [];
      
      for (let i = 0; i < canvasState.strokes.length; i++) {
        const existingStroke = canvasState.strokes[i];
        if (existingStroke.brush === 'eraser') continue; // Don't remove other erasers
        
        // Check if stroke intersects with eraser
        for (const eraserPoint of stroke.points) {
          for (const strokePoint of existingStroke.points) {
            const distance = Math.sqrt(
              Math.pow(eraserPoint.x - strokePoint.x, 2) + 
              Math.pow(eraserPoint.y - strokePoint.y, 2)
            );
            if (distance <= eraserRadius + existingStroke.size / 2) {
              strokesToRemove.push(i);
              break;
            }
          }
          if (strokesToRemove.includes(i)) break;
        }
      }
      
      // Remove strokes in reverse order to avoid index issues
      for (let i = strokesToRemove.length - 1; i >= 0; i--) {
        canvasState.strokes.splice(strokesToRemove[i], 1);
      }
      
      // Broadcast removal to all clients
      io.emit('strokes-removed', { removedIndices: strokesToRemove });
      console.log('🧽 Eraser removed', strokesToRemove.length, 'strokes');
    } else {
      // Add to history
      canvasState.strokes.push({
        ...stroke,
        timestamp: Date.now(),
        id: Date.now() + Math.random() // Unique ID
      });
      
      // Clean up old strokes if necessary
      cleanupOldStrokes();
      
      // Broadcast to other clients
      socket.broadcast.emit('stroke-added', stroke);
    }
  });
  
  // 2.5. Listen for real-time segments
  socket.on('stroke-segment', (segment) => {
    socketLastActivity.set(socket.id, Date.now());
    
    // Segment validation
    if (!segment || !segment.from || !segment.to) {
      return;
    }
    
    // Broadcast immediately to other clients
    socket.broadcast.emit('stroke-segment', segment);
  });
  
  // 3. Cursor management
  socket.on('cursorMove', (cursorData) => {
    socketLastActivity.set(socket.id, Date.now());
    
    if (cursorData && cursorData.uuid) {
      // Cursor uniqueness: if another socket is already using this uuid, disconnect it
      for (const [otherSocketId, otherUuid] of socketIdToUuid.entries()) {
        if (otherUuid === cursorData.uuid && otherSocketId !== socket.id) {
          const otherSocket = io.sockets.sockets.get(otherSocketId);
          if (otherSocket) {
            otherSocket.disconnect(true);
          }
          socketIdToUuid.delete(otherSocketId);
          connectedUsers.delete(cursorData.uuid);
          io.emit('userDisconnect', cursorData.uuid);
          break;
        }
      }
      connectedUsers.set(cursorData.uuid, Date.now());
      socketIdToUuid.set(socket.id, cursorData.uuid);
      socket.broadcast.emit('remoteCursor', cursorData);
    }
  });
  
  // 4. Clear canvas
  socket.on('clear-canvas', () => {
    socketLastActivity.set(socket.id, Date.now());
    canvasState.strokes = [];
    io.emit('canvas-cleared');
    console.log('🧹 Canvas cleared by', socket.id);
  });
  
  // 5. State request (for reconnections)
  socket.on('request-state', () => {
    socketLastActivity.set(socket.id, Date.now());
    socket.emit('canvas-state', {
      strokes: canvasState.strokes,
      totalStrokes: canvasState.strokes.length,
      maxStrokes: canvasState.maxStrokes
    });
    console.log('📤 State sent to', socket.id);
  });
  
  // 6. History request for fit to content
  socket.on('requestDrawingHistory', () => {
    socketLastActivity.set(socket.id, Date.now());
    socket.emit('drawingHistory', canvasState.strokes);
    console.log('📤 History sent to', socket.id, ':', canvasState.strokes.length, 'strokes');
  });
  
  // 7. Statistics
  socket.on('get-stats', () => {
    socketLastActivity.set(socket.id, Date.now());
    socket.emit('stats', {
      totalStrokes: canvasState.strokes.length,
      maxStrokes: canvasState.maxStrokes,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      connectedClients: io.engine.clientsCount,
      activeUsers: connectedUsers.size
    });
  });
  
  socket.on('ping', () => {
    socketHeartbeats.set(socket.id, Date.now());
    socket.emit('pong');
  });
  
  socket.on('disconnect', (reason) => {
    const uuid = socketIdToUuid.get(socket.id);
    if (uuid) {
      connectedUsers.delete(uuid);
      io.emit('userDisconnect', uuid);
      socketIdToUuid.delete(socket.id);
    }
    
    socketHeartbeats.delete(socket.id);
    socketLastActivity.delete(socket.id);
    
    console.log('🔴 Client disconnected:', socket.id, '| Reason:', reason, '| Remaining clients:', io.engine.clientsCount - 1);
  });
  
  socket.on('error', (error) => {
    console.error('❌ Socket error for', socket.id, ':', error);
    socket.disconnect(true);
  });
});

// Save before quitting
process.on('SIGINT', async () => {
  console.log('💾 Saving before shutdown...');
  await saveHistory();
  process.exit(0);
});

// Periodic cleanup (every 5 minutes)
setInterval(() => {
  cleanupOldStrokes();
  console.log('📊 Current state:', canvasState.strokes.length, '/', canvasState.maxStrokes, 'strokes');
  console.log('👥 Active users:', connectedUsers.size);
  console.log('🔗 Connected sockets:', io.engine.clientsCount);
}, 5 * 60 * 1000);

server.listen(process.env.PORT || 3000, '0.0.0.0', async () => {
  await loadHistory();
  console.log('🚀 Server started on port', process.env.PORT || 3000);
  console.log('📊 Configuration:');
  console.log('   - Stroke limit:', canvasState.maxStrokes);
  console.log('   - Save interval:', '30 seconds');
  console.log('   - Cleanup:', 'automatic');
  console.log('   - History loaded:', canvasState.strokes.length, 'strokes');
  console.log('   - Cursor management:', 'enabled');
  console.log('   - User cleanup:', 'enabled');
}); 