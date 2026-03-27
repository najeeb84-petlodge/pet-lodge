import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone, role')
        .eq('id', userId)
        .single()
      if (!error && data) {
        setProfile({
          ...data,
          full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim()
        })
      } else {
        setProfile({ id: userId, role: 'customer', full_name: 'User' })
      }
    } catch (e) {
      setProfile({ id: userId, role: 'customer', full_name: 'User' })
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password, firstName, lastName) =>
    supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName } },
    })

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

  const signInWithMagicLink = (email) =>
    supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

  const signOut = () => supabase.auth.signOut()

  const isAdmin    = profile?.role === 'admin'
  const isEmployee = profile?.role === 'employee'
  const isStaff    = isAdmin || isEmployee

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signUp, signInWithGoogle, signInWithMagicLink, signOut,
      isAdmin, isEmployee, isStaff,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
