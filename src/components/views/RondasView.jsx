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
import { CIUDADES, SALAS, ACCESO, MODALIDAD } from '../../constants/curaduria'
import { getPlanes, getReservasLocales, reservarCupo, enviarReporte } from '../../lib/curaduria'
import { track } from '../../lib/analytics'

const salaLabel = (id) => SALAS.find(s => s.id === id)?.label || id

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
        {plan.cuando} · con {plan.anfitriona}{plan.cupos ? ` · ${plan.cupos} cupos` : ''}
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
  const [dia, hora] = partirCuando(plan.cuando)
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
function HojaPlan({ plan, reservado, onCerrar, onReservar, onReportar, onIrAdentro }) {
  const cerrarRef = useRef(null)
  useEffect(() => { cerrarRef.current?.focus() }, [])
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  return (
    <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, zIndex: 300 }}>
      <section
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
          {plan.cuando} · con {plan.anfitriona}{plan.cupos ? ` · ${plan.cupos} cupos` : ''}
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

        <button
          onClick={() => !reservado && onReservar(plan)}
          disabled={reservado}
          style={{
            width: '100%', height: 52, marginTop: 18, border: 'none', borderRadius: 14,
            background: reservado ? C.oliva : C.morado, color: '#FFFFFF',
            fontSize: 16, fontWeight: 600, letterSpacing: '0.03em', fontFamily: 'inherit',
            cursor: reservado ? 'default' : 'pointer',
          }}>
          {reservado ? 'Tu cupo está apartado ✓' : 'Apartar mi cupo'}
        </button>
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

export default function RondasView({ user, onOpenProfesionales, onIrAdentro }) {
  const [ciudad, setCiudad] = useState('cartagena')
  const [filtro, setFiltro] = useState('todas')
  const [data, setData] = useState(null)
  const [reservas, setReservas] = useState(() => getReservasLocales())
  const [abierto, setAbierto] = useState(null)
  const [reportando, setReportando] = useState(null)
  const [textoReporte, setTextoReporte] = useState('')
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    let cancelled = false
    getPlanes(ciudad).then(res => { if (!cancelled) setData({ ciudad, ...res }) })
    return () => { cancelled = true }
  }, [ciudad])

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
    ...SALAS.filter(s => s.id !== 'acompanamiento').map(s => ({ id: s.id, label: s.label })),
    { id: 'en-linea', label: MODALIDAD['en-linea'] },
  ]

  const abridorRef = useRef(null)
  const abrir = (plan) => {
    abridorRef.current = document.activeElement
    setAbierto(plan)
    track('plan_abierto', { sala: plan.sala, ciudad: plan.ciudad, ejemplo: !!plan.ejemplo })
  }
  const cerrar = useCallback(() => {
    setAbierto(null)
    setTimeout(() => abridorRef.current?.focus?.(), 0)
  }, [])

  /* El mensaje a la curadora también se cierra con Escape */
  useEffect(() => {
    if (!reportando) return
    const alTeclear = (e) => { if (e.key === 'Escape') setReportando(null) }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [reportando])

  const reservar = async (plan) => {
    const res = await reservarCupo(plan, user)
    if (res.ok) {
      setReservas(prev => [...new Set([...prev, plan.id])])
      track('plan_reservado', { sala: plan.sala, ciudad: plan.ciudad, ejemplo: !!plan.ejemplo })
      setAviso(plan.ejemplo
        ? 'Así se aparta un cupo. Este plan es de ejemplo: cuando la curadora publique los primeros planes reales, tu reserva le llegará a la anfitriona.'
        : `Tu cupo en "${plan.titulo}" está apartado. Te llega la confirmación con los detalles.`)
    }
  }

  const enviar = async () => {
    if (!textoReporte.trim()) return
    await enviarReporte(reportando, textoReporte.trim(), user)
    track('plan_reportado', { sala: reportando.sala })
    setReportando(null)
    setTextoReporte('')
    setAviso('Gracias. Tu mensaje le llega solo a la curadora y lo revisa en las siguientes 48 horas.')
  }

  const [destacado, ...resto] = planes

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ margin: '0 0 12px', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 36, lineHeight: 1.02, color: C.navy }}>
          Para ti, esta semana
        </h1>
        <SelectorCiudad ciudad={ciudad} onChange={(c) => { setCiudad(c); setFiltro('todas') }} />
      </div>

      {cargando && (
        <div style={{ fontSize: 16, color: C.muted }}>Buscando lo que vale la pena…</div>
      )}

      {!cargando && destacado && <PlanDestacado plan={destacado} reservado={reservas.includes(destacado.id)} onAbrir={abrir} />}

      <nav aria-label="Salas" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
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
          La curaduría de esta sala en {ciudadLabel} está en camino.
        </div>
      )}

      {!cargando && data.ejemplo && (
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
          Vista de ejemplo: así se verán los planes cuando la curadora publique los primeros en {ciudadLabel}.
        </div>
      )}

      <button onClick={onOpenProfesionales} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        padding: '14px 0', background: 'none', border: 'none', borderTop: '1px solid rgba(20,24,51,0.12)',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: C.navy,
      }}>
        <span>
          <span style={{ display: 'block', fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600 }}>Acompañamiento</span>
          <span style={{ fontSize: 14, color: C.muted }}>Psicólogas con tarjeta profesional verificada</span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" fill="none" stroke={C.morado} strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>

      {abierto && (
        <HojaPlan
          plan={abierto}
          reservado={reservas.includes(abierto.id)}
          onCerrar={cerrar}
          onReservar={reservar}
          onReportar={(p) => { setReportando(p); setAbierto(null) }}
          onIrAdentro={() => onIrAdentro?.()}
        />
      )}

      {/* ── Aviso ── */}
      {aviso && (
        <div role="status" onClick={() => setAviso(null)} style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 440, zIndex: 9999, cursor: 'pointer',
          background: C.navy, color: '#FFFFFF', borderRadius: 16, padding: '16px 18px',
          boxShadow: '0 10px 32px rgba(20,24,51,0.30)', fontSize: 15, lineHeight: 1.45,
        }}>
          {aviso}
        </div>
      )}

      {/* ── Mensaje privado a la curadora ── */}
      {reportando && (
        <div onClick={() => setReportando(null)} style={{
          position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(20,24,51,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div role="dialog" aria-modal="true" aria-label="Contarle algo a la curadora" onClick={e => e.stopPropagation()} style={{
            background: C.hoja, borderRadius: 24, padding: 24, width: '100%', maxWidth: 420,
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
                fontFamily: 'inherit', fontSize: 16, resize: 'vertical',
              }}
            />
            <div style={{ fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
              Si estás en riesgo en este momento, llama a la Línea 106.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setReportando(null)} style={{
                flex: 1, minHeight: 48, borderRadius: 14, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.muted, fontSize: 15, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={enviar} style={{
                flex: 1.4, minHeight: 48, borderRadius: 14, border: 'none',
                background: C.morado, color: '#FFFFFF', fontSize: 15, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>Enviar a la curadora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

