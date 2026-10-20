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
// Y los errores más comunes al escribir rápido: las letras dobles ("me
// quieroo morir", "moriir", "matarr", "pastillass"), las palabras pegadas
// ("noquiero", "yanoquiero", "quieromorir", "mevoy"), "boy", "voi" y "voa"
// (voy a), "me va matar", la r final que se cae ("me quiero mori", "me voy a
// mata"), la b por la v ("bibir", "me bolvi", "me biolaron", "benas"), "golpió"
// (golpeó), "pejó" (pegó), "abuzaron", "ahorkar" y "aorcar", "desapareser",
// "segir" y "pastiyas".
//
// Los signos que cierran una cláusula (. , ; : ! ? ¡ ¿ … las rayas y los
// saltos de línea) quedan como un separador, " | ": isCrisis lee cada
// cláusula por aparte, para que ninguna excepción de las de abajo ("vivir
// con…", "acabar con todo lo…", "desaparecer un día…") lea la palabra que
// viene después de la coma ("no quiero vivir, de verdad"). Con clausulas en
// false, los signos son un espacio más, como antes.
const SEPARADORES = /(?<!\d)[.,]|[.,](?!\d)|[;:!?¡¿…\n\r]|\s[-–—]+\s|[–—]/g
function textoParaCrisis(content, clausulas = true) {
  const t = ` ${normalize(content)} `
  return (clausulas
    ? t.replace(SEPARADORES, ' | ').replace(/[^\p{L}\p{N}|]+/gu, ' ').replace(/ ?(\| ?)+/g, ' | ')
    : t.replace(/[^\p{L}\p{N}]+/gu, ' '))
    .replace(/(\p{L})\1{2,}/gu, '$1')
    .replace(/([aiou])\1/g, '$1')
    .replace(/(\p{L})\1(?= )/gu, '$1')
    .replace(/ ya(?=no[kq]u?i?ero)/g, ' ya ')
    .replace(/ (me|no)(?=[kq]u?i?ero)/g, ' $1 ')
    .replace(/ me(?=(voy|boy|voi) )/g, ' me ')
    .replace(/ ([kq]u?i?ero)(?=(morir|matar|vivir|seguir|suicidar|desaparecer|ahorcar|cortar|existir|estar|dormir|irme))/g, ' $1 ')
    .replace(/ [kq](?=[ei])/g, ' qu')
    .replace(/ quero(?= )/g, ' quiero')
    .replace(/ (boy|voi|vy)(?= a )/g, ' voy')
    .replace(/ voa /g, ' voy a ')
    .replace(/ ba(?= a )/g, ' va')
    .replace(/ (voy|va|vas|van|iba|ba) (?=(matar|suicidar|ahorcar|envenenar|cortar|tirar|lanzar|botar|colgar|disparar|quitar))/g, (m, v) => ` ${v === 'ba' ? 'va' : v} a `)
    .replace(/ (quiero|voy a|va a|vas a|quiere|quieren|quisiera|ganas de) (mori|mata|suicida|ahorca|envenena)(?= )/g, ' $1 $2r')
    .replace(/ morime /g, ' morirme ')
    .replace(/ b(?=(i[bv](ir|iendo|ia|o|a|e)|ida|iol\p{L}*|olv\p{L}*|uelv\p{L}*|enas|enen\p{L}*|ez) )/gu, ' v')
    .replace(/ vib(?=(ir|iendo|ia|o|a|e) )/g, ' viv')
    .replace(/ golpi(?=(o|a|aba|aban|aron|an|ar) )/g, ' golpe')
    .replace(/ pej(?=(o|a|aron|aba|aban|an) )/g, ' peg')
    .replace(/ abuz/g, ' abus')
    .replace(/ (ahork|aorc|aork)/g, ' ahorc')
    .replace(/ desapare[sz](?=er)/g, ' desaparec')
    .replace(/ seg(?=ir )/g, ' segu')
    .replace(/ pastiy?a(?=s? )/g, ' pastilla')
    .replace(/ (q|k) /g, ' que ').replace(/ (q|k) /g, ' que ')
    .replace(/ (xq|pq|porq) /g, ' porque ')
    .replace(/ x /g, ' por ').replace(/ x /g, ' por ')
    .trim()
    .replace(/^(\| ?)+|( ?\|)+$/g, '')
}

// Lo que viene después de "cortar(me)" cuando no es una crisis: el pelo, las
// uñas, el fleco… ("me quiero cortar el pelo").
const NO_ES_PELO = '(?!( (el|la|los|las|mi|mis|un|una))? (pelo|cabello|unas|fleco|flequillo|pollina|capul|cerquillo|puntas|barba|melena)\\b)'

// Lo que viene después de "morir(me)" cuando es una exageración cómica y no
// una crisis: "me quiero morir de (la) risa", "quiero morirme de la
// vergüenza", "de la pena ajena", "del oso", "de los nervios", "de la
// emoción", "de hambre", "de viejita" o "de la ternura con mi bebé" (con lo que
// le da ternura). Solo esas: "morirme de amor" ("me quiero morir de amor, no
// puedo más"), "de ternura" a secas, "de tristeza", "de pena" o "de dolor" sí
// activan ayuda. Ante la duda, se activa.
const NO_ES_RISA = '(?!(me)? (de (la )?ternura (con|por|al|cuando|de)|de (la |los |el )?(risa|verguenza|pena ajena|nervios|emocion|felicidad|alegria|envidia|hambre|sueno|frio|calor|aburrimiento|curiosidad|intriga|vieja|viejita|viejito|anciana|ancianita)|del (oso|susto|frio|calor|hambre|sueno|aburrimiento))\\b)'

// Lo que viene después de "matar(me)" cuando exagera el esfuerzo: "me voy a
// matar estudiando", "matarme en el gym".
const NO_ES_ESFUERZO = '(?! (estudiando|trabajando|entrenando|corriendo|haciendo (ejercicio|deporte|tareas)|en el (gym|gimnasio|trabajo)|de (la )?risa)\\b)'

// Lo que viene después de "me corté" o "me hice daño" cuando fue un
// accidente: "el dedo cocinando", "en la rodilla", "jugando", "con una hoja
// de papel", "con un vidrio lavando platos", "sin querer", "cuando cocino".
// "Me corté", "me corté las muñecas", "con una hoja" o "con un vidrio" sí
// activan.
const NO_ES_ACCIDENTE = '(?!( (el|la|un|una|mi|con (el|la|un|una)|en (el|la|un|una|mi)))? (dedos?|rodilla|tobillo|pies?|espalda|cocinando|picando|afeitando(me)?|depilando(me)?|jugando|entrenando|corriendo|bailando|gimnasio|gym|(hoja de )?papel|lata)\\b)(?!( (con|en) (el|la|un|una|mi) \\w+| cuando estaba| mientras)? (lavando|cocinando|picando|pelando|afeitando(me)?|depilando(me)?|jugando|limpiando|abriendo|arreglando|cortando|trabajando|cosiendo|cargando|haciendo (ejercicio|deporte|yoga|pilates|pesas))\\b| (sin querer|por accidente|accidentalmente|cuando (cocino|cocinaba|lavo|lavaba|pico|trabajo|juego|corro|entreno|me afeito|me depilo|limpio))\\b)'

// Lo que viene después de "me pega" o "me pegó" cuando no es un golpe: "me
// pegó la gripa", "un susto", "se me pegó la canción", "me pegó el sol".
const NO_ES_GRIPA = '(?! (la|una|un|el|los) (gripa|gripe|susto|virus|resfriado|resfrio|tos|chicle|moda|cancion|mania|costumbre|piojos|varicela|covid|sol|calor|frio|sereno|aire|guayabo|bajon|sueno|hambre|antojo)\\b)'

// Lo que va antes de "me pega", "me golpea", "me patea" o "me da patadas"
// cuando es una niña o un niño pequeño: "mi hijo me pega cuando hace
// pataleta", "mi bebé me pega en la cara", "mi hija de 3 me da patadas".
// "Mi hijo de 16 años me pega" o "mi hijo adolescente me golpea" sí activan.
const NO_ES_NINO = '(?<!\\b(beb\\w*|nin[oa]s?|nene|nena|chiquit[oa]s?|hij[oa]s?)( (de )?(\\d|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)( anos?| meses?)?| (pequen[oa]|chiquit[oa]|menor))? )'

// Lo que va antes de "me pegó" cuando lo que golpea es la vida: "la tusa me
// pegó duro", "la noticia me pegó".
const NO_ES_TUSA = '(?<!\\b(tusa|noticia|realidad|vida|crisis|perdida|muerte|nostalgia|tristeza|ansiedad|cansancio|estres|duelo|pandemia|gripa|gripe|sol|calor|guayabo|bajon|depre) )'

// Lo que viene después de "me golpeó" o "me pegó" cuando lo que golpea es
// la vida: "me golpeó la noticia", "me pegó duro la tusa".
const NO_ES_NOTICIA = '(?!( (muy )?(fuerte|duro))? (la|el|esa|ese|esta|este) (realidad|noticia|vida|crisis|perdida|muerte|nostalgia|tristeza|ansiedad|cansancio|estres|duelo|tusa|pandemia)\\b)'

// Lo que viene después de "despertar(me)" cuando habla del sueño y no de
// una crisis: "no despertarme en la noche", "tan temprano", "a las 3", "a
// mi bebé", "cansada", "hasta el lunes". "No quiero despertar" o "mañana" sí
// activan.
const NO_ES_SUENO = '(?!(me)? (en la (noche|madrugada)|a|al|de (madrugada|noche)|(tan |muy )?temprano|cada|tantas|varias|mil|seguido|tan seguido|con|por|cansada|hasta)\\b)'

// Lo que viene después de "dejar de vivir" cuando es una meta y no una
// crisis: "con ansiedad", "en el pasado", "para los demás".
const NO_ES_VIVIR_CON = '(?! (con|en|para|de|del|por|pendiente|bajo|sin|a medias|al dia|a la|al|preocupada|estresada|angustiada|corriendo|apurada)\\b)'

