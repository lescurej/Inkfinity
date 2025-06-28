import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 👈 This makes it accessible over LAN
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'pixi': ['pixi.js', '@pixi/react'],
          'canvas-core': [
            './src/components/Canvas.tsx',
            './src/components/CanvasGrid.tsx',
            './src/hooks/useCanvas.tsx',
            './src/utils/brushEngine.ts',
            './src/utils/bitmapBrush.ts',
            './src/utils/drawStrokeWithPerfectFreehand.ts',
            './src/utils/shaderManager.ts',
            './src/utils/watercolorSimulation.ts',
            './src/utils/paperGrainFilter.ts'
          ],
          'ui-components': [
            './src/components/Controls.tsx',
            './src/components/ColorPickerWheel.tsx',
            './src/components/CursorPreview.tsx',
            './src/components/GPSDisplay.tsx',
            './src/components/RemoteCursors.tsx'
          ],
          'collaboration': [
            './src/hooks/useCanvasSocket.ts',
            './src/hooks/useSocket.ts',
            'socket.io-client'
          ],
          'state': [
            './src/store/canvasStore.ts',
            'zustand'
          ]
        }
      }
    }
  }
}) 