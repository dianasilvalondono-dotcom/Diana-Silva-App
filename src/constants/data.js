/* ── Dimension config ── */
export const DIMS = {
  espiritual: { icon: 'espiritual', color: '#C4908A', label: 'Espiritual' },
  emocional:  { icon: 'emocional',  color: '#C9A96E', label: 'Emocional' },
  fisico:     { icon: 'fisico',     color: '#A68B52', label: 'Físico' },
  mental:     { icon: 'mental',     color: '#A6716B', label: 'Mental' },
}

/* ── Default habits ── */
export const DEFAULT_HABITS = [
  { id: 1,  name: 'Oración y gratitud — evangelio y meditaciones', dim: 'espiritual' },
  { id: 2,  name: 'Meditación mañana',                            dim: 'espiritual' },
  { id: 3,  name: 'Meditación de noche',                          dim: 'espiritual' },
  { id: 4,  name: 'Lectura noche',                                dim: 'espiritual' },
  { id: 5,  name: 'Respira y Pausa Activa',                       dim: 'emocional' },
  { id: 6,  name: 'Respira Profundo — Estoy a salvo',             dim: 'emocional' },
  { id: 7,  name: 'Journaling / Reflexión del día',               dim: 'emocional' },
  { id: 8,  name: 'Gym',                                          dim: 'fisico' },
  { id: 9,  name: 'Caldo + Paseo',                                dim: 'fisico' },
  { id: 10, name: 'Proteína + Creatina',                          dim: 'fisico' },
  { id: 11, name: 'Ajedrez',                                      dim: 'mental' },
  { id: 12, name: 'Momento Mori — Take nothing personally',       dim: 'mental' },
]

/* ── Default routines (sugerencias para nuevas usuarias — editables) ── */
export const DEFAULT_MORNING = [
  { id: 1, time: '7:00', task: 'Intención del día', emoji: '🙏' },
  { id: 2, time: '7:15', task: 'Paseo o movimiento suave', emoji: '🚶‍♀️' },
  { id: 3, time: '7:30', task: 'Meditación o respiración', emoji: '🧘' },
  { id: 4, time: '8:00', task: 'Ejercicio', emoji: '💪' },
]
export const DEFAULT_MIDDAY = [
  { id: 20, time: '11:00', task: 'Pausa activa — respira profundo', emoji: '🌬️' },
  { id: 21, time: '14:00', task: 'Momento de gratitud', emoji: '💛' },
  { id: 22, time: '16:00', task: 'Estiramiento o caminata corta', emoji: '🧘‍♀️' },
]
export const DEFAULT_NIGHT = [
  { id: 7,  time: '19:00', task: 'Lectura', emoji: '📖' },
  { id: 8,  time: '20:00', task: 'Reflexión del día', emoji: '✨' },
  { id: 9,  time: '21:00', task: 'Soltar el día y descansar', emoji: '🌙' },
]

