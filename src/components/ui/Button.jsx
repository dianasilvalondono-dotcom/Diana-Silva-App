/* Button — botón de Ronda con estados reales (hover / active / focus /
   disabled / loading), imposibles con estilo inline suelto.
   Es un <button> nativo: teclado y Enter/Espacio funcionan solos.
   Usa tokens de fuente, tipografía, peso, espaciado, radio y sombra. */
import { useState } from 'react'
import { C } from '../../constants/colors'
import { FONT, TYPE, WEIGHT, SPACE, RADIUS, SHADOW } from '../../constants/tokens'

const SIZES = {
  sm: { padding: `${SPACE.sm}px ${SPACE.lg}px`, fontSize: TYPE.sm },
  md: { padding: `${SPACE.md}px ${SPACE.xl}px`, fontSize: TYPE.base },
  lg: { padding: `${SPACE.lg}px ${SPACE.xl}px`, fontSize: TYPE.lg },
}

const VARIANTS = {
  primary: { bg: `linear-gradient(135deg, ${C.gold}, ${C.rose})`, fg: 'white', glow: SHADOW.goldGlow },
  teal:    { bg: C.teal, fg: 'white', glow: SHADOW.tealGlow },
  ghost:   { bg: 'transparent', fg: C.teal, glow: null },
  outline: { bg: 'transparent', fg: C.teal, glow: null, border: `1.5px solid ${C.border}` },
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [focus, setFocus] = useState(false)

  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.md
  const isDisabled = disabled || loading

  // Anillo de foco accesible + elevación al hover, combinados.
  const ring = focus && !isDisabled ? `0 0 0 3px ${C.teal}40` : null
  const elev = hover && !isDisabled && v.glow ? v.glow : null
  const boxShadow = [ring, elev].filter(Boolean).join(', ') || 'none'

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        fontFamily: FONT, fontWeight: WEIGHT.heavy,
        border: v.border || 'none', borderRadius: RADIUS.md,
        background: isDisabled ? C.border : v.bg,
        color: isDisabled ? C.subtle : v.fg,
        boxShadow,
        cursor: isDisabled ? 'default' : 'pointer',
        transform: pressed && !isDisabled ? 'scale(0.98)' : 'scale(1)',
        opacity: hover && !isDisabled && variant === 'ghost' ? 0.8 : 1,
        filter: hover && !isDisabled && (variant === 'primary' || variant === 'teal') ? 'brightness(1.04)' : 'none',
        transition: 'transform .1s ease, box-shadow .15s ease, filter .15s ease',
        outline: 'none',
        ...s,
        ...style,
      }}
      {...rest}
    >
      {loading ? 'Cargando…' : children}
    </button>
  )
}
