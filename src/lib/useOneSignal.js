import { useState, useEffect } from 'react'

/**
 * Hook para integrar OneSignal Web Push
 * Estados:
 *  - status: 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'
 *  - subscribe(): pide permiso y suscribe
 *  - unsubscribe(): desuscribe
 *  - setExternalUserId(userId): vincula la suscripción con el ID de Supabase para notifications targeted
 */
export function useOneSignal() {
  const [status, setStatus] = useState('loading')
  const [oneSignal, setOneSignal] = useState(null)

  useEffect(() => {
    let cancelled = false
    const checkReady = async () => {
      // Esperar a que OneSignal SDK cargue (max 10s)
      for (let i = 0; i < 100; i++) {
        if (cancelled) return
        if (window.OneSignal && window.__ONESIGNAL_READY__) break
        await new Promise(r => setTimeout(r, 100))
      }
      if (cancelled) return

      const OS = window.OneSignal
      if (!OS) { setStatus('unsupported'); return }
      setOneSignal(OS)

      try {
        // Detectar estado actual
        const isSupported = OS.Notifications?.isPushSupported?.() ?? true
        if (!isSupported) { setStatus('unsupported'); return }

        const permission = OS.Notifications.permission
        const optedIn = OS.User?.PushSubscription?.optedIn

        if (permission === 'denied') setStatus('denied')
        else if (optedIn) setStatus('subscribed')
        else setStatus('unsubscribed')

        // Listener para cambios futuros
        OS.User?.PushSubscription?.addEventListener('change', (e) => {
          if (cancelled) return
          setStatus(e.current.optedIn ? 'subscribed' : 'unsubscribed')
        })
      } catch (e) {
        setStatus('unsupported')
      }
    }
    checkReady()
    return () => { cancelled = true }
  }, [])

  const subscribe = async () => {
    if (!oneSignal) return false
    try {
      await oneSignal.User.PushSubscription.optIn()
      setStatus('subscribed')
      return true
    } catch (e) {
      console.error('OneSignal subscribe error:', e)
      return false
    }
  }

  const unsubscribe = async () => {
    if (!oneSignal) return
    try {
      await oneSignal.User.PushSubscription.optOut()
      setStatus('unsubscribed')
    } catch (e) {
      console.error('OneSignal unsubscribe error:', e)
    }
  }

  const setExternalUserId = async (userId) => {
    if (!oneSignal || !userId) return
    try {
      await oneSignal.login(userId)
    } catch (e) {
      console.error('OneSignal setExternalUserId:', e)
    }
  }

  const setEmail = async (email) => {
    if (!oneSignal || !email) return
    try {
      await oneSignal.User.addEmail(email)
    } catch (e) {
      // silencioso — falla si ya está agregado
    }
  }

  return { status, subscribe, unsubscribe, setExternalUserId, setEmail }
}
