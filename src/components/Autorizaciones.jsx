/* Pantallas y tarjetas de las autorizaciones de datos. Los textos son los
   exactos de ronda-hq/06-legal-y-datos/textos-autorizacion-v1.md (versión
   v1): si cambian las palabras, cambia VERSION en src/lib/autorizaciones.js.
     · Casilla, CasillaIA → las casillas (sin marcar al empezar)
     · PantallaAutorizacion → (a2) «Lo íntimo es tuyo», después del registro,
       y (b) el aviso único a las ya inscritas
     · TarjetaIA → (c) al tocar una función de IA sin autorización
     · TusAutorizaciones → (e) la tarjeta de Perfil
   Las reglas de qué se guarda y dónde viven en src/lib/autorizaciones.js. */
import { useEffect, useRef, useState } from 'react'
import { C } from '../constants/colors'
import { FONT, FONT_DISPLAY, SHADOW } from '../constants/tokens'
import { BOTON_AYUDA } from '../utils/crisis'
import LineaCrisis from './ui/LineaCrisis'
import {
  CORREO_DATOS, URL_POLITICA, iaAutorizada, fechaAutorizacion,
} from '../lib/autorizaciones'

const NO_VENDE = 'Ronda no vende tus datos ni los comparte con terceros para publicidad.'

const enlace = { color: C.morado, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }

// La política abre aparte: lo que lleva escrito o marcado aquí no se pierde.
export function EnlacePolitica({ href = URL_POLITICA, children = 'Política de Tratamiento de Datos', style }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" style={{ ...enlace, ...style }}>{children}</a>
}

/* Una casilla con su texto. Toda la fila se puede tocar (44 px o más). Los
   enlaces de adentro abren la política sin marcar la casilla. */
export function Casilla({ id, marcada, onCambiar, children, describedBy, invalida, ref }) {
  return (
    <label htmlFor={id} style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', minHeight: 44, padding: '6px 0',
      cursor: 'pointer', fontSize: 16, lineHeight: 1.5, color: C.text, textAlign: 'left',
    }}>
      <input
        ref={ref} type="checkbox" id={id} checked={marcada}
        onChange={e => onCambiar(e.target.checked)}
        aria-describedby={describedBy} aria-invalid={invalida || undefined}
        style={{ width: 22, height: 22, margin: '1px 0 0', flexShrink: 0, accentColor: C.morado, cursor: 'pointer' }}
      />
      <span>{children}</span>
    </label>
  )
}

/* «Usar la IA de Ronda»: la única autorización de datos sensibles. Va igual
   en la pantalla a2, el aviso único, la tarjeta de cada función y Perfil. */
export function CasillaIA({ id, marcada, onCambiar, ref }) {
  return (
    <div style={{ background: C.orquideaClara, borderRadius: 14, padding: '10px 14px 4px', border: `1px solid ${C.orquidea}` }}>
      <Casilla id={id} ref={ref} marcada={marcada} onCambiar={onCambiar} describedBy={`${id}-detalle`}>
        <strong>Usar la IA de Ronda.</strong> Autorizo el tratamiento de lo que le escribo a la IA de Ronda para que me responda.
      </Casilla>
      <ul id={`${id}-detalle`} style={{ margin: '4px 0 8px', paddingLeft: 52, fontSize: 15, lineHeight: 1.55, color: C.muted, textAlign: 'left' }}>
        <li style={{ marginBottom: 6 }}>
          Aplica a <strong>Tu Ronda</strong>, a la <strong>Guía IA de la Comunidad</strong> y a <strong>Crea tu programa</strong>. Para responderte, Tu Ronda también lee tu nombre, tu ciudad, tu intención, tus hábitos de hoy, tu ánimo de los últimos 7 días, tu última entrada del diario, tu programa activo y lo que recuerda de ti.
        </li>
        <li style={{ marginBottom: 6 }}>
          Lo procesa <strong>Anthropic</strong>, en Estados Unidos, que no lo usa para entrenar sus modelos. Si tocas escuchar una respuesta, <strong>ElevenLabs</strong> (Estados Unidos) la lee en voz alta.
        </li>
        <li>
          Si no lo marcas, esas tres funciones no se abren. Ayuda, los programas de 7 días, tus hábitos, tu diario y Afuera siguen igual.
        </li>
      </ul>
    </div>
  )
}

