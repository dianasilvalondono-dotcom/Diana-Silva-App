// ─────────────────────────────────────────────────────────────
// Analítica de producto — Ronda (PostHog)
//
// Diseño: SEGURO Y LIGERO POR DEFECTO.
//   • Sin VITE_POSTHOG_KEY esto es un no-op total — cero red, cero costo.
//   • PostHog se carga de forma DIFERIDA (dynamic import): solo se descarga
//     cuando hay key, así no engorda el bundle de quien no la tiene.
//   • Los eventos que ocurren mientras PostHog aún carga se ENCOLAN, así no
//     se pierde ni el primer app_opened (la señal base de retención).
//
// Para activarlo:
//   1. Crea cuenta gratis en https://posthog.com (free: 1M eventos/mes).
//   2. Copia tu Project API Key (empieza con "phc_").
//   3. Ponla en .env y en Vercel como VITE_POSTHOG_KEY.
//      (Región EU: agrega VITE_POSTHOG_HOST=https://eu.i.posthog.com)
// ─────────────────────────────────────────────────────────────
const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let ph = null          // instancia de PostHog una vez cargada
let enabled = false    // hay key y arrancamos la carga
const queue = []       // llamadas hechas antes de que PostHog terminara de cargar

// Ejecuta contra PostHog si ya cargó; si no, encola hasta que cargue.
function withPH(fn) {
  if (ph) { try { fn(ph) } catch { /* nunca romper la app */ } }
  else if (enabled) queue.push(fn)
}

export function initAnalytics() {
  if (!KEY || enabled) return
  enabled = true
  import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        // Solo creamos perfil de persona al identificar (ahorra cuota).
        person_profiles: 'identified_only',
        // App de una sola pantalla (PWA): usamos eventos propios, no pageviews.
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: false,
      })
      ph = posthog
      // Desahogar lo que ocurrió mientras cargaba, en orden.
      while (queue.length) { try { queue.shift()(posthog) } catch { /* no-op */ } }
    })
    .catch((e) => {
      enabled = false
      queue.length = 0
      console.warn('[analytics] no se pudo cargar PostHog:', e?.message)
    })
}

// Vincula los eventos a la usuaria de Supabase (base de la retención D1/D7/D30).
export function identifyUser(userId, props = {}) {
  if (!userId) return
  withPH((posthog) => posthog.identify(userId, props))
}

export function setUserProps(props = {}) {
  withPH((posthog) => posthog.setPersonProperties(props))
}

export function track(event, props = {}) {
  withPH((posthog) => posthog.capture(event, props))
}

// Al cerrar sesión, desvincula para no mezclar usuarias en un dispositivo.
export function resetAnalytics() {
  withPH((posthog) => posthog.reset())
}
