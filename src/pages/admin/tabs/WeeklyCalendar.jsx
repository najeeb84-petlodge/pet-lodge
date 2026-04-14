import { useEffect, useState } from 'react'
import { dbQuery } from '../../../lib/supabase'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import BookingModal from './BookingModal'

const DAY_TYPE = {
  checkin:  { color: '#16a34a', bg: '#f0fdf4', label: 'Check-ins' },
  checkout: { color: '#dc2626', bg: '#fef2f2', label: 'Check-outs' },
  staying:  { color: '#b45309', bg: '#fffbeb', label: 'Staying' },
}

function getTransportIcon(b) {
  const transport = b.service_details?.perPet?.[0]?.transport
    || b.service_details?.serviceOptions?.tripType
  if (!transport || transport === 'self') return null
  return transport // 'round_trip' | 'pickup_only' | 'dropoff_only'
}

function hasGrooming(b) {
  const li = b.service_details?.line_items
  if (!Array.isArray(li)) return false
  return li.some(i => i.label?.toLowerCase().includes('bath') || i.label?.toLowerCase().includes('groom'))
}

function BookingCard({ b, onClick }) {
  const petNames = Array.isArray(b.pets_data)
    ? b.pets_data.map(p => p?.name).filter(Boolean).join(', ')
    : (b.pet_names || []).join(', ') || '—'

  const ownerFirst = b.customer_first_name || '—'
  const numPets    = b.num_pets || (Array.isArray(b.pets_data) ? b.pets_data.length : 1)
  const types      = Array.isArray(b.pets_data) ? b.pets_data.map(p => p?.type?.toLowerCase()) : []
  const hasDog     = types.includes('dog')
  const hasCat     = types.includes('cat')
  const transport  = getTransportIcon(b)
  const grooming   = hasGrooming(b)
  const cfg        = DAY_TYPE[b.dayType]

  return (
    <div
      onClick={() => onClick(b)}
      className="rounded p-1.5 mb-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
      style={{ background: cfg.bg, border: `1px solid ${cfg.color}22` }}
    >
      <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>{petNames}</p>
      <p className="truncate" style={{ color: cfg.color, fontWeight: 500 }}>{ownerFirst}</p>
      <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
        {hasDog && <span title="Dog">🐕</span>}
        {hasCat && <span title="Cat">🐈</span>}
        {numPets > 1 && (
          <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>×{numPets}</span>
        )}
        {transport === 'round_trip'   && <span title="Round trip" style={{ color: '#2563eb', fontSize: '0.65rem', fontWeight: 700, background: '#eff6ff', padding: '0 3px', borderRadius: 3 }}>RT</span>}
        {transport === 'pickup_only'  && <span title="Pick up"   style={{ color: '#16a34a', fontSize: '0.65rem', fontWeight: 700, background: '#f0fdf4', padding: '0 3px', borderRadius: 3 }}>PU</span>}
        {transport === 'dropoff_only' && <span title="Drop off"  style={{ color: '#dc2626', fontSize: '0.65rem', fontWeight: 700, background: '#fef2f2', padding: '0 3px', borderRadius: 3 }}>DO</span>}
        {grooming && <span title="Grooming" style={{ color: '#7c3aed', fontSize: '0.65rem', fontWeight: 700, background: '#faf5ff', padding: '0 3px', borderRadius: 3 }}>GR</span>}
      </div>
    </div>
  )
}

