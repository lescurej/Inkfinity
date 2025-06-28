import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { UUIDProvider } from './hooks/useUUID'
import { BrushProvider } from './hooks/useBrush'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <UUIDProvider>
      <BrushProvider>
        <App />
      </BrushProvider>
    </UUIDProvider>
  </React.StrictMode>,
) 