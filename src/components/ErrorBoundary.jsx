/* ErrorBoundary — si algo falla al pintar la app, en vez de una pantalla en
   blanco queda un mensaje con la salida a recargar y, siempre, las líneas de
   ayuda (sin la app, el botón "Ayuda" no está). Lo guardado en el
   dispositivo no se toca. */
import { Component } from 'react'
import { C } from '../constants/colors'
import { FONT, FONT_DISPLAY } from '../constants/tokens'
import LineaCrisis from './ui/LineaCrisis'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Ronda: error al pintar la app', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" style={{
        maxWidth: 600, margin: '0 auto', minHeight: '100vh', boxSizing: 'border-box',
        padding: '48px 24px', background: C.hoja, color: C.navy, fontFamily: FONT,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16,
      }}>
        <h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 34, lineHeight: 1.1 }}>
          Algo se trabó
        </h1>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.5, color: C.muted }}>
          Ronda tuvo un problema al abrir esta pantalla. Lo que guardaste sigue en este dispositivo. Recarga para seguir.
        </p>
        <button type="button" onClick={() => window.location.reload()} style={{
          alignSelf: 'flex-start', minHeight: 48, padding: '0 24px', borderRadius: 14, border: 'none',
          background: C.morado, color: '#FFFFFF', fontSize: 17, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Recargar Ronda
        </button>
        <p style={{ margin: '8px 0 0', fontSize: 16, lineHeight: 1.6, color: C.muted }}>
          Si estás en crisis, llama a la <LineaCrisis numero="106">Línea 106</LineaCrisis>, o al <LineaCrisis numero="123">123</LineaCrisis> si estás en peligro inmediato.
        </p>
      </div>
    )
  }
}
