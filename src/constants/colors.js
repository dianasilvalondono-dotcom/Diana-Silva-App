/* ── Color tokens: paleta de Diana (oct 2026, segunda versión) ──
   Los tonos de su moodboard:
     · Dark Purple    PANTONE 19-2524 TCX  #592147  (telón, botones, identidad)
     · Orchid Hush    PANTONE 256 C        #D6BFDD  (etiquetas, acentos rosados)
     · Sage           PANTONE 16-0421 TCX  #91946E  (acento verde)
     · Olive                               #726D2D  (etiquetas pequeñas)
     · Ice Water      PANTONE 13-4202 TCX  #BFD5EB  (recuadros de calma)
     · Neon Navy      PANTONE 20-0142 TPM  #141833  (texto principal)
   Regla: el telón es morado; la hoja es clara; rosado y verde solo en
   etiquetas y detalles. El color nunca va solo: siempre con texto.
   Sin círculos decorativos: el círculo queda solo en el logo.

   Los nombres heredados (merlot, espinaca, placido, rose, teal…) se
   conservan para no romper el código existente: cambia el valor, no el
   nombre. En código nuevo, usa los nombres de la primera sección. */
export const C = {
  /* Paleta (código nuevo) */
  morado:        '#592147',
  moradoOscuro:  '#3E1631',
  orquidea:      '#D6BFDD',
  orquideaClara: '#F3EAF5',
  sage:          '#91946E',
  sageClara:     '#E3E5D3',
  oliva:         '#726D2D',
  olivaOscura:   '#4F4B1E',   // texto sobre sageClara
  agua:          '#BFD5EB',
  aguaClara:     '#DCE7F3',
  hoja:          '#EEF3F9',   // fondo de la hoja de contenido
  navy:          '#141833',
  // Contorno de controles e indicadores (bordes punteados, campos, casillas
  // sin marcar, puntos de progreso): 3,9:1 sobre la hoja y 4,3:1 sobre
  // blanco (WCAG pide 3:1). orquideaClara/roseLight es relleno, no contorno.
  contorno:      '#936F87',

  /* Nombres de la primera versión → misma función, tono nuevo */
  merlot:         '#592147',
  merlotOscuro:   '#3E1631',
  merlotClaro:    '#F3EAF5',
  espinaca:       '#91946E',
  espinacaOscura: '#726D2D',
  espinacaClara:  '#E3E5D3',
  placido:        '#BFD5EB',
  placidoOscuro:  '#141833',
  placidoClaro:   '#DCE7F3',
  tinta:          '#141833',
  fondo:          '#EEF3F9',

  /* Antes rosa */
  rose:      '#592147',
  roseDark:  '#3E1631',
  roseBloom: '#D6BFDD',
  roseLight: '#F3EAF5',

  /* Antes teal */
  teal:      '#592147',
  tealDark:  '#3E1631',
  tealLight: '#D6BFDD',

  /* Antes mint */
  mint:      '#91946E',
  mintLight: '#E3E5D3',

  coral:     '#592147',
  lavanda:   '#592147',

  /* Antes dorado → oliva */
  gold:      '#726D2D',
  goldDark:  '#4F4B1E',
  goldLight: '#E3E5D3',

  /* Neutros */
  cream:     '#EEF3F9',
  card:      '#FFFFFF',
  border:    '#DCE3EC',
  text:      '#141833',
  muted:     '#4A4E66',
  subtle:    '#63677D',

  /* Funcionales */
  green:     '#726D2D',
  greenDone: '#726D2D',
  beige:     '#EEF3F9',
  nude:      '#EEF3F9',
}

/* El salvia (#91946E) es acento: como texto sobre la hoja da 2,8:1. Donde
   un color de programa o de categoría se usa como texto, el salvia pasa a
   oliva (4,8:1). Los demás colores ya tienen contraste y no cambian. */
export const colorTexto = (c) => (typeof c === 'string' && c.toUpperCase() === C.sage ? C.oliva : c)
