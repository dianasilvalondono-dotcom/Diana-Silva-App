import { useState, useEffect, useMemo } from 'react'
import './App.css'

/* ── Color tokens — Brand Book Ronda ── */
const C = {
  rose:     '#C4908A',   // Rosa Viejo — Primary (60%)
  roseDark: '#A6716B',   // Rosa Viejo oscuro
  roseLight:'#E8C4C0',   // Rosa Claro — Secondary
  rosePale: '#F5E1DE',   // Rosa Pálido — Background accent
  gold:     '#C9A96E',   // Dorado — Accent (15%)
  goldDark: '#A68B52',   // Dorado oscuro
  goldLight:'#E8D5A8',   // Dorado Claro — Accent Light
  cream:    '#FBF6F3',   // Crema base (25%)
  card:     '#FFFFFF',   // Cards
  border:   '#E8DED4',   // Borders
  text:     '#4A3035',   // Charcoal — Brand Book text
  muted:    '#7A6065',   // Muted text
  subtle:   '#B5A099',   // Subtle text
  green:    '#7BA56E',   // Success
  greenDone:'#9BBF90',   // Done state
  nude:     '#F5E1DE',   // Background nude
  beige:    '#F5E1DE',   // Beige = Rosa Pálido
}

/* ── Dimension config ── */
const DIMS = {
  espiritual: { emoji: '🕊️', color: '#C4908A', label: 'Espiritual' },
  emocional:  { emoji: '🌻', color: '#C9A96E', label: 'Emocional' },
  fisico:     { emoji: '💪', color: '#A68B52', label: 'Físico' },
  mental:     { emoji: '🧠', color: '#A6716B', label: 'Mental' },
}

/* ── Default habits ── */
const DEFAULT_HABITS = [
  { id: 1,  name: 'Oración y gratitud — evangelio y meditaciones', dim: 'espiritual' },
  { id: 2,  name: 'Meditación mañana',                            dim: 'espiritual' },
  { id: 3,  name: 'Meditación de noche',                          dim: 'espiritual' },
  { id: 4,  name: 'Lectura noche',                                dim: 'espiritual' },
  { id: 5,  name: 'Respira y Pausa Activa',                       dim: 'emocional' },
  { id: 6,  name: 'Respira Profundo — Estoy a salvo',             dim: 'emocional' },
  { id: 7,  name: 'Journaling / Reflexión del día',               dim: 'emocional' },
  { id: 8,  name: 'Gym',                                          dim: 'fisico' },
  { id: 9,  name: 'Caldo + Paseo',                                dim: 'fisico' },
  { id: 10, name: 'Proteína + Creatina',                          dim: 'fisico' },
  { id: 11, name: 'Ajedrez',                                      dim: 'mental' },
  { id: 12, name: 'Momento Mori — Take nothing personally',       dim: 'mental' },
]

/* ── Default routines ── */
const DEFAULT_MORNING = [
  { id: 1, time: '7:05', task: 'Intención del día: Oración y gratitud', emoji: '🙏' },
  { id: 2, time: '7:20', task: 'Caldo + Paseo', emoji: '🚶‍♀️' },
  { id: 3, time: '7:35', task: 'Meditación', emoji: '🧘' },
  { id: 4, time: '7:40', task: 'Afirmación: Momento Mori. Solo tengo hoy.', emoji: '⏳' },
  { id: 5, time: '8:00', task: 'Gym', emoji: '💪' },
  { id: 6, time: '9:35', task: 'Proteína + Creatina', emoji: '🥤' },
]
const DEFAULT_MIDDAY = [
  { id: 20, time: '10:45', task: 'Oración de serenidad', emoji: '🕊️' },
  { id: 21, time: '11:45', task: 'Respira Profundo — Estoy a salvo', emoji: '🌬️' },
  { id: 22, time: '14:00', task: 'Entrega a Dios — Tú eres el poder y la sanidad', emoji: '✝️' },
  { id: 23, time: '15:45', task: 'Libero el dolor y doy la bienvenida al amor', emoji: '💛' },
  { id: 24, time: '16:30', task: 'Respira y Pausa Activa', emoji: '🧘‍♀️' },
]
const DEFAULT_NIGHT = [
  { id: 7,  time: '18:30', task: 'Lectura noche', emoji: '📖' },
  { id: 8,  time: '19:00', task: 'Meditación de noche', emoji: '🧘' },
  { id: 9,  time: '19:35', task: 'Soltar y rendirme a Dios', emoji: '🙏' },
  { id: 10, time: '21:00', task: 'Me perdono y descanso en Dios', emoji: '🌙' },
]

