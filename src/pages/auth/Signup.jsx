import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react'

const SUPABASE_URL = 'https://qcwbkpcwtxpokgseethp.supabase.co'
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

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function handleGoogle() {
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(CALLBACK_URL)}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
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
          {/* Google Sign-Up */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:border-green-500 transition-colors mb-4"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200"/>
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-gray-200"/>
          </div>

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
                <input className="input pl-9 pr-9" type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" value={password}
                  onChange={e => setPassword(e.target.value)} required/>
                <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-0 flex items-center">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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
