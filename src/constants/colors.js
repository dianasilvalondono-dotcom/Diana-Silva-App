/* ── Color tokens: paleta "Orquídea salvaje" (oct 2026) ──
   Colores tomados de la naturaleza: orquídea, higo, merlot, chartreuse,
   ocre, musgo, selva, laguna y hueso. Cada sala de la curaduría tiene su
   propio color (ver SALA_COLORES en constants/curaduria.js).

   Los nombres heredados (rose, teal, gold, mint...) se conservan para no
   romper el código existente: cambia el valor, no el nombre. En código
   nuevo, usa los nombres semánticos de la primera sección. */
export const C = {
  /* Nombres semánticos (código nuevo) */
  vino:       '#4A0E26',   // fondo de identidad (texto blanco encima)
  orquidea:   '#771441',   // color de marca
  merlot:     '#880500',
  higo:       '#D42C23',   // acción (botones)
  chartreuse: '#EDE288',   // acento eléctrico sobre fondos oscuros; texto encima: berenjena
  ocre:       '#DAA43C',   // relleno cálido; texto encima: berenjena
  musgo:      '#93A052',   // relleno; texto encima: berenjena
  selva:      '#2E3F28',
  laguna:     '#2A5F64',
  malva:      '#806172',
  lila:       '#E5D5E1',
  berenjena:  '#372C41',   // texto principal
  hueso:      '#F5F0E6',   // base clara

  /* Antes rosa → hoy orquídea */
  rose:      '#771441',
  roseDark:  '#4A0E26',
  roseBloom: '#C98AA8',
  roseLight: '#F3E6EE',

  /* Antes teal → hoy laguna */
  teal:      '#2A5F64',
  tealDark:  '#1C4246',
  tealLight: '#3D7A7F',

  /* Antes mint → hoy musgo claro */
  mint:      '#CBD68E',
  mintLight: '#EEF1DA',

  /* Coral → higo */
  coral:     '#D42C23',

  /* Lavanda → malva */
  lavanda:   '#806172',

  /* Dorado → ocre (versión legible como texto sobre hueso) */
  gold:      '#8C5E0E',
  goldDark:  '#6B470A',
  goldLight: '#F0D9A0',

  /* Neutros */
  cream:     '#F5F0E6',
  card:      '#FFFDF8',
  border:    '#E2D7C2',
  text:      '#372C41',
  muted:     '#5E5160',
  subtle:    '#857980',

  /* Funcionales */
  green:     '#5E6B2A',
  greenDone: '#E4EBC6',
  beige:     '#F5F0E6',
  nude:      '#F5F0E6',
}
