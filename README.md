# Inkfinity - Infinite Collaborative Canvas

An infinite real-time collaborative canvas built with React, PixiJS, and Socket.IO.

## 🚀 Features

- **Infinite canvas**: Unlimited zoom and pan with virtualization
- **Real-time collaboration**: Synchronized drawing between all users
- **Remote cursors**: See other users' cursors in real time
- **Advanced brushes**: 7 different brush types (round, calligraphic, pencil, marker, eraser, rainbow, pattern)
- **WebGL rendering**: Optimal performance with PixiJS
- **Modern interface**: Responsive, intuitive React UI
- **Persistent storage**: Automatic saving to a JSON file

## 🛠️ Technologies

- **Frontend**: React 18, Vite, PixiJS
- **Backend**: Node.js, Express, Socket.IO
- **Storage**: JSON file with automatic saving
- **Package Manager**: pnpm
- **Deployment**: Render.com

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- pnpm (recommended) or npm

### Installation with pnpm (recommended)
```bash
# Install pnpm globally
npm install -g pnpm

# Clone the project
git clone <repository-url>
cd Inkfinity

# Install dependencies
pnpm install

# Development
pnpm dev

# Production
pnpm build
pnpm start
```

### Installation with npm
```bash
# Clone the project
git clone <repository-url>
cd Inkfinity

# Install dependencies
npm install

# Development
npm run dev

# Production
npm run build
npm start
```

## 🎮 Usage

### Navigation
- **Trackpad**: Move the canvas
- **Mouse wheel**: Zoom in/out
- **Ctrl+Click**: Manual pan

### Drawing tools
- **Color**: Color picker
- **Size**: Slider from 1 to 20 pixels
- **Brush type**: 7 different styles
- **Clear**: Button to clear the entire canvas

## 🏗️ Architecture

```
src/
├── components/          # React components
│   ├── Canvas.tsx      # Main canvas with PixiJS
│   ├── Controls.tsx    # Controls panel
│   ├── CursorPreview.tsx # Cursor preview
│   ├── GPSDisplay.tsx  # Coordinates display
│   ├── RemoteCursors.tsx # Other users' cursors
│   └── CanvasGrid.tsx  # Reference grid
├── hooks/              # Custom hooks
│   ├── useCanvas.tsx   # Canvas logic
│   ├── useBrush.tsx    # Brush management
│   ├── useCanvasSocket.ts # Socket.IO communication
│   └── useUUID.tsx     # UUID generation
├── store/              # Global state
│   └── canvasStore.ts  # Zustand store
├── utils/              # Utilities
│   ├── brushEngine.ts  # Brush engine
│   └── uuid.ts         # UUID generation
├── App.tsx             # Main component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## 🔧 Configuration

### Environment variables (optional)

The project works out of the box. To customize:

```bash
# Server configuration (optional)
PORT=3000
HOST=localhost
```

### Automatic configuration

- **Port**: 3000 by default (configurable via PORT)
- **Storage**: `canvas-history.json` file with auto-save every 30 seconds
- **Memory limit**: 2000 strokes maximum in memory
- **Cleanup**: Automatic removal of oldest strokes

## 🚀 Deployment on Render.com

### Automatic deployment

1. Push the code to GitHub
2. Connect the repository to Render
3. Render will automatically detect the `render.yaml` file
4. Deployment will be automatic

### Render environment variables

- `PORT`: Automatically set by Render
- `NODE_ENV`: `production` (automatic)

## 📝 Available scripts

```bash
# Development
pnpm dev          # Start server + client in dev mode
pnpm server       # Start only the server
pnpm client       # Start only the Vite client

# Production
pnpm build        # Build the React app
pnpm start        # Start the production server
pnpm preview      # Preview the local build

# Installation
pnpm install      # Install dependencies
```

## 🔍 Development

### Data structure

```javascript
{
  points: [           // Stroke points
    { x: Number, y: Number },
    { x: Number, y: Number }
  ],
  color: String,      // Stroke color (hex)
  size: Number,       // Brush size
  brush: String,      // Brush type
  timestamp: Number,  // Creation timestamp
  id: String         // Unique stroke ID
}
```

### Real-time synchronization

- **WebSocket**: Instant bidirectional communication
- **Broadcast**: Each stroke is sent to all connected clients
- **Full state**: New users receive the complete history
- **Persistence**: Automatic saving every 30 seconds

### Performance

- **Memory limit**: 2000 strokes max to prevent overload
- **Automatic cleanup**: Oldest strokes are removed
- **WebGL**: Optimized rendering with PixiJS
- **Compression**: Optimized data for network transmission

## 📝 License

MIT License - See the LICENSE file for details. 