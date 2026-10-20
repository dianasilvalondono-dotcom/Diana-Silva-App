/* Detección de crisis compartida entre la app (src/App.jsx), la Guía IA
   (api/guia.js) y Tu Ronda (api/agent.js). Una sola lista de patrones y los
   mismos números de ayuda: si se cambian aquí, cambian en todos lados.
   Sin dependencias de navegador ni de Node: lo importan los dos.

   Ante la duda, preferimos activar ayuda real. */

// Normaliza para detectar crisis sin importar acentos ni mayúsculas.
export function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// El texto tal como lo leen los patrones: normalizado, con los signos, los
// emojis y los saltos de línea como un solo espacio ("me quiero... morir",
// "me-quiero-morir"), las letras alargadas una sola vez ("me quierooo
// morirrr") y las abreviaturas de chat más comunes ("kiero", "q", "x").
// También la ortografía de chat de las palabras de crisis: "kero", "qero" y
// "quero" (quiero), "mequiero", "bivir" y "bida" (vivir, vida).
function textoParaCrisis(content) {
  return ` ${normalize(content)} `
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/(\p{L})\1{2,}/gu, '$1')
    .replace(/ me(?=[kq]u?i?ero )/g, ' me ')
    .replace(/ [kq](?=[ei])/g, ' qu')
    .replace(/ quero(?= )/g, ' quiero')
    .replace(/ b(?=(ivir|iviendo|ida|iva|ivo) )/g, ' v')
    .replace(/ (q|k) /g, ' que ').replace(/ (q|k) /g, ' que ')
    .replace(/ (xq|pq|porq) /g, ' porque ')
    .replace(/ x /g, ' por ').replace(/ x /g, ' por ')
    .trim()
}

// Lo que viene después de "cortar(me)" cuando no es una crisis: el pelo, las
// uñas, el fleco… ("me quiero cortar el pelo").
const NO_ES_PELO = '(?!( (el|la|los|las|mi|mis|un|una))? (pelo|cabello|unas|fleco|flequillo|pollina|capul|cerquillo|puntas|barba|melena)\\b)'

// Lo que viene después de "morir(me)" cuando es una exageración cómica y no
// una crisis: "me quiero morir de (la) risa", "quiero morirme de la
// vergüenza", "de la pena ajena". Solo esas: "morirme de amor" ("me quiero
// morir de amor, no puedo más"), "de tristeza", "de pena" o "de dolor" sí
// activan ayuda. Ante la duda, se activa.
const NO_ES_RISA = '(?!(me)? de (la )?(risa|verguenza|pena ajena)\\b)'

// Lo que viene después de "matar(me)" cuando exagera el esfuerzo: "me voy a
// matar estudiando", "matarme en el gym".
const NO_ES_ESFUERZO = '(?! (estudiando|trabajando|entrenando|corriendo|haciendo (ejercicio|deporte|tareas)|en el (gym|gimnasio|trabajo)|de (la )?risa)\\b)'

// Lo que viene después de "me corté" o "me hice daño" cuando fue un
// accidente: "el dedo cocinando", "en la rodilla", "jugando", "con una hoja
// de papel". "Me corté", "me corté las muñecas" o "con una hoja" sí activan.
const NO_ES_ACCIDENTE = '(?!( (el|la|un|una|mi|con (el|la|un|una)|en (el|la|un|una|mi)))? (dedos?|rodilla|tobillo|pies?|espalda|cocinando|picando|afeitando(me)?|depilando(me)?|jugando|entrenando|corriendo|bailando|gimnasio|gym|(hoja de )?papel|lata)\\b)'

// Lo que viene después de "me pega" o "me pegó" cuando no es un golpe: "me
// pegó la gripa", "un susto", "se me pegó la canción".
const NO_ES_GRIPA = '(?! (la|una|un|el|los) (gripa|gripe|susto|virus|resfriado|resfrio|tos|chicle|moda|cancion|mania|costumbre|piojos|varicela|covid)\\b)'

// Lo que viene después de "me golpeó" o "me pegó" cuando lo que golpea es
// la vida: "me golpeó la noticia", "me pegó duro la tusa".
const NO_ES_NOTICIA = '(?!( (muy )?(fuerte|duro))? (la|el|esa|ese|esta|este) (realidad|noticia|vida|crisis|perdida|muerte|nostalgia|tristeza|ansiedad|cansancio|estres|duelo|tusa|pandemia)\\b)'

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

// Lo que viene después de "terminar con mi vida" o "ponerle fin a mi vida"
// cuando habla de una etapa y no de una crisis: "con mi vida social", "mi
// vida de soltera", "mi vida como la conocía".
const NO_ES_ETAPA = '(?! (social|universitaria|laboral|amorosa|sentimental|sexual|academica|profesional|nocturna|digital|financiera|anterior|pasada|actual|vieja|sedentaria|rutinaria|desordenada|caotica|aburrida|toxica|monotona|estresante|de (soltera|casada|estudiante|fiesta|rumba|pareja|antes|excesos)|en pareja|como la conocia|como era)\\b)'

