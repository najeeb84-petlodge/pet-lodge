import { useEffect, useState } from 'react'
import { dbQuery, dbUpdate } from '../../../lib/supabase'
import { format, isAfter, isBefore, isEqual } from 'date-fns'
import { Search, Eye, Loader2, SlidersHorizontal, RefreshCw } from 'lucide-react'
import BookingModal from './BookingModal'
import { joinPetNames } from '../../../lib/buildConfirmationEmail'

const STATUS_OPTIONS  = ['pending','confirmed','completed','cancelled']
const STATUS_CLASS    = { pending:'badge-pending', confirmed:'badge-confirmed', completed:'badge-completed', cancelled:'badge-cancelled' }
const PET_TYPES       = ['all','dog','cat']
const SERVICE_TYPES   = ['all','boarding','daycare','grooming','training']

const selStyle = { fontSize:'0.8rem', padding:'5px 8px', borderRadius:'6px', border:'1px solid var(--border)', background:'white', color:'var(--text)', cursor:'pointer' }
const tagStyle = { display:'inline-block', fontSize:'0.68rem', fontWeight:'600', padding:'2px 7px', borderRadius:'4px', background:'#f1f5f9', color:'#475569', marginRight:'3px', marginBottom:'2px' }
const noteStyle = { fontSize:'0.7rem', color:'#dc2626', marginTop:'2px' }

// Parse dd/mm/yyyy → Date or null
function parseDMY(str) {
  if (!str) return null
  const [d, m, y] = str.split('/')
  if (!d || !m || !y) return null
  const dt = new Date(+y, +m - 1, +d)
  return isNaN(dt) ? null : dt
}

function ServiceTags({ b }) {
  const items = Array.isArray(b.service_details)
    ? b.service_details.map(s => s?.name || s).filter(Boolean)
    : b.service_type
      ? [b.service_type]
      : []
  if (!items.length) return null
  return (
    <div>
      {items.map((name, i) => <span key={i} style={tagStyle}>{name}</span>)}
    </div>
  )
}

function NoteField({ label, text }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return null
  const isLong = text.length > 40
  return (
    <p style={{ fontSize: '0.7rem', color: '#92400e', marginTop: '2px', cursor: isLong ? 'pointer' : 'default' }}
      onClick={() => isLong && setExpanded(v => !v)}
      title={text}>
      <strong>{label}:</strong>{' '}
      {expanded || !isLong ? text : text.slice(0, 40) + '… '}
      {isLong && <span style={{ color: '#5a7a2e', fontWeight: '600' }}>{expanded ? ' less' : 'more'}</span>}
    </p>
  )
}

function extractAllNotes(b) {
  const notes = []

  if (b.additional_comments) notes.push({ label: 'Notes',      text: b.additional_comments })
  if (b.special_food_req)    notes.push({ label: 'Food',       text: b.special_food_req })
  if (b.driver_comments)     notes.push({ label: 'Driver',     text: b.driver_comments })
  if (b.medication_notes)    notes.push({ label: 'Medication', text: b.medication_notes })

  if (Array.isArray(b.pets_data)) {
    b.pets_data.forEach(pet => {
      if (pet?.medication_notes || pet?.medication) {
        notes.push({ label: `Medication (${pet.name || 'pet'})`, text: pet.medication_notes || pet.medication })
      }
    })
  }

  const perPet = b.service_details?.perPet
  if (Array.isArray(perPet)) {
    perPet.forEach(pf => {
      const petName = pf.petName || 'pet'
      if (pf.foodNotes)               notes.push({ label: `Food notes (${petName})`,    text: pf.foodNotes })
      if (pf.walkerNotes)             notes.push({ label: `Walker notes (${petName})`,  text: pf.walkerNotes })
      if (pf.trainingGoals)           notes.push({ label: `Training goals (${petName})`, text: pf.trainingGoals })
      if (pf.address_driver_comments) notes.push({ label: `Driver notes (${petName})`,  text: pf.address_driver_comments })
    })
  }

  const sd = b.service_details
  if (sd?.preferredSchedule) notes.push({ label: 'Preferred schedule', text: sd.preferredSchedule })
  if (sd?.trainingGoals)     notes.push({ label: 'Training goals',     text: sd.trainingGoals })

  return notes
}

function Comments({ b }) {
  const notes = extractAllNotes(b)
  if (!notes.length) return null
  return (
    <div>
      {notes.map((n, i) => <NoteField key={i} label={n.label} text={n.text} />)}
    </div>
  )
}

