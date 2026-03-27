import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Mail, Lock, Loader2 } from 'lucide-react'

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
      alert('Step 1: calling signInWithPassword')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      alert('Step 2: got response. Error: ' + JSON.stringify(error) + ' | User: ' + JSON.stringify(data?.user?.id))
      if (error) throw error
      alert('Step 3: no error, redirecting to admin')
      window.location.href = '/admin/dashboard'
    } catch(err) {
      alert('CAUGHT ERROR: ' + err.message)
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Welcome back 🐾</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input className="input pl-9" type="email" value={email} onChange={e => setEmail(e.target.value)} required/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input className="input pl-9" type="password" value={password} onChange={e => setPassword(e.target.value)} required/>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
            {loading && <Loader2 size={18} className="animate-spin"/>}
            Sign In
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account? <Link to="/signup" className="text-brand-600 font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
