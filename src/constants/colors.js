/* ── Color tokens: paleta de Diana (oct 2026) ──
   Tres colores Pantone, nada más:
     · Merlot        PANTONE 19-1534 TCX  #73272D  (identidad, acción)
     · Spinach Green PANTONE 16-0439 TCX  #909B4C  (secundario)
     · Placid Blue   PANTONE 15-3920 TCX  #8CACD3  (acento frío)
   Más sus versiones oscuras (para texto legible) y claras (fondos), y
   neutros. Sin círculos decorativos: el círculo queda solo en el logo.

   Los nombres heredados (rose, teal, gold, mint...) se conservan para no
   romper el código existente: cambia el valor, no el nombre. En código
   nuevo, usa los nombres semánticos de la primera sección. */
export const C = {
  /* Paleta (código nuevo) */
  merlot:         '#73272D',
  merlotOscuro:   '#4E1A1F',
  merlotClaro:    '#F4E9EA',
  espinaca:       '#909B4C',   // relleno; texto encima: tinta
  espinacaOscura: '#5C6430',   // versión legible como texto
  espinacaClara:  '#EEF0E1',
  placido:        '#8CACD3',   // relleno o texto sobre merlot; texto encima: tinta
  placidoOscuro:  '#3E6390',   // versión legible como texto
  placidoClaro:   '#EDF2F8',
  tinta:          '#2A1E21',   // texto principal
  fondo:          '#F7F6F2',

  /* Antes rosa → merlot */
  rose:      '#73272D',
  roseDark:  '#4E1A1F',
  roseBloom: '#C99498',
  roseLight: '#F4E9EA',

  /* Antes teal → plácido oscuro */
  teal:      '#3E6390',
  tealDark:  '#2C4A6E',
  tealLight: '#8CACD3',

  /* Antes mint → espinaca clara */
  mint:      '#C9D19A',
  mintLight: '#EEF0E1',

  /* Coral → merlot */
  coral:     '#73272D',

  /* Lavanda → plácido oscuro */
  lavanda:   '#3E6390',

  /* Dorado → espinaca oscura */
  gold:      '#5C6430',
  goldDark:  '#454B22',
  goldLight: '#E3E7C8',

  /* Neutros */
  cream:     '#F7F6F2',
  card:      '#FFFFFF',
  border:    '#E4E1DA',
  text:      '#2A1E21',
  muted:     '#5F5658',
  subtle:    '#7A7174',

  /* Funcionales */
  green:     '#5C6430',
  greenDone: '#EEF0E1',
  beige:     '#F7F6F2',
  nude:      '#F7F6F2',
}
