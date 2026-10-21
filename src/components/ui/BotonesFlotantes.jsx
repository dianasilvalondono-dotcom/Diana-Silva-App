/* Botones flotantes, abajo a la derecha (como hasta el 12-oct-2026):
   - BotonEmergencia: el corazón que late suave. Abre la misma Ayuda que la
     palabra «Ayuda» del encabezado (abrirAyuda en App): el 123, la Línea 106,
     la respiración y tus sentidos. Va en todas las pantallas: la app,
     «Cargando...», entrar o crear cuenta, la contraseña nueva, las
     autorizaciones y la bienvenida.
   - BotonTuRonda: Tu Ronda, la asistente, encima del corazón. Solo en la app
     (con sesión y autorizaciones respondidas).
   Los dos quedan por encima del menú de abajo (conMenu) sin taparlo y por
   debajo de todo diálogo: la hoja de un plan (300), los check-in (999), la
   Ayuda (1000) y los avisos (10000). Siguen montados con un diálogo abierto
   (inertes): al cerrarlo, el foco vuelve al botón que lo abrió. Con la hoja
   de un plan abierta, el corazón sube por encima de ella (encima: 400).
   Dónde van y su nombre visible lo dicen las clases de App.css: en el
   celular, pegados al borde derecho; en pantalla ancha, a la derecha de la
   columna, sin tapar nada, y con su nombre cuando cabe.
   Las pantallas dejan abajo ESPACIO_FLOTANTES (src/constants/flotantes.js)
   para llegar con scroll al final de lo que tienen sin que un botón lo tape. */
import { C } from '../../constants/colors'
import { TAMANO_FLOTANTE, SEPARACION_FLOTANTES, BASE_CON_MENU, BASE_SIN_MENU, BASE_BIENVENIDA, zonaSegura } from '../../constants/flotantes'

// Lo que el lector de pantalla dice del corazón. Empieza por el nombre que
// se ve en pantalla ancha (WCAG 2.5.3).
const NOMBRE_EMERGENCIA = '¿Necesitas apoyo?'
const ETIQUETA_EMERGENCIA = `${NOMBRE_EMERGENCIA} Emergencia: Línea 106, 123, respiración y tus sentidos`

export function BotonEmergencia({ onAbrir, conMenu = false, enBienvenida = false, encima = false, inerte = false }) {
  const abajo = enBienvenida ? `${BASE_BIENVENIDA}px` : zonaSegura(conMenu ? BASE_CON_MENU : BASE_SIN_MENU)
  return (
    <button
      id="boton-emergencia"
      type="button"
      className="flotante boton-emergencia"
      inert={inerte || undefined}
      onClick={onAbrir}
      aria-label={ETIQUETA_EMERGENCIA}
      style={{
        zIndex: encima ? 400 : 200,
        bottom: abajo,
        background: C.morado, color: '#FFFFFF', border: 'none',
        boxShadow: '0 4px 20px rgba(20,24,51,0.5)',
      }}
    >
      <span aria-hidden="true" style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(255,255,255,0.22)', border: '2px solid rgba(255,255,255,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 18, height: 18 }}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#FFFFFF" />
        </svg>
      </span>
      <span aria-hidden="true" className="flotante-nombre">{NOMBRE_EMERGENCIA}</span>
    </button>
  )
}

/* El anillo de Ronda; en pantalla ancha, además la palabra «Tu Ronda». */
export function BotonTuRonda({ onAbrir, inerte = false }) {
  return (
    <button
      id="boton-tu-ronda"
      type="button"
      className="flotante flotante-tu-ronda"
      inert={inerte || undefined}
      onClick={onAbrir}
      aria-label="Tu Ronda, tu asistente"
      style={{
        zIndex: 200,
        bottom: zonaSegura(BASE_CON_MENU + TAMANO_FLOTANTE + SEPARACION_FLOTANTES),
        background: C.card, color: C.morado, border: `1.5px solid ${C.morado}`,
        boxShadow: '0 4px 16px rgba(20,24,51,0.22)',
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 28, height: 28, flexShrink: 0 }}>
        <circle cx="12" cy="12" r="9" fill="none" stroke={C.morado} strokeWidth="2" />
        <circle cx="12" cy="12" r="3.5" fill={C.morado} />
      </svg>
      <span aria-hidden="true" className="flotante-nombre">Tu Ronda</span>
    </button>
  )
}
