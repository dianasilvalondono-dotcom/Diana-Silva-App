import { useState, useRef, useEffect, useCallback } from 'react'
import { apiFetch } from './supabase'

// Reproduce en voz las respuestas de Tu Ronda.
// La sintesis ocurre en /api/speak (la key de ElevenLabs nunca toca el bundle).
// Si el servidor responde 503 la voz no esta configurada: escondemos el boton
// y la app sigue igual de completa en texto. Si falla por otra razon, errorId
// marca por unos segundos el mensaje que no se pudo leer (el boton lo avisa).
// Solo suena la ultima peticion: pedir otro mensaje cancela la anterior.
// alRechazar(resp), si se pasa, recibe cada 403 del servidor: App lo usa para
// ver si es el de la IA sin autorizar (la quitaron en otro telefono) y volver
// a leer las autorizaciones, como con agent, guia y generate-program.
export function useSpeech({ alRechazar } = {}) {
  const [speakingId, setSpeakingId] = useState(null)
  const [loadingId, setLoadingId] = useState(null)
  const [errorId, setErrorId] = useState(null)
  const [available, setAvailable] = useState(true)

  const audioRef = useRef(null)
  const urlRef = useRef(null)
  const abortRef = useRef(null)   // fetch en curso
  const reqRef = useRef(0)        // numero de la peticion vigente
  const errorTimerRef = useRef(null)
  // Siempre la version mas reciente, sin sumarla a las dependencias de speak.
  const alRechazarRef = useRef(alRechazar)
  useEffect(() => { alRechazarRef.current = alRechazar })

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

  // Invalida la peticion en curso: si su respuesta llega, ya no suena.
  const cancelar = useCallback(() => {
    reqRef.current++
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const limpiarError = useCallback(() => {
    clearTimeout(errorTimerRef.current)
    setErrorId(null)
  }, [])

  const marcarError = useCallback((id) => {
    clearTimeout(errorTimerRef.current)
    setErrorId(id)
    errorTimerRef.current = setTimeout(() => setErrorId(null), 4000)
  }, [])

  // Al desmontar el componente que usa el hook no queda nada sonando ni
  // cargando. (En App el hook vive siempre: ahi se llama stop() al salir del chat.)
  const desmontar = useCallback(() => {
    cancelar()
    cleanup()
    clearTimeout(errorTimerRef.current)
  }, [cancelar, cleanup])
  useEffect(() => desmontar, [desmontar])

  const stop = useCallback(() => {
    cancelar()
    cleanup()
    setSpeakingId(null)
    setLoadingId(null)
  }, [cancelar, cleanup])

  const speak = useCallback(async (text, { id = 'default', tone = 'chat' } = {}) => {
    // Segundo toque sobre el mismo mensaje: silencio.
    if (speakingId === id) return stop()

    // Lo anterior (cargando o sonando) se cancela: solo suena este.
    cancelar()
    cleanup()
    const miPeticion = reqRef.current
    const vigente = () => reqRef.current === miPeticion
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setSpeakingId(null)
    setLoadingId(id)
    limpiarError()

    try {
      const resp = await apiFetch('/api/speak', {
        method: 'POST',
        body: JSON.stringify({ text, tone }),
        signal: ctrl.signal,
      })
      if (!vigente()) return

      if (resp.status === 503) {
        setAvailable(false)
        return
      }
      if (!resp.ok) {
        if (resp.status === 403) await alRechazarRef.current?.(resp)
        if (vigente()) marcarError(id)
        return
      }

      const blob = await resp.blob()
      if (!vigente()) return
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      urlRef.current = url
      audioRef.current = audio
      // Un audio que ya no es el vigente no toca el estado ni limpia el del otro.
      audio.onended = () => {
        if (audioRef.current !== audio) return
        setSpeakingId(null)
        cleanup()
      }
      audio.onerror = () => {
        if (audioRef.current !== audio) return
        setSpeakingId(null)
        cleanup()
        marcarError(id)
      }

      await audio.play()
      if (vigente() && audioRef.current === audio) setSpeakingId(id)
    } catch (err) {
      // Cancelada a proposito (otro mensaje o Silenciar): no es un error.
      if (err?.name === 'AbortError' || !vigente()) return
      cleanup()
      setSpeakingId(null)
      marcarError(id)
    } finally {
      if (vigente()) {
        setLoadingId(null)
        if (abortRef.current === ctrl) abortRef.current = null
      }
    }
  }, [speakingId, stop, cancelar, cleanup, limpiarError, marcarError])

  return { speak, stop, speakingId, loadingId, errorId, available }
}
