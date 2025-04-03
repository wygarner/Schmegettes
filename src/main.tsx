import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WebSocketProvider } from './context/WebSocketContext.tsx'
import { FingerprintProvider } from './context/FingerprintContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FingerprintProvider>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </FingerprintProvider>
  </StrictMode>,
)
