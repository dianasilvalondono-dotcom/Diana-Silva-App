/* Badge — etiqueta compacta de estado o rol.
   Reemplaza los badges inline ad-hoc (Verificada, Guía IA, Ejemplo, estado).
   Usa tokens de color, radio y tipografía. */
import { C } from '../../constants/colors'
import { TYPE, RADIUS, WEIGHT } from '../../constants/tokens'

const VARIANTS = {
  // Rol / confianza
  verified: { bg: C.gold, fg: 'white' },            // humanas reales verificadas
  ai:       { bg: `${C.teal}18`, fg: C.teal },      // Guía IA
  example:  { bg: `${C.teal}18`, fg: C.teal },      // contenido de ejemplo
  neutral:  { bg: `${C.rose}15`, fg: C.roseDark },  // categoría / genérico
  // Estados
  success:  { bg: C.mint, fg: '#0B5E52' },
  warning:  { bg: C.goldLight, fg: C.goldDark },
  danger:   { bg: C.roseBloom, fg: C.roseDark },
}

export default function Badge({ variant = 'neutral', children, style }) {
  const v = VARIANTS[variant] || VARIANTS.neutral
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: RADIUS.sm,
        background: v.bg, color: v.fg,
        fontSize: TYPE.sm, fontWeight: WEIGHT.bold, lineHeight: 1.4,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
