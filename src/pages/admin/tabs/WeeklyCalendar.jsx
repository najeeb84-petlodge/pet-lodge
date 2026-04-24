import { useEffect, useState } from 'react'
import { dbQuery } from '../../../lib/supabase'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import BookingModal from './BookingModal'
import { joinPetNames } from '../../../lib/buildConfirmationEmail'

const DAY_TYPE = {
  checkin:  { color: '#16a34a', bg: '#f0fdf4', label: 'Check-ins' },
  checkout: { color: '#dc2626', bg: '#fef2f2', label: 'Check-outs' },
  staying:  { color: '#b45309', bg: '#fffbeb', label: 'Staying' },
}

const LEGEND_ITEMS = [
  { key: 'checkin',   label: 'Check-in',    color: '#5a7a2e', bg: '#eef4e2' },
  { key: 'checkout',  label: 'Check-out',   color: '#dc2626', bg: '#fef2f2' },
  { key: 'staying',   label: 'Staying',     color: '#b45309', bg: '#fffbeb' },
  { key: 'transport', label: 'Transport',   color: '#2563eb', bg: '#eff6ff' },
  { key: 'grooming',  label: 'Grooming',    color: '#7c3aed', bg: '#faf5ff' },
  { key: 'fleatick',  label: 'Flea & tick', color: '#0d9488', bg: '#f0fdfa' },
  { key: 'training',  label: 'Training',    color: '#d97706', bg: '#fff7ed' },
  { key: 'daycamp',   label: 'Day camp',    color: '#0891b2', bg: '#ecfeff' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function isDayCamp(b) {
  return b.service_type === 'day_camp' || b.service_type === 'daycamp'
}

function getPetTypes(b) {
  return Array.isArray(b.pets_data) ? b.pets_data.map(p => p?.type?.toLowerCase()) : []
}

function hasDogTypes(b) { return getPetTypes(b).includes('dog') }
function hasCatTypes(b) { return getPetTypes(b).includes('cat') }

function getTransportIcon(b) {
  const transport = b.service_details?.perPet?.[0]?.transport
    || b.service_details?.serviceOptions?.tripType
  if (!transport || transport === 'self') return null
  return transport // 'round_trip' | 'pickup_only' | 'dropoff_only'
}

function matchesFilter(b, filter) {
  if (!filter) return true
  const li = b.service_details?.line_items || []
  switch (filter) {
    case 'checkin':   return b.dayType === 'checkin'
    case 'checkout':  return b.dayType === 'checkout'
    case 'staying':   return b.dayType === 'staying'
    case 'transport': return !!getTransportIcon(b)
    case 'grooming':  return li.some(i => i.label?.toLowerCase().includes('groom') || i.label?.toLowerCase().includes('bath'))
    case 'fleatick':  return li.some(i => i.label?.toLowerCase().includes('flea'))
    case 'training':  return li.some(i => i.label?.toLowerCase().includes('train') || i.label?.toLowerCase().includes('session'))
    case 'daycamp':   return isDayCamp(b)
    default:          return true
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function IconBadge({ title, color, bg, border, children }) {
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: bg, border: `1px solid ${border}`, borderRadius: '4px', padding: '1px 4px', color, fontSize: '0.6rem', fontWeight: 700 }}>
      {children}
    </span>
  )
}

function BookingCard({ b, onClick, dimmed }) {
  const petNames = joinPetNames(
    Array.isArray(b.pets_data)
      ? b.pets_data.map(p => p?.name).filter(Boolean)
      : (b.pet_names || [])
  )
  const ownerFirst  = b.customer_first_name || '—'
  const numPets     = b.num_pets || (Array.isArray(b.pets_data) ? b.pets_data.length : 1)
  const hasDog      = hasDogTypes(b)
  const hasCat      = hasCatTypes(b)
  const transport   = getTransportIcon(b)
  const li          = b.service_details?.line_items || []
  const hasGrooming = li.some(i => i.label?.toLowerCase().includes('groom') || i.label?.toLowerCase().includes('bath'))
  const hasFleaTick = li.some(i => i.label?.toLowerCase().includes('flea'))
  const hasTraining = li.some(i => i.label?.toLowerCase().includes('train') || i.label?.toLowerCase().includes('session'))
  const cfg = DAY_TYPE[b.dayType]
  const dc  = isDayCamp(b)

  const CarSVG = ({ color }) => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V9l3-5h12l3 5v6a2 2 0 0 1-2 2h-2"/>
      <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
    </svg>
  )
  const ScissorsSVG = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>
  )
  const ShieldSVG = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
  const GradCapSVG = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  )

  return (
    <div
      onClick={() => onClick(b)}
      className="rounded p-1.5 mb-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.color}22`,
        borderLeft: dc ? '3px solid #0891b2' : `1px solid ${cfg.color}22`,
        opacity: dimmed ? 0.25 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>
        {dc && <span style={{ marginRight: '3px' }}>🏕️</span>}{petNames}
      </p>
      <p className="truncate" style={{ color: cfg.color, fontWeight: 500 }}>{ownerFirst}</p>
      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
        {hasDog && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#b45309"><path d="M4.5 11c0-1.5.8-2.8 2-3.5V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1.5c1.2.7 2 2 2 3.5v4a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2v-4zm3 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>
        )}
        {hasCat && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#475569"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1 14.5H9v-2h2v2zm4 0h-2v-2h2v2zm1.5-5c0 .8-.7 1.5-1.5 1.5h-5c-.8 0-1.5-.7-1.5-1.5V9c0-.8.7-1.5 1.5-1.5h5c.8 0 1.5.7 1.5 1.5v2.5z"/></svg>
        )}
        {numPets > 1 && <span style={{ color: 'var(--muted)', fontSize: '0.6rem', fontWeight: 600 }}>×{numPets}</span>}
        {transport === 'round_trip'   && <IconBadge title="Round trip"  color="#2563eb" bg="#eff6ff" border="#bfdbfe"><CarSVG color="#2563eb"/> RT</IconBadge>}
        {transport === 'pickup_only'  && <IconBadge title="Pick up"     color="#16a34a" bg="#f0fdf4" border="#bbf7d0"><CarSVG color="#16a34a"/> PU</IconBadge>}
        {transport === 'dropoff_only' && <IconBadge title="Drop off"    color="#dc2626" bg="#fef2f2" border="#fecaca"><CarSVG color="#dc2626"/> DO</IconBadge>}
        {hasGrooming  && <IconBadge title="Grooming/bathing" color="#7c3aed" bg="#faf5ff" border="#e9d5ff"><ScissorsSVG/></IconBadge>}
        {hasFleaTick  && <IconBadge title="Flea & tick"      color="#db2777" bg="#fdf2f8" border="#fbcfe8"><ShieldSVG/></IconBadge>}
        {hasTraining  && <IconBadge title="Training"         color="#0d9488" bg="#f0fdfa" border="#99f6e4"><GradCapSVG/></IconBadge>}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function WeeklyCalendar() {
  const [weekStart,    setWeekStart]    = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [bookings,     setBookings]     = useState([])
  const [selected,     setSelected]     = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [activeFilter, setActiveFilter] = useState(null)

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
      {/* Week navigator */}
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

      {/* Legend — clickable filter pills */}
      <div className="card mb-4" style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {LEGEND_ITEMS.map(item => {
            const isActive = activeFilter === item.key
            return (
              <button
                key={item.key}
                onClick={() => setActiveFilter(prev => prev === item.key ? null : item.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${item.color}55`,
                  background: isActive ? item.color : item.bg,
                  color: isActive ? 'white' : item.color,
                  transition: 'all 0.15s',
                  outline: 'none',
                }}
              >
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                  background: isActive ? 'rgba(255,255,255,0.75)' : item.color,
                }} />
                {item.label}
              </button>
            )
          })}
          {activeFilter && (
            <button
              onClick={() => setActiveFilter(null)}
              style={{ fontSize: '0.7rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px', outline: 'none' }}
            >
              ✕ clear
            </button>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card p-0 overflow-hidden">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map(day => {
            const dayBookings = getBookingsForDay(day)
            const checkIns  = dayBookings.filter(b => b.dayType === 'checkin')
            const checkOuts = dayBookings.filter(b => b.dayType === 'checkout')
            const staying   = dayBookings.filter(b => b.dayType === 'staying')

            // Section B groups: boarding dogs/mixed first, then day camp, then cat-only boarding
            const stayBoarding = staying.filter(b => !isDayCamp(b) && !(hasCatTypes(b) && !hasDogTypes(b)))
            const stayDayCamp  = staying.filter(b => isDayCamp(b))
            const stayCatsOnly = staying.filter(b => !isDayCamp(b) && hasCatTypes(b) && !hasDogTypes(b))
            const orderedStaying = [...stayBoarding, ...stayDayCamp, ...stayCatsOnly]

            const boardingCount = stayBoarding.length
            const dayCampCount  = stayDayCamp.length
            const catCount      = stayCatsOnly.length

            const hasArrivals = checkIns.length > 0 || checkOuts.length > 0
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

                {loading ? (
                  <p className="text-xs text-center mt-4" style={{ color: 'var(--muted)' }}>…</p>
                ) : (
                  <div style={{ padding: '6px 4px' }}>

                    {/* ── Section A: Arrivals & Departures ── */}

                    {/* Summary line (omit if neither) */}
                    {hasArrivals && (
                      <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', lineHeight: 1.3 }}>
                        {checkIns.length > 0 && (
                          <span style={{ color: '#16a34a' }}>↓ {checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''}</span>
                        )}
                        {checkIns.length > 0 && checkOuts.length > 0 && ' · '}
                        {checkOuts.length > 0 && (
                          <span style={{ color: '#dc2626' }}>↑ {checkOuts.length} check-out{checkOuts.length !== 1 ? 's' : ''}</span>
                        )}
                      </p>
                    )}

                    {/* Check-ins */}
                    {checkIns.length > 0 && (
                      <div style={{ marginBottom: '3px' }}>
                        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#16a34a', marginBottom: '2px', paddingLeft: '2px' }}>
                          Check-ins ({checkIns.length})
                        </p>
                        {checkIns.map(b => (
                          <BookingCard
                            key={b.id} b={b} onClick={setSelected}
                            dimmed={activeFilter !== null && !matchesFilter(b, activeFilter)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Subtle divider between check-ins and check-outs when both exist */}
                    {checkIns.length > 0 && checkOuts.length > 0 && (
                      <div style={{ borderTop: '1px dashed #e5e7eb', margin: '4px 0' }} />
                    )}

                    {/* Check-outs */}
                    {checkOuts.length > 0 && (
                      <div style={{ marginBottom: '3px' }}>
                        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#dc2626', marginBottom: '2px', paddingLeft: '2px' }}>
                          Check-outs ({checkOuts.length})
                        </p>
                        {checkOuts.map(b => (
                          <BookingCard
                            key={b.id} b={b} onClick={setSelected}
                            dimmed={activeFilter !== null && !matchesFilter(b, activeFilter)}
                          />
                        ))}
                      </div>
                    )}

                    {/* No arrivals placeholder */}
                    {!hasArrivals && (
                      <p style={{ fontSize: '11px', color: 'var(--border)', fontStyle: 'italic', padding: '2px 2px 4px' }}>
                        No arrivals or departures today
                      </p>
                    )}

                    {/* ── Divider between Section A and B ── */}
                    {staying.length > 0 && (
                      <div style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0 6px' }} />
                    )}

                    {/* ── Section B: Staying ── */}
                    {staying.length > 0 && (
                      <div>
                        {/* Staying summary line */}
                        <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', lineHeight: 1.4 }}>
                          {[
                            boardingCount > 0 && `🐕 ${boardingCount} boarding`,
                            dayCampCount  > 0 && `🏕️ ${dayCampCount} day camp`,
                            catCount      > 0 && `🐈 ${catCount} cats`,
                          ].filter(Boolean).join(' · ')}
                        </p>
                        {orderedStaying.map(b => (
                          <BookingCard
                            key={b.id} b={b} onClick={setSelected}
                            dimmed={activeFilter !== null && !matchesFilter(b, activeFilter)}
                          />
                        ))}
                      </div>
                    )}

                  </div>
                )}
              </div>
            )
          })}
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
