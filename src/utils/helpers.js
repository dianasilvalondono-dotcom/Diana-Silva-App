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

/* Mientras los datos de este dispositivo cambian de dueña (otra cuenta
   inició sesión), nada de lo que quedó en memoria se vuelve a guardar: la
   app se recarga enseguida. Ver asegurarDuenaLocal. */
let guardadoBloqueado = false
export const bloquearGuardado = () => { guardadoBloqueado = true }
export const guardadoEstaBloqueado = () => guardadoBloqueado

/* Si el navegador no deja guardar (memoria llena o almacenamiento
   bloqueado), la app sigue funcionando con lo que tiene en memoria y avisa
   una sola vez: App escucha el evento 'ronda-storage-error' (salud-global-2). */
export const STORAGE_ERROR_EVENT = 'ronda-storage-error'
let avisoGuardadoDado = false
function avisarFalloGuardado(err) {
  if (avisoGuardadoDado) return
  avisoGuardadoDado = true
  console.error('No se pudo guardar en este dispositivo', err)
  try { window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT)) } catch { /* sin ventana */ }
}

/* Claves cuyo último guardado falló: así un aviso no dice "quedó guardada"
   cuando no se pudo guardar (ver seGuardo). */
const clavesSinGuardar = new Set()
/* ¿El último guardado de esta clave funcionó? */
export const seGuardo = (key) => !clavesSinGuardar.has(key)

/* Devuelve true si quedó guardado y false si no se pudo. */
export const save = (key, val) => {
  if (guardadoBloqueado) return false
  try {
    localStorage.setItem(key, JSON.stringify(val))
    clavesSinGuardar.delete(key)
    return true
  } catch (err) {
    clavesSinGuardar.add(key)
    avisarFalloGuardado(err)
    return false
  }
}

/* Las claves guardadas, o [] si el almacenamiento está bloqueado. */
export const safeKeys = () => {
  try { return Object.keys(localStorage) } catch { return [] }
}

/* ¿Un valor diario está vacío? ({} sin ningún true, [], false o null) */
const diaVacio = (val) => {
  if (val == null || val === false) return true
  if (Array.isArray(val)) return val.length === 0
  if (typeof val === 'object') return !Object.values(val).some(Boolean)
  return false
}

/* Guarda una clave diaria solo si tiene datos. Si está vacía la borra, para
   no dejar un registro vacío por cada día en que se abre la app. Las lecturas
   usan load(clave, vacío), así que la ausencia de la clave no cambia nada. */
export const saveDay = (key, val) => {
  if (guardadoBloqueado) return
  try {
    if (diaVacio(val)) localStorage.removeItem(key)
    else save(key, val)
  } catch { /* sin almacenamiento: no se guarda */ }
}

/* Horas de la rutina ('H:MM' o 'HH:MM', 24 h). */
const HORA_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/
/* Minutos desde la medianoche. Las horas que no se pueden leer (texto libre
   viejo como '9:45 pm') dan Infinity, así quedan al final al ordenar. */
export const horaAMinutos = (t) => {
  const m = HORA_RE.exec(String(t ?? '').trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : Infinity
}
export const horaValida = (t) => Number.isFinite(horaAMinutos(t))
/* 'H:MM' → 'HH:MM', el formato del selector de hora. Si no es válida, ''. */
export const horaHHMM = (t) => {
  const min = horaAMinutos(t)
  return Number.isFinite(min) ? `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}` : ''
}
/* Copia de la lista ordenada por hora (no por texto: '7:30' va antes que
   '10:00'). Las horas inválidas quedan al final, en el orden que tenían. */
export const ordenarPorHora = (lista) => [...lista].sort((a, b) => {
  const ma = horaAMinutos(a.time), mb = horaAMinutos(b.time)
  if (ma === mb) return 0
  return ma < mb ? -1 : 1
})

/* Historial de hábitos guardado: { 'AAAA-MM-DD': { [id]: true } } a partir de
   las claves diana-checked-<día>. Las claves dañadas se saltan. */
export function leerHistorialHabitos() {
  const historial = {}
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('diana-checked-')) continue
      try {
        const data = JSON.parse(localStorage.getItem(key))
        if (data && typeof data === 'object') historial[key.slice('diana-checked-'.length)] = data
      } catch { /* clave dañada: se salta */ }
    }
  } catch { /* sin almacenamiento */ }
  return historial
}

