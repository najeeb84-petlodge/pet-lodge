import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { format } from 'date-fns'
import { Search, Eye, Edit2, FileText, Mail, X, ChevronDown, Loader2 } from 'lucide-react'

const STATUS_OPTIONS = ['pending','confirmed','completed','cancelled']
const STATUS_CLASS = { pending:'badge-pending', confirmed:'badge-confirmed', completed:'badge-completed', cancelled:'badge-cancelled' }

export default function AllBookings({ isSuperAdmin }) {
  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPetType, setFilterPetType] = useState('all')
  const [selected, setSelected]     = useState(null)
  const [stats, setStats]           = useState({ total:0, pending:0, revenue:0, modRequests:0 })

  async function fetchBookings() {
    setLoading(true)
    let q = supabase
      .from('bookings')
      .select('*, pets(name,type), profiles(first_name,last_name,phone,email), services(name,category)')
      .order('created_at', { ascending: false })
    if (filterStatus !== 'all') q = q.eq('status', filterStatus)
    const { data } = await q
    setBookings(data ?? [])

    const [
      { count: total },
      { count: pending },
      { data: payments },
      { count: modCount },
    ] = await Promise.all([
      supabase.from('bookings').select('*', { count:'exact', head:true }),
      supabase.from('bookings').select('*', { count:'exact', head:true }).eq('status','pending'),
      supabase.from('payments').select('amount').eq('status','paid'),
      supabase.from('modification_requests').select('*', { count:'exact', head:true }).eq('status','pending'),
    ])
    const revenue = payments?.reduce((s,p) => s + (p.amount||0), 0) ?? 0
    setStats({ total: total||0, pending: pending||0, revenue, modRequests: modCount||0 })
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [filterStatus])

  async function updateStatus(id, status) {
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  const filtered = bookings.filter(b => {
    const s = search.toLowerCase()
    const matchSearch = !search ||
      b.profiles?.first_name?.toLowerCase().includes(s) ||
      b.profiles?.last_name?.toLowerCase().includes(s) ||
      b.profiles?.email?.toLowerCase().includes(s) ||
      b.pets?.name?.toLowerCase().includes(s) ||
      b.booking_ref?.toLowerCase().includes(s)
    const matchPet = filterPetType === 'all' || b.pets?.type === filterPetType
    return matchSearch && matchPet
  })

  const ownerName = (b) => `${b.profiles?.first_name||''} ${b.profiles?.last_name||''}`.trim() || '—'

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Bookings', value: stats.total, icon: '📅', color: '' },
          { label: 'Pending Bookings', value: stats.pending, icon: '🐾', color: '' },
          { label: 'Monthly Revenue', value: `JD ${stats.revenue.toFixed(2)}`, icon: '$', color: '', hide: !isSuperAdmin },
          { label: 'Modification Requests', value: stats.modRequests, icon: '🔔', color: 'border-orange-200 bg-orange-50', textColor: '#e67e22' },
        ].filter(s => !s.hide).map(s => (
          <div key={s.label} className={`card flex items-center justify-between ${s.color}`}>
            <div>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.textColor || 'var(--text)' }}>{s.value}</p>
            </div>
            <span className="text-2xl opacity-60">{s.icon}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pl-9" placeholder="Search by pet name, customer name, email, or booking ID..."
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="input w-auto" value={filterPetType} onChange={e => setFilterPetType(e.target.value)}>
            <option value="all">All Pet Types</option>
            <option value="dog">Dogs</option>
            <option value="cat">Cats</option>
          </select>
          <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <button onClick={() => { setSearch(''); setFilterStatus('all'); setFilterPetType('all') }}
            className="btn-secondary text-sm flex items-center gap-1">
            <X size={14}/> Clear Filters
          </button>
        </div>
      </div>

      {/* Booking cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }}/>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No bookings found</div>
          ) : (
            filtered.map((b, i) => (
              <div key={b.id} className={`p-4 flex flex-col sm:flex-row sm:items-start gap-4 ${i < filtered.length-1 ? 'border-b' : ''}`}
                style={{ borderColor: 'var(--border)' }}>

                {/* Customer + pet info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <div>
                      <p className="font-semibold text-sm">{ownerName(b)} <span className="font-normal text-gray-400">— {b.pets?.name || '—'}</span></p>
                      <p className="text-xs text-gray-400">{b.profiles?.email}</p>
                      <p className="text-xs text-gray-400">{b.profiles?.phone}</p>
                      <p className="text-xs text-gray-400">ID: {b.booking_ref || b.id?.slice(0,8)}</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="text-sm text-gray-600 min-w-[140px]">
                  {b.start_date && <p>{format(new Date(b.start_date), 'EEE, MMM d, yyyy')}</p>}
                  {b.end_date && <p>{format(new Date(b.end_date), 'EEE, MMM d, yyyy')}</p>}
                  {b.total_days && <p className="text-xs text-gray-400">{b.total_days} days</p>}
                </div>

                {/* Services */}
                <div className="flex flex-wrap gap-1 min-w-[120px]">
                  {b.services?.name && <span className="service-tag">{b.services.name}</span>}
                </div>

                {/* Amount + status */}
                <div className="text-right min-w-[100px]">
                  <p className="font-bold text-lg">JD {b.total_amount ?? b.total_price ?? 0}</p>
                  <span className={STATUS_CLASS[b.status] ?? 'badge-pending'}>{b.status}</span>
                </div>

                {/* Status dropdown + actions */}
                <div className="flex flex-col gap-2">
                  <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)}
                    className="input text-xs py-1 w-32">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <button onClick={() => setSelected(b)} className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="View">
                      <Eye size={15} className="text-blue-500"/>
                    </button>
                    <button className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Edit">
                      <Edit2 size={15} className="text-gray-500"/>
                    </button>
                    <button className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Receipt">
                      <FileText size={15} className="text-green-500"/>
                    </button>
                    <button className="p-1.5 rounded hover:bg-gray-100 transition-colors" title="Email">
                      <Mail size={15} className="text-orange-500"/>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Booking Details</h3>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded"><X size={18}/></button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Booking Ref', selected.booking_ref || selected.id?.slice(0,8)],
                ['Customer', ownerName(selected)],
                ['Email', selected.profiles?.email],
                ['Phone', selected.profiles?.phone],
                ['Pet', selected.pets?.name],
                ['Pet Type', selected.pets?.type],
                ['Service', selected.services?.name],
                ['Check-in', selected.start_date ? format(new Date(selected.start_date), 'PPP') : '—'],
                ['Check-out', selected.end_date ? format(new Date(selected.end_date), 'PPP') : '—'],
                ['Total Days', selected.total_days],
                ['Amount', `JD ${selected.total_amount ?? selected.total_price ?? 0}`],
                ['Status', selected.status],
                ['Notes', selected.additional_comments || 'None'],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-gray-400">{k}</span>
                  <span className="font-medium text-right capitalize">{v ?? '—'}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSelected(null)} className="btn-secondary w-full mt-4">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
