/* HistoriaView — la historia de la fundadora (Diana Silva).
   Primera vista extraída del monolito App.jsx hacia components/views/.
   Patrón: la vista recibe por props solo el estado que usa
   (aquí showFullStory + su setter); todo lo demás son tokens. */
import { C } from '../../constants/colors'
import { FONT, RADIUS, SHADOW } from '../../constants/tokens'

export default function HistoriaView({ showFullStory, setShowFullStory }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.card, borderRadius: RADIUS.xl, padding: 24, boxShadow: SHADOW.md, border: `1px solid ${C.roseLight}` }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: FONT, lineHeight: 1.3, marginBottom: 16 }}>
          "Soy el puente de miles de mujeres"
        </div>
        <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
          Ronda nació de las mujeres que me formaron. Mis dos abuelas quedaron viudas muy jóvenes y sacaron adelante familias enteras con las manos y con el alma. Crecí rodeada de mujeres poderosas — tías, primas, amigas — que se reinventaban una y otra vez sin pedir permiso.
        </div>
        <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
          Yo también he tenido muchas vidas. Me divorcié a los 25 con tres maletas y a echar pa'lante. Me fui pa' Nueva York sin diploma, me gradué magna cum laude, me devolví pa' Colombia. Y cada vez que me caí, me levanté — pero nunca sola. Siempre hubo una mujer del otro lado tendiéndome la mano.
        </div>
        <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14, fontWeight: 600 }}>
          Cada mujer que Dios me ha puesto en el camino me ha enseñado algo. Y sé que a ti también te ha pasado: alguien te sostuvo cuando no podías más.
        </div>
        {showFullStory && <>
          <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
            Vivo con TLP desde los 16 años. Pasé por malos diagnósticos, por depresión. Hasta que llegué al DBT y eso me cambió la vida. Me certifiqué como profesora de yoga. Me fui 35 días a Grecia con 20 mujeres. En ese camino vi el potencial: mujeres creciendo juntas. Eso tenía que ser una plataforma.
          </div>
          <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
            Yo también he escogido mal. He tomado malas decisiones. Me paro firme con ellas hoy. He sido personajes de mujeres de las que no me he sentido orgullosa. Pero las lecciones que me dejaron esas mujeres que me rodean — mis abuelas, mis maestras, mis amigas — esas me han sostenido.
          </div>
          <div style={{ fontSize: 19, color: C.text, lineHeight: 1.8, marginBottom: 14 }}>
            En los momentos de crisis buscaba apoyo y la psicóloga tenía citas — no estaba disponible. Pensé: ¿cómo tengo a alguien ahí cuando lo necesito? Alguien que conteste del otro lado. No importa de dónde, pero que esté ahí.
          </div>
          <div style={{ fontSize: 19, color: C.rose, lineHeight: 1.8, fontWeight: 600, fontStyle: 'italic', marginBottom: 14 }}>
            Ronda es mi forma de devolver todo lo que recibí. No es mi historia — es la historia de todas las mujeres que me construyeron. Y yo solo quiero ser puente para que tú también tengas esa red, esas herramientas, esa ronda de mujeres que te acompaña.
          </div>
        </>}
        <button onClick={() => setShowFullStory(!showFullStory)} style={{
          background: 'none', border: 'none', color: C.rose, fontSize: 19, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', padding: 0,
        }}>
          {showFullStory ? 'Leer menos ↑' : 'Leer la historia completa →'}
        </button>
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: `${C.teal}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 700,
          }}>D</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>Diana Silva</div>
            <div style={{ fontSize: 19, color: C.muted }}>Fundadora de Ronda · Puente de miles de mujeres</div>
          </div>
        </div>
      </div>
    </div>
  )
}
