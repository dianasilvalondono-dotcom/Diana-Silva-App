/* Cuánto subir la página para que lo enfocado quede entre el encabezado y lo
   que tapa la esquina de abajo: los botones flotantes (Tu Ronda y el de
   emergencia) y el menú. Lo usa subirSobreFlotantes en App.jsx.
   - zona: la fila o el formulario del campo (data-sobre-flotantes), o el
     mismo campo. Su borde de abajo sube por encima de lo que la tapa.
   - foco: el campo enfocado. Si no cabe todo, gana él: su borde de arriba no
     se va debajo del encabezado.
   - tapas: lo que tapa abajo. Solo cuenta lo que queda sobre la zona, de
     lado a lado (en pantalla ancha los botones van fuera de la columna).
   - alto: el alto de la pantalla; arriba: el borde de abajo del encabezado.
   Todo en píxeles de la pantalla (getBoundingClientRect). Devuelve cuánto
   desplazar (positivo: la página sube; negativo: baja; 0: nada). */
export function cuantoSubir({ zona, foco, tapas = [], alto, arriba = 0, aire = 12 }) {
  let abajo = alto
  for (const t of tapas) {
    if (t && t.width !== 0 && t.left < zona.right && t.right > zona.left) abajo = Math.min(abajo, t.top - aire)
  }
  let d = Math.max(0, zona.bottom - abajo)
  if (foco.top - d < arriba + aire) d = foco.top - arriba - aire
  return Math.abs(d) >= 1 ? d : 0
}
