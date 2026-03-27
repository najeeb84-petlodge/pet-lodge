import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { Search, Filter, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react'

const STATUSES = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled']

const STATUS_CLASS = {
  pending:     'badge-pending',
  confirmed:   'badge-confirmed',
  in_progress: 'badge-active',
  completed:   'badge-completed',
  cancelled:   'badge-cancelled',
}

export default function Bookings() {
  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')
  const [actionId, setActionId]     = useState(null)
  const [selected, setSelected]     = useState(null)

  async function fetchBookings() {
    setLoading(true)
    let q = supabase
      .from('bookings')
      .select('*, pets(name,species,breed), profiles(full_name,phone), services(name,price_per_day)')
      .order('created_at', { ascending: false })

    if (filter !== 'all') q = q.eq('status', filter)

    const { data } = await q
    setBookings(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [filter])

  async function updateStatus(id, status) {
    setActionId(id)
    await supabase.from('bookings').update({ status }).eq('id', id)
    await fetchBookings()
    setActionId(null)
  }

  const filtered = bookings.filter(b => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      b.pets?.name?.toLowerCase().includes(s) ||
      b.profiles?.full_name?.toLowerCase().includes(s) ||
      b.services?.name?.toLowerCase().includes(s)
    )
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage all pet boarding & service bookings</p>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="Search by pet, owner, or service…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors
                ${filter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-brand-600"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No bookings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Pet','Owner','Phone','Service','Check-in','Check-out','Price','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <div>{b.pets?.name ?? '—'}</div>
                      <div className="text-xs text-slate-400">{b.pets?.species}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.profiles?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{b.profiles?.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{b.services?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {b.check_in ? format(new Date(b.check_in), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {b.check_out ? format(new Date(b.check_out), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {b.total_price ? `JD ${b.total_price}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={STATUS_CLASS[b.status] ?? 'badge-pending'}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelected(b)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                          <Eye size={15}/>
                        </button>
                        {b.status === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(b.id, 'confirmed')}
                              disabled={actionId === b.id}
                              className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve">
                              {actionId === b.id ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle size={15}/>}
                            </button>
                            <button onClick={() => updateStatus(b.id, 'cancelled')}
                              disabled={actionId === b.id}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                              <XCircle size={15}/>
                            </button>
                          </>
                        )}
                        {b.status === 'confirmed' && (
                          <button onClick={() => updateStatus(b.id, 'completed')}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors">
                            Mark done
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Booking Details</h3>
            <div className="space-y-3 text-sm">
              {[
                ['Pet', `${selected.pets?.name} (${selected.pets?.species})`],
                ['Breed', selected.pets?.breed],
                ['Owner', selected.profiles?.full_name],
                ['Phone', selected.profiles?.phone],
                ['Service', selected.services?.name],
                ['Check-in', selected.check_in ? format(new Date(selected.check_in), 'PPP') : '—'],
                ['Check-out', selected.check_out ? format(new Date(selected.check_out), 'PPP') : '—'],
                ['Total Price', selected.total_price ? `JD ${selected.total_price}` : '—'],
                ['Status', selected.status],
                ['Notes', selected.notes || 'None'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-medium text-slate-700 text-right capitalize">{v ?? '—'}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSelected(null)} className="btn-secondary w-full mt-5">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
