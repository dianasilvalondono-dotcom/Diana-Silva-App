import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { initAnalytics } from './lib/analytics'

// Analítica de producto (no-op sin VITE_POSTHOG_KEY).
initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Un error al pintar ya no deja la app en blanco (salud-global-2 solo
        cubría el almacenamiento). */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
