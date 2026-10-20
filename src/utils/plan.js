/* Quién tiene Ronda+. La misma regla en la app (isPremium en src/App.jsx) y
   en el servidor (exigirRondaPlus en api/_auth.js): si se cambia aquí,
   cambia en los dos. Sin dependencias de navegador ni de Node. */

// Administradora: ve todo, sin paywall.
export const ADMIN_EMAILS = ['dianasilva.londono@gmail.com']
export const esAdmin = (email) => typeof email === 'string' && ADMIN_EMAILS.includes(email.toLowerCase())

// Fundadoras y suscriptoras: profiles.is_premium con premium_until vigente.
export const rondaPlusVigente = (perfil, ahora = new Date()) =>
  !!(perfil?.is_premium && perfil.premium_until && new Date(perfil.premium_until) > ahora)
