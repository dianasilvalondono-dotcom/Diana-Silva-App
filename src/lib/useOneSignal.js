import { useState, useEffect, useRef, useCallback } from 'react'
import { load, save } from '../utils/helpers'

const ONESIGNAL_APP_ID = '7ae00782-88c2-4963-a660-aa62a85891ad'
const ONESIGNAL_SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
const SDK_SCRIPT_ID = 'onesignal-sdk-script'
// Lo último que pasó con las notificaciones en este dispositivo ('subscribed'
// o 'idle'). El SDK se carga tarde, así que al abrir la app esto y el permiso
// del navegador son lo único que dice si están activas (perfil-6).
const STATUS_KEY = 'ronda-push-status'

/* Permiso del navegador: 'granted' | 'denied' | 'default', o null si este
   navegador no tiene notificaciones (p. ej. Safari de iPhone sin instalar
   Ronda). Se lee del navegador y no del SDK: en el SDK v16
   Notifications.permission es un booleano, nunca 'denied' (perfil-29). */
const permisoNativo = () => {
  try { return typeof Notification !== 'undefined' ? Notification.permission : null } catch { return null }
}

/* Rechaza si la promesa no responde a tiempo, para que la tarjeta no se
   quede esperando para siempre (perfil-4). */
const conLimite = (promesa, ms, mensaje) => {
  let t
  return Promise.race([
    promesa,
    new Promise((_, reject) => { t = setTimeout(() => reject(new Error(mensaje)), ms) }),
  ]).finally(() => clearTimeout(t))
}

// Al abrir la app, sin cargar el SDK (ver la nota de iOS abajo).
const estadoInicial = () => {
  const permiso = permisoNativo()
  if (permiso === 'denied') return 'denied'
  if (permiso === 'granted' && load(STATUS_KEY, null) === 'subscribed') return 'subscribed'
  return 'idle'
}

/**
 * Hook LAZY de OneSignal Web Push.
 *
 * El SDK NO se carga en el page load — se carga solo cuando la usuaria
 * toca "Activar notificaciones" (o "Pausar"). Esto evita que rompa la app en
 * iOS PWA (donde el SDK puede colgarse en standalone mode).
 *
 * Estados:
 *  - status: 'idle' | 'loading' | 'subscribing' | 'subscribed' | 'pausing' | 'denied' | 'error'
 *
 * subscribe() devuelve por qué terminó: 'subscribed' | 'denied' | 'dismissed'
 * (no aceptó el permiso) | 'unsupported' | 'error'. unsubscribe() devuelve
 * true si quedaron pausadas.
 */
export function useOneSignal() {
  const [status, setStatus] = useState(estadoInicial)
  const sdkLoadedRef = useRef(false)
  // Carga + init en curso. Si falla se suelta, y el siguiente intento
  // empieza de cero en vez de esperar a un script muerto (perfil-5).
  const cargaRef = useRef(null)

  const iniciarSDK = () => new Promise((resolve, reject) => {
    const iniciar = () => {
      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async (OneSignal) => {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            notifyButton: { enable: false },
            allowLocalhostAsSecureOrigin: true,
          })
          sdkLoadedRef.current = true
          resolve(OneSignal)
        } catch (e) {
          reject(e)
        }
      })
    }

    const previo = document.getElementById(SDK_SCRIPT_ID)
    // El script ya cargó en un intento anterior (falló el init): no se pide otra vez.
    if (previo?.dataset.cargado) {
      try { iniciar() } catch (e) { reject(e) }
      return
    }
    // Un script que falló no vuelve a cargar: se quita y se pide uno nuevo.
    previo?.remove()

    const script = document.createElement('script')
    script.id = SDK_SCRIPT_ID
    script.src = ONESIGNAL_SDK_URL
    script.async = true
    script.onload = () => {
      script.dataset.cargado = '1'
      try { iniciar() } catch (e) { reject(e) }
    }
    script.onerror = () => {
      script.remove()
      reject(new Error('SDK script load error'))
    }
    document.head.appendChild(script)
  })

  // Cargar el SDK dinámicamente. Cada intento espera como mucho 15 s.
  const loadSDK = () => {
    if (sdkLoadedRef.current && window.OneSignal) return Promise.resolve(window.OneSignal)
    if (!cargaRef.current) {
      const carga = iniciarSDK()
      cargaRef.current = carga
      carga.catch(() => { if (cargaRef.current === carga) cargaRef.current = null })
    }
    return conLimite(cargaRef.current, 15000, 'SDK load timeout')
  }

  // Verificar al montar si ya estaba suscrita en sesión previa
  useEffect(() => {
    let cancelled = false
    // Pequeño delay para no bloquear el primer render
    const t = setTimeout(async () => {
      if (cancelled) return
      // Solo si OneSignal YA fue inicializada antes en esta sesión, ver estado
      if (window.OneSignal && window.OneSignal.User) {
        try {
          const optedIn = window.OneSignal.User.PushSubscription?.optedIn
          if (cancelled) return
          if (permisoNativo() === 'denied') setStatus('denied')
          else if (optedIn) setStatus('subscribed')
        } catch {}
      }
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [])

  const subscribe = async () => {
    // Sin notificaciones en este navegador no vale la pena cargar el SDK.
    if (!permisoNativo()) {
      setStatus('error')
      return 'unsupported'
    }
    setStatus('loading')
    let sdkListo = false
    try {
      const OS = await loadSDK()
      sdkListo = true
      setStatus('subscribing')

      // Timeout 30s para evitar UI colgada
      await conLimite(OS.User.PushSubscription.optIn(), 30000, 'subscribe timeout')

      const permiso = permisoNativo()
      if (permiso === 'denied') {
        setStatus('denied')
        return 'denied'
      }
      if (permiso === 'default') {
        // Cerró el aviso del navegador sin aceptar: no quedaron activas.
        setStatus('idle')
        save(STATUS_KEY, 'idle')
        return 'dismissed'
      }
      setStatus('subscribed')
      save(STATUS_KEY, 'subscribed')
      return 'subscribed'
    } catch (e) {
      console.error('OneSignal subscribe error:', e)
      // El motivo sale del permiso del navegador, no se adivina (perfil-29).
      const permiso = permisoNativo()
      if (permiso === 'denied') {
        setStatus('denied')
        return 'denied'
      }
      setStatus('error')
      // Con el SDK listo y el permiso sin responder, lo que faltó fue aceptarlo.
      return sdkListo && permiso === 'default' ? 'dismissed' : 'error'
    }
  }

  // Después de reabrir la app el SDK no está cargado: se carga aquí para
  // poder pausar (antes "Pausar" no hacía nada sin el SDK, perfil-6).
  const unsubscribe = async () => {
    setStatus('pausing')
    try {
      const OS = await loadSDK()
      await conLimite(OS.User.PushSubscription.optOut(), 30000, 'unsubscribe timeout')
      setStatus('idle')
      save(STATUS_KEY, 'idle')
      return true
    } catch (e) {
      console.error('OneSignal unsubscribe error:', e)
      setStatus('subscribed')
      return false
    }
  }

  // useCallback para que la identidad sea estable: App.jsx las usa como
  // dependencias de un efecto, y sin esto el efecto correria en cada render.
  const setExternalUserId = useCallback(async (userId) => {
    if (!window.OneSignal || !userId) return
    try { await window.OneSignal.login(userId) } catch {}
  }, [])

  const setEmail = useCallback(async (email) => {
    if (!window.OneSignal || !email) return
    try { await window.OneSignal.User.addEmail(email) } catch {}
  }, [])

  return { status, subscribe, unsubscribe, setExternalUserId, setEmail }
}
