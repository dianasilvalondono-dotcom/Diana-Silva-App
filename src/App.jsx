import { useState, useEffect, useMemo, useRef } from 'react'
import './App.css'
import { C, colorTexto } from './constants/colors'
import { FONT, FONT_DISPLAY, SHADOW } from './constants/tokens'
import { ICONS, MOOD_ICONS, UI_ICONS } from './constants/icons'
import Badge from './components/ui/Badge'
import LineaCrisis from './components/ui/LineaCrisis'
import HistoriaView from './components/views/HistoriaView'
import DiarioView from './components/views/DiarioView'
import RondasView from './components/views/RondasView'
import { TEMPORADA, temporadaVigente, mesTemporada, CIUDAD_KEY, CIUDAD_POR_DEFECTO, ciudadValida } from './constants/curaduria'
import {
  DIMS, DEFAULT_HABITS, DEFAULT_MORNING, DEFAULT_MIDDAY, DEFAULT_NIGHT,
  TOOLKIT_CATS, PROGRAMAS, PROGRAMAS_PREMIUM, SUGGESTED_HABITS,
  AVATARS, PLAN_PAGO, PLAN_PRECIO,
} from './constants/data'
import { todayKey, dateKey, load, save, saveDay, limpiarDiasVacios, leerHistorialHabitos, rachaHabito, horaAMinutos, horaValida, horaHHMM, ordenarPorHora, formatRelative, franjaDelDia, getGreeting, MOODS, MOOD_LABELS, MOOD_COLORS, runMigrationCleanDianaDefaults, asegurarDuenaLocal, duenaLocal, guardadoEstaBloqueado, safeKeys, STORAGE_ERROR_EVENT } from './utils/helpers'

// Migration corre UNA VEZ por dispositivo, antes de que React inicialice estados.
// Limpia los hábitos/rutinas que eran de Diana — respeta lo que cada usuaria agregó.
runMigrationCleanDianaDefaults()
// Borra las claves diarias vacías que dejaban las versiones anteriores.
limpiarDiasVacios()
import { useAuth } from './lib/useAuth'
import { useNotifications } from './lib/useNotifications'
import { track, identifyUser, setUserProps, resetAnalytics } from './lib/analytics'
import { useOneSignal } from './lib/useOneSignal'
import { useSpeech } from './lib/useSpeech'
import { useDialog } from './lib/useDialog'
import AuthScreen from './components/AuthScreen'
import { syncFromLocal, getUserProfile, saveUserProfile, getToolkitItems, saveToolkitItems, CAMPOS_PERFIL } from './lib/database'
import { isCrisis, CRISIS_TEXT, CRISIS_TEXT_CHAT, CHAT_ERROR_TEXT, BOTON_AYUDA } from './utils/crisis'

// Largo máximo de una publicación en la Comunidad (api/guia.js valida lo mismo).
const BOARD_MAX = 2000

/* ── Reusable components ── */
function Bar({ value, color = C.rose, height = 6 }) {
  return (
    <div style={{ height, background: C.border, borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: height, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function DimCard({ dim, done, total, onClick }) {
  const d = DIMS[dim]
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div onClick={onClick} style={{
      background: C.card, borderRadius: 14, padding: 14, boxShadow: SHADOW.sm,
      borderLeft: `3px solid ${d.color}`, flex: '1 1 140px', minWidth: 140, cursor: 'pointer',
      transition: 'transform 0.15s', ':hover': { transform: 'translateY(-2px)' },
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 19, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ICONS[d.icon] ? ICONS[d.icon](d.color, 16) : ''} {d.label}</span>
        <span style={{ fontSize: 20, fontWeight: 900, color: d.color }}>{pct}%</span>
      </div>
      <Bar value={pct} color={d.color} />
      <div style={{ fontSize: 20, color: C.subtle, marginTop: 4 }}>{done}/{total} completados</div>
    </div>
  )
}

/* ── Bottom Nav Item ── */
function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer',
      color: active ? C.rose : C.subtle, fontFamily: 'inherit', flex: 1,
      transition: 'color 0.15s',
    }}>
      <span style={{ fontSize: 26, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 20, fontWeight: active ? 800 : 600, letterSpacing: '0.02em' }}>{label}</span>
      {active && <div style={{ width: 5, height: 5, borderRadius: 3, background: C.rose, marginTop: 2 }} />}
    </button>
  )
}

/* ── Sub-tab navigation (pill style) ──
   A nivel de módulo: si se declarara dentro de App, cada render crearía un
   componente nuevo y React desmontaría los botones (el foco se iría a <body>). */
