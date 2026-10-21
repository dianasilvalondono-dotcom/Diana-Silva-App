/* La voz de Tu Ronda (ElevenLabs) queda apagada en esta versión (21-oct-2026,
   ronda-hq/06-legal-y-datos/textos-autorizacion-v1.md, P6). Una sola fuente
   para la app (src/lib/useSpeech.js) y el servidor (api/speak.js): con
   VOZ_ACTIVA = false la app no muestra «Escuchar» ni llama a /api/speak, y
   api/speak responde 503 antes de todo, sin llamar a ElevenLabs aunque exista
   la llave. Así ElevenLabs no recibe nada nuevo.
   Antes de prenderla: lo que pide la P6 (que ElevenLabs confirme por escrito
   que no entrena con el texto, historial apagado, su acuerdo de datos
   archivado), la política actualizada con aviso previo y la autorización de la
   IA pedida otra vez con la nueva redacción. Sin dependencias de navegador ni
   de Node. */
export const VOZ_ACTIVA = false
