/* ── Mini SVG Brand Icons — Ronda ──
   Este archivo exporta catalogos de iconos, no componentes: fast refresh
   no aplica aqui. */
/* eslint-disable react-refresh/only-export-components */
// El color lo pone el contenedor via currentColor, no este componente.
const MiniIcon = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    {children}
  </svg>
)

/* ── Mood Icons — 5 estados emocionales ── */
export const MOOD_ICONS = [
  // 0: Difícil (coral)
  (s = 32, active = false) => <MiniIcon size={s}><circle cx="12" cy="12" r="10" stroke="#592147" strokeWidth={active ? "2.5" : "1.5"} fill={active ? "#59214715" : "none"} /><path d="M8 15 Q12 12 16 15" stroke="#592147" strokeWidth="1.5" fill="none" strokeLinecap="round" /><circle cx="9" cy="9" r="1" fill="#592147" /><circle cx="15" cy="9" r="1" fill="#592147" /></MiniIcon>,
  // 1: Meh (lavanda)
  (s = 32, active = false) => <MiniIcon size={s}><circle cx="12" cy="12" r="10" stroke="#141833" strokeWidth={active ? "2.5" : "1.5"} fill={active ? "#14183315" : "none"} /><path d="M8 14 L16 14" stroke="#141833" strokeWidth="1.5" strokeLinecap="round" /><circle cx="9" cy="9" r="1" fill="#141833" /><circle cx="15" cy="9" r="1" fill="#141833" /></MiniIcon>,
  // 2: Bien (dorado)
  (s = 32, active = false) => <MiniIcon size={s}><circle cx="12" cy="12" r="10" stroke="#726D2D" strokeWidth={active ? "2.5" : "1.5"} fill={active ? "#726D2D15" : "none"} /><path d="M8 13 Q12 16 16 13" stroke="#726D2D" strokeWidth="1.5" fill="none" strokeLinecap="round" /><circle cx="9" cy="9" r="1" fill="#726D2D" /><circle cx="15" cy="9" r="1" fill="#726D2D" /></MiniIcon>,
  // 3: Genial (mint)
  (s = 32, active = false) => <MiniIcon size={s}><circle cx="12" cy="12" r="10" stroke="#91946E" strokeWidth={active ? "2.5" : "1.5"} fill={active ? "#91946E15" : "none"} /><path d="M8 12 Q12 17 16 12" stroke="#91946E" strokeWidth="1.5" fill="none" strokeLinecap="round" /><circle cx="9" cy="9" r="1" fill="#91946E" /><circle cx="15" cy="9" r="1" fill="#91946E" /></MiniIcon>,
  // 4: Increíble (teal)
  (s = 32, active = false) => <MiniIcon size={s}><circle cx="12" cy="12" r="10" stroke="#141833" strokeWidth={active ? "2.5" : "1.5"} fill={active ? "#14183315" : "none"} /><path d="M7 11 Q12 18 17 11" stroke="#141833" strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M7 9 L10 8 M17 9 L14 8" stroke="#141833" strokeWidth="1.2" strokeLinecap="round" /><circle cx="9" cy="10" r="1" fill="#141833" /><circle cx="15" cy="10" r="1" fill="#141833" /></MiniIcon>,
]

/* ── Iconos funcionales (UI, no de marca) ──
   Reemplazan los glifos ✓ y ✕ del monolito. Por defecto heredan el
   color del contenedor (currentColor), que es como ya venían pintados
   los checkboxes y botones de cerrar. */
