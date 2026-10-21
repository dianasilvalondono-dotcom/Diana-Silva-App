/* Medidas de los botones flotantes (src/components/ui/BotonesFlotantes.jsx):
   el de emergencia y, encima, el de Tu Ronda, abajo a la derecha. */

export const TAMANO_FLOTANTE = 56
export const SEPARACION_FLOTANTES = 12
// El menú de abajo mide 62 + 6 + 1 px (más la zona segura del iPhone).
const ALTO_MENU = 69
// Desde abajo: con el menú, 80 px (el menú y 11 px de aire); sin él, 16 px.
export const BASE_CON_MENU = ALTO_MENU + SEPARACION_FLOTANTES - 1
export const BASE_SIN_MENU = 16

export const zonaSegura = (px) => `calc(env(safe-area-inset-bottom, 0px) + ${px}px)`

/* El alto que tapan, contado desde abajo, con 16 px de margen. Las pantallas
   lo dejan de espacio al final para llegar con scroll a lo último. */
export const ESPACIO_FLOTANTES = {
  // El corazón y Tu Ronda, encima del menú: 80 + 56 + 12 + 56 + 16 = 220
  dosConMenu: zonaSegura(BASE_CON_MENU + TAMANO_FLOTANTE * 2 + SEPARACION_FLOTANTES + 16),
  // Solo el corazón, encima del menú (en Tu Ronda): 80 + 56 + 14 = 150
  unoConMenu: zonaSegura(BASE_CON_MENU + TAMANO_FLOTANTE + 14),
  // Solo el corazón, sin menú (cuenta y autorizaciones): 16 + 56 + 32 = 104
  unoSinMenu: zonaSegura(BASE_SIN_MENU + TAMANO_FLOTANTE + 32),
}
