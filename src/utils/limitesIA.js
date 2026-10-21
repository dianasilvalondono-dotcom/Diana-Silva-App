/* Límites de la IA de Ronda: los mismos en la app (los maxLength de los
   campos) y en el servidor (api/agent.js, api/guia.js y
   api/generate-program.js). Sin dependencias de navegador ni de Node.
   Diseño: ronda-hq/05-producto/ronda-plus-fundadoras-diseno.md (1.3 a 1.5).
   El tope diario vive en la base (public.ronda_plus_ajustes.tope_ia_diario,
   src/sql/tope-ia-y-cuentas-nuevas.sql): cambiarlo no requiere desplegar. */

// El tope que se dice cuando no se pudo leer el de la base (decisión de
// Diana del 21-oct-2026: 10 mensajes de IA al día por persona).
export const TOPE_IA_DIARIO = 10

// Largo máximo de lo que escribe ella (caracteres).
export const MAX_MENSAJE_CHAT = 4000       // Tu Ronda (el mismo MAX_TURNO del historial)
export const MAX_META_PROGRAMA = 300       // Crea tu programa: la meta
export const MAX_CONTEXTO_PROGRAMA = 1000  // Crea tu programa: «cuéntame un poco más»
export const MAX_PUBLICACION = 2000        // la Comunidad (el BOARD_MAX de la app)

// Tope de tamaño total de lo que le llega al modelo en un mensaje: el texto
// fijo, el contexto que manda la app, la memoria, el historial y el mensaje.
// 50.000 caracteres ≈ 14.300 tokens [ESTIMACIÓN: 3,5 caracteres por token],
// unos US$0,07 por mensaje con la salida máxima (CFO, R-07).
export const MAX_TOTAL_IA = 50000

// Todo lo que entra al prompt se recorta como texto o como número, nunca por
// el .length de lo que llegue: una lista tiene length 1 aunque traiga un
// millón de caracteres, y un número raro no es texto.
export const corta = (v, n) => (typeof v === 'string' ? v : '').slice(0, Math.max(0, n))
export const numero = (v, max) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0
}

// Cuántos caracteres le llegan al modelo: el texto fijo y cada turno.
export const tamanoTotal = (system, messages) =>
  corta(system, Infinity).length + (Array.isArray(messages) ? messages : [])
    .reduce((s, m) => s + corta(m?.content, Infinity).length, 0)

// ¿Cabe en el tope total? Si no, quita los turnos más viejos del historial
// (el primero tiene que seguir siendo de ella) hasta que quepa. Devuelve los
// turnos que caben, o null si ni con el último solo cabe (el servidor
// responde 413 y no cuenta el mensaje).
export function cabeEnTope(system, messages, max = MAX_TOTAL_IA) {
  const turnos = (Array.isArray(messages) ? messages : []).map(m => ({ role: m.role, content: corta(m.content, Infinity) }))
  while (turnos.length > 1 && tamanoTotal(system, turnos) > max) {
    turnos.shift()
    while (turnos.length > 1 && turnos[0].role !== 'user') turnos.shift()
  }
  if (!turnos.length || turnos[0].role !== 'user' || tamanoTotal(system, turnos) > max) return null
  return turnos
}
