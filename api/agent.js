export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, context, history, memory } = req.body
  if (!message) return res.status(400).json({ error: 'Message is required' })

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
- Español colombiano natural, tuteo
- NUNCA diagnosticas, NUNCA usas lenguaje clínico ("ansiedad anticipatoria", "depresión")
- En su lugar: "lo que sientes lo viven muchas", "reconocerlo es poder", "hay herramientas que ayudan"

${memoryBlock}

CONTEXTO DE HOY:
${ctxBlock}

LO QUE SABES HACER:
1. VALIDAR primero (siempre)
2. ACOMPAÑAR con neurociencia/DBT sin ser académica
3. SUGERIR programas o Guías Ronda cuando sea relevante
4. CREAR programas personalizados de 7 días si te los piden
5. RECORDAR patrones de la usuaria y referenciarlos con naturalidad

GUÍAS RONDA disponibles: coaching, maternidad, yoga, nutrición, legal, negocios, educacion

FORMATO DE RESPUESTA:
- Texto plano conversacional
- Usa [CONECTAR:categoria] si sugieres una guía
- Usa [SOS] si sugieres herramientas de emergencia
- Si te piden programa: devuélvelo como JSON {"type":"program","title":"...","desc":"...","days":[...]}

EXTRACCIÓN DE MEMORIA (CRÍTICO):
Al final de tu respuesta al usuario, SEPARADO por "---MEMORY---", incluye un JSON con nueva memoria SI aprendiste algo nuevo e importante:

---MEMORY---
{
  "facts": ["hecho nuevo 1", "hecho nuevo 2"],
  "patterns": ["patrón observado"],
  "preferences": {"clave": "valor"},
  "summary": "Resumen actualizado breve de quién es ella (1-2 oraciones)"
}

Solo incluye el bloque MEMORY si aprendiste algo nuevo. Si no, omítelo. Los "facts" son datos personales (familia, trabajo, salud, situación). Los "patterns" son tendencias emocionales o de comportamiento que observas a lo largo de varias conversaciones. Sé sobrio — no sobrecargar la memoria con trivialidades.

