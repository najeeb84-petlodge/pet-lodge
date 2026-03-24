import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { BookOpen, DollarSign, PawPrint, Clock, TrendingUp, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white"/>
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const STATUS_COLORS = {
  pending:    'badge-pending',
  confirmed:  'badge-confirmed',
  active:     'badge-active',
  in_progress:'badge-active',
  completed:  'badge-completed',
  cancelled:  'badge-cancelled',
}

export default function AdminDashboard() {
  const [stats, setStats]     = useState({ bookings: 0, revenue: 0, pets: 0, pending: 0 })
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]

      const [
        { count: totalBookings },
        { count: pendingCount },
        { count: petCount },
        { data: payments },
        { data: recentBookings },
      ] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('pets').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('amount').eq('status', 'paid'),
        supabase.from('bookings')
          .select('*, pets(name), profiles(full_name), services(name)')
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      const revenue = payments?.reduce((s, p) => s + (p.amount || 0), 0) ?? 0
      setStats({ bookings: totalBookings ?? 0, revenue, pets: petCount ?? 0, pending: pendingCount ?? 0 })
      setRecent(recentBookings ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full"/>
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen}   label="Total Bookings"     value={stats.bookings} color="bg-blue-500"/>
        <StatCard icon={DollarSign} label="Total Revenue"      value={`JD ${stats.revenue.toFixed(0)}`} color="bg-emerald-500"/>
        <StatCard icon={PawPrint}   label="Registered Pets"    value={stats.pets}     color="bg-purple-500"/>
        <StatCard icon={Clock}      label="Pending Approval"   value={stats.pending}  color="bg-amber-500" sub="Need action"/>
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Recent Bookings</h2>
          <Link to="/admin/bookings" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View all <ArrowRight size={14}/>
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <BookOpen size={40} className="mx-auto mb-2 opacity-30"/>
            <p>No bookings yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Pet','Owner','Service','Check-in','Check-out','Status'].map(h => (
                    <th key={h} className="pb-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-medium text-slate-800">{b.pets?.name ?? '—'}</td>
                    <td className="py-3 text-slate-600">{b.profiles?.full_name ?? '—'}</td>
                    <td className="py-3 text-slate-600">{b.services?.name ?? '—'}</td>
                    <td className="py-3 text-slate-500">{b.check_in ? format(new Date(b.check_in), 'MMM d') : '—'}</td>
                    <td className="py-3 text-slate-500">{b.check_out ? format(new Date(b.check_out), 'MMM d') : '—'}</td>
                    <td className="py-3">
                      <span className={STATUS_COLORS[b.status] ?? 'badge-pending'}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
