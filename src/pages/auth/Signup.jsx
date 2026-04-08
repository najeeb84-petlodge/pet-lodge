import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Mail, Lock, User, Loader2 } from 'lucide-react'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError(''); setLoading(true)
    try {
      const { error } = await signUp(email, password, fullName)
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#eef4e2' }}>
      <div className="card max-w-md w-full text-center">
        <img src="/logo.jpg" alt="Pet Lodge JO" className="w-24 h-24 rounded-full object-cover mx-auto mb-5 border-4" style={{ borderColor: '#c6dba0' }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: '#2d3a1e' }}>Check your email</h2>
        <p className="text-sm mb-2" style={{ color: '#5a7a2e' }}>
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
        </p>
        <p className="text-xs mb-6" style={{ color: '#7a8c6e' }}>
          If you don't see it, check your spam folder or contact us at{' '}
          <a href="mailto:info@petlodgejo.com" className="underline" style={{ color: '#5a7a2e' }}>info@petlodgejo.com</a>.
        </p>
        <Link
          to="/login"
          className="inline-block px-8 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors"
          style={{ background: '#8CB733' }}
        >
          Back to Login
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🐾</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">Create your account</h1>
          <p className="text-slate-500 mt-1">Join Pet Lodge JO today</p>
        </div>

        <div className="card">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input className="input pl-9" placeholder="Your full name" value={fullName}
                  onChange={e => setFullName(e.target.value)} required/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input className="input pl-9" type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} required/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input className="input pl-9" type="password" placeholder="Min 6 characters" value={password}
                  onChange={e => setPassword(e.target.value)} required/>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
              {loading && <Loader2 size={18} className="animate-spin"/>}
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:text-brand-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
