import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return }
      supabase.from('profiles').select('role').eq('id', session.user.id).single()
        .then(({ data }) => {
          const role = data?.role
          if (role === 'admin' || role === 'employee') navigate('/admin/dashboard')
          else navigate('/customer/dashboard')
        })
    })
  }, [])

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