/* Cuántos hábitos tenía cada día ({ 'AAAA-MM-DD': n }), para que un día
   completo de antes no cambie porque hoy se agreguen o borren hábitos
   (habitos-5). El de hoy se va guardando con guardarTotalDia. Los días de
   antes de este cambio no tienen total: se fija una vez con lo que se veía
   (el mayor entre lo marcado ese día y los hábitos de hoy) y desde ahí no
   se mueve. */
const TOTALES_DIA_KEY = 'diana-habitos-por-dia'
export function totalesHabitosPorDia(historial, hoy, habitosHoy) {
  const guardados = load(TOTALES_DIA_KEY, {})
  const totales = guardados && typeof guardados === 'object' && !Array.isArray(guardados) ? { ...guardados } : {}
  let cambio = false
  for (const [dia, marcas] of Object.entries(historial || {})) {
    if (dia >= hoy || Number.isFinite(totales[dia])) continue
    const hechos = Object.values(marcas || {}).filter(Boolean).length
    if (!hechos) continue
    totales[dia] = Math.max(hechos, habitosHoy)
    cambio = true
  }
  if (cambio) save(TOTALES_DIA_KEY, totales)
  return totales
}
export function guardarTotalDia(dia, n) {
  const guardados = load(TOTALES_DIA_KEY, {})
  const totales = guardados && typeof guardados === 'object' && !Array.isArray(guardados) ? guardados : {}
  if (totales[dia] === n) return
  save(TOTALES_DIA_KEY, { ...totales, [dia]: n })
}

/* Racha de un hábito: días seguidos con el hábito marcado que terminan en
   `hoy`, o en ayer si hoy todavía no está marcado. Sale del historial, así
   que sube como mucho 1 por día, baja si se desmarca y se rompe sola si pasa
   un día sin cumplirlo. */
export function rachaHabito(historial, id, hoy) {
  const anterior = (key) => {
    const d = new Date(`${key}T12:00:00`)
    d.setDate(d.getDate() - 1)
    return todayKey(d)
  }
  let dia = historial[hoy]?.[id] ? hoy : anterior(hoy)
  let racha = 0
  while (historial[dia]?.[id]) { racha++; dia = anterior(dia) }
  return racha
}

const DAILY_PREFIXES = ['diana-checked-', 'diana-routine-', 'ronda-morning-', 'ronda-night-', 'ronda-tomorrow-']

/* Limpieza (una vez por dispositivo): borra las claves diarias VACÍAS que
   dejaron versiones anteriores. Nunca toca días con datos: el calendario y
   las rachas leen ese historial. */
export function limpiarDiasVacios() {
  const FLAG = 'ronda-migration-dias-vacios-v1'
  try {
    if (localStorage.getItem(FLAG) === 'done') return
    for (const key of Object.keys(localStorage)) {
      const prefijo = DAILY_PREFIXES.find(p => key.startsWith(p))
      if (!prefijo || !/^\d{4}-\d{2}-\d{2}$/.test(key.slice(prefijo.length))) continue
      let val
      try { val = JSON.parse(localStorage.getItem(key)) } catch { continue }
      if (diaVacio(val)) localStorage.removeItem(key)
    }
    localStorage.setItem(FLAG, 'done')
  } catch { /* sin almacenamiento */ }
}

/* La única tabla de franjas del día de la app (puerta, saludos, 'Pausa de la…'
   y check-ins). Para cambiar los cortes basta con tocar aquí.
   mañana: 5:00-11:59 · tarde: 12:00-18:59 · noche: 19:00-4:59 (la madrugada
   cuenta como noche). */
export function franjaDelDia(h = new Date().getHours()) {
  if (h >= 5 && h < 12) return 'mañana'
  if (h >= 12 && h < 19) return 'tarde'
  return 'noche'
}