DISCLAIMER: Ronda ofrece herramientas de bienestar y contenido educativo. No reemplaza atención profesional en salud mental.`

  const messages = []
  if (history && Array.isArray(history)) {
    for (const h of history.slice(-10)) {
      messages.push({ role: h.role, content: h.text })
    }
  }
  messages.push({ role: 'user', content: message })

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
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        return res.status(500).json({ error: 'AI error', details: err })
      }

      const data = await response.json()
      const rawText = data.content[0].text

      // ── Separate reply from memory block ──
      let replyText = rawText
      let memoryUpdate = null
      const memMatch = rawText.match(/---MEMORY---\s*([\s\S]+)$/)
      if (memMatch) {
        replyText = rawText.replace(/---MEMORY---[\s\S]+$/, '').trim()
        try {
          const jsonStr = memMatch[1].trim().replace(/^```json\s*/, '').replace(/```$/, '').trim()
          memoryUpdate = JSON.parse(jsonStr)
        } catch (e) {
          // If parse fails, skip memory update
        }
      }

      // Parse action tags
      const connectMatch = replyText.match(/\[CONECTAR:(\w+)\]/)
      const hasSOS = replyText.includes('[SOS]')
      const cleanText = replyText.replace(/\[CONECTAR:\w+\]/g, '').replace(/\[SOS\]/g, '').trim()

      // Check if response contains a program JSON
      const jsonMatch = cleanText.match(/\{[\s\S]*"type"\s*:\s*"program"[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const program = JSON.parse(jsonMatch[0])
          return res.status(200).json({
            reply: cleanText.replace(jsonMatch[0], '').trim(),
            program,
            connect: connectMatch ? connectMatch[1] : null,
            sos: hasSOS,
            memoryUpdate,
          })
        } catch (e) {}
      }

      return res.status(200).json({
        reply: cleanText,
        connect: connectMatch ? connectMatch[1] : null,
        sos: hasSOS,
        memoryUpdate,
      })
    } catch (err) {
      return res.status(500).json({ error: 'Server error', details: err.message })
    }
  }

  // Fallback without API key
  const m = message.toLowerCase()
  let reply = ''
  let connect = null
  let sos = false

  if (m.includes('mal') || m.includes('triste') || m.includes('ansiedad') || m.includes('crisis') || m.includes('no puedo') || m.includes('llorar')) {
    reply = 'Lo que sientes es real y es válido. Ya diste un paso importante al contarlo. Puedo activar herramientas de bienestar para ti — respiración guiada, grounding, y técnicas de regulación emocional. Si necesitas acompañamiento más profundo, te oriento.'
    connect = 'coaching'
    sos = true
  } else if (m.includes('pareja') || m.includes('esposo') || m.includes('novio') || m.includes('separar') || m.includes('divorcio')) {
    reply = 'Las relaciones son complejas y lo que sientes tiene todo el sentido. Reconocerlo es poder. Tenemos Guías Ronda que se especializan en transiciones y relaciones.'
    connect = 'coaching'
  } else if (m.includes('comer') || m.includes('peso') || m.includes('dieta') || m.includes('nutrición') || m.includes('comida')) {
    reply = 'La relación con la comida es un camino, no una carrera. Puedo sugerirte un programa de 7 días para empezar, y también conectarte con una nutricionista que entiende que se trata de bienestar real, no de dietas.'
    connect = 'nutricion'
  } else if (m.includes('trabajo') || m.includes('emprender') || m.includes('negocio') || m.includes('jefa') || m.includes('lider')) {
    reply = 'Que bueno que estás pensando en crecer profesionalmente. Tenemos Guías Ronda especializadas en emprendimiento y liderazgo. ¿Te conecto?'
    connect = 'negocios'
  } else if (m.includes('yoga') || m.includes('meditar') || m.includes('meditación') || m.includes('respirar')) {
    reply = 'La meditación y el yoga son herramientas poderosas — tu sistema nervioso te lo va a agradecer. Puedo sugerirte un programa de 7 días, y también tenemos Guías Ronda certificadas.'
    connect = 'yoga'
  } else if (m.includes('mamá') || m.includes('mama') || m.includes('hijos') || m.includes('maternidad')) {
    reply = 'Ser mamá es un viaje intenso y hermoso. Tenemos el programa "Volver a mí" diseñado para mamás, y Guías Ronda de maternidad que entienden exactamente lo que vives.'
    connect = 'maternidad'
  } else if (m.includes('profesional') || m.includes('psicóloga') || m.includes('coach') || m.includes('terapeuta') || m.includes('ayuda profesional')) {
    reply = 'Por supuesto. Tenemos Guías Ronda verificadas en bienestar, yoga, nutrición, derecho de familia, emprendimiento y más. ¿Qué tipo de acompañamiento necesitas?'
    connect = 'coaching'
  } else if (m.includes('programa') || m.includes('crear') || m.includes('quiero')) {
    reply = 'Me encanta que quieras empezar algo nuevo. Cambia a "Crea tu programa" arriba y te armo uno paso a paso. O cuéntame qué quieres lograr y te oriento.'
  } else if (m.includes('hábito') || m.includes('rutina')) {
    reply = 'Tus hábitos son la arquitectura de tu bienestar. ¿Quieres que revisemos juntas cuáles tienes activos? O si prefieres, puedo sugerirte nuevos basados en lo que necesitas.'
  } else if (m.includes('hola') || m.includes('hey') || m.includes('buenos') || m.includes('hi')) {
    reply = '¡Hola! Soy Tu Ronda — tu compañera de camino. ¿Cómo vas hoy? Puedo escucharte, sugerirte un programa, o conectarte con una Guía Ronda.'
  } else {
    reply = 'Estoy aquí para ti. Puedo escucharte, ayudarte con tus hábitos, crear un programa personalizado, conectarte con una Guía Ronda, o activar herramientas de bienestar. ¿Por dónde empezamos?'
  }

  return res.status(200).json({ reply, connect, sos, memoryUpdate: null })
}
