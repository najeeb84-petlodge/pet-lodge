import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { Users as UsersIcon, Search, Loader2, ShieldCheck, User, Briefcase } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const ROLE_CONFIG = {
  admin:    { label: 'Admin',    icon: ShieldCheck, color: 'text-red-600 bg-red-50',     badge: 'bg-red-100 text-red-800' },
  employee: { label: 'Employee', icon: Briefcase,   color: 'text-blue-600 bg-blue-50',   badge: 'bg-blue-100 text-blue-800' },
  customer: { label: 'Customer', icon: User,        color: 'text-slate-600 bg-slate-50', badge: 'bg-gray-100 text-gray-800' },
}

export default function Users() {
  const { profile: myProfile } = useAuth()
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState(null)

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function changeRole(id, role) {
    if (id === myProfile?.id) return // Can't change own role
    setUpdatingId(id)
    await supabase.from('profiles').update({ role }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
    setUpdatingId(null)
  }

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const s = search.toLowerCase()
    const matchSearch = !search ||
      u.full_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.phone?.toLowerCase().includes(s)
    return matchRole && matchSearch
  })

  const counts = {
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    employee: users.filter(u => u.role === 'employee').length,
    customer: users.filter(u => u.role === 'customer').length,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500 text-sm mt-1">View and manage all registered users</p>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries({ all: { label: 'All Users', badge: 'bg-slate-100 text-slate-700' }, ...Object.fromEntries(Object.entries(ROLE_CONFIG).map(([k,v]) => [k, v])) }).map(([key, cfg]) => (
          <button key={key} onClick={() => setRoleFilter(key)}
            className={`card text-left transition-all duration-150 cursor-pointer
              ${roleFilter === key ? 'ring-2 ring-brand-500' : 'hover:shadow-md'}`}>
            <p className="text-2xl font-bold text-slate-900">{counts[key] ?? 0}</p>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">{cfg.label ?? key}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="Search by name, email, or phone…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      {/* Users table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-brand-600"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <UsersIcon size={40} className="mx-auto mb-2 opacity-30"/>
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['User','Email','Phone','Role','Joined','Change Role'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => {
                  const cfg = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.customer
                  const RoleIcon = cfg.icon
                  const isMe = u.id === myProfile?.id
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isMe ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${cfg.color}`}>
                            {u.full_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{u.full_name ?? '—'} {isMe && <span className="text-xs text-brand-600">(you)</span>}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u.email ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{u.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                          <RoleIcon size={11}/> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {isMe ? (
                          <span className="text-xs text-slate-300 italic">Cannot edit yourself</span>
                        ) : (
                          <div className="flex gap-1.5">
                            {['customer','employee','admin'].filter(r => r !== u.role).map(r => (
                              <button key={r} onClick={() => changeRole(u.id, r)}
                                disabled={updatingId === u.id}
                                className={`px-2 py-1 text-xs rounded-lg capitalize transition-colors font-medium
                                  ${r === 'admin'    ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}
                                  ${r === 'employee' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''}
                                  ${r === 'customer' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : ''}`}>
                                {updatingId === u.id ? '…' : `→ ${r}`}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
