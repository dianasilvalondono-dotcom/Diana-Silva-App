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
// "segir" y "pastiyas". También "boi" y "bo" (voy), "voya", "amatar" y
// "mevoyamatar" pegados, "morrir", "moir" y "matr", y "murir", "muerir" y
// "mrir" (morir), "mtar" (matar), "vivri" y "vivr" (vivir).
//
// Los signos que cierran una cláusula (. , ; : ! ? ¡ ¿ … las rayas y los
// saltos de línea) quedan como un separador, " | ": isCrisis lee cada
// cláusula por aparte, para que ninguna excepción de las de abajo ("vivir
// con…", "acabar con todo lo…", "desaparecer un día…") lea la palabra que
// viene después de la coma ("no quiero vivir, de verdad"). Con clausulas en
// false, los signos son un espacio más, como antes.
const SEPARADORES = /(?<!\d)[.,]|[.,](?!\d)|[;:!?¡¿…\n\r]|\s[-–—]+\s|[–—]/g
// Con clausulas en 'amplia', también parten la frase lo que muchas escriben
// en lugar de la coma: un emoji ("no quiero vivir 😭 de verdad"), un doble
// espacio, y las coletillas que no completan lo anterior aunque vayan sin
// signo ("no quiero vivir de verdad", "en serio", "por favor", "les juro").
// Las caras de risa (😂 🤣) no parten: "me quiero morir 😂 de la risa" sigue
// siendo la risa.
const SEPARADORES_AMPLIOS = /(?:(?![😂🤣😆😅😹])[\p{Extended_Pictographic}\p{S}])+|\s{2,}/gu
const COLETILLAS = / (?=(de verdad|de veras|en serio|en verdad|por favor|porfa|porfavor|por dios|la verdad|(se )?(les|los|las|te|lo|se lo) juro|no es (chiste|broma|mentira|juego)|ayuda|ayudame|ayudenme|auxilio|socorro|no se que hacer|(ya )?no (puedo|aguanto|soporto|doy) mas|nadie me (entiende|quiere|escucha|cree?|ayuda)|estoy llorando|jaja\p{L}*|jeje\p{L}*)( |$))/gu
function textoParaCrisis(content, clausulas = true) {
  const t = ` ${normalize(content)} `
  const s = (clausulas
    ? (clausulas === 'amplia' ? t.replace(SEPARADORES, ' | ').replace(SEPARADORES_AMPLIOS, ' | ') : t.replace(SEPARADORES, ' | '))
      .replace(/[^\p{L}\p{N}|]+/gu, ' ').replace(/ ?(\| ?)+/g, ' | ')
    : t.replace(/[^\p{L}\p{N}]+/gu, ' '))
    .replace(/(\p{L})\1{2,}/gu, '$1')
    .replace(/([aiou])\1/g, '$1')
    .replace(/(\p{L})\1(?= )/gu, '$1')
    .replace(/ ya(?=no[kq]u?i?ero)/g, ' ya ')
    .replace(/ (me|no)(?=[kq]u?i?ero)/g, ' $1 ')
    .replace(/ me(?=(voy|boy|voi|boi)( |a))/g, ' me ')
    .replace(/ (voy|boy|voi|boi|vy|bo|va|vas|van|iba) ?a(?=(matar|morir|suicidar|ahorcar|ahorkar|aorcar|aorkar|tirar|lanzar|botar|colgar|envenenar|disparar|quitar)(me|r)? )/g, ' $1 a ')
    .replace(/ (voy|boy|voi|boi)a (?=(matar|morir|suicidar|ahorcar|ahorkar|aorcar|aorkar|tirar|lanzar|botar|colgar|envenenar|disparar|quitar)(me|r)? )/g, ' $1 a ')
    .replace(/ morr(?=i)/g, ' mor')
    .replace(/ moir(?=(me)? )/g, ' morir')
    .replace(/ matr(?=(me)? )/g, ' matar')
    .replace(/ (murir|muerir|mrir)(?=(me)? )/g, ' morir')
    .replace(/ mtar(?=(me)? )/g, ' matar')
    .replace(/ [bv](ivri|ivr|vir)(?= )/g, ' vivir')
    .replace(/ ([kq]u?i?ero)(?=(morir|matar|vivir|seguir|suicidar|desaparecer|ahorcar|cortar|existir|estar|dormir|irme))/g, ' $1 ')
    .replace(/ [kq](?=[ei])/g, ' qu')
    .replace(/ quero(?= )/g, ' quiero')
    .replace(/ (boy|voi|vy|boi|bo)(?= a )/g, ' voy')
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
  return (clausulas === 'amplia' ? `${s} `.replace(COLETILLAS, ' | ').replace(/ ?(\| ?)+/g, ' | ') : s)
    .trim()
    .replace(/^(\| ?)+|( ?\|)+$/g, '')
}

// Lo que viene después de "cortar(me)" cuando no es una crisis: el pelo, las
// uñas, el fleco… ("me quiero cortar el pelo"), o un servicio ("amenazaron
// con cortarme el gas").
const NO_ES_PELO = '(?!( (el|la|los|las|mi|mis|un|una))? (pelo|cabello|unas|fleco|flequillo|pollina|capul|cerquillo|puntas|barba|melena|gas|luz|agua|internet|wifi|servicio|servicios|linea|telefono|cable|credito|sueldo|salario|pension|subsidio|mesada)\\b)'

// "Me cortó" cuando es "terminó conmigo": "mi novio me cortó", "el man me
// cortó ayer", "me cortó por whatsapp", "me cortó mi novio y estoy triste".
// "Mi novio me cortó la cara", "me cortó con un cuchillo" o "mi ex me cortó"
// sí activan.
const NO_ES_RUPTURA = '(?!(?<=\\b(novio|novia|man|pelado|pelada|crush|amante|muchacho|chico|moza|mozo) (\\w+ )?me corto)(?=$| (ayer|hoy|anoche|porque|sin (razon|motivo|explicacion|decir)|de (la nada|repente|un momento a otro)|despues de|hace|otra vez|para (irse|estar|volver)|asi (no mas|nomas|de feo)|como (si|un)|cuando|esta (semana|manana|tarde|noche)|este (fin|mes|ano)|desde|por (whatsapp?|mensaje|chat|telefono|celular|instagram|faceboo?k|texto|nota de voz|audio|otra|una (vieja|pelada|china)|ella|mi culpa)|y (estoy|me siento|me dejo|no se|ando|quede|lloro|llore|me duele el corazon|me rompio el corazon))\\b))(?! (mi|el|ese) (novio|novia|man|pelado|pelada|crush|amante)\\b(?! con\\b))'

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
const NO_ES_ESFUERZO = '(?! (estudiando|trabajando|entrenando|corriendo|haciendo (ejercicio|deporte|tareas|dieta|aseo|oficio|oficios|la tarea|mercado|vueltas|fila|el almuerzo|la comida|la cena)|limpiando|cocinando|lavando|planchando|barriendo|trapeando|bailando|caminando|aprendiendo|leyendo|practicando|ensayando|organizando|arreglando|pintando|cosiendo|tejiendo|madrugando|trasnochando|en el (gym|gimnasio|trabajo)|de (la )?risa)\\b)'

// Lo que viene después de "me corté" o "me hice daño" cuando fue un
// accidente: "el dedo cocinando", "en la rodilla", "jugando", "con una hoja
// de papel", "con un vidrio lavando platos", "sin querer", "cuando cocino".
// "Me corté", "me corté las muñecas", "con una hoja" o "con un vidrio" sí
// activan.
const NO_ES_ACCIDENTE = '(?!( (el|la|un|una|mi|con (el|la|un|una)|en (el|la|un|una|mi)))? (dedos?|rodilla|tobillo|pies?|espalda|cocinando|picando|afeitando(me)?|depilando(me)?|jugando|entrenando|corriendo|bailando|gimnasio|gym|(hoja de )?papel|lata)\\b)(?!( (con|en) (el|la|un|una|mi) \\w+| cuando estaba| mientras)? (lavando|cocinando|picando|pelando|afeitando(me)?|depilando(me)?|jugando|limpiando|abriendo|arreglando|cortando|trabajando|cosiendo|cargando|haciendo (ejercicio|deporte|yoga|pilates|pesas))\\b| (sin querer|por accidente|accidentalmente|cuando (cocino|cocinaba|lavo|lavaba|pico|trabajo|juego|corro|entreno|me afeito|me depilo|limpio))\\b)'

// Lo que viene después de "me pega" o "me pegó" cuando no es un golpe: "me
// pegó la gripa", "un susto", "se me pegó la canción", "me pegó el sol".
// También "me pegó un grito", "un abrazo", "un regaño", "una vaciada", "un
// balonazo", "me pego una siesta" o "una ducha", "su mal genio", y "con la
// pelota sin querer", salvo que en seguida venga el golpe ("me pegó un grito
// y una cachetada").
const GOLPE_REAL = '(?!.{0,40}\\b(cachetad|bofetad|punet|puno|golp|patad|trompad|correaz|chancl|empujon|paliza|pela)\\w*)'
const NO_ES_GRIPA = `(?! (la|una|un|el|los|su|sus) (gripa|gripe|susto|virus|resfriado|resfrio|tos|chicle|moda|cancion|mania|costumbre|piojos|varicela|covid|sol|calor|frio|sereno|aire|guayabo|bajon|sueno|hambre|antojo|mal genio|mal humor|depre|pereza|flojera|tusa)\\b| (un|una|el|la|su|tremendo|tremenda|semejante) (grito|gritos|abrazo|abrazote|abrazos|beso|besos|besote|regano|reganada|vaciada|cantaleta|sermon|balonazo|pelotazo|madrugon|siesta|siestica|siestita|ducha|duchada|banada|banadita|dormida|dormidita|pasadita|vuelta|vueltica|escapada|escapadita|rumba|leida|repasada|mirada)\\b${GOLPE_REAL}| con (la|el|una|un) (pelota|balon|juguete|carrito|codo|rodilla|bolso|morral)\\b(?=.{0,30}\\b(sin querer|por accidente|jugando)\\b))`
// Lo que viene después de "me pego" o "me golpeo" cuando es un mueble con el
// que una se tropieza: "siempre me pego con esa mesa", "me pego en la cabeza
// con la alacena", "me golpeo la cabeza con la alacena".
const NO_ES_MUEBLE = '(?!( (en )?(la|el|mi) (cabeza|rodilla|dedo|pie|codo|frente|espalda|brazo|pierna|mano|cadera|canilla))? con (esa|ese|la|el|una|un|esta|este) (mesa|mesita|alacena|esquina|closet|cajon|escalera|escalon|marco|repisa|gabinete|techo|columna|nevera|mueble|cama|lavamanos|baranda)\\b)'

// Lo que va antes de "me pega", "me golpea", "me patea" o "me da patadas"
// cuando es una niña o un niño pequeño, dicho de forma explícita: "mi bebé me
// pega en la cara", "mi nene me patea", "mi hija de 3 me da patadas", "mi hijo
// de 2 años me pega", "mi niño pequeño me pega", y "mi hijo me pega cuando
// hace pataleta", "un berrinche", "jugando", "cuando juega", "y me muerde",
// "me patea dormida" o "cuando lo cambio". Sin esa señal, un hijo o una
// hija que golpea sí activa ("mi hijo me pegó un puño en la cara", "mi hija me
// pega y me insulta"), igual que "mi hijo de 16 años me pega" o "mi hijo
// adolescente me golpea": ante la duda, ayuda.
// "Dormida" o "durmiendo" no cuentan cuando la que dormía era ella ("mi hijo
// me pegó mientras estaba dormida", "estaba durmiendo y mi hijo me pegó", "no
// he dormido nada, mi hija me pegó"), ni cuando cuenta que una niña duerme
// ahora ("mi hija me arrastró por el pelo, mi hija está dormida"), ni
// "juega" o "jugando" cuando es un partido o un videojuego que pierde ("cuando
// juega el Nacional y pierde", "cuando pierde jugando play").
const EDAD_PEQUENA = '(de )?(\\d|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)( anos?| meses?)?'
const JUEGO_DE_GRANDE = '(?! (el|la|los) (nacional|millonarios|america|santa fe|junior|medellin|cali|seleccion|equipo|partido|clasico|tolima|once caldas)\\b| (play|playstation|play station|xbox|nintendo|videojuegos|fifa|free? fire|fortnite|maquinitas|tejo|billar|apuestas|futbol|futbolito|micro|basquet|cartas|poker)\\b| y pierde\\b)(?<!\\bpierde (\\w+ )?(jugando|juega|juegan|jugamos))'
const PATALETA = `(pataletas?|berrinches?|rabietas?|(jugando|juega|juegan|jugamos)${JUEGO_DE_GRANDE}|muerde|mordio|mordiendo|(?<!\\b(estaba|estoy|yo|estuve|me quede|me quedo|he|ha|has|hemos|han|habia|haya|estado) )(?<!\\b(nin[oa]s?|hij[oa]s?|beb\\w*|nene|nena) (ya )?(esta|estan|sigue|siguen|se quedo|quedo|queda) )(dormid[oa]|durmiendo)|(cuando|mientras) duerme|(lo|la) (cambio|bano|visto)|cambiarl[oa]|banarl[oa]|panal(es)?|tetero)`
const NO_ES_NINO = `(?<!\\b((beb\\w*|nene|nena|chiquit[oa]s?)( ${EDAD_PEQUENA}| (pequen[oa]|chiquit[oa]|menor))?|(nin[oa]s?|hij[oa]s?) (${EDAD_PEQUENA}|pequen[oa]|chiquit[oa])) )(?!(?<=\\b(nin[oa]s?|hij[oa]s?) )[^|]{0,50}\\b${PATALETA}\\b)(?<!\\b${PATALETA}\\b[^|]{0,40}\\b(nin[oa]s?|hij[oa]s?) )`

// Lo que va antes de "me pegó" cuando lo que golpea es la vida: "la tusa me
// pegó duro", "la noticia me pegó".
const NO_ES_TUSA = '(?<!\\b(tusa|noticia|realidad|vida|crisis|perdida|muerte|nostalgia|tristeza|ansiedad|cansancio|estres|duelo|pandemia|gripa|gripe|sol|calor|guayabo|bajon|depre|aguacero|lluvia|granizo|viento|brisa|ola|olas|rayo|corriente) )'

// Lo que viene después de "me golpeó" o "me pegó" cuando lo que golpea es
// la vida: "me golpeó la noticia", "me pegó duro la tusa".
const NO_ES_NOTICIA = '(?!( (muy )?(fuerte|duro|durisimo))? (la|el|esa|ese|esta|este) (realidad|noticia|vida|crisis|perdida|muerte|nostalgia|tristeza|ansiedad|cansancio|estres|duelo|tusa|pandemia|guayabo|depre|gripa|gripe|sueno|hambre|pereza|resaca|ratabo|sol|calor|frio|bajon|virus|covid)\\b)'

// Lo que viene después de "despertar(me)" cuando habla del sueño y no de
// una crisis: "no despertarme en la noche", "tan temprano", "a las 3", "a
// mi bebé", "cansada", "hasta el lunes". "No quiero despertar" o "mañana" sí
// activan.
const NO_ES_SUENO = '(?!(me)? (en la (noche|madrugada)|a|al|de (madrugada|noche)|(tan |muy )?temprano|cada|tantas|varias|mil|seguido|tan seguido|con|por|cansada|hasta)\\b)'

// Lo que viene después de "dejar de vivir" cuando es una meta y no una
// crisis: "con ansiedad", "en el pasado", "para los demás".
const NO_ES_VIVIR_CON = '(?! (con|en|para|de|del|por|pendiente|bajo|sin|a medias|al dia|a la|al|preocupada|estresada|angustiada|corriendo|apurada)\\b)'

// Lo que viene después de "terminar con mi vida" o "ponerle fin a mi vida"
// cuando habla de una etapa y no de una crisis: "con mi vida social", "mi
// vida de soltera", "mi vida como la conocía".
const NO_ES_ETAPA = '(?! (social|universitaria|laboral|amorosa|sentimental|sexual|academica|profesional|nocturna|digital|financiera|anterior|pasada|actual|vieja|sedentaria|rutinaria|desordenada|caotica|aburrida|toxica|monotona|estresante|de (soltera|casada|estudiante|fiesta|rumba|pareja|antes|excesos)|en pareja|como la conocia|como era)\\b)'

// Lo que viene después de "ya no quiero seguir" cuando dice con qué: "con mi
// novio", "en este trabajo", "estudiando eso". "Así", "con esto", "con mi
// vida", "con esta vida", "en este mundo" o "en este infierno" sí activan
// ("con mi vida social" no).
const NO_ES_ALGO = `(?! (con|en|de|haciendo|trabajando|estudiando|siendo|pensando|esperando|intentando) (mi|mis|el|la|los|las|este|esta|estos|estas|ese|esa|esos|esas|un|una|eso|ellos|ella|tu|su|sus|nuestra|nuestro)\\b(?! (vida|mundo|existencia|infierno|sufrimiento)\\b${NO_ES_ETAPA}))`

// Lo que viene después de "desaparecer" cuando no es una crisis: "de las
// redes", "de este grupo", "de la oficina", "de la vergüenza".
const NO_ES_REDES = '(?! (de|del) (las |los |mi |mis |el |la |este |esta |ese |esa )?(redes|instagram|whatsapp?|faceboo?k|tiktok|internet|celular|grupo|chat|trabajo|oficina|universidad|colegio|reunion|fiesta|verguenza|risa|pena ajena)\\b)'

// Lo que viene después de "desaparecer" cuando dice por cuánto tiempo o qué
// quiere borrar: "un rato", "unos días", "del mapa unos días", "las ojeras",
// "el acné", "mis manchas".
const NO_ES_UN_RATO = '(?!( del mapa| de aqui)? (un rato|unos dias|unas horas|un dia|una semana|unas semanas|un tiempo|un tiempito|un fin de semana|el fin de semana|por un|por unos|por unas|de vacaciones|a la playa)\\b| (las|los|mis|mi|el|la|esas|esos|estas|estos) (ojeras|acne|manchas?|estrias|arrugas|granos|espinillas|cicatrices|celulitis|kilos|libras|barriga|panza|lonjas|vellos?|canas|puntos negros|deudas)\\b)'

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
// tráfico", "este trabajo ya me mató" o "el gym me mató hoy" no). Lo que
// sigue a "me mato" sin coma no lo apaga cuando cuenta lo que pasa en la casa
// ("el domingo me mato mi mamá no sabe nada", "me mato eso es lo que siento").
const LO_QUE_PASA_EN_CASA = '((mi|mis) (mama|mami|papa|papi|hija|hijo|hijos|hijas|esposo|marido|familia|pareja|novio|novia|gente|hermana|hermano|hermanas|hermanos|nietos?|nietas?) (no|ya|nunca|esta|estan|duerme|duermen|sabe|saben|cree|creen|ni)\\b|(eso|esto) (es|son|fue)\\b)'
const NO_ES_ME_MATO = `${NO_ES_ESFUERZO}(?! (?!${LO_QUE_PASA_EN_CASA})(el|la|los|las|un|una|ese|esa|eso|este|esta|esto|estos|estas|tanto|tanta|mi|mis|por (mis|mi|ti|ellos|ellas|ella|el|ustedes))\\b)`
const NO_ES_SUJETO = '(?<!\\b(el|la|los|las|este|esta|ese|esa|mi|mis|tu|su) \\w+ )'
const ME_MATO = `(\\b(mejor|yo|juro que|(un|algun|cualquier) dia( de estos)?|ahora si|esta noche|manana|hoy mismo|ya mismo|de una vez)|${NO_ES_SUJETO}\\b(hoy|ya)|\\bsi (?!(me )?(caigo|resbalo|tropiezo)\\b)(\\w+ ){0,4}\\w+) me (mato|suicido)\\b${NO_ES_ME_MATO}|\\bme (mato|suicido) (y ya|y se acaba|de una vez|esta noche|manana|hoy mismo|si (no|me|te|se|lo|la|le|el|ella|mi|manana))\\b|${NO_ES_SUJETO}\\bme (mato|suicido) (hoy|ya)( mismo|(?! mismo))\\b${NO_ES_ME_MATO}`

// Lo que va antes de "me va a matar" cuando no es una persona: "el estrés me
// va a matar", "este calor", "el dolor de cabeza", "este trancón", "la tusa",
// "la universidad", "la dieta", "el gimnasio", "el arriendo".
const NO_ES_COSA = '(?<!\\b(estres|calor|frio|trabajo|trafico|trancon|tusa|universidad|u|dieta|gimnasio|gym|colegio|colegio de (los|mis) (ninos|hijos)|arriendo|tesis|semestre|carrera|maestria|oficina|rutina|entreno|jornada|turno|mudanza|trasteo|fila|tramites?|cansancio|examen|parcial|tarea|tareas|guayabo|hambre|sueno|espera|suspenso|intriga|curiosidad|sol|gastritis|migrana|colicos?|gripa|gripe|tos|novela|serie|clima|ruido|bulla|dolor de (cabeza|muela|muelas|espalda|estomago|barriga|garganta|oido|rodilla)) )'
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
// A dónde va a tirarse cuando dice el plan: un lugar alto, el agua, la vía
// ("voy a la represa y me tiro", "voy a ir al puente a tirarme").
const LUGAR_PLAN = `(${SITIO_ALTO}|represa|embalse|rio|quebrada|salto|cascada|cerro|montana|penol|metro|tren|carrilera|via del tren|linea del metro|tequendama)`
// Lo que va antes de "me ahorca" o "me aprieta el cuello" cuando no es una
// persona: "esta camisa me ahorca", "el brasier nuevo me ahorca", "las deudas
// me ahorcan".
const NO_ES_ROPA = '(?<!\\b(camisa|blusa|corbata|brasier|ropa|vestido|jean|pantalon|bufanda|collar|cuello|deuda|deudas|cuentas|arriendo|hipoteca|tarjeta|trabajo|estres|calor)( \\w+)? )'

// Desde dónde o hacia dónde: un lugar alto, el vacío, un vehículo, la vía.
// "Al piso" o "a la cama" no; "del quinto piso" o "del piso 10", sí. "Al río a
// nadar" o "del puente en bungee" tampoco. También la línea del metro, la
// represa, el salto, el cerro o el Peñol ("del cerro en bicicleta" no).
const LUGAR_ALTO = `(de|del|desde|por|al|a|hacia|contra|frente a|frente al|debajo de|debajo del|bajo|a las (llantas|ruedas) de|a las (llantas|ruedas) del) ((el|la|los|las|un|una|este|esta|ese|esa|mi|lo alto de|lo alto del|lo mas alto de|lo mas alto del) )?(vacio|${SITIO_ALTO}|(linea|via|vias|rieles|carrilera) del (metro|tren)|metro|tren|transmilenio|carros?|bus|buses|buseta|camion|tractomula|rio|quebrada|vias?|carrilera|rieles|carretera|autopista|represa|embalse|salto|cascada|(cerro|cerros|montana|loma|morro|penol|piedra del penol)\\b(?! en (bici|bicicleta|cicla|moto|patineta|tabla|skate|patines|ala delta|carro|mountain bike|downhill)\\b))\\b(?! (a (nadar|banar(me|nos)?|jugar|pescar|refrescar(me|nos)?|chapotear|flotar|bucear)|(en|de|haciendo) (el |un |una |la )?(paseo|bungee?|puenting|parapente|paracaidas|tirolina|tirolesa|neumatico|flotador|kayak|lancha|bote|tobogan))\\b)`

// Las pastillas, también por el nombre de los medicamentos más comunes, en
// singular o plural ("20 ibuprofenos", "15 clonazepames").
const PASTILLAS = '(pastillas|pepas|pildoras|medicinas|medicamentos|tabletas|capsulas|pastas|acetaminofen|paracetamol|dolex|ibuprofeno|naproxeno|diclofenaco|aspirina|tramadol|clonazepam|rivotril|alprazolam|lorazepam|diazepam|zolpidem|sertralina|fluoxetina|escitalopram|trazodona|quetiapina|amitriptilina)(e?s)?'

