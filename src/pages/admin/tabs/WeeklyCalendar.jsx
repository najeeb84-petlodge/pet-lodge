import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isToday } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function WeeklyCalendar() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [bookings, setBookings]   = useState([])

  useEffect(() => {
    const start = format(weekStart, 'yyyy-MM-dd')
    const end   = format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    supabase
      .from('bookings')
      .select('*, pets(name,type), profiles(first_name,last_name)')
      .lte('start_date', end)
      .gte('end_date', start)
      .neq('status', 'cancelled')
      .then(({ data }) => setBookings(data ?? []))
  }, [weekStart])

  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 })
  })

  function getBookingsForDay(day) {
    const d = format(day, 'yyyy-MM-dd')
    return bookings.map(b => {
      const isStart = b.start_date === d
      const isEnd   = b.end_date === d
      const isStay  = b.start_date < d && b.end_date > d
      if (!isStart && !isEnd && !isStay) return null
      return { ...b, dayType: isStart ? 'checkin' : isEnd ? 'checkout' : 'staying' }
    }).filter(Boolean)
  }

  const ownerFirst = (b) => b.profiles?.first_name || ''

  const dayTypeConfig = {
    checkin:  { color: '#16a34a', label: 'Check-in', bg: '#f0fdf4' },
    checkout: { color: '#dc2626', label: 'Check-out', bg: '#fef2f2' },
    staying:  { color: '#b45309', label: 'Staying',   bg: '#fffbeb' },
  }

  return (
    <div>
      <div className="card mb-4 flex items-center justify-between">
        <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--accent)' }}>
          📅 Weekly Boarding Calendar
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(w => subWeeks(w,1))} className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-sm">
            <ChevronLeft size={14}/> Previous
          </button>
          <span className="text-sm font-medium px-3 py-1.5 rounded-lg border" style={{ borderColor:'var(--border)', color:'var(--muted)' }}>
            {format(weekStart, 'MMM d')} – {format(endOfWeek(weekStart,{weekStartsOn:1}), 'MMM d, yyyy')}
          </span>
          <button onClick={() => setWeekStart(startOfWeek(new Date(),{weekStartsOn:1}))} className="btn-secondary py-1.5 px-3 text-sm">
            Today
          </button>
          <button onClick={() => setWeekStart(w => addWeeks(w,1))} className="btn-secondary py-1.5 px-3 flex items-center gap-1 text-sm">
            Next <ChevronRight size={14}/>
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-7">
          {days.map(day => {
            const dayBookings = getBookingsForDay(day)
            const today = isToday(day)
            return (
              <div key={day.toISOString()} className="border-r last:border-r-0 min-h-[200px]" style={{ borderColor:'var(--border)' }}>
                {/* Day header */}
                <div className={`text-center py-2 border-b font-medium text-sm ${today ? 'text-white' : ''}`}
                  style={{ borderColor:'var(--border)', background: today ? 'var(--accent)' : 'var(--light)', color: today ? 'white' : 'var(--text)' }}>
                  <p className="font-bold">{format(day, 'EEE')}</p>
                  <p className="text-xs">{format(day, 'dd/MM')}</p>
                </div>

                {/* Bookings */}
                <div className="p-1 space-y-1">
                  {/* Group by type */}
                  {['checkin','checkout','staying'].map(type => {
                    const group = dayBookings.filter(b => b.dayType === type)
                    if (!group.length) return null
                    const cfg = dayTypeConfig[type]
                    return (
                      <div key={type}>
                        <div className="text-xs font-semibold px-1 mb-0.5 flex items-center gap-1" style={{ color: cfg.color }}>
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: cfg.color }}/>
                          {cfg.label} ({group.length})
                        </div>
                        {group.map(b => (
                          <div key={b.id} className="rounded p-1 mb-0.5 text-xs" style={{ background: cfg.bg }}>
                            <p className="font-semibold truncate">{b.pets?.name || '—'}</p>
                            <p className="truncate" style={{ color: 'var(--accent)' }}>{ownerFirst(b)}</p>
                            <div className="flex gap-1 mt-0.5">
                              <span>{b.pets?.type === 'dog' ? '🐕' : '🐈'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="card mt-4">
        <p className="font-semibold text-sm mb-3">Legend</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {[
            { color:'#16a34a', label:'Check-ins (arrivals)' },
            { color:'#dc2626', label:'Check-outs (departures)' },
            { color:'#b45309', label:'Currently staying' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: l.color }}/>
              <span className="text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
