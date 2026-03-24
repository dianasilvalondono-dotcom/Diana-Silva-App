import { useEffect, useState } from 'react'
import OneSignal from 'react-onesignal'

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '7ae00782-88c2-4963-a660-aa62a85891ad'

export function useNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!APP_ID || window.__oneSignalInit) return
    window.__oneSignalInit = true

    OneSignal.init({
      appId: APP_ID,
      serviceWorkerPath: '/sw.js',
      promptOptions: {
        slidedown: {
          prompts: [{
            type: 'push',
            autoPrompt: false, // We'll trigger manually
            text: {
              actionMessage: '¿Quieres que Ronda te recuerde tus hábitos y rutinas?',
              acceptButton: 'Sí, recuérdame',
              cancelButton: 'Ahora no',
            }
          }]
        }
      },
      notificationClickHandlerMatch: 'origin',
      autoResubscribe: true,
    }).then(() => {
      setIsReady(true)
      OneSignal.Notifications.isPushSupported() &&
        OneSignal.Notifications.permission && setIsSubscribed(true)
    })
  }, [])

  const requestPermission = async () => {
    if (!isReady) return false
    try {
      await OneSignal.Slidedown.promptPush()
      const perm = OneSignal.Notifications.permission
      setIsSubscribed(perm)
      return perm
    } catch {
      return false
    }
  }

  return { isSubscribed, isReady, requestPermission }
}
