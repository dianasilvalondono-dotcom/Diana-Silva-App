import { useState, useEffect, useMemo } from 'react'
import './App.css'
import { C } from './constants/colors'
import { ICONS, MOOD_ICONS } from './constants/icons'
import {
  DIMS, DEFAULT_HABITS, DEFAULT_MORNING, DEFAULT_MIDDAY, DEFAULT_NIGHT,
  QUOTES, TOOLKIT_CATS, MOOD_RECS, PROGRAMAS, PROGRAMAS_PREMIUM, SUGGESTED_HABITS,
  AVATARS, CATS, CAT_LABELS, getDayQuote,
} from './constants/data'
import { todayKey, load, save, getGreeting, formatDate, MOODS, MOOD_LABELS, MOOD_COLORS } from './utils/helpers'
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

/* ═══════════════════════════════════════════ */
/*                   APP                       */
/* ═══════════════════════════════════════════ */

function App() {
  // Auth
  const { user, loading: authLoading, isConfigured, signInWithGoogle, signInWithEmail, signUp, signOut } = useAuth()
  const { isSubscribed, isReady: notifReady, requestPermission } = useNotifications()

  const [view, setView] = useState('ahora')
  const [subTab, setSubTab] = useState('') // sub-navigation within tabs
  // Admin check — Diana sees everything, others see paywall
  const ADMIN_EMAILS = ['dianasilva.londono@gmail.com']
  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase())
  const isPremium = isAdmin // Later: check Stripe subscription

  // AI Agent state
  const [aiGoal, setAiGoal] = useState('')
  const [aiContext, setAiContext] = useState('')
  const [aiStep, setAiStep] = useState(0) // 0=intro, 1=goal, 2=context, 3=generating, 4=result
  const [aiProgram, setAiProgram] = useState(null)
  const [aiError, setAiError] = useState('')
  const [aiSaved, setAiSaved] = useState(false)
  // Chat state (Tu Ronda)
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: '¡Hola! Soy Tu Ronda — tu compañera de camino. ¿Cómo vas hoy? Puedo ayudarte con tus hábitos, sugerirte un programa, o simplemente estar aquí contigo.' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMode, setChatMode] = useState('chat') // 'chat' or 'create'
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
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = { current: null }

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

  // Admin always sees onboarding (for demos/investors)
  useEffect(() => {
    if (isAdmin) setOnboarded(false)
  }, [isAdmin])

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

  // Monthly habit history
  const monthlyHistory = useMemo(() => {
    const history = {}
    const keys = Object.keys(localStorage).filter(k => k.startsWith('diana-checked-'))
    keys.forEach(key => {
      const date = key.replace('diana-checked-', '')
      try {
        const data = JSON.parse(localStorage.getItem(key))
        const doneCount = Object.values(data).filter(Boolean).length
        if (doneCount > 0) history[date] = doneCount
      } catch (e) {}
    })
    return history
  }, [checked])

  // Day change detection
  useEffect(() => {
    const checkDay = setInterval(() => {
      const now = todayKey()
      const stored = localStorage.getItem('ronda-current-day')
      if (stored && stored !== now) {
        localStorage.setItem('ronda-current-day', now)
        window.location.reload()
      } else if (!stored) {
        localStorage.setItem('ronda-current-day', now)
      }
    }, 60000)
    localStorage.setItem('ronda-current-day', todayKey())
    return () => clearInterval(checkDay)
  }, [])

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
    setIsListening(false)
  }

  // Voice journaling — Web Speech API
  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert('Tu navegador no soporta voz. Usa Chrome o Safari.'); return }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-CO'
    recognition.continuous = true
    recognition.interimResults = true
    recognitionRef.current = recognition

    let finalTranscript = journalText

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setJournalText(finalTranscript + (interim ? ' ' + interim : ''))
    }

    recognition.onerror = () => { setIsListening(false) }
    recognition.onend = () => { setIsListening(false) }

    recognition.start()
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
        id: Date.now(), date: todayKey(), text: `Intención del día: ${morningIntention}`,
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
        id: Date.now(), date: todayKey(), text: `Reflexión de noche: ${nightReflection}`,
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
      <circle cx="16" cy="16" r="14.5" stroke={active ? C.teal : C.subtle} strokeWidth="2" fill={active ? 'rgba(27,138,122,0.1)' : 'none'} />
      {children}
    </svg>
  )
  const NAV_ICONS = {
    /* Ahora — sol con rayos (tu día) */
    ahora: (a) => <BrandIcon active={a}><circle cx="16" cy="16" r="4" fill={a ? C.teal : C.subtle} /><g stroke={a ? C.teal : C.subtle} strokeWidth="1.5" strokeLinecap="round">{[[16,5,16,8],[16,24,16,27],[5,16,8,16],[24,16,27,16],[8.5,8.5,10.6,10.6],[21.4,21.4,23.5,23.5],[8.5,23.5,10.6,21.4],[21.4,10.6,23.5,8.5]].map(([x1,y1,x2,y2],i)=><line key={i} x1={x1} y1={y1} x2={x2} y2={y2}/>)}</g></BrandIcon>,
    /* Crecer — semilla/planta creciendo */
    crecer: (a) => <BrandIcon active={a}><path d="M16 24 L16 14" stroke={a ? C.teal : C.subtle} strokeWidth="2" strokeLinecap="round" /><path d="M16 14 Q12 10 16 6 Q20 10 16 14Z" fill={a ? C.teal : C.subtle} opacity="0.85" /><path d="M16 18 Q11 16 10 12" stroke={a ? C.teal : C.subtle} strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M16 18 Q21 16 22 12" stroke={a ? C.teal : C.subtle} strokeWidth="1.5" fill="none" strokeLinecap="round" /></BrandIcon>,
    /* Juntas — círculo de apoyo / manos unidas */
    juntas: (a) => <BrandIcon active={a}><circle cx="16" cy="10" r="3" fill={a ? C.teal : C.subtle} opacity="0.9" /><circle cx="9" cy="20" r="2.5" fill={a ? C.teal : C.subtle} opacity="0.7" /><circle cx="23" cy="20" r="2.5" fill={a ? C.teal : C.subtle} opacity="0.7" /><path d="M9 17 Q16 14 23 17" stroke={a ? C.teal : C.subtle} strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M9 22.5 Q16 26 23 22.5" stroke={a ? C.teal : C.subtle} strokeWidth="1.5" fill="none" strokeLinecap="round" /></BrandIcon>,
  }

  const NAV = [
    { id: 'ahora',  label: 'Ahora' },
    { id: 'crecer', label: 'Crecer' },
    { id: 'juntas', label: 'Juntas' },
  ]

  /* ── Logo ── */
  const logoIcon = (
    <div style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid #C6A94E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C6A94E' }} />
    </div>
  )
  const logo = (
    <button onClick={() => setView('ahora')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      {logoIcon}
      <span style={{ fontSize: 24, fontWeight: 400, color: 'white', letterSpacing: '0.15em', fontFamily: 'Georgia, "Times New Roman", serif' }}>Ronda</span>
    </button>
  )

  /* ── Top Header ── */
  const header = (
    <div style={{
      background: '#0D9488',
      padding: '20px 20px 16px', position: 'sticky', top: 0, zIndex: 100, overflow: 'hidden',
    }}>
      {/* Decorative Ronda circles */}
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(126,212,188,0.15)' }} />
      <div style={{ position: 'absolute', bottom: -20, right: 60, width: 60, height: 60, borderRadius: '50%', background: 'rgba(184,169,201,0.12)' }} />
      <div style={{ position: 'absolute', top: 5, left: -20, width: 50, height: 50, borderRadius: '50%', background: 'rgba(201,169,110,0.1)' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {logo}
            <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.3)' }} />
            <span style={{ fontSize: 20, color: '#E8D5A8', fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", serif' }}>Creces tú, crecemos todas</span>
            {isAdmin && <span style={{ fontSize: 8, background: '#C6A94E', color: 'white', padding: '2px 6px', borderRadius: 6, fontWeight: 700, marginLeft: 6, letterSpacing: '0.05em' }}>ADMIN</span>}
          </div>
          <div style={{ fontSize: 19, color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginTop: 4 }}>{formatDate()} · Hábitos: {totalDone}/{totalHabits}</div>
        </div>
        <button onClick={() => { setView('perfil'); setSubTab('') }} style={{
          width: 40, height: 40, borderRadius: '50%', border: '2px solid #C6A94E',
          background: 'rgba(201,169,110,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, padding: 0,
        }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #C6A94E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C6A94E' }} />
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
      background: 'linear-gradient(180deg, #FFF8F0 0%, #F0FAF7 100%)',
      borderTop: `1.5px solid ${C.mintLight}`,
      display: 'flex', padding: '8px 4px 20px', zIndex: 100,
      boxShadow: '0 -2px 12px rgba(27,138,122,0.08)',
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
              fontSize: 19, fontWeight: isActive ? 800 : 600,
              color: isActive ? C.teal : C.subtle,
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
        <div style={{ fontSize: 20, marginTop: 6, fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', color: C.rose }}>La mujer que quieres ser, empieza hoy</div>
        {totalHabits > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: C.muted }}>{totalDone} de {totalHabits} hábitos</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: C.teal }}>{Math.round((totalDone / totalHabits) * 100)}%</span>
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
          <div onClick={() => { setView('ahora'); setSubTab('rutina') }} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
            background: C.card, borderRadius: 16, cursor: 'pointer',
            border: `1px solid ${C.border}`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: `${C.teal}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.teal }}>{next.time}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{next.task}</div>
              <div style={{ fontSize: 20, color: C.muted, marginTop: 2 }}>Lo que sigue</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${C.coral}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, color: C.coral }}>→</span>
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
          <div style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.6, fontStyle: 'italic', color: C.text }}>"{quote.text}"</div>
          <div style={{ fontSize: 19, marginTop: 6, color: C.rose, fontWeight: 600 }}>— {quote.author}</div>
        </div>
      </div>

      {/* Active programs preview */}
      {Object.keys(activePrograms).length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, cursor: 'pointer' }}
          onClick={() => { setView('crecer'); setSubTab('programas') }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginBottom: 10 }}>Mis programas</div>
          {Object.entries(activePrograms).map(([progId, progress]) => {
            const prog = PROGRAMAS.find(p => p.id === progId)
            if (!prog) return null
            const pct = Math.round((progress.completedDays.length / prog.days.length) * 100)
            return (
              <div key={progId} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 19, fontWeight: 700, color: prog.color, marginBottom: 4 }}>
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
          { q: '¿Quieres empezar a tratarte mejor?', sub: '7 días para enamorarte de ti. Porque tú mereces el mismo amor que le das a los demás.', prog: 'amor_propio', color: C.coral },
          { q: '¿Quieres volver a moverte?', sub: '7 días para reconectar con tu cuerpo, a tu ritmo, paso a paso.', prog: 'ejercicio', color: C.teal },
          { q: '¿Quieres más disciplina en tu vida?', sub: 'No es motivación, es decisión. 7 días para entrenar tu mente.', prog: 'disciplina', color: C.tealDark },
          { q: '¿Quieres reconectar con tu espiritualidad?', sub: '7 días para cultivar paz interior y soltar el control.', prog: 'dios', color: C.gold },
          { q: '¿Quieres empezar de cero?', sub: 'Yo me reinventé muchas veces. 7 días para construir la vida que quieres.', prog: 'empezar', color: C.mint },
          { q: '¿Quieres recuperar tu calma?', sub: 'Respira. Hay un programa paso a paso para encontrar tu centro.', prog: 'ansiedad', color: C.lavanda },
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
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, lineHeight: 1.4, fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {hook.q}
            </div>
            <div style={{ fontSize: 19, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
              {hook.sub}
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: hook.color, marginTop: 10 }}>
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
          <span style={{ fontSize: 20, fontWeight: 800, color: C.text }}>Hoy</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.rose }}>{totalDone}/{totalHabits}</span>
        </div>
        <Bar value={totalHabits > 0 ? (totalDone / totalHabits) * 100 : 0} />
      </div>

      {/* Monthly streak */}
      <div style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Tu racha este mes</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
          {['L','M','X','J','V','S','D'].map(d => (
            <div key={d} style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 2 }}>{d}</div>
          ))}
          {(() => {
            const now = new Date()
            const year = now.getFullYear(), month = now.getMonth()
            const firstDay = new Date(year, month, 1).getDay()
            const daysInMonth = new Date(year, month + 1, 0).getDate()
            const offset = firstDay === 0 ? 6 : firstDay - 1
            const cells = []
            for (let i = 0; i < offset; i++) cells.push(<div key={'e'+i} />)
            for (let d = 1; d <= daysInMonth; d++) {
              const dateStr = year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0')
              const isToday = dateStr === todayKey()
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
        <div style={{ background: C.card, borderRadius: 14, padding: 20, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 28, marginBottom: 8, color: C.gold, opacity: 0.5 }}>●</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginBottom: 6, fontFamily: 'Georgia, "Times New Roman", serif' }}>
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
                <div key={h.id} onClick={() => toggleHabit(h.id)} style={{
                  background: C.card, borderRadius: 12, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: `3px solid ${checked[h.id] ? C.greenDone : cfg.color}`,
                  transition: 'all 0.15s', opacity: checked[h.id] ? 0.65 : 1,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 7, border: `2px solid ${checked[h.id] ? C.greenDone : cfg.color}`,
                    background: checked[h.id] ? C.greenDone : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 19, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s',
                  }}>
                    {checked[h.id] && '✓'}
                  </div>
                  <span style={{ fontSize: 19, fontWeight: 600, textDecoration: checked[h.id] ? 'line-through' : 'none', color: checked[h.id] ? C.subtle : C.text, flex: 1 }}>
                    {h.name}
                  </span>
                  {streaks[h.id] > 0 && (
                    <span style={{ fontSize: 20, fontWeight: 700, color: C.coral, background: `${C.coral}12`, padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><path d="M12 2 C12 2 8 7 8 12 C8 16 10 18 12 20 C14 18 16 16 16 12 C16 7 12 2 12 2Z" fill={C.coral} opacity="0.8" /><path d="M12 8 C12 8 10 11 10 13 C10 15 11 16 12 17 C13 16 14 15 14 13 C14 11 12 8 12 8Z" fill="white" opacity="0.5" /></svg>
                      {streaks[h.id]}
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); removeHabit(h.id) }} style={{
                    background: 'none', border: 'none', fontSize: 20, color: C.subtle, cursor: 'pointer', padding: 4, lineHeight: 1,
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
          padding: 12, borderRadius: 12, border: `2px dashed ${C.roseLight}`, background: 'transparent',
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
                <button onClick={() => addSuggestedHabit(sh)} style={{
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
        {items.map(item => (
          editingRoutineItem && editingRoutineItem.id === item.id ? (
            /* Inline edit mode */
            <div key={item.id} style={{
              background: C.card, borderRadius: 12, padding: 14,
              boxShadow: '0 2px 8px rgba(27,138,122,0.15)', border: `2px solid ${C.rose}`,
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input value={editingRoutineItem.time} onChange={e => setEditingRoutineItem(prev => ({...prev, time: e.target.value}))}
                  style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', fontWeight: 700, color: C.gold }} />
                <input value={editingRoutineItem.task} onChange={e => setEditingRoutineItem(prev => ({...prev, task: e.target.value}))}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit' }}
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
                <button onClick={saveRoutineItemEdit} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: C.rose, color: 'white', fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✓ Guardar
                </button>
                <button onClick={() => setEditingRoutineItem(null)} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'white', fontSize: 19, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: C.muted }}>
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
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 19, flexShrink: 0, cursor: 'pointer',
              }}>
                {routineChecked[item.id] && '✓'}
              </div>
              <div onClick={() => toggleRoutine(item.id)} style={{ width: 44, height: 44, borderRadius: '50%', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: color }}>{item.time}</span>
              </div>
              <span onClick={() => toggleRoutine(item.id)} style={{ fontSize: 19, fontWeight: 600, color: routineChecked[item.id] ? C.subtle : C.text, textDecoration: routineChecked[item.id] ? 'line-through' : 'none', flex: 1, cursor: 'pointer' }}>
                {item.task}
              </span>
              {editingRoutine && <>
                <button onClick={() => setEditingRoutineItem({ sectionKey, id: item.id, time: item.time, task: item.task, emoji: item.emoji })} style={{
                  background: 'none', border: 'none', color: C.gold, fontSize: 20, cursor: 'pointer', padding: '0 4px', flexShrink: 0,
                }}>✎</button>
                <button onClick={() => removeRoutineItem(sectionKey, item.id)} style={{
                  background: 'none', border: 'none', color: C.coral, fontSize: 20, cursor: 'pointer', padding: '0 4px', flexShrink: 0,
                }}>×</button>
              </>}
            </div>
          )
        ))}
      </div>
    </div>
  )

  const ROUTINE_EMOJIS = []

  const rutinaView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
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
            <input value={newRoutineTime} onChange={e => setNewRoutineTime(e.target.value)} placeholder="Hora (ej: 7:30)"
              style={{ width: 80, padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit' }} />
            <input value={newRoutineTask} onChange={e => setNewRoutineTask(e.target.value)} placeholder="¿Qué quieres hacer?"
              style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit' }}
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
            width: '100%', padding: 10, borderRadius: 12, border: 'none', fontSize: 20, fontWeight: 700,
            fontFamily: 'inherit', cursor: newRoutineTask.trim() && newRoutineTime.trim() ? 'pointer' : 'default',
            background: newRoutineTask.trim() && newRoutineTime.trim() ? C.rose : C.border,
            color: newRoutineTask.trim() && newRoutineTime.trim() ? 'white' : C.subtle,
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {tomorrowTasks.map(t => (
            <div key={t.id} onClick={() => toggleTomorrowTask(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: C.cream,
              borderRadius: 10, cursor: 'pointer',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', border: `2px solid ${t.done ? C.greenDone : C.roseLight}`,
                background: t.done ? C.greenDone : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 20, flexShrink: 0,
              }}>{t.done && '✓'}</div>
              <span style={{ fontSize: 20, color: t.done ? C.subtle : C.text, textDecoration: t.done ? 'line-through' : 'none' }}>{t.task}</span>
            </div>
          ))}
        </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* New entry */}
      <div style={{ background: C.card, borderRadius: 18, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: C.text }}>¿Cómo te sientes hoy?</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
          {MOOD_ICONS.map((icon, i) => (
            <button key={i} onClick={() => setJournalMood(i)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'all 0.15s', transform: journalMood === i ? 'scale(1.2)' : 'scale(1)', padding: 4,
            }}>
              {icon(36, journalMood === i)}
              <div style={{ fontSize: 19, fontWeight: 700, color: MOOD_COLORS[i], marginTop: 2 }}>{MOOD_LABELS[i]}</div>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <textarea value={journalText} onChange={e => setJournalText(e.target.value)}
            placeholder={isListening ? '🎙️ Escuchando... habla y tu voz se convierte en texto' : 'Escribe o habla tu reflexión del día...'}
            style={{
              width: '100%', minHeight: 100, padding: '14px 50px 14px 14px', borderRadius: 12,
              border: `1px solid ${isListening ? C.coral : C.border}`,
              fontSize: 19, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6,
              boxSizing: 'border-box', background: isListening ? '#FFF5F3' : C.cream,
              transition: 'border-color 0.2s, background 0.2s',
            }}
          />
          <button onClick={toggleVoiceInput} style={{
            position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: '50%',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isListening ? C.coral : C.mintLight,
            transition: 'all 0.2s',
            animation: isListening ? 'pulse 1.5s infinite' : 'none',
          }}>
            <span style={{ fontSize: 18 }}>{isListening ? '⏹️' : '🎙️'}</span>
          </button>
        </div>
        {isListening && (
          <div style={{ fontSize: 13, color: C.coral, fontWeight: 600, marginTop: 4, textAlign: 'center' }}>
            🔴 Grabando voz... toca ⏹️ para parar
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={addJournalEntry} disabled={!journalText.trim()} style={{
            flex: 1, padding: 12, borderRadius: 12, border: 'none',
            background: journalText.trim() ? C.teal : C.border,
            color: journalText.trim() ? 'white' : C.subtle,
            fontSize: 19, fontWeight: 700, cursor: journalText.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
          }}>
            Guardar reflexión
          </button>
        </div>
      </div>

      {/* ── Mood Recommendations ── */}
      {(() => {
        const rec = MOOD_RECS[journalMood]
        if (!rec) return null
        return (
          <div style={{ background: C.card, borderRadius: 18, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: `2px solid ${rec.color}20` }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: rec.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {MOOD_LABELS[journalMood]} — {rec.label}
            </div>
            <div style={{ fontSize: 19, color: C.muted, marginBottom: 14 }}>Basado en cómo te sientes, te recomendamos:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rec.items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: C.cream, borderRadius: 12, border: `1px solid ${C.border}`,
                }}>
                  {ICONS[item.type] ? ICONS[item.type](rec.color, 22) : <span style={{ fontSize: 22, flexShrink: 0 }}>{item.emoji}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{item.title}</div>
                    <div style={{ fontSize: 19, color: C.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{item.type}</div>
                  </div>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 20, color: rec.color, fontWeight: 700, textDecoration: 'none',
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
                background: 'transparent', color: rec.color, fontSize: 20, fontWeight: 700,
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
            <div style={{ fontSize: 20, fontWeight: 800, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tu histórico ({entries.length} {entries.length === 1 ? 'entrada' : 'entradas'})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(grouped).map(([date, dayEntries]) => (
                <div key={date}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: C.rose, marginBottom: 6 }}>{date === todayKey() ? 'Hoy' : date}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dayEntries.map(e => (
                      <div key={e.id} style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 19, fontWeight: 700, color: C.muted }}>{e.time}</span>
                          {MOOD_ICONS[e.mood] ? MOOD_ICONS[e.mood](22, true) : <span style={{ fontSize: 20, fontWeight: 700, color: MOOD_COLORS[e.mood] }}>{MOOD_LABELS[e.mood]}</span>}
                        </div>
                        <div style={{ fontSize: 19, color: C.text, lineHeight: 1.6 }}>{e.text}</div>
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
          <div style={{ fontSize: 36, marginBottom: 10, color: C.lavanda, opacity: 0.4 }}>●</div>
          <div style={{ fontSize: 19, fontWeight: 600 }}>Tu diario está vacío</div>
          <div style={{ fontSize: 20, marginTop: 4 }}>Escribe tu primera reflexión arriba</div>
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
        <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
          Ronda nació de las mujeres que me formaron. Mis dos abuelas quedaron viudas muy jóvenes y sacaron adelante familias enteras con las manos y con el alma. Crecí rodeada de mujeres poderosas — tías, primas, amigas — que se reinventaban una y otra vez sin pedir permiso.
        </div>
        <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
          Yo también he tenido muchas vidas. Me divorcié a los 25 con tres maletas y a echar pa'lante. Me fui pa' Nueva York sin diploma, me gradué magna cum laude, me devolví pa' Colombia. Y cada vez que me caí, me levanté — pero nunca sola. Siempre hubo una mujer del otro lado tendiéndome la mano.
        </div>
        <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14, fontWeight: 600 }}>
          Cada mujer que Dios me ha puesto en el camino me ha enseñado algo. Y sé que a ti también te ha pasado: alguien te sostuvo cuando no podías más.
        </div>
        {showFullStory && <>
          <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
            Vivo con TLP desde los 16 años. Pasé por malos diagnósticos, por depresión. Hasta que llegué al DBT y eso me cambió la vida. Me certifiqué como profesora de yoga. Me fui 35 días a Grecia con 20 mujeres. En ese camino vi el potencial: mujeres creciendo juntas. Eso tenía que ser una plataforma.
          </div>
          <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
            Yo también he escogido mal. He tomado malas decisiones. Me paro firme con ellas hoy. He sido personajes de mujeres de las que no me he sentido orgullosa. Pero las lecciones que me dejaron esas mujeres que me rodean — mis abuelas, mis maestras, mis amigas — esas me han sostenido.
          </div>
          <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
            En los momentos de crisis buscaba apoyo y la psicóloga tenía citas — no estaba disponible. Pensé: ¿cómo tengo a alguien ahí cuando lo necesito? Alguien que conteste del otro lado. No importa de dónde, pero que esté ahí.
          </div>
          <div style={{ fontSize: 19, color: C.rose, lineHeight: 1.8, fontWeight: 600, fontStyle: 'italic', marginBottom: 14 }}>
            Ronda es mi forma de devolver todo lo que recibí. No es mi historia — es la historia de todas las mujeres que me construyeron. Y yo solo quiero ser puente para que tú también tengas esa red, esas herramientas, esa ronda de mujeres que te acompaña.
          </div>
        </>}
        <button onClick={() => setShowFullStory(!showFullStory)} style={{
          background: 'none', border: 'none', color: C.rose, fontSize: 19, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', padding: 0,
        }}>
          {showFullStory ? 'Leer menos ↑' : 'Leer la historia completa →'}
        </button>
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: `${C.teal}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 700,
          }}>D</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>Diana Silva</div>
            <div style={{ fontSize: 19, color: C.muted }}>Fundadora de Ronda · Puente de miles de mujeres</div>
          </div>
        </div>
      </div>
    </div>
  )

  const programasView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0D9488, #14B5A3, #A7F3D0)', borderRadius: 18, padding: 22, color: 'white' }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif' }}>Programas</div>
        <div style={{ fontSize: 19, opacity: 0.85, marginTop: 4 }}>Caminos paso a paso para crecer y brillar</div>
        <div style={{ fontSize: 19, marginTop: 6, opacity: 0.7 }}>1 minuto al día. 7 días. Tu transformación.</div>
      </div>

      {/* Active programs */}
      {Object.keys(activePrograms).length > 0 && (
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
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
                      <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>{ICONS[prog.id] ? ICONS[prog.id](prog.color, 24) : prog.id} {prog.title}</div>
                      <div style={{ fontSize: 19, color: C.muted, marginTop: 2 }}>{completedCount} de {prog.days.length} días · {pct}%</div>
                    </div>
                    <button onClick={() => quitProgram(progId)} style={{
                      background: 'none', border: 'none', fontSize: 20, color: C.subtle, cursor: 'pointer', padding: 4,
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
                            color: 'white', fontSize: 19, fontWeight: 700, flexShrink: 0, marginTop: 2,
                          }}>
                            {isDone && '✓'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: prog.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              Día {d.day} {ICONS[d.icon] ? ICONS[d.icon](d.color, 16) : ''}
                            </div>
                            <div style={{ fontSize: 19, fontWeight: 700, color: isDone ? C.subtle : C.text, marginTop: 2,
                              textDecoration: isDone ? 'line-through' : 'none' }}>
                              {d.title}
                            </div>
                            <div style={{ fontSize: 19, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                              {d.task}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {pct === 100 && (
                    <div style={{ textAlign: 'center', marginTop: 14, padding: 16, background: `${prog.color}10`, borderRadius: 14 }}>
                      <div style={{ fontSize: 28, marginBottom: 6, color: C.teal }}>●</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: prog.color }}>¡Completaste el programa!</div>
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
          Estos programas son para ti, estés donde estés. Un paso a la vez.
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
          Programas de transformación
        </div>
        {PROGRAMAS_PREMIUM.map(prog => (
          <div key={prog.id} style={{
            background: `linear-gradient(135deg, ${C.cream}, #FFF8F0)`, borderRadius: 20, padding: 22,
            border: `2px solid ${C.gold}40`, boxShadow: '0 4px 16px rgba(201,169,110,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ background: C.gold, color: 'white', padding: '3px 10px', borderRadius: 20, fontSize: 19, fontWeight: 800, letterSpacing: '0.05em' }}>PREMIUM</div>
              <div style={{ fontSize: 20, color: C.gold, fontWeight: 700 }}>{prog.duration}</div>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 6 }}>{prog.title}</div>
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
              {ICONS.mental('#0D9488', 22)}
              <div style={{ fontSize: 20, color: C.muted, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 800 }}>Basado en neurociencia:</span> cada día incluye el porqué científico detrás de tu micro-acción.
              </div>
            </div>

            {/* Price + CTA */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.gold, marginBottom: 4 }}>${prog.price} USD</div>
              <div style={{ fontSize: 20, color: C.muted, marginBottom: 14 }}>Pago único · Acceso para siempre</div>
              <button style={{
                width: '100%', padding: '14px 24px', borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${C.gold}, #D4B87A)`,
                color: 'white', fontSize: 20, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(201,169,110,0.35)', letterSpacing: '0.02em',
              }}>
                Próximamente
              </button>
              <div style={{ fontSize: 19, color: C.subtle, marginTop: 8 }}>El pago se habilitará pronto</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )

  /* ── FRASES ── */
  const filteredQuotes = quoteFilter === 'todas' ? QUOTES : QUOTES.filter(q => q.cat === quoteFilter)
  const catLabels = CAT_LABELS

  const frasesView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Quote of the day */}
      <div style={{ background: 'linear-gradient(135deg, #C6A94E, #E8D5A8)', borderRadius: 18, padding: 22, color: 'white' }}>
        <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: 8 }}>Frase del día</div>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5, fontStyle: 'italic' }}>"{quote.text}"</div>
        <div style={{ fontSize: 20, marginTop: 10, opacity: 0.85 }}>— {quote.author}</div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {CATS.map(cat => (
          <button key={cat} onClick={() => setQuoteFilter(cat)} style={{
            padding: '6px 14px', borderRadius: 20, border: `2px solid ${quoteFilter === cat ? C.rose : C.border}`,
            background: quoteFilter === cat ? C.rose : C.card, color: quoteFilter === cat ? 'white' : C.muted,
            fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
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
              <div style={{ fontSize: 19, color: C.text, lineHeight: 1.6, fontStyle: 'italic' }}>"{q.text}"</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 19, color: isDiana ? C.rose : C.muted, fontWeight: 600 }}>— {q.author}</span>
                  <span style={{ fontSize: 20, background: C.beige, padding: '2px 8px', borderRadius: 20, color: C.muted, fontWeight: 600 }}>
                    {catLabels[q.cat] || q.cat}
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

  /* ── TOOLKIT ── */
  const filteredTools = toolFilter === 'todas' ? toolkitItems : toolkitItems.filter(t => t.cat === toolFilter)
  const toolkitCounts = TOOLKIT_CATS.reduce((acc, cat) => {
    acc[cat.id] = toolkitItems.filter(t => t.cat === cat.id).length
    return acc
  }, {})

  const toolkitView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #C4B5FD, #D4C4E0)', borderRadius: 18, padding: 20, color: 'white' }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif' }}>Mi Toolkit</div>
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
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: C.text }}>Agregar recurso</div>

          <input value={newToolName} onChange={e => setNewToolName(e.target.value)} placeholder="Nombre (ej: Podcast de Jay Shetty)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', marginBottom: 8, outline: 'none', boxSizing: 'border-box' }}
          />

          <input value={newToolUrl} onChange={e => setNewToolUrl(e.target.value)} placeholder="Link (ej: https://spotify.com/...)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', marginBottom: 8, outline: 'none', boxSizing: 'border-box' }}
          />

          <input value={newToolNote} onChange={e => setNewToolNote(e.target.value)} placeholder="Nota (opcional)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 20, fontFamily: 'inherit', marginBottom: 10, outline: 'none', boxSizing: 'border-box' }}
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
          padding: 14, borderRadius: 12, border: `2px dashed ${C.roseLight}`, background: 'transparent',
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
                    <span style={{ fontSize: 20, background: C.beige, padding: '2px 8px', borderRadius: 20, color: cat.color, fontWeight: 700 }}>
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
                <button onClick={() => removeToolkitItem(item.id)} style={{
                  background: 'none', border: 'none', fontSize: 20, color: C.subtle, cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0,
                }}>✕</button>
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
    { id: 'todas', label: 'Todas', color: '#0D9488' },
    { id: 'ansiedad', label: 'Ansiedad', color: '#C6A94E' },
    { id: 'relaciones', label: 'Relaciones', color: '#F4845F' },
    { id: 'autoestima', label: 'Autoestima', color: '#E8B4B8' },
    { id: 'maternidad', label: 'Maternidad', color: '#E8B4B8' },
    { id: 'duelo', label: 'Duelo', color: '#C4B5FD' },
    { id: 'emprendimiento', label: 'Emprender', color: '#A7F3D0' },
    { id: 'general', label: 'General', color: '#0D9488' },
  ]

  /* ── Seed board data (MVP — will be replaced by Supabase) ── */
  const SEED_POSTS = [
    { id: 's1', cat: 'ansiedad', content: 'Llevo 3 noches sin dormir bien. Siento que el pecho me aprieta y no puedo parar de pensar en todo lo que tengo que hacer mañana. ¿Alguien más se siente así?', time: 'Hace 2 horas', hearts: 24,
      replies: [{ pro: { name: 'Valentina R.', title: 'Guía Ronda · Coach certificada DBT', verified: true },
        text: 'Muchas lo hemos sentido. Lo que pasa es que tu mente está tratando de "resolver" el futuro desde la cama — y eso activa tu sistema nervioso. Prueba esto: escribe TODO lo que te preocupa en un papel (descarga mental). Luego cierra el cuaderno y dile a tu mente: "Ya está escrito, mañana lo resuelvo." Tu cerebro necesita sentir que no va a olvidar para poder soltar. Si esto sigue por más de 2 semanas, te recomiendo buscar acompañamiento profesional. Aquí estamos. 💛' }] },
    { id: 's2', cat: 'autoestima', content: 'Me separé hace 6 meses y siento que perdí mi identidad. No sé quién soy sin esa relación. Me miro al espejo y no me reconozco.', time: 'Hace 5 horas', hearts: 41,
      replies: [{ pro: { name: 'Valentina R.', title: 'Guía Ronda · Coach certificada DBT', verified: true },
        text: 'Lo que sientes es normal y tiene nombre: se llama "duelo de identidad." Cuando una relación larga termina, perdemos no solo a la persona sino a la versión de nosotras que existía en esa relación. Pero aquí está la buena noticia: ahora tienes espacio para descubrir quién eres TÚ sola. Empieza pequeño: ¿qué te gustaba hacer antes de esa relación? ¿Qué dejaste de hacer? Escríbelo. Ahí empieza el camino de regreso a ti. 🌱' }] },
    { id: 's3', cat: 'maternidad', content: 'Amo a mis hijos pero hay días que siento que me perdí a mí misma. No tengo un minuto para mí. ¿Está mal sentirme así?', time: 'Hace 1 día', hearts: 67,
      replies: [{ pro: { name: 'Mariana L.', title: 'Guía Ronda · Instructora certificada Yoga y Meditación', verified: true },
        text: 'No solo NO está mal — es una de las experiencias más comunes y menos habladas de la maternidad. Muchas mamás sienten lo mismo y no lo dicen. No eres mala madre por querer tiempo para ti. Eres una madre humana. Empieza con 15 minutos al día solo para ti — sin culpa. Tu bienestar ES parte del bienestar de tus hijos. 🌿' }] },
    { id: 's4', cat: 'relaciones', content: 'Siempre elijo el mismo tipo de persona. Sé que me hace daño pero no puedo dejar de hacerlo. ¿Por qué repito el patrón?', time: 'Hace 3 horas', hearts: 38,
      replies: [{ pro: { name: 'Valentina R.', title: 'Guía Ronda · Coach certificada DBT', verified: true },
        text: 'Los patrones de relación se forman temprano — nuestro cerebro busca lo "familiar" (que viene de familia, no de "conocido"). Si creciste con amor intermitente, tu cerebro puede confundir la intensidad con el amor. El primer paso es reconocer el patrón, y tú ya lo estás haciendo. El segundo es explorar tu estilo de apego. Hay herramientas como DBT que te ayudan a reprogramar lo que buscas en una pareja. No estás "rota" — estás programada, y eso se puede cambiar. 💪' }] },
    { id: 's5', cat: 'duelo', content: 'Perdí a mi mamá hace un año y hay días que siento que el dolor es igual de fuerte que el primer día. ¿Cuándo para esto?', time: 'Hace 8 horas', hearts: 53,
      replies: [{ pro: { name: 'Mariana L.', title: 'Guía Ronda · Instructora certificada Meditación', verified: true },
        text: 'El duelo no es lineal. No hay un día mágico en que "pare." Lo que cambia es tu relación con el dolor. Con el tiempo, el dolor no se va — aprende a vivir dentro de ti sin ocupar todo el espacio. Los días fuertes van a seguir viniendo (fechas especiales, canciones, olores). Y eso no significa que no estás avanzando. Significa que amaste mucho. Y eso es hermoso. Permítete sentir sin juzgarte. 💛' }] },
    { id: 's6', cat: 'emprendimiento', content: 'Tengo una idea de negocio pero me da pánico fracasar. Llevo meses paralizada sin dar el primer paso.', time: 'Hace 4 horas', hearts: 29,
      replies: [{ pro: { name: 'Camila S.', title: 'Guía Ronda · Coach de emprendimiento', verified: true },
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
        <div style={{ fontSize: 19, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Comunidad Ronda
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3 }}>
          Pregunta, crece, avanza.
        </div>
        <div style={{ fontSize: 19, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
          Tú eres anónima. Nuestras Guías Ronda están verificadas ✓
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
          <div style={{ fontSize: 19, color: C.subtle, marginTop: 4 }}>Tu publicación es anónima. Solo profesionales verificadas responden.</div>
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
            style={{
              width: '100%', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14,
              fontSize: 20, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
              lineHeight: 1.6, background: C.cream, color: C.text, boxSizing: 'border-box',
            }}
          />
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
                <div style={{ fontSize: 19, color: C.subtle }}>{post.time}</div>
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
                  background: `${C.teal}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 20, fontWeight: 700,
                }}>{reply.pro.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 19, fontWeight: 700, color: C.text }}>{reply.pro.name}</span>
                    {reply.pro.verified && <span style={{
                      fontSize: 20, background: C.gold, color: 'white', padding: '1px 6px',
                      borderRadius: 8, fontWeight: 700,
                    }}>✓ Verificada</span>}
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
          ¿Eres profesional de la salud mental?
        </div>
        <div style={{ fontSize: 20, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          Únete como profesional verificada y ayuda a miles de mujeres que necesitan apoyo.
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.rose }}>
          Escríbenos → hola@rondahub.com
        </div>
      </div>
    </div>
  )

  /* ── Sub-tab navigation (pill style) ── */
  const TAB_COLORS = [C.teal, C.coral, C.lavanda, C.gold, C.rose, C.mint]
  const SubTabs = ({ tabs, active, onChange, accentColor }) => (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      {tabs.map((t, i) => {
        const color = accentColor || TAB_COLORS[i % TAB_COLORS.length]
        return (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
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

  /* ── Directorio / Marketplace ── */
  const DIRECTORIO_CATS = []
  const SEED_DIRECTORIO = []
  const filteredDir = []

  const directorioView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Directorio Ronda
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3 }}>
          Mujeres que te acompañan en el camino
        </div>
        <div style={{ fontSize: 19, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
          Profesionales y negocios verificados por la comunidad ✓
        </div>
      </div>

      {/* Coming soon */}
      <div style={{
        textAlign: 'center', padding: 48, background: C.card, borderRadius: 20,
        border: `1.5px dashed ${C.border}`,
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
          Próximamente
        </div>
        <div style={{ fontSize: 18, color: C.muted, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
          Estamos armando un directorio de coaches, instructoras y profesionales verificadas para ti.
        </div>
        <div style={{ fontSize: 15, color: C.teal, fontWeight: 600, marginTop: 16 }}>
          Mientras tanto, pregunta lo que quieras en la Comunidad — nuestras Guías Ronda te responden.
        </div>
      </div>

      {/* CTA to register as professional */}
      <div style={{
        textAlign: 'center', padding: 24, background: C.card, borderRadius: 16,
        border: `1px solid ${C.roseLight}`,
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          ¿Eres coach, instructora o profesional?
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

  /* ── Paywall component ── */
  const Paywall = ({ feature, price, desc }) => (
    <div style={{
      textAlign: 'center', padding: 32, background: `linear-gradient(135deg, ${C.rose}08, ${C.gold}08)`,
      borderRadius: 20, border: `1.5px solid ${C.roseLight}`,
    }}>
      <div style={{ fontSize: 40, marginBottom: 12, color: C.teal, opacity: 0.3 }}>●</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        {feature}
      </div>
      <div style={{ fontSize: 20, color: C.muted, lineHeight: 1.6, marginBottom: 20, maxWidth: 300, margin: '0 auto 20px' }}>
        {desc}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.gold, marginBottom: 4 }}>{price}</div>
      <div style={{ fontSize: 20, color: C.subtle, marginBottom: 20 }}>Cancela cuando quieras</div>
      <button style={{
        padding: '14px 32px', borderRadius: 14, border: 'none',
        background: `linear-gradient(135deg, ${C.gold}, #0B7A71)`, color: 'white',
        fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: '0 4px 16px rgba(201,169,110,0.3)',
      }}>
        Desbloquear Ronda Premium ✨
      </button>
      <div style={{ fontSize: 19, color: C.subtle, marginTop: 12 }}>
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
    const prog = { ...aiProgram, id, color: '#E8B4B8', custom: true }
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

  const sendChatMessage = async () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    const userMsg = { role: 'user', text: msg }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)

    // ── Build rich context from user state ──
    const todayChecked = Object.values(checked).filter(Boolean).length
    const totalHabits = habits.length

    // Recent mood from last 7 journal entries
    const recentEntries = entries.slice(0, 7)
    const avgMood = recentEntries.length > 0
      ? (recentEntries.reduce((s, e) => s + (e.mood || 2), 0) / recentEntries.length).toFixed(1)
      : null
    const lastJournalNote = recentEntries[0]?.text || null

    const ctx = {
      name: profile.name || 'Usuaria',
      city: profile.city || null,
      intention: profile.intention || null,
      habitsToday: `${todayChecked}/${totalHabits}`,
      avgMood7d: avgMood,                    // 0-4 promedio últimos 7 días
      lastJournalNote: lastJournalNote ? lastJournalNote.slice(0, 200) : null,
      programActive: aiProgram?.title || null,
    }

    // Send history for multi-turn conversation
    const recentHistory = chatMessages.slice(-8).map(m => ({ role: m.role, text: m.text }))

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
      const data = await resp.json()
      if (data.error) throw new Error(data.error)

      const assistantMsg = { role: 'assistant', text: data.reply, connect: data.connect || null, sos: data.sos || false }
      setChatMessages(prev => [...prev, assistantMsg])

      // If AI returned a program, save it for the create flow
      if (data.program) {
        setAiProgram(data.program)
        setChatMessages(prev => [...prev, { role: 'assistant', text: '¡Te armé un programa! Cambia a "Crea tu programa" arriba para verlo y guardarlo.', isProgram: true }])
      }

      // 🧠 Update memory if the agent extracted new facts
      if (data.memoryUpdate) {
        setMemory(prev => ({
          ...prev,
          facts: data.memoryUpdate.facts || prev.facts,
          patterns: data.memoryUpdate.patterns || prev.patterns,
          preferences: { ...prev.preferences, ...(data.memoryUpdate.preferences || {}) },
          summary: data.memoryUpdate.summary || prev.summary,
          lastUpdated: new Date().toISOString(),
          conversationCount: (prev.conversationCount || 0) + 1,
        }))
      } else {
        setMemory(prev => ({ ...prev, conversationCount: (prev.conversationCount || 0) + 1 }))
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Estoy teniendo problemas para conectarme. Pero puedo decirte: lo que sientes es válido, y estoy aquí contigo. Respira profundo.' }])
    }
    setChatLoading(false)
  }

  const chatRef = { current: null }

  const aiAgentView = (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 240px)', maxHeight: 600 }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 12, background: C.card, borderRadius: 14, padding: 3, border: `1px solid ${C.border}` }}>
        {[{ id: 'chat', label: 'Habla conmigo' }, { id: 'create', label: 'Crea tu programa' }].map(m => (
          <button key={m.id} onClick={() => setChatMode(m.id)} style={{
            flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: chatMode === m.id ? C.teal : 'transparent',
            color: chatMode === m.id ? 'white' : C.muted,
            fontSize: 18, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s',
          }}>{m.label}</button>
        ))}
      </div>

      {/* ── CHAT MODE ── */}
      {chatMode === 'chat' && <>
        {/* Messages */}
        <div ref={el => { chatRef.current = el; if (el) el.scrollTop = el.scrollHeight }}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
          {chatMessages.map((msg, i) => (
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
                {/* Action buttons: Connect with professional / SOS */}
                {msg.connect && (
                  <button onClick={() => { setView('juntas'); setSubTab('directorio'); setDirFilter(msg.connect) }} style={{
                    marginTop: 10, padding: '10px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg, ${C.gold}, ${C.rose})`, color: 'white',
                    fontSize: 17, fontWeight: 700, fontFamily: 'inherit', width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                    </div>
                    Conectar con profesional
                  </button>
                )}
                {msg.sos && (
                  <button onClick={() => { setShowPanic(true); setPanicScreen('home') }} style={{
                    marginTop: 8, padding: '10px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    background: C.lavanda, color: 'white',
                    fontSize: 17, fontWeight: 700, fontFamily: 'inherit', width: '100%',
                  }}>Activar herramientas SOS</button>
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
          <button onClick={sendChatMessage} disabled={!chatInput.trim() || chatLoading} style={{
            width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: chatInput.trim() ? `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` : C.border,
            color: 'white', fontSize: 22, fontWeight: 700, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>↑</button>
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
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 14, border: `1.5px solid ${C.roseLight}`, fontSize: 19, fontFamily: 'inherit', background: C.cream, color: C.text, outline: 'none' }} />
                <button onClick={() => aiGoal.trim() && setAiStep(1)} disabled={!aiGoal.trim()} style={{
                  padding: '12px 18px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: aiGoal.trim() ? C.rose : C.border, color: 'white', fontSize: 19, fontWeight: 700,
                }}>→</button>
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
                style={{ padding: '12px 16px', borderRadius: 14, border: `1.5px solid ${C.roseLight}`, fontSize: 19, fontFamily: 'inherit', background: C.cream, color: C.text, outline: 'none', resize: 'none', lineHeight: 1.6 }} />
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
                <div style={{ fontSize: 19, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif' }}>{aiProgram.title}</div>
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
                  <div style={{ fontSize: 19, fontWeight: 700, color: C.teal }}>¡Programa guardado!</div>
                  <div style={{ fontSize: 18, color: C.muted, marginTop: 4 }}>Ve a Programas para empezarlo.</div>
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
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, fontFamily: 'Georgia, serif', border: '2px solid rgba(255,255,255,0.5)' }}>
          {(profile.name || 'R').charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif' }}>{profile.name || 'Tu nombre'}</div>
        {profile.city && <div style={{ fontSize: 20, opacity: 0.8, marginTop: 4 }}>{profile.city}</div>}
        {profile.bio && <div style={{ fontSize: 20, opacity: 0.85, marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>"{profile.bio}"</div>}
        <button onClick={() => setEditingProfile(!editingProfile)} style={{
          marginTop: 14, padding: '8px 20px', borderRadius: 20, border: '2px solid rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 19, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {editingProfile ? 'Cerrar edición' : 'Editar perfil'}
        </button>
      </div>

      {/* Edit form */}
      {editingProfile && (
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
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

          <div style={{ fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Nombre</div>
          <input value={profile.name} onChange={e => updateProfile('name', e.target.value)} placeholder="¿Cómo te llamas?"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
          />

          <div style={{ fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Ciudad</div>
          <input value={profile.city} onChange={e => updateProfile('city', e.target.value)} placeholder="¿De dónde eres?"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
          />

          <div style={{ fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Bio</div>
          <textarea value={profile.bio} onChange={e => updateProfile('bio', e.target.value)} placeholder="Cuéntanos sobre ti en una frase..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 12, outline: 'none', boxSizing: 'border-box', minHeight: 60, resize: 'vertical', lineHeight: 1.5 }}
          />

          <div style={{ fontSize: 19, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Mi intención</div>
          <textarea value={profile.intention} onChange={e => updateProfile('intention', e.target.value)} placeholder="¿Cuál es tu intención para este año?"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 19, fontFamily: 'inherit', marginBottom: 8, outline: 'none', boxSizing: 'border-box', minHeight: 60, resize: 'vertical', lineHeight: 1.5 }}
          />

          <button onClick={() => setEditingProfile(false)} style={{
            width: '100%', padding: 12, borderRadius: 12, border: 'none',
            background: C.teal, color: 'white',
            fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
          }}>
            Guardar ✨
          </button>
        </div>
      )}

      {/* Intention card */}
      {profile.intention && !editingProfile && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderLeft: `4px solid ${C.gold}` }}>
          <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.gold, marginBottom: 6 }}>Mi intención</div>
          <div style={{ fontSize: 19, color: C.text, lineHeight: 1.6 }}>{profile.intention}</div>
        </div>
      )}

      {/* Membership — Yo soy Ronda */}
      <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: `1px solid ${C.goldLight}` }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Yo soy Ronda</div>
        <div style={{ fontSize: 18, color: C.muted, marginBottom: 14 }}>
          {isPremium ? 'Tienes acceso completo a Ronda' : 'Plan actual: Freemium'}
        </div>

        {!isPremium && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name: 'Ronda Plus', price: '$9.99/mes', features: 'Tu Ronda (IA), programas 21 días, 5 respuestas profesionales/mes', color: C.teal },
              { name: 'Ronda Pro', price: '$29.99/mes', features: 'Todo Plus + programas 60 días, respuestas ilimitadas, video calls, Círculos Privados', color: C.gold },
            ].map((plan, i) => (
              <div key={i} style={{ background: C.cream, borderRadius: 14, padding: 14, border: `2px solid ${plan.color}30` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: plan.color }}>{plan.name}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{plan.price}</div>
                </div>
                <div style={{ fontSize: 16, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>{plan.features}</div>
                <button onClick={() => alert(`Próximamente: pago para ${plan.name}. Te avisaremos cuando esté listo.`)} style={{
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
            <div style={{ fontSize: 16, color: C.muted, marginTop: 4 }}>Tu Ronda, programas premium, Talent Pot y más.</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mis estadísticas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Días activa', value: profileStats.daysActive, color: C.teal },
            { label: 'Hábitos cumplidos', value: profileStats.totalHabitsEver, color: C.coral },
            { label: 'Entradas diario', value: profileStats.totalEntries, color: C.lavanda },
            { label: 'Frases favoritas', value: profileStats.favQuotesCount, color: C.gold },
            { label: 'Recursos guardados', value: profileStats.toolkitCount, color: C.mint },
            { label: 'Hoy', value: `${totalDone}/${totalHabits}`, color: C.rose },
          ].map((stat, i) => (
            <div key={i} style={{ background: C.cream, borderRadius: 14, padding: 16, textAlign: 'center', border: `1px solid ${C.border}` }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${stat.color}15`, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: stat.color }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 19, fontWeight: 600, color: C.muted, marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dimensions breakdown */}
      <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
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
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Georgia, serif' }}>
                Lo que sé de ti
              </div>
            </div>
            <button onClick={() => {
              if (confirm('¿Borrar lo que Ronda ha aprendido de ti? Esta acción no se puede deshacer.')) {
                setMemory({ facts: [], patterns: [], preferences: {}, summary: '', lastUpdated: null, conversationCount: 0 })
              }
            }} style={{
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
            {memory.conversationCount > 0 ? `${memory.conversationCount} conversaciones hasta hoy` : ''}
          </div>
        </div>
      )}

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
      <div style={{ width: 70, height: 70, borderRadius: '50%', border: '3px solid '+C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.gold }} />
      </div>
      <div style={{ fontSize: 36, fontWeight: 400, color: C.text, letterSpacing: '0.15em', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>Ronda</div>
      <div style={{ fontSize: 20, color: C.gold, fontWeight: 600, fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 32 }}>
        Creces tú, crecemos todas
      </div>
      <div style={{ width: 60, height: 2, background: C.gold, marginBottom: 32, borderRadius: 2 }} />
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.4, marginBottom: 12 }}>
        Tu compañera en cada etapa
      </div>
      <div style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, maxWidth: 300 }}>
        Bienestar, comunidad y profesionales verificadas — contigo en cada momento.
      </div>
    </div>,

    /* Slide 1 — Las 3 experiencias */
    <div key={1} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        3 experiencias, 1 compañera
      </div>
      <div style={{ fontSize: 16, color: C.muted, marginBottom: 24, maxWidth: 300 }}>
        Herramientas que funcionan, programas con estructura, comunidad que impulsa
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 340 }}>
        {[
          { title: 'Ahora', desc: 'Tu día, tus hábitos, tu rutina, diario y toolkit. Lo que necesitas hoy.', color: C.gold },
          { title: 'Crecer', desc: 'Programas de 7 y 21 días con neurociencia + IA que crea el tuyo.', color: C.teal },
          { title: 'Juntas', desc: 'Comunidad anónima 24/7 + profesionales verificadas del Talent Pot.', color: C.coral },
        ].map((tab, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: C.card, borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', textAlign: 'left', borderLeft: '3px solid '+tab.color }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: tab.color+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: tab.color }} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{tab.title}</div>
              <div style={{ fontSize: 14, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{tab.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>,

    /* Slide 2 — Comunidad + SOS */
    <div key={2} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        Siempre contigo.
      </div>
      <div style={{ fontSize: 16, color: C.muted, marginBottom: 28, maxWidth: 300 }}>
        Una comunidad real que camina contigo
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 320 }}>
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'left', display: 'flex', gap: 14, alignItems: 'center', borderLeft: '3px solid '+C.coral }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.coral+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: C.coral }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.coral }}>Botón SOS</div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Respiración guiada, grounding y herramientas DBT al instante.</div>
          </div>
        </div>
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'left', display: 'flex', gap: 14, alignItems: 'center', borderLeft: '3px solid '+C.teal }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.teal+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: C.teal }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.teal }}>Comunidad 24/7</div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Publica anónima. Solo profesionales verificadas responden.</div>
          </div>
        </div>
        <div style={{ background: C.card, borderRadius: 16, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'left', display: 'flex', gap: 14, alignItems: 'center', borderLeft: '3px solid '+C.gold }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.gold+'20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: C.gold }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.gold }}>Directorio Ronda</div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Profesionales y negocios de mujeres verificadas cerca de ti.</div>
          </div>
        </div>
      </div>
    </div>,

    /* Slide 3 — Tu Ronda + Talent Pot */
    <div key={3} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${C.teal}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.teal }} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        Tu Ronda — tu guía personal
      </div>
      <div style={{ fontSize: 16, color: C.muted, marginBottom: 24, maxWidth: 300, lineHeight: 1.6 }}>
        Una IA que te escucha, te orienta y te conecta con profesionales reales cuando lo necesitas
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 320 }}>
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'left', borderLeft: '3px solid '+C.teal }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.teal }}>Chat con Tu Ronda</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Escríbele como a una amiga. Te escucha, te valida y te guía.</div>
        </div>
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'left', borderLeft: '3px solid '+C.gold }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.gold }}>Talent Pot</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Profesionales verificadas: psicólogas, coaches, nutricionistas y más. La IA te conecta con la indicada.</div>
        </div>
        <div style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'left', borderLeft: '3px solid '+C.rose }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.rose }}>Programas con IA</div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Dile qué quieres lograr y te crea un programa personalizado paso a paso.</div>
        </div>
      </div>
    </div>,

    /* Slide 4 — Programas */
    <div key={4} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        Programas con neurociencia
      </div>
      <div style={{ fontSize: 16, color: C.muted, marginBottom: 20, maxWidth: 300 }}>
        Paso a paso, a tu ritmo. Desde el primer paso hasta tu mejor versión.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', maxWidth: 340, marginBottom: 16 }}>
        {[
          { title: 'Recuperar mi energía', color: C.teal },
          { title: 'Encontrar mi calma', color: C.gold },
          { title: 'Volver a moverme', color: C.mint },
          { title: 'Reconectar con Dios', color: C.lavanda },
          { title: '7 días de disciplina', color: C.coral },
          { title: 'Enamórate de ti', color: C.rose },
        ].map((p, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 12, padding: '10px 12px', textAlign: 'center', borderTop: '3px solid '+p.color, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: p.color }}>{p.title}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>7 días Freemium</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.coral, fontWeight: 700, marginTop: 4 }}>Ronda+ $9.99/mes · Programas de 21 días, IA y más</div>
    </div>,

    /* Slide 5 — Tu día con Ronda */
    <div key={5} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: 32 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 8 }}>
        Tu día con Ronda
      </div>
      <div style={{ fontSize: 16, color: C.muted, marginBottom: 24, maxWidth: 300 }}>
        Te acompañamos de la mañana a la noche
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 320 }}>
        {[
          { time: '7 AM', title: 'Intención del día', desc: 'Define tu meta y activa hábitos.', color: C.gold },
          { time: 'Tu día', title: 'Rutina + hábitos + Tu Ronda', desc: 'Sigue tu rutina. Habla con la IA.', color: C.teal },
          { time: 'SOS', title: 'Comunidad + profesionales', desc: 'Pregunta, toca SOS, o conecta con el Talent Pot.', color: C.coral },
          { time: '9 PM', title: 'Reflexión de noche', desc: 'Escribe, planifica, suelta.', color: C.lavanda },
        ].map((item, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center', borderLeft: '3px solid '+item.color }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: item.color+'15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: item.color, textAlign: 'center' }}>{item.time}</div>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{item.title}</div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={finishOnboarding} style={{
        padding: '14px 40px', borderRadius: 30, width: '100%', maxWidth: 340, marginTop: 24,
        background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
        color: 'white', fontSize: 18, fontWeight: 800, border: 'none',
        cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em',
        boxShadow: '0 4px 16px rgba(27,138,122,0.35)',
      }}>
        Comenzar mi Ronda
      </button>
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
          width: 50, height: 50, borderRadius: '50%', border: '3px solid #C6A94E',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#C6A94E' }} />
        </div>
        <div style={{ fontSize: 20, color: C.muted, fontWeight: 600 }}>Cargando...</div>
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
          {onboardStep < onboardSlides.length - 1 && (
            <div style={{ display: 'flex', gap: 16 }}>
              {onboardStep > 0 && (
                <button onClick={() => setOnboardStep(onboardStep - 1)} style={{
                  padding: '12px 28px', borderRadius: 25, border: `2px solid ${C.roseLight}`,
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
                boxShadow: '0 4px 12px rgba(27,138,122,0.3)',
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
      <div style={{ ...modalCard, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 8, color: C.gold }}>●</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3 }}>
            {profile.name ? `${profile.name}, buenos días` : 'Buenos días'}
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
          boxShadow: '0 6px 20px rgba(201,169,110,0.35)', letterSpacing: '0.02em', marginBottom: 16,
        }}>
          Comenzar mi Ronda
        </button>

        {/* Habits — below CTA, scrollable */}
        <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Mis hábitos de hoy
        </div>
        {habits.length === 0 ? (
          <button onClick={() => { completeMorningCheckin(); setView('ahora'); setSubTab('habitos') }} style={{
            width: '100%', padding: '14px', borderRadius: 14, border: `1.5px dashed ${C.roseLight}`,
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
                <div key={h.id} onClick={() => toggleHabit(h.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  background: checked[h.id] ? `${C.green}12` : C.cream, borderRadius: 10,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: checked[h.id] ? `1px solid ${C.green}40` : `1px solid ${C.border}`,
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked[h.id] ? C.green : dim.color}`,
                    background: checked[h.id] ? C.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 18, fontWeight: 700, flexShrink: 0,
                  }}>
                    {checked[h.id] && '✓'}
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 600, color: checked[h.id] ? C.subtle : C.text, flex: 1,
                    textDecoration: checked[h.id] ? 'line-through' : 'none' }}>
                    {h.name}
                  </span>
                </div>
              )
            })}
            {habits.length > 6 && (
              <div style={{ fontSize: 17, color: C.teal, fontWeight: 600, textAlign: 'center', padding: 4, cursor: 'pointer' }}
                onClick={() => { completeMorningCheckin(); setView('ahora'); setSubTab('habitos') }}>
                Ver todos mis hábitos ({habits.length}) →
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  /* ── Night Modal ── */
  const nightModal = showNightCheckin && (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 10, color: '#C4B5FD' }}>●</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.3 }}>
            {profile.name ? `${profile.name}, ¿cómo te fue hoy?` : '¿Cómo te fue hoy?'}
          </div>
          <div style={{ fontSize: 20, color: C.muted, marginTop: 6 }}>Revisa tu día y cierra con una reflexión</div>
        </div>

        {/* Summary */}
        <div style={{ background: C.cream, borderRadius: 16, padding: 18, marginBottom: 18 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.roseDark, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Resumen del día
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.rose }}>{totalDone}</div>
              <div style={{ fontSize: 20, color: C.muted, fontWeight: 600 }}>completados</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.subtle }}>{totalHabits - totalDone}</div>
              <div style={{ fontSize: 20, color: C.muted, fontWeight: 600 }}>pendientes</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.gold }}>{totalHabits > 0 ? Math.round((totalDone / totalHabits) * 100) : 0}%</div>
              <div style={{ fontSize: 20, color: C.muted, fontWeight: 600 }}>progreso</div>
            </div>
          </div>
          {/* Uncompleted habits */}
          {habits.filter(h => !checked[h.id]).length > 0 && (
            <div>
              <div style={{ fontSize: 20, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Puedes completar aún:</div>
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
                    <span style={{ fontSize: 19, color: C.text, fontWeight: 600 }}>{ICONS[DIMS[h.dim].icon](DIMS[h.dim].color, 14)} {h.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mood */}
        <div style={{ fontSize: 20, fontWeight: 700, color: C.roseDark, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, textAlign: 'center' }}>
          ¿Cómo te sientes?
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, justifyContent: 'center' }}>
          {MOOD_ICONS.map((icon, i) => (
            <button key={i} onClick={() => setNightMood(i)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'all 0.15s', transform: nightMood === i ? 'scale(1.2)' : 'scale(1)', padding: 4,
            }}>
              {icon(36, nightMood === i)}
              <div style={{ fontSize: 19, fontWeight: 700, color: MOOD_COLORS[i], marginTop: 2 }}>{MOOD_LABELS[i]}</div>
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
          boxShadow: '0 6px 20px rgba(166,113,107,0.35)', letterSpacing: '0.02em',
        }}>
          Cerrar mi día
        </button>
      </div>
    </div>
  )

  /* ── Tu Ronda FAB (floating) ── */
  const rondaFab = !(view === 'crecer' && subTab === 'ai') && !showPanic && (
    <button
      onClick={() => { setView('crecer'); setSubTab('ai'); setChatMode('chat') }}
      style={{
        position: 'fixed', bottom: 90, left: 16, zIndex: 200,
        display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 8,
        background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
        border: 'none', cursor: 'pointer',
        padding: isMobile ? 12 : '10px 16px 10px 12px',
        borderRadius: isMobile ? '50%' : 28,
        width: isMobile ? 56 : 'auto',
        height: isMobile ? 56 : 'auto',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(27,138,122,0.4)',
      }}
      aria-label="Habla con Tu Ronda — tu guía de bienestar"
    >
      <div style={{
        width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <div style={{ width: isMobile ? 9 : 10, height: isMobile ? 9 : 10, borderRadius: '50%', background: 'white' }} />
      </div>
      {!isMobile && (
        <span style={{ fontSize: 19, fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>Tu Ronda</span>
      )}
    </button>
  )

  /* ── Panic Button (floating) ── */
  const panicFab = !showPanic && (
    <button
      onClick={() => { setShowPanic(true); setPanicScreen('home'); setGroundStep(0); setBreatheActive(false); setBreatheCount(0) }}
      style={{
        position: 'fixed', bottom: 90, right: 16, zIndex: 200,
        display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 10,
        background: C.lavanda,
        border: 'none', cursor: 'pointer',
        padding: isMobile ? 12 : '10px 16px 10px 14px',
        borderRadius: isMobile ? '50%' : 28,
        width: isMobile ? 56 : 'auto',
        height: isMobile ? 56 : 'auto',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(184,169,201,0.5)',
        animation: 'pulse-gentle 3s ease-in-out infinite',
      }}
      aria-label="Botón de emergencia — Respiración, grounding y herramientas DBT"
    >
      <div style={{
        width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: '50%',
        background: 'rgba(255,255,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        border: '2px solid rgba(255,255,255,0.4)',
      }}>
        <svg width={isMobile ? "18" : "16"} height={isMobile ? "18" : "16"} viewBox="0 0 24 24" fill="none">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="white"/>
        </svg>
      </div>
      {!isMobile && (
        <span style={{ fontSize: 20, fontWeight: 700, color: 'white', letterSpacing: '0.02em' }}>¿Necesitas apoyo?</span>
      )}
    </button>
  )

  /* ── Panic Modal — Full Crisis Support ── */
  const GROUND_STEPS = [
    { sense: '👀 VER', prompt: 'Nombra 5 cosas que puedes VER ahora mismo', count: 5, color: '#14B5A3' },
    { sense: '✋ TOCAR', prompt: 'Nombra 4 cosas que puedes TOCAR', count: 4, color: '#C6A94E' },
    { sense: '👂 ESCUCHAR', prompt: 'Nombra 3 cosas que puedes ESCUCHAR', count: 3, color: '#E8B4B8' },
    { sense: '👃 OLER', prompt: 'Nombra 2 cosas que puedes OLER', count: 2, color: '#0D9488' },
    { sense: '👅 SABOREAR', prompt: 'Nombra 1 cosa que puedes SABOREAR', count: 1, color: '#0D9488' },
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
        ? (breathePhase === 'inhale' ? 'linear-gradient(180deg, #0B7A71, #0D9488)'
          : breathePhase === 'hold' ? 'linear-gradient(180deg, #0D9488, #0B7A71)'
          : 'linear-gradient(180deg, #1A202C, #2D3748)')
        : 'linear-gradient(180deg, #0B7A71 0%, #0D4A42 100%)',
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
          <span style={{ color: 'white', fontSize: 20, lineHeight: 1 }}>←</span>
        </button>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, maxWidth: 440, margin: '0 auto', width: '100%' }}>

        {/* ── HOME: Main crisis menu ── */}
        {panicScreen === 'home' && <>
          <div style={{ fontSize: 56, marginBottom: 16 }}></div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: 'Georgia, serif', lineHeight: 1.3, marginBottom: 8 }}>
            Estás a salvo.
          </div>
          <div style={{ fontSize: 20, color: '#E0FBF1', textAlign: 'center', marginBottom: 8 }}>
            Respira. Este momento va a pasar.
          </div>
          <div style={{ fontSize: 19, color: '#E8B4B8', textAlign: 'center', marginBottom: 32 }}>
            Escoge lo que necesitas ahora mismo:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            {[
              { id: 'breathe', icon: '', title: 'Respiración 4-7-8', sub: 'Calma tu sistema nervioso en 2 minutos', color: '#14B5A3' },
              { id: 'ground', icon: '🌍', title: 'Grounding 5-4-3-2-1', sub: 'Vuelve al presente con tus sentidos', color: '#C6A94E' },
              { id: 'dbt', icon: '', title: 'Skills DBT', sub: 'TIPP · STOP · Acción Opuesta · Aceptación Radical', color: '#E8B4B8' },
              { id: 'accept', icon: '🙏', title: 'Aceptación Radical', sub: 'Soltar la lucha. Abrazar lo que es.', color: '#0D9488' },
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
                  <div style={{ fontSize: 20, color: '#E0FBF1', marginTop: 2 }}>{opt.sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Go to community */}
          <button onClick={() => { setShowPanic(false); setView('juntas') }} style={{
            marginTop: 24, width: '100%', padding: '14px 18px',
            background: 'rgba(201,169,110,0.2)', borderRadius: 16,
            border: '1px solid rgba(201,169,110,0.4)', cursor: 'pointer', textAlign: 'center',
          }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#C6A94E' }}>💬 Ir a la Comunidad</div>
            <div style={{ fontSize: 20, color: '#E0FBF1', marginTop: 4 }}>Pregunta lo que necesites. Guías Ronda verificadas te acompañan.</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontStyle: 'italic' }}>Contenido educativo. No reemplaza atención en crisis.</div>
          </button>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 20, color: '#E8B4B8', marginBottom: 8 }}>Si sientes que tu vida está en riesgo:</div>
            <a href="tel:106" style={{
              display: 'inline-block', padding: '10px 24px', borderRadius: 20,
              background: '#0D9488', color: 'white', fontWeight: 700, fontSize: 20,
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
              ? 'radial-gradient(circle, rgba(27,138,122,0.6), rgba(27,138,122,0.1))'
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

          <div style={{ fontSize: 20, color: '#E0FBF1', textAlign: 'center', marginBottom: 8 }}>
            {breathePhase === 'inhale' ? '4 segundos — llena tu pecho de aire' :
             breathePhase === 'hold' ? '7 segundos — el aire te sostiene' :
             '8 segundos — suelta todo, deja ir'}
          </div>
          <div style={{ fontSize: 19, color: '#E8B4B8', marginBottom: 24 }}>
            Ciclo {Math.min(breatheCount + 1, 5)} de 5
          </div>

          {!breatheActive && breatheCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>Lo hiciste.</div>
              <div style={{ fontSize: 20, color: '#E0FBF1', marginBottom: 20 }}>Tu sistema nervioso se está calmando. Quédate aquí un momento.</div>
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
            <div style={{ fontSize: 22, fontWeight: 700, color: 'white', textAlign: 'center', fontFamily: 'Georgia, serif', lineHeight: 1.4, marginBottom: 24 }}>
              {GROUND_STEPS[groundStep].prompt}
            </div>
            <div style={{ fontSize: 20, color: '#E0FBF1', marginBottom: 32, textAlign: 'center' }}>
              Tómate tu tiempo. No hay prisa.
            </div>
            <button onClick={() => setGroundStep(groundStep + 1)} style={{
              padding: '14px 36px', borderRadius: 20,
              background: GROUND_STEPS[groundStep].color, color: 'white',
              fontSize: 20, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Listo → {groundStep < 4 ? 'Siguiente sentido' : 'Terminar'}
            </button>
          </>) : (<>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🌟</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: 'Georgia, serif', marginBottom: 12 }}>
              Estás aquí. Estás presente.
            </div>
            <div style={{ fontSize: 19, color: '#E0FBF1', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
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
          <div style={{ fontSize: 20, fontWeight: 800, color: 'white', textAlign: 'center', fontFamily: 'Georgia, serif', marginBottom: 6 }}>
            Skills DBT
          </div>
          <div style={{ fontSize: 19, color: '#E0FBF1', textAlign: 'center', marginBottom: 24 }}>
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
                    <div style={{ fontSize: 19, color: '#E0FBF1', marginTop: 2 }}>{skill.desc}</div>
                  </div>
                  <span style={{ color: '#E8B4B8', fontSize: 18 }}>{panicDbtExpanded === idx ? '▲' : '▼'}</span>
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
                        <div style={{ fontSize: 20, color: '#E0FBF1', lineHeight: 1.5 }}>{step}</div>
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
          <div style={{ fontSize: 20, color: '#E0FBF1', textAlign: 'center', marginBottom: 32, lineHeight: 1.6 }}>
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
                background: 'linear-gradient(135deg, #E8B4B8, #C6A94E)',
                color: 'white', fontSize: 19, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{step.num}</div>
              <div style={{ fontSize: 20, color: '#E0FBF1', lineHeight: 1.6 }}>{step.text}</div>
            </div>
          ))}

          <div style={{
            marginTop: 16, padding: 18, borderRadius: 16,
            background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.3)',
            textAlign: 'center', width: '100%',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#C6A94E', fontFamily: 'Georgia, serif', fontStyle: 'italic', lineHeight: 1.5 }}>
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
      <div style={{ padding: isMobile ? 16 : 24, paddingBottom: 120 }}>
        {view === 'ahora' && <>
          {!subTab && inicioView}
          <SubTabs
            tabs={[
              { id: 'habitos', label: 'Hábitos' },
              { id: 'rutina', label: 'Rutina' },
              { id: 'diario', label: 'Diario' },
              { id: 'toolkit', label: 'Toolkit' },
            ]}
            active={subTab || ''}
            onChange={(t) => setSubTab(subTab === t ? '' : t)}
          />
          {subTab === 'habitos' && habitosView}
          {subTab === 'rutina' && rutinaView}
          {subTab === 'diario' && diarioView}
          {subTab === 'toolkit' && toolkitView}
        </>}

        {view === 'crecer' && <>
          <SubTabs
            tabs={[
              { id: 'programas', label: 'Programas' },
              { id: 'ai', label: 'Tu Ronda IA' },
            ]}
            active={subTab || 'programas'}
            onChange={(t) => { setSubTab(t); if (t === 'ai') resetAiAgent() }}
          />
          {(subTab || 'programas') === 'programas' && programasView}
          {subTab === 'ai' && (isPremium ? aiAgentView : <Paywall feature="Crea tu programa con IA" price="$9.99/mes" desc="Dile a nuestra IA qué quieres lograr y te arma un programa personalizado, paso a paso, a tu ritmo." />)}
        </>}

        {view === 'juntas' && <>
          <SubTabs
            tabs={[
              { id: 'board', label: 'Comunidad' },
              { id: 'directorio', label: 'Talent Pot' },
            ]}
            active={subTab || 'board'}
            onChange={setSubTab}
          />
          {(subTab || 'board') === 'board' && boardView}
          {subTab === 'directorio' && directorioView}
        </>}

        {view === 'perfil' && perfilView}
      </div>
      {/* Global disclaimer */}
      <div style={{ padding: '8px 16px 80px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: C.subtle, lineHeight: 1.4, fontStyle: 'italic' }}>
          Ronda ofrece herramientas de bienestar y contenido educativo. No reemplaza atención médica o psicológica profesional. Si estás en crisis, llama a la Línea 106.
        </div>
      </div>
      {rondaFab}
      {panicFab}
      {panicModal}
      {bottomNav}
      {morningModal}
      {nightModal}
    </div>
  )
}

export default App
