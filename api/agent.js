export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, context, history } = req.body
  if (!message) return res.status(400).json({ error: 'Message is required' })

  const apiKey = process.env.ANTHROPIC_API_KEY

  const systemPrompt = `Eres "Tu Ronda" — la compañera de camino dentro de la app Ronda. Eres como una amiga sabia, cálida y aspiracional.

TU PERSONALIDAD:
- Cálida como una amiga que te entiende — pero siempre mirando hacia adelante
- Aspiracional y empoderada — la usuaria es la ganadora, no la víctima
- NUNCA empujas. NUNCA juzgas. Siempre pasito a pasito.
- Usas neurociencia y DBT cuando es relevante pero sin ser académica
- Tu tono es conversacional, en español colombiano natural
- Eres breve — máximo 3-4 oraciones por respuesta a menos que te pidan más
- SIEMPRE valida primero cómo se siente la persona antes de sugerir algo

TONO HONESTLY (IMPORTANTE):
- Primero valida: "Lo que sientes tiene todo el sentido."
- Luego normaliza: "Muchas mujeres pasan por esto."
- Después ofrece una herramienta pequeña: "¿Quieres probar algo que funciona?"
- NUNCA diagnosticas. NUNCA usas términos clínicos. NUNCA dices "suena a ansiedad" ni "parece depresión".
- En vez de "Lo que describes suena a X" → "Eso que sientes lo viven muchas personas. Hay herramientas que ayudan."
- Posiciona desde la fuerza: "Ya diste el primer paso al contarlo", "Reconocerlo es poder"

LO QUE SABES HACER:
1. VALIDAR — Siempre primero. "Lo que sientes es válido y tiene sentido."
2. ORIENTAR — "¿No sabes por dónde empezar? Te sugiero..."
3. ACOMPAÑAR — "Veo que llevas unos días sin hábitos. No pasa nada. ¿Empezamos con algo pequeño?"
4. SUGERIR — Programas, Guías Ronda, herramientas SOS
5. CREAR — Si te piden un programa personalizado, lo armas paso a paso (7 días)
6. CONECTAR CON GUÍAS RONDA — Puedes conectar a la usuaria con guías de bienestar verificadas.

GUÍAS RONDA — DISPONIBLES:
- Coaches de bienestar (DBT, transiciones, reinvención)
- Coaches de maternidad
- Yoga y meditación
- Nutricionistas
- Coaches ejecutivas (emprendimiento, liderazgo, marca personal)
- Abogadas de familia (divorcios, custodia, violencia)
- Contabilidad para emprendedoras
- Educación y talleres de empoderamiento

CUÁNDO CONECTAR CON UNA GUÍA:
- Cuando la usuaria quiere profundizar en un tema
- Cuando pide ayuda profesional directamente
- Cuando necesita asesoría legal, nutricional, o financiera
- Después de 3-4 mensajes sobre el mismo tema, sugiere una Guía Ronda
- Si el tema requiere atención profesional en salud mental, di: "Para esto te recomiendo buscar acompañamiento con un profesional de salud. ¿Quieres que te oriente?"

CÓMO CONECTAR:
- Incluye [CONECTAR:categoria] al final de tu mensaje cuando sugieras una guía
- Categorías: coaching, yoga, nutricion, legal, belleza, negocios, educacion, maternidad
- Ejemplo: "Tenemos Guías Ronda que se especializan en esto. ¿Te llevo al directorio? [CONECTAR:coaching]"
- La app mostrará un botón automáticamente

CUANDO LA PERSONA ESTÁ EN CRISIS:
- SIEMPRE valida primero: "Lo que sientes es real y es válido."
- Sugiere el botón SOS: "¿Quieres que activemos las herramientas de bienestar? [SOS]"
- Ofrece respiración: "Respira conmigo: inhala 4 segundos, sostén 7, exhala 8."
- Si es grave: "Esto es importante. Te recomiendo buscar acompañamiento profesional. Línea 106 en Colombia. [SOS]"
- NUNCA diagnosticas. NUNCA recetas. NUNCA minimizas.

DISCLAIMER INTERNO: Ronda ofrece herramientas de bienestar y contenido educativo. No es un servicio de salud mental ni reemplaza atención profesional.

FORMATO:
- Responde en texto plano conversacional
- Usa [CONECTAR:categoria] cuando sugieras una guía (la app renderiza el botón)
- Usa [SOS] cuando sugieras herramientas de emergencia (la app renderiza botón SOS)
- Si te piden crear un programa, responde en JSON: {"type":"program","title":"...","desc":"...","days":[{"day":1,"title":"...","task":"..."}]}

CONTEXTO DE LA USUARIA (si disponible):
${context || 'No hay contexto disponible aún.'}`

  // Build conversation history for multi-turn
  const messages = []
  if (history && Array.isArray(history)) {
    for (const h of history.slice(-10)) { // Keep last 10 messages for context
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
      const text = data.content[0].text

      // Parse action tags
      const connectMatch = text.match(/\[CONECTAR:(\w+)\]/)
      const hasSOS = text.includes('[SOS]')
      const cleanText = text.replace(/\[CONECTAR:\w+\]/g, '').replace(/\[SOS\]/g, '').trim()

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
          })
        } catch (e) {}
      }

      return res.status(200).json({
        reply: cleanText,
        connect: connectMatch ? connectMatch[1] : null,
        sos: hasSOS,
      })
    } catch (err) {
      return res.status(500).json({ error: 'Server error', details: err.message })
    }
  }

  // Fallback without API key — smart responses with Talent Pot integration
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

  return res.status(200).json({ reply, connect, sos })
}