// Lo que viene después de "terminar con todo" cuando dice con qué: "con
// todo lo pendiente", "con todo el trabajo". "Con todo esto" sí activa.
const NO_ES_PENDIENTE = '(?! (lo|los|las|el|la|mi|mis|tu|tus|su|sus|ese|esa|esos|esas|eso|este|estos|estas|a tiempo|antes de|rapido|temprano|pendiente)\\b)'

// "Ponerle fin", "darle punto final" ("al final, a todo le encuentro el lado
// bueno" no es una crisis).
const PONER_FIN = '\\b(poner|ponerle|pongo|pondre|pondria|puse|dar|darle|doy|dare|daria|di) (\\w+ )?(fin|final|un final|punto final)'

// "Me quiero…", "me voy a…": la intención, en sus formas más comunes.
const ME_QUIERO = '\\bme (quiero|quise|queria|voy a|iba a|quisiera|dan ganas de|provoca|gustaria|pienso)'

// "Me mato" o "me suicido" en presente cuando dice la intención: "mejor me
// mato", "juro que me mato", "si me deja me mato", "me mato y ya". "Me mato"
// a secas no: sin tildes es "me mató" ("ese examen me mató", "me mató el
// tráfico"), y tampoco "me mato por mis hijos" ni "si me caigo me mato".
const NO_ES_ME_MATO = `${NO_ES_ESFUERZO}(?! (el|la|los|las|un|una|ese|esa|eso|por (mis|mi|ti|ellos|ellas|ella|el|ustedes))\\b)`
const ME_MATO = `(\\b(mejor|yo|juro que|(un|algun|cualquier) dia( de estos)?|ahora si|esta noche|manana|hoy mismo|ya mismo|de una vez)|\\bsi (?!(me )?(caigo|resbalo|tropiezo)\\b)(\\w+ ){0,4}\\w+) me (mato|suicido)\\b${NO_ES_ME_MATO}|\\bme (mato|suicido) (y ya|y se acaba|de una vez|esta noche|manana|hoy mismo|si (no|me|te|se|lo|la|le|el|ella|mi|manana))\\b`

// Tirarse, lanzarse, botarse, saltar o brincar (con "me" o sin él, en
// presente, pasado, futuro y condicional): "me voy a tirar", "voy a
// tirarme", "me lancé", "saltaré", "quiero brincar". "Salto" no entra: "un
// salto al vacío" es también emprender.
const TIRARME = '(\\bme (\\w+ ){0,2}(tir|lanz|lanc|bot|avent|arroj|ech|salt)(ar|o|e|are|aria|aba)|\\b(tir|lanz|bot|avent|arroj|ech)arme|\\b(salt|brinc)(ar|are|aria|aba)|\\b(salte|brinco|brinque))'
// Desde dónde o hacia dónde: un lugar alto, el vacío, un vehículo, la vía.
// "Al piso" o "a la cama" no; "del quinto piso" o "del piso 10", sí.
const LUGAR_ALTO = '(de|del|desde|por|al|a|hacia|contra|frente a|frente al|debajo de|debajo del|bajo|a las (llantas|ruedas) de|a las (llantas|ruedas) del) ((el|la|los|las|un|una|este|esta|ese|esa|mi|lo alto de|lo alto del|lo mas alto de|lo mas alto del) )?(vacio|puentes?|edificio|ventana|balcon|terraza|techo|azotea|precipicio|abismo|barranco|risco|acantilado|penasco|viaducto|mirador|torre|metro|tren|transmilenio|carros?|bus|buses|buseta|camion|tractomula|rio|vias?|carrilera|rieles|carretera|autopista|(\\d+|primer|segundo|tercer|cuarto|quinto|sexto|septimo|octavo|noveno|decimo|ultimo) piso|piso \\d+)\\b'

