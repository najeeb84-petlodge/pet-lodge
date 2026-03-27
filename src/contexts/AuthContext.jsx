import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Just get the session - no profile fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        // Build profile from user metadata only - no DB call
        setProfile({
          id: session.user.id,
          role: session.user.user_metadata?.role ?? 'customer',
          full_name: session.user.user_metadata?.full_name
            || session.user.user_metadata?.name
            || session.user.email?.split('@')[0]
            || 'User',
          email: session.user.email,
        })
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setProfile({
          id: session.user.id,
          role: session.user.user_metadata?.role ?? 'customer',
          full_name: session.user.user_metadata?.full_name
            || session.user.user_metadata?.name
            || session.user.email?.split('@')[0]
            || 'User',
          email: session.user.email,
        })
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => supabase.auth.signOut()
  const isAdmin    = profile?.role === 'admin'
  const isEmployee = profile?.role === 'employee'
  const isStaff    = isAdmin || isEmployee

  return (
    <AuthContext.Provider value={{
      user, profile, loading, signOut,
      isAdmin, isEmployee, isStaff,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
