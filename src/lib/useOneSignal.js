import { useState, useEffect } from 'react'

/**
 * Hook para integrar OneSignal Web Push — DEFENSIVE
 * Garantiza que NUNCA rompe la app aunque OneSignal falle o se cuelgue.
 */
export function useOneSignal() {
  const [status, setStatus] = useState('loading')
  const [oneSignal, setOneSignal] = useState(null)

  useEffect(() => {
    let cancelled = false
    const checkReady = async () => {
      try {
        // Esperar a que OneSignal SDK cargue (max 8s)
        for (let i = 0; i < 80; i++) {
          if (cancelled) return
          if (window.OneSignal && window.__ONESIGNAL_READY__) break
          await new Promise(r => setTimeout(r, 100))
        }
        if (cancelled) return

        const OS = window.OneSignal
        if (!OS) { setStatus('unsupported'); return }
        setOneSignal(OS)

        // Detectar estado actual — todo en try/catch defensivo
        try {
          const isSupported = OS.Notifications?.isPushSupported?.() ?? true
          if (!isSupported) { setStatus('unsupported'); return }
        } catch (e) {
          setStatus('unsupported'); return
        }

        try {
          const permission = OS.Notifications?.permission
          const optedIn = OS.User?.PushSubscription?.optedIn

          if (permission === 'denied') setStatus('denied')
          else if (optedIn) setStatus('subscribed')
          else setStatus('unsubscribed')
        } catch (e) {
          setStatus('unsubscribed')
        }

        // Listener para cambios futuros (defensive)
        try {
          OS.User?.PushSubscription?.addEventListener?.('change', (e) => {
            if (cancelled) return
            try {
              setStatus(e?.current?.optedIn ? 'subscribed' : 'unsubscribed')
            } catch {}
          })
        } catch {}
      } catch (e) {
        // No bloquear la app por error de OneSignal
        setStatus('unsupported')
      }
    }
    checkReady()
    return () => { cancelled = true }
  }, [])

  const subscribe = async () => {
    if (!oneSignal) return false
    try {
      // Timeout de 30s para evitar que cuelgue la UI
      const subscribePromise = oneSignal.User.PushSubscription.optIn()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 30000)
      )
      await Promise.race([subscribePromise, timeoutPromise])
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
      // silencioso
    }
  }

  const setEmail = async (email) => {
    if (!oneSignal || !email) return
    try {
      await oneSignal.User.addEmail(email)
    } catch (e) {
      // silencioso
    }
  }

  return { status, subscribe, unsubscribe, setExternalUserId, setEmail }
}
