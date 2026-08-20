/* FrasesView — frase del día, filtros por categoría y lista de frases.
   Segunda vista extraída del monolito App.jsx hacia components/views/.
   Patrón: la vista importa su propio contenido (QUOTES, CATS, CAT_LABELS)
   y recibe por props solo el estado que vive en App (filtro, favoritos,
   frase del día); el filtrado se calcula aquí, no en el monolito. */
import { QUOTES, CATS, CAT_LABELS } from '../../constants/data'
import { C } from '../../constants/colors'

export default function FrasesView({ quote, quoteFilter, setQuoteFilter, favQuotes, toggleFavQuote }) {
  const filteredQuotes = quoteFilter === 'todas' ? QUOTES : QUOTES.filter(q => q.cat === quoteFilter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Quote of the day */}
      <div style={{ background: 'linear-gradient(135deg, #C6A94E, #E8D5A8)', borderRadius: 18, padding: 22, color: 'white' }}>
        <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: 8 }}>Frase del día</div>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5, fontStyle: 'italic' }}>"{quote.text}"</div>
        <div style={{ fontSize: 20, marginTop: 10, opacity: 0.85 }}>— {quote.author}</div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {CATS.map(cat => (
          <button key={cat} onClick={() => setQuoteFilter(cat)} style={{
            padding: '6px 14px', borderRadius: 20, border: `2px solid ${quoteFilter === cat ? C.rose : C.border}`,
            background: quoteFilter === cat ? C.rose : C.card, color: quoteFilter === cat ? 'white' : C.muted,
            fontSize: 19, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>
            {CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Quotes list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredQuotes.map((q, idx) => {
          const globalIdx = QUOTES.indexOf(q)
          const isFav = favQuotes.includes(globalIdx)
          const isDiana = q.author === 'Diana'
          return (
            <div key={idx} style={{
              background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              borderLeft: isDiana ? `3px solid ${C.rose}` : `3px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 19, color: C.text, lineHeight: 1.6, fontStyle: 'italic' }}>"{q.text}"</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 19, color: isDiana ? C.rose : C.muted, fontWeight: 600 }}>— {q.author}</span>
                  <span style={{ fontSize: 20, background: C.beige, padding: '2px 8px', borderRadius: 20, color: C.muted, fontWeight: 600 }}>
                    {CAT_LABELS[q.cat] || q.cat}
                  </span>
                </div>
                <button onClick={() => toggleFavQuote(globalIdx)} style={{
                  background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4,
                }}>
                  {isFav ? '❤️' : '🤍'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