/* ── Quotes collection ── */
export const QUOTES = [
  { text: 'Libero todo el dolor de mi pasado y doy la bienvenida a la salud, la alegría, el amor y el éxito que me corresponden.', author: 'Diana', cat: 'sanacion' },
  { text: 'Respira y Pausa Activa — No tengo que decidir nada ahora. Estoy a salvo.', author: 'Diana', cat: 'serenidad' },
  { text: 'El control fue mi intento de no perder; Soltar y rendirme a Dios es mi forma de no PERDERME A MI.', author: 'Diana', cat: 'espiritual' },
  { text: 'Hoy hice lo mejor que pude con las herramientas que tengo. Me perdono y descanso en Dios.', author: 'Diana', cat: 'sanacion' },
  { text: 'Diana, take nothing personally today. Time is ticking. You only have today. Momento Mori.', author: 'Diana', cat: 'motivacional' },
  { text: 'Dios concédeme serenidad para aceptar todo aquello que no puedo cambiar, valor para cambiar lo que soy capaz de cambiar y sabiduría para entender la diferencia.', author: 'Oración de Serenidad', cat: 'espiritual' },
  { text: 'Respira Profundo Diana — No tengo que decidir nada ahora. Estoy a salvo.', author: 'Diana', cat: 'serenidad' },
  { text: 'Dios mi vida se volvió inmanejable y no tengo poder sobre mi, ni sobre otros. Tú eres el poder y la sanidad.', author: 'Diana', cat: 'espiritual' },
  { text: 'You can be kind and lovely and still tell people to fuck off.', author: 'Diana', cat: 'motivacional' },
  { text: 'Diana, te perdono por haberte dado el valor en la elección de otros. Te perdono por haber confundido poder con amor y atención con seguridad. Hoy te elijo yo.', author: 'Diana', cat: 'sanacion' },
  { text: 'Everybody is going through something. Be kind.', author: 'Diana', cat: 'sabiduria' },
  { text: 'God, I give to You all that I am and all that I will be for Your healing and direction.', author: 'Diana', cat: 'espiritual' },
  { text: 'Quiero a quien me quiera y dejo ir lo que tiene que irse.', author: 'Marta Botero', cat: 'serenidad' },
  { text: 'La paz viene de adentro. No la busques afuera.', author: 'Buda', cat: 'sabiduria' },
  { text: 'Cada mañana nacemos de nuevo. Lo que hacemos hoy es lo que más importa.', author: 'Buda', cat: 'espiritual' },
  { text: 'La felicidad no es algo hecho. Viene de tus propias acciones.', author: 'Dalai Lama', cat: 'sabiduria' },
  { text: 'La disciplina es el puente entre metas y logros.', author: 'Jim Rohn', cat: 'motivacional' },
  { text: 'La oración no cambia a Dios, pero cambia a quien ora.', author: 'Søren Kierkegaard', cat: 'espiritual' },
  { text: 'El agua no lucha. Fluye. Y al fluir, es poderosa.', author: 'Lao Tzu', cat: 'sabiduria' },
  { text: 'Eres más fuerte de lo que crees y más valiente de lo que imaginas.', author: 'A.A. Milne', cat: 'motivacional' },
]

export function getDayQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}

/* ── Toolkit categories ── */
export const TOOLKIT_CATS = [
  { id: 'podcast',    emoji: '🎙️', label: 'Podcasts',      color: '#C4908A' },
  { id: 'libro',      emoji: '📚', label: 'Libros',        color: '#C9A96E' },
  { id: 'curso',      emoji: '🎓', label: 'Cursos',        color: '#A6716B' },
  { id: 'tedtalk',    emoji: '🎤', label: 'Ted Talks',     color: '#A68B52' },
  { id: 'musica',     emoji: '🎵', label: 'Música',        color: '#C4908A' },
  { id: 'masterclass',emoji: '🏆', label: 'Masterclasses', color: '#C9A96E' },
  { id: 'wellness',   emoji: '🧘', label: 'Wellness',      color: '#A6716B' },
  { id: 'otro',       emoji: '🔗', label: 'Otros',         color: '#B5A099' },
]

