/* ──────────────────────────────────────────────────────────────
   Design tokens — Ronda (Brand Book v3)
   Fuente ÚNICA de las escalas del sistema: tipografía, pesos,
   espaciado, radios y sombras. Los colores viven en colors.js (C).

   Regla: en código nuevo y en componentes, usa estos tokens en vez
   de números mágicos. Migración del código existente: incremental.
   ────────────────────────────────────────────────────────────── */
import { C } from './colors'

/* Única familia tipográfica de marca */
export const FONT = 'Montserrat, sans-serif'

/* Escala tipográfica (px) — objetivo consolidado: ~8 pasos
   (hoy el código usa 23 tamaños sueltos; migrar hacia estos). */
export const TYPE = {
  xs: 13,      // metadatos, disclaimers
  sm: 15,      // secundario, captions
  base: 17,    // cuerpo por defecto
  lg: 19,      // cuerpo destacado (el más usado hoy)
  h3: 22,      // subtítulos
  h2: 28,      // títulos de sección
  h1: 36,      // títulos de pantalla
  display: 56, // portada / hero
}

/* Pesos — Montserrat se carga en 400/600/700/800/900 */
export const WEIGHT = {
  regular: 400,
  medium: 600,
  bold: 700,
  heavy: 800,
  black: 900,
}

/* Espaciado (px) — escala base 4, para padding/margin/gap */
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
}

/* Radios (px) */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 50,
  full: '50%',
}

/* Sombras — niveles de elevación + glows de acento.
   Los glows usan el color de marca con alfa en hex (…59 ≈ 0.35). */
export const SHADOW = {
  sm: '0 1px 4px rgba(0,0,0,0.05)',   // tarjetas (el más usado)
  md: '0 2px 12px rgba(0,0,0,0.06)',  // tarjetas elevadas
  lg: '0 8px 32px rgba(0,0,0,0.12)',  // modales / overlays
  goldGlow: `0 6px 20px ${C.gold}59`, // botones dorados
  tealGlow: `0 8px 20px ${C.teal}4D`, // acentos teal
}
