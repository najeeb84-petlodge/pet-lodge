import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function SetPassword() {
  const navigate = useNavigate()

  const [accessToken, setAccessToken] = useState(null)
  const [tokenValid,  setTokenValid]  = useState(null) // null=loading, true=valid, false=invalid
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [done,        setDone]        = useState(false)

  useEffect(() => {
    // ── DIAGNOSTIC ───────────────────────────────────────────────────────────
    console.group('[SetPassword] mount diagnostics')
    console.log('pathname  :', window.location.pathname)
    console.log('search    :', window.location.search)
    console.log('hash raw  :', window.location.hash)
    const hashParams   = new URLSearchParams(window.location.hash.slice(1))
    const searchParams = new URLSearchParams(window.location.search.slice(1))
    console.log('hash params:',   Object.fromEntries(hashParams.entries()))
    console.log('search params:', Object.fromEntries(searchParams.entries()))
    const storedSession = localStorage.getItem('sb-qcwbkpcwtxpokgseethp-auth-token')
    try { console.log('localStorage session:', JSON.parse(storedSession)) }
    catch { console.log('localStorage session (raw):', storedSession) }
    console.groupEnd()
    // ── END DIAGNOSTIC ───────────────────────────────────────────────────────

    const hash   = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const token  = params.get('access_token')
    const type   = params.get('type')
    if (token && type === 'recovery') {
      setAccessToken(token)
      setTokenValid(true)
    } else {
      setTokenValid(false)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    try {
      const reqUrl     = `${SUPABASE_URL}/auth/v1/user`
      const reqMethod  = 'PATCH'
      const reqHeaders = {
        apikey:          SUPABASE_KEY,
        Authorization:   `Bearer ${accessToken?.slice(0, 20)}...`,
        'Content-Type':  'application/json',
      }
      const reqBody = { password: '(redacted)' }

      // ── DIAGNOSTIC ─────────────────────────────────────────────────────────
      console.group('[SetPassword] PATCH /auth/v1/user')
      console.log('url    :', reqUrl)
      console.log('method :', reqMethod)
      console.log('headers:', reqHeaders)
      console.log('body   :', reqBody)
      console.groupEnd()
      // ── END DIAGNOSTIC ─────────────────────────────────────────────────────

      const res = await fetch(reqUrl, {
        method: reqMethod,
        headers: {
          apikey:          SUPABASE_KEY,
          Authorization:   `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ password }),
      })
      const body = await res.json().catch(() => ({}))

      // ── DIAGNOSTIC ─────────────────────────────────────────────────────────
      console.log('[SetPassword] response status:', res.status)
      console.log('[SetPassword] response body  :', body)
      // ── END DIAGNOSTIC ─────────────────────────────────────────────────────

      if (!res.ok) {
        setError(body?.message || `Failed to set password (${res.status}). The link may have expired.`)
        return
      }
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err?.message || 'Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const wrap = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f5',
    padding: '24px 16px',
    fontFamily: 'Arial, Helvetica, sans-serif',
  }

  const card = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  }

  const inputStyle = {
    display: 'block',
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginTop: '4px',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#6b7280',
    marginTop: '16px',
  }

  if (tokenValid === null) {
    return (
      <div style={wrap}>
        <div style={card}>
          <p style={{ textAlign: 'center', color: '#6b7280', margin: 0 }}>Verifying link…</p>
        </div>
      </div>
    )
  }

  if (tokenValid === false) {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '2.5rem' }}>⚠️</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: '700', color: '#1a1a1a', textAlign: 'center' }}>
            Link invalid or expired
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.6 }}>
            This password-setup link has expired or was already used. Contact Pet Lodge to get a new one.
          </p>
          <button onClick={() => navigate('/login')}
            style={{ display: 'block', width: '100%', padding: '10px', borderRadius: '6px', border: 'none', background: '#5a7a2e', color: 'white', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '2.5rem' }}>✅</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: '700', color: '#2d3a1e', textAlign: 'center' }}>
            Password set!
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>
            Redirecting to login…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.jpg" alt="Pet Lodge" style={{ height: '52px', width: 'auto', borderRadius: '8px' }} />
        </div>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: '700', color: '#2d3a1e', textAlign: 'center' }}>
          Set your password
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.6 }}>
          Choose a secure password to complete your Pet Lodge account setup.
        </p>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '10px 12px', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            New password<span style={{ color: '#ef4444' }}> *</span>
          </label>
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoFocus
          />

          <label style={labelStyle}>
            Confirm password<span style={{ color: '#ef4444' }}> *</span>
          </label>
          <input
            style={inputStyle}
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat your password"
          />

          <button type="submit" disabled={saving}
            style={{
              display: 'block',
              width: '100%',
              marginTop: '24px',
              padding: '11px',
              borderRadius: '6px',
              border: 'none',
              background: saving ? '#9db899' : '#5a7a2e',
              color: 'white',
              fontSize: '0.95rem',
              fontWeight: '700',
              cursor: saving ? 'default' : 'pointer',
            }}>
            {saving ? 'Setting password…' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  )
}
