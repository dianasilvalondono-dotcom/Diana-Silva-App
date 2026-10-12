/* Datos de la curaduría: planes, reservas y reportes.
   Si las tablas de src/sql/curaduria.sql todavía no existen en Supabase,
   todo degrada con calma: los planes salen de PLANES_EJEMPLO y las
   reservas y reportes se guardan en el dispositivo. */
import { supabase } from './supabase'
import { PLANES_EJEMPLO } from '../constants/curaduria'
import { load, save } from '../utils/helpers'

const fromRow = (r) => ({
  id: r.id,
  ciudad: r.ciudad,
  barrio: r.barrio,
  sala: r.sala,
  colecciones: r.colecciones || [],
  titulo: r.titulo,
  cuando: r.cuando,
  anfitriona: r.anfitriona,
  acceso: r.acceso,
  verificacion: r.verificacion,
  cupos: r.cupos,
  cedula: {
    porque: r.cedula_porque,
    paraQuien: r.cedula_para_quien,
    comoLlegas: r.cedula_como_llegas,
  },
  ejemplo: false,
})

export async function getPlanes(ciudad) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .eq('ciudad', ciudad)
        .eq('publicado', true)
        .order('fecha', { ascending: true })
      if (!error && data && data.length) return { planes: data.map(fromRow), ejemplo: false }
    } catch {
      /* La tabla todavía no existe: se muestran los ejemplos. */
    }
  }
  return {
    planes: PLANES_EJEMPLO.filter(p => p.ciudad === ciudad).map(p => ({ ...p, ejemplo: true })),
    ejemplo: true,
  }
}

const RESERVAS_KEY = 'ronda_reservas'

export function getReservasLocales() {
  return load(RESERVAS_KEY, [])
}

export async function reservarCupo(plan, user) {
  if (supabase && user && !plan.ejemplo) {
    try {
      const { error } = await supabase.from('reservas').insert({ plan_id: plan.id, user_id: user.id })
      if (!error) {
        save(RESERVAS_KEY, [...new Set([...getReservasLocales(), plan.id])])
        return { ok: true }
      }
    } catch {
      /* cae al guardado local */
    }
  }
  save(RESERVAS_KEY, [...new Set([...getReservasLocales(), plan.id])])
  return { ok: true, local: true }
}

export async function enviarReporte(plan, texto, user) {
  const reporte = { plan_id: plan.ejemplo ? null : plan.id, texto, created_at: new Date().toISOString() }
  if (supabase && user && !plan.ejemplo) {
    try {
      const { error } = await supabase.from('reportes').insert({ ...reporte, user_id: user.id })
      if (!error) return { ok: true }
    } catch {
      /* cae al guardado local */
    }
  }
  save('ronda_reportes', [...load('ronda_reportes', []), reporte])
  return { ok: true, local: true }
}
