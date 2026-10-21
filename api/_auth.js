/* Quién llama. Los endpoints de IA y voz gastan créditos pagos (Claude y
   ElevenLabs): solo responden a una usuaria con sesión de Supabase. La app
   manda el token de su sesión como "Authorization: Bearer <token>" (ver
   apiHeaders en src/lib/supabase.js).
   Además, como en la app, son de Ronda+ (exigirRondaPlus) y solo para quien
   autorizó «Usar la IA de Ronda» (exigirAutorizacionIA). Y con un tope de
   mensajes al día por persona, contado en Supabase (exigirTopeIA).
   El guion bajo del nombre hace que Vercel no lo publique como endpoint. */
import { esAdmin, rondaPlusVigente } from '../src/utils/plan.js'
import { AYUDA_TEXT } from '../src/utils/crisis.js'
// La misma versión de los textos que usa la app (src/lib/autorizaciones.js).
import { VERSION_POLITICA } from '../src/utils/autorizacionVersion.js'

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

// Su fila de profiles: el plan, la autorización de cuenta y la de la IA (con
// la versión del texto que aceptó). Se lee con el token de ella (RLS: solo ve la suya) y
// una sola vez por petición. Si las columnas de autorización aún no existen
// (src/sql/consentimiento.sql sin aplicar), se lee solo el plan y la IA queda
// sin autorizar. null si no se pudo leer.
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
    const fila = await pedir('is_premium,premium_until,autorizacion_cuenta,autorizacion_ia,autorizacion_version')
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
// no está. Y solo si lo dijo con los textos vigentes (autorizacion_version):
// cuando cambie la versión, el «sí» de la anterior deja de valer hasta que
// vuelva a responder. Además exige la autorización de cuenta: sin ella (por
// ejemplo, tras «Rechazar la autorización» → «Cerrar sesión» en otro
// teléfono) la IA también queda cerrada, aunque el «sí» a la IA siga ahí.
// Sin respuesta, o si no se pudo leer, es no. También para la
// administradora: es una autorización de datos, no un plan.
export async function iaAutorizada(req, user) {
  const perfil = await perfilDe(req, user)
  return perfil?.autorizacion_cuenta === true && perfil.autorizacion_ia === true && perfil.autorizacion_version === VERSION_POLITICA
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

// ── El tope diario de la IA (src/sql/tope-ia-y-cuentas-nuevas.sql) ──

// Suma 1 al uso de hoy en Supabase (public.usar_ia), con el token de ella,
// así solo gasta su propio cupo. { permitido, motivo, usados, tope } o null si
// no se pudo contar (sin Supabase, error, red caída o más de 5 s).
// Solo viaja el nombre de la función ('chat', 'comunidad' o 'programa'):
// nunca lo que escribió.
async function usarIA(req, funcion) {
  const url = supabaseUrl()
  const anonKey = supabaseAnonKey()
  if (!url || !anonKey) return null
  const control = new AbortController()
  const corte = setTimeout(() => control.abort(), 5000)
  try {
    const resp = await fetch(`${url}/rest/v1/rpc/usar_ia`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${tokenDe(req)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_funcion: funcion }),
      signal: control.signal,
    })
    if (!resp.ok) { console.error('api/_auth: usar_ia respondió', resp.status); return null }
    const r = await resp.json()
    return r && typeof r.permitido === 'boolean' ? r : null
  } catch (err) {
    console.error('api/_auth: usar_ia falló', err?.name)
    return null
  } finally {
    clearTimeout(corte)
  }
}

// La IA de Ronda en pausa: el tope en 0 o Anthropic no respondió bien (también
// el 400 del límite de gasto de la consola, que puede durar hasta el mes
// siguiente). Sin el texto de Anthropic (hallazgo H16) y con la salida a
// Ayuda y a las líneas. La app muestra el texto de pausa (src/utils/limitesIA.js).
export function responderPausaIA(res) {
  return res.status(503).json({ error: 'ia_en_pausa', tope: true, motivo: 'pausa', ayuda: AYUDA_TEXT })
}

// El tope diario de la IA. Va después de la revisión de crisis, de Ronda+, de
// la autorización de la IA y de los límites de largo y de tamaño total, y
// justo antes de llamar a Anthropic: una crisis nunca gasta cupo ni recibe
// este aviso. Como en los 403, sin respuesta del modelo no hay segunda capa
// que vea una crisis dicha de otra forma: toda respuesta lleva la salida a
// Ayuda y a las líneas (ayuda).
//   · 429 motivo 'tope': ya usó los mensajes de hoy (limite: el tope de hoy).
//   · 503 motivo 'pausa': el tope está en 0.
//   · 503 motivo 'conteo': no se pudo contar. Falla cerrado: sin contar no se
//     llama a Anthropic, y no gasta cupo.
// Devuelve true si puede seguir.
export async function exigirTopeIA(req, res, funcion) {
  const r = await usarIA(req, funcion)
  if (r?.permitido === true) return true
  if (r?.motivo === 'tope') {
    res.status(429).json({
      error: 'tope_ia', tope: true, motivo: 'tope',
      limite: Number.isInteger(r.tope) && r.tope > 0 ? r.tope : null,
      ayuda: AYUDA_TEXT,
    })
    return false
  }
  if (r?.motivo === 'pausa') { responderPausaIA(res); return false }
  res.status(503).json({ error: 'conteo_ia', tope: true, motivo: 'conteo', ayuda: AYUDA_TEXT })
  return false
}
