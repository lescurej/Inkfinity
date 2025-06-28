import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
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
          'shaders': [
            './src/brushShaders/calligraphic.frag',
            './src/brushShaders/calligraphic.vert',
            './src/brushShaders/charcoal.frag',
            './src/brushShaders/charcoal.vert',
            './src/brushShaders/crayon.frag',
            './src/brushShaders/crayon.vert',
            './src/brushShaders/gouache.frag',
            './src/brushShaders/gouache.vert',
            './src/brushShaders/highlighter.frag',
            './src/brushShaders/highlighter.vert',
            './src/brushShaders/ink.frag',
            './src/brushShaders/ink.vert',
            './src/brushShaders/marker.frag',
            './src/brushShaders/marker.vert',
            './src/brushShaders/oil.frag',
            './src/brushShaders/oil.vert',
            './src/brushShaders/paperGrain.frag',
            './src/brushShaders/paperGrain.vert',
            './src/brushShaders/pastel.frag',
            './src/brushShaders/pastel.vert',
            './src/brushShaders/pencil.frag',
            './src/brushShaders/pencil.vert',
            './src/brushShaders/watercolor.frag',
            './src/brushShaders/watercolor.vert'
          ],
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