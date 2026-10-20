/* ── Curaduría de Ronda ──
   Ronda no organiza eventos ni tiene sedes: elige. Este archivo define
   las salas (tipos de plan), las colecciones (momentos de vida), las
   ciudades y la temporada del mes.

   Los planes reales vienen de Supabase (tabla `planes`, ver
   src/sql/curaduria.sql). Mientras la curadora no haya publicado planes
   en una ciudad, la vista muestra PLANES_EJEMPLO y los marca como
   "Ejemplo" en la interfaz. Son ficticios: no nombran negocios reales. */

export const CIUDADES = [
  { id: 'cartagena', label: 'Cartagena' },
  { id: 'bogota', label: 'Bogotá' },
]

/* La ciudad elegida en Afuera se recuerda en este dispositivo (rondas-12).
   Un valor que no está en CIUDADES (viejo o dañado) cae en Cartagena. */
export const CIUDAD_KEY = 'ronda_ciudad'
export const CIUDAD_POR_DEFECTO = 'cartagena'
export const ciudadValida = (c) => (CIUDADES.some(x => x.id === c) ? c : CIUDAD_POR_DEFECTO)

export const SALAS = [
  { id: 'salon', label: 'Salón', desc: 'Ideas y libros' },
  { id: 'mesa', label: 'Mesa', desc: 'Catas, cocina y sobremesa' },
  { id: 'taller', label: 'Taller', desc: 'Crear con las manos' },
  { id: 'movimiento', label: 'Movimiento', desc: 'Caminar, bailar, entrenar' },
  { id: 'ciudad', label: 'Ciudad', desc: 'Galerías, aperturas y recorridos' },
  { id: 'acompanamiento', label: 'Acompañamiento', desc: 'Profesionales verificadas' },
]

/* Modalidad del plan: en persona o en línea (por voz, en grupo pequeño). */
export const MODALIDAD = {
  presencial: 'En persona',
  'en-linea': 'En línea',
}

export const COLECCIONES = [
  { id: 'recien-llegada', label: 'Recién llegada', desc: 'Para la que todavía no tiene a quién escribirle el viernes.' },
  { id: 'sesenta', label: 'Sesenta y estreno', desc: 'Planes de día, cerca de casa, con conversación de verdad.' },
  { id: 'sin-hablar', label: 'Para cuando no quiero hablar', desc: 'Lectura en silencio, caminatas y talleres.' },
  { id: 'voz-alta', label: 'Para pensar en voz alta', desc: 'Salones y tertulias.' },
]

export const ACCESO = {
  'solo-mujeres': 'Solo mujeres',
  mixto: 'Mixto',
}

/* La temporada vale entre `desde` y `hasta` (fechas locales, ambas
   incluidas). El mes del telón sale de `desde`. Cuando vence, el telón de
   Afuera vuelve a su texto general y Adentro deja de mostrar el libro hasta
   que la curadora publique la temporada siguiente aquí (rondas-22). */
export const TEMPORADA = {
  desde: '2026-10-01',
  hasta: '2026-10-31',
  nombre: 'Las que llegaron',
  texto: 'Este mes la curaduría mira a las mujeres que acaban de llegar a la ciudad.',
  /* "Para llevar": lo que se vive adentro durante la semana y se
     conversa afuera. Ejemplo hasta que la curadora elija el real.
     `donde` va por ciudad: cada una tiene su propio Salón. */
  libro: {
    titulo: 'Una habitación propia',
    autora: 'Virginia Woolf',
    donde: {
      cartagena: 'Se conversa en el Salón del miércoles',
      bogota: 'Se conversa en la Tertulia de ensayo del martes',
    },
    ejemplo: true,
  },
}

const claveDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/* ¿La temporada está vigente hoy? */
export function temporadaVigente(hoy = new Date()) {
  const k = claveDia(hoy)
  return k >= TEMPORADA.desde && k <= TEMPORADA.hasta
}

