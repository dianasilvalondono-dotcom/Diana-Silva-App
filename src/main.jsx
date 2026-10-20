import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

// La analítica (PostHog) no arranca aquí: App la inicia solo cuando la
// usuaria dio la autorización de cuenta (src/lib/analytics.js).

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Un error al pintar ya no deja la app en blanco (salud-global-2 solo
        cubría el almacenamiento). */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
