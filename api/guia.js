// API endpoint: la Guía IA de Ronda responde a un post del Board.
//
// Es UNA sola identidad de IA, transparente (no se hace pasar por humana ni
// por profesional certificada). Acompaña con herramientas basadas en DBT y
// neurociencia, pero NO diagnostica ni trata. Ante señales de crisis, corta
// el modo "consejo" y dirige a ayuda real (chequeo del lado del servidor,
// no depende del modelo). Segunda capa: si el modelo ve un riesgo que el
// chequeo no vio, empieza con [CRISIS] y la respuesta va marcada crisis.
//
// Para cambiar el nombre de la Guía IA, edita GUIA_IA.name (una sola línea).

// Patrones y respuesta de crisis: compartidos con la app (la app también
// detecta crisis antes de llamar aquí, para abrir Ayuda aunque esto falle).
import { isCrisis, CRISIS_TEXT, BOTON_AYUDA } from '../src/utils/crisis.js'
import { exigirSesion, exigirRondaPlus } from './_auth.js'

const GUIA_IA = { name: 'Emilia', title: 'Guía IA de Ronda' }

// Respuesta sin IA (sin API key, o si el modelo no devuelve texto), con la
// misma identidad de IA.
const FALLBACK_TEXT = 'Lo que estás sintiendo tiene todo el sentido, y muchas mujeres lo viven sin atreverse a decirlo. Reconocerlo y escribirlo aquí ya es un paso. Una cosa pequeña que ayuda es ponerle nombre a lo que sientes en el cuerpo (¿pecho apretado? ¿estómago cerrado?) y respirar profundo hacia ese lugar — tu sistema nervioso necesita sentirse acompañado para soltar. Si esto sigue por más de dos semanas o se intensifica, busca acompañamiento con un profesional de salud mental. Aquí estoy contigo 💛'

