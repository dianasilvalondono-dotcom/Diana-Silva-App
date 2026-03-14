import { supabase } from './supabase'

export async function signInWithGoogle() {
  if (!supabase) return { error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  return { data, error }
}

export async function signInWithEmail(email, password) {
  if (!supabase) return { error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signUp(email, password, name) {
  if (!supabase) return { error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  return { data, error }
}

export async function signOut() {
  if (!supabase) return { error: 'Supabase not configured' }
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null)
  })
}
