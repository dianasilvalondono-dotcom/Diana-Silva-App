import { useState, useEffect, useMemo } from 'react'
import './App.css'

/* ── Color tokens — Nude + Rosa Viejo + Dorado ── */
const C = {
  rose:     '#C4878E',
  roseDark: '#A66B72',
  roseLight:'#DDB3B7',
  gold:     '#C8A96E',
  goldDark: '#A68B52',
  goldLight:'#E2D1A8',
  nude:     '#F2E8DE',
  cream:    '#FAF5F0',
  card:     '#FFFFFF',
  border:   '#E8DED4',
  text:     '#2D2420',
  muted:    '#8A7B72',
  subtle:   '#B5A99E',
  green:    '#7BA56E',
  greenDone:'#9BBF90',
  beige:    '#F2E8DE',
}

/* ── Dimension config ── */
const DIMS = {
  espiritual: { emoji: '🕊️', color: '#C4878E', label: 'Espiritual' },
  emocional:  { emoji: '🌻', color: '#C8A96E', label: 'Emocional' },
  fisico:     { emoji: '💪', color: '#A68B52', label: 'Físico' },
  mental:     { emoji: '🧠', color: '#A66B72', label: 'Mental' },
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
  { text: 'Quiero a quien me quiera y dejo ir lo que tiene que irse.', author: 'Diana', cat: 'serenidad' },
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
  { id: 'podcast',    emoji: '🎙️', label: 'Podcasts',      color: '#C4878E' },
  { id: 'libro',      emoji: '📚', label: 'Libros',        color: '#C8A96E' },
  { id: 'curso',      emoji: '🎓', label: 'Cursos',        color: '#A66B72' },
  { id: 'tedtalk',    emoji: '🎤', label: 'Ted Talks',     color: '#A68B52' },
  { id: 'musica',     emoji: '🎵', label: 'Música',        color: '#C4878E' },
  { id: 'masterclass',emoji: '🏆', label: 'Masterclasses', color: '#C8A96E' },
  { id: 'wellness',   emoji: '🧘', label: 'Wellness',      color: '#A66B72' },
  { id: 'otro',       emoji: '🔗', label: 'Otros',         color: '#B5A99E' },
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

  const NAV = [
    { id: 'inicio',  label: 'Mi día',     icon: '🏡' },
    { id: 'toolkit', label: 'Toolkit',     icon: '🧰' },
    { id: 'habitos', label: 'Mis hábitos',icon: '🌱' },
    { id: 'rutina',  label: 'Mi rutina',  icon: '🍃' },
    { id: 'diario',  label: 'Diario',     icon: '📔' },
    { id: 'frases',  label: 'Frases',     icon: '✨' },
  ]

  /* ── Top Header ── */
  const header = (
    <div style={{
      background: 'linear-gradient(135deg, #A66B72 0%, #C4878E 50%, #DDB3B7 100%)',
      padding: '20px 20px 16px', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>🌿 Ronda</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontStyle: 'italic' }}>Your circle of power</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginTop: 3 }}>{formatDate()} · Hábitos: {totalDone}/{totalHabits}</div>
        </div>
      </div>
    </div>
  )

  /* ── Bottom Navigation ── */
  const bottomNav = (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 600, background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)', borderTop: `1px solid ${C.border}`,
      display: 'flex', padding: '6px 8px 18px', zIndex: 100,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
    }}>
      {NAV.map(n => (
        <NavItem key={n.id} icon={n.icon} label={n.label} active={view === n.id} onClick={() => setView(n.id)} />
      ))}
    </div>
  )

  /* ── INICIO ── */
  const inicioView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Greeting */}
      <div style={{ padding: 20, background: 'linear-gradient(135deg, #C4878E, #DDB3B7)', borderRadius: 18, color: 'white' }}>
        <div style={{ fontSize: 26, fontWeight: 900 }}>{getGreeting()}, Diana</div>
        <div style={{ fontSize: 15, opacity: 0.9, marginTop: 6, fontWeight: 600, letterSpacing: '0.01em' }}>La mujer que quieres ser, empieza hoy ✨</div>
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
          background: journalText.trim() ? 'linear-gradient(135deg, #A66B72, #C4878E)' : C.border,
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
      <div style={{ background: 'linear-gradient(135deg, #A66B72, #C4878E, #DDB3B7)', borderRadius: 18, padding: 22, color: 'white' }}>
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
      <div style={{ background: 'linear-gradient(135deg, #A66B72, #C4878E, #DDB3B7)', borderRadius: 18, padding: 20, color: 'white' }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Mi Toolkit</div>
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
      </div>
      {bottomNav}
    </div>
  )
}

export default App
