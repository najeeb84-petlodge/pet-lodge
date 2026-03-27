import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, requireStaff = false, requireAdmin = false }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🐾</div>
          <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto"/>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (requireAdmin && profile?.role !== 'admin') return <Navigate to="/unauthorized" replace />
  if (requireStaff && !['admin','employee'].includes(profile?.role)) return <Navigate to="/customer/dashboard" replace />

  return children
}
