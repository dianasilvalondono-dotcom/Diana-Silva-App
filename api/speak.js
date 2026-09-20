// Sintesis de voz para Ronda (ElevenLabs).
// La key vive SOLO aqui, del lado servidor — igual que /api/agent y /api/guia.
// Sin ELEVENLABS_API_KEY la funcion responde 503 y el cliente simplemente
// no muestra el boton de audio: la app sigue funcionando en texto.

const MAX_CHARS = 1200

// Voz cacheada entre invocaciones tibias para no resolverla en cada request.
let cachedVoiceId = null

// Devuelve { voiceId } o { reason } para poder decir QUE fallo, no solo que fallo.
async function resolveVoiceId(apiKey) {
  if (process.env.ELEVENLABS_VOICE_ID) return { voiceId: process.env.ELEVENLABS_VOICE_ID }
  if (cachedVoiceId) return { voiceId: cachedVoiceId }

  const resp = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  })
  if (!resp.ok) {
    const body = await resp.text()
    return { reason: `GET /v1/voices devolvio ${resp.status}: ${body.slice(0, 200)}` }
  }

  const data = await resp.json()
  const voices = data.voices || []
  if (!voices.length) {
    return { reason: 'La cuenta no tiene voces propias. Elige una en ElevenLabs > Voices (boton Add/Use) y pega su ID en ELEVENLABS_VOICE_ID.' }
  }

  // Preferimos una voz femenina; si no hay metadata, la primera disponible.
  const female = voices.find(v => v.labels && v.labels.gender === 'female')
  cachedVoiceId = (female || voices[0]).voice_id
  return { voiceId: cachedVoiceId }
}

// El texto que llega de /api/agent ya viene sin [CONECTAR:x], [SOS] ni bloque
// de memoria. Aqui solo quitamos lo que no se debe leer en voz alta.
function sanitizeForSpeech(text) {
  return text
    // Emojis y simbolos decorativos: se leerian como ruido.
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, '')
    // Markdown residual.
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    // Espacios colapsados.
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CHARS)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text, tone } = req.body
  if (!text) return res.status(400).json({ error: 'Text is required' })

  const apiKey = process.env.ELEVENLABS_API_KEY
  // Degradacion silenciosa: sin key no hay voz, pero no hay error visible.
  if (!apiKey) return res.status(503).json({ error: 'voice_unavailable' })

  const clean = sanitizeForSpeech(text)
  if (!clean) return res.status(400).json({ error: 'Nothing to say' })

  const { voiceId, reason } = await resolveVoiceId(apiKey)
  if (!voiceId) {
    return res.status(503).json({ error: 'no_voice_configured', details: reason })
  }

  // En crisis la voz baja el ritmo y sube la estabilidad: presente, pausada,
  // sin inflexiones que puedan escalar el malestar. Es decision clinica, no estetica.
  const isCrisis = tone === 'sos'
  const voice_settings = isCrisis
    ? { stability: 0.80, similarity_boost: 0.75, style: 0.0, speed: 0.88, use_speaker_boost: true }
    : { stability: 0.50, similarity_boost: 0.75, style: 0.15, speed: 1.0, use_speaker_boost: true }

  // multilingual_v2 sostiene la calidad de voz en español sin cambiar de timbre.
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2'

  const payload = { text: clean, model_id: modelId, voice_settings }
  // language_code no esta soportado por multilingual_v2 — solo lo mandamos
  // con los modelos que si lo aceptan (flash/turbo/v3).
  if (!modelId.includes('multilingual_v2')) payload.language_code = 'es'

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const details = await response.text()
      return res.status(502).json({ error: 'TTS API error', details: details.slice(0, 500) })
    }

    const audio = Buffer.from(await response.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audio.length)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(audio)
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message })
  }
}
