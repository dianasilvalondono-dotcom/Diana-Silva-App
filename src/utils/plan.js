/* Quién tiene Ronda+. La misma regla en la app (isPremium en src/App.jsx) y
   en el servidor (exigirRondaPlus en api/_auth.js): si se cambia aquí,
   cambia en los dos. Sin dependencias de navegador ni de Node. */

// Administradora: ve todo, sin paywall.
export const ADMIN_EMAILS = ['dianasilva.londono@gmail.com']
export const esAdmin = (email) => typeof email === 'string' && ADMIN_EMAILS.includes(email.toLowerCase())

// Fundadoras y suscriptoras: profiles.is_premium con premium_until vigente.
export const rondaPlusVigente = (perfil, ahora = new Date()) =>
  !!(perfil?.is_premium && perfil.premium_until && new Date(perfil.premium_until) > ahora)

// Hasta cuándo tiene Ronda+, como se le dice a ella: en hora de Colombia.
// premium_until es el fin del día en Colombia (23:59:59): el 31-mar-2027 se
// guarda como 2027-04-01 04:59:59+00, y en UTC se vería «1 de abril de 2027».
// Regla desde el 21-oct-2026: toda premium_until se escribe como fin del día
// en Colombia (src/sql/reabrir-ronda-plus.sql).
export const fechaRondaPlusTexto = (fecha) => {
  const d = fecha instanceof Date ? fecha : new Date(fecha)
  return fecha && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' })
    : ''
}
