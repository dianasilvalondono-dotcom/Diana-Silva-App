import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { signInWithGoogle, signInWithEmail, signUp as authSignUp, signOut as authSignOut, resetPassword, updatePassword } from './auth'

export function useAuth() {
  const [user, setUser] = useState(null)
  // Si no hay Supabase configurado no hay nada que cargar: el estado
  // inicial ya es el definitivo y el efecto no necesita tocarlo.
  const [loading, setLoading] = useState(Boolean(supabase))
  // Entró desde el enlace de "¿Olvidaste tu contraseña?": tiene sesión, pero
  // antes de seguir crea su contraseña nueva (bienvenida-12).
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    if (!supabase) return

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      else if (event === 'SIGNED_OUT') setRecovering(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    loading,
    isConfigured: !!supabase,
    signInWithGoogle,
    signInWithEmail: (email, pw) => signInWithEmail(email, pw),
    signUp: (email, pw, name, extra) => authSignUp(email, pw, name, extra),
    signOut: authSignOut,
    resetPassword,
    updatePassword,
    recovering,
    clearRecovering: () => setRecovering(false),
  }
}