// Señales de crisis de alto riesgo.
export const CRISIS_PATTERNS = [
  /\bsu(i[cs]|c)id/, /\bquitar(me|se)? la vida\b/, new RegExp(`matarme\\b${NO_ES_ESFUERZO}`), new RegExp(`me quiero morir${NO_ES_RISA}`),
  new RegExp(`quiero morir${NO_ES_RISA}`), /no quiero (vivir|seguir viviendo|seguir aca|seguir aqui)/,
  /mejor no estar/, /acabar con todo/, /hacerme dano/, /lastimarme/, new RegExp(`cortarme\\b${NO_ES_PELO}`),
  /\bautolesion/, /me estoy cortando/,
  /me viol/, /abuso sexual/, /me esta pegando/, new RegExp(`me pega\\w*\\b${NO_ES_GRIPA}`), /me golpea/, /me maltrata/,
  /estoy en peligro/, /me va a matar/, /amenaza de muerte/,
  // Formas frecuentes que no caían en las de arriba (ia-5): "me quiero
  // matar/cortar", "me voy a matar", "tengo ganas de morirme", "me hago
  // daño", "quisiera estar muerta". Cortar(se) no cuenta cuando es el pelo,
  // las uñas o el fleco.
  new RegExp(`${ME_QUIERO} (matar|suicidar|ahorcar|envenenar|lastimar|hacer dano)\\b${NO_ES_ESFUERZO}`),
  new RegExp(`${ME_QUIERO} cortar\\b${NO_ES_PELO}`),
  new RegExp(`\\bme corto\\b${NO_ES_PELO}`),
  /cortar(me)? (las|mis) venas/,
  new RegExp(`ganas de (morir(me)?\\b${NO_ES_RISA}|matarme\\b${NO_ES_ESFUERZO}|suicidarme|no despertar|no existir)`),
  /\b(quiero|quisiera|prefiero|preferiria|me gustaria|desearia|ojala|deseo) (estar |estuviera |estuviese )?muert[ao]s?\b/,
  new RegExp(`\\b(quiero|quisiera|queria|prefiero|preferiria|me gustaria|desearia|deseo|deseaba|provoca) morir(me)?\\b${NO_ES_RISA}`),
  /\bojala (me muera|no despertar|no despierte|no amanecer)/,
  /\bme (hago|estoy haciendo|sigo haciendo) dano\b/, /\bme lastimo\b/,
  /no vale la pena (vivir|seguir)/, /estarian mejor sin mi/,
  // Formas que no caían (verificación final, unas 60 de 142 frases reales).
  // Quitarse la vida, desaparecer, no existir, no despertar, no seguir:
  new RegExp(`${ME_QUIERO} quitar la vida`),
  new RegExp(`\\b(quiero|quisiera|me gustaria|desearia|deseo|ojala pudiera|ganas de|me provoca|pienso en|pensando en|pensado en) desaparecer(me)?\\b${NO_ES_REDES}`),
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
  new RegExp(ME_MATO),
  /\bno me importa(ria)? (si me muero|si muero|morir(me)?)\b/,
  /\bno (le )?(veo|encuentro|tiene|hay) (ningun )?sentido (a |de |en )?(la |mi )?(vida|vivir|seguir)\b/,
  /\b(mi|la) vida no tiene (ningun )?sentido\b/, /\bya nada tiene sentido\b/,
  /\bcarta de despedida\b/,
  // Los métodos: tirarse de un lugar alto o a un vehículo, pastillas o
  // veneno, colgarse, un tiro. "Colgarse con los pagos" es atrasarse.
  new RegExp(`${TIRARME} ${LUGAR_ALTO}`),
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
  // Revisión sistemática (verbos, tiempos y formas con y sin "me").
  // Terminar, acabar, quitar o ponerle fin a la propia vida: "quiero terminar
  // con mi vida", "me quito la vida", "le voy a poner fin a mi vida".
  new RegExp(`\\b(acab|termin)\\w* (con )?mi (propia )?vida\\b${NO_ES_ETAPA}`),
  new RegExp(`${PONER_FIN} a mi (propia )?vida\\b${NO_ES_ETAPA}`),
  /\bme (\w+ ){0,3}quit(o|e|are|aria|aba|ar) la vida\b/,
  new RegExp(`\\b(terminar|termino|terminare|terminaria|acabo|acabare|acabaria) con todo\\b${NO_ES_PENDIENTE}`),
  new RegExp(`${PONER_FIN} a todo\\b${NO_ES_PENDIENTE}`),
  // Morir con "me" delante y en pasado: "me quisiera morir", "me quería morir".
  new RegExp(`\\bme (quise|queria|quisiera|dan ganas de|daban ganas de|provoca|provocaba|gustaria) morir(me)?\\b${NO_ES_RISA}`),
  // Futuro y condicional: "me mataré", "me suicidaría", "me cortaré".
  new RegExp(`\\bme (matare|mataria|suicidare|suicidaria|ahorcare|ahorcaria|envenenare|envenenaria|disparare|dispararia|lastimare|lastimaria)\\b${NO_ES_ESFUERZO}`),
  new RegExp(`\\bme (cortare|cortaria)\\b${NO_ES_PELO}`),
  /\b(envenenarme|dispararme)\b/, new RegExp(`${ME_QUIERO} disparar\\b`),
  /\bdejarme (atropellar|pisar)\b/,
  // Pastillas: diez o más, "todo el frasco", "me las voy a tomar todas".
  /\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) ([1-9]\d+|diez|quince|veinte|treinta|cuarenta|cincuenta|cien|demasiadas|toda la caja de|todo el frasco de|el frasco de) (pastillas|pepas|pildoras|medicinas|medicamentos|tabletas|capsulas|pastas)\b/,
  /\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) (todo el (frasco|tarro|blister)|toda la caja|el (frasco|tarro) (entero|completo))\b/,
  /\bme las (\w+ ){0,2}(tomar|tome|tomo|tragar|trague|trago) todas\b/,
  /\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) (las|mis) (pastillas|pepas|pildoras|medicinas|medicamentos|tabletas|capsulas|pastas) todas\b(?! (las|los)\b)/,
  // Sin ganas de vivir: "estoy cansada de vivir", "perdí las ganas de vivir",
  // "para qué seguir viviendo", "no quiero seguir con vida".
  new RegExp(`\\b(cansada|cansado|harta|harto|agotada|agotado|aburrida|aburrido) de (vivir|estar viva|estar vivo|existir|la vida)\\b${NO_ES_VIVIR_CON}`),
  new RegExp(`\\bme (canse|harte|aburri) de (vivir|existir|la vida)\\b${NO_ES_VIVIR_CON}`),
  new RegExp(`\\b(no tengo|ya no tengo|sin|perdi las|no me quedan|se me fueron las|se me acabaron las) (ganas|razones|motivos|fuerzas) (de|para) (vivir|seguir viviendo|seguir con vida|existir)\\b${NO_ES_VIVIR_CON}`),
  /\bno tengo (por|para) que (vivir|seguir)\b/,
  new RegExp(`(^|\\b(y|pero|entonces|no se|me pregunto|pienso|preguntando) )para que (vivir|seguir viviendo|seguir con vida|existir|sigo viva|sigo vivo)\\b${NO_ES_VIVIR_CON}`),
  new RegExp(`\\bno aguanto (mas )?(vivir|la vida|esta vida|seguir viviendo|seguir con vida|existir)\\b${NO_ES_VIVIR_CON}`),
  /\bno quiero seguir con vida\b/,
  /\bdormir(me)? para siempre\b/,
  /\bno (quiero|quisiera|deseo) (volver a )?amanecer\b(?! (tan|muy|cansada|agotada|con|de|en|sin|temprano|trasnochada)\b)/,
  // Sentirse una carga o creer que nadie la extrañaría.
  /\b(soy|me siento|siento que soy) (una|un) carga\b/,
  /\bnadie (me )?(extranaria|echaria de menos|notaria|lloraria)\b/,
  /\bnadie le (importaria|importa) si (me muero|muero|desaparezco|no estoy|me mato|me voy)\b/,
  /\b(pienso|pense|pensando|pensado|penso|pensar) (\w+ ){0,3}en (morir(me)?|la muerte|no (despertar|existir|estar))\b(?! de (la )?(risa|verguenza|pena ajena|mi|mis|su|sus|el|la|los|las|un|una|alguien)\b)/,
  // Violencia: "mi esposo me pegó", "me golpearon", "me tiene encerrada",
  // "me obliga a tener sexo", "me amenaza con…", "le tengo miedo a mi pareja".
  new RegExp(`\\bme (pego|pegaron|pegaban)\\b${NO_ES_GRIPA}${NO_ES_NOTICIA}`),
  new RegExp(`\\bme (golpeo|golpearon|golpeaba|golpeaban|golpean)\\b${NO_ES_NOTICIA}`),
  /\bme (ahorco|ahorcaron|estrangula|estrangulo|estrangularon|cachetea|cacheteo|cachetearon|abofeteo|violaron|encerro|encerraron)\b/,
  /\bme (tiene|tienen|tenia|tenian) encerrada\b/,
  /\bme (\w+ )?(obliga|obligo|obligan|obligaron|obligaba|fuerza|forza|forzo|forzaron) a (tener (sexo|relaciones)|acostarme|desnudarme)\b/,
  /\bme (amenaza|amenazo|amenazan|amenazaron|amenazaba) (de muerte|con (matarme|pegarme|hacerme dano|quitarme (a )?mis hijos|llevarse (a )?mis hijos|publicar|un cuchillo|un arma|una pistola|matarse|suicidarse))\b/,
  /\b(miedo|terror|panico) (de|a) mi (esposo|marido|pareja|novio|ex|papa|padrastro|exesposo|expareja)\b/,
  /\bme (toca|toco|tocan|tocaron|tocaba|manosea|manoseo|manosearon) (\w+ ){0,3}sin (mi )?(permiso|consentimiento|querer)\b/, /\bme (manosea|manoseo|manosearon|manoseaba)\b/,
]

export function isCrisis(content) {
  const n = textoParaCrisis(content)
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
