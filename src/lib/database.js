import { supabase } from './supabase'

/* ── Profile ── */
export async function saveUserProfile(userId, profile) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...profile, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (error) throw error
    return data
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

/* ── Journal ── */
export async function saveJournalEntry(userId, entry) {
  if (!supabase) return null
  try {
    const { error } = await supabase.from('journal_entries').insert({
      user_id: userId,
      date: entry.date,
      text: entry.text,
      mood: entry.mood,
      time: entry.time,
      entry_type: entry.type || 'manual',
    })
    if (error) throw error
    return true
  } catch (e) { console.error('saveJournalEntry:', e); return null }
}

export async function getJournalEntries(userId) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data?.map(e => ({ id: e.id, date: e.date, text: e.text, mood: e.mood, time: e.time, type: e.entry_type })) || []
  } catch (e) { console.error('getJournalEntries:', e); return null }
}

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

/* ── Sync localStorage → Supabase (one-time migration) ── */
export async function syncFromLocal(userId) {
  if (!supabase) return false
  try {
    const load = (key, fallback) => {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
    }

    // Check if already migrated
    const migrated = load('ronda-migrated', false)
    if (migrated) return false

    // Migrate profile
    const profile = load('diana-profile', null)
    if (profile) await saveUserProfile(userId, profile)

    // Migrate habits
    const habits = load('diana-habits', null)
    if (habits) await saveHabits(userId, habits)

    // Migrate journal
    const entries = load('diana-journal', [])
    for (const entry of entries) {
      await saveJournalEntry(userId, entry)
    }

    // Migrate toolkit
    const toolkit = load('diana-toolkit', [])
    if (toolkit.length > 0) await saveToolkitItems(userId, toolkit)

    // Migrate fav quotes
    const favs = load('diana-fav-quotes', [])
    if (favs.length > 0) await saveFavQuotes(userId, favs)

    // Migrate streaks
    const streaks = load('diana-streaks', {})
    if (Object.keys(streaks).length > 0) await saveStreaks(userId, streaks)

    // Migrate active programs
    const programs = load('diana-programs', {})
    if (Object.keys(programs).length > 0) await saveActivePrograms(userId, programs)

    // Mark as migrated
    localStorage.setItem('ronda-migrated', JSON.stringify(true))
    console.log('✅ Data migrated from localStorage to Supabase')
    return true
  } catch (e) {
    console.error('syncFromLocal error:', e)
    return false
  }
}
