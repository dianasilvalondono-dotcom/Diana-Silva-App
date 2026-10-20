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

/* ── Habits ── */
export async function saveHabits(userId, habits) {
  if (!supabase) return null
  try {
    // Delete existing and re-insert
    await supabase.from('habits').delete().eq('user_id', userId)
    const rows = habits.map(h => ({ id: h.id.toString(), user_id: userId, name: h.name, dim: h.dim }))
    if (rows.length > 0) {
      const { error } = await supabase.from('habits').insert(rows)
      if (error) throw error
    }
    return true
  } catch (e) { console.error('saveHabits:', e); return null }
}

export async function getHabits(userId) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('habits').select('*').eq('user_id', userId)
    if (error) throw error
    return data?.map(h => ({ id: h.id, name: h.name, dim: h.dim })) || []
  } catch (e) { console.error('getHabits:', e); return null }
}

/* ── Daily Checks ── */
export async function saveChecked(userId, date, checked) {
  if (!supabase) return null
  try {
    const { error } = await supabase
      .from('habit_checks')
      .upsert({ user_id: userId, date, checked_data: checked, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' })
    if (error) throw error
    return true
  } catch (e) { console.error('saveChecked:', e); return null }
}

export async function getChecked(userId, date) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('habit_checks').select('checked_data').eq('user_id', userId).eq('date', date).single()
    if (error && error.code !== 'PGRST116') throw error
    return data?.checked_data || {}
  } catch (e) { console.error('getChecked:', e); return null }
}

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

/* ── Programs ── */
export async function saveActivePrograms(userId, programs) {
  if (!supabase) return null
  try {
    await supabase.from('active_programs').delete().eq('user_id', userId)
    const rows = Object.entries(programs).map(([progId, data]) => ({
      user_id: userId, program_id: progId, start_date: data.startDate, completed_days: data.completedDays || [],
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('active_programs').insert(rows)
      if (error) throw error
    }
    return true
  } catch (e) { console.error('saveActivePrograms:', e); return null }
}

export async function getActivePrograms(userId) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('active_programs').select('*').eq('user_id', userId)
    if (error) throw error
    const programs = {}
    data?.forEach(p => { programs[p.program_id] = { startDate: p.start_date, completedDays: p.completed_days || [] } })
    return programs
  } catch (e) { console.error('getActivePrograms:', e); return null }
}

/* ── Fav Quotes ── */
export async function saveFavQuotes(userId, favs) {
  if (!supabase) return null
  try {
    await supabase.from('fav_quotes').delete().eq('user_id', userId)
    const rows = favs.map(idx => ({ user_id: userId, quote_index: idx }))
    if (rows.length > 0) {
      const { error } = await supabase.from('fav_quotes').insert(rows)
      if (error) throw error
    }
    return true
  } catch (e) { console.error('saveFavQuotes:', e); return null }
}

export async function getFavQuotes(userId) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('fav_quotes').select('quote_index').eq('user_id', userId)
    if (error) throw error
    return data?.map(d => d.quote_index) || []
  } catch (e) { console.error('getFavQuotes:', e); return null }
}

/* ── Streaks ── */
export async function saveStreaks(userId, streaks) {
  if (!supabase) return null
  try {
    const { error } = await supabase
      .from('streaks')
      .upsert({ user_id: userId, streak_data: streaks, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
    return true
  } catch (e) { console.error('saveStreaks:', e); return null }
}

export async function getStreaks(userId) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('streaks').select('streak_data').eq('user_id', userId).single()
    if (error && error.code !== 'PGRST116') throw error
    return data?.streak_data || {}
  } catch (e) { console.error('getStreaks:', e); return null }
}

/* ── Sync localStorage → Supabase (migración inicial, una vez por usuaria) ──
   La marca es por usuaria y por sección ('ronda-migrated-<id>'): una sección
   queda hecha solo si su guardado salió bien, así lo que falló se reintenta
   en el siguiente inicio de sesión. Quien ya migró con la marca vieja
   ('ronda-migrated', del dispositivo) no vuelve a subir nada.
   El toolkit no va aquí: se sincroniza siempre desde App (se trae de la nube
   y se une con lo local antes de guardar).
   El diario ('diana-journal') tampoco: no sale del teléfono (ver arriba).
   Quien tenía pendiente solo el diario queda con la migración terminada. */
const SECCIONES_MIGRACION = ['profile', 'habits', 'favs', 'streaks', 'programs']

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

    if (!hecho.habits) {
      const habits = load('diana-habits', null)
      if (!Array.isArray(habits) || await saveHabits(userId, habits)) marcar('habits')
    }

    if (!hecho.favs) {
      const favs = load('diana-fav-quotes', [])
      if (!Array.isArray(favs) || !favs.length || await saveFavQuotes(userId, favs)) marcar('favs')
    }

    if (!hecho.streaks) {
      const streaks = load('diana-streaks', {})
      if (!streaks || !Object.keys(streaks).length || await saveStreaks(userId, streaks)) marcar('streaks')
    }

    // Programas: la app los guarda en 'ronda-programs' ('diana-programs' es la clave vieja).
    if (!hecho.programs) {
      const programs = load('ronda-programs', null) ?? load('diana-programs', {})
      if (!programs || !Object.keys(programs).length || await saveActivePrograms(userId, programs)) marcar('programs')
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