// Morir como remate de "sería más fácil…", "la única salida es…" o "fantaseo
// con…". No cuando es la risa, "morir de pie", "en el intento", "en paz" o
// "de viejita".
const MORIR_FIN = `morir(me)?\\b${NO_ES_RISA}(?! (de pie|en el intento|intentandolo|luchando|en paz|tranquila|de viej\\w+|ancian\\w+)\\b)`
// Lo que remata "sería más fácil…", "lo mejor es…" o "la única opción es…"
// cuando habla de morir o de no estar: "morirme", "matarme", "no existir",
// "no despertar", "si me muero", y "no estar" o "desaparecer" al final de la
// cláusula ("es mejor no estar triste" o "es mejor desaparecer de su vida" no).
const FIN = `(${MORIR_FIN}|matarme\\b${NO_ES_ESFUERZO}|suicidarme|quitarme la vida|estar muert[ao]|no (existir|haber nacido|despertar(me)?\\b${NO_ES_SUENO}|seguir viviendo|seguir viva|seguir vivo|vivir\\b${NO_ES_VIVIR_CON}(?! (tan|sola|solo|juntos|juntas)\\b)|estar( (aqui|aca|viva|vivo|en este mundo|mas))?(?=$| (y|pero|porque|para que|ya|nunca|asi|total)\\b))|desaparecer(me)?( para siempre| de este mundo| de esta vida)?(?=$| (y|pero|porque|ya|asi|nadie|total|para que)\\b)|si (yo )?((me muero|muero|me muriera)\\b${NO_ES_RISA}|me mato\\b${NO_ES_ESFUERZO}|(desaparezco|desapareciera|no existiera|no estuviera)\\b(?! (\\w+ando|\\w+iendo|en|con|de|tan)\\b)))`
// Lo que viene después de las pastillas cuando no son para hacerse daño:
// "pienso en hacerlo con mi novio, pero las pastillas anticonceptivas…".
const NO_ES_PLANIFICAR = '(?! (anticonceptiv\\w*|del dia despues|de (planificar|adelgazar|vitaminas?)|para (planificar|adelgazar|bajar de peso|no quedar))\\b)'
// Quien suele ser el agresor en la pareja o en la casa.
const PAREJA = '(esposo|marido|pareja|novio|ex|exesposo|expareja|exnovio|companero)'

// Lo que se toma como veneno: también "límpido" y "Clorox", como se dice el
// blanqueador en Colombia, y las marcas de venenos del campo y de la casa
// (Lannate, Klerat, Baygon, Racumin, Tamarón).
const VENENOS = '(veneno|raticida|matarratas|cloro|limpido|clorox|varsol|insecticida|cianuro|soda caustica|acido (muriatico|sulfurico)|creolina|thinner|tiner|gasolina|lejia|blanqueador|desinfectante|herbicida|glifosato|paraquat|gramoxone|furadan|lannate|klerat|baygon|racumin|tamaron|folidol|thimet|metamidofos|organofosforados?|matamalezas|roundup)'
// Cuánto: "un vaso de", "una botella de", "un frasco de", "un trago de".
const CUANTO_VENENO = '(el |la |un |una |un poco de |algo de |todo el |toda la |el frasco de |un frasco de |el frasquito de |un frasquito de |la botellita de |una botellita de |el tarrito de |un tarrito de |el sobre de |un sobre de |una botella de |la botella de |media botella de |un vaso de |el vaso de |medio vaso de |una taza de |un pocillo de |un trago de |un sorbo de |un tarro de |el tarro de |un galon de |una tapa de |medio frasco de )?'
// Lo que viene después del veneno cuando no se lo toma: "tomo el límpido de
// la repisa y lo echo", "para limpiar el baño".
const NO_ES_ASEO = '(?! (y (lo |la )?(eche|echo|use|uso|aplique|aplico|regue|riego|mezcle|mezclo|puse|pongo|limpie|limpio|lave|lavo|desinfecte|desinfecto|trapee?|trapeo|blanquee?|restregue|friegue|fumigue|fumigo|rocie|rocio|mate (las|los|a las|a los)|mato (las|los|a las|a los))|para (limpiar|lavar|desinfectar|trapear|blanquear|el bano|la ropa|el piso|la cocina|echarle|echar|fumigar|matar (las|los)|espantar)|de la (alacena|repisa|tienda|estanteria|cocina|bodega)|del (estante|mueble|supermercado|lavadero))\\b)'
// Lo que viene después de "el tarro", "la tableta" o "la tira" cuando no son
// pastillas: "el tarro de yogurt", "la tableta de chocolate".
const NO_ES_COMIDA = '(?! de (chocolate|chocolatina|panela|yogurt|yogur|kumis|avena|leche|jugo|vino|cerveza|aguardiente|ron|gaseosa|agua|cafe|te|aromatica|colada|proteina|helado|suero|electrolitos|sopa|caldo|vitaminas?|colageno|tinto|mermelada|arequipe|miel|galletas|dulces|gomitas|chicles?|mani|chocolates|bocadillo)\\b)'

// Cuándo, cuando se dice el día del plan: "el viernes me mato", "este fin de
// semana", "en navidad", "el 31", "a fin de mes", "el día de mi cumpleaños",
// "cuando se vayan todos".
const CUANDO_PLAN = '(el|este|esta|el proximo|la proxima|este mismo|esta misma|el otro) (lunes|martes|miercoles|jueves|viernes|sabado|domingo|fin de semana|finde|semana|mes|ano|noche|madrugada|tarde)|(en|para|el dia de|la noche de|antes de|despues de) (navidad|nochebuena|nochevieja|ano nuevo|fin de ano|semana santa|reyes|vacaciones|(mi|su|el) (cumpleanos|aniversario|grado|boda|santo))|el dia de (mi|su|nuestro|nuestra) (cumpleanos|aniversario|grado|boda|matrimonio|santo)|(en|este|para|el \\d{1,2} de) (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)|el \\d{1,2}|a fin(al)? de (mes|ano|semana)|a finales de (mes|ano|semana)|en (unos|dos|tres|pocos|un par de) (dias|horas|semanas)|dentro de (\\w+ ){1,2}(dias|horas|semanas)|al rato|mas tarde|en la (noche|madrugada)|cuando (\\w+ ){0,3}(se )?(vayan|vaya|duerman|duerma|acuesten|acueste|salgan|salga|lleguen|llegue|quede|haya|hayan|termine|terminen|acabe|acaben|pase|pasen|vea|vean|nazca|cumpla|cobre|cobren|paguen|pague|reciba|devuelvan|devuelva|entierren|muera|case|deje|dejen|este|esten|estemos|estes)( \\w+){0,3}|despues (de|del|de que)( \\w+){1,4}|apenas( \\w+){1,3}|en cuanto( \\w+){1,3}|antes de que( \\w+){1,4}'
// Lo que viene después de "me mato" cuando exagera el esfuerzo: "el sábado
// me mato bailando", "esta semana me mato con ese proyecto".
const NO_ES_AJETREO = '(?! con (el|la|los|las|ese|esa|este|esta|esos|esas|mi|mis|tanto|tanta|tantos|tantas|todo|toda|tanto) (?!(\\w+ )?(pastillas|pepas|veneno|cuchillo|cuchilla|navaja|soga|cuerda|pistola|arma|revolver|gas|carro|moto|tiro|limpido|cloro)\\b)\\w+| (con|en) (el|la|los|las|ese|esa|este|esta|esos|esas|mi|mis|tanto|tanta) (\\w+ )?(proyecto|trabajo|tareas?|informe|examen|parcial|parciales|gym|gimnasio|oficina|dieta|rutina|entreno|ejercicio|casa|oficios?|estudio|clases?|turnos?|universidad|u|colegio|fiesta|rumba|baile|partido)\\b| (?!(tomando|tragando|bebiendo|ahorcando|colgando|cortando|tirando|lanzando|envenenando|disparando)\\b)\\w+(ando|iendo|yendo)\\b| \\w+(ar|er|ir)\\b| a (punta|pulso|fuerza|\\w+(ar|er|ir))\\b)'

// Grupos armados y bandas que amenazan: "la guerrilla me amenazó", "los paras
// me amenazaron", "los de la oficina", "los del gota a gota".
const ARMADOS = '(guerrilla|guerrilleros?|farc|eln|elenos?|paras|paracos|paramilitares|autodefensas|disidencias?|clan del golfo|gaitanistas|urabenos|rastrojos|bacrim|grupo armado|grupos armados|los armados|la oficina|los de la oficina|pandilla|pandilleros?|sicarios?|narcos?|mafia|mafiosos?|extorsionistas?|gota a gota|cobradiario|prestamistas?|los duros|combo|combos|la banda|las bandas)'

// Quien hace daño en la casa (para "miedo de que mi esposo me mate").
const AGRESOR = '(esposo|marido|pareja|novio|ex|exesposo|expareja|exnovio|companero|hij[oa]|hijastr[oa]|papa|padre|padrastro|mama|madre|madrastra|herman[oa]|cunad[oa]|suegr[oa]|tio|tia|primo|abuelo|vecino|jefe|novia|esposa|man|tipo|senor|hombre)'
// Una niña, un niño o alguien de la familia (para "mi padrastro toca a mi hija").
const MENOR = '(hij[oa]s?|hijastr[oa]s?|nin[oa]s?|nen[ae]s?|bebes?|niet[oa]s?|sobrin[oa]s?|hermanit[oa]s?|herman[oa]s? (menor|pequen[oa]|chiquit[oa])|chiquit[oa]s?|pequen[oa]s?|alumn[oa]s?|estudiantes?|princesa|ahijad[oa])'

