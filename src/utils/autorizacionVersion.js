/* La versión vigente de los textos de autorización (ronda-hq/06-legal-y-datos/
   textos-autorizacion-v1.md). Una sola fuente para la app
   (src/lib/autorizaciones.js) y el servidor (api/_auth.js): si cambian las
   palabras de una casilla, sube aquí y la app vuelve a preguntar, y el
   servidor deja de aceptar el «sí» de la versión anterior. Sin dependencias
   de navegador ni de Node. */
export const VERSION_AUTORIZACIONES = 'v1'
export const VERSION_POLITICA = `politica-${VERSION_AUTORIZACIONES}`
