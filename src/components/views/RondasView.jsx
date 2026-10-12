/* RondasView — Ronda como curadora.
   Ronda no organiza eventos ni tiene sedes: elige lugares, planes y
   compañía para mujeres, y les pone marco con una cédula (por qué está
   aquí, para quién es, cómo llegas). Cuatro líneas de marca conviven
   aquí, cada una con su papel:
     · "Lo mejor de tu barrio, elegido por mujeres para mujeres." (posiciona)
     · "Ronda elige dónde vale la pena llegar." (explica)
     · "Curado por Ronda." (el sello)
     · "Llegas sola, sales en ronda." (la promesa de cada plan) */
import { useEffect, useId, useMemo, useState } from 'react'
import { C } from '../../constants/colors'
import { FONT_DISPLAY } from '../../constants/tokens'
import { CIUDADES, SALAS, SALA_COLORES, COLECCIONES, ACCESO, TEMPORADA } from '../../constants/curaduria'
import { getPlanes, getReservasLocales, reservarCupo, enviarReporte } from '../../lib/curaduria'
import { track } from '../../lib/analytics'

/* ── Sello circular "Curado por Ronda" ── */
function SelloCurado({ size = 72 }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Curado por Ronda">
      <defs>
        <path id={`arco-${id}`} d="M50,50 m-35,0 a35,35 0 1,1 70,0 a35,35 0 1,1 -70,0" />
      </defs>
      <circle cx="50" cy="50" r="48" fill={C.vino} />
      <circle cx="50" cy="50" r="45" fill="none" stroke={C.chartreuse} strokeWidth="1.2" />
      <text fontSize="11" fontWeight="700" fill={C.chartreuse} fontFamily="Montserrat, sans-serif">
        <textPath href={`#arco-${id}`} textLength="214" lengthAdjust="spacing">CURADO POR RONDA · CURADO POR RONDA ·</textPath>
      </text>
      <circle cx="50" cy="50" r="13" fill="none" stroke={C.lila} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="7" fill={C.higo} />
    </svg>
  )
}

/* ── Chip reutilizable ── */
function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
      border: `2px solid ${active ? C.vino : C.border}`,
      background: active ? C.vino : C.card,
      color: active ? C.hueso : C.muted,
      fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
    }}>{children}</button>
  )
}

const salaLabel = (id) => SALAS.find(s => s.id === id)?.label || id

