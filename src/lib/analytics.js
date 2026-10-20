// ─────────────────────────────────────────────────────────────
// Analítica de producto — Ronda (PostHog)
//
// Diseño: SEGURO Y LIGERO POR DEFECTO.
//   • Sin VITE_POSTHOG_KEY esto es un no-op total — cero red, cero costo.
//   • PostHog se carga de forma DIFERIDA (dynamic import): solo se descarga
//     cuando hay key, así no engorda el bundle de quien no la tiene.
//   • Los eventos que ocurren mientras PostHog aún carga se ENCOLAN, así no
//     se pierde ni el primer app_opened (la señal base de retención).
//   • Solo arranca con la autorización de cuenta (Decreto 1377, art. 5):
//     App llama initAnalytics() cuando ella ya la dio. Antes de eso, todo lo
//     que se mande aquí se descarta (ni se encola).
//   • Sin grabación de sesiones, sin autocaptura, sin mapas de calor, sin
//     clics muertos, sin errores automáticos y sin encuestas: todo eso puede
//     llevar texto de la pantalla (el diario, el chat), y la política promete
//     que PostHog nunca recibe lo que escribes.
//   • Sin ubicación calculada por la IP ($geoip_disable en cada evento): la
//     política dice que Ronda no calcula dónde estás.
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
        // Solo los eventos propios de la app (track): nada se captura solo.
        autocapture: false,
        rageclick: false,
        capture_dead_clicks: false,
        capture_heatmaps: false,
        // Un error puede llevar en su mensaje texto de la pantalla.
        capture_exceptions: false,
        capture_performance: false,
        // Por si algo se prendiera: ni el texto ni los atributos de la pantalla.
        mask_all_text: true,
        mask_all_element_attributes: true,
        // Sin la parte de la URL después de # (ahí pueden ir tokens de la sesión).
        disable_capture_url_hashes: true,
        // Aunque alguien la prenda en el panel de PostHog, aquí queda apagada.
        disable_session_recording: true,
        disable_surveys: true,
        // Ni grabación, ni encuestas, ni nada que el panel quiera cargar.
        disable_external_dependency_loading: true,
        // La IP: en posthog-js 1.415 la opción `ip` del cliente ya no hace
        // nada. Se descarta en el panel del proyecto («Discard client IP
        // data»): acción pendiente de Diana.
        // Que PostHog no calcule ciudad ni coordenadas a partir de la IP
        // (la transformación GeoIP deja pasar sin tocar todo evento que trae
        // $geoip_disable). Vale para todos, también $identify y $set. Además,
        // Diana apaga GeoIP en el panel (lo-que-hace-diana-antes-de-publicar).
        before_send: (ev) => {
          if (ev) ev.properties = { ...(ev.properties || {}), $geoip_disable: true }
          return ev
        },
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
