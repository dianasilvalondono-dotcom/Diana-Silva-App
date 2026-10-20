/* ── Autorizaciones de datos (Ley 1581 de 2012 y Decreto 1377 de 2013) ──
   Textos: ronda-hq/06-legal-y-datos/textos-autorizacion-v1.md. Política:
   public/privacidad.html. Si cambian las palabras de una casilla, cambia su
   versión (VERSION) y se vuelve a preguntar.

   Tres autorizaciones:
     · edad   → «Tengo 18 años o más.» (obligatoria)
     · cuenta → datos de cuenta y de uso, no sensibles (obligatoria). Si
                toca «No estoy de acuerdo» y cierra sesión, queda «no».
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
       vale como prueba es la del servidor; la del teléfono va aparte
       (respondido_en), solo para ordenar respuestas de varios teléfonos.
   Nunca se guarda contenido, ánimo ni IP: solo qué respondió, a qué versión
   del texto y dónde.

   Varios teléfonos (la misma cuenta): el estado de profiles es el que vale,
   y el servidor lo revisa antes de llamar a la IA (api/_auth.js).
     · Cada respuesta de aquí queda `pendiente` hasta escribirse en profiles.
       Lo que no se pudo subir se reintenta cada vez que abre la app.
     · `nube` guarda la hora (del servidor) del último estado de la nube que
       este teléfono ya conoce. Si al subir la nube cambió desde entonces,
       otro teléfono respondió: gana la respuesta más reciente.
     · Sin nada pendiente aquí, gana la nube: si la quitó en otro teléfono,
       aquí se quita al abrir la app (o al volver a ella).
     · profiles se escribe solo si nadie lo cambió entre leerlo y escribirlo
       (se compara la hora): un teléfono atrasado no deshace un retiro. */
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

const TIPOS = ['edad', 'cuenta', 'ia']
// Las que tienen hora del servidor en profiles (autorizacion_<tipo>_en).
const TIPOS_CON_FECHA = ['cuenta', 'ia']

// Qué despliegue vio (Vercel lo expone a Vite con el prefijo VITE_).
const VERSION_APP = (import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || '').slice(0, 12) || null

/* Id de cada fila: así reintentar una subida no la duplica. Siempre hay uno
   (sin crypto, uno al azar con Math.random: basta para no repetirse). */
function nuevoId() {
  let b
  try {
    if (crypto.randomUUID) return crypto.randomUUID()
    b = crypto.getRandomValues(new Uint8Array(16))
  } catch {
    b = Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))
  }
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const vigente = (dato, tipo) => !!dato && typeof dato === 'object' && dato.version === versionDe(tipo)
const respondida = (a, tipo) => vigente(a?.[tipo], tipo) && typeof a[tipo].valor === 'boolean'

// Horas: el servidor las da con microsegundos; se comparan en milisegundos.
const ms = (iso) => {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN
  return Number.isNaN(t) ? null : t
}
const mismoInstante = (a, b) => (a ?? null) === (b ?? null) || (ms(a) !== null && ms(a) === ms(b))

/* ── Lectura ──
   Una fila guardada sin id (de antes) recibe uno: si no, nunca se subiría
   ni se quitaría. */
