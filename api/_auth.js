/* Quién llama. Los endpoints de IA y voz gastan créditos pagos (Claude y
   ElevenLabs): solo responden a una usuaria con sesión de Supabase. La app
   manda el token de su sesión como "Authorization: Bearer <token>" (ver
   apiHeaders en src/lib/supabase.js).
   Además, como en la app, son de Ronda+ (exigirRondaPlus).
   El guion bajo del nombre hace que Vercel no lo publique como endpoint. */
import { esAdmin, rondaPlusVigente } from '../src/utils/plan.js'
import { AYUDA_TEXT } from '../src/utils/crisis.js'

const tokenDe = (req) => {
  const auth = req.headers?.authorization || ''
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
}
const supabaseUrl = () => (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const supabaseAnonKey = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

// Pregunta a Supabase de quién es el token. null si no hay token, si no es
// válido o si el servidor no tiene configurado Supabase.
export async function usuariaDeLaSesion(req) {
  const token = tokenDe(req)
  if (!token) return null

  const url = supabaseUrl()
  const anonKey = supabaseAnonKey()
  if (!url || !anonKey) {
    console.error('api/_auth: falta SUPABASE_URL o SUPABASE_ANON_KEY; no se puede verificar la sesión')
    return null
  }

  try {
    const resp = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) return null
    const user = await resp.json()
    return user?.id ? user : null
  } catch {
    return null
  }
}

// Corta la petición con 401 si no hay una usuaria con sesión. Devuelve la
// usuaria, o null cuando ya respondió.
export async function exigirSesion(req, res) {
  const user = await usuariaDeLaSesion(req)
  if (!user) {
    res.status(401).json({ error: 'Inicia sesión para usar esta función.' })
    return null
  }
  return user
}

// ¿Tiene Ronda+? La misma regla de la app (src/utils/plan.js): la
// administradora, o profiles.is_premium con premium_until vigente. El perfil
// se lee con el token de ella (RLS: solo ve el suyo).
export async function tieneRondaPlus(req, user) {
  if (esAdmin(user?.email)) return true
  const url = supabaseUrl()
  const anonKey = supabaseAnonKey()
  if (!user?.id || !url || !anonKey) return false
  try {
    const resp = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=is_premium,premium_until`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${tokenDe(req)}` },
    })
    if (!resp.ok) return false
    const filas = await resp.json()
    return Array.isArray(filas) && rondaPlusVigente(filas[0])
  } catch {
    return false
  }
}

// El paywall de la app, aplicado aquí: sin Ronda+ corta con 403. Devuelve
// true si puede seguir. Va después del chequeo de crisis: una crisis nunca
// recibe un error. Y como sin Ronda+ no hay segunda capa (el modelo) que vea
// una crisis que el chequeo no reconoció, el 403 lleva la salida a Ayuda y a
// las líneas (ayuda).
export async function exigirRondaPlus(req, res, user) {
  if (await tieneRondaPlus(req, user)) return true
  res.status(403).json({ error: 'Esta función es parte de Ronda+.', ayuda: AYUDA_TEXT })
  return false
}
