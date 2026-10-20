/* ── Autorizaciones de datos (Ley 1581 de 2012 y Decreto 1377 de 2013) ──
   Textos: ronda-hq/06-legal-y-datos/textos-autorizacion-v1.md. Política:
   public/privacidad.html. Si cambian las palabras de una casilla, cambia su
   versión (VERSION) y se vuelve a preguntar.

   Tres autorizaciones:
     · edad   → «Tengo 18 años o más.» (obligatoria)
     · cuenta → datos de cuenta y de uso, no sensibles (obligatoria)
     · ia     → «Usar la IA de Ronda»: lo que le escribe a la IA (datos
                sensibles). Opcional: sin ella no se abren Tu Ronda, la Guía
                IA de la Comunidad ni Crea tu programa, y todo lo demás sigue.
   El diario, los check-ins, el ánimo y la memoria de Tu Ronda se quedan
   solo en el teléfono para todas (no se suben: ver syncFromLocal).

   Dónde queda la prueba:
     · en el teléfono, 'ronda-autorizaciones' (de la usuaria: se aparta si
       entra otra cuenta, ver asegurarDuenaLocal);
     · en Supabase, una fila por respuesta en `autorizaciones` (solo se
       agregan, nunca se editan) y el estado actual en las columnas
       autorizacion_* de profiles (src/sql/consentimiento.sql). La fecha que
       vale es la del servidor. Lo que no se pudo subir queda en `pendientes`
       y se reintenta cada vez que abre la app.
   Nunca se guarda contenido, ánimo ni IP: solo qué respondió, a qué versión
   del texto y dónde. */
import { supabase } from './supabase'
import { load, save } from '../utils/helpers'

export const AUTORIZACIONES_KEY = 'ronda-autorizaciones'
export const VERSION = 'v1'
export const VERSION_POLITICA = `politica-${VERSION}`
const versionDe = (tipo) => `${tipo}-${VERSION}`

// Se reemplaza por el buzón real antes de publicar (Decreto 1377, art. 13).
export const CORREO_DATOS = '{{CORREO_DATOS}}'
export const URL_POLITICA = '/privacidad.html'
export const URL_AVISO = '/privacidad.html#aviso'

// Dónde respondió: al crear la cuenta, en el aviso único a las ya
// inscritas, al tocar una función de IA o desde Perfil.
export const CANALES = ['registro', 'aviso-unico', 'al-usar', 'perfil']

// Qué despliegue vio (Vercel lo expone a Vite con el prefijo VITE_).
const VERSION_APP = (import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || '').slice(0, 12) || null

/* Id de cada fila: así reintentar una subida no la duplica. */
function nuevoId() {
  try {
    if (crypto.randomUUID) return crypto.randomUUID()
    const b = crypto.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40
    b[8] = (b[8] & 0x3f) | 0x80
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  } catch {
    return null
  }
}

const vigente = (dato, tipo) => !!dato && typeof dato === 'object' && dato.version === versionDe(tipo)

/* ── Lectura ── */
export function leerAutorizaciones() {
  const a = load(AUTORIZACIONES_KEY, null)
  return a && typeof a === 'object' ? a : null
}

export function guardarAutorizaciones(a) {
  if (a && typeof a === 'object') save(AUTORIZACIONES_KEY, a)
}

// ¿Dio las dos obligatorias (edad y cuenta) con los textos vigentes?
export const cuentaAutorizada = (a) =>
  vigente(a?.edad, 'edad') && a.edad.valor === true && vigente(a?.cuenta, 'cuenta') && a.cuenta.valor === true

// ¿Autorizó la IA con el texto vigente? Mientras no responda, es no.
export const iaAutorizada = (a) => vigente(a?.ia, 'ia') && a.ia.valor === true

// ¿Ya respondió a la de la IA (sí o no)?
export const iaRespondida = (a) => vigente(a?.ia, 'ia') && typeof a.ia.valor === 'boolean'

/* Registra respuestas: { edad: true, cuenta: true, ia: false }. Devuelve el
   registro nuevo (no muta el anterior) con una fila pendiente de subir por
   cada respuesta. `en` es la hora de este teléfono, solo para mostrarla en
   Perfil; la que vale como prueba la pone el servidor. */
export function registrar(previo, respuestas, canal) {
  const ahora = new Date().toISOString()
  const siguiente = { ...(previo || {}), politica: VERSION_POLITICA }
  const pendientes = Array.isArray(previo?.pendientes) ? [...previo.pendientes] : []
  for (const [tipo, valor] of Object.entries(respuestas)) {
    if (typeof valor !== 'boolean') continue
    siguiente[tipo] = { valor, version: versionDe(tipo), canal, en: ahora }
    pendientes.push({ id: nuevoId(), tipo, valor, version_texto: versionDe(tipo), canal })
  }
  siguiente.pendientes = pendientes
  return siguiente
}

/* ── Registro: lo que marcó al crear la cuenta ──
   Al crear la cuenta todavía no hay id (y a veces hay que confirmar el
   correo antes de entrar, quizá desde otro teléfono): lo que marcó viaja en
   los metadatos de la cuenta y se adopta al entrar por primera vez. */