export const UI_ICONS = {
  check: (c = 'currentColor', s = 14) => (
    <MiniIcon size={s} color={c}>
      <path d="M5 12.5 L9.5 17 L19 7" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </MiniIcon>
  ),
  close: (c = 'currentColor', s = 14) => (
    <MiniIcon size={s} color={c}>
      <path d="M6 6 L18 18 M18 6 L6 18" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
    </MiniIcon>
  ),
  /* Dictado por voz en el Diario — reemplazan 🎙️, ⏹️ y 🔴. */
  mic: (c = 'currentColor', s = 18) => (
    <MiniIcon size={s} color={c}>
      <rect x="9" y="3" width="6" height="10" rx="3" stroke={c} strokeWidth="1.8" fill="none" />
      <path d="M6 11 Q6 16 12 16 Q18 16 18 11" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M12 16 L12 20 M9 20 L15 20" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </MiniIcon>
  ),
  stop: (c = 'currentColor', s = 18) => (
    <MiniIcon size={s} color={c}>
      <rect x="7" y="7" width="10" height="10" rx="2" fill={c} />
    </MiniIcon>
  ),
  rec: (c = 'currentColor', s = 10) => (
    <MiniIcon size={s} color={c}>
      <circle cx="12" cy="12" r="7" fill={c} />
    </MiniIcon>
  ),
}

