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

export const SALAS = [
  { id: 'salon', label: 'Salón', desc: 'Ideas y libros' },
  { id: 'mesa', label: 'Mesa', desc: 'Catas, cocina y sobremesa' },
  { id: 'taller', label: 'Taller', desc: 'Crear con las manos' },
  { id: 'movimiento', label: 'Movimiento', desc: 'Caminar, bailar, entrenar' },
  { id: 'acompanamiento', label: 'Acompañamiento', desc: 'Profesionales verificadas' },
]

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

export const TEMPORADA = {
  mes: 'Octubre',
  nombre: 'Las que llegaron',
  texto: 'Este mes la curaduría mira a las mujeres que acaban de llegar a la ciudad.',
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
    titulo: 'Círculo de conversación con psicóloga verificada', cuando: 'Martes, 6:30 p. m.', anfitriona: 'Psicóloga verificada por Ronda',
    acceso: 'solo-mujeres', verificacion: 2, cupos: 8,
    cedula: {
      porque: 'Un espacio cuidado y guiado por una profesional verificada.',
      paraQuien: 'Para la que está atravesando un cambio y quiere compañía con criterio.',
      comoLlegas: 'Ocho cupos. La profesional te escribe antes para saludarte.',
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
