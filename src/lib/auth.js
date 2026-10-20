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

// extra: más metadatos de la cuenta. Hoy, lo que marcó en las casillas del
// registro (autorizacionesParaRegistro, src/lib/autorizaciones.js): todavía
// no hay id para guardarlo en otra parte y se adopta al entrar.
export async function signUp(email, password, name, extra = {}) {
  if (!supabase) return { error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // El enlace del correo de confirmación vuelve a la app (bienvenida-11).
    options: { data: { ...extra, name }, emailRedirectTo: window.location.origin },
  })
  return { data, error }
}

/* "¿Olvidaste tu contraseña?": envía el correo con el enlace. Al abrirlo,
   la app recibe el evento PASSWORD_RECOVERY (useAuth) y pide la contraseña
   nueva (bienvenida-12). La URL debe estar en Auth > URL Configuration >
   Redirect URLs del panel de Supabase. */
export async function resetPassword(email) {
  if (!supabase) return { error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
  return { data, error }
}

export async function updatePassword(password) {
  if (!supabase) return { error: 'Supabase not configured' }
  const { data, error } = await supabase.auth.updateUser({ password })
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