/* 'Octubre': el mes en que empieza la temporada, en español. */
export function mesTemporada() {
  const [anio, mes] = TEMPORADA.desde.split('-').map(Number)
  const nombre = new Date(anio, mes - 1, 1).toLocaleDateString('es-CO', { month: 'long' })
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

export const PLANES_EJEMPLO = [
  {
    id: 'ej-ctg-1', ciudad: 'cartagena', barrio: 'Getsemaní', sala: 'taller',
    colecciones: ['recien-llegada', 'sin-hablar'],
    titulo: 'Taller de cerámica', cuando: 'Jueves, 6:00 p. m.', anfitriona: 'Lucía',
    acceso: 'solo-mujeres', verificacion: 2, cupos: 8,
    cedula: {
      porque: 'Lucía enseña con paciencia y nadie se conoce al llegar.',
      paraQuien: 'Para la que quiere hacer algo con las manos y hablar solo si le provoca.',
      comoLlegas: 'Lucía te recibe en la puerta. Se trabaja en mesas de cuatro.',
    },
  },
  {
    id: 'ej-ctg-2', ciudad: 'cartagena', barrio: 'Manga', sala: 'mesa',
    colecciones: ['recien-llegada', 'voz-alta'],
    titulo: 'Cata de vinos para seis', cuando: 'Jueves, 7:00 p. m.', anfitriona: 'Carolina',
    acceso: 'mixto', verificacion: 2, cupos: 6,
    cedula: {
      porque: 'Seis puestos, una sommelier que explica sin pose y una sobremesa larga.',
      paraQuien: 'Para la que quiere conocer gente sin entrar a un salón lleno.',
      comoLlegas: 'Carolina te llama por tu nombre y te sienta en una mesa de cuatro.',
    },
  },
  {
    id: 'ej-ctg-3', ciudad: 'cartagena', barrio: 'Bocagrande', sala: 'salon',
    colecciones: ['sesenta', 'voz-alta'],
    titulo: 'Salón literario de la mañana', cuando: 'Miércoles, 10:00 a. m.', anfitriona: 'Marta',
    acceso: 'solo-mujeres', verificacion: 1, cupos: 12,
    cedula: {
      porque: 'Un libro al mes y una conversación sin prisa.',
      paraQuien: 'Para la que se jubiló y quiere volver a pensar en voz alta.',
      comoLlegas: 'Puedes llegar con el libro leído o sin leer. La primera vez puedes solo escuchar.',
    },
  },
  {
    id: 'ej-ctg-4', ciudad: 'cartagena', barrio: 'Centro', sala: 'movimiento',
    colecciones: ['recien-llegada', 'sin-hablar'],
    titulo: 'Caminata al amanecer por la muralla', cuando: 'Sábado, 6:00 a. m.', anfitriona: 'Andrea',
    acceso: 'solo-mujeres', verificacion: 1, cupos: 15,
    cedula: {
      porque: 'Una hora caminando al ritmo de la más lenta, con el mar al lado.',
      paraQuien: 'Para la que todavía no conoce la ciudad y quiere verla con otras.',
      comoLlegas: 'El grupo sale junto y vuelve junto. Nadie camina sola.',
    },
  },
  {
    id: 'ej-ctg-5', ciudad: 'cartagena', barrio: 'Manga', sala: 'acompanamiento',
    colecciones: ['recien-llegada'],
    titulo: 'Círculo de conversación con psicóloga verificada', cuando: 'Martes, 6:30 p. m.', anfitriona: 'psicóloga verificada por Ronda',
    acceso: 'solo-mujeres', verificacion: 2, cupos: 8,
    cedula: {
      porque: 'Un espacio cuidado y guiado por una profesional verificada.',
      paraQuien: 'Para la que está atravesando un cambio y quiere compañía con criterio.',
      comoLlegas: 'Ocho cupos. La profesional te escribe antes para saludarte.',
    },
  },
  {
    id: 'ej-ctg-6', ciudad: 'cartagena', barrio: 'En línea', sala: 'salon', modalidad: 'en-linea',
    colecciones: ['voz-alta', 'sin-hablar'],
    titulo: 'Club de lectura por voz', cuando: 'Domingo, 5:00 p. m.', anfitriona: 'Isabel',
    acceso: 'solo-mujeres', verificacion: 1, cupos: 8,
    cedula: {
      porque: 'Ocho voces, un libro y una hora de conversación por audio.',
      paraQuien: 'Para la que prefiere conversar desde su casa.',
      comoLlegas: 'Te llega el enlace el día antes. Puedes entrar y solo escuchar.',
    },
  },
  {
    id: 'ej-bog-1', ciudad: 'bogota', barrio: 'Chapinero', sala: 'salon',
    colecciones: ['voz-alta', 'recien-llegada'],
    titulo: 'Tertulia de ensayo', cuando: 'Martes, 7:00 p. m.', anfitriona: 'Juliana',
    acceso: 'mixto', verificacion: 2, cupos: 14,
    cedula: {
      porque: 'Un texto corto, una pregunta grande y gente que escucha de verdad.',
      paraQuien: 'Para la que extraña conversar de ideas fuera del trabajo.',
      comoLlegas: 'Juliana abre con una pregunta para todas. Nadie tiene que hablar primero.',
    },
  },
  {
    id: 'ej-bog-2', ciudad: 'bogota', barrio: 'Usaquén', sala: 'taller',
    colecciones: ['sesenta', 'sin-hablar'],
    titulo: 'Acuarela de sábado', cuando: 'Sábado, 10:00 a. m.', anfitriona: 'Elena',
    acceso: 'mixto', verificacion: 1, cupos: 10,
    cedula: {
      porque: 'Materiales listos, música suave y cero exigencia de saber pintar.',
      paraQuien: 'Para la que quiere crear algo bonito sin que nadie la evalúe.',
      comoLlegas: 'Elena te asigna un puesto al lado de alguien que ya vino antes.',
    },
  },
  {
    id: 'ej-bog-3', ciudad: 'bogota', barrio: 'Teusaquillo', sala: 'movimiento',
    colecciones: ['recien-llegada'],
    titulo: 'Baile para principiantes', cuando: 'Jueves, 6:30 p. m.', anfitriona: 'Paula',
    acceso: 'solo-mujeres', verificacion: 2, cupos: 16,
    cedula: {
      porque: 'Moverse al mismo ritmo junta a la gente más rápido que cualquier presentación.',
      paraQuien: 'Para la que llegó a Bogotá y quiere reírse con otras desde la primera clase.',
      comoLlegas: 'Paula repite cada paso las veces que haga falta.',
    },
  },
]
