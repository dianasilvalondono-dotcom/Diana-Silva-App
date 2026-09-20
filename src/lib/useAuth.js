import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { signInWithGoogle, signInWithEmail, signUp as authSignUp, signOut as authSignOut } from './auth'

export function useAuth() {
  const [user, setUser] = useState(null)
  // Si no hay Supabase configurado no hay nada que cargar: el estado
  // inicial ya es el definitivo y el efecto no necesita tocarlo.
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    loading,
    isConfigured: !!supabase,
    signInWithGoogle,
    signInWithEmail: (email, pw) => signInWithEmail(email, pw),
    signUp: (email, pw, name) => authSignUp(email, pw, name),
    signOut: authSignOut,
  }
}
