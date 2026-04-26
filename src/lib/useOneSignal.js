import { useState, useEffect, useRef } from 'react'

const ONESIGNAL_APP_ID = '7ae00782-88c2-4963-a660-aa62a85891ad'
const ONESIGNAL_SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'

/**
 * Hook LAZY de OneSignal Web Push.
 *
 * El SDK NO se carga en el page load — se carga solo cuando la usuaria
 * toca "Activar notificaciones". Esto evita que rompa la app en iOS PWA
 * (donde el SDK puede colgarse en standalone mode).
 *
 * Estados:
 *  - status: 'idle' | 'loading' | 'subscribing' | 'subscribed' | 'unsupported' | 'denied' | 'error'
 */
export function useOneSignal() {
  const [status, setStatus] = useState('idle')
  const sdkLoadedRef = useRef(false)

  // Cargar el SDK dinámicamente
  const loadSDK = () => new Promise((resolve, reject) => {
    if (sdkLoadedRef.current && window.OneSignal) {
      resolve(window.OneSignal)
      return
    }
    if (document.getElementById('onesignal-sdk-script')) {
      // Ya está cargándose, esperar
      const wait = setInterval(() => {
        if (window.OneSignal) {
          clearInterval(wait)
          resolve(window.OneSignal)
        }
      }, 100)
      setTimeout(() => { clearInterval(wait); reject(new Error('SDK load timeout')) }, 15000)
      return
    }

    const script = document.createElement('script')
    script.id = 'onesignal-sdk-script'
    script.src = ONESIGNAL_SDK_URL
    script.async = true

    script.onload = async () => {
      try {
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
      } catch (e) {
        reject(e)
      }
    }
    script.onerror = () => reject(new Error('SDK script load error'))
    document.head.appendChild(script)
  })

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
          const permission = window.OneSignal.Notifications?.permission
          if (cancelled) return
          if (permission === 'denied') setStatus('denied')
          else if (optedIn) setStatus('subscribed')
        } catch {}
      }
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [])

  const subscribe = async () => {
    setStatus('loading')
    try {
      const OS = await loadSDK()
      setStatus('subscribing')

      // Timeout 30s para evitar UI colgada
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('subscribe timeout')), 30000)
      )

      await Promise.race([
        OS.User.PushSubscription.optIn(),
        timeoutPromise,
      ])

      setStatus('subscribed')
      return true
    } catch (e) {
      console.error('OneSignal subscribe error:', e)
      // Verificar si fue denegado por el usuario
      try {
        if (window.OneSignal?.Notifications?.permission === 'denied') {
          setStatus('denied')
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
      return false
    }
  }

  const unsubscribe = async () => {
    if (!window.OneSignal) return
    try {
      await window.OneSignal.User.PushSubscription.optOut()
      setStatus('idle')
    } catch (e) {
      console.error('OneSignal unsubscribe error:', e)
    }
  }

  const setExternalUserId = async (userId) => {
    if (!window.OneSignal || !userId) return
    try { await window.OneSignal.login(userId) } catch {}
  }

  const setEmail = async (email) => {
    if (!window.OneSignal || !email) return
    try { await window.OneSignal.User.addEmail(email) } catch {}
  }

  return { status, subscribe, unsubscribe, setExternalUserId, setEmail }
}
