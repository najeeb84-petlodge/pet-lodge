import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Download, Loader2 } from 'lucide-react'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../../lib/supabase'

async function fetchBookings() {
  const token = getAccessToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=*&order=created_at.desc`,
      {
        signal: controller.signal,
        headers: {
          apikey:        SUPABASE_KEY,
          Authorization: `Bearer ${token || SUPABASE_KEY}`,
        },
      }
    )
    clearTimeout(timer)
    const body = await res.json()
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`)
    console.log('[FormResponses] bookings count:', body?.length)
    return { data: body, error: null }
  } catch (e) {
    clearTimeout(timer)
    const msg = e?.name === 'AbortError' ? 'Request timed out after 10 s' : (e?.message || 'Failed to load')
    return { data: null, error: msg }
  }
}

// Pull pet names / types from pets_data jsonb array
function petField(b, field) {
  const pets = b.pets_data
  if (!Array.isArray(pets) || !pets.length) return '—'
  return pets.map(p => p[field] || '').filter(Boolean).join(', ') || '—'
}

// Service name from service_details[] or service_type string
function serviceName(b) {
  if (Array.isArray(b.service_details) && b.service_details.length) {
    return b.service_details.map(s => s.name).filter(Boolean).join(', ')
  }
  return b.service_type || '—'
}

export default function FormResponses({ isSuperAdmin }) {
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchBookings()
    if (err) { setError(err); setLoading(false); return }
    setBookings(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function exportCSV() {
    const headers = [
      'Booking ID','First Name','Last Name','Email','Phone',
      'Pet Names','Pet Types','Pet Breeds','Service',
      'Check-in','Check-out','Amount','Status','Created At',
    ]
    const rows = bookings.map(b => [
      b.booking_ref || b.id?.slice(0, 8),
      b.customer_first_name || '',
      b.customer_last_name  || '',
      b.customer_email      || '',
      b.customer_phone      || '',
      petField(b, 'name'),
      petField(b, 'type'),
      petField(b, 'breed'),
      serviceName(b),
      b.start_date || '',
      b.end_date   || '',
      b.total_amount || b.total_price || '',
      b.status || '',
      b.created_at ? format(new Date(b.created_at), 'dd/MM/yyyy') : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pet-lodge-bookings-${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <p className="text-red-500 text-sm font-semibold">Error: {error}</p>
      <button onClick={load} className="btn-secondary text-sm">Retry</button>
    </div>
  )

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h2 className="font-bold text-lg" style={{ color: 'var(--accent)' }}>Form Responses</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} · scroll horizontally to see all columns
          </p>
        </div>
        {isSuperAdmin && bookings.length > 0 && (
          <button onClick={exportCSV} className="btn-primary flex items-center gap-2 text-sm">
            <Download size={15} /> Export CSV
          </button>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No form responses yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: '1200px' }}>
            <thead style={{ background: 'var(--light)' }}>
              <tr>
                {['Booking ID','First Name','Last Name','Email','Phone',
                  'Pet Names','Pet Types','Pet Breeds','Service',
                  'Check-in','Check-out','Amount','Status'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap"
                    style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={b.id} style={{ background: i % 2 === 1 ? '#fafaf8' : 'white' }}>
                  <td className="px-3 py-2 font-mono" style={{ color: 'var(--accent)' }}>
                    {b.booking_ref || b.id?.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2">{b.customer_first_name || '—'}</td>
                  <td className="px-3 py-2">{b.customer_last_name  || '—'}</td>
                  <td className="px-3 py-2">{b.customer_email      || '—'}</td>
                  <td className="px-3 py-2">{b.customer_phone      || '—'}</td>
                  <td className="px-3 py-2">{petField(b, 'name')}</td>
                  <td className="px-3 py-2">{petField(b, 'type')}</td>
                  <td className="px-3 py-2">{petField(b, 'breed')}</td>
                  <td className="px-3 py-2">{serviceName(b)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {b.start_date ? format(new Date(b.start_date), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {b.end_date ? format(new Date(b.end_date), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    JD {parseFloat(b.total_amount || b.total_price || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`badge-${b.status || 'pending'}`}>{b.status || 'pending'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
