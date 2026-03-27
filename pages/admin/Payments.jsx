import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { DollarSign, TrendingUp, Clock, XCircle, Search, Loader2 } from 'lucide-react'

const METHOD_LABEL = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', online: 'Online' }

const STATUS_CLASS = {
  paid:    'badge-paid',
  pending: 'badge-pending',
  refunded:'badge-refunded',
  failed:  'badge-cancelled',
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}><Icon size={20} className="text-white"/></div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    supabase
      .from('payments')
      .select('*, bookings(check_in, check_out, pets(name), profiles(full_name), services(name))')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setPayments(data ?? []); setLoading(false) })
  }, [])

  const paid     = payments.filter(p => p.status === 'paid')
  const pending  = payments.filter(p => p.status === 'pending')
  const refunded = payments.filter(p => p.status === 'refunded')

  const totalPaid     = paid.reduce((s, p) => s + (p.amount || 0), 0)
  const totalPending  = pending.reduce((s, p) => s + (p.amount || 0), 0)
  const totalRefunded = refunded.reduce((s, p) => s + (p.amount || 0), 0)

  const filtered = payments.filter(p => {
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    const s = search.toLowerCase()
    const matchSearch = !search ||
      p.bookings?.pets?.name?.toLowerCase().includes(s) ||
      p.bookings?.profiles?.full_name?.toLowerCase().includes(s)
    return matchStatus && matchSearch
  })

  async function updatePaymentStatus(id, status) {
    await supabase.from('payments').update({ status }).eq('id', id)
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Payments Ledger</h1>
        <p className="text-slate-500 text-sm mt-1">Track all transactions and revenue</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard icon={TrendingUp} label="Total Collected"   value={`JD ${totalPaid.toFixed(2)}`}    color="bg-emerald-500"/>
        <SummaryCard icon={Clock}      label="Pending Payments"  value={`JD ${totalPending.toFixed(2)}`}  color="bg-amber-500"/>
        <SummaryCard icon={XCircle}    label="Total Refunded"    value={`JD ${totalRefunded.toFixed(2)}`} color="bg-purple-500"/>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="Search by pet or owner…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-2">
          {['all','paid','pending','refunded','failed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors
                ${filterStatus === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'}`}>
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
          <div className="text-center py-16 text-slate-400">
            <DollarSign size={40} className="mx-auto mb-2 opacity-30"/>
            No payments found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date','Pet','Owner','Service','Amount','Method','Status','Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {p.created_at ? format(new Date(p.created_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.bookings?.pets?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.bookings?.profiles?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.bookings?.services?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">JD {(p.amount ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{METHOD_LABEL[p.method] ?? p.method ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={STATUS_CLASS[p.status] ?? 'badge-pending'}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => updatePaymentStatus(p.id, 'paid')}
                            className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors">
                            Mark Paid
                          </button>
                        </div>
                      )}
                      {p.status === 'paid' && (
                        <button onClick={() => updatePaymentStatus(p.id, 'refunded')}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-colors">
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly breakdown */}
      {paid.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold text-slate-900 mb-3">Revenue by Payment Method</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(METHOD_LABEL).map(([key, label]) => {
              const total = paid.filter(p => p.method === key).reduce((s, p) => s + (p.amount || 0), 0)
              if (!total) return null
              return (
                <div key={key} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className="text-lg font-bold text-slate-900">JD {total.toFixed(0)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
