import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Encabezados para /api. Los endpoints de IA y voz solo responden a una
// usuaria con sesión (api/_auth.js), así que va el token de la sesión.
export async function apiHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (!supabase) return headers
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
  } catch {
    // Sin sesión legible: el servidor responde 401 y la pantalla muestra su error.
  }
  return headers
}
