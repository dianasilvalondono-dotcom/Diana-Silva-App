/* La última entrada del diario que lee Tu Ronda (si autorizó la IA), como
   dicen la casilla de la IA y la política: solo el diario. Los check-ins de
   la mañana y de la noche también se guardan como entradas (type 'morning'
   y 'night'), y se quedan fuera. Las entradas nuevas van siempre al
   principio de la lista. */
export function ultimaEntradaDiario(entries) {
  if (!Array.isArray(entries)) return null
  const entrada = entries.find(e => e && typeof e === 'object' && e.type !== 'morning' && e.type !== 'night')
  return typeof entrada?.text === 'string' && entrada.text ? entrada.text : null
}
