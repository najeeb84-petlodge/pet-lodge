import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Loader2 } from 'lucide-react'

const SUPABASE_URL = 'https://qcwbkpcwtxpokgseethp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd2JrcGN3dHhwb2tnc2VldGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDA1MDMsImV4cCI6MjA4OTkxNjUwM30.8kV-I-9skyBk8wlELT3Ft6j2iBCOtKuoYF7wXbcMZFU'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

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
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: data.token_type,
        user: data.user,
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

  return (
    <div style={{ minHeight:'100vh', display:'flex' }}>
      {/* Left panel - Pet Lodge green */}
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

          {/* Logo for mobile + always visible */}
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'2rem' }}>
            <img src="/logo.jpg" alt="Pet Lodge" style={{ height:'56px', width:'auto', borderRadius:'8px' }}/>
            <div>
              <p style={{ fontWeight:'700', color:'var(--text)', fontSize:'1.1rem', lineHeight:'1' }}>Pet Lodge</p>
              <p style={{ color:'var(--muted)', fontSize:'0.75rem' }}>Kennels & Cattery</p>
            </div>
          </div>

          <h2 style={{ fontSize:'1.5rem', fontWeight:'700', color:'var(--text)', marginBottom:'0.25rem' }}>Welcome back</h2>
          <p style={{ color:'var(--muted)', marginBottom:'2rem', fontSize:'0.875rem' }}>Sign in to your account</p>

          {error && (
            <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', color:'#991b1b', padding:'0.75rem 1rem', borderRadius:'0.5rem', fontSize:'0.875rem', marginBottom:'1rem' }}>
              {error}
            </div>
          )}

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

          <p style={{ textAlign:'center', fontSize:'0.875rem', color:'var(--muted)', marginTop:'1.5rem' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color:'var(--accent)', fontWeight:'600' }}>Sign up</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 1024px) { .lg-panel { display: flex !important; } }
      `}</style>
    </div>
  )
}