/* ── Quotes collection ── */
const QUOTES = [
  { text: 'Libero todo el dolor de mi pasado y doy la bienvenida a la salud, la alegría, el amor y el éxito que me corresponden.', author: 'Diana', cat: 'sanacion' },
  { text: 'Respira y Pausa Activa — No tengo que decidir nada ahora. Estoy a salvo.', author: 'Diana', cat: 'serenidad' },
  { text: 'El control fue mi intento de no perder; Soltar y rendirme a Dios es mi forma de no PERDERME A MI.', author: 'Diana', cat: 'espiritual' },
  { text: 'Hoy hice lo mejor que pude con las herramientas que tengo. Me perdono y descanso en Dios.', author: 'Diana', cat: 'sanacion' },
  { text: 'Diana, take nothing personally today. Time is ticking. You only have today. Momento Mori.', author: 'Diana', cat: 'motivacional' },
  { text: 'Dios concédeme serenidad para aceptar todo aquello que no puedo cambiar, valor para cambiar lo que soy capaz de cambiar y sabiduría para entender la diferencia.', author: 'Oración de Serenidad', cat: 'espiritual' },
  { text: 'Respira Profundo Diana — No tengo que decidir nada ahora. Estoy a salvo.', author: 'Diana', cat: 'serenidad' },
  { text: 'Dios mi vida se volvió inmanejable y no tengo poder sobre mi, ni sobre otros. Tú eres el poder y la sanidad.', author: 'Diana', cat: 'espiritual' },
  { text: 'You can be kind and lovely and still tell people to fuck off.', author: 'Diana', cat: 'motivacional' },
  { text: 'Diana, te perdono por haberte dado el valor en la elección de otros. Te perdono por haber confundido poder con amor y atención con seguridad. Hoy te elijo yo.', author: 'Diana', cat: 'sanacion' },
  { text: 'Everybody is going through something. Be kind.', author: 'Diana', cat: 'sabiduria' },
  { text: 'God, I give to You all that I am and all that I will be for Your healing and direction.', author: 'Diana', cat: 'espiritual' },
  { text: 'Quiero a quien me quiera y dejo ir lo que tiene que irse.', author: 'Marta Botero', cat: 'serenidad' },
  { text: 'La paz viene de adentro. No la busques afuera.', author: 'Buda', cat: 'sabiduria' },
  { text: 'Cada mañana nacemos de nuevo. Lo que hacemos hoy es lo que más importa.', author: 'Buda', cat: 'espiritual' },
  { text: 'La felicidad no es algo hecho. Viene de tus propias acciones.', author: 'Dalai Lama', cat: 'sabiduria' },
  { text: 'La disciplina es el puente entre metas y logros.', author: 'Jim Rohn', cat: 'motivacional' },
  { text: 'La oración no cambia a Dios, pero cambia a quien ora.', author: 'Søren Kierkegaard', cat: 'espiritual' },
  { text: 'El agua no lucha. Fluye. Y al fluir, es poderosa.', author: 'Lao Tzu', cat: 'sabiduria' },
  { text: 'Eres más fuerte de lo que crees y más valiente de lo que imaginas.', author: 'A.A. Milne', cat: 'motivacional' },
]

/* ── Toolkit categories ── */
const TOOLKIT_CATS = [
  { id: 'podcast',    emoji: '🎙️', label: 'Podcasts',      color: '#C4908A' },
  { id: 'libro',      emoji: '📚', label: 'Libros',        color: '#C9A96E' },
  { id: 'curso',      emoji: '🎓', label: 'Cursos',        color: '#A6716B' },
  { id: 'tedtalk',    emoji: '🎤', label: 'Ted Talks',     color: '#A68B52' },
  { id: 'musica',     emoji: '🎵', label: 'Música',        color: '#C4908A' },
  { id: 'masterclass',emoji: '🏆', label: 'Masterclasses', color: '#C9A96E' },
  { id: 'wellness',   emoji: '🧘', label: 'Wellness',      color: '#A6716B' },
  { id: 'otro',       emoji: '🔗', label: 'Otros',         color: '#B5A099' },
]

