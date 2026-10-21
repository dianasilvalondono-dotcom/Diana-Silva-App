/* Medidas de los botones flotantes (src/components/ui/BotonesFlotantes.jsx):
   el de emergencia y, encima, el de Tu Ronda, abajo a la derecha. */

export const TAMANO_FLOTANTE = 56
export const SEPARACION_FLOTANTES = 12
// El menú de abajo mide 62 + 6 + 1 px (más la zona segura del iPhone).
const ALTO_MENU = 69
// Desde abajo: con el menú, 80 px (el menú y 11 px de aire); sin él, 16 px.
export const BASE_CON_MENU = ALTO_MENU + SEPARACION_FLOTANTES - 1
export const BASE_SIN_MENU = 16
// En la bienvenida, encima de su barra fija de puntos y botones (16 + 8 + 20
// + 56 + 40 = 140 px con «Atrás») con 12 px de aire.
const ALTO_BARRA_BIENVENIDA = 140
export const BASE_BIENVENIDA = ALTO_BARRA_BIENVENIDA + SEPARACION_FLOTANTES

/* Desde este ancho de ventana, los botones caben a la derecha de la columna
   de 600 px (300 + 16 + 56 + 16 + 16 de aire = 404 desde el centro) y van
   ahí, como hasta el 12-oct: no tapan nada de la página. Desde ANCHO_CON_NOMBRE
   caben también con su nombre («Tu Ronda», «¿Necesitas apoyo?»). Los usa
   App.css (las media queries no leen variables: si cambian, cambian allá). */
export const ANCHO_FUERA_DE_LA_COLUMNA = 810
export const ANCHO_CON_NOMBRE = 1140

export const zonaSegura = (px) => `calc(env(safe-area-inset-bottom, 0px) + ${px}px)`

/* El alto que tapan, contado desde abajo, con 16 px de margen. Las pantallas
   lo dejan de espacio al final para llegar con scroll a lo último. */
export const ESPACIO_FLOTANTES = {
  // El corazón y Tu Ronda, encima del menú: 80 + 56 + 12 + 56 + 16 = 220
  dosConMenu: zonaSegura(BASE_CON_MENU + TAMANO_FLOTANTE * 2 + SEPARACION_FLOTANTES + 16),
  // Solo el corazón, encima del menú (la hoja de un plan): 80 + 56 + 16 = 152
  unoConMenu: zonaSegura(BASE_CON_MENU + TAMANO_FLOTANTE + 16),
  // En Tu Ronda (solo el corazón): el aviso legal termina por encima del
  // corazón y «Cómo cuidamos tus datos», centrado y corto, queda a su
  // izquierda. Basta el menú y 16 px: 80 + 16 = 96. Así el chat no pierde alto.
  finTuRonda: zonaSegura(BASE_CON_MENU + 16),
  // Solo el corazón, sin menú (cuenta y autorizaciones): 16 + 56 + 32 = 104
  unoSinMenu: zonaSegura(BASE_SIN_MENU + TAMANO_FLOTANTE + 32),
  // En la bienvenida, encima de su barra: 152 + 56 + 16 = 224. Sin la zona
  // segura: la barra no la suma (sus 40 px de abajo ya dejan la del iPhone).
  bienvenida: `${BASE_BIENVENIDA + TAMANO_FLOTANTE + 16}px`,
}