/* ── Mood-based recommendations ── */
export const MOOD_RECS = {
  0: {
    label: 'Te abrazo desde aquí', color: '#C4908A',
    items: [
      { type: 'podcast', title: 'Mel Robbins — "How to Stop Feeling So Overwhelmed"', url: 'https://open.spotify.com/show/5bGsRbA3MXzP8FpbEuFJRa', emoji: '🎙️' },
      { type: 'podcast', title: 'Jay Shetty — "How to Heal a Broken Heart"', url: 'https://open.spotify.com/show/5EqqB52m2bsr4k1Ii7sStc', emoji: '🎙️' },
      { type: 'musica', title: '🎵 "Rise Up" — Andra Day', url: 'https://open.spotify.com/track/0tBbt8CrmxbjRP0pueQkyU', emoji: '🎵' },
      { type: 'musica', title: '🎵 "Fight Song" — Rachel Platten', url: 'https://open.spotify.com/track/7o2CTH4ctstm8TNelqjb51', emoji: '🎵' },
      { type: 'habito', title: 'Respira 4-7-8: Inhala 4s, sostén 7s, exhala 8s', emoji: '🫁' },
      { type: 'habito', title: 'Escribe 3 cosas por las que estás agradecida', emoji: '📝' },
      { type: 'habito', title: 'Sal a caminar 5 minutos — solo respira', emoji: '🚶‍♀️' },
    ],
    programa: 'tusa',
  },
  1: {
    label: 'Un empujoncito de energía', color: '#C9A96E',
    items: [
      { type: 'podcast', title: 'Mel Robbins — "The 5 Second Rule"', url: 'https://open.spotify.com/show/5bGsRbA3MXzP8FpbEuFJRa', emoji: '🎙️' },
      { type: 'podcast', title: 'Brené Brown — "Unlocking Us"', url: 'https://open.spotify.com/show/4P86ZzHf7EOlRG7do9jkXm', emoji: '🎙️' },
      { type: 'musica', title: '🎵 "Happy" — Pharrell Williams', url: 'https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCH', emoji: '🎵' },
      { type: 'habito', title: '1 minuto de baile — pon tu canción favorita', emoji: '💃' },
      { type: 'habito', title: 'Haz una lista de 3 cosas que sí puedes controlar hoy', emoji: '📋' },
    ],
  },
  2: {
    label: 'Mantén esa energía', color: '#A6716B',
    items: [
      { type: 'podcast', title: 'Jay Shetty — "On Purpose: Finding Your Passion"', url: 'https://open.spotify.com/show/5EqqB52m2bsr4k1Ii7sStc', emoji: '🎙️' },
      { type: 'podcast', title: 'TED Talks Daily — "The Power of Vulnerability"', url: 'https://open.spotify.com/show/1VXcH8QHkjRcTCEd88U3ti', emoji: '🎤' },
      { type: 'musica', title: '🎵 "Don\'t Stop Me Now" — Queen', url: 'https://open.spotify.com/track/5T8EDUDqKcs6OSOwEsfqG7', emoji: '🎵' },
      { type: 'habito', title: 'Medita 5 minutos — enfócate en tu respiración', emoji: '🧘' },
      { type: 'habito', title: 'Escríbele a alguien que quieres y dile que la amas', emoji: '💌' },
    ],
  },
  3: {
    label: 'Aprovecha tu buena vibra', color: '#7BA56E',
    items: [
      { type: 'podcast', title: 'Lewis Howes — "The School of Greatness"', url: 'https://open.spotify.com/show/07GQhOZboEZOE1ysnFLipT', emoji: '🎙️' },
      { type: 'libro', title: '📚 "Atomic Habits" — James Clear', url: 'https://www.amazon.com/Atomic-Habits-James-Clear/dp/0735211299', emoji: '📚' },
      { type: 'musica', title: '🎵 "Walking on Sunshine" — Katrina & The Waves', url: 'https://open.spotify.com/track/05wIrZSwuaVWhcv5FfqeH0', emoji: '🎵' },
      { type: 'habito', title: 'Haz journaling de gratitud — 5 cosas increíbles de hoy', emoji: '✨' },
      { type: 'habito', title: 'Planifica algo lindo para mañana', emoji: '🗓️' },
    ],
  },
  4: {
    label: '¡Estás brillando!', color: '#C9A96E',
    items: [
      { type: 'podcast', title: 'Tony Robbins — "Unleash the Power Within"', url: 'https://open.spotify.com/show/6fZXOzfGDmPzIEMl8qzmmq', emoji: '🎙️' },
      { type: 'tedtalk', title: '🎤 "Your Body Language Shapes Who You Are" — Amy Cuddy', url: 'https://www.ted.com/talks/amy_cuddy_your_body_language_may_shape_who_you_are', emoji: '🎤' },
      { type: 'musica', title: '🎵 "Run the World (Girls)" — Beyoncé', url: 'https://open.spotify.com/track/0MBr7DLYRJtAcefJBkhEtd', emoji: '🎵' },
      { type: 'habito', title: 'Reto: haz algo que te dé miedo hoy — crece', emoji: '🦋' },
      { type: 'habito', title: 'Comparte tu energía — ayuda a alguien hoy', emoji: '🫶' },
    ],
  },
}