// Señales de crisis de alto riesgo.
export const CRISIS_PATTERNS = [
  /\b[sz]u(i[csz]|[csz])id/, /\bquitar(me|se)? la vida\b/, new RegExp(`matarme\\b${NO_ES_ESFUERZO}`), new RegExp(`me quiero morir${NO_ES_RISA}`),
  // "No quiero vivir con ansiedad" o "no quiero seguir aquí en este trabajo"
  // no; "no quiero vivir así", "sin él", "en este mundo" o "en este infierno",
  // sí.
  new RegExp(`quiero morir${NO_ES_RISA}`), /no quiero (vivir|seguir viviendo|seguir aca|seguir aqui)\b(?! (con|en (?!(este|esta) (mundo|vida|infierno)\b)|para|de|del|por|pendiente|bajo|a medias|al dia|a la|al|preocupada|estresada|angustiada|corriendo|apurada)\b)/,
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
  new RegExp(`\\bme corto\\b${NO_ES_PELO}${NO_ES_RUPTURA}`),
  /\b(cortar(me)?|abrir(me)?|me (abro|abri|abrire|abriria)) (las|mis) venas/,
  new RegExp(`ganas de (morir(me)?\\b${NO_ES_RISA}|matarme\\b${NO_ES_ESFUERZO}|suicidarme|no despertar|no existir)`),
  /\b(quiero|quisiera|prefiero|preferiria|me gustaria|desearia|ojala|deseo) (estar |estuviera |estuviese )?muert[ao]s?\b/,
  new RegExp(`\\b(quiero|quisiera|queria|quise|prefiero|preferiria|me gustaria|desearia|deseo|deseaba|provoca) morir(me)?\\b${NO_ES_RISA}`),
  /\bojala (no despertar|no despierte|no amanecer)(?! con (guayabo|resaca|ratabo|dolor de cabeza|ojeras|hambre|frio|sueno|la alarma|el despertador|ruido|bulla)\b| (tan |muy )?temprano\b)/,
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
  new RegExp(`\\bno (le )?(veo|encuentro|tiene|hay) (ningun )?sentido (a |de |en )?(la |mi )?(vida|vivir|seguir${NO_ES_ALGO})\\b`),
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
  new RegExp(`${TIRARME} (con (el|la|mi) (carro|moto|auto|camioneta) )?${LUGAR_ALTO}`),
  /\b(ojala|quiero que|quisiera que) me (atropelle|atropellen|pise)\b/, /\b(quiero|quisiera|deseo|me gustaria) que (un|una|el|la|algun|alguna) (\w+ ){0,2}me (atropelle|atropellen)\b/, /\bojala me (mate|maten)\b/,
  // El lugar antes del verbo ("estoy en la terraza y quiero saltar", "me subí
  // al puente y me voy a tirar"), dejarse caer, atravesarse en la vía y "ojalá
  // un carro me atropelle". No activan "estoy en la terraza y quiero tirar la
  // basura", "me voy a lanzar a hacer yoga" ni "me dejé caer en el sofá".
  new RegExp(`\\b(estoy|ando|sigo|me subi|subi) (en|a|al) (el |la |un |una |lo alto de(l)? (el |la )?)?${SITIO_ALTO}\\b(?! festivo).{0,60}${TIRARME}\\b(?! (en|la|el|los|las|un|una|a (la|el) (cama|piscina|sofa|hamaca|agua|mar)|a \\w+(ar|er|ir))\\b)`),
  new RegExp(`(\\bdejarme|\\bme (\\w+ ){0,2}dej(ar|o|e|are|aria)) caer ${LUGAR_ALTO}`),
  new RegExp(`\\b(estoy|ando|sigo|me (subi|pare|sente)) (\\w+ )?(en|sobre) (el borde|la orilla|la baranda|la cornisa|el filo) (de|del) (la |el )?${SITIO_ALTO}\\b`),
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
  /\bme (rasguno|rasgune|arano|arane|rasco|pellizco|muerdo|golpeo|pego|corto|lastimo|arranco|arranque|arrancaba|jalo|halo) .{0,20}hasta (sangrar|que (me )?sangr\w*|hacerme sangre|(sacarme|sacar|hacerme salir) (la )?sangre|hacerme sangrar|que (me )?(salen|sale|salgan|quedan|queden|dejo|hago) (heridas|sangre|marcas|moretones|morados|cicatrices))\b/,
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
  new RegExp(`\\bsi (?!(llego tarde|${SI_REGANO}) (\\w+ ){0,2}(mi|la|el) (mama|mami|papa|papi|jefe|jefa|profe|profesora|profesor|abuela|suegra) me\\b)(\\w+ ){1,5}me (mata|matan|mataba|mataban|mataria|matarian|matara|va a matar|van a matar|iba a matar|iban a matar)\\b(?! (el|la|los|las|un|una|de)\\b)`),
  // Contra los hijos, con un arma, con ácido o fuego, y lo que "dijo que me
  // iba a hacer": "dijo que va a matar a mis hijos", "amenazó con quemar la
  // casa", "me amenaza con el machete", "me dijo que me iba a picar". No
  // activan "va a matar a mi hijo cuando vea el carro", "me dijo que me iba
  // a pegar la gripa", "el jefe me amenazó con echarme si llego tarde" ni "la
  // profe amenazó con rajarme en matemáticas".
  /\b(va|van|iba|iban) a matar a (mis|mi|los|las|nuestros|nuestras) (hijos|hijas|hijo|hija|bebe|bebes|ninos|ninas|nino|nina|familia|mama|papa)\b(?!.{0,20}\b(cuando|si) (vea|ve|sepa|se entere|descubra)\b)(?! (de (la )?(risa|susto|emocion)|del susto)\b)/,
  /\b(amenaza|amenazo|amenazaba|amenazan|amenazaron|amenazando) con (matar|matarme|matarnos|matarlos|matarla|hacerme dano|hacerle dano|hacernos dano|quemar(me|nos)?|echarme\b(?! (si|del (trabajo|colegio|grupo|equipo|curso|salon|puesto)|de (la )?(empresa|oficina|clase|universidad|u))\b)|tirarme|lanzarme|desaparecer(me|nos)?|picarme|rajarme\b(?! (en|el|del|la (materia|nota|clase|asignatura|evaluacion|tesis))\b)|desfigurarme|pegarme|golpearme|llevarse a (mis|los) (hijos|ninos)|quitarme a (mis|los) (hijos|ninos)|matarse|suicidarse)\b(?! (el|la) (tiempo|rato)\b)/,
  /\btiene (un|una) (arma|pistola|revolver|machete|escopeta|cuchillo|navaja) y me (amenaza|amenazo|amenazaba|apunta|apunto)\b/,
  new RegExp(`\\b(dijo|dice|decia|amenazo|amenaza|amenazaba|jura|juro|grito|escribio) que me (va|iba) a (matar|picar|rajar|desaparecer|desfigurar|quemar|apunalar|acuchillar|degollar|descuartizar|enterrar|golpear|cascar|hacer dano|pegar|ahorcar)\\b${NO_ES_GRIPA}`),
  /\b(me tiene|me tienen|me tenia|me tenian|estoy|vivo|me siento) amenazad[ao]\b(?! (de|con) (despido|despedirme|echarme|demanda|demandarme|multa|sacarme del|quitarme el (puesto|trabajo)|(el |la |los |las )?(arriendo|cobros?|deudas?|cuentas?|factura|banco|datacredito|embargo|desalojo|tarjeta|cuotas?|intereses|recibos?)\b))/,
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
  /\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) (todo el (frasco|tarro|blister)|toda la caja|el (frasco|tarro|blister) (entero|completo)|la caja (entera|completa))\b(?! de (chocolate|chocolatina|panela|yogurt|yogur|kumis|avena|leche|jugo|vino|cerveza|aguardiente|ron|gaseosa|agua|cafe|te|aromatica|colada|proteina|helado|suero|electrolitos|sopa|caldo|vitaminas?|colageno|tinto|mermelada|arequipe|miel|galletas|dulces|gomitas|chicles?|mani|chocolates|bocadillo)\b)/,
  /\bme las (\w+ ){0,2}(tomar|tome|tomo|tragar|trague|trago) todas\b/,
  new RegExp(`\\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) (las|mis) ${PASTILLAS}( de (mi|mis|la|el|los) \\w+| (de|para) dormir)? todas\\b(?! (las|los)\\b)`),
  // Sin ganas de vivir: "estoy cansada de vivir", "perdí las ganas de vivir",
  // "para qué seguir viviendo", "no quiero seguir con vida".
  new RegExp(`\\b(cansada|cansado|harta|harto|agotada|agotado|aburrida|aburrido) de (vivir|estar viva|estar vivo|existir|la vida)\\b${NO_ES_VIVIR_CON}`),
  new RegExp(`\\bme (canse|harte|aburri) de (vivir|existir|la vida)\\b${NO_ES_VIVIR_CON}`),
  new RegExp(`\\b(no tengo|ya no tengo|sin|perdi las|no me quedan|se me fueron las|se me acabaron las) (ganas|razones|motivos|fuerzas) (de|para) (vivir|seguir viviendo|seguir con vida|seguir viva|seguir vivo|estar viva|estar vivo|existir)\\b${NO_ES_VIVIR_CON}`),
  /\bno tengo (por|para) que (vivir|seguir)\b/,
  new RegExp(`(^|\\b(y|pero|entonces|no se|me pregunto|pienso|preguntando) )para que (vivir|seguir viviendo|seguir con vida|existir|sigo viva|sigo vivo)\\b${NO_ES_VIVIR_CON}`),
  new RegExp(`\\bno aguanto (mas )?(vivir|la vida|esta vida|seguir viviendo|seguir con vida|existir)\\b${NO_ES_VIVIR_CON}`),
  /\bno quiero seguir con vida\b/,
  /\bdormir(me)? para siempre\b/,
  /\bno (quiero|quisiera|deseo) (volver a )?amanecer\b(?! (tan|muy|cansada|agotada|con|de|en|sin|temprano|trasnochada)\b)/,
  // Sentirse una carga o creer que nadie la extrañaría.
  /\b(soy|me siento|siento que soy) (una|un) (carga|estorbo\b(?! (en|con) (la|el|esta|este|mi)\b)|peso (muerto )?para (todos|todas|ustedes|ellos|ellas|mi familia|mis hijos|nadie))\b/,
  // "Mejor sin mí", no merecer vivir y no haber querido nacer: "el mundo sería
  // mejor sin mí", "mis hijos estarían más felices sin mí", "no merezco
  // vivir", "quisiera no haber nacido". No activan "la reunión fue mejor sin
  // mí", "sería mejor sin mi novio", "no merezco vivir así", "no debería comer
  // tanto dulce" ni "quisiera no haber nacido en esta época".
  /\b(estarian|estaria|seria|serian|vivirian|viviria) (\w+ ){0,3}(mejor|mas felices|mas feliz|mas tranquil[oa]s?|en paz)( para (todos|todas|ellos|ellas|mi familia|mis hijos))? sin mi(?= (y|pero|porque|que|todos|ya|lo|asi|de verdad|seguro|nadie|no|me|eso|esto|la verdad|en serio|creo|se)\b|$)/,
  /\b(estarian|estaria|seria|serian|vivirian|viviria) (\w+ ){0,3}(mejor|mas facil|mas felices|mas feliz|mas tranquil[oa]s?|en paz)( para (todos|todas|ellos|ellas|mi familia|mis hijos))? si yo no (existiera|estuviera|hubiera nacido)\b(?! (en (la|el|esta|este) \w+|\w+ando|\w+iendo)\b)/,
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
  new RegExp(`${NO_ES_NINO}${NO_ES_TUSA}\\bme (pego|pegaron|pegaban)\\b${NO_ES_GRIPA}${NO_ES_NOTICIA}${NO_ES_MUEBLE}`),
  new RegExp(`${NO_ES_NINO}${NO_ES_TUSA}\\bme (golpeo|golpearon|golpeaba|golpeaban|golpean)\\b${NO_ES_NOTICIA}${NO_ES_MUEBLE}`),
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
  /\bme (rompio|rompieron|partio|partieron|fracturo|revento|reventaron) (la|el|los) (nariz|boca|labio|cara|costillas?|ceja|dientes?|brazo|mandibula|ojo|frente|pomulo|tabique|clavicula|pierna|mano|dedos?|craneo)\b/,
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
  /\bme (tira|tiro|tiraron|tiraba|estrella|estrello|estrellaron|estrellaba|empuja|empujo|empujaron|empujaba|lanza|lanzo|lanzaron|avienta|avento|bota|boto|azota|azoto) contra (la|el|las|los) (pared|paredes|piso|suelo|muro|puerta|mesa|carro|nevera|closet|cama|esquina|escaparate|mueble|muebles|armario|vitrina|ventana|espejo|lavamanos|estufa|reja|baranda|escalera|escaleras|cocina|silla|televisor|inodoro|ducha|columna|poste|lavadero|meson|comedor|peinador|tocador)\b/,
  new RegExp(`${NO_ES_NINO}\\bme (jalo|jala|jalaba|jalaron|jalan|halo|hala|halaba|arrastro|arrastra|arrastraba|arrastraron|agarro|agarra|agarraba|cogio) (del|por el|de los|por los) (pelo|cabello|pelos)\\b`),
  /(?<!\b(puerta|caida|golpe|vacuna|inyeccion|aguja|examen|cama|mesa|silla|pelota|balon) )\bme (dejo|dejaron|deja|dejaba) (\w+ ){0,2}(morad[ao]s?|moretones|marcas de (golpes|dedos))\b(?! de (la |tanta |tanto )?(risa|reir|frio)\b)/,
  /\b(moretones|morados|marcas) (\w+ ){0,4}(de|por) (los|sus|tantos) (golpes|punos|patadas|cachetadas|correazos)\b/,
  /\bme (tumbo|tumbaron|tumba|tumbaba) (al piso |al suelo )?(de|a) (un|una) (golpe|puno|punetazo|cachetada|bofetada|patada|empujon|trompada)\b/,
  /\bme (quiso|intento|trato de|quisieron|intentaron) (ahogar|asfixiar|estrangular|quemar|apunalar|acuchillar|envenenar|atropellar)\b/,
  new RegExp(`${NO_ES_NINO}\\bme (lanzo|lanzaron|tiro|tiraron|avento|aventaron|arrojo|arrojaron|boto|botaron) (un|una|el|la) (plato|vaso|taza|botella|silla|zapato|piedra|ladrillo|cuchillo|olla|celular|control|cenicero|plancha|tabla|palo|martillo) (en|a|contra|por) (la|mi) (cara|cabeza|frente|espalda|boca)\\b`),
  /\b(vivo|sufro|sufri|sufriendo|viviendo|vivi|padezco|soy victima de|fui victima de|victima de) (violencia|maltrato|abuso|(una )?violacion\b(?! (de|a) (los |mis |mi |la |sus |su )?(datos|privacidad|derechos|ley|contrato|normas?|seguridad|transito|cuenta|correo)\b)|agresion sexual|incesto)\b(?! (obstetrica|laboral|academic[oa]|escolar|institucional|politica|en (las|los|la|el) (noticias|series|peliculas|redes|novelas|calles|pais|ciudad|barrio))\b)/,
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
  /\b(padrastro|tio|primo|abuelo|cunado|suegro|vecino|hermanastro|(novio|esposo|pareja|marido) de mi (mama|madre)) (\w+ ){0,2}(se mete|se metia|se metio|entra|entraba|entro|se pasa|se pasaba) (a|en|por) mi (cuarto|cama|habitacion|pieza|bano)\b(?=.{0,50}\b(noches?|madrugadas?|no esta|nadie|dormida|duermo|sola|escondidas)\b)/,
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
  new RegExp(`(?<!\\b(suerte|recuerdo|recuerdos|pasado|culpa|ansiedad|tristeza|miedo|miedos|fantasma|perro|perrito|gato|gatico|sombra|cancion|olor|idea|pensamiento|pensamientos|trabajo|deuda|deudas|fama|karma|estres|tusa|duda|dudas|cobradores?|bancos?) )${NO_ES_NINO}\\bme (persigue|perseguia|persiguen|perseguian|persiguio|persiguieron|esta persiguiendo|estan persiguiendo|acecha|acechaba|acechan|esta acechando|esta siguiendo|estan siguiendo|viene siguiendo|acosa|acosaba|acosan|acosaban|acoso|acosaron|esta acosando|estan acosando)\\b(?!(?<=\\b(nin[oa]s?|hij[oa]s?) me (persigue|perseguia|persiguen)) (por|a) (toda la casa|todas partes|todos lados|todo lado)\\b)(?! ((la|el|los|las|ese|esa|este|esta|mi|mis) (\\w+ )?(suerte|recuerdo|recuerdos|pasado|culpa|ansiedad|tristeza|miedo|miedos|fantasma|idea|pensamiento|pensamientos|cancion|olor|fama|karma|estres|tusa|deuda|deudas|trabajo|duda|dudas|cobradores?|bancos?|llamadas|juego)|(en|por) (instagram|tiktok|redes|las redes|twitter|faceboo?k|ig|insta|youtube))\\b)`),
  /\borden(es)? de (alejamiento|restriccion|proteccion)\b/,
  /\b(me llegan|me llegaron|me han llegado|recibo|recibi|me mandan|me manda|me envia|me envian|estoy recibiendo|me hace|me hacen|me hizo) (\w+ )?amenazas\b(?! de (despido|demanda|desalojo|cobro|embargo|demandarme|despedirme)\b)/,
  /\b(miedo|temo|terror|panico) (de )?que (me|nos|le) (haga|hagan|vaya a hacer|vayan a hacer) (algo|dano)( malo|(?! malo))\b(?! (la|el|los|las) (vacuna|medicamento|medicina|pastilla|comida|operacion|cirugia|tratamiento|droga|inyeccion|anestesia)\b)/,
  /\bno me deja(ba|n)? salir (de la casa|de casa)\b.{0,30}\bme (quito|quita|quitaba|esconde|escondio|rompio) (el|mi|los|mis) (celular|telefono|documentos|pasaporte|cedula|plata|dinero|llaves)\b/,
  // Una hija, una amiga o la mamá en crisis: "mi hija se quiere matar", "mi
  // amiga me dijo que se va a matar", "mi hijo se corta", "a mi amiga la viola
  // su padrastro", "a mi vecina le pega su esposo". No activan "mi hija se
  // quiere morir de la risa", "se quiere matar estudiando", "mi abuela se va a
  // morir", "mi hija se corta el pelo" ni "mi papá le pegó la gripa".
  new RegExp(`\\b(mi|una|la|el) (hija|hijo|amiga|amigo|hermana|hermano|prima|primo|sobrina|sobrino|nieta|nieto|alumna|alumno|mama|papa|madre|padre|esposo|esposa|marido|novio|novia|pareja|companera|vecina|cunada|tia|ex|exnovio|exnovia|exesposo|expareja) (\\w+ ){0,4}se (quiere|queria|quiso|quisiera|piensa|intento|trato de|ha intentado|esta intentando) (matar|suicidar|morir|quitar la vida|ahorcar|envenenar|tirar (de|del|desde|por))\\b${NO_ES_ESFUERZO}${NO_ES_RISA}`),
  new RegExp(`\\b(mi|una|la|el) (hija|hijo|amiga|amigo|hermana|hermano|prima|primo|sobrina|sobrino|nieta|nieto|alumna|alumno|mama|papa|madre|padre|esposo|esposa|marido|novio|novia|pareja|companera|vecina|cunada|tia|ex|exnovio|exnovia|exesposo|expareja) (\\w+ ){0,4}se (va|iba) a (matar|suicidar|quitar la vida|ahorcar|envenenar|tirar (de|del|desde|por))\\b${NO_ES_ESFUERZO}(?! (en|con) (esa|ese|la|el|una|un) (moto|carro|bici|bicicleta|patineta)\\b)`),
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
  // La muerte como alivio, salida o lo más fácil: "sería más fácil morirme",
  // "lo más fácil sería no existir", "sería mejor no despertar", "a veces
  // pienso que sería más fácil no estar", "sería más fácil si me muero", "la
  // muerte sería un alivio", "la muerte es mi única salida", "la única opción
  // que me queda es morir", "no veo salida, solo la muerte", "solo la muerte
  // me va a liberar", "fantaseo con morirme", "quisiera que me diera algo y
  // no despertar". No activan "es mejor no estar
  // triste", "es mejor desaparecer de su vida", "sería mejor no despertar a la
  // bebé", "es mejor morir de pie", "la muerte de mi abuela fue un alivio para
  // ella" ni "sueño con morir de viejita".
  new RegExp(`\\b(seria|es|sera|resulta|resultaria) (mas facil|mas sencillo|mejor|lo mejor|lo mas facil|un alivio)( para (todos|todas|ellos|ellas|mi familia|mis hijos))? ${FIN}`),
  new RegExp(`\\blo (mas facil|mas sencillo|mejor|unico que (quiero|me queda|puedo hacer)) (seria|es|sera) ${FIN}`),
  /\b(la muerte|morir(me)?|matarme|suicidarme|no despertar|no existir|dejar de existir) (seria|sera|va a ser|es (mi|la)( unica)?) (un |una |el |la |mi )?(alivio|descanso|liberacion|bendicion|salida|solucion|opcion|escape)\b(?! (para|de) (ella|el|ellos|ellas|los|las|su|sus|mi (abuel|mama|papa|tia|tio|perr|gat|herman)\w*)\b)/,
  new RegExp(`\\b(unica|ultima) (salida|opcion|solucion|alternativa) (que (me )?(queda|veo|tengo|encuentro|hay) )?(es|seria|sera) (la muerte|${FIN})`),
  /\bno (veo|hay|tengo|encuentro|le veo) (otra |ninguna )?salida\b.{0,25}\b(solo|sino|mas que|excepto|aparte de) (la muerte|morir(me)?|matarme|suicidarme)\b/,
  /\bsolo (la muerte|morir(me)?|matarme) (me )?((va|van) a |puede |podria |podra )?(me )?(liber\w*|salv\w*|dar(me)? paz|da paz|quit\w*|alivi\w*|ayud\w*)/,
  new RegExp(`\\b(quisiera|quiero|ojala|desearia|me gustaria) (que )?me (de|diera|diese|pase|pasara|pasase) algo (y|para) (no (volver a )?despertar(me)?\\b${NO_ES_SUENO}|${MORIR_FIN}|me muera|me muriera)`),
  new RegExp(`\\b(fantaseo|fantaseando|fantaseaba|fantasear|sueno|sonando|sonaba|imagino|imaginando|imaginaba) con (${MORIR_FIN}|(la|mi) muerte\\b(?! (de|del)\\b)|matarme|suicidarme|quitarme la vida|mi funeral|no (existir|despertar)\\b${NO_ES_SUENO})`),
  // "Si no fuera por mis hijos ya me hubiera matado" o "ya no estaría aquí",
  // "mis hijos son lo único que me detiene", "lo único que me mantiene viva".
  // No activan "si no fuera por el casco me hubiera matado" ni "si no fuera
  // por mi mamá no estaría aquí".
  /\bsi no (fuera|fuese|hubiera sido|existieran?|estuvieran?) por ((mis|mi|ellos|ellas)( (hijos|hijas|hijo|hija|familia|nietos?|nietas?|perr\w+|gat\w+))? (ya )?|(\w+ ){1,3}ya )(me (hubiera|habria|hubiese) (matado|suicidado|quitado la vida|ahorcado|tirado)|no (estaria|seguiria|existiria) (aqui|aca|viva|vivo|en este mundo|con vida))\b/,
  /\b(mis|mi) (hijos|hijas|hijo|hija|familia|mama|papa|nietos?|nietas?|perr\w+|gat\w+) (son|es) (lo unico|la unica (razon|cosa)) que me (detiene|frena|mantiene|tiene (viva|vivo|aqui)|ata a la vida)\b/,
  /\blo unico que me (mantiene|tiene) (viva|vivo|con vida|aqui|en este mundo)\b/,
  // El carro a propósito, contra un camión o debajo de un bus: "voy a
  // estrellar el carro a propósito", "quiero estrellarme con el carro", "voy a
  // manejar contra un camión", "me voy a meter debajo de un bus". No activan
  // "me voy a estrellar con el carro si sigo manejando así", "me metí debajo
  // del carro a buscar la pelota" ni "voy a chocar con la realidad".
  /\b(estrellar(me)?|chocar(me)?|voltear(me)?|desbarrancar(me)?|estrello|choco|estrelle|choque|volteo|voltee) (\w+ ){0,2}(carro|moto|auto|camioneta|carrito) (\w+ ){0,4}a proposito\b/,
  /(\bme (quiero|quisiera|provoca|dan ganas de|daban ganas de|gustaria) (estrellar|chocar|botar|tirar|lanzar|desbarrancar|voltear)|\b(quiero|quisiera|me provoca|ganas de|pienso en|pensando en|he pensado en) (estrellarme|chocarme|botarme|tirarme|lanzarme|desbarrancarme|voltearme)) (\w+ ){0,2}(con|en|contra) (el|la|mi|un|una) (carro|moto|auto|camioneta|camion|bus|tractomula|muro|pared|poste)\b/,
  /\b(voy a|quiero|quisiera|me provoca|ganas de|pienso|pensando en) (manejar|conducir|meter el carro|meter la moto|lanzar el carro|tirar el carro|echar el carro|echarle el carro|meterme|meter|lanzarme|tirarme|echarme|atravesarme) (\w+ )?(contra|de frente contra|de frente a|debajo de|debajo del|bajo) ((un|una|el|la|los) )?(camion|tractomula|bus|buseta|volqueta|muro|pared|poste|carro|carros|tren|metro|transmilenio|moto)\b(?! (a|para) \w+(ar|er|ir)\b)/,
  // Ahogarse: "quiero ahogarme", "me quiero ahogar", "me voy a meter en la
  // tina y ahogarme". No activan "no quiero ahogarme", "tengo miedo de
  // ahogarme", "siento que me voy a ahogar" ni "me quiero ahogar en
  // chocolate".
  /(?<!\bno )(\bme (quiero|quisiera|quise|queria|dan ganas de|daban ganas de|provoca|intente|trate de|he intentado) ahogar|\b(quiero|quisiera|quise|queria|ganas de|intente|trate de|pienso|pensando en|me provoca|me gustaria) ahogarme)\b(?! (en (un vaso de agua|un mar de|tus|tu|sus|su|el trabajo|trabajo|deudas|tareas|pendientes|problemas|chocolate|helado|comida|vino|cerveza|lagrimas|llanto|mis lagrimas|el llanto|cosas|oficios)|de (risa|calor|tanto|la risa)|con (tanto|tanta|el|la|los|las|mis|este|esta|tantas|tantos|comida|agua)|comiendo|tomando)\b)/,
  /\b(tina|banera|rio|mar|piscina|lago|laguna|represa|quebrada|agua) (\w+ ){0,2}(y|para|hasta) ahogarme\b/,
  // Pastillas o veneno "para morirme" o "para no despertar", "media caja de
  // acetaminofén", "pensé en hacerlo… ya tengo las pastillas" y las pastillas
  // escondidas. No activan "tomo pastillas para no despertarme en la noche",
  // "me tomé media caja de dolex en la semana" ni "tengo las pastillas
  // escondidas de los niños".
  new RegExp(`\\b(${PASTILLAS}|pastilla|pepa|veneno|raticida|matarratas|cianuro) (\\w+ ){0,3}(para|pa) (${MORIR_FIN}|matarme|suicidarme|quitarme la vida|no (volver a )?despertar(me)?\\b${NO_ES_SUENO}|dormir(me)? para siempre|no existir|acabar con (todo|mi vida))`),
  new RegExp(`\\b(tomar(me)?|tome|tomo|tragar(me)?|trague|trago) (media caja|medio frasco|medio tarro|media tira|medio blister|media botella) de ${PASTILLAS}\\b(?! (en|durante|esta|este|cada|por|para (el|la|los|las|mi|un|una))\\b)`),
  new RegExp(`\\b(pensar|pienso|pense|pensando|pensado|penso) (\\w+ ){0,2}en hacerlo\\b.{0,100}\\b(${PASTILLAS}|soga|cuerda|cuchilla|navaja|veneno|pistola|revolver)\\b${NO_ES_PLANIFICAR}|\\b(${PASTILLAS}|soga|cuerda|cuchilla|navaja|veneno|pistola|revolver)\\b${NO_ES_PLANIFICAR}.{0,100}\\b(pensar|pienso|pense|pensando|pensado|penso) (\\w+ ){0,2}en hacerlo\\b`),
  new RegExp(`\\b(tengo|ya tengo|tengo ya|guarde|escondi) (las|mis|unas|todas (las|mis)|muchas|varias) ${PASTILLAS} (escondidas|guardadas para (eso|cuando|el dia|hacerlo))\\b(?! (de|para que (no|los))\\b)`),
  // Más violencia dicha de otra forma: "me tiró por las escaleras", "llevo
  // años aguantando golpes", "me agarró duro del brazo y me dejó marcas",
  // "tuvimos relaciones sin mi consentimiento", "me tocó mis partes", "me
  // agredieron sexualmente", "dice que me va a echar ácido", "mi ex dice que
  // se va a matar si no vuelvo", "dice que si no vuelvo con él se mata", "mi
  // esposo no me deja salir y me quitó el celular". No activan "aguantando
  // golpes de la vida", "me toco los senos para el autoexamen", "me va a echar
  // ácido hialurónico", "mi mamá me agarró del brazo para cruzar la calle" ni
  // "mi mamá no me deja salir y me quitó el celular".
  /\bme (tiro|tiraron|tiraba|empujo|empujaron|empujaba|lanzo|lanzaron|boto|botaron|avento|aventaron|arrojo|arrojaron|tumbo|tumbaron) (\w+ )?(por|de|desde) (las|la) escaleras?\b/,
  /\b(aguantando|aguanto|aguante|aguantaba|soportando|soporto|soporte|soportaba|aguantar|soportar) (sus |los |tantos |muchos |esos |mas )?(golpes|palizas|maltratos?|cachetadas|patadas|punos|punetazos|correazos)\b(?! (de la vida|del destino|de la suerte|bajos|en (el|la) (boxeo|ring|entreno|entrenamiento|gym|gimnasio|clase|partido|cancha))\b)/,
  new RegExp(`${NO_ES_NINO}\\bme (agarro|agarra|agarraba|apreto|apretaba|cogio|cogia|jalo|jaloneo|zarandeo|sacudio|torcio|pellizco) (\\w+ ){0,3}(del|el|los|las|de los|de las|por el|por los|de la) (brazos?|munecas?|cuello|hombros?|piernas?|cara|mandibula|pelo|cabello)\\b.{0,40}\\bme (dejo|dejaron|deja|dejaba) (\\w+ ){0,2}(marcas|moretones|morad[ao]s?|rojo|roja|marcad[ao]s?)\\b`),
  new RegExp(`${NO_ES_NINO}\\bme (agarro|agarra|agarraba|agarraron|apreto|apretaba|cogio|cogia|jalo|jaloneo|zarandeo|sacudio|torcio) (duro|fuerte|con fuerza|a la fuerza|bruscamente|violentamente) (del|de los|por el|por los|de la|el|los|la) (brazos?|munecas?|cuello|pelo|cabello|cara|mandibula)\\b`),
  /\b(relaciones|sexo|intimidad) (\w+ ){0,4}sin (mi )?(consentimiento|permiso|que yo (quisiera|queria))\b/,
  /\bme (toca|toco|tocan|tocaron|tocaba|tocaban|manosea|manoseo|manosearon|manoseaba) (mis|las|sus) (partes( intimas| privadas)?|zonas intimas|genitales|vagina|parte intima)\b(?! (y|cuando|para|al) (me )?(arde|ardia|duele|dolia|pica|picaba|revisar(me)?|lavar(me)?|limpiar(me)?|siento (un|una|bolitas|algo))\b)/,
  /\b(agred|atac|violent)\w* sexualmente\b/,
  /\bme ((va|van|iba|iban) a |(quiere|quieren|quiso|quisieron|intento|trato de) )(echar|tirar|lanzar|botar|vaciar) (\w+ )?(acido|agua hirviendo|aceite hirviendo|gasolina|acpm)\b(?! (hialuronico|salicilico|glicolico|folico|retinoico|ascorbico|mandelico|azelaico|lactico|kojico|tranexamico|al|a la|en el|en la)\b)/,
  new RegExp(`\\b(dice|dijo|decia|amenaza|amenazo|amenazaba|jura|juro|escribio|grita|grito) que (si (\\w+ ){1,5})?se (va|iba) a (matar|suicidar|quitar la vida|ahorcar|envenenar|tirar (de|del|desde|por))\\b${NO_ES_ESFUERZO}(?! (en|con) (esa|ese|la|el|una|un) (moto|carro|bici|bicicleta|patineta)\\b)`),
  /\bsi (no )?(vuelvo|regreso|lo dejo|lo deje|lo dejaba|termino|terminamos|me voy|me separo|lo perdono|me caso|estoy|estamos|lo busco|le contesto|le hablo|lo denuncio)\b (\w+ ){0,4}se (mata|suicida|mataria|suicidaria|va a matar|va a suicidar|quita la vida|va a quitar la vida)\b/,
  new RegExp(`\\b${PAREJA}\\b.{0,40}\\bno me deja(ba|n)? salir\\b.{0,40}\\bme (quito|quita|quitaba|esconde|escondio|escondia|rompio|revisa|reviso) (el|mi|los|mis) (celular|telefono|documentos|pasaporte|cedula|plata|dinero|llaves|tarjetas?)\\b`),
  new RegExp(`\\b${PAREJA}\\b.{0,40}\\bme (quito|quita|quitaba|esconde|escondio|escondia|rompio) (el|mi|los|mis) (celular|telefono|documentos|pasaporte|cedula|plata|dinero|llaves|tarjetas?)\\b.{0,40}\\bno me deja(ba|n)? salir\\b`),
  // Despedidas, carga y legado: "adiós para siempre", "ya no voy a estar más
  // para molestar", "ya no voy a molestar más a nadie", "van a estar mejor
  // cuando yo no esté", "cuiden a mi perrito cuando ya no esté", "para qué
  // sigo aquí si nadie me quiere", "no veo para qué seguir", "mañana ya no voy
  // a estar", "no me van a volver a ver", "ya regalé todas mis cosas", "no
  // aguanto más, quiero que esto se acabe", "no puedo más con mi vida". No
  // activan "adiós para siempre a los carbohidratos", "ya no voy a molestar a
  // nadie con mis preguntas", "para qué sigo aquí en este trabajo", "mañana ya
  // no voy a estar en la oficina" ni "regalé todas mis cosas de bebé".
  /\badios para siempre\b(?! (a|al|de|del|con)\b)/,
  /\bya no (voy a estar|estare) (mas )?para (molestar|estorbar|fastidiar|incomodar|dar problemas)\b/,
  /\bya no (voy a |lo voy a )?(molestar|estorbar|fastidiar|incomodar)(les|los|las)? (mas )?a nadie( mas)?\b(?! (con|en|por|cuando)\b)/,
  /\b(estar|estaran|estara|estarian|estaria|vivir|viviran|vivira|vivirian|seran|sera|serian|seria) (\w+ ){0,4}(mejor|mas felices|mas feliz|mas tranquil[oa]s?|en paz) (\w+ ){0,4}cuando (yo )?(ya )?no (este|exista|estuviera|existiera)(?=$| (y|pero|porque|ya|lo se|seguro|de verdad|nunca mas|mas)\b)/,
  /\bcuiden (a )?(mi|mis) (\w+ ){1,2}cuando (yo )?ya no (este|estoy|exista)\b(?! (en|aqui|aca|de|trabajando|disponible|con)\b)/,
  /\bpara que sigo (aqui|aca|en este mundo|con vida)\b(?! (en (el|la|este|esta|ese|esa) (trabajo|empresa|ciudad|pais|relacion|casa|grupo|oficina|universidad|colegio|barrio|chat|app|aplicacion)|con (el|ella|este|esta|ese|esa)|trabajando|esperando|estudiando|pagando)\b)/,
  /\bno (veo|se|encuentro) (para que|por que|por que razon) seguir\b(?! (con|en|estudiando|trabajando|intentando|insistiendo|pagando|esperando|aqui)\b)/,
  /\b(manana|pronto|esta noche|hoy|en unos dias) ya no (voy a estar|estare)( (aqui|mas|para nadie))?(?=$| (y|pero|perdon|perdonen|perdonenme|los quiero|las quiero|gracias|adios)\b)/,
  /(?<!\b((en|por) (ese|esa|este|esta|el|la|esos|esas|esa|ese)( \w+)?|ahi|alla|aca|aqui) )\b(no|nunca( mas)?) me (van|vas|volveran|volveras|vuelven) a (volver a )?ver( (nunca|nunca mas|mas|jamas))?(?=$| (y|pero|perdon|los quiero|las quiero|gracias|adios)\b)/,
  /\b(ya )?(regale|reparti|done|di) (todas )?(mis cosas|todo lo que tengo|todo lo que tenia|mis pertenencias)\b(?! (de|del|viejas|que no|a la fundacion|para la mudanza|porque me (mudo|voy a mudar|cambio))\b)/,
  /\bno (aguanto|puedo|soporto) mas\b.{0,40}\bquiero que (esto|todo esto|todo|ya todo) (se acabe|se termine|termine|acabe)\b(?! (bien|pronto|rapido|para poder)\b)/,
  /\bquiero que (esto|todo esto|todo|ya todo) (se acabe|se termine|termine|acabe)\b(?! (bien|pronto|rapido|para poder)\b).{0,40}\bno (aguanto|puedo|soporto) mas\b/,
  /\b(dejare|voy a dejar|dejaria) de ser (una carga|un estorbo|un problema|una molestia)( para (nadie|todos|todas|ustedes|ellos|ellas|mi familia))?(?=$| (y|pero|ya|pronto)\b)/,
  new RegExp(`\\bno (puedo|aguanto|soporto) mas con (mi|esta) vida\\b${NO_ES_ETAPA}`),
  // Amenazas en gerundio y las del conflicto: "me están amenazando (de
  // muerte)", "me llegó un panfleto amenazándome", "salí en un panfleto", "me
  // declararon objetivo militar", "me dieron 24 horas para irme del barrio",
  // "me van a desaparecer", "la guerrilla me amenazó", "me están
  // extorsionando". No activan "me están amenazando con demandarme", "me llegó
  // el panfleto de la tienda", "me van a desaparecer las ojeras", "me dieron 24
  // horas para entregar el informe" ni "estoy en la lista negra de Datacrédito".
  /amenaz\w* de muerte/,
  /\b(me|nos) (esta|estan|sigue|siguen|ha|han|habia|habian|anda|andan|viene|vienen|vive|viven) amenazando\b(?! (con|de) (?!(matar\w*|desaparecer\w*|hacer(me|nos)? dano|quemar\w*|picar\w*|(un|una|el|la|su) (arma|pistola|revolver|cuchillo|machete|navaja))\b))/,
  /\bme (amenaza|amenazan|amenazo|amenazaron|amenazaba|amenazaban|ha amenazado|han amenazado|habia amenazado)(?= *$| (y|pero|por (whatsapp?|telefono|celular|mensajes?|redes|facebook|instagram|carta|chat|internet|llamadas?)|otra vez|de nuevo|varias veces|ayer|anoche|hoy|todos los dias|todo el tiempo|cada rato|cada vez|siempre|mucho|en la (calle|casa)|en el barrio|en mi casa)\b)(?!.{0,30}\bcon (no|quitar\w*|contar\w*|decir\w*|irse|ir(me|se)|echar\w*|demandar\w*|despedir\w*|cobrar\w*|sacar\w*|dejar\w*|castigar\w*|regan\w*|acusar\w*|denunciar\w*|llamar\w*|cortar\w*|subir\w*|bloquear\w*)\b)/,
  /\bamenazando(me|nos)\b(?! con (quitarme|quitarnos|contarle|decirle|demandarme|despedirme|echarme|cobrarme|sacarme|irse|dejarme|no (volver|hablarme|darme))\b)/,
  /\b(sali|salgo|salimos|salio mi nombre|sale mi nombre|aparezco|apareci|aparecemos|aparece mi nombre|aparecio mi nombre|me sacaron|nos sacaron|me pusieron|nos pusieron|me nombran|me nombraron|me mencionan|me mencionaron|me llego|me llegaron|me dejaron|nos llego|nos llegaron|nos dejaron|me tiraron|nos tiraron|me mandaron|me mando|me enviaron|me envio|nos mandaron|nos enviaron|me hicieron llegar|nos hicieron llegar|llego|llegaron) (\w+ ){0,2}(un|el|una|otro|unos|los) (panfletos?|sufragios?)\b(?! (de|del|con) (la |el |los |las |un |una )?(tienda|almacen|supermercado|descuentos?|ofertas?|promocion\w*|publicidad|campana|candidat\w*|concierto|evento|fiesta|iglesia|colegio|restaurante|pizzeria|domicilios|rebajas|precios|menu|gimnasio|gym|conjunto|administracion|junta)\b)/,
  /\b(estoy|estamos|aparezco|apareci|aparecemos|aparecimos|sali|salimos|salgo|me (pusieron|metieron|tienen)|nos (pusieron|metieron|tienen)|mi nombre (esta|aparece|salio|aparecio)) en (una|la) lista (negra|de (los )?(paras|paracos|paramilitares|guerrilla|guerrilleros|elenos|disidencias|la banda|la oficina|objetivos?|los que van a matar))\b(?! (de|del|en) (los |las |el |la )?(banco|bancos|datacredito|centrales|credito|tarjeta|aerolinea|tienda|restaurante|gym|empresa|bolsa)\b)/,
  /\b(me|nos|soy|somos|quede|quedamos|estoy|estamos) (\w+ ){0,3}objetivos? militar(es)?\b/,
  /\b(me|nos) (dieron|dio|dan|han dado|habian dado|daban) (\w+ ){0,2}(horas|dias|minutos) (para|pa) (irme|irnos|salir|salirme|salirnos|largarme|largarnos|abandonar|desocupar|desaparecer)\b(?=.{0,40}\b(barrio|pueblo|vereda|municipio|ciudad|region|zona|pais|territorio|finca|comuna|sector|o (me|nos) (matan|mataban|desaparecen|van a matar))\b|$| (y|o|porque|si no|sino|de aqui|de aca|de la casa|de mi casa|ya)\b)/,
  /\b(irme|irnos|salir|largarme|largarnos|pagar|pague|pagamos|vender|desocupar|fuera|fueramos|vaya|vayamos|largara|largaramos|saliera|salieramos|pagara|pagaramos|vendiera|desocupara|callara|callaramos) (\w+ ){0,5}o (si no |sino )?(me|nos) (matan|mataban|mataria|matarian|mataba|van a matar|iban a matar|desaparecen|desaparecian|van a desaparecer|iban a desaparecer|pelan|pelaban|quiebran|quebraban|pican|picaban)\b/,
  new RegExp(`\\b(me|nos) (va|van|iba|iban|quiere|quieren|queria|querian|piensan|pensaban|amenazan con|amenazaron con)( a)? desaparecer\\b${NO_ES_REDES}${NO_ES_UN_RATO}(?! (el|la|los|las|mis|mi|esas|esos|estas|estos|ese|esa|este|esta|tu|tus|su|sus)\\b| de (la|el|los|las) (nomina|lista|planilla|empresa|base de datos|sistema|programa|proyecto|equipo|turno|horario|convocatoria)\\b)`),
  new RegExp(`\\b${ARMADOS} (\\w+ ){0,4}(me|nos|lo|la|los|las|le|les) (amenaz\\w*|tienen amenazad\\w*|quieren matar|van a matar|iban a matar|desplazaron|quieren reclutar|reclutaron|cobran vacuna|piden vacuna|extorsion\\w*)\\b(?! con (no|contarle|decirle|demandarme|despedirme|sacarme|echarme del (trabajo|grupo))\\b)`),
  new RegExp(`\\bme (amenaz\\w*|quieren matar|extorsion\\w*|reclutaron|quieren reclutar|desplazaron|sacaron) (\\w+ ){0,2}${ARMADOS}\\b`),
  /\b(me|nos) (estan |esta |siguen |sigue )?(extorsionando|extorsionan|extorsiono|extorsionaron|extorsiona|cobrando vacuna|pidiendo vacuna|exigiendo vacuna|cobran vacuna|cobraban vacuna|piden vacuna|pidieron vacuna|exigen vacuna)\b(?! con (el|la|los|las) (precio|precios|arriendo|cuenta|factura|matricula|cuota|intereses|cobros|multas)\b)/,
  // El plan con día: "el viernes me mato", "este fin de semana me mato", "en
  // navidad me mato", "el 31 me mato", "cuando se vayan todos me mato". Y los
  // preparativos: "ya tengo el veneno", "busqué en google formas de morir",
  // "guardando las pastillas para tomármelas todas". No activan "el viernes me
  // mato estudiando", "el sábado me mato en el gym", "el viernes me mató el
  // tráfico", "ya tengo el veneno para las cucarachas" ni "busco cómo matar
  // las cucarachas".
  new RegExp(`\\b(${CUANDO_PLAN}) (yo )?me (mato|suicido)\\b${NO_ES_ME_MATO}${NO_ES_AJETREO}(?! de (la )?risa\\b)`),
  /\b(ya (tengo|consegui|compre)|tengo (listo|preparado|guardado|escondido)) (el|un|una|la) (veneno|raticida|matarratas|cianuro|soda caustica)\b(?! (para|contra) (las |los |el |la |mis |mi )?(ratas|ratones|cucarachas|hormigas|plagas|moscas|zancudos|pulgas|garrapatas|maleza|jardin|finca|matas|plantas|perro|gato|casa|cocina)\b)/,
  /\b(busque|busco|buscando|buscar|buscaba|averigue|averiguo|averiguando|averiguar|investigue|investigando|investigar|gogle|gogleando|pregunte|preguntando|vi videos|viendo videos|lei|leyendo) (\w+ ){0,6}(formas?|maneras?|metodos?|como|tutoriales?) (de |para |se puede )?(morir(me|se)?|matarme|matarse|suicidarme|suicidarse|ahorcarme|ahorcarse|envenenarme|envenenarse|quitarme la vida|quitarse la vida|cortarme las venas|cortarse las venas|no despertar|hacer un nudo de horca)\b(?! de (la )?(risa|verguenza)\b| en (la|el) (antiguedad|edad media|historia|guerra|serie|pelicula|libro|juego|videojuego)\b)/,
  /\b(tomarmelas|tragarmelas|tomarmelos|tragarmelos) tod[ao]s\b(?! (en|durante|este|esta|cada|por|antes|despues|segun|como|al)\b)/,
  // Límpido y Clorox, y el veneno en vaso, frasco o botella: "me voy a tomar
  // el límpido", "tomé clorox", "me tomé un vaso de cloro". No activan "limpié
  // el baño con límpido" ni "tomo el límpido de la repisa y lo echo".
  new RegExp(`\\b(tomar(me)?|tome|tomo|tomado|tomaria|tomare|tragar(me)?|trague|trago|beber(me)?|bebo|bebi|bebere|beberia|bebido) ${CUANTO_VENENO}${VENENOS}\\b${NO_ES_ASEO}`),
  // Pastillas en cantidad, dicho como se dice en Colombia: "el tarro de
  // pastas", "una tableta entera", "toda la tira", "un blíster de rivotril",
  // "un poconón de pastillas", "el doble de pastillas", "a propósito". No
  // activan "me tomé dos tabletas de acetaminofén", "me tomé un sobre de
  // acetaminofén" ni "me tomé toda la tableta de chocolate".
  new RegExp(`\\b(tomar(me)?|tome|tomo|tomado|tragar(me)?|trague|trago|me meti|meterme) ((el|un|todo el) (tarro|frasco|blister|paquete|pastillero)( entero| completo)?|(el|un|todo el) (sobre|empaque) (entero|completo)|toda la (tableta|tira|lamina|caja|cajita|bolsa|bolsita)|(una|la) (tableta|tira|lamina|caja|cajita|bolsa|bolsita) (entera|completa)|(una|la) (lamina|cajita|bolsa|bolsita)|(\\d+|dos|tres|cuatro|cinco|varias|muchas) (tabletas|laminas|tiras|blisters|frascos|tarros|cajas) (enteras|completas|enteros|completos)|(un|una) (poconon|pocoton|jurgo|jurgonon|mononton|montonon|mundo|pilo|pila|manotada|sarta|cantidad|bolsa|punadito|punado)|(el|la) (doble|triple|cuadruple)) de (la )?${PASTILLAS}\\b(?! (del|de la|de mi) (antibiotico|tratamiento|formula|receta|desparasitante)\\b)`),
  new RegExp(`\\b(tomar(me)?|tome|tomo|tomado|tragar(me)?|trague|trago) (toda la (tableta|tira|lamina)|(la|una) (tableta|tira|lamina) (entera|completa)|(el|un) (tarro|frasco|blister|paquete|pastillero) (entero|completo)|todo el (paquete|pastillero)|(el|la) (doble|triple) de la dosis)\\b${NO_ES_COMIDA}`),
  new RegExp(`\\b(tomar(me)?|tome|tomo|tomado|tragar(me)?|trague|trago) (\\w+ ){0,5}(${PASTILLAS}|pastilla|pepas?|${VENENOS}) (\\w+ ){0,3}a proposito\\b`),
  // Un lugar alto con la postura o con "por": "estoy parada en el puente
  // pensando en tirarme", "ando por el puente de la 80 pensando en tirarme",
  // "estoy sentada en la terraza pensando en saltar"; la carrilera, la azotea,
  // el gas, el carro encendido y dejarse morir. No activan "estoy parada en
  // el puente esperando el bus", "estoy en la azotea colgando la ropa", "abrí
  // el gas para cocinar" ni "voy a dejar de comer harinas".
  new RegExp(`\\b(estoy|ando|sigo|me subi|subi|me pare|me sente|me monte|me trepe|me asome)( (parad[ao]|sentad[ao]|montad[ao]|subid[ao]|trepad[ao]|asomad[ao]|sol[ao]|aqui|aca|ahora|ya|otra vez))? (en|a|al|por|sobre|encima de|encima del|arriba de|arriba del|al borde de|al borde del|en el borde de|en el borde del|en la orilla de|en la orilla del|en la baranda de|en la baranda del|en la punta de|en la punta del) (el |la |un |una |lo alto de(l)? (el |la )?)?${SITIO_ALTO}\\b(?! festivo).{0,60}${TIRARME}\\b(?! (en|la|el|los|las|un|una|a (la|el) (cama|piscina|sofa|hamaca|agua|mar)|a \\w+(ar|er|ir))\\b)`),
  /\b(estoy|ando|sigo|me subi|subi)( (parad[ao]|sentad[ao]|montad[ao]|subid[ao]|sol[ao]))? (en|a) (la |el )?(azotea|cornisa|techo)( de(l)? (el |la )?(edificio|torre|puente|hospital|centro comercial|conjunto|universidad|colegio|clinica|hotel|casa))?(?=$| (y (no|nadie|me quiero|quiero|voy a (tirar|saltar|lanzar)|pienso|estoy pensando)|pensando|mirando (hacia |para )?(abajo|el vacio)|viendo (hacia |para )?(abajo|el vacio)|ya no (puedo|aguanto)|de verdad|en serio|ahora|otra vez|de nuevo|sola|solo|llorando)\b)/,
  /\b(carrilera|carrileras|rieles|riel|via del tren|vias del tren|via del metro|linea del tren|linea del metro|via ferrea|paso a nivel)\b.{0,40}\b((esperando|espero|a esperar|esperar|hasta que (pase|venga|llegue)|a que (pase|venga|llegue)|que pase) (\w+ ){0,3}(tren|metro)|(esperando|espero|a esperar) (a )?que (pase|venga|llegue))\b/,
  /\b(me (voy a |quiero |pienso )?(acostar|acoste|acuesto|tirar|tire|tiro|echar|eche|parar|pare|sentar|sente|quedar|quede)|acostarme|tirarme|echarme|pararme|sentarme|quedarme) (en|sobre|entre) (la|los|las|el) (carrilera|rieles|via del tren|vias del tren|via del metro|via ferrea|linea del tren)\b(?! a (tomar|sacar|hacer) (fotos?|videos?|una foto|selfies?)\b)/,
  /\b(abrir|abri|abro|abrire|abriria|dejar|deje|dejo|dejare|dejaria|prender|prendi|prendo)( todas)? (el|la|las|los) (gas|llaves? del gas|llaves? de la estufa|perillas?( del gas| de la estufa)?|hornillas?)( (abiert[oa]s?|sin prender|sin encender))?( toda la noche)? (y|para) (dormir(me)?|me (duermo|dormi|acuesto|acoste|encierro|encerre|voy a (dormir|acostar|encerrar))|no (despertar|volver a despertar|amanecer)|morir(me)?|matarme|acabar con todo|cerrar (todo|las ventanas|la puerta|puertas y ventanas)|cerre (todo|las ventanas|la puerta)|encerrarme|acostarme|que (me|nos) (mate|maten|lleve|muera|muramos))\b/,
  /\b(abri|abro|he abierto|ya abri) (el|la|las|los) (gas|llaves? del gas|perillas? del gas)(?=$| (y (me|nos) (encerre|encierro|acoste|acuesto|dormi|duermo)|ya|para (no|morir|matarme|dormir(me)? para siempre)|sin prender|toda la noche)\b)/,
  /\b(voy a|quiero|pienso|me provoca|ganas de) dejar (el|la|las) (gas|llaves? del gas) abiert[oa]s?\b/,
  /\b(encerrar(me)?|me (\w+ ){0,2}encerrar|me encerre|me encierro|encerrarnos|nos encerramos)\b.{0,40}\b(gas (abierto|prendido|encendido)|el gas|motor (prendido|encendido|andando|en marcha)|carro (prendido|encendido)|carbon (prendido|encendido)|brasero|monoxido)\b/,
  new RegExp(`(\\bdejarme|\\bme (\\w+ ){0,2}dej(ar|o|e|are|aria)) morir\\b(?! de (la )?(risa|ternura|verguenza)\\b)${NO_ES_ESFUERZO}`),
  /\b(dejar de comer|deje de comer|dejo de comer|dejando de comer|no (voy a )?(comer|tomar agua|beber agua)( nada| mas)?|matarme de hambre|ayunar)\b.{0,20}\b(hasta|para) (morir(me)?|que me muera|que me muriera|matarme|desaparecer)\b/,
  // Miedo a que la mate la pareja o un hijo: "tengo miedo de que mi esposo me
  // mate", "me da miedo que mi novio me mate", "tengo miedo que mi ex me haga
  // algo", "le tengo miedo a mi propio hijo", "un día de estos me mata". No
  // activan "tengo miedo de que mi esposo me deje", "le tengo miedo a las
  // cucarachas" ni "le tengo miedo a mi jefe".
  new RegExp(`\\b(miedo|temo|temor|terror|panico|me aterra|me asusta) (de )?que (\\w+ ){0,3}(mi |el |ese |este |su )?(propi[oa] )?${AGRESOR} (\\w+ ){0,2}me (mate|maten|vaya a matar|vayan a matar|quiera matar|haga algo|hagan algo|haga dano|hagan dano|lastime|pegue|golpee?|viole|ahorque|ataque|desaparezca|queme|eche acido|vuelva a (pegar|golpear|violar|tocar|lastimar|hacer dano|ahorcar|atacar|buscar))\\b(?! (con|en) (mentiras|chismes|rumores|comentarios|palabras|redes|lo que (dice|diga)|eso|la (custodia|demanda|plata))\\b| (la|el) (vida imposible|gripa|gripe|covid)\\b)${NO_ES_REGANO}`),
  new RegExp(`\\b(miedo|temo|terror|panico|me aterra) (de )?que (me|nos) (vuelva|vuelvan) a (pegar|golpear|violar|tocar|lastimar|hacer dano|ahorcar|atacar|encerrar|amenazar|maltratar)\\b${NO_ES_GRIPA}`),
  /\b(miedo|terror|panico|temor) (de|a) (mi|mis) (propi[oa]s? )?(hij[oa]s?|hijastr[oa]|herman[oa]|cunad[oa]|suegr[oa]|tio|tia|primo|abuel[oa]|papa|padre|mama|madre|padrastro|madrastra|niet[oa]|yerno|nuera|vecino|exesposo|exnovio|expareja|esposa|novia|companero)\b(?! (se|le|lo|la|no|pierda|vaya|salga|caiga|enferme|repruebe|pase|quede|sufra|muera|entere|sepa|descubra|maneje|conduzca)\b)/,
  new RegExp(`${NO_ES_COSA}\\b(un|algun|cualquier) dia( de estos)? ((mi|el|ese|este) ${AGRESOR} |el |ella |ellos )?me (mata|matan|termina matando|acaba matando|va a terminar matando)\\b(?! (el|la|los|las|este|esta|ese|esa|mi|mis|tanto|tanta) \\w+| (de|del|con) (un |una |la |el |tanto |tanta |sus |tus |esos |esas |esa |ese )?(susto|risa|pena|verguenza|preocupacion|angustia|disgusto|rabia|colera|ira|estres|ternura|amor|nervios|oso|trabajo|cansancio|chistes?|ocurrencias?|cuentos?|bromas?|historias?|comentarios?|regalos?|detalles?|besos?|abrazos?)\\b| (estudiando|trabajando|corriendo|haciendo)\\b)`),
  // Violencia sexual contra una hija o un niño, y lo que la obligaron a
  // hacerle: "mi padrastro toca a mi hija", "un señor tocó a mi hija", "su tío
  // la toca", "le tocó las partes a mi hija", "violaron a mi hija", "me obligó
  // a hacerle cosas sexuales". No activan "mi hija toca el piano", "le toca a
  // mi hija lavar los platos", "mi tío toca la guitarra con mi hija" ni "me
  // obliga a hacerle el almuerzo".
  new RegExp(`(?<!\\b(me|te|le|les|nos|se) )\\b(toca|toco|tocaba|tocaban|tocan|tocaron|ha tocado|esta tocando|manosea|manoseo|manoseaba|manosean|manosearon|abusa|abuso|abusaba|abusan|abusaron|ha abusado|esta abusando|viola|violo|violaba|violan|violaron|ha violado) a (mi|mis|una|nuestra|nuestro|nuestras|nuestros|su|sus|la|el) (\\w+ )?${MENOR}\\b(?! (\\w+ )?\\w+(ar|er|ir)(la|lo|las|los|le|les)?\\b| (la|el) (guitarra|piano|cancion|musica|puerta|timbre|turno|tema|bateria|violin|tambor|frente)\\b| (en|por|de) (el|la|los|las) (hombros?|brazos?|manos?|cabeza|frente|espalda)\\b)`),
  /\b(padrastro|tio|primo|abuelo|cunado|suegro|vecino|hermanastro|profesor|profe|entrenador|papa|padre|esposo|marido|novio|pareja|senor|hombre|man|tipo|(novio|esposo|pareja|marido) de (mi|su) (mama|madre|abuela|tia|hermana)) (\w+ ){0,2}(la|lo|las|los) (toca|tocaba|toco|tocan|tocaban|manosea|manoseaba|manoseo|viola|violaba|violo|abusa|abusaba|abuso)\b(?! (muy |tan )?(bien|mal|bonito|lindo|precioso|duro|suave|seguido)\b| (en|para) (clase|la iglesia|el concierto|misa|la banda|la orquesta|navidad)\b| con (la|el) (guitarra|piano|violin|flauta)\b)/,
  /\b(le|les) (toca|toco|tocaba|tocaban|tocan|tocaron|manosea|manoseo|manoseaba|manosearon|agarra|agarro|agarraba|mostro|muestra|mostraba|ensena|ensenaba|enseno) (las|sus|los|el|la) (partes( intimas| privadas)?|zonas intimas|genitales|vagina|pene|senos|pechos|nalgas|colita|chimba|cuca|totona|pipi|cosita)\b/,
  /\bme (\w+ )?(obliga|obligo|obligan|obligaron|obligaba|obligaban|fuerza|forza|forzo|forzaron|forzaba|presiona|presiono|presionaba) a ((hacerle|hacerles) (cosas|eso|sexo oral)\b(?! (de (la casa|comer|oficio|aseo|cocina)|como (la|el)|para (la|el) (casa|comida))\b)|tocarle|tocarlo|tocarla|chuparle|chuparsela|mamarle|mamarsela|tener sexo oral|hacerle sexo oral|ver porno|ver pornografia|(mandarle|enviarle) fotos (intimas|desnuda)|mostrarle mis partes)/,
  // Una crisis de otra persona en curso: "mi amiga se tomó unas pastillas y
  // no responde", "se cortó las venas", "mi hermana está en el puente y dice
  // que se va a tirar", "mi hija dice que no quiere vivir", "mi amiga quiere
  // morirse", "se ahorcó", "se está haciendo daño", "a mi vecina la golpea el
  // marido", "mi cuñado golpea a mi hermana". No activan "mi amiga se tomó
  // unas cervezas y no responde el celular", "mi mamá se tomó las pastillas de
  // la presión", "mi hija no quiere vivir en Bogotá", "casi se mata en la
  // moto", "se hace daño cuando se cae" ni "mi hijo le pega a su hermanito".
  new RegExp(`\\bse (tomo|trago|bebio|ha tomado|acaba de tomar|tomaron|tragaron|tomaba|metio) (todas (las|sus|mis)|muchas|demasiadas|un monton de|un punado de|un frasco de|una caja de|el frasco de|la caja de|el tarro de|un tarro de|un blister de|el blister de|toda la (tira|caja|tableta) de|[1-9]\\d+|veinte|treinta|cuarenta|cincuenta|cien|como [1-9]\\d+|unas [1-9]\\d+) ${PASTILLAS}\\b(?! (del|de la|de su|de mi) (antibiotico|tratamiento|formula|receta|desparasitante)\\b| (de (hoy|la manana|la noche|la tarde|esta semana|la semana)|del dia|a tiempo|como (le|se) (dijo|dijeron|indico|indicaron|mando|mandaron|recetaron|receto))\\b)`),
  new RegExp(`\\bse (tomo|trago|bebio|ha tomado|acaba de tomar|tomaron|tomaba) ${CUANTO_VENENO}${VENENOS}\\b${NO_ES_ASEO}`),
  new RegExp(`\\bse (tomo|trago|metio|ha tomado|acaba de tomar|tomaron) (\\w+ ){0,3}(${PASTILLAS}|pastilla|pepas?)\\b.{0,50}\\b(no (responde|reacciona|despierta|contesta|abre los ojos|respira)|esta (inconsciente|desmayad[ao]|morad[ao]|convulsionando|como muert[ao])|se desmayo|convulsion\\w*|se esta muriendo)\\b|\\b(no (responde|reacciona|despierta|contesta|abre los ojos|respira)|esta (inconsciente|desmayad[ao]|convulsionando))\\b.{0,50}\\bse (tomo|trago|metio|ha tomado|acaba de tomar|tomaron) (\\w+ ){0,3}(${PASTILLAS}|pastilla|pepas?)\\b`),
  /\bse (corto|corta|cortaba|ha cortado|esta cortando|abrio|abre|quiso cortar|intento cortar|va a cortar) (las|sus) venas\b/,
  new RegExp(`\\b(esta|estan|sigue|anda|se subio|se fue|se paro|se sento|se monto)( (parad[ao]|sentad[ao]|montad[ao]|subid[ao]|sol[ao]))? (en|a|al|por|sobre|encima de|encima del|en el borde de|en el borde del|en la orilla de|en la orilla del|en la baranda de|en la baranda del) (el |la |un |una |lo alto de(l)? (el |la )?)?${SITIO_ALTO}\\b(?! festivo).{0,60}(\\bse (\\w+ ){0,2}(tir|lanz|bot|avent|arroj|ech|salt)(ar|a|o|e|ara|aria)|\\b(tirarse|lanzarse|botarse|aventarse|arrojarse|saltar|brincar))\\b(?! (en|la|el|los|las|un|una|a (la|el) (cama|piscina|sofa|hamaca|agua|mar)|a \\w+(ar|er|ir))\\b)`),
  /\b(no quiere|ya no quiere|no quiso) (vivir|seguir viviendo|seguir viva|seguir vivo|existir|estar viva|estar vivo|seguir con vida)\b(?! (con|en (?!(este|esta) (mundo|vida)\b)|para|de|del|por|pendiente|bajo|a medias|al dia|a la|al|preocupada|estresada|angustiada|corriendo|apurada|sola|solo|lejos|cerca|alla|aqui|aca|afuera|adentro|juntos|juntas|conmigo|contigo|ahi|tan)\b)/,
  new RegExp(`\\b(quiere|queria|quisiera|quiso|desea|piensa en|esta pensando en|anda pensando en|pensando en|ha pensado en|penso en|intento|intenta|trato de|trata de|ha intentado|esta intentando|amenaza con|amenazo con|habla de|hablaba de) (morirse|matarse|suicidarse|quitarse la vida|ahorcarse|envenenarse|cortarse las venas|tirarse (de|del|desde|por|al vacio|a la via|al metro|al rio)|lanzarse (de|del|desde|por|al vacio|a la via|al metro|al rio)|dejarse morir|desaparecer para siempre)\\b${NO_ES_ESFUERZO}${NO_ES_RISA}`),
  new RegExp(`\\b(dice que|dijo que|decia que) (va|iba) a (matarse|suicidarse|quitarse la vida|ahorcarse|envenenarse|cortarse las venas)\\b${NO_ES_ESFUERZO}`),
  /(?<!\bcasi )\bse (ahorco|ahorcaba|suicido|quito la vida|colgo (de|del|en) (un|una|el|la) (viga|arbol|techo|ventilador|lampara|baranda|cuerda|soga)|mato\b(?! (estudiando|trabajando|entrenando|corriendo|haciendo|en (un|una|el|la) (accidente|choque|moto|carro|carretera|curva|bici|bicicleta)|de (la )?risa|a punta de)\b)|disparo en la cabeza|pego un tiro|tiro (de|del|desde) (el |la )?(puente|edificio|balcon|terraza|ventana|piso|techo|azotea))/,
  /\bse (esta haciendo|hace|hizo|ha hecho|sigue haciendo|volvio a hacer|ha estado haciendo) dano\b(?! (cuando (se cae|juega|corre|monta)|al (caer|jugar|correr)|jugando|sin querer|por accidente|con (el|la|los|las|un|una) (juguete|tijeras|patineta|bicicleta|bici|silla)|pensando|comiendo|fumando|tomando|con (esa|ese|esas|esos) (relacion|man|tipo|amistades|pensamientos))\b)/,
  new RegExp(`\\b(la|lo|le|las|los|les) (golpea|golpeaba|golpeo|golpean|golpeaban|pega|pegaba|pego|pegan|pegaban|maltrata|maltrataba|maltrato|viola|violaba|violo|casca|cascaba|casco|patea|pateaba|pateo|ahorca|ahorcaba|ahorco|amenaza|amenazaba|amenazo|encierra|encerraba) (el|su|la) (marido|esposo|novio|pareja|ex|exesposo|expareja|exnovio|companero|papa|padre|padrastro|mama|madre|madrastra|hermano|cunado|suegro|suegra|tio|abuelo)\\b${NO_ES_GRIPA}`),
  new RegExp(`\\b(marido|esposo|novio|pareja|ex|exesposo|expareja|exnovio|companero|papa|padre|padrastro|mama|madre|madrastra|cunado|suegro|suegra|tio|abuelo) de (mi|una|la|su) (\\w+ )?(vecina|hermana|amiga|mama|madre|hija|prima|tia|cunada|sobrina|companera|nieta|abuela|hermano|amigo|hijo|sobrino|primo|nieto|vecino|suegra) (\\w+ ){0,2}(la|lo|le|les|las|los) (golpea|golpeaba|golpeo|golpean|pega|pegaba|pego|pegan|maltrata|maltrataba|maltrato|viola|violo|violaba|casca|cascaba|casco|patea|pateaba|pateo|ahorca|ahorcaba|ahorco|amenaza|amenazo|amenazaba|encierra|encerro|tiene encerrada|quiere matar|va a matar)\\b${NO_ES_GRIPA}${NO_ES_NOTICIA}(?! (un|unos) (grito|gritos|regano)\\b)`),
  new RegExp(`\\b(mi|su|el|la) (esposo|marido|pareja|novio|ex|exesposo|expareja|exnovio|companero|papa|padre|padrastro|mama|madre|madrastra|cunado|cunada|suegro|suegra|tio|tia|abuelo|vecino|yerno|nuera|padrino) (\\w+ ){0,2}(golpea|golpeaba|golpeo|golpean|maltrata|maltrataba|maltrato|viola|violo|violaba|casca|cascaba|casco|patea|pateaba|pateo|ahorca|ahorcaba|ahorco|amenaza|amenazo|amenazaba|encierra|encerro|pega|pegaba|pego) a (mi|su|una|la|el|mis|sus) (\\w+ )?(herman[oa]|hermanit[oa]|mama|madre|hij[oa]s?|prim[oa]|tia|tio|cunad[oa]|sobrin[oa]|nieta|nieto|abuel[oa]|amig[oa]|vecin[oa]|esposa|mujer|novia|pareja|nin[oa]s?|bebe|papa|padre|suegra)\\b${NO_ES_GRIPA}${NO_ES_NOTICIA}(?! (\\w+ )?(jugando|sin querer|en el (juego|partido))\\b)`),
  new RegExp(`\\b(mi|su|el) (herman[oa]|hij[oa]|hijastr[oa]|niet[oa]|sobrin[oa]|primo) (\\w+ ){0,2}(golpea|golpeaba|golpeo|maltrata|maltrataba|maltrato|casca|cascaba|patea|pateaba|ahorca|ahorcaba|amenaza|amenazo|pega|pegaba|pego) a (mi|su|nuestra|nuestro) (mama|madre|papa|padre|abuel[oa]|esposa|mujer|novia)\\b${NO_ES_GRIPA}`),
  // Tirarla al piso o arrastrarla: "mi hijo me tiró al piso", "me botó al
  // piso", "me tumbó al suelo", "me arrastró por el piso". No activan "el
  // perro me tumbó al piso de la emoción", "mi sobrino me tiró al piso
  // jugando" ni "me botó al piso el celular".
  new RegExp(`(?<!\\b(perro|perrito|perra|gato|gatico|caballo|vaca|ola|olas|viento|bebe|bebito|cachorro)( \\w+)? )${NO_ES_NINO}\\bme (tiro|tiraron|tira|tiraba|boto|botaron|bota|botaba|tumbo|tumbaron|tumba|tumbaba|lanzo|lanzaron|lanza|lanzaba|empujo|empujaron|empuja|empujaba|avento|aventaron|arrojo|arrojaron|estrello|estrellaron|derribo|derribaron) (al|en el|sobre el|contra el) (piso|suelo)\\b(?! (jugando|de (la )?(emocion|alegria|felicidad)|sin querer|por accidente|accidentalmente|(la|el|los|las|mi|mis|un|una|unos|unas|todo|toda|todos|todas|su|sus) \\w+|a \\w+(ar|er|ir)(me|la|lo|nos)?)\\b)`),
  new RegExp(`(?<!\\b(perro|perrito|perra|gato|caballo|bebe|cachorro)( \\w+)? )${NO_ES_NINO}\\bme (arrastro|arrastraron|arrastra|arrastraba|arrastraban) (por|en|contra) (el|la) (piso|suelo|calle|casa|cuarto|patio|escalera|escaleras)\\b(?! (jugando|de (la )?(emocion|alegria)|\\w+(ando|iendo))\\b)`),
  // Despedidas: "ya no van a saber más de mí", "cuiden mucho a mi mamá cuando
  // yo no esté", "díganle a mis hijos que los amo", "quiero que sepan que no
  // fue culpa de nadie", "ya no estaré para el cumpleaños de mi hija",
  // "perdón por todo, adiós", "les dejo esta carta para cuando me encuentren",
  // "les dejo mis cosas a mis hermanas", "adiós mundo cruel". No activan "ya
  // no van a saber más de mí hasta el lunes", "cuando yo no esté en la casa
  // riegan las matas", "perdón por todo el desorden, adiós", "les dejo mis
  // cosas en la portería" ni "ya no estaré para el cumpleaños porque me toca
  // viajar".
  /\b(ya no|nunca mas|no|ya nunca) (van|vas|volveran|volveras|vuelven|van a volver) a (saber|tener noticias) (mas |nunca mas |nada |jamas )?de mi\b(?=$| (y|pero|perdon|perdonen|los quiero|las quiero|gracias|adios|nunca|jamas|nunca mas|para siempre)\b)/,
  /\bcuiden (mucho |bien |muy bien )?(a )?(mi|mis) (\w+ ){1,2}cuando (yo )?(ya )?no (este|exista)\b(?=$| (y|pero|por favor|porfa|los quiero|las quiero|gracias|adios|nunca|mas|ya)\b)/,
  /\bcuando (yo )?ya no (este|exista|estuviera) (\w+ ){0,2}cuiden (mucho |bien )?(a )?(mi|mis)\b/,
  /\b(diganle|diganles|digale|digales) a (mi|mis) (\w+ ){0,2}que (los|las|la|lo|le|les) (amo|quiero|adoro|extranare|voy a extranar)\b|\b(diganle|diganles|digale|digales|dile|diles) a (mi|mis) (\w+ ){0,2}que (me perdonen|me perdone|lo siento|perdon)\b/,
  /\b(dile|diles) a (mi|mis) (\w+ ){0,2}que (los|las|la|lo|le|les) (amo|quiero|adoro)\b.{0,40}\b((ya )?me voy( para siempre)?|adios|perdon\w*|nunca|para siempre)\b/,
  /\b(quiero que sepan|que sepan|sepan|quiero que sepas|sepas) que (esto |lo que (hice|voy a hacer) )?no (fue|es|sera) (culpa (de nadie|suya|de ustedes|tuya|de ninguno)|su culpa|tu culpa)\b/,
  /\bno (es|fue|sera) culpa de nadie lo que (voy a hacer|hice|hare|estoy por hacer|va a pasar)\b|\blo que voy a hacer no es culpa de nadie\b/,
  /\bya no (estare|voy a estar) (para|en) (el|la|los|las) (cumpleanos|navidad|grado|boda|fiesta|graduacion|primera comunion|matrimonio|quince|quinces|aniversario|nacimiento|bautizo)\b(?!.{0,40}\b(viaj\w*|trabaj\w*|turno|vuelo|fuera de la ciudad|me toca|me mudo|me voy a vivir)\b)/,
  /\bperdon(en|enme|ame|eme|a)? por todo( lo que (hice|les hice|te hice|paso))? (adios|chao|me despido|hasta nunca|los quiero|las quiero|los amo|las amo)\b/,
  /\b(adios|chao|me despido|hasta nunca) (\w+ ){0,2}perdon(en|enme|ame|eme|a)? por todo\b(?! (el|la|los|las|lo que (comi|gaste|rompi))\b)/,
  /\bpara cuando me (encuentren|encuentre|hallen|descubran)\b/,
  /\b(les|le|te) (dejo|deje|escribo|escribi) (esta|una|mi) (carta|nota)( de despedida)?(?=$| (para (cuando|que|ustedes|todos)|porque|y|ya|perdon|adios)\b)/,
  /\b(les|le) dejo (mis cosas|todas mis cosas|lo que tengo|lo poco que tengo|mi ropa|mis ahorros|mi plata|mi casa|mis joyas|mi carro|mis pertenencias|mis libros) a (mis|mi) (hijos|hijas|hijo|hija|hermanos?|hermanas?|mama|papa|familia|esposo|pareja|sobrinos?|sobrinas?|amigas?|amigos?)\b(?! (mientras|hasta|para (el|la|que (lo|la|los|las) (cuiden|cuide|organicen|guarden))|cuando (viaje|salga|vuelva|me mude))\b)/,
  /\badios mundo cruel\b/,
  /\b(los|las|te|la|lo) (voy a extranar|extranare|cuidare|voy a cuidar|voy a estar cuidando) desde (donde (este|estare|vaya|me vaya)|el cielo|alla arriba|el mas alla|la otra vida)(?=$| (y|pero|perdon|los quiero|las quiero|los amo|las amo|adios|siempre|para siempre|nunca)\b)/,
  // Ideación dicha de otra forma: "ya no le veo sentido a nada", "ya me rendí
  // con la vida", "le pido a Dios que me lleve", "diosito llévame", "mejor no
  // existir", "quisiera que un carro me atropellara", "me gustaría tener un
  // accidente y no volver", "dejar de sufrir de una vez por todas", "ya no
  // tiene caso seguir", "voy a hacer una locura", "no quiero vivir con este
  // dolor", "acabar con todo lo que siento". No activan "no le veo sentido a
  // nada de lo que dice", "le pido a Dios que me lleve con bien", "mejor no
  // existir en redes", "voy a hacer una locura y cortarme el pelo", "no quiero
  // vivir con este dolor de espalda" ni "acabar con todo lo que tengo
  // pendiente".
  /\bno (le )?(veo|encuentro|hallo) (ningun )?sentido a nada\b(?! (de|del|en|que|con|lo)\b)/,
  /\b(ya )?nada tiene (caso|sentido)\b(?! (de|del|en|con|si|para (el|la|los|las|mi))\b)/,
  /\bya no tiene (caso|sentido) (seguir|vivir|nada|seguir viviendo|luchar|intentarlo)\b(?! (con|en|estudiando|trabajando|intentando|insistiendo|esperando|aqui|pagando|haciendo|por|para|de)\b)/,
  new RegExp(`\\bme (rindo|rendi|he rendido|voy a rendir|rendire|estoy rindiendo) con (la|mi|esta) vida\\b${NO_ES_ETAPA}(?! (fitnes|saludable|sana|sano|healthy|de (gym|dieta|soltera)))`),
  /\b(dios|diosito|dios mio|senor|senor mio|virgen|virgencita|papito dios|jesus|jesusito|cristo)\b.{0,30}\b(llevame|recogeme|llevenme|recojeme|me (lleve|recoja|llame|lleves|recojas|llames|quite la vida))\b(?! (a (mi|la|el|casa|salvo|bien|un|una|tiempo|trabajar|estudiar)|al (trabajo|colegio|aeropuerto|medico|hospital)|hasta|con bien|sana|sano|de (vuelta|regreso|viaje|paseo)|bien|por (buen|el buen) camino|en (el|su|tu) (carro|taxi|moto)|de la mano)\b)/,
  /\b(mejor|preferible|ojala|seria mejor) no (existir|haber nacido|seguir viviendo|seguir viva|seguir vivo)\b(?! (en|de|del|para|con|tan|asi|aqui|aca|alla|ahi)\b)/,
  /\b(quiero|quisiera|deseo|desearia|me gustaria|ojala|ruego|pido) que (un|una|el|la|algun|alguna) (\w+ ){0,2}me (atropellara|atropellaran|atropellase|pisara|pisaran|matara|mataran|cayera encima|aplastara|llevara por delante)\b/,
  /\b(quisiera|quiero|me gustaria|ojala|deseo|desearia|ojala pudiera) (tener|sufrir|que me (pase|pasara|de|diera)) (un|una) (accidente|infarto|derrame|aneurisma|enfermedad terminal|cancer)\b(?=$| (y|para|que|de una vez|grave|fatal|mortal)\b)/,
  /\bdejar de sufrir (de una vez|para siempre|como sea|de cualquier (manera|forma)|ya mismo)\b/,
  /\b(pensando en|pienso|voy a|quiero|ganas de|estoy a punto de|capaz de|me dan ganas de|tentada a|tentado a|a punto de) (hacer|cometer) (una )?(locura|estupidez|tonteria|barbaridad|burrada|loquera)\b(?=$| (y (ya|nadie|no)|de verdad|en serio|ya|hoy|esta noche|pronto|conmigo|contra mi|porque ya no|si no|que ya)\b)/,
  /\b(no quiero|ya no quiero|no puedo|ya no puedo|no aguanto|no soporto|no quiero seguir|ya no quiero seguir) (seguir )?(vivir|viviendo) (mas |asi )?con (este|esta|tanto|tanta|el|la|mi) (dolor|tristeza|sufrimiento|depresion|vacio|angustia|desesperacion|soledad|culpa|pena|peso|carga|tormento|infierno|desesperanza)\b(?! (de|en) (la |el |mi )?(espalda|cabeza|muela|muelas|rodilla|rodillas|cuello|estomago|barriga|garganta|oido|pies|pie|hombro|cadera|columna|pierna|piernas|brazo|articulaciones|huesos|ovarios|vientre|pecho|cintura|mano|manos|cara|ojos?)\b| (fisico|cronico)\b)/,
  /\b(acabar|terminar|acabo|termino|acabare|terminare|acabaria|terminaria) con todo lo que (siento|soy|me queda|fui|me duele|me atormenta|tengo (adentro|dentro))\b(?! (de|del|en|que hacer|pendiente|por hacer)\b)/,
  // Golpearse a sí misma, la última vez que escribe, no ver salida y no
  // querer sentir nada: "me di golpes en la cara yo misma", "esta es la última
  // vez que escribo aquí", "no veo ninguna salida", "ya no quiero sentir nada
  // nunca más". No activan "me di golpes de pecho", "es la última vez que
  // hablo con él", "no encuentro salida al parqueadero", "no hay otra salida,
  // toca pagar" ni "no quiero sentir nada por él".
  /\bme (di|doy|daba|he dado|estoy dando|sigo dando) (golpes|punos|punetazos|cachetadas|bofetadas|cabezazos|correazos)\b(?! de pecho\b)(?=.{0,40}\b(yo misma|yo mismo|a mi misma|a mi mismo|contra la pared|contra las paredes|contra el piso|hasta (sangrar|que)|porque me odio|para castigarme|a proposito)\b)/,
  /\b(esta es|es|sera) la ultima vez que (les |los |las )?(escribo|hablo|me leen|me ven|me van a (leer|ver)|publico|saben de mi)( (aqui|aca|con ustedes|en este mundo))?(?=$| (y|perdon|perdonen|perdonenme|adios|los quiero|las quiero|gracias|nunca|para siempre|ya)\b)/,
  /\bno ((veo|encuentro|tengo|le veo|le encuentro) (ninguna |otra )?|hay ninguna )salida\b(?! (de|del|al|a|para|en|por|que|mas que|sino|distinta|aparte|diferente|facil)\b)/,
  /\b(ya no|no) quiero (volver a )?sentir nada( nunca mas| mas| nunca)?(?=$| (nunca|mas|ya|de verdad|en serio|por favor|y)\b)/,
  // Ronda adv-r5-1. Violencia con "agredir": "mi esposo me agredió", "me
  // agrede cuando toma", "me agreden", "me volvió a agredir". No activan "me
  // agredió verbalmente en la reunión", "el comentario me agredió" ni "me
  // agrede la luz del sol" ("mi esposo me agredió verbalmente" sí).
  /(?<!\b(comentario|comentarios|ruido|bulla|luz|sol|olor|musica|frase|palabra|palabras|mensaje|tono|critica|criticas|noticia|pregunta|chiste)( \w+)? )\bme (agredio|agrede|agreden|agredieron|agredia|agredian|ha agredido|han agredido|habia agredido|volvio a agredir|volvieron a agredir|vuelve a agredir|esta agrediendo|estan agrediendo|sigue agrediendo|vive agrediendo|quiso agredir|intento agredir|trato de agredir)\b(?! (verbalmente|con (palabras|sus palabras|comentarios|sus comentarios|su comentario|lo que dijo|insultos|groserias|gritos|la mirada|indirectas))\b| (la|el) (luz|sol|ruido|bulla|olor|musica)\b)/,
  new RegExp(`\\b${PAREJA} (\\w+ ){0,3}me (agredio|agrede|agreden|agredieron|agredia|ha agredido|volvio a agredir|vuelve a agredir|esta agrediendo|sigue agrediendo)\\b`),
  // Golpes con un objeto, la puñalada dicha en colombiano, sacarla a
  // patadas, quemarla, rociarla con gasolina, tenerla secuestrada o no
  // dejarla salir: "me dio con el palo de la escoba", "me dio con la correa",
  // "mi marido me dio machete", "me dio una puñalada", "me chuzó con un
  // cuchillo", "me puñaleó", "me bajó del carro a patadas", "me quemó la
  // cara", "me quemó con la plancha", "me roció con gasolina", "me tiene
  // secuestrada", "no me deja salir de la casa". No activan "me dio con el
  // gusto", "mi mamá me daba con la chancla", "me dio una puñalada por la
  // espalda", "me chuzó la abeja", "el médico me chuzó para sacarme sangre",
  // "me sacó a patadas del partido el árbitro", "me quemó el sol en la
  // playa", "me quemé con la plancha alisándome el pelo", "el trabajo me
  // tiene secuestrada", "me secuestraron mis amigas para la despedida" ni "mi
  // mamá no me deja salir de la casa de noche".
  /(?<!\b(mama|mami|papa|papi|abuela|abuelo|madre|padre) )\bme (dio|dieron|da|daba|daban|pego|pegaba|pegaron|pegan) con (el|la|un|una|su|sus|unos|unas) (chancla|chancleta)\b(?!.{0,40}\b(sin querer|por accidente|accidentalmente|jugando)\b)/,
  /\bme (dio|dieron|da|daba|daban|pego|pegaba|pegaron|pegan) con (el|la|un|una|su|sus|unos|unas) (palo|palos|escoba|trapeadora|correa|correas|cinturon|rejo|tabla|zapato|bota|bate|machete|peinilla|martillo|botella|plancha|olla|sarten|cable|manguera|varilla|tubo|silla|piedra|ladrillo|garrote|cuchillo|hebilla|vara|regla|totuma|tenedor|celular|control|puno|punos|candado|cadena|llave|destornillador|hacha|pala|rula)\b(?!.{0,40}\b(sin querer|por accidente|accidentalmente|jugando)\b)/,
  /\bme (dio|dieron|daba|daban|metio|metieron|pego|pegaron|zampo|mando|mandaron) (una |un |unas |unos )?(punaladas?|machetazos?|correazos?|rejo|planazos?|garrotazos?|palazos?|batazos?|botellazos?|cuchilladas?|chuzones?|balazos?|machete|garrote|plomo|bala|chumbimba)\b(?! (por la espalda|trapera|al corazon|en el (corazon|alma)|de (realidad|amor|la vida|la noticia)|en (el|la) (partido|juego|cancha|clase|entreno|torneo|futbol|micro)|jugando)\b)/,
  /(?<!\b(medico|medica|doctor|doctora|enfermera|enfermero|abeja|avispa|zancudo|mosquito|espina|aguja|bebe|nino|nina|gato|perro|alacran|hormiga|cactus|bacteriologa|bacteriologo)( \w+)? )\bme (punaleo|punalearon|punalea|apunaleo|apunalearon|apunalea|chuzo|chuzaron|chuza|chuzan|chuzaba|chucearon|chuceo)\b(?! ((el|la|los|las|un|una) (dedo|abeja|avispa|espina|aguja|medico|medica|doctor|doctora|enfermera|enfermero|zancudo|alacran|bebe|nino|nina|gato|perro|hormiga|cactus)|(con|en) (el|la|un|una|su) (dedo|aguja|jeringa|alfiler|lapiz|codo|vacuna)|para (la|el|una|un|sacarme|ponerme|hacerme) (vacuna|examen|prueba|sangre|citologia|inyeccion|suero)|jugando|para que me (despertara|despierte|callara|calle|fijara)|(el|la|los|las|mi|mis) (telefono|celular|cel|linea|correo|cuenta|whatsapp?|computador|wifi))\b)/,
  /\bme (saco|sacaron|saca|sacaba|echo|echaron|echa|echaba|bajo|bajaron|baja|bajaba|boto|botaron|bota|botaba|tiro|tiraron|levanto|levantaron|desperto|despertaron|trata|trato|trataba|recibio|recibe|recibieron|corrio|corrieron) (\w+ ){0,4}a (patadas|golpes|punos|punetazos|empujones|correazos|palo|planazos|machetazos|cachetadas|trompadas|bofetadas|garrote|garrotazos|bala|tiros|plomo)\b(?! (del|de la|de los|de las) (partido|juego|torneo|cancha|equipo|grupo|competencia|trabajo|empresa|oficina|seleccion)\b)(?!.{0,30}\b(el|la) (arbitro|tecnico|entrenador|profe|jefe|jefa)\b)/,
  /(?<!\b(sol|aji|picante|cafe|tinto|te|sopa|caldo|crema|cera|tinte|laser|agua|aceite|olla|estufa|plancha|horno|chocolate|comida|frio|hielo|acido|producto|depilacion|peluquera|peluquero|estilista|manicurista|esteticista|blower|secador|vapor|fogon)( \w+){0,2} )(?<!\b(siempre|a veces|cada rato|seguido|casi siempre|yo|tambien|nunca|todavia|aun|como) )\bme (quemo|quemaron|quemaba|quemaban|ha quemado|volvio a quemar) (el|la|los|las|mis|mi) (brazos?|cara|manos?|piernas?|espalda|pecho|cuello|ojos?|boca|labios?|senos|barriga|panza|cuerpo|piel|pies?|dedos?|nalgas|muslos?|hombros?)\b(?! (\w+ ){0,2}(el|la) (sol|crema|aji|cafe|tinto|sopa|cera|tinte|laser|estufa|olla|alisadora|blower|depilacion)\b)(?!.{0,40}\b(cocinando|planchando|alisando\w*|friendo|sin querer|por accidente|accidentalmente|en la (playa|piscina|cocina)|al sol|con el sol|del sol|cuando (cocino|plancho|me aliso)|(cada vez|siempre) que|depilando\w*)\b)/,
  /(?<!\b(peluquera|peluquero|estilista|manicurista|esteticista|dermatologa|dermatologo|doctora|doctor|medico|medica)( \w+){0,2} )(?<!\b(siempre|a veces|cada rato|seguido|casi siempre|yo|tambien|nunca|todavia|aun|como) )\bme (quemo|quemaron|quemaba|quemaban|ha quemado|volvio a quemar) (\w+ ){0,3}con (el |la |un |una |agua |aceite )?(plancha|cigarrillo|cigarro|encendedor|yesquero|candela|fuego|agua (caliente|hirviendo)|aceite (caliente|hirviendo)|olla|cuchara|hierro|varilla|fosforos?|vela|tenedor|cuchillo caliente)\b(?! (del|de|para el) (pelo|cabello)\b| (de|para) (alisar|el pelo|el cabello)\b)(?!.{0,40}\b(cocinando|planchando|alisando\w*|friendo|sin querer|por accidente|accidentalmente|cuando (cocino|plancho|me aliso)|(cada vez|siempre) que)\b)/,
  /\bme (rocio|rociaron|rocia|rociaba|bano|banaron|empapo|empaparon|echo encima|echaron encima) (\w+ ){0,2}(con|de|en) (gasolina|acpm|thinner|tiner|acido|petroleo|varsol|cocinol|kerosene|agua hirviendo|aceite hirviendo|cloro|limpido)\b(?! (hialuronico|salicilico|glicolico|folico|retinoico|ascorbico|mandelico|azelaico|lactico|kojico|tranexamico)\b)/,
  /(?<!\b(trabajo|serie|novela|libro|celular|juego|oficina|tareas?|bebe|tesis|universidad|netflix|cama|cobija|pereza|lluvia|aguacero|gripa|nieta|nieto|lectura|proyecto|jefe|jefa|empresa|bebes|ninos|hijos|perro|gato)( \w+){0,2} )\b(me|nos) (tiene|tienen|tenia|tenian|tuvo|tuvieron) (\w+ )?secuestrad[ao]s?\b(?! (el|la|los|las|este|esta|ese|esa) (trabajo|serie|novela|libro|celular|juego|oficina|tareas?|bebe|tesis|universidad)\b)/,
  /\b(me|nos) (secuestraron|secuestro|secuestran|secuestra|quieren secuestrar|van a secuestrar|intentaron secuestrar|iban a secuestrar|querian secuestrar)\b(?! ((el|la|los|las|mi|mis|un|una) \w+|(mis|las|unas) (amigas|primas|hermanas|companeras)|para (una|la|el|un|ir) \w+|un rato|jugando)\b)(?!.{0,40}\b(despedida|cumpleanos|sorpresa|paseo|fiesta|rumba|jugando)\b)/,
  /(?<!\b(aguacero|lluvia|gripa|gripe|pereza|trabajo|frio|calor|dolor|pandemia|cuarentena|bebe|nina|nino|tareas|enfermedad|fiebre|tos|covid|virus|rodilla|pierna|espalda|ansiedad|miedo|depresion|tristeza|policia|mama|mami|papa|papi|abuela|abuelo|madre|padre|toque de queda|trancon|trafico|paro|bloqueo|cansancio|guayabo|jefe|jefa)( \w+){0,2} )\bno me (deja|dejan|dejaba|dejaban|ha dejado|han dejado|quiere dejar|quieren dejar) salir (de la casa|de casa|de mi casa|de su casa|del cuarto|de la pieza|del apartamento|ni a la (puerta|tienda|esquina)|sola|a ningun lado|a ninguna parte|para nada)\b(?! (de noche|en la noche|por la noche|tan tarde|tarde|a fiestas?|a la fiesta|a rumbas?|a bailar|con (mis amigas|mis amigos|el novio|mi novio|ese man|ese tipo|amigas|amigos)|sin (chaqueta|saco|abrigo|desayunar|comer|permiso|avisar|terminar|paraguas|sombrilla)|hasta|entre semana|los fines de semana|el fin de semana|por (el|la) (lluvia|frio|aguacero|pandemia|gripa|tareas|trabajo)|mientras (llueva|este enferma|tenga))\b)/,
  // Amenazas del conflicto y de muerte dichas como se dicen en Colombia: la
  // corona fúnebre, "me van a picar", "me van a quemar la casa", la lista de
  // limpieza social, "tengo los días contados", "me van a dar plomo", "me
  // hicieron un atentado", "me balearon la casa", "a punta de fusil", "me
  // tienen en la mira", "me boletearon", "estoy sentenciada a muerte", "me
  // pusieron precio a la cabeza", "me tiraron una granada", "me
  // secuestraron", "me desplazaron", "amenazaron a mis hijos", "secuestraron
  // a mi hija", "mataron a mi esposo". No activan "compré una corona fúnebre
  // para el entierro", "me van a picar los zancudos", "me van a dar plomo en
  // el examen", "tengo los días contados en este trabajo", "un atentado
  // contra la dieta", "la profe me tiene en la mira", "me boletearon en el
  // grupo de whatsapp", "estoy sentenciada a lavar los platos", "me tiraron
  // una bomba de agua", "me desplazaron del puesto", "reclutaron a mi hijo
  // para el equipo de fútbol" ni "se llevaron a mi hijo al paseo".
  /(?<!\b(velorio|funeral|entierro|sepelio|murio|fallecio|pesame|condolencias?|difunt\w*)\b.{0,60})\b(me|nos) (\w+ ){0,2}(dejaron|dejo|mandaron|mando|enviaron|envio|llego|llegaron|pusieron|puso|tiraron|trajeron|hicieron llegar) (\w+ ){0,2}coronas? (funebres?|de (muerto|difunto|flores de muerto))\b(?!.{0,60}\b(velorio|funeral|entierro|sepelio|cementerio|misa|murio|fallecio|difunt\w*|condolencias?|pesame)\b)/,
  /\bcoronas? funebres? (en|a|frente a) (la|mi|nuestra) (puerta|casa|ventana|carro|negocio|tienda|finca|reja)\b/,
  /(?<!\b(zancudos?|mosquitos?|abejas?|avispas?|hormigas?|pulgas?|bichos?|alacran|alacranes|aranas?|culebras?|serpientes?|perros?|gatos?|chinches?|jejenes|plaga|piojos?|garrapatas?|ojos?|nariz|garganta|piel|lengua|boca|ropa|saco|sueter|lana|cebolla|aji)( \w+)? )\b(me|nos|le|les) (va|van|iba|iban|quiere|quieren|queria|querian) a picar(?=$| (y|si|porque|que|con (machete|motosierra|cuchillo|hacha)|en (pedazos|pedacitos|trocitos)|como|vivos?|viva|a mi|a mis|a todos|ya|pronto|esta|hoy|manana)\b)/,
  new RegExp(`\\b(dijo|dijeron|dice|dicen|decia|decian|amenazo|amenazaron|amenaza|amenazan|juro|juraron|grito|gritaron|escribio|escribieron|mando a decir|mandaron a decir|mandaron (un )?mensaje|mando (un )?mensaje|llamaron a decir(me|nos)?|llamo a decir(me|nos)?|advirtieron|advirtio) (\\w+ ){0,2}que (me|nos) (va|van|iba|iban) a (picar|rajar|desaparecer|desfigurar|quemar|apunalar|acuchillar|degollar|descuartizar|golpear|cascar|hacer dano|ahorcar|dar (plomo|bala|chumbimba)|secuestrar|violar|tirar al rio|echar acido|chuzar|balear|torturar)\\b${NO_ES_GRIPA}${NO_ES_REDES}${NO_ES_UN_RATO}(?! (el|la|los|las) (pastel|torta|arroz|comida|cd|disco|archivo|video|carro|celular|pelo|cabello)\\b)`),
  /\b(me|nos) (va|van|iba|iban|quiere|quieren|amenazan con|amenazaron con|amenazo con|amenaza con) (a )?(quemar|incendiar|volar|balear|tirar una (granada|bomba) a|meter candela a) (la|mi|nuestra|el|nuestro) (casa|finca|rancho|negocio|tienda|carro|local|ranchito|casita)\b(?! (de|del) (los )?(nervios|risa|susto|estres|tanto)\b)/,
  /\blimpieza social\b/,
  /\b(tengo|tenemos|tienes) los dias contados\b(?! (en|para|de|del|con|hasta|aqui|aca|como)\b)/,
  /\b(me|nos) (va|van|iba|iban|quiere|quieren|queria|querian) a (dar|pegar|meter|echar) (plomo|bala|chumbimba|tiros?)\b(?! (en|con|al|a la) (el |la |los |las )?(examen|parcial|partido|juego|gym|gimnasio|entreno|clase|trabajo|oficina|tareas?|ejercicio|rutina|fiesta|rumba|baile)\b)/,
  /\b(me|nos) (dieron|dio|metieron|echaron|pegaron|daban) (plomo|bala|chumbimba)\b(?! (en|con|al|a la) (el |la |los |las )?(examen|parcial|partido|juego|gym|gimnasio|entreno|clase|trabajo|oficina|tareas?|ejercicio|rutina|fiesta|rumba|baile)\b)/,
  /(?<!\bse )\b(me|nos) (balearon|baleo|balean|abalearon|abaleo|abalean|dispararon|disparo|disparan|echaron bala|van a balear|quieren balear|iban a balear|intentaron balear)\b(?! ((la|el|los|las) (ansiedad|presion|azucar|glucosa|tension|precios?|alarma|estres|ritmo|corazon|pulso|flash|cuenta|factura|fotos?)|en el pie|fotos?)\b)/,
  /\b(me|nos|le|les) (hicieron|hizo|hacen|van a hacer|quieren hacer|intentaron hacer|iban a hacer) (un|otro) atentado\b(?! (contra|a) (la|mi|el) (dieta|paciencia|salud mental|autoestima|bolsillo|economia|figura|higado|ego|vista|oido|buen gusto)\b)/,
  /\batentado (contra (mi|nosotros|mi vida|mi familia|mis hijos|mi casa|mi esposo)|en mi (casa|finca|negocio))\b(?! (dieta|paciencia|autoestima|bolsillo)\b)/,
  /\ba punta de (fusil|fusiles|pistola|revolver|bala|plomo|machete|cuchillo|arma|armas|tiros|disparos|metralleta|escopeta|changon|amenazas|fierro|fierros)\b/,
  /(?<!\b(profe|profesora|profesor|jefe|jefa|suegra|suegro|mama|mami|papa|papi|coordinador|coordinadora|rector|rectora|directora|director|supervisor|supervisora|entrenador|entrenadora)( \w+){0,2} )\b(me|nos) (tienen|tiene|tenian|tenia|pusieron|puso|ponen) (en la mira|fichad[ao]s?)\b(?! (para|de|del|en|por) (el |la |los |las )?(ascenso|trabajo|empresa|gimnasio|gym|colegio|universidad|oficina|banco|datacredito|proyecto|seleccion|equipo|concurso|beca|puesto|cargo|evaluacion|tienda|almacen|supermercado|iglesia|peluqueria|conjunto|edificio|parqueadero|chisme)\b)/,
  /\b(me|nos) (boletearon|boleteo|boletean|boleteaban|esta boleteando|estan boleteando|tienen boletead[ao]s?|tiene boletead[ao]s?)\b(?! ((en|por) (el|la|los|las|un|una|redes|instagram|whatsapp?|faceboo?k|tiktok|todo|toda)\b|con (esa|ese|la|el|una|un|mis|las|los|sus|su)\b|(la|el|una|un) (foto|video|chisme|historia|estado)\b))/,
  /\b(me|nos) (\w+ ){0,2}(llego|llegaron|dejaron|dejo|mandaron|mando|enviaron|envio|tiraron|tiro|pusieron) (\w+ ){0,2}(boletas?|cartas?|mensajes?|razon|panfletos?|sufragios?) (\w+ ){0,3}(de|del|de la|de los|de las) (guerrilla|guerrilleros|farc|eln|elenos|paras|paracos|paramilitares|autodefensas|disidencias?|clan del golfo|gaitanistas|urabenos|rastrojos|bacrim|grupo armado|grupos armados|armados|pandilla|pandilleros|sicarios|narcos|banda|bandas|combo|combos|extorsionistas)\b/,
  /\bboletas? (extorsiv\w*|de extorsion|amenazante\w*|de amenaza\w*)\b/,
  /\bsentenciad[ao]s? (a muerte|de muerte)\b/, /\b(me|nos) (tienen|tiene|tenian|tenia|dejaron|declararon) sentenciad[ao]s?\b(?! a (?!muerte\b)\w+)/,
  /\b(me|nos|le) (pusieron|puso|ponen|tienen|tiene|han puesto|ofrecen) precio (a|por|sobre) (la|mi|nuestra|su) cabeza\b|\bprecio por mi cabeza\b/,
  /\b(me|nos) (tiraron|tiro|lanzaron|lanzo|pusieron|puso|dejaron|dejo|echaron|explotaron) (una |un )?(granada|bomba|explosivo|tatuco|cilindro bomba|carro bomba|papa bomba|artefacto explosivo)\b(?! (de|del) (agua|chocolate|harina|humo|olor|confeti|colores|chicle|crema|sabor|bano|semillas|tiempo|calor|preguntas|mensajes|informacion|noticias|trabajo)\b)(?!.{0,30}\b(jugando|carnaval|cumpleanos|fiesta)\b)/,
  /\b(pusieron|tiraron|lanzaron|dejaron|explotaron|estallaron|estallo|exploto) (una |un )?(granada|bomba|explosivo|tatuco|carro bomba|cilindro bomba|artefacto explosivo) (en|a|frente a|contra|al lado de) (mi|nuestra|la) (casa|finca|negocio|tienda|carro|puerta|ventana)\b/,
  /\b(me|nos) (desplazaron|desplazo|desplazan|desplazaban|han desplazado|quieren desplazar|van a desplazar|sacaron de (mi|nuestra|la) (tierra|tierrita|finca|parcela|vereda))\b(?! ((del|de la|de mi|de su|de el|de los|de las) (puesto|primer|primera|cargo|trabajo|oficina|lugar|silla|fila|turno|posicion|equipo|lista|ranking|corazon|vida)|(a|al|hacia) (otro|otra|la|el) (puesto|cargo|oficina|sede|area|turno|lugar|cuarto|sofa))\b)/,
  /\b(nos|me) (tenemos|tengo|toco|toca|tuvimos|tuve) (que )?(ir|salir|huir|volar|desplazar|largar)(nos|me)? (\w+ )?(del|de la|de mi|de nuestra) (pueblo|vereda|barrio|finca|tierra|municipio|region|comuna|ciudad|zona|casa)\b.{0,50}\b(amenaz\w*|matar\w*|mataron|guerrilla|paras|paracos|armados|grupo armado|disidencias|bandas?|combos?|desplaz\w*|vacuna|boleta\w*|extorsi\w*)\b/,
  /\b(amenaz\w*|mataron|guerrilla|paras|paracos|armados|grupo armado|disidencias|bandas?|combos?|vacuna|boleta\w*|extorsi\w*)\b.{0,50}\b(nos|me) (tenemos|tengo|toco|toca|tuvimos|tuve) (que )?(ir|salir|huir|volar|desplazar|largar)(nos|me)? (\w+ )?(del|de la|de mi|de nuestra) (pueblo|vereda|barrio|finca|tierra|municipio|region|comuna|ciudad|zona)\b/,
  /\b(amenazan|amenazaron|amenazo|amenaza|amenazaba|amenazaban|estan amenazando|esta amenazando|han amenazado|ha amenazado) a (mis|mi|nuestros|nuestras|nuestro|nuestra) (hijos|hijas|hijo|hija|ninos|ninas|nino|nina|familia|esposo|marido|mama|papa|nietos?|nietas?|bebes?)\b(?! con (no|quitar\w*|castigar\w*|expulsar\w*|sacar\w*|dejar\w*|echar\w*|regan\w*|rajar\w*|perder|bajar\w*|llamar\w*|contar\w*|decir\w*|denunciar\w*|demandar\w*|quitarle\w*|suspender\w*|reprobar\w*|citar\w*)\b)/,
  new RegExp(`\\b(desaparecieron|secuestraron|secuestro|reclutaron|recluto|raptaron|rapto|se llevaron|se robaron|mataron|asesinaron) a (mi|mis|nuestra|nuestro|nuestros|nuestras) (\\w+ )?(hij[oa]s?|nin[oa]s?|bebes?|niet[oa]s?|herman[oa]s?|espos[oa]|marido|mama|papa|sobrin[oa]s?|pareja|companero|famili\\w*)\\b(?! (\\w+ ){0,2}(paseo|colegio|finca|parque|fiesta|cine|centro comercial|piscina|playa|viaje|campamento|excursion|equipo|seleccion|coro|banda|club|iglesia|grupo|futbol|partido|torneo|concurso|programa|novela|serie|pelicula|juego|videojuego|universidad|hospital|medico|clinica|urgencias|ambulancia|bano|vacaciones|almorzar|comer|cenar)\\b| (hace|en (el|la) (ano|decada|epoca|violencia|guerra)|cuando (yo )?(era|tenia|estaba (chiquita|pequena|nina)))\\b)`),
  /\b(tienen|tiene|tengo) (a )?(mi|mis|nuestra|nuestro) (\w+ )?(hij[oa]s?|nin[oa]s?|bebes?|niet[oa]s?|herman[oa]s?|espos[oa]|marido|mama|papa) secuestrad[ao]s?\b|\b(tienen|tiene) secuestrad[ao]s? a (mi|mis|nuestra|nuestro) /,
  new RegExp(`\\ba (mi|mis|nuestra|nuestro) (\\w+ )?(hij[oa]s?|nin[oa]s?|niet[oa]s?|herman[oa]s?|espos[oa]|marido|mama|papa|sobrin[oa]s?) (lo|la|los|las) (reclutaron|recluto|secuestraron|secuestro|desaparecieron|desaparecio|raptaron|rapto|mataron|asesinaron|se llevaron)\\b(?! (\\w+ ){0,2}(paseo|colegio|finca|parque|fiesta|cine|equipo|seleccion|coro|banda|club|futbol|partido|torneo|concurso|programa|novela|serie|pelicula|juego|universidad|hospital|medico|clinica|urgencias)\\b)`),
  new RegExp(`\\b(me|nos) (va|van|iba|iban|quiere|quieren|queria|querian|piensan|pensaban)( a)? desaparecer ${LO_QUE_PASA_EN_CASA}`),
  // El plan dicho de otras formas: "compro las pastillas y me mato", "voy a
  // la represa y me tiro", "voy a ir al puente a tirarme", "ya escogí el
  // puente donde me voy a tirar", "ya sé desde qué piso me voy a tirar",
  // "averigüé desde qué altura hay que tirarse", "mañana ya voy a estar
  // muerta", "ya no voy a estar viva", "ya compré el Gramoxone para
  // tomármelo". No activan "me mato y me mato y nadie lo valora", "voy a la
  // piscina y me tiro", "voy a la represa y me tiro al agua con los niños",
  // "mañana voy a estar muerta del cansancio", "no voy a estar viva para
  // verlo" ni "ya sé desde qué piso se ve el mar".
  new RegExp(`(?<!\\bme mato )\\by (yo )?me (mato|suicido)\\b${NO_ES_ME_MATO}${NO_ES_AJETREO}(?! de (la )?risa\\b| y me mato\\b)`),
  new RegExp(`\\b(voy|vamos|ire|iria|me voy|ir|llego|subo|me subo|me paro|me monto|camino)( a ir)? (\\w+ ){0,2}(a|al|hasta|para|hacia) (el |la |los |las )?(\\w+ ){0,2}${LUGAR_PLAN}\\b.{0,40}\\b(y (me (tiro|lanzo|boto|aviento|arrojo|dejo caer|ahogo|mato)|tirarme|lanzarme)|a (tirarme|lanzarme|botarme|aventarme|arrojarme|dejarme caer|ahogarme|matarme|morir(me)?|suicidarme)|para (tirarme|lanzarme|botarme|aventarme|arrojarme|dejarme caer|ahogarme|matarme|morir(me)?|suicidarme|no volver))\\b(?! (a (nadar|banar\\w*|jugar|pescar|refrescar\\w*|chapotear|flotar|bucear|tomar \\w+)|al agua\\b(?! (para|y) (no (salir|volver)|morir\\w*|ahogarme|matarme))|(un|una) (clavado|chapuzon|piscinazo|pique|foto|selfie)|(en|de|con|haciendo|desde) (el |un |una |la )?(paseo|bungee?|puenting|parapente|paracaidas|tirolina|tirolesa|neumatico|flotador|kayak|lancha|bote|tobogan|inflable|rodadero|clavados?|lazo|cuerda)|con (los ninos|mis hijos|mi hija|mi hijo|el perro|mis amigas|ellos))\\b)`),
  new RegExp(`\\b(${LUGAR_PLAN}|piso|altura|sitio|lugar) (\\w+ ){0,3}(donde|desde donde|de donde|del que|de la que|desde el que|desde la que|en el que|en la que) (me (voy a|pienso|quiero|tengo que|iba a) (tirar|lanzar|botar|aventar|arrojar|colgar|ahorcar|matar|suicidar|dejar caer)|(voy|pienso|quiero|tengo que) (tirarme|lanzarme|botarme|colgarme|ahorcarme|matarme|suicidarme|dejarme caer)|hay que (tirarse|lanzarse|botarse))\\b(?! (a (ver|dormir|descansar|leer|tomar|broncear\\w*|asolear\\w*|nadar|jugar)|en (la|el) (cama|sofa|hamaca|piscina|pasto|arena)|un rato|la siesta)\\b)`),
  /\b(desde|de) (que|cual|cuantos?|cuantas?) (\w+ )?(piso|pisos|altura|puente|edificio|torre|metros) (\w+ ){0,2}(me voy a (tirar|lanzar|botar|aventar)|me (tiro|lanzo|boto)|hay que (tirarse|lanzarse|botarse)|tengo que (tirarme|lanzarme)|(tirarse|tirarme|lanzarse|lanzarme)|se (muere|mata) (uno|una|la gente))\b/,
  /\b(manana|pronto|esta noche|hoy|el (lunes|martes|miercoles|jueves|viernes|sabado|domingo)|a esta hora|para (manana|esta hora|el (lunes|martes|miercoles|jueves|viernes|sabado|domingo))|ya|en (unos|pocos|dos|tres) (dias|horas)|dentro de (\w+ ){1,2}(dias|horas))( \w+){0,4} (voy a estar|estare) muert[ao]\b(?! (de|del|con|por|despues|luego|cuando|si|para|toda la|todo el|en|al|tras)\b)/,
  /\b(ya no|no) (voy a estar|estare|voy a seguir|seguire|voy a amanecer|amanecere) (viva|vivo|con vida)\b(?! (para (ver|cuando|el|la|los|las|tanto)|cuando|si|tanto tiempo|mucho tiempo|tantos anos|hasta)\b)/,
  new RegExp(`\\b(compre|consegui|tengo|ya tengo|guarde|escondi|traje|mande a comprar) (\\w+ ){0,3}(${VENENOS} (\\w+ ){0,4}(para|pa) (tomarmel[oa]s?|tragarmel[oa]s?|bebermel[oa]s?)|(${PASTILLAS}|pastilla|pepas?) (\\w+ ){0,4}(para|pa) (tomarmel[oa]s?|tragarmel[oa]s?) tod[oa]s)\\b`),
  // Lo que ya está listo, o dónde está ella: "ya tengo la soga en el patio",
  // "ya tengo la cuerda y la viga escogida", "esta noche lo hago, ya tengo
  // todo listo", "ya dejé escrita la carta para mis hijos", "ya estoy en el
  // puente", "estoy en la orilla del río y me voy a meter". No activan "ya
  // tengo la cuerda para saltar", "estoy en el puente esperando el bus" ni
  // "estoy en la orilla del río y me voy a meter a nadar".
  /\bya tengo (la|una|mi) (soga|cuerda|lazo|horca)\b(?= (en|y|lista|listo|amarrada|colgada|escogida|preparada|guardada|escondida)\b)(?! (en|y) (el |la )?(carro|camion|trasteo|mudanza|bodega|ferreteria|tienda)\b)(?! (lista|listo|preparada|guardada) para (el|la|los|las|amarrar|colgar la ropa|tender|jugar|saltar|acampar|escalar)\b)/,
  /\b(soga|cuerda|lazo)\b.{0,40}\b(viga|rama|arbol|techo|ventilador)\b.{0,15}\b(escogid[ao]s?|elegid[ao]s?|list[ao]s?|preparad[ao]s?)\b/,
  /\b(esta noche|hoy|hoy mismo|manana|esta madrugada|ya) lo (hago|voy a hacer|hare)\b.{0,50}\b(tengo todo (listo|preparado)|deje (escrita |escritas )?(la|una|mi|las) cartas?|ya decidi|escribi (la|una|mi) carta|me despedi)\b/,
  /\b(tengo todo (listo|preparado)|deje (escrita|escritas|lista) (la|una|mi|las) cartas?|escribi (la|una|mi) carta|ya decidi|me despedi de (todos|todas|mis hijos))\b.{0,50}\b(esta noche|hoy|hoy mismo|manana|esta madrugada|ya) lo (hago|voy a hacer|hare)\b/,
  /\bya (deje|tengo|dejo) (escrita|escritas|lista|listas) (la|una|mi|las) cartas? (de despedida )?(para|a) (mis|mi) (hijos|hijas|hijo|hija|familia|mama|papa|esposo|hermanos?|hermanas?|nietos?)\b/,
  /\bya (estoy|llegue) (en|al|a la|sobre) (el |la )?(puente|viaducto|precipicio|abismo|barranco|risco|acantilado|cornisa|azotea|borde)\b(?! (esperando\w*|con (mi|mis|el|la|los|las|unos|unas|amigos|amigas|mi novio)|de (paseo|camino)|en (el|la|un|una) (bus|carro|taxi|moto|bici|cicla|buseta)|(?!(llorando|pensando|mirando|temblando|sintiendo)\b)\w+(ando|iendo)|parquead[ao]|ya (voy|vamos|llego|bajo)|voy|vamos|llegando|para|y (ya )?(voy|vamos|llego|bajo|subo|paso)|nos vemos|donde|dime|me recoges|recogeme|ven|venga|vengan|a (las|la) \d*|vendiendo)\b)/,
  /\b(estoy|ando|sigo|me pare|llegue|me sente) (\w+ )?(en|a) (la orilla|el borde) (del|de la|de el) (rio|represa|mar|lago|laguna|quebrada|embalse|precipicio|abismo|puente)\b.{0,30}\b(me voy a (meter|tirar|lanzar|botar|ahogar|dejar caer)|meterme|tirarme|lanzarme|ahogarme|me (tiro|lanzo|meto|boto))\b(?! (a (nadar|banar\w*|pescar|jugar|refrescar\w*|chapotear|mojar\w*|lavar)|con (los ninos|mis hijos|mi hija|mi hijo|el perro|mis amigas))\b)/,
  // Sobredosis sin decir "pastillas" y los otros métodos: "me tomé todo el
  // clonazepam", "me tomé el clonazepam", "voy a abrir la pipeta de gas y me
  // encierro", "voy a prender carbón en el cuarto cerrado", "me voy a
  // inyectar toda la insulina", "me voy a guindar del árbol del patio". No
  // activan "me tomé el clonazepam que me recetaron", "voy a abrir la pipeta
  // para hacer el almuerzo", "voy a prender carbón para el asado", "me voy a
  // inyectar la insulina antes del almuerzo", "me guindé en la hamaca" ni "me
  // voy a guindar del árbol a coger mangos".
  new RegExp(`\\b(tomar(me)?|tome|tomo|tomado|tragar(me)?|trague|trago|me meti|meterme) (todo el|toda la|todos los|todas las|el frasco de|un frasco de|el frasquito de|un frasquito de|el tarro de|el tarrito de|la cajita de|el blister de|el paquete de|el sobre de|la bolsa de|la bolsita de) ${PASTILLAS}\\b(?! (del|de la|de mi) (antibiotico|tratamiento|formula|receta|desparasitante)\\b)`),
  /\bme (tome|trague|meti) (el|la|los|las|mis) (clonazepam|rivotril|alprazolam|lorazepam|diazepam|zolpidem|tramadol|quetiapina|amitriptilina|trazodona|valium|xanax)(e?s)?(?=$| (y (ya|no|nadie|me (voy a morir|quiero morir|siento (mal|mareada|rara)))|ya no|no se|a proposito|enteros?|enteras?|completos?|completas?|tod[oa]s?|para (no (despertar|volver a despertar)|morir(me)?|matarme))\b)/,
  /\b(voy a (abrir|dejar abierta|soltar)|abrire|abriria|quiero abrir|pienso abrir|ganas de abrir) (toda |todo )?(la|el) (pipeta|cilindro|llave de la pipeta)( de(l)? gas)?(?=$)/,
  /\b(abrir|abri|abro|abrire|abriria|dejar|deje|dejo|soltar|solte|suelto) (toda |todo )?(la|el) (pipeta|cilindro|llave de la pipeta)( de(l)? gas)?\b(?= (y (me|nos) (encierro|encerre|acuesto|acoste|duermo|dormi|quedo|voy a (encerrar|dormir|acostar))|y (cierro|cerre|tapo|tape) (todo|las ventanas|la puerta|puertas)|de una vez|toda la noche|sin prender|abiert[ao] (toda la noche|y)|para (no (despertar|volver a despertar|amanecer)|morir(me)?|matarme|dormir(me)? para siempre|acabar con todo|que (me|nos) (mate|maten|muera|muramos)))\b)/,
  /\b(carbon|carbones|brasero|anafe)\b.{0,60}\b((cuarto|pieza|habitacion|bano|carro|apartamento|casa|carpa) (cerrad[oa]|sin ventilacion|con todo cerrado)|(y|para) (me|nos) (encierro|encerre|encierre|encerramos|acuesto|quedo dormida)|(y|para) (encerrarme|encerrarnos)|para (no (despertar|volver a despertar|amanecer)|morir(me)?|matarme|dormir(me)? para siempre|que (me|nos) (mate|muera)))\b/,
  /\b(inyectar(me)?|inyecte|inyecto|meter(me)?|meti|aplicar(me)?|aplique|ponerme|me puse) (toda la|todo el (frasco|tarro|vial|lapicero|pen) de|todas las (dosis|unidades|jeringas) de|un frasco (entero )?de|el frasco (entero )?de|una sobredosis de|demasiada|muchisima|toda mi|el doble de|el triple de|varias (dosis|jeringas|plumas) de|(varios|muchos) (frascos|lapiceros|viales) de) (la |mi )?insulina\b/,
  /\bme (voy a|quiero|pienso) inyectar insulina(?=$| (y (ya|me|no)|para (morir|matarme|no despertar|dormir(me)? para siempre)|de una vez|a proposito|toda|todo)\b)/,
  /\binsulina\b.{0,40}\b(para|pa) (morir(me)?|matarme|suicidarme|no (volver a )?despertar|dormir(me)? para siempre|quitarme la vida)\b/,
  new RegExp(`(${ME_QUIERO} guindar|\\bguindarme|\\bme (guindo|guinde|guindare|guindaria)) (\\w+ ){0,3}(de|del|en) (el |la |una |un |mi )?(arbol|viga|techo|bano|closet|armario|cuarto|ducha|baranda|lampara|ventilador|palo|rama|puente|soga|cuerda|lazo|reja)\\b(?! (a|para) (coger|bajar|recoger|tumbar|alcanzar|arreglar|limpiar|colgar|pintar|cambiar|jugar|columpiar\\w*|mecer\\w*)\\b)`),
  new RegExp(`(${ME_QUIERO} guindar|\\bguindarme|\\bme (guindo|guindare|guindaria)) (\\w+ ){0,4}con (una |un |la |el |mi )?(cuerda|soga|correa|cinturon|sabana|lazo|cable)\\b`),
  /\b(me (quiero|quisiera|dan ganas de|provoca) guindar|(quiero|quisiera|ganas de|pienso en) guindarme)(?=$| (y (ya|se acaba|nadie)|ya|de una vez|hoy|esta noche|porque|que)\b)/,
  // Ideación con las construcciones de todos los días: "ya no deseo vivir",
  // "lo que quiero es morirme", "me provoca es morirme", "tengo pensamientos
  // de muerte", "me quiero ir de esta vida", "ya no le quiero seguir dando a
  // esta vida". No activan "ya no deseo vivir en esta ciudad", "lo que quiero
  // es morirme de la risa", "me provoca es dormir", "tengo pensamientos de
  // muerte de mi mamá" ni "me quiero ir de esta vida de estrés".
  new RegExp(`\\bno deseo (vivir|seguir viviendo|seguir viva|seguir vivo|estar viva|estar vivo|seguir con vida)\\b(?! (con|en (?!(este|esta) (mundo|vida)\\b)|para|de|del|por|pendiente|bajo|a medias|al dia|a la|al|preocupada|estresada|angustiada|corriendo|apurada|asi de|tan|sola|solo|lejos|cerca|alla|aqui|aca|afuera)\\b)`),
  new RegExp(`\\b(lo (unico )?que (yo )?(quiero|quisiera|deseo|necesito)|(me|te) provoca|(me|te) dan ganas|ganas tengo) es (${MORIR_FIN}|matarme\\b${NO_ES_ESFUERZO}|suicidarme|quitarme la vida|desaparecer(me)?\\b${NO_ES_REDES}${NO_ES_UN_RATO}(?! (el|la|los|las|mis|mi)\\b)|no (existir|despertar(me)?\\b${NO_ES_SUENO})|estar muert[ao]|dormir(me)? para siempre)`),
  /\b(tengo|tenia|he tenido|vuelvo a tener|volvi a tener|me llegan|me vienen|me dan|sigo con|ando con|tuve|me persiguen|no se me quitan|no me dejan) (\w+ ){0,2}(pensamientos|ideas|ideaciones) (de muerte|de morir(me)?|de matarme|de quitarme la vida|de desaparecer|de no (existir|despertar)|de hacerme dano|de lastimarme|de cortarme)\b(?! (de|del) (mi|mis|la|el|los|las|su|sus|alguien|otra|otro) \w+)/,
  /\bir(me)? de esta vida\b(?! (de|tan|llena|asi|como|con)\b)/,
  new RegExp(`\\b(ya )?no (le )?(quiero|puedo|voy a) seguir(le)? dando (a )?(esta|la|mi) vida\\b${NO_ES_ETAPA}`),
  // Autolesión: clavarse las uñas, pincharse, golpearse "yo misma", darse
  // contra la pared, lastimarse los brazos con un vidrio, clavarse un
  // cuchillo. No activan "me clavé una espina", "me pinché con la aguja
  // cosiendo", "me lastimé los brazos en el gym", "me pegué yo misma el
  // chicle en el pelo", "me golpeé yo misma con la puerta sin querer" ni "me
  // doy contra la pared de la risa".
  /\bme (rasguno|rasgune|rasgunaba|arano|arane|aranaba|rasco|rasque|pellizco|pellizque|muerdo|mordi|golpeo|golpee|pego|pegue|corto|corte|lastimo|lastime|arranco|arranque|arrancaba|jalo|halo|clavo|clave|clavaba|entierro|enterre|pincho|pinche|rayo|raye|quemo|queme) .{0,40}hasta (sangrar|que (me )?sangr\w*|hacerme sangre|(sacarme|sacar|hacerme salir) (la )?sangre|hacerme sangrar|que (me )?(salen|sale|salgan|quedan|queden|dejo|hago) (heridas|sangre|marcas|moretones|morados|cicatrices)|quedar morad[ao])\b(?!.{0,20}\b(sin querer|jugando|de la risa)\b)/,
  /\bme (doy|daba|estoy dando|sigo dando|golpeo|pego|estrello|estrellaba) (la cabeza |duro |fuerte )?contra (la|las|el|los) (pared|paredes|muro|muros|espejo)\b(?=$| (y|hasta|yo misma|a proposito|porque|para|de (la )?(rabia|ira|desesperacion|impotencia|angustia))\b)/,
  /\bme (di|he dado|golpee|pegue|estrelle) (la cabeza |duro |fuerte )?contra (la|las|el|los) (pared|paredes|muro|muros|espejo)\b(?= (hasta|yo misma|a proposito|porque me (odio|odiaba)|para castigarme|de (la )?(rabia|ira|desesperacion|impotencia|angustia))\b)/,
  new RegExp(`\\bme (pegue|golpee|golpie|golpe|lastime|corte|queme|rasgune|arane|pellizque|mordi|castigue|hice dano|pego|golpeo|lastimo|corto|quemo|rasguno|arano|pellizco|muerdo|castigo|hago dano|pegaba|golpeaba|lastimaba|cortaba|quemaba|di golpes|doy golpes|di punos|doy punos)\\b${NO_ES_PELO} (\\w+ ){0,5}(yo (misma|mismo|sola|solita)|a mi mism[ao])\\b(?! (\\w+ )?(el|la|los|las) (chicle|pelo|cabello|curita|parche|tinte|mascarilla|crema|unas|pestanas|extensiones|tatuaje|piercing|boton|fleco|cerquillo|puntas|cejas|vacuna|inyeccion)\\b)(?!.{0,40}\\b(sin querer|por accidente|accidentalmente|jugando|cocinando|planchando|alisando\\w*|cosiendo|limpiando|lavando|con la puerta|de la risa|en la cocina|el pelo|las unas|el fleco)\\b)`),
  /\bme (pinche|pincho|pinchaba|clave|clavo|clavaba|chuce|raye|rayo|rasque|rasco|mordi|muerdo|pellizque|pellizco|arranque|arranco|enterre|entierro|di golpes|doy golpes|di punos|doy punos|di cachetadas|doy cachetadas) .{0,40}\ba proposito\b/,
  new RegExp(`\\bme (lastime|lastimo|lastimaba|corte|corto|cortaba|raye|rayo|rasgune|rasguno|hice dano|hago dano|hice heridas|hago heridas|abri|abro|rasque|rasco|queme|quemo) (\\w+ )?(los|las|mis) (brazos|piernas|munecas|muslos|antebrazos|venas|barriga|estomago|abdomen|caderas|tobillos|pantorrillas) (\\w+ ){0,2}con (un|una|el|la|unos|unas|mi|mis) (vidrio|vidrios|cuchilla|cuchillas|navaja|bisturi|tijeras|cuchillo|tajalapiz|sacapuntas|cortaunas|hoja de afeitar|gillette|cuchilla de afeitar|aguja|agujas|alfiler|clip|lapicero|esfero|compas|piedra|cigarrillo|cigarrillos|encendedor|unas|cuter|exacto)\\b(?!.{0,30}\\b(sin querer|por accidente|accidentalmente|jugando|cocinando|lavando|limpiando|arreglando|trabajando|cortando|cosiendo|depilando\\w*|afeitando\\w*)\\b)`),
  /\bme (clave|clavo|clavaba|enterre|entierro|enterraba|hundi|hundo) (un|una|el|la|unas|unos|las|los) (cuchillo|navaja|cuchilla|tijeras|punal|destornillador|tenedor|cuchillos|tijera|bisturi|cuter)\b(?!.{0,40}\b(sin querer|por accidente|accidentalmente|cocinando|picando|cosiendo|jugando|arreglando|trabajando|pelando|cortando)\b)/,
  // Violencia sexual "a la fuerza", con escopolamina, y el abuso de una hija
  // dicho con "a mi hija la…" o en pasiva: "me forzó a estar con él", "me
  // acostó a la fuerza", "me escopolaminaron", "a mi hija la tocó el abuelo",
  // "mi hija fue violada", "el padrastro de mi hija la está tocando", "el
  // vecino se le mete al cuarto a mi hija". No activan "me forzó a estar en la
  // reunión", "me cogió a la fuerza el sueño", "a mi hija la tocó el turno",
  // "a mi hija la tocaron para el baile" ni "la está tocando en el piano".
  /\bme (\w+ )?(obliga|obligo|obligan|obligaron|obligaba|fuerza|forza|forzo|forzaron|forzaba) a (estar|dormir|acostarme|meterme a la cama) con (el|ellos|ella|ese man|ese tipo|su amigo|sus amigos|otro|otros|otra|otras|varios|un hombre|hombres|el man|ese senor|un senor|su jefe)\b(?! (en|para) (el|la|los|las|un|una) (almuerzo|reunion|cena|fiesta|evento|clase|cita|oficina|trabajo|empresa|viaje|paseo|matrimonio|boda|cumpleanos|navidad)\b)/,
  /\b(me|conmigo) (cogio|cogia|cogieron|tuvo|tenia|tuvieron|hizo el amor|hizo suya|hicieron suya|beso|besaba|besaron|desvistio|desvestia|desvistieron|desnudo|desnudaron|quito la ropa|quitaron la ropa|arranco la ropa|toco|tocaba|tocaron|metio a la cama|llevo a la cama|llevo a su cuarto|penetro|penetraron|monto|subio encima|violo|abuso|agarro|agarraron|sometio|sometieron|sometia|metio la mano|metio los dedos|tumbo en la cama|amarro|amarraron) (\w+ ){0,2}a la fuerza\b(?! (el|la) (sueno|noche|lluvia|aguacero|tarde|hambre|pereza|gripa|frio|cansancio)\b| (en|haciendo) (el|la) (gimnasio|gym|clase|oficina|trabajo|entreno)\b| \w+(ando|iendo)\b)/,
  /\bme (acosto|acostaba|acostaron) (\w+ ){0,2}a la fuerza\b(?! (el|la) (sueno|noche|lluvia|aguacero|tarde|hambre|pereza|gripa|frio|cansancio)\b| (en|haciendo) (el|la) (gimnasio|gym|clase|oficina|trabajo|entreno)\b| \w+(ando|iendo)\b)(?!.{0,40}\b(porque no (queria|quise|quiero) dormir|para (que )?(dormir|durmiera|la siesta)|a dormir|la siesta|cuando (era|estaba) (nina|chiquita|pequena|enferma))\b)/,
  /\b(relaciones|sexo|intimidad|hizo el amor|hicimos el amor|lo hicimos|tuvimos (sexo|relaciones)) (\w+ ){0,3}a la fuerza\b/,
  /\b(me|nos|la|lo|le|les) (\w+ ){0,2}(escopolamin\w*|burundang\w*)\b(?! para (el|la) (mareo|nausea|nauseas|vomito|viaje)\b)/,
  new RegExp(`\\ba (mi|mis|nuestra|nuestro|una|la|su) (\\w+ ){0,4}?${MENOR} (\\w+ ){0,4}?(la|lo|las|los) (toco|tocaron|toca|tocan|tocaba|tocaban|ha tocado|han tocado|esta tocando|estan tocando|sigue tocando|manoseo|manosearon|manosea|manosean|manoseaba|violo|violaron|viola|violan|violaba|ha violado|han violado|abuso|abusaron|abusa|abusaba|ha abusado|han abusado|esta violando|esta abusando|esta manoseando)\\b(?! (el|la|los|las) (turno|guitarra|piano|cancion|musica|puerta|timbre|tema|bateria|violin|tambor|frente|loteria|rifa|premio|suerte|china|bolita|lista|papeleta|regalo)\\b| (para|en|de) (el|la|los|las|un|una) \\w+| (\\w+ )?\\w+(ar|er|ir)(la|lo|las|los|le|les)?\\b| (muy |tan )?(bien|mal|bonito|lindo|duro|suave)\\b)`),
  /\b(mi|mis|nuestra|nuestro|su|una|la) (\w+ ){0,3}?(hij[oa]s?|hijastr[oa]s?|nin[oa]s?|nen[ae]s?|bebes?|niet[oa]s?|sobrin[oa]s?|hermanit[oa]s?|herman[oa]s?|amiga|amigas|mama|prima|primas|vecina|novia|esposa|alumn[oa]s?|estudiantes?) (\w+ ){0,3}?(fue|ha sido|habia sido|fueron|han sido|era|eran) (violad[oa]s?|abusad[oa]s?|manosead[oa]s?)( sexualmente)?\b(?! en (sus|mis|los) derechos\b| (por|de) (la|el|los|las) (sistema|eps|empresa|banco|ley|estado|gobierno|colegio)\b)/,
  /\b(padrastro|tio|primo|abuelo|cunado|suegro|vecino|hermanastro|profesor|profe|entrenador|papa|padre|esposo|marido|novio|pareja|senor|hombre|man|tipo|viejo) (de (mi|su|la) (\w+ )?(hij[oa]|nin[oa]|mama|madre|hermana|hermanita|sobrin[oa]|niet[oa]) )?(\w+ ){0,2}(la|lo|las|los) (esta|estan|sigue|siguen|ha estado|anda|vive) (tocando|manoseando|violando|abusando|acosando)\b(?! (la|el|los|las) (guitarra|piano|cancion|musica|puerta|timbre|tema|bateria|violin|tambor|flauta)\b| (en|para|con) (el|la|clase|misa|la iglesia|el concierto|la banda)\b)/,
  /(?<!\b(cancion|guitarra|piano|musica|tema|pieza|flauta|violin|bateria|puerta|campana|timbre|melodia|tambor|acordeon|organo|teclado|canciones|vallenato|himno|vals|bambuco)\b.{0,40})\b(la|lo) (esta|estan|sigue|siguen) (tocando|manoseando)$/,
  new RegExp(`\\b(padrastro|tio|primo|abuelo|cunado|suegro|vecino|hermanastro|senor|viejo|man|tipo|hombre|profesor|(novio|esposo|pareja|marido) de (mi|su) (mama|madre)) (\\w+ ){0,2}se (le|les) (mete|metia|metio|entra|entraba|entro|pasa|pasaba|cuela|colaba|colo) (a|al|en|por) (el |la |su )?(cuarto|cama|habitacion|pieza|bano)\\b(?=.{0,30}\\ba (mi|mis|nuestra|nuestro|la|su) (\\w+ )?${MENOR}\\b)`),
  new RegExp(`\\b(padrastro|tio|primo|abuelo|cunado|suegro|vecino|hermanastro|senor|viejo|man|tipo|hombre|profesor|(novio|esposo|pareja|marido) de (mi|su) (mama|madre)) (\\w+ ){0,2}se (mete|metia|metio|entra|entraba|entro|pasa|pasaba|cuela|colaba|colo) (a|al|en) (el |la )?(cuarto|cama|habitacion|pieza|bano) de (mi|mis|nuestra|nuestro) (\\w+ )?${MENOR}\\b(?! (a|para) (coger|buscar|sacar|traer|llevar|arreglar|pintar|limpiar|revisar|dejar|poner|instalar|cambiar)\\b)`),
  // Un hijo (o la pareja) que llega a pegarle, y la cabeza rota: "mi hijo
  // llega borracho a pegarme", "mi hijo me rompió la cabeza con una
  // botella", "me abrió la cabeza", "me descalabró", "me abrió la ceja". No
  // activan "mi hijo llega a pegarme los botones", "mi hijo me rompió la
  // cabeza con tantas preguntas" ni "ese libro me abrió la cabeza".
  /\b(llega|llego|llegaba|viene|vino|venia|entra|entro|entraba|se mete|se metio|sale|salio) (\w+ ){0,3}a (pegarme|golpearme|cascarme|maltratarme|patearme|ahorcarme|violarme|tocarme|amenazarme|empujarme|zarandearme|jalonearme|levantarme la mano|darme (golpes|punos|patadas|correa|una pela))\b(?! (los|las|el|la|un|una|sus|su) \w+| (mi|mis) (?!(esposo|marido|mama|papa|hija|hijo|hijos|hijas|familia|pareja|novio|hermana|hermano|gente)\b)\w+)(?!.{0,30}\b(jugando|pataleta|berrinche|bromeando|de juego)\b)/,
  /(?<!\b(ejercicio|problema|examen|parcial|tarea|acertijo|crucigrama|sudoku|pregunta|tema|libro|clase|matematicas|ruido|bulla|musica|curso|terapia|viaje|experiencia|pelicula|charla|serie|documental|conversacion|psicologa|psicologo|taller|profe|profesora|profesor|lectura)( \w+)? )\bme (rompio|rompieron|partio|partieron|abrio|abrieron|reventaron|revento|fracturo|fracturaron) (la|el) (cabeza|craneo)\b(?! (con|de) (tant[oa]s?|esas?|esos?|sus|la|el|los|las|mis) (preguntas|problemas|ejercicios?|tareas?|cuentas|cosas|matematicas|pensamientos|ideas|dudas|gritos|ruido|bulla|musica|cantaleta|quejas|lloradera|chismes|historias|cuentos)\b| (ese|esa|este|esta|el|la) (ejercicio|problema|examen|parcial|tarea|acertijo|crucigrama|sudoku|pregunta|tema|libro|clase|curso|viaje|pelicula|serie|charla)\b| a (nuevas|otras|otro|una|mas|todo) \w+| (para|de) (bien|entender|pensar)\b)(?!.{0,40}\b(jugando|sin querer|por accidente|accidentalmente)\b)/,
  /\bme (descalabro|descalabraron|descalabra)\b(?! (el|la|los|las|mi|mis) (?!(cabeza|frente|craneo)\b)\w+)/, /\bme (abrio|abrieron|rajo|rajaron) (la|el) (ceja|frente|labio|cara|mejilla|pomulo)\b/,
  // La crisis de otra persona: "encontré a mi hija cortándose", "mi pareja
  // dice que se va a pegar un tiro", "mi hija se colgó", "el marido de mi
  // vecina la está matando a golpes", "el vecino le está pegando a la
  // señora". No activan "encontré a mi hija cortándose el pelo", "mi hija se
  // colgó del columpio", "se va a pegar una siesta" ni "el vecino le está
  // pegando al balón".
  new RegExp(`\\b(encontre|vi|pille|descubri|cache|halle|encontramos|vimos|sorprendi|encuentro|veo) a (mi|mis|una|la|el|su|nuestra|nuestro) (\\w+ ){0,2}(cortandose|ahorcandose|lastimandose|haciendose dano|quemandose|envenenandose|asfixiandose|tomandose (las|unas|todas las|un frasco|el frasco|la caja)|tragandose (las|unas|todas las)|colgandose (de|del|en) (el |la |una |un )?(viga|techo|arbol|closet|ducha|ventilador|lampara|baranda|cuerda|soga))\\b${NO_ES_PELO}${NO_ES_ACCIDENTE}`),
  /\bse (va|iba|quiere|queria|quiso|quisiera|piensa|intento|trato de|ha intentado) (a )?(pegar|dar|meter) (un tiro|un balazo|un disparo)\b(?! (de|libre|penal|al arco|a gol|a puerta)\b)/,
  /\b(pegarse|darse|meterse) un (tiro|balazo|disparo)\b(?! (de|libre|penal|al arco|a gol|a puerta)\b)|\bvolarse (la cabeza|los sesos)\b/,
  /\b(mi|una|la|el|su) (hija|hijo|amiga|amigo|hermana|hermano|prima|primo|sobrina|sobrino|nieta|nieto|alumna|alumno|mama|papa|madre|padre|esposo|esposa|marido|novio|novia|pareja|companera|vecina|cunada|tia|tio) (\w+ ){0,3}se colgo\b(?=$| (y|pero|ya|anoche|ayer|hoy|en (el|la|su|mi) (bano|cuarto|closet|patio|habitacion|ducha|casa|finca|arbol|garaje)|con (una|la|un|el) (cuerda|soga|sabana|cinturon|correa|cable)|de (una|la|un|el) (viga|cuerda|soga|arbol|ventilador|techo))\b)/,
  /\b(la|lo|los|las|me|nos|te|le|les) (esta|estan|estaba|estaban|van|iban) (a )?(matando|matar) a (golpes|punos|patadas|palo|palazos|machete|machetazos|cuchillo|punaladas|tiros|bala|correazos)\b/,
  /\b(le|les|la|lo|las|los) (esta|estan|estaba|estaban|sigue|siguen) (pegando|golpeando|cascando|maltratando|pateando|ahorcando|violando|arrastrando|aporreando|zarandeando|estrangulando|apunalando|acuchillando) a (la|su|mi|una|esa|esta) (senora|esposa|mujer|novia|pareja|vecina|nina|hija|mama|hermana|muchacha|chica|nino|hijo|bebe|abuela|companera|muchachita|pelada|china)\b/,
  /\b(le|les) (esta|estan|estaba|estaban|sigue|siguen) (pegando|golpeando|cascando|maltratando|pateando|ahorcando|aporreando|zarandeando)(?=$| (y|otra vez|de nuevo|duro|horrible|muy duro|feo|ahora|ya|ahorita|en este momento)\b)/,
  /\b(la|lo|las|los) (esta|estan|estaba|estaban|sigue|siguen) (golpeando|cascando|maltratando|pateando|ahorcando|violando|arrastrando|aporreando|estrangulando|apunalando|acuchillando)\b(?! (la|el|los|las) (puerta|pared|mesa|ventana|pelota|balon|piso|tambor|bateria|teclado|carro|ropa|tapete|alfombra|masa|carne)\b)/,
  /\b(le|les) (dio|dieron|da|daba|daban|pego|pegaron|pega|pegaba) con (el|la|un|una|su) (palo|escoba|correa|cinturon|rejo|tabla|bate|machete|peinilla|martillo|botella|plancha|olla|cable|manguera|varilla|tubo|silla|piedra|ladrillo|garrote|cuchillo|hebilla|vara|cadena) (\w+ ){0,3}a (mi|mis|su|sus|la|una) (\w+ )?(hij[oa]s?|nin[oa]s?|bebes?|niet[oa]s?|herman[oa]s?|mama|esposa|mujer|novia|vecina|sobrin[oa]s?|abuela|senora)\b(?!.{0,40}\b(sin querer|por accidente|jugando)\b)/,
  /\b(esta|estan|estaba|estaban|sigue|siguen) (pegando|golpeando|cascando|maltratando|pateando|ahorcando|violando|matando|arrastrando|apunalando|acuchillando) a (la|una|mi|su|esa|esta) (senora|vecina|esposa|mujer|nina|muchacha|chica|hija|mama|hermana|bebe|nino|hijo|abuela|novia|pelada|muchachita)\b/,
  // Ideación indirecta: "ya no le encuentro sentido a levantarme", "me da lo
  // mismo vivir que morir", "quisiera acostarme y no despertar nunca", "siento
  // que estorbo en este mundo", "ya me cansé de luchar", "no tengo razones
  // para seguir", "ojalá me diera un infarto", "quisiera no existir", "si no
  // estuviera mis hijos estarían mejor", "mejor que me muera", "estoy mamada
  // de esta vida". No activan "ya me cansé de luchar con este computador",
  // "no tengo razones para seguir con él", "quisiera acostarme y no
  // despertar hasta el lunes", "quisiera no existir en el grupo" ni "estoy
  // mamada de esta vida de oficina".
  new RegExp(`\\bno (le )?(veo|encuentro|hallo|tiene) (ningun )?sentido (a |de |en )?(levantarme|despertar(me)?|seguir viva|seguir vivo|estar viva|estar vivo|existir|respirar|seguir aqui|seguir respirando)\\b(?! (temprano|tan temprano|a las|para (ir|el|la)|en (el|la|esta|este) (trabajo|empresa|ciudad|casa|oficina))\\b)`),
  /\bme (da|daria|daba|es|seria) (igual|lo mismo|indiferente) (vivir|estar viva|estar vivo|seguir viva|seguir vivo|seguir viviendo) (que|o) (morir(me)?|estar muert[ao]|no|dejar de vivir)\b/,
  new RegExp(`\\b(acostarme|dormirme|dormir|cerrar los ojos|echarme|irme a dormir|acostarme a dormir) y no (volver a )?(despertar(me)?|abrir los ojos)( nunca( mas)?| jamas| mas)?\\b${NO_ES_SUENO}`),
  /\b(estorbo|sobro|soy un estorbo|soy una carga|solo estorbo) en (este mundo|esta vida|la vida|esta tierra|el mundo|esta familia|esta casa)\b/,
  /\bme (canse|harte|aburri|agote) de (luchar|intentarlo|seguir luchando|seguir intentando|sobrevivir|resistir)\b(?! (con|contra|por|para|en|de|cada|todos los|todo el|tanto)\b)/,
  /\b(no tengo|ya no tengo|sin|perdi las|no me quedan|se me acabaron las) (razones|motivos|fuerzas|ganas) (de|para) seguir\b(?! (con|en (?!este mundo\b)|de|del|a|al|para|por|haciendo|trabajando|estudiando|intentando|insistiendo|pagando|esperando|yendo|corriendo|entrenando|caminando|cocinando|limpiando|adelante (con|en)|el|la|los|las|este|esta|ese|esa)\b)/,
  /\bojala (que )?me (de|diera|diese|pase|pasara|pasase|llegue|llegara) (un|una) (accidente|infarto|derrame|aneurisma|enfermedad terminal|cancer|paro (cardiaco|respiratorio))\b(?=$| (y|para|que|de una vez|grave|fatal|mortal|mientras|dormida|durmiendo|en la noche|esta noche|hoy|ya)\b)/,
  /\bno (doy|puedo|aguanto|soporto) mas\b.{0,20}\bestoy al limite\b(?! (con|en|de|del|por|para|el|la|los|las|este|esta)\b)|\bestoy al limite\b.{0,10}\bno (doy|puedo|aguanto|soporto) mas\b(?! (con|en|de|del|por|para|el|la|los|las|este|esta)\b)/,
  /\b(quisiera|quiero|preferiria|prefiero|me gustaria|desearia|deseo|ojala pudiera|solo quiero|solo quisiera) no (existir|haber existido)\b(?! (en|para|de|del|mas en|tan) \w+)/,
  /\bsi (yo )?no (estuviera|existiera|hubiera nacido|viviera)\b(?! (en|con|de|aqui (en|con)|tan|asi|\w+ando|\w+iendo)\b).{0,40}\b(estarian|estaria|serian|seria|vivirian|viviria) (\w+ ){0,2}(mejor|mas felices|mas feliz|mas tranquil[oa]s?|en paz)\b/,
  new RegExp(`\\bmejor (es )?que (yo )?me (muera|muriera|mate|desaparezca|vaya para siempre)\\b${NO_ES_RISA}`),
  new RegExp(`\\b(cansada|cansado|harta|harto|agotada|agotado|mamada|mamado|jarta|jarto|hastiada|hastiado) de (esta|mi) (vida|existencia)\\b${NO_ES_ETAPA}(?! (de|en|con|tan|aca|aqui|social|asi de)\\b)`),
  new RegExp(`\\b(mamada|mamado|jarta|jarto|hastiada|hastiado) de (vivir|existir|la vida|estar viva|estar vivo)\\b${NO_ES_VIVIR_CON}`),
  // Despedidas: "esto es un adiós", "les dejo esto por si no vuelvo a
  // escribir", "cuiden a mis hijos por mí", "fue un gusto conocerlas, hasta
  // nunca", "quiero que mis hijos sepan que no fue culpa de ellos", "ya les
  // escribí las cartas a mis hijos", "a mi mamá díganle que la perdono", "ya
  // me voy para siempre", y las de siempre seguidas de una coletilla sin
  // signo ("ya no me van a volver a ver hoy mismo", "mañana ya no voy a estar
  // para nadie otra vez", "esta es la última vez que hablo con ustedes no le
  // digan a nadie", "estoy a punto de hacer una locura otra vez"). No activan
  // "esto es un adiós a los carbohidratos", "cuiden a mis hijos por mí
  // mientras salgo", "ya les escribí las cartas de navidad a mis hijos", "ya
  // me voy para siempre de esta empresa", "no me van a volver a ver en ese
  // gimnasio", "no me van a volver a ver llorar" ni "esta es la última vez
  // que hablo con ustedes de ese tema".
  /\besto es (un|mi) adios\b(?! (a|al|de|del|para|temporal|por (ahora|un tiempo|unos dias|el momento)|hasta)\b)/,
  /\b(mi|esta es mi|esta es la|es mi) (forma|manera) de (decir )?(adios|despedirme)\b(?! (a|al|de|del|por (ahora|un tiempo|unos dias)|hasta)\b)/,
  /\bpor si (ya )?no (vuelvo|vuelva|regreso|regrese)( a (escribir|hablar|verlos|verlas|saber de ustedes|aparecer|conectarme|entrar))?\b(?! (a \w+ )?(hasta|en|por|antes|despues|el|la|los|las|este|esta|pronto|manana|temprano|de (nuevo|vacaciones|viaje)|a tiempo|rapido|con)\b| a (la|el|mi|casa|tiempo|clase|trabajar|estudiar)\b)/,
  /\bpor si no (despierto|despierte|amanezco|amanezca|sigo viva|sigo vivo|estoy viva|estoy vivo|vuelvo a despertar)\b(?! (a tiempo|temprano|con|de|antes|para|en)\b)/,
  /\bcuiden (mucho |bien |muy bien )?(a )?(mi|mis) (\w+ ){1,2}por mi\b(?! (mientras|el|la|los|las|este|esta|hoy (en|por|que|porque|mientras|hasta)|manana|un rato|unos dias|unas horas|hasta|en|esta|(porque|que) (tengo|voy|me toca|salgo|viajo|trabajo)|cuando (salga|viaje|vaya|me vaya de (viaje|paseo)|trabaje|este (trabajando|de viaje)))\b)/,
  /\bfue un (gusto|placer|honor) (conocerl[oa]s|conocerte|conocerla|conocerlo|conocerles|haberl[oa]s conocido|compartir con ustedes)\b.{0,30}\b(hasta nunca|para siempre|perdon(enme)?|los quiero|las quiero|las amo|los amo)\b|\b(hasta nunca|adios para siempre)\b.{0,30}\bfue un (gusto|placer|honor) (conocerl[oa]s|conocerte|conocerla|conocerlo|haberl[oa]s conocido)\b/,
  /\b(sepan|sepa|sepas|entiendan|entienda) que (esto |lo que (hice|voy a hacer|paso) )?no (fue|es|sera) (culpa (de (nadie|ellos|ellas|ustedes|ninguno|ninguna|el|ella)|suya|tuya)|su culpa|tu culpa)\b/,
  /\b(les|le) (escribi|deje|escribo|dejo|tengo escritas|deje escritas) (las |unas |mis )?cartas (de despedida )?(a|para) (mis|mi) (hijos|hijas|hijo|hija|familia|mama|papa|esposo|hermanos?|hermanas?|nietos?)\b/,
  /\bpara que (\w+ ){0,3}(lean|lea|encuentren|abran) (\w+ ){0,2}cuando (yo )?(ya )?no (este|exista|estuviera|viva)\b/,
  /\b(diganle|diganles|digale|digales) (a (mi|mis) (\w+ ){0,2})?que (la|lo|los|las|les|le) perdono\b|\ba (mi|mis) (\w+ ){0,2}(diganle|diganles|digale|digales|dile|diles) que (la|lo|los|las|les|le) (perdono|amo|quiero|adoro|extranare|voy a extranar)\b/,
  /\bme voy para siempre\b(?! (a|al|de|del|para|con|en)\b)/,
  /(?<!\b((en|por) (ese|esa|este|esta|el|la|esos|esas)( \w+)?|ahi|alla|aca|aqui) )\b(no|nunca( mas)?) me (van|vas|volveran|volveras|vuelven) a (volver a )?ver( (nunca|nunca mas|mas|jamas))?\b(?! (en|por|de|del|la|el|los|las|lo|un|una|aqui|alla|aca|ahi|hasta|con|sin|tan|asi|ni|triste|mal|debil|sola|gorda|flaca|fea|igual|\w+(ar|er|ir|ando|iendo|ada|ado|ida|ido)|(nunca|nunca mas|mas|jamas) (en|por|aqui|aca|asi|triste|igual|con|sin|de|del))\b)/,
  /\b(manana|pronto|esta noche|hoy|en unos dias) ya no (voy a estar|estare)( (aqui|mas|para nadie))?\b(?! (en|por|de|del|a|al|para|con|hasta|disponible|trabajando|conectada|pendiente|tan|temprano|ahi|alla|despues|antes|todo el|toda la|el|la|los|las|aqui (en|para|hasta|con|el|la)|mas (en|de|con|por|para))\b)/,
  /\b(esta es|es|sera) la ultima vez que (les |los |las )?(escribo|hablo|me leen|me ven|me van a (leer|ver)|publico|saben de mi) (aqui|aca|con ustedes|en este mundo)\b(?! (de|del|sobre|acerca|por|en|hasta|este|esta|ese|esa|tan|asi|para)\b)/,
  /\b(esta es|es|sera) la ultima vez que (les|los|las) (escribo|hablo)\b(?! (de|del|sobre|acerca|por|en|hasta|este|esta|ese|esa|tan|asi|para)\b)/,
  /\b(pensando en|pienso|voy a|quiero|ganas de|estoy a punto de|capaz de|me dan ganas de|tentada a|tentado a|a punto de) (hacer|cometer) (una )?(locura|estupidez|tonteria|barbaridad|burrada|loquera)\b(?! (con|en|de|del|como|para|por|y (me )?(compr|cort|pint|tatu|renunc|viaj|ten|largar|escap|gast|vend)\w*|comprando|gastando|cortandome|pintandome|tatuandome|renunciando|viajando|el pelo|la tarjeta|mi pelo|jaja\w*)\b)/,
  /\bno (veo|encuentro|tengo|le veo|le encuentro) (ninguna |otra )?salida que (hago|hacer|hare|voy a hacer|mas hacer)\b/,
]

