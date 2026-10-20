/* LineaCrisis — número de ayuda que se marca con un toque (tel:).
   Fuera de la Ayuda las líneas aparecen dentro de una frase: el enlace va en
   línea, subrayado y sin partirse ("Línea 106" junto). El área táctil crece
   con relleno vertical (unos 32 px de alto) sin agrandar la línea: el texto
   de alrededor conserva su interlineado.
   Uso: <LineaCrisis numero="106">Línea 106</LineaCrisis> */
import { C } from '../../constants/colors'

export default function LineaCrisis({ numero, children, color = C.morado }) {
  return (
    <a href={`tel:${numero}`} style={{
      display: 'inline', padding: '7px 0', whiteSpace: 'nowrap',
      color, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2,
    }}>
      {children}
    </a>
  )
}