const botonPrincipal = (activo) => ({
  width: '100%', minHeight: 50, padding: '12px 20px', borderRadius: 14, border: 'none',
  background: activo ? C.morado : C.border, color: activo ? 'white' : C.muted,
  fontSize: 18, fontWeight: 700, fontFamily: 'inherit', cursor: activo ? 'pointer' : 'not-allowed',
})
const botonTexto = {
  minHeight: 44, padding: '0 12px', background: 'none', border: 'none', cursor: 'pointer',
  color: C.muted, fontSize: 16, fontWeight: 600, fontFamily: 'inherit', textDecoration: 'underline',
}
const parrafo = { margin: '0 0 14px', fontSize: 16, lineHeight: 1.6, color: C.text }

/* Pantalla completa, antes que cualquier otra. Arriba, siempre, Ayuda: ni
   el aviso ni «Lo íntimo es tuyo» la tapan. Mientras la Ayuda está abierta,
   esto queda inerte (inerte). */
function MarcoAutorizacion({ onAyuda, inerte, children }) {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.morado, fontFamily: FONT }}>
      <header inert={inerte} style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)', paddingLeft: 20, paddingRight: 12, paddingBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 48,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" fill="none" stroke={C.orquidea} strokeWidth="2" />
            <circle cx="12" cy="12" r="3.5" fill={C.agua} />
          </svg>
          <span style={{ fontSize: 28, fontWeight: 600, color: '#FFFFFF', fontFamily: FONT_DISPLAY, lineHeight: 1 }}>Ronda</span>
        </span>
        {/* id: si Ayuda se abrió en "Cargando..." y al cerrarla ya está esta
            pantalla, el foco vuelve aquí (useDialog en App). */}
        <button id="boton-ayuda" type="button" onClick={onAyuda} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '12px 10px', minHeight: 44,
          color: C.orquidea, fontSize: 15, fontWeight: 600, letterSpacing: '0.04em', fontFamily: 'inherit',
        }}>{BOTON_AYUDA}</button>
      </header>
      <main inert={inerte} style={{
        background: C.hoja, borderRadius: '24px 24px 0 0',
        minHeight: 'calc(100vh - 72px - env(safe-area-inset-top, 0px))',
        padding: '24px 16px 48px',
      }}>
        <div style={{ background: C.card, borderRadius: 20, padding: '24px 20px', boxShadow: SHADOW.md, maxWidth: 520, margin: '0 auto' }}>
          {children}
        </div>
        <p style={{ margin: '24px auto 0', maxWidth: 520, fontSize: 13, color: C.subtle, lineHeight: 1.5, textAlign: 'center', fontStyle: 'italic' }}>
          Si estás en crisis, llama a la <LineaCrisis numero="106">Línea 106</LineaCrisis>, o al <LineaCrisis numero="123">123</LineaCrisis> si estás en peligro inmediato.
        </p>
      </main>
    </div>
  )
}

/* (a2) modo 'intimo': después de crear la cuenta, una sola vez. «Seguir»
   sirve con la casilla marcada o sin marcar y se ve igual en los dos casos.
   (b) modo 'aviso': las ya inscritas, una sola vez y sin cerrarse hasta que
   responda. onResponder recibe { edad, cuenta, ia } o { ia }. */