// Cuántas cláusulas seguidas se leen también juntas: una pausa dentro de la
// frase ("no quiero... vivir, de verdad") no la parte.
const CLAUSULAS_JUNTAS = 3

// Las lecturas del texto: entero (los signos como espacios, para las frases
// que cruzan un signo: "me quiero... morir") y cada cláusula sola o con las
// que le siguen. En una cláusula sola, las excepciones solo ven esa cláusula:
// "no quiero vivir, de verdad" activa aunque "vivir de…" sea una excepción.
// Las cláusulas se cortan dos veces: por los signos, y además por los emojis,
// los dobles espacios y las coletillas ("no quiero vivir 😭 de verdad", "no
// quiero vivir de verdad"). Las dos lecturas se suman: cortar de más nunca
// quita una lectura que ya activaba.
// También devuelve el fondo: el texto entero y las cláusulas de cada corte
// unidas, separados por saltos de línea. Toda lectura es un pedazo del fondo.
function lecturas(content) {
  const entero = textoParaCrisis(content, false)
  const todas = new Set([entero])
  const fondo = [entero]
  const porSignos = textoParaCrisis(content)
  const amplia = textoParaCrisis(content, 'amplia')
  for (const texto of amplia === porSignos ? [porSignos] : [porSignos, amplia]) {
    const partes = texto.split(' | ').filter(Boolean)
    if (partes.length < 2) continue
    fondo.push(partes.join(' '))
    for (let i = 0; i < partes.length; i++) {
      for (let k = 1; k <= CLAUSULAS_JUNTAS && i + k <= partes.length; k++) todas.add(partes.slice(i, i + k).join(' '))
    }
  }
  return { textos: [...todas], fondo: fondo.join('\n') }
}

