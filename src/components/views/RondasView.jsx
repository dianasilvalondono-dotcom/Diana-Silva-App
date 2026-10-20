/* RondasView — "Afuera": Ronda como curadora de vida real.
   Ronda no organiza eventos ni tiene sedes: elige planes y los presenta
   con su cédula (por qué está aquí, para quién es, cómo llegas).

   Diseño aprobado por Diana (oct 2026): telón morado arriba (lo pinta
   App.jsx) y hoja clara redondeada con el contenido. Aquí van el plan
   sugerido, los filtros de sala, la lista de planes y "el plan abierto",
   que sube como hoja desde abajo sin cambiar de pantalla.
   Rosado y verde solo en etiquetas pequeñas. El color nunca va solo:
   siempre acompañado de texto. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { C } from '../../constants/colors'
import { FONT_DISPLAY } from '../../constants/tokens'
import { CIUDADES, SALAS, ACCESO, MODALIDAD, CIUDAD_KEY, CIUDAD_POR_DEFECTO, ciudadValida } from '../../constants/curaduria'
import { load, save } from '../../utils/helpers'
import { getPlanes, getReservas, getReservasLocales, reservarCupo, liberarCupo, enviarReporte, enviarReportesPendientes } from '../../lib/curaduria'
import { track } from '../../lib/analytics'
import LineaCrisis from '../ui/LineaCrisis'

const salaLabel = (id) => SALAS.find(s => s.id === id)?.label || id

/* "1 cupo", "8 cupos"; si se sabe cuántos quedan, eso (rondas-10). */
const textoCupos = (n) => (n === 1 ? '1 cupo' : `${n} cupos`)
const cuposVisibles = (plan) => {
  if (plan.restantes != null) {
    if (plan.restantes === 0) return 'Cupos llenos'
    return `${plan.restantes === 1 ? 'Queda' : 'Quedan'} ${textoCupos(plan.restantes)}`
  }
  return plan.cupos ? textoCupos(plan.cupos) : ''
}
const sinCupos = (plan) => plan.restantes === 0

/* Con fecha real, el día exacto en hora de Colombia: "Jueves 22 oct" y
   "6:00 p. m." (rondas-11). Sin fecha (los ejemplos), el texto 'cuando'. */
const FORMATO_DIA = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'short' })
const FORMATO_HORA = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' })
const fechaDe = (plan) => {
  if (!plan.fecha) return null
  const d = new Date(plan.fecha)
  return Number.isNaN(d.getTime()) ? null : d
}
const mayuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1)
/* → ["Jueves", "22 oct", "6:00 p. m."] o null */
const partesFecha = (plan) => {
  const d = fechaDe(plan)
  if (!d) return null
  const p = Object.fromEntries(FORMATO_DIA.formatToParts(d).map(x => [x.type, x.value]))
  return [mayuscula(p.weekday), `${p.day} ${p.month}`, FORMATO_HORA.format(d)]
}
const cuandoVisible = (plan) => {
  const f = partesFecha(plan)
  return f ? `${f[0]} ${f[1]}, ${f[2]}` : plan.cuando
}

const ENFOCABLES = 'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
/* Con el diálogo abierto, Tab y Shift+Tab dan la vuelta dentro de él y no
   se van a lo que queda detrás (rondas-15). */