/* ── Programas paso a paso ── */
export const PROGRAMAS = [
  {
    id: 'tusa', title: 'Salir de una tusa', emoji: '💔→🦋',
    desc: 'Un camino de 7 días para sanar tu corazón, un minuto a la vez', color: '#C4908A',
    days: [
      { day: 1, title: 'Acepta lo que sientes', task: 'Escribe lo que sientes sin filtro. Solo 1 minuto. No lo juzgues.', emoji: '📝' },
      { day: 2, title: 'Llora si necesitas', task: 'Pon una canción que te haga sentir y déjate llorar. El llanto sana.', emoji: '🎵' },
      { day: 3, title: 'Corta el contacto', task: 'Silencia o elimina sus redes. 1 minuto que cambia todo. Tú primero.', emoji: '📵' },
      { day: 4, title: 'Mueve tu cuerpo', task: 'Camina 10 minutos. El movimiento cambia la química de tu cerebro.', emoji: '🚶‍♀️' },
      { day: 5, title: 'Reconéctate contigo', task: 'Escribe 5 cosas que amas de ti. Lee esto cada mañana.', emoji: '💛' },
      { day: 6, title: 'Haz algo nuevo', task: 'Cocina algo nuevo, toma otra ruta, escucha música diferente. Rompe patrones.', emoji: '🌱' },
      { day: 7, title: 'Carta de perdón', task: 'Escríbele una carta (no la envíes). Perdona y suelta. Eres libre.', emoji: '🕊️' },
    ],
  },
  {
    id: 'depresion', title: 'Navegar la depresión', emoji: '🌊→🏄‍♀️',
    desc: 'La vida es como olas del mar. 7 días para aprender a surfearlas, no a hundirte en ellas.', color: '#A6716B',
    days: [
      { day: 1, title: 'Levántate y abre una ventana', task: '1 minuto de luz solar. La luz activa tu serotonina.', emoji: '☀️' },
      { day: 2, title: 'Ducha de agua fría (30 seg)', task: 'Solo 30 segundos al final de tu ducha. Activa tu sistema nervioso.', emoji: '🚿' },
      { day: 3, title: '3 cosas de gratitud', task: 'Escribe 3 cosas por mínimas que sean. "Estoy viva" cuenta.', emoji: '📝' },
      { day: 4, title: 'Llama a alguien', task: '1 minuto. Llama a alguien que te quiere. La conexión humana sana.', emoji: '📞' },
      { day: 5, title: 'Cocina algo simple', task: 'Un huevo, una fruta. Nutrir tu cuerpo es nutrir tu mente.', emoji: '🍳' },
      { day: 6, title: 'Sal de tu casa', task: 'Aunque sea a la puerta. 5 minutos afuera. El aire fresco cambia todo.', emoji: '🌿' },
      { day: 7, title: 'Escríbete a ti misma', task: 'Escríbete una carta de amor. "Querida yo, estoy orgullosa de ti porque..."', emoji: '💌' },
    ],
  },
  {
    id: 'ansiedad', title: 'Calmar la ansiedad', emoji: '😰→🧘',
    desc: '7 días para recuperar la calma, paso a paso', color: '#C9A96E',
    days: [
      { day: 1, title: 'Respiración 4-7-8', task: 'Inhala 4s, sostén 7s, exhala 8s. Repite 3 veces. Tu sistema nervioso se calma.', emoji: '🫁' },
      { day: 2, title: 'Grounding: 5-4-3-2-1', task: '5 cosas que ves, 4 que tocas, 3 que oyes, 2 que hueles, 1 que saboreas.', emoji: '🌍' },
      { day: 3, title: 'Escribe tus miedos', task: 'Ponlos en papel. Al verlos escritos, pierden poder sobre ti.', emoji: '📝' },
      { day: 4, title: 'Meditación guiada', task: '5 minutos. Pon una meditación guiada y solo escucha.', emoji: '🧘' },
      { day: 5, title: 'Desconexión digital', task: '1 hora sin celular. Lee, dibuja, respira. Tu mente necesita silencio.', emoji: '📵' },
      { day: 6, title: 'Yoga suave', task: '10 minutos de estiramientos suaves. Tu cuerpo guarda la ansiedad.', emoji: '🧘‍♀️' },
      { day: 7, title: 'Carta a tu ansiedad', task: '"Querida ansiedad, te escucho pero ya no te obedezco." Escríbela.', emoji: '✉️' },
    ],
  },
  {
    id: 'empezar', title: 'Empezar de cero', emoji: '🌱→🌳',
    desc: '7 días para reinventarte y construir la vida que quieres', color: '#7BA56E',
    days: [
      { day: 1, title: 'Define tu "por qué"', task: '¿Por qué quieres cambiar? Escríbelo en 1 frase. Eso es tu motor.', emoji: '🎯' },
      { day: 2, title: 'Limpia un espacio', task: 'Tu escritorio, tu mesa, un cajón. Espacio limpio = mente clara.', emoji: '🧹' },
      { day: 3, title: '1 hábito nuevo, 1 minuto', task: 'Escoge 1 hábito y hazlo solo 1 minuto. Mañana serán 2.', emoji: '⏱️' },
      { day: 4, title: 'Elimina 1 distracción', task: 'Borra una app, silencia un grupo, di no a un compromiso.', emoji: '✂️' },
      { day: 5, title: 'Aprende algo nuevo', task: '10 minutos de un podcast, un TED Talk, un artículo. Alimenta tu mente.', emoji: '📚' },
      { day: 6, title: 'Haz algo que te dé miedo', task: 'Ese mensaje, esa llamada, esa decisión. Hazlo hoy. El miedo es la señal.', emoji: '🦋' },
      { day: 7, title: 'Escribe tu visión', task: '¿Cómo es tu vida ideal en 1 año? Descríbela con detalle. Ya empezaste.', emoji: '✨' },
    ],
  },
  {
    id: 'autoestima', title: 'Reconstruir mi autoestima', emoji: '🪞→👑',
    desc: '7 días para recordar quién eres y cuánto vales', color: '#C4908A',
    days: [
      { day: 1, title: 'Mírate al espejo', task: 'Mírate 1 minuto y dite: "Te veo, te quiero, estoy contigo."', emoji: '🪞' },
      { day: 2, title: '5 logros de tu vida', task: 'Escribe 5 cosas que has logrado. Grandes o pequeñas. Son tuyas.', emoji: '🏆' },
      { day: 3, title: 'Deja de compararte', task: 'Hoy no abras redes sociales. Compárate solo con quien eras ayer.', emoji: '📵' },
      { day: 4, title: 'Pon límites', task: 'Di "no" a algo que no quieres hacer. Tu tiempo es valioso.', emoji: '🚫' },
      { day: 5, title: 'Vístete para ti', task: 'Ponte algo que te haga sentir poderosa. Arréglate para TI.', emoji: '👗' },
      { day: 6, title: 'Afirmaciones', task: '"Soy suficiente. Merezco amor. Mi valor no depende de nadie." Repite 5 veces.', emoji: '💛' },
      { day: 7, title: 'Carta de tu yo futura', task: 'Tu yo del futuro te escribe: "Gracias por no rendirte. Mírate ahora."', emoji: '💌' },
    ],
  },
]

