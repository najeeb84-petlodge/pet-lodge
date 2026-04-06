import { Link } from 'react-router-dom'
import { ChevronLeft, CalendarPlus } from 'lucide-react'
import TopNav from '../../components/TopNav'

export default function NewBooking() {
  return (
    <div className="min-h-screen" style={{ background: '#f8f9f6' }}>
      <TopNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: 'var(--muted)' }}>
          <ChevronLeft size={15} /> Back to Dashboard
        </Link>
        <div className="card text-center py-16">
          <CalendarPlus size={44} className="mx-auto mb-3 opacity-25" style={{ color: 'var(--primary)' }} />
          <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text)' }}>New Booking</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>The booking wizard is coming soon.</p>
        </div>
      </div>
    </div>
  )
}
