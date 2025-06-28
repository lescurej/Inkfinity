# Implementation Documentation

## Current Architecture: WebSocket + JSON File Storage

### Overview
Inkfinity uses a **centralized WebSocket server** with **file-based persistence** for real-time collaborative drawing.

### Server Implementation (`server.js`)

#### Core Features
- **WebSocket Server**: Socket.IO for real-time communication
- **In-Memory Storage**: 2000 strokes limit with automatic cleanup
- **File Persistence**: `canvas-history.json` with 30-second auto-save
- **Real-time Broadcasting**: Instant stroke synchronization

#### Key Components

```javascript
// Storage structure
const canvasState = {
  strokes: [],        // Array of stroke objects
  maxStrokes: 2000    // Memory limit
};

// User tracking
const connectedUsers = new Map();
const socketIdToUuid = new Map();
```

#### Event Flow

1. **New User Connection**:
   ```javascript
   socket.emit('canvas-state', {
     strokes: canvasState.strokes,
     totalStrokes: canvasState.strokes.length,
     maxStrokes: canvasState.maxStrokes
   });
   ```

2. **Stroke Broadcasting**:
   ```javascript
   socket.on('new-stroke', (stroke) => {
     canvasState.strokes.push(stroke);
     cleanupOldStrokes();
     socket.broadcast.emit('stroke-added', stroke);
   });
   ```

3. **Cursor Tracking**:
   ```javascript
   socket.on('cursorMove', (cursorData) => {
     socket.broadcast.emit('remoteCursor', cursorData);
   });
   ```

### Client Implementation

#### Socket Hook (`useCanvasSocket.ts`)
- **Connection Management**: Automatic reconnection
- **Event Handling**: Canvas state, strokes, cursors
- **Statistics**: Real-time server stats

#### Canvas Integration (`Canvas.tsx`)
- **State Loading**: Receives complete canvas state on connection
- **Real-time Drawing**: Processes incoming strokes immediately
- **Remote Cursors**: Displays other users' cursors

### Data Structure

#### Stroke Object
```javascript
{
  points: [           // Array of coordinate objects
    { x: Number, y: Number },
    { x: Number, y: Number }
  ],
  color: String,      // Hex color (#RRGGBB)
  size: Number,       // Brush size in pixels
  brush: String,      // Brush type identifier
  timestamp: Number,  // Unix timestamp
  id: String         // Unique identifier
}
```

#### Cursor Object
```javascript
{
  uuid: String,       // User identifier
  x: Number,         // World X coordinate
  y: Number,         // World Y coordinate
  size: Number,      // Brush size
  color: String,     // Brush color
  brush: String      // Brush type
}
```

### Performance Optimizations

#### Memory Management
- **Stroke Limit**: 2000 strokes maximum in memory
- **Automatic Cleanup**: Removes oldest strokes when limit exceeded
- **Efficient Storage**: Optimized data structures

#### Network Optimization
- **WebSocket**: Persistent connection for low latency
- **Broadcast Only**: No point-to-point messaging overhead
- **Compressed Data**: Minimal payload size

#### Rendering Performance
- **WebGL**: PixiJS for hardware-accelerated rendering
- **Batch Drawing**: Efficient stroke rendering
- **Viewport Culling**: Only render visible strokes

### Persistence Strategy

#### File Storage
- **Format**: JSON with human-readable structure
- **Auto-save**: Every 30 seconds
- **Recovery**: Loads on server restart
- **Backup**: Simple file-based backup

#### Data Integrity
- **Validation**: Stroke data validation before storage
- **Error Handling**: Graceful degradation on file errors
- **Atomic Writes**: Safe file writing operations

### Scalability Considerations

#### Current Limits
- **Memory**: 2000 strokes per canvas
- **Users**: Unlimited concurrent users
- **Performance**: Optimized for 10-50 concurrent users

#### Future Improvements
- **Room System**: Multiple canvas rooms
- **Stroke Compression**: Reduce memory footprint
- **Database Migration**: MongoDB for larger scale

### Deployment

#### Render.com Configuration
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment**: Automatic port detection
- **No Database**: File-based storage only

#### Local Development
- **Server**: `npm run server` (port 3000)
- **Client**: `npm run client` (port 5173)
- **Full Stack**: `npm run dev` (both)

### Monitoring

#### Server Statistics
```javascript
{
  totalStrokes: Number,      // Current stroke count
  maxStrokes: Number,        // Memory limit
  memoryUsage: String,       // Heap usage
  connectedClients: Number,  // Active connections
  activeUsers: Number        // Users with cursors
}
```

#### Health Checks
- **Connection Status**: Real-time client count
- **Memory Usage**: Automatic monitoring
- **File Operations**: Save/load status logging 