export default function AllBookings({ isSuperAdmin, isOwner }) {
  const [bookings, setBookings]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPetType, setFilterPetType] = useState('all')
  const [filterService, setFilterService] = useState('all')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [selected, setSelected]       = useState(null)
  const [stats, setStats]             = useState({ total: 0, pending: 0, cashReceived: 0, expectedThisMonth: 0, modRequests: 0 })

  async function fetchAll(silent = false) {
    if (!silent) setLoading(true)
    try {
      const now = new Date()
      const y   = now.getFullYear()
      const mo  = now.getMonth()           // 0-indexed
      const moStr    = String(mo + 1).padStart(2, '0')
      const monthStart = `${y}-${moStr}-01`
      const lastDay    = new Date(y, mo + 1, 0).getDate()  // day 0 of next month = last day of this month
      const monthEnd   = `${y}-${moStr}-${String(lastDay).padStart(2, '0')}`

      const [allBookings, pendingBookings, monthPayments, mods, allPayments] = await Promise.all([
        dbQuery('bookings', '?select=*&order=created_at.desc'),
        dbQuery('bookings', '?status=eq.pending&select=id'),
        dbQuery('payments', `?created_at=gte.${monthStart}&created_at=lte.${monthEnd}T23:59:59&select=amount`),
        dbQuery('modification_requests', '?status=eq.pending&select=id'),
        dbQuery('payments', '?select=booking_id,amount'),
      ])

      // build per-booking paid totals
      const paidMap = {}
      if (Array.isArray(allPayments)) {
        allPayments.forEach(p => {
          paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (parseFloat(p.amount) || 0)
        })
      }

      const allB = (Array.isArray(allBookings) ? allBookings : []).map(b => ({
        ...b,
        total_paid: paidMap[b.id] || 0,
      }))
      setBookings(allB)

      const cashReceived = Array.isArray(monthPayments)
        ? monthPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
        : 0

      const expectedThisMonth = allB
        .filter(b => {
          if (b.status === 'cancelled') return false
          const serviceEnd = b.service_type === 'day_camp' ? b.start_date : b.end_date
          return serviceEnd >= monthStart && serviceEnd <= monthEnd
        })
        .reduce((s, b) => s + (parseFloat(b.total_amount) || 0), 0)

      setStats({
        total:             allB.length,
        pending:           Array.isArray(pendingBookings) ? pendingBookings.length : 0,
        cashReceived,
        expectedThisMonth,
        modRequests:       Array.isArray(mods) ? mods.length : 0,
      })
    } catch(e) { console.error(e) }
    if (!silent) setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function updateStatus(id, status) {
    await dbUpdate('bookings', id, { status })
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    fetchAll(true)  // silent refresh — updates stats without the loading spinner
  }

  function clearFilters() {
    setSearch('')
    setFilterStatus('all')
    setFilterPetType('all')
    setFilterService('all')
    setDateFrom('')
    setDateTo('')
  }

  const fromDate = parseDMY(dateFrom)
  const toDate   = parseDMY(dateTo)

  const filtered = bookings.filter(b => {
    const s = search.toLowerCase()
    const matchSearch = !search ||
      b.customer_first_name?.toLowerCase().includes(s) ||
      b.customer_last_name?.toLowerCase().includes(s) ||
      b.customer_email?.toLowerCase().includes(s) ||
      b.pets_data?.[0]?.name?.toLowerCase().includes(s) ||
      b.booking_ref?.toLowerCase().includes(s)

    const matchStatus  = filterStatus === 'all'  || b.status === filterStatus
    const matchPetType = filterPetType === 'all' || b.pets_data?.[0]?.type?.toLowerCase() === filterPetType
    const matchService = filterService === 'all' || b.service_type?.toLowerCase() === filterService ||
      (Array.isArray(b.service_details) && b.service_details.some(sd => sd?.category?.toLowerCase() === filterService || sd?.name?.toLowerCase().includes(filterService)))

    const bStart = b.start_date ? new Date(b.start_date) : null
    const matchFrom = !fromDate || !bStart || isAfter(bStart, fromDate) || isEqual(bStart, fromDate)
    const matchTo   = !toDate   || !bStart || isBefore(bStart, toDate)  || isEqual(bStart, toDate)

    return matchSearch && matchStatus && matchPetType && matchService && matchFrom && matchTo
  })

  const ownerName = b => `${b.customer_first_name||''} ${b.customer_last_name||''}`.trim() || '—'

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'0.75rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Total Bookings',   value:stats.total,   icon:'📅' },
          { label:'Pending Bookings', value:stats.pending, icon:'🐾' },
          ...(isSuperAdmin ? [
            { label:'Cash Received This Month', value:`JD ${stats.cashReceived.toFixed(2)}`,      icon:'💵', green:true,  hint:'Sum of all payments recorded this calendar month' },
            { label:'Expected This Month',      value:`JD ${stats.expectedThisMonth.toFixed(2)}`, icon:'📈', blue:true,   hint:'Total booking value for non-cancelled bookings checking out this month', refresh:true },
          ] : []),
          { label:'Modification Requests', value:stats.modRequests, icon:'🔔', orange:true },
        ].map(s => (
          <div key={s.label} className="card" style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            border: s.orange ? '1px solid #fed7aa' : s.green ? '1px solid #bbf7d0' : s.blue ? '1px solid #bfdbfe' : '1px solid var(--border)',
            background: s.orange ? '#fff7ed' : s.green ? '#f0fdf4' : s.blue ? '#eff6ff' : 'white',
          }}>
            <div>
              <p style={{ fontSize:'0.75rem', color:'var(--muted)', marginBottom:'0.25rem' }}>{s.label}</p>
              <p style={{ fontSize:'1.5rem', fontWeight:'700', color: s.orange ? '#ea580c' : s.green ? '#16a34a' : s.blue ? '#2563eb' : 'var(--text)' }}>{s.value}</p>
              {s.hint && <p style={{ fontSize:'0.65rem', color:'var(--muted)', marginTop:'0.2rem', lineHeight:'1.3' }}>{s.hint}</p>}
              {s.refresh && (
                <button onClick={() => fetchAll(true)} title="Refresh stat" style={{ marginTop:'0.3rem', display:'flex', alignItems:'center', gap:'3px', fontSize:'0.65rem', color:'#2563eb', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                  <RefreshCw size={10} /> Refresh
                </button>
              )}
            </div>
            <span style={{ fontSize:'1.5rem', opacity:0.5 }}>{s.icon}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom:'1rem' }}>
        {/* Row 1: search */}
        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'0.6rem' }}>
          <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
            <Search size={15} style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }}/>
            <input className="input" style={{ paddingLeft:'2rem' }} placeholder="Search by pet name, customer name, email, or booking ID..."
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </div>
        {/* Row 2: dropdowns + date range + clear */}
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', alignItems:'center' }}>
          <select style={selStyle} value={filterPetType} onChange={e => setFilterPetType(e.target.value)}>
            {PET_TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'All Pet Types' : t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
          <select style={selStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <select style={selStyle} value={filterService} onChange={e => setFilterService(e.target.value)}>
            {SERVICE_TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'All Services' : t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
          <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
            <input style={{ ...selStyle, width:'110px' }} placeholder="From dd/mm/yyyy"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
            <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>–</span>
            <input style={{ ...selStyle, width:'110px' }} placeholder="To dd/mm/yyyy"
              value={dateTo} onChange={e => setDateTo(e.target.value)}/>
          </div>
          <button onClick={clearFilters} title="Clear all filters"
            style={{ display:'flex', alignItems:'center', gap:'4px', padding:'5px 10px', borderRadius:'6px', border:'1px solid var(--border)', background:'white', cursor:'pointer', fontSize:'0.8rem', color:'var(--muted)' }}>
            <SlidersHorizontal size={13}/> Clear
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
          <div key={b.id} style={{
            padding: '0.875rem 1rem',
            display: 'grid',
            gridTemplateColumns: '2fr 1.3fr 1fr 1.8fr 1fr auto',
            gap: '0.75rem',
            alignItems: 'start',
            borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
          }}>

            {/* Col 1: Customer */}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ownerName(b)} <span style={{ fontWeight: '400', color: 'var(--muted)' }}>— {joinPetNames(Array.isArray(b.pets_data) ? b.pets_data.map(p => p?.name).filter(Boolean) : [])}</span>
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.customer_email}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{b.customer_phone}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>ID: {b.booking_ref || b.id?.slice(0, 8)}</p>
            </div>

            {/* Col 2: Dates */}
            <div style={{ fontSize: '0.875rem', color: 'var(--text)', minWidth: 0 }}>
              {b.start_date && <p style={{ whiteSpace: 'nowrap' }}>{format(new Date(b.start_date), 'EEE, MMM d, yyyy')}</p>}
              {b.end_date   && <p style={{ whiteSpace: 'nowrap' }}>{format(new Date(b.end_date),   'EEE, MMM d, yyyy')}</p>}
              {b.total_days && <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{b.total_days} days</p>}
            </div>

            {/* Col 3: Service */}
            <div style={{ minWidth: 0 }}>
              <ServiceTags b={b} />
            </div>

            {/* Col 4: Notes */}
            <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
              <Comments b={b} />
            </div>

            {/* Col 5: Amount + status */}
            <div style={{ textAlign: 'right', minWidth: 0 }}>
              <p style={{ fontWeight: '700', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                JD {parseFloat(b.total_amount ?? b.total_price ?? 0).toFixed(2)}
              </p>
              {b.total_paid > 0 && (
                <p style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600', marginTop: '2px', whiteSpace: 'nowrap' }}>
                  ✓ JD {b.total_paid.toFixed(2)} received
                </p>
              )}
              <div style={{ marginTop: '4px' }}>
                <span className={STATUS_CLASS[b.status] || 'badge-pending'}>{b.status}</span>
              </div>
            </div>

            {/* Col 6: Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
              {isOwner ? (
                <span className={STATUS_CLASS[b.status] || 'badge-pending'} style={{ display: 'inline-block' }}>{b.status}</span>
              ) : (
                <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)} className="input" style={{ fontSize: '0.75rem', padding: '4px 8px', width: '120px' }}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              )}
              <button onClick={() => setSelected(b)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }} title="Open">
                <Eye size={15} style={{ color: '#3b82f6' }} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <BookingModal
          booking={selected}
          onClose={() => setSelected(null)}
          onUpdated={fetchAll}
          isOwner={isOwner}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
