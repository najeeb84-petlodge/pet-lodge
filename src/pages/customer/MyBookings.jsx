import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ClipboardList, Loader2, CalendarDays, PawPrint } from 'lucide-react'
import TopNav from '../../components/TopNav'
import { useAuth } from '../../contexts/AuthContext'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../lib/supabase'

const STATUS_STYLES = {
  pending:   { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  confirmed: { bg: '#dcfce7', color: '#166534', label: 'Confirmed' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  completed: { bg: '#e0e7ff', color: '#3730a3', label: 'Completed' },
}

const SERVICE_LABELS = {
  boarding:      'Boarding',
  day_camp:      'Doggy Day Camp',
  dog_walking:   'Dog Walking',
  grooming:      'Grooming',
  transport:     'Vet Visits & Transport',
  training:      'Training',
  international: 'International Travel',
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: '#f3f4f6', color: '#374151', label: status }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function formatDate(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MyBookings() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!profile?.id) return
    const token = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/bookings?customer_id=eq.${profile.id}&order=created_at.desc&select=id,booking_ref,service_type,status,payment_status,start_date,end_date,total_amount,pet_names,num_pets,created_at`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
    )
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setBookings(data)
        else setError('Failed to load bookings.')
      })
      .catch(() => setError('Failed to load bookings.'))
      .finally(() => setLoading(false))
  }, [profile?.id])

  return (
    <div className="min-h-screen" style={{ background: '#f8f9f6' }}>
      <TopNav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/customer/dashboard" className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: 'var(--muted)' }}>
          <ChevronLeft size={15} /> Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)' }}>My Bookings</h1>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        )}

        {error && (
          <div className="rounded-lg p-4 text-sm" style={{ background: '#fee2e2', color: '#991b1b' }}>
            {error}
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className="card text-center py-16">
            <ClipboardList size={44} className="mx-auto mb-3 opacity-25" style={{ color: 'var(--muted)' }} />
            <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text)' }}>No bookings yet</p>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>Your booking history will appear here.</p>
            <Link to="/booking" className="btn-primary inline-flex px-6">Book Now</Link>
          </div>
        )}

        {!loading && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map(b => {
              const status = STATUS_STYLES[b.status] || STATUS_STYLES.pending
              return (
                <div key={b.id} className="card p-4 sm:p-5"
                  style={{ borderLeft: `4px solid ${status.color}` }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--muted)' }}>
                          #{b.booking_ref}
                        </span>
                        <StatusBadge status={b.status} />
                        {b.payment_status === 'unpaid' && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: '#fef9c3', color: '#854d0e' }}>Unpaid</span>
                        )}
                        {b.payment_status === 'paid' && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: '#dcfce7', color: '#166534' }}>Paid</span>
                        )}
                      </div>
                      <p className="font-bold text-base" style={{ color: 'var(--text)' }}>
                        {SERVICE_LABELS[b.service_type] || b.service_type}
                      </p>
                    </div>
                    {b.total_amount > 0 && (
                      <p className="text-lg font-bold flex-shrink-0" style={{ color: 'var(--accent)' }}>
                        JD {parseFloat(b.total_amount).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm" style={{ color: 'var(--muted)' }}>
                    {(b.start_date || b.end_date) && (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} />
                        {formatDate(b.start_date)}
                        {b.end_date && b.end_date !== b.start_date && ` → ${formatDate(b.end_date)}`}
                      </span>
                    )}
                    {b.pet_names?.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <PawPrint size={14} />
                        {b.pet_names.join(', ')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
                    Submitted {formatDate(b.created_at)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
