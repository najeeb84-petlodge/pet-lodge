import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

function getSessionFromStorage() {
  try {
    const raw = localStorage.getItem('sb-qcwbkpcwtxpokgseethp-auth-token')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const user = parsed.user || parsed?.currentSession?.user
    if (!user) return null
    return {
      user,
      role: user?.user_metadata?.role ?? 'customer',
      full_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim()
        || user?.user_metadata?.full_name
        || user?.email?.split('@')[0]
        || 'User',
    }
  } catch { return null }
}

export function AuthProvider({ children }) {
  const stored = getSessionFromStorage()
  const [user, setUser]     = useState(stored?.user ?? null)
  const [profile, setProfile] = useState(stored ? {
    id: stored.user.id,
    email: stored.user.email,
    role: stored.role,
    full_name: stored.full_name,
  } : null)
  const [loading, setLoading] = useState(false)

  // Keep profile.role in sync with the profiles table (authoritative source)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, email, role, first_name, last_name')
          .eq('id', session.user.id)
          .single()
        if (prof) {
          setUser(session.user)
          setProfile({
            id: prof.id,
            email: prof.email,
            role: prof.role ?? 'customer',
            full_name: `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || session.user.email.split('@')[0] || 'User',
          })
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try { await supabase.auth.signOut() } catch { /* ignore — clear locally regardless */ }
    localStorage.removeItem('sb-qcwbkpcwtxpokgseethp-auth-token')
    setUser(null)
    setProfile(null)
  }

  const isAdmin    = ['admin','super_admin'].includes(profile?.role)
  const isEmployee = profile?.role === 'employee'
  const isStaff    = isAdmin || isEmployee

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, isAdmin, isEmployee, isStaff }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
