/* RondasView — Ronda como curadora.
   Ronda no organiza eventos ni tiene sedes: elige lugares, planes y
   compañía para mujeres, y les pone marco con una cédula (por qué está
   aquí, para quién es, cómo llegas). Cuatro líneas de marca conviven
   aquí, cada una con su papel:
     · "Lo mejor de tu barrio, elegido por mujeres para mujeres." (posiciona)
     · "Ronda elige dónde vale la pena llegar." (explica)
     · "Curado por Ronda." (firma)
     · "Llegas sola, sales en ronda." (la promesa de cada plan)

   Diseño: paleta de tres Pantone (Merlot, Spinach Green, Placid Blue),
   sin círculos decorativos. El color nunca va solo: siempre con texto. */
import { useEffect, useMemo, useState } from 'react'
import { C } from '../../constants/colors'
import { FONT_DISPLAY } from '../../constants/tokens'
import { CIUDADES, SALAS, COLECCIONES, ACCESO, TEMPORADA } from '../../constants/curaduria'
import { getPlanes, getReservasLocales, reservarCupo, enviarReporte } from '../../lib/curaduria'
import { track } from '../../lib/analytics'

const salaLabel = (id) => SALAS.find(s => s.id === id)?.label || id

const eyebrow = (color) => ({
  fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color,
})

/* ── Chip de filtro ── */
function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} aria-pressed={active} style={{
      padding: '9px 16px', borderRadius: 12, cursor: 'pointer', whiteSpace: 'nowrap',
      border: `1.5px solid ${active ? C.merlot : C.border}`,
      background: active ? C.merlot : C.card,
      color: active ? 'white' : C.text,
      fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
    }}>{children}</button>
  )
}

/* ── Selector de ciudad (control segmentado) ── */
function SelectorCiudad({ ciudad, onChange }) {
  return (
    <div role="tablist" aria-label="Ciudad" style={{
      display: 'flex', padding: 4, borderRadius: 14, background: C.card,
      border: `1px solid ${C.border}`,
    }}>
      {CIUDADES.map(c => {
        const active = ciudad === c.id
        return (
          <button key={c.id} role="tab" aria-selected={active} onClick={() => onChange(c.id)} style={{
            flex: 1, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: active ? C.merlot : 'transparent', color: active ? 'white' : C.muted,
            fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
          }}>{c.label}</button>
        )
      })}
    </div>
  )
}

