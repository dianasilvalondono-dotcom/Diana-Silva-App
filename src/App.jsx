import { useState, useEffect, useMemo } from 'react'
import './App.css'
import { C } from './constants/colors'
import { ICONS } from './constants/icons'
import {
  DIMS, DEFAULT_HABITS, DEFAULT_MORNING, DEFAULT_MIDDAY, DEFAULT_NIGHT,
  QUOTES, TOOLKIT_CATS, MOOD_RECS, PROGRAMAS, PROGRAMAS_PREMIUM, SUGGESTED_HABITS,
  AVATARS, CATS, CAT_LABELS, getDayQuote,
} from './constants/data'
import { todayKey, load, save, getGreeting, formatDate, MOODS } from './utils/helpers'
import { useAuth } from './lib/useAuth'
import AuthScreen from './components/AuthScreen'
import { syncFromLocal } from './lib/database'

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
        <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ICONS[d.icon] ? ICONS[d.icon](d.color, 16) : ''} {d.label}</span>
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
  // Auth
  const { user, loading: authLoading, isConfigured, signInWithGoogle, signInWithEmail, signUp, signOut } = useAuth()

  const [view, setView] = useState('inicio')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Habits
  const [habits, setHabits] = useState(() => load('diana-habits', []))
  const [checked, setChecked] = useState(() => load(`diana-checked-${todayKey()}`, {}))
  const [streaks, setStreaks] = useState(() => load('diana-streaks', {}))

  // Routines (editable by each user)
  const [morning, setMorning] = useState(() => load('diana-morning', DEFAULT_MORNING))
  const [midday, setMidday] = useState(() => load('diana-midday', DEFAULT_MIDDAY))
  const [night, setNight] = useState(() => load('diana-night', DEFAULT_NIGHT))
  const [routineChecked, setRoutineChecked] = useState(() => load(`diana-routine-${todayKey()}`, {}))
  const [editingRoutine, setEditingRoutine] = useState(false)
  const [newRoutineTask, setNewRoutineTask] = useState('')
  const [newRoutineTime, setNewRoutineTime] = useState('')
  const [newRoutineEmoji, setNewRoutineEmoji] = useState('✨')
  const [newRoutineSection, setNewRoutineSection] = useState('morning')
  // Tomorrow planning (night ritual)
  const [tomorrowTasks, setTomorrowTasks] = useState(() => load(`ronda-tomorrow-${todayKey()}`, []))
  const [newTomorrowTask, setNewTomorrowTask] = useState('')

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
  const [onboardHabits, setOnboardHabits] = useState([])
  const [showFullStory, setShowFullStory] = useState(false)

  // Morning/Night check-in
  const [morningDone, setMorningDone] = useState(() => load(`ronda-morning-${todayKey()}`, false))
  const [nightDone, setNightDone] = useState(() => load(`ronda-night-${todayKey()}`, false))
  const [morningIntention, setMorningIntention] = useState('')
  const [nightReflection, setNightReflection] = useState('')
  const [nightMood, setNightMood] = useState(2)

  // Programs (paso a paso)
  const [activePrograms, setActivePrograms] = useState(() => load('ronda-programs', {}))
  // activePrograms = { tusa: { startDate: '2026-03-14', completedDays: [1,2] }, ... }

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
  useEffect(() => { save('ronda-programs', activePrograms) }, [activePrograms])
  useEffect(() => { save(`ronda-morning-${todayKey()}`, morningDone) }, [morningDone])
  useEffect(() => { save(`ronda-night-${todayKey()}`, nightDone) }, [nightDone])
  useEffect(() => { save('diana-morning', morning) }, [morning])
  useEffect(() => { save('diana-midday', midday) }, [midday])
  useEffect(() => { save('diana-night', night) }, [night])
  useEffect(() => { save(`ronda-tomorrow-${todayKey()}`, tomorrowTasks) }, [tomorrowTasks])

  // Sync localStorage → Supabase on first login + update profile name from auth
  useEffect(() => {
    if (user && isConfigured) {
      syncFromLocal(user.id)
      const authName = user.user_metadata?.name || user.user_metadata?.full_name
      if (authName && authName !== profile.name) {
        setProfile(prev => ({ ...prev, name: authName }))
      }
    }
  }, [user, isConfigured])

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

  const addRoutineItem = () => {
    if (!newRoutineTask.trim() || !newRoutineTime.trim()) return
    const newItem = { id: Date.now(), time: newRoutineTime, task: newRoutineTask, emoji: newRoutineEmoji }
    if (newRoutineSection === 'morning') setMorning(prev => [...prev, newItem].sort((a, b) => a.time.localeCompare(b.time)))
    else if (newRoutineSection === 'midday') setMidday(prev => [...prev, newItem].sort((a, b) => a.time.localeCompare(b.time)))
    else setNight(prev => [...prev, newItem].sort((a, b) => a.time.localeCompare(b.time)))
    setNewRoutineTask(''); setNewRoutineTime(''); setNewRoutineEmoji('✨')
  }

  const removeRoutineItem = (section, id) => {
    if (section === 'morning') setMorning(prev => prev.filter(i => i.id !== id))
    else if (section === 'midday') setMidday(prev => prev.filter(i => i.id !== id))
    else setNight(prev => prev.filter(i => i.id !== id))
  }

  const addTomorrowTask = () => {
    if (!newTomorrowTask.trim()) return
    setTomorrowTasks(prev => [...prev, { id: Date.now(), task: newTomorrowTask, done: false }])
    setNewTomorrowTask('')
  }

  const toggleTomorrowTask = (id) => {
    setTomorrowTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
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

  const startProgram = (progId) => {
    setActivePrograms(prev => ({ ...prev, [progId]: { startDate: todayKey(), completedDays: [] } }))
  }
  const completeProgDay = (progId, day) => {
    setActivePrograms(prev => {
      const prog = prev[progId] || { startDate: todayKey(), completedDays: [] }
      const completed = prog.completedDays.includes(day) ? prog.completedDays.filter(d => d !== day) : [...prog.completedDays, day]
      return { ...prev, [progId]: { ...prog, completedDays: completed } }
    })
  }
  const quitProgram = (progId) => {
    setActivePrograms(prev => { const next = { ...prev }; delete next[progId]; return next })
  }
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
    setToolkitItems(toolkitItems.filter(t => t.id !== id))
  }

  const quote = getDayQuote()

  const currentHour = new Date().getHours()
  const isMorningTime = currentHour < 12
  const isNightTime = currentHour >= 18
  const showMorningCheckin = isMorningTime && !morningDone
  const showNightCheckin = isNightTime && !nightDone

  const completeMorningCheckin = () => {
    if (morningIntention.trim()) {
      const entry = {
        id: Date.now(), date: todayKey(), text: `☀️ Intención del día: ${morningIntention}`,
        mood: 3, time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
        type: 'morning',
      }
      setEntries([entry, ...entries])
    }
    setMorningDone(true)
    setMorningIntention('')
  }

  const completeNightCheckin = () => {
    if (nightReflection.trim()) {
      const entry = {
        id: Date.now(), date: todayKey(), text: `🌙 Reflexión de noche: ${nightReflection}`,
        mood: nightMood, time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
        type: 'night',
      }
      setEntries([entry, ...entries])
    }
    setNightDone(true)
    setNightReflection('')
  }

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
    /* Programas — camino/steps */
    programas: (a) => <BrandIcon active={a}><path d="M10 24 L10 20 L16 17 L16 13 L22 10 L22 7" stroke={a ? C.gold : C.rose} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /><circle cx="10" cy="24" r="2.5" fill={a ? C.gold : C.rose} opacity="0.5" /><circle cx="16" cy="15" r="2.5" fill={a ? C.gold : C.rose} opacity="0.7" /><circle cx="22" cy="7" r="2.5" fill={a ? C.gold : C.rose} /></BrandIcon>,
  }

  const NAV = [
    { id: 'inicio',    label: 'Mi día' },
    { id: 'programas', label: 'Programas' },
    { id: 'habitos',   label: 'Hábitos' },
    { id: 'rutina',    label: 'Rutina' },
    { id: 'diario',    label: 'Diario' },
    { id: 'toolkit',   label: 'Toolkit' },
    { id: 'frases',    label: 'Frases' },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Greeting + Progress combined */}
      <div style={{ padding: 24, background: 'linear-gradient(135deg, #C4908A, #E8C4C0)', borderRadius: 20, color: 'white' }}>
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif' }}>{getGreeting()}{profile.name ? `, ${profile.name}` : ''}</div>
        <div style={{ fontSize: 14, opacity: 0.85, marginTop: 8, fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic' }}>La mujer que quieres ser, empieza hoy</div>
        {totalHabits > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>{totalDone} de {totalHabits} hábitos</span>
              <span style={{ fontSize: 18, fontWeight: 900 }}>{Math.round((totalDone / totalHabits) * 100)}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${(totalDone / totalHabits) * 100}%`, height: '100%', background: 'white', borderRadius: 6, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Lo que sigue — next routine item */}
      {(() => {
        const now = new Date()
        const nowMin = now.getHours() * 60 + now.getMinutes()
        const allRoutine = [...morning, ...midday, ...night]
        const next = allRoutine.find(item => {
          if (!item.time) return false
          const [h, m] = item.time.split(':').map(Number)
          return h * 60 + m > nowMin
        })
        if (!next) return null
        return (
          <div onClick={() => setView('rutina')} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
            background: C.card, borderRadius: 16, cursor: 'pointer',
            border: `1px solid ${C.border}`,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 800, color: C.gold, minWidth: 46, textAlign: 'center',
            }}>{next.time}</div>
            <div style={{ width: 1, height: 28, background: C.border }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{next.task}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Lo que sigue</div>
            </div>
            <div style={{ fontSize: 16, color: C.muted }}>→</div>
          </div>
        )
      })()}

      {/* Quote of the day */}
      <div style={{ padding: '18px 20px', borderLeft: `3px solid ${C.gold}` }}>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, fontStyle: 'italic', color: C.text }}>"{quote.text}"</div>
        <div style={{ fontSize: 13, marginTop: 6, color: C.muted }}>— {quote.author}</div>
      </div>

      {/* Active programs preview */}
      {Object.keys(activePrograms).length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, cursor: 'pointer' }}
          onClick={() => setView('programas')}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }}>Mis programas</div>
          {Object.entries(activePrograms).map(([progId, progress]) => {
            const prog = PROGRAMAS.find(p => p.id === progId)
            if (!prog) return null
            const pct = Math.round((progress.completedDays.length / prog.days.length) * 100)
            return (
              <div key={progId} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: prog.color, marginBottom: 4 }}>
                  <span>{prog.title}</span>
                  <span>{pct}%</span>
                </div>
                <Bar value={pct} color={prog.color} height={4} />
              </div>
            )
          })}
        </div>
      )}

      {/* Hook emocional — enganchar con un programa */}
      {(() => {
        const hooks = [
          { q: '¿Estás pasando por una tusa?', sub: 'Yo también la viví. Tengo un camino de 7 días para ti.', prog: 'tusa', color: '#C4908A' },
          { q: '¿Sientes que la ansiedad no te deja en paz?', sub: 'Respira. Hay un programa paso a paso para recuperar la calma.', prog: 'ansiedad', color: '#C9A96E' },
          { q: '¿Hay días que sientes que no puedes más?', sub: 'No estás sola. Aprende a navegar esas olas, un minuto a la vez.', prog: 'depresion', color: '#A6716B' },
          { q: '¿Quieres empezar de cero?', sub: 'Yo me reinventé muchas veces. Déjame acompañarte 7 días.', prog: 'empezar', color: '#7BA56E' },
          { q: '¿Sientes que perdiste la confianza en ti?', sub: 'Tu valor no depende de nadie. Vamos a recordarlo juntas.', prog: 'autoestima', color: '#C4908A' },
        ]
        const dayIdx = new Date().getDate() % hooks.length
        const hook = hooks[dayIdx]
        if (activePrograms[hook.prog]) return null
        return (
          <div onClick={() => setView('programas')} style={{
            background: `linear-gradient(135deg, ${hook.color}15, ${hook.color}08)`,
            borderRadius: 18, padding: 20, cursor: 'pointer',
            border: `1px solid ${hook.color}30`,
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.4, fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {hook.q}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
              {hook.sub}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: hook.color, marginTop: 10 }}>
              Ver programa →
            </div>
          </div>
        )
      })()}

      {/* Mundo Ronda — cards que rotan y conectan con distintas personas */}
      {(() => {
        const cards = [
          { icon: 'mental', color: '#A6716B', title: 'Tu cerebro puede cambiar', desc: 'Ronda está basada en neuroplasticidad: la ciencia que demuestra que puedes reprogramar tu mente con micro-hábitos diarios.', cta: 'Conoce la ciencia →' },
          { icon: 'emocional', color: '#C9A96E', title: 'DBT: herramientas reales', desc: 'La Terapia Dialéctica Conductual le ha dado herramientas a miles de mujeres para transformar su relación con sus emociones.', cta: 'Conoce las herramientas →' },
          { icon: 'espiritual', color: '#C4908A', title: 'Un Dios más amoroso', desc: 'Ronda nació de una conexión espiritual profunda: soltar el control, rendirse, y descubrir un Dios que no castiga sino que acompaña.', cta: 'Explora lo espiritual →' },
          { icon: 'fisico', color: '#A68B52', title: 'Del mat a la vida', desc: 'El cuerpo guarda todo. Moverlo es la primera forma de liberarse. El yoga conecta lo que la mente separa.', cta: 'Conoce el camino →' },
          { icon: 'emocional', color: '#C9A96E', title: '¿Por qué Ronda?', desc: 'Ronda es la historia de muchas mujeres. Abuelas, madres, amigas que se reinventaron. Ninguna lo hizo sola — y tú tampoco tienes que hacerlo.', cta: 'Lee la historia →' },
          { icon: 'mental', color: '#A6716B', title: 'Tus hábitos son arquitectura cerebral', desc: 'Cada vez que repites un hábito, tu cerebro fortalece esa conexión neuronal. En 21 días creas un camino nuevo. En 60, una autopista.', cta: 'Empieza tu programa →' },
          { icon: 'espiritual', color: '#C4908A', title: 'No estás sola', desc: 'En los momentos de crisis, a veces solo necesitas que alguien conteste del otro lado. Ronda quiere ser ese espacio de conexión.', cta: 'Conoce la visión →' },
        ]
        const idx = new Date().getHours() % cards.length
        const card = cards[idx]
        return (
          <div onClick={() => setView('programas')} style={{
            display: 'flex', gap: 14, padding: '16px 18px', alignItems: 'flex-start',
            background: C.card, borderRadius: 16, cursor: 'pointer',
            border: `1.5px solid ${card.color}40`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            marginBottom: 8,
          }}>
            <div style={{ flexShrink: 0, marginTop: 2 }}>{ICONS[card.icon](card.color, 28)}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>{card.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{card.desc}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: card.color, marginTop: 8 }}>{card.cta}</div>
            </div>
          </div>
        )
      })()}
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

      {/* Empty state — invite to pick habits */}
      {habits.length === 0 && (
        <div style={{ background: C.card, borderRadius: 14, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Escoge tus hábitos
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 14 }}>
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
            <div style={{ fontSize: 15, fontWeight: 800, color: cfg.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {ICONS[cfg.icon] ? ICONS[cfg.icon](cfg.color, 16) : ''} {cfg.label}
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
                {ICONS[d.icon] ? ICONS[d.icon](d.color, 16) : ''} {d.label}
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
  const renderRoutineSection = (title, emoji, items, color, sectionKey) => (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        {emoji} {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => (
          <div key={item.id} style={{
            background: C.card, borderRadius: 12, padding: '11px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            opacity: routineChecked[item.id] ? 0.55 : 1, transition: 'all 0.15s',
          }}>
            <div onClick={() => toggleRoutine(item.id)} style={{
              width: 22, height: 22, borderRadius: '50%', border: `2px solid ${routineChecked[item.id] ? C.greenDone : C.roseLight}`,
              background: routineChecked[item.id] ? C.greenDone : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, flexShrink: 0, cursor: 'pointer',
            }}>
              {routineChecked[item.id] && '✓'}
            </div>
            <span onClick={() => toggleRoutine(item.id)} style={{ fontSize: 14, fontWeight: 700, color: C.gold, minWidth: 44, cursor: 'pointer' }}>{item.time}</span>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
            <span onClick={() => toggleRoutine(item.id)} style={{ fontSize: 15, fontWeight: 600, color: routineChecked[item.id] ? C.subtle : C.text, textDecoration: routineChecked[item.id] ? 'line-through' : 'none', flex: 1, cursor: 'pointer' }}>
              {item.task}
            </span>
            {editingRoutine && (
              <button onClick={() => removeRoutineItem(sectionKey, item.id)} style={{
                background: 'none', border: 'none', color: '#e57373', fontSize: 18, cursor: 'pointer', padding: '0 4px', flexShrink: 0,
              }}>×</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const ROUTINE_EMOJIS = ['✨', '🙏', '🧘', '💪', '📖', '🚶‍♀️', '🌬️', '💛', '☕', '🎵', '📝', '🌸', '🕊️', '🌙', '🧠', '🍵']

  const rutinaView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Edit toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setEditingRoutine(!editingRoutine)} style={{
          background: editingRoutine ? C.rose : 'transparent', color: editingRoutine ? 'white' : C.rose,
          border: `1.5px solid ${C.rose}`, borderRadius: 20, padding: '6px 16px',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {editingRoutine ? '✓ Listo' : '✏️ Editar mi rutina'}
        </button>
      </div>

      {renderRoutineSection('Mañana', '☀️', morning, C.rose, 'morning')}
      <div style={{ height: 1, background: C.border }} />
      {renderRoutineSection('Afirmaciones del día', '🕊️', midday, C.gold, 'midday')}
      <div style={{ height: 1, background: C.border }} />
      {renderRoutineSection('Noche', '🌙', night, C.roseDark, 'night')}

      {/* Add new routine item */}
      {editingRoutine && (
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }}>➕ Agregar a mi rutina</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {[{k:'morning',l:'☀️ Mañana'},{k:'midday',l:'🕊️ Día'},{k:'night',l:'🌙 Noche'}].map(s => (
              <button key={s.k} onClick={() => setNewRoutineSection(s.k)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', border: `1.5px solid ${C.rose}`,
                background: newRoutineSection === s.k ? C.rose : 'transparent',
                color: newRoutineSection === s.k ? 'white' : C.rose,
              }}>{s.l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input value={newRoutineTime} onChange={e => setNewRoutineTime(e.target.value)} placeholder="Hora (ej: 7:30)"
              style={{ width: 80, padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit' }} />
            <input value={newRoutineTask} onChange={e => setNewRoutineTask(e.target.value)} placeholder="¿Qué quieres hacer?"
              style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit' }}
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
          <button onClick={addRoutineItem} disabled={!newRoutineTask.trim() || !newRoutineTime.trim()} style={{
            width: '100%', padding: 10, borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700,
            fontFamily: 'inherit', cursor: newRoutineTask.trim() && newRoutineTime.trim() ? 'pointer' : 'default',
            background: newRoutineTask.trim() && newRoutineTime.trim() ? C.rose : C.border,
            color: newRoutineTask.trim() && newRoutineTime.trim() ? 'white' : C.subtle,
          }}>Agregar</button>
        </div>
      )}

      <div style={{ height: 1, background: C.border }} />

      {/* Night ritual: Plan tomorrow */}
      <div style={{ background: C.card, borderRadius: 18, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${C.gold}30` }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.gold, marginBottom: 4 }}>🌙 Ritual de noche</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
          Planifica tu mañana para soltar la ansiedad de hoy. Escribir lo que viene te ayuda a descansar.
        </div>

        {/* What I accomplished today */}
        {(() => {
          const todayDone = Object.entries(routineChecked).filter(([, v]) => v).length
          const todayTotal = morning.length + midday.length + night.length
          return todayDone > 0 && (
            <div style={{ background: `${C.greenDone}15`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.greenDone }}>
                ✓ Hoy completaste {todayDone} de {todayTotal} cosas de tu rutina
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Ya puedes soltar el día. Lo hiciste bien. 💛</div>
            </div>
          )
        })()}

        {/* Tomorrow tasks */}
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>¿Qué necesito hacer mañana?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {tomorrowTasks.map(t => (
            <div key={t.id} onClick={() => toggleTomorrowTask(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: C.cream,
              borderRadius: 10, cursor: 'pointer',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', border: `2px solid ${t.done ? C.greenDone : C.roseLight}`,
                background: t.done ? C.greenDone : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 10, flexShrink: 0,
              }}>{t.done && '✓'}</div>
              <span style={{ fontSize: 14, color: t.done ? C.subtle : C.text, textDecoration: t.done ? 'line-through' : 'none' }}>{t.task}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newTomorrowTask} onChange={e => setNewTomorrowTask(e.target.value)} placeholder="Escribir tarea para mañana..."
            style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit' }}
            onKeyDown={e => e.key === 'Enter' && addTomorrowTask()} />
          <button onClick={addTomorrowTask} disabled={!newTomorrowTask.trim()} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', background: newTomorrowTask.trim() ? C.gold : C.border,
            color: newTomorrowTask.trim() ? 'white' : C.subtle, fontSize: 14, fontWeight: 700, cursor: newTomorrowTask.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
          }}>+</button>
        </div>
      </div>
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

      {/* ── Mood Recommendations ── */}
      {(() => {
        const rec = MOOD_RECS[journalMood]
        if (!rec) return null
        return (
          <div style={{ background: C.card, borderRadius: 18, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: `2px solid ${rec.color}20` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: rec.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {MOODS[journalMood]} {rec.label}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Basado en cómo te sientes, te recomendamos:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rec.items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: C.cream, borderRadius: 12, border: `1px solid ${C.border}`,
                }}>
                  {ICONS[item.type] ? ICONS[item.type](rec.color, 22) : <span style={{ fontSize: 22, flexShrink: 0 }}>{item.emoji}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: C.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{item.type}</div>
                  </div>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 12, color: rec.color, fontWeight: 700, textDecoration: 'none',
                      padding: '4px 10px', borderRadius: 20, border: `1px solid ${rec.color}40`,
                      flexShrink: 0,
                    }}>Abrir</a>
                  )}
                </div>
              ))}
            </div>
            {rec.programa && (
              <button onClick={() => { startProgram(rec.programa); setView('programas') }} style={{
                marginTop: 12, width: '100%', padding: 12, borderRadius: 12, border: `2px solid ${rec.color}`,
                background: 'transparent', color: rec.color, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Ver programa paso a paso →
              </button>
            )}
          </div>
        )
      })()}

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

  /* ── PROGRAMAS ── */
  const programasView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #4A3035, #C4908A, #E8C4C0)', borderRadius: 18, padding: 22, color: 'white' }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif' }}>Programas</div>
        <div style={{ fontSize: 15, opacity: 0.85, marginTop: 4 }}>Caminos paso a paso para sanar, crecer y brillar</div>
        <div style={{ fontSize: 13, marginTop: 6, opacity: 0.7 }}>1 minuto al día. 7 días. Tu transformación.</div>
      </div>

      {/* Historia de Ronda — no egocéntrica, Diana como puente de muchas mujeres */}
      <div style={{
        background: C.card, borderRadius: 20, padding: 24,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${C.roseLight}`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.rose, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          La historia detrás de Ronda
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3, marginBottom: 14 }}>
          "Soy el puente de miles de mujeres"
        </div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 14 }}>
          Ronda nació de las mujeres que me formaron. Mis dos abuelas quedaron viudas muy jóvenes y sacaron adelante familias enteras con las manos y con el alma. Crecí rodeada de mujeres poderosas — tías, primas, amigas — que se reinventaban una y otra vez sin pedir permiso.
        </div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 14 }}>
          Yo también he tenido muchas vidas. Me divorcié a los 25 con tres maletas y a echar pa'lante. Me fui pa' Nueva York sin diploma, me gradué magna cum laude, me devolví pa' Colombia. Y cada vez que me caí, me levanté — pero nunca sola. Siempre hubo una mujer del otro lado tendiéndome la mano.
        </div>
        <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, marginBottom: 14, fontWeight: 600 }}>
          Cada mujer que Dios me ha puesto en el camino me ha enseñado algo. Y sé que a ti también te ha pasado: alguien te sostuvo cuando no podías más.
        </div>
        {showFullStory && <>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 14 }}>
            Vivo con TLP desde los 16 años. Pasé por malos diagnósticos, por depresión. Hasta que llegué al DBT y eso me cambió la vida. Me certifiqué como profesora de yoga. Me fui 35 días sola a Grecia. En ese camino sentí que había mucha soledad — y que faltaba conexión.
          </div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 14 }}>
            Yo también he escogido mal. He tomado malas decisiones. Me paro firme con ellas hoy. He sido personajes de mujeres de las que no me he sentido orgullosa. Pero las lecciones que me dejaron esas mujeres que me rodean — mis abuelas, mis maestras, mis amigas — esas me han sostenido.
          </div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 14 }}>
            En los momentos de crisis buscaba apoyo y la psicóloga tenía citas — no estaba disponible. Pensé: ¿cómo tengo a alguien ahí cuando lo necesito? Alguien que conteste del otro lado. No importa de dónde, pero que esté ahí.
          </div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, fontWeight: 600, fontStyle: 'italic', marginBottom: 14 }}>
            Ronda es mi forma de devolver todo lo que recibí. No es mi historia — es la historia de todas las mujeres que me construyeron. Y yo solo quiero ser puente para que tú también tengas esa red, esas herramientas, esa ronda de mujeres que te acompaña.
          </div>
        </>}
        <button onClick={() => setShowFullStory(!showFullStory)} style={{
          background: 'none', border: 'none', color: C.rose, fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', padding: 0,
        }}>
          {showFullStory ? 'Leer menos ↑' : 'Leer la historia completa →'}
        </button>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700,
          }}>D</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Diana Silva</div>
            <div style={{ fontSize: 12, color: C.muted }}>Fundadora de Ronda · Puente de miles de mujeres</div>
          </div>
        </div>
      </div>

      {/* Active programs */}
      {Object.keys(activePrograms).length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Mis programas activos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(activePrograms).map(([progId, progress]) => {
              const prog = PROGRAMAS.find(p => p.id === progId)
              if (!prog) return null
              const completedCount = progress.completedDays.length
              const pct = Math.round((completedCount / prog.days.length) * 100)
              return (
                <div key={progId} style={{ background: C.card, borderRadius: 18, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `2px solid ${prog.color}25` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{ICONS[prog.id] ? ICONS[prog.id](prog.color, 24) : prog.id} {prog.title}</div>
                      <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{completedCount} de {prog.days.length} días · {pct}%</div>
                    </div>
                    <button onClick={() => quitProgram(progId)} style={{
                      background: 'none', border: 'none', fontSize: 12, color: C.subtle, cursor: 'pointer', padding: 4,
                    }}>✕</button>
                  </div>
                  <Bar value={pct} color={prog.color} height={6} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
                    {prog.days.map(d => {
                      const isDone = progress.completedDays.includes(d.day)
                      return (
                        <div key={d.day} onClick={() => completeProgDay(progId, d.day)} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
                          background: isDone ? `${prog.color}08` : C.cream, borderRadius: 14,
                          cursor: 'pointer', border: `1px solid ${isDone ? `${prog.color}30` : C.border}`,
                          opacity: isDone ? 0.7 : 1, transition: 'all 0.15s',
                        }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 7, border: `2px solid ${isDone ? C.green : prog.color}`,
                            background: isDone ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 2,
                          }}>
                            {isDone && '✓'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: prog.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              Día {d.day} {ICONS[d.icon] ? ICONS[d.icon](d.color, 16) : ''}
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: isDone ? C.subtle : C.text, marginTop: 2,
                              textDecoration: isDone ? 'line-through' : 'none' }}>
                              {d.title}
                            </div>
                            <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                              {d.task}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {pct === 100 && (
                    <div style={{ textAlign: 'center', marginTop: 14, padding: 16, background: `${prog.color}10`, borderRadius: 14 }}>
                      <div style={{ fontSize: 36, marginBottom: 6 }}>🎉</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: prog.color }}>¡Completaste el programa!</div>
                      <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Eres increíble. Cada paso cuenta.</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available programs */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.rose, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          {Object.keys(activePrograms).length > 0 ? 'Más programas' : 'Escoge tu camino'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PROGRAMAS.filter(p => !activePrograms[p.id]).map(prog => (
            <div key={prog.id} style={{
              background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              borderLeft: `4px solid ${prog.color}`,
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{ICONS[prog.id] ? ICONS[prog.id](prog.color, 24) : prog.id}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{prog.title}</div>
              <div style={{ fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{prog.desc}</div>
              <div style={{ fontSize: 12, color: C.subtle, marginTop: 6 }}>{prog.days.length} días · 1 minuto al día</div>
              <button onClick={() => startProgram(prog.id)} style={{
                marginTop: 12, padding: '10px 20px', borderRadius: 12, border: 'none',
                background: `linear-gradient(135deg, ${prog.color}, ${prog.color}CC)`,
                color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Empezar programa →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Programa Premium 21 días */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Programas de transformación
        </div>
        {PROGRAMAS_PREMIUM.map(prog => (
          <div key={prog.id} style={{
            background: `linear-gradient(135deg, ${C.cream}, #FFF8F0)`, borderRadius: 20, padding: 22,
            border: `2px solid ${C.gold}40`, boxShadow: '0 4px 16px rgba(201,169,110,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ background: C.gold, color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: '0.05em' }}>PREMIUM</div>
              <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{prog.duration}</div>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 6 }}>{prog.title}</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>{prog.desc}</div>

            {/* 3 fases */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {prog.phases.map((phase, i) => (
                <div key={i} style={{
                  flex: 1, background: C.card, borderRadius: 12, padding: '10px 8px', textAlign: 'center',
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, marginBottom: 2 }}>Días {phase.days}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{phase.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{phase.desc}</div>
                </div>
              ))}
            </div>

            {/* Neuro badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: '#F5F0E8', borderRadius: 12, marginBottom: 16,
            }}>
              {ICONS.mental('#A6716B', 22)}
              <div style={{ fontSize: 12, color: '#6B5A4E', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 800 }}>Basado en neurociencia:</span> cada día incluye el porqué científico detrás de tu micro-acción.
              </div>
            </div>

            {/* Price + CTA */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.gold, marginBottom: 4 }}>${prog.price} USD</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Pago único · Acceso para siempre</div>
              <button style={{
                width: '100%', padding: '14px 24px', borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${C.gold}, #D4B87A)`,
                color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(201,169,110,0.35)', letterSpacing: '0.02em',
              }}>
                Próximamente
              </button>
              <div style={{ fontSize: 11, color: C.subtle, marginTop: 8 }}>El pago se habilitará pronto</div>
            </div>
          </div>
        ))}
      </div>

      {/* Suggested habits */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Hábitos sugeridos para agregar
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
          ¿Quieres agregar alguno a tu lista diaria?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SUGGESTED_HABITS.filter(sh => !habits.some(h => h.name === sh.name)).map((sh, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
            }}>
              {ICONS[DIMS[sh.dim].icon](DIMS[sh.dim].color, 20)}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{sh.name}</div>
                <div style={{ fontSize: 12, color: DIMS[sh.dim].color, fontWeight: 600 }}>{ICONS[DIMS[sh.dim].icon](DIMS[sh.dim].color, 14)} {DIMS[sh.dim].label}</div>
              </div>
              <button onClick={() => addSuggestedHabit(sh)} style={{
                padding: '6px 14px', borderRadius: 20, border: `1px solid ${C.rose}`,
                background: 'transparent', color: C.rose, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                + Agregar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  /* ── FRASES ── */
  const filteredQuotes = quoteFilter === 'todas' ? QUOTES : QUOTES.filter(q => q.cat === quoteFilter)
  const catLabels = CAT_LABELS

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
              {ICONS[cat.id] ? ICONS[cat.id](cat.color, 16) : cat.emoji} {cat.label} ({toolkitCounts[cat.id]})
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
                {ICONS[cat.id] ? ICONS[cat.id](cat.color, 16) : cat.emoji} {cat.label}
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
                <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{ICONS[cat.id] ? ICONS[cat.id](cat.color, 16) : cat.emoji}</span>
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
                  <span style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{ICONS[cfg.icon] ? ICONS[cfg.icon](cfg.color, 16) : ''} {cfg.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>{pct}%</span>
                </div>
                <Bar value={pct} color={cfg.color} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Sign out */}
      {isConfigured && user && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 12, color: C.subtle, marginBottom: 8 }}>{user.email}</div>
          <button onClick={signOut} style={{
            padding: '10px 28px', borderRadius: 12, border: `1.5px solid ${C.border}`,
            background: C.card, color: C.muted, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )

  /* ── Onboarding ── */
  const finishOnboarding = () => {
    if (onboardName.trim()) {
      setProfile(prev => ({ ...prev, name: onboardName.trim() }))
      save('diana-profile', { ...profile, name: onboardName.trim() })
    }
    if (onboardHabits.length > 0) {
      const newHabits = onboardHabits.map((sh, i) => ({ id: Date.now() + i, name: sh.name, dim: sh.dim }))
      setHabits(newHabits)
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
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          }}>
            {ICONS[cfg.icon](cfg.color, 40)}
            <div style={{ fontSize: 15, fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
          </div>
        ))}
      </div>
    </div>,

    /* Slide 2 — Cómo funciona tu día */
    <div key={2} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        Tu día con Ronda
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 28, maxWidth: 300 }}>
        Ronda te acompaña mañana y noche
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 320 }}>
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'left', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {ICONS.sol(C.gold, 32)}
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.gold }}>En la mañana</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Te preguntamos: "¿Qué quieres lograr hoy?" y activas tus hábitos</div>
          </div>
        </div>
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'left', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {ICONS.habito(C.green, 32)}
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.green }}>Durante el día</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Trackea tus hábitos, sigue tu rutina y escucha recomendaciones según tu mood</div>
          </div>
        </div>
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'left', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {ICONS.luna(C.roseDark, 32)}
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.roseDark }}>En la noche</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Te preguntamos: "¿Cómo te fue?" — revisa tu resumen y reflexiona</div>
          </div>
        </div>
      </div>
    </div>,

    /* Slide 3 — Programas y recomendaciones */
    <div key={3} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        Programas paso a paso
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 28, maxWidth: 300 }}>
        Caminos de 7 días para sanar, crecer y brillar. 1 minuto al día.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        {PROGRAMAS.slice(0, 4).map(prog => (
          <div key={prog.id} style={{
            background: C.card, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
            borderLeft: `3px solid ${prog.color}`,
          }}>
            {ICONS[prog.id](prog.color, 28)}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{prog.title}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{prog.days.length} días · 1 min/día</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 20, maxWidth: 280, lineHeight: 1.5 }}>
        Además, te recomendamos podcasts, música y hábitos según cómo te sientes cada día.
      </div>
    </div>,

    /* Slide 4 — Herramientas */
    <div key={4} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        Todo lo que necesitas
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 28 }}>
        Herramientas diseñadas para tu crecimiento
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        {[
          { icon: NAV_ICONS.inicio(false), title: 'Mi día', desc: 'Tu dashboard y progreso diario' },
          { icon: NAV_ICONS.programas(false), title: 'Programas', desc: 'Caminos paso a paso para sanar y crecer' },
          { icon: NAV_ICONS.habitos(false), title: 'Hábitos', desc: 'Crea y trackea tus hábitos por dimensión' },
          { icon: NAV_ICONS.rutina(false), title: 'Mi rutina', desc: 'Tu rutina de mañana, tarde y noche' },
          { icon: NAV_ICONS.diario(false), title: 'Diario', desc: 'Reflexiona y recibe recomendaciones' },
          { icon: NAV_ICONS.toolkit(false), title: 'Toolkit', desc: 'Guarda tus podcasts, libros y recursos' },
          { icon: NAV_ICONS.frases(false), title: 'Frases', desc: 'Inspiración diaria para tu camino' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: C.card, borderRadius: 14, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', textAlign: 'left' }}>
            <div style={{ flexShrink: 0 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{item.title}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>,

    /* Slide 5 — Escoge tus hábitos */
    <div key={5} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '80vh', textAlign: 'center', padding: '32px 24px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 6 }}>
        Escoge tus hábitos
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 20, maxWidth: 300 }}>
        Toca los que quieras practicar. Siempre puedes cambiarlos después.
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 8 }}>
        {onboardHabits.length} seleccionados
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 340, marginBottom: 24 }}>
        {SUGGESTED_HABITS.map((sh, i) => {
          const selected = onboardHabits.some(h => h.name === sh.name)
          const dim = DIMS[sh.dim]
          return (
            <div key={i} onClick={() => {
              setOnboardHabits(prev => selected ? prev.filter(h => h.name !== sh.name) : [...prev, sh])
            }} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
              background: selected ? `${dim.color}15` : C.card, borderRadius: 12,
              border: selected ? `2px solid ${dim.color}` : `1px solid ${C.border}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, border: `2px solid ${selected ? dim.color : C.border}`,
                background: selected ? dim.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s',
              }}>
                {selected && '✓'}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{sh.name}</div>
                <div style={{ fontSize: 11, color: dim.color, fontWeight: 700 }}>{dim.label}</div>
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={finishOnboarding} style={{
        padding: '14px 40px', borderRadius: 30,
        background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
        color: 'white', fontSize: 17, fontWeight: 800, border: 'none',
        cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em',
        boxShadow: '0 4px 16px rgba(196,144,138,0.35)',
      }}>
        Comenzar mi Ronda
      </button>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>
        También puedes crear hábitos propios después
      </div>
    </div>,
  ]

  /* ── Auth loading ── */
  if (authLoading) {
    return (
      <div style={{
        maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: '50%', border: '3px solid #C9A96E',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#C9A96E' }} />
        </div>
        <div style={{ fontSize: 16, color: C.muted, fontWeight: 600 }}>Cargando...</div>
      </div>
    )
  }

  /* ── Auth screen (only if Supabase is configured and no user) ── */
  if (isConfigured && !user) {
    return (
      <AuthScreen
        onSignInGoogle={signInWithGoogle}
        onSignInEmail={signInWithEmail}
        onSignUp={signUp}
      />
    )
  }

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
          {onboardStep < 5 && (
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

  /* ── Modal overlay style ── */
  const modalOverlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(74,48,53,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, animation: 'fadeIn 0.3s ease',
  }
  const modalCard = {
    background: C.card, borderRadius: 24, padding: 28, width: '100%', maxWidth: 420,
    maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(74,48,53,0.3)',
    WebkitOverflowScrolling: 'touch',
  }

  /* ── Morning Modal ── */
  const morningModal = showMorningCheckin && (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>☀️</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3 }}>
            {profile.name ? `${profile.name}, ¿qué quieres lograr hoy?` : '¿Qué quieres lograr hoy?'}
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>Activa tus hábitos del día y define tu intención</div>
        </div>

        {/* Habit toggles */}
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Mis hábitos de hoy
        </div>
        {habits.length === 0 ? (
          <div style={{ padding: '16px 14px', background: C.cream, borderRadius: 12, border: `1px dashed ${C.roseLight}`, marginBottom: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>Aún no tienes hábitos</div>
            <button onClick={() => { setShowMorningCheckin(false); setView('habitos') }} style={{
              padding: '8px 18px', borderRadius: 20, border: 'none',
              background: C.rose, color: 'white', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Escoger mis hábitos
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
            {habits.map(h => {
              const dim = DIMS[h.dim]
              return (
                <div key={h.id} onClick={() => toggleHabit(h.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: checked[h.id] ? `${C.green}12` : C.cream, borderRadius: 12,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: checked[h.id] ? `1px solid ${C.green}40` : `1px solid ${C.border}`,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked[h.id] ? C.green : dim.color}`,
                    background: checked[h.id] ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s',
                  }}>
                    {checked[h.id] && '✓'}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: checked[h.id] ? C.subtle : C.text, flex: 1,
                    textDecoration: checked[h.id] ? 'line-through' : 'none' }}>
                    {ICONS[dim.icon] ? ICONS[dim.icon](dim.color, 16) : ''} {h.name}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Intention */}
        <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Mi intención del día
        </div>
        <textarea
          value={morningIntention}
          onChange={e => setMorningIntention(e.target.value)}
          placeholder="Hoy quiero..."
          style={{
            width: '100%', minHeight: 70, padding: 12, borderRadius: 12, border: `1px solid ${C.border}`,
            fontSize: 15, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.5,
            boxSizing: 'border-box', background: C.cream,
          }}
        />

        <button onClick={completeMorningCheckin} style={{
          marginTop: 16, width: '100%', padding: 16, borderRadius: 16, border: 'none',
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
          color: 'white', fontSize: 17, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 6px 20px rgba(201,169,110,0.35)', letterSpacing: '0.02em',
        }}>
          Comenzar mi día ☀️
        </button>
      </div>
    </div>
  )

  /* ── Night Modal ── */
  const nightModal = showNightCheckin && (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🌙</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3 }}>
            {profile.name ? `${profile.name}, ¿cómo te fue hoy?` : '¿Cómo te fue hoy?'}
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>Revisa tu día y cierra con una reflexión</div>
        </div>

        {/* Summary */}
        <div style={{ background: C.cream, borderRadius: 16, padding: 18, marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.roseDark, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Resumen del día
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.rose }}>{totalDone}</div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>completados</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.subtle }}>{totalHabits - totalDone}</div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>pendientes</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.gold }}>{totalHabits > 0 ? Math.round((totalDone / totalHabits) * 100) : 0}%</div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>progreso</div>
            </div>
          </div>
          {/* Uncompleted habits */}
          {habits.filter(h => !checked[h.id]).length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Puedes completar aún:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {habits.filter(h => !checked[h.id]).map(h => (
                  <div key={h.id} onClick={() => toggleHabit(h.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    background: C.card, borderRadius: 10, cursor: 'pointer', border: `1px solid ${C.border}`,
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, border: `2px solid ${DIMS[h.dim].color}`,
                      background: 'transparent', flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{ICONS[DIMS[h.dim].icon](DIMS[h.dim].color, 14)} {h.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mood */}
        <div style={{ fontSize: 12, fontWeight: 700, color: C.roseDark, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, textAlign: 'center' }}>
          ¿Cómo te sientes?
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, justifyContent: 'center' }}>
          {MOODS.map((m, i) => (
            <button key={i} onClick={() => setNightMood(i)} style={{
              fontSize: 30, background: nightMood === i ? C.beige : 'transparent',
              border: nightMood === i ? `2px solid ${C.rose}` : '2px solid transparent',
              borderRadius: 14, padding: 8, cursor: 'pointer', transition: 'all 0.15s',
              transform: nightMood === i ? 'scale(1.15)' : 'scale(1)',
            }}>
              {m}
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
            fontSize: 15, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.5,
            boxSizing: 'border-box', background: C.cream,
          }}
        />

        <button onClick={completeNightCheckin} style={{
          marginTop: 16, width: '100%', padding: 16, borderRadius: 16, border: 'none',
          background: `linear-gradient(135deg, ${C.roseDark}, ${C.rose})`,
          color: 'white', fontSize: 17, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 6px 20px rgba(166,113,107,0.35)', letterSpacing: '0.02em',
        }}>
          Cerrar mi día 🌙
        </button>
      </div>
    </div>
  )

  /* ── Render ── */
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {header}
      <div style={{ padding: isMobile ? 16 : 24, paddingBottom: 80 }}>
        {view === 'inicio'    && inicioView}
        {view === 'programas' && programasView}
        {view === 'toolkit'   && toolkitView}
        {view === 'habitos'   && habitosView}
        {view === 'rutina'    && rutinaView}
        {view === 'diario'    && diarioView}
        {view === 'frases'    && frasesView}
        {view === 'perfil'    && perfilView}
      </div>
      {bottomNav}
      {morningModal}
      {nightModal}
    </div>
  )
}

export default App
