import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'

const STATUS_CLASS = { pending:'badge-pending', approved:'badge-confirmed', rejected:'badge-cancelled', completed:'badge-completed' }

export default function ModificationRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [notes, setNotes]       = useState({})

  useEffect(() => {
    supabase
      .from('modification_requests')
      .select('*, bookings(booking_ref, start_date, pets(name)), profiles(first_name,last_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setRequests(data ?? []); setLoading(false) })
  }, [])

  async function updateStatus(id, status) {
    await supabase.from('modification_requests').update({ status, admin_notes: notes[id] || '' }).eq('id', id)
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin" style={{ color:'var(--accent)' }}/></div>

  return (
    <div className="card">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color:'var(--accent)' }}>
        🔔 Customer Modification Requests
      </h2>
      {requests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No modification requests</div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="rounded-xl border p-4" style={{ borderColor:'var(--border)' }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">Booking #{r.bookings?.booking_ref || r.booking_id?.slice(0,8)}</p>
                  <p className="text-xs text-gray-400">{r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy') : '—'}</p>
                  <span className={STATUS_CLASS[r.status] ?? 'badge-pending'}>{r.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Customer Request:</p>
                  <div className="rounded-lg p-2 text-sm" style={{ background:'var(--light)', border:'1px solid var(--border)' }}>
                    {r.request_details || '—'}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Admin Notes:</p>
                  {r.status === 'pending' ? (
                    <textarea
                      className="input text-sm h-16 resize-none"
                      placeholder="Add notes..."
                      value={notes[r.id] || r.admin_notes || ''}
                      onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm text-gray-500 italic">{r.admin_notes || 'None'}</p>
                  )}
                </div>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => updateStatus(r.id, 'approved')} className="btn-primary text-sm py-1.5 px-4">Approve</button>
                  <button onClick={() => updateStatus(r.id, 'rejected')} className="btn-secondary text-sm py-1.5 px-4 text-red-600 border-red-200">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
