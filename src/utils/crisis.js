/* Detección de crisis compartida entre la app (src/App.jsx), la Guía IA
   (api/guia.js) y Tu Ronda (api/agent.js). Una sola lista de patrones y los
   mismos números de ayuda: si se cambian aquí, cambian en todos lados.
   Sin dependencias de navegador ni de Node: lo importan los dos.

   Ante la duda, preferimos activar ayuda real. */

// Normaliza para detectar crisis sin importar acentos ni mayúsculas.
export function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Lo que viene después de "cortar(me)" cuando no es una crisis: el pelo, las
// uñas, el fleco… ("me quiero cortar el pelo").
const NO_ES_PELO = '(?!( (el|la|los|las|mi|mis|un|una))? (pelo|cabello|unas|fleco|flequillo|pollina|capul|cerquillo|puntas|barba|melena)\\b)'

// Lo que viene después de "morir(me)" cuando es una exageración y no una
// crisis: "me quiero morir de (la) risa", "quiero morirme de la vergüenza",
// "de la pena ajena", "de amor por este perrito". Solo esas: "morirme de
// tristeza", "de pena" o "de dolor" sí activan ayuda.
const NO_ES_RISA = '(?!(me)? de (la )?(risa|verguenza|pena ajena|amor|ternura)\\b)'

// Lo que viene después de "matar(me)" cuando exagera el esfuerzo: "me voy a
// matar estudiando", "matarme en el gym".
const NO_ES_ESFUERZO = '(?! (estudiando|trabajando|entrenando|corriendo|haciendo (ejercicio|deporte|tareas)|en el (gym|gimnasio|trabajo)|de (la )?risa)\\b)'

// Lo que viene después de "me corté" o "me hice daño" cuando fue un
// accidente: "el dedo cocinando", "en la rodilla", "jugando", "con una hoja
// de papel". "Me corté", "me corté las muñecas" o "con una hoja" sí activan.
const NO_ES_ACCIDENTE = '(?!( (el|la|un|una|mi|con (el|la|un|una)|en (el|la|un|una|mi)))? (dedos?|rodilla|tobillo|pies?|espalda|cocinando|picando|afeitando(me)?|depilando(me)?|jugando|entrenando|corriendo|bailando|gimnasio|gym|(hoja de )?papel|lata)\\b)'

// Lo que viene después de "despertar(me)" cuando habla del sueño y no de
// una crisis: "no despertarme en la noche", "tan temprano", "a las 3", "a
// mi bebé", "cansada". "No quiero despertar" o "mañana" sí activan.
const NO_ES_SUENO = '(?!(me)? (en la (noche|madrugada)|a|al|de (madrugada|noche)|(tan |muy )?temprano|cada|tantas|varias|mil|seguido|tan seguido|con|por|cansada)\\b)'

// Lo que viene después de "dejar de vivir" cuando es una meta y no una
// crisis: "con ansiedad", "en el pasado", "para los demás".
const NO_ES_VIVIR_CON = '(?! (con|en|para|de|del|por|pendiente|bajo|sin|a medias|al dia|a la|al|preocupada|estresada|angustiada|corriendo|apurada)\\b)'

// Lo que viene después de "ya no quiero seguir" cuando dice con qué: "con mi
// novio", "en este trabajo", "estudiando eso". "Así" o "con esto" sí activan.
const NO_ES_ALGO = '(?! (con|en|de|haciendo|trabajando|estudiando|siendo|pensando|esperando|intentando) (mi|mis|el|la|los|las|este|esta|estos|estas|ese|esa|esos|esas|un|una|eso|ellos|ella|tu|su|sus|nuestra|nuestro)\\b)'

// Lo que viene después de "desaparecer" cuando no es una crisis: "de las
// redes", "del grupo", "de la vergüenza".
const NO_ES_REDES = '(?! (de|del) (las |los |mi |mis |el |la )?(redes|instagram|whatsapp|facebook|tiktok|internet|celular|grupo|chat|verguenza|risa|pena ajena)\\b)'

// "Me quiero…", "me voy a…": la intención, en sus formas más comunes.
const ME_QUIERO = '\\bme (quiero|voy a|quisiera|dan ganas de|provoca|gustaria|pienso)'

