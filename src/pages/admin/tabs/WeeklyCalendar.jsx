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
  if (transport === 'round_trip')   return '🚗'
  if (transport === 'pickup_only')  return '⬆️'
  if (transport === 'dropoff_only') return '⬇️'
  return '🚗'
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
        {transport && <span title="Transport">{transport}</span>}
        {grooming  && <span title="Grooming">✂️</span>}
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
        <p className="font-semibold text-sm mb-3">Legend</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: '#16a34a', display: 'inline-block' }}/> Check-ins (arrivals)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: '#dc2626', display: 'inline-block' }}/> Check-outs (departures)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: '#b45309', display: 'inline-block' }}/> Currently staying</span>
          <span>🚗 Round trip transport</span>
          <span>⬆️ Pick up only</span>
          <span>⬇️ Drop off only</span>
          <span>✂️ Grooming / bathing</span>
          <span>🐕 Dog &nbsp; 🐈 Cat</span>
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
