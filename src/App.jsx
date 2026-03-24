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
import { useNotifications } from './lib/useNotifications'
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
  const { isSubscribed, isReady: notifReady, requestPermission } = useNotifications()

  const [view, setView] = useState('inicio')
  const [subTab, setSubTab] = useState('') // sub-navigation within tabs
  // Admin check — Diana sees everything, others see paywall
  const ADMIN_EMAILS = ['dianasilva.londono@gmail.com', 'dianasilvalondono@gmail.com', 'diana@rondahub.com']
  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase())
  const isPremium = isAdmin // Later: check Stripe subscription

  // AI Agent state
  const [aiGoal, setAiGoal] = useState('')
  const [aiContext, setAiContext] = useState('')
  const [aiStep, setAiStep] = useState(0) // 0=intro, 1=goal, 2=context, 3=generating, 4=result
  const [aiProgram, setAiProgram] = useState(null)
  const [aiError, setAiError] = useState('')
  const [aiSaved, setAiSaved] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [dirFilter, setDirFilter] = useState('todas')

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
  const [editingRoutineItem, setEditingRoutineItem] = useState(null) // { sectionKey, id, time, task, emoji }
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

  // Panic button / Crisis mode
  const [showPanic, setShowPanic] = useState(false)
  const [panicScreen, setPanicScreen] = useState('home') // home, breathe, ground, dbt, accept
  const [breathePhase, setBreathePhase] = useState('inhale') // inhale, hold, exhale
  const [breatheCount, setBreatheCount] = useState(0)
  const [breatheActive, setBreatheActive] = useState(false)
  const [panicDbtExpanded, setPanicDbtExpanded] = useState(null)
  const [groundStep, setGroundStep] = useState(0)

  // Board (Bulletin Board 24/7)
  const [boardPosts, setBoardPosts] = useState(() => load('ronda-board', []))
  const [boardFilter, setBoardFilter] = useState('todas')
  const [boardNewText, setBoardNewText] = useState('')
  const [boardNewCat, setBoardNewCat] = useState('general')
  const [boardShowForm, setBoardShowForm] = useState(false)
  const [boardHearts, setBoardHearts] = useState(() => load('ronda-board-hearts', {}))

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
  useEffect(() => { save('ronda-board', boardPosts) }, [boardPosts])
  useEffect(() => { save('ronda-board-hearts', boardHearts) }, [boardHearts])
  useEffect(() => { save(`ronda-morning-${todayKey()}`, morningDone) }, [morningDone])
  useEffect(() => { save(`ronda-night-${todayKey()}`, nightDone) }, [nightDone])
  useEffect(() => { save('diana-morning', morning) }, [morning])
  useEffect(() => { save('diana-midday', midday) }, [midday])
  useEffect(() => { save('diana-night', night) }, [night])
  useEffect(() => { save(`ronda-tomorrow-${todayKey()}`, tomorrowTasks) }, [tomorrowTasks])

  // Breathing timer for panic button
  useEffect(() => {
    if (!breatheActive) return
    const phases = [
      { name: 'inhale', label: 'Inhala', duration: 4000 },
      { name: 'hold', label: 'Sostén', duration: 7000 },
      { name: 'exhale', label: 'Exhala', duration: 8000 },
    ]
    let phaseIndex = 0
    let cycleCount = breatheCount
    const runPhase = () => {
      if (cycleCount >= 5 || !breatheActive) return
      setBreathePhase(phases[phaseIndex].name)
      const t = setTimeout(() => {
        phaseIndex++
        if (phaseIndex >= 3) { phaseIndex = 0; cycleCount++; setBreatheCount(cycleCount) }
        if (cycleCount < 5 && breatheActive) runPhase()
        else { setBreatheActive(false) }
      }, phases[phaseIndex].duration)
      return t
    }
    const t = runPhase()
    return () => clearTimeout(t)
  }, [breatheActive])

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

  const saveRoutineItemEdit = () => {
    if (!editingRoutineItem) return
    const { sectionKey, id, time, task, emoji } = editingRoutineItem
    const updater = prev => prev.map(i => i.id === id ? { ...i, time, task, emoji } : i)
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
    /* Board — manos unidas / círculo de apoyo */
    board: (a) => <BrandIcon active={a}><circle cx="16" cy="10" r="3" fill={a ? C.gold : C.rose} opacity="0.9" /><circle cx="9" cy="20" r="2.5" fill={a ? C.gold : C.rose} opacity="0.7" /><circle cx="23" cy="20" r="2.5" fill={a ? C.gold : C.rose} opacity="0.7" /><path d="M9 17 Q16 14 23 17" stroke={a ? C.gold : C.rose} strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M9 22.5 Q16 26 23 22.5" stroke={a ? C.gold : C.rose} strokeWidth="1.5" fill="none" strokeLinecap="round" /></BrandIcon>,
    /* Crecer — semilla/planta creciendo */
    crecer: (a) => <BrandIcon active={a}><path d="M16 24 L16 14" stroke={a ? C.gold : C.rose} strokeWidth="2" strokeLinecap="round" /><path d="M16 14 Q12 10 16 6 Q20 10 16 14Z" fill={a ? C.gold : C.rose} opacity="0.85" /><path d="M16 18 Q11 16 10 12" stroke={a ? C.gold : C.rose} strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M16 18 Q21 16 22 12" stroke={a ? C.gold : C.rose} strokeWidth="1.5" fill="none" strokeLinecap="round" /></BrandIcon>,
    /* Directorio — tienda/storefront */
    directorio: (a) => <BrandIcon active={a}><path d="M6 13 L6 24 L26 24 L26 13" stroke={a ? C.gold : C.rose} strokeWidth="1.8" fill="none" strokeLinecap="round" /><path d="M4 13 L16 6 L28 13" stroke={a ? C.gold : C.rose} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><rect x="13" y="17" width="6" height="7" rx="1" fill={a ? C.gold : C.rose} opacity="0.6" /><circle cx="10" cy="18" r="1.5" fill={a ? C.gold : C.rose} opacity="0.5" /><circle cx="22" cy="18" r="1.5" fill={a ? C.gold : C.rose} opacity="0.5" /></BrandIcon>,
    /* Yo — persona/perfil */
    yo: (a) => <BrandIcon active={a}><circle cx="16" cy="11" r="4" fill={a ? C.gold : C.rose} opacity="0.85" /><path d="M8 24 Q8 18 16 18 Q24 18 24 24" fill={a ? C.gold : C.rose} opacity="0.6" /></BrandIcon>,
  }

  const NAV = [
    { id: 'inicio',     label: 'Mi día' },
    { id: 'crecer',     label: 'Crecer' },
    { id: 'board',      label: 'Comunidad' },
    { id: 'directorio', label: 'Ronda' },
    { id: 'yo',         label: 'Yo' },
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
      background: 'linear-gradient(135deg, #A6716B 0%, #C4908A 50%, #E4A5A0 100%)',
      padding: '20px 20px 16px', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {logo}
            <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)' }} />
            <span style={{ fontSize: 16, color: '#E8D5A8', fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", serif' }}>Creces tú, crecemos todas</span>
            {isAdmin && <span style={{ fontSize: 8, background: '#C9A96E', color: 'white', padding: '2px 6px', borderRadius: 6, fontWeight: 700, marginLeft: 6, letterSpacing: '0.05em' }}>ADMIN</span>}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginTop: 4 }}>{formatDate()} · Hábitos: {totalDone}/{totalHabits}</div>
        </div>
        <button onClick={() => { setView('yo'); setSubTab('perfil') }} style={{
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
          <button key={n.id} onClick={() => { setView(n.id); setSubTab('') }} style={{
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
      {/* Greeting — clean, white, with colored circle accent */}
      <div style={{ padding: 24, background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: C.mint, opacity: 0.15 }} />
        <div style={{ position: 'absolute', bottom: -15, right: 30, width: 50, height: 50, borderRadius: '50%', background: C.coral, opacity: 0.1 }} />
        <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif', color: C.text }}>{getGreeting()}{profile.name ? `, ${profile.name}` : ''}</div>
        <div style={{ fontSize: 14, marginTop: 6, fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', color: C.rose }}>La mujer que quieres ser, empieza hoy</div>
        {totalHabits > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>{totalDone} de {totalHabits} hábitos</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: C.teal }}>{Math.round((totalDone / totalHabits) * 100)}%</span>
            </div>
            <div style={{ background: C.mintLight, borderRadius: 6, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${(totalDone / totalHabits) * 100}%`, height: '100%', background: C.teal, borderRadius: 6, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Lo que sigue — with colored circle */}
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
          <div onClick={() => { setView('yo'); setSubTab('rutina') }} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
            background: C.card, borderRadius: 16, cursor: 'pointer',
            border: `1px solid ${C.border}`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: `${C.teal}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.teal }}>{next.time}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{next.task}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Lo que sigue</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${C.coral}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14, color: C.coral }}>→</span>
            </div>
          </div>
        )
      })()}

      {/* Quote — with colored accent circle */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '16px 18px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${C.gold}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: C.gold }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, fontStyle: 'italic', color: C.text }}>"{quote.text}"</div>
          <div style={{ fontSize: 13, marginTop: 6, color: C.rose, fontWeight: 600 }}>— {quote.author}</div>
        </div>
      </div>

      {/* Active programs preview */}
      {Object.keys(activePrograms).length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, cursor: 'pointer' }}
          onClick={() => { setView('crecer'); setSubTab('programas') }}>
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

      {/* Hook emocional — UN solo card que rota diario */}
      {(() => {
        const hooks = [
          { q: '¿Estás pasando por una tusa?', sub: 'Yo también la viví. Tengo un camino de 7 días para ti.', prog: 'tusa', color: '#C4908A' },
          { q: '¿Sientes que la ansiedad no te deja en paz?', sub: 'Respira. Hay un programa paso a paso para recuperar la calma.', prog: 'ansiedad', color: '#C9A96E' },
          { q: '¿Quieres volver a moverte?', sub: '7 días para reconectar con tu cuerpo, sin presión, a tu ritmo.', prog: 'ejercicio', color: '#7BA56E' },
          { q: '¿Quieres reconectar con Dios?', sub: '7 días para cultivar tu espiritualidad y encontrar paz interior.', prog: 'dios', color: '#C9A96E' },
          { q: '¿Quieres volver a ti?', sub: 'Ser mamá no es perderte. 7 días para reconectarte contigo.', prog: 'mama', color: '#E4A5A0' },
        ]
        const dayIdx = new Date().getDate() % hooks.length
        const hook = hooks[dayIdx]
        if (activePrograms[hook.prog]) return null
        return (
          <div onClick={() => { setView('crecer'); setSubTab('programas') }} style={{
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
          editingRoutineItem && editingRoutineItem.id === item.id ? (
            /* Inline edit mode */
            <div key={item.id} style={{
              background: C.card, borderRadius: 12, padding: 14,
              boxShadow: '0 2px 8px rgba(196,144,138,0.15)', border: `2px solid ${C.rose}`,
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input value={editingRoutineItem.time} onChange={e => setEditingRoutineItem(prev => ({...prev, time: e.target.value}))}
                  style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', fontWeight: 700, color: C.gold }} />
                <input value={editingRoutineItem.task} onChange={e => setEditingRoutineItem(prev => ({...prev, task: e.target.value}))}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit' }}
                  onKeyDown={e => e.key === 'Enter' && saveRoutineItemEdit()} />
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                {ROUTINE_EMOJIS.map(e => (
                  <button key={e} onClick={() => setEditingRoutineItem(prev => ({...prev, emoji: e}))} style={{
                    fontSize: 18, padding: 3, background: editingRoutineItem.emoji === e ? C.beige : 'transparent',
                    border: editingRoutineItem.emoji === e ? `2px solid ${C.rose}` : '2px solid transparent',
                    borderRadius: 6, cursor: 'pointer',
                  }}>{e}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveRoutineItemEdit} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: C.rose, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✓ Guardar
                </button>
                <button onClick={() => setEditingRoutineItem(null)} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: C.muted }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
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
              {editingRoutine && <>
                <button onClick={() => setEditingRoutineItem({ sectionKey, id: item.id, time: item.time, task: item.task, emoji: item.emoji })} style={{
                  background: 'none', border: 'none', color: C.gold, fontSize: 16, cursor: 'pointer', padding: '0 4px', flexShrink: 0,
                }}>✏️</button>
                <button onClick={() => removeRoutineItem(sectionKey, item.id)} style={{
                  background: 'none', border: 'none', color: '#e57373', fontSize: 18, cursor: 'pointer', padding: '0 4px', flexShrink: 0,
                }}>×</button>
              </>}
            </div>
          )
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
              <button onClick={() => { startProgram(rec.programa); setView('crecer'); setSubTab('programas') }} style={{
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
  /* ── HISTORIA DE RONDA ── */
  const historiaView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${C.roseLight}` }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3, marginBottom: 16 }}>
          "Soy el puente de miles de mujeres"
        </div>
        <div style={{ fontSize: 15, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
          Ronda nació de las mujeres que me formaron. Mis dos abuelas quedaron viudas muy jóvenes y sacaron adelante familias enteras con las manos y con el alma. Crecí rodeada de mujeres poderosas — tías, primas, amigas — que se reinventaban una y otra vez sin pedir permiso.
        </div>
        <div style={{ fontSize: 15, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
          Yo también he tenido muchas vidas. Me divorcié a los 25 con tres maletas y a echar pa'lante. Me fui pa' Nueva York sin diploma, me gradué magna cum laude, me devolví pa' Colombia. Y cada vez que me caí, me levanté — pero nunca sola. Siempre hubo una mujer del otro lado tendiéndome la mano.
        </div>
        <div style={{ fontSize: 15, color: C.text, lineHeight: 1.8, marginBottom: 14, fontWeight: 600 }}>
          Cada mujer que Dios me ha puesto en el camino me ha enseñado algo. Y sé que a ti también te ha pasado: alguien te sostuvo cuando no podías más.
        </div>
        {showFullStory && <>
          <div style={{ fontSize: 15, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
            Vivo con TLP desde los 16 años. Pasé por malos diagnósticos, por depresión. Hasta que llegué al DBT y eso me cambió la vida. Me certifiqué como profesora de yoga. Me fui 35 días a Grecia con 20 mujeres. En ese camino vi el potencial: mujeres creciendo juntas. Eso tenía que ser una plataforma.
          </div>
          <div style={{ fontSize: 15, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
            Yo también he escogido mal. He tomado malas decisiones. Me paro firme con ellas hoy. He sido personajes de mujeres de las que no me he sentido orgullosa. Pero las lecciones que me dejaron esas mujeres que me rodean — mis abuelas, mis maestras, mis amigas — esas me han sostenido.
          </div>
          <div style={{ fontSize: 15, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
            En los momentos de crisis buscaba apoyo y la psicóloga tenía citas — no estaba disponible. Pensé: ¿cómo tengo a alguien ahí cuando lo necesito? Alguien que conteste del otro lado. No importa de dónde, pero que esté ahí.
          </div>
          <div style={{ fontSize: 15, color: C.rose, lineHeight: 1.8, fontWeight: 600, fontStyle: 'italic', marginBottom: 14 }}>
            Ronda es mi forma de devolver todo lo que recibí. No es mi historia — es la historia de todas las mujeres que me construyeron. Y yo solo quiero ser puente para que tú también tengas esa red, esas herramientas, esa ronda de mujeres que te acompaña.
          </div>
        </>}
        <button onClick={() => setShowFullStory(!showFullStory)} style={{
          background: 'none', border: 'none', color: C.rose, fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', padding: 0,
        }}>
          {showFullStory ? 'Leer menos ↑' : 'Leer la historia completa →'}
        </button>
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700,
          }}>D</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Diana Silva</div>
            <div style={{ fontSize: 13, color: C.muted }}>Fundadora de Ronda · Puente de miles de mujeres</div>
          </div>
        </div>
      </div>
    </div>
  )

  const programasView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1B8A7A, #2A9D8F, #7ED4BC)', borderRadius: 18, padding: 22, color: 'white' }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif' }}>Programas</div>
        <div style={{ fontSize: 15, opacity: 0.85, marginTop: 4 }}>Caminos paso a paso para sanar, crecer y brillar</div>
        <div style={{ fontSize: 13, marginTop: 6, opacity: 0.7 }}>1 minuto al día. 7 días. Tu transformación.</div>
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

      {/* Available programs — positivos primero */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Crece a tu ritmo
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          No tienes que estar pasando por algo difícil para empezar. Estos programas son para ti, ahora.
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
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{prog.title}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{prog.desc}</div>
                <div style={{ fontSize: 12, color: C.subtle, marginTop: 4 }}>{prog.days.length} días · 1 minuto al día</div>
                <button onClick={() => startProgram(prog.id)} style={{
                  marginTop: 10, padding: '8px 18px', borderRadius: 20, border: 'none',
                  background: prog.color, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
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
        <div style={{ fontSize: 13, fontWeight: 700, color: C.rose, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Cuando necesites apoyo
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          Si estás pasando por algo difícil, estos programas te acompañan paso a paso.
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
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{prog.title}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{prog.desc}</div>
                <div style={{ fontSize: 12, color: C.subtle, marginTop: 4 }}>{prog.days.length} días · 1 minuto al día</div>
                <button onClick={() => startProgram(prog.id)} style={{
                  marginTop: 10, padding: '8px 18px', borderRadius: 20, border: 'none',
                  background: prog.color, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
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
      <div style={{ background: 'linear-gradient(135deg, #C9A96E, #E8D5A8)', borderRadius: 18, padding: 22, color: 'white' }}>
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
      <div style={{ background: 'linear-gradient(135deg, #B8A9C9, #D4C4E0)', borderRadius: 18, padding: 20, color: 'white' }}>
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

  /* ── Board categories ── */
  const BOARD_CATS = [
    { id: 'todas', label: 'Todas', icon: '🌿' },
    { id: 'ansiedad', label: 'Ansiedad', icon: '🌊' },
    { id: 'relaciones', label: 'Relaciones', icon: '💔' },
    { id: 'autoestima', label: 'Autoestima', icon: '🪞' },
    { id: 'maternidad', label: 'Maternidad', icon: '🤱' },
    { id: 'duelo', label: 'Duelo', icon: '🕊️' },
    { id: 'emprendimiento', label: 'Emprender', icon: '🚀' },
    { id: 'general', label: 'General', icon: '💬' },
  ]

  /* ── Seed board data (MVP — will be replaced by Supabase) ── */
  const SEED_POSTS = [
    { id: 's1', cat: 'ansiedad', content: 'Llevo 3 noches sin dormir bien. Siento que el pecho me aprieta y no puedo parar de pensar en todo lo que tengo que hacer mañana. ¿Alguien más se siente así?', time: 'Hace 2 horas', hearts: 24,
      replies: [{ pro: { name: 'Dra. Camila Restrepo', title: 'Psicóloga clínica · Especialista en ansiedad', verified: true },
        text: 'Lo que describes suena a ansiedad anticipatoria — tu mente está tratando de "resolver" el futuro desde la cama. Prueba esto: escribe TODO lo que te preocupa en un papel (descarga mental). Luego cierra el cuaderno y dile a tu mente: "Ya está escrito, mañana lo resuelvo." El cerebro necesita sentir que no va a olvidar para poder soltar. Si esto persiste más de 2 semanas, busca ayuda profesional. Estoy aquí. 💛' }] },
    { id: 's2', cat: 'autoestima', content: 'Me separé hace 6 meses y siento que perdí mi identidad. No sé quién soy sin esa relación. Me miro al espejo y no me reconozco.', time: 'Hace 5 horas', hearts: 41,
      replies: [{ pro: { name: 'María José Herrera', title: 'Coach de bienestar · Certificada DBT', verified: true },
        text: 'Lo que sientes es normal y tiene nombre: se llama "duelo de identidad." Cuando una relación larga termina, perdemos no solo a la persona sino a la versión de nosotras que existía en esa relación. Pero aquí está la buena noticia: ahora tienes espacio para descubrir quién eres TÚ sola. Empieza pequeño: ¿qué te gustaba hacer antes de esa relación? ¿Qué dejaste de hacer? Escríbelo. Ahí empieza el camino de regreso a ti. 🌱' }] },
    { id: 's3', cat: 'maternidad', content: 'Amo a mis hijos pero hay días que siento que me perdí a mí misma. No tengo un minuto para mí. ¿Está mal sentirme así?', time: 'Hace 1 día', hearts: 67,
      replies: [{ pro: { name: 'Dra. Ana Lucía Gómez', title: 'Psicóloga perinatal · Maternidad consciente', verified: true },
        text: 'No solo NO está mal — es una de las experiencias más comunes y menos habladas de la maternidad. Se llama "pérdida de identidad materna" y afecta al 70% de las mamás. No eres mala madre por querer tiempo para ti. Eres una madre humana. Empieza con 15 minutos al día solo para ti — sin culpa. Tu bienestar ES parte del bienestar de tus hijos. 💛' }] },
    { id: 's4', cat: 'relaciones', content: 'Siempre elijo el mismo tipo de persona. Sé que me hace daño pero no puedo dejar de hacerlo. ¿Por qué repito el patrón?', time: 'Hace 3 horas', hearts: 38,
      replies: [{ pro: { name: 'Dra. Camila Restrepo', title: 'Psicóloga clínica · Especialista en ansiedad', verified: true },
        text: 'Los patrones de relación se forman en la infancia — nuestro cerebro busca lo "familiar" (que viene de familia, no de "conocido"). Si creciste con amor intermitente, tu cerebro confunde la ansiedad con el amor. El primer paso es reconocer el patrón, y tú ya lo estás haciendo. El segundo es trabajar tu estilo de apego. DBT y terapia de esquemas pueden ayudarte a reprogramar lo que tu cerebro busca en una pareja. No estás "rota" — estás programada, y eso se puede cambiar. 🧠' }] },
    { id: 's5', cat: 'duelo', content: 'Perdí a mi mamá hace un año y hay días que siento que el dolor es igual de fuerte que el primer día. ¿Cuándo para esto?', time: 'Hace 8 horas', hearts: 53,
      replies: [{ pro: { name: 'María José Herrera', title: 'Coach de bienestar · Certificada DBT', verified: true },
        text: 'El duelo no es lineal. No hay un día mágico en que "pare." Lo que cambia es tu relación con el dolor. Con el tiempo, el dolor no se va — aprende a vivir dentro de ti sin ocupar todo el espacio. Los días fuertes van a seguir viniendo (fechas especiales, canciones, olores). Y eso no significa que no estás avanzando. Significa que amaste mucho. Y eso es hermoso. Permítete sentir sin juzgarte. 🕊️' }] },
    { id: 's6', cat: 'emprendimiento', content: 'Tengo una idea de negocio pero me da pánico fracasar. Llevo meses paralizada sin dar el primer paso.', time: 'Hace 4 horas', hearts: 29,
      replies: [{ pro: { name: 'Laura Martínez', title: 'Coach ejecutiva · Emprendimiento femenino', verified: true },
        text: 'El miedo al fracaso es en realidad miedo al juicio. Tu cerebro no teme al fracaso — teme que los demás te vean fracasar. Pero aquí va la verdad: nadie está mirando tanto como crees. El costo de no intentar siempre es mayor que el costo de fracasar. Empieza con la versión más pequeña posible de tu idea. No necesitas que sea perfecto — necesitas que EXISTA. El 80% del éxito es empezar. 🚀' }] },
  ]

  const allBoardPosts = [...SEED_POSTS, ...boardPosts]
  const filteredBoardPosts = boardFilter === 'todas' ? allBoardPosts : allBoardPosts.filter(p => p.cat === boardFilter)

  const addBoardPost = () => {
    if (!boardNewText.trim()) return
    const newPost = {
      id: `u${Date.now()}`,
      cat: boardNewCat,
      content: boardNewText.trim(),
      time: 'Ahora',
      hearts: 0,
      replies: [],
    }
    setBoardPosts(prev => [newPost, ...prev])
    setBoardNewText('')
    setBoardShowForm(false)
  }

  const toggleBoardHeart = (postId) => {
    setBoardHearts(prev => ({ ...prev, [postId]: !prev[postId] }))
  }

  /* ── Board View ── */
  const boardView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Comunidad Ronda
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3 }}>
          No estás sola. Pregunta lo que necesites.
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
          Tú eres anónima. Nuestras profesionales están verificadas ✓
        </div>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
        {BOARD_CATS.map(cat => (
          <button key={cat.id} onClick={() => setBoardFilter(cat.id)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: boardFilter === cat.id ? C.rose : C.card,
            color: boardFilter === cat.id ? 'white' : C.muted,
            fontSize: 12, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
            boxShadow: boardFilter === cat.id ? '0 2px 8px rgba(196,144,138,0.3)' : 'none',
          }}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* New post button */}
      {!boardShowForm ? (
        <button onClick={() => setBoardShowForm(true)} style={{
          padding: '14px 18px', borderRadius: 16, border: `2px dashed ${C.roseLight}`,
          background: C.card, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}>
          <div style={{ fontSize: 14, color: C.muted }}>💬 ¿Qué necesitas hoy? Escribe aquí...</div>
          <div style={{ fontSize: 11, color: C.subtle, marginTop: 4 }}>Tu publicación es anónima. Solo profesionales verificadas responden.</div>
        </button>
      ) : (
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${C.roseLight}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.roseDark, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            🔒 Publicación anónima
          </div>
          {/* Category selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {BOARD_CATS.filter(c => c.id !== 'todas').map(cat => (
              <button key={cat.id} onClick={() => setBoardNewCat(cat.id)} style={{
                padding: '4px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: boardNewCat === cat.id ? C.rose : C.cream,
                color: boardNewCat === cat.id ? 'white' : C.muted,
                fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
              }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          <textarea
            value={boardNewText}
            onChange={e => setBoardNewText(e.target.value)}
            placeholder="Escribe lo que sientes, lo que te preocupa, lo que necesitas saber. Este es tu espacio seguro."
            rows={4}
            style={{
              width: '100%', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14,
              fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
              lineHeight: 1.6, background: C.cream, color: C.text, boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={() => setBoardShowForm(false)} style={{
              flex: 1, padding: '10px 16px', borderRadius: 12, border: `1px solid ${C.border}`,
              background: 'none', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancelar</button>
            <button onClick={addBoardPost} style={{
              flex: 1, padding: '10px 16px', borderRadius: 12, border: 'none',
              background: boardNewText.trim() ? C.rose : C.border, color: 'white',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Publicar 💛</button>
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
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              }}>🔒</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Anónima</div>
                <div style={{ fontSize: 11, color: C.subtle }}>{post.time}</div>
              </div>
            </div>
            <span style={{
              padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
              background: `${C.rose}15`, color: C.roseDark,
            }}>
              {(BOARD_CATS.find(c => c.id === post.cat) || {}).icon} {(BOARD_CATS.find(c => c.id === post.cat) || {}).label}
            </span>
          </div>

          {/* Post content */}
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7, marginBottom: 12 }}>
            {post.content}
          </div>

          {/* Hearts */}
          <button onClick={() => toggleBoardHeart(post.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: 20, border: `1px solid ${boardHearts[post.id] ? C.rose : C.border}`,
            background: boardHearts[post.id] ? `${C.rose}12` : 'none',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 14 }}>{boardHearts[post.id] ? '💛' : '🤍'}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: boardHearts[post.id] ? C.roseDark : C.muted }}>
              {(post.hearts || 0) + (boardHearts[post.id] ? 1 : 0)} te acompañan
            </span>
          </button>

          {/* Professional replies */}
          {post.replies && post.replies.length > 0 && post.replies.map((reply, ri) => (
            <div key={ri} style={{
              marginTop: 14, padding: 16, borderRadius: 14,
              background: 'linear-gradient(135deg, #FBF6F3, #F5E1DE40)',
              border: `1px solid ${C.roseLight}`,
            }}>
              {/* Professional header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 14, fontWeight: 700,
                }}>{reply.pro.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{reply.pro.name}</span>
                    {reply.pro.verified && <span style={{
                      fontSize: 10, background: C.gold, color: 'white', padding: '1px 6px',
                      borderRadius: 8, fontWeight: 700,
                    }}>✓ Verificada</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>{reply.pro.title}</div>
                </div>
              </div>
              {/* Reply content */}
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>
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
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          ¿Eres profesional de la salud mental?
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          Únete como profesional verificada y ayuda a miles de mujeres que necesitan apoyo.
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.rose }}>
          Escríbenos → hola@rondahub.com
        </div>
      </div>
    </div>
  )

  /* ── Sub-tab navigation (pill style) ── */
  const SubTabs = ({ tabs, active, onChange }) => (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '8px 18px', borderRadius: 20, border: active === t.id ? 'none' : `1.5px solid ${C.border}`, cursor: 'pointer',
          background: active === t.id ? C.teal : C.card,
          color: active === t.id ? 'white' : C.text,
          fontSize: 13, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
          boxShadow: active === t.id ? '0 2px 10px rgba(27,138,122,0.25)' : 'none',
          transition: 'all 0.15s',
        }}>
          {t.label}
        </button>
      ))}
    </div>
  )

  /* ── Directorio / Marketplace ── */
  const DIRECTORIO_CATS = [
    { id: 'todas', label: 'Todas', icon: '🌿' },
    { id: 'salud_mental', label: 'Salud Mental', icon: '🧠' },
    { id: 'coaching', label: 'Coaching', icon: '🎯' },
    { id: 'yoga', label: 'Yoga & Movimiento', icon: '🧘‍♀️' },
    { id: 'nutricion', label: 'Nutrición', icon: '🥗' },
    { id: 'legal', label: 'Legal & Finanzas', icon: '⚖️' },
    { id: 'belleza', label: 'Belleza & Bienestar', icon: '💆‍♀️' },
    { id: 'negocios', label: 'Negocios', icon: '💼' },
    { id: 'educacion', label: 'Educación', icon: '📚' },
  ]


  const SEED_DIRECTORIO = [
    { id: 'd1', name: 'Dra. Camila Restrepo', title: 'Psicóloga clínica', cat: 'salud_mental', city: 'Cartagena', desc: 'Especialista en ansiedad, depresión y TLP. 8 años de experiencia. Terapia DBT y cognitivo-conductual.', price: 'Desde $120.000/sesión', verified: true, rating: 4.9, reviews: 47 },
    { id: 'd2', name: 'María José Herrera', title: 'Coach de bienestar certificada', cat: 'coaching', city: 'Bogotá', desc: 'Certificada en DBT y coaching ontológico. Te acompaño en transiciones de vida, separaciones y reinvención personal.', price: 'Desde $150.000/sesión', verified: true, rating: 4.8, reviews: 32 },
    { id: 'd3', name: 'Studio Shakti Yoga', title: 'Yoga & Meditación', cat: 'yoga', city: 'Cartagena', desc: 'Clases de Vinyasa, Yin Yoga y meditación guiada. Grupos pequeños y clases privadas. Fundada por mujeres.', price: 'Desde $35.000/clase', verified: true, rating: 5.0, reviews: 89 },
    { id: 'd4', name: 'Dra. Ana Lucía Gómez', title: 'Psicóloga perinatal', cat: 'salud_mental', city: 'Medellín', desc: 'Maternidad consciente, depresión postparto, crianza respetuosa. Sesiones presenciales y virtuales.', price: 'Desde $130.000/sesión', verified: true, rating: 4.9, reviews: 61 },
    { id: 'd5', name: 'Laura Martínez Coaching', title: 'Coach ejecutiva', cat: 'coaching', city: 'Bogotá', desc: 'Emprendimiento femenino, liderazgo y marca personal. Programas grupales e individuales para mujeres que quieren crecer.', price: 'Desde $180.000/sesión', verified: true, rating: 4.7, reviews: 28 },
    { id: 'd6', name: 'Nutrición Vital', title: 'Nutricionista clínica', cat: 'nutricion', city: 'Cartagena', desc: 'Alimentación consciente, planes personalizados, relación sana con la comida. Sin dietas restrictivas — bienestar real.', price: 'Desde $100.000/consulta', verified: true, rating: 4.8, reviews: 53 },
    { id: 'd7', name: 'Abogadas con Alma', title: 'Derecho de familia', cat: 'legal', city: 'Cartagena', desc: 'Divorcios, custodia, violencia intrafamiliar. Equipo de abogadas que entiende lo que estás pasando. Consulta inicial gratis.', price: 'Consulta inicial gratis', verified: true, rating: 4.9, reviews: 37 },
    { id: 'd8', name: 'Manos de Luna', title: 'Spa & Bienestar', cat: 'belleza', city: 'Cartagena', desc: 'Masajes terapéuticos, aromaterapia, reflexología. Un espacio creado por mujeres para reconectar con tu cuerpo.', price: 'Desde $80.000/sesión', verified: true, rating: 4.9, reviews: 72 },
    { id: 'd9', name: 'Cuentas Claras', title: 'Contabilidad para emprendedoras', cat: 'negocios', city: 'Virtual', desc: 'Facturación, impuestos, registro de empresa. Te ayudamos a formalizar tu negocio sin enredos. Precios especiales para emprendedoras.', price: 'Desde $200.000/mes', verified: true, rating: 4.6, reviews: 19 },
    { id: 'd10', name: 'Escuela Renacer', title: 'Talleres de empoderamiento', cat: 'educacion', city: 'Virtual', desc: 'Talleres de autoestima, finanzas personales, comunicación asertiva y liderazgo femenino. Grupos de máximo 15 mujeres.', price: 'Desde $50.000/taller', verified: true, rating: 4.8, reviews: 44 },
  ]

  const filteredDir = dirFilter === 'todas' ? SEED_DIRECTORIO : SEED_DIRECTORIO.filter(d => d.cat === dirFilter)

  const directorioView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Directorio Ronda
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3 }}>
          Mujeres que te acompañan en el camino
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
          Profesionales y negocios verificados por la comunidad ✓
        </div>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
        {DIRECTORIO_CATS.map(cat => (
          <button key={cat.id} onClick={() => setDirFilter(cat.id)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: dirFilter === cat.id ? C.rose : C.card,
            color: dirFilter === cat.id ? 'white' : C.muted,
            fontSize: 12, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
            boxShadow: dirFilter === cat.id ? '0 2px 8px rgba(196,144,138,0.3)' : 'none',
          }}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Listings */}
      {filteredDir.map(item => (
        <div key={item.id} style={{
          background: C.card, borderRadius: 16, padding: 18,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {/* Avatar */}
            <div style={{
              width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 20, fontWeight: 700,
            }}>{item.name.charAt(0)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{item.name}</span>
                {item.verified && <span style={{
                  fontSize: 9, background: C.gold, color: 'white', padding: '2px 6px',
                  borderRadius: 8, fontWeight: 700,
                }}>✓ VERIFICADA</span>}
              </div>
              <div style={{ fontSize: 12, color: C.rose, fontWeight: 600, marginTop: 2 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>📍 {item.city}</div>
            </div>
          </div>

          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginTop: 12 }}>
            {item.desc}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>⭐ {item.rating}</span>
              <span style={{ fontSize: 11, color: C.subtle }}>({item.reviews} reseñas)</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.roseDark }}>{item.price}</span>
          </div>

          <button style={{
            marginTop: 12, width: '100%', padding: '10px 16px', borderRadius: 12, border: 'none',
            background: `linear-gradient(135deg, ${C.rose}, ${C.roseDark})`, color: 'white',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Contactar →
          </button>
        </div>
      ))}

      {/* CTA to register business */}
      <div style={{
        textAlign: 'center', padding: 24, background: C.card, borderRadius: 16,
        border: `1px solid ${C.roseLight}`,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          ¿Tienes un negocio o eres profesional?
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          Registra tu negocio en el Directorio Ronda y conecta con miles de mujeres.
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.rose }}>
          Regístrate → hola@rondahub.com
        </div>
      </div>
    </div>
  )

  /* ── Paywall component ── */
  const Paywall = ({ feature, price, desc }) => (
    <div style={{
      textAlign: 'center', padding: 32, background: `linear-gradient(135deg, ${C.rose}08, ${C.gold}08)`,
      borderRadius: 20, border: `1.5px solid ${C.roseLight}`,
    }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        {feature}
      </div>
      <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 20, maxWidth: 300, margin: '0 auto 20px' }}>
        {desc}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.gold, marginBottom: 4 }}>{price}</div>
      <div style={{ fontSize: 12, color: C.subtle, marginBottom: 20 }}>Cancela cuando quieras</div>
      <button style={{
        padding: '14px 32px', borderRadius: 14, border: 'none',
        background: `linear-gradient(135deg, ${C.gold}, #A68B52)`, color: 'white',
        fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: '0 4px 16px rgba(201,169,110,0.3)',
      }}>
        Desbloquear Ronda Premium ✨
      </button>
      <div style={{ fontSize: 11, color: C.subtle, marginTop: 12 }}>
        Próximamente · Te avisamos cuando esté disponible
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
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      setAiProgram(data.program)
      setAiStep(4)
    } catch (err) {
      setAiError(err.message || 'Error generando tu programa')
      setAiStep(2)
    }
  }

  const saveAiProgram = () => {
    if (!aiProgram) return
    const id = 'custom_' + Date.now()
    const prog = { ...aiProgram, id, color: '#C4908A', custom: true }
    const saved = JSON.parse(localStorage.getItem('diana-custom-programs') || '[]')
    saved.push(prog)
    localStorage.setItem('diana-custom-programs', JSON.stringify(saved))
    // Also activate it
    const ap = { ...activePrograms }
    ap[id] = { startDate: new Date().toISOString().split('T')[0], completedDays: [] }
    setActivePrograms(ap)
    localStorage.setItem('diana-active-programs', JSON.stringify(ap))
    setAiSaved(true)
  }

  const resetAiAgent = () => {
    setAiGoal(''); setAiContext(''); setAiStep(0); setAiProgram(null); setAiError(''); setAiSaved(false)
  }

  const aiAgentView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🤖✨</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3 }}>
          Crea tu programa personalizado
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
          Dime qué quieres lograr y te armo un programa paso a paso, a tu ritmo.
        </div>
      </div>

      {/* Step 0: Intro / Examples */}
      {aiStep === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ¿Qué quieres lograr? Por ejemplo:
          </div>
          {[
            { goal: 'Quiero dejar de comer azúcar', icon: '🍫→🥗' },
            { goal: 'Quiero empezar a meditar', icon: '🧘→☮️' },
            { goal: 'Quiero dormir mejor', icon: '😴→💤' },
            { goal: 'Quiero dejar de procrastinar', icon: '📵→🎯' },
            { goal: 'Quiero fortalecer mi relación de pareja', icon: '💑→❤️' },
            { goal: 'Quiero aprender a decir que no', icon: '😓→💪' },
          ].map((ex, i) => (
            <button key={i} onClick={() => { setAiGoal(ex.goal); setAiStep(1) }} style={{
              padding: '14px 18px', borderRadius: 14, border: `1px solid ${C.border}`,
              background: C.card, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <span style={{ fontSize: 22 }}>{ex.icon}</span>
              <span style={{ fontSize: 14, color: C.text, fontWeight: 600, fontFamily: 'inherit' }}>{ex.goal}</span>
            </button>
          ))}
          <div style={{ textAlign: 'center', fontSize: 12, color: C.subtle, marginTop: 4 }}>
            O escribe el tuyo propio ↓
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={aiGoal}
              onChange={e => setAiGoal(e.target.value)}
              placeholder="Escribe tu meta aquí..."
              style={{
                flex: 1, padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${C.roseLight}`,
                fontSize: 14, fontFamily: 'inherit', background: C.cream, color: C.text, outline: 'none',
              }}
            />
            <button onClick={() => aiGoal.trim() && setAiStep(1)} disabled={!aiGoal.trim()} style={{
              padding: '14px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: aiGoal.trim() ? C.rose : C.border, color: 'white',
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
            }}>→</button>
          </div>
        </div>
      )}

      {/* Step 1: Confirm goal */}
      {aiStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            background: `linear-gradient(135deg, ${C.rose}15, ${C.gold}10)`,
            borderRadius: 16, padding: 20, border: `1px solid ${C.roseLight}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.rose, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Tu meta
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>
              "{aiGoal}"
            </div>
          </div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
            ¿Quieres contarme algo más? Por ejemplo: hace cuánto lo intentas, qué te ha costado, tu situación actual. Entre más me cuentes, mejor tu programa.
          </div>
          <textarea
            value={aiContext}
            onChange={e => setAiContext(e.target.value)}
            placeholder="Opcional: cuéntame un poco más... (ej: llevo 2 años intentando, me cuesta más en las noches...)"
            rows={3}
            style={{
              padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${C.roseLight}`,
              fontSize: 14, fontFamily: 'inherit', background: C.cream, color: C.text,
              outline: 'none', resize: 'none', lineHeight: 1.6,
            }}
          />
          {aiError && <div style={{ fontSize: 13, color: '#D32F2F', fontWeight: 600 }}>{aiError}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setAiStep(0); setAiGoal(''); setAiContext('') }} style={{
              flex: 1, padding: '14px', borderRadius: 14, border: `1.5px solid ${C.border}`,
              background: C.card, color: C.muted, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>← Atrás</button>
            <button onClick={generateAiProgram} style={{
              flex: 2, padding: '14px', borderRadius: 14, border: 'none',
              background: `linear-gradient(135deg, ${C.rose}, ${C.roseDark})`, color: 'white',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Crear mi programa ✨</button>
          </div>
        </div>
      )}

      {/* Step 2: Generating (loading) */}
      {aiStep === 3 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s ease-in-out infinite' }}>🧠</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            Creando tu programa...
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            Estoy analizando tu meta y armando cada paso para que sea alcanzable, suave y progresivo. Dame un momento.
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }`}</style>
        </div>
      )}

      {/* Step 4: Result */}
      {aiStep === 4 && aiProgram && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Program header */}
          <div style={{
            background: `linear-gradient(135deg, ${C.rose}15, ${C.gold}10)`,
            borderRadius: 16, padding: 20, border: `1px solid ${C.roseLight}`, textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{aiProgram.emoji}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {aiProgram.title}
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{aiProgram.desc}</div>
            <div style={{ fontSize: 11, color: C.rose, fontWeight: 700, marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {aiProgram.days?.length || 7} días · Creado por IA para ti
            </div>
          </div>

          {/* Days */}
          {aiProgram.days?.map(d => (
            <div key={d.day} style={{
              padding: '14px 16px', background: C.card, borderRadius: 14,
              border: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, background: `${C.rose}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                fontSize: 16,
              }}>{d.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.rose, textTransform: 'uppercase' }}>Día {d.day}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{d.title}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{d.task}</div>
              </div>
            </div>
          ))}

          {/* Actions */}
          {!aiSaved ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={resetAiAgent} style={{
                flex: 1, padding: '14px', borderRadius: 14, border: `1.5px solid ${C.border}`,
                background: C.card, color: C.muted, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Empezar de nuevo</button>
              <button onClick={saveAiProgram} style={{
                flex: 2, padding: '14px', borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${C.gold}, #A68B52)`, color: 'white',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Guardar y empezar 🚀</button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, background: `${C.green}10`, borderRadius: 16, border: `1px solid ${C.green}30` }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>¡Programa guardado!</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Ve a Crecer → Programas para empezarlo.</div>
              <button onClick={resetAiAgent} style={{
                marginTop: 12, padding: '10px 24px', borderRadius: 12, border: 'none',
                background: C.rose, color: 'white', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Crear otro programa</button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const perfilView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Avatar & Name card */}
      <div style={{ background: 'linear-gradient(135deg, #C4908A, #E4A5A0, #F5E1DE)', borderRadius: 18, padding: 24, color: 'white', textAlign: 'center' }}>
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
            <button onClick={() => { setShowMorningCheckin(false); setView('yo'); setSubTab('habitos') }} style={{
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

  /* ── Panic Button (floating) ── */
  const panicFab = !showPanic && (
    <button
      onClick={() => { setShowPanic(true); setPanicScreen('home'); setGroundStep(0); setBreatheActive(false); setBreatheCount(0) }}
      style={{
        position: 'fixed', bottom: 90, right: 16, zIndex: 200,
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(135deg, #A6716B, #C4908A)',
        border: 'none', cursor: 'pointer', padding: '10px 16px 10px 14px',
        borderRadius: 28, boxShadow: '0 4px 20px rgba(74,48,53,0.4)',
        animation: 'pulse-gentle 3s ease-in-out infinite',
      }}
      aria-label="Botón de emergencia — Respiración, grounding y herramientas DBT"
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'linear-gradient(135deg, #C4908A, #A6716B)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="white"/>
        </svg>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>¿Necesitas apoyo?</span>
    </button>
  )

  /* ── Panic Modal — Full Crisis Support ── */
  const GROUND_STEPS = [
    { sense: '👀 VER', prompt: 'Nombra 5 cosas que puedes VER ahora mismo', count: 5, color: '#7BA56E' },
    { sense: '✋ TOCAR', prompt: 'Nombra 4 cosas que puedes TOCAR', count: 4, color: '#C9A96E' },
    { sense: '👂 ESCUCHAR', prompt: 'Nombra 3 cosas que puedes ESCUCHAR', count: 3, color: '#C4908A' },
    { sense: '👃 OLER', prompt: 'Nombra 2 cosas que puedes OLER', count: 2, color: '#A6716B' },
    { sense: '👅 SABOREAR', prompt: 'Nombra 1 cosa que puedes SABOREAR', count: 1, color: '#1B8A7A' },
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
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: panicScreen === 'breathe'
        ? (breathePhase === 'inhale' ? 'linear-gradient(180deg, #14695E, #1B8A7A)'
          : breathePhase === 'hold' ? 'linear-gradient(180deg, #1B8A7A, #14695E)'
          : 'linear-gradient(180deg, #1A202C, #2D3748)')
        : 'linear-gradient(180deg, #14695E 0%, #0D4A42 100%)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.3s ease',
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
    }}>
      {/* Close button */}
      <button onClick={() => { setShowPanic(false); setBreatheActive(false) }} style={{
        position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)',
        border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
      }}>
        <span style={{ color: 'white', fontSize: 20, lineHeight: 1 }}>✕</span>
      </button>

      {/* Back button */}
      {panicScreen !== 'home' && (
        <button onClick={() => { setPanicScreen('home'); setBreatheActive(false); setPanicDbtExpanded(null) }} style={{
          position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.15)',
          border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }}>
          <span style={{ color: 'white', fontSize: 18, lineHeight: 1 }}>←</span>
        </button>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, maxWidth: 440, margin: '0 auto', width: '100%' }}>

        {/* ── HOME: Main crisis menu ── */}
        {panicScreen === 'home' && <>
          <div style={{ fontSize: 56, marginBottom: 16 }}>💛</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: 'Georgia, serif', lineHeight: 1.3, marginBottom: 8 }}>
            Estás a salvo.
          </div>
          <div style={{ fontSize: 16, color: '#E8C4C0', textAlign: 'center', marginBottom: 8 }}>
            Respira. Este momento va a pasar.
          </div>
          <div style={{ fontSize: 13, color: '#C4908A', textAlign: 'center', marginBottom: 32 }}>
            Escoge lo que necesitas ahora mismo:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            {[
              { id: 'breathe', icon: '🌬️', title: 'Respiración 4-7-8', sub: 'Calma tu sistema nervioso en 2 minutos', color: '#7BA56E' },
              { id: 'ground', icon: '🌍', title: 'Grounding 5-4-3-2-1', sub: 'Vuelve al presente con tus sentidos', color: '#C9A96E' },
              { id: 'dbt', icon: '🧠', title: 'Skills DBT', sub: 'TIPP · STOP · Acción Opuesta · Aceptación Radical', color: '#C4908A' },
              { id: 'accept', icon: '🙏', title: 'Aceptación Radical', sub: 'Soltar la lucha. Abrazar lo que es.', color: '#A6716B' },
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
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{opt.title}</div>
                  <div style={{ fontSize: 12, color: '#E8C4C0', marginTop: 2 }}>{opt.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Go to community */}
          <button onClick={() => { setShowPanic(false); setView('board') }} style={{
            marginTop: 24, width: '100%', padding: '14px 18px',
            background: 'rgba(201,169,110,0.2)', borderRadius: 16,
            border: '1px solid rgba(201,169,110,0.4)', cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#C9A96E' }}>💬 Ir a la Comunidad</div>
            <div style={{ fontSize: 12, color: '#E8C4C0', marginTop: 4 }}>Pregunta lo que necesites. Profesionales verificadas responden 24/7.</div>
          </button>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#C4908A', marginBottom: 8 }}>Si sientes que tu vida está en riesgo:</div>
            <a href="tel:106" style={{
              display: 'inline-block', padding: '10px 24px', borderRadius: 20,
              background: '#A6716B', color: 'white', fontWeight: 700, fontSize: 14,
              textDecoration: 'none',
            }}>
              📞 Línea 106 — Atención en crisis
            </a>
          </div>
        </>}

        {/* ── BREATHE: 4-7-8 Guided Breathing ── */}
        {panicScreen === 'breathe' && <>
          <div style={{
            width: breathePhase === 'inhale' ? 200 : breathePhase === 'hold' ? 200 : 120,
            height: breathePhase === 'inhale' ? 200 : breathePhase === 'hold' ? 200 : 120,
            borderRadius: '50%',
            background: breathePhase === 'inhale'
              ? 'radial-gradient(circle, rgba(196,144,138,0.6), rgba(196,144,138,0.1))'
              : breathePhase === 'hold'
              ? 'radial-gradient(circle, rgba(201,169,110,0.6), rgba(201,169,110,0.1))'
              : 'radial-gradient(circle, rgba(123,165,110,0.6), rgba(123,165,110,0.1))',
            transition: 'all 1.5s ease-in-out',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 32,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {breathePhase === 'inhale' ? 'Inhala' : breathePhase === 'hold' ? 'Sostén' : 'Exhala'}
            </div>
          </div>

          <div style={{ fontSize: 14, color: '#E8C4C0', textAlign: 'center', marginBottom: 8 }}>
            {breathePhase === 'inhale' ? '4 segundos — llena tu pecho de aire' :
             breathePhase === 'hold' ? '7 segundos — el aire te sostiene' :
             '8 segundos — suelta todo, deja ir'}
          </div>
          <div style={{ fontSize: 13, color: '#C4908A', marginBottom: 24 }}>
            Ciclo {Math.min(breatheCount + 1, 5)} de 5
          </div>

          {!breatheActive && breatheCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 8 }}>Lo hiciste.</div>
              <div style={{ fontSize: 14, color: '#E8C4C0', marginBottom: 20 }}>Tu sistema nervioso se está calmando. Quédate aquí un momento.</div>
              <button onClick={() => { setBreatheCount(0); setBreatheActive(true); setBreathePhase('inhale') }} style={{
                padding: '10px 24px', borderRadius: 20, background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: 14,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>Repetir</button>
            </div>
          )}
        </>}

        {/* ── GROUND: 5-4-3-2-1 Sensory Grounding ── */}
        {panicScreen === 'ground' && <>
          {groundStep < 5 ? (<>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{GROUND_STEPS[groundStep].sense.split(' ')[0]}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: GROUND_STEPS[groundStep].color, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
              {GROUND_STEPS[groundStep].sense}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'white', textAlign: 'center', fontFamily: 'Georgia, serif', lineHeight: 1.4, marginBottom: 24 }}>
              {GROUND_STEPS[groundStep].prompt}
            </div>
            <div style={{ fontSize: 14, color: '#E8C4C0', marginBottom: 32, textAlign: 'center' }}>
              Tómate tu tiempo. No hay prisa.
            </div>
            <button onClick={() => setGroundStep(groundStep + 1)} style={{
              padding: '14px 36px', borderRadius: 20,
              background: GROUND_STEPS[groundStep].color, color: 'white',
              fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Listo → {groundStep < 4 ? 'Siguiente sentido' : 'Terminar'}
            </button>
          </>) : (<>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🌟</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: 'Georgia, serif', marginBottom: 12 }}>
              Estás aquí. Estás presente.
            </div>
            <div style={{ fontSize: 15, color: '#E8C4C0', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
              Acabas de reconectar con tus sentidos. Tu cuerpo sabe que estás a salvo.
            </div>
            <button onClick={() => setGroundStep(0)} style={{
              padding: '12px 28px', borderRadius: 20, background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: 14,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginRight: 10,
            }}>Repetir</button>
            <button onClick={() => setPanicScreen('home')} style={{
              padding: '12px 28px', borderRadius: 20, background: C.rose,
              border: 'none', color: 'white', fontSize: 14,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Volver</button>
          </>)}
        </>}

        {/* ── DBT: Skills menu ── */}
        {panicScreen === 'dbt' && <>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: 'Georgia, serif', marginBottom: 6 }}>
            Skills DBT
          </div>
          <div style={{ fontSize: 13, color: '#E8C4C0', textAlign: 'center', marginBottom: 24 }}>
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
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{skill.name}</div>
                    <div style={{ fontSize: 11, color: '#E8C4C0', marginTop: 2 }}>{skill.desc}</div>
                  </div>
                  <span style={{ color: '#C4908A', fontSize: 18 }}>{panicDbtExpanded === idx ? '▲' : '▼'}</span>
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
                          color: 'white', fontSize: 12, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
                        }}>{si + 1}</div>
                        <div style={{ fontSize: 14, color: '#E8C4C0', lineHeight: 1.5 }}>{step}</div>
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
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: 'Georgia, serif', lineHeight: 1.3, marginBottom: 12 }}>
            Aceptación Radical
          </div>
          <div style={{ fontSize: 14, color: '#E8C4C0', textAlign: 'center', marginBottom: 32, lineHeight: 1.6 }}>
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
                background: 'linear-gradient(135deg, #C4908A, #C9A96E)',
                color: 'white', fontSize: 13, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{step.num}</div>
              <div style={{ fontSize: 14, color: '#E8C4C0', lineHeight: 1.6 }}>{step.text}</div>
            </div>
          ))}

          <div style={{
            marginTop: 16, padding: 18, borderRadius: 16,
            background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.3)',
            textAlign: 'center', width: '100%',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#C9A96E', fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.5 }}>
              "No puedo controlar lo que pasa.<br/>Pero puedo elegir cómo respondo.<br/>Y hoy elijo la paz."
            </div>
          </div>
        </>}

      </div>
    </div>
  )

  /* ── Render ── */
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {header}
      <div style={{ padding: isMobile ? 16 : 24, paddingBottom: 80 }}>
        {view === 'inicio' && inicioView}

        {view === 'crecer' && <>
          <SubTabs
            tabs={[
              { id: 'programas', label: 'Programas', icon: '🧠' },
              { id: 'ai', label: 'Crea el tuyo', icon: '✨' },
              { id: 'historia', label: 'Nuestra historia', icon: '🌿' },
              { id: 'frases', label: 'Frases', icon: '💬' },
            ]}
            active={subTab || 'programas'}
            onChange={(t) => { setSubTab(t); if (t === 'ai') resetAiAgent() }}
          />
          {(subTab || 'programas') === 'programas' && programasView}
          {subTab === 'ai' && (isPremium ? aiAgentView : <Paywall feature="Crea tu programa con IA" price="$9.99/mes" desc="Dile a nuestra IA qué quieres lograr y te arma un programa personalizado, paso a paso, a tu ritmo. Sin presión." />)}
          {subTab === 'historia' && historiaView}
          {subTab === 'frases' && frasesView}
        </>}

        {view === 'board' && boardView}

        {view === 'directorio' && directorioView}

        {view === 'yo' && <>
          <SubTabs
            tabs={[
              { id: 'habitos', label: 'Hábitos', icon: '✅' },
              { id: 'rutina', label: 'Rutina', icon: '∞' },
              { id: 'diario', label: 'Diario', icon: '📝' },
              { id: 'toolkit', label: 'Toolkit', icon: '⭐' },
              { id: 'perfil', label: 'Perfil', icon: '👤' },
            ]}
            active={subTab || 'habitos'}
            onChange={setSubTab}
          />
          {(subTab || 'habitos') === 'habitos' && habitosView}
          {subTab === 'rutina' && rutinaView}
          {subTab === 'diario' && diarioView}
          {subTab === 'toolkit' && toolkitView}
          {subTab === 'perfil' && perfilView}
        </>}
      </div>
      {panicFab}
      {panicModal}
      {bottomNav}
      {morningModal}
      {nightModal}
    </div>
  )
}

export default App
