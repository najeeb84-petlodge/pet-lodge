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
  const [loading, setLoading] = useState(false) // Start false — we read from localStorage instantly

  const signOut = async () => {
    await supabase.auth.signOut()
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