export function getGreeting(h = new Date().getHours()) {
  const franja = franjaDelDia(h)
  if (franja === 'mañana') return 'Buenos días'
  if (franja === 'tarde') return 'Buenas tardes'
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

/* Hora relativa de una marca de tiempo (ms): 'Ahora', 'Hace 5 min',
   'Hace 2 horas', 'Hace 3 días'. */
export function formatRelative(ts, ahora = Date.now()) {
  const min = Math.floor((ahora - ts) / 60000)
  if (!Number.isFinite(min)) return ''
  if (min < 1) return 'Ahora'
  if (min < 60) return `Hace ${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`
  const dias = Math.floor(horas / 24)
  return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`
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
  // Corre al importar App.jsx: si el almacenamiento está bloqueado, no hace
  // nada en vez de impedir que la app arranque (salud-global-2).
  try {
    return migrarDefaultsDeDiana()
  } catch {
    return false
  }
}

function migrarDefaultsDeDiana() {
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

/* ── Datos locales y cuenta (perfil-1) ──
   Lo de la usuaria vive en este dispositivo con claves 'diana-*', 'ronda-*'
   y 'ronda_*' que no llevan su id. 'ronda-owner' guarda de qué cuenta son.
   Si inicia sesión otra cuenta, lo de la anterior se aparta (no se borra:
   queda en 'ronda-apartado:<id>:<clave>') y, si la que entra tenía datos
   apartados en este dispositivo, se recuperan. Así nunca se mezclan ni se
   ven los datos de otra cuenta.
   Qué hacer con los datos al cerrar sesión (borrarlos del teléfono o no)
   está pendiente de decisión de producto. */
const OWNER_KEY = 'ronda-owner'
const APARTADO = 'ronda-apartado:'
// Del dispositivo, no de la usuaria: se quedan donde están.
const CLAVES_DEL_DISPOSITIVO = ['ronda_puerta', 'ronda-current-day', OWNER_KEY]
const esDeLaUsuaria = (k) =>
  (k.startsWith('diana-') || k.startsWith('ronda-') || k.startsWith('ronda_')) &&
  !CLAVES_DEL_DISPOSITIVO.includes(k) &&
  !k.startsWith('ronda-migration-') && // migraciones del dispositivo
  !k.startsWith('ronda-migrated-') &&  // marcas de sincronización: ya llevan el id
  !k.startsWith(APARTADO)

/* Mueve claves de a una (copia y borra), así no hace falta espacio para
   todo a la vez. Si una no cabe, deshace lo movido y devuelve false. */
function moverClaves(pares) {
  const hechos = []
  try {
    for (const [desde, hacia] of pares) {
      const v = localStorage.getItem(desde)
      if (v === null) continue
      localStorage.setItem(hacia, v)
      localStorage.removeItem(desde)
      hechos.push([desde, hacia])
    }
    return true
  } catch {
    for (const [desde, hacia] of hechos.reverse()) {
      try {
        localStorage.setItem(desde, localStorage.getItem(hacia))
        localStorage.removeItem(hacia)
      } catch { /* queda apartada; se recupera cuando vuelva a entrar */ }
    }
    return false
  }
}

/* ¿Los datos de este dispositivo son de esta cuenta?
   'ok'          → sí (o no eran de nadie: desde ahora son suyos).
   'recargar'    → eran de otra cuenta: se apartaron, se recuperaron los de
                   esta (si había) y hay que recargar la app ya.
   'sin-espacio' → eran de otra cuenta y no hubo espacio para apartarlos:
                   siguen intactos y esta sesión no debe ver nada. */
export function asegurarDuenaLocal(userId) {
  let duena
  try { duena = load(OWNER_KEY, null) } catch { return 'ok' }
  if (!userId || duena === userId) return 'ok'
  try {
    if (!duena) {
      localStorage.setItem(OWNER_KEY, JSON.stringify(userId))
      return 'ok'
    }
    const deLaAnterior = Object.keys(localStorage).filter(esDeLaUsuaria)
    if (!moverClaves(deLaAnterior.map(k => [k, `${APARTADO}${duena}:${k}`]))) return 'sin-espacio'
    // Desde aquí, lo que la app tiene en memoria es de la otra cuenta.
    bloquearGuardado()
    const prefijo = `${APARTADO}${userId}:`
    const suyas = Object.keys(localStorage).filter(k => k.startsWith(prefijo))
    moverClaves(suyas.map(k => [k, k.slice(prefijo.length)]))
    localStorage.setItem(OWNER_KEY, JSON.stringify(userId))
    return 'recargar'
  } catch {
    return 'sin-espacio'
  }
}

/* La dueña de los datos de este dispositivo (id de la cuenta), o null. */
export const duenaLocal = () => load(OWNER_KEY, null)