// Lo que viene después de "ya no quiero seguir" cuando dice con qué: "con mi
// novio", "en este trabajo", "estudiando eso". "Así" o "con esto" sí activan.
const NO_ES_ALGO = '(?! (con|en|de|haciendo|trabajando|estudiando|siendo|pensando|esperando|intentando) (mi|mis|el|la|los|las|este|esta|estos|estas|ese|esa|esos|esas|un|una|eso|ellos|ella|tu|su|sus|nuestra|nuestro)\\b)'

// Lo que viene después de "desaparecer" cuando no es una crisis: "de las
// redes", "de este grupo", "de la oficina", "de la vergüenza".
const NO_ES_REDES = '(?! (de|del) (las |los |mi |mis |el |la |este |esta |ese |esa )?(redes|instagram|whatsapp?|faceboo?k|tiktok|internet|celular|grupo|chat|trabajo|oficina|universidad|colegio|reunion|fiesta|verguenza|risa|pena ajena)\\b)'

// Lo que viene después de "desaparecer" cuando dice por cuánto tiempo o qué
// quiere borrar: "un rato", "unos días", "del mapa unos días", "las ojeras",
// "el acné", "mis manchas".
const NO_ES_UN_RATO = '(?!( del mapa| de aqui)? (un rato|unos dias|unas horas|un dia|una semana|unas semanas|un tiempo|un tiempito|un fin de semana|el fin de semana|por un|por unos|por unas|de vacaciones|a la playa)\\b| (las|los|mis|mi|el|la|esas|esos|estas|estos) (ojeras|acne|manchas?|estrias|arrugas|granos|espinillas|cicatrices|celulitis|kilos|libras|barriga|panza|lonjas|vellos?|canas|puntos negros|deudas)\\b)'

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

// "Me quiero…", "me voy a…": la intención, en sus formas más comunes, y el
// intento ("me intenté matar", "me traté de ahorcar").
const ME_QUIERO = '\\bme (quiero|quise|queria|voy a|iba a|quisiera|dan ganas de|provoca|gustaria|pienso|intente|intento|intentaba|he intentado|trate de|trato de|trataba de|he tratado de)'

// "Me mato" o "me suicido" en presente cuando dice la intención: "mejor me
// mato", "juro que me mato", "si me deja me mato", "me mato y ya". "Me mato"
// a secas no: sin tildes es "me mató" ("ese examen me mató", "me mató el
// tráfico"), y tampoco "me mato por mis hijos" ni "si me caigo me mato".
// También "hoy me mato", "ya me mato" y "me mato hoy" ("hoy me mató el
// tráfico", "este trabajo ya me mató" o "el gym me mató hoy" no).
const NO_ES_ME_MATO = `${NO_ES_ESFUERZO}(?! (el|la|los|las|un|una|ese|esa|eso|este|esta|esto|estos|estas|tanto|tanta|mi|mis|por (mis|mi|ti|ellos|ellas|ella|el|ustedes))\\b)`
const NO_ES_SUJETO = '(?<!\\b(el|la|los|las|este|esta|ese|esa|mi|mis|tu|su) \\w+ )'
const ME_MATO = `(\\b(mejor|yo|juro que|(un|algun|cualquier) dia( de estos)?|ahora si|esta noche|manana|hoy mismo|ya mismo|de una vez)|${NO_ES_SUJETO}\\b(hoy|ya)|\\bsi (?!(me )?(caigo|resbalo|tropiezo)\\b)(\\w+ ){0,4}\\w+) me (mato|suicido)\\b${NO_ES_ME_MATO}|\\bme (mato|suicido) (y ya|y se acaba|de una vez|esta noche|manana|hoy mismo|si (no|me|te|se|lo|la|le|el|ella|mi|manana))\\b|${NO_ES_SUJETO}\\bme (mato|suicido) (hoy|ya)( mismo|(?! mismo))\\b${NO_ES_ME_MATO}`

// Lo que va antes de "me va a matar" cuando no es una persona: "el estrés me
// va a matar", "este calor", "el dolor de cabeza".
const NO_ES_COSA = '(?<!\\b(estres|calor|frio|trabajo|trafico|cansancio|examen|parcial|tarea|tareas|guayabo|hambre|sueno|espera|suspenso|intriga|curiosidad|sol|gastritis|migrana|colicos?|gripa|gripe|tos|novela|serie|clima|ruido|bulla|dolor de (cabeza|muela|muelas|espalda|estomago|barriga|garganta|oido|rodilla)) )'
// Lo que viene después de "me va a matar" cuando es un regaño y no una
// amenaza: "de la risa", "la curiosidad", "cuando vea las notas", "si no
// entrego el informe", "en el trabajo si no llego". "Mi esposo me va a matar"
// o "me dijo que me va a matar" sí activan.
const SI_REGANO = '(no entrego|no termino|repruebo|pierdo (el|la) (examen|materia|ano|semestre|parcial))'
const NO_ES_REGANO = `(?! (de (la )?(risa|verguenza|pena ajena|ternura|nervios|emocion|susto)|del (susto|oso)|(el|la|este|esta|ese|esa) (estres|calor|frio|trabajo|trafico|cansancio|curiosidad|intriga|espera|suspenso|guayabo|hambre|sueno|gastritis|migrana)|cuando (vea|sepa|se entere de|descubra) (las notas|mis notas|el boletin|la nota|el examen|el parcial)|si ${SI_REGANO}|en (el|la) (trabajo|oficina|colegio|universidad|u) si)\\b)`

// Tirarse, lanzarse, botarse, saltar o brincar (con "me" o sin él, en
// presente, pasado, futuro y condicional): "me voy a tirar", "voy a
// tirarme", "me lancé", "saltaré", "quiero brincar". "Salto" no entra: "un
// salto al vacío" es también emprender.
const TIRARME = '(\\bme (\\w+ ){0,2}(tir|lanz|lanc|bot|avent|arroj|ech|salt)(ar|o|e|are|aria|aba)|\\b(tir|lanz|bot|avent|arroj|ech)arme|\\b(salt|brinc)(ar|are|aria|aba)|\\b(salte|brinco|brinque))'
// Un lugar alto: "el puente", "la terraza", "el quinto piso", "el piso 10",
// "el 5to piso". "El piso" a secas no.
const SITIO_ALTO = '(puentes?|edificio|ventana|balcon|terraza|techo|azotea|precipicio|abismo|barranco|risco|acantilado|penasco|viaducto|mirador|torre|(\\d+(to|vo|mo|ro|er|do|no|o)?|primer|segundo|tercer|cuarto|quinto|sexto|septimo|octavo|noveno|decimo|ultimo) piso|piso \\d+)'
// Lo que va antes de "me ahorca" o "me aprieta el cuello" cuando no es una
// persona: "esta camisa me ahorca", "el brasier nuevo me ahorca", "las deudas
// me ahorcan".
const NO_ES_ROPA = '(?<!\\b(camisa|blusa|corbata|brasier|ropa|vestido|jean|pantalon|bufanda|collar|cuello|deuda|deudas|cuentas|arriendo|hipoteca|tarjeta|trabajo|estres|calor)( \\w+)? )'

// Desde dónde o hacia dónde: un lugar alto, el vacío, un vehículo, la vía.
// "Al piso" o "a la cama" no; "del quinto piso" o "del piso 10", sí. "Al río a
// nadar" o "del puente en bungee" tampoco.
const LUGAR_ALTO = `(de|del|desde|por|al|a|hacia|contra|frente a|frente al|debajo de|debajo del|bajo|a las (llantas|ruedas) de|a las (llantas|ruedas) del) ((el|la|los|las|un|una|este|esta|ese|esa|mi|lo alto de|lo alto del|lo mas alto de|lo mas alto del) )?(vacio|${SITIO_ALTO}|metro|tren|transmilenio|carros?|bus|buses|buseta|camion|tractomula|rio|quebrada|vias?|carrilera|rieles|carretera|autopista)\\b(?! (a (nadar|banar(me|nos)?|jugar|pescar|refrescar(me|nos)?|chapotear|flotar|bucear)|(en|de|haciendo) (el |un |una |la )?(paseo|bungee?|puenting|parapente|paracaidas|tirolina|tirolesa|neumatico|flotador|kayak|lancha|bote|tobogan))\\b)`

// Las pastillas, también por el nombre de los medicamentos más comunes, en
// singular o plural ("20 ibuprofenos", "15 clonazepames").
const PASTILLAS = '(pastillas|pepas|pildoras|medicinas|medicamentos|tabletas|capsulas|pastas|acetaminofen|paracetamol|dolex|ibuprofeno|naproxeno|diclofenaco|aspirina|tramadol|clonazepam|rivotril|alprazolam|lorazepam|diazepam|zolpidem|sertralina|fluoxetina|escitalopram|trazodona|quetiapina|amitriptilina)(e?s)?'

