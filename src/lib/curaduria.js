/* Datos de la curaduría: planes, reservas y reportes.
   Si las tablas de src/sql/curaduria.sql todavía no existen en Supabase,
   los planes salen de PLANES_EJEMPLO. Nada se da por enviado si no llegó
   al servidor: la reserva y el mensaje a la curadora dicen si fallaron,
   para que la usuaria pueda reintentar (rondas-1, rondas-2). */
import { supabase } from './supabase'
import { PLANES_EJEMPLO } from '../constants/curaduria'
import { load, save } from '../utils/helpers'

const fromRow = (r) => ({
  id: r.id,
  ciudad: r.ciudad,
  barrio: r.barrio,
  sala: r.sala,
  modalidad: r.modalidad || 'presencial',
  colecciones: r.colecciones || [],
  titulo: r.titulo,
  cuando: r.cuando,
  // La fecha real: con ella se ocultan los planes que ya pasaron y se
  // muestra el día exacto (rondas-11).
  fecha: r.fecha || null,
  anfitriona: r.anfitriona,
  acceso: r.acceso,
  verificacion: r.verificacion,
  cupos: r.cupos,
  // Cuántos quedan, si se sabe (rondas-10). null: solo se conoce el aforo.
  restantes: null,
  cedula: {
    porque: r.cedula_porque,
    paraQuien: r.cedula_para_quien,
    comoLlegas: r.cedula_como_llegas,
  },
  ejemplo: false,
})

/* "Para ti, esta semana": solo planes que todavía no empiezan y que caen
   en los próximos DIAS_VISTA días. Un plan sin fecha se muestra (rondas-11). */
const DIAS_VISTA = 7
const DIA_MS = 24 * 60 * 60 * 1000
const enEstaSemana = (plan, ahora = Date.now()) => {
  if (!plan.fecha) return true
  const t = new Date(plan.fecha).getTime()
  if (Number.isNaN(t)) return true
  return t >= ahora && t < ahora + DIAS_VISTA * DIA_MS
}

/* Los ejemplos solo traen 'cuando' ("Jueves, 6:00 p. m."): se ordenan por
   lo que falta para su próximo día y hora, desde hoy. Un plan de hoy cuya
   hora ya pasó queda al final: es el de la semana que viene (rondas-21). */
const DIAS = { domingo: 0, lunes: 1, martes: 2, 'miércoles': 3, jueves: 4, viernes: 5, 'sábado': 6 }
const SEMANA_MIN = 7 * 24 * 60
function minutosHasta(cuando = '', ahora = new Date()) {
  const [dia, hora = ''] = cuando.split(',')
  const d = DIAS[dia.trim().toLowerCase()]
  if (d === undefined) return Infinity
  const m = hora.match(/(\d{1,2}):(\d{2})\s*([ap])/i)
  const minutos = m ? ((Number(m[1]) % 12) + (m[3].toLowerCase() === 'p' ? 12 : 0)) * 60 + Number(m[2]) : 0
  const ahoraMin = ahora.getDay() * 24 * 60 + ahora.getHours() * 60 + ahora.getMinutes()
  return (((d * 24 * 60 + minutos - ahoraMin) % SEMANA_MIN) + SEMANA_MIN) % SEMANA_MIN
}

/* Cuántos cupos quedan (rondas-10). Las reservas de las demás no se pueden
   leer (RLS), así que el conteo sale de la función cupos_ocupados de
   src/sql/curaduria.sql. Mientras no esté aplicada, no se pide más en esta
   sesión y solo se muestra el aforo. */
let conteoDisponible = true
const funcionNoExiste = (error) => error?.code === 'PGRST202' || error?.code === '42883'
async function conCuposRestantes(planes, ciudad) {
  if (!conteoDisponible || !planes.some(p => p.cupos != null)) return planes
  try {
    const { data, error } = await supabase.rpc('cupos_ocupados', { p_ciudad: ciudad })
    if (error) {
      if (funcionNoExiste(error)) conteoDisponible = false
      return planes
    }
    const ocupados = new Map((data || []).map(r => [r.plan_id, Number(r.ocupados) || 0]))
    return planes.map(p => (p.cupos == null ? p : { ...p, restantes: Math.max(0, p.cupos - (ocupados.get(p.id) || 0)) }))
  } catch {
    return planes
  }
}

export async function getPlanes(ciudad) {
  if (supabase) {
    try {
      // Los planes en línea se ven desde cualquier ciudad (rondas-8). Los ids
      // de ciudad vienen de CIUDADES: sin comas ni tildes, seguros en .or().
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .or(`ciudad.eq.${ciudad},modalidad.eq.en-linea`)
        .eq('publicado', true)
        .order('fecha', { ascending: true, nullsFirst: false })
      if (!error && data && data.length) {
        const vigentes = data.map(fromRow).filter(p => enEstaSemana(p))
        return { planes: await conCuposRestantes(vigentes, ciudad), ejemplo: false }
      }
    } catch {
      /* La tabla todavía no existe: se muestran los ejemplos. */
    }
  }
  const ahora = new Date()
  return {
    planes: PLANES_EJEMPLO
      .filter(p => p.ciudad === ciudad || p.modalidad === 'en-linea')
      .map(p => ({ ...p, ejemplo: true }))
      .sort((a, b) => minutosHasta(a.cuando, ahora) - minutosHasta(b.cuando, ahora)),
    ejemplo: true,
  }
}

