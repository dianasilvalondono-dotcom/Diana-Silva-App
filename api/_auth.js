/* Quién llama. Los endpoints de IA y voz gastan créditos pagos (Claude y
   ElevenLabs): solo responden a una usuaria con sesión de Supabase. La app
   manda el token de su sesión como "Authorization: Bearer <token>" (ver
   apiHeaders en src/lib/supabase.js).
   El guion bajo del nombre hace que Vercel no lo publique como endpoint. */

// Pregunta a Supabase de quién es el token. null si no hay token, si no es
// válido o si el servidor no tiene configurado Supabase.
export async function usuariaDeLaSesion(req) {
  const auth = req.headers?.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return null

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    console.error('api/_auth: falta SUPABASE_URL o SUPABASE_ANON_KEY; no se puede verificar la sesión')
    return null
  }

  try {
    const resp = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) return null
    const user = await resp.json()
    return user?.id ? user : null
  } catch {
    return null
  }
}

// Corta la petición con 401 si no hay una usuaria con sesión. Devuelve la
// usuaria, o null cuando ya respondió.
export async function exigirSesion(req, res) {
  const user = await usuariaDeLaSesion(req)
  if (!user) {
    res.status(401).json({ error: 'Inicia sesión para usar esta función.' })
    return null
  }
  return user
}