// Señales de crisis de alto riesgo.
export const CRISIS_PATTERNS = [
  /\b[sz]u(i[csz]|[csz])id/, /\bquitar(me|se)? la vida\b/, new RegExp(`matarme\\b${NO_ES_ESFUERZO}`), new RegExp(`me quiero morir${NO_ES_RISA}`),
  // "No quiero vivir con ansiedad" o "no quiero seguir aquí en este trabajo"
  // no; "no quiero vivir así", "sin él" o "en este mundo", sí.
  new RegExp(`quiero morir${NO_ES_RISA}`), /no quiero (vivir|seguir viviendo|seguir aca|seguir aqui)\b(?! (con|en (?!(este|esta) (mundo|vida)\b)|para|de|del|por|pendiente|bajo|a medias|al dia|a la|al|preocupada|estresada|angustiada|corriendo|apurada)\b)/,
  /mejor no estar/, new RegExp(`acabar con todo\\b${NO_ES_PENDIENTE}`), /hacerme dano/, /lastimarme/, new RegExp(`cortarme\\b${NO_ES_PELO}`),
  /\bautolesion/, /me estoy cortando/,
  /me viol/, /abuso sexual/, /me esta pegando/, new RegExp(`${NO_ES_NINO}me pega\\w*\\b${NO_ES_GRIPA}`), new RegExp(`${NO_ES_NINO}me golpea`), /me maltrata/,
  /estoy en peligro/, new RegExp(`${NO_ES_COSA}\\bme (va|van|iba|iban) a matar\\b${NO_ES_REGANO}`), /amenazas? de muerte/,
  // Formas frecuentes que no caían en las de arriba (ia-5): "me quiero
  // matar/cortar", "me voy a matar", "tengo ganas de morirme", "me hago
  // daño", "quisiera estar muerta". Cortar(se) no cuenta cuando es el pelo,
  // las uñas o el fleco.
  new RegExp(`${ME_QUIERO} (matar|suicidar|ahorcar|envenenar|lastimar|hacer dano)\\b${NO_ES_ESFUERZO}`),
  new RegExp(`${ME_QUIERO} cortar\\b${NO_ES_PELO}`),
  new RegExp(`\\bme corto\\b${NO_ES_PELO}`),
  /\b(cortar(me)?|abrir(me)?|me (abro|abri|abrire|abriria)) (las|mis) venas/,
  new RegExp(`ganas de (morir(me)?\\b${NO_ES_RISA}|matarme\\b${NO_ES_ESFUERZO}|suicidarme|no despertar|no existir)`),
  /\b(quiero|quisiera|prefiero|preferiria|me gustaria|desearia|ojala|deseo) (estar |estuviera |estuviese )?muert[ao]s?\b/,
  new RegExp(`\\b(quiero|quisiera|queria|quise|prefiero|preferiria|me gustaria|desearia|deseo|deseaba|provoca) morir(me)?\\b${NO_ES_RISA}`),
  /\bojala (no despertar|no despierte|no amanecer)/,
  /\bme (hago|estoy haciendo|sigo haciendo) dano\b/, new RegExp(`\\bme lastimo\\b${NO_ES_ACCIDENTE}`),
  /no vale la pena (vivir|seguir)/, /estarian mejor sin mi/,
  // Formas que no caían (verificación final, unas 60 de 142 frases reales).
  // Quitarse la vida, desaparecer, no existir, no despertar, no seguir:
  new RegExp(`${ME_QUIERO} quitar la vida`),
  new RegExp(`\\b(quiero|quisiera|me gustaria|desearia|deseo|ojala pudiera|ganas de|me provoca|pienso en|pensando en|pensado en) desaparecer(me)?\\b${NO_ES_REDES}${NO_ES_UN_RATO}`),
  /\bdejar de existir\b/, /\bno (quiero|quisiera|deseo) existir\b/,
  /\bir(me)? de este mundo\b/,
  /\b(me quiero ir|quiero irme|me voy a ir|me gustaria irme|quisiera irme|(lo mejor (es|seria)|mejor|decidi|ya decidi|he decidido|es hora de) irme) para siempre\b(?! (a|al)\b| de (?!esta vida|este mundo))/,
  new RegExp(`dormir(me)? y no (volver a )?despertar(me)?\\b${NO_ES_SUENO}`),
  new RegExp(`\\b(no (quiero|quisiera|deseo)|(me gustaria|quisiera|desearia|preferiria|prefiero|ojala) no) (volver a )?despertar(me)?\\b${NO_ES_SUENO}`),
  new RegExp(`\\bdejar de vivir\\b${NO_ES_VIVIR_CON}`),
  /\bno quiero estar (mas )?(aqui|aca)\b(?! (en (?!(este|esta) (mundo|vida|tierra)\b)|con|de|del|trabajando|estudiando|esperando|sentada|encerrada)\b)/, /\bno quiero estar (mas )?(en este mundo|viva|vivo)\b/,
  new RegExp(`\\b(ya no quiero seguir|no quiero seguir mas)\\b${NO_ES_ALGO}`),
  // "Ojalá que todo se termine bien" o "que se acabe todo el mal rato" no.
  /\bque (se acabe|se termine) todo\b(?! (bien|lo|el|la|los|las|pronto|rapido|a tiempo)\b)/, /\bque todo (se acabe|se termine)\b(?! (bien|pronto|rapido|como|para|en|con|antes|a tiempo)\b)/,
  // Sin el "se": "quiero que todo termine", "que acabe todo", "que esto se
  // acabe para siempre". No activan "ojalá que todo termine bien" ni "espero
  // que todo termine pronto con la mudanza".
  /\bque todo (termine|acabe)\b(?! (bien|pronto|rapido|como|para|en|con|antes|a tiempo)\b)/,
  /\bque (termine|acabe) todo\b(?! (bien|lo|el|la|los|las|pronto|rapido|a tiempo)\b)/,
  /\bque esto (se )?(acabe|termine) para siempre\b/,
  new RegExp(`\\bmejor (me muero|me muera|morirme)\\b${NO_ES_RISA}`), /\bmejor (estar|estaria) muert[ao]/,
  new RegExp(ME_MATO),
  /\bno me importa(ria)? (si me muero|si muero|morir(me)?)\b/,
  // Desearse la muerte en subjuntivo, la indiferencia ante morir, "para qué
  // sigo viviendo" y no ver otra salida: "ojalá me pase algo y me muera",
  // "me da igual vivir o morir", "si me muero a nadie le importa", "la única
  // salida es la muerte", "mejor desaparezco". No activan "ojalá me muriera de
  // la risa", "no sé para qué vivo en esta ciudad tan cara", "no hay otra
  // salida que pagar" ni "la vida no vale la pena sin amigos".
  new RegExp(`\\bojala (\\w+ ){0,4}me (muera|muriera|muriese)\\b${NO_ES_RISA}`),
  new RegExp(`\\bmejor si (yo )?(me muero|me muera|me muriera|muriera|no existiera|no hubiera nacido)\\b${NO_ES_RISA}(?! (el|la|los|las|un|una|eso|esto|ese|esa|este|esta)\\b)`),
  new RegExp(`\\bme (da|daria|daba) (igual|lo mismo) (vivir o morir|morir o vivir|si (me muero|muero|vivo o (me )?muero)|morir(me)?\\b${NO_ES_RISA})`),
  /\bsi me muero (a )?nadie\b/,
  new RegExp(`\\bpara que (sigo viviendo|sigo viva|sigo vivo|estoy viva|estoy vivo|vivo|existo)\\b${NO_ES_VIVIR_CON}(?! (aqui|aca|alla|sola|solo|lejos|tan|cerca)\\b)`),
  new RegExp(`\\bde que sirve (vivir|seguir viviendo|seguir con vida|estar viva|estar vivo|existir)\\b${NO_ES_VIVIR_CON}`),
  /\bsalida (es|seria|que veo es) (la muerte|morir(me)?|matarme|suicidarme)\b/,
  /\botra salida (que|mas que|distinta a|aparte de) (la muerte|morir(me)?|matarme|suicidarme)\b/,
  new RegExp(`\\bmejor (me )?desaparezco\\b${NO_ES_REDES}${NO_ES_UN_RATO}`),
  /\b(la|mi) vida no vale la pena\b(?! (sin|si no|cuando)\b)/,
  /\bno (le )?(veo|encuentro|tiene|hay) (ningun )?sentido (a |de |en )?(la |mi )?(vida|vivir|seguir)\b/,
  /\b(mi|la) vida no tiene (ningun )?sentido\b/, /\bya nada tiene sentido\b/,
  /\bcarta de despedida\b/,
  // Despedidas y legado: "les dejo todo a mis hijos", "esta es mi despedida",
  // "cuando lean esto ya no voy a estar", "perdónenme por lo que voy a hacer".
  // No activan "esta es mi despedida de soltera", "les dejo todo listo a mis
  // hijos" ni "cuiden a mis hijos cuando yo no esté en casa".
  /\b(les|le) dejo todo a (mis|mi) (hijos|hijas|hijo|hija|hermanos?|hermanas?|mama|papa|familia|esposo|pareja|sobrinos?|sobrinas?)\b(?! (mientras|hasta|para (el|la|que (lo|la) (cuiden|cuide|organicen))|cuando (viaje|salga|vuelva))\b)/,
  /\besta es mi (carta de )?despedida\b(?! (de|del) (soltera|soltero|trabajo|la oficina|la empresa|grupo|este grupo|colegio|la universidad|la ciudad|pais|instagram|las redes|redes|whatsapp?|faceboo?k|tiktok|la comunidad)\b)/,
  /\bcuando (ustedes )?lean esto ya no (voy a estar|estare|existo|estoy|voy a existir)\b/,
  /\bperdon(enme|en|ame|eme|a)? por lo que voy a hacer\b/,
  /\bcuiden a mis hijos (cuando|si) (yo )?(ya )?no (este|estoy)\b(?! (en (casa|la casa)|aqui|de viaje|trabajando|disponible)\b)/,
  // Los métodos: tirarse de un lugar alto o a un vehículo, pastillas o
  // veneno, colgarse, un tiro. "Colgarse con los pagos" es atrasarse.
  new RegExp(`${TIRARME} ${LUGAR_ALTO}`),
  /\b(ojala|quiero que|quisiera que) me (atropelle|atropellen|pise)\b/, /\b(quiero|quisiera|deseo|me gustaria) que (un|una|el|la|algun|alguna) (\w+ ){0,2}me (atropelle|atropellen)\b/, /\bojala me (mate|maten)\b/,
  // El lugar antes del verbo ("estoy en la terraza y quiero saltar", "me subí
  // al puente y me voy a tirar"), dejarse caer, atravesarse en la vía y "ojalá
  // un carro me atropelle". No activan "estoy en la terraza y quiero tirar la
  // basura", "me voy a lanzar a hacer yoga" ni "me dejé caer en el sofá".
  new RegExp(`\\b(estoy|ando|sigo|me subi|subi) (en|a|al) (el |la |un |una |lo alto de(l)? (el |la )?)?${SITIO_ALTO}\\b(?! festivo).{0,60}${TIRARME}\\b(?! (en|la|el|los|las|un|una|a (la|el) (cama|piscina|sofa|hamaca|agua|mar)|a \\w+(ar|er|ir))\\b)`),
  new RegExp(`(\\bdejarme|\\bme (\\w+ ){0,2}dej(ar|o|e|are|aria)) caer ${LUGAR_ALTO}`),
  new RegExp(`(${ME_QUIERO} atravesar|\\batravesarme|\\bme atravieso) (en|a|frente a|delante de) (la |el |un |una |los )?(autopista|via|carretera|calle|avenida|carros?|bus|buses|camion|tractomula|tren|metro|transmilenio)\\b`),
  /\bojala (?!(\w+ ){0,2}no )(\w+ ){1,3}me (atropelle|atropellen|pise|pisen|mate|maten)\b/,
  // Pastillas en cantidad o veneno: "todas las pastillas", "3 tiras de
  // rivotril", "más de la cuenta de pastillas", "un poco de veneno", "cianuro",
  // "soda cáustica". "Todas las pastillas del antibiótico" no.
  new RegExp(`\\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) (todas (las|mis)|un frasco de|un tarro de|una caja de|un monton de|un punado de|muchas|varias cajas de|una caja entera de|un frasco entero de|mas de la cuenta de|una tira de|toda la tira de|(\\d+|dos|tres|cuatro|cinco|varios|varias) (cajas|frascos|tarros|blisters|tiras|sobres|laminas) de) ${PASTILLAS}\\b(?! (del|de la|de mi) (antibiotico|tratamiento|formula|receta|desparasitante)\\b)`),
  // "He tomado muchas pastillas y me siento mareada" ("he tomado muchas
  // pastillas para el dolor este mes" no).
  new RegExp(`\\b(he tomado|me he tomado|acabo de tomar(me)?|me acabo de tomar) (muchas|demasiadas|todas (las|mis)|un frasco de|una caja de|[1-9]\\d+) ${PASTILLAS}\\b(?! (para|en|durante|este|esta|desde|cada)\\b)`),
  /\b(tomar(me)?|tome|tomo|tomado|tragar(me)?|trague|trago|beber(me)?|bebo|bebi|bebere|bebido) (el |la |un |una |un poco de |algo de )?(veneno|raticida|matarratas|cloro|varsol|insecticida|cianuro|soda caustica|acido (muriatico|sulfurico)|creolina|thinner|tiner|gasolina|lejia|blanqueador)\b/,
  // Los preparativos: juntar pastillas, comprar el veneno, tenerlas listas.
  // No activan "estoy guardando las pastillas en el botiquín", "juntando
  // pastillas de vitaminas", "tengo las pastillas listas para el viaje" ni
  // "compré veneno para las cucarachas".
  new RegExp(`\\b(juntando|guardando|acumulando|ahorrando|recogiendo|junte|guarde|acumule|junto|guardo|acumulo) (mis |muchas |varias |todas (las |mis )?)?${PASTILLAS}\\b(?! (en|dentro|bajo|lejos|fuera|arriba|del|de la|de los|de mi|de mis|de (vitaminas?|colageno|hierro|calcio|magnesio|omega|biotina|zinc|probioticos)|para (el|la|los|las|mi|mis|que no))\\b)`),
  new RegExp(`\\b(junte|guarde|acumule|consegui) (las|mis|todas (las|mis)) ${PASTILLAS} (que (necesito|necesitaba|me hacen falta)|suficientes|necesarias)\\b(?! para (el|la|los|las|mi|mis) (viaje|tratamiento|semana|mes)\\b)`),
  new RegExp(`\\b(tengo|ya tengo|tengo ya) (las|mis|todas (las|mis)|un frasco de|una caja de|un monton de|muchas) ${PASTILLAS} (listas|preparadas|contadas|al lado|en la mano)\\b(?! (para|en|de|del|por)\\b)`),
  /\b(compre|consegui) (el |un )?veneno\b(?! (contra|para (las |los |el |la |mis |mi )?(ratas|ratones|cucarachas|hormigas|plagas|moscas|zancudos|pulgas|garrapatas|maleza|jardin|finca|matas|plantas)))/,
  /\bsobredosis\b/,
  /\bahorcarme\b/, new RegExp(`(${ME_QUIERO} colgar|\\bcolgarme)\\b(?! ((\\w+ ){0,3}(con|en)|otra vez|de nuevo|este mes|esta semana|este ano|(el|la|los|las|mi|mis|un|una) (\\w+ )?(mochila|morral|bolso|bolsa|cartera|medalla|maleta|toalla|ropa|chaqueta|hamaca|camara|guitarra|collar|aretes))\\b)`),
  // Colgarse en un lugar o con una cuerda ("me voy a colgar en el baño",
  // "colgarme mañana de una viga"), aunque diga "en": "me colgué en los
  // pagos" no.
  new RegExp(`(${ME_QUIERO} colgar|\\bcolgarme|\\bme (cuelgo|colgue|colgare|colgaria)) (\\w+ ){0,3}(en|de|del) (el |la |una |un |mi )?(bano|closet|armario|cuarto|habitacion|techo|viga|arbol|ducha|baranda|lampara|ventilador)\\b`),
  new RegExp(`(${ME_QUIERO} colgar|\\bcolgarme|\\bme (cuelgo|colgare|colgaria)) (\\w+ ){0,4}con (una |un |la |el |mi )?(cuerda|soga|correa|cinturon|sabana|lazo|cable)\\b`),
  /\b(tengo|ya tengo) (la|una) (cuerda|soga) (lista|amarrada|preparada|colgada)\b/, /\b(tengo|ya tengo|compre|ya compre|consegui|ya consegui) (la|una) soga\b(?! (para|de|del|en)\b)/,
  // Un cuchillo o una cuchilla: "me voy a enterrar el cuchillo", "tengo la
  // cuchilla en la mano", "estoy en el baño con una cuchilla", "pienso en
  // usarla contra mí".
  new RegExp(`(${ME_QUIERO} (clavar|enterrar)|\\b(clavarme|enterrarme)) (el|un|una|la) (cuchillo|navaja|cuchilla|tijeras|punal)\\b`),
  /\b(tengo|estoy con|ando con|sigo con) (la|una) (cuchilla|navaja|hoja de afeitar) (en la mano|en las manos|al lado)\b/,
  /\bestoy en (el|mi) (bano|cuarto|habitacion) con (una|la|el|un) (cuchilla|navaja|cuchillo|soga|cuerda|pistola|arma|bisturi)\b/,
  /\b(pienso|pensando|pense|pensado|quiero|voy a|ganas de) (en )?usar(la|lo)? contra mi( misma)?(?= (y|o|pero|porque|que|ya|ahora|hoy|esta|si)\b|$)/,
  // Un tiro, también "meterse un tiro" ("un tiro de 3 horas" es un viaje largo).
  /(\bdarme|\bpegarme|\bmeterme|\bme (\w+ ){0,2}(dar|pegar|meter|pego|doy|di|pegue|meto|meti)) un (tiro|balazo|disparo)\b(?! (de (\d+|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|media|varias|muchas|esquina)|libre|penal|al arco|a gol|a puerta)\b)/,
  /\bvolarme (la cabeza|los sesos)\b/, new RegExp(`${ME_QUIERO} volar (la cabeza|los sesos)\\b`),
  // Ahogarse en el río o el mar ("tengo miedo de ahogarme en el mar" no).
  new RegExp(`(${ME_QUIERO} ahogar|(?<!\\b(miedo|panico|terror) (de|a) )\\bahogarme) (en|al|a la) (el |la )?(rio|mar|lago|laguna|represa|oceano|tina|banera)\\b`),
  // Autolesiones ya hechas o que se repiten: "me corté", "me volví a
  // cortar", "me sigo cortando", "me hice daño", "a propósito".
  new RegExp(`\\bme (corte|cortaba|volvi a cortar|sigo cortando|segui cortando|he cortado|he vuelto a cortar|estuve cortando)\\b${NO_ES_PELO}${NO_ES_ACCIDENTE}`),
  new RegExp(`\\bme (hice|he hecho|volvi a hacer|vuelvo a hacer) dano\\b${NO_ES_ACCIDENTE}`),
  /\bme (lastime|lastimo|corte|corto|queme|quemo|golpee?|golpeo|pegue|pego|rasgune|rasguno|arane|arano|hice dano|hago dano)\b.{0,30}\ba proposito\b/,
  /\bme (quemo|queme|sigo quemando|estoy quemando|volvi a quemar)\b.{0,30}\b(cigarrillos?|cigarros?|encendedor|fosforos?|yesquero)\b/,
  /\bme (rasguno|rasgune|arano|arane|rasco|pellizco|muerdo|golpeo|pego|corto|lastimo) .{0,20}hasta (sangrar|que (me )?sangr\w*|hacerme sangre|que (me )?(salen|sale|salgan|quedan|queden|dejo|hago) (heridas|sangre|marcas|moretones|morados|cicatrices))\b/,
  /\bme (pego|golpeo|lastimo|castigo|quemo|corto|hago dano) (yo )?a mi mism[ao]\b/,
  /\bme castigo (pegandome|golpeandome|cortandome|lastimandome|quemandome|haciendome dano|rasgunandome|mordiendome|pellizcandome)\b/,
  /\b(me golpeo|me pego|golpearme|pegarme) (la cabeza )?contra (la|las) parede?s?\b/,
  // Dichas con sustantivos: "me hago cortes", "me hice heridas en los
  // brazos", "recaí con las cortadas", "me rayo los brazos". No activan "me
  // hice un corte de pelo", "me hice rayitos" ni "me hice heridas jugando".
  new RegExp(`\\bme (hago|hice|he hecho|sigo haciendo|volvi a hacer|vuelvo a hacer|estoy haciendo) (\\w+ )?(cortes|cortaditas|cortadas|heridas)\\b(?! (de|en) (el |mi )?(pelo|cabello)\\b)${NO_ES_ACCIDENTE}`),
  /\b(recai|recaigo|volvi|vuelvo) (con|a|en) (las |los )?(cortadas|cortes|cortaditas|autolesiones)\b(?! (de|en) (el |mi )?(pelo|cabello)\b)/,
  /\bme (rayo|raye|rajo|raje) (los|las|mis) (brazos|piernas|munecas|muslos|antebrazos)\b(?! con (un |el |los )?(marcador|marcadores|lapicero|esfero|boligrafo|lapiz|pintura|henna)\b)/,
  /\b(cortadas|cortes|cortaditas) (en|de) (las|los|mis) (munecas|brazos|piernas|muslos|antebrazos)\b/,
  // Abuso y amenaza: "me abusaron", "abusa de mí", "miedo de que me mate".
  /\bme (abusaron|abuso|abusa|abusan|abusaba|abusaban|ha abusado|han abusado|esta abusando|estan abusando)\b(?! de (mi |la )?(confianza|buena fe)\b)/,
  // "Se abusó de mi confianza" o "el banco abusó de mí con los intereses" no.
  /(?<!\b(banco|bancos|empresa|tienda|almacen|operador|aseguradora|eps|entidad|gobierno|arrendador|casero) )\babus\w* (sexualmente )?de mi\b(?! (confianza|buena fe|buena voluntad|paciencia|amabilidad|generosidad|bondad|nobleza|tiempo|tarjeta|dinero|plata)\b)/,
  /\bque me (mate|maten|vaya a matar|quiera matar|viole|violen)\b/, /\bme (quiere|quieren|quiso|intento|trato de) matar\b/,
  // Amenazas: "dice que si lo dejo me mata", "si lo dejaba me mataba", "me
  // tiene amenazada", "temo por mi vida", "nos va a matar". No activan "si
  // como eso me mata la gastritis", "si llego tarde mi mamá me mata", "estoy
  // amenazada de despido" ni "temo por mi vida social".
  new RegExp(`\\bsi (?!(llego tarde|${SI_REGANO}) (\\w+ ){0,2}(mi|la|el) (mama|mami|papa|papi|jefe|jefa|profe|profesora|profesor|abuela|suegra) me\\b)(\\w+ ){1,5}me (mata|matan|mataba|mataria|matara|va a matar|iba a matar)\\b(?! (el|la|los|las|un|una|de)\\b)`),
  // Contra los hijos, con un arma, con ácido o fuego, y lo que "dijo que me
  // iba a hacer": "dijo que va a matar a mis hijos", "amenazó con quemar la
  // casa", "me amenaza con el machete", "me dijo que me iba a picar". No
  // activan "va a matar a mi hijo cuando vea el carro" ni "me dijo que me iba
  // a pegar la gripa".
  /\b(va|van|iba|iban) a matar a (mis|mi|los|las|nuestros|nuestras) (hijos|hijas|hijo|hija|bebe|bebes|ninos|ninas|nino|nina|familia|mama|papa)\b(?!.{0,20}\b(cuando|si) (vea|ve|sepa|se entere|descubra)\b)(?! (de (la )?(risa|susto|emocion)|del susto)\b)/,
  /\b(amenaza|amenazo|amenazaba|amenazan|amenazaron|amenazando) con (matar|matarme|matarnos|matarlos|matarla|hacerme dano|hacerle dano|hacernos dano|quemar(me|nos)?|echarme|tirarme|lanzarme|desaparecer(me|nos)?|picarme|rajarme|desfigurarme|pegarme|golpearme|llevarse a (mis|los) (hijos|ninos)|quitarme a (mis|los) (hijos|ninos)|matarse|suicidarse)\b(?! (el|la) (tiempo|rato)\b)/,
  /\btiene (un|una) (arma|pistola|revolver|machete|escopeta|cuchillo|navaja) y me (amenaza|amenazo|amenazaba|apunta|apunto)\b/,
  new RegExp(`\\b(dijo|dice|decia|amenazo|amenaza|amenazaba|jura|juro|grito|escribio) que me (va|iba) a (matar|picar|rajar|desaparecer|desfigurar|quemar|apunalar|acuchillar|degollar|descuartizar|enterrar|golpear|cascar|hacer dano|pegar|ahorcar)\\b${NO_ES_GRIPA}`),
  /\b(me tiene|me tienen|me tenia|me tenian|estoy|vivo|me siento) amenazad[ao]\b(?! (de|con) (despido|despedirme|echarme|demanda|demandarme|multa|sacarme del|quitarme el (puesto|trabajo)))/,
  new RegExp(`\\b(miedo|temo|temor|temer) por mi vida\\b${NO_ES_ETAPA}`),
  /\bnos (va|van|iba|iban|quiere|quieren) a matar\b/,
  // Revisión sistemática (verbos, tiempos y formas con y sin "me").
  // Terminar, acabar, quitar o ponerle fin a la propia vida: "quiero terminar
  // con mi vida", "me quito la vida", "le voy a poner fin a mi vida".
  new RegExp(`\\b(acab|termin)\\w* (con )?mi (propia )?(vida|existencia)\\b${NO_ES_ETAPA}`),
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
  // En presente o pasado con "me": "me disparo en la cabeza", "me disparé",
  // "me enveneno", "me envenené", "salto del puente", "me voy a quitar del
  // medio". No activan "se me disparó la ansiedad", "me envenené con
  // mariscos", "me enveneno con pensamientos negativos", "un salto al vacío",
  // "el salto del puente fue increíble" ni "me quito del medio para que
  // hablen".
  /(?<!\bse )\bme (disparo|dispare|dispararon)\b(?! ((la|el|los|las) (ansiedad|presion|azucar|glucosa|tension|precios?|alarma|estres|ritmo|corazon|pulso|flash|cuenta|factura)|en el pie)\b)/,
  /(?<!\bse )\bme (enveneno|envenene|envenenaron)\b(?! ((con|de) (la |el |algo que )?(comida|mariscos|pescado|pollo|comi|almuerzo|pensamientos)|( (la|el|mi|mis))? (mente|cabeza|pensamientos|alma|corazon|vida))\b)/,
  new RegExp(`(?<!\\b(un|el|ese|este|mi|su|otro|primer|gran|ultimo|del|al) )\\bsalto (de|del|desde|por) ((el|la|los|las|un|una|este|esta|ese|esa|mi|lo alto de|lo alto del) )?${SITIO_ALTO}\\b`),
  new RegExp(`(${ME_QUIERO} quitar|\\bquitarme|\\bme (quito|quitare|quitaria)) del medio\\b(?! (para que (hablen|pasen|puedan|arreglen|conversen)|de (la|esa|esta) (pelea|discusion)|un rato)\\b)`),
  /\bdejarme (atropellar|pisar)\b/,
  // Pastillas: diez o más (también "como 20", "unas 20", "más de 10", "20
  // ibuprofenos"), "todo el frasco", "el blíster de rivotril", "la caja de
  // sertralina", "me las voy a tomar todas", "las de mi abuela, todas".
  new RegExp(`\\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) (como |unas |unos |mas de |casi |al menos |cerca de |hasta )?([1-9]\\d+|diez|quince|veinte|treinta|cuarenta|cincuenta|cien|demasiadas|toda la caja de|todo el frasco de|el frasco de|la caja de|el blister de|la tira de|las tiras de) ${PASTILLAS}\\b`),
  /\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) (todo el (frasco|tarro|blister)|toda la caja|el (frasco|tarro|blister) (entero|completo)|la caja (entera|completa))\b/,
  /\bme las (\w+ ){0,2}(tomar|tome|tomo|tragar|trague|trago) todas\b/,
  new RegExp(`\\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) (las|mis) ${PASTILLAS}( de (mi|mis|la|el|los) \\w+)? todas\\b(?! (las|los)\\b)`),
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
  // "Mejor sin mí", no merecer vivir y no haber querido nacer: "el mundo sería
  // mejor sin mí", "mis hijos estarían más felices sin mí", "no merezco
  // vivir", "quisiera no haber nacido". No activan "la reunión fue mejor sin
  // mí", "sería mejor sin mi novio", "no merezco vivir así", "no debería comer
  // tanto dulce" ni "quisiera no haber nacido en esta época".
  /\b(estarian|estaria|seria|serian|vivirian|viviria) (\w+ ){0,3}(mejor|mas felices|mas feliz|mas tranquil[oa]s?|en paz)( para (todos|todas|ellos|ellas|mi familia|mis hijos))? sin mi(?= (y|pero|porque|que|todos|ya|lo|asi|de verdad|seguro|nadie|no|me|eso|esto|la verdad|en serio|creo|se)\b|$)/,
  /\b(estarian|estaria|seria|serian|vivirian|viviria) (\w+ ){0,3}(mejor|mas felices|mas feliz|mas tranquil[oa]s?|en paz)( para (todos|todas|ellos|ellas|mi familia|mis hijos))? si yo no (existiera|estuviera|hubiera nacido)\b(?! (en (la|el|esta|este) \w+|\w+ando|\w+iendo)\b)/,
  new RegExp(`\\bno merezco (vivir|estar viva|estar vivo|existir|seguir viva|seguir vivo|seguir viviendo)\\b${NO_ES_VIVIR_CON}(?! (asi|esto|esta|como)\\b)`),
  /\bno (deberia|debi|debo) (estar viva|estar vivo|existir|haber nacido|nacer|seguir viva|seguir vivo|seguir viviendo)\b(?! (el|la|los|las|un|una|eso|esto|ese|esa|tanta|tanto|tantas|tantos|gente|personas|nadie|asi|en)\b)/,
  /\b(quisiera|ojala|preferiria|me gustaria|desearia|deseo|hubiera preferido) no haber nacido\b(?! en (esta|este|esa|ese|otra|otro) (epoca|siglo|pais|ciudad|generacion|decada|era)\b)/,
  /\bojala (no|nunca) (hubiera|hubiese) nacido\b(?! en (esta|este|esa|ese|otra|otro) (epoca|siglo|pais|ciudad|generacion|decada|era)\b)/,
  /\bnunca (debi|deberia haber|debio|tuve que) nacer\b/, /\barrepiento de haber nacido\b/,
  /\bsobro en (este mundo|esta vida|la vida|esta tierra)\b/,
  /\bnadie (me )?(extranaria|echaria de menos|notaria|lloraria)\b/,
  // También con "va a" y en futuro ("nadie me va a extrañar", "nadie me
  // extrañará cuando me vaya"), y "nadie se daría cuenta si me muero". No
  // activan "nadie me va a extrañar en la oficina", "nadie me va a llorar la
  // tusa" ni "nadie va a notar si no voy a la fiesta".
  /\bnadie (me )?((va|iba) a )?(extranar|extranara|echar de menos|echara de menos|llorar|llorara)\b(?! (en|la|el|los|las|cuando (renuncie|me cambie|me mude|me vaya de (la|el|mi)))\b)/,
  /\bnadie (se )?((va|iba) a )?(dar cuenta|daria cuenta|dara cuenta|notar|notaria|notara) (si|cuando) (ya )?(me muero|muero|me muera|desaparezco|desaparezca|no estoy|no este|me mato|me voy para siempre)\b/,
  /\bnadie le (importaria|importa) si (me muero|muero|desaparezco|no estoy|me mato|me voy)\b/,
  /\b(pienso|pense|pensando|pensado|penso|pensar) (\w+ ){0,3}en (morir(me)?|la muerte|no (despertar|existir|estar))\b(?! de (la )?(risa|verguenza|pena ajena|mi|mis|su|sus|el|la|los|las|un|una|alguien)\b)/,
  // Violencia: "mi esposo me pegó", "me golpearon", "me tiene encerrada",
  // "me obliga a tener sexo", "me amenaza con…", "le tengo miedo a mi pareja".
  new RegExp(`${NO_ES_NINO}${NO_ES_TUSA}\\bme (pego|pegaron|pegaban)\\b${NO_ES_GRIPA}${NO_ES_NOTICIA}`),
  new RegExp(`${NO_ES_NINO}${NO_ES_TUSA}\\bme (golpeo|golpearon|golpeaba|golpeaban|golpean)\\b${NO_ES_NOTICIA}`),
  /\bme (ahorco|ahorque|ahorcaron|estrangula|estrangulo|estrangularon|cachetea|cacheteo|cachetearon|abofeteo|violaron|encerro|encerraron)\b/,
  /\bme (tiene|tienen|tenia|tenian) encerrada\b/,
  // Más formas de violencia física: empujar, patear, la cachetada, levantar
  // la mano, el cuello, "me ahorca" en presente, "me encierra con llave", un
  // cuchillo en el cuello. No activan "me empujó a estudiar", "el bebé me
  // patea", "me dio una cachetada de realidad", "el gym me dio una paliza" ni
  // "el brasier me ahorca".
  /(?<!\b(lo que|viento|brisa|corriente|ola|olas|marea|gente|multitud|destino|vida) )\bme (empujo|empujaron|empuja|empujaba|empujan|empujaban)\b(?! (a \w+(ar|er|ir)(me|la|lo)?|jugando|sin querer|mucho|bastante|para (que|ser|seguir|crecer)|hacia (adelante|arriba|el|la|mis|mi)|(el|la) (viento|brisa|corriente|ola|marea|gente|multitud|destino|vida))\b)/,
  // Patear: en pasado siempre ("me pateó la barriga"), en presente no cuando
  // es el bebé en la barriga ("me patea la vejiga"). Con el agresor delante,
  // siempre ("mi esposo me patea la barriga"). "Me patea el hígado" o "la
  // loncha" es fastidiar.
  new RegExp(`(?<!\\bbeb\\w* (\\w+ )?)${NO_ES_NINO}\\bme (pateo|patearon|pateaban)\\b(?! ((la|mi) (vejiga|costillas?)|el higado|la loncha|jugando)\\b)`),
  new RegExp(`(?<!\\bbeb\\w* (\\w+ )?)${NO_ES_NINO}\\bme (patea|pateaba)\\b(?! ((la|mi) (barriga|panza|pancita|vejiga|costillas?)|el higado|la loncha|jugando)\\b)`),
  /\b(esposo|marido|pareja|novio|ex|exesposo|expareja|exnovio|papa|padre|padrastro|madrastra|suegro|cunado) (\w+ ){0,2}me (patea|pateo|patearon|pateaba|pateaban)\b/,
  /\bme (casca|casco|cascan|cascaron|cascaba|zarandea|zarandeo|jalonea|jaloneo|jaloneaba)\b/,
  new RegExp(`(?<!\\b(vida|gym|gimnasio|entreno|entrenamiento|partido|examen|parcial|rutina|clase|semana|equipo) )${NO_ES_NINO}\\bme (dio|da|daba|dieron|daban|pego|pegaba|metio|metieron|mete|metia|zampo) (una |un |unas |unos )?(cachetadas?|bofetadas?|palizas?|golpizas?|punos?|punetazos?|patadas?|golpes|trompadas?)\\b(?! (de (realidad|calor|suerte|nostalgia|ahogado)|en (el |la )?(partido|juego|torneo|tenis|futbol|fut|microfutbol|basquet|baloncesto|voleibol|voley|padel|squash|ajedrez|parques|cartas|domino|clase|entreno|entrenamiento|gym|gimnasio|karate|taekwondo|boxeo|crossfit|carrera|competencia)|jugando)\\b)`),
  /\bme (levanto|levanta|levantaba|levantaron|ha levantado|volvio a levantar) la mano\b(?! (para (saludar|despedir)|en (clase|la clase|la reunion)))/,
  new RegExp(`${NO_ES_ROPA}\\bme (agarro|agarra|agarraba|agarraron|apreto|apretaba|apretaron|cogio|cogia) (\\w+ )?(del|el|por el) cuello\\b`),
  new RegExp(`${NO_ES_ROPA}\\bme (ahorca|ahorcaba|ahorcan|ahorcaban|intento ahorcar|quiso ahorcar)\\b(?! (el|la|los|las|esta|este|esa|ese|mi|mis) (presupuesto|plata|deuda|deudas|cuentas|arriendo|trabajo|camisa|corbata|ropa|brasier|blusa|vestido|jean|pantalon|tiempo|estres|calor|cuello|collar|bufanda|hipoteca|tarjeta|cuota|cuotas)\\b)`),
  /\bme (rompio|rompieron|partio|partieron|fracturo|revento|reventaron) (la|el|los) (nariz|boca|labio|cara|costillas?|ceja|dientes?|brazo|mandibula|ojo)\b/,
  /\bme (encierra|encierran|encerraba) (con llave|en (el|la|su|mi))\b(?!.{0,30}\b(tristeza|ansiedad|miedo|depresion|pereza|nostalgia)\b)/,
  /\bme (puso|pusieron|pone|ponia) (un|el|una|su) (cuchillo|arma|pistola|revolver|machete|navaja|tijeras) (en|contra|sobre)\b/,
  // Más formas comunes en Colombia: "me agarró a golpes", "me volvió a pegar",
  // "me tira contra la pared", "me jaló del pelo", "me dejó el ojo morado",
  // "me tumbó de un golpe", "me quiso ahogar", "me lanzó un plato en la cara",
  // "vivo violencia doméstica", "es violento conmigo". No activan "me volvió a
  // pegar la gripa", "mi bebé me jala del pelo", "me dejó plantada", "sufrí
  // violencia obstétrica" ni "sufro maltrato laboral".
  // "Me dio una pela" (mi mamá cuando era niña, no).
  /(?<!\b(mama|mami|papa|papi|abuela|abuelo|madre|padre) )\bme (dio|da|daba|dieron|daban|metio|metieron|pego|pegaba) (una |unas )?pelas?\b/,
  /\bme (agarro|agarraron|agarra|agarraba|agarran|cogio|cogieron|cogia) a (golpes|patadas|punos|punetazos|cachetadas|bofetadas|correazos|palo|palazos|machete|machetazos|garrote|trompadas)\b/,
  new RegExp(`(?<!\\bse )${NO_ES_TUSA}\\bme (volvio|volvieron|vuelve|vuelven) a (pegar|golpear|cascar|ahorcar|empujar|patear|violar|maltratar|amenazar|forzar|abusar)\\b${NO_ES_GRIPA}${NO_ES_NOTICIA}`),
  /\bme (tira|tiro|tiraron|tiraba|estrella|estrello|estrellaron|estrellaba|empuja|empujo|empujaron|empujaba|lanza|lanzo|lanzaron|avienta|avento|bota|boto|azota|azoto) contra (la|el|las|los) (pared|paredes|piso|suelo|muro|puerta|mesa|carro|nevera|closet|cama|esquina)\b/,
  new RegExp(`${NO_ES_NINO}\\bme (jalo|jala|jalaba|jalaron|jalan|halo|hala|halaba|arrastro|arrastra|arrastraba|arrastraron|agarro|agarra|agarraba|cogio) (del|por el|de los|por los) (pelo|cabello|pelos)\\b`),
  /(?<!\b(puerta|caida|golpe|vacuna|inyeccion|aguja|examen|cama|mesa|silla|pelota|balon) )\bme (dejo|dejaron|deja|dejaba) (\w+ ){0,2}(morad[ao]s?|moretones|marcas de (golpes|dedos))\b(?! de (la |tanta |tanto )?(risa|reir|frio)\b)/,
  /\b(moretones|morados|marcas) (\w+ ){0,4}(de|por) (los|sus|tantos) (golpes|punos|patadas|cachetadas|correazos)\b/,
  /\bme (tumbo|tumbaron|tumba|tumbaba) (al piso |al suelo )?(de|a) (un|una) (golpe|puno|punetazo|cachetada|bofetada|patada|empujon|trompada)\b/,
  /\bme (quiso|intento|trato de|quisieron|intentaron) (ahogar|asfixiar|estrangular|quemar|apunalar|acuchillar|envenenar|atropellar)\b/,
  new RegExp(`${NO_ES_NINO}\\bme (lanzo|lanzaron|tiro|tiraron|avento|aventaron|arrojo|arrojaron|boto|botaron) (un|una|el|la) (plato|vaso|taza|botella|silla|zapato|piedra|ladrillo|cuchillo|olla|celular|control|cenicero|plancha|tabla|palo|martillo) (en|a|contra|por) (la|mi) (cara|cabeza|frente|espalda|boca)\\b`),
  /\b(vivo|sufro|sufri|sufriendo|viviendo|vivi|padezco|soy victima de|fui victima de|victima de) (violencia|maltrato|abuso)\b(?! (obstetrica|laboral|academic[oa]|escolar|institucional|politica|en (las|los|la|el) (noticias|series|peliculas|redes|novelas|calles|pais|ciudad|barrio))\b)/,
  /\b(es|se pone|se vuelve|ha sido|se ha puesto|se puso|esta|era) (muy )?(violento|violenta) conmigo\b/,
  // Armas, ácido y agua hirviendo: "me apuntó con una pistola", "me encañonó",
  // "me sacó un cuchillo", "me apuñaló", "me hirió con un cuchillo", "me echó
  // ácido". No activan "me apunto con una amiga al gym", "me apuñaló por la
  // espalda" ni "me echo ácido hialurónico".
  /\bme (apunto|apuntaron|apunta|apuntaba) con (un|una|el|la|su) (pistola|arma|revolver|cuchillo|machete|navaja|escopeta|fusil|cuchilla)\b/,
  /\bme (encanono|encanonaron|encanona|encanonaba)\b/, /\bme (apunalo|apunalaron|apunala|apunalaba|acuchillo|acuchillaron|acuchilla)\b(?! por la espalda\b)/,
  /\bme (saco|sacaron|saca|sacaba) (un|una|el|la|su) (cuchillo|machete|navaja|pistola|arma|revolver|cuchilla|escopeta)\b/,
  /\bme (hirio|hirieron) con (un|una|el|la|su) (cuchillo|machete|navaja|cuchilla|arma|pistola|botella|vidrio|tijeras)\b/,
  /\bme (tiro|tiraron|echo|echaron|lanzo|lanzaron|arrojo|arrojaron|boto|botaron|vacio|vaciaron) (\w+ )?(acido|agua hirviendo|aceite hirviendo|gasolina|acpm)\b(?! (hialuronico|salicilico|glicolico|folico|retinoico|ascorbico|mandelico|azelaico|lactico|kojico|tranexamico)\b)/,
  /\bme (quemo|quemaron|quemaba|quemaban) con (el |un )?acido\b(?! (hialuronico|salicilico|glicolico|folico|retinoico|ascorbico|mandelico|azelaico|lactico|kojico|tranexamico)\b)/,
  /\b(golpes|moretones|morados) (de|que me (dio|dejo|deja)) (mi )?(esposo|marido|pareja|novio|ex|exesposo|expareja|exnovio|papa|padrastro)\b/,
  /\b(esposo|marido|pareja|novio|ex|expareja|exesposo|exnovio|papa|padre|padrastro|mama|madre|madrastra|suegra|suegro) (\w+ ){0,2}me (quemo|quemaba|quemaron) con\b/,
  /\bme (\w+ )?(obliga|obligo|obligan|obligaron|obligaba|fuerza|forza|forzo|forzaron) a (tener (sexo|relaciones|intimidad)|acostarme|desnudarme|hacer cosas (que no|sexuales))\b/,
  /\bme (amenaza|amenazo|amenazan|amenazaron|amenazaba) (de muerte|con (matarme|pegarme|hacerme dano|quitarme (a )?mis hijos|llevarse (a )?mis hijos|publicar|matarse|suicidarse|(un|una|el|la|su) (cuchillo|arma|pistola|revolver|machete|navaja|escopeta|fusil|cuchilla|tijeras|martillo|bate|palo)))\b/,
  /\b(miedo|terror|panico) (de|a) mi (esposo|marido|pareja|novio|ex|papa|padrastro|exesposo|expareja)\b/,
  /\bme (toca|toco|tocan|tocaron|tocaba|manosea|manoseo|manosearon) (\w+ ){0,3}sin (mi )?(permiso|consentimiento|querer)\b/, /\bme (manosea|manoseo|manosearon|manoseaba)\b/,
  // Violencia sexual contada sin "me violaron" ni "abusaron de mí": "fui
  // violada", "sufrí una violación", "mi padrastro me toca", "me tocaba
  // cuando era niña", "me drogaron", "me forzó". No activan "fui violada en
  // mis derechos", "sufrí una violación de datos", "mi papá me toca llevarlo
  // al médico" ("me toca" es "tengo que") ni "me forzó a estudiar".
  /\b(fui|he sido|habia sido) (violada|violado|abusada|abusado)( sexualmente)?\b(?! en (mis|los) derechos\b)/,
  /\b(sufri|me hicieron|vivi|tuve) (una )?(violacion|agresion sexual)\b(?! (de|a) (los |mis |mi |la )?(datos|privacidad|derechos|ley|contrato|normas?|seguridad|transito)\b)/,
  /\b(padrastro|tio|primo|abuelo|papa|padre|hermano|hermanastro|cunado|suegro|vecino|profesor|profe|jefe|entrenador|(novio|esposo|pareja|marido) de mi (mama|madre|abuela|tia|hermana)) (\w+ )?me (toca|tocaba|toco|tocan|tocaban)\b(?! (\w+ )?\w+(ar|er|ir)(lo|la|los|las|le|les|me|te|se|nos)?\b| (la|el|una|un) (guitarra|piano|cancion|musica|puerta|timbre|turno|tema|bateria|violin|tambor)\b| (a mi )?turno\b| (el|la|los|las|mi|mis) (hombros?|brazos?|manos?|cabeza|frente)\b)/,
  /\bme (tocaba|tocaban) cuando (yo )?(era|estaba) (nina|nino|pequena|pequeno|chiquita|chiquito|menor|adolescente)\b/,
  /\bme (drogaron|dieron burundanga|echaron burundanga|echaron algo en (la|el|mi) (bebida|trago|vaso))\b(?! (en (el|la) (hospital|clinica|quirofano|cirugia|operacion|cesarea|parto)|para (la|el|una|un|mi) (cirugia|operacion|procedimiento|cesarea|parto|endoscopia|colonoscopia|examen))\b)/,
  /\bme (forzo|forzaron|forzaba)\b(?! (a \w+(ar|er|ir)|la (puerta|cerradura|chapa|entrada|ventana)|el (carro|candado))\b)/,
  /\bme (\w+ )?(obliga|obligo|obligaba|fuerza|forzo) a hacerlo (aunque|cuando|si) (\w+ ){0,3}no\b/,
  // Más revelaciones sin "violó" ni "abusó": "el novio de mi mamá me toca",
  // "mi padrastro entra a mi cuarto cuando mi mamá no está", "me hizo cosas que
  // no quería", "me presiona para tener sexo y me obliga", "me acosa
  // sexualmente", "tuvo relaciones conmigo cuando estaba dormida", "me grabó
  // desnuda", "me extorsiona con fotos íntimas". No activan "mi hermano se mete
  // a mi cuarto a coger mis cosas" ni "el frío me penetra los huesos".
  /\b(padrastro|tio|primo|abuelo|cunado|suegro|vecino|hermanastro|(novio|esposo|pareja|marido) de mi (mama|madre)) (\w+ ){0,2}(se mete|se metia|se metio|entra|entraba|entro|se pasa|se pasaba) (a|en|por) mi (cuarto|cama|habitacion|pieza|bano)\b(?=.{0,50}\b(noche|madrugada|no esta|nadie|dormida|duermo|sola|escondidas)\b)/,
  /\bme (hizo|hicieron|hacia|hacian) cosas (que no (queria|quise|quiero)|sexuales)\b/,
  /\b(sexo|relaciones|intimidad)\b.{0,30}\b(y|pero) me (obliga|obligo|obligaba|fuerza|forza|forzo|forzaba)\b(?! a (?!(hacerlo|tener|acostarme|desnudarme|hacer cosas|eso)\b))/,
  /\bacos\w* sexual(mente)?\b/, /\bme (penetro|penetraron)\b(?! (el|la|los|las|hasta|en)\b)/,
  /\b(relaciones|sexo) conmigo (cuando|mientras) (yo )?(estaba )?(dormida|dormia|borracha|inconsciente|drogada|desmayada|ebria)\b/,
  /\b(estaba|estuvo|se puso|se subio|se monto) encima (mio|mia|de mi)\b.{0,40}\b(sin (mi )?(consentimiento|permiso)|dormida|dormia|no queria|no quise)\b/,
  /\bme (grabo|grabaron|grababa|fotografio|fotografiaron|tomo fotos|tomaron fotos|tomo videos|tomaron videos) (\w+ )?(desnuda|sin ropa|en ropa interior|teniendo (sexo|relaciones)|en la ducha|banandome|cambiandome)\b/,
  /\b(extorsion|chantaje|chantajea|amenaz|publico|publicaron|subio|subieron|difundio|difundieron|filtro|filtraron|compartio|compartieron|mostro|mostraron|reenvio)\w* (\w+ ){0,3}(fotos|videos|imagenes|fotografias) (intimas|intimos|desnuda|mias desnuda|sin ropa|sexuales)\b/,
  // Acoso y persecución: "me persigue", "me está siguiendo", "me acecha", "me
  // está acosando", "tengo una orden de alejamiento", "me llegan amenazas",
  // "tengo miedo de que me haga algo", "no me deja salir de la casa y me quitó
  // el celular". No activan "la mala suerte me persigue", "me está siguiendo
  // en Instagram", "me acosan los cobradores" ni "recibo amenazas de despido".
  new RegExp(`(?<!\\b(suerte|recuerdo|recuerdos|pasado|culpa|ansiedad|tristeza|miedo|miedos|fantasma|perro|perrito|gato|gatico|sombra|cancion|olor|idea|pensamiento|pensamientos|trabajo|deuda|deudas|fama|karma|estres|tusa|duda|dudas|cobradores?|bancos?) )${NO_ES_NINO}\\bme (persigue|perseguia|persiguen|perseguian|persiguio|persiguieron|esta persiguiendo|estan persiguiendo|acecha|acechaba|acechan|esta acechando|esta siguiendo|estan siguiendo|viene siguiendo|acosa|acosaba|acosan|acosaban|acoso|acosaron|esta acosando|estan acosando)\\b(?! ((la|el|los|las|ese|esa|este|esta|mi|mis) (\\w+ )?(suerte|recuerdo|recuerdos|pasado|culpa|ansiedad|tristeza|miedo|miedos|fantasma|idea|pensamiento|pensamientos|cancion|olor|fama|karma|estres|tusa|deuda|deudas|trabajo|duda|dudas|cobradores?|bancos?|llamadas|juego)|(en|por) (instagram|tiktok|redes|las redes|twitter|faceboo?k|ig|insta|youtube))\\b)`),
  /\borden(es)? de (alejamiento|restriccion|proteccion)\b/,
  /\b(me llegan|me llegaron|me han llegado|recibo|recibi|me mandan|me manda|me envia|me envian|estoy recibiendo|me hace|me hacen|me hizo) (\w+ )?amenazas\b(?! de (despido|demanda|desalojo|cobro|embargo|demandarme|despedirme)\b)/,
  /\b(miedo|temo|terror|panico) (de )?que (me|nos|le) (haga|hagan|vaya a hacer|vayan a hacer) (algo|dano)( malo|(?! malo))\b(?! (la|el|los|las) (vacuna|medicamento|medicina|pastilla|comida|operacion|cirugia|tratamiento|droga|inyeccion|anestesia)\b)/,
  /\bno me deja(ba|n)? salir (de la casa|de casa)\b.{0,30}\bme (quito|quita|quitaba|esconde|escondio|rompio) (el|mi|los|mis) (celular|telefono|documentos|pasaporte|cedula|plata|dinero|llaves)\b/,
  // Una hija, una amiga o la mamá en crisis: "mi hija se quiere matar", "mi
  // amiga me dijo que se va a matar", "mi hijo se corta", "a mi amiga la viola
  // su padrastro", "a mi vecina le pega su esposo". No activan "mi hija se
  // quiere morir de la risa", "se quiere matar estudiando", "mi abuela se va a
  // morir", "mi hija se corta el pelo" ni "mi papá le pegó la gripa".
  new RegExp(`\\b(mi|una|la) (hija|hijo|amiga|amigo|hermana|hermano|prima|primo|sobrina|sobrino|nieta|nieto|alumna|alumno|mama|papa|madre|padre|esposo|esposa|novio|novia|pareja|companera|vecina|cunada|tia) (\\w+ ){0,4}se (quiere|queria|quiso|quisiera|piensa|intento|trato de|ha intentado|esta intentando) (matar|suicidar|morir|quitar la vida|ahorcar|envenenar|tirar (de|del|desde|por))\\b${NO_ES_ESFUERZO}${NO_ES_RISA}`),
  new RegExp(`\\b(mi|una|la) (hija|hijo|amiga|amigo|hermana|hermano|prima|primo|sobrina|sobrino|nieta|nieto|alumna|alumno|mama|papa|madre|padre|esposo|esposa|novio|novia|pareja|companera|vecina|cunada|tia) (\\w+ ){0,4}se (va|iba) a (matar|suicidar|quitar la vida|ahorcar|envenenar|tirar (de|del|desde|por))\\b${NO_ES_ESFUERZO}(?! (en|con) (esa|ese|la|el|una|un) (moto|carro|bici|bicicleta|patineta)\\b)`),
  new RegExp(`\\b(mi|una|la) (hija|hijo|amiga|amigo|hermana|hermano|prima|primo|sobrina|sobrino|nieta|nieto|alumna|alumno|pareja|novia|novio) (\\w+ ){0,3}se (corta|cortaba|esta cortando|sigue cortando|ha cortado|volvio a cortar|autolesiona|hace cortes)\\b${NO_ES_PELO}${NO_ES_ACCIDENTE}`),
  /(?<!\btoca(r|ba)? )\b(la|lo) (viola|violaba|violo|violaron|violan|abusa|abusaba|abuso|abusaron|manosea|manoseaba) (su|el|un|una|mi|sus)\b/,
  new RegExp(`\\ble (pega|pegaba|pego|golpea|golpeaba|golpeo|maltrata|maltrataba|viola|violo|violaba) (su|el) (esposo|marido|novio|pareja|ex|papa|padrastro|exesposo|expareja|exnovio)\\b`),
  new RegExp(`\\b(su|mi) (esposo|marido|novio|pareja|ex|papa|padrastro|exesposo|expareja|exnovio) (\\w+ ){0,2}le (pega|pegaba|pego|golpea|golpeaba|golpeo|maltrata|maltrataba|viola|violo|violaba)\\b${NO_ES_GRIPA}${NO_ES_NOTICIA}(?! (un|unos) (grito|gritos|regano)\\b)`),
  // Pensar en hacerle daño a su bebé o a sus hijos (también después del
  // parto). "No quiero hacerle daño a mis hijos con el divorcio" no.
  /\b(pienso|pense|pensado|pensando|pensamientos|ganas|impulsos?) (\w+ ){0,2}(de|en) (hacerle(s)? dano|lastimar|danar|matar|ahogar|asfixiar|sacudir) (a )?(mi|mis|el|la|los) (bebe|bebes|hijo|hija|hijos|hijas|nino|nina|ninos|recien nacid[oa]|chiquit[oa])\b/,
  // Indirectas que casi siempre son una despedida: "ya no voy a ser un
  // problema para nadie", "quiero descansar para siempre", "me rindo con la
  // vida", "esta noche se acaba todo", "pronto ya no tendrán que preocuparse
  // por mí", "ya no me van a tener que aguantar más". No activan "quiero
  // descansar para siempre de este trabajo", "me rindo con la dieta" ni "esta
  // noche se acaba todo el descuento".
  /\bya no (voy a ser|sere|seguire siendo) (un problema|una carga|un estorbo|una molestia|un peso) para (nadie|ustedes|ellos|ellas|todos|mi familia|mis hijos)\b/,
  /\bdescansar para siempre\b(?! de (?!esta vida|este mundo|todo))/, /\bme rindo con (la|mi|esta) vida\b/,
  /\b(esta noche|hoy) (se acaba|se termina|termina|acaba) todo\b(?! (el|la|los|las|lo|esto|eso|este|esta)\b)/,
  /\bya no (tendran|tendras|van a tener|vas a tener) que (preocuparse|preocuparte|preocuparnos) (por|de) mi\b(?! (porque|ya|consegui|me (voy|mude|fui|cambie))\b)/,
  /\bya no me (van|vas) a tener que (aguantar|soportar|cuidar|mantener|cargar)\b(?!.{0,20}\b(me (voy|cambio|mudo) de|renuncie|renuncio|consegui)\b)/,
]

