// Patrones y respuesta de crisis: los mismos de la Guía IA y de la app.
import { normalize, isCrisis, CRISIS_TEXT_CHAT } from '../src/utils/crisis.js'

// Largo máximo de cada turno del historial que se le pasa al modelo.
const MAX_TURNO = 4000

// [CONECTAR:categoria] lleva a preguntar en la Comunidad: las categorías son
// las del Board (BOARD_CATS en src/App.jsx y api/guia.js, sin 'todas').
const CATEGORIAS_COMUNIDAD = ['ansiedad', 'relaciones', 'autoestima', 'maternidad', 'duelo', 'emprendimiento', 'general']

/* El historial que manda la app, listo para la Messages API: solo turnos de
   'user' o 'assistant' con texto, los consecutivos del mismo rol unidos y sin
   turnos de la asistente al inicio (el primer mensaje tiene que ser de la
   usuaria). */
function normalizarHistorial(history) {
  if (!Array.isArray(history)) return []
  const turnos = []
  const validos = history.filter(h =>
    h && (h.role === 'user' || h.role === 'assistant') && typeof h.text === 'string' && h.text.trim())
  for (const h of validos.slice(-10)) {
    const texto = h.text.trim().slice(0, MAX_TURNO)
    const ultimo = turnos[turnos.length - 1]
    if (ultimo && ultimo.role === h.role) ultimo.content += `\n\n${texto}`
    else turnos.push({ role: h.role, content: texto })
  }
  while (turnos.length && turnos[0].role !== 'user') turnos.shift()
  return turnos
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, context, history, memory } = req.body || {}
  if (typeof message !== 'string' || !message.trim()) return res.status(400).json({ error: 'Message is required' })

  // ── Chequeo de crisis PRIMERO — respuesta segura garantizada, sin IA ──
  // Corre con y sin API key, antes del modelo y antes del respaldo.
  if (isCrisis(message)) {
    return res.status(200).json({ reply: CRISIS_TEXT_CHAT, sos: true, crisis: true, connect: null, memoryUpdate: null })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY

  // ── Build rich context block ──
  const ctxBlock = typeof context === 'object' && context !== null
    ? [
        `Nombre: ${context.name || 'Usuaria'}`,
        context.city ? `Ciudad: ${context.city}` : null,
        context.intention ? `Intención del año: "${context.intention}"` : null,
        `Hábitos hoy: ${context.habitsToday || '0/0'}`,
        context.avgMood7d ? `Mood promedio últimos 7 días: ${context.avgMood7d}/4` : null,
        context.lastJournalNote ? `Última entrada de diario: "${context.lastJournalNote}"` : null,
        context.programActive ? `Programa activo: ${context.programActive}` : null,
      ].filter(Boolean).join('\n')
    : (typeof context === 'string' ? context : 'Sin contexto.')

  // ── Build memory block (lo que Ronda ya sabe de ella) ──
  const hasMemory = memory && (
    (memory.facts && memory.facts.length) ||
    (memory.patterns && memory.patterns.length) ||
    memory.summary
  )

  const memoryBlock = hasMemory ? `
MEMORIA DE LA USUARIA (lo que ya sabes de ella, úsalo con naturalidad — NO lo recites):

${memory.summary ? `Resumen: ${memory.summary}\n` : ''}
${memory.facts && memory.facts.length ? `Datos clave:\n${memory.facts.map(f => `  - ${f}`).join('\n')}` : ''}
${memory.patterns && memory.patterns.length ? `Patrones observados:\n${memory.patterns.map(p => `  - ${p}`).join('\n')}` : ''}
${memory.conversationCount ? `Conversaciones previas: ${memory.conversationCount}` : ''}

IMPORTANTE: Usa esta memoria para personalizar tu respuesta sin mencionarla explícitamente. Actúa como una amiga que se acuerda. No digas "veo en mi memoria que..." — simplemente responde como alguien que la conoce.
` : 'Esta es una conversación temprana — aún no tienes memoria estructurada de ella. Escucha con atención.'

  const systemPrompt = `Eres "Tu Ronda" — la compañera personal de bienestar dentro de la app Ronda. Eres como una amiga sabia que conoce a la usuaria y crece con ella en el tiempo.

TU PERSONALIDAD:
- Cálida como una amiga que te entiende — aspiracional, orientada al crecimiento
- SIEMPRE validas primero (tono Honestly): valida → normaliza → ofrece herramienta
- Breve (3-4 oraciones) salvo que pidan más
- Español colombiano natural — TUTEO ESTRICTO ("tú", "sientes", "quieres", "estás"). NUNCA voseo ("vos", "sentís", "querés", "estás" argentino). NUNCA "usted" (demasiado formal)
- NUNCA diagnosticas, NUNCA usas lenguaje clínico ("ansiedad anticipatoria", "depresión")
- En su lugar: "lo que sientes lo viven muchas", "reconocerlo es poder", "hay herramientas que ayudan"

${memoryBlock}

CONTEXTO DE HOY:
${ctxBlock}

LO QUE SABES HACER:
1. VALIDAR primero (siempre)
2. ACOMPAÑAR con neurociencia/DBT sin ser académica
3. SUGERIR programas, o preguntar en la Comunidad de Ronda, cuando sea relevante
4. CREAR programas personalizados de 7 días si te los piden
5. RECORDAR patrones de la usuaria y referenciarlos con naturalidad

COMUNIDAD DE RONDA: la usuaria puede publicar su pregunta de forma anónima en la Comunidad, donde le responde la Guía IA de Ronda. El directorio de profesionales todavía no está disponible: NUNCA prometas conectarla con una Guía, una psicóloga ni otra profesional, y no ofrezcas "¿Te conecto?".

FORMATO DE RESPUESTA:
- Texto plano conversacional
- Usa [CONECTAR:categoria] si le sugieres preguntar en la Comunidad (la app le muestra un botón para hacerlo). Escribe la categoría exactamente así, sin tildes: ansiedad, relaciones, autoestima, maternidad, duelo, emprendimiento o general. Ejemplo: [CONECTAR:relaciones]
- Usa [SOS] si sugieres herramientas de emergencia
- Si te piden programa: devuélvelo como JSON {"type":"program","title":"...","desc":"...","days":[...]}

EXTRACCIÓN DE MEMORIA (CRÍTICO):
Al final de tu respuesta al usuario, SEPARADO por "---MEMORY---", incluye un JSON con nueva memoria SI aprendiste algo nuevo e importante. En "facts" y "patterns" van SOLO los que no estén ya en su memoria (la app los suma a los que ya tiene):

---MEMORY---
{
  "facts": ["hecho nuevo 1", "hecho nuevo 2"],
  "patterns": ["patrón observado"],
  "preferences": {"clave": "valor"},
  "summary": "Resumen actualizado breve de quién es ella (1-2 oraciones)"
}

Solo incluye el bloque MEMORY si aprendiste algo nuevo. Si no, omítelo. Los "facts" son datos personales (familia, trabajo, salud, situación). Los "patterns" son tendencias emocionales o de comportamiento que observas a lo largo de varias conversaciones. Sé sobrio — no sobrecargar la memoria con trivialidades.

DISCLAIMER: Ronda ofrece herramientas de bienestar y contenido educativo. No reemplaza atención profesional en salud mental.`

  const messages = normalizarHistorial(history)
  const ultimo = messages[messages.length - 1]
  // Si el último turno ya es de la usuaria (su mensaje anterior no tuvo
  // respuesta), el nuevo se une a ese turno.
  if (ultimo && ultimo.role === 'user') ultimo.content += `\n\n${message}`
  else messages.push({ role: 'user', content: message })

  if (apiKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          // Tope del total de salida (pensamiento + respuesta): tiene que
          // alcanzar para la respuesta, el JSON de un programa de 7 días y el
          // bloque ---MEMORY---.
          max_tokens: 4096,
          system: systemPrompt,
          messages,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        return res.status(500).json({ error: 'AI error', details: err })
      }

      const data = await response.json()
      // La respuesta puede traer bloques de pensamiento antes del texto: se
      // unen todos los bloques de texto, no solo el primero.
      const rawText = (Array.isArray(data.content) ? data.content : [])
        .filter(b => b && b.type === 'text' && typeof b.text === 'string')
        .map(b => b.text)
        .join('')
        .trim()
      // Sin texto o rechazada: la respuesta de respaldo, nunca un error.
      if (!rawText || data.stop_reason === 'refusal') {
        return res.status(200).json(respuestaDeRespaldo(message))
      }
      // Cortada por el tope de tokens: lo que venga como JSON quedó a medias.
      const cortada = data.stop_reason === 'max_tokens'

      // ── Separate reply from memory block ──
      let replyText = rawText
      let memoryUpdate = null
      const memMatch = rawText.match(/---MEMORY---\s*([\s\S]+)$/)
      if (memMatch) {
        replyText = rawText.replace(/---MEMORY---[\s\S]+$/, '').trim()
        try {
          const jsonStr = memMatch[1].trim().replace(/^```json\s*/, '').replace(/```$/, '').trim()
          memoryUpdate = JSON.parse(jsonStr)
        } catch {
          // If parse fails, skip memory update
        }
      } else {
        // Un bloque de memoria cortado antes del separador completo no se muestra.
        replyText = rawText.replace(/-{2,}\s*MEMORY[\s\S]*$/, '').trim()
      }

      // Parse action tags (con o sin tildes y mayúsculas: [CONECTAR:Nutrición])
      const connectMatch = replyText.match(/\[CONECTAR:\s*([^\]\n]+?)\s*\]/iu)
      const hasSOS = /\[SOS\]/i.test(replyText)
      let cleanText = replyText
        .replace(/\[CONECTAR:[^\]\n]*\]/giu, '')
        .replace(/\[SOS\]/gi, '')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
      // La categoría va sin tildes y en minúscula; si no es una de la
      // Comunidad, va a 'general'.
      const categoria = connectMatch ? normalize(connectMatch[1]).trim() : null
      const connect = categoria ? (CATEGORIAS_COMUNIDAD.includes(categoria) ? categoria : 'general') : null

      // ¿Viene un programa en JSON? Nunca se deja el JSON en el texto del chat.
      let program = null
      const posTipo = cleanText.search(/"type"\s*:\s*"program"/)
      if (posTipo !== -1) {
        const inicio = cleanText.lastIndexOf('{', posTipo)
        const fin = cleanText.lastIndexOf('}')
        const desde = inicio === -1 ? posTipo : inicio
        if (!cortada && inicio !== -1 && fin > posTipo) {
          try {
            const candidato = JSON.parse(cleanText.slice(inicio, fin + 1))
            if (candidato && Array.isArray(candidato.days) && candidato.days.length) program = candidato
          } catch {
            program = null
          }
        }
        // Lo que va después del JSON solo se conserva si el JSON se leyó completo.
        cleanText = cleanText.slice(0, desde) + (program ? cleanText.slice(fin + 1) : '')
      }
      // Restos de un bloque de código (```json ... ```) alrededor del programa.
      cleanText = cleanText.replace(/```(?:json)?/gi, '').replace(/[ \t]{2,}/g, ' ').trim()

      let reply = cleanText
      if (!reply && program) reply = 'Armé un programa pensado para ti.'
      // Sin nada que mostrar (por ejemplo, solo un JSON cortado): respaldo.
      if (!reply) return res.status(200).json(respuestaDeRespaldo(message))

      return res.status(200).json({
        reply,
        ...(program ? { program } : {}),
        connect,
        sos: hasSOS,
        memoryUpdate,
      })
    } catch (err) {
      return res.status(500).json({ error: 'Server error', details: err.message })
    }
  }

  // Fallback without API key
  return res.status(200).json(respuestaDeRespaldo(message))
}

/* Respuesta sin IA, por palabras clave. Compara palabras completas (sin
   tildes ni mayúsculas), no pedazos: 'normal' no es 'mal' ni 'hice' es 'hi'.
   Las crisis ya se atendieron antes, con isCrisis. */
function respuestaDeRespaldo(message) {
  const m = normalize(message)
  const hasWord = (...ks) => ks.some(k => new RegExp(`(?<!\\p{L})${k}(?!\\p{L})`, 'u').test(m))
  let reply = ''
  let connect = null
  let sos = false

  if (hasWord('mal', 'fatal', 'triste', 'tristeza', 'ansiedad', 'ansiosa', 'crisis', 'no puedo', 'llorar', 'lloro', 'llorando')) {
    reply = 'Lo que sientes es real y es válido. Ya diste un paso importante al contarlo. Puedo activar herramientas de bienestar para ti — respiración guiada, grounding, y técnicas de regulación emocional. Si necesitas acompañamiento más profundo, te oriento.'
    sos = true
  } else if (hasWord('pareja', 'esposo', 'novio', 'separar', 'separarme', 'divorcio')) {
    reply = 'Las relaciones son complejas y lo que sientes tiene todo el sentido. Reconocerlo es poder. Si quieres, cuéntame más, o pregúntalo de forma anónima en la Comunidad: lo que vives lo viven muchas.'
    connect = 'relaciones'
  } else if (hasWord('comer', 'peso', 'dieta', 'nutricion', 'comida')) {
    reply = 'La relación con la comida es un camino, no una carrera. Puedo sugerirte un programa de 7 días para empezar, pensado en tu bienestar real, no en dietas.'
  } else if (hasWord('trabajo', 'emprender', 'emprendimiento', 'negocio', 'negocios', 'jefa', 'jefe', 'lider')) {
    reply = '¡Qué bueno que estás pensando en crecer profesionalmente! Cuéntame qué quieres lograr y armamos el primer paso. También puedes preguntarlo de forma anónima en la Comunidad.'
    connect = 'emprendimiento'
  } else if (hasWord('yoga', 'meditar', 'meditacion', 'respirar')) {
    reply = 'La meditación y el yoga son herramientas poderosas — tu sistema nervioso te lo va a agradecer. Puedo sugerirte un programa de 7 días para empezar.'
  } else if (hasWord('mama', 'hijos', 'hijo', 'hija', 'hijas', 'bebe', 'maternidad')) {
    reply = 'Ser mamá es un viaje intenso y hermoso. Tenemos el programa "Volver a mí" diseñado para mamás, y en la Comunidad puedes preguntar de forma anónima lo que estás viviendo.'
    connect = 'maternidad'
  } else if (hasWord('profesional', 'psicologa', 'psicologo', 'coach', 'coaching', 'terapeuta', 'ayuda profesional')) {
    reply = 'El directorio de profesionales de Ronda todavía está en camino. Mientras tanto, puedes preguntar de forma anónima en la Comunidad. Y cuéntame: ¿qué tipo de acompañamiento buscas?'
    connect = 'general'
  } else if (hasWord('programa', 'crear')) {
    reply = 'Me encanta que quieras empezar algo nuevo. Cambia a "Crea tu programa" arriba y te armo uno paso a paso. O cuéntame qué quieres lograr y te oriento.'
  } else if (hasWord('habito', 'habitos', 'rutina', 'rutinas')) {
    reply = 'Tus hábitos son la arquitectura de tu bienestar. ¿Quieres que revisemos juntas cuáles tienes activos? O si prefieres, puedo sugerirte nuevos basados en lo que necesitas.'
  } else if (hasWord('hola', 'hey', 'buenos', 'buenas')) {
    reply = '¡Hola! Soy Tu Ronda — tu compañera de camino. ¿Cómo vas hoy? Puedo escucharte, sugerirte un programa o ayudarte con tus hábitos.'
  } else {
    reply = 'Estoy aquí para ti. Puedo escucharte, ayudarte con tus hábitos, crear un programa personalizado o activar herramientas de bienestar. ¿Por dónde empezamos?'
  }

  return { reply, connect, sos, memoryUpdate: null }
}
