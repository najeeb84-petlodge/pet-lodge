import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../lib/supabase'

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
  const [user, setUser]       = useState(stored?.user ?? null)
  const [profile, setProfile] = useState(stored ? {
    id:        stored.user.id,
    email:     stored.user.email,
    role:      stored.role,      // stale fallback — overwritten below immediately
    full_name: stored.full_name,
  } : null)
  const [loading, setLoading] = useState(false)

  // On mount: fetch current role from profiles table via REST (user_metadata.role is stale)
  useEffect(() => {
    const s = getSessionFromStorage()
    if (!s?.user?.id) return
    const userId = s.user.id
    const token  = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role,first_name,last_name,email`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
    )
      .then(r => r.json())
      .then(data => {
        const prof = Array.isArray(data) ? data[0] : null
        if (!prof) return
        setProfile(p => p ? {
          ...p,
          role:      prof.role ?? 'customer',
          full_name: `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || p.email?.split('@')[0] || 'User',
        } : null)
      })
      .catch(() => {})
  }, [])

  // Keep in sync on subsequent auth events (login, token refresh)
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
            id:        prof.id,
            email:     prof.email,
            role:      prof.role ?? 'customer',
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

  const signOut = () => {
    localStorage.removeItem('sb-qcwbkpcwtxpokgseethp-auth-token')
    setUser(null)
    setProfile(null)
    window.location.href = '/'
  }

  async function signUp(email, password, fullName) {
    const nameParts  = (fullName || '').trim().split(/\s+/)
    const first_name = nameParts[0] || ''
    const last_name  = nameParts.slice(1).join(' ') || ''

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, first_name, last_name } },
    })
    if (error) return { error }

    // Create the profile row with role = 'customer'
    const userId = data?.user?.id
    if (userId) {
      const token = data?.session?.access_token || getAccessToken()
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          apikey:         SUPABASE_KEY,
          Authorization:  `Bearer ${token || SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer:         'return=minimal',
        },
        body: JSON.stringify({
          id:         userId,
          email,
          first_name,
          last_name,
          role:       'customer',
        }),
      })
      if (!res.ok) console.warn('[signUp] profile insert failed:', res.status, await res.text())
    }

    return { data, error: null }
  }

  const isAdmin    = ['admin', 'super_admin'].includes(profile?.role)
  const isEmployee = profile?.role === 'employee'
  const isStaff    = isAdmin || isEmployee

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signOut, isAdmin, isEmployee, isStaff }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
