import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function AuthCallback() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return // Wait for auth to finish loading

    if (!user) {
      navigate('/login')
      return
    }

    // Profile loaded - redirect based on role
    if (profile) {
      if (profile.role === 'admin' || profile.role === 'employee') {
        navigate('/admin/dashboard')
      } else {
        navigate('/customer/dashboard')
      }
      return
    }

    // Profile not found - default to customer dashboard
    // but wait a moment in case it's still loading
    const timer = setTimeout(() => {
      navigate('/customer/dashboard')
    }, 3000)

    return () => clearTimeout(timer)
  }, [user, profile, loading])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-5xl mb-4">🐾</div>
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-3"/>
        <p className="text-slate-500 text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
