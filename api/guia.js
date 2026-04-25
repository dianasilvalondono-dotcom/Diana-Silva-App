// API endpoint: Guía Ronda responde automáticamente a un post del Board
// Habla en la voz de Diana Silva — coach DBT, instructora yoga + meditación
// Siempre firmado como una de las Guías Ronda (pseudónimo) según la categoría

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { content, cat } = req.body
  if (!content) return res.status(400).json({ error: 'Content is required' })

  const apiKey = process.env.ANTHROPIC_API_KEY

  // ── Mapeo categoría → Guía (especialidad) ──
  const GUIAS = {
    ansiedad:        { name: 'Valentina R.', title: 'Guía Ronda · Coach certificada DBT' },
    autoestima:      { name: 'Valentina R.', title: 'Guía Ronda · Coach certificada DBT' },
    relaciones:      { name: 'Valentina R.', title: 'Guía Ronda · Coach certificada DBT' },
    duelo:           { name: 'Mariana L.', title: 'Guía Ronda · Instructora certificada Meditación' },
    maternidad:      { name: 'Mariana L.', title: 'Guía Ronda · Instructora certificada Yoga y Meditación' },
    emprendimiento:  { name: 'Camila S.', title: 'Guía Ronda · Coach de emprendimiento' },
    general:         { name: 'Valentina R.', title: 'Guía Ronda · Coach certificada DBT' },
  }

  const guia = GUIAS[cat] || GUIAS.general

  const systemPrompt = `Eres una "Guía Ronda" respondiendo a una pregunta de una usuaria en el Board comunitario de Ronda.

QUIÉN ERES (voz de Diana Silva, founder de Ronda):
- Coach certificada en DBT (Dialectical Behavior Therapy)
- Instructora certificada de Yoga y Meditación
- Mujer cálida, sabia, hermana mayor — no terapeuta
- Hablas como amiga que sabe pero no se pone por encima
- Español colombiano natural (tuteo, "tú", no "vos")

TONO HONESTLY (CRÍTICO):
1. VALIDA primero: "Lo que sientes tiene todo el sentido" / "Muchas lo hemos sentido"
2. NORMALIZA: "Lo viven más mujeres de las que te imaginas"
3. EDUCA con neurociencia o DBT, en lenguaje humano (NO académico)
4. OFRECE una herramienta concreta y pequeña que puedan probar HOY
5. CIERRA con calidez ("Aquí estamos 💛", "Estoy contigo en esto")

NUNCA:
- Diagnosticar ("eso suena a ansiedad anticipatoria", "parece depresión")
- Usar lenguaje clínico ("trastorno", "patología", "síntoma")
- Recetar medicamentos ni prescribir terapia específica
- Empujar, juzgar, minimizar
- Decir "deberías..." (mejor: "una cosa que ayuda es...")

SI ES TEMA GRAVE (ideación suicida, abuso, crisis):
- Valida sin amplificar pánico
- Recomienda buscar acompañamiento profesional
- Menciona Línea 106 (Colombia) si es crisis

FORMATO DE RESPUESTA:
- Largo: 4-7 oraciones (no más, no menos)
- Lenguaje cálido pero claro
- Una herramienta accionable explícita
- Cierre con corazón (puede ser 💛 🌿 💪 🌱 — lo que sientas natural)
- NO empieces con "Hola" ni "Querida" — entra directo al tema
- NO te presentes ("Soy [nombre]") — la app ya muestra tu nombre y título

DISCLAIMER INTERNO: Eres educación de bienestar, no salud mental. No diagnostiques.`

  const userMessage = `Una usuaria publicó esto en el Board (categoría: ${cat}):

"${content}"

Respóndele como ${guia.name} (${guia.title}). Sigue todas las reglas de tono. Devuelve SOLO el texto de la respuesta, sin firmar al final (la app ya muestra tu nombre).`

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
          max_tokens: 600,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        return res.status(500).json({ error: 'AI error', details: err })
      }

      const data = await response.json()
      const text = data.content[0].text.trim()

      return res.status(200).json({
        reply: {
          pro: { name: guia.name, title: guia.title, verified: true },
          text,
        },
      })
    } catch (err) {
      return res.status(500).json({ error: 'Server error', details: err.message })
    }
  }

  // Fallback sin API key — respuesta genérica pero válida
  return res.status(200).json({
    reply: {
      pro: { name: guia.name, title: guia.title, verified: true },
      text: 'Lo que estás sintiendo tiene todo el sentido y muchas mujeres lo viven sin atreverse a decirlo. Reconocerlo y publicarlo aquí ya es un paso importante. Una cosa pequeña que ayuda es darle nombre a lo que sientes en el cuerpo (¿pecho apretado? ¿estómago cerrado? ¿garganta?) y respirar profundo hacia ese lugar — el sistema nervioso necesita sentirse acompañado para soltar. Si esto sigue por más de dos semanas o se intensifica, te recomiendo buscar acompañamiento con un profesional de salud mental. Aquí estamos 💛',
    },
  })
}
