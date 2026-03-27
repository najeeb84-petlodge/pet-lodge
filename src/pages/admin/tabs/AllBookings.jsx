import { useEffect, useState } from 'react'
import { dbQuery, dbUpdate } from '../../../lib/supabase'
import { format } from 'date-fns'
import { Search, Eye, Edit2, FileText, Mail, X, Loader2 } from 'lucide-react'

const STATUS_OPTIONS = ['pending','confirmed','completed','cancelled']
const STATUS_CLASS = { pending:'badge-pending', confirmed:'badge-confirmed', completed:'badge-completed', cancelled:'badge-cancelled' }

export default function AllBookings({ isSuperAdmin }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState(null)
  const [stats, setStats]       = useState({ total:0, pending:0, revenue:0, modRequests:0 })

  async function fetchAll() {
    setLoading(true)
    try {
      const [allBookings, pendingBookings, payments, mods] = await Promise.all([
        dbQuery('bookings', '?select=*,pets(name,type),profiles(first_name,last_name,phone,email),services(name,category)&order=created_at.desc'),
        dbQuery('bookings', '?status=eq.pending&select=id'),
        dbQuery('payments', '?status=eq.paid&select=amount'),
        dbQuery('modification_requests', '?status=eq.pending&select=id'),
      ])
      setBookings(Array.isArray(allBookings) ? allBookings : [])
      const revenue = Array.isArray(payments) ? payments.reduce((s,p) => s+(p.amount||0), 0) : 0
      setStats({
        total: Array.isArray(allBookings) ? allBookings.length : 0,
        pending: Array.isArray(pendingBookings) ? pendingBookings.length : 0,
        revenue,
        modRequests: Array.isArray(mods) ? mods.length : 0,
      })
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function updateStatus(id, status) {
    await dbUpdate('bookings', id, { status })
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
    const matchStatus = filterStatus === 'all' || b.status === filterStatus
    return matchSearch && matchStatus
  })

  const ownerName = b => `${b.profiles?.first_name||''} ${b.profiles?.last_name||''}`.trim() || '—'

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'0.75rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Total Bookings', value:stats.total, icon:'📅' },
          { label:'Pending Bookings', value:stats.pending, icon:'🐾' },
          ...(isSuperAdmin ? [{ label:'Monthly Revenue', value:`JD ${stats.revenue.toFixed(2)}`, icon:'$' }] : []),
          { label:'Modification Requests', value:stats.modRequests, icon:'🔔', orange:true },
        ].map(s => (
          <div key={s.label} className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', border: s.orange ? '1px solid #fed7aa' : '1px solid var(--border)', background: s.orange ? '#fff7ed' : 'white' }}>
            <div>
              <p style={{ fontSize:'0.75rem', color:'var(--muted)', marginBottom:'0.25rem' }}>{s.label}</p>
              <p style={{ fontSize:'1.5rem', fontWeight:'700', color: s.orange ? '#ea580c' : 'var(--text)' }}>{s.value}</p>
            </div>
            <span style={{ fontSize:'1.5rem', opacity:0.5 }}>{s.icon}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
            <Search size={15} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
            <input className="input" style={{ paddingLeft:'2rem' }} placeholder="Search by pet name, customer name, email, or booking ID..."
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="input" style={{ width:'150px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <button onClick={() => { setSearch(''); setFilterStatus('all') }} className="btn-secondary" style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'0.875rem' }}>
            <X size={14}/> Clear Filters
          </button>
        </div>
      </div>

      {/* Booking list */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}>
            <Loader2 size={28} style={{ animation:'spin 1s linear infinite', color:'var(--accent)' }}/>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'4rem', color:'var(--muted)' }}>No bookings found</div>
        ) : filtered.map((b, i) => (
          <div key={b.id} style={{ padding:'1rem', display:'flex', flexWrap:'wrap', gap:'1rem', alignItems:'flex-start', borderBottom: i < filtered.length-1 ? '1px solid var(--border)' : 'none' }}>

            {/* Customer */}
            <div style={{ flex:'1', minWidth:'160px' }}>
              <p style={{ fontWeight:'600', fontSize:'0.9rem' }}>{ownerName(b)} <span style={{ fontWeight:'400', color:'var(--muted)' }}>— {b.pets?.name||'—'}</span></p>
              <p style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{b.profiles?.email}</p>
              <p style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{b.profiles?.phone}</p>
              <p style={{ fontSize:'0.75rem', color:'var(--muted)' }}>ID: {b.booking_ref || b.id?.slice(0,8)}</p>
            </div>

            {/* Dates */}
            <div style={{ fontSize:'0.875rem', color:'var(--text)', minWidth:'130px' }}>
              {b.start_date && <p>{format(new Date(b.start_date),'EEE, MMM d, yyyy')}</p>}
              {b.end_date   && <p>{format(new Date(b.end_date),  'EEE, MMM d, yyyy')}</p>}
              {b.total_days && <p style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{b.total_days} days</p>}
            </div>

            {/* Service tag */}
            <div style={{ minWidth:'100px' }}>
              {b.services?.name && <span className="service-tag">{b.services.name}</span>}
            </div>

            {/* Amount */}
            <div style={{ textAlign:'right', minWidth:'90px' }}>
              <p style={{ fontWeight:'700', fontSize:'1.1rem' }}>JD {b.total_amount ?? b.total_price ?? 0}</p>
              <span className={STATUS_CLASS[b.status]||'badge-pending'}>{b.status}</span>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)} className="input" style={{ fontSize:'0.75rem', padding:'4px 8px', width:'120px' }}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
              <div style={{ display:'flex', gap:'4px' }}>
                <button onClick={() => setSelected(b)} style={{ padding:'6px', borderRadius:'6px', border:'none', background:'transparent', cursor:'pointer' }} title="View"><Eye size={15} style={{ color:'#3b82f6' }}/></button>
                <button style={{ padding:'6px', borderRadius:'6px', border:'none', background:'transparent', cursor:'pointer' }} title="Edit"><Edit2 size={15} style={{ color:'var(--muted)' }}/></button>
                <button style={{ padding:'6px', borderRadius:'6px', border:'none', background:'transparent', cursor:'pointer' }} title="Receipt"><FileText size={15} style={{ color:'#16a34a' }}/></button>
                <button style={{ padding:'6px', borderRadius:'6px', border:'none', background:'transparent', cursor:'pointer' }} title="Email"><Mail size={15} style={{ color:'#ea580c' }}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'1rem' }} onClick={() => setSelected(null)}>
          <div style={{ background:'white', borderRadius:'1rem', padding:'1.5rem', width:'100%', maxWidth:'480px', maxHeight:'80vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1rem' }}>
              <h3 style={{ fontWeight:'700', fontSize:'1.1rem' }}>Booking Details</h3>
              <button onClick={() => setSelected(null)} style={{ border:'none', background:'transparent', cursor:'pointer' }}><X size={18}/></button>
            </div>
            {[
              ['Booking Ref', selected.booking_ref || selected.id?.slice(0,8)],
              ['Customer', ownerName(selected)],
              ['Email', selected.profiles?.email],
              ['Phone', selected.profiles?.phone],
              ['Pet', selected.pets?.name],
              ['Service', selected.services?.name],
              ['Check-in', selected.start_date ? format(new Date(selected.start_date),'PPP') : '—'],
              ['Check-out', selected.end_date ? format(new Date(selected.end_date),'PPP') : '—'],
              ['Days', selected.total_days],
              ['Amount', `JD ${selected.total_amount ?? selected.total_price ?? 0}`],
              ['Status', selected.status],
              ['Notes', selected.additional_comments || 'None'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid var(--border)', padding:'0.5rem 0', fontSize:'0.875rem' }}>
                <span style={{ color:'var(--muted)' }}>{k}</span>
                <span style={{ fontWeight:'500', textAlign:'right', textTransform:'capitalize' }}>{v ?? '—'}</span>
              </div>
            ))}
            <button onClick={() => setSelected(null)} className="btn-secondary" style={{ width:'100%', marginTop:'1rem', justifyContent:'center' }}>Close</button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