// Puertas. V8 compila cada regex la primera vez que la usa, y con casi 400
// patrones la primera consulta tardaba más de 100 ms en un texto largo. La
// puerta de un patrón son grupos de pedazos de texto sacados del mismo
// patrón, sin sus excepciones ((?! …) y (?<! …) no leen nada): de cada grupo
// al menos un pedazo tiene que estar en todo lo que el patrón activa.
// "\bme (quiero|quise) cortar\b(?!…)" exige "me quiero cortar" o "me quise
// cortar". Si al fondo del texto le falta un grupo entero, el patrón no puede
// activar y ni se prueba (ni se compila). Un patrón sin grupos que valgan la
// pena, o que el análisis no entiende, se prueba siempre.
const PUERTA_MAX = 32 // pedazos por grupo, a lo sumo
const PUERTA_LARGO = 4 // el pedazo más corto de un grupo, al menos
const PUERTA_GRUPOS = 3 // grupos por puerta, a lo sumo
const LEE_VACIO = Object.freeze({ ex: [''], req: null })
const LEE_ALGO = Object.freeze({ ex: null, req: null })
function cortoDe(grupo) { let q = Infinity; for (const s of grupo) if (s.length < q) q = s.length; return q }
// El grupo más útil: el de pedazos más largos y, si empatan, el de menos.
function mejorGrupo(a, b) {
  if (!a) return b
  if (!b) return a
  const qa = cortoDe(a), qb = cortoDe(b)
  return qa > qb || (qa === qb && a.length <= b.length) ? a : b
}
const comoGrupo = (ex) => (ex && ex.length <= PUERTA_MAX && !ex.includes('') ? ex : null)
function seguidos(a, b) {
  if (a.length === 1 && b.length === 1) return [a[0] + b[0]]
  if (a.length * b.length > PUERTA_MAX) return null
  const c = []
  for (const x of a) for (const y of b) c.push(x + y)
  return c
}
// Lee la fuente de la regex (sin banderas, sin referencias atrás) y devuelve
// por cada pedazo { ex, req, todas }: ex, los textos exactos que puede leer
// (pocos; '' si puede no leer nada); req, un grupo del que siempre lee al menos
// un pedazo; todas, más grupos así, todos obligatorios a la vez.
function puertaDe(re) {
  const src = re.source
  let i = 0
  // Lo de adentro de una excepción no se lee: se salta hasta su paréntesis.
  function saltar() {
    let d = 0
    while (i < src.length) {
      const c = src[i]
      if (c === '\\') { i += 2; continue }
      if (c === '[') {
        i++
        if (src[i] === '^') i++
        if (src[i] === ']') i++
        while (i < src.length && src[i] !== ']') i += src[i] === '\\' ? 2 : 1
        i++
        continue
      }
      if (c === '(') d++
      else if (c === ')') { if (d === 0) return; d-- }
      i++
    }
  }
  function atomo() {
    const c = src[i]
    if (c === '(') {
      let aserto = false
      if (src[i + 1] === '?') {
        if (src[i + 2] === '=' || src[i + 2] === '!') { aserto = true; i += 3 } else if (src[i + 2] === '<') { aserto = true; i += 4 } else i += 3
      } else i++
      const dentro = aserto ? (saltar(), LEE_VACIO) : alternancia()
      if (src[i] !== ')') throw new Error('puerta: falta )')
      i++
      return dentro
    }
    if (c === '[') {
      let j = i + 1
      let simple = true
      if (src[j] === '^') { simple = false; j++ }
      const letras = []
      if (src[j] === ']') { letras.push(']'); j++ }
      while (src[j] !== ']') {
        if (j >= src.length) throw new Error('puerta: falta ]')
        if (src[j] === '\\') { simple = false; j += 2; continue }
        if (src[j + 1] === '-' && src[j + 2] !== ']') { simple = false; j += 3; continue }
        letras.push(src[j]); j++
      }
      i = j + 1
      return simple && letras.length <= 10 ? { ex: letras, req: null } : LEE_ALGO
    }
    if (c === '\\') {
      const d = src[i + 1]
      i += 2
      if (d === 'b' || d === 'B') return LEE_VACIO
      if (/[a-zA-Z0-9]/.test(d)) return LEE_ALGO
      return { ex: [d], req: null }
    }
    i++
    if (c === '.') return LEE_ALGO
    if (c === '^' || c === '$') return LEE_VACIO
    return { ex: [c], req: null }
  }
  function cuantificado() {
    const a = atomo()
    let min = 1, max = 1
    const q = src[i]
    if (q === '?') { min = 0; i++ } else if (q === '*') { min = 0; max = Infinity; i++ } else if (q === '+') { max = Infinity; i++ } else if (q === '{') {
      const m = /^\{(\d+)(,(\d*))?\}/.exec(src.slice(i, i + 12))
      if (m) { min = +m[1]; max = m[2] ? (m[3] === '' ? Infinity : +m[3]) : min; i += m[0].length }
    }
    if (q && '?*+{'.includes(q) && src[i] === '?') i++
    if (min === 1 && max === 1) return a
    if (min === 0) return { ex: max === 1 && a.ex && a.ex.length < PUERTA_MAX ? [...a.ex, ''] : null, req: null }
    return { ex: null, req: mejorGrupo(a.req, comoGrupo(a.ex)), todas: a.todas }
  }
  function secuencia() {
    let corrida = [''], exacta = true, req = null
    const todas = []
    const anota = (g) => { if (g) { todas.push(g); req = mejorGrupo(req, g) } }
    while (i < src.length && src[i] !== '|' && src[i] !== ')') {
      const a = cuantificado()
      if (a.ex) {
        const c = seguidos(corrida, a.ex)
        if (c) corrida = c
        else { anota(comoGrupo(corrida)); corrida = a.ex; exacta = false }
      } else {
        anota(comoGrupo(corrida)); anota(a.req)
        if (a.todas) for (const g of a.todas) anota(g)
        corrida = ['']; exacta = false
      }
    }
    anota(comoGrupo(corrida))
    return { ex: exacta ? corrida : null, req, todas }
  }
  function alternancia() {
    const primera = secuencia()
    if (src[i] !== '|') return primera
    const ramas = [primera]
    while (src[i] === '|') { i++; ramas.push(secuencia()) }
    let ex = []
    for (const r of ramas) { if (!r.ex || ex.length + r.ex.length > PUERTA_MAX) { ex = null; break } ex.push(...r.ex) }
    let req = []
    for (const r of ramas) {
      const g = mejorGrupo(r.req, comoGrupo(r.ex))
      if (!g || req.length + g.length > PUERTA_MAX) { req = null; break }
      req.push(...g)
    }
    return { ex, req: mejorGrupo(req, comoGrupo(ex)) }
  }
  try {
    if (re.flags) return null
    const r = alternancia()
    if (i !== src.length) return null
    const candidatos = [...(r.todas || [])]
    const final = mejorGrupo(r.req, comoGrupo(r.ex))
    if (final) candidatos.push(final)
    const puerta = []
    const vistos = new Set()
    for (const g of candidatos.filter((g) => g.length <= PUERTA_MAX && cortoDe(g) >= PUERTA_LARGO).sort((a, b) => a.length - b.length || cortoDe(b) - cortoDe(a))) {
      // Basta el pedazo más corto: si "me pega" está, "me pegaron" sobra.
      const unico = [...new Set(g)].filter((x, _, todo) => !todo.some((o) => o !== x && x.includes(o)))
      const clave = unico.join('|')
      if (!vistos.has(clave)) { vistos.add(clave); puerta.push(unico) }
      if (puerta.length === PUERTA_GRUPOS) break
    }
    return puerta.length ? puerta : null
  } catch {
    return null
  }
}
// Se calculan la primera vez que se consulta (no al cargar la app).
let PUERTAS = null