// Categorías del Board (las mismas de BOARD_CATS en src/App.jsx, sin 'todas').
const CATEGORIAS = ['ansiedad', 'relaciones', 'autoestima', 'maternidad', 'duelo', 'emprendimiento', 'general']
// Largo máximo de una publicación (el mismo BOARD_MAX de src/App.jsx).
const MAX_CONTENT = 2000

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Solo una usuaria con sesión: esto gasta créditos pagos (api/_auth.js).
  const user = await exigirSesion(req, res)
  if (!user) return

  const { content, cat } = req.body || {}
  if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'Content is required' })

  // ── Chequeo de crisis PRIMERO — respuesta segura garantizada, sin IA ──
  // Va antes de validar largo y categoría: una crisis nunca recibe un error.
  if (isCrisis(content)) {
    return res.status(200).json({
      crisis: true,
      reply: {
        pro: { name: GUIA_IA.name, title: GUIA_IA.title, verified: false, ai: true },
        text: CRISIS_TEXT,
      },
    })
  }

  // Escribir en la Comunidad es de Ronda+, como en la app (después de la crisis).
  if (!(await exigirRondaPlus(req, res, user))) return

  if (content.length > MAX_CONTENT) return res.status(413).json({ error: 'El mensaje es demasiado largo' })
  if (!CATEGORIAS.includes(cat)) return res.status(400).json({ error: 'Categoría no válida' })

  const apiKey = process.env.ANTHROPIC_API_KEY

  const systemPrompt = `Eres ${GUIA_IA.name}, la Guía IA de Ronda, respondiendo a una usuaria en el Board comunitario de Ronda.

QUÉ ERES (con total honestidad):
- Eres una INTELIGENCIA ARTIFICIAL, la compañera de bienestar de la app Ronda. No eres humana ni una profesional certificada, y nunca lo insinúas.
- Acompañas con herramientas y lenguaje basados en DBT (terapia dialéctico-conductual) y neurociencia, explicados de forma humana.
- Tu voz: cálida, sabia, cercana, como una hermana mayor que sabe pero no se pone por encima. Voz de marca de Ronda (creada por Diana Silva).
- Español colombiano natural — TUTEO ESTRICTO ("tú", "sientes", "quieres", "estás"). NUNCA voseo ("vos", "sentís"). NUNCA "usted".
- Si te preguntan si eres real o humana, dilo con naturalidad: eres la Guía IA de Ronda. El directorio de profesionales de Ronda todavía no está disponible: NUNCA prometas conectarla con una Guía, una psicóloga ni otra profesional. Si necesita a una persona, anímala a buscar acompañamiento profesional y, si es urgente, la Línea 106 o el 123.

CÓMO RESPONDES:
1. VALIDA primero: "Lo que sientes tiene todo el sentido" / "Muchas mujeres lo han sentido".
2. NORMALIZA: "Lo viven más mujeres de las que te imaginas".
3. EDUCA con neurociencia o DBT en lenguaje humano, no académico.
4. OFRECE una herramienta concreta y pequeña que pueda probar HOY.
5. CIERRA con calidez ("Aquí estoy contigo 💛").

NUNCA:
- Diagnosticar ("eso suena a ansiedad", "parece depresión") ni usar lenguaje clínico ("trastorno", "síntoma", "patología").
- Recetar medicamentos ni prescribir un tratamiento.
- Atribuirte credenciales, certificaciones o experiencia humana ("cuando yo estudiaba", "en mi consulta"). No las tienes.
- Empujar, juzgar o minimizar. Evita "deberías" (mejor "una cosa que ayuda es...").

SI HAY RIESGO (esto va antes que todo lo demás):
Si la publicación sugiere, aunque sea de forma indirecta, que su vida o su integridad está en riesgo (que quiere morir o desaparecer, hacerse daño, que ya no puede seguir) o que vive violencia o abuso:
- No sigas el formato normal ni le des una herramienta para resolverlo tú. Valida con calma y calidez, sin amplificar el pánico, y dile que no tiene que cargarlo sola.
- Dirige a ayuda real YA: el botón "${BOTON_AYUDA}" (arriba a la derecha de la app), la Línea 106 (salud mental, gratuita y confidencial en Colombia) y, si hay peligro inmediato, el 123.
- Sin lenguaje clínico ni diagnósticos.
- Empieza tu respuesta con [CRISIS] (la app abre Ayuda; la etiqueta no se le muestra).

FORMATO:
- 4 a 7 oraciones. Cálido y claro.
- Una herramienta accionable explícita.
- Cierra con corazón (💛 🌿 🌱 — natural, sin exagerar).
- NO empieces con "Hola" ni "Querida" — entra directo al tema.
- NO te presentes ni firmes — la app ya muestra tu nombre y que eres la Guía IA.

Recuerda: eres educación y acompañamiento de bienestar, no atención de salud mental.`

  const userMessage = `Una usuaria publicó esto en el Board (categoría: ${cat}):

"${content}"

Respóndele siguiendo todas las reglas. Devuelve SOLO el texto de la respuesta (con [CRISIS] al inicio si hay riesgo), sin firmar (la app ya muestra tu nombre).`

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
          // Tope del total de salida: pensamiento + respuesta.
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        return res.status(500).json({ error: 'AI error', details: err })
      }

      const data = await response.json()
      // La respuesta puede traer bloques de pensamiento antes del texto: se
      // unen todos los bloques de texto, no solo el primero.
      const crudo = (Array.isArray(data.content) ? data.content : [])
        .filter(b => b && b.type === 'text' && typeof b.text === 'string')
        .map(b => b.text)
        .join('')
      // [CRISIS]: el modelo vio una señal de riesgo que se le escapó a
      // isCrisis. La etiqueta nunca se muestra.
      const marcaCrisis = /\[CRISIS\]/i.test(crudo)
      const text = crudo.replace(/\[CRISIS\]/gi, '').replace(/[ \t]{2,}/g, ' ').trim()
      // Sin texto, rechazada o cortada a medias: la respuesta de respaldo.
      const usable = text && data.stop_reason !== 'refusal' && data.stop_reason !== 'max_tokens'

      // Con la marca, lo mismo que el chequeo de antes del modelo: crisis
      // (la app abre Ayuda). Si su texto no sirve o no nombra la Línea 106,
      // va la respuesta fija de crisis.
      if (marcaCrisis) {
        return res.status(200).json({
          crisis: true,
          reply: {
            pro: { name: GUIA_IA.name, title: GUIA_IA.title, verified: false, ai: true },
            text: usable && /\b106\b/.test(text) ? text : CRISIS_TEXT,
          },
        })
      }

      return res.status(200).json({
        reply: {
          pro: { name: GUIA_IA.name, title: GUIA_IA.title, verified: false, ai: true },
          text: usable ? text : FALLBACK_TEXT,
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
      text: FALLBACK_TEXT,
    },
  })
}
