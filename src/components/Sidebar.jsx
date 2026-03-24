import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, BookOpen, DollarSign,
  Receipt, Users, Tag, LogOut, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/admin/dashboard',  icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/admin/bookings',   icon: BookOpen,         label: 'Bookings'        },
  { to: '/admin/calendar',   icon: CalendarDays,     label: 'Calendar'        },
  { to: '/admin/prices',     icon: Tag,              label: 'Prices'          },
  { to: '/admin/receipts',   icon: Receipt,          label: 'Receipts'        },
  { to: '/admin/payments',   icon: DollarSign,       label: 'Payments Ledger' },
  { to: '/admin/users',      icon: Users,            label: 'Users'           },
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🐾</span>
          <div>
            <p className="text-white font-bold text-lg leading-none">Pet Lodge</p>
            <p className="text-slate-400 text-xs mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
              ${isActive
                ? 'bg-brand-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-60 transition-opacity"/>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-700/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
            {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{profile?.full_name ?? 'User'}</p>
            <p className="text-slate-400 text-xs capitalize">{profile?.role ?? 'staff'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white text-sm transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
