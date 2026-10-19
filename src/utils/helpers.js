const pad2 = (n) => String(n).padStart(2, '0')

/* Clave del día (AAAA-MM-DD) con la fecha LOCAL de la usuaria, no la UTC:
   con toISOString() el día cambiaba a las 7 p. m. en Colombia (UTC-5).
   Lo marcado entre las 7 p. m. y la medianoche antes de este cambio quedó
   guardado con la fecha del día siguiente; no se migra (es a lo sumo una
   noche corrida un día). */
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/* Clave local de hoy desplazada `offset` días: dateKey(-1) es ayer, dateKey(1) mañana. */
export const dateKey = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return todayKey(d)
}

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

const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export function formatDate() {
  const d = new Date()
  return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

/* Etiqueta legible de una clave de día: 'Hoy', 'Ayer' o 'Lunes 12 de octubre'
   (con el año si no es el actual). Si la clave no es una fecha, la devuelve igual. */
export function formatDayKey(key) {
  if (key === todayKey()) return 'Hoy'
  if (key === dateKey(-1)) return 'Ayer'
  const d = new Date(`${key}T12:00:00`)
  if (Number.isNaN(d.getTime())) return key
  const anio = d.getFullYear() !== new Date().getFullYear() ? ` de ${d.getFullYear()}` : ''
  return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}${anio}`
}

export const MOOD_LABELS = ['Difícil', 'Meh', 'Bien', 'Genial', 'Increíble']
export const MOOD_COLORS = ['#592147', '#141833', '#726D2D', '#91946E', '#141833']
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
