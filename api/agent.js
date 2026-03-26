export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message, context } = req.body
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
6. CONECTAR — "No tengo todas las respuestas, pero puedo conectarte con una profesional."

CUANDO LA PERSONA ESTÁ EN CRISIS:
- SIEMPRE valida primero: "Lo que sientes es real y es válido."
- Sugiere el botón SOS: "¿Quieres que activemos las herramientas de emergencia?"
- Ofrece respiración: "Respira conmigo: inhala 4 segundos, sostén 7, exhala 8."
- Si es grave: "Esto es importante. Te recomiendo hablar con una profesional. ¿Te conecto con alguien del Talent Pot?"
- NUNCA diagnosticas. NUNCA recetas. NUNCA minimizas.

FORMATO:
- Responde en texto plano, no en JSON
- Si te piden crear un programa, responde en JSON con formato: {"type":"program","title":"...","desc":"...","days":[{"day":1,"title":"...","task":"..."}]}
- Si no, responde en texto conversacional breve

CONTEXTO DE LA USUARIA (si disponible):
${context || 'No hay contexto disponible aún.'}`

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
          messages: [{ role: 'user', content: message }],
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        return res.status(500).json({ error: 'AI error', details: err })
      }

      const data = await response.json()
      const text = data.content[0].text

      // Check if response contains a program JSON
      const jsonMatch = text.match(/\{[\s\S]*"type"\s*:\s*"program"[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const program = JSON.parse(jsonMatch[0])
          return res.status(200).json({ reply: text.replace(jsonMatch[0], '').trim(), program })
        } catch (e) {}
      }

      return res.status(200).json({ reply: text })
    } catch (err) {
      return res.status(500).json({ error: 'Server error', details: err.message })
    }
  }

  // Fallback without API key — smart responses
  const m = message.toLowerCase()
  let reply = ''

  if (m.includes('mal') || m.includes('triste') || m.includes('ansiedad') || m.includes('crisis') || m.includes('no puedo')) {
    reply = 'Lo que sientes es real y es válido. No estás sola. ¿Quieres que activemos las herramientas SOS? Respiración guiada, grounding, y herramientas DBT están a un toque. O si prefieres, puedo conectarte con una profesional del Talent Pot.'
  } else if (m.includes('programa') || m.includes('crear') || m.includes('quiero')) {
    reply = 'Me encanta que quieras empezar algo nuevo. Cuéntame más específicamente: ¿qué quieres lograr? Por ejemplo: "quiero dejar el azúcar", "quiero meditar", "quiero dormir mejor". Y te armo un programa paso a paso.'
  } else if (m.includes('hábito') || m.includes('rutina')) {
    reply = 'Tus hábitos son la arquitectura de tu bienestar. ¿Quieres que revisemos juntas cuáles tienes activos y cómo te va? O si prefieres, puedo sugerirte nuevos hábitos basados en lo que necesitas.'
  } else if (m.includes('profesional') || m.includes('psicóloga') || m.includes('ayuda')) {
    reply = 'Puedo conectarte con profesionales verificadas del Talent Pot. Tenemos psicólogas, coaches, nutricionistas, y más. ¿Qué tipo de apoyo necesitas?'
  } else if (m.includes('hola') || m.includes('hey') || m.includes('buenos')) {
    reply = '¡Hola! Soy Tu Ronda — estoy aquí para acompañarte. ¿Cómo te sientes hoy? Puedo ayudarte con tus hábitos, sugerirte un programa, o simplemente escucharte.'
  } else {
    reply = 'Estoy aquí para ti. Puedo ayudarte con: tus hábitos del día, crear un programa personalizado, conectarte con una profesional, o activar herramientas SOS si lo necesitas. ¿Por dónde empezamos?'
  }

  return res.status(200).json({ reply })
}
