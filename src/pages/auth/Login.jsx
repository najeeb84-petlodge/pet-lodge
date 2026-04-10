import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'

const SUPABASE_URL = 'https://qcwbkpcwtxpokgseethp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd2JrcGN3dHhwb2tnc2VldGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDA1MDMsImV4cCI6MjA4OTkxNjUwM30.8kV-I-9skyBk8wlELT3Ft6j2iBCOtKuoYF7wXbcMZFU'
const CALLBACK_URL = 'https://pet-lodge.vercel.app/auth/callback'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function Divider({ label = 'or' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', margin:'1.25rem 0' }}>
      <div style={{ flex:1, height:'1px', background:'#e2e8d9' }}/>
      <span style={{ fontSize:'0.75rem', color:'var(--muted)', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</span>
      <div style={{ flex:1, height:'1px', background:'#e2e8d9' }}/>
    </div>
  )
}

export default function Login() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [mode, setMode]           = useState('password') // 'password' | 'magic'
  const [magicSent, setMagicSent] = useState(false)
  const [guestEmail, setGuestEmail] = useState('')
  const [showGuest, setShowGuest]   = useState(false)

  function handleGoogle() {
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(CALLBACK_URL)}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error_description || 'Login failed')
      localStorage.setItem('sb-qcwbkpcwtxpokgseethp-auth-token', JSON.stringify({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_at:    Math.floor(Date.now() / 1000) + data.expires_in,
        token_type:    data.token_type,
        user:          data.user,
      }))
      const role = data.user?.user_metadata?.role ?? 'customer'
      window.location.href = (role === 'admin' || role === 'super_admin' || role === 'employee')
        ? '/admin/dashboard'
        : '/customer/dashboard'
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ email, redirect_to: CALLBACK_URL }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error_description || data.msg || 'Failed to send magic link')
      }
      setMagicSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleGuest(e) {
    e.preventDefault()
    if (!guestEmail.trim()) return
    localStorage.setItem('guest_email', guestEmail.trim())
    window.location.href = '/booking'
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex' }}>
      {/* Left panel */}
      <div style={{
        display: 'none',
        width: '45%',
        background: 'linear-gradient(160deg, #2d3a1e 0%, #3d5226 50%, #4a6b2a 100%)',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem',
      }} className="lg-panel">
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'3rem' }}>
            <img src="/logo.jpg" alt="Pet Lodge" style={{ height:'70px', width:'auto', borderRadius:'8px', background:'white', padding:'4px' }}/>
          </div>
          <h2 style={{ color:'white', fontSize:'2rem', fontWeight:'700', lineHeight:'1.2', marginBottom:'1rem' }}>
            Amman's Trusted<br/>Pet Care Since 2015
          </h2>
          <p style={{ color:'#c8dba8', fontSize:'1rem', lineHeight:'1.6' }}>
            24/7 supervised, climate-controlled boarding in a secure, professionally managed environment.
          </p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {['Safe & comfortable boarding','Professional grooming services','Real-time booking management','Instant SMS & email updates'].map(f => (
            <div key={f} style={{ display:'flex', alignItems:'center', gap:'0.75rem', color:'white' }}>
              <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', flexShrink:0 }}>✓</div>
              <span style={{ fontSize:'0.875rem' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', background:'#f8f9f6' }}>
        <div style={{ width:'100%', maxWidth:'420px' }}>

          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'2rem' }}>
            <img src="/logo.jpg" alt="Pet Lodge" style={{ height:'56px', width:'auto', borderRadius:'8px' }}/>
            <div>
              <p style={{ fontWeight:'700', color:'var(--text)', fontSize:'1.1rem', lineHeight:'1' }}>Pet Lodge</p>
              <p style={{ color:'var(--muted)', fontSize:'0.75rem' }}>Kennels & Cattery</p>
            </div>
          </div>

          <h2 style={{ fontSize:'1.5rem', fontWeight:'700', color:'var(--text)', marginBottom:'0.25rem' }}>Welcome back</h2>
          <p style={{ color:'var(--muted)', marginBottom:'1.5rem', fontSize:'0.875rem' }}>Sign in to your account</p>

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogle}
            style={{
              width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.625rem',
              padding:'0.625rem 1rem', borderRadius:'0.75rem', border:'1.5px solid #d1d5db',
              background:'white', color:'#374151', fontSize:'0.875rem', fontWeight:'600',
              cursor:'pointer', transition:'border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7aa63c'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(122,166,60,0.15)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <Divider label="or continue with email" />

          {error && (
            <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', color:'#991b1b', padding:'0.75rem 1rem', borderRadius:'0.5rem', fontSize:'0.875rem', marginBottom:'1rem' }}>
              {error}
            </div>
          )}

          {/* Magic link sent confirmation */}
          {magicSent ? (
            <div style={{ background:'#eef4e2', border:'1px solid #c6dba0', borderRadius:'0.75rem', padding:'1.25rem', textAlign:'center' }}>
              <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📬</div>
              <p style={{ fontWeight:'700', color:'#2d3a1e', marginBottom:'0.25rem' }}>Check your email</p>
              <p style={{ fontSize:'0.875rem', color:'#5a7a2e' }}>
                We sent a sign-in link to <strong>{email}</strong>. Click it to sign in instantly.
              </p>
              <button
                type="button"
                onClick={() => { setMagicSent(false); setMode('password') }}
                style={{ marginTop:'1rem', fontSize:'0.8rem', color:'var(--muted)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}
              >
                Back to sign in
              </button>
            </div>
          ) : mode === 'password' ? (
            <>
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                <div>
                  <label style={{ display:'block', fontSize:'0.875rem', fontWeight:'500', color:'var(--text)', marginBottom:'0.25rem' }}>Email</label>
                  <div style={{ position:'relative' }}>
                    <Mail size={15} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
                    <input className="input" style={{ paddingLeft:'2.25rem' }} type="email" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} required/>
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'0.875rem', fontWeight:'500', color:'var(--text)', marginBottom:'0.25rem' }}>Password</label>
                  <div style={{ position:'relative' }}>
                    <Lock size={15} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
                    <input className="input" style={{ paddingLeft:'2.25rem' }} type="password" placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} required/>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent:'center', padding:'0.625rem', fontSize:'0.9rem' }}>
                  {loading && <Loader2 size={17} style={{ animation:'spin 1s linear infinite' }}/>}
                  Sign In
                </button>
              </form>

              <p style={{ textAlign:'center', fontSize:'0.8rem', color:'var(--muted)', marginTop:'1rem' }}>
                Prefer a magic link?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('magic'); setError('') }}
                  style={{ color:'var(--accent)', fontWeight:'600', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem' }}
                >
                  Send me one
                </button>
              </p>
            </>
          ) : (
            <>
              <form onSubmit={handleMagicLink} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                <div>
                  <label style={{ display:'block', fontSize:'0.875rem', fontWeight:'500', color:'var(--text)', marginBottom:'0.25rem' }}>Email</label>
                  <div style={{ position:'relative' }}>
                    <Mail size={15} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
                    <input className="input" style={{ paddingLeft:'2.25rem' }} type="email" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} required/>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent:'center', padding:'0.625rem', fontSize:'0.9rem' }}>
                  {loading && <Loader2 size={17} style={{ animation:'spin 1s linear infinite' }}/>}
                  Send Magic Link
                </button>
              </form>

              <p style={{ textAlign:'center', fontSize:'0.8rem', color:'var(--muted)', marginTop:'1rem' }}>
                Use a password instead?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('password'); setError('') }}
                  style={{ color:'var(--accent)', fontWeight:'600', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem' }}
                >
                  Sign in with password
                </button>
              </p>
            </>
          )}

          <p style={{ textAlign:'center', fontSize:'0.875rem', color:'var(--muted)', marginTop:'1.5rem' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color:'var(--accent)', fontWeight:'600' }}>Sign up</Link>
          </p>

          {/* Guest booking */}
          <div style={{ marginTop:'1.5rem', borderTop:'1px solid #e2e8d9', paddingTop:'1.5rem' }}>
            {!showGuest ? (
              <p style={{ textAlign:'center', fontSize:'0.8rem', color:'var(--muted)' }}>
                Just browsing?{' '}
                <button
                  type="button"
                  onClick={() => setShowGuest(true)}
                  style={{ color:'var(--accent)', fontWeight:'600', background:'none', border:'none', cursor:'pointer', fontSize:'0.8rem' }}
                >
                  Continue as guest
                </button>
              </p>
            ) : (
              <div>
                <p style={{ fontSize:'0.8rem', color:'var(--muted)', marginBottom:'0.75rem', textAlign:'center' }}>
                  Enter your email to book without an account
                </p>
                <form onSubmit={handleGuest} style={{ display:'flex', gap:'0.5rem' }}>
                  <div style={{ flex:1, position:'relative' }}>
                    <Mail size={14} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
                    <input
                      className="input"
                      style={{ paddingLeft:'2rem', fontSize:'0.875rem' }}
                      type="email"
                      placeholder="your@email.com"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ padding:'0.5rem 0.75rem', flexShrink:0 }}>
                    <ArrowRight size={16} />
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setShowGuest(false)}
                  style={{ display:'block', margin:'0.5rem auto 0', fontSize:'0.75rem', color:'var(--muted)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 1024px) { .lg-panel { display: flex !important; } }
      `}</style>
    </div>
  )
}
