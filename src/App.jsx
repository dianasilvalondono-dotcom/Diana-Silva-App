import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import './App.css'
import { C, colorTexto } from './constants/colors'
import { FONT, FONT_DISPLAY, SHADOW } from './constants/tokens'
import { ICONS, MOOD_ICONS, UI_ICONS } from './constants/icons'
import Badge from './components/ui/Badge'
import LineaCrisis from './components/ui/LineaCrisis'
import SalidaAyuda from './components/ui/SalidaAyuda'
import HistoriaView from './components/views/HistoriaView'
import DiarioView from './components/views/DiarioView'
import RondasView from './components/views/RondasView'
import { TEMPORADA, temporadaVigente, mesTemporada, CIUDAD_KEY, CIUDAD_POR_DEFECTO, ciudadValida } from './constants/curaduria'
import { borrarReportesViejos } from './lib/curaduria'
import {
  DIMS, DIM_POR_DEFECTO, dimValida, DEFAULT_MORNING, DEFAULT_MIDDAY, DEFAULT_NIGHT,
  TOOLKIT_CATS, PROGRAMAS, PROGRAMAS_PREMIUM, SUGGESTED_HABITS,
  PLAN_PAGO, PLAN_PRECIO,
} from './constants/data'
import { todayKey, dateKey, load, save, saveDay, limpiarDiasVacios, leerHistorialHabitos, rachaHabito, totalesHabitosPorDia, guardarTotalDia, horaAMinutos, horaValida, horaHHMM, ordenarPorHora, formatRelative, franjaDelDia, getGreeting, seGuardo, MOOD_LABELS, MOOD_COLORS, runMigrationCleanDianaDefaults, asegurarDuenaLocal, duenaLocal, guardadoEstaBloqueado, safeKeys, STORAGE_ERROR_EVENT } from './utils/helpers'

// Migration corre UNA VEZ por dispositivo, antes de que React inicialice estados.
// Limpia los hábitos/rutinas que eran de Diana — respeta lo que cada usuaria agregó.
runMigrationCleanDianaDefaults()
// Borra las claves diarias vacías que dejaban las versiones anteriores.
limpiarDiasVacios()
// Borra del teléfono los mensajes sobre un plan que una versión anterior
// guardó sin enviar (src/lib/curaduria.js).
borrarReportesViejos()
import { useAuth } from './lib/useAuth'
import { apiFetch } from './lib/supabase'
import { initAnalytics, track, identifyUser, setUserProps, resetAnalytics } from './lib/analytics'
import { useOneSignal } from './lib/useOneSignal'
import { useSpeech } from './lib/useSpeech'
import { useDialog } from './lib/useDialog'
import AuthScreen from './components/AuthScreen'
import { PantallaAutorizacion, TarjetaIA, TusAutorizaciones, EnlacePolitica } from './components/Autorizaciones'
import {
  leerAutorizaciones, guardarAutorizaciones, cuentaAutorizada as cuentaAutorizadaEn, iaAutorizada as iaAutorizadaEn,
  iaRespondida, registrar as registrarAutorizaciones, adoptar as adoptarAutorizaciones, leerAutorizacionesNube,
  subirAutorizaciones, trasSubir, hayQueSubir, crearCola, esperarIAEnNube,
} from './lib/autorizaciones'
import { syncFromLocal, getUserProfile, saveUserProfile, getToolkitItems, saveToolkitItems, CAMPOS_PERFIL } from './lib/database'
import { isCrisis, CRISIS_TEXT, CRISIS_TEXT_CHAT, CHAT_ERROR_TEXT, BOTON_AYUDA } from './utils/crisis'
import { esAdmin, rondaPlusVigente } from './utils/plan'
import { ultimaEntradaDiario } from './utils/diario'

/* Antes de pagar Ronda+: lo que usa la IA pide su propia autorización
   (textos-autorizacion-v1; Ley 1581, art. 6). Va en el paywall y en el plan. */
const NOTA_IA_PLUS = 'Tu Ronda, escribir en la Comunidad y Crea tu programa usan la IA de Ronda. Para estas tres funciones te pedimos una autorización aparte, que das o quitas cuando quieras en Perfil → Tus autorizaciones.'

// Largo máximo de una publicación en la Comunidad (api/guia.js valida lo mismo).
const BOARD_MAX = 2000

/* Cuando un cambio se lleva el control que tenía el foco (un formulario que
   se cierra o se abre en su lugar, un botón que se apaga), el foco pasa al
   elemento `id` después del render, en vez de perderse en <body>. Con
   centrar, además se trae a la vista. */
function enfocarDespues(id, { centrar = false } = {}) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id)
    if (!el) return
    el.focus({ preventScroll: true })
    if (centrar) el.scrollIntoView({ block: 'center' })
  })
}

/* Trae a la vista algo que aparece en su lugar (la tarjeta de la IA en la
   Comunidad), entre el encabezado fijo (124 px) y el menú fijo de abajo: si
   cabe, completo; si es más alto que lo que se ve, desde su título. Las
   márgenes las pone el elemento (scrollMarginTop y scrollMarginBottom). */
function traerALaVista(el, { arriba = 140, abajo = 120 } = {}) {
  if (!el) return
  const cabe = el.getBoundingClientRect().height <= window.innerHeight - arriba - abajo
  el.scrollIntoView({ block: cabe ? 'nearest' : 'start' })
}

/* Cuando se va una pantalla completa (el aviso único, «Lo íntimo es tuyo»),
   la que llega empieza arriba y el foco pasa a su título: si no, se queda en
   <body> y quien usa teclado o lector de pantalla pierde su lugar. */
function enfocarPantallaNueva() {
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    const titulo = document.querySelector('main h1') || document.querySelector('h1')
    if (!titulo) return
    if (!titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1')
    titulo.focus({ preventScroll: true })
  })
}

/* ── Reusable components ── */
function Bar({ value, color = C.rose, height = 6 }) {
  return (
    <div style={{ height, background: C.border, borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: height, transition: 'width 0.6s ease' }} />
    </div>
  )
}

/* ── Sub-tab navigation (pill style) ──
   A nivel de módulo: si se declarara dentro de App, cada render crearía un
   componente nuevo y React desmontaría los botones (el foco se iría a <body>).
   Patrón de pestañas: solo la elegida entra con Tab; las flechas, Inicio y
   Fin cambian de pestaña. Cada pestaña apunta al panel `${idBase}-panel`,
   que pone quien la usa (role="tabpanel"). */
const TAB_COLORS = [C.teal, C.coral, C.lavanda, C.gold, C.rose, C.mint]
function SubTabs({ tabs, active, onChange, accentColor, label, idBase }) {
  const alTeclear = (e) => {
    const i = tabs.findIndex(t => t.id === active)
    const destino = e.key === 'ArrowRight' ? (i + 1) % tabs.length
      : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? tabs.length - 1
      : null
    if (destino === null) return
    e.preventDefault()
    onChange(tabs[destino].id)
    e.currentTarget.querySelectorAll('[role="tab"]')[destino]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} onKeyDown={alTeclear} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      {tabs.map((t, i) => {
        const color = accentColor || TAB_COLORS[i % TAB_COLORS.length]
        return (
        <button key={t.id} type="button" role="tab" id={`${idBase}-tab-${t.id}`} aria-controls={`${idBase}-panel`}
          aria-selected={active === t.id} tabIndex={active === t.id ? 0 : -1} onClick={() => onChange(t.id)} style={{
          padding: '8px 18px', borderRadius: 20, border: active === t.id ? 'none' : `1.5px solid ${C.border}`, cursor: 'pointer',
          background: active === t.id ? color : C.card,
          color: active === t.id ? 'white' : C.text,
          fontSize: 19, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
          boxShadow: active === t.id ? `0 2px 10px ${color}40` : 'none',
          transition: 'all 0.15s',
        }}>
          {t.label}
        </button>
      )})}
    </div>
  )
}

/* ── Paywall component ──
   A nivel de módulo por la misma razón que SubTabs. onCta abre el aviso
   (lo decide App, que tiene el estado del modal). */
function Paywall({ feature, price, desc, onCta }) {
  return (
    <div style={{
      textAlign: 'center', padding: 32, background: `linear-gradient(135deg, ${C.rose}08, ${C.gold}08)`,
      borderRadius: 20, border: `1.5px solid ${C.roseLight}`,
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: FONT, marginBottom: 8 }}>
        {feature}
      </div>
      <div style={{ fontSize: 20, color: C.muted, lineHeight: 1.6, marginBottom: 20, maxWidth: 300, margin: '0 auto 20px' }}>
        {desc}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.gold, marginBottom: 4 }}>{price}</div>
      <div style={{ fontSize: 20, color: C.subtle, marginBottom: 16 }}>Cancela cuando quieras</div>
      <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.55, maxWidth: 320, margin: '0 auto 20px' }}>{NOTA_IA_PLUS}</p>
      <button type="button" onClick={() => { track('paywall_cta_clicked', { feature }); onCta?.() }} style={{
        padding: '14px 32px', borderRadius: 14, border: 'none',
        background: `linear-gradient(135deg, ${C.gold}, #141833)`, color: 'white',
        fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: '0 4px 16px rgba(114,109,45,0.3)',
      }}>
        Desbloquear {PLAN_PAGO}
      </button>
      <div style={{ fontSize: 19, color: C.subtle, marginTop: 12 }}>
        Próximamente · Te avisamos cuando esté disponible
      </div>
    </div>
  )
}

/* Un programa creado con la IA llega como { title, desc, days: [{ day, title, task }] }.
   Se completa lo que la app necesita para pintarlo (color y número de día). */
function normalizarPrograma(p) {
  const dias = Array.isArray(p?.days) ? p.days : []
  return {
    ...p,
    color: p?.color || '#592147',
    days: dias.map((d, i) => ({
      ...d,
      day: Number.isInteger(d?.day) ? d.day : i + 1,
      title: d?.title || `Día ${i + 1}`,
      task: d?.task || '',
    })),
  }
}

/* ── Tu Ronda: conversación y memoria ── */
// Saludo al abrir el chat. Es de la app, no del modelo (local: no se envía
// como historial a /api/agent).
const CHAT_GREETING = { role: 'assistant', local: true, text: '¡Hola! Soy Tu Ronda — tu compañera de camino. ¿Cómo vas hoy? Puedo ayudarte con tus hábitos, sugerirte un programa, o simplemente estar aquí contigo.' }
// La conversación se guarda en este dispositivo ('ronda-chat'): los últimos 30 mensajes.
const CHAT_KEY = 'ronda-chat'
const CHAT_MAX = 30
// Los hábitos guardados ('diana-habits'). Uno con una dimensión que no
// existe pasa a la dimensión por defecto en vez de tumbar la app; lo que no
// es un hábito (null, sin nombre) se salta.
function cargarHabitos() {
  const guardados = load('diana-habits', [])
  return Array.isArray(guardados)
    ? guardados
      .filter(h => h && typeof h === 'object' && typeof h.name === 'string' && h.name.trim())
      .map(h => (dimValida(h.dim) === h.dim ? h : { ...h, dim: dimValida(h.dim) }))
    : []
}
function cargarChat() {
  const guardado = load(CHAT_KEY, null)
  // El aviso de un programa creado en el chat no se recupera: el programa
  // no se guarda hasta que la usuaria lo guarda en Rutas.
  const mensajes = Array.isArray(guardado)
    ? guardado.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && !m.isProgram)
    : []
  return mensajes.length ? mensajes.slice(-CHAT_MAX) : [CHAT_GREETING]
}
// La memoria nueva se suma a la que ya había (el modelo solo devuelve lo
// nuevo), sin repetir —se compara en minúsculas y sin espacios— y con un
// tope: si se pasa, quedan los más recientes.
function unirMemoria(previos, nuevos, tope) {
  const lista = []
  const vistos = new Set()
  for (const x of [...(Array.isArray(previos) ? previos : []), ...(Array.isArray(nuevos) ? nuevos : [])]) {
    if (typeof x !== 'string') continue
    const texto = x.trim()
    const clave = texto.toLowerCase().replace(/\s+/g, '')
    if (!clave || vistos.has(clave)) continue
    vistos.add(clave)
    lista.push(texto)
  }
  return lista.slice(-tope)
}

/* ── Toolkit en la nube ── */
const claveRecurso = (t) => `${String(t?.name || '').trim().toLowerCase()}|${String(t?.url || '').trim()}|${t?.cat || ''}`
// Une el toolkit de este dispositivo con el de la nube, sin repetir (mismo
// nombre, enlace y categoría). Lo local va primero.
function unirToolkit(locales, remotos) {
  const base = Array.isArray(locales) ? locales : []
  const vistos = new Set(base.map(claveRecurso))
  const nuevos = []
  for (const t of Array.isArray(remotos) ? remotos : []) {
    if (!t || !t.name || vistos.has(claveRecurso(t))) continue
    vistos.add(claveRecurso(t))
    nuevos.push(t)
  }
  return nuevos.length ? [...base, ...nuevos] : base
}
// Huella del contenido (sin importar el orden): si no cambió, no se sube.
const firmaToolkit = (lista) => JSON.stringify((Array.isArray(lista) ? lista : [])
  .map(t => [t.name || '', t.url || '', t.cat || '', t.note || '', t.added || ''].join('\u0001')).sort())

/* Une dos trozos de texto con un espacio, sin duplicarlo. */
function juntarTexto(a, b) {
  if (!b) return a
  if (!a) return b
  return /\s$/.test(a) ? a + b : `${a} ${b}`
}

/* ¿Lo de este teléfono es de otra cuenta? Sin almacenamiento no hay dueña
   guardada: entonces no es de otra (ver asegurarDuenaLocal). */
const datosDeOtraCuenta = (id) => guardadoEstaBloqueado() || (!!duenaLocal() && duenaLocal() !== id)

/* ═══════════════════════════════════════════ */
/*                   APP                       */
/* ═══════════════════════════════════════════ */

/* ── La puerta que se abre sola ──
   En la mañana y en la noche (madrugada incluida), Ronda abre en Adentro
   (tus rituales); en la tarde, en Afuera. Las franjas salen de
   franjaDelDia (helpers.js). La usuaria puede fijar una puerta desde
   "Cambiar"; se guarda en este dispositivo. */
const PUERTA_KEY = 'ronda_puerta'
function puertaInicial() {
  const fija = load(PUERTA_KEY, 'auto')
  if (['rondas', 'ahora', 'juntas'].includes(fija)) return { view: fija, motivo: 'elegida' }
  const franja = franjaDelDia()
  return { view: franja === 'tarde' ? 'rondas' : 'ahora', motivo: franja }
}