// Dónde empieza en el fondo cada grupo de cuatro letras: un pedazo de puerta
// (siempre de cuatro o más) se busca solo donde el fondo empieza igual que
// él, y no en todo el texto. En un texto largo hay miles de pedazos que
// buscar.
function indiceDe(fondo) {
  const indice = new Map()
  for (let k = 0; k + PUERTA_LARGO <= fondo.length; k++) {
    const q = fondo.slice(k, k + PUERTA_LARGO)
    const pos = indice.get(q)
    if (pos) pos.push(k)
    else indice.set(q, [k])
  }
  return indice
}

export function isCrisis(content) {
  if (!PUERTAS) PUERTAS = CRISIS_PATTERNS.map(puertaDe)
  const { textos, fondo } = lecturas(content)
  const indice = indiceDe(fondo)
  const visto = new Map()
  const esta = (s) => {
    let v = visto.get(s)
    if (v === undefined) {
      const pos = indice.get(s.slice(0, PUERTA_LARGO))
      v = !!pos && pos.some((k) => fondo.startsWith(s, k))
      visto.set(s, v)
    }
    return v
  }
  return CRISIS_PATTERNS.some((re, n) => (!PUERTAS[n] || PUERTAS[n].every((grupo) => grupo.some(esta))) && textos.some((t) => re.test(t)))
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