function useTrampaFoco(ref, activo) {
  useEffect(() => {
    if (!activo) return
    const alTeclear = (e) => {
      const el = ref.current
      if (e.key !== 'Tab' || !el) return
      const focos = [...el.querySelectorAll(ENFOCABLES)]
      if (!focos.length) return
      const primero = focos[0]
      const ultimo = focos[focos.length - 1]
      const dentro = el.contains(document.activeElement)
      if (e.shiftKey && (!dentro || document.activeElement === primero)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (!dentro || document.activeElement === ultimo)) {
        e.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [ref, activo])
}

/* El aviso se cierra solo y también con su botón (rondas-4). */
function TarjetaAviso({ texto, onCerrar }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 4,
      background: C.navy, color: '#FFFFFF', borderRadius: 16, padding: '6px 4px 6px 18px',
      boxShadow: '0 10px 32px rgba(20,24,51,0.30)', fontSize: 15, lineHeight: 1.45,
    }}>
      <span style={{ flex: 1, padding: '10px 0' }}>{texto}</span>
      <button onClick={onCerrar} aria-label="Cerrar aviso" style={{
        width: 44, height: 44, flexShrink: 0, border: 'none', background: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}

const eyebrow = (color) => ({
  fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color,
})

/* Rosado para las salas de conversación, verde para las de hacer. */
const SALA_TONO = {
  salon: 'rosa', mesa: 'rosa', acompanamiento: 'rosa',
  taller: 'verde', movimiento: 'verde', ciudad: 'verde',
}
const pillStyle = (tono) => {
  const tonos = {
    rosa: { background: C.orquideaClara, color: C.morado },
    rosaFuerte: { background: C.orquidea, color: C.morado },
    verde: { background: C.sageClara, color: C.olivaOscura },
    agua: { background: C.aguaClara, color: C.navy },
  }
  return {
    ...tonos[tono],
    fontSize: 12, fontWeight: 600, borderRadius: 10, padding: '4px 10px',
    whiteSpace: 'nowrap', display: 'inline-block',
  }
}

/* "Jueves, 6:00 p. m." → ["Jue", "6:00 p. m."] */
const partirCuando = (cuando = '') => {
  const i = cuando.indexOf(', ')
  if (i === -1) return [cuando, '']
  return [cuando.slice(0, 3), cuando.slice(i + 2).replace(/ /g, '\u00a0')]
}

function Etiquetas({ plan }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <span style={pillStyle('rosaFuerte')}>{ACCESO[plan.acceso]}</span>
      <span style={pillStyle('verde')}>✓ Anfitriona verificada · nivel {plan.verificacion}</span>
      {plan.modalidad === 'en-linea' && <span style={pillStyle('agua')}>{MODALIDAD['en-linea']}</span>}
      {plan.ejemplo && (
        <span style={{ ...pillStyle('agua'), background: 'transparent', border: `1px solid ${C.border}`, color: C.muted }}>Ejemplo</span>
      )}
    </div>
  )
}

/* ── Selector de ciudad (compacto) ── */
function SelectorCiudad({ ciudad, onChange }) {
  return (
    <div role="tablist" aria-label="Ciudad" style={{
      display: 'inline-flex', padding: 3, borderRadius: 14, background: C.card,
      border: `1px solid ${C.border}`,
    }}>
      {CIUDADES.map(c => {
        const active = ciudad === c.id
        return (
          <button key={c.id} role="tab" aria-selected={active} onClick={() => onChange(c.id)} style={{
            minHeight: 40, padding: '0 16px', borderRadius: 11, border: 'none', cursor: 'pointer',
            background: active ? C.morado : 'transparent', color: active ? '#FFFFFF' : C.muted,
            fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
          }}>{c.label}</button>
        )
      })}
    </div>
  )
}

/* ── El plan sugerido ── */
function PlanDestacado({ plan, reservado, onAbrir }) {
  return (
    <article style={{
      background: C.card, border: '1px solid rgba(20,24,51,0.08)', borderRadius: 20, padding: 20,
    }}>
      <div style={eyebrow(C.morado)}>{salaLabel(plan.sala)} · {plan.barrio}</div>
      <h2 style={{ margin: '10px 0 6px', fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 600, lineHeight: 1.05, color: C.navy }}>
        {plan.titulo}
      </h2>
      <div style={{ fontSize: 15, color: C.muted, marginBottom: 12 }}>
        {cuandoVisible(plan)} · con {plan.anfitriona}{cuposVisibles(plan) ? ` · ${cuposVisibles(plan)}` : ''}
      </div>
      <Etiquetas plan={plan} />
      <p style={{
        margin: '14px 0 16px', paddingTop: 12, borderTop: '1px solid rgba(20,24,51,0.12)',
        fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: 20, lineHeight: 1.3, color: C.navy,
      }}>
        {plan.cedula.porque}
      </p>
      {reservado && (
        <div style={{ fontSize: 14, fontWeight: 600, color: C.oliva, marginBottom: 10 }}>Tu cupo está apartado ✓</div>
      )}
      <button onClick={() => onAbrir(plan)} style={{
        width: '100%', height: 50, border: 'none', borderRadius: 14, cursor: 'pointer',
        background: C.morado, color: '#FFFFFF', fontSize: 16, fontWeight: 600,
        letterSpacing: '0.03em', fontFamily: 'inherit',
      }}>
        Ver plan
      </button>
    </article>
  )
}

/* ── Un plan de la lista ── */
function FilaPlan({ plan, reservado, onAbrir }) {
  const fecha = partesFecha(plan)
  const [dia, hora] = fecha ? [`${fecha[0].slice(0, 3)} ${fecha[1]}`, fecha[2].replace(/ /g, '\u00a0')] : partirCuando(plan.cuando)
  return (
    <li style={{ borderTop: '1px solid rgba(20,24,51,0.12)' }}>
      <button onClick={() => onAbrir(plan)} style={{
        width: '100%', display: 'flex', gap: 16, padding: '14px 0', background: 'none', border: 'none',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: C.navy,
      }}>
        <span style={{ width: 84, flexShrink: 0, ...eyebrow(C.oliva), fontSize: 11, letterSpacing: '0.1em', lineHeight: 1.6 }}>
          {dia}<br />{hora}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, lineHeight: 1.1 }}>
            {plan.titulo}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6, fontSize: 14, color: C.muted }}>
            <span style={pillStyle(SALA_TONO[plan.sala] || 'rosa')}>{salaLabel(plan.sala)}</span>
            {plan.barrio} · {ACCESO[plan.acceso]}
            {reservado && <span style={{ color: C.oliva, fontWeight: 600 }}>· Cupo apartado ✓</span>}
          </span>
        </span>
      </button>
    </li>
  )
}