const RESERVAS_KEY = 'ronda_reservas'

/* Antes también se guardaban aquí los planes de ejemplo (ids 'ej-'): no
   son reservas y se ignoran (rondas-19). */
export function getReservasLocales() {
  const ids = load(RESERVAS_KEY, [])
  return Array.isArray(ids) ? ids.filter(id => !String(id).startsWith('ej-')) : []
}
const guardarReservaLocal = (id) => save(RESERVAS_KEY, [...new Set([...getReservasLocales(), id])])
const quitarReservaLocal = (id) => save(RESERVAS_KEY, getReservasLocales().filter(x => x !== id))

/* Las reservas de la cuenta (rondas-9): con sesión salen de la tabla
   reservas y se recuerdan en el dispositivo; sin conexión, lo último que
   se supo. Si otra cuenta entra en este teléfono, asegurarDuenaLocal
   aparta 'ronda_reservas' junto con lo demás de la anterior. */
export async function getReservas(user) {
  if (supabase && user) {
    try {
      const { data, error } = await supabase.from('reservas').select('plan_id').eq('user_id', user.id)
      if (!error && data) {
        const ids = data.map(r => r.plan_id)
        save(RESERVAS_KEY, ids)
        return ids
      }
    } catch {
      /* sin conexión: lo guardado */
    }
  }
  return getReservasLocales()
}

/* { ok: true } quedó apartado; { ok: false, motivo } no:
   'ejemplo' (el plan no existe), 'lleno' (sin cupos) o 'error'. */
export async function reservarCupo(plan, user) {
  if (plan.ejemplo) return { ok: false, motivo: 'ejemplo' }
  if (!supabase) {
    guardarReservaLocal(plan.id)
    return { ok: true, local: true }
  }
  if (!user) return { ok: false, motivo: 'error' }
  try {
    const { error } = await supabase.from('reservas').insert({ plan_id: plan.id, user_id: user.id })
    // 23505: ya estaba apartado (por ejemplo, desde otro teléfono).
    if (!error || error.code === '23505') {
      guardarReservaLocal(plan.id)
      return { ok: true, yaEstaba: !!error }
    }
    if (/cupos_llenos/.test(error.message || '')) return { ok: false, motivo: 'lleno' }
  } catch {
    /* sin conexión */
  }
  return { ok: false, motivo: 'error' }
}

/* "Ya no puedo ir": libera el cupo (política "Cada usuaria cancela sus
   reservas" del SQL). Solo se quita del dispositivo si salió del servidor. */
export async function liberarCupo(plan, user) {
  if (plan.ejemplo || !supabase) {
    quitarReservaLocal(plan.id)
    return { ok: true }
  }
  if (!user) return { ok: false }
  try {
    const { error } = await supabase.from('reservas').delete().eq('plan_id', plan.id).eq('user_id', user.id)
    if (!error) {
      quitarReservaLocal(plan.id)
      return { ok: true }
    }
  } catch {
    /* sin conexión */
  }
  return { ok: false }
}

/* El mensaje privado a la curadora va a la tabla reportes. Los planes de
   ejemplo no existen en la tabla planes: el mensaje va sin plan_id y con
   el título adelante, para que la curadora sepa de cuál habla (rondas-1). */
const conTitulo = (plan, texto) => `[Plan de ejemplo: ${plan.titulo}] ${texto}`

async function insertarReporte(fila, titulo) {
  const { error } = await supabase.from('reportes').insert(fila)
  // 23503: el plan ya no existe (se borró): va sin plan_id, con el título.
  if (error?.code === '23503' && fila.plan_id) {
    const otra = await supabase.from('reportes').insert({ ...fila, plan_id: null, texto: titulo ? `[${titulo}] ${fila.texto}` : fila.texto })
    return !otra.error
  }
  return !error
}

/* { ok: true } solo si llegó a la curadora. */
export async function enviarReporte(plan, texto, user) {
  if (!supabase || !user) return { ok: false, motivo: 'sin-servicio' }
  const fila = plan.ejemplo
    ? { plan_id: null, texto: conTitulo(plan, texto), user_id: user.id }
    : { plan_id: plan.id, texto, user_id: user.id }
  try {
    return { ok: await insertarReporte(fila, plan.titulo) }
  } catch {
    return { ok: false }
  }
}

/* Antes, lo que no llegaba al servidor se quedaba en 'ronda_reportes'. Esos
   mensajes ya no se envían solos: lo que ella cuenta sobre un plan puede
   ser algo de su salud o de su intimidad, y solo se envía cuando ella toca
   «Enviar» después de leer el aviso del diálogo (política, sección 3.2). Se
   quedan en su teléfono. */
