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
      // Direct REST API call - bypasses JS client completely
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error_description || data.message || 'Login failed')
      }

      // Store session manually
      localStorage.setItem('sb-qcwbkpcwtxpokgseethp-auth-token', JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: data.token_type,
        user: data.user,
      }))

      // Read role from user metadata
      const role = data.user?.user_metadata?.role ?? 'customer'
      window.location.href = (role === 'admin' || role === 'employee') ? '/admin/dashboard' : '/customer/dashboard'

    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <span className="text-5xl">🐾</span>
            <div>
              <h1 className="text-white text-2xl font-bold">Pet Lodge JO</h1>
              <p className="text-amber-100 text-sm">Premium Pet Care</p>
            </div>
          </div>
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">Your pets deserve<br/>the very best.</h2>
          <p className="text-amber-100 text-lg">Professional boarding, grooming, and day care — all in one place.</p>
        </div>
        <div className="space-y-3">
          {['Safe & comfortable boarding','Professional grooming services','Real-time booking management','Instant SMS & email updates'].map(f => (
            <div key={f} className="flex items-center gap-3 text-white">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</div>
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to your account</p>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input className="input pl-9" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input className="input pl-9" type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required/>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading && <Loader2 size={18} className="animate-spin"/>}
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-600 font-medium hover:text-brand-700">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