const TAB_COLORS = [C.teal, C.coral, C.lavanda, C.gold, C.rose, C.mint]
function SubTabs({ tabs, active, onChange, accentColor }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      {tabs.map((t, i) => {
        const color = accentColor || TAB_COLORS[i % TAB_COLORS.length]
        return (
        <button key={t.id} type="button" role="tab" aria-selected={active === t.id} onClick={() => onChange(t.id)} style={{
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
      <div style={{ fontSize: 20, color: C.subtle, marginBottom: 20 }}>Cancela cuando quieras</div>
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

/* ¿La usuaria está escribiendo? (el foco está en un campo de texto) */
function escribiendo() {
  const el = document.activeElement
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
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
  useNotifications()

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
  const ADMIN_EMAILS = ['dianasilva.londono@gmail.com']
  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase())

  // Premium status from Supabase (founding members + paid subscribers)
  const [premiumStatus, setPremiumStatus] = useState({ is_premium: false, premium_until: null, premium_source: null })
  useEffect(() => {
    if (!user) { setPremiumStatus({ is_premium: false, premium_until: null, premium_source: null }); return }
    // Vincular analítica a la usuaria (base de la retención D1/D7/D30).
    identifyUser(user.id)
    track('app_opened')
    let cancelled = false
    getUserProfile(user.id).then(profile => {
      if (cancelled || !profile) return
      const stillValid = profile.premium_until && new Date(profile.premium_until) > new Date()
      const status = {
        is_premium: !!(profile.is_premium && stillValid),
        premium_until: profile.premium_until,
        premium_source: profile.premium_source,
      }
      setPremiumStatus(status)
      setUserProps({
        is_premium: status.is_premium,
        premium_source: status.premium_source || 'free',
        is_founding_member: status.premium_source === 'founding_member',
      })
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
  const { status: osStatus, setExternalUserId: osSetExternalUserId, setEmail: osSetEmail } = oneSignal
  // Vincular el user.id de Supabase con la suscripción de OneSignal
  // (permite mandar push targeted a usuarias específicas)
  useEffect(() => {
    if (osStatus === 'subscribed' && user?.id) {
      osSetExternalUserId(user.id)
      if (user.email) osSetEmail(user.email)
    }
  }, [osStatus, user, osSetExternalUserId, osSetEmail])

  // ─── Modal genérico de la marca (reemplaza alert() feo del navegador) ───
  // { type: 'success'|'info'|'paywall'|'confirm', title, body, cta, onConfirm }
  // 'confirm' pide un sí antes de borrar: el CTA ejecuta onConfirm; "Cancelar",
  // Escape o tocar el fondo lo cierran sin hacer nada.
  const [appModal, setAppModal] = useState(null)
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

  // ─── Toast "feature premium gratis para founding member" — solo 1 vez por feature ───
  const [foundingMsgShown, setFoundingMsgShown] = useState(() => load('ronda-founding-msg-shown', {}))
  const [foundingToast, setFoundingToast] = useState(null) // { feature: 'Tu Ronda' }

  // Se llama desde handlers (nunca en el render).
  const showFoundingPerk = (featureKey, featureName) => {
    if (!isFoundingMember) return
    if (foundingMsgShown[featureKey]) return
    const next = { ...foundingMsgShown, [featureKey]: true }
    setFoundingMsgShown(next)
    save('ronda-founding-msg-shown', next)
    setFoundingToast({ feature: featureName, key: featureKey })
  }

  // AI Agent state
  const [aiGoal, setAiGoal] = useState('')
  const [aiContext, setAiContext] = useState('')
  const [aiStep, setAiStep] = useState(0) // 0=meta, 1=contexto (y error), 3=creando, 4=resultado
  const [aiProgram, setAiProgram] = useState(null)
  const [aiError, setAiError] = useState('')
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
  // Voz de Tu Ronda. Si /api/speak no está configurado, available queda en false
  // y el botón no se muestra. Si falla, errorId marca el mensaje por un momento.
  // El hook vive en App (no se desmonta): al salir del chat se llama stopSpeech.
  const { speak, stop: stopSpeech, speakingId, loadingId: speechLoadingId, errorId: speechErrorId, available: voiceAvailable } = useSpeech()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Día al que pertenecen los estados diarios (hábitos, rutina, check-ins,
  // tareas). Se fija al montar: si cambia el día con la app abierta, lo de
  // ayer se sigue guardando en la clave de ayer y nunca se copia a hoy.
  const [diaApp] = useState(todayKey)

  // Habits
  const [habits, setHabits] = useState(() => load('diana-habits', []))
  const [checked, setChecked] = useState(() => load(`diana-checked-${diaApp}`, {}))
  // Días anteriores con hábitos marcados ({ 'AAAA-MM-DD': { id: true } }). Se
  // lee una sola vez: durante la sesión solo cambia hoy, que sale de `checked`.
  const [historialPrevio] = useState(() => {
    const h = leerHistorialHabitos()
    delete h[diaApp]
    return h
  })

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
  const [ayerApp] = useState(() => dateKey(-1))
  const [plannedToday, setPlannedToday] = useState(() => load(`ronda-tomorrow-${ayerApp}`, []))
  const [newTomorrowTask, setNewTomorrowTask] = useState('')

  // Journal
  const [entries, setEntries] = useState(() => load('diana-journal', []))
  const [journalText, setJournalText] = useState('')
  const [journalMood, setJournalMood] = useState(2)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  // Quotes
  // Solo lectura: se conserva lo guardado y se muestra en el perfil.
  const [favQuotes] = useState(() => load('diana-fav-quotes', []))

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
  // "Ahora no": oculta el check-in en esta sesión sin darlo por hecho.
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
  const [newHabitDim, setNewHabitDim] = useState('espiritual')
  const [showAddHabit, setShowAddHabit] = useState(false)

  // Responsive
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Persist
  useEffect(() => { save('diana-habits', habits) }, [habits])
  useEffect(() => { saveDay(`diana-checked-${diaApp}`, checked) }, [checked, diaApp])
  useEffect(() => { saveDay(`diana-routine-${diaApp}`, routineChecked) }, [routineChecked, diaApp])
  useEffect(() => { save('diana-journal', entries) }, [entries])
  useEffect(() => { save('diana-fav-quotes', favQuotes) }, [favQuotes])
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
  // Depende del id y del nombre de la cuenta, no del objeto `user`: ese
  // cambia en cada carga y en cada renovación del token (perfil-2).
  const userId = user?.id || null
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
      syncFromLocal(userId)
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
    if (!userId || !isConfigured || toolkitDe !== userId) return
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
  }, [toolkitItems, userId, isConfigured, toolkitDe])

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

  // Hábitos cumplidos por día ({ 'AAAA-MM-DD': n }), de todo el historial.
  // Solo cuentan los hábitos que existen: uno borrado no pinta el calendario.
  const monthlyHistory = useMemo(() => {
    const ids = new Set(habits.map(h => String(h.id)))
    const history = {}
    Object.entries(historialHabitos).forEach(([date, data]) => {
      const doneCount = Object.entries(data || {}).filter(([id, v]) => v && ids.has(id)).length
      if (doneCount > 0) history[date] = doneCount
    })
    return history
  }, [historialHabitos, habits])

  // Texto escrito y sin guardar: una recarga lo borraría. El detector de
  // cambio de día lo lee por esta ref.
  const borradoresRef = useRef('')
  useEffect(() => {
    borradoresRef.current = [journalText, morningIntention, nightReflection, newTomorrowTask, chatInput, boardNewText].join('').trim()
  }, [journalText, morningIntention, nightReflection, newTomorrowTask, chatInput, boardNewText])

  // Cambio de día: a la medianoche local la app se recarga para empezar el
  // día nuevo, pero no mientras la usuaria escribe o tiene texto sin guardar;
  // en ese caso lo vuelve a intentar en la siguiente revisión.
  useEffect(() => {
    const revisarDia = () => {
      const now = todayKey()
      if (now === diaApp) return
      if (escribiendo() || borradoresRef.current) return
      try { localStorage.setItem('ronda-current-day', now) } catch { /* sin almacenamiento */ }
      window.location.reload()
    }
    const alVolver = () => { if (document.visibilityState === 'visible') revisarDia() }
    const intervalo = setInterval(revisarDia, 60000)
    document.addEventListener('visibilitychange', alVolver)
    try { localStorage.setItem('ronda-current-day', diaApp) } catch { /* sin almacenamiento */ }
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [diaApp])

  const toggleHabit = (id) => {
    // Si ya cambió el día, lo que hay en pantalla es de ayer: recargar en vez
    // de marcar sobre ello (salvo que haya texto sin guardar).
    if (todayKey() !== diaApp && !borradoresRef.current) { window.location.reload(); return }
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
    const willBeChecked = !routineChecked[id]
    setRoutineChecked(prev => ({ ...prev, [id]: !prev[id] }))
    // Parte del North Star: "marca hábito O completa parte de su rutina".
    if (willBeChecked) track('routine_checked')
  }

  const addRoutineItem = () => {
    if (!newRoutineTask.trim() || !horaValida(newRoutineTime)) return
    const newItem = { id: Date.now(), time: horaHHMM(newRoutineTime), task: newRoutineTask, emoji: newRoutineEmoji }
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
    const { sectionKey, id, time, task, emoji } = editingRoutineItem
    if (!horaValida(time)) return
    const updater = prev => ordenarPorHora(prev.map(i => i.id === id ? { ...i, time: horaHHMM(time), task, emoji } : i))
    if (sectionKey === 'morning') setMorning(updater)
    else if (sectionKey === 'midday') setMidday(updater)
    else setNight(updater)
    setEditingRoutineItem(null)
  }

  const addTomorrowTask = () => {
    if (!newTomorrowTask.trim()) return
    setTomorrowTasks(prev => [...prev, { id: Date.now(), task: newTomorrowTask, done: false }])
    setNewTomorrowTask('')
  }

  // Marca o desmarca una tarea en una lista de tareas (para mañana o para hoy).
  const toggleTaskIn = (setList) => (id) => {
    setList(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }
  const toggleTomorrowTask = toggleTaskIn(setTomorrowTasks)
  const togglePlannedTask = toggleTaskIn(setPlannedToday)

  const addJournalEntry = () => {
    if (!journalText.trim()) return
    const entry = { id: Date.now(), date: todayKey(), text: journalText, mood: journalMood, time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) }
    setEntries([entry, ...entries])
    // Primero se apaga el dictado: si no, el reconocedor vuelve a escribir
    // en el cuadro el texto que se acaba de guardar.
    stopVoice()
    setJournalText('')
    setJournalMood(2)
    // Sin el texto del diario: solo la senal, nunca el contenido.
    track('journal_created', { mood: journalMood })
  }

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

  const avisarDictado = (motivo) => {
    const body = motivo === 'not-allowed' || motivo === 'service-not-allowed'
      ? 'Permite el micrófono en tu navegador para dictar tu reflexión.'
      : motivo === 'audio-capture'
        ? 'No encontramos un micrófono. Revisa que esté conectado.'
        : motivo === 'network'
          ? 'Revisa tu conexión e inténtalo de nuevo.'
          : 'Inténtalo de nuevo en un momento. También puedes escribir tu reflexión.'
    setAppModal({ type: 'info', title: 'No pudimos escucharte', body, cta: 'Listo' })
  }

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setAppModal({ type: 'info', title: 'Voz no disponible', body: 'Tu navegador no soporta entrada de voz. Usa Chrome o Safari para el diario de voz.', cta: 'Listo' })
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

  const addHabit = () => {
    if (!newHabitName.trim()) return
    const id = Date.now()
    setHabits([...habits, { id, name: newHabitName.trim(), dim: newHabitDim }])
    setNewHabitName('')
    setShowAddHabit(false)
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
      onConfirm: () => removeHabit(h.id),
    })
  }

  // Empieza una ruta. Si ya estaba activa no la reinicia: conserva su avance.
  const startProgram = (progId) => {
    if (activePrograms[progId]) return
    setActivePrograms(prev => prev[progId] ? prev : { ...prev, [progId]: { startDate: todayKey(), completedDays: [] } })
    track('program_started', { program: progId })
  }
  const completeProgDay = (progId, day) => {
    setActivePrograms(prev => {
      const prog = prev[progId] || { startDate: todayKey(), completedDays: [] }
      const wasDone = prog.completedDays.includes(day)
      const completed = wasDone ? prog.completedDays.filter(d => d !== day) : [...prog.completedDays, day]
      if (!wasDone) track('program_day_completed', { program: progId, day, total_completed: completed.length })
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
    onConfirm: () => quitProgram(prog.id),
  })
  const addSuggestedHabit = (habit) => {
    const id = Date.now()
    setHabits(prev => [...prev, { id, name: habit.name, dim: habit.dim }])
  }

  const addToolkitItem = () => {
    if (!newToolName.trim()) return
    const item = {
      id: Date.now(),
      name: newToolName.trim(),
      url: newToolUrl.trim(),
      cat: newToolCat,
      note: newToolNote.trim(),
      added: todayKey(),
    }
    setToolkitItems([item, ...toolkitItems])
    setNewToolName('')
    setNewToolUrl('')
    setNewToolNote('')
    setShowAddTool(false)
  }

  const removeToolkitItem = (id) => {
    setToolkitItems(prev => prev.filter(t => t.id !== id))
  }
  const pedirBorrarRecurso = (item) => setAppModal({
    type: 'confirm',
    title: `¿Borrar "${item.name}" de tu toolkit?`,
    body: 'Después no lo podrás recuperar.',
    cta: 'Borrar recurso',
    onConfirm: () => removeToolkitItem(item.id),
  })


  const currentHour = new Date().getHours()
  const franjaActual = franjaDelDia(currentHour)
  const isMorningTime = franjaActual === 'mañana'
  // El cierre de la noche va de las 7 p. m. a la medianoche: en la madrugada
  // el día ya cambió y se gastaría el cierre de la noche siguiente.
  const isNightTime = franjaActual === 'noche' && currentHour >= 12
  const showMorningCheckin = isMorningTime && !morningDone && !checkinPospuesto && !showPanic
  const showNightCheckin = isNightTime && !nightDone && !checkinPospuesto && !showPanic

  const completeMorningCheckin = () => {
    if (morningIntention.trim()) {
      // La intención no lleva ánimo: el modal de la mañana no lo pregunta.
      const entry = {
        id: Date.now(), date: todayKey(), text: `Intención del día: ${morningIntention}`,
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
      const entry = {
        id: Date.now(), date: todayKey(),
        text: reflexion ? `Reflexión de noche: ${nightReflection}` : 'Cierre del día',
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
    // Al salir del chat, la voz de Tu Ronda se calla.
    stopSpeech()
    setView(destino)
    setSubTab(sub)
    limpiarTelon()
    track('module_viewed', { module: destino, sub: sub || null })
  }
  // Cambia de subpestaña dentro de la misma sección.
  const irASubTab = (id) => {
    stopSpeech()
    setSubTab(id)
    limpiarTelon()
  }

  const abrirAyuda = (desde = 'encabezado') => {
    setPanicOrigen('ayuda')
    setShowPanic(true); setPanicScreen('home'); setGroundStep(0); setBreatheActive(false); setBreatheCount(0); setPanicDbtExpanded(null)
    track('sos_opened', { origen: desde })
  }
  // La pausa de 2 minutos: respiración guiada, sin el menú de crisis.
  const empezarRespiracion = (origen) => {
    setPanicOrigen('pausa')
    setShowPanic(true); setPanicScreen('breathe'); setBreatheActive(true); setBreatheCount(0); setBreathePhase('inhale')
    track('pausa_iniciada', { origen })
  }
  const cerrarAyuda = () => { setShowPanic(false); setBreatheActive(false) }

  /* ── Diálogos: foco adentro, Tab atrapado, Escape cierra y el foco vuelve.
     Mientras hay uno abierto, el encabezado, el contenido y el menú quedan
     inertes (ni el teclado ni el lector de pantalla llegan ahí). ── */
  const pantallaPrincipal = !authLoading && !(isConfigured && !user) && !(isConfigured && recovering) && onboarded
  const panicRef = useRef(null)
  const morningRef = useRef(null)
  const nightRef = useRef(null)
  const appModalRef = useRef(null)
  useDialog(panicRef, showPanic && pantallaPrincipal, cerrarAyuda)
  useDialog(morningRef, showMorningCheckin && pantallaPrincipal, posponerCheckin)
  useDialog(nightRef, showNightCheckin && pantallaPrincipal, posponerCheckin)
  useDialog(appModalRef, !!appModal && pantallaPrincipal, () => setAppModal(null))
  const fondoInerte = showPanic || showMorningCheckin || showNightCheckin || !!appModal
  // Aviso de miembro fundadora: se cierra solo a los 8 s de estar a la vista.
  // Cada aviso tiene su propio temporizador: se cancela al cerrarlo con la X,
  // al llegar otro aviso o al desmontar. Mientras hay un diálogo abierto
  // (modal, Ayuda o check-in) el aviso espera sin mostrarse y el reloj no corre.
  useEffect(() => {
    if (!foundingToast || fondoInerte) return
    const t = setTimeout(() => setFoundingToast(null), 8000)
    return () => clearTimeout(t)
  }, [foundingToast, fondoInerte])
  // Cada pantalla de la Ayuda empieza arriba (el contenedor que hace scroll se reutiliza).
  useEffect(() => { if (panicRef.current) panicRef.current.scrollTop = 0 }, [panicScreen, showPanic])
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
    if (view === 'ahora' && subTab) return (
      <button onClick={() => { stopSpeech(); setSubTab('') }} style={{ ...estiloTelon, ...botonTelon, gap: 6 }}>
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
          <button onClick={() => abrirAyuda('encabezado')} style={{
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
      resetAiAgent(); setChatMode('chat')
      chatSesionContadaRef.current = false
      if (isPremium) showFoundingPerk('chat', 'Tu Ronda · IA personal')
    }
    irASubTab(id)
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
          <button key={a.id} onClick={() => abrirAcceso(a.id)} style={{
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
              const count = monthlyHistory[dateStr] || 0
              const bg = count > 0 ? (count >= totalHabits && totalHabits > 0 ? C.teal : C.teal+'40') : (isToday ? C.gold+'20' : 'transparent')
              cells.push(
                <div key={d} style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto',
                  background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: isToday ? 800 : 500,
                  color: count >= totalHabits && totalHabits > 0 ? 'white' : (count > 0 ? C.teal : (isToday ? C.gold : C.subtle)),
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
                <div key={h.id} style={{
                  background: C.card, borderRadius: 12, paddingRight: 4,
                  display: 'flex', alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: `3px solid ${checked[h.id] ? C.greenDone : cfg.color}`,
                  transition: 'all 0.15s', opacity: checked[h.id] ? 0.65 : 1,
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

      {/* Add habit */}
      {showAddHabit ? (
        <div style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: SHADOW.sm }}>
          <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 10, color: C.text }}>Nuevo hábito</div>
          <input value={newHabitName} onChange={e => setNewHabitName(e.target.value)} placeholder="Nombre del hábito..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
          />
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {Object.entries(DIMS).map(([key, d]) => (
              <button key={key} onClick={() => setNewHabitDim(key)} style={{
                padding: '5px 12px', borderRadius: 20, border: `2px solid ${d.color}`,
                background: newHabitDim === key ? d.color : 'transparent',
                color: newHabitDim === key ? 'white' : d.color,
                fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {ICONS[d.icon] ? ICONS[d.icon](d.color, 16) : ''} {d.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addHabit} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: C.rose, color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Agregar
            </button>
            <button onClick={() => setShowAddHabit(false)} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'white', fontSize: 19, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: C.muted }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddHabit(true)} style={{
          padding: 12, borderRadius: 12, border: `2px dashed ${C.contorno}`, background: 'transparent',
          color: C.rose, fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          + Agregar hábito
        </button>
      )}

      {/* Suggested habits */}
      {SUGGESTED_HABITS.filter(sh => !habits.some(h => h.name === sh.name)).length > 0 && (
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.teal, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 8 }}>
            Sugeridos para ti
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SUGGESTED_HABITS.filter(sh => !habits.some(h => h.name === sh.name)).map((sh, i) => (
              <div key={i} style={{
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
                <button onClick={() => addSuggestedHabit(sh)} aria-label={`Agregar hábito ${sh.name}`} style={{
                  padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${DIMS[sh.dim].color}`,
                  background: 'transparent', color: DIMS[sh.dim].color, fontSize: 20, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  + Agregar
                </button>
              </div>
            ))}
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
          editingRoutineItem && editingRoutineItem.id === item.id ? (
            /* Inline edit mode */
            <div key={item.id} style={{
              background: C.card, borderRadius: 12, padding: 14,
              boxShadow: '0 2px 8px rgba(20,24,51,0.15)', border: `2px solid ${C.rose}`,
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input type="time" aria-label="Hora" value={editingRoutineItem.time} onChange={e => setEditingRoutineItem(prev => ({...prev, time: e.target.value}))}
                  style={{ flexShrink: 0, padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', fontWeight: 700, color: C.gold, boxSizing: 'border-box' }} />
                <input value={editingRoutineItem.task} onChange={e => setEditingRoutineItem(prev => ({...prev, task: e.target.value}))}
                  style={{ flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit' }}
                  onKeyDown={e => e.key === 'Enter' && saveRoutineItemEdit()} />
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
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveRoutineItemEdit} disabled={!horaValida(editingRoutineItem.time)} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: horaValida(editingRoutineItem.time) ? C.rose : C.border, color: horaValida(editingRoutineItem.time) ? 'white' : C.subtle, fontSize: 19, fontWeight: 700, cursor: horaValida(editingRoutineItem.time) ? 'pointer' : 'default', fontFamily: 'inherit' }}>
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
                <button type="button" aria-label={`Editar ${item.task}`} onClick={() => setEditingRoutineItem({ sectionKey, id: item.id, time: horaHHMM(item.time), task: item.task, emoji: item.emoji })} style={{
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

  // Lista de tareas del ritual de noche (para mañana o planeadas para hoy).
  const renderTaskList = (tasks, onToggle) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {tasks.map(t => (
        <button type="button" role="checkbox" aria-checked={!!t.done} key={t.id} onClick={() => onToggle(t.id)} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: C.cream,
          borderRadius: 10, cursor: 'pointer', border: 'none', margin: 0, width: '100%', textAlign: 'left',
          fontFamily: 'inherit', color: 'inherit',
        }}>
          <span aria-hidden="true" style={{
            width: 20, height: 20, borderRadius: '50%', border: `2px solid ${t.done ? C.greenDone : C.contorno}`,
            background: t.done ? C.greenDone : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 20, flexShrink: 0,
          }}>{t.done && UI_ICONS.check('white', 13)}</span>
          <span style={{ fontSize: 20, color: t.done ? C.subtle : C.text, textDecoration: t.done ? 'line-through' : 'none', flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{t.task}</span>
        </button>
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
          {renderTaskList(plannedToday, togglePlannedTask)}
        </div>
      )}

      {/* Edit toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setEditingRoutine(!editingRoutine)} style={{
          background: editingRoutine ? C.rose : 'transparent', color: editingRoutine ? 'white' : C.rose,
          border: `1.5px solid ${C.rose}`, borderRadius: 20, padding: '6px 16px',
          fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {editingRoutine ? '✓ Listo' : '✎ Editar mi rutina'}
        </button>
      </div>

      {renderRoutineSection('Mañana', '', morning, C.rose, 'morning')}
      <div style={{ height: 1, background: C.border }} />
      {renderRoutineSection('Afirmaciones del día', '', midday, C.gold, 'midday')}
      <div style={{ height: 1, background: C.border }} />
      {renderRoutineSection('Noche', '', night, C.roseDark, 'night')}

      {/* Add new routine item */}
      {editingRoutine && (
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: SHADOW.sm }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginBottom: 12 }}>+ Agregar a mi rutina</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {[{k:'morning',l:'Mañana'},{k:'midday',l:'Día'},{k:'night',l:'Noche'}].map(s => (
              <button key={s.k} onClick={() => setNewRoutineSection(s.k)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 19, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', border: `1.5px solid ${C.rose}`,
                background: newRoutineSection === s.k ? C.rose : 'transparent',
                color: newRoutineSection === s.k ? 'white' : C.rose,
              }}>{s.l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input type="time" aria-label="Hora" value={newRoutineTime} onChange={e => setNewRoutineTime(e.target.value)}
              style={{ flexShrink: 0, padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <input value={newRoutineTask} onChange={e => setNewRoutineTask(e.target.value)} placeholder="¿Qué quieres hacer?"
              style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit' }}
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
          const todayDone = Object.entries(routineChecked).filter(([, v]) => v).length
          const todayTotal = morning.length + midday.length + night.length
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
        <div style={{ marginBottom: 12 }}>{renderTaskList(tomorrowTasks, toggleTomorrowTask)}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newTomorrowTask} onChange={e => setNewTomorrowTask(e.target.value)} placeholder="Escribir tarea para mañana..."
            style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit' }}
            onKeyDown={e => e.key === 'Enter' && addTomorrowTask()} />
          <button onClick={addTomorrowTask} disabled={!newTomorrowTask.trim()} style={{
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
      entries={entries}
      activePrograms={activePrograms}
      startProgram={startProgram}
      openModule={openModule}
    />
  )

  /* ── PROGRAMAS ── */
  /* ── HISTORIA DE RONDA ── */
  const historiaView = <HistoriaView showFullStory={showFullStory} setShowFullStory={setShowFullStory} />

  const programasView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ background: C.morado, borderRadius: 20, padding: 22, color: 'white' }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT }}>Rutas</div>
        <div style={{ fontSize: 19, opacity: 0.85, marginTop: 4 }}>Caminos paso a paso para crecer y brillar</div>
        <div style={{ fontSize: 19, marginTop: 6, opacity: 0.7 }}>1 minuto al día. 7 días. Tu transformación.</div>
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
              return (
                <div key={progId} style={{ background: C.card, borderRadius: 18, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `2px solid ${prog.color}25` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>{ICONS[prog.id] ? ICONS[prog.id](prog.color, 24) : <span aria-hidden="true" style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: prog.color, verticalAlign: 'middle' }} />} {prog.title}</div>
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
                      return (
                        <button type="button" role="checkbox" aria-checked={isDone} key={d.day} onClick={() => completeProgDay(progId, d.day)} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                          background: isDone ? `${prog.color}08` : C.cream, borderRadius: 14,
                          cursor: 'pointer', border: `1px solid ${isDone ? `${prog.color}30` : C.border}`,
                          transition: 'all 0.15s',
                          width: '100%', margin: 0, textAlign: 'left', fontFamily: 'inherit', color: 'inherit',
                        }}>
                          <span aria-hidden="true" style={{
                            width: 24, height: 24, borderRadius: 7, border: `2px solid ${isDone ? C.green : prog.color}`,
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
                <div style={{ fontSize: 20, color: C.subtle, marginTop: 4 }}>{prog.days.length} días · 1 minuto al día</div>
                <button onClick={() => startProgram(prog.id)} style={{
                  marginTop: 10, padding: '8px 18px', borderRadius: 20, border: 'none',
                  background: prog.color, color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Empezar →
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
                <div style={{ fontSize: 20, color: C.subtle, marginTop: 4 }}>{prog.days.length} días · 1 minuto al día</div>
                <button onClick={() => startProgram(prog.id)} style={{
                  marginTop: 10, padding: '8px 18px', borderRadius: 20, border: 'none',
                  background: prog.color, color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Empezar →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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

            {/* 3 fases */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {prog.phases.map((phase, i) => (
                <div key={i} style={{
                  flex: 1, background: C.card, borderRadius: 12, padding: '10px 8px', textAlign: 'center',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: 19, fontWeight: 800, color: C.gold, marginBottom: 2 }}>Días {phase.days}</div>
                  <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{phase.name}</div>
                  <div style={{ fontSize: 19, color: C.muted, marginTop: 2 }}>{phase.desc}</div>
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
              <button onClick={() => {
                if (!isPremium) {
                  track('paywall_viewed', { feature: 'programa_21_dias', price: PLAN_PRECIO })
                  setAppModal({
                    type: 'paywall',
                    title: `Esta ruta es parte de ${PLAN_PAGO}`,
                    body: `Las rutas de 21 días están incluidas en ${PLAN_PAGO}. Te acompañan paso a paso con neurociencia y micro-acciones diarias.`,
                    cta: 'Ver planes',
                  })
                  return
                }
                if (activePrograms[prog.id]) {
                  setAppModal({
                    type: 'info',
                    title: 'Ya estás en esta ruta',
                    body: `Sigues "${prog.title}". Continúa con tu día de hoy.`,
                    cta: 'Listo',
                  })
                  return
                }
                startProgram(prog.id)
                showFoundingPerk('p21', 'Rutas de 21 días')
                setAppModal({
                  type: 'success',
                  title: `¡Activaste "${prog.title}"!`,
                  body: 'Mañana te llega la primera práctica del Día 1. Tu camino de 21 días empieza ahora. 💛',
                  cta: 'Empezar mi camino',
                })
              }} style={{
                width: '100%', padding: '14px 24px', borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${C.gold}, #91946E)`,
                color: 'white', fontSize: 20, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(114,109,45,0.35)', letterSpacing: '0.02em',
              }}>
                {isPremium ? 'Empezar esta ruta' : `Desbloquear con ${PLAN_PAGO}`}
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  )

  /* ── FRASES ── */
  /* ── TOOLKIT ── */
  const filteredTools = toolFilter === 'todas' ? toolkitItems : toolkitItems.filter(t => t.cat === toolFilter)
  const toolkitCounts = TOOLKIT_CATS.reduce((acc, cat) => {
    acc[cat.id] = toolkitItems.filter(t => t.cat === cat.id).length
    return acc
  }, {})

  const toolkitView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ background: C.morado, borderRadius: 20, padding: 20, color: 'white' }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT }}>Mi Toolkit</div>
        <div style={{ fontSize: 19, opacity: 0.85, marginTop: 4 }}>Tus recursos de crecimiento, todo en un lugar</div>
        <div style={{ fontSize: 19, marginTop: 8, opacity: 0.7 }}>{toolkitItems.length} recursos guardados</div>
      </div>

      {/* Category chips with counts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        <button onClick={() => setToolFilter('todas')} style={{
          padding: '6px 14px', borderRadius: 20, border: `2px solid ${toolFilter === 'todas' ? C.rose : C.border}`,
          background: toolFilter === 'todas' ? C.rose : C.card, color: toolFilter === 'todas' ? 'white' : C.muted,
          fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
          Todas ({toolkitItems.length})
        </button>
        {TOOLKIT_CATS.map(cat => (
          toolkitCounts[cat.id] > 0 && (
            <button key={cat.id} onClick={() => setToolFilter(cat.id)} style={{
              padding: '6px 14px', borderRadius: 20, border: `2px solid ${toolFilter === cat.id ? cat.color : C.border}`,
              background: toolFilter === cat.id ? cat.color : C.card, color: toolFilter === cat.id ? 'white' : C.muted,
              fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              {ICONS['cat_'+cat.id] ? ICONS['cat_'+cat.id](cat.color, 16) : (ICONS[cat.id] ? ICONS[cat.id](cat.color, 16) : <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />)} {cat.label} ({toolkitCounts[cat.id]})
            </button>
          )
        ))}
      </div>

      {/* Add new resource */}
      {showAddTool ? (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: SHADOW.sm }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: C.text }}>Agregar recurso</div>

          {/* Etiqueta visible: el placeholder desaparece al escribir */}
          <label htmlFor="recurso-nombre" style={{ display: 'block', fontSize: 17, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Nombre</label>
          <input id="recurso-nombre" value={newToolName} onChange={e => setNewToolName(e.target.value)} placeholder="Ej: Podcast de Jay Shetty"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }}
          />

          <label htmlFor="recurso-link" style={{ display: 'block', fontSize: 17, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Link</label>
          <input id="recurso-link" value={newToolUrl} onChange={e => setNewToolUrl(e.target.value)} placeholder="Ej: https://spotify.com/..."
            inputMode="url" autoCapitalize="off"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }}
          />

          <label htmlFor="recurso-nota" style={{ display: 'block', fontSize: 17, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Nota (opcional)</label>
          <input id="recurso-nota" value={newToolNote} onChange={e => setNewToolNote(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box' }}
          />

          {/* Category selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {TOOLKIT_CATS.map(cat => (
              <button key={cat.id} onClick={() => setNewToolCat(cat.id)} style={{
                padding: '5px 10px', borderRadius: 20, border: `2px solid ${cat.color}`,
                background: newToolCat === cat.id ? cat.color : 'transparent',
                color: newToolCat === cat.id ? 'white' : cat.color,
                fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {ICONS['cat_'+cat.id] ? ICONS['cat_'+cat.id](cat.color, 16) : (ICONS[cat.id] ? ICONS[cat.id](cat.color, 16) : <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />)} {cat.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addToolkitItem} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: C.rose, color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Guardar
            </button>
            <button onClick={() => setShowAddTool(false)} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'white', fontSize: 19, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: C.muted }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddTool(true)} style={{
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
            return (
              <div key={item.id} style={{
                background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                borderLeft: `3px solid ${cat.color}`, display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{ICONS['cat_'+cat.id] ? ICONS['cat_'+cat.id](cat.color, 16) : (ICONS[cat.id] ? ICONS[cat.id](cat.color, 16) : <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{item.name}</div>
                  {item.note && <div style={{ fontSize: 19, color: C.muted, marginTop: 2 }}>{item.note}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 20, background: C.beige, padding: '2px 8px', borderRadius: 20, color: cat.textColor || cat.color, fontWeight: 700 }}>
                      {cat.label}
                    </span>
                    {item.url && (
                      <a href={item.url.startsWith('http') ? item.url : `https://${item.url}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 19, color: C.rose, fontWeight: 700, textDecoration: 'none' }}
                        onClick={e => e.stopPropagation()}>
                        Abrir →
                      </a>
                    )}
                  </div>
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
          <div style={{ fontSize: 36, marginBottom: 10, color: C.mint, opacity: 0.4 }}>●</div>
          <div style={{ fontSize: 19, fontWeight: 600 }}>
            {toolFilter === 'todas' ? 'Tu toolkit está vacío' : 'No hay recursos en esta categoría'}
          </div>
          <div style={{ fontSize: 20, marginTop: 4 }}>Agrega tus podcasts, libros, cursos y más</div>
        </div>
      )}
    </div>
  )

  /* ── PERFIL ── */
  const AVATARS = []
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
    // Marcas reales del historial (un hábito, un día), solo de hábitos que existen.
    totalHabitsEver: Object.values(monthlyHistory).reduce((s, v) => s + v, 0),
    favQuotesCount: favQuotes.length,
    toolkitCount: toolkitItems.length,
  }

  const updateProfile = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }
  // Al cerrar la edición del perfil (Guardar o Cerrar edición) se guarda
  // también en la cuenta, para verlo en otros dispositivos (perfil-3).
  const guardarPerfilEnLaNube = () => {
    if (user && isConfigured && duenaLocal() === user.id) saveUserProfile(user.id, profile)
  }

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
  const SEED_POSTS = [
    { id: 's1', cat: 'ansiedad', content: 'Llevo 3 noches sin dormir bien. Siento que el pecho me aprieta y no puedo parar de pensar en todo lo que tengo que hacer mañana. ¿Alguien más se siente así?', time: 'Hace 2 horas', hearts: 24,
      replies: [{ pro: { name: 'Valentina R.', title: 'Guía Ronda · Certificada en DBT', verified: true },
        text: 'Muchas mujeres lo han sentido. Lo que pasa es que tu mente está tratando de "resolver" el futuro desde la cama — y eso activa tu sistema nervioso. Prueba esto: escribe TODO lo que te preocupa en un papel (descarga mental). Luego cierra el cuaderno y dile a tu mente: "Ya está escrito, mañana lo resuelvo." Tu cerebro necesita sentir que no va a olvidar para poder soltar. Si esto sigue por más de 2 semanas, te recomiendo buscar acompañamiento profesional. Aquí estoy contigo. 💛' }] },
    { id: 's2', cat: 'autoestima', content: 'Me separé hace 6 meses y siento que perdí mi identidad. No sé quién soy sin esa relación. Me miro al espejo y no me reconozco.', time: 'Hace 5 horas', hearts: 41,
      replies: [{ pro: { name: 'Valentina R.', title: 'Guía Ronda · Certificada en DBT', verified: true },
        text: 'Lo que sientes es normal y tiene nombre: se llama "duelo de identidad." Cuando una relación larga termina, no solo se pierde a la persona, también la versión de ti que existía en esa relación. Pero aquí está la buena noticia: ahora tienes espacio para descubrir quién eres TÚ sola. Empieza pequeño: ¿qué te gustaba hacer antes de esa relación? ¿Qué dejaste de hacer? Escríbelo. Ahí empieza el camino de regreso a ti. 🌱' }] },
    { id: 's3', cat: 'maternidad', content: 'Amo a mis hijos pero hay días que siento que me perdí a mí misma. No tengo un minuto para mí. ¿Está mal sentirme así?', time: 'Hace 1 día', hearts: 67,
      replies: [{ pro: { name: 'Mariana L.', title: 'Guía Ronda · Instructora certificada Yoga y Meditación', verified: true },
        text: 'No solo NO está mal — es una de las experiencias más comunes y menos habladas de la maternidad. Muchas mamás sienten lo mismo y no lo dicen. No eres mala madre por querer tiempo para ti. Eres una madre humana. Empieza con 15 minutos al día solo para ti — sin culpa. Tu bienestar ES parte del bienestar de tus hijos. 🌿' }] },
    { id: 's4', cat: 'relaciones', content: 'Siempre elijo el mismo tipo de persona. Sé que me hace daño pero no puedo dejar de hacerlo. ¿Por qué repito el patrón?', time: 'Hace 3 horas', hearts: 38,
      replies: [{ pro: { name: 'Valentina R.', title: 'Guía Ronda · Certificada en DBT', verified: true },
        text: 'Los patrones de relación se forman temprano — el cerebro busca lo "familiar" (que viene de familia, no de "conocido"). Si creciste con amor intermitente, tu cerebro puede confundir la intensidad con el amor. El primer paso es reconocer el patrón, y tú ya lo estás haciendo. El segundo es explorar tu estilo de apego. Hay herramientas como DBT que te ayudan a reprogramar lo que buscas en una pareja. No estás "rota" — estás programada, y eso se puede cambiar.' }] },
    { id: 's5', cat: 'duelo', content: 'Perdí a mi mamá hace un año y hay días que siento que el dolor es igual de fuerte que el primer día. ¿Cuándo para esto?', time: 'Hace 8 horas', hearts: 53,
      replies: [{ pro: { name: 'Mariana L.', title: 'Guía Ronda · Instructora certificada Meditación', verified: true },
        text: 'El duelo no es lineal. No hay un día mágico en que "pare." Lo que cambia es tu relación con el dolor. Con el tiempo, el dolor no se va — aprende a vivir dentro de ti sin ocupar todo el espacio. Los días fuertes van a seguir viniendo (fechas especiales, canciones, olores). Y eso no significa que no estás avanzando. Significa que amaste mucho. Y eso es hermoso. Permítete sentir sin juzgarte. 💛' }] },
    { id: 's6', cat: 'emprendimiento', content: 'Tengo una idea de negocio pero me da pánico fracasar. Llevo meses paralizada sin dar el primer paso.', time: 'Hace 4 horas', hearts: 29,
      replies: [{ pro: { name: 'Camila S.', title: 'Guía Ronda · Mentora de emprendimiento', verified: true },
        text: 'El miedo al fracaso es en realidad miedo al juicio. Tu cerebro no teme al fracaso — teme que los demás te vean fracasar. Pero aquí va la verdad: nadie está mirando tanto como crees. El costo de no intentar siempre es mayor que el costo de fracasar. Empieza con la versión más pequeña posible de tu idea. No necesitas que sea perfecto — necesitas que EXISTA.' }] },
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

    actualizar({ awaitingGuia: true, guiaFallo: false })
    // Pausa breve (se siente considerada), en paralelo con la petición: la
    // respuesta se guarda en cuanto termina, sin un setTimeout suelto después.
    // Es IA: responde rápido, sin fingir ser humana.
    const delaySec = 2 + Math.floor(Math.random() * 3)
    const control = new AbortController()
    const corte = setTimeout(() => control.abort(), 20000)
    try {
      const pedir = fetch('/api/guia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, cat }),
        signal: control.signal,
      }).then(async resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        if (data.error || !data.reply) throw new Error(data.error || 'Sin respuesta')
        return data
      })
      const [data] = await Promise.all([pedir, new Promise(r => setTimeout(r, delaySec * 1000))])
      actualizar({ replies: [data.reply], awaitingGuia: false, guiaFallo: false })
      // Señal de crisis del servidor (por si el texto se le escapó al chequeo de aquí).
      if (data.crisis) abrirAyuda('crisis_comunidad')
    } catch {
      // Sin respuesta: la publicación queda guardada y se puede reintentar.
      actualizar({ awaitingGuia: false, guiaFallo: true })
      track('community_guia_failed', { category: cat })
    } finally {
      clearTimeout(corte)
    }
  }

  const addBoardPost = async () => {
    if (!boardNewText.trim()) return
    if (!isPremium) {
      track('paywall_viewed', { feature: 'comunidad_escribir', price: PLAN_PRECIO })
      setAppModal({
        type: 'paywall',
        title: 'Escribir en la comunidad es premium',
        body: `Publica preguntas anónimas y recibe la respuesta de la Guía IA de Ronda. Disponible con ${PLAN_PAGO}.`,
        cta: 'Ver planes',
      })
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
    // Sin el contenido del post: solo la senal y la categoria.
    track('community_post_created', { category: newPost.cat })

    requestGuiaReply(newPost)
  }

  const toggleBoardHeart = (postId) => {
    setBoardHearts(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

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
          Contenido educativo de bienestar. No reemplaza atención profesional en salud mental.
        </div>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {BOARD_CATS.map(cat => (
          <button key={cat.id} onClick={() => setBoardFilter(cat.id)} style={{
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

      {/* New post button */}
      {!boardShowForm ? (
        <button onClick={() => setBoardShowForm(true)} style={{
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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {BOARD_CATS.filter(c => c.id !== 'todas').map(cat => (
              <button key={cat.id} onClick={() => setBoardNewCat(cat.id)} style={{
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
            value={boardNewText}
            onChange={e => setBoardNewText(e.target.value)}
            placeholder="Escribe lo que sientes, lo que te preocupa, lo que necesitas saber. Este es tu espacio seguro."
            rows={4}
            maxLength={BOARD_MAX}
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
            <button onClick={() => setBoardShowForm(false)} style={{
              flex: 1, padding: '10px 16px', borderRadius: 12, border: `1px solid ${C.border}`,
              background: 'none', color: C.muted, fontSize: 20, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancelar</button>
            <button onClick={addBoardPost} style={{
              flex: 1, padding: '10px 16px', borderRadius: 12, border: 'none',
              background: boardNewText.trim() ? C.rose : C.border, color: 'white',
              fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Publicar </button>
          </div>
        </div>
      )}

      {/* Posts */}
      {filteredBoardPosts.map(post => (
        <div key={post.id} style={{
          background: C.card, borderRadius: 16, padding: 18,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: `1px solid ${C.border}`,
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
            }}>
              {ICONS['cat_'+post.cat] ? ICONS['cat_'+post.cat]((BOARD_CATS.find(c => c.id === post.cat) || {}).color, 14) : null}
              {(BOARD_CATS.find(c => c.id === post.cat) || {}).label}
            </span>
          </div>

          {/* Etiqueta de ejemplo (contenido sembrado, no comunidad real) */}
          {post.example && (
            <Badge variant="example" style={{ marginBottom: 10 }}>Ejemplo · así funciona el Board</Badge>
          )}

          {/* Post content */}
          <div style={{ fontSize: 20, color: C.text, lineHeight: 1.7, marginBottom: 12 }}>
            {post.content}
          </div>

          {/* Hearts */}
          <button onClick={() => toggleBoardHeart(post.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: 20, border: `1px solid ${boardHearts[post.id] ? C.rose : C.border}`,
            background: boardHearts[post.id] ? `${C.rose}12` : 'none',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 14 }}>{boardHearts[post.id] ? '' : '🤍'}</span>
            <span style={{ fontSize: 20, fontWeight: 600, color: boardHearts[post.id] ? C.roseDark : C.muted }}>
              {(post.hearts || 0) + (boardHearts[post.id] ? 1 : 0)} te acompañan
            </span>
          </button>

          {/* "Una guía está respondiendo" indicator while waiting */}
          {post.awaitingGuia && (!post.replies || post.replies.length === 0) && (
            <div style={{
              marginTop: 14, padding: 14, borderRadius: 14,
              background: `${C.teal}08`, border: `1px dashed ${C.teal}40`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: C.teal,
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
                La Guía IA no pudo responder ahora. Tu publicación quedó guardada.
              </div>
              <button type="button" onClick={() => requestGuiaReply(post)} style={{
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
                  width: 36, height: 36, borderRadius: '50%',
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
          Escríbenos → hola@rondahub.com
        </div>
      </div>
    </div>
  )

  /* ── Directorio / Marketplace ── */
  const DIRECTORIO_CATS = []
  const SEED_DIRECTORIO = []
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
        {/* La verificación solo se anuncia cuando haya a quién mostrar. */}
        {SEED_DIRECTORIO.length > 0 && (
          <div style={{ fontSize: 19, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
            Profesionales verificadas por Ronda ✓
          </div>
        )}
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
          Estamos armando un directorio de profesionales verificadas para ti.
        </div>
        <div style={{ fontSize: 15, color: C.teal, fontWeight: 600, marginTop: 16 }}>
          Mientras tanto, pregunta lo que quieras en la Comunidad — te responde la Guía IA de Ronda.
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
        <div style={{ fontSize: 19, fontWeight: 700, color: C.rose }}>
          hola@rondahub.com
        </div>
      </div>
    </div>
  )

  /* ── AI Agent: Generate custom program ── */
  const generateAiProgram = async () => {
    setAiStep(3)
    setAiError('')
    try {
      const resp = await fetch('/api/generate-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: aiGoal, context: aiContext }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json().catch(() => null)
      if (!data || data.error || !Array.isArray(data.program?.days) || !data.program.days.length) {
        throw new Error(data?.error || 'Sin programa')
      }
      setAiProgram(data.program)
      setAiStep(4)
    } catch (err) {
      // El detalle técnico queda en la consola; a la usuaria, un texto claro.
      console.error('generate-program', err)
      setAiError('No pude crear tu programa ahora. Inténtalo de nuevo en un momento.')
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
    setAiGoal(''); setAiContext(''); setAiStep(0); setAiProgram(null); setAiError(''); setAiSaved(false)
  }

  const sendChatMessage = async () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
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

    // ── Build rich context from user state ──
    const todayChecked = Object.values(checked).filter(Boolean).length
    const totalHabits = habits.length

    // Recent mood from last 7 journal entries
    const recentEntries = entries.slice(0, 7)
    // Solo entradas con un ánimo elegido (0 = Difícil cuenta). La intención de
    // la mañana no lleva ánimo. Se envía como texto ('0.0' no es falsy).
    const conAnimo = recentEntries.filter(e => typeof e.mood === 'number' && e.type !== 'morning')
    const avgMood = conAnimo.length > 0
      ? (conAnimo.reduce((s, e) => s + e.mood, 0) / conAnimo.length).toFixed(1)
      : null
    const lastJournalNote = recentEntries[0]?.text || null

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
      name: profile.name || 'Usuaria',
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
      const resp = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          context: ctx,
          history: recentHistory,
          memory: memory,       // 🧠 Memoria persistente
        }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json().catch(() => null)
      if (!data || data.error) throw new Error(data?.error || 'Respuesta vacía')

      // Por si alguna etiqueta se le escapó al servidor, no se muestra.
      const replyText = (typeof data.reply === 'string' ? data.reply : '')
        .replace(/\[CONECTAR:[^\]\n]*\]/giu, '').replace(/\[SOS\]/gi, '').trim()
      // Sin texto ni botones no hay burbuja (el aviso del programa va aparte).
      if (replyText || data.connect || data.sos) {
        setChatMessages(prev => [...prev, { role: 'assistant', text: replyText, connect: data.connect || null, sos: data.sos || false }])
      }
      // Señal de crisis del servidor (por si el texto se le escapó al chequeo de aquí).
      if (data.crisis) abrirAyuda('crisis_chat')

      // If AI returned a program, save it for the create flow
      if (data.program) {
        setAiProgram(data.program)
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
  }

  const chatRef = { current: null }

  const aiAgentView = (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 240px)', maxHeight: 600 }}>
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
        <div ref={el => { chatRef.current = el; if (el) el.scrollTop = el.scrollHeight }}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
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
                {msg.text}
                {/* Escuchar la respuesta en voz. En crisis la voz va más pausada. */}
                {msg.role === 'assistant' && voiceAvailable && msg.text && !msg.isProgram && (
                  <button
                    onClick={() => speak(msg.text, { id: i, tone: msg.sos ? 'sos' : 'chat' })}
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

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, paddingTop: 4 }}>
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
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                <button key={i} onClick={() => { setAiGoal(goal); setAiStep(1) }} style={{
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
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 14, border: `1.5px solid ${C.contorno}`, fontSize: 19, fontFamily: 'inherit', background: C.card, color: C.text, outline: 'none' }} />
                <button onClick={() => aiGoal.trim() && setAiStep(1)} disabled={!aiGoal.trim()} aria-label="Continuar con esta meta" style={{
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
              {aiError && <div style={{ fontSize: 18, color: C.coral, fontWeight: 600 }}>{aiError}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setAiStep(0); setAiGoal(''); setAiContext('') }} style={{ flex: 1, padding: '12px', borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Atrás</button>
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
                <div style={{ textAlign: 'center', padding: 16, background: `${C.teal}10`, borderRadius: 14 }}>
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

  const perfilView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Avatar & Name card */}
      <div style={{ background: `${C.teal}`, borderRadius: 18, padding: 24, color: 'white', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, fontFamily: FONT, border: '2px solid rgba(255,255,255,0.5)' }}>
          {(profile.name || 'R').charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT }}>{profile.name || 'Tu nombre'}</div>
        {profile.city && <div style={{ fontSize: 20, opacity: 0.8, marginTop: 4 }}>{profile.city}</div>}
        {profile.bio && <div style={{ fontSize: 20, opacity: 0.85, marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>"{profile.bio}"</div>}
        <button onClick={() => { if (editingProfile) guardarPerfilEnLaNube(); setEditingProfile(!editingProfile) }} style={{
          marginTop: 14, padding: '8px 20px', borderRadius: 20, border: '2px solid rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 19, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {editingProfile ? 'Cerrar edición' : 'Editar perfil'}
        </button>
      </div>

      {/* Edit form */}
      {editingProfile && (
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: SHADOW.sm }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 14 }}>Editar perfil</div>

          {/* Avatar picker */}
          <div style={{ fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Tu avatar</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {AVATARS.map(a => (
              <button key={a} onClick={() => updateProfile('emoji', a)} style={{
                fontSize: 28, padding: 6, borderRadius: 12, cursor: 'pointer',
                border: profile.emoji === a ? `2px solid ${C.rose}` : '2px solid transparent',
                background: profile.emoji === a ? C.beige : 'transparent',
              }}>
                {a}
              </button>
            ))}
          </div>

          <label htmlFor="perfil-nombre" style={{ display: 'block', fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Nombre</label>
          <input id="perfil-nombre" value={profile.name} onChange={e => updateProfile('name', e.target.value)} placeholder="¿Cómo te llamas?"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }}
          />

          <label htmlFor="perfil-ciudad" style={{ display: 'block', fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Ciudad</label>
          <input id="perfil-ciudad" value={profile.city} onChange={e => updateProfile('city', e.target.value)} placeholder="¿De dónde eres?"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box' }}
          />

          <label htmlFor="perfil-bio" style={{ display: 'block', fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Bio</label>
          <textarea id="perfil-bio" value={profile.bio} onChange={e => updateProfile('bio', e.target.value)} placeholder="Cuéntanos sobre ti en una frase..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 12, boxSizing: 'border-box', minHeight: 60, resize: 'vertical', lineHeight: 1.5 }}
          />

          <label htmlFor="perfil-intencion" style={{ display: 'block', fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Mi intención</label>
          <textarea id="perfil-intencion" value={profile.intention} onChange={e => updateProfile('intention', e.target.value)} placeholder="¿Cuál es tu intención para este año?"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box', minHeight: 60, resize: 'vertical', lineHeight: 1.5 }}
          />

          <button onClick={() => { guardarPerfilEnLaNube(); setEditingProfile(false) }} style={{
            width: '100%', padding: 12, borderRadius: 12, border: 'none',
            background: C.teal, color: 'white',
            fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
          }}>
            Guardar
          </button>
        </div>
      )}

      {/* Intention card */}
      {profile.intention && !editingProfile && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: SHADOW.sm, borderLeft: `4px solid ${C.gold}` }}>
          <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.gold, marginBottom: 6 }}>Mi intención</div>
          <div style={{ fontSize: 19, color: C.text, lineHeight: 1.6 }}>{profile.intention}</div>
        </div>
      )}

      {/* Notificaciones — OneSignal */}
      {(oneSignal.status === 'idle' || oneSignal.status === 'error') && (
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
          <button onClick={async () => {
            const ok = await oneSignal.subscribe()
            if (!ok) {
              setAppModal({
                type: 'info',
                title: 'No se pudo activar',
                body: 'Tu navegador bloqueó las notificaciones. Si estás en iPhone, instala Ronda en tu pantalla de inicio primero (botón Compartir → Agregar a pantalla de inicio).',
                cta: 'Entendido',
              })
            }
          }} style={{
            width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none',
            background: C.teal, color: 'white', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Activar notificaciones
          </button>
        </div>
      )}

      {oneSignal.status === 'subscribed' && (
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
          <button onClick={() => oneSignal.unsubscribe()} style={{
            background: 'transparent', border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '6px 10px', fontSize: 13,
            color: C.muted, cursor: 'pointer', fontFamily: 'inherit',
          }}>Pausar</button>
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

      {/* Membership — Yo soy Ronda */}
      <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: SHADOW.sm, border: `1px solid ${C.goldLight}` }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Yo soy Ronda</div>
        <div style={{ fontSize: 18, color: C.muted, marginBottom: 14 }}>
          {isPremium ? 'Tienes acceso completo a Ronda' : 'Plan actual: Freemium'}
        </div>

        {/* Badge especial founding member */}
        {premiumStatus.premium_source === 'founding_member' && premiumStatus.premium_until && (
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
              Tienes acceso completo incluido hasta el {new Date(premiumStatus.premium_until).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.
            </div>
          </div>
        )}

        {!isPremium && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name: PLAN_PAGO, price: PLAN_PRECIO, features: 'Tu Ronda (IA), programas 21 días, 5 respuestas profesionales/mes', color: C.teal },
              { name: 'Ronda Pro', price: 'Próximamente', features: 'El siguiente nivel de Ronda, en camino.', color: C.gold },
            ].map((plan, i) => (
              <div key={i} style={{ background: C.cream, borderRadius: 14, padding: 14, border: `2px solid ${plan.color}30` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: plan.color }}>{plan.name}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{plan.price}</div>
                </div>
                <div style={{ fontSize: 16, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>{plan.features}</div>
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
            { label: 'Frases favoritas', value: profileStats.favQuotesCount, color: C.gold },
            // El salvia queda en el punto; el número va en un tono que se lee (8:1).
            { label: 'Recursos guardados', value: profileStats.toolkitCount, color: C.mint, textColor: C.olivaOscura },
            { label: 'Hoy', value: `${totalDone}/${totalHabits}`, color: C.rose },
          ].map((stat, i) => (
            <div key={i} style={{ background: C.cream, borderRadius: 14, padding: 16, textAlign: 'center', border: `1px solid ${C.border}` }}>
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

      {/* Lo que Ronda sabe de ti (memoria de Tu Ronda) */}
      {(memory.facts?.length > 0 || memory.patterns?.length > 0 || memory.summary) && (
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
              body: 'Se borra lo que Tu Ronda sabe de ti y también tu conversación con ella. Esta acción no se puede deshacer.',
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
          <button onClick={signOut} style={{
            padding: '10px 28px', borderRadius: 12, border: `1.5px solid ${C.border}`,
            background: C.card, color: C.muted, fontSize: 20, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cerrar sesión
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
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: FONT, lineHeight: 1.4, marginBottom: 12 }}>
        Tu compañera en cada etapa
      </div>
      <div style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, maxWidth: 300 }}>
        Vamos a empezar por lo tuyo. Dos preguntas y estás lista.
      </div>
    </>),

    /* Paso 1 — Su nombre. La app le habla por su nombre desde el primer día. */
    onboardStepShell(1, <>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.text, fontFamily: FONT, marginBottom: 10 }}>
        ¿Cómo te llamas?
      </div>
      <div style={{ fontSize: 16, color: C.muted, marginBottom: 28, maxWidth: 300, lineHeight: 1.6 }}>
        Para llamarte por tu nombre. Puedes cambiarlo después en tu perfil.
      </div>
      <input
        value={onboardName}
        onChange={e => setOnboardName(e.target.value)}
        placeholder="Tu nombre"
        autoFocus
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

    /* Paso 2 — Un primer hábito. Que salga del onboarding habiendo HECHO algo. */
    onboardStepShell(2, <>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.text, fontFamily: FONT, marginBottom: 10, maxWidth: '100%', overflowWrap: 'anywhere' }}>
        {onboardName.trim() ? `${onboardName.trim()}, elige tu primer hábito` : 'Elige tu primer hábito'}
      </div>
      <div style={{ fontSize: 16, color: C.muted, marginBottom: 8, maxWidth: 320, lineHeight: 1.6 }}>
        Empieza con uno. Puedes sumar más cuando quieras.
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: onboardHabits.length ? C.teal : C.subtle, marginBottom: 20 }}>
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
      <div style={{ fontSize: 24, fontWeight: 700, color: C.text, fontFamily: FONT, marginBottom: 10 }}>
        Empecemos por Adentro
      </div>
      <div style={{ fontSize: 16, color: C.muted, marginBottom: 26, maxWidth: 310, lineHeight: 1.6 }}>
        Es tu pantalla del día: tus hábitos, tu rutina, tu diario y tus rutas.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 330 }}>
        {[
          { title: 'Tus hábitos', desc: 'Márcalos cada día y mira tu racha crecer.', color: C.gold },
          { title: 'Tu rutina', desc: 'Mañana, mediodía y noche, a tu medida.', color: C.teal },
          { title: 'Tu diario', desc: 'Escribe cómo te fue. Solo tú lo lees.', color: C.rose },
          { title: 'Tus rutas', desc: 'Caminos de 7 días, un minuto al día.', color: C.mint },
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
      <button onClick={finishOnboarding} style={{
        padding: '14px 40px', borderRadius: 30, width: '100%', maxWidth: 330, marginTop: 22,
        background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
        color: 'white', fontSize: 18, fontWeight: 800, border: 'none',
        cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em',
        boxShadow: '0 4px 16px rgba(20,24,51,0.35)',
      }}>
        Comenzar mi Ronda
      </button>
    </>),
  ]

  /* ── Auth loading ── */
  // También mientras los datos de este dispositivo son de otra cuenta: no se
  // muestra nada de ella mientras se apartan y la app se recarga (perfil-1).
  const cuentaAjena = isConfigured && !!user && (guardadoEstaBloqueado() || (!!duenaLocal() && duenaLocal() !== user.id))
  if (authLoading || cuentaAjena) {
    return (
      <div style={{
        maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT,
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: '50%', border: '3px solid #726D2D',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#726D2D' }} />
        </div>
        <div style={{ fontSize: 20, color: C.muted, fontWeight: 600 }}>Cargando...</div>
      </div>
    )
  }

  /* ── Contraseña nueva: llegó desde el enlace de "¿Olvidaste tu contraseña?" ── */
  if (isConfigured && user && recovering) {
    return (
      <AuthScreen
        modoInicial="nueva"
        onUpdatePassword={updatePassword}
        onPasswordUpdated={() => {
          clearRecovering()
          setAppModal({ type: 'success', title: 'Tu contraseña quedó lista', body: 'Desde ahora entras con tu contraseña nueva.' })
        }}
        onCancel={clearRecovering}
      />
    )
  }

  /* ── Auth screen (only if Supabase is configured and no user) ── */
  if (isConfigured && !user) {
    return (
      <AuthScreen
        onSignInEmail={signInWithEmail}
        onSignUp={signUp}
        onResetPassword={resetPassword}
      />
    )
  }

  /* ── Onboarding screen ── */
  if (!onboarded) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream, fontFamily: FONT }}>
        {onboardSlides[onboardStep]}

        {/* Dots + Navigation */}
        <div style={{ position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
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

          {/* Buttons */}
          {onboardStep < onboardSlides.length - 1 && (
            <div style={{ display: 'flex', gap: 16 }}>
              {onboardStep > 0 && (
                <button onClick={() => setOnboardStep(onboardStep - 1)} style={{
                  padding: '12px 28px', borderRadius: 25, border: `2px solid ${C.contorno}`,
                  background: 'transparent', color: C.muted, fontSize: 19, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Atrás
                </button>
              )}
              <button onClick={() => setOnboardStep(onboardStep + 1)} style={{
                padding: '12px 32px', borderRadius: 25, border: 'none',
                background: `${C.teal}`,
                color: 'white', fontSize: 19, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 12px rgba(20,24,51,0.3)',
              }}>
                Siguiente
              </button>
            </div>
          )}
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

  /* Arriba de cada check-in: la Ayuda siempre a mano y "Ahora no" para
     cerrarlo sin darlo por hecho. */
  const botonCheckinSecundario = {
    minHeight: 44, padding: '0 10px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, fontWeight: 600, fontFamily: 'inherit',
  }
  const barraCheckin = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '-14px -10px 4px' }}>
      <button type="button" onClick={() => { posponerCheckin(); abrirAyuda('checkin') }} style={{ ...botonCheckinSecundario, color: C.morado, textDecoration: 'underline' }}>
        Ayuda
      </button>
      <button type="button" onClick={posponerCheckin} style={{ ...botonCheckinSecundario, color: C.muted }}>
        Ahora no
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
            {profile.name ? `${profile.name}, ${getGreeting(currentHour).toLowerCase()}` : getGreeting(currentHour)}
          </div>
          <div style={{ fontSize: 19, color: C.muted, marginTop: 4 }}>Define tu intención y activa tus hábitos</div>
        </div>

        {/* Intention FIRST — compact */}
        <textarea
          value={morningIntention}
          onChange={e => setMorningIntention(e.target.value)}
          placeholder="Hoy quiero..."
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
            {profile.name ? `${profile.name}, ¿cómo te fue hoy?` : '¿Cómo te fue hoy?'}
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
              <div style={{ fontSize: 14, color: C.muted, fontWeight: 600, lineHeight: 1.2, overflowWrap: 'anywhere' }}>completados</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.subtle }}>{totalHabits - totalDone}</div>
              <div style={{ fontSize: 14, color: C.muted, fontWeight: 600, lineHeight: 1.2, overflowWrap: 'anywhere' }}>pendientes</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.gold }}>{totalHabits > 0 ? Math.round((totalDone / totalHabits) * 100) : 0}%</div>
              <div style={{ fontSize: 14, color: C.muted, fontWeight: 600, lineHeight: 1.2, overflowWrap: 'anywhere' }}>progreso</div>
            </div>
          </div>
          {/* Uncompleted habits */}
          {habits.filter(h => !checked[h.id]).length > 0 && (
            <div>
              <div style={{ fontSize: 20, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Puedes completar aún:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {habits.filter(h => !checked[h.id]).map(h => (
                  <button type="button" role="checkbox" aria-checked={!!checked[h.id]} key={h.id} onClick={() => toggleHabit(h.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    background: C.card, borderRadius: 10, cursor: 'pointer', border: `1px solid ${C.border}`,
                    width: '100%', margin: 0, textAlign: 'left', fontFamily: 'inherit', color: 'inherit',
                  }}>
                    <span aria-hidden="true" style={{
                      width: 18, height: 18, borderRadius: 5, border: `2px solid ${DIMS[h.dim].color}`,
                      background: 'transparent', flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 19, color: C.text, fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{ICONS[DIMS[h.dim].icon](DIMS[h.dim].color, 14)} {h.name}</span>
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

  /* ── Panic Modal — Full Crisis Support ── */
  const GROUND_STEPS = [
    { sense: '👀 VER', prompt: 'Nombra 5 cosas que puedes VER ahora mismo', count: 5, color: '#BFD5EB' },
    { sense: '✋ TOCAR', prompt: 'Nombra 4 cosas que puedes TOCAR', count: 4, color: '#E3E5D3' },
    { sense: '👂 ESCUCHAR', prompt: 'Nombra 3 cosas que puedes ESCUCHAR', count: 3, color: '#D6BFDD' },
    { sense: '👃 OLER', prompt: 'Nombra 2 cosas que puedes OLER', count: 2, color: '#BFD5EB' },
    { sense: '👅 SABOREAR', prompt: 'Nombra 1 cosa que puedes SABOREAR', count: 1, color: '#E3E5D3' },
  ]

  const DBT_SKILLS = [
    { name: 'TIPP', icon: '🧊', desc: 'Temperatura · Ejercicio Intenso · Respiración Pautada · Relajación Muscular',
      steps: ['Pon hielo o agua fría en tu cara 30 segundos', 'Haz ejercicio intenso 5-10 minutos (correr, saltar)', 'Respira 4 segundos inhala, 8 exhala × 5 veces', 'Tensa y relaja cada grupo muscular de pies a cabeza'] },
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
          <div style={{ fontSize: 56, marginBottom: 16 }}></div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: FONT, lineHeight: 1.3, marginBottom: 8 }}>
            Estás a salvo.
          </div>
          <div style={{ fontSize: 20, color: '#E3E5D3', textAlign: 'center', marginBottom: 8 }}>
            Respira. Este momento va a pasar.
          </div>
          <div style={{ fontSize: 19, color: '#D6BFDD', textAlign: 'center', marginBottom: 32 }}>
            Escoge lo que necesitas ahora mismo:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            {[
              { id: 'breathe', icon: '', title: 'Respiración 4-7-8', sub: 'Calma tu sistema nervioso en 2 minutos', color: '#BFD5EB' },
              { id: 'ground', icon: '🌍', title: 'Grounding 5-4-3-2-1', sub: 'Vuelve al presente con tus sentidos', color: '#E3E5D3' },
              { id: 'dbt', icon: '', title: 'Skills DBT', sub: 'TIPP · STOP · Acción Opuesta · Aceptación Radical', color: '#D6BFDD' },
              { id: 'accept', icon: '🙏', title: 'Aceptación Radical', sub: 'Soltar la lucha. Abrazar lo que es.', color: '#141833' },
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
                <div style={{ fontSize: 28, minWidth: 40, textAlign: 'center' }}>{opt.icon}</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{opt.title}</div>
                  <div style={{ fontSize: 20, color: '#E3E5D3', marginTop: 2 }}>{opt.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Go to community */}
          <button onClick={() => { setShowPanic(false); openModule('juntas', '', { silent: true }) }} style={{
            marginTop: 24, width: '100%', padding: '14px 18px',
            background: 'rgba(114,109,45,0.2)', borderRadius: 16,
            border: '1px solid rgba(114,109,45,0.4)', cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#E3E5D3' }}>💬 Ir a la Comunidad</div>
            <div style={{ fontSize: 20, color: '#E3E5D3', marginTop: 4 }}>
              {/* Sin premium no se puede publicar: no prometer que puede preguntar. */}
              {isPremium ? 'Pregunta lo que necesites. Te responde la Guía IA de Ronda.' : 'Lee cómo acompaña la Guía IA de Ronda. Es anónimo.'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontStyle: 'italic' }}>Contenido educativo. No reemplaza atención en crisis.</div>
          </button>
        </>}

        {/* ── BREATHE: 4-7-8 Guided Breathing ── */}
        {panicScreen === 'breathe' && <>
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
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
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

          {!breatheActive && breatheCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12, color: C.teal, opacity: 0.3 }}>●</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>Lo hiciste.</div>
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
            <div style={{ fontSize: 64, marginBottom: 16 }}>{GROUND_STEPS[groundStep].sense.split(' ')[0]}</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: GROUND_STEPS[groundStep].color, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
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
            <div style={{ fontSize: 24, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: FONT, marginBottom: 12 }}>
              Estás aquí. Estás presente.
            </div>
            <div style={{ fontSize: 19, color: '#E3E5D3', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
              Acabas de reconectar con tus sentidos. Tu cuerpo sabe que estás a salvo.
            </div>
            <button onClick={() => setGroundStep(0)} style={{
              padding: '12px 28px', borderRadius: 20, background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: 20,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginRight: 10,
            }}>Repetir</button>
            <button onClick={() => setPanicScreen('home')} style={{
              padding: '12px 28px', borderRadius: 20, background: C.rose,
              border: 'none', color: 'white', fontSize: 20,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Volver</button>
          </>)}
        </>}

        {/* ── DBT: Skills menu ── */}
        {panicScreen === 'dbt' && <>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: FONT, marginBottom: 6 }}>
            Skills DBT
          </div>
          <div style={{ fontSize: 19, color: '#E3E5D3', textAlign: 'center', marginBottom: 24 }}>
            Herramientas de regulación emocional. Escoge la que necesitas.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            {DBT_SKILLS.map((skill, idx) => (
              <div key={skill.name}>
                <button onClick={() => setPanicDbtExpanded(panicDbtExpanded === idx ? null : idx)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                  background: panicDbtExpanded === idx ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                  borderRadius: panicDbtExpanded === idx ? '16px 16px 0 0' : 16,
                  border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{ fontSize: 26 }}>{skill.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>{skill.name}</div>
                    <div style={{ fontSize: 19, color: '#E3E5D3', marginTop: 2 }}>{skill.desc}</div>
                  </div>
                  <span style={{ color: '#D6BFDD', fontSize: 18 }}>{panicDbtExpanded === idx ? '▲' : '▼'}</span>
                </button>
                {panicDbtExpanded === idx && (
                  <div style={{
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
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: FONT, lineHeight: 1.3, marginBottom: 12 }}>
            Aceptación Radical
          </div>
          <div style={{ fontSize: 20, color: '#E3E5D3', textAlign: 'center', marginBottom: 32, lineHeight: 1.6 }}>
            No significa que apruebas lo que pasa.<br/>Significa que dejas de luchar contra la realidad.
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

      {/* Línea de crisis: fija abajo en todas las pantallas de la Ayuda */}
      {panicOrigen === 'ayuda' && (
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
        </div>
      )}
    </div>
  )

  /* ── Render: telón morado arriba, hoja clara redondeada con el contenido ── */
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.morado, fontFamily: FONT }}>
      {header}
      <main inert={fondoInerte} style={{
        background: C.hoja, borderRadius: '24px 24px 0 0',
        minHeight: 'calc(100vh - 110px)',
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
          {subTab === 'ai' && (isPremium ? aiAgentView : <Paywall feature="Tu Ronda · IA personal" price={PLAN_PRECIO} desc="Tu compañera de bienestar 24/7. Recuerda quién eres, te acompaña, te orienta y crea programas personalizados solo para ti." onCta={() => setAppModal({ type: 'info', title: 'Próximamente', body: `Estamos finalizando el sistema de pago para ${PLAN_PAGO}. Te avisaremos cuando esté listo. 💛`, cta: 'Entendido' })} />)}
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
          />
          {(subTab || 'board') === 'board' && boardView}
          {subTab === 'directorio' && directorioView}
        </>}

        {view === 'perfil' && perfilView}

        <p style={{ margin: '32px 0 0', fontSize: 12, color: C.subtle, lineHeight: 1.5, textAlign: 'center', fontStyle: 'italic' }}>
          Ronda ofrece herramientas de bienestar y contenido educativo. No reemplaza atención médica o psicológica profesional. Si estás en crisis, llama a la <LineaCrisis numero="106">Línea 106</LineaCrisis>, o al <LineaCrisis numero="123">123</LineaCrisis> si estás en peligro inmediato.
        </p>
      </main>
      {panicModal}
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

            {/* En 'confirm' el foco empieza en "Cancelar": Enter no borra por accidente */}
            <button type="button" data-autofocus={appModal.type === 'confirm' ? undefined : true} onClick={() => {
              if (appModal.type === 'paywall') {
                track('paywall_cta_clicked', { title: appModal.title })
                openModule('perfil')
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
                Ahora no
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

      {/* ─── Aviso: una miembro fundadora tiene incluida esta función premium ───
          Arriba, bajo el encabezado, para no tapar el campo del chat ni el
          menú, y nunca encima de un diálogo. Centrado sin transform (la
          animación no lo descentra). La región viva existe siempre, así el
          lector de pantalla lo anuncia. */}
      <div role="status" aria-live="polite">
        {foundingToast && !fondoInerte && (
          <div style={{
            position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 136px)', left: 16, right: 16,
            margin: '0 auto', maxWidth: 420, zIndex: 9999,
            background: `linear-gradient(135deg, ${C.gold}, ${C.rose})`,
            borderRadius: 18, padding: '14px 12px 14px 20px',
            boxShadow: '0 8px 32px rgba(114,109,45,0.45)',
            color: 'white',
            animation: 'slideDown 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div aria-hidden="true" style={{ fontSize: 26, lineHeight: 1, marginTop: 6 }}>💛</div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.9, marginBottom: 4 }}>
                  Miembro fundadora
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>
                  {foundingToast.feature} es una función premium.
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.4, opacity: 0.95 }}>
                  La tienes incluida por ser de las primeras 50 mujeres en Ronda. Disfrútala. 💛
                </div>
              </div>
              <button type="button" aria-label="Cerrar aviso" onClick={() => setFoundingToast(null)} style={{
                background: 'none', border: 'none', padding: 0,
                width: 44, height: 44, cursor: 'pointer',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span aria-hidden="true" style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{UI_ICONS.close('white', 14)}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