export function autorizacionesParaRegistro() {
  return {
    autorizaciones: {
      edad: versionDe('edad'),
      cuenta: versionDe('cuenta'),
      politica: VERSION_POLITICA,
      fecha: new Date().toISOString(),
    },
  }
}

function desdeRegistro(metadatos) {
  const r = metadatos?.autorizaciones
  if (!r || r.edad !== versionDe('edad') || r.cuenta !== versionDe('cuenta')) return null
  return r
}

/* ── Nube: el estado guardado en profiles (otro teléfono) ── */
const COLUMNAS_NUBE = 'autorizacion_version, autorizacion_edad, autorizacion_cuenta, autorizacion_cuenta_en, autorizacion_ia, autorizacion_ia_en, autorizacion_canal'

// null si no hay Supabase, si no responde a tiempo o si las columnas aún no
// existen (el SQL no se ha aplicado): entonces manda lo de este teléfono.
export async function leerAutorizacionesNube(userId) {
  if (!supabase || !userId) return null
  try {
    const consulta = supabase.from('profiles').select(COLUMNAS_NUBE).eq('id', userId).maybeSingle()
    const corte = new Promise(resolve => setTimeout(() => resolve({ data: null, error: 'tiempo' }), 6000))
    const { data, error } = await Promise.race([consulta, corte])
    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

/* Completa lo que falta en este teléfono con lo de la nube o, si no hay, con
   lo que marcó al crear la cuenta. Nunca pisa una respuesta de aquí. Lo que
   viene de la nube ya está guardado allá: no suma filas. Lo del registro sí
   (es la primera vez que hay un id para guardarlo). */
export function adoptar(previo, { nube, metadatos }) {
  if (cuentaAutorizada(previo)) {
    if (iaRespondida(previo) || nube?.autorizacion_version !== VERSION_POLITICA || typeof nube?.autorizacion_ia !== 'boolean') return previo
    return { ...previo, ia: { valor: nube.autorizacion_ia, version: versionDe('ia'), canal: nube.autorizacion_canal || null, en: nube.autorizacion_ia_en || null } }
  }
  if (nube?.autorizacion_version === VERSION_POLITICA && nube.autorizacion_edad === true && nube.autorizacion_cuenta === true) {
    const canal = nube.autorizacion_canal || null
    const en = nube.autorizacion_cuenta_en || null
    const siguiente = {
      ...(previo || {}),
      politica: VERSION_POLITICA,
      edad: { valor: true, version: versionDe('edad'), canal, en },
      cuenta: { valor: true, version: versionDe('cuenta'), canal, en },
    }
    if (typeof nube.autorizacion_ia === 'boolean') {
      siguiente.ia = { valor: nube.autorizacion_ia, version: versionDe('ia'), canal, en: nube.autorizacion_ia_en || null }
    }
    return siguiente
  }
  const reg = desdeRegistro(metadatos)
  if (reg) {
    const siguiente = registrar(previo, { edad: true, cuenta: true }, 'registro')
    if (typeof reg.fecha === 'string') {
      siguiente.edad = { ...siguiente.edad, en: reg.fecha }
      siguiente.cuenta = { ...siguiente.cuenta, en: reg.fecha }
    }
    return siguiente
  }
  return previo
}

/* ── Subida ──
   Primero las filas (la prueba) y después el estado actual en profiles.
   Devuelve los ids de las filas que quedaron en la nube ([] si algo falló:
   se reintenta la próxima vez, y por el id no se duplican). */
export async function subirAutorizaciones(userId, a) {
  const pendientes = Array.isArray(a?.pendientes) ? a.pendientes.filter(f => f?.id) : []
  if (!supabase || !userId || !pendientes.length) return []
  try {
    const filas = pendientes.map(f => ({
      id: f.id, user_id: userId, tipo: f.tipo, valor: f.valor,
      version_texto: f.version_texto, canal: f.canal, version_app: VERSION_APP,
    }))
    const { error } = await supabase.from('autorizaciones').upsert(filas, { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw error

    const estado = {
      autorizacion_version: a.politica || VERSION_POLITICA,
      autorizacion_canal: pendientes[pendientes.length - 1].canal,
    }
    if (vigente(a.edad, 'edad')) estado.autorizacion_edad = a.edad.valor
    if (vigente(a.cuenta, 'cuenta')) estado.autorizacion_cuenta = a.cuenta.valor
    if (vigente(a.ia, 'ia')) estado.autorizacion_ia = a.ia.valor
    const { error: errorPerfil } = await supabase.from('profiles').update(estado).eq('id', userId)
    if (errorPerfil) throw errorPerfil
    return pendientes.map(f => f.id)
  } catch (e) {
    console.error('subirAutorizaciones:', e)
    return []
  }
}

export function quitarPendientes(a, ids) {
  if (!a || !Array.isArray(a.pendientes) || !ids?.length) return a
  const subidas = new Set(ids)
  return { ...a, pendientes: a.pendientes.filter(f => !subidas.has(f.id)) }
}

/* «Autorizada el 20 de octubre de 2026» */
export function fechaAutorizacion(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return d.toISOString().slice(0, 10)
  }
}
