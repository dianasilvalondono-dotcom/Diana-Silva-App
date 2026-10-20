/* LineaCrisis — número de ayuda que se marca con un toque (tel:).
   Fuera de la Ayuda las líneas aparecen dentro de una frase: el enlace va en
   línea, subrayado y con un área táctil de al menos 32 px de alto.
   Uso: <LineaCrisis numero="106">Línea 106</LineaCrisis> */
import { C } from '../../constants/colors'

export default function LineaCrisis({ numero, children, color = C.morado }) {
  return (
    <a href={`tel:${numero}`} style={{
      display: 'inline-flex', alignItems: 'center', minHeight: 32,
      color, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2,
    }}>
      {children}
    </a>
  )
}