/* ── Programas Premium (21 días) ── */
export const PROGRAMAS_PREMIUM = [
  {
    id: 'despertar21', title: 'Despertar — 21 días para crear tu hábito',
    desc: '3 semanas para sembrar, construir e integrar el hábito que va a cambiar tu vida. 1-2 minutos al día.',
    color: '#C9A96E', price: 9.99, duration: '21 días',
    phases: [
      { name: 'Sembrar', days: '1-7', desc: 'Conocerte y despertar' },
      { name: 'Construir', days: '8-14', desc: 'Fortalecer tu hábito' },
      { name: 'Integrar', days: '15-21', desc: 'Hacerlo parte de ti' },
    ],
    days: [
      /* === SEMANA 1: SEMBRAR — Despertar tu cerebro al cambio === */
      { day: 1, title: 'Tu intención', dim: 'emocional', task: 'Escribe en una frase: ¿qué quiero sentir al final de estos 21 días? Esa es tu brújula.', prompt: '¿Qué estoy buscando realmente con este cambio?', neuro: 'Cuando escribes una intención, activas tu corteza prefrontal — la parte del cerebro que planifica y toma decisiones. Estás literalmente programando tu GPS interno.' },
      { day: 2, title: 'Respira y llega', dim: 'espiritual', task: 'Respiración 4-7-8: inhala 4s, sostén 7s, exhala 8s. Repite 3 veces. Estás aquí.', prompt: '¿Cuándo fue la última vez que me sentí en paz?', neuro: 'La respiración lenta activa tu nervio vago y apaga la respuesta de "pelear o huir". En 60 segundos puedes cambiar tu estado nervioso de estrés a calma.' },
      { day: 3, title: 'Mueve tu cuerpo', dim: 'fisico', task: 'Estira tu cuerpo 2 minutos. Cuello, hombros, espalda. Tu cuerpo guarda todo.', prompt: '¿Dónde siento tensión en mi cuerpo hoy?', neuro: 'El movimiento libera BDNF (factor neurotrófico), que es como fertilizante para tu cerebro. Mover el cuerpo literalmente hace crecer nuevas neuronas.' },
      { day: 4, title: 'Observa tu mente', dim: 'mental', task: 'Por 1 minuto, solo observa tus pensamientos. No los juzgues. Solo míralos pasar.', prompt: '¿Qué pensamientos se repiten más en mi cabeza?', neuro: 'Observar tus pensamientos sin reaccionar fortalece tu corteza prefrontal. Es como hacer pesas para tu cerebro — se llama metacognición.' },
      { day: 5, title: '3 gratitudes', dim: 'emocional', task: 'Escribe 3 cosas por las que estás agradecida hoy. Pueden ser pequeñas.', prompt: '¿Qué tengo hoy que antes soñaba con tener?', neuro: 'La gratitud aumenta la dopamina y serotonina — los neurotransmisores de la felicidad. Es un antidepresivo natural sin efectos secundarios.' },
      { day: 6, title: 'Conexión espiritual', dim: 'espiritual', task: 'Dedica 2 minutos a lo que te conecta: oración, naturaleza, silencio, música.', prompt: '¿Qué me hace sentir que soy parte de algo más grande?', neuro: 'La conexión espiritual activa la red neuronal por defecto (DMN), que procesa el sentido de vida y pertenencia. Tu cerebro necesita estos momentos.' },
      { day: 7, title: 'Revisa tu semana', dim: 'mental', task: 'Mira atrás: 6 días cumplidos. Escribe qué fue fácil y qué difícil.', prompt: '¿Qué aprendí de mí esta semana?', neuro: 'La reflexión activa la consolidación de memoria. Al revisar tu semana, tu hipocampo convierte las experiencias en aprendizaje permanente.' },

      /* === SEMANA 2: CONSTRUIR — Crear las conexiones neuronales === */
      { day: 8, title: 'Define tu hábito', dim: 'mental', task: 'Escoge 1 hábito que quieres para siempre. Escríbelo claro: "Yo hago X cada día a las Y".', prompt: '¿Por qué este hábito y no otro? ¿Qué cambia si lo logro?', neuro: 'Un hábito claro y específico activa los ganglios basales — la zona del cerebro que automatiza comportamientos. Mientras más específico, más fácil de automatizar.' },
      { day: 9, title: 'Tu ancla neuronal', dim: 'emocional', task: 'Conecta tu hábito a algo que ya haces. Ejemplo: "Después de mi café, medito 2 min."', prompt: '¿A qué momento del día puedo anclar este nuevo hábito?', neuro: 'Esto se llama "habit stacking" — conectas una red neuronal nueva a una que ya existe. Es como colgar una hamaca de dos árboles que ya están firmes.' },
      { day: 10, title: 'Hazlo ridículamente fácil', dim: 'fisico', task: 'Reduce tu hábito a 1 minuto. Si es gym, pon los tenis. Si es leer, abre el libro. Solo eso.', prompt: '¿Cuál es la versión más pequeña de mi hábito que puedo hacer sin excusas?', neuro: 'Tu cerebro resiste el cambio grande (homeostasis). Pero cambios pequeños pasan por debajo del radar de la amígdala — no activan el miedo al cambio.' },
      { day: 11, title: 'Celebra cada vez', dim: 'emocional', task: 'Cada vez que hagas tu hábito hoy, sonríe y dite "¡Eso!". La celebración crea dopamina.', prompt: '¿Cómo me siento cuando cumplo lo que me propongo?', neuro: 'La dopamina no solo es placer — es la señal que le dice a tu cerebro "repite esto". Celebrar después del hábito crea un loop de recompensa que lo vuelve adictivo.' },
      { day: 12, title: 'Diseña tu entorno', dim: 'fisico', task: 'Haz que tu hábito sea fácil: deja la ropa lista, el libro visible, la app abierta.', prompt: '¿Qué puedo cambiar en mi espacio para que sea más fácil cumplir?', neuro: 'Tu cerebro toma el 95% de decisiones en piloto automático basándose en el entorno. Cambia el entorno y cambias el comportamiento sin usar fuerza de voluntad.' },
      { day: 13, title: 'El día difícil', dim: 'espiritual', task: 'Hoy haz tu hábito aunque no quieras. La consistencia importa más que la perfección.', prompt: '¿Qué me digo a mí misma cuando no tengo ganas?', neuro: 'Cada vez que haces algo difícil, se fortalece tu mielina — la capa que recubre tus conexiones neuronales y las hace más rápidas. La dificultad es el entrenamiento.' },
      { day: 14, title: 'Revisa tu progreso', dim: 'mental', task: '2 semanas. Mira tu tracking. ¿Cuántos días cumpliste? Escribe qué sientes.', prompt: '¿En qué he cambiado desde el día 1?', neuro: 'Ver tu progreso visual activa el circuito de recompensa. Los estudios muestran que las personas que trackean sus hábitos tienen un 40% más de probabilidad de mantenerlos.' },

      /* === SEMANA 3: INTEGRAR — De hábito a identidad === */
      { day: 15, title: 'Sube el nivel', dim: 'fisico', task: 'Aumenta tu hábito un poquito. Si eran 2 minutos, haz 5. Si era 1 página, lee 3.', prompt: '¿Estoy lista para pedirme un poco más?', neuro: 'Esto es neuroplasticidad en acción: tus neuronas ya formaron la conexión base. Ahora cada repetición la hace más gruesa y fuerte, como un camino que se vuelve carretera.' },
      { day: 16, title: 'Comparte tu camino', dim: 'emocional', task: 'Cuéntale a alguien lo que estás haciendo. La vulnerabilidad crea responsabilidad.', prompt: '¿A quién le puedo contar lo que estoy construyendo?', neuro: 'Hablar sobre tus metas activa neuronas espejo en quien te escucha Y en ti. La conexión social libera oxitocina, que reduce el cortisol (estrés) y fortalece tu compromiso.' },
      { day: 17, title: 'Identidad neuronal', dim: 'mental', task: 'Ya no es "quiero meditar". Es "soy una persona que medita". Escribe: "Yo soy alguien que..."', prompt: '¿Quién me estoy convirtiendo con este hábito?', neuro: 'Cuando cambias tu identidad, activas tu red de autoconcepto en la corteza prefrontal medial. Tu cerebro empieza a filtrar el mundo para confirmar quien ERES, no quien quieres ser.' },
      { day: 18, title: 'Perdónate', dim: 'espiritual', task: 'Si fallaste algún día, está bien. Escribe: "Me perdono por no ser perfecta. Sigo aquí."', prompt: '¿Qué necesito soltar para seguir avanzando?', neuro: 'La autocompasión reduce la actividad de la amígdala (centro del miedo) y activa la corteza prefrontal. Castigarte activa el modo amenaza. Perdonarte activa el modo crecimiento.' },
      { day: 19, title: 'Tu ritual sagrado', dim: 'espiritual', task: 'Tu hábito ya no es una tarea — es un ritual. Hazlo hoy con intención y presencia.', prompt: '¿Cómo puedo hacer de este hábito algo sagrado para mí?', neuro: 'Los rituales activan la ínsula — la zona del cerebro que conecta cuerpo y emociones. Por eso los rituales se sienten diferentes a las rutinas: involucran todo tu ser.' },
      { day: 20, title: 'Visualiza tu futuro', dim: 'emocional', task: 'Cierra los ojos 2 min. Imagínate dentro de 60 días con este hábito firme. ¿Cómo te ves?', prompt: '¿Cómo es mi vida cuando este hábito es automático?', neuro: 'La visualización activa las mismas áreas motoras que la acción real. Tu cerebro no distingue bien entre imaginar y hacer — por eso los atletas visualizan antes de competir.' },
      { day: 21, title: 'Ya eres otra', dim: 'mental', task: 'Escribe una carta a la tú del día 1. Cuéntale todo lo que lograste. Estás lista para los 60 días.', prompt: '¿Qué le diría a la persona que empezó hace 21 días?', neuro: 'En 21 días tu cerebro ha creado nuevas sinapsis, fortalecido conexiones y empezado a mielinizar este nuevo camino neuronal. Ya no es fuerza de voluntad — es arquitectura cerebral.' },
    ],
  },
]

