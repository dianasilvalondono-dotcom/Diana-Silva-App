/* Card — contenedor de superficie de Ronda.
   Reemplaza el patrón inline repetido: fondo blanco, radio, sombra, borde.
   Usa tokens de radio, espaciado y sombra. */
import { C } from '../../constants/colors'
import { RADIUS, SPACE, SHADOW } from '../../constants/tokens'

const ELEVATION = {
  flat:     'none',
  low:      SHADOW.sm,   // tarjeta estándar (el más usado en la app)
  raised:   SHADOW.md,   // tarjeta destacada
}

export default function Card({
  elevation = 'low',
  padding = SPACE.lg,
  radius = RADIUS.lg,
  border = true,
  onClick,
  children,
  style,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card,
        borderRadius: radius,
        padding,
        boxShadow: ELEVATION[elevation] ?? SHADOW.sm,
        border: border ? `1px solid ${C.border}` : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