export function PantallaAutorizacion({ modo, onResponder, onAyuda, onCerrarSesion, inerte }) {
  const aviso = modo === 'aviso'
  // «Cerrar sesión» primero guarda la prueba del rechazo (hasta 6 s).
  const [saliendo, setSaliendo] = useState(false)
  const [edad, setEdad] = useState(false)
  const [cuenta, setCuenta] = useState(false)
  const [ia, setIa] = useState(false)
  const [error, setError] = useState('')
  const [desacuerdo, setDesacuerdo] = useState(false)
  const tituloRef = useRef(null)

  // El lector de pantalla empieza por el título (y al ir y volver de «No estoy de acuerdo»).
  useEffect(() => { tituloRef.current?.focus({ preventScroll: true }) }, [desacuerdo])

  const obligatoriasListas = !aviso || (edad && cuenta)
  const seguir = () => {
    if (aviso) {
      if (!edad) { setError(`Ronda es solo para mayores de 18 años. Si tienes menos de 18, escríbenos a ${CORREO_DATOS} y borramos tu cuenta.`); return }
      if (!cuenta) { setError('Para mantener tu cuenta necesitamos tu autorización para tratar tus datos de cuenta.'); return }
      onResponder({ edad: true, cuenta: true, ia })
    } else {
      onResponder({ ia })
    }
  }
  const titulo = { margin: '0 0 14px', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 30, lineHeight: 1.1, color: C.navy, outline: 'none' }

  if (aviso && desacuerdo) {
    return (
      <MarcoAutorizacion onAyuda={onAyuda} inerte={inerte}>
        <h1 ref={tituloRef} tabIndex={-1} style={titulo}>Sin esta autorización no podemos mantener tu cuenta</h1>
        <p style={parrafo}>
          Si quieres, la borramos con todo lo que guarda: escríbenos a <a href={`mailto:${CORREO_DATOS}?subject=${encodeURIComponent('Borrar mi cuenta')}`} style={enlace}>{CORREO_DATOS}</a> desde el correo de tu cuenta y lo hacemos en máximo 15 días hábiles. Lo que está en este teléfono lo puedes borrar desde los ajustes de tu navegador.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" onClick={() => setDesacuerdo(false)} style={{ ...botonPrincipal(true), flex: 1, minWidth: 140 }}>Volver</button>
          {onCerrarSesion && (
            <button type="button" disabled={saliendo} onClick={async () => {
              // Sin red, cerrar sesión puede fallar o tardar: el botón vuelve
              // a estar activo para intentarlo otra vez (la prueba ya quedó
              // guardada en este teléfono).
              setSaliendo(true)
              try { await Promise.race([onCerrarSesion(), new Promise(resolve => setTimeout(resolve, 12000))]) } finally { setSaliendo(false) }
            }} style={{
              ...botonPrincipal(true), flex: 1, minWidth: 140, background: C.card, color: C.morado, border: `2px solid ${C.morado}`,
              cursor: saliendo ? 'wait' : 'pointer',
            }}>{saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
          )}
        </div>
      </MarcoAutorizacion>
    )
  }

  return (
    <MarcoAutorizacion onAyuda={onAyuda} inerte={inerte}>
      <h1 ref={tituloRef} tabIndex={-1} style={titulo}>
        {aviso ? 'Actualizamos cómo cuidamos tus datos' : 'Lo íntimo es tuyo'}
      </h1>

      {aviso ? <>
        <p style={parrafo}>
          Publicamos nuestra Política de Tratamiento de Datos y te pedimos tu autorización expresa, una sola vez. <strong>{NO_VENDE}</strong>
        </p>
        <Casilla id="aviso-edad" marcada={edad} onCambiar={v => { setEdad(v); setError('') }} invalida={!!error && !edad}>
          <strong>Tengo 18 años o más.</strong>
        </Casilla>
        <Casilla id="aviso-cuenta" marcada={cuenta} onCambiar={v => { setCuenta(v); setError('') }} invalida={!!error && edad && !cuenta}>
          <strong>Autorizo a Ronda el tratamiento de mis datos de cuenta y de uso</strong> (nombre, correo, perfil, hábitos, lo que hago en Afuera y cómo uso la app) para mantener mi cuenta y darme el servicio, como explica la <EnlacePolitica />.
        </Casilla>
        <p style={{ ...parrafo, marginTop: 14 }}>
          <strong>Lo íntimo es tuyo.</strong> Tu diario, tu ánimo y lo que le cuentas a la IA son datos sensibles y <strong>no estás obligada a autorizarnos a tratarlos</strong>. Tu diario, tus check-ins y lo que Tu Ronda recuerda de ti se quedan <strong>solo en este teléfono</strong>. Si antes se guardó una copia de tu diario en tu cuenta, la borramos de nuestros servidores en los próximos 30 días. Si la quieres antes, escríbenos a <a href={`mailto:${CORREO_DATOS}?subject=${encodeURIComponent('Pedir una copia de mi diario')}`} style={enlace}>{CORREO_DATOS}</a>.
        </p>
      </> : <>
        <p style={parrafo}>
          Tu diario, tu ánimo y lo que le cuentas a la IA de Ronda son <strong>datos sensibles</strong>: hablan de tus emociones y de tu salud. <strong>No estás obligada a autorizarnos a tratarlos.</strong>
        </p>
        <p style={parrafo}>
          Tu diario, tus check-ins y lo que Tu Ronda recuerda de ti <strong>se guardan solo en este teléfono</strong>. No los subimos a nuestros servidores.
        </p>
      </>}

      <CasillaIA id={aviso ? 'aviso-ia' : 'intimo-ia'} marcada={ia} onCambiar={setIa} />

      {!aviso && (
        <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: 1.55, color: C.muted }}>
          <em>{NO_VENDE} Lo cambias cuando quieras en Perfil → Tus autorizaciones.</em> <EnlacePolitica />
        </p>
      )}

      {error && (
        <div role="alert" style={{
          marginTop: 14, fontSize: 15, color: C.morado, background: C.roseLight, padding: '10px 14px',
          borderRadius: 10, fontWeight: 600, lineHeight: 1.5,
        }}>{error}</div>
      )}

      {/* En el aviso, «Seguir» se ve activo con las dos primeras casillas.
          Sin ellas no se apaga del todo: tocarlo dice qué falta. */}
      <button type="button" onClick={seguir} aria-disabled={!obligatoriasListas || undefined}
        style={{ ...botonPrincipal(obligatoriasListas), cursor: 'pointer', marginTop: 18 }}>
        Seguir
      </button>
      {aviso && (
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <button type="button" onClick={() => { setError(''); setDesacuerdo(true) }} style={botonTexto}>No estoy de acuerdo</button>
        </div>
      )}
    </MarcoAutorizacion>
  )
}

