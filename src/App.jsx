import { useState, useEffect, useMemo } from 'react'
import './App.css'

/* ── Color tokens ── */
const C = {
  lavanda:  '#a78bfa',
  rosa:     '#f9a8d4',
  azul:     '#7dd3fc',
  menta:    '#6ee7b7',
  purple:   '#7c3aed',
  deepPurp: '#4c1d95',
  bg:       '#faf5ff',
  card:     '#ffffff',
  border:   '#f3e8ff',
  text:     '#1e1b4b',
  muted:    '#6b7280',
  subtle:   '#9ca3af',
  green:    '#22c55e',
  red:      '#ef4444',
}

/* ── Dimension config ── */
const DIMS = {
  espiritual: { emoji: '🧘', color: C.lavanda, label: 'Espiritual' },
  emocional:  { emoji: '💛', color: C.rosa,    label: 'Emocional' },
  fisico:     { emoji: '💪', color: C.azul,    label: 'Físico' },
  mental:     { emoji: '🧠', color: C.menta,   label: 'Mental' },
}

/* ── Default habits ── */
const DEFAULT_HABITS = [
  { id: 1,  name: 'Meditación',        dim: 'espiritual' },
  { id: 2,  name: 'Gratitud',          dim: 'espiritual' },
  { id: 3,  name: 'Lectura espiritual', dim: 'espiritual' },
  { id: 4,  name: 'Journaling',        dim: 'emocional' },
  { id: 5,  name: 'Conexión social',   dim: 'emocional' },
  { id: 6,  name: 'Acto de bondad',    dim: 'emocional' },
  { id: 7,  name: 'Ejercicio',         dim: 'fisico' },
  { id: 8,  name: 'Agua (8 vasos)',    dim: 'fisico' },
  { id: 9,  name: 'Sueño 7h+',        dim: 'fisico' },
  { id: 10, name: 'Lectura',           dim: 'mental' },
  { id: 11, name: 'Aprendizaje nuevo', dim: 'mental' },
  { id: 12, name: 'Sin redes 1h',      dim: 'mental' },
]

/* ── Default routines ── */
const DEFAULT_MORNING = [
  { id: 1, time: '5:30', task: 'Despertar', emoji: '☀️' },
  { id: 2, time: '5:45', task: 'Meditación', emoji: '🧘' },
  { id: 3, time: '6:00', task: 'Ejercicio', emoji: '💪' },
  { id: 4, time: '6:45', task: 'Ducha y arreglo', emoji: '🚿' },
  { id: 5, time: '7:15', task: 'Desayuno consciente', emoji: '🥑' },
  { id: 6, time: '7:45', task: 'Journaling', emoji: '📝' },
]
const DEFAULT_NIGHT = [
  { id: 7,  time: '21:00', task: 'Reflexión del día', emoji: '💭' },
  { id: 8,  time: '21:15', task: 'Lectura', emoji: '📖' },
  { id: 9,  time: '21:30', task: 'Agradecer 3 cosas', emoji: '🙏' },
  { id: 10, time: '22:00', task: 'Dormir', emoji: '🌙' },
]

