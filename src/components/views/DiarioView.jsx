/* DiarioView — check-in de ánimo, dictado por voz, recomendaciones según
   el ánimo e histórico de entradas agrupado por fecha.
   Tercera vista extraída del monolito App.jsx hacia components/views/.
   Patrón: la vista importa sus propias constantes (MOOD_RECS, iconos,
   labels de ánimo) y recibe por props solo el estado y las acciones que
   viven en App (texto, ánimo, grabación, entradas, arranque de programa).
   Los emojis de dictado (🎙️ ⏹️ 🔴) quedan reemplazados por UI_ICONS. */
import { C } from '../../constants/colors'
import { SHADOW } from '../../constants/tokens'
import { ICONS, MOOD_ICONS, UI_ICONS } from '../../constants/icons'
import { MOOD_RECS } from '../../constants/data'
import { todayKey, MOOD_LABELS, MOOD_COLORS } from '../../utils/helpers'

export default function DiarioView({
  journalMood, setJournalMood,
  journalText, setJournalText,
  isListening, toggleVoiceInput,
  addJournalEntry, entries,
  startProgram, openModule,
}) {
  const rec = MOOD_RECS[journalMood]

  const grouped = {}
  entries.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = []
    grouped[e.date].push(e)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* New entry */}
      <div style={{ background: C.card, borderRadius: 18, padding: 18, boxShadow: SHADOW.sm }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: C.text }}>¿Cómo te sientes hoy?</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'center' }}>
          {MOOD_ICONS.map((icon, i) => (
            <button key={i} onClick={() => setJournalMood(i)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'all 0.15s', transform: journalMood === i ? 'scale(1.2)' : 'scale(1)', padding: 4,
            }}>
              {icon(36, journalMood === i)}
              <div style={{ fontSize: 19, fontWeight: 700, color: MOOD_COLORS[i], marginTop: 2 }}>{MOOD_LABELS[i]}</div>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <textarea value={journalText} onChange={e => setJournalText(e.target.value)}
            placeholder={isListening ? 'Escuchando... habla y tu voz se convierte en texto' : 'Escribe o habla tu reflexión del día...'}
            style={{
              width: '100%', minHeight: 100, padding: '14px 50px 14px 14px', borderRadius: 12,
              border: `1px solid ${isListening ? C.coral : C.border}`,
              fontSize: 19, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6,
              boxSizing: 'border-box', background: isListening ? '#FFF5F3' : C.cream,
              transition: 'border-color 0.2s, background 0.2s',
            }}
          />
          <button onClick={toggleVoiceInput}
            aria-label={isListening ? 'Detener dictado' : 'Dictar por voz'}
            style={{
              position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: '50%',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isListening ? C.coral : C.mintLight,
              color: isListening ? 'white' : C.teal,
              transition: 'all 0.2s',
              animation: isListening ? 'pulse 1.5s infinite' : 'none',
            }}>
            {isListening ? UI_ICONS.stop('currentColor', 18) : UI_ICONS.mic('currentColor', 18)}
          </button>
        </div>
        {isListening && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 13, color: C.coral, fontWeight: 600, marginTop: 4,
          }}>
            {UI_ICONS.rec(C.coral, 10)}
            <span>Grabando voz... toca el cuadrado para parar</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={addJournalEntry} disabled={!journalText.trim()} style={{
            flex: 1, padding: 12, borderRadius: 12, border: 'none',
            background: journalText.trim() ? C.teal : C.border,
            color: journalText.trim() ? 'white' : C.subtle,
            fontSize: 19, fontWeight: 700, cursor: journalText.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
          }}>
            Guardar reflexión
          </button>
        </div>
      </div>

      {/* ── Mood Recommendations ── */}
      {rec && (
        <div style={{ background: C.card, borderRadius: 18, padding: 18, boxShadow: SHADOW.sm, border: `2px solid ${rec.color}20` }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: rec.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            {MOOD_LABELS[journalMood]} — {rec.label}
          </div>
          <div style={{ fontSize: 19, color: C.muted, marginBottom: 14 }}>Basado en cómo te sientes, te recomendamos:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rec.items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: C.cream, borderRadius: 12, border: `1px solid ${C.border}`,
              }}>
                {ICONS[item.type] ? ICONS[item.type](rec.color, 22) : <span style={{ fontSize: 22, flexShrink: 0 }}>{item.emoji}</span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{item.title}</div>
                  <div style={{ fontSize: 19, color: C.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{item.type}</div>
                </div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: 20, color: rec.color, fontWeight: 700, textDecoration: 'none',
                    padding: '4px 10px', borderRadius: 20, border: `1px solid ${rec.color}40`,
                    flexShrink: 0,
                  }}>Abrir</a>
                )}
              </div>
            ))}
          </div>
          {rec.programa && (
            <button onClick={() => { startProgram(rec.programa); openModule('crecer', 'programas', { silent: true }) }} style={{
              marginTop: 12, width: '100%', padding: 12, borderRadius: 12, border: `2px solid ${rec.color}`,
              background: 'transparent', color: rec.color, fontSize: 20, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Ver programa paso a paso →
            </button>
          )}
        </div>
      )}

      {/* Entries grouped by date */}
      {entries.length > 0 && (
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tu histórico ({entries.length} {entries.length === 1 ? 'entrada' : 'entradas'})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(grouped).map(([date, dayEntries]) => (
              <div key={date}>
                <div style={{ fontSize: 19, fontWeight: 700, color: C.rose, marginBottom: 6 }}>{date === todayKey() ? 'Hoy' : date}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayEntries.map(e => (
                    <div key={e.id} style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 19, fontWeight: 700, color: C.muted }}>{e.time}</span>
                        {MOOD_ICONS[e.mood] ? MOOD_ICONS[e.mood](22, true) : <span style={{ fontSize: 20, fontWeight: 700, color: MOOD_COLORS[e.mood] }}>{MOOD_LABELS[e.mood]}</span>}
                      </div>
                      <div style={{ fontSize: 19, color: C.text, lineHeight: 1.6 }}>{e.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: C.subtle }}>
          <div style={{ fontSize: 36, marginBottom: 10, color: C.lavanda, opacity: 0.4 }}>●</div>
          <div style={{ fontSize: 19, fontWeight: 600 }}>Tu diario está vacío</div>
          <div style={{ fontSize: 20, marginTop: 4 }}>Escribe tu primera reflexión arriba</div>
        </div>
      )}
    </div>
  )
}
