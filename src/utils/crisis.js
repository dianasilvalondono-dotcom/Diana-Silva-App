/* Detección de crisis compartida entre la app (src/App.jsx) y la Guía IA
   (api/guia.js). Una sola lista de patrones y un solo texto de respuesta:
   si se cambian aquí, cambian en los dos lados.

   Ante la duda, preferimos activar ayuda real. */

// Normaliza para detectar crisis sin importar acentos ni mayúsculas.
export function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Señales de crisis de alto riesgo.
export const CRISIS_PATTERNS = [
  /\bsuicid/, /quitarme la vida/, /acabar con mi vida/, /matarme/, /me quiero morir/,
  /quiero morir/, /no quiero (vivir|seguir viviendo|seguir aca|seguir aqui)/,
  /mejor no estar/, /acabar con todo/, /hacerme dano/, /lastimarme/, /cortarme/,
  /\bautolesion/, /me estoy cortando/,
  /me viol/, /abuso sexual/, /me esta pegando/, /me pega/, /me golpea/, /me maltrata/,
  /estoy en peligro/, /me va a matar/, /amenaza de muerte/,
]

export function isCrisis(content) {
  const n = normalize(content)
  return CRISIS_PATTERNS.some((re) => re.test(n))
}

// Nombre del botón que abre las herramientas de crisis, tal como se ve en el
// encabezado de la app (arriba a la derecha). Si se renombra el botón, se
// cambia aquí y los textos de crisis lo siguen.
export const BOTON_AYUDA = 'Ayuda'

// Respuesta fija de la Guía IA ante una señal de crisis (sin pasar por el modelo).
export const CRISIS_TEXT =
  `Lo que me cuentas es muy importante, y no tienes que cargarlo sola. Yo soy la Guía IA de Ronda, y para esto necesitas a una persona real ahora mismo. Toca el botón "${BOTON_AYUDA}", arriba a la derecha de la app, para herramientas inmediatas, y comunícate ya con la Línea 106 (salud mental, gratuita y confidencial en Colombia). Si estás en peligro inmediato, llama al 123. Estoy contigo, y quiero que hables con alguien que pueda acompañarte de verdad en este momento. 💛`
