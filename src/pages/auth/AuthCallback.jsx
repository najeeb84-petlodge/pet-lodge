import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const SUPABASE_URL = 'https://qcwbkpcwtxpokgseethp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd2JrcGN3dHhwb2tnc2VldGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDA1MDMsImV4cCI6MjA4OTkxNjUwM30.8kV-I-9skyBk8wlELT3Ft6j2iBCOtKuoYF7wXbcMZFU'
const LS_KEY = 'sb-qcwbkpcwtxpokgseethp-auth-token'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    async function handleCallback() {
      // Supabase puts tokens in the URL hash after OAuth / magic link redirect
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
      const params = new URLSearchParams(hash)

      const accessToken  = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const expiresIn    = params.get('expires_in')
      const tokenType    = params.get('token_type')

      if (!accessToken) {
        // No token in hash — check if there's already a valid session
        const stored = localStorage.getItem(LS_KEY)
        if (stored) {
          try {
            const session = JSON.parse(stored)
            if (session?.access_token) {
              await redirectByProfile(session.access_token, session.user?.id, session.user?.email, navigate)
              return
            }
          } catch { /* fall through */ }
        }
        navigate('/login')
        return
      }

      // Verify the token and get the confirmed user object from Supabase
      let userId    = null
      let userEmail = null
      try {
        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            apikey:        SUPABASE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        })
        if (userRes.ok) {
          const userData = await userRes.json()
          userId    = userData.id
          userEmail = userData.email
        }
      } catch { /* fall back to JWT decode below */ }

      // Fallback: decode from JWT payload if /auth/v1/user failed
      if (!userId) {
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          userId    = payload.sub
          userEmail = payload.email
        } catch { /* non-fatal */ }
      }

      // Store session in localStorage — exact format expected by Supabase JS client + getAccessToken()
      const session = {
        access_token:  accessToken,
        refresh_token: refreshToken,
        expires_in:    parseInt(expiresIn || '3600', 10),
        token_type:    'bearer',
        user:          { id: userId, email: userEmail },
      }
      localStorage.setItem(LS_KEY, JSON.stringify(session))
      console.log('[AuthCallback] session stored:', session)

      // Clear the hash so tokens don't linger in browser history
      history.replaceState(null, '', window.location.pathname + window.location.search)

      await redirectByProfile(accessToken, userId, userEmail, navigate)
    }

    handleCallback()
  }, [])

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f9f6' }}>
      <div style={{ textAlign:'center' }}>
        <img
          src="/logo.jpg"
          alt="Pet Lodge"
          style={{ width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover', margin:'0 auto 1.5rem', border:'3px solid #c6dba0', display:'block' }}
        />
        <div style={{
          width:'32px', height:'32px',
          border:'3px solid #7aa63c', borderTopColor:'transparent',
          borderRadius:'50%', animation:'cb-spin 0.8s linear infinite',
          margin:'0 auto 1rem',
        }}/>
        <p style={{ color:'#2d3a1e', fontWeight:'600', marginBottom:'0.25rem' }}>Signing you in…</p>
        <p style={{ color:'#7a8c6e', fontSize:'0.875rem' }}>Just a moment</p>
      </div>
      <style>{`@keyframes cb-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

async function redirectByProfile(accessToken, userId, userEmail, navigate) {
  const headers = {
    apikey:          SUPABASE_KEY,
    Authorization:   `Bearer ${accessToken}`,
    'Content-Type':  'application/json',
  }

  try {
    // Look up profile by email — works regardless of which auth user id Supabase assigned
    if (userEmail) {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(userEmail)}&select=id,role`,
        { headers }
      )
      const rows = await res.json()

      if (Array.isArray(rows) && rows.length > 0) {
        const profile = rows[0]

        // If the stored profile id doesn't match the current auth user id, sync it
        if (userId && profile.id !== userId) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(userEmail)}`,
            {
              method:  'PATCH',
              headers: { ...headers, Prefer: 'return=minimal' },
              body:    JSON.stringify({ id: userId }),
            }
          )
        }

        const { role } = profile
        if (role === 'admin' || role === 'super_admin' || role === 'employee') {
          navigate('/admin/dashboard')
        } else {
          navigate('/dashboard')
        }
        return
      }
    }

    // No profile found by email — create a new customer profile
    if (userId && userEmail) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/profiles`,
        {
          method:  'POST',
          headers: { ...headers, Prefer: 'return=minimal' },
          body:    JSON.stringify({ id: userId, email: userEmail, role: 'customer' }),
        }
      )
    }

    navigate('/dashboard')
  } catch {
    navigate('/dashboard')
  }
}
