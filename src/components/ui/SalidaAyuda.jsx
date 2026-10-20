/* SalidaAyuda — la salida a Ayuda y a las líneas.
   Para cuando lo que ella escribió no recibe respuesta: el aviso de pago de la
   Comunidad, el aviso de que la Guía IA no pudo responder (error, sin red,
   tiempo agotado o el 403 de Ronda+, que trae este mismo texto en `ayuda`) y
   la tarjeta que pide la autorización de la IA (TarjetaIA: ahí llega también
   quien escribió algo y recibió el 403 de la IA). Lo que escribió puede ser
   una crisis dicha de una forma que isCrisis no reconoce, y sin respuesta
   tampoco la ve el modelo. onAbrir abre Ayuda como ante una crisis ("No
   estás sola." y el 123, no "Estás a salvo."). */
import { C } from '../../constants/colors'
import { BOTON_AYUDA } from '../../utils/crisis'

export default function SalidaAyuda({ onAbrir, style }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 14,
      border: `1px solid ${C.border}`, background: 'white', textAlign: 'center',
      ...style,
    }}>
      <div style={{ fontSize: 16, color: C.text, lineHeight: 1.5 }}>
        Si estás pasando por un momento difícil, abre {BOTON_AYUDA} o llama a la{' '}
        <a href="tel:106" style={{ color: C.text, fontWeight: 800 }}>Línea 106</a> (gratuita y confidencial).
        Si estás en peligro inmediato, llama al <a href="tel:123" style={{ color: C.text, fontWeight: 800 }}>123</a>.
      </div>
      <button type="button" onClick={onAbrir} style={{
        marginTop: 10, minHeight: 44, padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
        border: `2px solid ${C.lavanda}`, background: 'white', color: C.lavanda,
        fontSize: 17, fontWeight: 700, fontFamily: 'inherit', width: '100%',
      }}>Abrir {BOTON_AYUDA}</button>
    </div>
  )
}