/* ── Suggested habits for new users ── */
export const SUGGESTED_HABITS = [
  { name: 'Meditar 5 minutos', dim: 'espiritual', emoji: '🧘' },
  { name: 'Caminar 15 minutos', dim: 'fisico', emoji: '🚶‍♀️' },
  { name: 'Escribir 3 gratitudes', dim: 'emocional', emoji: '📝' },
  { name: 'Leer 10 páginas', dim: 'mental', emoji: '📚' },
  { name: 'Tomar 8 vasos de agua', dim: 'fisico', emoji: '💧' },
  { name: 'Respiración consciente 1 min', dim: 'emocional', emoji: '🫁' },
  { name: 'Oración / momento espiritual', dim: 'espiritual', emoji: '🙏' },
  { name: 'Journaling — escribir reflexión', dim: 'emocional', emoji: '📔' },
  { name: 'Estiramiento o yoga 10 min', dim: 'fisico', emoji: '🧘‍♀️' },
  { name: 'Aprender algo nuevo 15 min', dim: 'mental', emoji: '🧠' },
  { name: 'Skincare mañana y noche', dim: 'fisico', emoji: '🧴' },
  { name: 'No celular 1 hora antes de dormir', dim: 'mental', emoji: '📵' },
]

export const AVATARS = ['🌸','🦋','🌻','🌙','✨','🔮','🧘‍♀️','💫','🌊','🪷','🕊️','☀️','🫶','💜','🧿','🪬']

export const CATS = ['todas', 'espiritual', 'sanacion', 'serenidad', 'motivacional', 'sabiduria']
export const CAT_LABELS = { todas: 'Todas', espiritual: 'Espiritual', sanacion: 'Sanación', serenidad: 'Serenidad', motivacional: 'Motivacional', sabiduria: 'Sabiduría' }