export default function WeeklyCalendar() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [bookings, setBookings]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    const start = format(weekStart, 'yyyy-MM-dd')
    const end   = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    setLoading(true)
    dbQuery('bookings', `?start_date=lte.${end}&end_date=gte.${start}&status=neq.cancelled&select=*&order=start_date.asc`)
      .then(data => setBookings(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [weekStart])

  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  })

  function getBookingsForDay(day) {
    const d = format(day, 'yyyy-MM-dd')
    return bookings.flatMap(b => {
      const isStart = b.start_date === d
      const isEnd   = b.end_date   === d
      const isStay  = b.start_date < d && b.end_date > d
      if (!isStart && !isEnd && !isStay) return []
      return [{ ...b, dayType: isStart ? 'checkin' : isEnd ? 'checkout' : 'staying' }]
    })
  }

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

  return (
    <div>
      {/* Header */}
      <div className="card mb-4 flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--accent)' }}>
          📅 Weekly Boarding Calendar
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setWeekStart(w => subWeeks(w, 1))}
            className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-sm">
            <ChevronLeft size={14}/> Previous
          </button>
          <span className="text-sm font-medium px-3 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="btn-secondary py-1.5 px-3 text-sm">
            Today
          </button>
          <button onClick={() => setWeekStart(w => addWeeks(w, 1))}
            className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-sm">
            Next <ChevronRight size={14}/>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card p-0 overflow-hidden">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map(day => {
            const dayBookings = getBookingsForDay(day)
            const today = isToday(day)
            return (
              <div key={day.toISOString()}
                style={{ borderRight: '1px solid var(--border)', minHeight: '160px' }}
                className="last:border-r-0">
                {/* Day header */}
                <div className="text-center py-2 border-b"
                  style={{ borderColor: 'var(--border)', background: today ? 'var(--accent)' : 'var(--light)' }}>
                  <p className="font-bold text-sm" style={{ color: today ? 'white' : 'var(--text)' }}>
                    {format(day, 'EEE')}
                  </p>
                  <p className="text-xs" style={{ color: today ? 'rgba(255,255,255,0.8)' : 'var(--muted)' }}>
                    {format(day, 'dd/MM')}
                  </p>
                </div>

                {/* Booking cards */}
                <div className="p-1">
                  {loading ? (
                    <p className="text-xs text-center mt-4" style={{ color: 'var(--muted)' }}>…</p>
                  ) : dayBookings.length === 0 ? (
                    <p className="text-xs text-center mt-4" style={{ color: 'var(--border)' }}>—</p>
                  ) : (
                    ['checkin', 'checkout', 'staying'].map(type => {
                      const group = dayBookings.filter(b => b.dayType === type)
                      if (!group.length) return null
                      const cfg = DAY_TYPE[type]
                      return (
                        <div key={type} className="mb-1">
                          <p className="text-xs font-semibold flex items-center gap-1 mb-0.5 px-0.5"
                            style={{ color: cfg.color }}>
                            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                              style={{ background: cfg.color }}/>
                            {cfg.label} ({group.length})
                          </p>
                          {group.map(b => (
                            <BookingCard key={b.id} b={b} onClick={setSelected} />
                          ))}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="card mt-4">
        <p className="font-semibold text-sm mb-3" style={{ color: 'var(--text)' }}>Legend</p>

        {/* Row 1: Status types */}
        <div className="flex flex-wrap gap-2 mb-2">
          {[
            { color: '#16a34a', bg: '#f0fdf4', label: 'Check-ins (arrivals)' },
            { color: '#dc2626', bg: '#fef2f2', label: 'Check-outs (departures)' },
            { color: '#d97706', bg: '#fffbeb', label: 'Currently staying' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: item.bg, border: `1px solid ${item.color}33`, color: item.color }}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }}/>
              {item.label}
            </div>
          ))}
        </div>

        {/* Row 2: Service icons */}
        <div className="flex flex-wrap gap-2">
          {/* Round trip — blue */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5"/><circle cx="16" cy="17" r="2"/><circle cx="7" cy="17" r="2"/>
              <path d="M14 17H9"/>
            </svg>
            Round trip
          </div>

          {/* Pick up — green */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5"/><circle cx="16" cy="17" r="2"/><circle cx="7" cy="17" r="2"/>
              <path d="M14 17H9"/>
            </svg>
            Pick up only
          </div>

          {/* Drop off — red */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v5"/><circle cx="16" cy="17" r="2"/><circle cx="7" cy="17" r="2"/>
              <path d="M14 17H9"/>
            </svg>
            Drop off only
          </div>

          {/* Grooming — purple */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: '#faf5ff', border: '1px solid #e9d5ff', color: '#7c3aed' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4 3 2 5 2 5s2 2 3 1.5c.5-.25.75-.75 1-1L9 8m4.5 4.5L21 21m-7-3 3.75-3.75a2.5 2.5 0 0 0-3.54-3.54L10.5 14"/><path d="m14.5 11.5 2-2"/>
            </svg>
            Grooming / bathing
          </div>

          {/* Dog — amber */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.5 11c0-1.5.8-2.8 2-3.5V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1.5c1.2.7 2 2 2 3.5v4a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2v-4zm3 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
            </svg>
            Dog
          </div>

          {/* Cat — slate */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1 14.5H9v-2h2v2zm4 0h-2v-2h2v2zm1.5-5c0 .8-.7 1.5-1.5 1.5h-5c-.8 0-1.5-.7-1.5-1.5V9c0-.8.7-1.5 1.5-1.5h5c.8 0 1.5.7 1.5 1.5v2.5z"/>
            </svg>
            Cat
          </div>
        </div>
      </div>

      {/* Booking modal on card click */}
      {selected && (
        <BookingModal
          booking={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null)
            const start = format(weekStart, 'yyyy-MM-dd')
            const end   = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            dbQuery('bookings', `?start_date=lte.${end}&end_date=gte.${start}&status=neq.cancelled&select=*&order=start_date.asc`)
              .then(data => setBookings(Array.isArray(data) ? data : []))
          }}
        />
      )}
    </div>
  )
}
