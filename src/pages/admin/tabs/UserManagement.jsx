import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Loader2, Plus } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'

const ROLE_BADGE = {
  super_admin: 'background:#fee2e2;color:#991b1b;',
  admin:       'background:#fef9c3;color:#854d0e;',
  employee:    'background:#dbeafe;color:#1e40af;',
  customer:    'background:#dcfce7;color:#166534;',
}

export default function UserManagement() {
  const { profile: me } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole]   = useState('admin')
  const [adding, setAdding]     = useState(false)

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin','super_admin','employee'])
      .order('created_at')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function addAdmin() {
    if (!newEmail) return
    setAdding(true)
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', newEmail).single()
    if (existing) {
      await supabase.from('profiles').update({ role: newRole }).eq('id', existing.id)
      await fetchUsers()
    }
    setNewEmail('')
    setAdding(false)
  }

  async function changeRole(id, role) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin" style={{ color:'var(--accent)' }}/></div>

  return (
    <div className="card">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color:'var(--accent)' }}>
        👥 User Management
      </h2>

      {/* Add admin form */}
      <div className="rounded-xl p-4 mb-6" style={{ background:'var(--light)', border:'1px solid var(--border)' }}>
        <p className="font-semibold text-sm mb-1">Add Admin User</p>
        <p className="text-xs text-gray-500 mb-3">The person must have logged into the app at least once before they can be added.</p>
        <div className="flex gap-2 flex-wrap">
          <input className="input flex-1 min-w-48" placeholder="employee@example.com"
            value={newEmail} onChange={e => setNewEmail(e.target.value)}/>
          <select className="input w-32" value={newRole} onChange={e => setNewRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button onClick={addAdmin} disabled={adding} className="btn-primary flex items-center gap-1">
            {adding ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Add
          </button>
        </div>
      </div>

      {/* Users table */}
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom:'1px solid var(--border)' }}>
            {['EMAIL','NAME','CURRENT ROLE','ACTIONS'].map(h => (
              <th key={h} className="pb-2 text-left text-xs font-semibold" style={{ color:'var(--muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom:'1px solid var(--border)' }}>
              <td className="py-3">{u.email}</td>
              <td className="py-3">{`${u.first_name||''} ${u.last_name||''}`.trim() || '—'}</td>
              <td className="py-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={ROLE_BADGE[u.role] || ROLE_BADGE.customer}>
                  {u.role === 'super_admin' ? '⊙ Super Admin' : u.role?.charAt(0).toUpperCase()+u.role?.slice(1)}
                </span>
              </td>
              <td className="py-3">
                {u.id !== me?.id && (
                  <div className="flex gap-2 flex-wrap">
                    {u.role === 'admin' && <button onClick={() => changeRole(u.id,'super_admin')} className="text-xs px-3 py-1 rounded border border-yellow-200 text-yellow-700 hover:bg-yellow-50">Promote to Super Admin</button>}
                    {u.role === 'super_admin' && <button onClick={() => changeRole(u.id,'admin')} className="text-xs px-3 py-1 rounded border border-orange-200 text-orange-700 hover:bg-orange-50">Demote to Admin</button>}
                    {['admin','super_admin'].includes(u.role) && <button onClick={() => changeRole(u.id,'customer')} className="text-xs px-3 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">Remove Admin</button>}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
