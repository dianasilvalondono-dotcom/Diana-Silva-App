import { useEffect, useState } from 'react'

const APP_ID = '7ae00782-88c2-4963-a660-aa62a85891ad'

export function useNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (window.__oneSignalInit) return
    window.__oneSignalInit = true

    try {
      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
          appId: APP_ID,
          serviceWorkerPath: '/sw.js',
          promptOptions: {
            slidedown: {
              prompts: [{
                type: 'push',
                autoPrompt: false,
                text: {
                  actionMessage: 'Recibe recordatorios de Ronda',
                  acceptButton: 'Permitir',
                  cancelButton: 'Ahora no',
                }
              }]
            }
          },
          notificationClickHandlerMatch: 'origin',
        })
        setIsReady(true)
        if (OneSignal.Notifications?.permission) setIsSubscribed(true)
      })

      // Load the SDK script if not already loaded
      if (!document.querySelector('script[src*="OneSignalSDK"]')) {
        const s = document.createElement('script')
        s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
        s.defer = true
        document.head.appendChild(s)
      }
    } catch (e) {
      console.warn('OneSignal init failed:', e)
    }
  }, [])

  const requestPermission = async () => {
    try {
      const OneSignal = window.OneSignal
      if (!OneSignal) return false
      await OneSignal.Slidedown.promptPush()
      setIsSubscribed(true)
      return true
    } catch {
      return false
    }
  }

  return { isSubscribed, isReady, requestPermission }
}
