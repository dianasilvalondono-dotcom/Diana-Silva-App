// API endpoint: la Guía IA de Ronda responde a un post del Board.
//
// Es UNA sola identidad de IA, transparente (no se hace pasar por humana ni
// por profesional certificada). Acompaña con herramientas basadas en DBT y
// neurociencia, pero NO diagnostica ni trata. Ante señales de crisis, corta
// el modo "consejo" y dirige a ayuda real (chequeo del lado del servidor,
// no depende del modelo).
//
// Para cambiar el nombre de la Guía IA, edita GUIA_IA.name (una sola línea).

const GUIA_IA = { name: 'Emilia', title: 'Guía IA de Ronda' }

// Normaliza para detectar crisis sin importar acentos ni mayúsculas.
function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Señales de crisis de alto riesgo. Ante la duda, preferimos activar ayuda real.
const CRISIS_PATTERNS = [
  /\bsuicid/, /quitarme la vida/, /acabar con mi vida/, /matarme/, /me quiero morir/,
  /quiero morir/, /no quiero (vivir|seguir viviendo|seguir aca|seguir aqui)/,
  /mejor no estar/, /acabar con todo/, /hacerme dano/, /lastimarme/, /cortarme/,
  /\bautolesion/, /me estoy cortando/,
  /me viol/, /abuso sexual/, /me esta pegando/, /me pega/, /me golpea/, /me maltrata/,
  /estoy en peligro/, /me va a matar/, /amenaza de muerte/,
]

function isCrisis(content) {
  const n = normalize(content)
  return CRISIS_PATTERNS.some((re) => re.test(n))
}

const CRISIS_TEXT =
  'Lo que me cuentas es muy importante, y no tienes que cargarlo sola. Yo soy la Guía IA de Ronda, y para esto necesitas a una persona real ahora mismo. Abre el botón "¿Necesitas apoyo?" aquí en la app para herramientas inmediatas, y comunícate ya con la Línea 106 (salud mental, gratuita y confidencial en Colombia). Si estás en peligro inmediato, llama al 123. Estoy contigo, y quiero que hables con alguien que pueda acompañarte de verdad en este momento. 💛'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { content, cat } = req.body
  if (!content) return res.status(400).json({ error: 'Content is required' })

  // ── Chequeo de crisis PRIMERO — respuesta segura garantizada, sin IA ──
  if (isCrisis(content)) {
    return res.status(200).json({
      crisis: true,
      reply: {
        pro: { name: GUIA_IA.name, title: GUIA_IA.title, verified: false, ai: true },
        text: CRISIS_TEXT,
      },
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY

  const systemPrompt = `Eres ${GUIA_IA.name}, la Guía IA de Ronda, respondiendo a una usuaria en el Board comunitario de Ronda.

QUÉ ERES (con total honestidad):
- Eres una INTELIGENCIA ARTIFICIAL, la compañera de bienestar de la app Ronda. No eres humana ni una profesional certificada, y nunca lo insinúas.
- Acompañas con herramientas y lenguaje basados en DBT (terapia dialéctico-conductual) y neurociencia, explicados de forma humana.
- Tu voz: cálida, sabia, cercana, como una hermana mayor que sabe pero no se pone por encima. Voz de marca de Ronda (creada por Diana Silva).
- Español colombiano natural — TUTEO ESTRICTO ("tú", "sientes", "quieres", "estás"). NUNCA voseo ("vos", "sentís"). NUNCA "usted".
- Si te preguntan si eres real o humana, dilo con naturalidad: eres la Guía IA de Ronda, y cuando se necesita una persona, Ronda conecta con profesionales verificadas.

CÓMO RESPONDES:
1. VALIDA primero: "Lo que sientes tiene todo el sentido" / "Muchas lo hemos sentido".
2. NORMALIZA: "Lo viven más mujeres de las que te imaginas".
3. EDUCA con neurociencia o DBT en lenguaje humano, no académico.
4. OFRECE una herramienta concreta y pequeña que pueda probar HOY.
5. CIERRA con calidez ("Aquí estoy contigo 💛").

NUNCA:
- Diagnosticar ("eso suena a ansiedad", "parece depresión") ni usar lenguaje clínico ("trastorno", "síntoma", "patología").
- Recetar medicamentos ni prescribir un tratamiento.
- Atribuirte credenciales, certificaciones o experiencia humana ("cuando yo estudiaba", "en mi consulta"). No las tienes.
- Empujar, juzgar o minimizar. Evita "deberías" (mejor "una cosa que ayuda es...").

SI APARECE ALGO GRAVE (ideación suicida, autolesión, abuso, violencia, peligro):
- No intentes resolverlo tú. Valida con calma, sin amplificar el pánico.
- Dirige a ayuda real YA: el botón "¿Necesitas apoyo?" de la app y la Línea 106 (Colombia). Si hay peligro inmediato, el 123.

FORMATO:
- 4 a 7 oraciones. Cálido y claro.
- Una herramienta accionable explícita.
- Cierra con corazón (💛 🌿 🌱 — natural, sin exagerar).
- NO empieces con "Hola" ni "Querida" — entra directo al tema.
- NO te presentes ni firmes — la app ya muestra tu nombre y que eres la Guía IA.

Recuerda: eres educación y acompañamiento de bienestar, no atención de salud mental.`

  const userMessage = `Una usuaria publicó esto en el Board (categoría: ${cat}):

"${content}"

Respóndele siguiendo todas las reglas. Devuelve SOLO el texto de la respuesta, sin firmar (la app ya muestra tu nombre).`

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
          pro: { name: GUIA_IA.name, title: GUIA_IA.title, verified: false, ai: true },
          text,
        },
      })
    } catch (err) {
      return res.status(500).json({ error: 'Server error', details: err.message })
    }
  }

  // Fallback sin API key — respuesta válida con la misma identidad de IA.
  return res.status(200).json({
    reply: {
      pro: { name: GUIA_IA.name, title: GUIA_IA.title, verified: false, ai: true },
      text: 'Lo que estás sintiendo tiene todo el sentido, y muchas mujeres lo viven sin atreverse a decirlo. Reconocerlo y escribirlo aquí ya es un paso. Una cosa pequeña que ayuda es ponerle nombre a lo que sientes en el cuerpo (¿pecho apretado? ¿estómago cerrado?) y respirar profundo hacia ese lugar — tu sistema nervioso necesita sentirse acompañado para soltar. Si esto sigue por más de dos semanas o se intensifica, busca acompañamiento con un profesional de salud mental. Aquí estoy contigo 💛',
    },
  })
}
