import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-6">You don't have permission to view this page.</p>
        <Link to="/login" className="btn-primary">Back to Login</Link>
      </div>
    </div>
  )
}
