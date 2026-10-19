import { useEffect, useRef } from 'react'

/* Comportamiento de teclado de un diálogo modal:
   - al abrirse, el foco entra al diálogo: al elemento con data-autofocus o,
     si no hay, al propio diálogo (así no se abre el teclado del celular);
   - Tab y Shift+Tab no salen del diálogo;
   - Escape llama a onCerrar;
   - al cerrarse, el foco vuelve a donde estaba (el botón que lo abrió).
   Con varios diálogos abiertos, solo el de encima (el último) atiende el
   teclado. */

const ENFOCABLES = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

const abiertos = []

export function useDialog(ref, abierto, onCerrar) {
  const cerrarRef = useRef(onCerrar)
  useEffect(() => { cerrarRef.current = onCerrar })

  useEffect(() => {
    if (!abierto) return
    const dialogo = ref.current
    if (!dialogo) return
    const previo = document.activeElement
    const yo = {}
    abiertos.push(yo)

    const enfocables = () => [...dialogo.querySelectorAll(ENFOCABLES)].filter(el => el.getClientRects().length > 0)
    const inicial = dialogo.querySelector('[data-autofocus]') || dialogo
    if (inicial === dialogo && !dialogo.hasAttribute('tabindex')) dialogo.setAttribute('tabindex', '-1')
    inicial.focus({ preventScroll: true })

    const alTeclear = (e) => {
      if (abiertos[abiertos.length - 1] !== yo) return
      if (e.key === 'Escape') {
        if (!cerrarRef.current) return
        e.preventDefault()
        e.stopPropagation()
        cerrarRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const lista = enfocables()
      if (!lista.length) { e.preventDefault(); return }
      const primero = lista[0]
      const ultimo = lista[lista.length - 1]
      const actual = document.activeElement
      if (!dialogo.contains(actual) || actual === dialogo) {
        e.preventDefault()
        ;(e.shiftKey ? ultimo : primero).focus()
      } else if (e.shiftKey && actual === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && actual === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
    // En captura: llega antes que los atajos de lo que queda debajo (por
    // ejemplo la hoja de un plan, que también se cierra con Escape).
    window.addEventListener('keydown', alTeclear, true)
    return () => {
      window.removeEventListener('keydown', alTeclear, true)
      const i = abiertos.indexOf(yo)
      if (i !== -1) abiertos.splice(i, 1)
      if (previo && previo.isConnected && typeof previo.focus === 'function') previo.focus({ preventScroll: true })
    }
  }, [abierto, ref])
}
