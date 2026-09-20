import { useState, useRef, useEffect, useCallback } from 'react'

// Reproduce en voz las respuestas de Tu Ronda.
// La sintesis ocurre en /api/speak (la key de ElevenLabs nunca toca el bundle).
// Si el servidor responde 503 la voz no esta configurada: escondemos el boton
// y la app sigue igual de completa en texto.
export function useSpeech() {
  const [speakingId, setSpeakingId] = useState(null)
  const [loadingId, setLoadingId] = useState(null)
  const [available, setAvailable] = useState(true)

  const audioRef = useRef(null)
  const urlRef = useRef(null)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }, [])

  // No dejar audio sonando al desmontar la vista.
  useEffect(() => cleanup, [cleanup])

  const stop = useCallback(() => {
    cleanup()
    setSpeakingId(null)
  }, [cleanup])

  const speak = useCallback(async (text, { id = 'default', tone = 'chat' } = {}) => {
    // Segundo toque sobre el mismo mensaje: silencio.
    if (speakingId === id) return stop()

    cleanup()
    setSpeakingId(null)
    setLoadingId(id)

    try {
      const resp = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, tone }),
      })

      if (resp.status === 503) {
        setAvailable(false)
        return
      }
      if (!resp.ok) return

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      urlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setSpeakingId(null)
        cleanup()
      }
      audio.onerror = () => {
        setSpeakingId(null)
        cleanup()
      }

      await audio.play()
      setSpeakingId(id)
    } catch {
      // Sin ruido: si la voz falla, el texto ya esta en pantalla.
      setSpeakingId(null)
    } finally {
      setLoadingId(null)
    }
  }, [speakingId, stop, cleanup])

  return { speak, stop, speakingId, loadingId, available }
}
