import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { format, differenceInDays } from 'date-fns'
import { Printer, Search, Receipt as ReceiptIcon, Loader2 } from 'lucide-react'

export default function Receipts() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)
  const printRef = useRef()

  useEffect(() => {
    supabase
      .from('bookings')
      .select('*, pets(name,species,breed), profiles(full_name,phone,email), services(name,price), payments(*)')
      .in('status', ['completed', 'confirmed'])
      .order('created_at', { ascending: false })
      .then(({ data }) => { setBookings(data ?? []); setLoading(false) })
  }, [])

  function handlePrint() {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Receipt - Pet Lodge JO</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
        h1 { font-size: 24px; } h2 { font-size: 18px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 8px 12px; border-bottom: 1px solid #eee; text-align: left; }
        .total { font-weight: bold; font-size: 18px; }
        @media print { button { display: none; } }
      </style></head>
      <body>${content}</body></html>
    `)
    win.document.close()
    win.print()
  }

  const filtered = bookings.filter(b => {
    if (!search) return true
    const s = search.toLowerCase()
    return b.pets?.name?.toLowerCase().includes(s) || b.profiles?.full_name?.toLowerCase().includes(s)
  })

  const nights = (b) => {
    if (!b.check_in || !b.check_out) return 0
    return Math.max(1, differenceInDays(new Date(b.check_out), new Date(b.check_in)))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Receipts</h1>
        <p className="text-slate-500 text-sm mt-1">Generate and print receipts for completed bookings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking list */}
        <div className="card">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pl-9" placeholder="Search pet or owner…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-brand-600"/>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.map(b => (
                <button key={b.id} onClick={() => setSelected(b)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-150
                    ${selected?.id === b.id
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{b.pets?.name}</p>
                      <p className="text-xs text-slate-500">{b.profiles?.full_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 text-sm">JD {b.total_price ?? 0}</p>
                      <p className="text-xs text-slate-400">{b.check_in ? format(new Date(b.check_in), 'MMM d') : ''}</p>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <ReceiptIcon size={32} className="mx-auto mb-2 opacity-30"/>
                  No completed bookings found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Receipt preview */}
        <div className="card">
          {selected ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-900">Receipt Preview</h3>
                <button onClick={handlePrint} className="btn-primary flex items-center gap-2 text-sm">
                  <Printer size={15}/> Print
                </button>
              </div>

              <div ref={printRef} className="border border-gray-200 rounded-xl p-5 text-sm">
                {/* Header */}
                <div className="text-center border-b border-gray-200 pb-4 mb-4">
                  <div className="text-3xl mb-1">🐾</div>
                  <h2 className="text-lg font-bold text-slate-900">Pet Lodge JO</h2>
                  <p className="text-slate-500 text-xs">Premium Pet Care Services · Jordan</p>
                </div>

                {/* Receipt info */}
                <div className="flex justify-between text-xs text-slate-500 mb-4">
                  <span>Receipt #{selected.id.slice(0,8).toUpperCase()}</span>
                  <span>{format(new Date(selected.created_at), 'MMM d, yyyy')}</span>
                </div>

                {/* Customer */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="font-semibold text-slate-800">{selected.profiles?.full_name}</p>
                  <p className="text-slate-500 text-xs">{selected.profiles?.phone}</p>
                  <p className="text-slate-500 text-xs">{selected.profiles?.email}</p>
                </div>

                {/* Pet & Service */}
                <table className="w-full mb-4">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-2 text-left text-xs font-semibold text-slate-500">Description</th>
                      <th className="pb-2 text-right text-xs font-semibold text-slate-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2">
                        <p className="font-medium text-slate-800">{selected.services?.name}</p>
                        <p className="text-xs text-slate-500">
                          {selected.pets?.name} ({selected.pets?.species}) ·{' '}
                          {selected.check_in ? format(new Date(selected.check_in), 'MMM d') : ''} –{' '}
                          {selected.check_out ? format(new Date(selected.check_out), 'MMM d, yyyy') : ''}
                        </p>
                        <p className="text-xs text-slate-400">
                          {nights(selected)} night{nights(selected) > 1 ? 's' : ''} × JD {selected.services?.price}
                        </p>
                      </td>
                      <td className="py-2 text-right font-semibold text-slate-900">JD {selected.total_price ?? 0}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Total */}
                <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total Paid</span>
                  <span className="text-xl font-bold text-slate-900">JD {selected.total_price ?? 0}</span>
                </div>

                {/* Payment method */}
                {selected.payments?.[0] && (
                  <p className="text-xs text-slate-400 mt-2 text-right capitalize">
                    Paid via {selected.payments[0].method?.replace('_',' ')}
                  </p>
                )}

                <div className="text-center mt-6 text-xs text-slate-400">
                  Thank you for choosing Pet Lodge JO 🐾
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400">
              <ReceiptIcon size={40} className="mb-3 opacity-30"/>
              <p className="text-sm">Select a booking to preview its receipt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
