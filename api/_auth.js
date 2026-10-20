/* Quién llama. Los endpoints de IA y voz gastan créditos pagos (Claude y
   ElevenLabs): solo responden a una usuaria con sesión de Supabase. La app
   manda el token de su sesión como "Authorization: Bearer <token>" (ver
   apiHeaders en src/lib/supabase.js).
   Además, como en la app, son de Ronda+ (exigirRondaPlus) y solo para quien
   autorizó «Usar la IA de Ronda» (exigirAutorizacionIA).
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

// Su fila de profiles: el plan y la autorización de la IA. Se lee con el
// token de ella (RLS: solo ve la suya) y una sola vez por petición. Si la
// columna autorizacion_ia aún no existe (src/sql/consentimiento.sql sin
// aplicar), se lee solo el plan y la IA queda sin autorizar. null si no se
// pudo leer.
const perfiles = new WeakMap()
async function leerPerfil(req, user) {
  const url = supabaseUrl()
  const anonKey = supabaseAnonKey()
  if (!user?.id || !url || !anonKey) return null
  const pedir = async (columnas) => {
    const resp = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=${columnas}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${tokenDe(req)}` },
    })
    if (!resp.ok) return undefined
    const filas = await resp.json()
    return Array.isArray(filas) ? (filas[0] || null) : undefined
  }
  try {
    const fila = await pedir('is_premium,premium_until,autorizacion_ia')
    if (fila !== undefined) return fila
    return (await pedir('is_premium,premium_until')) ?? null
  } catch {
    return null
  }
}
function perfilDe(req, user) {
  if (!perfiles.has(req)) perfiles.set(req, leerPerfil(req, user))
  return perfiles.get(req)
}

// ¿Tiene Ronda+? La misma regla de la app (src/utils/plan.js): la
// administradora, o profiles.is_premium con premium_until vigente.
export async function tieneRondaPlus(req, user) {
  if (esAdmin(user?.email)) return true
  return rondaPlusVigente(await perfilDe(req, user))
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

// ¿Autorizó «Usar la IA de Ronda»? (Ley 1581, art. 6: datos sensibles.) Vale
// el estado actual de profiles.autorizacion_ia, el mismo que la app lee y
// escribe (src/lib/autorizaciones.js): si la quitó en otro teléfono, aquí ya
// no está. Sin respuesta, o si no se pudo leer, es no. También para la
// administradora: es una autorización de datos, no un plan.
export async function iaAutorizada(req, user) {
  const perfil = await perfilDe(req, user)
  return perfil?.autorizacion_ia === true
}

// Sin la autorización de la IA corta con 403, antes de enviarle nada a
// Anthropic o a ElevenLabs. Como el de Ronda+, va después del chequeo de
// crisis (una crisis nunca recibe un error) y lleva la salida a Ayuda y a
// las líneas. `autorizacion: 'ia'` le dice a la app que vuelva a leer sus
// autorizaciones (la tarjeta de la IA aparece sola).
export async function exigirAutorizacionIA(req, res, user) {
  if (await iaAutorizada(req, user)) return true
  res.status(403).json({
    error: 'Para esto, la IA de Ronda tiene que leer lo que escribes. Puedes autorizarla en Perfil → Tus autorizaciones.',
    autorizacion: 'ia',
    ayuda: AYUDA_TEXT,
  })
  return false
}
