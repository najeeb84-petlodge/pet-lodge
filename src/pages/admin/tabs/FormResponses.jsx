import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { format } from 'date-fns'
import { Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

export default function FormResponses({ isSuperAdmin }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase
      .from('bookings')
      .select('*, pets(name,type,breed,gender,age), profiles(first_name,last_name,email,phone,whatsapp), services(name,category)')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setBookings(data ?? []); setLoading(false) })
  }, [])

  function exportToExcel() {
    const headers = ['Booking ID','Customer First Name','Customer Last Name','Email','Phone','WhatsApp','Pet Names','Pet Types','Pet Breeds','Pet Gender','Pet Ages','Service','Check-in','Check-out','Total Days','Amount','Status','Created At']
    const rows = bookings.map(b => [
      b.booking_ref || b.id?.slice(0,8),
      b.profiles?.first_name || '',
      b.profiles?.last_name || '',
      b.profiles?.email || '',
      b.profiles?.phone || '',
      b.profiles?.whatsapp || '',
      b.pets?.name || '',
      b.pets?.type || '',
      b.pets?.breed || '',
      b.pets?.gender || '',
      b.pets?.age || '',
      b.services?.name || '',
      b.start_date || '',
      b.end_date || '',
      b.total_days || '',
      b.total_amount || b.total_price || '',
      b.status || '',
      b.created_at ? format(new Date(b.created_at), 'dd/MM/yyyy') : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `pet-lodge-bookings-${format(new Date(),'yyyyMMdd')}.csv`
    a.click()
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin" style={{ color:'var(--accent)' }}/></div>

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor:'var(--border)' }}>
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2" style={{ color:'var(--accent)' }}>
            📋 Form Responses
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">💡 Tip: Use mouse wheel or trackpad to scroll horizontally through all columns</p>
        </div>
        {isSuperAdmin && (
          <button onClick={exportToExcel} className="btn-primary flex items-center gap-2 text-sm">
            <Download size={15}/> Export to Excel
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ minWidth:'1200px' }}>
          <thead style={{ background:'var(--light)' }}>
            <tr>
              {['Booking ID','Customer First Name','Customer Last Name','Email','Phone','Pet Names','Pet Types','Pet Breeds','Pet Gender','Pet Ages','Service','Check-in','Check-out','Amount','Status'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap" style={{ color:'var(--muted)', borderBottom:`1px solid var(--border)` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b, i) => (
              <tr key={b.id} className={i % 2 === 0 ? 'bg-white' : ''} style={{ background: i%2===1 ? '#fafaf8' : 'white' }}>
                <td className="px-3 py-2 font-mono" style={{ color:'var(--accent)' }}>{b.booking_ref || b.id?.slice(0,8)}</td>
                <td className="px-3 py-2">{b.profiles?.first_name || '—'}</td>
                <td className="px-3 py-2">{b.profiles?.last_name || '—'}</td>
                <td className="px-3 py-2">{b.profiles?.email || '—'}</td>
                <td className="px-3 py-2">{b.profiles?.phone || '—'}</td>
                <td className="px-3 py-2">{b.pets?.name || '—'}</td>
                <td className="px-3 py-2">{b.pets?.type || '—'}</td>
                <td className="px-3 py-2">{b.pets?.breed || '—'}</td>
                <td className="px-3 py-2">{b.pets?.gender || '—'}</td>
                <td className="px-3 py-2">{b.pets?.age || '—'}</td>
                <td className="px-3 py-2">{b.services?.name || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{b.start_date ? format(new Date(b.start_date),'dd/MM/yyyy') : '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{b.end_date ? format(new Date(b.end_date),'dd/MM/yyyy') : '—'}</td>
                <td className="px-3 py-2 font-semibold">JD {b.total_amount || b.total_price || 0}</td>
                <td className="px-3 py-2"><span className={`badge-${b.status}`}>{b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
