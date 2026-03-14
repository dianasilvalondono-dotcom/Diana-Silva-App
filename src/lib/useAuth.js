import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { signInWithGoogle, signInWithEmail, signUp as authSignUp, signOut as authSignOut } from './auth'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

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