/* (c) En la misma pantalla de la función (no en una ventana encima): Tu
   Ronda, escribir en la Comunidad o Crea tu programa sin la autorización. */
export function TarjetaIA({ idBase, onAutorizar, onAhoraNo }) {
  const [ia, setIa] = useState(false)
  const tituloRef = useRef(null)
  useEffect(() => { tituloRef.current?.focus({ preventScroll: true }) }, [])
  return (
    <section id={idBase} aria-labelledby={`${idBase}-titulo`} style={{
      background: C.card, borderRadius: 18, padding: '20px 18px', boxShadow: SHADOW.md, border: `1px solid ${C.orquidea}`,
    }}>
      <h2 id={`${idBase}-titulo`} ref={tituloRef} tabIndex={-1} style={{
        margin: '0 0 8px', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 26, lineHeight: 1.15, color: C.navy, outline: 'none',
      }}>Para esto, la IA de Ronda tiene que leer lo que escribes</h2>
      <p style={parrafo}>Es opcional. Si no quieres, todo lo demás de Ronda sigue igual.</p>
      <CasillaIA id={`${idBase}-casilla`} marcada={ia} onCambiar={setIa} />
      {/* Al pedir la autorización: quién es la responsable y sus derechos
          (Ley 1581, art. 12, lit. c y d), igual que en «Lo íntimo es tuyo». */}
      <p style={{ margin: '14px 0 0', fontSize: 15, lineHeight: 1.55, color: C.muted }}>
        <em>{NO_VENDE} Lo cambias cuando quieras en Perfil → Tus autorizaciones.</em> <EnlacePolitica />
      </p>
      <button type="button" disabled={!ia} onClick={onAutorizar} style={{ ...botonPrincipal(ia), marginTop: 16 }}>Seguir</button>
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <button type="button" onClick={onAhoraNo} style={botonTexto}>Ahora no</button>
      </div>
    </section>
  )
}