/* ── El plan abierto: hoja que sube desde abajo ── */
function HojaPlan({ plan, reservado, ocupado, aviso, onCerrarAviso, onCerrar, onReservar, onLiberar, onReportar, onIrAdentro }) {
  const cerrarRef = useRef(null)
  const hojaRef = useRef(null)
  const reservarRef = useRef(null)
  const avisoRef = useRef(null)
  const [confirmandoLiberar, setConfirmandoLiberar] = useState(false)
  useEffect(() => {
    if (aviso) avisoRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [aviso])
  useEffect(() => { cerrarRef.current?.focus() }, [])
  useTrampaFoco(hojaRef, true)
  const lleno = !reservado && sinCupos(plan)
  const inactivo = reservado || lleno || ocupado
  // Al cerrar el aviso o la pregunta de liberar, el foco vuelve al botón del cupo.
  const cerrarAviso = () => {
    onCerrarAviso()
    setTimeout(() => reservarRef.current?.focus(), 0)
  }
  const terminarLiberar = async (liberar) => {
    if (liberar) await onLiberar(plan)
    setConfirmandoLiberar(false)
    setTimeout(() => reservarRef.current?.focus(), 0)
  }
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  return (
    <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
      <section
        ref={hojaRef}
        role="dialog" aria-modal="true" aria-labelledby="plan-abierto-titulo"
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0,
          top: 'calc(env(safe-area-inset-top, 0px) + 100px)',
          width: '100%', maxWidth: 600, background: C.hoja,
          borderRadius: '24px 24px 0 0', boxShadow: '0 -12px 32px rgba(20,24,51,0.18)',
          overflowY: 'auto', overscrollBehavior: 'contain',
          padding: '12px 22px calc(env(safe-area-inset-bottom, 0px) + 32px)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(20,24,51,0.2)', marginLeft: 'calc(50% - 20px)' }} />
          <button ref={cerrarRef} onClick={onCerrar} aria-label="Cerrar el plan" style={{
            width: 44, height: 44, border: 'none', background: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke={C.navy} strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div style={eyebrow(C.morado)}>{salaLabel(plan.sala)} · {plan.barrio}</div>
        <h2 id="plan-abierto-titulo" style={{ margin: '10px 0 6px', fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 600, lineHeight: 1.02, color: C.navy }}>
          {plan.titulo}
        </h2>
        <div style={{ fontSize: 15, color: C.muted, marginBottom: 12 }}>
          {cuandoVisible(plan)} · con {plan.anfitriona}{cuposVisibles(plan) ? ` · ${cuposVisibles(plan)}` : ''}
        </div>
        <Etiquetas plan={plan} />

        <dl style={{ margin: '20px 0 0', borderTop: '1px solid rgba(20,24,51,0.14)' }}>
          {[
            ['Por qué está aquí', plan.cedula.porque],
            ['Para quién es', plan.cedula.paraQuien],
            ['Cómo llegas', plan.cedula.comoLlegas],
          ].map(([label, texto]) => (
            <div key={label} style={{ padding: '14px 0', borderBottom: '1px solid rgba(20,24,51,0.14)' }}>
              <dt style={{ ...eyebrow(C.oliva), fontSize: 11 }}>{label}</dt>
              <dd style={{ margin: '6px 0 0', fontFamily: FONT_DISPLAY, fontSize: 21, lineHeight: 1.3, color: C.navy }}>{texto}</dd>
            </div>
          ))}
        </dl>

        <button onClick={onIrAdentro} style={{
          width: '100%', display: 'flex', gap: 12, alignItems: 'center', marginTop: 18, padding: '14px 16px',
          background: C.agua, color: C.navy, border: 'none', borderRadius: 14, cursor: 'pointer',
          fontSize: 15, lineHeight: 1.4, textAlign: 'left', fontFamily: 'inherit',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7" fill="none" stroke={C.navy} strokeWidth="1.6" strokeLinecap="round" /></svg>
          <span><b style={{ fontWeight: 600 }}>Antes de ir:</b> 2 minutos para llegar tranquila.</span>
        </button>

        {/* aria-disabled y no disabled: el foco no se pierde al apartar (rondas-15). */}
        <button
          ref={reservarRef}
          onClick={() => !inactivo && onReservar(plan)}
          aria-disabled={inactivo}
          style={{
            width: '100%', height: 52, marginTop: 18, border: 'none', borderRadius: 14,
            background: reservado ? C.oliva : lleno ? C.border : C.morado,
            color: lleno ? C.muted : '#FFFFFF',
            fontSize: 16, fontWeight: 600, letterSpacing: '0.03em', fontFamily: 'inherit',
            cursor: inactivo ? 'default' : 'pointer',
          }}>
          {reservado ? 'Tu cupo está apartado ✓'
            : lleno ? 'Cupos llenos'
            : ocupado ? 'Apartando…'
            : 'Apartar mi cupo'}
        </button>
        {/* El aviso de la reserva va debajo del botón: no lo tapa (rondas-4) ni
            lo empuja fuera de la vista mientras tiene el foco; al aparecer se
            trae a la vista dentro de la hoja. */}
        <div ref={avisoRef} role="status" aria-live="polite" style={{ scrollMarginBottom: 16 }}>
          {aviso && <div style={{ marginTop: 12 }}><TarjetaAviso texto={aviso} onCerrar={cerrarAviso} /></div>}
        </div>
        {/* "Ya no puedo ir": se puede liberar el cupo, con una pregunta antes (rondas-9). */}
        {reservado && !confirmandoLiberar && (
          <button onClick={() => setConfirmandoLiberar(true)} style={{
            display: 'block', margin: '6px auto 0', minHeight: 44, padding: '0 12px', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 15, fontWeight: 500, color: C.muted, fontFamily: 'inherit',
            textDecoration: 'underline', textUnderlineOffset: 2,
          }}>
            Ya no puedo ir · liberar mi cupo
          </button>
        )}
        {reservado && confirmandoLiberar && (
          <div role="group" aria-labelledby="liberar-pregunta" style={{
            marginTop: 10, padding: 16, borderRadius: 14, background: C.card, border: `1px solid ${C.border}`,
          }}>
            <div id="liberar-pregunta" style={{ fontSize: 15, color: C.navy, lineHeight: 1.45 }}>
              ¿Liberas tu cupo? Queda libre para otra persona.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button autoFocus onClick={() => terminarLiberar(false)} disabled={ocupado} style={{
                flex: 1, minHeight: 48, borderRadius: 14, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.muted, fontSize: 15, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>No, lo mantengo</button>
              <button onClick={() => terminarLiberar(true)} disabled={ocupado} style={{
                flex: 1, minHeight: 48, borderRadius: 14, border: 'none',
                background: C.morado, color: '#FFFFFF', fontSize: 15, fontWeight: 600,
                fontFamily: 'inherit', cursor: ocupado ? 'default' : 'pointer',
              }}>{ocupado ? 'Liberando…' : 'Sí, liberar'}</button>
            </div>
          </div>
        )}
        <button onClick={() => onReportar(plan)} style={{
          display: 'block', margin: '10px auto 0', padding: 12, background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 15, fontWeight: 500, color: C.morado, fontFamily: 'inherit',
        }}>
          Contarle algo a la curadora
        </button>
      </section>
    </div>
  )
}

export default function RondasView({ user, onIrAdentro }) {
  // La ciudad elegida se recuerda al recargar y al volver de Adentro (rondas-12).
  const [ciudad, setCiudad] = useState(() => ciudadValida(load(CIUDAD_KEY, CIUDAD_POR_DEFECTO)))
  const [filtro, setFiltro] = useState('todas')
  const [data, setData] = useState(null)
  const [reservas, setReservas] = useState(() => getReservasLocales())
  const [abierto, setAbierto] = useState(null)
  const [reportando, setReportando] = useState(null)
  const [textoReporte, setTextoReporte] = useState('')
  const [errorReporte, setErrorReporte] = useState(null)
  const [enviando, setEnviando] = useState(false)
  // Id del plan que se está apartando o liberando: un solo toque cuenta.
  const [ocupado, setOcupado] = useState(null)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    let cancelled = false
    getPlanes(ciudad).then(res => { if (!cancelled) setData({ ciudad, ...res }) })
    return () => { cancelled = true }
  }, [ciudad])

  // Las reservas salen de la cuenta, no solo del teléfono (rondas-9), y los
  // mensajes a la curadora que se quedaron sin enviar salen ahora (rondas-1).
  const userId = user?.id || null
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    getReservas({ id: userId }).then(ids => { if (!cancelled) setReservas(ids) })
    enviarReportesPendientes({ id: userId })
    return () => { cancelled = true }
  }, [userId])

  // El aviso flotante se va solo; más tiempo si es largo (rondas-4). Dentro
  // de la hoja va en su lugar, sin tapar nada, y se queda hasta que ella lo
  // cierre o cierre la hoja: si se fuera solo, lo de abajo saltaría.
  useEffect(() => {
    if (!aviso || abierto) return
    const t = setTimeout(() => setAviso(null), Math.max(5000, aviso.length * 60))
    return () => clearTimeout(t)
  }, [aviso, abierto])

  const cargando = !data || data.ciudad !== ciudad
  const ciudadLabel = CIUDADES.find(c => c.id === ciudad)?.label

  const planes = useMemo(() => {
    if (cargando) return []
    return data.planes.filter(p => {
      if (filtro === 'todas') return true
      if (filtro === 'en-linea') return p.modalidad === 'en-linea'
      return p.sala === filtro
    })
  }, [data, cargando, filtro])

  const filtros = [
    { id: 'todas', label: 'Todas' },
    ...SALAS.map(s => ({ id: s.id, label: s.label })),
    { id: 'en-linea', label: MODALIDAD['en-linea'] },
  ]
  const salaAcompanamiento = SALAS.find(s => s.id === 'acompanamiento')
  // El enlace del final lleva a los planes de la sala de acompañamiento de
  // esta ciudad (si no hay, la lista dice que la curaduría está en camino).
  // Sube hasta la fila de salas (no al principio de la página: ahí lo primero
  // sería el plan sugerido de otra sala) y el foco queda en "Acompañamiento".
  const verAcompanamiento = () => {
    setFiltro('acompanamiento')
    setTimeout(() => {
      const nav = salasRef.current
      if (!nav) return
      const alto = document.querySelector('header')?.offsetHeight || 0
      window.scrollTo({ top: nav.getBoundingClientRect().top + window.scrollY - alto - 12, behavior: 'smooth' })
      nav.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true })
    }, 0)
  }

  // El filtro activo siempre se ve en la barra, también al cambiar de
  // ciudad (vuelve a "Todas"). Solo se mueve de lado (rondas-16).
  const salasRef = useRef(null)
  useEffect(() => {
    const nav = salasRef.current
    const activo = nav?.querySelector('[aria-pressed="true"]')
    if (!nav || !activo) return
    const n = nav.getBoundingClientRect()
    const b = activo.getBoundingClientRect()
    if (b.left < n.left) nav.scrollLeft -= n.left - b.left
    else if (b.right > n.right) nav.scrollLeft += b.right - n.right
  }, [filtro, ciudad])

  const abridorRef = useRef(null)
  const abrir = (plan) => {
    abridorRef.current = document.activeElement
    setAviso(null)
    setAbierto(plan)
    track('plan_abierto', { sala: plan.sala, ciudad: plan.ciudad, ejemplo: !!plan.ejemplo })
  }
  const cerrar = useCallback(() => {
    setAbierto(null)
    setAviso(null)
    setTimeout(() => abridorRef.current?.focus?.(), 0)
  }, [])
  // La hoja muestra el plan con sus cupos al día.
  const planAbierto = abierto && (data?.planes.find(p => p.id === abierto.id) || abierto)

  /* Al cerrar el mensaje a la curadora (enviado o no), el texto se borra
     (rondas-3) y el foco vuelve a lo que abrió el plan (rondas-15). */
  const cerrarReporte = useCallback(() => {
    setReportando(null)
    setTextoReporte('')
    setErrorReporte(null)
    setTimeout(() => abridorRef.current?.focus?.(), 0)
  }, [])
  // Mientras se envía, no se cierra: así el resultado le llega a ella.
  const cancelarReporte = useCallback(() => { if (!enviando) cerrarReporte() }, [enviando, cerrarReporte])

  /* El mensaje a la curadora también se cierra con Escape */
  useEffect(() => {
    if (!reportando) return
    const alTeclear = (e) => { if (e.key === 'Escape') cancelarReporte() }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [reportando, cancelarReporte])
  const dialogoRef = useRef(null)
  useTrampaFoco(dialogoRef, !!reportando)

  // Cupos que quedan después de apartar o liberar. Si no se sabía cuántos
  // quedaban, solo se anota cuando el servidor dice que no queda ninguno.
  const ajustarRestantes = (id, cambio) => {
    setData(prev => prev && {
      ...prev,
      planes: prev.planes.map(p => {
        if (p.id !== id || p.cupos == null) return p
        const nuevo = cambio(p.restantes)
        return nuevo == null ? p : { ...p, restantes: Math.max(0, Math.min(p.cupos, nuevo)) }
      }),
    })
  }

  const reservar = async (plan) => {
    if (ocupado) return
    setOcupado(plan.id)
    const res = await reservarCupo(plan, user)
    setOcupado(null)
    if (res.ok) {
      setReservas(prev => [...new Set([...prev, plan.id])])
      if (!res.yaEstaba) ajustarRestantes(plan.id, n => (n == null ? null : n - 1))
      track('plan_reservado', { sala: plan.sala, ciudad: plan.ciudad, ejemplo: false })
      setAviso(`Tu cupo en "${plan.titulo}" quedó apartado. Si ya no puedes ir, lo liberas aquí mismo.`)
    } else if (res.motivo === 'ejemplo') {
      // Un plan de ejemplo no se aparta ni queda marcado (rondas-19).
      track('plan_reservado', { sala: plan.sala, ciudad: plan.ciudad, ejemplo: true })
      setAviso('Así se aparta un cupo. Este plan es de ejemplo, así que no quedó nada apartado. Cuando la curadora publique planes reales, los apartas aquí.')
    } else if (res.motivo === 'lleno') {
      ajustarRestantes(plan.id, () => 0)
      setAviso('Este plan ya no tiene cupos.')
    } else {
      setAviso('No pudimos apartar tu cupo. Revisa tu conexión e inténtalo de nuevo.')
    }
  }

  const liberar = async (plan) => {
    if (ocupado) return
    setOcupado(plan.id)
    const res = await liberarCupo(plan, user)
    setOcupado(null)
    if (res.ok) {
      setReservas(prev => prev.filter(id => id !== plan.id))
      ajustarRestantes(plan.id, n => (n == null ? null : n + 1))
      track('plan_liberado', { sala: plan.sala, ciudad: plan.ciudad })
      setAviso('Liberaste tu cupo. Queda libre para otra persona.')
    } else {
      setAviso('No pudimos liberar tu cupo. Revisa tu conexión e inténtalo de nuevo.')
    }
  }

  const enviar = async () => {
    const texto = textoReporte.trim()
    if (!texto || enviando) return
    setEnviando(true)
    setErrorReporte(null)
    const res = await enviarReporte(reportando, texto, user)
    setEnviando(false)
    if (!res.ok) {
      // No se cierra ni se borra: puede reintentar (rondas-1). Sin servicio
      // (sin cuenta o sin servidor configurado) no es culpa de la conexión.
      setErrorReporte(res.motivo === 'sin-servicio'
        ? 'Ahora no podemos enviar mensajes a la curadora. Tu mensaje sigue aquí; inténtalo más tarde.'
        : 'No pudimos enviarlo. Revisa tu conexión e inténtalo de nuevo; tu mensaje sigue aquí.')
      return
    }
    track('plan_reportado', { sala: reportando.sala })
    cerrarReporte()
    setAviso('Gracias. Tu mensaje le llega solo a la curadora y lo revisa en las siguientes 48 horas.')
  }

  // El plan sugerido es el de la ciudad y no cambia con el filtro; debajo de
  // los filtros van todos los de la sala elegida (rondas-5).
  const destacado = cargando ? null : data.planes[0]
  const resto = filtro === 'todas' ? planes.filter(p => p.id !== destacado?.id) : planes
  const textoVacio = filtro === 'todas' ? `La curaduría en ${ciudadLabel} está en camino.`
    : filtro === 'en-linea' ? 'Pronto habrá planes en línea.'
    : `La curaduría de esta sala en ${ciudadLabel} está en camino.`
  const reporteVacio = !textoReporte.trim()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ margin: '0 0 12px', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 36, lineHeight: 1.02, color: C.navy }}>
          Para ti, esta semana
        </h1>
        <SelectorCiudad ciudad={ciudad} onChange={(c) => { setCiudad(c); save(CIUDAD_KEY, c); setFiltro('todas') }} />
      </div>

      {cargando && (
        <div style={{ fontSize: 16, color: C.muted }}>Buscando lo que vale la pena…</div>
      )}

      {!cargando && destacado && <PlanDestacado plan={destacado} reservado={reservas.includes(destacado.id)} onAbrir={abrir} />}

      {/* Desliza de lado en el celular; con ratón los filtros bajan de línea (index.css, rondas-17). */}
      <nav ref={salasRef} aria-label="Salas" className="fila-filtros" style={{ paddingBottom: 2 }}>
        {filtros.map(f => {
          const activo = filtro === f.id
          return (
            <button key={f.id} onClick={() => setFiltro(f.id)} aria-pressed={activo} style={{
              minHeight: 40, padding: '0 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap', fontFamily: 'inherit', fontSize: 15,
              fontWeight: activo ? 600 : 500,
              background: activo ? C.orquidea : 'transparent',
              color: activo ? C.morado : C.muted,
            }}>{f.label}</button>
          )
        })}
      </nav>

      {!cargando && resto.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {resto.map(plan => (
            <FilaPlan key={plan.id} plan={plan} reservado={reservas.includes(plan.id)} onAbrir={abrir} />
          ))}
        </ul>
      )}

      {!cargando && planes.length === 0 && (
        <div style={{
          background: C.card, borderRadius: 20, padding: 22, textAlign: 'center',
          border: `1px dashed ${C.border}`, color: C.muted, fontSize: 16, lineHeight: 1.5,
        }}>
          {textoVacio}
        </div>
      )}

      {!cargando && data.ejemplo && (
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
          Vista de ejemplo: así se verán los planes cuando la curadora publique los primeros en {ciudadLabel}.
        </div>
      )}

      <button onClick={verAcompanamiento} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        padding: '14px 0', background: 'none', border: 'none', borderTop: '1px solid rgba(20,24,51,0.12)',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: C.navy,
      }}>
        <span>
          <span style={{ display: 'block', fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600 }}>{salaAcompanamiento.label}</span>
          <span style={{ fontSize: 14, color: C.muted }}>Ver los planes de esta sala en {ciudadLabel}</span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke={C.morado} strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>

      {planAbierto && (
        <HojaPlan
          plan={planAbierto}
          reservado={reservas.includes(planAbierto.id)}
          ocupado={ocupado === planAbierto.id}
          aviso={aviso}
          onCerrarAviso={() => setAviso(null)}
          onCerrar={cerrar}
          onReservar={reservar}
          onLiberar={liberar}
          onReportar={(p) => { setTextoReporte(''); setErrorReporte(null); setReportando(p); setAbierto(null) }}
          onIrAdentro={() => onIrAdentro?.()}
        />
      )}

      {/* ── Aviso ── La región está siempre montada para que el lector de
          pantalla lo anuncie; con la hoja abierta el aviso va dentro de ella. */}
      <div role="status" aria-live="polite" style={{
        position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 440, zIndex: 9999,
        pointerEvents: aviso && !abierto ? 'auto' : 'none',
      }}>
        {aviso && !abierto && <TarjetaAviso texto={aviso} onCerrar={() => {
          setAviso(null)
          // El botón se va con el aviso: el foco vuelve a lo que abrió el plan.
          setTimeout(() => {
            const destino = abridorRef.current?.isConnected ? abridorRef.current : salasRef.current?.querySelector('[aria-pressed="true"]')
            destino?.focus?.({ preventScroll: true })
          }, 0)
        }} />}
      </div>

      {/* ── Mensaje privado a la curadora ── Si no cabe (pantalla baja o
          teclado abierto) se desplaza en vez de cortarse (rondas-13). */}
      {reportando && (
        <div onClick={cancelarReporte} style={{
          position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(20,24,51,0.45)',
          display: 'flex', padding: 20, overflowY: 'auto', overscrollBehavior: 'contain',
        }}>
          <div ref={dialogoRef} role="dialog" aria-modal="true" aria-label="Contarle algo a la curadora" onClick={e => e.stopPropagation()} style={{
            background: C.hoja, borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, margin: 'auto',
          }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: C.navy }}>
              Contarle algo a la curadora
            </div>
            <div style={{ fontSize: 15, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
              Sobre: {reportando.titulo}. Esto lo lee solo la curadora.
            </div>
            <label htmlFor="mensaje-curadora" style={{ display: 'block', ...eyebrow(C.oliva), fontSize: 11, marginTop: 16 }}>
              Tu mensaje
            </label>
            <textarea
              autoFocus
              id="mensaje-curadora"
              value={textoReporte}
              onChange={e => setTextoReporte(e.target.value)}
              rows={5}
              placeholder="Cuéntanos qué pasó"
              style={{
                width: '100%', marginTop: 6, padding: 14, borderRadius: 14,
                border: `1px solid ${C.border}`, background: C.card, color: C.navy,
                fontFamily: 'inherit', fontSize: 16, resize: 'vertical', maxHeight: '40vh',
              }}
            />
            {/* Un incidente en un plan presencial: primero emergencias (123,
                nacional) y después la línea de apoyo emocional. */}
            <div style={{ fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
              Si estás en peligro en este momento, llama al <LineaCrisis numero="123">123</LineaCrisis>. Para apoyo emocional, llama a la <LineaCrisis numero="106">Línea 106</LineaCrisis>.
            </div>
            {errorReporte && (
              <div role="alert" style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: C.morado, lineHeight: 1.4 }}>
                {errorReporte}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={cancelarReporte} disabled={enviando} style={{
                flex: 1, minHeight: 48, borderRadius: 14, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.muted, fontSize: 15, fontWeight: 600,
                fontFamily: 'inherit', cursor: enviando ? 'default' : 'pointer',
              }}>Cancelar</button>
              {/* Sin texto no se puede enviar, y se ve (rondas-14); mientras
                  se envía, un segundo toque no lo manda dos veces (rondas-1). */}
              <button onClick={enviar} disabled={reporteVacio || enviando} style={{
                flex: 1.4, minHeight: 48, borderRadius: 14, border: 'none',
                background: reporteVacio ? C.border : C.morado,
                color: reporteVacio ? C.subtle : '#FFFFFF', fontSize: 15, fontWeight: 600,
                fontFamily: 'inherit', cursor: reporteVacio || enviando ? 'default' : 'pointer',
              }}>{enviando ? 'Enviando…' : 'Enviar a la curadora'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