// Cuántas cláusulas seguidas se leen también juntas: una pausa dentro de la
// frase ("no quiero... vivir, de verdad") no la parte.
const CLAUSULAS_JUNTAS = 3

// Las lecturas del texto: entero (los signos como espacios, para las frases
// que cruzan un signo: "me quiero... morir") y cada cláusula sola o con las
// que le siguen. En una cláusula sola, las excepciones solo ven esa cláusula:
// "no quiero vivir, de verdad" activa aunque "vivir de…" sea una excepción.
function lecturas(content) {
  const todas = new Set([textoParaCrisis(content, false)])
  const partes = textoParaCrisis(content).split(' | ').filter(Boolean)
  if (partes.length > 1) {
    for (let i = 0; i < partes.length; i++) {
      for (let k = 1; k <= CLAUSULAS_JUNTAS && i + k <= partes.length; k++) todas.add(partes.slice(i, i + k).join(' '))
    }
  }
  return [...todas]
}

export function isCrisis(content) {
  const textos = lecturas(content)
  return CRISIS_PATTERNS.some((re) => textos.some((t) => re.test(t)))
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

// La salida a Ayuda y a las líneas, para cuando no hay respuesta: el chat
// que no se conecta y el aviso de Ronda+ (también el 403 de api/_auth.js).
// Sin Ronda+ no hay segunda capa (el modelo) que vea una crisis dicha de otra
// forma: la salida queda siempre a la vista.
export const AYUDA_TEXT =
  `Si estás pasando por un momento difícil, toca "${BOTON_AYUDA}" para herramientas inmediatas o llama a la Línea 106 (gratuita y confidencial). Si estás en peligro inmediato, llama al 123.`

// Lo que dice el chat de Tu Ronda cuando no logra conectarse: nunca deja a
// la usuaria sin la salida a Ayuda y a las líneas.
export const CHAT_ERROR_TEXT =
  `No pude conectarme en este momento. Inténtalo de nuevo en un rato. ${AYUDA_TEXT}`
