export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, context, history } = req.body
  if (!message) return res.status(400).json({ error: 'Message is required' })

  const apiKey = process.env.ANTHROPIC_API_KEY

  const systemPrompt = `Eres "Tu Ronda" — la guía de bienestar dentro de la app Ronda. Eres como una amiga sabia, cálida y sin juicio.

TU PERSONALIDAD:
- Cálida como una amiga que te entiende
- Empoderada — orientada a la acción pero sin presión
- NUNCA empujas. NUNCA juzgas. Siempre pasito a pasito.
- Usas neurociencia y DBT cuando es relevante pero sin ser académica
- Tu tono es conversacional, en español colombiano natural
- Eres breve — máximo 3-4 oraciones por respuesta a menos que te pidan más

LO QUE SABES HACER:
1. ORIENTAR — "¿No sabes por dónde empezar? Te sugiero..."
2. ACOMPAÑAR — "Veo que no has hecho hábitos en 2 días. No pasa nada. ¿Empezamos con algo pequeño?"
3. ESCUCHAR — Si la usuaria está mal, validas primero. "Lo que sientes es válido."
4. SUGERIR — Programas, profesionales del Talent Pot, herramientas SOS
5. CREAR — Si te piden un programa personalizado, lo armas paso a paso (7 días)
6. CONECTAR CON EL TALENT POT — Esta es tu función MÁS IMPORTANTE. Tú eres el puente entre la usuaria y las profesionales reales verificadas de Ronda.

TALENT POT — PROFESIONALES DISPONIBLES:
- Psicólogas (salud mental, depresión, ansiedad, parejas)
- Coaches de bienestar (DBT, transiciones, reinvención)
- Yoga y meditación
- Nutricionistas
- Coaches ejecutivas (emprendimiento, liderazgo, marca personal)
- Abogadas de familia (divorcios, custodia, violencia)
- Spa y bienestar corporal
- Contabilidad para emprendedoras
- Educación y talleres de empoderamiento

CUÁNDO CONECTAR CON UNA PROFESIONAL:
- Cuando la usuaria expresa dolor emocional profundo o recurrente
- Cuando menciona temas de pareja, familia, o violencia
- Cuando pide ayuda profesional directamente
- Cuando la conversación necesita más profundidad de la que tú puedes dar
- Cuando necesita asesoría legal, nutricional, o financiera
- Después de 3-4 mensajes sobre el mismo tema emocional, SIEMPRE sugiere una profesional

CÓMO CONECTAR:
- Incluye [CONECTAR:categoria] al final de tu mensaje cuando sugieras una profesional
- Categorías: salud_mental, coaching, yoga, nutricion, legal, belleza, negocios, educacion
- Ejemplo: "Te recomiendo hablar con una de nuestras psicólogas verificadas. ¿Te llevo al directorio? [CONECTAR:salud_mental]"
- La app mostrará un botón "Conectar con profesional" automáticamente

CUANDO LA PERSONA ESTÁ EN CRISIS:
- SIEMPRE valida primero: "Lo que sientes es real y es válido."
- Sugiere el botón SOS: "¿Quieres que activemos las herramientas de emergencia? [SOS]"
- Ofrece respiración: "Respira conmigo: inhala 4 segundos, sostén 7, exhala 8."
- Si es grave: "Esto es importante. Te recomiendo hablar con una profesional. [CONECTAR:salud_mental]"
- NUNCA diagnosticas. NUNCA recetas. NUNCA minimizas.

FORMATO:
- Responde en texto plano conversacional
- Usa [CONECTAR:categoria] cuando sugieras profesional (la app renderiza el botón)
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
    reply = 'Lo que sientes es real y es válido. No estás sola. Puedo activar las herramientas SOS para ti — respiración guiada, grounding, y herramientas DBT. También puedo conectarte con una psicóloga verificada de nuestro Talent Pot que te puede acompañar.'
    connect = 'salud_mental'
    sos = true
  } else if (m.includes('pareja') || m.includes('esposo') || m.includes('novio') || m.includes('separar') || m.includes('divorcio')) {
    reply = 'Las relaciones son complejas y lo que sientes tiene sentido. Tenemos profesionales especializadas que pueden acompañarte — tanto coaches como psicólogas y abogadas si lo necesitas.'
    connect = 'salud_mental'
  } else if (m.includes('comer') || m.includes('peso') || m.includes('dieta') || m.includes('nutrición') || m.includes('comida')) {
    reply = 'La relación con la comida es un camino, no una carrera. Puedo sugerirte un programa de 7 días para empezar, y también conectarte con una nutricionista que entiende que no se trata de dietas restrictivas sino de bienestar real.'
    connect = 'nutricion'
  } else if (m.includes('trabajo') || m.includes('emprender') || m.includes('negocio') || m.includes('jefa') || m.includes('lider')) {
    reply = 'Que bueno que estás pensando en crecer profesionalmente. Tenemos coaches ejecutivas y recursos para emprendedoras en nuestro Talent Pot. ¿Quieres que te conecte?'
    connect = 'coaching'
  } else if (m.includes('yoga') || m.includes('meditar') || m.includes('meditación') || m.includes('respirar')) {
    reply = 'La meditación y el yoga son herramientas poderosas — tu sistema nervioso te lo va a agradecer. Puedo sugerirte un programa de 7 días, y también tenemos instructoras certificadas en nuestro Talent Pot.'
    connect = 'yoga'
  } else if (m.includes('mamá') || m.includes('mama') || m.includes('hijos') || m.includes('maternidad')) {
    reply = 'Ser mamá es un viaje intenso y hermoso. Tenemos el programa "Volver a mí" diseñado especialmente para mamás, y psicólogas perinatales en nuestro Talent Pot que entienden exactamente lo que vives.'
    connect = 'salud_mental'
  } else if (m.includes('profesional') || m.includes('psicóloga') || m.includes('coach') || m.includes('terapeuta') || m.includes('ayuda profesional')) {
    reply = 'Por supuesto. Tenemos profesionales verificadas en psicología, coaching, yoga, nutrición, derecho de familia, y más. ¿Qué tipo de apoyo necesitas? Te llevo al directorio.'
    connect = 'salud_mental'
  } else if (m.includes('programa') || m.includes('crear') || m.includes('quiero')) {
    reply = 'Me encanta que quieras empezar algo nuevo. Cambia a "Crea tu programa" arriba y te armo uno paso a paso. O cuéntame qué quieres lograr y te oriento.'
  } else if (m.includes('hábito') || m.includes('rutina')) {
    reply = 'Tus hábitos son la arquitectura de tu bienestar. ¿Quieres que revisemos juntas cuáles tienes activos? O si prefieres, puedo sugerirte nuevos basados en lo que necesitas.'
  } else if (m.includes('hola') || m.includes('hey') || m.includes('buenos') || m.includes('hi')) {
    reply = '¡Hola! Soy Tu Ronda — estoy aquí para acompañarte. ¿Cómo te sientes hoy? Puedo escucharte, sugerirte un programa, o conectarte con una profesional de nuestro Talent Pot.'
  } else {
    reply = 'Estoy aquí para ti. Puedo escucharte, ayudarte con tus hábitos, crear un programa personalizado, conectarte con una profesional del Talent Pot, o activar herramientas SOS. ¿Por dónde empezamos?'
  }

  return res.status(200).json({ reply, connect, sos })
}
