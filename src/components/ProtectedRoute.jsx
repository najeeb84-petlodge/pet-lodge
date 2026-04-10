import { Navigate } from 'react-router-dom'

const STORAGE_KEY = 'sb-qcwbkpcwtxpokgseethp-auth-token'

function getStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const token     = parsed.access_token     || parsed?.currentSession?.access_token
    const user      = parsed.user             || parsed?.currentSession?.user
    const expiresAt = parsed.expires_at       || parsed?.currentSession?.expires_at
    if (!token || !user) return null
    // Reject expired tokens (expires_at is Unix seconds)
    if (expiresAt && expiresAt < Date.now() / 1000) return null
    return { token, user }
  } catch { return null }
}

export default function ProtectedRoute({ children, requireStaff = false, allowGuest = false }) {
  // Synchronous — localStorage reads are instant, no async needed
  const session = getStoredSession()
  const isGuest = allowGuest && !!localStorage.getItem('guest_email')

  if (!session && !isGuest) return <Navigate to="/login" replace />

  const role = session.user?.user_metadata?.role ?? 'customer'
  if (requireStaff && !['admin', 'super_admin', 'employee'].includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
