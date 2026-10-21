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

/* ── Lo que ve ella cuando la IA no responde por el tope, la pausa o el conteo ──
   Textos de la CMO, palabra por palabra (ronda-hq/03-mercado/estrategia/
   textos-ronda-plus-fundadoras.md, secciones 1 a 3, 21-oct-2026). El número
   es el tope de hoy que manda el servidor (10 si no llega). El día cambia a
   la medianoche de Colombia: por eso dicen «mañana».
   En el chat, cada aviso va seguido de AYUDA_TEXT (src/utils/crisis.js), con
   sos: true para que salga el botón de Ayuda; en Crea tu programa y en la
   Comunidad, SalidaAyuda queda a la vista junto al aviso. */
const tope = {
  chat: (n) => `Hoy ya aprovechaste tus ${n} mensajes de IA. Mañana seguimos conversando. Mientras tanto, tus hábitos y tu diario te esperan, y también la vida real: ¿qué tal una caminata, una llamada a alguien que quieres o un plan con una amiga?`,
  programa: (n) => `Hoy ya aprovechaste tus ${n} mensajes de IA. Mañana la IA de Ronda te ayuda a crear tu programa. Mientras tanto, la vida real te espera: ¿qué tal una caminata o una llamada a alguien que quieres?`,
  comunidad: (n) => `Tu publicación quedó guardada. Hoy ya aprovechaste tus ${n} mensajes de IA: mañana toca “Pedir respuesta” y la Guía IA de Ronda te responde.`,
  comunidadSinGuardar: (n) => `Hoy ya aprovechaste tus ${n} mensajes de IA. Tu publicación se ve aquí mientras tengas Ronda abierta: cópiala en tus notas y mañana la publicas otra vez para recibir la respuesta de la Guía IA de Ronda.`,
}
export const TEXTO_TOPE_CHAT = tope.chat(TOPE_IA_DIARIO)
export const TEXTO_TOPE_PROGRAMA = tope.programa(TOPE_IA_DIARIO)
export const TEXTO_TOPE_COMUNIDAD = tope.comunidad(TOPE_IA_DIARIO)
export const TEXTO_TOPE_COMUNIDAD_SIN_GUARDAR = tope.comunidadSinGuardar(TOPE_IA_DIARIO)

// La IA en pausa (tope en 0, límite de gasto de la consola o falla de
// Anthropic): sin plazo, porque el corte de la consola puede durar hasta el
// mes siguiente.
export const TEXTO_PAUSA_CHAT = 'La IA de Ronda está en pausa por ahora. Apenas vuelva, la encuentras aquí. Mientras tanto, tus hábitos y tu diario te esperan, y también la vida real: ¿qué tal una caminata, una llamada a alguien que quieres o un plan con una amiga?'
export const TEXTO_PAUSA_PROGRAMA = 'La IA de Ronda está en pausa por ahora. Apenas vuelva, la encuentras aquí para crear tu programa. Mientras tanto, tus hábitos y tu diario te esperan.'
export const TEXTO_PAUSA_COMUNIDAD = 'Tu publicación quedó guardada. La IA de Ronda está en pausa por ahora: apenas vuelva, toca “Pedir respuesta” y la Guía IA de Ronda te responde.'
export const TEXTO_PAUSA_COMUNIDAD_SIN_GUARDAR = 'La IA de Ronda está en pausa por ahora. Tu publicación se ve aquí mientras tengas Ronda abierta: cópiala en tus notas y publícala otra vez cuando la IA de Ronda vuelva.'

// No se pudo contar el uso de hoy (falla técnica): no gasta cupo, así que sí
// se invita a intentarlo otra vez.
export const TEXTO_CONTEO_CHAT = 'Se nos enredó algo técnico con la IA de Ronda. En unos minutos puedes intentarlo otra vez.'
export const TEXTO_CONTEO_PROGRAMA = 'Se nos enredó algo técnico con la IA de Ronda. Tu meta sigue aquí: en unos minutos puedes intentarlo otra vez.'
export const TEXTO_CONTEO_COMUNIDAD = 'Tu publicación quedó guardada. Se nos enredó algo técnico con la IA de Ronda: en unos minutos toca “Pedir respuesta”.'
export const TEXTO_CONTEO_COMUNIDAD_SIN_GUARDAR = 'Se nos enredó algo técnico con la IA de Ronda. Tu publicación se ve aquí mientras tengas Ronda abierta: en unos minutos toca “Pedir respuesta”.'

const MOTIVOS = ['tope', 'pausa', 'conteo']

// El aviso que manda el servidor (api/_auth.js: 429 o 503 con tope: true y
// motivo), o null si es otro error. { motivo, limite }.
export async function avisoIADe(resp) {
  if (!resp || (resp.status !== 429 && resp.status !== 503)) return null
  const d = await resp.clone().json().catch(() => null)
  if (!d || d.tope !== true || !MOTIVOS.includes(d.motivo)) return null
  return { motivo: d.motivo, limite: Number.isInteger(d.limite) && d.limite > 0 ? d.limite : TOPE_IA_DIARIO }
}

// El texto que toca según el motivo y el lugar ('chat', 'programa' o
// 'comunidad'; en la Comunidad, si este dispositivo guardó la publicación).
export function textoAvisoIA(aviso, donde, { guardada = true } = {}) {
  const motivo = MOTIVOS.includes(aviso?.motivo) ? aviso.motivo : 'pausa'
  const n = Number.isInteger(aviso?.limite) && aviso.limite > 0 ? aviso.limite : TOPE_IA_DIARIO
  const lugar = donde === 'chat' || donde === 'programa' ? donde : (guardada ? 'comunidad' : 'comunidadSinGuardar')
  if (motivo === 'tope') return tope[lugar](n)
  const textos = motivo === 'pausa'
    ? { chat: TEXTO_PAUSA_CHAT, programa: TEXTO_PAUSA_PROGRAMA, comunidad: TEXTO_PAUSA_COMUNIDAD, comunidadSinGuardar: TEXTO_PAUSA_COMUNIDAD_SIN_GUARDAR }
    : { chat: TEXTO_CONTEO_CHAT, programa: TEXTO_CONTEO_PROGRAMA, comunidad: TEXTO_CONTEO_COMUNIDAD, comunidadSinGuardar: TEXTO_CONTEO_COMUNIDAD_SIN_GUARDAR }
  return textos[lugar]
}