/* ── Tarjeta de plan con su cédula ── */
function PlanCard({ plan, reservado, onReservar, onReportar }) {
  const soloMujeres = plan.acceso === 'solo-mujeres'
  const color = SALA_COLORES[plan.sala] || SALA_COLORES.salon
  return (
    <article style={{
      background: C.card, borderRadius: 22, overflow: 'hidden',
      border: `1px solid ${C.border}`, boxShadow: '0 6px 24px rgba(55,44,65,0.10)',
    }}>
      {/* Franja superior en el color de la sala: sala, acceso, verificación */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '14px 18px', background: color.fondo, color: color.texto,
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          {salaLabel(plan.sala)}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
          background: soloMujeres ? color.texto : 'transparent',
          border: `1.5px solid ${color.texto}`,
          color: soloMujeres ? color.fondo : color.texto,
        }}>{ACCESO[plan.acceso]}</span>
        <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>
          Verificada · nivel {plan.verificacion}
        </span>
        {plan.ejemplo && (
          <span style={{
            marginLeft: 'auto', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: C.text, background: C.chartreuse,
            padding: '3px 8px', borderRadius: 6,
          }}>Ejemplo</span>
        )}
      </div>

      <div style={{ padding: '18px 18px 20px' }}>
        <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 25, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>
          {plan.titulo}
        </h3>
        <div style={{ marginTop: 6, fontSize: 16, color: C.muted, fontWeight: 600 }}>
          {plan.barrio} · {plan.cuando} · con {plan.anfitriona}
        </div>

        {/* La cédula */}
        <div style={{
          marginTop: 16, padding: '14px 16px', borderRadius: 14,
          background: C.hueso, borderLeft: `4px solid ${color.fondo}`,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {[
            ['Por qué está aquí', plan.cedula.porque],
            ['Para quién', plan.cedula.paraQuien],
            ['Cómo llegas', plan.cedula.comoLlegas],
          ].map(([label, texto]) => (
            <div key={label}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.laguna }}>
                {label}
              </div>
              <div style={{ fontSize: 17, color: C.text, lineHeight: 1.45, marginTop: 2 }}>{texto}</div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 14, fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: 18,
          color: C.orquidea, fontWeight: 600,
        }}>
          Llegas sola, sales en ronda.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <button
            onClick={() => !reservado && onReservar(plan)}
            disabled={reservado}
            style={{
              flex: 1, padding: '14px 18px', borderRadius: 14, border: 'none',
              background: reservado ? C.laguna : C.higo,
              color: 'white', fontSize: 17, fontWeight: 800, fontFamily: 'inherit',
              cursor: reservado ? 'default' : 'pointer',
              boxShadow: reservado ? 'none' : '0 6px 18px rgba(119,20,65,0.35)',
            }}>
            {reservado ? 'Tu cupo está apartado ✓' : 'Apartar mi cupo'}
          </button>
          {plan.cupos ? (
            <span style={{ fontSize: 14, color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>{plan.cupos} cupos</span>
          ) : null}
        </div>

        <button onClick={() => onReportar(plan)} style={{
          marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontSize: 14, color: C.muted, textDecoration: 'underline', fontFamily: 'inherit',
        }}>
          Algo no estuvo bien
        </button>
      </div>
    </article>
  )
}

export default function RondasView({ user, onOpenProfesionales }) {
  const [ciudad, setCiudad] = useState('cartagena')
  const [coleccion, setColeccion] = useState('todas')
  const [sala, setSala] = useState('todas')
  const [data, setData] = useState(null)
  const [reservas, setReservas] = useState(() => getReservasLocales())
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
    return data.planes.filter(p =>
      (coleccion === 'todas' || p.colecciones.includes(coleccion)) &&
      (sala === 'todas' || p.sala === sala)
    )
  }, [data, cargando, coleccion, sala])

  const coleccionActiva = COLECCIONES.find(c => c.id === coleccion)

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
    setAviso('Gracias. Tu reporte le llega solo a la curadora y lo revisa en las siguientes 48 horas.')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Portada ── */}
      <section style={{
        position: 'relative', overflow: 'hidden', borderRadius: 26, padding: '28px 22px 26px',
        background: `linear-gradient(150deg, ${C.vino} 0%, ${C.orquidea} 100%)`,
      }}>
        <div style={{ position: 'absolute', right: -50, bottom: -60, width: 200, height: 200, borderRadius: '50%', border: `2px solid ${C.lila}2E` }} />
        <div style={{ position: 'absolute', right: -10, bottom: -20, width: 110, height: 110, borderRadius: '50%', border: `2px solid ${C.chartreuse}38` }} />
        <div style={{ position: 'absolute', left: -30, top: -30, width: 90, height: 90, borderRadius: '50%', background: `${C.ocre}40` }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.chartreuse }}>
              Curado por Ronda
            </div>
            <h1 style={{ margin: '10px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 31, lineHeight: 1.15, color: 'white' }}>
              Lo mejor de tu barrio, elegido por mujeres para mujeres.
            </h1>
            <p style={{ margin: '12px 0 0', fontSize: 17, lineHeight: 1.5, color: C.lila, fontWeight: 500 }}>
              Ronda elige dónde vale la pena llegar.
            </p>
          </div>
          <div style={{ flexShrink: 0 }}><SelloCurado size={76} /></div>
        </div>
      </section>

      {/* ── Ciudad ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {CIUDADES.map(c => (
          <Chip key={c.id} active={ciudad === c.id} onClick={() => setCiudad(c.id)}>{c.label}</Chip>
        ))}
      </div>

      {/* ── Temporada ── */}
      <section style={{
        background: C.card, borderRadius: 18, padding: '16px 18px',
        border: `1px solid ${C.border}`, borderLeft: `5px solid ${C.ocre}`,
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.orquidea }}>
          Temporada de {TEMPORADA.mes.toLowerCase()}
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.text, marginTop: 4 }}>
          {TEMPORADA.nombre}
        </div>
        <div style={{ fontSize: 16, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>{TEMPORADA.texto}</div>
      </section>

      {/* ── Colecciones (momento de vida) ── */}
      <section>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 10 }}>
          Colecciones
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <Chip active={coleccion === 'todas'} onClick={() => setColeccion('todas')}>Todas</Chip>
          {COLECCIONES.map(c => (
            <Chip key={c.id} active={coleccion === c.id} onClick={() => setColeccion(c.id)}>{c.label}</Chip>
          ))}
        </div>
        {coleccionActiva && (
          <div style={{ marginTop: 10, fontSize: 16, color: C.muted, fontStyle: 'italic' }}>{coleccionActiva.desc}</div>
        )}
      </section>

      {/* ── Salas ── */}
      <section>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 10 }}>
          Salas
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <Chip active={sala === 'todas'} onClick={() => setSala('todas')}>Todas</Chip>
          {SALAS.map(s => (
            <Chip key={s.id} active={sala === s.id} onClick={() => setSala(s.id)}>{s.label}</Chip>
          ))}
        </div>
      </section>

      {/* ── Planes ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: 20, color: C.orquidea }}>
          {cargando
            ? 'Buscando lo que vale la pena…'
            : `Esta semana en ${ciudadLabel} · ${planes.length} ${planes.length === 1 ? 'plan curado' : 'planes curados'} para ti`}
        </div>

        {!cargando && data.ejemplo && (
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
            Vista de ejemplo: así se verán los planes cuando la curadora publique los primeros en {ciudadLabel}.
          </div>
        )}

        {!cargando && planes.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            reservado={reservas.includes(plan.id)}
            onReservar={reservar}
            onReportar={setReportando}
          />
        ))}

        {!cargando && planes.length === 0 && (
          <div style={{
            background: C.card, borderRadius: 18, padding: 22, textAlign: 'center',
            border: `1px dashed ${C.border}`, color: C.muted, fontSize: 17, lineHeight: 1.5,
          }}>
            La curaduría de esta sala en {ciudadLabel} está en camino.
          </div>
        )}

        {(sala === 'todas' || sala === 'acompanamiento') && (
          <div style={{
            background: C.laguna, borderRadius: 20, padding: '18px 18px 20px', color: 'white',
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.chartreuse }}>
              Sala de acompañamiento
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, marginTop: 6, lineHeight: 1.25 }}>
              Profesionales verificadas, elegidas con el mismo ojo que los planes.
            </div>
            <div style={{ fontSize: 16, color: C.lila, marginTop: 6, lineHeight: 1.45 }}>
              Compañía con criterio para los momentos que pesan.
            </div>
            <button onClick={onOpenProfesionales} style={{
              marginTop: 14, padding: '12px 18px', borderRadius: 12, border: 'none',
              background: C.chartreuse, color: C.text, fontSize: 16, fontWeight: 800,
              fontFamily: 'inherit', cursor: 'pointer',
            }}>
              Ver profesionales
            </button>
          </div>
        )}
      </section>

      {/* ── Aviso ── */}
      {aviso && (
        <div onClick={() => setAviso(null)} style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 440, zIndex: 9999, cursor: 'pointer',
          background: C.vino, color: 'white', borderRadius: 18, padding: '16px 18px',
          boxShadow: '0 10px 32px rgba(55,44,65,0.35)', borderLeft: `5px solid ${C.chartreuse}`,
          fontSize: 16, lineHeight: 1.45,
        }}>
          {aviso}
        </div>
      )}

      {/* ── Reporte privado ── */}
      {reportando && (
        <div onClick={() => setReportando(null)} style={{
          position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(55,44,65,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.hueso, borderRadius: 22, padding: 24, width: '100%', maxWidth: 420,
          }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.text }}>
              Algo no estuvo bien
            </div>
            <div style={{ fontSize: 16, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
              Sobre: {reportando.titulo}. Esto lo lee solo la curadora.
            </div>
            <textarea
              value={textoReporte}
              onChange={e => setTextoReporte(e.target.value)}
              rows={5}
              placeholder="Cuéntanos qué pasó"
              style={{
                width: '100%', marginTop: 14, padding: 14, borderRadius: 14,
                border: `1.5px solid ${C.border}`, background: C.card, color: C.text,
                fontFamily: 'inherit', resize: 'vertical',
              }}
            />
            <div style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
              Si estás en riesgo en este momento, llama a la Línea 106.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setReportando(null)} style={{
                flex: 1, padding: '13px 16px', borderRadius: 12, border: `1.5px solid ${C.border}`,
                background: 'transparent', color: C.muted, fontSize: 16, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={enviar} style={{
                flex: 1.4, padding: '13px 16px', borderRadius: 12, border: 'none',
                background: C.higo, color: 'white', fontSize: 16, fontWeight: 800,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>Enviar a la curadora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