// Señales de crisis de alto riesgo.
export const CRISIS_PATTERNS = [
  /\bsuicid/, /quitarme la vida/, /acabar con mi vida/, new RegExp(`matarme\\b${NO_ES_ESFUERZO}`), new RegExp(`me quiero morir${NO_ES_RISA}`),
  new RegExp(`quiero morir${NO_ES_RISA}`), /no quiero (vivir|seguir viviendo|seguir aca|seguir aqui)/,
  /mejor no estar/, /acabar con todo/, /hacerme dano/, /lastimarme/, new RegExp(`cortarme\\b${NO_ES_PELO}`),
  /\bautolesion/, /me estoy cortando/,
  /me viol/, /abuso sexual/, /me esta pegando/, /me pega/, /me golpea/, /me maltrata/,
  /estoy en peligro/, /me va a matar/, /amenaza de muerte/,
  // Formas frecuentes que no caían en las de arriba (ia-5): "me quiero
  // matar/cortar", "me voy a matar", "tengo ganas de morirme", "me hago
  // daño", "quisiera estar muerta". Cortar(se) no cuenta cuando es el pelo,
  // las uñas o el fleco.
  new RegExp(`${ME_QUIERO} (matar|suicidar|ahorcar|envenenar|lastimar|hacer dano)\\b${NO_ES_ESFUERZO}`),
  new RegExp(`${ME_QUIERO} cortar\\b${NO_ES_PELO}`),
  new RegExp(`\\bme corto\\b${NO_ES_PELO}`),
  /cortar(me)? (las|mis) venas/,
  /ganas de (morir|morirme|matarme|suicidarme|no despertar)/,
  /\b(quiero|quisiera|prefiero|preferiria|me gustaria|desearia|ojala|deseo) (estar |estuviera |estuviese )?muert[ao]s?\b/,
  new RegExp(`\\b(quiero|quisiera|prefiero|preferiria|me gustaria|desearia|deseo|provoca) morirme\\b${NO_ES_RISA}`),
  /\bojala (me muera|no despertar|no despierte|no amanecer)/,
  /\bme (hago|estoy haciendo|sigo haciendo) dano\b/, /\bme lastimo\b/,
  /no vale la pena (vivir|seguir)/, /estarian mejor sin mi/,
  // Formas que no caían (verificación final, unas 60 de 142 frases reales).
  // Quitarse la vida, desaparecer, no existir, no despertar, no seguir:
  new RegExp(`${ME_QUIERO} quitar la vida`),
  new RegExp(`\\b(quiero|quisiera|me gustaria|desearia|deseo|ojala pudiera) desaparecer(me)?\\b${NO_ES_REDES}`),
  /\bdejar de existir\b/, /\bno (quiero|quisiera|deseo) existir\b/,
  /\bir(me)? de este mundo\b/,
  /\b(me quiero ir|quiero irme|me voy a ir|me gustaria irme|quisiera irme) para siempre\b(?! (a|al)\b| de (?!esta vida|este mundo))/,
  new RegExp(`dormir(me)? y no (volver a )?despertar(me)?\\b${NO_ES_SUENO}`),
  new RegExp(`\\bno (quiero|quisiera|deseo) (volver a )?despertar(me)?\\b${NO_ES_SUENO}`),
  new RegExp(`\\bdejar de vivir\\b${NO_ES_VIVIR_CON}`),
  /\bno quiero estar (aqui|aca|en este mundo|viva|vivo)\b/,
  new RegExp(`\\b(ya no quiero seguir|no quiero seguir mas)\\b${NO_ES_ALGO}`),
  /\bque (se acabe|se termine) todo\b/, /\bque todo (se acabe|se termine)\b/,
  new RegExp(`\\bmejor (me muero|me muera|morirme)\\b${NO_ES_RISA}`), /\bmejor (estar|estaria) muert[ao]/,
  /\bno me importa(ria)? (si me muero|si muero|morir(me)?)\b/,
  /\bno (le )?(veo|encuentro|tiene|hay) (ningun )?sentido (a |de |en )?(la |mi )?(vida|vivir|seguir)\b/,
  /\b(mi|la) vida no tiene (ningun )?sentido\b/, /\bya nada tiene sentido\b/,
  /\bcarta de despedida\b/,
  // Los métodos: tirarse de un lugar alto o a un vehículo, pastillas o
  // veneno, colgarse, un tiro. "Colgarse con los pagos" es atrasarse.
  /(\bme (\w+ ){0,2}(tirar|lanzar|botar|aventar|tiro|lanzo|boto|tire|lance|bote)|\b(tirarme|lanzarme|botarme|aventarme)) (de|del|desde|por|al|a la|a las|a los|frente al|frente a la|debajo del?) (un |una |el |la |los |las |este |esta |mi )?(puente|edificio|ventana|balcon|terraza|techo|azotea|precipicio|abismo|barranco|risco|metro|tren|transmilenio|carros?|bus|buses|camion|rio|via|vias|carretera|autopista)\b/,
  /\b(ojala|quiero que|quisiera que) me (atropelle|atropellen|pise)\b/, /\bojala me (mate|maten)\b/,
  /\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) (todas (las|mis)|un frasco de|un tarro de|una caja de|un monton de|un punado de|muchas|varias cajas de) (pastillas|pepas|pildoras|medicinas|medicamentos|tabletas|capsulas|pastas)\b/,
  /\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) (el |la |un |una )?(veneno|raticida|matarratas|cloro|varsol|insecticida)\b/,
  /\bsobredosis\b/,
  /\bahorcarme\b/, new RegExp(`(${ME_QUIERO} colgar|\\bcolgarme)\\b(?! (con|en)\\b)`),
  /(\bdarme|\bpegarme|\bme (\w+ ){0,2}(dar|pegar|pego|doy|di|pegue)) un (tiro|balazo|disparo)\b/, /\bvolarme (la cabeza|los sesos)\b/,
  // Autolesiones ya hechas o que se repiten: "me corté", "me volví a
  // cortar", "me sigo cortando", "me hice daño", "a propósito".
  new RegExp(`\\bme (corte|cortaba|volvi a cortar|sigo cortando|segui cortando|he cortado|he vuelto a cortar|estuve cortando)\\b${NO_ES_PELO}${NO_ES_ACCIDENTE}`),
  new RegExp(`\\bme (hice|he hecho|volvi a hacer|vuelvo a hacer) dano\\b${NO_ES_ACCIDENTE}`),
  /\bme (lastime|lastimo|corte|corto|queme|quemo|golpee|golpeo|pegue|pego|rasgune|rasguno|arane|arano|hice dano|hago dano)\b.{0,30}\ba proposito\b/,
  /\bme (quemo|queme|sigo quemando|estoy quemando|volvi a quemar)\b.{0,30}\b(cigarrillos?|cigarros?|encendedor|fosforos?|yesquero)\b/,
  /\bme (rasguno|rasgune|arano|arane|rasco|pellizco|muerdo|golpeo|pego|corto|lastimo) .{0,20}hasta (sangrar|que (me )?sangre|hacerme sangre)\b/,
  /\bme (pego|golpeo|lastimo|castigo|quemo|corto|hago dano) (yo )?a mi mism[ao]\b/,
  /\b(me golpeo|me pego|golpearme|pegarme) (la cabeza )?contra (la|las) parede?s?\b/,
  // Abuso y amenaza: "me abusaron", "abusa de mí", "miedo de que me mate".
  /\bme (abusaron|abuso|abusa|abusan|abusaba|abusaban|ha abusado|han abusado|esta abusando|estan abusando)\b/,
  /\babus\w* (sexualmente )?de mi\b/,
  /\bque me (mate|maten|vaya a matar|quiera matar|viole|violen)\b/, /\bme (quiere|quieren|quiso|intento|trato de) matar\b/,
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

// La misma respuesta, dicha por Tu Ronda (el chat de Pregúntale).
export const CRISIS_TEXT_CHAT =
  `Lo que me cuentas es muy importante, y no tienes que cargarlo sola. Soy Tu Ronda, una IA, y para esto necesitas a una persona real ahora mismo. Toca "${BOTON_AYUDA}" para herramientas inmediatas, y comunícate ya con la Línea 106 (salud mental, gratuita y confidencial en Colombia). Si estás en peligro inmediato, llama al 123. Estoy contigo, y quiero que hables con alguien que pueda acompañarte de verdad en este momento. 💛`

// Lo que dice el chat de Tu Ronda cuando no logra conectarse: nunca deja a
// la usuaria sin la salida a Ayuda y a las líneas.
export const CHAT_ERROR_TEXT =
  `No pude conectarme en este momento. Inténtalo de nuevo en un rato. Si estás pasando por un momento difícil, toca "${BOTON_AYUDA}" para herramientas inmediatas o llama a la Línea 106 (gratuita y confidencial). Si estás en peligro inmediato, llama al 123.`
