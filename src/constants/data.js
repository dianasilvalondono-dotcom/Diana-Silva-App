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

/* ── Default routines ── */
export const DEFAULT_MORNING = [
  { id: 1, time: '7:05', task: 'Intención del día: Oración y gratitud', emoji: '🙏' },
  { id: 2, time: '7:20', task: 'Caldo + Paseo', emoji: '🚶‍♀️' },
  { id: 3, time: '7:35', task: 'Meditación', emoji: '🧘' },
  { id: 4, time: '7:40', task: 'Afirmación: Momento Mori. Solo tengo hoy.', emoji: '⏳' },
  { id: 5, time: '8:00', task: 'Gym', emoji: '💪' },
  { id: 6, time: '9:35', task: 'Proteína + Creatina', emoji: '🥤' },
]
export const DEFAULT_MIDDAY = [
  { id: 20, time: '10:45', task: 'Oración de serenidad', emoji: '🕊️' },
  { id: 21, time: '11:45', task: 'Respira Profundo — Estoy a salvo', emoji: '🌬️' },
  { id: 22, time: '14:00', task: 'Entrega a Dios — Tú eres el poder y la sanidad', emoji: '✝️' },
  { id: 23, time: '15:45', task: 'Libero el dolor y doy la bienvenida al amor', emoji: '💛' },
  { id: 24, time: '16:30', task: 'Respira y Pausa Activa', emoji: '🧘‍♀️' },
]
export const DEFAULT_NIGHT = [
  { id: 7,  time: '18:30', task: 'Lectura noche', emoji: '📖' },
  { id: 8,  time: '19:00', task: 'Meditación de noche', emoji: '🧘' },
  { id: 9,  time: '19:35', task: 'Soltar y rendirme a Dios', emoji: '🙏' },
  { id: 10, time: '21:00', task: 'Me perdono y descanso en Dios', emoji: '🌙' },
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
    id: 'depresion', title: 'Vencer la depresión', emoji: '🌧️→☀️',
    desc: '7 días de micro-hábitos para recuperar tu luz interior', color: '#A6716B',
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
