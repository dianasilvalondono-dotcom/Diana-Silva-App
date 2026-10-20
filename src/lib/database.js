import { supabase } from './supabase'

/* ── Profile ── */
// Las columnas del perfil que escribe la app. Nunca las de premium.
export const CAMPOS_PERFIL = ['name', 'city', 'bio', 'intention', 'emoji']

// Guarda solo los campos de CAMPOS_PERFIL que vengan en `profile`.
// Devuelve true si se guardó y null si no (sin Supabase o con error).
export async function saveUserProfile(userId, profile) {
  if (!supabase || !userId || !profile) return null
  try {
    const campos = {}
    for (const k of CAMPOS_PERFIL) {
      if (typeof profile[k] === 'string') campos[k] = profile[k]
    }
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...campos, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (error) throw error
    return true
  } catch (e) { console.error('saveUserProfile:', e); return null }
}

export async function getUserProfile(userId) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) throw error
    return data
  } catch (e) { console.error('getUserProfile:', e); return null }
}

/* ── Hábitos, check-ins de hábitos, rutas, frases favoritas y racha ──
   Viven solo en el teléfono: nada en la app los vuelve a leer de la nube,
   así que tampoco se suben (Decreto 1377, art. 4: solo lo que se usa). La
   copia que subió la migración de antes se borra del servidor a los 30 días
   de publicar la política (src/sql/consentimiento.sql). `active_programs`
   guardaba rutas como 'depresion' o 'dios': datos de salud y de creencias. */

/* ── Diario ──
   El diario, los check-ins y el ánimo son datos sensibles y se quedan solo
   en el teléfono, para todas (textos-autorizacion-v1, condición P3): la app
   ya no los sube a journal_entries. La copia que subió la migración de antes
   se borra del servidor (lo hace Diana a los 30 días del aviso único). */

/* ── Toolkit ── */
export async function saveToolkitItems(userId, items) {
  if (!supabase) return null
  try {
    await supabase.from('toolkit_items').delete().eq('user_id', userId)
    const rows = items.map(t => ({
      user_id: userId, name: t.name, url: t.url || '', cat: t.cat, note: t.note || '', added: t.added,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('toolkit_items').insert(rows)
      if (error) throw error
    }
    return true
  } catch (e) { console.error('saveToolkitItems:', e); return null }
}

export async function getToolkitItems(userId) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('toolkit_items').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data?.map(t => ({ id: t.id, name: t.name, url: t.url, cat: t.cat, note: t.note, added: t.added })) || []
  } catch (e) { console.error('getToolkitItems:', e); return null }
}

/* ── Sync localStorage → Supabase (migración inicial, una vez por usuaria) ──
   La marca es por usuaria y por sección ('ronda-migrated-<id>'): una sección
   queda hecha solo si su guardado salió bien, así lo que falló se reintenta
   en el siguiente inicio de sesión. Quien ya migró con la marca vieja
   ('ronda-migrated', del dispositivo) no vuelve a subir nada.
   El toolkit no va aquí: se sincroniza siempre desde App (se trae de la nube
   y se une con lo local antes de guardar).
   Solo sube el perfil. El diario ('diana-journal'), los hábitos, las rutas,
   las frases favoritas y la racha no salen del teléfono (ver arriba). Quien
   tenía pendiente alguna de esas secciones queda con la migración terminada. */
const SECCIONES_MIGRACION = ['profile']

export async function syncFromLocal(userId) {
  if (!supabase || !userId) return false
  const load = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
  }
  if (load('ronda-migrated', false) === true) return false

  const KEY = `ronda-migrated-${userId}`
  const guardado = load(KEY, {})
  const hecho = guardado && typeof guardado === 'object' ? guardado : {}
  if (hecho.todo) return false
  const guardarMarca = () => {
    try { localStorage.setItem(KEY, JSON.stringify(hecho)) } catch { /* se reintenta la próxima vez */ }
  }
  const marcar = (seccion) => { hecho[seccion] = true; guardarMarca() }

  try {
    // Perfil: solo los campos con valor (un perfil vacío no pisa el de la nube).
    if (!hecho.profile) {
      const local = load('diana-profile', null) || {}
      const campos = {}
      for (const k of CAMPOS_PERFIL) {
        if (typeof local[k] === 'string' && local[k].trim()) campos[k] = local[k]
      }
      if (!Object.keys(campos).length || await saveUserProfile(userId, campos)) marcar('profile')
    }

    if (SECCIONES_MIGRACION.every(sec => hecho[sec])) {
      hecho.todo = true
      guardarMarca()
      return true
    }
    return false
  } catch (e) {
    console.error('syncFromLocal error:', e)
    return false
  }
}
