import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { PawPrint, CalendarPlus, Clock } from 'lucide-react'

export default function CustomerDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐾</span>
          <div>
            <h1 className="font-bold text-slate-900">Pet Lodge JO</h1>
            <p className="text-xs text-slate-400">Customer Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Hi, {profile?.full_name?.split(' ')[0]}</span>
          <button onClick={handleSignOut} className="btn-secondary text-sm">Sign out</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="text-6xl mb-4">🐾</div>
        <h2 className="text-3xl font-bold text-slate-900 mb-3">Welcome, {profile?.full_name?.split(' ')[0]}!</h2>
        <p className="text-slate-500 text-lg mb-10">Your Pet Lodge customer portal is coming soon.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
          {[
            { icon: CalendarPlus, title: 'Book a Stay', desc: 'Coming in Phase 3', color: 'text-brand-600 bg-brand-50' },
            { icon: PawPrint,     title: 'My Pets',     desc: 'Manage pet profiles', color: 'text-purple-600 bg-purple-50' },
            { icon: Clock,        title: 'My Bookings', desc: 'View booking history', color: 'text-blue-600 bg-blue-50' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="card text-center opacity-60 cursor-not-allowed">
              <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mx-auto mb-3`}>
                <Icon size={22}/>
              </div>
              <p className="font-semibold text-slate-800">{title}</p>
              <p className="text-xs text-slate-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-left max-w-md mx-auto">
          <p className="font-semibold text-amber-900 mb-1">🚧 Phase 3 Coming Soon</p>
          <p className="text-amber-700 text-sm">
            The full customer booking experience — 5-step wizard, pet profiles, booking history, and rewards — is being built now.
          </p>
        </div>
      </div>
    </div>
  )
}
