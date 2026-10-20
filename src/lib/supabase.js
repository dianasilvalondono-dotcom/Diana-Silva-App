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

// fetch a /api con el token de la sesión. Si el servidor responde 401 con
// una sesión que aquí todavía parece vigente (se cerró sesión en otro
// dispositivo, o el reloj del celular va atrasado y el token ya venció para
// el servidor), se renueva la sesión una vez y se reintenta. Si no se puede
// renovar, auth-js cierra la sesión de este dispositivo (SIGNED_OUT) y
// aparece el inicio de sesión, en vez de dejar la IA fallando hasta que
// venza el token.
export async function apiFetch(url, opciones = {}) {
  const pedir = async () => fetch(url, { ...opciones, headers: await apiHeaders() })
  const resp = await pedir()
  if (resp.status !== 401 || !supabase) return resp
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data?.session) return resp
  } catch {
    return resp
  }
  return pedir()
}