export function leerAutorizaciones() {
  const a = load(AUTORIZACIONES_KEY, null)
  if (!a || typeof a !== 'object') return null
  if (Array.isArray(a.pendientes) && a.pendientes.some(f => !f?.id)) {
    return { ...a, pendientes: a.pendientes.filter(f => f && typeof f === 'object').map(f => (f.id ? f : { ...f, id: nuevoId() })) }
  }
  return a
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
export const iaRespondida = (a) => respondida(a, 'ia')

/* Registra respuestas: { edad: true, cuenta: true, ia: false }. Devuelve el
   registro nuevo (no muta el anterior): cada respuesta queda pendiente de
   escribirse en profiles y con una fila pendiente de subir. `en` es la hora
   de este teléfono; al escribirse en profiles se cambia por la del servidor. */
export function registrar(previo, respuestas, canal) {
  const ahora = new Date().toISOString()
  const siguiente = { ...(previo || {}), politica: VERSION_POLITICA }
  const pendientes = Array.isArray(previo?.pendientes) ? [...previo.pendientes] : []
  for (const [tipo, valor] of Object.entries(respuestas)) {
    if (typeof valor !== 'boolean' || !TIPOS.includes(tipo)) continue
    siguiente[tipo] = { valor, version: versionDe(tipo), canal, en: ahora, pendiente: true }
    pendientes.push({ id: nuevoId(), tipo, valor, version_texto: versionDe(tipo), canal, en: ahora })
  }
  // «Lo íntimo es tuyo» ya se respondió: lo que venía del registro se acaba.
  if (typeof respuestas.ia === 'boolean') delete siguiente.canalIntimo
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

/* ── Nube: el estado guardado en profiles ── */
const COLUMNAS_NUBE = 'autorizacion_version, autorizacion_edad, autorizacion_cuenta, autorizacion_cuenta_en, autorizacion_ia, autorizacion_ia_en, autorizacion_canal'

// Con tiempo límite: una consulta colgada no deja la app en "Cargando...".
const conLimite = (consulta, ms_) => Promise.race([
  consulta,
  new Promise(resolve => setTimeout(() => resolve({ data: null, error: 'tiempo' }), ms_)),
])

// null si no hay Supabase, si no responde a tiempo o si las columnas aún no
// existen (el SQL no se ha aplicado): entonces manda lo de este teléfono.
export async function leerAutorizacionesNube(userId) {
  if (!supabase || !userId) return null
  try {
    const { data, error } = await conLimite(supabase.from('profiles').select(COLUMNAS_NUBE).eq('id', userId).maybeSingle(), 6000)
    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

/* Une lo de este teléfono con la nube y, si nunca respondió, con lo que
   marcó al crear la cuenta. Devuelve `previo` tal cual si no cambia nada.
     · Una respuesta de aquí que aún no está en la nube (pendiente) no se
       toca: la subida decide (gana la más reciente).
     · Lo demás lo manda la nube: si allá cambió (otro teléfono), se adopta.
       Lo que viene de la nube ya está guardado allá: no suma filas.
     · Lo del registro sí suma filas (es la primera vez que hay un id para
       guardarlo). Nunca si ya respondió «no» a la de cuenta. */
export function adoptar(previo, { nube, metadatos }) {
  let siguiente = previo
  const cambiar = (cambios) => { siguiente = { ...(siguiente || {}), ...cambios } }

  if (nube && nube.autorizacion_version === VERSION_POLITICA) {
    for (const tipo of TIPOS_CON_FECHA) {
      const local = siguiente?.[tipo]
      if (local?.pendiente && vigente(local, tipo)) continue
      const valor = nube[`autorizacion_${tipo}`]
      const en = nube[`autorizacion_${tipo}_en`] ?? null
      if (!mismoInstante(siguiente?.nube?.[tipo], en)) cambiar({ nube: { ...(siguiente?.nube || {}), [tipo]: en } })
      if (typeof valor !== 'boolean') continue
      if (vigente(local, tipo) && local.valor === valor && mismoInstante(local.en, en)) continue
      const canal = nube.autorizacion_canal || null
      cambiar({ politica: VERSION_POLITICA, [tipo]: { valor, version: versionDe(tipo), canal, en } })
      if (tipo === 'cuenta' && valor === true && nube.autorizacion_edad === true && !(siguiente.edad?.pendiente && vigente(siguiente.edad, 'edad'))) {
        cambiar({ edad: { valor: true, version: versionDe('edad'), canal, en } })
      }
    }
  }

  if (!respondida(siguiente, 'cuenta') && typeof nube?.autorizacion_cuenta !== 'boolean') {
    const reg = desdeRegistro(metadatos)
    if (reg) {
      const conRegistro = registrar(siguiente, { edad: true, cuenta: true }, 'registro')
      if (typeof reg.fecha === 'string') {
        conRegistro.edad = { ...conRegistro.edad, en: reg.fecha }
        conRegistro.cuenta = { ...conRegistro.cuenta, en: reg.fecha }
      }
      // «Lo íntimo es tuyo», que sigue, es parte del registro.
      if (!respondida(conRegistro, 'ia')) conRegistro.canalIntimo = 'registro'
      siguiente = conRegistro
    }
  }
  return siguiente
}

// ¿Queda algo por subir (filas o respuestas que aún no están en profiles)?
export const hayQueSubir = (a) =>
  !!a && ((Array.isArray(a.pendientes) && a.pendientes.length > 0) || TIPOS.some(t => a[t]?.pendiente && vigente(a[t], t)))

/* ── Subida ──
   Primero las filas (la prueba) y después, en profiles, solo las respuestas
   pendientes. Devuelve qué pasó, para aplicarlo con trasSubir sobre el
   estado de ese momento (mientras subía pudo responder otra vez):
     { filas: ids ya en la nube (o descartados por inválidos),
       escritos / ganaNube: { tipo: true }, nube: la fila de profiles,
       completo: true si no quedó nada por subir } */
const esErrorDeDatos = (e) => typeof e?.code === 'string' && /^2[23]/.test(e.code) // 22xxx y 23xxx: nunca va a pasar

export async function subirAutorizaciones(userId, a) {
  const r = { filas: [], escritos: {}, ganaNube: {}, nube: null, completo: false }
  if (!supabase || !userId || !a) return r
  try {
    // 1. Filas. Si el lote falla, una por una: una fila que el servidor nunca
    // va a aceptar (rompe una regla del SQL) se descarta y no traba las demás.
    const pendientes = (Array.isArray(a.pendientes) ? a.pendientes : []).filter(f => f?.id)
    const aFila = (f) => ({
      id: f.id, user_id: userId, tipo: f.tipo, valor: f.valor, version_texto: f.version_texto,
      canal: f.canal, respondido_en: ms(f.en) !== null ? f.en : null, version_app: VERSION_APP,
    })
    if (pendientes.length) {
      const { error } = await supabase.from('autorizaciones').upsert(pendientes.map(aFila), { onConflict: 'id', ignoreDuplicates: true })
      if (!error) r.filas.push(...pendientes.map(f => f.id))
      else {
        for (const f of pendientes) {
          const { error: e } = await supabase.from('autorizaciones').upsert([aFila(f)], { onConflict: 'id', ignoreDuplicates: true })
          if (!e) r.filas.push(f.id)
          else if (esErrorDeDatos(e)) { console.error('subirAutorizaciones: fila descartada', f.tipo, e); r.filas.push(f.id) }
          else throw e
        }
      }
    }
    const filasListas = r.filas.length === pendientes.length

    // 2. profiles: solo los tipos pendientes.
    const tipos = TIPOS.filter(t => a[t]?.pendiente && vigente(a[t], t))
    if (!tipos.length) { r.completo = filasListas; return r }

    const { data: fila, error: errorLeer } = await conLimite(supabase.from('profiles').select(COLUMNAS_NUBE).eq('id', userId).maybeSingle(), 8000)
    if (errorLeer) throw errorLeer

    const estado = {}
    const filtros = []
    for (const t of tipos) {
      if (t === 'edad') { estado.autorizacion_edad = a.edad.valor; continue }
      const enNube = fila?.[`autorizacion_${t}_en`] ?? null
      const otroTelefono = fila && !mismoInstante(enNube, a.nube?.[t])
      if (otroTelefono && fila.autorizacion_version === VERSION_POLITICA && typeof fila[`autorizacion_${t}`] === 'boolean' &&
        (ms(enNube) ?? 0) > (ms(a[t].en) ?? 0)) {
        // Otro teléfono respondió después: gana la nube.
        r.ganaNube[t] = true
        continue
      }
      estado[`autorizacion_${t}`] = a[t].valor
      filtros.push([`autorizacion_${t}_en`, enNube])
    }
    if (!Object.keys(estado).length) {
      r.nube = fila
      r.completo = filasListas
      return r
    }
    const ultima = tipos.filter(t => estado[`autorizacion_${t}`] !== undefined)
      .sort((x, y) => (ms(a[y].en) ?? 0) - (ms(a[x].en) ?? 0))[0]
    estado.autorizacion_version = VERSION_POLITICA
    estado.autorizacion_canal = a[ultima].canal

    let escrita
    if (!fila) {
      // Cuenta sin fila en profiles (de antes del trigger de registro): se crea.
      const { data, error } = await supabase.from('profiles').upsert({ id: userId, ...estado }, { onConflict: 'id' }).select(COLUMNAS_NUBE)
      if (error) throw error
      escrita = data?.[0]
    } else {
      // Solo si nadie la cambió desde que se leyó (la hora es la misma).
      let q = supabase.from('profiles').update(estado).eq('id', userId)
      for (const [col, val] of filtros) q = val == null ? q.is(col, null) : q.eq(col, val)
      const { data, error } = await q.select(COLUMNAS_NUBE)
      if (error) throw error
      escrita = data?.[0]
    }
    // Sin fila devuelta: otro teléfono escribió en medio. Se reintenta luego.
    if (!escrita) return r
    r.nube = escrita
    for (const t of tipos) if (estado[`autorizacion_${t}`] !== undefined) r.escritos[t] = true
    r.completo = filasListas
    return r
  } catch (e) {
    console.error('subirAutorizaciones:', e)
    return r
  }
}

/* Aplica el resultado de una subida al estado actual. `enviado` es el
   estado que se subió: si mientras tanto respondió otra vez, esa respuesta
   nueva sigue pendiente. Devuelve `prev` tal cual si no cambia nada. */
export function trasSubir(prev, r, enviado) {
  if (!prev || !r) return prev
  let sig = prev
  const cambiar = (cambios) => { sig = { ...sig, ...cambios } }

  if (r.filas.length && Array.isArray(prev.pendientes)) {
    const listas = new Set(r.filas)
    const quedan = prev.pendientes.filter(f => !listas.has(f.id))
    if (quedan.length !== prev.pendientes.length) cambiar({ pendientes: quedan })
  }

  const nube = r.nube
  if (nube) {
    for (const t of TIPOS) {
      if (!r.escritos[t] && !r.ganaNube[t]) continue
      const igual = sig[t] && enviado?.[t] && sig[t].en === enviado[t].en && sig[t].valor === enviado[t].valor
      const enNube = t === 'edad' ? null : (nube[`autorizacion_${t}_en`] ?? null)
      if (igual && r.escritos[t]) {
        const { pendiente: _, ...sinPendiente } = sig[t]
        cambiar({ [t]: { ...sinPendiente, en: enNube || sig[t].en } })
      } else if (igual && r.ganaNube[t]) {
        cambiar({ [t]: { valor: nube[`autorizacion_${t}`], version: versionDe(t), canal: nube.autorizacion_canal || null, en: enNube } })
      }
      if (t !== 'edad') cambiar({ nube: { ...(sig.nube || {}), [t]: enNube } })
    }
  }
  return sig
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
