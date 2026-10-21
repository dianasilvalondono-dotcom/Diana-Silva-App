/* Botones flotantes, abajo a la derecha (como hasta el 12-oct-2026):
   - BotonEmergencia: el corazón que late suave. Abre la misma Ayuda que la
     palabra «Ayuda» del encabezado (abrirAyuda en App): el 123, la Línea 106,
     la respiración y tus sentidos. Va en todas las pantallas que tienen
     Ayuda: la app, «Cargando...», entrar o crear cuenta, la contraseña nueva
     y las autorizaciones.
   - BotonTuRonda: Tu Ronda, la asistente, encima del corazón. Solo en la app
     (con sesión y autorizaciones respondidas).
   Los dos quedan por encima del menú de abajo (conMenu) sin taparlo y por
   debajo de todo diálogo: la hoja de un plan (300), los check-in (999), la
   Ayuda (1000) y los avisos (10000). Siguen montados con un diálogo abierto
   (inertes): al cerrarlo, el foco vuelve al botón que lo abrió.
   Las pantallas dejan abajo ESPACIO_FLOTANTES (src/constants/flotantes.js)
   para llegar con scroll al final de lo que tienen sin que un botón lo tape. */
import { C } from '../../constants/colors'
import { TAMANO_FLOTANTE, SEPARACION_FLOTANTES, BASE_CON_MENU, BASE_SIN_MENU, zonaSegura } from '../../constants/flotantes'

// Pegados al borde derecho de la columna de 600 px (en el celular, a 16 px
// del borde de la pantalla).
const DERECHA = 'max(16px, calc(50% - 284px))'

export function BotonEmergencia({ onAbrir, conMenu = false, inerte = false }) {
  return (
    <button
      id="boton-emergencia"
      type="button"
      className="boton-emergencia"
      inert={inerte || undefined}
      onClick={onAbrir}
      aria-label="Emergencia: Línea 106, 123, respiración y tus sentidos"
      style={{
        position: 'fixed', zIndex: 200, right: DERECHA,
        bottom: zonaSegura(conMenu ? BASE_CON_MENU : BASE_SIN_MENU),
        width: TAMANO_FLOTANTE, height: TAMANO_FLOTANTE, borderRadius: '50%',
        padding: 0, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.morado,
        boxShadow: '0 4px 20px rgba(20,24,51,0.5)',
      }}
    >
      <span aria-hidden="true" style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'rgba(255,255,255,0.22)', border: '2px solid rgba(255,255,255,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18 }}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#FFFFFF" />
        </svg>
      </span>
    </button>
  )
}

/* En el celular, un círculo con el anillo de Ronda; en pantalla ancha
   (conNombre), además la palabra «Tu Ronda». */
export function BotonTuRonda({ onAbrir, conNombre = false, inerte = false }) {
  return (
    <button
      id="boton-tu-ronda"
      type="button"
      inert={inerte || undefined}
      onClick={onAbrir}
      aria-label="Tu Ronda, tu asistente"
      style={{
        position: 'fixed', zIndex: 200, right: DERECHA,
        bottom: zonaSegura(BASE_CON_MENU + TAMANO_FLOTANTE + SEPARACION_FLOTANTES),
        height: TAMANO_FLOTANTE, minWidth: TAMANO_FLOTANTE,
        width: conNombre ? 'auto' : TAMANO_FLOTANTE,
        padding: conNombre ? '0 20px 0 14px' : 0,
        borderRadius: TAMANO_FLOTANTE / 2,
        border: `1.5px solid ${C.morado}`, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: C.card, color: C.morado, fontFamily: 'inherit',
        boxShadow: '0 4px 16px rgba(20,24,51,0.22)',
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 28, height: 28, flexShrink: 0 }}>
        <circle cx="12" cy="12" r="9" fill="none" stroke={C.morado} strokeWidth="2" />
        <circle cx="12" cy="12" r="3.5" fill={C.morado} />
      </svg>
      {conNombre && <span aria-hidden="true" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>Tu Ronda</span>}
    </button>
  )
}
