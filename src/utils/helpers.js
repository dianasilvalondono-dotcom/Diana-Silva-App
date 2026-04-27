export const todayKey = () => new Date().toISOString().slice(0, 10)

export const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}

export const save = (key, val) => localStorage.setItem(key, JSON.stringify(val))

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export function formatDate() {
  const d = new Date()
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`
}

export const MOOD_LABELS = ['Difícil', 'Meh', 'Bien', 'Genial', 'Increíble']
export const MOOD_COLORS = ['#F4845F', '#C4B5FD', '#C6A94E', '#A7F3D0', '#0D9488']
export const MOODS = ['😢','😐','🙂','😊','🤩'] // kept for backward compat with saved data

/**
 * Migración: limpia los hábitos/rutinas personales de Diana que se cargaban
 * por error como defaults para todas las usuarias. Respeta lo que la usuaria
 * haya agregado por su cuenta. Corre solo 1 vez por dispositivo.
 */
export function runMigrationCleanDianaDefaults() {
  const FLAG = 'ronda-migration-clean-diana-v1'
  if (localStorage.getItem(FLAG) === 'done') return false

  const DIANA_HABIT_NAMES = [
    'Oración y gratitud — evangelio y meditaciones',
    'Meditación mañana',
    'Meditación de noche',
    'Lectura noche',
    'Respira y Pausa Activa',
    'Respira Profundo — Estoy a salvo',
    'Journaling / Reflexión del día',
    'Gym',
    'Caldo + Paseo',
    'Proteína + Creatina',
    'Ajedrez',
    'Momento Mori — Take nothing personally',
  ]

  const DIANA_ROUTINE_TASKS = [
    'Intención del día',
    'Paseo o movimiento suave',
    'Meditación o respiración',
    'Ejercicio',
    'Pausa activa — respira profundo',
    'Momento de gratitud',
    'Estiramiento o caminata corta',
    'Lectura',
    'Reflexión del día',
    'Soltar el día y descansar',
  ]

  // Limpiar hábitos
  try {
    const habits = JSON.parse(localStorage.getItem('diana-habits') || '[]')
    const cleaned = habits.filter(h => !DIANA_HABIT_NAMES.includes(h.name))
    localStorage.setItem('diana-habits', JSON.stringify(cleaned))
  } catch {}

  // Limpiar rutinas
  for (const key of ['diana-morning', 'diana-midday', 'diana-night']) {
    try {
      const items = JSON.parse(localStorage.getItem(key) || '[]')
      const cleaned = items.filter(i => !DIANA_ROUTINE_TASKS.includes(i.task))
      localStorage.setItem(key, JSON.stringify(cleaned))
    } catch {}
  }

  localStorage.setItem(FLAG, 'done')
  return true
}