function App() {
  // Auth
  const { user, loading: authLoading, isConfigured, signInWithEmail, signUp, signOut, resetPassword, updatePassword, recovering, clearRecovering } = useAuth()
  // El id de la cuenta: los efectos dependen de él y no del objeto `user`,
  // que cambia en cada carga y en cada renovación del token (perfil-2).
  const userId = user?.id || null

  const [puerta] = useState(puertaInicial)
  const [view, setView] = useState(puerta.view)
  const [motivoPuerta, setMotivoPuerta] = useState(puerta.motivo)
  const [eligiendoPuerta, setEligiendoPuerta] = useState(false)
  const [avisoPuerta, setAvisoPuerta] = useState(null)
  const avisoPuertaTimerRef = useRef(null)
  // La preferencia guardada (para marcarla en Perfil sin leer localStorage en cada render)
  const [puertaGuardada, setPuertaGuardada] = useState(() => load(PUERTA_KEY, 'auto'))
  const [subTab, setSubTab] = useState('') // sub-navigation within tabs
  // Al cambiar de sección o de herramienta, la pantalla nueva empieza arriba
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [view, subTab])
  // Admin check — Diana sees everything, others see paywall
  // (La misma regla del servidor: src/utils/plan.js.)
  const isAdmin = !!user && esAdmin(user.email)

  // ─── Autorizaciones de datos (src/lib/autorizaciones.js) ───
  // Sin la de cuenta (y la de edad) sale el aviso único; sin responder lo
  // de la IA, «Lo íntimo es tuyo». Sin la de la IA, nada se envía a la IA.
  // Todo cambio pasa por cambiarAutorizaciones: así la cola de subidas
  // (más abajo) siempre lee lo último, aunque React aún no haya pintado.
  const [autorizaciones, setAutorizacionesEstado] = useState(leerAutorizaciones)
  const autorizacionesRef = useRef(autorizaciones)
  const cambiarAutorizaciones = useCallback((cambio) => {
    const previo = autorizacionesRef.current
    const siguiente = typeof cambio === 'function' ? cambio(previo) : cambio
    if (siguiente === previo) return previo
    autorizacionesRef.current = siguiente
    setAutorizacionesEstado(siguiente)
    return siguiente
  }, [])
  useEffect(() => { guardarAutorizaciones(autorizaciones) }, [autorizaciones])
  const cuentaAutorizada = cuentaAutorizadaEn(autorizaciones)
  const iaOk = iaAutorizadaEn(autorizaciones)
  // De qué cuenta ya se revisó la nube (otro teléfono) y el registro.
  const [autorizacionesDe, setAutorizacionesDe] = useState(null)
  // En la Comunidad, la tarjeta que pide la autorización de la IA.
  const [pidiendoIA, setPidiendoIA] = useState(false)

  // Premium status from Supabase (founding members + paid subscribers)
  const [premiumStatus, setPremiumStatus] = useState({ is_premium: false, premium_until: null, premium_source: null })
  // De qué cuenta es premiumStatus (para la analítica: no manda el plan por defecto).
  const [premiumDe, setPremiumDe] = useState(null)
  useEffect(() => {
    if (!user) { setPremiumStatus({ is_premium: false, premium_until: null, premium_source: null }); setPremiumDe(null); return }
    let cancelled = false
    getUserProfile(user.id).then(profile => {
      if (cancelled || !profile) return
      const status = {
        is_premium: rondaPlusVigente(profile),
        premium_until: profile.premium_until,
        premium_source: profile.premium_source,
      }
      setPremiumStatus(status)
      setPremiumDe(user.id)
      // El perfil de la nube completa los campos vacíos de este dispositivo
      // (lo escrito aquí manda). Solo si los datos locales son de esta cuenta.
      if (guardadoEstaBloqueado() || duenaLocal() !== user.id) return
      // Un nombre igual al de la cuenta lo puso la app, no ella: si en la
      // nube hay otro (lo eligió en otro dispositivo), ese manda (perfil-2).
      const nombreCuenta = user.user_metadata?.name || user.user_metadata?.full_name || ''
      setProfile(prev => {
        const next = { ...prev }
        let cambio = false
        for (const k of CAMPOS_PERFIL) {
          const remoto = typeof profile[k] === 'string' ? profile[k] : ''
          const local = typeof prev[k] === 'string' ? prev[k] : ''
          const localDeLaCuenta = k === 'name' && !!nombreCuenta && local === nombreCuenta
          if (remoto.trim() && remoto !== local && (!local.trim() || localDeLaCuenta)) { next[k] = remoto; cambio = true }
        }
        return cambio ? next : prev
      })
    })
    return () => { cancelled = true }
  }, [user])

  const isPremium = isAdmin || premiumStatus.is_premium
  const isFoundingMember = premiumStatus.premium_source === 'founding_member'

  // ─── Analítica (PostHog): solo con la autorización de cuenta ───
  // Antes de que la dé (el aviso único, o si toca «Rechazar la autorización»),
  // PostHog ni carga ni sabe quién es (Decreto 1377, art. 5). Con ella, se
  // vincula a la usuaria (base de la retención D1/D7/D30) y app_opened sale
  // una vez por cuenta y por sesión. Si lo de este teléfono es de otra cuenta
  // (entró otra en el mismo teléfono), espera: la autorización que hay en
  // memoria es de la anterior (asegurarDuenaLocal, más abajo, la aparta).
  const appAbiertaDeRef = useRef(null)
  useEffect(() => {
    if (!cuentaAutorizada || (isConfigured && !userId)) return
    if (userId && datosDeOtraCuenta(userId)) return
    initAnalytics()
    if (!userId) return
    identifyUser(userId)
    if (appAbiertaDeRef.current !== userId) {
      appAbiertaDeRef.current = userId
      track('app_opened')
    }
  }, [cuentaAutorizada, isConfigured, userId])
  useEffect(() => {
    if (!cuentaAutorizada || !userId || premiumDe !== userId || datosDeOtraCuenta(userId)) return
    setUserProps({
      is_premium: premiumStatus.is_premium,
      premium_source: premiumStatus.premium_source || 'free',
      is_founding_member: premiumStatus.premium_source === 'founding_member',
    })
  }, [cuentaAutorizada, userId, premiumDe, premiumStatus])

  // ─── Analitica: paywall de pantalla (IA) — una vez por sesion ───
  const paywallSeenRef = useRef({})
  useEffect(() => {
    if (view === 'ahora' && subTab === 'ai' && !isPremium && !paywallSeenRef.current.ai) {
      paywallSeenRef.current.ai = true
      track('paywall_viewed', { feature: 'tu_ronda_ia', price: PLAN_PRECIO })
    }
  }, [view, subTab, isPremium])

  // ─── Analitica: al cerrar sesion, desvincular a la usuaria ───
  const prevUserIdRef = useRef(null)
  useEffect(() => {
    if (prevUserIdRef.current && !user) resetAnalytics()
    prevUserIdRef.current = user?.id || null
  }, [user])

  // ─── Push notifications con OneSignal ───
  const oneSignal = useOneSignal()
  const { status: osStatus, setExternalUserId: osSetExternalUserId } = oneSignal
  // Vincular el user.id de Supabase con la suscripción de OneSignal
  // (permite mandar push targeted a usuarias específicas). Solo con la
  // autorización de cuenta, y sin el correo: para los recordatorios no hace
  // falta, y escribirle por correo pediría una autorización aparte. Nunca
  // con la autorización de otra cuenta (la que entró antes en este teléfono).
  useEffect(() => {
    if (osStatus === 'subscribed' && userId && cuentaAutorizada && !datosDeOtraCuenta(userId)) osSetExternalUserId(userId)
  }, [osStatus, userId, cuentaAutorizada, osSetExternalUserId])
  // Al cerrar sesión, el teléfono se suelta de la cuenta en OneSignal: si
  // entra otra cuenta aquí, los recordatorios de la anterior no le llegan.
  // Los botones de cerrar sesión ya lo hacen (y pausan); esto cubre la
  // sesión que se cierra sola (solo logout).
  const { soltarCuenta: osSoltarCuenta } = oneSignal
  const prevUserOSRef = useRef(null)
  useEffect(() => {
    if (prevUserOSRef.current && !userId) osSoltarCuenta()
    prevUserOSRef.current = userId
  }, [userId, osSoltarCuenta])

  // ─── Modal genérico de la marca (reemplaza alert() feo del navegador) ───
  // { type: 'success'|'info'|'paywall'|'confirm', title, body, cta, onConfirm }
  // 'confirm' pide un sí antes de borrar: el CTA ejecuta onConfirm; "Cancelar",
  // Escape o tocar el fondo lo cierran sin hacer nada.
  const [appModal, setAppModal] = useState(null)
  // A dónde va el foco al cerrar el modal, si no debe volver al botón que lo
  // abrió (porque ese botón se borró con lo confirmado, o porque quedó lejos
  // de lo que se ve). Se fija al confirmar o al abrir; se usa una vez.
  const focoTrasModalRef = useRef(null)
  // Si el navegador no deja guardar (memoria llena o almacenamiento
  // bloqueado), save() avisa una sola vez con este evento (salud-global-2).
  // Va antes de los efectos que guardan para escuchar desde el primero.
  useEffect(() => {
    const avisar = () => setAppModal({
      type: 'info',
      title: 'No pudimos guardar en este dispositivo',
      body: 'Libera espacio o revisa los permisos del navegador. Puedes seguir usando Ronda, pero lo nuevo podría perderse al cerrarla.',
    })
    window.addEventListener(STORAGE_ERROR_EVENT, avisar)
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, avisar)
  }, [])

  // ─── Aviso "esta función de Ronda+ la tienes incluida" para miembros
  // fundadoras — solo 1 vez por función ───
  const [foundingMsgShown, setFoundingMsgShown] = useState(() => load('ronda-founding-msg-shown', {}))
  const [foundingToast, setFoundingToast] = useState(null) // { feature: 'Tu Ronda', key: 'chat' }

  // Marca el aviso de esa función como visto. true si es la primera vez y
  // hay que mostrarlo. Se llama desde handlers (nunca en el render).
  const marcarAvisoFundadora = (featureKey) => {
    if (!isFoundingMember) return false
    if (foundingMsgShown[featureKey]) return false
    const next = { ...foundingMsgShown, [featureKey]: true }
    setFoundingMsgShown(next)
    save('ronda-founding-msg-shown', next)
    return true
  }
  const showFoundingPerk = (featureKey, featureName) => {
    if (marcarAvisoFundadora(featureKey)) setFoundingToast({ feature: featureName, key: featureKey })
  }
  // Corto (dos renglones en el celular): en Pregúntale el aviso va encima de
  // la conversación y le quita espacio mientras está abierto.
  const TEXTO_FUNDADORA = `Es parte de ${PLAN_PAGO} y la tienes incluida por ser de las primeras 50 mujeres. Disfrútala.`
  // El aviso va en la misma pantalla de la función, en su lugar: no flota
  // encima del selector del chat ni del campo (ia-18). Se queda hasta que lo
  // cierra o cambia de pantalla; no se va solo, así nada salta debajo del dedo.
  const avisoFundadora = (featureKey) => foundingToast?.key === featureKey && (
    <div style={{
      flexShrink: 0, marginBottom: 12,
      background: `linear-gradient(135deg, ${C.gold}, ${C.rose})`,
      borderRadius: 18, padding: '8px 4px 10px 18px', color: 'white',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{ flex: 1, paddingTop: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.9, marginBottom: 2 }}>
          <span aria-hidden="true">💛 </span>Miembro fundadora
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, lineHeight: 1.3 }}>{foundingToast.feature}</div>
        <div style={{ fontSize: 14, lineHeight: 1.4, opacity: 0.95 }}>{TEXTO_FUNDADORA}</div>
      </div>
      <button type="button" aria-label="Cerrar aviso de miembro fundadora" onClick={(e) => {
        // El foco pasa a lo que sigue al aviso (no se pierde en <body>).
        const sigue = e.currentTarget.parentElement?.nextElementSibling
        setFoundingToast(null)
        requestAnimationFrame(() => {
          const sel = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled])'
          ;(sigue?.matches?.(sel) ? sigue : sigue?.querySelector?.(sel))?.focus({ preventScroll: true })
        })
      }} style={{
        background: 'none', border: 'none', padding: 0, width: 44, height: 44, cursor: 'pointer',
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span aria-hidden="true" style={{
          width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{UI_ICONS.close('white', 14)}</span>
      </button>
    </div>
  )

  // AI Agent state
  const [aiGoal, setAiGoal] = useState('')
  const [aiContext, setAiContext] = useState('')
  const [aiStep, setAiStep] = useState(0) // 0=meta, 1=contexto (y error), 3=creando, 4=resultado
  const [aiProgram, setAiProgram] = useState(null)
  const [aiError, setAiError] = useState('')
  // La meta o el contexto traen una señal de crisis: en vez del programa, el
  // texto de crisis con "Abrir Ayuda" (como en el chat).
  const [aiCrisis, setAiCrisis] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)
  // Chat state (Tu Ronda)
  // local: true = mensaje de la app (saludo, avisos, errores), no del modelo:
  // se muestra y se guarda, pero no se envía como historial a /api/agent.
  const [chatMessages, setChatMessages] = useState(cargarChat)
  useEffect(() => {
    try { save(CHAT_KEY, chatMessages.slice(-CHAT_MAX)) } catch { /* sin almacenamiento */ }
  }, [chatMessages])
  // Una conversación = cada vez que entra a Pregúntale (no cada mensaje):
  // el contador de la memoria sube con la primera respuesta de esa visita.
  const chatSesionContadaRef = useRef(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMode, setChatMode] = useState('chat') // 'chat' or 'create'
  // Voz de Tu Ronda. Apagada en esta versión (VOZ_ACTIVA = false, src/utils/voz.js):
  // available queda en false y el botón «Escuchar» no se muestra. Prendida, si
  // /api/speak no está configurado, available también queda en false. Si falla,
  // errorId marca el mensaje por un momento.
  // El hook vive en App (no se desmonta): al salir del chat se llama stopSpeech.
  // Un 403 de la voz pasa por el mismo detector que el chat (iaRechazadaEnServidor,
  // más abajo): si es el de la IA sin autorizar, se vuelven a leer las autorizaciones.
  const iaRechazadaRef = useRef(null)
  const { speak, stop: stopSpeech, speakingId, loadingId: speechLoadingId, errorId: speechErrorId, available: voiceAvailable } = useSpeech({
    alRechazar: (resp) => iaRechazadaRef.current?.(resp),
  })
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Día al que pertenecen los estados diarios (hábitos, rutina, check-ins,
  // tareas). Si cambia el día con la app abierta, pasa al nuevo con
  // cambiarDeDia (sin recargar): lo de ayer queda en la clave de ayer y
  // nunca se copia a hoy.
  const [diaApp, setDiaApp] = useState(todayKey)

  // Habits
  const [habits, setHabits] = useState(cargarHabitos)
  const [checked, setChecked] = useState(() => load(`diana-checked-${diaApp}`, {}))
  // Días anteriores con hábitos marcados ({ 'AAAA-MM-DD': { id: true } }). Se
  // lee una sola vez: durante la sesión solo cambia hoy, que sale de `checked`.
  const [historialPrevio, setHistorialPrevio] = useState(() => {
    const h = leerHistorialHabitos()
    delete h[diaApp]
    return h
  })
  // Cuántos hábitos tenía cada día anterior (habitos-5): el calendario
  // compara cada día con su propio total, no con los hábitos de hoy.
  const [totalesPrevios, setTotalesPrevios] = useState(() => totalesHabitosPorDia(historialPrevio, diaApp, habits.length))

  // Routines (editable by each user)
  const [morning, setMorning] = useState(() => load('diana-morning', DEFAULT_MORNING))
  const [midday, setMidday] = useState(() => load('diana-midday', DEFAULT_MIDDAY))
  const [night, setNight] = useState(() => load('diana-night', DEFAULT_NIGHT))
  const [routineChecked, setRoutineChecked] = useState(() => load(`diana-routine-${diaApp}`, {}))
  const [editingRoutine, setEditingRoutine] = useState(false)
  const [editingRoutineItem, setEditingRoutineItem] = useState(null) // { sectionKey, id, time, task, emoji }
  const [newRoutineTask, setNewRoutineTask] = useState('')
  const [newRoutineTime, setNewRoutineTime] = useState('')
  const [newRoutineEmoji, setNewRoutineEmoji] = useState('✨')
  const [newRoutineSection, setNewRoutineSection] = useState('morning')
  // Tomorrow planning (night ritual)
  // Lo que se escribe hoy en "¿Qué necesito hacer mañana?" se guarda en
  // ronda-tomorrow-<hoy>. Al día siguiente esa misma clave (la de ayer) se
  // muestra como "Lo que planeaste para hoy".
  const [tomorrowTasks, setTomorrowTasks] = useState(() => load(`ronda-tomorrow-${diaApp}`, []))
  const [ayerApp, setAyerApp] = useState(() => dateKey(-1))
  const [plannedToday, setPlannedToday] = useState(() => load(`ronda-tomorrow-${ayerApp}`, []))
  const [newTomorrowTask, setNewTomorrowTask] = useState('')

  // Journal
  const [entries, setEntries] = useState(() => load('diana-journal', []))
  const [journalText, setJournalText] = useState('')
  const [journalMood, setJournalMood] = useState(2)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  // Toolkit
  const [toolkitItems, setToolkitItems] = useState(() => load('diana-toolkit', []))
  const [showAddTool, setShowAddTool] = useState(false)
  const [newToolName, setNewToolName] = useState('')
  const [newToolUrl, setNewToolUrl] = useState('')
  const [newToolCat, setNewToolCat] = useState('podcast')
  const [newToolNote, setNewToolNote] = useState('')
  const [toolFilter, setToolFilter] = useState('todas')

  // Profile
  const [profile, setProfile] = useState(() => load('diana-profile', {
    name: '', city: '', bio: '', intention: '', emoji: '',
  }))
  const [editingProfile, setEditingProfile] = useState(false)

  // ─── Memoria persistente de Tu Ronda (Fase 1 — Asistente Personal) ───
  // Contiene lo que la agente ha aprendido sobre la usuaria a lo largo del tiempo
  const [memory, setMemory] = useState(() => load('ronda-memory', {
    facts: [],              // ["tiene 2 hijos", "trabaja en marketing", "le da ansiedad los domingos"]
    patterns: [],           // ["mood bajo los lunes", "mejor dormida con meditación"]
    preferences: {},        // { tono: "cálido", tuteo: true }
    summary: '',            // Resumen narrativo actualizado
    lastUpdated: null,
    conversationCount: 0,
  }))
  useEffect(() => { save('ronda-memory', memory) }, [memory])

  // Onboarding
  const [onboarded, setOnboarded] = useState(() => load('ronda-onboarded', false))

  // Admin always sees onboarding (for demos/investors) — incluye las intros
  // de módulo, para mostrar el flujo progresivo completo en una demo.
  useEffect(() => {
    if (isAdmin) { setOnboarded(false); setModuleIntros({}) }
  }, [isAdmin])

  // Bienvenida: la barra de abajo es fija y opaca. Mientras dura, el
  // navegador trae el control enfocado con Tab por encima de ella, no debajo
  // (WCAG 2.4.11; bienvenida-1). 190 px = alto de la barra con margen.
  useEffect(() => {
    if (onboarded) return
    const raiz = document.documentElement
    const antes = raiz.style.scrollPaddingBottom
    raiz.style.scrollPaddingBottom = '190px'
    return () => { raiz.style.scrollPaddingBottom = antes }
  }, [onboarded])

  const [onboardStep, setOnboardStep] = useState(0)
  const [onboardName, setOnboardName] = useState('')
  const [onboardHabits, setOnboardHabits] = useState([])
  const [showFullStory, setShowFullStory] = useState(false)

  // Intros de módulo ya vistas — { crecer: true, juntas: true }
  const [moduleIntros, setModuleIntros] = useState(() => load('ronda-module-intros', {}))
  useEffect(() => { save('ronda-module-intros', moduleIntros) }, [moduleIntros])

  // Panic button / Crisis mode
  const [showPanic, setShowPanic] = useState(false)
  // Para qué se abrió la ventana: 'ayuda' (el SOS) o 'pausa' (los 2 minutos
  // de respiración de Adentro o de 'Antes de ir'). La analítica se registra
  // en cada apertura: sos_opened solo para la Ayuda.
  const [panicOrigen, setPanicOrigen] = useState('ayuda')
  const [panicScreen, setPanicScreen] = useState('home') // home, breathe, ground, dbt, accept
  const [breathePhase, setBreathePhase] = useState('inhale') // inhale, hold, exhale
  const [breatheCount, setBreatheCount] = useState(0)
  const [breatheActive, setBreatheActive] = useState(false)
  const [panicDbtExpanded, setPanicDbtExpanded] = useState(null)
  const [groundStep, setGroundStep] = useState(0)

  // Board (Bulletin Board 24/7)
  const [boardPosts, setBoardPosts] = useState(() => {
    const guardados = load('ronda-board', [])
    // Toda publicación propia pide respuesta. Si al cargar no tiene ninguna,
    // esa respuesta ya no va a llegar: quedó pendiente (se recargó o se cerró
    // la app mientras la Guía IA respondía) o falló en silencio en versiones
    // anteriores. Se marca como fallida para que aparezca "Reintentar" en vez
    // de "está leyendo" para siempre.
    return Array.isArray(guardados)
      ? guardados.filter(Boolean).map(p => p.replies?.length
        ? (p.awaitingGuia ? { ...p, awaitingGuia: false } : p)
        : { ...p, awaitingGuia: false, guiaFallo: true })
      : []
  })
  const [boardFilter, setBoardFilter] = useState('todas')
  const [boardNewText, setBoardNewText] = useState('')
  const [boardNewCat, setBoardNewCat] = useState('general')
  const [boardShowForm, setBoardShowForm] = useState(false)
  const [boardHearts, setBoardHearts] = useState(() => load('ronda-board-hearts', {}))

  // Morning/Night check-in
  const [morningDone, setMorningDone] = useState(() => load(`ronda-morning-${diaApp}`, false))
  const [nightDone, setNightDone] = useState(() => load(`ronda-night-${diaApp}`, false))
  const [morningIntention, setMorningIntention] = useState('')
  const [nightReflection, setNightReflection] = useState('')
  // null = todavía no eligió ánimo (no se registra uno que no escogió)
  const [nightMood, setNightMood] = useState(null)
  // "Más tarde": oculta el check-in en esta sesión sin darlo por hecho.
  const [checkinPospuesto, setCheckinPospuesto] = useState(false)

  // Programs (paso a paso)
  const [activePrograms, setActivePrograms] = useState(() => load('ronda-programs', {}))
  // activePrograms = { tusa: { startDate: '2026-03-14', completedDays: [1,2] }, ... }
  // Programas creados con la IA ("Guardar y empezar"). Misma clave de siempre.
  const [customPrograms, setCustomPrograms] = useState(() => {
    const guardados = load('diana-custom-programs', [])
    return Array.isArray(guardados) ? guardados.filter(p => p && p.id).map(normalizarPrograma) : []
  })
  // Catálogo completo: los fijos más los creados con la IA.
  const todosLosProgramas = useMemo(() => [...PROGRAMAS, ...PROGRAMAS_PREMIUM, ...customPrograms], [customPrograms])

  // Habit editor
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitDim, setNewHabitDim] = useState(DIM_POR_DEFECTO)
  const [showAddHabit, setShowAddHabit] = useState(false)

  // Responsive
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Persist
  useEffect(() => { save('diana-habits', habits) }, [habits])
  useEffect(() => { guardarTotalDia(diaApp, habits.length) }, [habits, diaApp])
  useEffect(() => { saveDay(`diana-checked-${diaApp}`, checked) }, [checked, diaApp])
  useEffect(() => { saveDay(`diana-routine-${diaApp}`, routineChecked) }, [routineChecked, diaApp])
  useEffect(() => { save('diana-journal', entries) }, [entries])
  useEffect(() => { save('diana-toolkit', toolkitItems) }, [toolkitItems])
  useEffect(() => { save('diana-profile', profile) }, [profile])
  useEffect(() => { save('ronda-programs', activePrograms) }, [activePrograms])
  useEffect(() => { save('diana-custom-programs', customPrograms) }, [customPrograms])
  useEffect(() => { save('ronda-board', boardPosts) }, [boardPosts])
  useEffect(() => { save('ronda-board-hearts', boardHearts) }, [boardHearts])
  useEffect(() => { saveDay(`ronda-morning-${diaApp}`, morningDone) }, [morningDone, diaApp])
  useEffect(() => { saveDay(`ronda-night-${diaApp}`, nightDone) }, [nightDone, diaApp])
  useEffect(() => { save('diana-morning', morning) }, [morning])
  useEffect(() => { save('diana-midday', midday) }, [midday])
  useEffect(() => { save('diana-night', night) }, [night])
  useEffect(() => { saveDay(`ronda-tomorrow-${diaApp}`, tomorrowTasks) }, [tomorrowTasks, diaApp])
  useEffect(() => { saveDay(`ronda-tomorrow-${ayerApp}`, plannedToday) }, [plannedToday, ayerApp])

  // Breathing timer for panic button
  useEffect(() => {
    if (!breatheActive) return
    const phases = [
      { name: 'inhale', label: 'Inhala', duration: 4000 },
      { name: 'hold', label: 'Sostén', duration: 7000 },
      { name: 'exhale', label: 'Exhala', duration: 8000 },
    ]
    let phaseIndex = 0
    // Los dos disparadores hacen setBreatheCount(0) antes de activar,
    // asi que el ciclo siempre arranca en cero.
    let cycleCount = 0
    let cancelado = false
    let t = null
    const runPhase = () => {
      if (cancelado || cycleCount >= 5) return
      setBreathePhase(phases[phaseIndex].name)
      t = setTimeout(() => {
        if (cancelado) return
        phaseIndex++
        if (phaseIndex >= 3) { phaseIndex = 0; cycleCount++; setBreatheCount(cycleCount) }
        if (cycleCount < 5) runPhase()
        else { setBreatheActive(false) }
      }, phases[phaseIndex].duration)
    }
    runPhase()
    return () => { cancelado = true; clearTimeout(t) }
  }, [breatheActive])

  // Sync localStorage → Supabase on first login + update profile name from auth
  // Depende del id y del nombre de la cuenta (userId, arriba), no del objeto
  // `user`: ese cambia en cada carga y en cada renovación del token (perfil-2).
  const authName = user?.user_metadata?.name || user?.user_metadata?.full_name || ''
  useEffect(() => {
    if (userId && isConfigured) {
      // Antes que nada: ¿los datos de este dispositivo son de esta cuenta?
      // Si eran de otra, se apartaron y la app se recarga limpia; si no hubo
      // espacio para apartarlos, esta sesión se cierra sin ver nada (perfil-1).
      const duena = asegurarDuenaLocal(userId)
      if (duena === 'recargar') { window.location.reload(); return }
      if (duena === 'sin-espacio') {
        console.error('Datos de otra cuenta en este dispositivo y sin espacio para apartarlos: se cierra la sesión.')
        signOut()
        return
      }
      if (authName) {
        // El nombre de la cuenta solo llena un perfil sin nombre: el que ella
        // escribe en la bienvenida o en su perfil manda (perfil-2).
        setProfile(prev => (prev.name?.trim() ? prev : { ...prev, name: authName }))
        // "¿Cómo te llamas?" llega con el nombre que ya tiene (el de su
        // perfil o, si no hay, el de la cuenta) y lo puede cambiar (bienvenida-13).
        const nombrePerfil = load('diana-profile', {})?.name?.trim()
        setOnboardName(prev => prev || nombrePerfil || authName)
      }
    }
  }, [userId, authName, isConfigured, signOut])

  // La migración a la nube, solo con la autorización de cuenta (y nunca el
  // diario: ver syncFromLocal).
  useEffect(() => {
    if (!userId || !isConfigured || !cuentaAutorizada || datosDeOtraCuenta(userId)) return
    syncFromLocal(userId)
  }, [userId, isConfigured, cuentaAutorizada])

  // ── Autorizaciones: nube y subidas, en una sola cola ──
  // Leer la nube y subir lo pendiente van uno detrás de otro, siempre con lo
  // último de este teléfono: una lectura vieja no pisa lo recién subido ni
  // una subida vieja pisa lo recién leído (src/lib/autorizaciones.js).
  const registroAutorizaciones = user?.user_metadata?.autorizaciones
  const firmaRegistro = registroAutorizaciones && typeof registroAutorizaciones === 'object' ? JSON.stringify(registroAutorizaciones) : ''
  // Cada paso con su tope: una subida colgada no traba la cola (ni deja el
  // interruptor de Perfil en «guardando»).
  const [enCola] = useState(() => crearCola())
  // Sube lo pendiente. Devuelve 'listo' (nada quedó por subir), 'pendiente'
  // (sin red o sin respuesta: queda en este teléfono y se reintenta) u
  // 'otro-telefono' (este «sí» a la IA perdió con un «no» de otro teléfono).
  const subirPendientes = useCallback(() => enCola(async () => {
    const id = userId
    if (!id || !isConfigured || datosDeOtraCuenta(id)) return 'pendiente'
    const enviado = autorizacionesRef.current
    if (!hayQueSubir(enviado)) return 'listo'
    const resultado = await subirAutorizaciones(id, enviado)
    if (datosDeOtraCuenta(id)) return 'pendiente'
    cambiarAutorizaciones(prev => trasSubir(prev, resultado, enviado))
    if (resultado.ganaNube.ia) return 'otro-telefono'
    return resultado.completo && !resultado.sinFila.ia ? 'listo' : 'pendiente'
  }, 'pendiente'), [enCola, userId, isConfigured, cambiarAutorizaciones])
  // Antes de cada llamada a la IA: si el «sí» de aquí (a la IA o a la
  // cuenta) aún no está en profiles, se espera esa subida
  // (src/lib/autorizaciones.js). Así, quien
  // acaba de autorizar en la tarjeta (o en «Lo íntimo es tuyo», o en el
  // aviso) no recibe un 403 en su primer mensaje.
  const iaListaEnNube = () => esperarIAEnNube(() => autorizacionesRef.current, subirPendientes)
  // Lee la nube (si respondió o cambió algo en otro teléfono) y, si nunca
  // respondió, adopta lo que marcó al crear la cuenta (metadatos).
  // Sin respuesta de la nube, lo del registro espera (no se crea un «sí» a
  // ciegas): si acaba de crear la cuenta, se intenta una vez más antes de
  // seguir. Si tampoco responde, sale el aviso único y ella responde ahí.
  const revisarNube = useCallback(() => enCola(async () => {
    const id = userId
    if (!id || !isConfigured || datosDeOtraCuenta(id)) return
    let nube = await leerAutorizacionesNube(id)
    if (nube === null && firmaRegistro && !cuentaAutorizadaEn(autorizacionesRef.current)) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      nube = await leerAutorizacionesNube(id)
    }
    if (datosDeOtraCuenta(id)) return
    const metadatos = firmaRegistro ? { autorizaciones: JSON.parse(firmaRegistro) } : null
    cambiarAutorizaciones(prev => adoptarAutorizaciones(prev, { nube, metadatos }))
    setAutorizacionesDe(id)
  }), [enCola, userId, isConfigured, firmaRegistro, cambiarAutorizaciones])
  // Si el servidor dice que la IA no está autorizada (la quitó en otro
  // teléfono): se sube lo de aquí y se vuelve a leer la nube. Si allá es
  // «no», aquí también, y aparece la tarjeta de la IA.
  const sincronizarAutorizaciones = useCallback(() => { subirPendientes(); return revisarNube() }, [subirPendientes, revisarNube])
  const iaRechazadaEnServidor = async (resp) => {
    if (resp?.status !== 403) return false
    const datos = await resp.clone().json().catch(() => null)
    if (datos?.autorizacion !== 'ia') return false
    sincronizarAutorizaciones()
    return true
  }
  useEffect(() => { iaRechazadaRef.current = iaRechazadaEnServidor })

  // Al entrar: lo que falta o cambió se completa con la nube. Mientras tanto,
  // si falta algo, la app espera en "Cargando..." (revisandoAutorizaciones).
  // Y cada vez que vuelve a la app (la PWA queda abierta días): así un
  // retiro hecho en otro teléfono llega aquí sin cerrar la app.
  // Al volver la conexión, lo que quedó en este teléfono sube.
  useEffect(() => {
    if (!userId || !isConfigured || datosDeOtraCuenta(userId)) return
    revisarNube()
    let ultima = Date.now()
    const alVolver = () => {
      if (document.visibilityState !== 'visible' || Date.now() - ultima < 60000) return
      ultima = Date.now()
      sincronizarAutorizaciones()
    }
    const alConectar = () => { sincronizarAutorizaciones() }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('online', alConectar)
    return () => {
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('online', alConectar)
    }
  }, [userId, isConfigured, revisarNube, sincronizarAutorizaciones])

  // Lo que no se ha subido (sin red, o antes de que existiera la tabla) se
  // sube en cuanto se puede. Cada fila lleva su id: reintentar no duplica.
  useEffect(() => {
    if (!userId || !isConfigured || autorizacionesDe !== userId || !hayQueSubir(autorizaciones)) return
    subirPendientes()
  }, [userId, isConfigured, autorizacionesDe, autorizaciones, subirPendientes])

  // `analitica: false` cuando no hay autorización de cuenta (el rechazo).
  const responderAutorizacion = (respuestas, canal, { analitica = true } = {}) => {
    const siguiente = cambiarAutorizaciones(prev => registrarAutorizaciones(prev, respuestas, canal))
    if (analitica && cuentaAutorizadaEn(siguiente) && !(userId && datosDeOtraCuenta(userId))) {
      // Con la autorización recién dada, PostHog ya puede arrancar (el efecto
      // de la analítica lo haría después de pintar y este evento se perdería).
      initAnalytics()
      if (userId) identifyUser(userId)
      // Sin contenido: solo dónde respondió y si usa la IA.
      track('autorizacion_respondida', { canal, ia: siguiente.ia?.valor === true })
    }
    return siguiente
  }
  // Perfil → Tus autorizaciones. En este teléfono queda siempre (y sin la
  // autorización la IA se cierra ya); devuelve cómo quedó en la nube
  // ('listo', 'pendiente' u 'otro-telefono', ver subirPendientes).
  const cambiarAutorizacionIA = async (valor) => {
    if (!valor) stopSpeech()
    responderAutorizacion({ ia: valor }, 'perfil')
    if (!isConfigured || !userId) return 'listo'
    return subirPendientes()
  }
  // Aviso único → «Rechazar la autorización» → «Cerrar sesión»: queda la
  // prueba del rechazo (cuenta = no) antes de salir. Sin red, queda pendiente
  // en este teléfono y sube la próxima vez que entre (como máximo espera 6 s).
  // En el mismo tiempo, las notificaciones se pausan y el teléfono se suelta
  // de la cuenta en OneSignal: tras el rechazo, los recordatorios paran.
  const rechazarYCerrarSesion = async () => {
    // Un segundo intento (sin red no se pudo salir) no repite la fila.
    if (!(autorizacionesRef.current?.cuenta?.valor === false && autorizacionesRef.current.cuenta.pendiente)) {
      responderAutorizacion({ cuenta: false }, 'aviso-unico', { analitica: false })
    }
    const pasos = [oneSignal.soltarCuenta({ pausar: true })]
    if (isConfigured && userId) pasos.push(subirPendientes())
    await Promise.race([Promise.all(pasos), new Promise(resolve => setTimeout(resolve, 6000))])
    return signOut()
  }
  // Perfil → «Cerrar sesión»: antes de salir, las notificaciones se pausan y
  // el teléfono se suelta de la cuenta en OneSignal (como máximo 6 s), así
  // otra cuenta que entre aquí no recibe sus recordatorios.
  const [cerrandoSesion, setCerrandoSesion] = useState(false)
  const cerrarSesion = async () => {
    if (cerrandoSesion) return
    setCerrandoSesion(true)
    try {
      await Promise.race([oneSignal.soltarCuenta({ pausar: true }), new Promise(resolve => setTimeout(resolve, 6000))])
      await signOut()
    } finally {
      setCerrandoSesion(false)
    }
  }

  // ── Toolkit en la nube (toolkit-19) ──
  // Al entrar se trae el de la nube y se une con el local. Solo después de
  // eso se guardan los cambios (con pausa): saveToolkitItems borra y vuelve a
  // escribir todo, así que nunca se llama con lo local antes de unirlo.
  const [toolkitDe, setToolkitDe] = useState(null) // cuenta cuyo toolkit ya se trajo
  const toolkitNubeRef = useRef(null)              // huella de lo que tiene la nube
  const toolkitSubidaRef = useRef(Promise.resolve())
  const toolkitHidratadoRef = useRef(false)        // se trajo en ESTA sesión
  useEffect(() => {
    toolkitHidratadoRef.current = false
    if (!userId || !isConfigured) return
    let cancelado = false
    getToolkitItems(userId).then(remotos => {
      // null = no se pudo leer: no se une ni se sube nada en esta sesión.
      if (cancelado || !Array.isArray(remotos)) return
      if (guardadoEstaBloqueado() || duenaLocal() !== userId) return
      toolkitNubeRef.current = firmaToolkit(remotos)
      toolkitHidratadoRef.current = true
      setToolkitItems(prev => unirToolkit(prev, remotos))
      setToolkitDe(userId)
    })
    return () => { cancelado = true }
  }, [userId, isConfigured])
  useEffect(() => {
    if (!userId || !isConfigured || toolkitDe !== userId || !cuentaAutorizada) return
    const lista = toolkitItems
    const t = setTimeout(() => {
      if (!toolkitHidratadoRef.current || guardadoEstaBloqueado() || duenaLocal() !== userId) return
      const firma = firmaToolkit(lista)
      if (firma === toolkitNubeRef.current) return
      // Una subida a la vez (borrar + insertar no se pueden cruzar).
      toolkitSubidaRef.current = toolkitSubidaRef.current
        .then(() => saveToolkitItems(userId, lista))
        .then(ok => { if (ok) toolkitNubeRef.current = firma })
    }, 1500)
    return () => clearTimeout(t)
  }, [toolkitItems, userId, isConfigured, toolkitDe, cuentaAutorizada])

  // Stats
  const dimStats = useMemo(() => {
    const stats = {}
    Object.keys(DIMS).forEach(dim => {
      const dimHabits = habits.filter(h => h.dim === dim)
      const done = dimHabits.filter(h => checked[h.id]).length
      stats[dim] = { done, total: dimHabits.length }
    })
    return stats
  }, [habits, checked])

  const totalDone = Object.values(dimStats).reduce((s, d) => s + d.done, 0)
  const totalHabits = Object.values(dimStats).reduce((s, d) => s + d.total, 0)

  // Historial de hábitos con hoy tomado del estado: localStorage se escribe
  // después del render, así que leerlo aquí iría un clic atrasado.
  const historialHabitos = useMemo(() => ({ ...historialPrevio, [diaApp]: checked }), [historialPrevio, diaApp, checked])

  // Racha de cada hábito, derivada del historial (no es un contador que sube
  // en cada toque). Se sigue guardando en 'diana-streaks' con el mismo formato
  // { id: días } para lo que la lee (sincronización con Supabase).
  const streaks = useMemo(() => {
    const r = {}
    habits.forEach(h => { r[h.id] = rachaHabito(historialHabitos, h.id, diaApp) })
    return r
  }, [habits, historialHabitos, diaApp])
  useEffect(() => { save('diana-streaks', streaks) }, [streaks])

  // Hábitos cumplidos por día ({ 'AAAA-MM-DD': { done, total } }), de todo el
  // historial (habitos-5). Los días anteriores cuentan todo lo que se marcó
  // ese día, también hábitos que ya se borraron (borrar un hábito no borra su
  // historia), contra el total que tenía ese día. Hoy cuenta solo los
  // hábitos que existen contra los de la lista.
  const monthlyHistory = useMemo(() => {
    const ids = new Set(habits.map(h => String(h.id)))
    const history = {}
    Object.entries(historialPrevio).forEach(([date, data]) => {
      const done = Object.values(data || {}).filter(Boolean).length
      if (done > 0) history[date] = { done, total: Math.max(done, Number.isFinite(totalesPrevios[date]) ? totalesPrevios[date] : done) }
    })
    const hechosHoy = Object.entries(checked).filter(([id, v]) => v && ids.has(id)).length
    if (hechosHoy > 0) history[diaApp] = { done: hechosHoy, total: habits.length }
    return history
  }, [historialPrevio, totalesPrevios, checked, habits, diaApp])

  // Pasa los estados diarios al día nuevo sin recargar la página: así no se
  // pierde nada de lo escrito (diario, chat, Comunidad, tareas). Se llama en
  // un evento propio, nunca junto con un cambio de los estados de ayer.
  const cambiarDeDia = (nuevo) => {
    const ayer = dateKey(-1)
    const historial = leerHistorialHabitos()
    delete historial[nuevo]
    setDiaApp(nuevo)
    setAyerApp(ayer)
    setChecked(load(`diana-checked-${nuevo}`, {}))
    setRoutineChecked(load(`diana-routine-${nuevo}`, {}))
    setTomorrowTasks(load(`ronda-tomorrow-${nuevo}`, []))
    setPlannedToday(load(`ronda-tomorrow-${ayer}`, []))
    setMorningDone(load(`ronda-morning-${nuevo}`, false))
    setNightDone(load(`ronda-night-${nuevo}`, false))
    setHistorialPrevio(historial)
    setTotalesPrevios(totalesHabitosPorDia(historial, nuevo, habits.length))
    setCheckinPospuesto(false)
    // Lo escrito en un check-in de ayer que ella cerró con "Más tarde" no
    // pasa al de hoy (con uno abierto, el día no cambia todavía).
    setMorningIntention('')
    setNightReflection('')
    setNightMood(null)
  }
  // ¿Ya cambió el día? Entonces lo que hay en pantalla es de ayer: pasa al
  // día nuevo y devuelve true (el toque que lo descubrió no se aplica, igual
  // que antes con la recarga). Mientras un check-in de ese día está abierto
  // (el cierre de la noche pasada la medianoche), no: lo que se marque o se
  // escriba ahí es de ese día (adentro-2). La Ayuda abierta encima lo tapa
  // pero no lo cierra: también cuenta (checkinEnCurso no mira showPanic), o
  // lo escrito antes de tocar "Ayuda" se borraría al volver.
  const pasarAlDiaNuevo = () => {
    const hoy = todayKey()
    if (hoy === diaApp || checkinEnCurso) return false
    cambiarDeDia(hoy)
    return true
  }
  // Revisión cada minuto y al volver a la app.
  const pasarAlDiaNuevoRef = useRef(null)
  useEffect(() => { pasarAlDiaNuevoRef.current = pasarAlDiaNuevo })
  useEffect(() => {
    const revisarDia = () => pasarAlDiaNuevoRef.current?.()
    const alVolver = () => { if (document.visibilityState === 'visible') revisarDia() }
    const intervalo = setInterval(revisarDia, 60000)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('ronda-current-day', diaApp) } catch { /* sin almacenamiento */ }
  }, [diaApp])

  const toggleHabit = (id) => {
    if (pasarAlDiaNuevo()) return
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    if (next[id]) {
      track('habit_checked', {
        streak: rachaHabito({ ...historialHabitos, [diaApp]: next }, id, diaApp),
        checked_today: Object.values(next).filter(Boolean).length,
      })
    }
  }

  const toggleRoutine = (id) => {
    if (pasarAlDiaNuevo()) return
    const willBeChecked = !routineChecked[id]
    setRoutineChecked(prev => ({ ...prev, [id]: !prev[id] }))
    // Parte del North Star: "marca hábito O completa parte de su rutina".
    if (willBeChecked) track('routine_checked')
  }

  const addRoutineItem = () => {
    const task = newRoutineTask.trim()
    if (!task || !horaValida(newRoutineTime)) return
    const newItem = { id: Date.now(), time: horaHHMM(newRoutineTime), task, emoji: newRoutineEmoji }
    const updater = prev => ordenarPorHora([...prev, newItem])
    if (newRoutineSection === 'morning') setMorning(updater)
    else if (newRoutineSection === 'midday') setMidday(updater)
    else setNight(updater)
    setNewRoutineTask(''); setNewRoutineTime(''); setNewRoutineEmoji('✨')
  }

  const removeRoutineItem = (section, id) => {
    if (section === 'morning') setMorning(prev => prev.filter(i => i.id !== id))
    else if (section === 'midday') setMidday(prev => prev.filter(i => i.id !== id))
    else setNight(prev => prev.filter(i => i.id !== id))
  }
  const pedirQuitarRutina = (section, item) => setAppModal({
    type: 'confirm',
    title: `¿Quitar "${item.task}" de tu rutina?`,
    body: 'Puedes volver a agregarlo cuando quieras.',
    cta: 'Quitar',
    onConfirm: () => removeRoutineItem(section, item.id),
  })

  const saveRoutineItemEdit = () => {
    if (!editingRoutineItem) return
    const { sectionKey, originalSection = sectionKey, id, time, emoji } = editingRoutineItem
    const task = (editingRoutineItem.task || '').trim()
    if (!task || !horaValida(time)) return
    const setterDe = (section) => section === 'morning' ? setMorning : section === 'midday' ? setMidday : setNight
    const cambios = { time: horaHHMM(time), task, emoji }
    if (setterDe(sectionKey) === setterDe(originalSection)) {
      setterDe(sectionKey)(prev => ordenarPorHora(prev.map(i => i.id === id ? { ...i, ...cambios } : i)))
    } else {
      // Cambió de sección: se mueve con el mismo id, así la marca de hoy se conserva.
      const original = { morning, midday, night }[originalSection]?.find(i => i.id === id) || { id }
      setterDe(originalSection)(prev => prev.filter(i => i.id !== id))
      setterDe(sectionKey)(prev => ordenarPorHora([...prev.filter(i => i.id !== id), { ...original, ...cambios }]))
    }
    setEditingRoutineItem(null)
  }

  const addTomorrowTask = () => {
    const task = newTomorrowTask.trim()
    if (!task) return
    setTomorrowTasks(prev => [...prev, { id: Date.now(), task, done: false }])
    setNewTomorrowTask('')
  }
  const removeTomorrowTask = (id) => setTomorrowTasks(prev => prev.filter(t => t.id !== id))
  const pedirQuitarTareaHoy = (t) => setAppModal({
    type: 'confirm',
    title: `¿Quitar "${String(t.task ?? '').trim()}" de lo que planeaste para hoy?`,
    body: 'Se quita de esta lista.',
    cta: 'Quitar',
    onConfirm: () => { focoTrasQuitarTarea(t); setPlannedToday(prev => prev.filter(x => x.id !== t.id)) },
  })
  // Al quitar una tarea, su × se va con ella: el foco pasa a la tarea de al
  // lado o, si no queda ninguna, al campo para escribir una.
  const focoTrasQuitarTarea = (t) => {
    const fila = document.querySelector(`[data-tarea="${t.id}"]`)
    const otra = fila?.nextElementSibling || fila?.previousElementSibling
    focoTrasModalRef.current = () => (otra?.isConnected && otra.querySelector('[role="checkbox"]')) || document.getElementById('tarea-manana')
  }
  const pedirQuitarTareaManana = (t) => setAppModal({
    type: 'confirm',
    title: `¿Quitar "${String(t.task ?? '').trim()}" de tus tareas para mañana?`,
    body: 'Puedes volver a escribirla cuando quieras.',
    cta: 'Quitar',
    onConfirm: () => { focoTrasQuitarTarea(t); removeTomorrowTask(t.id) },
  })

  // Marca o desmarca una tarea en una lista de tareas (para mañana o para hoy).
  const toggleTaskIn = (setList) => (id) => {
    setList(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }
  const toggleTomorrowTask = toggleTaskIn(setTomorrowTasks)
  const togglePlannedTask = toggleTaskIn(setPlannedToday)

  const addJournalEntry = () => {
    const text = journalText.trim()
    if (!text) return
    const entry = { id: Date.now(), date: todayKey(), text, mood: journalMood, time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) }
    setEntries([entry, ...entries])
    // Primero se apaga el dictado: si no, el reconocedor vuelve a escribir
    // en el cuadro el texto que se acaba de guardar.
    stopVoice()
    setJournalText('')
    setJournalMood(2)
    // Solo la señal: ni el texto ni el ánimo (datos sensibles; la política
    // dice que PostHog nunca recibe tu ánimo).
    track('journal_created')
  }
  // Por id; una entrada sin id (dato viejo o dañado) se quita solo a ella misma.
  const removeJournalEntry = (entry) => setEntries(prev => prev.filter(e => entry.id != null ? e.id !== entry.id : e !== entry))
  const pedirBorrarEntrada = (entry) => setAppModal({
    type: 'confirm',
    title: '¿Borrar esta entrada de tu diario?',
    body: 'Después no la podrás recuperar.',
    cta: 'Borrar entrada',
    onConfirm: () => {
      // El botón de borrar se va con la entrada: el foco vuelve al cuadro del diario.
      focoTrasModalRef.current = () => document.getElementById('diario-texto')
      removeJournalEntry(entry)
    },
  })

  // Voice journaling — Web Speech API
  // Apaga el dictado de verdad: suelta los handlers (para que nada más
  // escriba en el cuadro) y detiene el micrófono.
  const stopVoice = () => {
    const r = recognitionRef.current
    recognitionRef.current = null
    if (r) {
      r.onresult = null
      r.onerror = null
      r.onend = null
      try { r.stop() } catch { /* ya estaba detenido */ }
    }
    setIsListening(false)
  }

  // El título y el texto dependen de lo que falló (permiso, micrófono, red u
  // otro): cada uno dice qué hacer, y siempre queda escribir con el teclado.
  const AVISOS_DICTADO = {
    permiso: { title: 'Activa tu micrófono para dictar', body: 'Permite el acceso al micrófono en la configuración de tu navegador y vuelve a tocar el botón del micrófono. También puedes escribir tu reflexión.' },
    microfono: { title: 'Conecta un micrófono para dictar', body: 'Revisa que tu micrófono esté conectado y encendido, y vuelve a tocar el botón del micrófono. También puedes escribir tu reflexión.' },
    red: { title: 'Revisa tu conexión para dictar', body: 'El dictado usa internet para convertir tu voz en texto. Cuando tengas conexión, vuelve a tocar el botón del micrófono. Mientras tanto, puedes escribir tu reflexión.' },
    otro: { title: 'Intenta dictar otra vez', body: 'Vuelve a tocar el botón del micrófono en un momento. También puedes escribir tu reflexión.' },
  }
  const avisarDictado = (motivo) => {
    const tipo = motivo === 'not-allowed' || motivo === 'service-not-allowed' ? 'permiso'
      : motivo === 'audio-capture' ? 'microfono'
        : motivo === 'network' ? 'red'
          : 'otro'
    setAppModal({ type: 'info', ...AVISOS_DICTADO[tipo], cta: 'Listo' })
  }

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setAppModal({ type: 'info', title: 'Dicta desde Chrome o Safari', body: 'Para dictar tu reflexión, abre Ronda en Chrome o Safari. Aquí puedes escribirla con el teclado.', cta: 'Listo' })
      return
    }

    if (isListening || recognitionRef.current) {
      stopVoice()
      if (isListening) return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-CO'
    recognition.continuous = true
    recognition.interimResults = true
    recognitionRef.current = recognition

    // Texto provisional que se muestra al final del cuadro mientras se habla;
    // se reemplaza por el definitivo. Solo se anexa lo nuevo (desde
    // resultIndex) sobre el texto actual, sin pisar lo editado a mano.
    let parcial = ''
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return
      let nuevoFinal = ''
      let nuevoParcial = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const texto = event.results[i][0].transcript.trim()
        if (!texto) continue
        if (event.results[i].isFinal) nuevoFinal = juntarTexto(nuevoFinal, texto)
        else nuevoParcial = juntarTexto(nuevoParcial, texto)
      }
      const anterior = parcial
      parcial = nuevoParcial
      setJournalText(prev => {
        const base = anterior && prev.endsWith(anterior) ? prev.slice(0, prev.length - anterior.length) : prev
        return juntarTexto(juntarTexto(base, nuevoFinal), nuevoParcial)
      })
    }

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return
      stopVoice()
      const motivo = event?.error
      if (motivo === 'aborted' || motivo === 'no-speech') return
      avisarDictado(motivo)
    }
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return
      recognitionRef.current = null
      setIsListening(false)
    }

    try {
      recognition.start()
    } catch {
      recognitionRef.current = null
      setIsListening(false)
      avisarDictado()
      return
    }
    setIsListening(true)
  }

  // Hábitos: el aviso del formulario (nombre repetido), el último hábito creado
  // (se muestra y se resalta un momento) y los sugeridos recién agregados, que
  // se quedan un momento en la lista como "Agregado": así el segundo toque de
  // un doble toque cae en esa misma fila y no agrega el sugerido de abajo.
  const [avisoHabito, setAvisoHabito] = useState('')
  const [habitoNuevo, setHabitoNuevo] = useState(null)
  const [sugeridosAgregados, setSugeridosAgregados] = useState([])
  // "Meditar 5 minutos" y "meditar 5 minutos " son el mismo hábito.
  const nombreHabito = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase()
  const tieneHabito = (name) => habits.some(h => nombreHabito(h.name) === nombreHabito(name))
  const sugeridoVisible = (sh) => !tieneHabito(sh.name) || sugeridosAgregados.includes(sh.name)
  useEffect(() => {
    if (!habitoNuevo) return
    document.querySelector(`[data-habito="${habitoNuevo.id}"]`)?.scrollIntoView({ block: 'center' })
    const t = setTimeout(() => setHabitoNuevo(null), 2500)
    return () => clearTimeout(t)
  }, [habitoNuevo])

  const addHabit = () => {
    const name = newHabitName.trim()
    if (!name) return
    const repetido = habits.find(h => nombreHabito(h.name) === nombreHabito(name))
    if (repetido) {
      setAvisoHabito(DIMS[repetido.dim]
        ? `Ya tienes "${repetido.name}" en ${DIMS[repetido.dim].label}.`
        : `Ya tienes "${repetido.name}".`)
      return
    }
    const id = Date.now()
    setHabits(prev => prev.some(h => nombreHabito(h.name) === nombreHabito(name)) ? prev : [...prev, { id, name, dim: newHabitDim }])
    setNewHabitName('')
    setAvisoHabito('')
    setShowAddHabit(false)
    setHabitoNuevo({ id, name, dim: newHabitDim })
    // El formulario se cierra: el foco vuelve a "+ Agregar hábito" (el aviso
    // para lector de pantalla dice cuál se agregó).
    enfocarDespues('habito-agregar')
  }

  const removeHabit = (id) => {
    setHabits(prev => prev.filter(h => h.id !== id))
    // Que no quede marcado hoy un hábito que ya no existe (su racha se va sola:
    // se calcula solo para los hábitos de la lista).
    setChecked(prev => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }
  // Antes de borrar un hábito se pregunta; si tiene racha, se dice que se pierde.
  const pedirQuitarHabito = (h) => {
    const racha = streaks[h.id] || 0
    setAppModal({
      type: 'confirm',
      title: `¿Eliminar el hábito "${h.name}"?`,
      body: racha > 0
        ? `Llevas una racha de ${racha} ${racha === 1 ? 'día' : 'días'}. Si lo eliminas, la racha se pierde.`
        : 'Puedes volver a agregarlo cuando quieras.',
      cta: 'Eliminar',
      onConfirm: () => {
        // El botón de eliminar se va con el hábito: el foco pasa a "+ Agregar hábito".
        focoTrasModalRef.current = () => document.getElementById('habito-agregar')
        removeHabit(h.id)
      },
    })
  }

  // Empieza una ruta. Si ya estaba activa no la reinicia: conserva su avance.
  const startProgram = (progId) => {
    if (activePrograms[progId]) return
    setActivePrograms(prev => prev[progId] ? prev : { ...prev, [progId]: { startDate: todayKey(), completedDays: [] } })
    // Sin el id de la ruta: unido a la cuenta, 'depresion', 'ansiedad' o
    // 'dios' son datos de salud y de creencias (Ley 1581, art. 5).
    track('program_started')
  }
  const completeProgDay = (progId, day) => {
    setActivePrograms(prev => {
      const prog = prev[progId] || { startDate: todayKey(), completedDays: [] }
      const wasDone = prog.completedDays.includes(day)
      const completed = wasDone ? prog.completedDays.filter(d => d !== day) : [...prog.completedDays, day]
      if (!wasDone) track('program_day_completed', { day, total_completed: completed.length })
      return { ...prev, [progId]: { ...prog, completedDays: completed } }
    })
  }
  const quitProgram = (progId) => {
    setActivePrograms(prev => { const next = { ...prev }; delete next[progId]; return next })
  }
  const pedirDejarRuta = (prog, hechos) => setAppModal({
    type: 'confirm',
    title: `¿Dejar la ruta "${prog.title}"?`,
    body: hechos > 0
      ? `Perderás tu avance: ${hechos} de ${prog.days.length} días.`
      : 'Puedes volver a empezarla cuando quieras.',
    cta: 'Dejar la ruta',
    onConfirm: () => {
      quitProgram(prog.id)
      // La X se va con la tarjeta: el foco pasa a "Empezar" de esa ruta.
      focoTrasModalRef.current = () => document.querySelector(`[data-empezar-ruta="${prog.id}"]`) || document.getElementById('rutas-titulo')
    },
  })
  const addSuggestedHabit = (habit, e) => {
    if (tieneHabito(habit.name)) return
    const id = Date.now()
    setHabits(prev => prev.some(h => nombreHabito(h.name) === nombreHabito(habit.name)) ? prev : [...prev, { id, name: habit.name, dim: habit.dim }])
    setSugeridosAgregados(prev => [...prev, habit.name])
    setTimeout(() => setSugeridosAgregados(prev => prev.filter(n => n !== habit.name)), 1500)
    // Arriba entra el hábito nuevo (y a veces se va el aviso de lista vacía):
    // se corrige el scroll para que el botón tocado, ya "Agregado", siga bajo
    // el dedo y un segundo toque no caiga en otro sugerido.
    const boton = e?.currentTarget
    if (!boton) return
    const antes = boton.getBoundingClientRect().top
    // El botón queda apagado ("Agregado") y luego se va: si tenía el foco
    // (teclado), pasa al "+ Agregar" del sugerido siguiente o, si no queda
    // ninguno, a "+ Agregar hábito". No se pierde en <body>.
    const teniaFoco = document.activeElement === boton
    requestAnimationFrame(() => {
      if (!boton.isConnected) return
      const corrido = boton.getBoundingClientRect().top - antes
      if (corrido) window.scrollBy({ top: corrido, behavior: 'instant' })
      if (!teniaFoco) return
      const otros = [...document.querySelectorAll('[data-sugerido]:not([disabled])')]
      const siguiente = otros.find(b => boton.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) || otros[otros.length - 1]
      ;(siguiente || document.getElementById('habito-agregar'))?.focus({ preventScroll: true })
    })
  }

  const addToolkitItem = () => {
    if (!newToolName.trim()) return
    // El link se guarda ya listo para abrir; si no es una dirección web,
    // se avisa junto al campo y no se guarda (toolkit-1, toolkit-4).
    const url = urlDelRecurso(newToolUrl)
    if (url === null) {
      setLinkRecursoInvalido(true)
      // Al centro de la pantalla: arriba quedaría tapado por la barra fija.
      const campo = document.getElementById('recurso-link')
      campo?.focus({ preventScroll: true })
      campo?.scrollIntoView({ block: 'center' })
      return
    }
    const item = {
      id: Date.now(),
      name: newToolName.trim(),
      url,
      cat: newToolCat,
      note: newToolNote.trim(),
      added: todayKey(),
    }
    setToolkitItems([item, ...toolkitItems])
    // Con un filtro de otra categoría el recurso nuevo no se vería: la
    // lista pasa a su categoría (toolkit-6).
    if (toolFilter !== 'todas' && toolFilter !== newToolCat) setToolFilter(newToolCat)
    cerrarFormRecurso()
  }

  /* Link de un recurso listo para abrir: '' si no hay link y null si el
     texto no es una dirección web. Acepta 'Https://' (la mayúscula que pone
     el teclado del celular) y agrega https:// cuando falta, también a
     dominios como 'httpster.net'. Sirve para lo ya guardado: no hay que
     migrar nada (toolkit-1, toolkit-4). */
  const urlDelRecurso = (texto) => {
    const limpio = typeof texto === 'string' ? texto.trim() : ''
    if (!limpio) return ''
    if (/\s/.test(limpio)) return null
    try {
      const u = new URL(/^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`)
      if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.') || u.username || u.password) return null
      return u.href
    } catch { return null }
  }

  // Aviso del link que no se pudo guardar; se borra al corregirlo.
  const [linkRecursoInvalido, setLinkRecursoInvalido] = useState(false)

  // Guardar y Cancelar dejan el formulario vacío, con la categoría por
  // defecto: no queda un borrador escondido (toolkit-7).
  const cerrarFormRecurso = () => {
    setNewToolName('')
    setNewToolUrl('')
    setNewToolNote('')
    setNewToolCat('podcast')
    setLinkRecursoInvalido(false)
    setShowAddTool(false)
    // El formulario se cierra: el foco vuelve a "+ Agregar recurso".
    enfocarDespues('recurso-agregar')
  }

  const removeToolkitItem = (id) => {
    const restantes = toolkitItems.filter(t => t.id !== id)
    setToolkitItems(prev => prev.filter(t => t.id !== id))
    // Si era el último recurso de la categoría filtrada, la vista vuelve a
    // 'Todas' en vez de quedar vacía y sin filtro marcado (toolkit-2).
    setToolFilter(f => (f === 'todas' || restantes.some(t => t.cat === f) ? f : 'todas'))
  }
  const pedirBorrarRecurso = (item) => setAppModal({
    type: 'confirm',
    title: `¿Borrar "${item.name}" de tu toolkit?`,
    body: 'Después no lo podrás recuperar.',
    cta: 'Borrar recurso',
    onConfirm: () => {
      // La X se va con la tarjeta: el foco pasa a la X del recurso de al lado
      // o, si no queda ninguno, a "+ Agregar recurso".
      const fila = document.querySelector(`[data-recurso="${item.id}"]`)
      const otra = fila?.nextElementSibling || fila?.previousElementSibling
      focoTrasModalRef.current = () => (otra?.isConnected && otra.querySelector('button[aria-label^="Borrar recurso"]')) || document.getElementById('recurso-agregar')
      removeToolkitItem(item.id)
    },
  })


  const currentHour = new Date().getHours()
  const franjaActual = franjaDelDia(currentHour)
  // Un check-in con algo escrito o elegido no se esconde porque cambió la
  // hora (a las 12 m. el de la mañana; a la medianoche el de la noche): sigue
  // hasta que ella lo envíe o lo cierre (adentro-2).
  const isMorningTime = franjaActual === 'mañana' || !!morningIntention.trim()
  // El cierre de la noche va de las 7 p. m. a la medianoche: en la madrugada
  // el día ya cambió y se gastaría el cierre de la noche siguiente. Pasada la
  // medianoche, el de un día que la app todavía no cambió (diaApp: estaba
  // abierto, pasarAlDiaNuevo lo espera) sigue en pantalla aunque no tenga
  // nada escrito: marcar un hábito ahí no lo cierra solo ni deja ese día sin
  // cerrar.
  const isNightTime = (franjaActual === 'noche' && currentHour >= 12) || diaApp !== todayKey() || !!nightReflection.trim() || nightMood !== null
  // Un check-in sigue en curso aunque la Ayuda lo tape; se ve cuando no está.
  const checkinEnCurso = !checkinPospuesto && ((isMorningTime && !morningDone) || (isNightTime && !nightDone))
  const showMorningCheckin = isMorningTime && !morningDone && !checkinPospuesto && !showPanic
  const showNightCheckin = isNightTime && !nightDone && !checkinPospuesto && !showPanic

  const completeMorningCheckin = () => {
    const intencion = morningIntention.trim()
    if (intencion) {
      // La intención no lleva ánimo: el modal de la mañana no lo pregunta.
      // Va con el día del check-in (diaApp) y sin espacios en los bordes.
      const entry = {
        id: Date.now(), date: diaApp, text: `Intención del día: ${intencion}`,
        mood: null, time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
        type: 'morning',
      }
      setEntries([entry, ...entries])
    }
    setMorningDone(true)
    setMorningIntention('')
  }

  const completeNightCheckin = () => {
    const reflexion = nightReflection.trim()
    // Se guarda si escribió algo o si eligió cómo se siente.
    if (reflexion || nightMood !== null) {
      // Con el día que cierra (diaApp: si se envía pasada la medianoche,
      // sigue siendo el de ayer) y sin espacios en los bordes.
      const entry = {
        id: Date.now(), date: diaApp,
        text: reflexion ? `Reflexión de noche: ${reflexion}` : 'Cierre del día',
        mood: nightMood, time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
        type: 'night',
      }
      setEntries([entry, ...entries])
    }
    setNightDone(true)
    setNightReflection('')
    setNightMood(null)
  }

  // Cierra el check-in por ahora; vuelve a salir la próxima vez que abra la app.
  const posponerCheckin = () => setCheckinPospuesto(true)

  /* ── Navegación: tres puertas ── */
  const NAV_ICONS = {
    rondas: <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
    ahora: <path d="M4 10.5 12 4l8 6.5V20H4zM10 20v-5h4v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
    juntas: <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.5 0a2.6 2.6 0 1 0 0-5.2M3.5 19c.6-3.2 2.6-5 5-5s4.4 1.8 5 5m2.5-5c2 .2 3.6 1.9 4 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  }

  const NAV = [
    { id: 'rondas', label: 'Afuera' },
    { id: 'ahora',  label: 'Adentro' },
    { id: 'juntas', label: 'Juntas' },
  ]

  /* Abre una sección. Lo que antes era "Crecer" (programas e IA) vive
     ahora dentro de Adentro. Sin ventanas de introducción. */
  // Al navegar se van el motivo de apertura, el selector de puerta y el aviso.
  const limpiarTelon = () => {
    setMotivoPuerta(null)
    setEligiendoPuerta(false)
    setAvisoPuerta(null)
    clearTimeout(avisoPuertaTimerRef.current)
  }
  const openModule = (id, sub = '') => {
    const destino = id === 'crecer' ? 'ahora' : id
    // Al salir del chat, la voz de Tu Ronda se calla; al salir del Diario, el
    // micrófono deja de escuchar (si no, lo dictado afuera caía en el cuadro).
    stopSpeech()
    stopVoice()
    setView(destino)
    setSubTab(sub)
    limpiarTelon()
    setFoundingToast(null)
    setPidiendoIA(false)
    track('module_viewed', { module: destino, sub: sub || null })
  }
  // Cambia de subpestaña dentro de la misma sección.
  const irASubTab = (id) => {
    stopSpeech()
    stopVoice()
    setSubTab(id)
    limpiarTelon()
    setFoundingToast(null)
    setPidiendoIA(false)
  }

  const abrirAyuda = (desde = 'encabezado') => {
    // Abierta por una señal de crisis (crisis_chat, crisis_comunidad,
    // crisis_programa), desde el aviso de pago (crisis_aviso_pago), desde el
    // aviso de que la Guía IA no respondió (crisis_guia_fallo), desde el de
    // que Crea tu programa no pudo crear el programa (crisis_programa_fallo)
    // o desde la tarjeta que pide la autorización de la IA (crisis_tarjeta_ia): sin
    // "Estás a salvo." y con el 123 en el primer texto.
    setPanicOrigen(String(desde).startsWith('crisis') ? 'crisis' : 'ayuda')
    setShowPanic(true); setPanicScreen('home'); setGroundStep(0); setBreatheActive(false); setBreatheCount(0); setPanicDbtExpanded(null)
    // Sin analítica: PostHog va unido a la cuenta, y la política promete que
    // nunca sabe si usaste Ayuda.
  }
  // La pausa de 2 minutos: respiración guiada, sin el menú de crisis.
  // Sin analítica, como Ayuda (ver abrirAyuda). Quien la llama dice desde
  // dónde ('afuera', 'adentro'), solo para leer el código.
  const empezarRespiracion = () => {
    setPanicOrigen('pausa')
    setShowPanic(true); setPanicScreen('breathe'); setBreatheActive(true); setBreatheCount(0); setBreathePhase('inhale')
  }
  const cerrarAyuda = () => { setShowPanic(false); setBreatheActive(false) }

  /* ── Diálogos: foco adentro, Tab atrapado, Escape cierra y el foco vuelve.
     Mientras hay uno abierto, el encabezado, el contenido y el menú quedan
     inertes (ni el teclado ni el lector de pantalla llegan ahí). ── */
  // Antes de cualquier otra pantalla (también de la bienvenida): el aviso
  // único si falta la autorización de cuenta, o «Lo íntimo es tuyo» si falta
  // responder lo de la IA. Si falta algo y la nube aún no responde, se espera.
  const revisandoAutorizaciones = isConfigured && !!user && (!cuentaAutorizada || !iaRespondida(autorizaciones)) && autorizacionesDe !== user.id
  const pideAutorizacion = (!isConfigured || !!user) && !revisandoAutorizaciones
    ? (!cuentaAutorizada ? 'aviso' : !iaRespondida(autorizaciones) ? 'intimo' : null)
    : null
  // "Cargando...": la sesión, los datos de otra cuenta que se apartan
  // (perfil-1) o las autorizaciones que se leen de la nube.
  const cuentaAjena = isConfigured && !!user && (guardadoEstaBloqueado() || (!!duenaLocal() && duenaLocal() !== user.id))
  const pantallaCarga = authLoading || cuentaAjena || revisandoAutorizaciones
  const pantallaBase = !pantallaCarga && !(isConfigured && !user) && !(isConfigured && recovering)
  const pantallaPrincipal = pantallaBase && onboarded && !pideAutorizacion
  const panicRef = useRef(null)
  const morningRef = useRef(null)
  const nightRef = useRef(null)
  const appModalRef = useRef(null)
  // La Ayuda va en todas las pantallas, siempre en el mismo lugar (conAyuda,
  // abajo): si la pantalla cambia con la Ayuda abierta, sigue abierta y con
  // el teclado adentro. Si lo que la abrió ya no está (un check-in que se
  // cerró, una sección que se cambió), el foco vuelve al botón "Ayuda"; si
  // esa pantalla no lo tiene, el foco se queda donde está.
  useDialog(panicRef, showPanic, cerrarAyuda,
    (previo) => (previo && previo.isConnected && previo !== document.body ? previo : document.getElementById('boton-ayuda')))
  // Al cerrar un check-in («Empezar mi día», «Cerrar mi día», «Más tarde»,
  // Escape o un toque afuera), el foco vuelve a donde estaba; si ya no está,
  // al título de la pantalla (no a <body>).
  const focoTrasCheckin = (previo) => {
    if (previo && previo.isConnected && previo !== document.body) return previo
    const titulo = document.querySelector('main h1') || document.querySelector('h1')
    if (titulo && !titulo.hasAttribute('tabindex')) titulo.setAttribute('tabindex', '-1')
    return titulo
  }
  useDialog(morningRef, showMorningCheckin && pantallaPrincipal, posponerCheckin, focoTrasCheckin)
  useDialog(nightRef, showNightCheckin && pantallaPrincipal, posponerCheckin, focoTrasCheckin)
  useDialog(appModalRef, !!appModal && pantallaPrincipal, () => setAppModal(null), (previo) => {
    const elegir = focoTrasModalRef.current
    focoTrasModalRef.current = null
    return (elegir && elegir()) || previo
  })
  const fondoInerte = showPanic || showMorningCheckin || showNightCheckin || !!appModal
  // Cada pantalla de la Ayuda empieza arriba (el contenedor que hace scroll se reutiliza).
  useEffect(() => { if (panicRef.current) panicRef.current.scrollTop = 0 }, [panicScreen, showPanic])
  // Al cambiar de pantalla dentro de la Ayuda (entrar a una técnica,
  // terminar la respiración o los sentidos, volver), el botón tocado se va:
  // el foco pasa al título de la pantalla nueva, que el lector de pantalla
  // lee. Al abrir no: ahí va a "Cerrar la ayuda" (useDialog).
  const pantallaAyuda = !showPanic ? null
    : panicScreen === 'breathe' ? `breathe-${!breatheActive && breatheCount > 0 ? 'fin' : 'guia'}`
    : panicScreen === 'ground' ? `ground-${groundStep < 5 ? 'pasos' : 'fin'}`
    : panicScreen
  const pantallaAyudaRef = useRef(null)
  useEffect(() => {
    const antes = pantallaAyudaRef.current
    pantallaAyudaRef.current = pantallaAyuda
    if (!pantallaAyuda || !antes || antes === pantallaAyuda) return
    panicRef.current?.querySelector('[data-titulo-ayuda]')?.focus({ preventScroll: true })
  }, [pantallaAyuda])
  // Con la Ayuda abierta, la página de atrás no se mueve.
  useEffect(() => {
    if (!showPanic) return
    const raiz = document.documentElement
    const antes = raiz.style.overflow
    raiz.style.overflow = 'hidden'
    return () => { raiz.style.overflow = antes }
  }, [showPanic])

  const PUERTAS = [
    { id: 'auto', label: 'Según mi momento' },
    { id: 'rondas', label: 'Afuera' },
    { id: 'ahora', label: 'Adentro' },
    { id: 'juntas', label: 'Juntas' },
  ]
  // Desde Perfil se guarda sin cambiar de sección (navegar: false).
  const fijarPuerta = (id, { navegar = true } = {}) => {
    try { save(PUERTA_KEY, id) } catch { /* sin almacenamiento: vale solo por hoy */ }
    setPuertaGuardada(id)
    const elegida = PUERTAS.find(op => op.id === id)
    if (navegar && id !== 'auto' && id !== view) openModule(id)
    setEligiendoPuerta(false)
    setMotivoPuerta(null)
    setAvisoPuerta(id === 'auto'
      ? 'Listo. Ronda abrirá según tu momento del día.'
      : `Listo. Ronda abrirá en ${elegida?.label || 'esa sección'}.`)
    // El aviso se va solo para no tapar la línea del telón.
    clearTimeout(avisoPuertaTimerRef.current)
    avisoPuertaTimerRef.current = setTimeout(() => setAvisoPuerta(null), 4000)
    track('puerta_fijada', { puerta: id })
  }

  /* ── Logo ── */
  const logo = (
    <button onClick={() => openModule('rondas')} aria-label="Ronda: ir a Afuera" style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 44 }}>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" fill="none" stroke={C.orquidea} strokeWidth="2" />
        <circle cx="12" cy="12" r="3.5" fill={C.agua} />
      </svg>
      <span style={{ fontSize: 28, fontWeight: 600, color: '#FFFFFF', fontFamily: FONT_DISPLAY, lineHeight: 1 }}>Ronda</span>
    </button>
  )

  /* ── La línea del telón: dice dónde estás ── */
  // Alto mínimo igual al de los botones de la línea: el encabezado no salta al navegar.
  const estiloTelon = { fontSize: 12, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.orquidea, minHeight: 44, display: 'flex', alignItems: 'center' }
  const botonTelon = {
    background: 'none', border: 'none', minHeight: 44, padding: '0 2px', cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center',
  }
  const lineaTelon = (() => {
    if (avisoPuerta && !subTab) return <div role="status" style={{ fontSize: 14, color: '#FFFFFF', minHeight: 44, display: 'flex', alignItems: 'center' }}>{avisoPuerta}</div>
    if (motivoPuerta && !subTab) return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 14, color: '#FFFFFF' }}>
        <span>{motivoPuerta === 'elegida' ? 'Abrí aquí porque así lo elegiste.' : `Abrí aquí porque es tu momento de la ${motivoPuerta}.`}</span>
        <button onClick={() => setEligiendoPuerta(v => !v)} aria-expanded={eligiendoPuerta} style={{
          ...botonTelon, color: C.orquidea, fontWeight: 600, fontSize: 14, textDecoration: 'underline', flexShrink: 0,
        }}>Cambiar</button>
      </div>
    )
    // La temporada solo mientras está vigente; después, el texto general (rondas-22).
    if (view === 'rondas') return <div style={estiloTelon}>{temporadaVigente() ? `${mesTemporada()} · ${TEMPORADA.nombre}` : 'Tu ciudad'}</div>
    if (view === 'juntas') return <div style={estiloTelon}>Tu gente</div>
    if (view === 'perfil') return <div style={estiloTelon}>Tu perfil</div>
    // Al volver, el foco pasa al acceso de la herramienta que se cerró (y se
    // trae a la vista); si no hay, al título de Adentro. Si no, se perdía en <body>.
    if (view === 'ahora' && subTab) return (
      <button onClick={() => {
        const desde = subTab
        irASubTab('')
        requestAnimationFrame(() => {
          const acceso = document.querySelector(`[data-acceso="${desde}"]`)
          if (!acceso) return enfocarPantallaNueva()
          acceso.focus({ preventScroll: true })
          acceso.scrollIntoView({ block: 'center' })
        })
      }} style={{ ...estiloTelon, ...botonTelon, gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        Volver a Adentro
      </button>
    )
    return <div style={estiloTelon}>Tu día</div>
  })()

  /* ── Encabezado: el telón ── */
  const header = (
    <header inert={fondoInerte} style={{
      background: C.morado,
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
      paddingLeft: 20, paddingRight: 12, paddingBottom: 18,
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {logo}
          {isAdmin && <span style={{ fontSize: 10, background: C.orquidea, color: C.morado, padding: '2px 7px', borderRadius: 6, fontWeight: 700, letterSpacing: '0.06em' }}>CURADORA</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button id="boton-ayuda" onClick={() => abrirAyuda('encabezado')} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '12px 10px',
            color: C.orquidea, fontSize: 15, fontWeight: 600, letterSpacing: '0.04em', fontFamily: 'inherit',
          }}>{BOTON_AYUDA}</button>
          <button onClick={() => openModule('perfil')} aria-label="Mi perfil" style={{
            width: 44, height: 44, border: 'none', background: 'none', padding: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.orquidea} strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
            </svg>
          </button>
        </div>
      </div>
      <div style={{ marginTop: 4 }}>{lineaTelon}</div>
      {eligiendoPuerta && motivoPuerta && !subTab && (
        <div role="group" aria-label="Dónde abre Ronda" style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ width: '100%', fontSize: 13, color: C.orquidea }}>¿Dónde quieres que abra Ronda?</span>
          {PUERTAS.map(op => (
            <button key={op.id} onClick={() => fijarPuerta(op.id)} style={{
              minHeight: 40, padding: '0 12px', borderRadius: 12, border: `1px solid ${C.orquidea}`,
              background: 'transparent', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{op.label}</button>
          ))}
        </div>
      )}
    </header>
  )

  /* ── Barra inferior: Afuera · Adentro · Juntas ── */
  const bottomNav = (
    <nav aria-label="Secciones" inert={fondoInerte} style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 600, background: '#F7F9FC',
      borderTop: `1px solid ${C.border}`, display: 'flex',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)', zIndex: 100,
    }}>
      {NAV.map(n => {
        const isActive = view === n.id
        return (
          <button key={n.id} onClick={() => openModule(n.id)} aria-current={isActive ? 'page' : undefined} style={{
            flex: 1, minHeight: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            background: 'none', border: 'none', borderTop: `2px solid ${isActive ? C.morado : 'transparent'}`,
            marginTop: -1, cursor: 'pointer', fontFamily: 'inherit', color: isActive ? C.morado : C.subtle,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">{NAV_ICONS[n.id]}</svg>
            <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, letterSpacing: '0.04em' }}>{n.label}</span>
          </button>
        )
      })}
    </nav>
  )

  /* ── ADENTRO: tu momento, tu ruta, para llevar y tus herramientas ── */
  const momentoDelDia = franjaDelDia()
  // La próxima actividad por hora (de las tres secciones), sin las ya hechas hoy.
  const siguienteRutina = (() => {
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    return ordenarPorHora([...morning, ...midday, ...night].filter(item => {
      const min = horaAMinutos(item.time)
      return Number.isFinite(min) && min > nowMin && !routineChecked[item.id]
    }))[0] || null
  })()
  // La primera ruta SIN terminar, con su primer día sin marcar. Si todas
  // están terminadas, la última terminada marcada como completada.
  const rutaActiva = (() => {
    let completada = null
    for (const [progId, progress] of Object.entries(activePrograms)) {
      const prog = todosLosProgramas.find(p => p.id === progId)
      if (!prog || !prog.days?.length) continue
      const hechosDias = progress?.completedDays || []
      const siguiente = prog.days.find(d => !hechosDias.includes(d.day))
      if (!siguiente) { completada = prog; continue }
      return { prog, hechos: hechosDias.length, total: prog.days.length, siguiente }
    }
    return completada ? { prog: completada, completada: true } : null
  })()
  const eyebrowAdentro = { fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.oliva }
  const ACCESOS = [
    { id: 'diario', label: 'Diario', icon: <path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2zM6 18a2 2 0 0 1 2-2h10M10 8h5" /> },
    { id: 'toolkit', label: 'Toolkit', icon: <path d="M4 8h16v11H4zM9 8V5h6v3M4 13h16" /> },
    { id: 'ai', label: 'Pregúntale', icon: <path d="M4 5h16v11H9l-5 4z" /> },
    { id: 'habitos', label: 'Hábitos', icon: <path d="M5 12.5 10 17l9-10" /> },
    { id: 'rutina', label: 'Rutina', icon: <path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /> },
    { id: 'programas', label: 'Rutas', icon: <path d="M5 19c0-4 3-4 7-7s7-3 7-7M5 19h4M19 5h-4" /> },
  ]
  const abrirAcceso = (id) => {
    if (id === 'ai') {
      // Un programa que se está creando, o creado y sin guardar, no se pierde
      // al salir y volver: Pregúntale abre ahí. Lo demás empieza de cero.
      const programaPendiente = aiStep === 3 || (aiStep === 4 && aiProgram && !aiSaved)
      if (!programaPendiente) resetAiAgent()
      setChatMode(programaPendiente ? 'create' : 'chat')
      chatSesionContadaRef.current = false
    }
    irASubTab(id)
    // Después de navegar: irASubTab quita el aviso de la pantalla anterior.
    // Sin la autorización de la IA se ve la tarjeta, no el chat: el aviso
    // de fundadora espera a que lo pueda ver.
    if (id === 'ai' && isPremium && iaOk) showFoundingPerk('chat', 'Tu Ronda · IA personal')
    track('module_viewed', { module: 'ahora', sub: id })
  }

  // Libro de la temporada en Adentro: null si la temporada venció; si no,
  // dónde se conversa en la ciudad elegida en Afuera ('' si no hay dato).
  const libroDonde = temporadaVigente()
    ? (TEMPORADA.libro.donde?.[ciudadValida(load(CIUDAD_KEY, CIUDAD_POR_DEFECTO))] || '')
    : null
  const adentroView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 36, lineHeight: 1.02, color: C.navy }}>
        Tu momento
      </h1>

      <article style={{ background: C.agua, borderRadius: 20, padding: 20 }}>
        <div style={{ ...eyebrowAdentro, color: C.navy }}>
          {siguienteRutina ? `Tu rutina · ${horaHHMM(siguienteRutina.time)}` : `Pausa de la ${momentoDelDia}`}
        </div>
        <p style={{ margin: '10px 0 16px', fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontSize: 24, lineHeight: 1.25, color: C.navy }}>
          {siguienteRutina ? siguienteRutina.task : 'Suelta los hombros, respira lento y vuelve a lo tuyo.'}
        </p>
        <button onClick={siguienteRutina ? () => abrirAcceso('rutina') : () => empezarRespiracion('adentro')} style={{
          width: '100%', height: 50, border: 'none', borderRadius: 14, cursor: 'pointer',
          background: C.morado, color: '#FFFFFF', fontSize: 16, fontWeight: 600, letterSpacing: '0.03em', fontFamily: 'inherit',
        }}>
          {siguienteRutina ? 'Ver tu rutina' : 'Empezar · 2 min'}
        </button>
      </article>

      <dl style={{ margin: 0, borderTop: '1px solid rgba(20,24,51,0.12)' }}>
        <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(20,24,51,0.12)' }}>
          {rutaActiva?.completada ? <>
            <dt style={eyebrowAdentro}>Tu ruta · {rutaActiva.prog.title} · Completada</dt>
            <dd style={{ margin: '6px 0 0', fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, lineHeight: 1.15, color: C.navy }}>
              Completaste esta ruta
            </dd>
            <dd style={{ margin: '8px 0 0' }}>
              <button onClick={() => abrirAcceso('programas')} style={{ background: 'none', border: 'none', minHeight: 44, padding: 0, color: C.morado, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Elegir otra ruta</button>
            </dd>
          </> : rutaActiva ? <>
            <dt style={eyebrowAdentro}>
              Tu ruta · {rutaActiva.prog.title} · Día {rutaActiva.siguiente.day} de {rutaActiva.total}
            </dt>
            <dd style={{ margin: '6px 0 0', fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, lineHeight: 1.15, color: C.navy }}>
              {rutaActiva.siguiente.title}
            </dd>
            <dd style={{ margin: '4px 0 0', fontSize: 15, lineHeight: 1.45, color: C.muted }}>{rutaActiva.siguiente.task}</dd>
            <dd aria-hidden="true" style={{ margin: '10px 0 0', height: 4, background: C.sageClara, borderRadius: 2 }}>
              <div style={{ height: 4, width: `${Math.round((rutaActiva.hechos / rutaActiva.total) * 100)}%`, background: C.sage, borderRadius: 2 }} />
            </dd>
            <dd style={{ margin: '8px 0 0' }}>
              <button onClick={() => abrirAcceso('programas')} style={{ background: 'none', border: 'none', minHeight: 44, padding: 0, color: C.morado, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Ver tu ruta</button>
            </dd>
          </> : <>
            <dt style={eyebrowAdentro}>Tu ruta</dt>
            <dd style={{ margin: '6px 0 0', fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, lineHeight: 1.15, color: C.navy }}>
              Una ruta de 7 días para acompañar tu semana
            </dd>
            <dd style={{ margin: '8px 0 0' }}>
              <button onClick={() => abrirAcceso('programas')} style={{ background: 'none', border: 'none', minHeight: 44, padding: 0, color: C.morado, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Ver rutas</button>
            </dd>
          </>}
        </div>
        {/* El libro solo mientras la temporada está vigente, y el lugar es
            el de la ciudad elegida en Afuera (rondas-22). */}
        {libroDonde !== null && (
        <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(20,24,51,0.12)' }}>
          <dt style={eyebrowAdentro}>Para llevar · Libro de la temporada</dt>
          <dd style={{ margin: '6px 0 0', fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, lineHeight: 1.15, color: C.navy }}>
            {TEMPORADA.libro.titulo}
          </dd>
          <dd style={{ margin: '4px 0 0', fontSize: 14, color: C.muted, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {libroDonde ? `${TEMPORADA.libro.autora} · ${libroDonde}` : TEMPORADA.libro.autora}
            {TEMPORADA.libro.ejemplo && (
              <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: '2px 8px' }}>Ejemplo</span>
            )}
          </dd>
        </div>
        )}
      </dl>

      <nav aria-label="Tus herramientas" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {ACCESOS.map(a => (
          <button key={a.id} id={`acceso-${a.id}`} data-acceso={a.id} onClick={() => abrirAcceso(a.id)} style={{
            // Con Tab o al volver aquí, el acceso queda por encima del menú fijo de abajo.
            scrollMarginBottom: 84,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 4px',
            background: C.card, border: '1px solid rgba(20,24,51,0.08)', borderRadius: 16,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: C.navy,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.morado} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{a.icon}</svg>
            {a.label}
          </button>
        ))}
      </nav>
    </div>
  )

  /* ── HÁBITOS ── */
  const habitosView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Progress */}
      <div style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: SHADOW.sm }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Hoy</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.rose }}>{totalDone}/{totalHabits}</span>
        </div>
        <Bar value={totalHabits > 0 ? (totalDone / totalHabits) * 100 : 0} />
      </div>

      {/* Monthly streak */}
      <div style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: SHADOW.sm }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Tu racha este mes</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
          {['L','M','X','J','V','S','D'].map(d => (
            <div key={d} style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 2 }}>{d}</div>
          ))}
          {(() => {
            const now = new Date()
            const hoy = todayKey(now)
            const year = now.getFullYear(), month = now.getMonth()
            const firstDay = new Date(year, month, 1).getDay()
            const daysInMonth = new Date(year, month + 1, 0).getDate()
            const offset = firstDay === 0 ? 6 : firstDay - 1
            const cells = []
            for (let i = 0; i < offset; i++) cells.push(<div key={'e'+i} />)
            for (let d = 1; d <= daysInMonth; d++) {
              const dateStr = todayKey(new Date(year, month, d))
              const isToday = dateStr === hoy
              // Cada día contra su propio total (habitos-5), no contra los hábitos de hoy.
              const dia = monthlyHistory[dateStr]
              const count = dia?.done || 0
              const completo = !!dia && dia.total > 0 && dia.done >= dia.total
              const bg = count > 0 ? (completo ? C.teal : C.teal+'40') : (isToday ? C.gold+'20' : 'transparent')
              cells.push(
                <div key={d} style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto',
                  background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: isToday ? 800 : 500,
                  color: completo ? 'white' : (count > 0 ? C.teal : (isToday ? C.gold : C.subtle)),
                  border: isToday ? '2px solid '+C.gold : 'none',
                }}>{d}</div>
              )
            }
            return cells
          })()}
        </div>
      </div>

      {/* Empty state — invite to pick habits */}
      {habits.length === 0 && (
        <div style={{ background: C.card, borderRadius: 14, padding: 20, textAlign: 'center', boxShadow: SHADOW.sm }}>
          <div style={{ fontSize: 28, marginBottom: 8, color: C.gold, opacity: 0.5 }}>●</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: FONT }}>
            Escoge tus hábitos
          </div>
          <div style={{ fontSize: 20, color: C.muted, marginBottom: 14 }}>
            Agrega hábitos de la lista de sugeridos o crea los tuyos propios
          </div>
        </div>
      )}

      {/* Habits by dimension */}
      {Object.entries(DIMS).map(([dim, cfg]) => {
        const dimHabits = habits.filter(h => h.dim === dim)
        if (dimHabits.length === 0) return null
        return (
          <div key={dim}>
            <div style={{ fontSize: 19, fontWeight: 800, color: cfg.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {ICONS[cfg.icon] ? ICONS[cfg.icon](cfg.color, 16) : ''} {cfg.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dimHabits.map(h => (
                <div key={h.id} data-habito={h.id} style={{
                  background: habitoNuevo?.id === h.id ? C.orquideaClara : C.card, borderRadius: 12, paddingRight: 4,
                  display: 'flex', alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: `3px solid ${checked[h.id] ? C.greenDone : cfg.color}`,
                  // Hecho se nota en el borde, la casilla y el tachado; sin bajar la
                  // opacidad, que dejaba el nombre y la X por debajo del contraste mínimo.
                  transition: 'all 0.15s',
                }}>
                  {/* La fila se marca con un solo botón (Tab + Espacio/Enter); la X queda aparte */}
                  <button type="button" role="checkbox" aria-checked={!!checked[h.id]}
                    aria-label={streaks[h.id] > 0 ? `${h.name}, racha de ${streaks[h.id]} ${streaks[h.id] === 1 ? 'día' : 'días'}` : h.name}
                    onClick={() => toggleHabit(h.id)} style={{
                    flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 12px 14px', margin: 0,
                    background: 'none', border: 'none', borderRadius: 12, textAlign: 'left',
                    fontFamily: 'inherit', color: 'inherit', cursor: 'pointer',
                  }}>
                    <span aria-hidden="true" style={{
                      width: 24, height: 24, borderRadius: 7, border: `2px solid ${checked[h.id] ? C.greenDone : cfg.color}`,
                      background: checked[h.id] ? C.greenDone : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 19, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s',
                    }}>
                      {checked[h.id] && UI_ICONS.check('white', 15)}
                    </span>
                    <span style={{ fontSize: 19, fontWeight: 600, textDecoration: checked[h.id] ? 'line-through' : 'none', color: checked[h.id] ? C.subtle : C.text, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                      {h.name}
                    </span>
                    {streaks[h.id] > 0 && (
                      <span aria-hidden="true" style={{ fontSize: 20, fontWeight: 700, color: C.coral, background: `${C.coral}12`, padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 2 C12 2 8 7 8 12 C8 16 10 18 12 20 C14 18 16 16 16 12 C16 7 12 2 12 2Z" fill={C.coral} opacity="0.8" /><path d="M12 8 C12 8 10 11 10 13 C10 15 11 16 12 17 C13 16 14 15 14 13 C14 11 12 8 12 8Z" fill="white" opacity="0.5" /></svg>
                        {streaks[h.id]}
                      </span>
                    )}
                  </button>
                  <button type="button" aria-label={`Eliminar hábito ${h.name}`} onClick={() => pedirQuitarHabito(h)} style={{
                    background: 'none', border: 'none', fontSize: 20, color: C.subtle, cursor: 'pointer', padding: 0, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 44, minHeight: 44, flexShrink: 0,
                  }}>{UI_ICONS.close(C.subtle, 16)}</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Para lector de pantalla: confirma el hábito que se acaba de agregar */}
      <div role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>
        {habitoNuevo
          ? `Agregaste "${habitoNuevo.name}" en ${DIMS[habitoNuevo.dim].label}.`
          : sugeridosAgregados.length > 0 ? `Agregaste "${sugeridosAgregados[sugeridosAgregados.length - 1]}".` : ''}
      </div>

      {/* Add habit */}
      {showAddHabit ? (
        <div style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: SHADOW.sm }}>
          <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 10, color: C.text }}>Nuevo hábito</div>
          <input value={newHabitName} onChange={e => { setNewHabitName(e.target.value); setAvisoHabito('') }} placeholder="Nombre del hábito..."
            autoFocus aria-label="Nombre del hábito" aria-invalid={!!avisoHabito} aria-describedby={avisoHabito ? 'aviso-habito' : undefined}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
          />
          <div role="status" aria-live="polite">
            {avisoHabito && (
              <div id="aviso-habito" style={{ fontSize: 17, fontWeight: 600, color: C.morado, marginTop: -4, marginBottom: 10 }}>
                {avisoHabito}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {Object.entries(DIMS).map(([key, d]) => (
              <button key={key} type="button" aria-pressed={newHabitDim === key} onClick={() => setNewHabitDim(key)} style={{
                padding: '5px 12px', borderRadius: 20, border: `2px solid ${d.color}`,
                background: newHabitDim === key ? d.color : 'transparent',
                color: newHabitDim === key ? 'white' : d.color,
                fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {/* Elegida, el ícono va en blanco: en su color no se vería sobre el fondo */}
                {ICONS[d.icon] ? ICONS[d.icon](newHabitDim === key ? '#FFFFFF' : d.color, 16) : ''} {d.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addHabit} disabled={!newHabitName.trim()} style={{
              flex: 1, padding: 10, borderRadius: 10, border: 'none', fontSize: 19, fontWeight: 700, fontFamily: 'inherit',
              background: newHabitName.trim() ? C.rose : C.border, color: newHabitName.trim() ? 'white' : C.subtle,
              cursor: newHabitName.trim() ? 'pointer' : 'default',
            }}>
              Agregar
            </button>
            <button onClick={() => { setShowAddHabit(false); setAvisoHabito(''); enfocarDespues('habito-agregar') }} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'white', fontSize: 19, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: C.muted }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button id="habito-agregar" onClick={() => setShowAddHabit(true)} style={{
          padding: 12, borderRadius: 12, border: `2px dashed ${C.contorno}`, background: 'transparent',
          color: C.rose, fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          + Agregar hábito
        </button>
      )}

      {/* Suggested habits */}
      {SUGGESTED_HABITS.some(sugeridoVisible) && (
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 8 }}>
            Sugeridos para ti
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SUGGESTED_HABITS.filter(sugeridoVisible).map(sh => {
              const agregado = tieneHabito(sh.name)
              return (
              <div key={sh.name} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${DIMS[sh.dim].color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {ICONS[DIMS[sh.dim].icon](DIMS[sh.dim].color, 18)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{sh.name}</div>
                  <div style={{ fontSize: 19, color: DIMS[sh.dim].color, fontWeight: 600 }}>{DIMS[sh.dim].label}</div>
                </div>
                <button type="button" data-sugerido onClick={e => addSuggestedHabit(sh, e)} disabled={agregado}
                  aria-label={agregado ? `Hábito ${sh.name} agregado` : `Agregar hábito ${sh.name}`} style={{
                  padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${DIMS[sh.dim].color}`,
                  background: agregado ? DIMS[sh.dim].color : 'transparent', color: agregado ? 'white' : DIMS[sh.dim].color, fontSize: 20, fontWeight: 700,
                  cursor: agregado ? 'default' : 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  {agregado ? <>{UI_ICONS.check('white', 14)} Agregado</> : '+ Agregar'}
                </button>
              </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  /* ── RUTINA ── */
  const renderRoutineSection = (title, emoji, items, color, sectionKey) => (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        {emoji} {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ordenarPorHora(items).map(item => (
          editingRoutine && editingRoutineItem && editingRoutineItem.id === item.id ? (
            /* Inline edit mode */
            <div key={item.id} style={{
              background: C.card, borderRadius: 12, padding: 14,
              boxShadow: '0 2px 8px rgba(20,24,51,0.15)', border: `2px solid ${C.rose}`,
            }}>
              {/* Como en "+ Agregar a mi rutina": si junto al selector de hora
                  (~150 px en el celular) la tarea no se lee, baja de línea.
                  Es un textarea que crece con el texto: una tarea larga se lee
                  entera en varios renglones, como en la lista. Enter guarda. */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <input type="time" aria-label="Hora" value={editingRoutineItem.time} onChange={e => setEditingRoutineItem(prev => ({...prev, time: e.target.value}))}
                  style={{ flexShrink: 0, padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', fontWeight: 700, color: C.gold, boxSizing: 'border-box' }} />
                <textarea aria-label="Qué quieres hacer" rows={1} value={editingRoutineItem.task}
                  onChange={e => setEditingRoutineItem(prev => ({...prev, task: e.target.value.replace(/\n/g, ' ')}))}
                  ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px` } }}
                  style={{ flex: '1 1 200px', minWidth: 0, padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', lineHeight: 1.3, resize: 'none', overflow: 'hidden', boxSizing: 'border-box', display: 'block' }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveRoutineItemEdit() } }} />
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                {ROUTINE_EMOJIS.map(e => (
                  <button key={e} onClick={() => setEditingRoutineItem(prev => ({...prev, emoji: e}))} style={{
                    fontSize: 20, padding: 3, background: editingRoutineItem.emoji === e ? C.beige : 'transparent',
                    border: editingRoutineItem.emoji === e ? `2px solid ${C.rose}` : '2px solid transparent',
                    borderRadius: 6, cursor: 'pointer',
                  }}>{e}</button>
                ))}
              </div>
              {renderSectionPicker(editingRoutineItem.sectionKey, k => setEditingRoutineItem(prev => ({ ...prev, sectionKey: k })))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveRoutineItemEdit} disabled={!edicionValida(editingRoutineItem)} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: edicionValida(editingRoutineItem) ? C.rose : C.border, color: edicionValida(editingRoutineItem) ? 'white' : C.subtle, fontSize: 19, fontWeight: 700, cursor: edicionValida(editingRoutineItem) ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                  ✓ Guardar
                </button>
                <button onClick={() => setEditingRoutineItem(null)} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'white', fontSize: 19, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: C.muted }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div key={item.id} style={{
              background: C.card, borderRadius: 12, paddingRight: editingRoutine ? 4 : 0,
              display: 'flex', alignItems: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              opacity: routineChecked[item.id] ? 0.55 : 1, transition: 'all 0.15s',
            }}>
              {/* Círculo, hora y texto son un solo control; ✎ y × quedan aparte */}
              <button type="button" role="checkbox" aria-checked={!!routineChecked[item.id]} onClick={() => toggleRoutine(item.id)} style={{
                flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: editingRoutine ? '11px 0 11px 14px' : '11px 14px', margin: 0,
                background: 'none', border: 'none', borderRadius: 12, textAlign: 'left',
                fontFamily: 'inherit', color: 'inherit', cursor: 'pointer',
              }}>
                <span aria-hidden="true" style={{
                  width: 22, height: 22, borderRadius: '50%', border: `2px solid ${routineChecked[item.id] ? C.greenDone : C.contorno}`,
                  background: routineChecked[item.id] ? C.greenDone : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 19, flexShrink: 0,
                }}>
                  {routineChecked[item.id] && UI_ICONS.check('white', 14)}
                </span>
                <span style={{ minWidth: 44, height: 44, padding: '0 10px', borderRadius: 22, boxSizing: 'border-box', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: color, whiteSpace: 'nowrap', lineHeight: 1 }}>{horaHHMM(item.time) || item.time}</span>
                </span>
                <span style={{ fontSize: 19, fontWeight: 600, color: routineChecked[item.id] ? C.subtle : C.text, textDecoration: routineChecked[item.id] ? 'line-through' : 'none', flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                  {item.task}
                </span>
              </button>
              {editingRoutine && <>
                <button type="button" aria-label={`Editar ${item.task}`} onClick={() => setEditingRoutineItem({ sectionKey, originalSection: sectionKey, id: item.id, time: horaHHMM(item.time), task: item.task, emoji: item.emoji })} style={{
                  background: 'none', border: 'none', color: C.gold, fontSize: 20, cursor: 'pointer', padding: 0, flexShrink: 0,
                  minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}><span aria-hidden="true">✎</span></button>
                <button type="button" aria-label={`Quitar ${item.task} de la rutina`} onClick={() => pedirQuitarRutina(sectionKey, item)} style={{
                  background: 'none', border: 'none', color: C.coral, fontSize: 20, cursor: 'pointer', padding: 0, flexShrink: 0,
                  minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}><span aria-hidden="true">×</span></button>
              </>}
            </div>
          )
        ))}
      </div>
    </div>
  )

  const ROUTINE_EMOJIS = []

  // Las tres secciones de la rutina. Los mismos nombres van en los títulos
  // y en los selectores de agregar y de editar.
  const ROUTINE_SECTIONS = [{ k: 'morning', l: 'Mañana' }, { k: 'midday', l: 'Mediodía' }, { k: 'night', l: 'Noche' }]
  const renderSectionPicker = (value, onPick) => (
    <div role="group" aria-label="Sección de la rutina" style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
      {ROUTINE_SECTIONS.map(s => (
        <button key={s.k} type="button" aria-pressed={value === s.k} onClick={() => onPick(s.k)} style={{
          padding: '6px 12px', borderRadius: 20, fontSize: 19, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', border: `1.5px solid ${C.rose}`,
          background: value === s.k ? C.rose : 'transparent',
          color: value === s.k ? 'white' : C.rose,
        }}>{s.l}</button>
      ))}
    </div>
  )
  // Un paso editado se puede guardar si tiene hora válida y texto.
  const edicionValida = (it) => horaValida(it.time) && !!(it.task || '').trim()

  // Lista de tareas del ritual de noche (para mañana o planeadas para hoy).
  // Con onRemove, cada tarea lleva su × para quitarla.
  const renderTaskList = (tasks, onToggle, onRemove) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {tasks.map(t => (
        <div key={t.id} data-tarea={t.id} style={{ display: 'flex', alignItems: 'center', background: C.cream, borderRadius: 10 }}>
          <button type="button" role="checkbox" aria-checked={!!t.done} onClick={() => onToggle(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: onRemove ? '8px 0 8px 12px' : '8px 12px', background: 'none',
            borderRadius: 10, cursor: 'pointer', border: 'none', margin: 0, flex: 1, minWidth: 0, textAlign: 'left',
            fontFamily: 'inherit', color: 'inherit',
          }}>
            <span aria-hidden="true" style={{
              width: 20, height: 20, borderRadius: '50%', border: `2px solid ${t.done ? C.greenDone : C.contorno}`,
              background: t.done ? C.greenDone : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 20, flexShrink: 0,
            }}>{t.done && UI_ICONS.check('white', 13)}</span>
            <span style={{ fontSize: 20, color: t.done ? C.subtle : C.text, textDecoration: t.done ? 'line-through' : 'none', flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{t.task}</span>
          </button>
          {onRemove && (
            <button type="button" aria-label={`Quitar ${t.task}`} onClick={() => onRemove(t)} style={{
              background: 'none', border: 'none', color: C.coral, fontSize: 20, cursor: 'pointer', padding: 0, flexShrink: 0,
              minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><span aria-hidden="true">×</span></button>
          )}
        </div>
      ))}
    </div>
  )

  const rutinaView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Lo que se planeó anoche en el ritual de noche */}
      {plannedToday.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${C.gold}30` }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, marginBottom: 4 }}>Lo que planeaste para hoy</div>
          <div style={{ fontSize: 19, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
            Lo dejaste listo en tu ritual de noche. Marca lo que vayas haciendo.
          </div>
          {renderTaskList(plannedToday, togglePlannedTask, pedirQuitarTareaHoy)}
        </div>
      )}

      {/* Edit toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {/* Salir (o entrar) del modo edición descarta cualquier edición en curso */}
        <button onClick={() => { setEditingRoutine(!editingRoutine); setEditingRoutineItem(null) }} style={{
          background: editingRoutine ? C.rose : 'transparent', color: editingRoutine ? 'white' : C.rose,
          border: `1.5px solid ${C.rose}`, borderRadius: 20, padding: '6px 16px',
          fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {editingRoutine ? '✓ Listo' : '✎ Editar mi rutina'}
        </button>
      </div>

      {/* Rutina vacía (usuaria nueva): invitación a armarla en vez de tres títulos sueltos */}
      {morning.length + midday.length + night.length === 0 && !editingRoutine ? (
        <div style={{ background: C.card, borderRadius: 14, padding: 20, textAlign: 'center', boxShadow: SHADOW.sm }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: FONT }}>
            Arma tu rutina
          </div>
          <div style={{ fontSize: 20, color: C.muted, marginBottom: 14 }}>
            Aún no tienes pasos. Agrega lo que quieres hacer en la mañana, al mediodía y en la noche.
          </div>
          <button onClick={() => {
            setEditingRoutine(true)
            // El botón se va con la invitación: el foco pasa al campo del
            // formulario para agregar (no se pierde en <body>).
            requestAnimationFrame(() => document.getElementById('rutina-tarea-nueva')?.focus())
          }} style={{
            background: C.rose, color: 'white', border: 'none', borderRadius: 20, padding: '10px 18px',
            fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Agregar mi primer paso
          </button>
        </div>
      ) : <>
        {renderRoutineSection('Mañana', '', morning, C.rose, 'morning')}
        <div style={{ height: 1, background: C.border }} />
        {renderRoutineSection('Mediodía', '', midday, C.gold, 'midday')}
        <div style={{ height: 1, background: C.border }} />
        {renderRoutineSection('Noche', '', night, C.roseDark, 'night')}
      </>}

      {/* Add new routine item */}
      {editingRoutine && (
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: SHADOW.sm }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginBottom: 12 }}>+ Agregar a mi rutina</div>
          {renderSectionPicker(newRoutineSection, setNewRoutineSection)}
          {/* La hora con su etiqueta visible. Si no queda espacio para leer
              "¿Qué quieres hacer?" (en el celular el selector de hora mide
              ~150 px), el campo de la tarea baja a su propia línea. */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: 17, fontWeight: 700, color: C.muted }}>
              Hora
              <input type="time" value={newRoutineTime} onChange={e => setNewRoutineTime(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', boxSizing: 'border-box', color: C.text }} />
            </label>
            <input id="rutina-tarea-nueva" value={newRoutineTask} onChange={e => setNewRoutineTask(e.target.value)} placeholder="¿Qué quieres hacer?"
              aria-label="Qué quieres hacer"
              style={{ flex: '1 1 200px', minWidth: 0, padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', boxSizing: 'border-box' }}
              onKeyDown={e => e.key === 'Enter' && addRoutineItem()} />
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {ROUTINE_EMOJIS.map(e => (
              <button key={e} onClick={() => setNewRoutineEmoji(e)} style={{
                fontSize: 20, padding: 4, background: newRoutineEmoji === e ? C.beige : 'transparent',
                border: newRoutineEmoji === e ? `2px solid ${C.rose}` : '2px solid transparent',
                borderRadius: 8, cursor: 'pointer',
              }}>{e}</button>
            ))}
          </div>
          <button onClick={addRoutineItem} disabled={!newRoutineTask.trim() || !horaValida(newRoutineTime)} style={{
            width: '100%', padding: 10, borderRadius: 12, border: 'none', fontSize: 20, fontWeight: 700,
            fontFamily: 'inherit', cursor: newRoutineTask.trim() && horaValida(newRoutineTime) ? 'pointer' : 'default',
            background: newRoutineTask.trim() && horaValida(newRoutineTime) ? C.rose : C.border,
            color: newRoutineTask.trim() && horaValida(newRoutineTime) ? 'white' : C.subtle,
          }}>Agregar</button>
          {/* Con la tarea escrita y sin hora, se dice qué falta (el botón sigue apagado). */}
          <div aria-live="polite" style={{ fontSize: 17, color: C.muted, marginTop: newRoutineTask.trim() && !horaValida(newRoutineTime) ? 8 : 0 }}>
            {newRoutineTask.trim() && !horaValida(newRoutineTime) ? 'Elige la hora para agregarlo.' : ''}
          </div>
        </div>
      )}

      <div style={{ height: 1, background: C.border }} />

      {/* Night ritual: Plan tomorrow */}
      <div style={{ background: C.card, borderRadius: 18, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${C.gold}30` }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, marginBottom: 4 }}>Ritual de noche</div>
        <div style={{ fontSize: 19, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
          Planifica tu mañana para soltar la ansiedad de hoy. Escribir lo que viene te ayuda a descansar.
        </div>

        {/* What I accomplished today */}
        {(() => {
          // Solo cuentan los pasos que siguen en la rutina (no los ya quitados).
          const pasos = [...morning, ...midday, ...night]
          const todayDone = pasos.filter(i => routineChecked[i.id]).length
          const todayTotal = pasos.length
          return todayDone > 0 && (
            <div style={{ background: `${C.greenDone}15`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.greenDone }}>
                ✓ Hoy completaste {todayDone} de {todayTotal} cosas de tu rutina
              </div>
              <div style={{ fontSize: 19, color: C.muted, marginTop: 4 }}>Ya puedes soltar el día. Lo hiciste bien. </div>
            </div>
          )
        })()}

        {/* Tomorrow tasks */}
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8 }}>¿Qué necesito hacer mañana?</div>
        <div style={{ marginBottom: 12 }}>{renderTaskList(tomorrowTasks, toggleTomorrowTask, pedirQuitarTareaManana)}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="tarea-manana" value={newTomorrowTask} onChange={e => setNewTomorrowTask(e.target.value)} placeholder="Escribir tarea para mañana..."
            aria-label="Tarea para mañana"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit' }}
            onKeyDown={e => e.key === 'Enter' && addTomorrowTask()} />
          <button onClick={addTomorrowTask} disabled={!newTomorrowTask.trim()} aria-label="Agregar tarea para mañana" style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', background: newTomorrowTask.trim() ? C.gold : C.border,
            color: newTomorrowTask.trim() ? 'white' : C.subtle, fontSize: 20, fontWeight: 700, cursor: newTomorrowTask.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
          }}>+</button>
        </div>
      </div>
    </div>
  )

  /* ── DIARIO ── */
  const diarioView = (
    <DiarioView
      journalMood={journalMood}
      setJournalMood={setJournalMood}
      journalText={journalText}
      setJournalText={setJournalText}
      isListening={isListening}
      toggleVoiceInput={toggleVoiceInput}
      addJournalEntry={addJournalEntry}
      pedirBorrarEntrada={pedirBorrarEntrada}
      entries={entries}
      activePrograms={activePrograms}
      startProgram={startProgram}
      openModule={openModule}
    />
  )

  /* ── PROGRAMAS ── */
  /* ── HISTORIA DE RONDA ── */
  const historiaView = <HistoriaView showFullStory={showFullStory} setShowFullStory={setShowFullStory} />

  // Lleva a la tarjeta de una ruta en "Mis rutas activas" (recién empezada o
  // ya en curso): queda arriba, bajo el encabezado fijo, con su Día 1 a la
  // vista, y el foco pasa a su título. Con un aviso abierto el fondo es inerte:
  // se mueve igual y el foco se queda en el aviso.
  const irARutaActiva = (progId) => requestAnimationFrame(() => {
    const tarjeta = document.getElementById(`ruta-activa-${progId}`)
    if (!tarjeta) return
    const alto = document.querySelector('header')?.offsetHeight || 0
    window.scrollTo({ top: tarjeta.getBoundingClientRect().top + window.scrollY - alto - 12 })
    tarjeta.querySelector('[data-titulo-ruta]')?.focus({ preventScroll: true })
  })

  const programasView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ background: C.morado, borderRadius: 20, padding: 22, color: 'white' }}>
        <div id="rutas-titulo" tabIndex={-1} style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT, outline: 'none' }}>Rutas</div>
        <div style={{ fontSize: 19, opacity: 0.85, marginTop: 4 }}>Caminos paso a paso para crecer y brillar</div>
        <div style={{ fontSize: 19, marginTop: 6, opacity: 0.7 }}>Una práctica al día. Tu transformación.</div>
      </div>

      {/* Active programs */}
      {Object.keys(activePrograms).some(id => todosLosProgramas.some(p => p.id === id && p.days?.length)) && (
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Mis rutas activas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(activePrograms).map(([progId, progress]) => {
              const prog = todosLosProgramas.find(p => p.id === progId)
              if (!prog || !prog.days?.length) return null
              const completedCount = progress.completedDays.length
              const pct = Math.round((completedCount / prog.days.length) * 100)
              // El primer día sin hacer muestra abierto su "Por qué funciona".
              const diaSiguiente = prog.days.find(d => !progress.completedDays.includes(d.day))?.day
              return (
                <div key={progId} id={`ruta-activa-${progId}`} style={{ background: C.card, borderRadius: 18, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `2px solid ${prog.color}25` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div data-titulo-ruta tabIndex={-1} style={{ fontSize: 19, fontWeight: 800, color: C.text, outline: 'none' }}>{ICONS[prog.id] ? <>{ICONS[prog.id](prog.color, 24)} </> : null}{prog.title}</div>
                      <div style={{ fontSize: 19, color: C.muted, marginTop: 2 }}>{completedCount} de {prog.days.length} días · {pct}%</div>
                    </div>
                    <button type="button" aria-label={`Dejar la ruta ${prog.title}`} onClick={() => pedirDejarRuta(prog, completedCount)} style={{
                      background: 'none', border: 'none', fontSize: 20, color: C.subtle, cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 44, minHeight: 44, flexShrink: 0, margin: '-10px -10px -10px 0',
                    }}>{UI_ICONS.close(C.subtle, 16)}</button>
                  </div>
                  <Bar value={pct} color={prog.color} height={6} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
                    {prog.days.map(d => {
                      const isDone = progress.completedDays.includes(d.day)
                      // Rutas de 21 días: el porqué (neuro) y la pregunta (prompt) de cada día.
                      const porQue = typeof d.neuro === 'string' ? d.neuro.trim() : ''
                      const pregunta = typeof d.prompt === 'string' ? d.prompt.trim() : ''
                      return (
                        <div key={d.day} style={{
                          background: isDone ? `${prog.color}08` : C.cream, borderRadius: 14,
                          border: `1px solid ${isDone ? `${prog.color}30` : C.border}`,
                          transition: 'all 0.15s',
                        }}>
                          <button type="button" role="checkbox" aria-checked={isDone} onClick={() => completeProgDay(progId, d.day)} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                            background: 'none', borderRadius: 14, cursor: 'pointer', border: 'none',
                            width: '100%', margin: 0, textAlign: 'left', fontFamily: 'inherit', color: 'inherit',
                          }}>
                            <span aria-hidden="true" style={{
                              // Borde con 3:1 sobre la fila: el salvia pasa a oliva (colorTexto).
                              width: 24, height: 24, borderRadius: 7, border: `2px solid ${isDone ? C.green : colorTexto(prog.color)}`,
                              background: isDone ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontSize: 19, fontWeight: 700, flexShrink: 0, marginTop: 2,
                            }}>
                              {isDone && UI_ICONS.check('white', 15)}
                            </span>
                            <span style={{ display: 'block', flex: 1 }}>
                              <span style={{ display: 'block', fontSize: 20, fontWeight: 700, color: colorTexto(prog.color), textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                Día {d.day} {ICONS[d.icon] ? ICONS[d.icon](d.color, 16) : ''}
                              </span>
                              <span style={{ display: 'block', fontSize: 19, fontWeight: 700, color: isDone ? C.subtle : C.text, marginTop: 2,
                                textDecoration: isDone ? 'line-through' : 'none' }}>
                                {d.title}
                              </span>
                              <span style={{ display: 'block', fontSize: 19, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                                {d.task}
                              </span>
                            </span>
                          </button>
                          {(porQue || pregunta) && (
                            <details open={d.day === diaSiguiente} style={{ padding: '0 14px 12px 48px' }}>
                              <summary style={{ fontSize: 19, fontWeight: 700, color: colorTexto(prog.color), cursor: 'pointer', padding: '8px 0' }}>
                                {porQue ? 'Por qué funciona' : 'Para reflexionar'}
                              </summary>
                              {porQue && (
                                <div style={{ fontSize: 19, color: C.muted, lineHeight: 1.5, marginTop: 4, padding: '8px 10px', background: C.goldLight, borderRadius: 10 }}>
                                  {porQue}
                                </div>
                              )}
                              {pregunta && (
                                <div style={{ fontSize: 19, color: C.text, lineHeight: 1.5, marginTop: 8, fontStyle: 'italic' }}>
                                  {porQue && <span style={{ fontWeight: 700, fontStyle: 'normal' }}>Para reflexionar: </span>}{pregunta}
                                </div>
                              )}
                            </details>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {pct === 100 && (
                    <div style={{ textAlign: 'center', marginTop: 14, padding: 16, background: `${prog.color}10`, borderRadius: 14 }}>
                      <div style={{ fontSize: 28, marginBottom: 6, color: C.teal }}>●</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: colorTexto(prog.color) }}>¡Completaste la ruta!</div>
                      <div style={{ fontSize: 19, color: C.muted, marginTop: 4 }}>Eres increíble. Cada paso cuenta.</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available programs — positivos primero */}
      <div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Crece a tu ritmo
        </div>
        <div style={{ fontSize: 20, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          Estas rutas son para ti, estés donde estés. Un paso a la vez.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PROGRAMAS.filter(p => !activePrograms[p.id] && ['ejercicio','dios','mama','disciplina','amor_propio'].includes(p.id)).map(prog => (
            <div key={prog.id} style={{
              background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: `1px solid ${C.border}`, display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: `${prog.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {ICONS[prog.id] ? ICONS[prog.id](prog.color, 28) : <div style={{ width: 20, height: 20, borderRadius: '50%', background: prog.color }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{prog.title}</div>
                <div style={{ fontSize: 19, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{prog.desc}</div>
                <div style={{ fontSize: 20, color: C.subtle, marginTop: 4 }}>{prog.days.length} días · una práctica al día</div>
                <button data-empezar-ruta={prog.id} aria-label={`Empezar ${prog.title}`} onClick={() => { startProgram(prog.id); irARutaActiva(prog.id) }} style={{
                  marginTop: 10, padding: '8px 18px', borderRadius: 20, border: 'none',
                  background: prog.color, color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Empezar <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Programas de sanación */}
      <div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.rose, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Cuando necesites apoyo
        </div>
        <div style={{ fontSize: 20, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          Si estás pasando por algo difícil, estas rutas te acompañan paso a paso.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PROGRAMAS.filter(p => !activePrograms[p.id] && ['tusa','depresion','ansiedad','empezar','autoestima'].includes(p.id)).map(prog => (
            <div key={prog.id} style={{
              background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: `1px solid ${C.border}`, display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: `${prog.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {ICONS[prog.id] ? ICONS[prog.id](prog.color, 28) : <div style={{ width: 20, height: 20, borderRadius: '50%', background: prog.color }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{prog.title}</div>
                <div style={{ fontSize: 19, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{prog.desc}</div>
                <div style={{ fontSize: 20, color: C.subtle, marginTop: 4 }}>{prog.days.length} días · una práctica al día</div>
                <button data-empezar-ruta={prog.id} aria-label={`Empezar ${prog.title}`} onClick={() => { startProgram(prog.id); irARutaActiva(prog.id) }} style={{
                  marginTop: 10, padding: '8px 18px', borderRadius: 20, border: 'none',
                  background: prog.color, color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Empezar <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rutas creadas con Tu Ronda que no están en curso (las que se dejaron):
          siguen guardadas y se pueden volver a empezar. */}
      {customPrograms.some(p => !activePrograms[p.id] && p.days?.length) && (
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Creadas con Tu Ronda
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {customPrograms.filter(p => !activePrograms[p.id] && p.days?.length).map(prog => (
              <div key={prog.id} style={{
                background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{prog.title}</div>
                {prog.desc && <div style={{ fontSize: 19, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{prog.desc}</div>}
                <div style={{ fontSize: 20, color: C.subtle, marginTop: 4 }}>{prog.days.length} días · creada para ti</div>
                <button data-empezar-ruta={prog.id} aria-label={`Empezar ${prog.title}`} onClick={() => { startProgram(prog.id); irARutaActiva(prog.id) }} style={{
                  marginTop: 10, padding: '8px 18px', borderRadius: 20, border: 'none',
                  background: prog.color, color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Empezar <span aria-hidden="true">→</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Programa Premium 21 días */}
      <div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Rutas de transformación
        </div>
        {PROGRAMAS_PREMIUM.map(prog => (
          <div key={prog.id} style={{
            background: `linear-gradient(135deg, ${C.cream}, #EEF3F9)`, borderRadius: 20, padding: 22,
            border: `2px solid ${C.gold}40`, boxShadow: '0 4px 16px rgba(114,109,45,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ background: C.gold, color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: 19, fontWeight: 800, letterSpacing: '0.05em' }}>{PLAN_PAGO}</div>
              <div style={{ fontSize: 20, color: C.gold, fontWeight: 700 }}>{prog.duration}</div>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.text, fontFamily: FONT, marginBottom: 6 }}>{prog.title}</div>
            <div style={{ fontSize: 20, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>{prog.desc}</div>

            {/* 3 fases: en columnas en escritorio; en el celular, una debajo de
                otra (en tres columnas de ~90 px el rango y las palabras se partían) */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, marginBottom: 16 }}>
              {prog.phases.map((phase, i) => (
                <div key={i} style={{
                  flex: isMobile ? 'none' : '1 1 0', minWidth: 0, background: C.card, borderRadius: 12,
                  padding: isMobile ? '10px 14px' : '10px 8px', textAlign: isMobile ? 'left' : 'center',
                  border: `1px solid ${C.border}`,
                  ...(isMobile && { display: 'flex', alignItems: 'baseline', gap: 12 }),
                }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: C.gold, marginBottom: 2, whiteSpace: 'nowrap', flexShrink: 0, minWidth: isMobile ? 100 : 0 }}>Días {phase.days}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{phase.name}</div>
                    <div style={{ fontSize: 19, color: C.muted, marginTop: 2 }}>{phase.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Neuro badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: C.goldLight, borderRadius: 12, marginBottom: 16,
            }}>
              {ICONS.mental('#141833', 22)}
              <div style={{ fontSize: 20, color: C.muted, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 800 }}>Basado en neurociencia:</span> cada día incluye el porqué científico detrás de tu micro-acción.
              </div>
            </div>

            {/* Price + CTA */}
            <div style={{ textAlign: 'center' }}>
              {!isPremium && (
                <>
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.gold, marginBottom: 4 }}>{PLAN_PRECIO}</div>
                  <div style={{ fontSize: 20, color: C.muted, marginBottom: 14 }}>Incluido en {PLAN_PAGO}</div>
                </>
              )}
              <button data-empezar-ruta={prog.id} onClick={() => {
                if (!isPremium) {
                  track('paywall_viewed', { feature: 'programa_21_dias', price: PLAN_PRECIO })
                  setAppModal({
                    type: 'paywall',
                    title: `Esta ruta es parte de ${PLAN_PAGO}`,
                    body: 'Durante 21 días te acompaña paso a paso, con neurociencia y una micro-acción al día.',
                    cta: 'Ver planes',
                  })
                  return
                }
                // Ya en curso: lleva a su tarjeta en "Mis rutas activas".
                if (activePrograms[prog.id]) {
                  irARutaActiva(prog.id)
                  return
                }
                startProgram(prog.id)
                // Miembro fundadora: el aviso de que la tiene incluida va en
                // este mismo mensaje (detrás, la página ya bajó a la ruta).
                const fundadora = marcarAvisoFundadora('p21')
                // Detrás del aviso la página ya sube a la ruta: al cerrarlo, el
                // Día 1 queda a la vista y el foco va a su título (no al botón
                // de más abajo, que quedó fuera de la vista).
                irARutaActiva(prog.id)
                focoTrasModalRef.current = () => document.querySelector(`#ruta-activa-${prog.id} [data-titulo-ruta]`)
                setAppModal({
                  type: 'success',
                  title: `¡Activaste "${prog.title}"!`,
                  body: `Tu Día 1 ya está listo en Mis rutas activas. Un paso al día, durante 21 días.${fundadora ? ` Como miembro fundadora, la tienes incluida en ${PLAN_PAGO}.` : ''} 💛`,
                  cta: 'Empezar mi camino',
                })
              }} style={{
                width: '100%', padding: '14px 24px', borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${C.gold}, #91946E)`,
                color: 'white', fontSize: 20, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(114,109,45,0.35)', letterSpacing: '0.02em',
              }}>
                {!isPremium ? `Desbloquear con ${PLAN_PAGO}` : activePrograms[prog.id] ? 'Continuar mi ruta' : 'Empezar esta ruta'}
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  )

  /* ── TOOLKIT ── */
  const toolkitCounts = TOOLKIT_CATS.reduce((acc, cat) => {
    acc[cat.id] = toolkitItems.filter(t => t.cat === cat.id).length
    return acc
  }, {})
  // Un filtro cuya categoría quedó sin recursos se ve como 'Todas': nunca
  // una lista vacía sin ningún chip marcado (toolkit-2).
  const filtroToolkit = toolFilter !== 'todas' && !toolkitCounts[toolFilter] ? 'todas' : toolFilter
  const filteredTools = filtroToolkit === 'todas' ? toolkitItems : toolkitItems.filter(t => t.cat === filtroToolkit)
  // Enter (o 'Ir' en el teclado del celular) guarda, como en los demás
  // formularios de la app (toolkit-8).
  const guardarRecursoConEnter = (e) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      addToolkitItem()
    }
  }
  const nombreRecursoListo = newToolName.trim() !== ''
  const faltaNombreRecurso = !nombreRecursoListo && !!(newToolUrl.trim() || newToolNote.trim())

  const toolkitView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ background: C.morado, borderRadius: 20, padding: 20, color: 'white' }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT }}>Mi Toolkit</div>
        <div style={{ fontSize: 19, opacity: 0.85, marginTop: 4 }}>Tus recursos de crecimiento, todo en un lugar</div>
        <div style={{ fontSize: 19, marginTop: 8, opacity: 0.7 }}>{toolkitItems.length} {toolkitItems.length === 1 ? 'recurso guardado' : 'recursos guardados'}</div>
      </div>

      {/* Category chips with counts. aria-pressed dice cuál está activo (toolkit-16). */}
      <div role="group" aria-label="Filtrar por categoría" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        <button type="button" aria-pressed={filtroToolkit === 'todas'} onClick={() => setToolFilter('todas')} style={{
          padding: '6px 14px', borderRadius: 20, border: `2px solid ${filtroToolkit === 'todas' ? C.rose : C.border}`,
          background: filtroToolkit === 'todas' ? C.rose : C.card, color: filtroToolkit === 'todas' ? 'white' : C.muted,
          fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
          Todas ({toolkitItems.length})
        </button>
        {TOOLKIT_CATS.map(cat => {
          // El ícono va en blanco sobre el chip activo: con cat.color
          // desaparecía contra su propio fondo (toolkit-10).
          const activo = filtroToolkit === cat.id
          const colorIcono = activo ? '#FFFFFF' : cat.color
          return toolkitCounts[cat.id] > 0 && (
            <button key={cat.id} type="button" aria-pressed={activo} onClick={() => setToolFilter(cat.id)} style={{
              padding: '6px 14px', borderRadius: 20, border: `2px solid ${activo ? cat.color : C.border}`,
              background: activo ? cat.color : C.card, color: activo ? 'white' : C.muted,
              fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              {ICONS['cat_'+cat.id] ? ICONS['cat_'+cat.id](colorIcono, 16) : (ICONS[cat.id] ? ICONS[cat.id](colorIcono, 16) : <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorIcono, display: 'inline-block' }} />)} {cat.label} ({toolkitCounts[cat.id]})
            </button>
          )
        })}
      </div>

      {/* Add new resource */}
      {showAddTool ? (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: SHADOW.sm }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: C.text }}>Agregar recurso</div>

          {/* Etiqueta visible: el placeholder desaparece al escribir */}
          <label htmlFor="recurso-nombre" style={{ display: 'block', fontSize: 17, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Nombre</label>
          <input id="recurso-nombre" value={newToolName} onChange={e => setNewToolName(e.target.value)} placeholder="Ej: Podcast de Jay Shetty"
            autoFocus onKeyDown={guardarRecursoConEnter}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }}
          />

          <label htmlFor="recurso-link" style={{ display: 'block', fontSize: 17, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Link</label>
          <input id="recurso-link" value={newToolUrl} onChange={e => { setNewToolUrl(e.target.value); setLinkRecursoInvalido(false) }} placeholder="Ej: https://spotify.com/..."
            inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            aria-invalid={linkRecursoInvalido} aria-describedby={linkRecursoInvalido ? 'recurso-link-error' : undefined}
            onKeyDown={guardarRecursoConEnter}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${linkRecursoInvalido ? C.coral : C.border}`, fontSize: 20, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }}
          />
          {linkRecursoInvalido && (
            <div id="recurso-link-error" role="alert" style={{ fontSize: 17, color: C.coral, fontWeight: 600, marginTop: -4, marginBottom: 10 }}>
              Revisa el link: debe verse como ejemplo.com o https://ejemplo.com
            </div>
          )}

          <label htmlFor="recurso-nota" style={{ display: 'block', fontSize: 17, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Nota (opcional)</label>
          <input id="recurso-nota" value={newToolNote} onChange={e => setNewToolNote(e.target.value)}
            onKeyDown={guardarRecursoConEnter}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }}
          />

          {/* Category selector. aria-pressed dice cuál está elegida (toolkit-16). */}
          <div role="group" aria-label="Categoría del recurso" style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {TOOLKIT_CATS.map(cat => {
              const elegida = newToolCat === cat.id
              const colorIcono = elegida ? '#FFFFFF' : cat.color // visible sobre el fondo de color (toolkit-10)
              return (
                <button key={cat.id} type="button" aria-pressed={elegida} onClick={() => setNewToolCat(cat.id)} style={{
                  padding: '5px 10px', borderRadius: 20, border: `2px solid ${cat.color}`,
                  background: elegida ? cat.color : 'transparent',
                  color: elegida ? 'white' : cat.color,
                  fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {ICONS['cat_'+cat.id] ? ICONS['cat_'+cat.id](colorIcono, 16) : (ICONS[cat.id] ? ICONS[cat.id](colorIcono, 16) : <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorIcono, display: 'inline-block' }} />)} {cat.label}
                </button>
              )
            })}
          </div>

          {/* Sin nombre no se puede guardar: el botón se apaga, como en los
              demás formularios, y si ya hay link o nota se dice qué falta
              (toolkit-5). */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={addToolkitItem} disabled={!nombreRecursoListo} style={{
              flex: 1, padding: 10, borderRadius: 10, border: 'none', fontSize: 19, fontWeight: 700, fontFamily: 'inherit',
              background: nombreRecursoListo ? C.rose : C.border, color: nombreRecursoListo ? 'white' : C.subtle,
              cursor: nombreRecursoListo ? 'pointer' : 'default',
            }}>
              Guardar
            </button>
            <button type="button" onClick={cerrarFormRecurso} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'white', fontSize: 19, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: C.muted }}>
              Cancelar
            </button>
          </div>
          <div aria-live="polite" style={{ fontSize: 17, color: C.muted, marginTop: faltaNombreRecurso ? 8 : 0 }}>
            {faltaNombreRecurso ? 'Escribe un nombre para guardar el recurso.' : ''}
          </div>
        </div>
      ) : (
        <button id="recurso-agregar" onClick={() => {
          // Con un filtro activo, el formulario abre con esa categoría (toolkit-6).
          if (filtroToolkit !== 'todas') setNewToolCat(filtroToolkit)
          setShowAddTool(true)
        }} style={{
          padding: 14, borderRadius: 12, border: `2px dashed ${C.contorno}`, background: 'transparent',
          color: C.rose, fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          + Agregar recurso
        </button>
      )}

      {/* Resource list */}
      {filteredTools.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredTools.map(item => {
            const cat = TOOLKIT_CATS.find(c => c.id === item.cat) || TOOLKIT_CATS[TOOLKIT_CATS.length - 1]
            // También corrige links ya guardados ('Https://…', 'httpster.net');
            // si el texto no es una dirección web no se ofrece un enlace roto.
            const link = urlDelRecurso(item.url)
            return (
              <div key={item.id} data-recurso={item.id} style={{
                background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                borderLeft: `3px solid ${cat.color}`, display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{ICONS['cat_'+cat.id] ? ICONS['cat_'+cat.id](cat.color, 16) : (ICONS[cat.id] ? ICONS[cat.id](cat.color, 16) : <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{item.name}</div>
                  {item.note && <div style={{ fontSize: 19, color: C.muted, marginTop: 2 }}>{item.note}</div>}
                  {/* La categoría no se parte: si no cabe con "Abrir →", el link baja de línea. */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 20, background: C.beige, padding: '2px 8px', borderRadius: 20, color: cat.textColor || cat.color, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {cat.label}
                    </span>
                    {link && (
                      // Nombre que dice qué abre y área táctil de 36 px; los
                      // márgenes negativos dejan el diseño igual (toolkit-14).
                      <a href={link} target="_blank" rel="noopener noreferrer"
                        aria-label={`Abrir ${item.name} (se abre en otra pestaña)`}
                        style={{
                          fontSize: 19, color: C.rose, fontWeight: 700, textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: '0.3em', minHeight: 36, padding: '4px 6px', margin: '-4px -6px',
                        }}
                        onClick={e => e.stopPropagation()}>
                        Abrir <span aria-hidden="true">→</span>
                      </a>
                    )}
                  </div>
                  {/* Un link guardado antes de la validación que no es una dirección
                      web: no se ofrece abrirlo, pero se muestra lo que guardó. */}
                  {!link && typeof item.url === 'string' && item.url.trim() && (
                    <div style={{ fontSize: 17, color: C.muted, marginTop: 6, overflowWrap: 'anywhere' }}>
                      Link guardado (no se puede abrir): {item.url.trim()}
                    </div>
                  )}
                </div>
                <button type="button" aria-label={`Borrar recurso ${item.name}`} onClick={() => pedirBorrarRecurso(item)} style={{
                  background: 'none', border: 'none', fontSize: 20, color: C.subtle, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 44, minHeight: 44, marginTop: -10, marginRight: -10,
                }}>{UI_ICONS.close(C.subtle, 16)}</button>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
          {/* Sin el punto decorativo: el círculo queda solo en el logo (toolkit-20) */}
          <div style={{ fontSize: 19, fontWeight: 600 }}>
            {filtroToolkit === 'todas' ? 'Tu toolkit está vacío' : 'No hay recursos en esta categoría'}
          </div>
          <div style={{ fontSize: 20, marginTop: 4 }}>Agrega tus podcasts, libros, cursos y más</div>
        </div>
      )}
    </div>
  )

  /* ── PERFIL ── */
  const profileStats = {
    // Días con actividad real: algún hábito o paso de la rutina marcado, o
    // una entrada del diario. Abrir la app no cuenta. Hoy sale del estado
    // en memoria (localStorage se escribe después del render).
    daysActive: (() => {
      const dias = new Set(entries.map(e => e.date).filter(Boolean))
      Object.entries(historialPrevio).forEach(([d, data]) => { if (Object.values(data || {}).some(Boolean)) dias.add(d) })
      safeKeys().forEach(k => {
        const d = k.slice('diana-routine-'.length)
        if (k.startsWith('diana-routine-') && d !== diaApp && Object.values(load(k, {})).some(Boolean)) dias.add(d)
      })
      if (Object.values(checked).some(Boolean) || Object.values(routineChecked).some(Boolean)) dias.add(diaApp)
      return dias.size
    })(),
    totalEntries: entries.length,
    // Marcas reales del historial (un hábito, un día), también de hábitos ya
    // borrados: borrar un hábito no borra lo que se cumplió.
    totalHabitsEver: Object.values(monthlyHistory).reduce((s, v) => s + v.done, 0),
    toolkitCount: toolkitItems.length,
  }

  // "Editar perfil" trabaja sobre un borrador: "Guardar" lo guarda y
  // "Cancelar" lo descarta. Antes cada letra se guardaba al escribirla y los
  // dos botones hacían lo mismo (perfil-14).
  const [perfilBorrador, setPerfilBorrador] = useState(null)
  // Confirmación de "Guardar" (se ve y se anuncia un momento).
  const [perfilGuardado, setPerfilGuardado] = useState(false)
  const updateProfile = (field, value) => {
    setPerfilBorrador(prev => ({ ...(prev || profile), [field]: value }))
  }
  // Al guardar la edición del perfil se guarda también en la cuenta, para
  // verlo en otros dispositivos (perfil-3).
  const guardarPerfilEnLaNube = (datos = profile) => {
    if (user && isConfigured && duenaLocal() === user.id) saveUserProfile(user.id, datos)
  }
  const abrirEdicionPerfil = () => {
    setPerfilBorrador({ name: profile.name || '', city: profile.city || '', bio: profile.bio || '', intention: profile.intention || '' })
    setPerfilGuardado(false)
    setEditingProfile(true)
  }
  const cancelarEdicionPerfil = () => {
    setPerfilBorrador(null)
    setEditingProfile(false)
  }
  // Mismo largo máximo del nombre que en la bienvenida (perfil-15).
  const NOMBRE_MAX = 40
  // Al guardar se quitan los espacios de los bordes: un nombre de solo
  // espacios queda vacío y vuelven "Tu nombre" y los saludos sin nombre (perfil-13).
  const guardarPerfil = () => {
    const b = perfilBorrador || profile
    const limpio = {
      name: Array.from((b.name || '').trim()).slice(0, NOMBRE_MAX).join('').trim(),
      city: (b.city || '').trim(),
      bio: (b.bio || '').trim(),
      intention: (b.intention || '').trim(),
    }
    setProfile(prev => ({ ...prev, ...limpio }))
    guardarPerfilEnLaNube({ ...profile, ...limpio })
    setPerfilBorrador(null)
    setEditingProfile(false)
    // El formulario se cierra y la página se acorta: el foco y la vista
    // vuelven a "Editar perfil", con la confirmación al lado.
    setPerfilGuardado(true)
    setTimeout(() => setPerfilGuardado(false), 4000)
    enfocarDespues('perfil-editar', { centrar: true })
  }
  // Lo que muestra la tarjeta: sin espacios en los bordes (perfil-13) y con
  // la primera letra visible o el emoji entero como inicial, no medio emoji (perfil-12).
  const nombrePerfil = (profile.name || '').trim()
  const inicialPerfil = (() => {
    if (!nombrePerfil) return 'R'
    try {
      return new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(nombrePerfil)[Symbol.iterator]().next().value.segment.toUpperCase()
    } catch {
      return Array.from(nombrePerfil)[0].toUpperCase()
    }
  })()

  // Notificaciones: mientras se activan la tarjeta sigue a la vista (perfil-4)
  // y el aviso dice por qué no se activaron, sin culpar siempre al navegador (perfil-29).
  const activandoPush = oneSignal.status === 'loading' || oneSignal.status === 'subscribing'
  const AVISOS_PUSH = {
    denied: { title: 'Notificaciones bloqueadas', body: 'Tu navegador bloqueó las notificaciones de Ronda. Para activarlas, ve a la configuración del sitio en tu navegador.' },
    dismissed: { title: 'Aún no están activas', body: 'Cuando quieras recibirlas, toca "Activar notificaciones" otra vez y acepta el permiso que te pide el navegador.' },
    unsupported: { title: 'No se pudo activar', body: 'Este navegador no permite notificaciones. Si estás en iPhone, instala Ronda en tu pantalla de inicio primero (botón Compartir → Agregar a pantalla de inicio) y actívalas desde ahí.' },
    error: { title: 'No se pudo activar', body: 'No pudimos conectar con el servicio de notificaciones. Revisa tu conexión e inténtalo de nuevo en un momento.' },
  }

  // Miembro fundadora: el texto del acceso sigue su vigencia real (is_premium
  // ya la incluye), no solo que haya una fecha guardada (perfil-10).
  const fundadoraFecha = premiumStatus.premium_source === 'founding_member' && premiumStatus.premium_until
    ? new Date(premiumStatus.premium_until) : null
  const fundadoraFechaTexto = fundadoraFecha
    // premium_until llega como medianoche UTC: en Colombia (UTC-5) sin timeZone
    // se veía un día antes ('2026-03-01T00:00Z' → '28 de febrero').
    ? fundadoraFecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''
  const fundadoraAcceso = !fundadoraFecha ? ''
    : premiumStatus.is_premium ? `Tienes acceso completo incluido hasta el ${fundadoraFechaTexto}.`
      : fundadoraFecha <= new Date() ? `Tu acceso completo incluido terminó el ${fundadoraFechaTexto}.`
        : 'Tu acceso completo incluido ya no está activo.'

  /* ── Board categories ── */
  const BOARD_CATS = [
    { id: 'todas', label: 'Todas', color: '#141833' },
    { id: 'ansiedad', label: 'Ansiedad', color: '#726D2D' },
    { id: 'relaciones', label: 'Relaciones', color: '#592147' },
    { id: 'autoestima', label: 'Autoestima', color: '#592147' },
    { id: 'maternidad', label: 'Maternidad', color: '#592147' },
    { id: 'duelo', label: 'Duelo', color: '#141833' },
    { id: 'emprendimiento', label: 'Emprender', color: '#91946E' },
    { id: 'general', label: 'General', color: '#141833' },
  ]

  /* ── Seed board data (MVP — will be replaced by Supabase) ── */
  /* En orden de la más reciente a la más antigua: así se leen las horas
     (2 h, 3 h, 4 h, 5 h, 8 h, 1 día) (juntas-13). Las respuestas no traen
     autora: abajo todas se atribuyen a la Guía IA de Ronda (GUIA_IA_PRO). */
  const SEED_POSTS = [
    { id: 's1', cat: 'ansiedad', content: 'Llevo 3 noches sin dormir bien. Siento que el pecho me aprieta y no puedo parar de pensar en todo lo que tengo que hacer mañana. ¿Alguien más se siente así?', time: 'Hace 2 horas', hearts: 24,
      replies: [{
        text: 'Muchas mujeres lo han sentido. Desde la cama, tu mente intenta «resolver» todo lo de mañana, y tu cuerpo se pone en alerta. Prueba esto: escribe en un cuaderno TODO lo que te preocupa. Luego ciérralo y dile a tu mente: «Ya está escrito, mañana lo resuelvo». Cuando tu mente sabe que lo tiene guardado, le queda más fácil soltarlo. Si esto sigue por más de 2 semanas, busca el acompañamiento de una profesional. Aquí estoy contigo. 💛' }] },
    { id: 's4', cat: 'relaciones', content: 'Siempre elijo el mismo tipo de persona. Sé que me hace daño pero no puedo dejar de hacerlo. ¿Por qué repito el patrón?', time: 'Hace 3 horas', hearts: 38,
      replies: [{
        text: 'Los patrones en el amor se forman temprano. Buscamos lo «familiar»: lo que se parece a lo que vivimos en casa. Si creciste con un cariño que iba y venía, puedes confundir la intensidad con el amor. El primer paso es ver el patrón, y tú ya lo estás dando. El segundo es conocerlo mejor: escribe qué tienen en común las personas que eliges y cómo te quieres sentir en una relación. Lo que aprendiste se puede reaprender, a tu ritmo. 🌱' }] },
    { id: 's6', cat: 'emprendimiento', content: 'Tengo una idea de negocio pero me da pánico fracasar. Llevo meses paralizada sin dar el primer paso.', time: 'Hace 4 horas', hearts: 29,
      replies: [{
        text: 'El miedo a fracasar suele ser miedo a lo que piensen los demás: lo que más pesa es imaginar que te ven equivocarte. Y aquí va la verdad: la gente está mucho más ocupada en su propia vida de lo que crees. Cada intento, por pequeño que sea, te enseña algo y te acerca a lo que quieres. Empieza con la versión más pequeña de tu idea, con lo que ya tienes: lo importante es que EXISTA.' }] },
    { id: 's2', cat: 'autoestima', content: 'Me separé hace 6 meses y siento que perdí mi identidad. No sé quién soy sin esa relación. Me miro al espejo y no me reconozco.', time: 'Hace 5 horas', hearts: 41,
      replies: [{
        text: 'Lo que sientes es muy común después de una separación. Cuando termina una relación larga, se va la persona y también la versión de ti que vivía en esa relación. Es un duelo y tiene su tiempo. Y aquí está la buena noticia: ahora tienes espacio para descubrir quién eres TÚ. Empieza por algo pequeño: ¿qué te gustaba hacer antes de esa relación? ¿Qué dejaste de hacer? Escríbelo y elige una cosa para volver a hacer esta semana. Ahí empieza el camino de regreso a ti. 🌱' }] },
    { id: 's5', cat: 'duelo', content: 'Perdí a mi mamá hace un año y hay días que siento que el dolor es igual de fuerte que el primer día. ¿Cuándo para esto?', time: 'Hace 8 horas', hearts: 53,
      replies: [{
        text: 'El duelo va en olas y tiene su propio ritmo. Con el tiempo, el dolor cambia de lugar: se queda contigo y aprende a ocupar un espacio más pequeño, al lado de todo el amor que le tienes a tu mamá. Los días fuertes van a seguir llegando (fechas especiales, canciones, olores). Esos días también hacen parte del camino: hablan de lo mucho que la amas. Permítete sentir y trátate con cariño. 💛' }] },
    { id: 's3', cat: 'maternidad', content: 'Amo a mis hijos pero hay días que siento que me perdí a mí misma. No tengo un minuto para mí. ¿Está mal sentirme así?', time: 'Hace 1 día', hearts: 67,
      replies: [{
        text: 'Lo que sientes es válido, y es una de las experiencias más comunes y menos habladas de la maternidad. Muchas mamás lo sienten y se lo guardan. Querer tiempo para ti es humano y también es cuidar a tu familia. Empieza con 15 minutos al día solo para ti, y disfrútalos con la conciencia tranquila. Tu bienestar ES parte del bienestar de tus hijos. 🌿' }] },
  ]

  // Los posts sembrados se muestran como EJEMPLOS y sus respuestas se atribuyen
  // a la Guía IA de Ronda (misma identidad transparente que en vivo), no a
  // profesionales humanas verificadas. Correccion de brand voice (P1.2).
  // Las publicaciones propias van primero: son las más recientes.
  const GUIA_IA_PRO = { name: 'Emilia', title: 'Guía IA de Ronda', verified: false, ai: true }
  const allBoardPosts = [
    ...boardPosts,
    ...SEED_POSTS.map(p => ({
      ...p,
      example: true,
      replies: (p.replies || []).map(r => ({
        ...r,
        pro: GUIA_IA_PRO,
      })),
    })),
  ]
  const filteredBoardPosts = boardFilter === 'todas' ? allBoardPosts : allBoardPosts.filter(p => p.cat === boardFilter)

  // Hora de una publicación: relativa desde createdAt. Las guardadas antes no
  // lo tienen, pero su id es 'u' + Date.now(); los ejemplos traen su texto.
  const horaPost = (post) => {
    const ts = post.createdAt ?? (/^u\d+$/.test(post.id) ? Number(post.id.slice(1)) : null)
    return ts ? formatRelative(ts) : post.time
  }

  // Pide (o vuelve a pedir) la respuesta de la Guía IA para una publicación.
  const requestGuiaReply = async ({ id, content, cat }) => {
    const actualizar = (cambios) => setBoardPosts(prev => prev.map(p => p.id === id ? { ...p, ...cambios } : p))

    // Señal de crisis: se revisa aquí mismo, sin depender del servidor. Se
    // abre Ayuda y se responde con el texto de crisis (el mismo del servidor,
    // con la Línea 106 y el 123) aunque no haya red.
    if (isCrisis(content)) {
      actualizar({ replies: [{ pro: GUIA_IA_PRO, text: CRISIS_TEXT }], awaitingGuia: false, guiaFallo: false })
      abrirAyuda('crisis_comunidad')
      return
    }

    // Sin la autorización de la IA no se envía nada: la publicación queda
    // como estaba y arriba aparece la tarjeta que la pide.
    if (!iaOk) {
      actualizar({ awaitingGuia: false })
      pedirIAComunidad()
      return
    }

    actualizar({ awaitingGuia: true, guiaFallo: false })
    // Antes del corte de 20 s: la espera de la subida no se lo gasta.
    if (!(await iaListaEnNube())) { actualizar({ awaitingGuia: false }); pedirIAComunidad(); return }
    // Pausa breve (se siente considerada), en paralelo con la petición: la
    // respuesta se guarda en cuanto termina, sin un setTimeout suelto después.
    // Es IA: responde rápido, sin fingir ser humana.
    const delaySec = 2 + Math.floor(Math.random() * 3)
    const control = new AbortController()
    const corte = setTimeout(() => control.abort(), 20000)
    try {
      const pedir = apiFetch('/api/guia', {
        method: 'POST',
        body: JSON.stringify({ content, cat }),
        signal: control.signal,
      }).then(async resp => {
        // 403 de la IA sin autorizar (la quitó en otro teléfono): además del
        // aviso de siempre, se revisan sus autorizaciones.
        if (!resp.ok) { await iaRechazadaEnServidor(resp); throw new Error(`HTTP ${resp.status}`) }
        const data = await resp.json()
        if (data.error || !data.reply) throw new Error(data.error || 'Sin respuesta')
        return data
      })
      const [data] = await Promise.all([pedir, new Promise(r => setTimeout(r, delaySec * 1000))])
      actualizar({ replies: [data.reply], awaitingGuia: false, guiaFallo: false })
      // Señal de crisis del servidor (por si el texto se le escapó al chequeo de aquí).
      if (data.crisis) abrirAyuda('crisis_comunidad')
    } catch {
      // Sin respuesta (también el 403 de Ronda+ cuando el perfil no se pudo
      // leer): la publicación queda guardada, se puede reintentar y el aviso
      // deja a la vista Ayuda, la Línea 106 y el 123 (SalidaAyuda).
      actualizar({ awaitingGuia: false, guiaFallo: true })
      // Sin la categoría: dice de qué habla (ansiedad, duelo…).
      track('community_guia_failed')
    } finally {
      clearTimeout(corte)
    }
  }

  // La tarjeta de la autorización de la IA, en la misma pantalla, donde
  // va el botón para escribir (textos-autorizacion-v1, c).
  const pedirIAComunidad = () => {
    setPidiendoIA(true)
    requestAnimationFrame(() => traerALaVista(document.getElementById('ia-comunidad')))
  }

  const avisoPagoComunidad = () => {
    track('paywall_viewed', { feature: 'comunidad_escribir', price: PLAN_PRECIO })
    setAppModal({
      type: 'paywall',
      title: `Escribir en la Comunidad es parte de ${PLAN_PAGO}`,
      body: 'Publica preguntas anónimas y recibe la respuesta de la Guía IA de Ronda.',
      cta: 'Ver planes',
      // Lo que escribió puede ser una crisis dicha de una forma que isCrisis
      // no reconoce, y sin Ronda+ no la lee el modelo: Ayuda y las líneas
      // quedan a la vista en el aviso.
      ayuda: true,
    })
  }

  const addBoardPost = async () => {
    if (!boardNewText.trim()) return
    // Sin Ronda+ no se publica, pero una señal de crisis abre Ayuda (con la
    // Línea 106) en vez del aviso de pago: la ayuda nunca queda detrás del
    // paywall.
    if (!isPremium) {
      if (isCrisis(boardNewText)) abrirAyuda('crisis_comunidad')
      else avisoPagoComunidad()
      return
    }
    // Lo mismo sin la autorización de la IA (la Guía IA lee lo que publica):
    // la crisis abre Ayuda aquí mismo; si no, la tarjeta. Lo escrito se queda.
    if (!iaOk) {
      if (isCrisis(boardNewText)) abrirAyuda('crisis_comunidad')
      else pedirIAComunidad()
      return
    }
    showFoundingPerk('board', 'Comunidad y Guía IA de Ronda')
    const createdAt = Date.now()
    const newPost = {
      id: `u${createdAt}`,
      cat: boardNewCat,
      // Recorte por si un pegado se salta el maxLength del campo.
      content: boardNewText.trim().slice(0, BOARD_MAX),
      createdAt,
      hearts: 0,
      replies: [],
      awaitingGuia: true,  // mostrar "La Guía IA está leyendo tu mensaje"
    }
    setBoardPosts(prev => [newPost, ...prev])
    setBoardNewText('')
    setBoardShowForm(false)
    enfocarDespues('board-nueva')
    // Que la usuaria vea lo que acaba de publicar: si el filtro activo es de
    // otra categoría la publicación quedaría oculta, y en móvil cae debajo
    // del borde de la pantalla (juntas-2).
    if (boardFilter !== 'todas' && boardFilter !== newPost.cat) setBoardFilter('todas')
    requestAnimationFrame(() => document.getElementById(`post-${newPost.id}`)?.scrollIntoView({ block: 'nearest' }))
    // Solo la señal: ni el contenido ni la categoría (dice de qué habla).
    track('community_post_created')

    requestGuiaReply(newPost)
  }

  const toggleBoardHeart = (postId) => {
    setBoardHearts(prev => ({ ...prev, [postId]: !prev[postId] }))
  }
  // "1 te acompaña", "24 te acompañan" (juntas-15).
  const textoAcompanan = (post) => {
    const n = (post.hearts || 0) + (boardHearts[post.id] ? 1 : 0)
    return n === 1 ? '1 te acompaña' : `${n} te acompañan`
  }

  // Borrar una publicación propia (juntas-9). Hoy viven solo en este
  // dispositivo; si la Guía IA aún estaba respondiendo, su respuesta busca
  // la publicación por id y ya no encuentra nada.
  const removeBoardPost = (postId) => {
    setBoardPosts(prev => prev.filter(p => p.id !== postId))
    setBoardHearts(prev => {
      if (!(postId in prev)) return prev
      const sinEsta = { ...prev }
      delete sinEsta[postId]
      return sinEsta
    })
    track('community_post_deleted')
  }
  const pedirBorrarPublicacion = (post) => setAppModal({
    type: 'confirm',
    title: '¿Borrar tu publicación?',
    body: 'Se borra de este dispositivo y después no la podrás recuperar.',
    cta: 'Borrar publicación',
    onConfirm: () => {
      removeBoardPost(post.id)
      // El botón "Borrar" se fue con la publicación: el foco pasa a escribir una nueva.
      focoTrasModalRef.current = () => document.getElementById('board-nueva') || document.getElementById('board-texto')
    },
  })

  /* ── Board View ── */
  const boardView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Comunidad Ronda
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: FONT, lineHeight: 1.3 }}>
          Pregunta, crece, avanza.
        </div>
        <div style={{ fontSize: 19, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
          Tú eres anónima. Te acompaña la Guía IA de Ronda, al instante.
        </div>
        <div style={{ fontSize: 12, color: C.subtle, marginTop: 6, lineHeight: 1.4, fontStyle: 'italic' }}>
          Contenido educativo de bienestar. Para tu salud mental, cuenta también con una profesional.
        </div>
      </div>

      {/* Category filters */}
      <div role="group" aria-label="Filtrar por categoría" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {BOARD_CATS.map(cat => (
          <button key={cat.id} type="button" aria-pressed={boardFilter === cat.id} onClick={() => setBoardFilter(cat.id)} style={{
            padding: '6px 14px', borderRadius: 20, border: boardFilter === cat.id ? 'none' : `1.5px solid ${C.border}`, cursor: 'pointer',
            background: boardFilter === cat.id ? cat.color : C.card,
            color: boardFilter === cat.id ? 'white' : C.text,
            fontSize: 20, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
            boxShadow: boardFilter === cat.id ? `0 2px 8px ${cat.color}40` : 'none',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ flexShrink: 0, display: 'flex' }}>{ICONS['cat_'+cat.id] ? ICONS['cat_'+cat.id](boardFilter === cat.id ? 'white' : cat.color, 16) : <span style={{ width: 8, height: 8, borderRadius: '50%', background: boardFilter === cat.id ? 'white' : cat.color }} />}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* New post button. Con Ronda+ y sin la autorización de la IA, en su
          lugar va la tarjeta que la pide (la Guía IA lee lo que publica). */}
      {pidiendoIA ? (
        <TarjetaIA idBase="ia-comunidad"
          onAutorizar={() => {
            responderAutorizacion({ ia: true }, 'al-usar')
            setPidiendoIA(false)
            setBoardShowForm(true)
            enfocarDespues('board-texto', { centrar: true })
          }}
          onAhoraNo={() => { setPidiendoIA(false); enfocarDespues(boardShowForm ? 'board-texto' : 'board-nueva') }}
          onAyuda={() => abrirAyuda('crisis_tarjeta_ia')} />
      ) : !boardShowForm ? (
        <button id="board-nueva" onClick={() => {
          if (isPremium && !iaOk) { pedirIAComunidad(); return }
          setBoardShowForm(true); enfocarDespues('board-texto', { centrar: true })
        }} style={{
          padding: '14px 18px', borderRadius: 16, border: `2px dashed ${C.roseLight}`,
          background: C.card, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}>
          <div style={{ fontSize: 20, color: C.muted }}>¿Qué necesitas hoy? Escribe aquí...</div>
          <div style={{ fontSize: 19, color: C.subtle, marginTop: 4 }}>Tu publicación es anónima. Te responde la Guía IA de Ronda.</div>
        </button>
      ) : (
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${C.roseLight}` }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.roseDark, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            🔒 Publicación anónima
          </div>
          {/* Category selector */}
          <div role="group" aria-label="Categoría de tu publicación" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {BOARD_CATS.filter(c => c.id !== 'todas').map(cat => (
              <button key={cat.id} type="button" aria-pressed={boardNewCat === cat.id} onClick={() => setBoardNewCat(cat.id)} style={{
                padding: '4px 10px', borderRadius: 12, border: boardNewCat === cat.id ? 'none' : `1px solid ${C.border}`, cursor: 'pointer',
                background: boardNewCat === cat.id ? cat.color : C.card,
                color: boardNewCat === cat.id ? 'white' : C.muted,
                fontSize: 19, fontWeight: 600, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ flexShrink: 0, display: 'flex' }}>{ICONS['cat_'+cat.id] ? ICONS['cat_'+cat.id](boardNewCat === cat.id ? 'white' : cat.color, 14) : <span style={{ width: 6, height: 6, borderRadius: '50%', background: boardNewCat === cat.id ? 'white' : cat.color }} />}</span>
                {cat.label}
              </button>
            ))}
          </div>
          <textarea
            id="board-texto"
            value={boardNewText}
            onChange={e => setBoardNewText(e.target.value)}
            placeholder="Escribe lo que sientes, lo que te preocupa, lo que necesitas saber. Este es tu espacio seguro."
            rows={4}
            maxLength={BOARD_MAX}
            aria-label="Tu publicación anónima"
            aria-describedby="board-contador board-aviso"
            style={{
              width: '100%', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14,
              fontSize: 20, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
              lineHeight: 1.6, background: C.cream, color: C.text, boxSizing: 'border-box',
            }}
          />
          <div id="board-contador" style={{ fontSize: 14, color: C.subtle, textAlign: 'right', marginTop: 4 }}>
            {boardNewText.length}/{BOARD_MAX}
          </div>
          {/* Aviso honesto: aún no hay comunidad en el servidor (ver juntas-1). */}
          <div id="board-aviso" style={{ fontSize: 15, color: C.muted, lineHeight: 1.5, marginTop: 6 }}>
            Por ahora tu publicación se guarda solo en este dispositivo y te responde la Guía IA de Ronda.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={() => { setBoardShowForm(false); enfocarDespues('board-nueva') }} style={{
              flex: 1, padding: '10px 16px', borderRadius: 12, border: `1px solid ${C.border}`,
              background: 'none', color: C.muted, fontSize: 20, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancelar</button>
            {/* Vacío: deshabilitado de verdad y con texto legible (juntas-19) */}
            <button type="button" onClick={addBoardPost} disabled={!boardNewText.trim()} style={{
              flex: 1, padding: '10px 16px', borderRadius: 12, border: 'none',
              background: boardNewText.trim() ? C.rose : C.border,
              color: boardNewText.trim() ? 'white' : C.muted,
              fontSize: 20, fontWeight: 700, cursor: boardNewText.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            }}>Publicar</button>
          </div>
        </div>
      )}

      {avisoFundadora('board')}

      {/* Categoría sin publicaciones: se dice, no se deja la lista en blanco (juntas-14) */}
      {filteredBoardPosts.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 24, background: C.card, borderRadius: 16,
          border: `1.5px dashed ${C.border}`,
        }}>
          <div style={{ fontSize: 19, color: C.muted, lineHeight: 1.5 }}>
            Aún no hay publicaciones en {(BOARD_CATS.find(c => c.id === boardFilter) || {}).label}. Puedes escribir la primera aquí arriba.
          </div>
          <button type="button" onClick={() => setBoardFilter('todas')} style={{
            marginTop: 12, minHeight: 44, padding: '0 20px', borderRadius: 12,
            border: `1px solid ${C.border}`, background: 'none', color: C.rose,
            fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Ver todas</button>
        </div>
      )}

      {/* Posts */}
      {filteredBoardPosts.map(post => (
        <div key={post.id} id={`post-${post.id}`} style={{
          background: C.card, borderRadius: 16, padding: 18,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: `1px solid ${C.border}`,
          // Al publicar se baja hasta aquí: que no quede bajo el encabezado ni el menú.
          scrollMarginTop: 140, scrollMarginBottom: 84,
        }}>
          {/* Post header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: C.cream,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>🔒</div>
              <div>
                <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>Anónima</div>
                <div style={{ fontSize: 19, color: C.subtle }}>{horaPost(post)}</div>
              </div>
            </div>
            <span style={{
              padding: '3px 10px', borderRadius: 10, fontSize: 19, fontWeight: 600,
              background: `${C.rose}15`, color: C.roseDark,
              display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
            }}>
              {ICONS['cat_'+post.cat] ? ICONS['cat_'+post.cat]((BOARD_CATS.find(c => c.id === post.cat) || {}).color, 14) : null}
              {(BOARD_CATS.find(c => c.id === post.cat) || {}).label}
            </span>
          </div>

          {/* Etiqueta de ejemplo (contenido sembrado, no comunidad real) */}
          {post.example && (
            <Badge variant="example" style={{ marginBottom: 10 }}>Ejemplo · así funciona la Comunidad</Badge>
          )}

          {/* Post content */}
          <div style={{ fontSize: 20, color: C.text, lineHeight: 1.7, marginBottom: 12 }}>
            {post.content}
          </div>

          {/* Hearts (y Borrar en las publicaciones propias) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <button type="button" onClick={() => toggleBoardHeart(post.id)}
              aria-pressed={!!boardHearts[post.id]} aria-label={`Acompañar esta publicación. ${textoAcompanan(post)}`} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              borderRadius: 20, border: `1px solid ${boardHearts[post.id] ? C.rose : C.border}`,
              background: boardHearts[post.id] ? `${C.rose}12` : 'none',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {/* Marcado: corazón lleno; antes quedaba vacío (juntas-8) */}
              <span aria-hidden="true" style={{ fontSize: 14 }}>{boardHearts[post.id] ? '💜' : '🤍'}</span>
              <span style={{ fontSize: 20, fontWeight: 600, color: boardHearts[post.id] ? C.roseDark : C.muted }}>
                {textoAcompanan(post)}
              </span>
            </button>
            {!post.example && (
              <button type="button" onClick={() => pedirBorrarPublicacion(post)} aria-label="Borrar mi publicación" style={{
                minHeight: 44, padding: '0 8px', marginRight: -8, background: 'none', border: 'none',
                color: C.muted, fontSize: 17, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                flexShrink: 0,
              }}>Borrar</button>
            )}
          </div>

          {/* "Una guía está respondiendo" indicator while waiting */}
          {post.awaitingGuia && (!post.replies || post.replies.length === 0) && (
            <div style={{
              marginTop: 14, padding: 14, borderRadius: 14,
              background: `${C.teal}08`, border: `1px dashed ${C.teal}40`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: C.teal, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 14, fontWeight: 700,
              }}>{UI_ICONS.check('white', 16)}</div>
              <div style={{ fontSize: 17, color: C.muted, fontStyle: 'italic' }}>
                La Guía IA de Ronda está leyendo tu mensaje. Te responde en un momento.
              </div>
            </div>
          )}

          {/* La Guía IA no respondió (error, sin red o recarga a mitad de camino) */}
          {post.guiaFallo && !post.awaitingGuia && (!post.replies || post.replies.length === 0) && (
            <div role="status" style={{
              marginTop: 14, padding: 14, borderRadius: 14,
              background: C.cream, border: `1px dashed ${C.contorno}`,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
            }}>
              <div style={{ fontSize: 17, color: C.text, lineHeight: 1.5 }}>
                {/* Si el dispositivo no dejó guardar, no se dice que quedó guardada. */}
                {seGuardo('ronda-board')
                  ? 'La Guía IA tuvo un problema para responder. Tu publicación quedó guardada.'
                  : 'La Guía IA tuvo un problema para responder. Este dispositivo también tuvo un problema para guardar tu publicación: la ves aquí mientras tengas Ronda abierta.'}
              </div>
              {/* Sin respuesta tampoco hay segunda capa (el modelo) que vea una
                  crisis dicha de otra forma: Ayuda y las líneas quedan a la
                  vista, como en el chat cuando no se conecta. */}
              <SalidaAyuda style={{ alignSelf: 'stretch' }} onAbrir={() => abrirAyuda('crisis_guia_fallo')} />
              {/* Pedir la respuesta es parte de Ronda+, igual que publicar.
                  Con una señal de crisis, requestGuiaReply abre Ayuda y deja
                  el texto de crisis sin llamar al servidor: también sin Ronda+. */}
              <button type="button" onClick={() => (isPremium || isCrisis(post.content) ? requestGuiaReply(post) : avisoPagoComunidad())} style={{
                minHeight: 44, padding: '0 20px', borderRadius: 12, border: 'none',
                background: C.rose, color: 'white', fontSize: 17, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Reintentar</button>
            </div>
          )}

          {/* Professional replies */}
          {post.replies && post.replies.length > 0 && post.replies.map((reply, ri) => (
            <div key={ri} style={{
              marginTop: 14, padding: 16, borderRadius: 14,
              background: 'linear-gradient(135deg, #EEF3F9, #F3EAF540)',
              border: `1px solid ${C.roseLight}`,
            }}>
              {/* Professional header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: `${C.teal}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 20, fontWeight: 700,
                }}>{reply.pro.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{reply.pro.name}</span>
                    {reply.pro.verified && !post.example && <Badge variant="verified">✓ Verificada</Badge>}
                    {reply.pro.ai && <Badge variant="ai">Guía IA</Badge>}
                  </div>
                  <div style={{ fontSize: 19, color: C.muted }}>{reply.pro.title}</div>
                </div>
              </div>
              {/* Reply content */}
              <div style={{ fontSize: 19, color: C.text, lineHeight: 1.7 }}>
                {reply.text}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Bottom CTA */}
      <div style={{
        textAlign: 'center', padding: 24, background: C.card, borderRadius: 16,
        border: `1px solid ${C.roseLight}`,
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          ¿Eres profesional del bienestar, instructora o terapeuta?
        </div>
        <div style={{ fontSize: 20, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          Únete como Guía Ronda verificada y acompaña a mujeres en su camino.
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.rose }}>
          Escríbenos → <a href="mailto:hola@rondahub.com" style={{ color: 'inherit', textDecoration: 'underline', display: 'inline-block', padding: '10px 0' }}>hola@rondahub.com</a>
        </div>
      </div>
    </div>
  )

  /* ── Directorio / Marketplace ── */
  const directorioView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Acompañamiento
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: FONT, lineHeight: 1.3 }}>
          Mujeres que te acompañan en el camino
        </div>
      </div>

      {/* Coming soon */}
      <div style={{
        textAlign: 'center', padding: 48, background: C.card, borderRadius: 20,
        border: `1.5px dashed ${C.border}`,
      }}>
        <div style={{ fontSize: 40, marginBottom: 12, color: C.teal, opacity: 0.3 }}>●</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: FONT, marginBottom: 8 }}>
          Próximamente
        </div>
        <div style={{ fontSize: 18, color: C.muted, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          Estamos armando un directorio de profesionales. Todavía no está disponible.
        </div>
        <div style={{ fontSize: 15, color: C.teal, fontWeight: 600, marginTop: 16 }}>
          {/* Sin Ronda+ no se puede publicar: no prometer que puede preguntar. */}
          {isPremium
            ? 'Mientras tanto, pregunta lo que quieras en la Comunidad: te responde la Guía IA de Ronda.'
            : 'Mientras tanto, lee en la Comunidad cómo acompaña la Guía IA de Ronda.'}
        </div>
      </div>

      {/* CTA to register as professional */}
      <div style={{
        textAlign: 'center', padding: 24, background: C.card, borderRadius: 16,
        border: `1px solid ${C.roseLight}`,
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          ¿Eres instructora, terapeuta o profesional del bienestar?
        </div>
        <div style={{ fontSize: 20, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          Estamos buscando Guías Ronda verificadas. Escríbenos.
        </div>
        <a href="mailto:hola@rondahub.com" style={{ display: 'inline-block', padding: '10px 0', fontSize: 19, fontWeight: 700, color: C.rose, textDecoration: 'underline' }}>
          hola@rondahub.com
        </a>
      </div>
    </div>
  )

  /* ── AI Agent: Generate custom program ── */
  // Paso 1 → 2: la meta se revisa al confirmarla. Con una señal de crisis se
  // abre Ayuda ahí mismo y el paso 2 muestra el texto de crisis, sin esperar
  // a "Crear mi programa" (que vuelve a revisar la meta y el contexto).
  const confirmarMeta = (meta) => {
    const crisis = isCrisis(meta)
    setAiGoal(meta)
    setAiError('')
    setAiCrisis(crisis)
    setAiStep(1)
    if (crisis) abrirAyuda('crisis_programa')
  }

  const generateAiProgram = async () => {
    // Señal de crisis en la meta o en lo que contó: no se arma un programa.
    // Como en el chat y en la Comunidad, se atiende aquí mismo, sin depender
    // del servidor ni de la red: se abre Ayuda y queda el texto de crisis con
    // la Línea 106 y el 123.
    if (isCrisis(aiGoal) || isCrisis(aiContext)) {
      setAiError('')
      setAiCrisis(true)
      setAiStep(1)
      abrirAyuda('crisis_programa')
      return
    }
    // Sin la autorización de la IA no se envía nada (Pregúntale muestra la tarjeta).
    if (!iaOk) return
    setAiCrisis(false)
    setAiStep(3)
    setAiError('')
    if (!(await iaListaEnNube())) { setAiStep(1); return }
    try {
      const resp = await apiFetch('/api/generate-program', {
        method: 'POST',
        body: JSON.stringify({ goal: aiGoal, context: aiContext }),
      })
      if (!resp.ok) { await iaRechazadaEnServidor(resp); throw new Error(`HTTP ${resp.status}`) }
      const data = await resp.json().catch(() => null)
      // Señal de crisis del servidor (por si el texto se le escapó al chequeo de aquí).
      if (data?.crisis) {
        setAiCrisis(true)
        setAiStep(1)
        abrirAyuda('crisis_programa')
        return
      }
      if (!data || data.error || !Array.isArray(data.program?.days) || !data.program.days.length) {
        throw new Error(data?.error || 'Sin programa')
      }
      setAiProgram(data.program)
      setAiStep(4)
    } catch (err) {
      // El detalle técnico queda en la consola; a la usuaria, un texto claro.
      console.error('generate-program', err)
      setAiError('Algo falló al crear tu programa. Inténtalo de nuevo en un momento.')
      // Vuelve al paso de contexto: conserva la meta y deja reintentar.
      setAiStep(1)
    }
  }

  const saveAiProgram = () => {
    if (!aiProgram) return
    const id = 'custom_' + Date.now()
    const prog = normalizarPrograma({ ...aiProgram, id, color: '#592147', custom: true })
    // Se guarda en el catálogo (diana-custom-programs) y queda empezado en Rutas.
    setCustomPrograms(prev => [...prev, prog])
    startProgram(id)
    setAiSaved(true)
  }

  const resetAiAgent = () => {
    setAiGoal(''); setAiContext(''); setAiStep(0); setAiProgram(null); setAiError(''); setAiCrisis(false); setAiSaved(false)
  }

  const sendChatMessage = async () => {
    const msg = chatInput.trim()
    // Sin la autorización de la IA no se envía nada (Pregúntale muestra la tarjeta).
    if (!msg || chatLoading || !iaOk) return
    const userMsg = { role: 'user', text: msg }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)
    // Sin texto del mensaje: solo la señal de uso, nunca el contenido.
    track('chat_message_sent', { mode: chatMode, turn: chatMessages.length })

    // Señal de crisis: se atiende aquí mismo, sin depender del servidor ni de
    // la red. Respuesta fija con la Línea 106 y el 123, y se abre Ayuda.
    if (isCrisis(msg)) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: CRISIS_TEXT_CHAT, sos: true, connect: null }])
      setChatLoading(false)
      abrirAyuda('crisis_chat')
      return
    }

    // Su «sí» recién dado tiene que estar en la nube antes de enviar. Si
    // perdió con un «no» de otro teléfono, el mensaje vuelve al cuadro y
    // aparece la tarjeta de la IA.
    if (!(await iaListaEnNube())) {
      setChatLoading(false)
      setChatMessages(prev => prev.filter(m => m !== userMsg))
      setChatInput(msg)
      return
    }

    // ── Build rich context from user state ──
    const todayChecked = Object.values(checked).filter(Boolean).length
    const totalHabits = habits.length

    // El ánimo de los últimos 7 días (hoy y los 6 anteriores), como dicen la
    // casilla de la IA y la política: solo entradas con un ánimo elegido
    // (0 = Difícil cuenta). La intención de la mañana no lleva ánimo. Se
    // envía como texto ('0.0' no es falsy).
    const desde7Dias = dateKey(-6)
    const conAnimo = entries.filter(e => typeof e.mood === 'number' && e.type !== 'morning' && typeof e.date === 'string' && e.date >= desde7Dias)
    const avgMood = conAnimo.length > 0
      ? (conAnimo.reduce((s, e) => s + e.mood, 0) / conAnimo.length).toFixed(1)
      : null
    // La última entrada del diario, como dicen la casilla de la IA y la
    // política: los check-ins de la mañana y de la noche se quedan fuera (sus
    // primeros 200 caracteres, abajo).
    const lastJournalNote = ultimaEntradaDiario(entries)

    // Rutas activas, con el día en que va cada una (las creadas con la IA incluidas).
    const rutasEnCurso = Object.entries(activePrograms).map(([id, p]) => {
      const prog = todosLosProgramas.find(x => x.id === id)
      if (!prog || !prog.days?.length) return null
      const hechos = p?.completedDays || []
      const siguiente = prog.days.find(d => !hechos.includes(d.day))
      return siguiente
        ? `${prog.title} (día ${siguiente.day} de ${prog.days.length})`
        : `${prog.title} (completada)`
    }).filter(Boolean)

    const ctx = {
      name: nombrePerfil || 'Usuaria',
      city: profile.city || null,
      intention: profile.intention || null,
      habitsToday: `${todayChecked}/${totalHabits}`,
      avgMood7d: avgMood,                    // 0-4 promedio últimos 7 días
      lastJournalNote: lastJournalNote ? lastJournalNote.slice(0, 200) : null,
      programActive: rutasEnCurso.length ? rutasEnCurso.join('; ') : null,
    }

    // Send history for multi-turn conversation (sin los mensajes de la app:
    // el saludo, los avisos y los errores no los escribió el modelo)
    const recentHistory = chatMessages
      .filter(m => !m.local && !m.isProgram && m.text)
      .slice(-8)
      .map(m => ({ role: m.role, text: m.text }))

    try {
      const resp = await apiFetch('/api/agent', {
        method: 'POST',
        body: JSON.stringify({
          message: msg,
          context: ctx,
          history: recentHistory,
          memory: memory,       // 🧠 Memoria persistente
        }),
      })
      if (!resp.ok) { await iaRechazadaEnServidor(resp); throw new Error(`HTTP ${resp.status}`) }
      const data = await resp.json().catch(() => null)
      if (!data || data.error) throw new Error(data?.error || 'Respuesta vacía')

      // Por si alguna etiqueta se le escapó al servidor, no se muestra.
      const replyText = (typeof data.reply === 'string' ? data.reply : '')
        .replace(/\[CONECTAR:[^\]\n]*\]/giu, '').replace(/\[SOS\]/gi, '').replace(/\[CRISIS\]/gi, '').trim()
      // Sin texto ni botones no hay burbuja (el aviso del programa va aparte).
      if (replyText || data.connect || data.sos) {
        setChatMessages(prev => [...prev, { role: 'assistant', text: replyText, connect: data.connect || null, sos: data.sos || false }])
      }
      // Señal de crisis del servidor (por si el texto se le escapó al chequeo de aquí).
      if (data.crisis) abrirAyuda('crisis_chat')

      // If AI returned a program, save it for the create flow: queda en el
      // paso del resultado, listo para verlo y guardarlo en "Crea tu programa".
      if (Array.isArray(data.program?.days) && data.program.days.length) {
        setAiProgram(data.program)
        setAiStep(4); setAiSaved(false); setAiError('')
        setChatMessages(prev => [...prev, { role: 'assistant', text: '¡Te armé un programa! Cambia a "Crea tu programa" arriba para verlo y guardarlo.', isProgram: true, local: true }])
      }

      // 🧠 Memoria: lo nuevo se suma a lo que ya sabía (no lo reemplaza).
      // El contador sube una vez por conversación, no por mensaje.
      const sumarConversacion = chatSesionContadaRef.current ? 0 : 1
      chatSesionContadaRef.current = true
      const upd = data.memoryUpdate && typeof data.memoryUpdate === 'object' ? data.memoryUpdate : null
      if (upd || sumarConversacion) {
        setMemory(prev => ({
          ...prev,
          ...(upd ? {
            facts: unirMemoria(prev.facts, upd.facts, 30),
            patterns: unirMemoria(prev.patterns, upd.patterns, 20),
            preferences: { ...prev.preferences, ...(upd.preferences && typeof upd.preferences === 'object' ? upd.preferences : {}) },
            summary: typeof upd.summary === 'string' && upd.summary.trim() ? upd.summary.trim() : prev.summary,
            lastUpdated: new Date().toISOString(),
          } : {}),
          conversationCount: (prev.conversationCount || 0) + sumarConversacion,
        }))
      }
    } catch (err) {
      console.error('agent', err)
      // Sin conexión: el aviso siempre deja a mano Ayuda y las líneas.
      setChatMessages(prev => [...prev, { role: 'assistant', text: CHAT_ERROR_TEXT, sos: true, local: true }])
    }
    setChatLoading(false)
  }

  // El directorio de profesionales aún no existe: lo que Tu Ronda sugiere con
  // [CONECTAR:categoria] es preguntar en la Comunidad (anónima), con el
  // formulario abierto en esa categoría.
  const preguntarEnComunidad = (cat) => {
    openModule('juntas', 'board')
    setBoardNewCat(BOARD_CATS.some(c => c.id === cat && c.id !== 'todas') ? cat : 'general')
    setBoardShowForm(true)
    // Después del salto arriba de la sección nueva (el efecto de view/subTab):
    // el campo queda a la vista (no bajo el borde) y listo para escribir.
    setTimeout(() => {
      const campo = document.getElementById('board-texto')
      campo?.focus({ preventScroll: true })
      campo?.scrollIntoView({ block: 'center', behavior: 'instant' })
    }, 0)
  }

  // "Crea tu programa": tras un error, los botones para reintentar; tras
  // guardar, la confirmación. En el celular quedaban bajo el borde del
  // contenedor y había que desplazarse para verlos.
  const aiAccionesRef = useRef(null)
  const aiGuardadoRef = useRef(null)
  useEffect(() => {
    if ((aiError || aiCrisis) && aiStep === 1) aiAccionesRef.current?.scrollIntoView({ block: 'nearest' })
  }, [aiError, aiCrisis, aiStep])
  useEffect(() => {
    if (aiSaved) aiGuardadoRef.current?.scrollIntoView({ block: 'nearest' })
  }, [aiSaved])

  // La conversación baja al final solo cuando llega un mensaje, aparece o se
  // va el "escribiendo…" o se abre el chat. Escuchar o escribir no mueven la lectura.
  const chatRef = useRef(null)
  const chatAbierto = view === 'ahora' && subTab === 'ai' && isPremium && iaOk && chatMode === 'chat'
  // Con solo el saludo, se ve desde su primera línea (con el aviso de
  // fundadora abierto el espacio no alcanza para todo el saludo).
  useEffect(() => {
    const el = chatRef.current
    if (el) el.scrollTop = chatMessages.length > 1 || chatLoading ? el.scrollHeight : 0
  }, [chatMessages.length, chatLoading, chatAbierto])

  // El chat cabe en la pantalla sin que la página se desplace: arriba el
  // encabezado (124) y el margen de la hoja; abajo el aviso legal (32 + ~86
  // en móvil, ~50 en escritorio) y el espacio de la barra inferior (110).
  const aiAgentView = (
    <div style={{ display: 'flex', flexDirection: 'column', height: `calc(100dvh - env(safe-area-inset-top, 0px) - ${isMobile ? 376 : 344}px)`, minHeight: 280, maxHeight: 600 }}>
      {avisoFundadora('chat')}
      {/* Mode toggle */}
      <div role="group" aria-label="Modo de Tu Ronda" style={{ display: 'flex', gap: 0, marginBottom: 12, background: C.card, borderRadius: 14, padding: 3, border: `1px solid ${C.border}` }}>
        {[{ id: 'chat', label: 'Habla conmigo' }, { id: 'create', label: 'Crea tu programa' }].map(m => (
          <button key={m.id} type="button" aria-pressed={chatMode === m.id} onClick={() => { if (m.id !== 'chat') stopSpeech(); setChatMode(m.id) }} style={{
            flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: chatMode === m.id ? C.teal : 'transparent',
            color: chatMode === m.id ? 'white' : C.muted,
            fontSize: 18, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s',
          }}>{m.label}</button>
        ))}
      </div>

      {/* ── CHAT MODE ── */}
      {chatMode === 'chat' && <>
        {/* La conversación se guarda en este dispositivo: se puede empezar de cero. */}
        {chatMessages.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6, marginBottom: 4 }}>
            <button type="button" onClick={() => setAppModal({
              type: 'confirm',
              title: '¿Empezar una conversación nueva?',
              body: 'Esta conversación se borra de este dispositivo. Lo que Tu Ronda sabe de ti se queda.',
              cta: 'Empezar de nuevo',
              onConfirm: () => {
                stopSpeech()
                setChatMessages([CHAT_GREETING])
                chatSesionContadaRef.current = false
              },
            })} style={{
              minHeight: 32, padding: '0 4px', background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, fontSize: 15, fontWeight: 600, fontFamily: 'inherit', textDecoration: 'underline',
            }}>Nueva conversación</button>
          </div>
        )}
        {/* Messages */}
        <div ref={chatRef}
          style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
          {chatMessages.map((msg, i) => (msg.role === 'assistant' && !msg.text && !msg.connect && !msg.sos) ? null : (
            <div key={i} style={{
              display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '82%', padding: '12px 16px', borderRadius: 18,
                background: msg.role === 'user' ? C.teal : C.card,
                color: msg.role === 'user' ? 'white' : C.text,
                fontSize: 19, lineHeight: 1.6, fontFamily: 'inherit',
                borderBottomRightRadius: msg.role === 'user' ? 4 : 18,
                borderBottomLeftRadius: msg.role === 'user' ? 18 : 4,
                boxShadow: msg.role === 'user' ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
                border: msg.role === 'user' ? 'none' : `1px solid ${C.border}`,
              }}>
                {msg.role === 'assistant' && (
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.rose, marginBottom: 4 }}>Tu Ronda</div>
                )}
                {/* Los párrafos y las listas de la respuesta conservan sus saltos de línea. */}
                {msg.text && <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{msg.text}</div>}
                {/* Escuchar la respuesta en voz. En crisis la voz va más pausada. */}
                {msg.role === 'assistant' && voiceAvailable && msg.text && !msg.isProgram && (
                  <button
                    onClick={async () => { if (await iaListaEnNube()) speak(msg.text, { id: i, tone: msg.sos ? 'sos' : 'chat' }) }}
                    aria-label={speechErrorId === i ? 'No pude reproducir la voz ahora. Toca para intentar de nuevo' : speakingId === i ? 'Silenciar' : 'Escuchar esta respuesta'}
                    style={{
                      marginTop: 10, padding: '5px 12px 5px 6px', borderRadius: 20,
                      border: `1px solid ${C.roseLight}`, cursor: 'pointer',
                      background: 'transparent', color: C.rose,
                      fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 7,
                    }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: `2px solid ${C.rose}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: speechLoadingId === i ? 0.45 : 1,
                      animation: speakingId === i ? 'chatDot 1.2s ease-in-out infinite' : 'none',
                    }}>
                      <div style={{
                        width: speakingId === i ? 7 : 6,
                        height: speakingId === i ? 7 : 6,
                        borderRadius: speakingId === i ? 2 : '50%',
                        background: C.rose,
                      }} />
                    </div>
                    {speechErrorId === i ? 'No pude reproducir la voz ahora' : speechLoadingId === i ? 'Un momento…' : speakingId === i ? 'Silenciar' : 'Escuchar'}
                  </button>
                )}
                {/* Action buttons: Connect with professional / SOS */}
                {msg.connect && (
                  <button onClick={() => preguntarEnComunidad(msg.connect)} style={{
                    marginTop: 10, padding: '10px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg, ${C.gold}, ${C.rose})`, color: 'white',
                    fontSize: 17, fontWeight: 700, fontFamily: 'inherit', width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                    </div>
                    Preguntar en la Comunidad
                  </button>
                )}
                {msg.sos && (
                  <button onClick={() => abrirAyuda('chat')} style={{
                    marginTop: 8, padding: '10px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: C.lavanda, color: 'white',
                    fontSize: 17, fontWeight: 700, fontFamily: 'inherit', width: '100%',
                  }}>Abrir {BOTON_AYUDA}</button>
                )}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '12px 20px', borderRadius: 18, borderBottomLeftRadius: 4,
                background: C.card, border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[0, 1, 2].map(d => (
                    <div key={d} style={{
                      width: 8, height: 8, borderRadius: '50%', background: C.rose,
                      animation: `chatDot 1.2s ease-in-out ${d * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick actions. Mismo criterio que los filtros de Afuera (fila-filtros,
            rondas-17): en el celular se deslizan sin barra gris; con ratón o en
            pantalla ancha bajan de línea y se ven todas. */}
        <div className="fila-filtros" style={{ paddingBottom: 8, paddingTop: 4 }}>
          {['¿Cómo empiezo?', 'Necesito ayuda', 'Quiero un programa'].map((q, i) => (
            <button key={i} onClick={() => { setChatInput(q); }} style={{
              padding: '6px 14px', borderRadius: 20, border: `1px solid ${C.roseLight}`,
              background: C.card, color: C.rose, fontSize: 17, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
            }}>{q}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
            placeholder="Escríbeme..."
            style={{
              flex: 1, padding: '14px 16px', borderRadius: 24, border: `1.5px solid ${C.roseLight}`,
              fontSize: 19, fontFamily: 'inherit', background: C.card, color: C.text,
              outline: 'none',
            }}
          />
          <button onClick={sendChatMessage} disabled={!chatInput.trim() || chatLoading} aria-label="Enviar mensaje" style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: chatInput.trim() ? `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` : C.border,
            color: 'white', fontSize: 22, fontWeight: 700, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><span aria-hidden="true">↑</span></button>
        </div>
        <style>{`@keyframes chatDot { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }`}</style>
      </>}

      {/* ── CREATE PROGRAM MODE ── */}
      {chatMode === 'create' && (
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Step 0: Intro / Examples */}
          {aiStep === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                ¿Qué quieres lograr?
              </div>
              {[
                'Quiero dejar de comer azúcar', 'Quiero empezar a meditar',
                'Quiero dormir mejor', 'Quiero dejar de procrastinar',
                'Quiero fortalecer mi relación de pareja', 'Quiero aprender a decir que no',
              ].map((goal, i) => (
                <button key={i} onClick={() => confirmarMeta(goal)} style={{
                  padding: '12px 16px', borderRadius: 14, border: `1px solid ${C.border}`,
                  background: C.card, cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${[C.teal, C.coral, C.lavanda, C.mint, C.rose, C.gold][i]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: [C.teal, C.coral, C.lavanda, C.mint, C.rose, C.gold][i] }} />
                  </div>
                  <span style={{ fontSize: 19, color: C.text, fontWeight: 600 }}>{goal}</span>
                </button>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input value={aiGoal} onChange={e => setAiGoal(e.target.value)} placeholder="O escribe tu meta..."
                  onKeyDown={e => { if (e.key === 'Enter' && aiGoal.trim()) { e.preventDefault(); confirmarMeta(aiGoal) } }}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 14, border: `1.5px solid ${C.contorno}`, fontSize: 19, fontFamily: 'inherit', background: C.card, color: C.text, outline: 'none' }} />
                <button onClick={() => aiGoal.trim() && confirmarMeta(aiGoal)} disabled={!aiGoal.trim()} aria-label="Continuar con esta meta" style={{
                  padding: '12px 18px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: aiGoal.trim() ? C.rose : C.border, color: 'white', fontSize: 19, fontWeight: 700,
                }}><span aria-hidden="true">→</span></button>
              </div>
            </div>
          )}

          {/* Step 1: Context */}
          {aiStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: `${C.rose}10`, borderRadius: 14, padding: 16, border: `1px solid ${C.roseLight}` }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.rose, textTransform: 'uppercase', marginBottom: 4 }}>Tu meta</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>"{aiGoal}"</div>
              </div>
              <div style={{ fontSize: 19, color: C.muted, lineHeight: 1.6 }}>¿Quieres contarme algo más? Entre más me cuentes, mejor tu programa.</div>
              <textarea value={aiContext} onChange={e => setAiContext(e.target.value)}
                placeholder="Opcional: cuéntame un poco más..." rows={3}
                style={{ padding: '12px 16px', borderRadius: 14, border: `1.5px solid ${C.contorno}`, fontSize: 19, fontFamily: 'inherit', background: C.card, color: C.text, outline: 'none', resize: 'none', lineHeight: 1.6 }} />
              {aiError && <>
                <div role="alert" style={{ fontSize: 18, color: C.coral, fontWeight: 600 }}>{aiError}</div>
                {/* Sin programa, tampoco hay segunda capa (el modelo) que vea una
                    crisis dicha de otra forma: Ayuda y las líneas quedan a la
                    vista, como en la Guía IA y en el chat. Va antes de los
                    botones: el scrollIntoView de aiAccionesRef la deja a la vista. */}
                <SalidaAyuda onAbrir={() => abrirAyuda('crisis_programa_fallo')} />
              </>}
              {aiCrisis && (
                <div role="alert" style={{ background: C.card, borderRadius: 14, padding: 16, border: `1.5px solid ${C.lavanda}` }}>
                  <div style={{ fontSize: 18, color: C.text, lineHeight: 1.6 }}>{CRISIS_TEXT_CHAT}</div>
                  <button onClick={() => abrirAyuda('programa')} style={{
                    marginTop: 10, padding: '10px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: C.lavanda, color: 'white',
                    fontSize: 17, fontWeight: 700, fontFamily: 'inherit', width: '100%',
                  }}>Abrir {BOTON_AYUDA}</button>
                </div>
              )}
              <div ref={aiAccionesRef} style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setAiStep(0); setAiGoal(''); setAiContext(''); setAiCrisis(false) }} style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Atrás</button>
                <button onClick={generateAiProgram} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${C.rose}, ${C.roseDark})`, color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Crear mi programa</button>
              </div>
            </div>
          )}

          {/* Step 3: Loading */}
          {aiStep === 3 && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 44, marginBottom: 16, color: C.teal, animation: 'pulse 1.5s ease-in-out infinite' }}>●</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 8 }}>Creando tu programa...</div>
              <div style={{ fontSize: 18, color: C.muted, lineHeight: 1.6 }}>Analizando tu meta y armando cada paso. Dame un momento.</div>
              <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }`}</style>
            </div>
          )}

          {/* Step 4: Result */}
          {aiStep === 4 && aiProgram && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: `${C.rose}10`, borderRadius: 16, padding: 18, border: `1px solid ${C.roseLight}`, textAlign: 'center' }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: C.text, fontFamily: FONT }}>{aiProgram.title}</div>
                <div style={{ fontSize: 18, color: C.muted, marginTop: 4 }}>{aiProgram.desc}</div>
                <div style={{ fontSize: 17, color: C.rose, fontWeight: 700, marginTop: 6, textTransform: 'uppercase' }}>{aiProgram.days?.length || 7} días · Creado para ti</div>
              </div>
              {aiProgram.days?.map(d => (
                <div key={d.day} style={{ padding: '12px 14px', background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.rose}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17, fontWeight: 700, color: C.rose }}>{d.day}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{d.title}</div>
                    <div style={{ fontSize: 18, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{d.task}</div>
                  </div>
                </div>
              ))}
              {!aiSaved ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={resetAiAgent} style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Otro</button>
                  <button onClick={saveAiProgram} style={{ flex: 2, padding: '12px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.tealDark})`, color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Guardar y empezar</button>
                </div>
              ) : (
                <div ref={aiGuardadoRef} role="status" style={{ textAlign: 'center', padding: 16, background: `${C.teal}10`, borderRadius: 14 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: C.teal }}>¡Ruta guardada!</div>
                  <div style={{ fontSize: 18, color: C.muted, marginTop: 4 }}>Ya está en Rutas, dentro de Adentro.</div>
                  <button onClick={resetAiAgent} style={{ marginTop: 10, padding: '8px 20px', borderRadius: 12, border: 'none', background: C.rose, color: 'white', fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Crear otro</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )

  // «Lo que sé de ti» sale con algo de memoria o con una conversación (algo
  // que ella escribió en Tu Ronda): ahí se borran las dos.
  const memoriaConAlgo = memory.facts?.length > 0 || memory.patterns?.length > 0 || !!memory.summary
  const hayConversacion = chatMessages.some(m => m.role === 'user')
  const perfilView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Avatar & Name card */}
      <div style={{ background: `${C.teal}`, borderRadius: 18, padding: 24, color: 'white', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, fontFamily: FONT, border: '2px solid rgba(255,255,255,0.5)' }}>
          {inicialPerfil}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT }}>{nombrePerfil || 'Tu nombre'}</div>
        {profile.city?.trim() && <div style={{ fontSize: 20, opacity: 0.8, marginTop: 4 }}>{profile.city}</div>}
        {profile.bio?.trim() && <div style={{ fontSize: 20, opacity: 0.85, marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>"{profile.bio.trim()}"</div>}
        <button id="perfil-editar" onClick={editingProfile ? cancelarEdicionPerfil : abrirEdicionPerfil} style={{
          marginTop: 14, padding: '8px 20px', borderRadius: 20, border: '2px solid rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 19, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {editingProfile ? 'Cancelar' : 'Editar perfil'}
        </button>
        <div role="status" style={{ fontSize: 16, fontWeight: 600, marginTop: perfilGuardado ? 8 : 0 }}>
          {perfilGuardado ? 'Tu perfil quedó guardado.' : ''}
        </div>
      </div>

      {/* Edit form */}
      {editingProfile && (
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: SHADOW.sm }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 14 }}>Editar perfil</div>

          <label htmlFor="perfil-nombre" style={{ display: 'block', fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Nombre</label>
          <input id="perfil-nombre" value={(perfilBorrador || profile).name || ''} onChange={e => updateProfile('name', e.target.value)} placeholder="¿Cómo te llamas?" maxLength={NOMBRE_MAX}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }}
          />

          <label htmlFor="perfil-ciudad" style={{ display: 'block', fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Ciudad</label>
          <input id="perfil-ciudad" value={(perfilBorrador || profile).city || ''} onChange={e => updateProfile('city', e.target.value)} placeholder="¿De dónde eres?" maxLength={60}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }}
          />

          <label htmlFor="perfil-bio" style={{ display: 'block', fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Bio</label>
          <textarea id="perfil-bio" aria-describedby="perfil-nota-cuenta" value={(perfilBorrador || profile).bio || ''} onChange={e => updateProfile('bio', e.target.value)} placeholder="Cuéntanos sobre ti en una frase..." maxLength={160}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box', minHeight: 60, resize: 'vertical', lineHeight: 1.5 }}
          />

          <label htmlFor="perfil-intencion" style={{ display: 'block', fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Mi intención</label>
          <textarea id="perfil-intencion" aria-describedby="perfil-nota-cuenta" value={(perfilBorrador || profile).intention || ''} onChange={e => updateProfile('intention', e.target.value)} placeholder="¿Cuál es tu intención para este año?" maxLength={200}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box', minHeight: 60, resize: 'vertical', lineHeight: 1.5 }}
          />
          {/* La bio y la intención suben a su cuenta (con la autorización de
              cuenta, que no cubre datos sensibles): lo íntimo, al diario. */}
          <p id="perfil-nota-cuenta" style={{ margin: '0 0 8px', fontSize: 15, color: C.muted, lineHeight: 1.5 }}>
            Tu bio y tu intención se guardan en tu cuenta. Lo de tu salud y tus emociones guárdalo en tu diario, que vive solo en tu teléfono.
          </p>

          <button onClick={guardarPerfil} style={{
            width: '100%', padding: 12, borderRadius: 12, border: 'none',
            background: C.teal, color: 'white',
            fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
          }}>
            Guardar
          </button>
        </div>
      )}

      {/* Intention card */}
      {profile.intention?.trim() && !editingProfile && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: SHADOW.sm, borderLeft: `4px solid ${C.gold}` }}>
          <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.gold, marginBottom: 6 }}>Mi intención</div>
          <div style={{ fontSize: 19, color: C.text, lineHeight: 1.6 }}>{profile.intention}</div>
        </div>
      )}

      {/* Notificaciones — OneSignal */}
      {(oneSignal.status === 'idle' || oneSignal.status === 'error' || activandoPush) && (
        <div style={{
          background: `linear-gradient(135deg, ${C.cream}, #E3E5D3)`,
          borderRadius: 16, padding: 18,
          border: `1px solid ${C.teal}30`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${C.teal}, #141833)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>🔔</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: FONT }}>
                Que Tu Ronda te acompañe
              </div>
              <div style={{ fontSize: 14, color: C.muted, marginTop: 2 }}>
                Buenos días, recordatorios suaves y mensajes cuando los necesites.
              </div>
            </div>
          </div>
          <button disabled={activandoPush} aria-busy={activandoPush} onClick={async () => {
            if (activandoPush) return
            const resultado = await oneSignal.subscribe()
            const aviso = AVISOS_PUSH[resultado]
            if (aviso) setAppModal({ type: 'info', ...aviso, cta: 'Entendido' })
          }} style={{
            width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none',
            background: C.teal, color: 'white', fontSize: 16, fontWeight: 700,
            cursor: activandoPush ? 'default' : 'pointer', opacity: activandoPush ? 0.7 : 1, fontFamily: 'inherit',
          }}>
            {activandoPush ? 'Activando…' : 'Activar notificaciones'}
          </button>
        </div>
      )}

      {(oneSignal.status === 'subscribed' || oneSignal.status === 'pausing') && (
        <div style={{
          background: `${C.teal}10`,
          borderRadius: 16, padding: 14,
          border: `1px solid ${C.teal}30`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: C.teal, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800,
          }}>{UI_ICONS.check('white', 18)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.teal }}>Notificaciones activas</div>
            <div style={{ fontSize: 13, color: C.muted }}>Tu Ronda te puede acompañar.</div>
          </div>
          <button disabled={oneSignal.status === 'pausing'} aria-busy={oneSignal.status === 'pausing'} onClick={async () => {
            if (oneSignal.status === 'pausing') return
            const pausadas = await oneSignal.unsubscribe()
            if (!pausadas) setAppModal({ type: 'info', title: 'No se pudo pausar', body: AVISOS_PUSH.error.body, cta: 'Entendido' })
          }} style={{
            background: 'transparent', border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '6px 10px', fontSize: 13,
            color: C.muted, cursor: oneSignal.status === 'pausing' ? 'default' : 'pointer', fontFamily: 'inherit',
          }}>{oneSignal.status === 'pausing' ? 'Pausando…' : 'Pausar'}</button>
        </div>
      )}

      {oneSignal.status === 'denied' && (
        <div style={{
          background: '#F3EAF5', borderRadius: 16, padding: 14,
          border: '1px solid #59214740',
        }}>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
            🔕 Tienes las notificaciones bloqueadas en este navegador. Para activarlas, ve a la configuración del sitio en tu navegador.
          </div>
        </div>
      )}

      {/* Dónde abre Ronda: se puede cambiar en cualquier momento */}
      <div role="group" aria-labelledby="perfil-puerta-titulo" style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: SHADOW.sm }}>
        <div id="perfil-puerta-titulo" style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>¿Dónde quieres que abra Ronda?</div>
        <div style={{ fontSize: 15, color: C.muted, marginBottom: 12, lineHeight: 1.45 }}>Se guarda en este dispositivo.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PUERTAS.map(op => {
            const activa = puertaGuardada === op.id
            return (
              <button key={op.id} type="button" aria-pressed={activa} onClick={() => fijarPuerta(op.id, { navegar: false })} style={{
                minHeight: 44, padding: '0 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 15, fontWeight: 600,
                border: `1px solid ${activa ? C.morado : C.border}`,
                background: activa ? C.morado : 'transparent', color: activa ? '#FFFFFF' : C.text,
              }}>{op.label}</button>
            )
          })}
        </div>
      </div>

      {/* Membership — Yo soy Ronda ("Ver planes" del aviso de pago llega aquí) */}
      <div id="perfil-planes" style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: SHADOW.sm, border: `1px solid ${C.goldLight}` }}>
        <div id="perfil-planes-titulo" tabIndex={-1} style={{ fontSize: 20, fontWeight: 800, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em', outline: 'none' }}>Yo soy Ronda</div>
        <div style={{ fontSize: 18, color: C.muted, marginBottom: 14 }}>
          {isPremium ? 'Tienes acceso completo a Ronda' : 'Plan actual: Freemium'}
        </div>

        {/* Badge especial founding member */}
        {fundadoraFecha && (
          <div style={{
            background: `linear-gradient(135deg, ${C.gold}, ${C.rose})`,
            borderRadius: 14, padding: '14px 16px', marginBottom: 14,
            color: 'white',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.9, marginBottom: 4 }}>
              💛 Miembro fundadora
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              Eres parte de las primeras 50 mujeres
            </div>
            <div style={{ fontSize: 14, opacity: 0.95, lineHeight: 1.4 }}>
              {fundadoraAcceso}
            </div>
          </div>
        )}

        {!isPremium && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              // Lo mismo que dice "Acceso completo activo": sin profesionales
              // (en la Comunidad responde la Guía IA de Ronda).
              { name: PLAN_PAGO, price: PLAN_PRECIO, features: 'Tu Ronda (IA), rutas de 21 días, escribir en la Comunidad y más.', color: C.teal },
              { name: 'Ronda Pro', price: 'Próximamente', features: 'El siguiente nivel de Ronda, en camino.', color: C.gold },
            ].map((plan, i) => (
              <div key={i} style={{ background: C.cream, borderRadius: 14, padding: 14, border: `2px solid ${plan.color}30` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: plan.color }}>{plan.name}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{plan.price}</div>
                </div>
                <div style={{ fontSize: 16, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>{plan.features}</div>
                {plan.name === PLAN_PAGO && (
                  <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>{NOTA_IA_PLUS}</div>
                )}
                <button onClick={() => setAppModal({ type: 'info', title: 'Próximamente', body: `Estamos finalizando el sistema de pago para ${plan.name}. Te avisaremos cuando esté listo. 💛`, cta: 'Entendido' })} style={{
                  width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                  background: plan.color, color: 'white', fontSize: 17, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Elegir {plan.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {isPremium && (
          <div style={{ background: `${C.teal}10`, borderRadius: 12, padding: 14, border: `1px solid ${C.teal}30`, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.teal }}>Acceso completo activo</div>
            <div style={{ fontSize: 16, color: C.muted, marginTop: 4 }}>Tu Ronda (IA), rutas de 21 días, escribir en la Comunidad y más.</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: SHADOW.sm }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mis estadísticas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Días activa', value: profileStats.daysActive, color: C.teal },
            { label: 'Hábitos cumplidos', value: profileStats.totalHabitsEver, color: C.coral },
            { label: 'Entradas diario', value: profileStats.totalEntries, color: C.lavanda },
            // El salvia queda en el punto; el número va en un tono que se lee (8:1).
            { label: 'Recursos guardados', value: profileStats.toolkitCount, color: C.mint, textColor: C.olivaOscura },
            { label: 'Hoy', value: `${totalDone}/${totalHabits}`, color: C.rose },
          ].map((stat, i, lista) => (
            // Con un número impar de tarjetas, la última ocupa la fila entera.
            <div key={i} style={{ background: C.cream, borderRadius: 14, padding: 16, textAlign: 'center', border: `1px solid ${C.border}`, gridColumn: lista.length % 2 && i === lista.length - 1 ? '1 / -1' : undefined }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${stat.color}15`, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: stat.color }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: stat.textColor || stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 19, fontWeight: 600, color: C.muted, marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dimensions breakdown */}
      <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: SHADOW.sm }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mis dimensiones hoy</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(DIMS).map(([dim, cfg]) => {
            const s = dimStats[dim]
            const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
            return (
              <div key={dim}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: cfg.color }}>{ICONS[cfg.icon] ? ICONS[cfg.icon](cfg.color, 16) : ''} {cfg.label}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: cfg.color }}>{pct}%</span>
                </div>
                <Bar value={pct} color={cfg.color} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Tus datos y privacidad: autorizaciones, política y a quién escribir */}
      <TusAutorizaciones autorizaciones={autorizaciones} onCambiarIA={cambiarAutorizacionIA} />

      {/* Lo que Ronda sabe de ti (memoria de Tu Ronda). También con solo la
          conversación: la política dice que ahí se borra. */}
      {(memoriaConAlgo || hayConversacion) && (
        <div style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                Tu Ronda · Memoria
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: FONT }}>
                Lo que sé de ti
              </div>
            </div>
            <button onClick={() => setAppModal({
              type: 'confirm',
              title: '¿Borrar lo que Ronda ha aprendido de ti?',
              body: 'Se borra lo que Tu Ronda sabe de ti y también tu conversación con ella. Es definitivo.',
              cta: 'Borrar',
              onConfirm: () => {
                setMemory({ facts: [], patterns: [], preferences: {}, summary: '', lastUpdated: null, conversationCount: 0 })
                setChatMessages([CHAT_GREETING])
              },
            })} style={{
              padding: '6px 12px', borderRadius: 10, border: `1px solid ${C.border}`,
              background: 'transparent', color: C.muted, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Borrar
            </button>
          </div>

          {!memoriaConAlgo && (
            <div style={{ fontSize: 16, color: C.muted, lineHeight: 1.55, marginBottom: 4 }}>
              Tu conversación con Tu Ronda está guardada en este teléfono. Con «Borrar» la borras, junto con lo que recuerde de ti.
            </div>
          )}

          {memory.summary && (
            <div style={{ fontSize: 17, color: C.text, lineHeight: 1.6, marginBottom: 16, fontStyle: 'italic' }}>
              "{memory.summary}"
            </div>
          )}

          {memory.facts?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.teal, marginBottom: 6 }}>Lo que me has contado</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {memory.facts.map((f, i) => (
                  <div key={i} style={{ fontSize: 16, color: C.muted, paddingLeft: 12, borderLeft: `2px solid ${C.teal}` }}>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {memory.patterns?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 6 }}>Patrones que he notado</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {memory.patterns.map((p, i) => (
                  <div key={i} style={{ fontSize: 16, color: C.muted, paddingLeft: 12, borderLeft: `2px solid ${C.gold}` }}>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 13, color: C.subtle, marginTop: 12, fontStyle: 'italic' }}>
            {memory.conversationCount > 0 ? `${memory.conversationCount} ${memory.conversationCount === 1 ? 'conversación' : 'conversaciones'} hasta hoy` : ''}
          </div>
        </div>
      )}

      {/* La historia detrás de Ronda */}
      <div style={{ fontSize: 19, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8, marginBottom: 2, textAlign: 'center' }}>
        La historia detrás de Ronda
      </div>
      {historiaView}

      {/* Sign out */}
      {isConfigured && user && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 20, color: C.subtle, marginBottom: 8 }}>{user.email}</div>
          <button onClick={cerrarSesion} disabled={cerrandoSesion} style={{
            padding: '10px 28px', borderRadius: 12, border: `1.5px solid ${C.border}`,
            background: C.card, color: C.muted, fontSize: 20, fontWeight: 700,
            cursor: cerrandoSesion ? 'wait' : 'pointer', fontFamily: 'inherit',
          }}>
            {cerrandoSesion ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  )

  /* ── Onboarding ──
     Estos 4 pasos la dejan lista para Adentro, y al terminar la app abre
     ahí (lo que promete el último paso). Afuera y Juntas quedan en el menú,
     sin presentaciones aparte. */
  const finishOnboarding = () => {
    if (onboardName.trim()) {
      setProfile(prev => ({ ...prev, name: onboardName.trim() }))
    }
    if (onboardHabits.length > 0) {
      // Merge, no reemplazo: si vuelve a pasar por el onboarding no pierde lo suyo.
      setHabits(prev => {
        const existing = new Set(prev.map(h => h.name))
        const added = onboardHabits
          .filter(sh => !existing.has(sh.name))
          .map((sh, i) => ({ id: Date.now() + i, name: sh.name, dim: sh.dim }))
        return [...prev, ...added]
      })
    }
    // La app abre arriba, no donde quedó el scroll del último paso (bienvenida-4).
    window.scrollTo({ top: 0, behavior: 'instant' })
    // Recién llegada no ha visto la app ni marcado nada: el check-in de la
    // mañana o de la noche no le sale encima (ni con un resumen en cero). Como
    // con "Más tarde", sale la próxima vez que abra Ronda.
    setCheckinPospuesto(true)
    setOnboarded(true)
    save('ronda-onboarded', true)
    openModule('ahora')
    track('onboarding_completed', {
      added_name: !!onboardName.trim(),
      habits_chosen: onboardHabits.length,
    })
  }

  const toggleOnboardHabit = (h) => {
    setOnboardHabits(prev => {
      const isOn = prev.some(x => x.name === h.name)
      if (isOn) return prev.filter(x => x.name !== h.name)
      if (prev.length >= 3) return prev
      return [...prev, h]
    })
  }

  // Cada paso empieza arriba: el scroll de la lista de hábitos no se
  // arrastra al paso siguiente (bienvenida-4). 'instant' porque el html
  // tiene scroll-behavior: smooth.
  const irAPasoOnboard = (paso) => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    setOnboardStep(paso)
  }

  const onboardStepShell = (key, children) => (
    <div key={key} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', textAlign: 'center', padding: '32px 32px 190px',
    }}>{children}</div>
  )

  const onboardSlides = [
    /* Paso 0 — Bienvenida. Solo la marca y la promesa. Nada de features. */
    onboardStepShell(0, <>
      <div style={{ width: 70, height: 70, borderRadius: '50%', border: '3px solid '+C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.gold }} />
      </div>
      <div style={{ fontSize: 36, fontWeight: 400, color: C.text, letterSpacing: '0.15em', fontFamily: FONT, marginBottom: 8 }}>Ronda</div>
      <div style={{ fontSize: 20, color: C.gold, fontWeight: 600, fontStyle: 'italic', fontFamily: FONT, marginBottom: 32 }}>
        Creces tú, crecemos todas
      </div>
      <div style={{ width: 60, height: 2, background: C.gold, marginBottom: 32, borderRadius: 2 }} />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: FONT, lineHeight: 1.4, margin: '0 0 12px' }}>
        Tu compañera en cada etapa
      </h1>
      <div style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, maxWidth: 300 }}>
        Vamos a empezar por lo tuyo. Dos preguntas y estás lista.
      </div>
    </>),

    /* Paso 1 — Su nombre. La app le habla por su nombre desde el primer día. */
    onboardStepShell(1, <>
      <h1 id="onboard-nombre-titulo" style={{ fontSize: 26, fontWeight: 700, color: C.text, fontFamily: FONT, margin: '0 0 10px' }}>
        ¿Cómo te llamas?
      </h1>
      <div style={{ fontSize: 16, color: C.muted, marginBottom: 28, maxWidth: 300, lineHeight: 1.6 }}>
        Para llamarte por tu nombre. Puedes cambiarlo después en tu perfil.
      </div>
      <input
        value={onboardName}
        onChange={e => setOnboardName(e.target.value)}
        placeholder="Tu nombre"
        aria-labelledby="onboard-nombre-titulo"
        autoComplete="given-name"
        autoFocus
        // Enter pasa al paso siguiente, como "Siguiente". El campo se va con
        // el paso: el foco pasa al título del paso siguiente, no a <body>.
        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); irAPasoOnboard(2); enfocarDespues('onboard-habitos-titulo') } }}
        maxLength={40}
        style={{
          width: '100%', maxWidth: 320, padding: '16px 20px', borderRadius: 16,
          border: `2px solid ${onboardName.trim() ? C.teal : C.border}`,
          background: C.card, color: C.text, fontSize: 18, fontWeight: 600,
          fontFamily: 'inherit', textAlign: 'center', outline: 'none',
          transition: 'border-color 0.2s',
        }}
      />
      <div style={{ fontSize: 14, color: C.subtle, marginTop: 14 }}>
        Si prefieres, sigue y lo agregas cuando quieras.
      </div>
    </>),

    /* Paso 2 — Sus primeros hábitos (hasta 3). Que salga del onboarding habiendo HECHO algo. */
    onboardStepShell(2, <>
      <h1 id="onboard-habitos-titulo" tabIndex={-1} style={{ fontSize: 26, fontWeight: 700, color: C.text, fontFamily: FONT, margin: '0 0 10px', maxWidth: '100%', overflowWrap: 'anywhere', outline: 'none' }}>
        {onboardName.trim() ? `${onboardName.trim()}, elige tus primeros hábitos` : 'Elige tus primeros hábitos'}
      </h1>
      <div style={{ fontSize: 16, color: C.muted, marginBottom: 8, maxWidth: 320, lineHeight: 1.6 }}>
        Hasta tres para empezar. Puedes sumar más cuando quieras.
      </div>
      <div aria-live="polite" style={{ fontSize: 14, fontWeight: 700, color: onboardHabits.length ? C.teal : C.subtle, marginBottom: 20 }}>
        {onboardHabits.length} de 3
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', width: '100%', maxWidth: 360 }}>
        {SUGGESTED_HABITS.map(h => {
          const isOn = onboardHabits.some(x => x.name === h.name)
          const full = onboardHabits.length >= 3 && !isOn
          const dim = DIMS[h.dim]
          return (
            <button
              key={h.name}
              onClick={() => toggleOnboardHabit(h)}
              disabled={full}
              aria-pressed={isOn}
              style={{
                padding: '10px 16px', borderRadius: 22, cursor: full ? 'default' : 'pointer',
                border: `2px solid ${isOn ? dim.color : C.border}`,
                background: isOn ? dim.color + '25' : C.card,
                color: full ? C.subtle : C.text,
                fontSize: 14, fontWeight: isOn ? 800 : 600, fontFamily: 'inherit',
                opacity: full ? 0.45 : 1, transition: 'all 0.15s',
              }}
            >
              {h.name}
            </button>
          )
        })}
      </div>
    </>),

    /* Paso 3 — Adentro, donde aterriza al terminar. Afuera y Juntas
       quedan en el menú de abajo. */
    onboardStepShell(3, <>
      <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.gold }} />
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, fontFamily: FONT, margin: '0 0 10px' }}>
        Empecemos por Adentro
      </h1>
      <div style={{ fontSize: 16, color: C.muted, marginBottom: 26, maxWidth: 310, lineHeight: 1.6 }}>
        Es tu pantalla del día: tus hábitos, tu rutina, tu diario y tus rutas.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 330 }}>
        {[
          { title: 'Tus hábitos', desc: 'Márcalos cada día y mira tu racha crecer.', color: C.gold },
          { title: 'Tu rutina', desc: 'Mañana, mediodía y noche, a tu medida.', color: C.teal },
          { title: 'Tu diario', desc: 'Escribe cómo te fue. Solo tú lo lees.', color: C.rose },
          { title: 'Tus rutas', desc: 'Caminos de 7 días, una práctica al día.', color: C.mint },
        ].map((item, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 14, padding: '14px 16px', boxShadow: SHADOW.sm, textAlign: 'left', display: 'flex', gap: 14, alignItems: 'center', borderLeft: '3px solid '+item.color }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: item.color+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: item.color }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{item.title}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14, color: C.subtle, marginTop: 20, maxWidth: 300, lineHeight: 1.6 }}>
        Afuera y Juntas te esperan abajo.
      </div>
      {/* "Comenzar mi Ronda" va en la barra de abajo, junto a Atrás: así
          siempre se ve y nada se le encima (bienvenida-2, bienvenida-7). */}
    </>),
  ]

  /* ── Panic Modal — Full Crisis Support ──
     Va antes de "Cargando...": esa pantalla también abre Ayuda. */
  const GROUND_STEPS = [
    { icon: '👀', sense: 'VER', prompt: 'Nombra 5 cosas que puedes VER ahora mismo', count: 5, color: '#BFD5EB' },
    { icon: '✋', sense: 'TOCAR', prompt: 'Nombra 4 cosas que puedes TOCAR', count: 4, color: '#E3E5D3' },
    { icon: '👂', sense: 'ESCUCHAR', prompt: 'Nombra 3 cosas que puedes ESCUCHAR', count: 3, color: '#D6BFDD' },
    { icon: '👃', sense: 'OLER', prompt: 'Nombra 2 cosas que puedes OLER', count: 2, color: '#BFD5EB' },
    { icon: '👅', sense: 'SABOREAR', prompt: 'Nombra 1 cosa que puedes SABOREAR', count: 1, color: '#E3E5D3' },
  ]

  const DBT_SKILLS = [
    { name: 'TIPP', icon: '🧊', desc: 'Temperatura · Ejercicio Intenso · Respiración Pautada · Relajación Muscular',
      steps: ['Pon hielo o agua fría en tu cara 30 segundos', 'Haz ejercicio intenso 5-10 minutos (correr, saltar)', 'Inhala 4 segundos y exhala 8. Repite 5 veces.', 'Tensa y relaja cada grupo muscular de pies a cabeza'] },
    { name: 'STOP', icon: '🛑', desc: 'Para · Toma distancia · Observa · Procede con conciencia',
      steps: ['PARA: Congélate. No reacciones aún.', 'TOMA DISTANCIA: Da un paso atrás mentalmente.', 'OBSERVA: ¿Qué sientes en el cuerpo? ¿Qué piensas?', 'PROCEDE: Actúa con la mente sabia, no la emocional.'] },
    { name: 'Acción Opuesta', icon: '🔄', desc: 'Haz lo contrario de lo que la emoción te pide',
      steps: ['Identifica la emoción: ¿qué sientes exactamente?', 'Identifica el impulso: ¿qué te pide hacer esa emoción?', 'Haz lo OPUESTO con todo el cuerpo', 'Si quieres aislarte → llama a alguien. Si quieres gritar → habla suave.'] },
    { name: 'Aceptación Radical', icon: '🙏', desc: 'Aceptar la realidad tal como es, sin luchar contra ella',
      steps: ['Reconoce: "Esto es lo que está pasando ahora mismo."', 'Suelta la lucha: resistir el dolor crea más sufrimiento.', 'Respira y repite: "Puedo aceptar esto sin aprobarlo."', 'El dolor es inevitable. El sufrimiento es la resistencia al dolor.'] },
  ]

  const panicModal = showPanic && (
    <div ref={panicRef} role="dialog" aria-modal="true" aria-label={panicOrigen === 'pausa' ? 'Pausa' : 'Ayuda'} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: panicScreen === 'breathe'
        ? (breathePhase === 'inhale' ? 'linear-gradient(180deg, #141833, #141833)'
          : breathePhase === 'hold' ? 'linear-gradient(180deg, #141833, #141833)'
          : 'linear-gradient(180deg, #1A202C, #2D3748)')
        : 'linear-gradient(180deg, #141833 0%, #592147 100%)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.3s ease',
      overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
    }}>
      {/* Barra fija arriba: volver y cerrar siempre a la vista al bajar.
         Respeta el notch / Dynamic Island del iPhone. */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(max(env(safe-area-inset-top, 0px), 12px)) 16px 8px',
        background: 'rgba(20,24,51,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}>
        {panicScreen !== 'home' ? (
          // En la pausa, volver es salir: no lleva al menú de crisis.
          <button onClick={panicOrigen === 'pausa' ? cerrarAyuda : () => { setPanicScreen('home'); setBreatheActive(false); setPanicDbtExpanded(null) }} aria-label="Volver" style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontSize: 20, lineHeight: 1 }}>←</span>
          </button>
        ) : <span />}
        <button onClick={cerrarAyuda} aria-label={panicOrigen === 'pausa' ? 'Cerrar la pausa' : 'Cerrar la ayuda'} data-autofocus style={{
          background: 'rgba(255,255,255,0.15)',
          border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {UI_ICONS.close('white', 18)}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 24px 24px', maxWidth: 440, margin: '0 auto', width: '100%' }}>

        {/* ── HOME: Main crisis menu ── */}
        {panicScreen === 'home' && <>
          <div data-titulo-ayuda tabIndex={-1} style={{ fontSize: 26, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: FONT, lineHeight: 1.3, marginBottom: 8, outline: 'none' }}>
            {panicOrigen === 'crisis' ? 'Aquí estamos contigo.' : 'Estás a salvo.'}
          </div>
          <div style={{ fontSize: 20, color: '#E3E5D3', textAlign: 'center', marginBottom: 8 }}>
            {panicOrigen === 'crisis'
              ? <>Si estás en peligro o ya te hiciste daño, llama al <a href="tel:123" style={{ color: 'white', fontWeight: 800 }}>123</a> ahora.</>
              : 'Respira. Este momento va a pasar.'}
          </div>
          <div style={{ fontSize: 19, color: '#D6BFDD', textAlign: 'center', marginBottom: 32 }}>
            Escoge lo que necesitas ahora mismo:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            {[
              { id: 'breathe', title: 'Respiración 4-7-8', sub: 'Calma tu sistema nervioso en 2 minutos', color: '#BFD5EB' },
              // El mismo nombre que en la ruta "Encontrar mi calma" (data.js), con el
              // 5-4-3-2-1 que no se parte de renglón.
              { id: 'ground', title: 'Tus sentidos: 5-\u20604-\u20603-\u20602-\u20601', sub: 'Vuelve al presente, aquí y ahora', color: '#E3E5D3' },
              { id: 'dbt', title: 'Habilidades DBT', sub: 'TIPP · STOP · Acción Opuesta · Aceptación Radical', color: '#D6BFDD' },
              { id: 'accept', title: 'Aceptación Radical', sub: 'Soltar la lucha. Abrazar lo que es.', color: '#141833' },
            ].map(opt => (
              <button key={opt.id} onClick={() => {
                setPanicScreen(opt.id)
                if (opt.id === 'breathe') { setBreatheActive(true); setBreatheCount(0); setBreathePhase('inhale') }
                if (opt.id === 'ground') { setGroundStep(0) }
              }} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                background: 'rgba(255,255,255,0.08)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{opt.title}</div>
                  <div style={{ fontSize: 20, color: '#E3E5D3', marginTop: 2 }}>{opt.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Go to community. No sale mientras falta el aviso o «Lo íntimo es
              tuyo» (ni en "Cargando..."): cerraría Ayuda y la devolvería a
              esa pantalla, sin llegar a la Comunidad. */}
          {pantallaPrincipal && (
          <button onClick={() => { setShowPanic(false); openModule('juntas', '', { silent: true }) }} style={{
            marginTop: 24, width: '100%', padding: '14px 18px',
            background: 'rgba(114,109,45,0.2)', borderRadius: 16,
            border: '1px solid rgba(114,109,45,0.4)', cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#E3E5D3' }}>💬 Ir a la Comunidad</div>
            <div style={{ fontSize: 20, color: '#E3E5D3', marginTop: 4 }}>
              {/* Sin premium no se puede publicar, y sin la autorización de la
                  IA la Guía IA no responde: no prometer que puede preguntar. */}
              {isPremium && iaOk ? 'Pregunta lo que necesites. Te responde la Guía IA de Ronda.' : 'Lee cómo acompaña la Guía IA de Ronda. Es anónimo.'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontStyle: 'italic' }}>Contenido educativo. En una crisis, llama a la Línea 106.</div>
          </button>
          )}
        </>}

        {/* ── BREATHE: 4-7-8 Guided Breathing ── */}
        {panicScreen === 'breathe' && <>
          {/* Al terminar, el cierre reemplaza las instrucciones: no queda
             'Exhala — suelta todo' encima de 'Lo hiciste.' */}
          {(breatheActive || breatheCount === 0) && <>
            <div style={{
              width: breathePhase === 'inhale' ? 200 : breathePhase === 'hold' ? 200 : 120,
              height: breathePhase === 'inhale' ? 200 : breathePhase === 'hold' ? 200 : 120,
              borderRadius: '50%',
              background: breathePhase === 'inhale'
                ? 'radial-gradient(circle, rgba(191,213,235,0.45), rgba(191,213,235,0.08))'
                : breathePhase === 'hold'
                ? 'radial-gradient(circle, rgba(145,148,110,0.6), rgba(145,148,110,0.1))'
                : 'radial-gradient(circle, rgba(214,191,221,0.45), rgba(214,191,221,0.08))',
              transition: 'all 1.5s ease-in-out',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 32,
            }}>
              <div data-titulo-ayuda tabIndex={-1} style={{ fontSize: 22, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.15em', outline: 'none' }}>
                {breathePhase === 'inhale' ? 'Inhala' : breathePhase === 'hold' ? 'Sostén' : 'Exhala'}
              </div>
            </div>

            <div style={{ fontSize: 20, color: '#E3E5D3', textAlign: 'center', marginBottom: 8 }}>
              {breathePhase === 'inhale' ? '4 segundos — llena tu pecho de aire' :
               breathePhase === 'hold' ? '7 segundos — el aire te sostiene' :
               '8 segundos — suelta todo, deja ir'}
            </div>
            <div style={{ fontSize: 19, color: '#D6BFDD', marginBottom: 24 }}>
              Ciclo {Math.min(breatheCount + 1, 5)} de 5
            </div>
          </>}

          {!breatheActive && breatheCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div data-titulo-ayuda tabIndex={-1} style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8, outline: 'none' }}>Lo hiciste.</div>
              <div style={{ fontSize: 20, color: '#E3E5D3', marginBottom: 20 }}>Tu sistema nervioso se está calmando. Quédate aquí un momento.</div>
              <button onClick={() => { setBreatheCount(0); setBreatheActive(true); setBreathePhase('inhale') }} style={{
                padding: '10px 24px', borderRadius: 20, background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: 20,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Repetir</button>
            </div>
          )}
        </>}

        {/* ── GROUND: 5-4-3-2-1 Sensory Grounding ── */}
        {panicScreen === 'ground' && <>
          {groundStep < 5 ? (<>
            <div aria-hidden="true" style={{ fontSize: 64, marginBottom: 16 }}>{GROUND_STEPS[groundStep].icon}</div>
            <div data-titulo-ayuda tabIndex={-1} style={{ fontSize: 19, fontWeight: 700, color: GROUND_STEPS[groundStep].color, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, outline: 'none' }}>
              {GROUND_STEPS[groundStep].sense}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'white', textAlign: 'center', fontFamily: FONT, lineHeight: 1.4, marginBottom: 24 }}>
              {GROUND_STEPS[groundStep].prompt}
            </div>
            <div style={{ fontSize: 20, color: '#E3E5D3', marginBottom: 32, textAlign: 'center' }}>
              Tómate tu tiempo. No hay prisa.
            </div>
            <button onClick={() => setGroundStep(groundStep + 1)} style={{
              padding: '14px 36px', borderRadius: 20,
              background: 'rgba(255,255,255,0.15)', color: 'white',
              fontSize: 20, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Listo → {groundStep < 4 ? 'Siguiente sentido' : 'Terminar'}
            </button>
          </>) : (<>
            <div style={{ fontSize: 56, marginBottom: 16 }}>💛</div>
            <div data-titulo-ayuda tabIndex={-1} style={{ fontSize: 24, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: FONT, marginBottom: 12, outline: 'none' }}>
              Estás aquí. Estás presente.
            </div>
            {/* Abierta por una crisis, no se le dice que está a salvo (puede
                contar que ya se hizo daño): el 123, como en el inicio. */}
            <div style={{ fontSize: 19, color: '#E3E5D3', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
              {panicOrigen === 'crisis'
                ? <>Acabas de reconectar con tus sentidos. Aquí estamos contigo: si estás en peligro o ya te hiciste daño, llama al <a href="tel:123" style={{ color: 'white', fontWeight: 800 }}>123</a> ahora.</>
                : 'Acabas de reconectar con tus sentidos. Tu cuerpo sabe que estás a salvo.'}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setGroundStep(0)} style={{
                padding: '12px 28px', borderRadius: 20, background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: 20,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Repetir</button>
              <button onClick={() => setPanicScreen('home')} style={{
                padding: '12px 28px', borderRadius: 20, background: C.orquidea,
                border: 'none', color: C.navy, fontSize: 20,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Volver</button>
            </div>
          </>)}
        </>}

        {/* ── DBT: menú de habilidades ── */}
        {panicScreen === 'dbt' && <>
          <div data-titulo-ayuda tabIndex={-1} style={{ fontSize: 20, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: FONT, marginBottom: 6, outline: 'none' }}>
            Habilidades DBT
          </div>
          <div style={{ fontSize: 19, color: '#E3E5D3', textAlign: 'center', marginBottom: 24 }}>
            Herramientas de regulación emocional. Escoge la que necesitas.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            {DBT_SKILLS.map((skill, idx) => (
              <div key={skill.name}>
                <button onClick={() => setPanicDbtExpanded(panicDbtExpanded === idx ? null : idx)}
                  aria-expanded={panicDbtExpanded === idx} aria-controls={panicDbtExpanded === idx ? `dbt-skill-panel-${idx}` : undefined} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: panicDbtExpanded === idx ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                  borderRadius: panicDbtExpanded === idx ? '16px 16px 0 0' : 16,
                  border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', textAlign: 'left',
                }}>
                  <div aria-hidden="true" style={{ fontSize: 26 }}>{skill.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{skill.name}</div>
                    <div style={{ fontSize: 19, color: '#E3E5D3', marginTop: 2 }}>{skill.desc}</div>
                  </div>
                  <span aria-hidden="true" style={{ color: '#D6BFDD', fontSize: 18 }}>{panicDbtExpanded === idx ? '▲' : '▼'}</span>
                </button>
                {panicDbtExpanded === idx && (
                  <div id={`dbt-skill-panel-${idx}`} role="region" aria-label={`Pasos de ${skill.name}`} style={{
                    background: 'rgba(255,255,255,0.06)', borderRadius: '0 0 16px 16px',
                    border: '1px solid rgba(255,255,255,0.12)', borderTop: 'none',
                    padding: '14px 16px',
                  }}>
                    {skill.steps.map((step, si) => (
                      <div key={si} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: si < skill.steps.length - 1 ? 12 : 0,
                      }}>
                        <div style={{
                          minWidth: 24, height: 24, borderRadius: '50%', background: C.rose,
                          color: 'white', fontSize: 20, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                        }}>{si + 1}</div>
                        <div style={{ fontSize: 20, color: '#E3E5D3', lineHeight: 1.5 }}>{step}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>}

        {/* ── ACCEPT: Radical Acceptance guided ── */}
        {panicScreen === 'accept' && <>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🙏</div>
          <div data-titulo-ayuda tabIndex={-1} style={{ fontSize: 24, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: FONT, lineHeight: 1.3, marginBottom: 12, outline: 'none' }}>
            Aceptación Radical
          </div>
          <div style={{ fontSize: 20, color: '#E3E5D3', textAlign: 'center', marginBottom: 32, lineHeight: 1.6 }}>
            No significa que apruebes lo que pasa.<br/>Significa que dejas de luchar contra la realidad.
          </div>

          {[
            { num: 1, text: 'Reconoce lo que sientes. Ponle nombre. "Siento dolor. Siento miedo. Siento rabia." No lo juzgues.' },
            { num: 2, text: 'Observa dónde lo sientes en tu cuerpo. Pecho apretado. Mandíbula tensa. Estómago cerrado. Solo observa.' },
            { num: 3, text: 'Respira hacia ese lugar. Imagina que el aire llega exactamente ahí y suaviza.' },
            { num: 4, text: 'Repite en silencio: "Esto es lo que está pasando. No tengo que luchar contra esto. Puedo estar aquí."' },
            { num: 5, text: 'Suelta las manos. Abre las palmas hacia arriba. Relaja los hombros. Deja que la gravedad te sostenga.' },
            { num: 6, text: 'Repite: "El dolor es parte de la vida. El sufrimiento es resistir ese dolor. Hoy elijo soltar la resistencia."' },
          ].map(step => (
            <div key={step.num} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16, width: '100%',
            }}>
              <div style={{
                minWidth: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #592147, #726D2D)',
                color: 'white', fontSize: 19, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{step.num}</div>
              <div style={{ fontSize: 20, color: '#E3E5D3', lineHeight: 1.6 }}>{step.text}</div>
            </div>
          ))}

          <div style={{
            marginTop: 16, padding: 18, borderRadius: 16,
            background: 'rgba(114,109,45,0.15)', border: '1px solid rgba(114,109,45,0.3)',
            textAlign: 'center', width: '100%',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#E3E5D3', fontFamily: FONT, fontStyle: 'italic', lineHeight: 1.5 }}>
              "No puedo controlar lo que pasa.<br/>Pero puedo elegir cómo respondo.<br/>Y hoy elijo la paz."
            </div>
          </div>
        </>}

      </div>

      {/* Líneas de crisis: fijas abajo en todas las pantallas de la Ayuda */}
      {panicOrigen !== 'pausa' && (
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px 12px', flexWrap: 'wrap',
          padding: '8px 16px calc(8px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(20,24,51,0.92)', textAlign: 'center',
        }}>
          <span style={{ fontSize: 15, color: '#D6BFDD' }}>Si sientes que tu vida está en riesgo:</span>
          <a href="tel:106" style={{
            display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 18px', borderRadius: 22,
            background: '#D6BFDD', color: '#141833', fontWeight: 700, fontSize: 17, textDecoration: 'none',
          }}>
            📞 Línea 106 — Atención en crisis
          </a>
          <a href="tel:123" style={{
            display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 18px', borderRadius: 22,
            background: 'white', color: '#141833', fontWeight: 700, fontSize: 17, textDecoration: 'none',
          }}>
            🚨 123 — Emergencias
          </a>
        </div>
      )}
    </div>
  )

  /* ── Auth loading ── (pantallaCarga, arriba)
     También mientras los datos de este dispositivo son de otra cuenta (no se
     muestra nada de ella mientras se apartan y la app se recarga, perfil-1)
     y mientras se leen sus autorizaciones de la nube (hasta 6 s; recién
     creada la cuenta y sin respuesta, un intento más). Ayuda y las líneas de
     crisis están a mano también aquí. */
  /* Toda pantalla devuelve la misma forma: <>{pantalla}{panicModal}</>, con
     la Ayuda siempre en el segundo lugar. Así, si la pantalla cambia con la
     Ayuda abierta (termina "Cargando...", se cierra la sesión), React
     conserva el mismo diálogo: sigue abierto, con la respiración corriendo y
     el teclado adentro. Lo de atrás queda inerte mientras está abierta. */
  const conAyuda = (pantalla) => <>{pantalla}{panicModal}</>

  if (pantallaCarga) {
    return conAyuda(
        <div inert={showPanic} style={{
          maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT, position: 'relative', padding: '0 16px',
        }}>
          <button id="boton-ayuda" type="button" onClick={() => abrirAyuda('cargando')} style={{
            position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 10px)', right: 12,
            background: 'none', border: 'none', cursor: 'pointer', padding: '12px 10px', minHeight: 44,
            color: C.morado, fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'inherit',
          }}>{BOTON_AYUDA}</button>
          <div style={{
            width: 50, height: 50, borderRadius: '50%', border: '3px solid #726D2D',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#726D2D' }} />
          </div>
          <div role="status" style={{ fontSize: 20, color: C.muted, fontWeight: 600 }}>Cargando...</div>
          <p style={{ margin: '28px auto 0', maxWidth: 320, fontSize: 14, color: C.subtle, lineHeight: 1.5, textAlign: 'center', fontStyle: 'italic' }}>
            Si estás en crisis, llama a la <LineaCrisis numero="106">Línea 106</LineaCrisis>, o al <LineaCrisis numero="123">123</LineaCrisis> si estás en peligro inmediato.
          </p>
        </div>
    )
  }

  /* ── Contraseña nueva: llegó desde el enlace de "¿Olvidaste tu contraseña?" ──
     Como al crear la cuenta o entrar: Ayuda arriba y las líneas de crisis abajo. */
  if (isConfigured && user && recovering) {
    return conAyuda(
      <AuthScreen
        modoInicial="nueva"
        onUpdatePassword={updatePassword}
        onPasswordUpdated={() => {
          clearRecovering()
          setAppModal({ type: 'success', title: 'Tu contraseña quedó lista', body: 'Desde ahora entras con tu contraseña nueva.' })
        }}
        onCancel={clearRecovering}
        onAyuda={() => abrirAyuda('cuenta')}
        inerte={showPanic}
      />
    )
  }

  /* ── Auth screen (only if Supabase is configured and no user) ──
     También es donde termina «Rechazar la autorización» → «Cerrar sesión». */
  if (isConfigured && !user) {
    return conAyuda(
      <AuthScreen
        onSignInEmail={signInWithEmail}
        onSignUp={signUp}
        onResetPassword={resetPassword}
        onAyuda={() => abrirAyuda('cuenta')}
        inerte={showPanic}
      />
    )
  }

  /* ── Onboarding screen ── (después de las autorizaciones, más abajo)
     Sin botón de Ayuda propio, pero si llega con la Ayuda abierta (desde
     "Cargando..."), la Ayuda sigue encima y esto queda inerte. */
  if (!onboarded && !pideAutorizacion) {
    const ultimoPaso = onboardStep === onboardSlides.length - 1
    return conAyuda(
      <div inert={showPanic} style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream, fontFamily: FONT }}>
        {onboardSlides[onboardStep]}

        {/* Dots + Navigation. Barra de ancho completo con fondo propio: lo que
            pasa por debajo queda tapado en vez de encimarse con los puntos y
            los botones, y ningún toque se pierde en algo que sí se ve
            (bienvenida-1, bienvenida-2). El padding inferior de
            onboardStepShell deja subir con scroll todo el contenido. */}
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 10,
          maxWidth: 600, margin: '0 auto', padding: '16px 16px 40px',
          background: C.cream,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          {/* Dots */}
          <div role="img" aria-label={`Paso ${onboardStep + 1} de ${onboardSlides.length}`} style={{ display: 'flex', gap: 8 }}>
            {onboardSlides.map((_, i) => (
              <div key={i} style={{
                width: onboardStep === i ? 24 : 8, height: 8, borderRadius: 4,
                background: onboardStep === i ? C.gold : C.contorno,
                transition: 'all 0.3s',
              }} />
            ))}
          </div>

          {/* Buttons. En el último paso Siguiente pasa a ser "Comenzar mi
              Ronda" y Atrás se queda, para corregir el nombre o los hábitos
              antes de crearlos (bienvenida-7). Ahí los botones van más
              compactos para caber lado a lado en un teléfono de 360px. */}
          <div style={{ display: 'flex', gap: ultimoPaso ? 10 : 16, maxWidth: '100%' }}>
            {onboardStep > 0 && (
              <button onClick={() => irAPasoOnboard(onboardStep - 1)} style={{
                padding: ultimoPaso ? '12px 14px' : '12px 28px', borderRadius: 25, border: `2px solid ${C.contorno}`,
                background: C.card, color: C.muted, fontSize: 19, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}>
                Atrás
              </button>
            )}
            {/* A 320 px "Comenzar mi Ronda" cabe en una línea al lado de Atrás
                (antes se partía en dos y la barra crecía). */}
            <button onClick={ultimoPaso ? finishOnboarding : () => irAPasoOnboard(onboardStep + 1)} style={{
              padding: ultimoPaso ? '12px 16px' : '12px 32px', borderRadius: 25, border: 'none',
              background: ultimoPaso ? `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` : `${C.teal}`,
              color: 'white', fontSize: ultimoPaso ? 'clamp(16px, 5vw, 18px)' : 19, fontWeight: 800, whiteSpace: 'nowrap',
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 12px rgba(20,24,51,0.3)',
            }}>
              {ultimoPaso ? 'Comenzar mi Ronda' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Modal overlay style ── */
  const modalOverlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(20,24,51,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, animation: 'fadeIn 0.3s ease',
  }
  const modalCard = {
    background: C.card, borderRadius: 24, padding: '28px 20px', width: '100%', maxWidth: 420,
    maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(20,24,51,0.3)',
    WebkitOverflowScrolling: 'touch',
  }

  /* Arriba de cada check-in: la Ayuda siempre a mano y "Más tarde" para
     cerrarlo sin darlo por hecho. */
  const botonCheckinSecundario = {
    minHeight: 44, padding: '0 10px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, fontWeight: 600, fontFamily: 'inherit',
  }
  // Si ya escribió o eligió algo, "Ayuda" no cierra el check-in: se esconde
  // mientras la Ayuda está abierta y vuelve con lo suyo al cerrarla (y el día
  // no cambia debajo, ver checkinEnCurso). Sin nada, se cierra por esta sesión.
  const checkinConAlgo = !!morningIntention.trim() || !!nightReflection.trim() || nightMood !== null
  const barraCheckin = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '-14px -10px 4px' }}>
      <button type="button" onClick={() => { if (!checkinConAlgo) posponerCheckin(); abrirAyuda('checkin') }} style={{ ...botonCheckinSecundario, color: C.morado, textDecoration: 'underline' }}>
        Ayuda
      </button>
      <button type="button" onClick={posponerCheckin} style={{ ...botonCheckinSecundario, color: C.muted }}>
        Más tarde
      </button>
    </div>
  )

  /* ── Morning Modal ── */
  const morningModal = showMorningCheckin && (
    <div style={modalOverlay} onClick={posponerCheckin}>
      <div ref={morningRef} role="dialog" aria-modal="true" aria-labelledby="checkin-manana-titulo" tabIndex={-1}
        onClick={e => e.stopPropagation()} style={{ ...modalCard, outline: 'none' }}>
        {barraCheckin}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 8, color: C.gold }}>●</div>
          <div id="checkin-manana-titulo" style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: FONT, lineHeight: 1.3 }}>
            {nombrePerfil ? `${nombrePerfil}, ${getGreeting(currentHour).toLowerCase()}` : getGreeting(currentHour)}
          </div>
          <div style={{ fontSize: 19, color: C.muted, marginTop: 4 }}>Define tu intención y activa tus hábitos</div>
        </div>

        {/* Intention FIRST — compact */}
        <textarea
          value={morningIntention}
          onChange={e => setMorningIntention(e.target.value)}
          placeholder="Hoy quiero..."
          aria-label="Tu intención para hoy"
          rows={2}
          style={{
            width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${C.border}`,
            fontSize: 19, fontFamily: 'inherit', resize: 'none', outline: 'none', lineHeight: 1.5,
            boxSizing: 'border-box', background: C.cream, marginBottom: 12,
          }}
        />

        {/* CTA — Comenzar mi día — VISIBLE RIGHT AWAY */}
        <button onClick={completeMorningCheckin} style={{
          width: '100%', padding: 16, borderRadius: 16, border: 'none',
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
          color: 'white', fontSize: 19, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 6px 20px rgba(114,109,45,0.35)', letterSpacing: '0.02em', marginBottom: 16,
        }}>
          Comenzar mi Ronda
        </button>

        {/* Habits — below CTA, scrollable */}
        <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Mis hábitos de hoy
        </div>
        {habits.length === 0 ? (
          <button type="button" onClick={() => { posponerCheckin(); openModule('ahora', 'habitos') }} style={{
            width: '100%', padding: '14px', borderRadius: 14, border: `1.5px dashed ${C.contorno}`,
            background: C.cream, color: C.rose, fontSize: 18, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
          }}>
            + Escoger mis hábitos
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {habits.slice(0, 6).map(h => {
              const dim = DIMS[h.dim]
              return (
                <button type="button" role="checkbox" aria-checked={!!checked[h.id]} key={h.id} onClick={() => toggleHabit(h.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  background: checked[h.id] ? `${C.green}12` : C.cream, borderRadius: 10,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: checked[h.id] ? `1px solid ${C.green}40` : `1px solid ${C.border}`,
                  width: '100%', margin: 0, textAlign: 'left', fontFamily: 'inherit', color: 'inherit',
                }}>
                  <span aria-hidden="true" style={{
                    width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked[h.id] ? C.green : dim.color}`,
                    background: checked[h.id] ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 18, fontWeight: 700, flexShrink: 0,
                  }}>
                    {checked[h.id] && UI_ICONS.check('white', 13)}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: checked[h.id] ? C.subtle : C.text, flex: 1, minWidth: 0, overflowWrap: 'anywhere',
                    textDecoration: checked[h.id] ? 'line-through' : 'none' }}>
                    {h.name}
                  </span>
                </button>
              )
            })}
            {habits.length > 6 && (
              <button type="button" style={{ fontSize: 17, color: C.teal, fontWeight: 600, textAlign: 'center', padding: 4, minHeight: 44, cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}
                onClick={() => { posponerCheckin(); openModule('ahora', 'habitos') }}>
                Ver todos mis hábitos ({habits.length}) →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  /* ── Night Modal ── */
  const nightModal = showNightCheckin && (
    <div style={modalOverlay} onClick={posponerCheckin}>
      <div ref={nightRef} role="dialog" aria-modal="true" aria-labelledby="checkin-noche-titulo" tabIndex={-1}
        onClick={e => e.stopPropagation()} style={{ ...modalCard, outline: 'none' }}>
        {barraCheckin}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div aria-hidden="true" style={{ fontSize: 36, marginBottom: 10, color: '#141833' }}>●</div>
          <div id="checkin-noche-titulo" style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: FONT, lineHeight: 1.3 }}>
            {nombrePerfil ? `${nombrePerfil}, ¿cómo te fue hoy?` : '¿Cómo te fue hoy?'}
          </div>
          <div style={{ fontSize: 20, color: C.muted, marginTop: 6 }}>Revisa tu día y cierra con una reflexión</div>
        </div>

        {/* Summary */}
        <div style={{ background: C.cream, borderRadius: 16, padding: '18px 14px', marginBottom: 18 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.roseDark, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Resumen del día
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
            <div style={{ textAlign: 'center', minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.rose }}>{totalDone}</div>
              <div style={{ fontSize: 'clamp(11px, 3.6vw, 14px)', color: C.muted, fontWeight: 600, lineHeight: 1.2 }}>completados</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.subtle }}>{totalHabits - totalDone}</div>
              <div style={{ fontSize: 'clamp(11px, 3.6vw, 14px)', color: C.muted, fontWeight: 600, lineHeight: 1.2 }}>pendientes</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.gold }}>{totalHabits > 0 ? Math.round((totalDone / totalHabits) * 100) : 0}%</div>
              <div style={{ fontSize: 'clamp(11px, 3.6vw, 14px)', color: C.muted, fontWeight: 600, lineHeight: 1.2 }}>progreso</div>
            </div>
          </div>
          {/* Uncompleted habits */}
          {habits.filter(h => !checked[h.id]).length > 0 && (
            <div>
              <div style={{ fontSize: 20, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Puedes completar aún:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {habits.filter(h => !checked[h.id]).map(h => (
                  <button type="button" role="checkbox" aria-checked={!!checked[h.id]} key={h.id} onClick={(e) => {
                    // Marcada, la fila sale de la lista: el foco pasa a la
                    // siguiente (o a la anterior) y no cae fuera del diálogo.
                    const fila = e.currentTarget
                    const otra = fila.nextElementSibling || fila.previousElementSibling
                    toggleHabit(h.id)
                    setTimeout(() => {
                      if (fila.isConnected) return
                      ;(otra?.isConnected ? otra : nightRef.current)?.focus({ preventScroll: true })
                    }, 0)
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    background: C.card, borderRadius: 10, cursor: 'pointer', border: `1px solid ${C.border}`,
                    width: '100%', margin: 0, textAlign: 'left', fontFamily: 'inherit', color: 'inherit',
                  }}>
                    <span aria-hidden="true" style={{
                      width: 18, height: 18, borderRadius: 5, border: `2px solid ${DIMS[h.dim].color}`,
                      background: 'transparent', flexShrink: 0,
                    }} />
                    {/* El ícono va aparte: con un nombre largo sin espacios no queda solo en una línea */}
                    <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0 }}>{ICONS[DIMS[h.dim].icon](DIMS[h.dim].color, 14)}</span>
                    <span style={{ fontSize: 19, color: C.text, fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{h.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mood */}
        <div style={{ fontSize: 20, fontWeight: 700, color: C.roseDark, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, textAlign: 'center' }}>
          ¿Cómo te sientes?
        </div>
        <div role="group" aria-label="¿Cómo te sientes?" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 2, marginBottom: 18 }}>
          {MOOD_ICONS.map((icon, i) => (
            <button key={i} type="button" aria-pressed={nightMood === i} onClick={() => setNightMood(i)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer', minWidth: 0,
              padding: '4px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'inherit',
            }}>
              {/* Solo crece la carita: el botón no se sale de su columna */}
              <span style={{ display: 'inline-flex', transition: 'transform 0.15s', transform: nightMood === i ? 'scale(1.15)' : 'none' }}>
                {icon(36, nightMood === i)}
              </span>
              <span style={{ fontSize: 'clamp(12px, 3.75vw, 14px)', fontWeight: nightMood === i ? 800 : 700, color: MOOD_COLORS[i], marginTop: 4, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{MOOD_LABELS[i]}</span>
            </button>
          ))}
        </div>

        {/* Reflection */}
        <textarea
          value={nightReflection}
          onChange={e => setNightReflection(e.target.value)}
          placeholder="¿Qué aprendiste hoy? ¿Qué agradeces?"
          aria-label="Tu reflexión de hoy"
          style={{
            width: '100%', minHeight: 80, padding: 12, borderRadius: 12, border: `1px solid ${C.border}`,
            fontSize: 19, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.5,
            boxSizing: 'border-box', background: C.cream,
          }}
        />

        <button onClick={completeNightCheckin} style={{
          marginTop: 16, width: '100%', padding: 16, borderRadius: 16, border: 'none',
          background: `linear-gradient(135deg, ${C.roseDark}, ${C.rose})`,
          color: 'white', fontSize: 19, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 6px 20px rgba(62,22,49,0.35)', letterSpacing: '0.02em',
        }}>
          Cerrar mi día
        </button>
      </div>
    </div>
  )

  /* ── Autorizaciones: el aviso único o «Lo íntimo es tuyo» ──
     Antes de la bienvenida y de todo lo demás, y sin cerrarse hasta que
     responda. Ayuda queda arriba y abre encima, como en toda la app. */
  if (pideAutorizacion) {
    return conAyuda(
        <PantallaAutorizacion
          key={pideAutorizacion}
          modo={pideAutorizacion}
          inerte={showPanic}
          onAyuda={() => abrirAyuda('autorizacion')}
          onResponder={(respuestas) => {
            // «Lo íntimo es tuyo» es parte del registro solo si viene justo
            // después de crear la cuenta; en otro ingreso es un aviso único.
            responderAutorizacion(respuestas, pideAutorizacion === 'aviso' ? 'aviso-unico' : (autorizaciones?.canalIntimo === 'registro' ? 'registro' : 'aviso-unico'))
            enfocarPantallaNueva()
          }}
          onCerrarSesion={isConfigured && user ? rechazarYCerrarSesion : null}
        />
    )
  }

  /* ── Render: telón morado arriba, hoja clara redondeada con el contenido ──
     La Ayuda va fuera de esta raíz (conAyuda): es position: fixed y la raíz
     no crea un contexto de apilamiento, así que se ve igual. */
  return conAyuda(
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.morado, fontFamily: FONT }}>
      {header}
      <main inert={fondoInerte} style={{
        background: C.hoja, borderRadius: '24px 24px 0 0',
        // La hoja llena lo que deja el encabezado (124 px + la muesca): con
        // 110 px toda pantalla corta tenía 14 px de scroll sobrante.
        minHeight: 'calc(100vh - 124px - env(safe-area-inset-top, 0px))',
        padding: isMobile ? '24px 16px 110px' : '28px 24px 110px',
      }}>
        {view === 'rondas' && (
          <RondasView
            user={user}
            onIrAdentro={() => empezarRespiracion('afuera')}
          />
        )}

        {view === 'ahora' && <>
          {!subTab && adentroView}
          {subTab === 'habitos' && habitosView}
          {subTab === 'rutina' && rutinaView}
          {subTab === 'diario' && diarioView}
          {subTab === 'toolkit' && toolkitView}
          {subTab === 'programas' && programasView}
          {subTab === 'ai' && (isPremium ? (iaOk ? aiAgentView : (
            <TarjetaIA idBase="ia-tu-ronda"
              onAutorizar={() => {
                responderAutorizacion({ ia: true }, 'al-usar')
                // La tarjeta se va: el foco pasa al modo activo de Tu Ronda.
                requestAnimationFrame(() => document.querySelector('[aria-label="Modo de Tu Ronda"] [aria-pressed="true"]')?.focus({ preventScroll: true }))
              }}
              onAhoraNo={() => {
                irASubTab('')
                // El foco vuelve a «Pregúntale», traído al centro: abajo lo tapaba el menú fijo.
                enfocarDespues('acceso-ai', { centrar: true })
              }}
              onAyuda={() => abrirAyuda('crisis_tarjeta_ia')} />
          )) : <Paywall feature="Tu Ronda · IA personal" price={PLAN_PRECIO} desc="Tu compañera de bienestar 24/7. Recuerda quién eres, te acompaña, te orienta y crea programas personalizados solo para ti." onCta={() => setAppModal({ type: 'info', title: 'Próximamente', body: `Estamos finalizando el sistema de pago para ${PLAN_PAGO}. Te avisaremos cuando esté listo. 💛`, cta: 'Entendido' })} />)}
        </>}

        {view === 'juntas' && <>
          <h1 style={{ margin: '0 0 8px', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 36, lineHeight: 1.02, color: C.navy }}>
            Juntas
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.5, color: C.muted }}>
            Pregunta de forma anónima en la Comunidad o encuentra acompañamiento.
          </p>
          <SubTabs
            tabs={[
              { id: 'board', label: 'Comunidad' },
              { id: 'directorio', label: 'Acompañamiento' },
            ]}
            active={subTab || 'board'}
            onChange={irASubTab}
            label="Juntas"
            idBase="juntas"
          />
          <div role="tabpanel" id="juntas-panel" aria-labelledby={`juntas-tab-${subTab || 'board'}`}>
            {(subTab || 'board') === 'board' && boardView}
            {subTab === 'directorio' && directorioView}
          </div>
        </>}

        {view === 'perfil' && perfilView}

        <p style={{ margin: '32px 0 0', fontSize: 12, color: C.subtle, lineHeight: 1.5, textAlign: 'center', fontStyle: 'italic' }}>
          Ronda ofrece herramientas de bienestar y contenido educativo. Para atención médica o psicológica, acude a una profesional. Si estás en crisis, llama a la <LineaCrisis numero="106">Línea 106</LineaCrisis>, o al <LineaCrisis numero="123">123</LineaCrisis> si estás en peligro inmediato.
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 13, textAlign: 'center' }}>
          <EnlacePolitica style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 4px', fontWeight: 600 }}>Cómo cuidamos tus datos</EnlacePolitica>
        </p>
      </main>
      {bottomNav}
      {morningModal}
      {nightModal}

      {/* ─── Modal de la marca (reemplaza alert nativo del navegador) ─── */}
      {appModal && (
        <div onClick={() => setAppModal(null)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(20,24,51, 0.55)', backdropFilter: 'blur(4px)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, animation: 'fadeIn 0.2s ease',
        }}>
          <div ref={appModalRef} role="dialog" aria-modal="true" aria-labelledby="app-modal-titulo" aria-describedby="app-modal-cuerpo"
            onClick={e => e.stopPropagation()} style={{
            background: C.cream, borderRadius: 24, padding: '32px 28px 24px',
            maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            border: `1px solid ${C.border}`, position: 'relative',
          }}>
            {/* Decorative top accent */}
            <div aria-hidden="true" style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translate(-50%, -50%)',
              width: 52, height: 52, borderRadius: 16,
              background: appModal.type === 'success'
                ? `linear-gradient(135deg, ${C.gold}, ${C.rose})`
                : appModal.type === 'paywall'
                ? `linear-gradient(135deg, ${C.teal}, ${C.gold})`
                : appModal.type === 'confirm'
                ? `linear-gradient(135deg, ${C.rose}, ${C.roseDark})`
                : `linear-gradient(135deg, ${C.teal}, #141833)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, color: 'white', fontWeight: 800,
              boxShadow: '0 8px 20px rgba(20,24,51,0.3)',
            }}>
              {appModal.type === 'success' ? '✓' : appModal.type === 'paywall' ? '✦' : appModal.type === 'confirm' ? '!' : 'i'}
            </div>

            <div id="app-modal-titulo" style={{ marginTop: 20, fontSize: 22, fontWeight: 800, color: C.text,
                          fontFamily: FONT,
                          textAlign: 'center', marginBottom: 12, lineHeight: 1.3 }}>
              {appModal.title}
            </div>

            <div id="app-modal-cuerpo" style={{ fontSize: 16, color: C.muted, lineHeight: 1.6,
                          textAlign: 'center', marginBottom: 24 }}>
              {appModal.body}
            </div>

            {/* La salida a Ayuda y a las líneas, también en el aviso de pago
                (el de la Comunidad, donde ella ya escribió algo). Si la pide
                desde aquí, Ayuda abre como ante una crisis: "Aquí estamos contigo." y
                el 123, no "Estás a salvo.". */}
            {appModal.ayuda && (
              <SalidaAyuda style={{ marginTop: -8, marginBottom: 20 }}
                onAbrir={() => { setAppModal(null); abrirAyuda('crisis_aviso_pago') }} />
            )}

            {/* En 'confirm' el foco empieza en "Cancelar": Enter no borra por accidente */}
            <button type="button" data-autofocus={appModal.type === 'confirm' ? undefined : true} onClick={() => {
              if (appModal.type === 'paywall') {
                track('paywall_cta_clicked', { title: appModal.title })
                openModule('perfil')
                // Los planes están en "Yo soy Ronda", más abajo en Perfil (en el
                // celular no se ven al abrir): se baja hasta ahí, bajo el
                // encabezado fijo, y el foco pasa a su título.
                focoTrasModalRef.current = () => document.getElementById('perfil-planes-titulo')
                requestAnimationFrame(() => {
                  const tarjeta = document.getElementById('perfil-planes')
                  if (!tarjeta) return
                  const alto = document.querySelector('header')?.offsetHeight || 0
                  window.scrollTo({ top: tarjeta.getBoundingClientRect().top + window.scrollY - alto - 12, behavior: 'instant' })
                })
              }
              if (appModal.type === 'confirm') appModal.onConfirm?.()
              setAppModal(null)
            }} style={{
              width: '100%', padding: '14px 24px', borderRadius: 14, border: 'none',
              background: appModal.type === 'paywall'
                ? `linear-gradient(135deg, ${C.teal}, ${C.gold})`
                : C.teal,
              color: 'white', fontSize: 17, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.02em',
              boxShadow: '0 4px 16px rgba(20,24,51,0.35)',
            }}>
              {appModal.cta || 'Listo'}
            </button>
            {/* El aviso de pago siempre se puede cerrar sin ir a los planes */}
            {appModal.type === 'paywall' && (
              <button onClick={() => setAppModal(null)} style={{
                width: '100%', minHeight: 44, marginTop: 8, background: 'none', border: 'none',
                color: C.muted, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Más tarde
              </button>
            )}
            {appModal.type === 'confirm' && (
              <button type="button" data-autofocus onClick={() => setAppModal(null)} style={{
                width: '100%', minHeight: 44, marginTop: 8, background: 'none', border: 'none',
                color: C.muted, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {/* El aviso de miembro fundadora se ve en su pantalla (avisoFundadora);
          esta región, siempre montada, lo anuncia al lector de pantalla. */}
      <div role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>
        {foundingToast ? `Miembro fundadora. ${foundingToast.feature}. ${TEXTO_FUNDADORA}` : ''}
      </div>
    </div>
  )
}

export default App
