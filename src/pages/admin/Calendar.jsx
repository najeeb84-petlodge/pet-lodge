import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_DOT = {
  pending:     'bg-yellow-400',
  confirmed:   'bg-blue-400',
  in_progress: 'bg-green-400',
  completed:   'bg-gray-400',
  cancelled:   'bg-red-400',
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings]       = useState([])
  const [dayBookings, setDayBookings] = useState({ day: null, items: [] })

  useEffect(() => {
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end   = format(endOfMonth(currentDate),   'yyyy-MM-dd')
    supabase
      .from('bookings')
      .select('*, pets(name), profiles(full_name), services(name)')
      .lte('check_in', end)
      .gte('check_out', start)
      .then(({ data }) => setBookings(data ?? []))
  }, [currentDate])

  function bookingsForDay(date) {
    const d = format(date, 'yyyy-MM-dd')
    return bookings.filter(b => b.check_in <= d && b.check_out >= d)
  }

  const monthStart  = startOfMonth(currentDate)
  const calStart    = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd      = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 })
  const days        = eachDayOfInterval({ start: calStart, end: calEnd })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Booking Calendar</h1>
        <p className="text-slate-500 text-sm mt-1">Visual overview of all bookings</p>
      </div>

      <div className="card">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18}/>
          </button>
          <h2 className="text-lg font-semibold text-slate-900">{format(currentDate, 'MMMM yyyy')}</h2>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={18}/>
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          {Object.entries(STATUS_DOT).map(([s, cls]) => (
            <div key={s} className="flex items-center gap-1.5 capitalize">
              <span className={`w-2.5 h-2.5 rounded-full ${cls}`}/>
              {s.replace('_', ' ')}
            </div>
          ))}
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {days.map(day => {
            const dayBks = bookingsForDay(day)
            const inMonth = isSameMonth(day, currentDate)
            const today   = isToday(day)
            const isSelected = dayBookings.day && isSameDay(day, dayBookings.day)

            return (
              <div key={day.toISOString()}
                onClick={() => setDayBookings({ day, items: dayBks })}
                className={`bg-white min-h-[80px] p-2 cursor-pointer transition-colors hover:bg-amber-50
                  ${!inMonth ? 'opacity-40' : ''}
                  ${isSelected ? 'bg-amber-50 ring-2 ring-brand-500 ring-inset' : ''}`}>
                <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1
                  ${today ? 'bg-brand-600 text-white' : 'text-slate-700'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayBks.slice(0, 3).map(b => (
                    <div key={b.id} className={`flex items-center gap-1 rounded px-1 py-0.5 bg-gray-50`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[b.status] ?? 'bg-gray-400'}`}/>
                      <span className="text-xs text-slate-600 truncate">{b.pets?.name}</span>
                    </div>
                  ))}
                  {dayBks.length > 3 && (
                    <div className="text-xs text-slate-400 pl-1">+{dayBks.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {dayBookings.day && dayBookings.items.length > 0 && (
        <div className="card mt-4">
          <h3 className="font-semibold text-slate-900 mb-3">
            {format(dayBookings.day, 'EEEE, MMMM d')} — {dayBookings.items.length} booking{dayBookings.items.length > 1 ? 's' : ''}
          </h3>
          <div className="space-y-2">
            {dayBookings.items.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[b.status] ?? 'bg-gray-400'}`}/>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{b.pets?.name}</p>
                    <p className="text-xs text-slate-400">{b.profiles?.full_name} · {b.services?.name}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 capitalize">{b.status?.replace('_',' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