/* ── Quotes collection ── */
const QUOTES = [
  { text: 'La paz viene de adentro. No la busques afuera.', author: 'Buda', cat: 'espiritual' },
  { text: 'Sé el cambio que deseas ver en el mundo.', author: 'Gandhi', cat: 'motivacional' },
  { text: 'La gratitud convierte lo que tenemos en suficiente.', author: 'Melody Beattie', cat: 'gratitud' },
  { text: 'El único modo de hacer un gran trabajo es amar lo que haces.', author: 'Steve Jobs', cat: 'motivacional' },
  { text: 'No es la montaña lo que conquistamos, sino a nosotros mismos.', author: 'Edmund Hillary', cat: 'motivacional' },
  { text: 'La mente es todo. En lo que piensas, te conviertes.', author: 'Buda', cat: 'sabiduria' },
  { text: 'Cada mañana nacemos de nuevo. Lo que hacemos hoy es lo que más importa.', author: 'Buda', cat: 'espiritual' },
  { text: 'Agradece lo que tienes; terminarás teniendo más.', author: 'Oprah Winfrey', cat: 'gratitud' },
  { text: 'La felicidad no es algo hecho. Viene de tus propias acciones.', author: 'Dalai Lama', cat: 'sabiduria' },
  { text: 'Tu cuerpo es un templo, pero solo si lo tratas como tal.', author: 'Astrid Alauda', cat: 'espiritual' },
  { text: 'La disciplina es el puente entre metas y logros.', author: 'Jim Rohn', cat: 'motivacional' },
  { text: 'Cuida tu cuerpo. Es el único lugar que tienes para vivir.', author: 'Jim Rohn', cat: 'sabiduria' },
  { text: 'No cuentes los días, haz que los días cuenten.', author: 'Muhammad Ali', cat: 'motivacional' },
  { text: 'La mayor gloria no es nunca caer, sino levantarse siempre.', author: 'Confucio', cat: 'sabiduria' },
  { text: 'Respira. Suelta. Recuerda quién eres.', author: 'Anónimo', cat: 'espiritual' },
  { text: 'Hoy elijo ser feliz. Hoy elijo amarme.', author: 'Anónimo', cat: 'gratitud' },
  { text: 'El agua no lucha. Fluye. Y al fluir, es poderosa.', author: 'Lao Tzu', cat: 'sabiduria' },
  { text: 'Eres más fuerte de lo que crees y más valiente de lo que imaginas.', author: 'A.A. Milne', cat: 'motivacional' },
  { text: 'La oración no cambia a Dios, pero cambia a quien ora.', author: 'Søren Kierkegaard', cat: 'espiritual' },
  { text: 'Cada día es una nueva oportunidad para cambiar tu vida.', author: 'Anónimo', cat: 'gratitud' },
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
function Bar({ value, color = C.purple, height = 8 }) {
  return (
    <div style={{ height, background: C.border, borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: height, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function DimCard({ dim, done, total }) {
  const d = DIMS[dim]
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${d.color}`, flex: '1 1 140px', minWidth: 140 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.emoji} {d.label}</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: d.color }}>{pct}%</span>
      </div>
      <Bar value={pct} color={d.color} />
      <div style={{ fontSize: 12, color: C.subtle, marginTop: 4 }}>{done}/{total} hábitos</div>
    </div>
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
  const [morning, setMorning] = useState(() => load('diana-morning', DEFAULT_MORNING))
  const [night, setNight] = useState(() => load('diana-night', DEFAULT_NIGHT))
  const [routineChecked, setRoutineChecked] = useState(() => load(`diana-routine-${todayKey()}`, {}))

  // Journal
  const [entries, setEntries] = useState(() => load('diana-journal', []))
  const [journalText, setJournalText] = useState('')
  const [journalMood, setJournalMood] = useState(2)

  // Quotes
  const [favQuotes, setFavQuotes] = useState(() => load('diana-fav-quotes', []))
  const [quoteFilter, setQuoteFilter] = useState('todas')

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
  useEffect(() => { save('diana-morning', morning) }, [morning])
  useEffect(() => { save('diana-night', night) }, [night])
  useEffect(() => { save(`diana-routine-${todayKey()}`, routineChecked) }, [routineChecked])
  useEffect(() => { save('diana-journal', entries) }, [entries])
  useEffect(() => { save('diana-fav-quotes', favQuotes) }, [favQuotes])

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
    // Update streak
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

  const quote = getDayQuote()

  const NAV = [
    { id: 'inicio',  label: 'Inicio',  icon: '🏠' },
    { id: 'habitos', label: 'Hábitos', icon: '✅' },
    { id: 'rutina',  label: 'Rutina',  icon: '📋' },
    { id: 'diario',  label: 'Diario',  icon: '📖' },
    { id: 'frases',  label: 'Frases',  icon: '🌟' },
  ]

  /* ── Header ── */
  const header = (
    <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #f9a8d4 100%)', padding: isMobile ? '16px 16px 0' : '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 0 12px' : '14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>✨</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>Diana App</span>
        </div>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{formatDate()}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 0, WebkitOverflowScrolling: 'touch' }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setView(n.id)} style={{
            background: view === n.id ? 'rgba(255,255,255,0.25)' : 'transparent',
            border: 'none', color: 'white', padding: '10px 14px', borderRadius: '12px 12px 0 0',
            fontSize: 13, fontWeight: view === n.id ? 800 : 600, cursor: 'pointer',
            whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'all 0.15s',
            backdropFilter: view === n.id ? 'blur(10px)' : 'none',
          }}>
            {n.icon} {n.label}
          </button>
        ))}
      </div>
    </div>
  )

  /* ── INICIO ── */
  const inicioView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Greeting */}
      <div style={{ padding: 24, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', borderRadius: 20, color: 'white' }}>
        <div style={{ fontSize: 26, fontWeight: 900 }}>{getGreeting()}, Diana</div>
        <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>Hoy es un gran día para crecer ✨</div>
      </div>

      {/* Quote of the day */}
      <div style={{ background: 'linear-gradient(135deg, #f9a8d4 0%, #a78bfa 100%)', borderRadius: 20, padding: 24, color: 'white' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: 8 }}>🌟 Frase del día</div>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5, fontStyle: 'italic' }}>"{quote.text}"</div>
        <div style={{ fontSize: 13, marginTop: 8, opacity: 0.85 }}>— {quote.author}</div>
      </div>

      {/* Progress summary */}
      <div style={{ background: C.card, borderRadius: 20, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Progreso de hoy</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: C.purple }}>{totalHabits > 0 ? Math.round((totalDone / totalHabits) * 100) : 0}%</span>
        </div>
        <Bar value={totalHabits > 0 ? (totalDone / totalHabits) * 100 : 0} />
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{totalDone} de {totalHabits} hábitos completados</div>
      </div>

      {/* Dimension cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {Object.keys(DIMS).map(dim => (
          <DimCard key={dim} dim={dim} done={dimStats[dim].done} total={dimStats[dim].total} />
        ))}
      </div>

      {/* Today's mood (if journal entry exists) */}
      {entries.length > 0 && entries[0].date === todayKey() && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Estado de ánimo hoy</div>
          <div style={{ fontSize: 40 }}>{MOODS[entries[0].mood]}</div>
        </div>
      )}
    </div>
  )

  /* ── HÁBITOS ── */
  const habitosView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Progress bar */}
      <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Hoy</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.purple }}>{totalDone}/{totalHabits}</span>
        </div>
        <Bar value={totalHabits > 0 ? (totalDone / totalHabits) * 100 : 0} />
      </div>

      {/* Habits by dimension */}
      {Object.entries(DIMS).map(([dim, cfg]) => {
        const dimHabits = habits.filter(h => h.dim === dim)
        if (dimHabits.length === 0) return null
        return (
          <div key={dim}>
            <div style={{ fontSize: 14, fontWeight: 800, color: cfg.color, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {cfg.emoji} {cfg.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dimHabits.map(h => (
                <div key={h.id} onClick={() => toggleHabit(h.id)} style={{
                  background: C.card, borderRadius: 12, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: `4px solid ${checked[h.id] ? C.green : cfg.color}`,
                  transition: 'all 0.15s', opacity: checked[h.id] ? 0.7 : 1,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, border: `2px solid ${checked[h.id] ? C.green : cfg.color}`,
                    background: checked[h.id] ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 14, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s',
                  }}>
                    {checked[h.id] && '✓'}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, textDecoration: checked[h.id] ? 'line-through' : 'none', color: checked[h.id] ? C.subtle : C.text, flex: 1 }}>
                    {h.name}
                  </span>
                  {streaks[h.id] > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.purple, background: C.border, padding: '2px 8px', borderRadius: 20 }}>
                      🔥 {streaks[h.id]}
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); removeHabit(h.id) }} style={{
                    background: 'none', border: 'none', fontSize: 16, color: C.subtle, cursor: 'pointer', padding: 4, lineHeight: 1,
                  }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Add habit */}
      {showAddHabit ? (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Nuevo hábito</div>
          <input value={newHabitName} onChange={e => setNewHabitName(e.target.value)} placeholder="Nombre del hábito..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', marginBottom: 10, outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
          />
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {Object.entries(DIMS).map(([key, d]) => (
              <button key={key} onClick={() => setNewHabitDim(key)} style={{
                padding: '6px 12px', borderRadius: 20, border: `2px solid ${d.color}`,
                background: newHabitDim === key ? d.color : 'transparent',
                color: newHabitDim === key ? 'white' : d.color,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {d.emoji} {d.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addHabit} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: C.purple, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Agregar
            </button>
            <button onClick={() => setShowAddHabit(false)} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: C.muted }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddHabit(true)} style={{
          padding: 14, borderRadius: 12, border: `2px dashed ${C.lavanda}`, background: 'transparent',
          color: C.purple, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          + Agregar hábito
        </button>
      )}
    </div>
  )

  /* ── RUTINA ── */
  const renderRoutineSection = (title, emoji, items, gradient) => (
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{title}</span> {emoji}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, idx) => (
          <div key={item.id} onClick={() => toggleRoutine(item.id)} style={{
            background: C.card, borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            opacity: routineChecked[item.id] ? 0.6 : 1, transition: 'all 0.15s',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', border: `2px solid ${routineChecked[item.id] ? C.green : C.lavanda}`,
              background: routineChecked[item.id] ? C.green : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, flexShrink: 0,
            }}>
              {routineChecked[item.id] && '✓'}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.purple, minWidth: 42 }}>{item.time}</span>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: routineChecked[item.id] ? C.subtle : C.text, textDecoration: routineChecked[item.id] ? 'line-through' : 'none' }}>
              {item.task}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  const rutinaView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {renderRoutineSection('Mañana', '☀️', morning, 'linear-gradient(90deg, #f9a8d4, #a78bfa)')}
      <div style={{ height: 1, background: C.border }} />
      {renderRoutineSection('Noche', '🌙', night, 'linear-gradient(90deg, #7c3aed, #4c1d95)')}
    </div>
  )

  /* ── DIARIO ── */
  const diarioView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* New entry */}
      <div style={{ background: C.card, borderRadius: 20, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>¿Cómo te sientes hoy?</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
          {MOODS.map((m, i) => (
            <button key={i} onClick={() => setJournalMood(i)} style={{
              fontSize: 32, background: journalMood === i ? C.border : 'transparent',
              border: journalMood === i ? `2px solid ${C.lavanda}` : '2px solid transparent',
              borderRadius: 12, padding: 8, cursor: 'pointer', transition: 'all 0.15s',
              transform: journalMood === i ? 'scale(1.15)' : 'scale(1)',
            }}>
              {m}
            </button>
          ))}
        </div>
        <textarea value={journalText} onChange={e => setJournalText(e.target.value)}
          placeholder="Escribe tu reflexión del día..."
          style={{
            width: '100%', minHeight: 120, padding: 14, borderRadius: 14, border: `1px solid ${C.border}`,
            fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6,
          }}
        />
        <button onClick={addJournalEntry} disabled={!journalText.trim()} style={{
          marginTop: 12, width: '100%', padding: 14, borderRadius: 12, border: 'none',
          background: journalText.trim() ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : C.border,
          color: journalText.trim() ? 'white' : C.subtle,
          fontSize: 15, fontWeight: 700, cursor: journalText.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
        }}>
          Guardar reflexión ✨
        </button>
      </div>

      {/* Entries */}
      {entries.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Entradas anteriores
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entries.map(e => (
              <div key={e.id} style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{e.date} • {e.time}</span>
                  <span style={{ fontSize: 22 }}>{MOODS[e.mood]}</span>
                </div>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{e.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Tu diario está vacío</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Escribe tu primera reflexión arriba</div>
        </div>
      )}
    </div>
  )

  /* ── FRASES ── */
  const CATS = ['todas', 'espiritual', 'motivacional', 'gratitud', 'sabiduria']
  const filteredQuotes = quoteFilter === 'todas' ? QUOTES : QUOTES.filter(q => q.cat === quoteFilter)

  const frasesView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Quote of the day highlight */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa, #f9a8d4)', borderRadius: 20, padding: 24, color: 'white' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: 10 }}>🌟 Frase del día</div>
        <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.5, fontStyle: 'italic' }}>"{quote.text}"</div>
        <div style={{ fontSize: 14, marginTop: 10, opacity: 0.85 }}>— {quote.author}</div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {CATS.map(cat => (
          <button key={cat} onClick={() => setQuoteFilter(cat)} style={{
            padding: '6px 14px', borderRadius: 20, border: `2px solid ${quoteFilter === cat ? C.purple : C.border}`,
            background: quoteFilter === cat ? C.purple : C.card, color: quoteFilter === cat ? 'white' : C.muted,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            textTransform: 'capitalize',
          }}>
            {cat === 'sabiduria' ? 'Sabiduría' : cat === 'todas' ? 'Todas' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Quotes list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredQuotes.map((q, idx) => {
          const globalIdx = QUOTES.indexOf(q)
          const isFav = favQuotes.includes(globalIdx)
          return (
            <div key={idx} style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, fontStyle: 'italic' }}>"{q.text}"</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <div>
                  <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>— {q.author}</span>
                  <span style={{ fontSize: 11, marginLeft: 8, background: C.border, padding: '2px 8px', borderRadius: 20, color: C.subtle, fontWeight: 600, textTransform: 'capitalize' }}>
                    {q.cat === 'sabiduria' ? 'Sabiduría' : q.cat}
                  </span>
                </div>
                <button onClick={() => toggleFavQuote(globalIdx)} style={{
                  background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4,
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

  /* ── Render ── */
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.bg }}>
      {header}
      <div style={{ padding: isMobile ? 16 : 24 }}>
        {view === 'inicio'  && inicioView}
        {view === 'habitos' && habitosView}
        {view === 'rutina'  && rutinaView}
        {view === 'diario'  && diarioView}
        {view === 'frases'  && frasesView}
      </div>
      <div style={{ height: 40 }} />
    </div>
  )
}

export default App
