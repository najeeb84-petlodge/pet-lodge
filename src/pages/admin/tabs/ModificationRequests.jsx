import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../../lib/supabase'

const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', completed: 'Completed' }
const STATUS_COLOR  = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444', completed: '#6b7280' }

async function restFetch(path, opts = {}) {
  const token = getAccessToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      signal: controller.signal,
      ...opts,
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    })
    clearTimeout(timer)
    const text = await res.text()
    const body = text ? JSON.parse(text) : []
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`)
    return { data: body, error: null }
  } catch (e) {
    clearTimeout(timer)
    const msg = e?.name === 'AbortError' ? 'Request timed out after 10 s' : (e?.message || 'Failed to load')
    return { data: null, error: msg }
  }
}

export default function ModificationRequests({ isOwner }) {
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [notes,    setNotes]    = useState({})
  const [saving,   setSaving]   = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await restFetch(
      'modification_requests?select=*&order=created_at.desc'
    )
    if (err) { setError(err); setLoading(false); return }
    console.log('[ModReqs] rows:', data)
    setRequests(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id, status) {
    setSaving(id)
    await restFetch(`modification_requests?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status, admin_notes: notes[id] || '' }),
    })
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status, admin_notes: notes[id] || r.admin_notes } : r))
    setSaving(null)
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
    <div className="card">
      <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--accent)' }}>
        Customer Modification Requests
      </h2>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No modification requests yet.</div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm">
                    Booking #{r.booking_ref || r.booking_id?.slice(0, 8) || '—'}
                  </p>
                  {r.customer_name && (
                    <p className="text-xs text-gray-500">{r.customer_name}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy, HH:mm') : '—'}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    background: `${STATUS_COLOR[r.status] || '#6b7280'}20`,
                    color:      STATUS_COLOR[r.status] || '#6b7280',
                  }}
                >
                  {STATUS_LABEL[r.status] || r.status || 'Pending'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Customer Request</p>
                  <div className="rounded-lg p-2.5 text-sm" style={{ background: 'var(--light)', border: '1px solid var(--border)' }}>
                    {r.request_details || r.message || r.notes || '—'}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Admin Notes</p>
                  {(r.status === 'pending' || !r.status) && !isOwner ? (
                    <textarea
                      className="input text-sm h-16 resize-none"
                      placeholder="Add notes..."
                      value={notes[r.id] ?? r.admin_notes ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm text-gray-500 italic">{r.admin_notes || 'None'}</p>
                  )}
                </div>
              </div>

              {(!r.status || r.status === 'pending') && !isOwner && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => updateStatus(r.id, 'approved')}
                    disabled={saving === r.id}
                    className="btn-primary text-sm py-1.5 px-4 flex items-center gap-1"
                  >
                    {saving === r.id && <Loader2 size={12} className="animate-spin" />}
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, 'rejected')}
                    disabled={saving === r.id}
                    className="btn-secondary text-sm py-1.5 px-4 text-red-600 border-red-200"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