export const ICONS = {
  espiritual: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><path d="M12 3 C12 3 6 8 6 13 C6 16.3 8.7 19 12 19 C15.3 19 18 16.3 18 13 C18 8 12 3 12 3Z" stroke={c} strokeWidth="1.8" fill={`${c}20`} /><path d="M12 10 L12 16 M10 13 L14 13" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></MiniIcon>,
  emocional: (c = '#726D2D', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="12" r="8.5" stroke={c} strokeWidth="1.8" fill={`${c}15`} /><path d="M8 11 Q8 8 12 8 Q16 8 16 11" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M9 14 Q12 17 15 14" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /></MiniIcon>,
  fisico: (c = '#4F4B1E', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="5" r="2.5" stroke={c} strokeWidth="1.8" fill={`${c}20`} /><path d="M12 8 L12 15 M8 11 L16 11 M12 15 L9 20 M12 15 L15 20" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></MiniIcon>,
  mental: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="12" r="8.5" stroke={c} strokeWidth="1.8" fill={`${c}15`} /><path d="M8 12 Q8 8 12 8 Q16 8 16 12 Q16 14 14 14 L14 16" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /><circle cx="14" cy="18" r="1" fill={c} /></MiniIcon>,
  tusa: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><path d="M12 6 C8 6 5 9 5 12.5 C5 17 12 21 12 21 C12 21 19 17 19 12.5 C19 9 16 6 12 6Z" stroke={c} strokeWidth="1.8" fill={`${c}15`} /><path d="M9 12 L12 15 L15 10" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></MiniIcon>,
  depresion: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="14" r="5" stroke={c} strokeWidth="1.8" fill={`${c}15`} /><path d="M9 6 L9 9 M12 4 L12 8 M15 6 L15 9" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><path d="M10 13 L14 13 M10 16 Q12 18 14 16" stroke={c} strokeWidth="1.3" strokeLinecap="round" fill="none" /></MiniIcon>,
  ansiedad: (c = '#726D2D', s = 20) => <MiniIcon size={s} color={c}><path d="M12 4 L12 8 M12 20 L12 16 M4 12 L8 12 M20 12 L16 12" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><circle cx="12" cy="12" r="4" stroke={c} strokeWidth="1.8" fill={`${c}15`} /><circle cx="12" cy="12" r="1.5" fill={c} /></MiniIcon>,
  empezar: (c = '#BFD5EB', s = 20) => <MiniIcon size={s} color={c}><path d="M12 20 L12 10" stroke={c} strokeWidth="1.8" strokeLinecap="round" /><path d="M12 10 C12 10 8 8 8 5 Q12 7 12 4 Q12 7 16 5 C16 8 12 10 12 10Z" fill={`${c}30`} stroke={c} strokeWidth="1.5" /></MiniIcon>,
  autoestima: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" fill={`${c}15`} /><path d="M6 20 Q6 14 12 14 Q18 14 18 20" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" /><path d="M10 7 L11 9 L13 9 L14 7" stroke={c} strokeWidth="1.2" strokeLinecap="round" fill="none" /></MiniIcon>,
  podcast: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><rect x="9" y="3" width="6" height="10" rx="3" stroke={c} strokeWidth="1.8" fill={`${c}15`} /><path d="M6 11 Q6 16 12 16 Q18 16 18 11" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M12 16 L12 20 M9 20 L15 20" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></MiniIcon>,
  musica: (c = '#726D2D', s = 20) => <MiniIcon size={s} color={c}><circle cx="8" cy="18" r="3" stroke={c} strokeWidth="1.8" fill={`${c}20`} /><path d="M11 18 L11 5 L19 3 L19 15" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /><circle cx="16" cy="15" r="3" stroke={c} strokeWidth="1.8" fill={`${c}20`} /></MiniIcon>,
  habito: (c = '#BFD5EB', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.8" fill={`${c}10`} /><path d="M8 12 L11 15 L16 9" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></MiniIcon>,
  libro: (c = '#726D2D', s = 20) => <MiniIcon size={s} color={c}><path d="M4 4 L4 18 Q8 16 12 18 Q16 16 20 18 L20 4 Q16 6 12 4 Q8 6 4 4Z" stroke={c} strokeWidth="1.8" fill={`${c}15`} /><path d="M12 4 L12 18" stroke={c} strokeWidth="1.2" /></MiniIcon>,
  tedtalk: (c = '#4F4B1E', s = 20) => <MiniIcon size={s} color={c}><rect x="3" y="5" width="18" height="12" rx="2" stroke={c} strokeWidth="1.8" fill={`${c}15`} /><polygon points="10,8 10,14 16,11" fill={c} /><path d="M8 20 L16 20" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></MiniIcon>,
  sol: (c = '#726D2D', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="12" r="4" fill={c} /><g stroke={c} strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></g></MiniIcon>,
  luna: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><path d="M18 12 A7 7 0 1 1 10 5 A5.5 5.5 0 0 0 18 12Z" fill={`${c}25`} stroke={c} strokeWidth="1.8" /></MiniIcon>,
  estrella: (c = '#726D2D', s = 20) => <MiniIcon size={s} color={c}><path d="M12 3 L14 9 L20 9 L15 13 L17 19 L12 15 L7 19 L9 13 L4 9 L10 9Z" fill={`${c}20`} stroke={c} strokeWidth="1.5" strokeLinejoin="round" /></MiniIcon>,
  /* ── Programas positivos ── */
  ejercicio: (c = '#BFD5EB', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="5" r="2.5" stroke={c} strokeWidth="1.8" fill={`${c}20`} /><path d="M12 8 L12 14" stroke={c} strokeWidth="1.8" strokeLinecap="round" /><path d="M8 10 L16 10" stroke={c} strokeWidth="2.5" strokeLinecap="round" /><path d="M6 9 L6 11 M18 9 L18 11" stroke={c} strokeWidth="2" strokeLinecap="round" /><path d="M10 14 L8 20 M14 14 L16 20" stroke={c} strokeWidth="1.8" strokeLinecap="round" /></MiniIcon>,
  dios: (c = '#726D2D', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" fill={`${c}08`} /><circle cx="12" cy="12" r="5" stroke={c} strokeWidth="1.5" fill={`${c}15`} /><circle cx="12" cy="12" r="1.5" fill={c} /><path d="M12 3 L12 7 M12 17 L12 21 M3 12 L7 12 M17 12 L21 12" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" /></MiniIcon>,
  mama: (c = '#D6BFDD', s = 20) => <MiniIcon size={s} color={c}><circle cx="10" cy="7" r="3.5" stroke={c} strokeWidth="1.8" fill={`${c}15`} /><path d="M4 19 Q4 13 10 13 Q16 13 16 19" stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" /><circle cx="17" cy="9" r="2" stroke={c} strokeWidth="1.5" fill={`${c}25`} /><path d="M14 17 Q14.5 14 17 13.5" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" /></MiniIcon>,
  disciplina: (c = '#141833', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.8" fill={`${c}08`} /><path d="M12 5 L12 12 L17 14" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="1.5" fill={c} /></MiniIcon>,
  amor_propio: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><path d="M12 21 C12 21 4 15 4 10 C4 7 6.5 5 9 5 C10.5 5 11.5 5.8 12 6.5 C12.5 5.8 13.5 5 15 5 C17.5 5 20 7 20 10 C20 15 12 21 12 21Z" stroke={c} strokeWidth="1.8" fill={`${c}20`} /><path d="M12 10 L12 16 M9 13 L15 13" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></MiniIcon>,
  /* ── Category icons — Board ── */
  cat_ansiedad: (c = '#726D2D', s = 20) => <MiniIcon size={s} color={c}><path d="M6 16 Q9 8 12 12 Q15 16 18 8" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" /><circle cx="12" cy="18" r="2" fill={c} opacity="0.4" /></MiniIcon>,
  cat_relaciones: (c = '#592147', s = 20) => <MiniIcon size={s} color={c}><circle cx="9" cy="10" r="3.5" stroke={c} strokeWidth="1.5" fill={`${c}15`} /><circle cx="15" cy="10" r="3.5" stroke={c} strokeWidth="1.5" fill={`${c}15`} /><path d="M5 20 Q5 15 9 15 M19 20 Q19 15 15 15" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M9 15 Q12 13 15 15" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeDasharray="2 2" /></MiniIcon>,
  cat_autoestima: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><rect x="6" y="4" width="12" height="16" rx="2" stroke={c} strokeWidth="1.5" fill={`${c}10`} /><circle cx="12" cy="11" r="3" stroke={c} strokeWidth="1.5" fill={`${c}20`} /><path d="M9 16 Q12 18 15 16" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" /></MiniIcon>,
  cat_maternidad: (c = '#D6BFDD', s = 20) => <MiniIcon size={s} color={c}><circle cx="10" cy="8" r="3" stroke={c} strokeWidth="1.5" fill={`${c}15`} /><path d="M5 19 Q5 14 10 14 Q15 14 15 19" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /><circle cx="16" cy="11" r="2" stroke={c} strokeWidth="1.3" fill={`${c}25`} /></MiniIcon>,
  cat_duelo: (c = '#141833', s = 20) => <MiniIcon size={s} color={c}><path d="M12 4 Q8 8 8 12 Q8 17 12 20 Q16 17 16 12 Q16 8 12 4Z" stroke={c} strokeWidth="1.5" fill={`${c}15`} /><path d="M10 12 L14 12" stroke={c} strokeWidth="1.2" strokeLinecap="round" /></MiniIcon>,
  cat_emprendimiento: (c = '#91946E', s = 20) => <MiniIcon size={s} color={c}><path d="M12 20 L12 8" stroke={c} strokeWidth="2" strokeLinecap="round" /><path d="M8 12 L12 8 L16 12" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 20 L18 20" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></MiniIcon>,
  cat_general: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.5" fill={`${c}10`} /><circle cx="12" cy="12" r="3" fill={c} opacity="0.3" /><circle cx="12" cy="12" r="1" fill={c} /></MiniIcon>,
  /* ── Category icons — Directorio ── */
  cat_salud_mental: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="10" r="6" stroke={c} strokeWidth="1.5" fill={`${c}10`} /><path d="M9 9 Q12 13 15 9" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M12 16 L12 20" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><path d="M9 20 L15 20" stroke={c} strokeWidth="1.3" strokeLinecap="round" /></MiniIcon>,
  cat_coaching: (c = '#592147', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.5" fill={`${c}08`} /><path d="M12 6 L12 12 L16 16" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 4 L12 6 L16 4" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" /></MiniIcon>,
  cat_yoga: (c = '#141833', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="6" r="2.5" stroke={c} strokeWidth="1.5" fill={`${c}20`} /><path d="M12 9 L12 15" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><path d="M8 12 L16 12" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><path d="M9 19 L12 15 L15 19" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></MiniIcon>,
  cat_nutricion: (c = '#91946E', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="14" r="6" stroke={c} strokeWidth="1.5" fill={`${c}15`} /><path d="M12 4 L12 8" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><path d="M9 5 Q12 7 15 5" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" /></MiniIcon>,
  cat_legal: (c = '#726D2D', s = 20) => <MiniIcon size={s} color={c}><path d="M12 3 L12 19" stroke={c} strokeWidth="1.8" strokeLinecap="round" /><path d="M6 7 L18 7" stroke={c} strokeWidth="1.8" strokeLinecap="round" /><path d="M6 7 L4 13 Q6 15 8 13 L6 7Z" fill={`${c}20`} stroke={c} strokeWidth="1.2" /><path d="M18 7 L16 13 Q18 15 20 13 L18 7Z" fill={`${c}20`} stroke={c} strokeWidth="1.2" /><path d="M8 20 L16 20" stroke={c} strokeWidth="1.8" strokeLinecap="round" /></MiniIcon>,
  cat_belleza: (c = '#D6BFDD', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="10" r="5" stroke={c} strokeWidth="1.5" fill={`${c}15`} /><path d="M9 10 Q12 14 15 10" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M8 17 Q12 20 16 17" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /></MiniIcon>,
  cat_negocios: (c = '#141833', s = 20) => <MiniIcon size={s} color={c}><rect x="5" y="8" width="14" height="10" rx="2" stroke={c} strokeWidth="1.5" fill={`${c}10`} /><path d="M9 8 L9 6 Q9 4 12 4 Q15 4 15 6 L15 8" stroke={c} strokeWidth="1.5" fill="none" /><path d="M5 12 L19 12" stroke={c} strokeWidth="1" opacity="0.3" /></MiniIcon>,
  cat_educacion: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><path d="M12 4 L4 9 L12 14 L20 9 Z" stroke={c} strokeWidth="1.5" fill={`${c}15`} /><path d="M7 11 L7 17 Q12 20 17 17 L17 11" stroke={c} strokeWidth="1.5" fill="none" /><path d="M20 9 L20 15" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></MiniIcon>,
  /* ── Category icons — Toolkit ── */
  cat_podcast: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><rect x="9" y="4" width="6" height="9" rx="3" stroke={c} strokeWidth="1.5" fill={`${c}15`} /><path d="M6 11 Q6 16 12 16 Q18 16 18 11" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M12 16 L12 19 M9 19 L15 19" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></MiniIcon>,
  cat_libro: (c = '#726D2D', s = 20) => <MiniIcon size={s} color={c}><path d="M4 4 L4 18 Q8 16 12 18 Q16 16 20 18 L20 4 Q16 6 12 4 Q8 6 4 4Z" stroke={c} strokeWidth="1.5" fill={`${c}12`} /><path d="M12 4 L12 18" stroke={c} strokeWidth="1" /></MiniIcon>,
  cat_curso: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="7" r="4" stroke={c} strokeWidth="1.5" fill={`${c}15`} /><path d="M12 11 L12 16" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><path d="M8 20 L12 17 L16 20" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></MiniIcon>,
  cat_tedtalk: (c = '#4F4B1E', s = 20) => <MiniIcon size={s} color={c}><rect x="4" y="5" width="16" height="11" rx="2" stroke={c} strokeWidth="1.5" fill={`${c}12`} /><polygon points="10,8 10,13 15,10.5" fill={c} opacity="0.7" /><path d="M8 19 L16 19" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></MiniIcon>,
  cat_musica: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><circle cx="8" cy="17" r="3" stroke={c} strokeWidth="1.5" fill={`${c}20`} /><path d="M11 17 L11 5 L19 3 L19 14" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /><circle cx="16" cy="14" r="3" stroke={c} strokeWidth="1.5" fill={`${c}20`} /></MiniIcon>,
  cat_masterclass: (c = '#726D2D', s = 20) => <MiniIcon size={s} color={c}><path d="M12 3 L14 8 L19 9 L15 13 L16 18 L12 15 L8 18 L9 13 L5 9 L10 8Z" stroke={c} strokeWidth="1.5" fill={`${c}15`} /></MiniIcon>,
  cat_wellness: (c = '#3E1631', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="6" r="2.5" stroke={c} strokeWidth="1.5" fill={`${c}20`} /><path d="M12 9 L12 14" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><path d="M7 11 L17 11" stroke={c} strokeWidth="1.5" strokeLinecap="round" /><path d="M8 19 L12 14 L16 19" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" /></MiniIcon>,
  cat_otro: (c = '#63677D', s = 20) => <MiniIcon size={s} color={c}><circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.5" fill={`${c}08`} /><path d="M8 12 L16 12 M12 8 L12 16" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></MiniIcon>,
}