/* (e) Perfil → Tus autorizaciones. Quitar la de la IA es un toque (y una
   confirmación). onCambiarIA(valor) devuelve una promesa: true si quedó
   guardado también en la nube. En este teléfono queda guardado siempre. */
export function TusAutorizaciones({ autorizaciones, onCambiarIA }) {
  const iaOk = iaAutorizada(autorizaciones)
  const [paso, setPaso] = useState(null) // null | 'quitar' | 'dar'
  const [marcada, setMarcada] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const pasoRef = useRef(null)
  const interruptorRef = useRef(null)
  const volverAlInterruptorRef = useRef(false)

  // Al abrir un paso, el foco va a su título (o a la casilla); al cerrarlo,
  // vuelve al interruptor (el botón tocado ya no está).
  useEffect(() => {
    if (paso) pasoRef.current?.focus({ preventScroll: true })
    else if (volverAlInterruptorRef.current && !guardando) {
      volverAlInterruptorRef.current = false
      interruptorRef.current?.focus({ preventScroll: true })
    }
  }, [paso, guardando])

  const cerrarPaso = () => {
    volverAlInterruptorRef.current = true
    setPaso(null)
    setMarcada(false)
  }
  const cambiar = async (valor) => {
    setGuardando(true)
    setMensaje('')
    const enLaNube = await onCambiarIA(valor)
    setGuardando(false)
    cerrarPaso()
    if (!enLaNube) setMensaje('No pudimos guardar el cambio. Revisa tu conexión e inténtalo de nuevo.')
    else if (!valor) setMensaje('Listo. Desde ahora la IA de Ronda no recibe lo que escribes.')
  }

  const fechaIA = iaOk ? fechaAutorizacion(autorizaciones?.ia?.en) : ''
  const fechaCuenta = fechaAutorizacion(autorizaciones?.cuenta?.en)
  const fila = { padding: '14px 0', borderTop: `1px solid ${C.border}` }
  const nombre = { fontSize: 17, fontWeight: 700, color: C.text }
  const detalle = { fontSize: 15, color: C.muted, lineHeight: 1.5, marginTop: 4 }
  const correo = (asunto) => `mailto:${CORREO_DATOS}?subject=${encodeURIComponent(asunto)}`

  return (
    <section aria-labelledby="perfil-autorizaciones-titulo" style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
        Tus datos y privacidad
      </div>
      <h2 id="perfil-autorizaciones-titulo" style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: C.text, fontFamily: FONT }}>
        Tus autorizaciones
      </h2>
      <p style={{ margin: '0 0 6px', fontSize: 16, color: C.muted, lineHeight: 1.55 }}>
        Tú decides qué hacemos con tus datos. {NO_VENDE}
      </p>

      {/* Usar la IA de Ronda */}
      <div style={fila}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span id="perfil-ia-nombre" style={nombre}>Usar la IA de Ronda</span>
          <button ref={interruptorRef} type="button" role="switch" aria-checked={iaOk} aria-labelledby="perfil-ia-nombre"
            aria-describedby="perfil-ia-detalle" disabled={guardando}
            onClick={() => { setMensaje(''); setMarcada(false); setPaso(iaOk ? 'quitar' : 'dar') }}
            style={{
              flexShrink: 0, minWidth: 76, minHeight: 44, padding: '0 6px', borderRadius: 22, cursor: 'pointer',
              border: `2px solid ${iaOk ? C.morado : C.contorno}`, background: iaOk ? C.morado : C.card,
              color: iaOk ? 'white' : C.muted, fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: iaOk ? 'flex-start' : 'flex-end', gap: 6,
            }}>
            {iaOk ? 'Sí' : 'No'}
            <span aria-hidden="true" style={{
              width: 26, height: 26, borderRadius: '50%', background: iaOk ? 'white' : C.contorno,
              order: iaOk ? 1 : -1,
            }} />
          </button>
        </div>
        <div id="perfil-ia-detalle" style={detalle}>
          Tu Ronda, la Guía IA de la Comunidad y Crea tu programa. <em>{iaOk ? (fechaIA ? `Autorizada el ${fechaIA}.` : 'Autorizada.') : 'No autorizada.'}</em>
        </div>

        {paso === 'quitar' && (
          <div role="group" aria-labelledby="perfil-ia-quitar" style={{ marginTop: 12, padding: 16, borderRadius: 14, background: C.cream, border: `1px solid ${C.border}` }}>
            <div id="perfil-ia-quitar" ref={pasoRef} tabIndex={-1} style={{ fontSize: 17, fontWeight: 700, color: C.text, outline: 'none' }}>
              ¿Quitamos esta autorización?
            </div>
            <div style={{ ...detalle, color: C.text }}>
              Desde ya, Tu Ronda, la Guía IA y Crea tu programa no se abren. Lo que Tu Ronda recuerda de ti sigue en este teléfono, y lo puedes borrar en «Lo que sé de ti».
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" onClick={cerrarPaso} style={{ ...botonPrincipal(true), flex: 1, minWidth: 120, background: C.card, color: C.morado, border: `2px solid ${C.morado}` }}>Mejor no</button>
              <button type="button" onClick={() => cambiar(false)} disabled={guardando} style={{ ...botonPrincipal(true), flex: 1, minWidth: 120 }}>Sí, quitar</button>
            </div>
          </div>
        )}

        {paso === 'dar' && (
          <div role="group" aria-label="Usar la IA de Ronda" style={{ marginTop: 12 }}>
            <CasillaIA id="perfil-ia-casilla" ref={pasoRef} marcada={marcada} onCambiar={setMarcada} />
            <button type="button" disabled={!marcada || guardando} onClick={() => cambiar(true)} style={{ ...botonPrincipal(marcada), marginTop: 12 }}>Seguir</button>
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <button type="button" onClick={cerrarPaso} style={botonTexto}>Ahora no</button>
            </div>
          </div>
        )}

        {mensaje && <div role="status" style={{ ...detalle, color: C.olivaOscura, background: C.sageClara, padding: '10px 14px', borderRadius: 10, fontWeight: 600, marginTop: 12 }}>{mensaje}</div>}
      </div>

      {/* Datos de tu cuenta */}
      <div style={fila}>
        <div style={nombre}>Datos de tu cuenta</div>
        <div style={detalle}>
          <em>{fechaCuenta ? `Autorizada el ${fechaCuenta}.` : 'Autorizada.'}</em> Es necesaria para tener cuenta. Si ya no la quieres, pídenos que borremos tu cuenta.
        </div>
      </div>

      {/* Lo que no sale del teléfono */}
      <div style={fila}>
        <div style={nombre}>Tu diario, tus check-ins y lo que Tu Ronda recuerda de ti</div>
        <div style={detalle}><em>Solo en este teléfono.</em></div>
      </div>

      <div style={{ ...fila, display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 15, lineHeight: 1.5 }}>
        <EnlacePolitica style={{ padding: '6px 0' }} />
        <a href={correo('Pedir una copia de mis datos')} style={{ ...enlace, padding: '6px 0' }}>Pedir una copia de mis datos</a>
        <a href={correo('Corregir o borrar mis datos')} style={{ ...enlace, padding: '6px 0' }}>Corregir o borrar mis datos</a>
        <a href={correo('Borrar mi cuenta')} style={{ ...enlace, padding: '6px 0' }}>Borrar mi cuenta</a>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 15, color: C.muted, lineHeight: 1.55 }}>
        Escríbenos a <a href={`mailto:${CORREO_DATOS}`} style={enlace}>{CORREO_DATOS}</a>, preferiblemente desde el correo de tu cuenta.
      </p>
    </section>
  )
}