/* ── Helpers ── */
const todayKey = () => new Date().toISOString().slice(0, 10)
const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback } }
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val))

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate() {
  const d = new Date()
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`
}

function getDayQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}

const MOODS = ['😢','😐','🙂','😊','🤩']

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
      background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      borderLeft: `3px solid ${d.color}`, flex: '1 1 140px', minWidth: 140, cursor: 'pointer',
      transition: 'transform 0.15s', ':hover': { transform: 'translateY(-2px)' },
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.emoji} {d.label}</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: d.color }}>{pct}%</span>
      </div>
      <Bar value={pct} color={d.color} />
      <div style={{ fontSize: 12, color: C.subtle, marginTop: 4 }}>{done}/{total} completados</div>
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
      <span style={{ fontSize: 12, fontWeight: active ? 800 : 600, letterSpacing: '0.02em' }}>{label}</span>
      {active && <div style={{ width: 5, height: 5, borderRadius: 3, background: C.rose, marginTop: 2 }} />}
    </button>
  )
}

/* ═══════════════════════════════════════════ */
/*                   APP                       */
/* ═══════════════════════════════════════════ */

function App() {
  const [view, setView] = useState('inicio')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Habits
  const [habits, setHabits] = useState(() => load('diana-habits', DEFAULT_HABITS))
  const [checked, setChecked] = useState(() => load(`diana-checked-${todayKey()}`, {}))
  const [streaks, setStreaks] = useState(() => load('diana-streaks', {}))

  // Routines
  const [morning] = useState(() => load('diana-morning', DEFAULT_MORNING))
  const [midday] = useState(() => load('diana-midday', DEFAULT_MIDDAY))
  const [night] = useState(() => load('diana-night', DEFAULT_NIGHT))
  const [routineChecked, setRoutineChecked] = useState(() => load(`diana-routine-${todayKey()}`, {}))

  // Journal
  const [entries, setEntries] = useState(() => load('diana-journal', []))
  const [journalText, setJournalText] = useState('')
  const [journalMood, setJournalMood] = useState(2)

  // Quotes
  const [favQuotes, setFavQuotes] = useState(() => load('diana-fav-quotes', []))
  const [quoteFilter, setQuoteFilter] = useState('todas')

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
    name: '', city: '', bio: '', intention: '', emoji: '🌸',
  }))
  const [editingProfile, setEditingProfile] = useState(false)

  // Onboarding
  const [onboarded, setOnboarded] = useState(() => load('ronda-onboarded', false))
  const [onboardStep, setOnboardStep] = useState(0)
  const [onboardName, setOnboardName] = useState('')

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
  useEffect(() => { save(`diana-checked-${todayKey()}`, checked) }, [checked])
  useEffect(() => { save('diana-streaks', streaks) }, [streaks])
  useEffect(() => { save(`diana-routine-${todayKey()}`, routineChecked) }, [routineChecked])
  useEffect(() => { save('diana-journal', entries) }, [entries])
  useEffect(() => { save('diana-fav-quotes', favQuotes) }, [favQuotes])
  useEffect(() => { save('diana-toolkit', toolkitItems) }, [toolkitItems])
  useEffect(() => { save('diana-profile', profile) }, [profile])

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

  const toggleHabit = (id) => {
    const next = { ...checked, [id]: !checked[id] }
    setChecked(next)
    if (next[id]) {
      setStreaks(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    }
  }

  const toggleRoutine = (id) => {
    setRoutineChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const addJournalEntry = () => {
    if (!journalText.trim()) return
    const entry = { id: Date.now(), date: todayKey(), text: journalText, mood: journalMood, time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) }
    setEntries([entry, ...entries])
    setJournalText('')
    setJournalMood(2)
  }

  const addHabit = () => {
    if (!newHabitName.trim()) return
    const id = Date.now()
    setHabits([...habits, { id, name: newHabitName.trim(), dim: newHabitDim }])
    setNewHabitName('')
    setShowAddHabit(false)
  }

  const removeHabit = (id) => {
    setHabits(habits.filter(h => h.id !== id))
  }

  const toggleFavQuote = (idx) => {
    setFavQuotes(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
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
    setToolkitItems(toolkitItems.filter(t => t.id !== id))
  }

  const quote = getDayQuote()

  /* ── Brand Icons (SVG, Ronda style) ── */
  const BrandIcon = ({ children, active }) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14.5" stroke={active ? C.gold : C.rose} strokeWidth="2" fill={active ? 'rgba(201,169,110,0.1)' : 'none'} />
      {children}
    </svg>
  )
  const NAV_ICONS = {
    /* Mi día — sol con rayos */
    inicio: (a) => <BrandIcon active={a}><circle cx="16" cy="16" r="4" fill={a ? C.gold : C.rose} /><g stroke={a ? C.gold : C.rose} strokeWidth="1.5" strokeLinecap="round">{[[16,5,16,8],[16,24,16,27],[5,16,8,16],[24,16,27,16],[8.5,8.5,10.6,10.6],[21.4,21.4,23.5,23.5],[8.5,23.5,10.6,21.4],[21.4,10.6,23.5,8.5]].map(([x1,y1,x2,y2],i)=><line key={i} x1={x1} y1={y1} x2={x2} y2={y2}/>)}</g></BrandIcon>,
    /* Toolkit — estrella de 4 puntas */
    toolkit: (a) => <BrandIcon active={a}><path d="M16 7 L18 13 L24 16 L18 19 L16 25 L14 19 L8 16 L14 13 Z" fill={a ? C.gold : C.rose} opacity="0.85" /></BrandIcon>,
    /* Mis hábitos — check/flama ascendente */
    habitos: (a) => <BrandIcon active={a}><path d="M11 16.5 L14.5 20 L21 12" stroke={a ? C.gold : C.rose} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></BrandIcon>,
    /* Mi rutina — infinito */
    rutina: (a) => <BrandIcon active={a}><path d="M9 16 C9 12.5 12 12.5 14 14.5 L18 17.5 C20 19.5 23 19.5 23 16 C23 12.5 20 12.5 18 14.5 L14 17.5 C12 19.5 9 19.5 9 16 Z" stroke={a ? C.gold : C.rose} strokeWidth="2.2" strokeLinecap="round" fill="none" /></BrandIcon>,
    /* Diario — burbuja de pensamiento */
    diario: (a) => <BrandIcon active={a}><path d="M8 15 Q8 9 16 9 Q24 9 24 15 Q24 21 16 21 L13 21 L10 24 L11 21 Q8 20.5 8 15 Z" fill={a ? C.gold : C.rose} opacity="0.85" /><line x1="12" y1="13" x2="20" y2="13" stroke="white" strokeWidth="1.2" strokeLinecap="round" /><line x1="12" y1="16.5" x2="18" y2="16.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" /></BrandIcon>,
    /* Frases — comillas */
    frases: (a) => <BrandIcon active={a}><g fill={a ? C.gold : C.rose} opacity="0.85"><circle cx="12" cy="14" r="3" /><path d="M12 17 Q9 17 10 21 L13 20 Q14 17 12 17Z" /><circle cx="21" cy="14" r="3" /><path d="M21 17 Q18 17 19 21 L22 20 Q23 17 21 17Z" /></g></BrandIcon>,
  }

  const NAV = [
    { id: 'inicio',  label: 'Mi día' },
    { id: 'toolkit', label: 'Toolkit' },
    { id: 'habitos', label: 'Mis hábitos' },
    { id: 'rutina',  label: 'Mi rutina' },
    { id: 'diario',  label: 'Diario' },
    { id: 'frases',  label: 'Frases' },
  ]

  /* ── Logo ── */
  const logoIcon = (
    <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid #C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C9A96E' }} />
    </div>
  )
  const logo = (
    <button onClick={() => setView('inicio')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      {logoIcon}
      <span style={{ fontSize: 24, fontWeight: 400, color: 'white', letterSpacing: '0.15em', fontFamily: 'Georgia, "Times New Roman", serif' }}>Ronda</span>
    </button>
  )

  /* ── Top Header ── */
  const header = (
    <div style={{
      background: 'linear-gradient(135deg, #4A3035 0%, #6B4449 50%, #C4908A 100%)',
      padding: '20px 20px 16px', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {logo}
            <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)' }} />
            <span style={{ fontSize: 16, color: '#E8D5A8', fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", serif' }}>Creces tú, crecemos todas</span>
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginTop: 4 }}>{formatDate()} · Hábitos: {totalDone}/{totalHabits}</div>
        </div>
        <button onClick={() => setView('perfil')} style={{
          width: 40, height: 40, borderRadius: '50%', border: '2px solid #C9A96E',
          background: 'rgba(201,169,110,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, padding: 0,
        }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9A96E' }} />
          </div>
        </button>
      </div>
    </div>
  )

  /* ── Bottom Navigation ── */
  const bottomNav = (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 600,
      background: C.cream,
      borderTop: `2px solid ${C.roseLight}`,
      display: 'flex', padding: '8px 4px 20px', zIndex: 100,
      boxShadow: '0 -4px 20px rgba(196,144,138,0.12)',
    }}>
      {NAV.map(n => {
        const isActive = view === n.id
        return (
          <button key={n.id} onClick={() => setView(n.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
          }}>
            {NAV_ICONS[n.id](isActive)}
            <span style={{
              fontSize: 11, fontWeight: isActive ? 800 : 600,
              color: isActive ? C.text : C.muted,
              fontFamily: 'inherit', letterSpacing: '0.01em',
            }}>{n.label}</span>
          </button>
        )
      })}
    </div>
  )

  /* ── INICIO ── */
  const inicioView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Greeting */}
      <div style={{ padding: 20, background: 'linear-gradient(135deg, #C4908A, #E8C4C0)', borderRadius: 18, color: 'white' }}>
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif' }}>{getGreeting()}{profile.name ? `, ${profile.name}` : ''}</div>
        <div style={{ fontSize: 15, opacity: 0.9, marginTop: 6, fontWeight: 600, letterSpacing: '0.01em', fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}>La mujer que quieres ser, empieza hoy ✨</div>
      </div>

      {/* Quote of the day */}
      <div style={{ background: C.card, borderRadius: 18, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderLeft: `4px solid ${C.rose}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.rose, marginBottom: 8 }}>✨ Frase del día</div>
        <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.6, fontStyle: 'italic', color: C.text }}>"{quote.text}"</div>
        <div style={{ fontSize: 14, marginTop: 8, color: C.muted, fontWeight: 600 }}>— {quote.author}</div>
      </div>

      {/* Progress ring */}
      <div style={{ background: C.card, borderRadius: 18, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Progreso de hoy</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: C.rose }}>{totalHabits > 0 ? Math.round((totalDone / totalHabits) * 100) : 0}%</span>
        </div>
        <Bar value={totalHabits > 0 ? (totalDone / totalHabits) * 100 : 0} height={8} />
        <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>{totalDone} de {totalHabits} hábitos completados</div>
      </div>

      {/* Dimension cards — clickable to navigate */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {Object.keys(DIMS).map(dim => (
          <DimCard key={dim} dim={dim} done={dimStats[dim].done} total={dimStats[dim].total} onClick={() => setView('habitos')} />
        ))}
      </div>

      {/* Today's mood */}
      {entries.length > 0 && entries[0].date === todayKey() && (
        <div style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Estado de ánimo hoy</div>
          <div style={{ fontSize: 36 }}>{MOODS[entries[0].mood]}</div>
        </div>
      )}
    </div>
  )

  /* ── HÁBITOS ── */
  const habitosView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Progress */}
      <div style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Hoy</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.rose }}>{totalDone}/{totalHabits}</span>
        </div>
        <Bar value={totalHabits > 0 ? (totalDone / totalHabits) * 100 : 0} />
      </div>

      {/* Habits by dimension */}
      {Object.entries(DIMS).map(([dim, cfg]) => {
        const dimHabits = habits.filter(h => h.dim === dim)
        if (dimHabits.length === 0) return null
        return (
          <div key={dim}>
            <div style={{ fontSize: 15, fontWeight: 800, color: cfg.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {cfg.emoji} {cfg.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dimHabits.map(h => (
                <div key={h.id} onClick={() => toggleHabit(h.id)} style={{
                  background: C.card, borderRadius: 12, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: `3px solid ${checked[h.id] ? C.greenDone : cfg.color}`,
                  transition: 'all 0.15s', opacity: checked[h.id] ? 0.65 : 1,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 7, border: `2px solid ${checked[h.id] ? C.greenDone : cfg.color}`,
                    background: checked[h.id] ? C.greenDone : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s',
                  }}>
                    {checked[h.id] && '✓'}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, textDecoration: checked[h.id] ? 'line-through' : 'none', color: checked[h.id] ? C.subtle : C.text, flex: 1 }}>
                    {h.name}
                  </span>
                  {streaks[h.id] > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, background: C.beige, padding: '2px 7px', borderRadius: 20 }}>
                      🔥 {streaks[h.id]}
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); removeHabit(h.id) }} style={{
                    background: 'none', border: 'none', fontSize: 14, color: C.subtle, cursor: 'pointer', padding: 4, lineHeight: 1,
                  }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Add habit */}
      {showAddHabit ? (
        <div style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: C.text }}>Nuevo hábito</div>
          <input value={newHabitName} onChange={e => setNewHabitName(e.target.value)} placeholder="Nombre del hábito..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
          />
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {Object.entries(DIMS).map(([key, d]) => (
              <button key={key} onClick={() => setNewHabitDim(key)} style={{
                padding: '5px 12px', borderRadius: 20, border: `2px solid ${d.color}`,
                background: newHabitDim === key ? d.color : 'transparent',
                color: newHabitDim === key ? 'white' : d.color,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {d.emoji} {d.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addHabit} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: C.rose, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Agregar
            </button>
            <button onClick={() => setShowAddHabit(false)} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: C.muted }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddHabit(true)} style={{
          padding: 12, borderRadius: 12, border: `2px dashed ${C.roseLight}`, background: 'transparent',
          color: C.rose, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          + Agregar hábito
        </button>
      )}
    </div>
  )

  /* ── RUTINA ── */
  const renderRoutineSection = (title, emoji, items, color) => (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        {emoji} {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => (
          <div key={item.id} onClick={() => toggleRoutine(item.id)} style={{
            background: C.card, borderRadius: 12, padding: '11px 14px',
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            opacity: routineChecked[item.id] ? 0.55 : 1, transition: 'all 0.15s',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', border: `2px solid ${routineChecked[item.id] ? C.greenDone : C.roseLight}`,
              background: routineChecked[item.id] ? C.greenDone : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, flexShrink: 0,
            }}>
              {routineChecked[item.id] && '✓'}
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.gold, minWidth: 44 }}>{item.time}</span>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: routineChecked[item.id] ? C.subtle : C.text, textDecoration: routineChecked[item.id] ? 'line-through' : 'none' }}>
              {item.task}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  const rutinaView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {renderRoutineSection('Mañana', '☀️', morning, C.rose)}
      <div style={{ height: 1, background: C.border }} />
      {renderRoutineSection('Afirmaciones del día', '🕊️', midday, C.gold)}
      <div style={{ height: 1, background: C.border }} />
      {renderRoutineSection('Noche', '🌙', night, C.roseDark)}
    </div>
  )

  /* ── DIARIO ── */
  const diarioView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* New entry */}
      <div style={{ background: C.card, borderRadius: 18, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: C.text }}>¿Cómo te sientes hoy?</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
          {MOODS.map((m, i) => (
            <button key={i} onClick={() => setJournalMood(i)} style={{
              fontSize: 28, background: journalMood === i ? C.beige : 'transparent',
              border: journalMood === i ? `2px solid ${C.rose}` : '2px solid transparent',
              borderRadius: 12, padding: 6, cursor: 'pointer', transition: 'all 0.15s',
              transform: journalMood === i ? 'scale(1.15)' : 'scale(1)',
            }}>
              {m}
            </button>
          ))}
        </div>
        <textarea value={journalText} onChange={e => setJournalText(e.target.value)}
          placeholder="Escribe tu reflexión del día..."
          style={{
            width: '100%', minHeight: 100, padding: 14, borderRadius: 12, border: `1px solid ${C.border}`,
            fontSize: 15, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6,
            boxSizing: 'border-box', background: C.cream,
          }}
        />
        <button onClick={addJournalEntry} disabled={!journalText.trim()} style={{
          marginTop: 10, width: '100%', padding: 12, borderRadius: 12, border: 'none',
          background: journalText.trim() ? 'linear-gradient(135deg, #C4908A, #A6716B)' : C.border,
          color: journalText.trim() ? 'white' : C.subtle,
          fontSize: 15, fontWeight: 700, cursor: journalText.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
        }}>
          Guardar reflexión 🌱
        </button>
      </div>

      {/* Entries grouped by date */}
      {entries.length > 0 && (() => {
        const grouped = {}
        entries.forEach(e => {
          if (!grouped[e.date]) grouped[e.date] = []
          grouped[e.date].push(e)
        })
        return (
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tu histórico ({entries.length} {entries.length === 1 ? 'entrada' : 'entradas'})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(grouped).map(([date, dayEntries]) => (
                <div key={date}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.rose, marginBottom: 6 }}>{date === todayKey() ? 'Hoy' : date}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dayEntries.map(e => (
                      <div key={e.id} style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>{e.time}</span>
                          <span style={{ fontSize: 20 }}>{MOODS[e.mood]}</span>
                        </div>
                        <div style={{ fontSize: 15, color: C.text, lineHeight: 1.6 }}>{e.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📔</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Tu diario está vacío</div>
          <div style={{ fontSize: 14, marginTop: 4 }}>Escribe tu primera reflexión arriba</div>
        </div>
      )}
    </div>
  )

  /* ── FRASES ── */
  const CATS = ['todas', 'espiritual', 'sanacion', 'serenidad', 'motivacional', 'sabiduria']
  const filteredQuotes = quoteFilter === 'todas' ? QUOTES : QUOTES.filter(q => q.cat === quoteFilter)
  const catLabels = { todas: 'Todas', espiritual: 'Espiritual', sanacion: 'Sanación', serenidad: 'Serenidad', motivacional: 'Motivacional', sabiduria: 'Sabiduría' }

  const frasesView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Quote of the day */}
      <div style={{ background: 'linear-gradient(135deg, #4A3035, #C4908A, #E8C4C0)', borderRadius: 18, padding: 22, color: 'white' }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: 8 }}>✨ Frase del día</div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5, fontStyle: 'italic' }}>"{quote.text}"</div>
        <div style={{ fontSize: 14, marginTop: 10, opacity: 0.85 }}>— {quote.author}</div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
        {CATS.map(cat => (
          <button key={cat} onClick={() => setQuoteFilter(cat)} style={{
            padding: '6px 14px', borderRadius: 20, border: `2px solid ${quoteFilter === cat ? C.rose : C.border}`,
            background: quoteFilter === cat ? C.rose : C.card, color: quoteFilter === cat ? 'white' : C.muted,
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>
            {catLabels[cat]}
          </button>
        ))}
      </div>

      {/* Quotes list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredQuotes.map((q, idx) => {
          const globalIdx = QUOTES.indexOf(q)
          const isFav = favQuotes.includes(globalIdx)
          const isDiana = q.author === 'Diana'
          return (
            <div key={idx} style={{
              background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              borderLeft: isDiana ? `3px solid ${C.rose}` : `3px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 15, color: C.text, lineHeight: 1.6, fontStyle: 'italic' }}>"{q.text}"</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: isDiana ? C.rose : C.muted, fontWeight: 600 }}>— {q.author}</span>
                  <span style={{ fontSize: 12, background: C.beige, padding: '2px 8px', borderRadius: 20, color: C.muted, fontWeight: 600 }}>
                    {catLabels[q.cat] || q.cat}
                  </span>
                </div>
                <button onClick={() => toggleFavQuote(globalIdx)} style={{
                  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4,
                }}>
                  {isFav ? '❤️' : '🤍'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  /* ── TOOLKIT ── */
  const filteredTools = toolFilter === 'todas' ? toolkitItems : toolkitItems.filter(t => t.cat === toolFilter)
  const toolkitCounts = TOOLKIT_CATS.reduce((acc, cat) => {
    acc[cat.id] = toolkitItems.filter(t => t.cat === cat.id).length
    return acc
  }, {})

  const toolkitView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #4A3035, #C4908A, #E8C4C0)', borderRadius: 18, padding: 20, color: 'white' }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif' }}>Mi Toolkit</div>
        <div style={{ fontSize: 15, opacity: 0.85, marginTop: 4 }}>Tus recursos de crecimiento, todo en un lugar</div>
        <div style={{ fontSize: 13, marginTop: 8, opacity: 0.7 }}>{toolkitItems.length} recursos guardados</div>
      </div>

      {/* Category chips with counts */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
        <button onClick={() => setToolFilter('todas')} style={{
          padding: '6px 14px', borderRadius: 20, border: `2px solid ${toolFilter === 'todas' ? C.rose : C.border}`,
          background: toolFilter === 'todas' ? C.rose : C.card, color: toolFilter === 'todas' ? 'white' : C.muted,
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
          Todas ({toolkitItems.length})
        </button>
        {TOOLKIT_CATS.map(cat => (
          toolkitCounts[cat.id] > 0 && (
            <button key={cat.id} onClick={() => setToolFilter(cat.id)} style={{
              padding: '6px 14px', borderRadius: 20, border: `2px solid ${toolFilter === cat.id ? cat.color : C.border}`,
              background: toolFilter === cat.id ? cat.color : C.card, color: toolFilter === cat.id ? 'white' : C.muted,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              {cat.emoji} {cat.label} ({toolkitCounts[cat.id]})
            </button>
          )
        ))}
      </div>

      {/* Add new resource */}
      {showAddTool ? (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: C.text }}>Agregar recurso</div>

          <input value={newToolName} onChange={e => setNewToolName(e.target.value)} placeholder="Nombre (ej: Podcast de Jay Shetty)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', marginBottom: 8, outline: 'none', boxSizing: 'border-box' }}
          />

          <input value={newToolUrl} onChange={e => setNewToolUrl(e.target.value)} placeholder="Link (ej: https://spotify.com/...)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', marginBottom: 8, outline: 'none', boxSizing: 'border-box' }}
          />

          <input value={newToolNote} onChange={e => setNewToolNote(e.target.value)} placeholder="Nota (opcional)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
          />

          {/* Category selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {TOOLKIT_CATS.map(cat => (
              <button key={cat.id} onClick={() => setNewToolCat(cat.id)} style={{
                padding: '5px 10px', borderRadius: 20, border: `2px solid ${cat.color}`,
                background: newToolCat === cat.id ? cat.color : 'transparent',
                color: newToolCat === cat.id ? 'white' : cat.color,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addToolkitItem} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: C.rose, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Guardar
            </button>
            <button onClick={() => setShowAddTool(false)} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: C.muted }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddTool(true)} style={{
          padding: 14, borderRadius: 12, border: `2px dashed ${C.roseLight}`, background: 'transparent',
          color: C.rose, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
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
                <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{cat.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{item.name}</div>
                  {item.note && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{item.note}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: 12, background: C.beige, padding: '2px 8px', borderRadius: 20, color: cat.color, fontWeight: 700 }}>
                      {cat.label}
                    </span>
                    {item.url && (
                      <a href={item.url.startsWith('http') ? item.url : `https://${item.url}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 13, color: C.rose, fontWeight: 700, textDecoration: 'none' }}
                        onClick={e => e.stopPropagation()}>
                        Abrir →
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={() => removeToolkitItem(item.id)} style={{
                  background: 'none', border: 'none', fontSize: 14, color: C.subtle, cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0,
                }}>✕</button>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🧰</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {toolFilter === 'todas' ? 'Tu toolkit está vacío' : 'No hay recursos en esta categoría'}
          </div>
          <div style={{ fontSize: 14, marginTop: 4 }}>Agrega tus podcasts, libros, cursos y más</div>
        </div>
      )}
    </div>
  )

  /* ── PERFIL ── */
  const AVATARS = ['🌸','🦋','🌻','🌙','✨','🔮','🧘‍♀️','💫','🌊','🪷','🕊️','☀️','🫶','💜','🧿','🪬']
  const profileStats = {
    daysActive: (() => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('diana-checked-'))
      return keys.length
    })(),
    totalEntries: entries.length,
    totalHabitsEver: Object.values(streaks).reduce((s, v) => s + v, 0),
    favQuotesCount: favQuotes.length,
    toolkitCount: toolkitItems.length,
  }

  const updateProfile = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const perfilView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Avatar & Name card */}
      <div style={{ background: 'linear-gradient(135deg, #4A3035, #C4908A, #E8C4C0)', borderRadius: 18, padding: 24, color: 'white', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{profile.emoji || '🌸'}</div>
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif' }}>{profile.name || 'Tu nombre'}</div>
        {profile.city && <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>📍 {profile.city}</div>}
        {profile.bio && <div style={{ fontSize: 14, opacity: 0.85, marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>"{profile.bio}"</div>}
        <button onClick={() => setEditingProfile(!editingProfile)} style={{
          marginTop: 14, padding: '8px 20px', borderRadius: 20, border: '2px solid rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {editingProfile ? 'Cerrar edición' : 'Editar perfil'}
        </button>
      </div>

      {/* Edit form */}
      {editingProfile && (
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 14 }}>Editar perfil</div>

          {/* Avatar picker */}
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Tu avatar</div>
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

          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Nombre</div>
          <input value={profile.name} onChange={e => updateProfile('name', e.target.value)} placeholder="¿Cómo te llamas?"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 15, fontFamily: 'inherit', marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
          />

          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Ciudad</div>
          <input value={profile.city} onChange={e => updateProfile('city', e.target.value)} placeholder="¿De dónde eres?"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 15, fontFamily: 'inherit', marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
          />

          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Bio</div>
          <textarea value={profile.bio} onChange={e => updateProfile('bio', e.target.value)} placeholder="Cuéntanos sobre ti en una frase..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 15, fontFamily: 'inherit', marginBottom: 12, outline: 'none', boxSizing: 'border-box', minHeight: 60, resize: 'vertical', lineHeight: 1.5 }}
          />

          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Mi intención</div>
          <textarea value={profile.intention} onChange={e => updateProfile('intention', e.target.value)} placeholder="¿Cuál es tu intención para este año?"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 15, fontFamily: 'inherit', marginBottom: 8, outline: 'none', boxSizing: 'border-box', minHeight: 60, resize: 'vertical', lineHeight: 1.5 }}
          />

          <button onClick={() => setEditingProfile(false)} style={{
            width: '100%', padding: 12, borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #C4908A, #A6716B)', color: 'white',
            fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
          }}>
            Guardar ✨
          </button>
        </div>
      )}

      {/* Intention card */}
      {profile.intention && !editingProfile && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderLeft: `4px solid ${C.gold}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.gold, marginBottom: 6 }}>🎯 Mi intención</div>
          <div style={{ fontSize: 15, color: C.text, lineHeight: 1.6 }}>{profile.intention}</div>
        </div>
      )}

      {/* Stats */}
      <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mis estadísticas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Días activa', value: profileStats.daysActive, icon: '📅', color: C.rose },
            { label: 'Hábitos cumplidos', value: profileStats.totalHabitsEver, icon: '🔥', color: C.gold },
            { label: 'Entradas diario', value: profileStats.totalEntries, icon: '📔', color: C.roseDark },
            { label: 'Frases favoritas', value: profileStats.favQuotesCount, icon: '❤️', color: C.roseLight },
            { label: 'Recursos guardados', value: profileStats.toolkitCount, icon: '🧰', color: C.goldDark },
            { label: 'Hoy', value: `${totalDone}/${totalHabits}`, icon: '✅', color: C.green },
          ].map((stat, i) => (
            <div key={i} style={{ background: C.cream, borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dimensions breakdown */}
      <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mis dimensiones hoy</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(DIMS).map(([dim, cfg]) => {
            const s = dimStats[dim]
            const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
            return (
              <div key={dim}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{cfg.emoji} {cfg.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>{pct}%</span>
                </div>
                <Bar value={pct} color={cfg.color} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  /* ── Onboarding ── */
  const finishOnboarding = () => {
    if (onboardName.trim()) {
      setProfile(prev => ({ ...prev, name: onboardName.trim() }))
      save('diana-profile', { ...profile, name: onboardName.trim() })
    }
    setOnboarded(true)
    save('ronda-onboarded', true)
  }

  const onboardSlides = [
    /* Slide 0 — Bienvenida */
    <div key={0} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', border: '3px solid #C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#C9A96E' }} />
        </div>
        <span style={{ fontSize: 36, fontWeight: 400, color: C.text, letterSpacing: '0.15em', fontFamily: 'Georgia, "Times New Roman", serif' }}>Ronda</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.4, marginBottom: 12 }}>
        Tu espacio de crecimiento
      </div>
      <div style={{ fontSize: 18, color: C.gold, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 40 }}>
        Creces tú, crecemos todas
      </div>
      <div style={{ width: 60, height: 1, background: C.roseLight, marginBottom: 40 }} />
      <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, maxWidth: 300 }}>
        Un lugar para cultivar tus hábitos, conectar con tu intención y crecer en cada dimensión de tu vida.
      </div>
    </div>,

    /* Slide 1 — Las 4 dimensiones */
    <div key={1} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        4 dimensiones, 1 tú
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 32, maxWidth: 280 }}>
        En Ronda trabajamos tu crecimiento desde cuatro pilares fundamentales
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 320 }}>
        {Object.entries(DIMS).map(([dim, cfg]) => (
          <div key={dim} style={{
            background: C.card, borderRadius: 16, padding: 20, textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `2px solid ${cfg.color}20`,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{cfg.emoji}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
          </div>
        ))}
      </div>
    </div>,

    /* Slide 2 — Qué puedes hacer */
    <div key={2} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        Todo lo que necesitas
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 32 }}>
        Herramientas diseñadas para tu crecimiento diario
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 320 }}>
        {[
          { icon: NAV_ICONS.inicio(false), title: 'Mi día', desc: 'Tu dashboard con el progreso del día' },
          { icon: NAV_ICONS.habitos(false), title: 'Hábitos', desc: 'Trackea tus hábitos por dimensión' },
          { icon: NAV_ICONS.rutina(false), title: 'Mi rutina', desc: 'Tu rutina de mañana y noche' },
          { icon: NAV_ICONS.diario(false), title: 'Diario', desc: 'Reflexiona y registra tu estado' },
          { icon: NAV_ICONS.frases(false), title: 'Frases', desc: 'Inspiración diaria para tu camino' },
          { icon: NAV_ICONS.toolkit(false), title: 'Toolkit', desc: 'Tus podcasts, libros y recursos' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: C.card, borderRadius: 14, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', textAlign: 'left' }}>
            <div style={{ flexShrink: 0 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{item.title}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>,

    /* Slide 3 — Nombre */
    <div key={3} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ width: 50, height: 50, borderRadius: '50%', border: '3px solid #C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#C9A96E' }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        ¿Cómo te llamas?
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 32 }}>
        Queremos conocerte para personalizar tu experiencia
      </div>
      <input
        value={onboardName}
        onChange={e => setOnboardName(e.target.value)}
        placeholder="Tu nombre"
        style={{
          width: '100%', maxWidth: 300, padding: '14px 18px', borderRadius: 14,
          border: `2px solid ${C.roseLight}`, fontSize: 18, fontFamily: 'inherit',
          textAlign: 'center', outline: 'none', color: C.text, background: C.card,
        }}
        onFocus={e => e.target.style.borderColor = C.gold}
        onBlur={e => e.target.style.borderColor = C.roseLight}
      />
      <button onClick={finishOnboarding} style={{
        marginTop: 32, padding: '14px 40px', borderRadius: 30,
        background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
        color: 'white', fontSize: 17, fontWeight: 800, border: 'none',
        cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em',
        boxShadow: '0 4px 16px rgba(196,144,138,0.35)',
      }}>
        Comenzar mi Ronda ✨
      </button>
    </div>,
  ]

  /* ── Onboarding screen ── */
  if (!onboarded) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {onboardSlides[onboardStep]}

        {/* Dots + Navigation */}
        <div style={{ position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Dots */}
          <div style={{ display: 'flex', gap: 8 }}>
            {onboardSlides.map((_, i) => (
              <div key={i} style={{
                width: onboardStep === i ? 24 : 8, height: 8, borderRadius: 4,
                background: onboardStep === i ? C.gold : C.roseLight,
                transition: 'all 0.3s',
              }} />
            ))}
          </div>

          {/* Buttons */}
          {onboardStep < 3 && (
            <div style={{ display: 'flex', gap: 16 }}>
              {onboardStep > 0 && (
                <button onClick={() => setOnboardStep(onboardStep - 1)} style={{
                  padding: '12px 28px', borderRadius: 25, border: `2px solid ${C.roseLight}`,
                  background: 'transparent', color: C.muted, fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Atrás
                </button>
              )}
              <button onClick={() => setOnboardStep(onboardStep + 1)} style={{
                padding: '12px 32px', borderRadius: 25, border: 'none',
                background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
                color: 'white', fontSize: 15, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 12px rgba(196,144,138,0.3)',
              }}>
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Render ── */
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {header}
      <div style={{ padding: isMobile ? 16 : 24, paddingBottom: 80 }}>
        {view === 'inicio'  && inicioView}
        {view === 'toolkit' && toolkitView}
        {view === 'habitos' && habitosView}
        {view === 'rutina'  && rutinaView}
        {view === 'diario'  && diarioView}
        {view === 'frases'  && frasesView}
        {view === 'perfil'  && perfilView}
      </div>
      {bottomNav}
    </div>
  )
}

export default App
