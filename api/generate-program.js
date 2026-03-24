export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { goal, context } = req.body
  if (!goal) return res.status(400).json({ error: 'Goal is required' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const systemPrompt = `Eres Ronda, una asistente de bienestar femenino. Tu trabajo es crear programas personalizados paso a paso para mujeres.

REGLAS:
- Siempre en español, tono cálido y cercano como una amiga que te entiende
- Programas de 7 días (gratis) o 21 días (premium)
- Cada día tiene UN paso pequeño y alcanzable (máximo 5-10 minutos)
- NUNCA empujas. NUNCA presionas. Siempre pasito a pasito.
- Cada tarea debe ser específica y concreta, no abstracta
- Incluye la razón científica o emocional detrás de cada paso
- El programa debe ser progresivo: día 1 es lo más fácil, día 7 es el más retador
- Usa emojis para cada día
- El tono es: "tú puedes, y yo te acompaño"

FORMATO DE RESPUESTA (JSON estricto):
{
  "title": "Nombre del programa",
  "emoji": "emoji_inicio→emoji_meta",
  "desc": "Descripción corta y motivadora (1 línea)",
  "duration": 7,
  "days": [
    { "day": 1, "title": "Título corto", "task": "Tarea concreta y específica con la razón detrás.", "emoji": "🌱" }
  ]
}

IMPORTANTE: Responde SOLO con el JSON. Sin texto antes ni después.`

  const userMessage = context
    ? `Mi meta: ${goal}\n\nContexto adicional: ${context}`
    : `Mi meta: ${goal}`

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
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(500).json({ error: 'AI API error', details: err })
    }

    const data = await response.json()
    const text = data.content[0].text

    // Parse the JSON from Claude's response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(500).json({ error: 'Invalid AI response' })

    const program = JSON.parse(jsonMatch[0])
    return res.status(200).json({ program })
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message })
  }
}
