import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

const SUPABASE_URL = 'https://qcwbkpcwtxpokgseethp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd2JrcGN3dHhwb2tnc2VldGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDA1MDMsImV4cCI6MjA4OTkxNjUwM30.8kV-I-9skyBk8wlELT3Ft6j2iBCOtKuoYF7wXbcMZFU'

function getStoredSession() {
  try {
    const raw = localStorage.getItem('sb-qcwbkpcwtxpokgseethp-auth-token')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const token = parsed.access_token || parsed?.currentSession?.access_token
    const user  = parsed.user || parsed?.currentSession?.user
    if (!token || !user) return null
    return { token, user }
  } catch { return null }
}

export default function ProtectedRoute({ children, requireStaff = false }) {
  const [status, setStatus] = useState('checking') // checking | ok | redirect-login | redirect-customer

  useEffect(() => {
    const session = getStoredSession()
    if (!session) { setStatus('redirect-login'); return }

    const role = session.user?.user_metadata?.role ?? 'customer'
    if (requireStaff && !['admin','super_admin','employee'].includes(role)) {
      setStatus('redirect-customer')
    } else {
      setStatus('ok')
    }
  }, [])

  if (status === 'checking') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8f9f6' }}>
      <div style={{ textAlign:'center' }}>
        <img src="/logo.jpg" alt="Pet Lodge" style={{ height:'64px', borderRadius:'8px', marginBottom:'1rem' }}/>
        <div style={{ width:'32px', height:'32px', border:'3px solid #7aa63c', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (status === 'redirect-login')    return <Navigate to="/login" replace />
  if (status === 'redirect-customer') return <Navigate to="/dashboard" replace />
  return children
}