/* ── Tarjeta de plan con su cédula ── */
function PlanCard({ plan, reservado, onReservar, onReportar }) {
  const soloMujeres = plan.acceso === 'solo-mujeres'
  return (
    <article style={{
      background: C.card, borderRadius: 18, border: `1px solid ${C.border}`,
      padding: '18px 18px 20px', boxShadow: '0 2px 10px rgba(42,30,33,0.05)',
    }}>
      {/* Sala, barrio y acceso */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div style={eyebrow(C.merlot)}>
          {salaLabel(plan.sala)} · {plan.barrio}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap',
          background: soloMujeres ? C.espinaca : C.placido, color: C.tinta,
        }}>{ACCESO[plan.acceso]}</span>
      </div>

      <h3 style={{ margin: '10px 0 0', fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.tinta, lineHeight: 1.2 }}>
        {plan.titulo}
      </h3>
      <div style={{ marginTop: 6, fontSize: 15, color: C.muted, fontWeight: 600 }}>
        {plan.cuando} · con {plan.anfitriona}
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.espinacaOscura }}>
          ✓ Anfitriona verificada · nivel {plan.verificacion}
        </span>
        {plan.ejemplo && (
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: C.muted, border: `1px solid ${C.border}`, padding: '2px 7px', borderRadius: 6,
          }}>Ejemplo</span>
        )}
      </div>

      {/* La cédula */}
      <div style={{
        marginTop: 16, padding: '14px 16px', borderRadius: 12, background: C.placidoClaro,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {[
          ['Por qué está aquí', plan.cedula.porque],
          ['Para quién', plan.cedula.paraQuien],
          ['Cómo llegas', plan.cedula.comoLlegas],
        ].map(([label, texto]) => (
          <div key={label}>
            <div style={eyebrow(C.merlot)}>{label}</div>
            <div style={{ fontSize: 16, color: C.tinta, lineHeight: 1.45, marginTop: 2 }}>{texto}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: 18, color: C.merlot, fontWeight: 600 }}>
        Llegas sola, sales en ronda.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <button
          onClick={() => !reservado && onReservar(plan)}
          disabled={reservado}
          style={{
            flex: 1, padding: '14px 18px', borderRadius: 12, border: 'none',
            background: reservado ? C.espinacaOscura : C.merlot,
            color: 'white', fontSize: 16, fontWeight: 800, fontFamily: 'inherit',
            cursor: reservado ? 'default' : 'pointer',
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
      <section style={{ borderRadius: 20, padding: '26px 22px 24px', background: C.merlot }}>
        <div style={eyebrow(C.placido)}>Curado por Ronda</div>
        <h1 style={{ margin: '10px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 30, lineHeight: 1.15, color: 'white' }}>
          Lo mejor de tu barrio, elegido por mujeres para mujeres.
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 17, lineHeight: 1.5, color: C.placidoClaro, fontWeight: 500 }}>
          Ronda elige dónde vale la pena llegar.
        </p>
      </section>

      {/* ── Ciudad ── */}
      <SelectorCiudad ciudad={ciudad} onChange={setCiudad} />

      {/* ── Temporada ── */}
      <section style={{
        background: C.espinacaClara, borderRadius: 16, padding: '16px 18px',
        borderLeft: `4px solid ${C.espinaca}`,
      }}>
        <div style={eyebrow(C.espinacaOscura)}>Temporada de {TEMPORADA.mes.toLowerCase()}</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 23, fontWeight: 600, color: C.tinta, marginTop: 4 }}>
          {TEMPORADA.nombre}
        </div>
        <div style={{ fontSize: 15, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>{TEMPORADA.texto}</div>
      </section>

      {/* ── Colecciones (momento de vida) ── */}
      <section>
        <div style={{ ...eyebrow(C.muted), marginBottom: 10 }}>Colecciones</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <Chip active={coleccion === 'todas'} onClick={() => setColeccion('todas')}>Todas</Chip>
          {COLECCIONES.map(c => (
            <Chip key={c.id} active={coleccion === c.id} onClick={() => setColeccion(c.id)}>{c.label}</Chip>
          ))}
        </div>
        {coleccionActiva && (
          <div style={{ marginTop: 10, fontSize: 15, color: C.muted, fontStyle: 'italic' }}>{coleccionActiva.desc}</div>
        )}
      </section>

      {/* ── Salas ── */}
      <section>
        <div style={{ ...eyebrow(C.muted), marginBottom: 10 }}>Salas</div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <Chip active={sala === 'todas'} onClick={() => setSala('todas')}>Todas</Chip>
          {SALAS.map(s => (
            <Chip key={s.id} active={sala === s.id} onClick={() => setSala(s.id)}>{s.label}</Chip>
          ))}
        </div>
      </section>

      {/* ── Planes ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.tinta }}>
            {cargando
              ? 'Buscando lo que vale la pena…'
              : `${planes.length} ${planes.length === 1 ? 'plan curado' : 'planes curados'} esta semana en ${ciudadLabel}`}
          </div>
          {!cargando && data.ejemplo && (
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5, marginTop: 4 }}>
              Vista de ejemplo: así se verán los planes cuando la curadora publique los primeros en {ciudadLabel}.
            </div>
          )}
        </div>

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
            background: C.card, borderRadius: 16, padding: 22, textAlign: 'center',
            border: `1px dashed ${C.border}`, color: C.muted, fontSize: 16, lineHeight: 1.5,
          }}>
            La curaduría de esta sala en {ciudadLabel} está en camino.
          </div>
        )}

        {(sala === 'todas' || sala === 'acompanamiento') && (
          <div style={{ background: C.placidoClaro, borderRadius: 18, padding: '18px 18px 20px', border: `1px solid ${C.placido}` }}>
            <div style={eyebrow(C.placidoOscuro)}>Sala de acompañamiento</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 21, fontWeight: 600, color: C.tinta, marginTop: 6, lineHeight: 1.25 }}>
              Profesionales verificadas, elegidas con el mismo ojo que los planes.
            </div>
            <div style={{ fontSize: 15, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
              Compañía con criterio para los momentos que pesan.
            </div>
            <button onClick={onOpenProfesionales} style={{
              marginTop: 14, padding: '12px 18px', borderRadius: 12, border: 'none',
              background: C.merlot, color: 'white', fontSize: 15, fontWeight: 800,
              fontFamily: 'inherit', cursor: 'pointer',
            }}>
              Ver profesionales
            </button>
          </div>
        )}
      </section>

      {/* ── Aviso ── */}
      {aviso && (
        <div role="status" onClick={() => setAviso(null)} style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: 440, zIndex: 9999, cursor: 'pointer',
          background: C.tinta, color: 'white', borderRadius: 14, padding: '16px 18px',
          boxShadow: '0 10px 32px rgba(42,30,33,0.30)', borderLeft: `4px solid ${C.placido}`,
          fontSize: 15, lineHeight: 1.45,
        }}>
          {aviso}
        </div>
      )}

      {/* ── Reporte privado ── */}
      {reportando && (
        <div onClick={() => setReportando(null)} style={{
          position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(42,30,33,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div role="dialog" aria-label="Algo no estuvo bien" onClick={e => e.stopPropagation()} style={{
            background: C.fondo, borderRadius: 18, padding: 24, width: '100%', maxWidth: 420,
          }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 23, fontWeight: 600, color: C.tinta }}>
              Algo no estuvo bien
            </div>
            <div style={{ fontSize: 15, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
              Sobre: {reportando.titulo}. Esto lo lee solo la curadora.
            </div>
            <textarea
              value={textoReporte}
              onChange={e => setTextoReporte(e.target.value)}
              rows={5}
              placeholder="Cuéntanos qué pasó"
              style={{
                width: '100%', marginTop: 14, padding: 14, borderRadius: 12,
                border: `1.5px solid ${C.border}`, background: C.card, color: C.tinta,
                fontFamily: 'inherit', resize: 'vertical',
              }}
            />
            <div style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
              Si estás en riesgo en este momento, llama a la Línea 106.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setReportando(null)} style={{
                flex: 1, padding: '13px 16px', borderRadius: 12, border: `1.5px solid ${C.border}`,
                background: 'transparent', color: C.muted, fontSize: 15, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={enviar} style={{
                flex: 1.4, padding: '13px 16px', borderRadius: 12, border: 'none',
                background: C.merlot, color: 'white', fontSize: 15, fontWeight: 800,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>Enviar a la curadora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
