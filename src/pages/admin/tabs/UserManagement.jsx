import { useEffect, useState } from 'react'
import { dbQuery, dbUpdate, SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../../lib/supabase'
import { Loader2, Plus } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'

const ROLE_BADGE = {
  super_admin: { bg:'#fee2e2', color:'#991b1b', label:'⊙ Super Admin' },
  admin:       { bg:'#fef9c3', color:'#854d0e', label:'Admin' },
  employee:    { bg:'#dbeafe', color:'#1e40af', label:'Employee' },
  customer:    { bg:'#dcfce7', color:'#166534', label:'Customer' },
}

export default function UserManagement() {
  const { profile: me } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole]   = useState('admin')
  const [adding, setAdding]     = useState(false)
  const [error, setError]       = useState('')

  async function fetchUsers() {
    setLoading(true)
    try {
      const data = await dbQuery('profiles', '?role=in.(admin,super_admin,employee)&order=created_at')
      setUsers(Array.isArray(data) ? data : [])
    } catch(e) {
      setError('Could not load users')
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function addAdmin() {
    if (!newEmail) return
    setAdding(true)
    try {
      const existing = await dbQuery('profiles', `?email=eq.${encodeURIComponent(newEmail)}&select=id`)
      if (existing?.length > 0) {
        await dbUpdate('profiles', existing[0].id, { role: newRole })
        await fetchUsers()
      } else {
        setError('User not found — they must sign up first')
      }
    } catch(e) { setError('Error adding user') }
    setNewEmail('')
    setAdding(false)
  }

  async function changeRole(id, role) {
    await dbUpdate('profiles', id, { role })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  return (
    <div className="card">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color:'var(--accent)' }}>
        👥 User Management
      </h2>

      {error && (
        <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', color:'#991b1b', padding:'0.75rem', borderRadius:'0.5rem', fontSize:'0.875rem', marginBottom:'1rem' }}>
          {error}
        </div>
      )}

      {/* Add admin form */}
      <div style={{ background:'var(--light)', border:'1px solid var(--border)', borderRadius:'0.75rem', padding:'1rem', marginBottom:'1.5rem' }}>
        <p className="font-semibold text-sm mb-1">Add Admin User</p>
        <p className="text-xs mb-3" style={{ color:'var(--muted)' }}>The person must have logged into the app at least once before they can be added.</p>
        <div className="flex gap-2 flex-wrap">
          <input className="input flex-1" style={{ minWidth:'200px' }} placeholder="employee@example.com"
            value={newEmail} onChange={e => setNewEmail(e.target.value)}/>
          <select className="input" style={{ width:'130px' }} value={newRole} onChange={e => setNewRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button onClick={addAdmin} disabled={adding} className="btn-primary" style={{ padding:'0.5rem 1rem' }}>
            {adding ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : '+'} Add
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}>
          <Loader2 size={28} style={{ animation:'spin 1s linear infinite', color:'var(--accent)' }}/>
        </div>
      ) : (
        <table style={{ width:'100%', fontSize:'0.875rem', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['EMAIL','NAME','CURRENT ROLE','ACTIONS'].map(h => (
                <th key={h} style={{ padding:'0.5rem 0.75rem', textAlign:'left', fontSize:'0.75rem', fontWeight:'600', color:'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={4} style={{ padding:'2rem', textAlign:'center', color:'var(--muted)' }}>No admin users found</td></tr>
            ) : users.map(u => {
              const badge = ROLE_BADGE[u.role] || ROLE_BADGE.customer
              const isMe = u.id === me?.id
              return (
                <tr key={u.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'0.75rem' }}>{u.email}</td>
                  <td style={{ padding:'0.75rem' }}>{`${u.first_name||''} ${u.last_name||''}`.trim() || '—'}</td>
                  <td style={{ padding:'0.75rem' }}>
                    <span style={{ padding:'2px 10px', borderRadius:'9999px', fontSize:'0.75rem', fontWeight:'600', background:badge.bg, color:badge.color }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding:'0.75rem' }}>
                    {!isMe && (
                      <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                        {u.role === 'admin' && (
                          <button onClick={() => changeRole(u.id,'super_admin')}
                            style={{ fontSize:'0.75rem', padding:'2px 10px', borderRadius:'4px', border:'1px solid #fde68a', color:'#92400e', background:'white', cursor:'pointer' }}>
                            Promote to Super Admin
                          </button>
                        )}
                        {u.role === 'super_admin' && (
                          <button onClick={() => changeRole(u.id,'admin')}
                            style={{ fontSize:'0.75rem', padding:'2px 10px', borderRadius:'4px', border:'1px solid #fed7aa', color:'#9a3412', background:'white', cursor:'pointer' }}>
                            Demote to Admin
                          </button>
                        )}
                        {['admin','super_admin','employee'].includes(u.role) && (
                          <button onClick={() => changeRole(u.id,'customer')}
                            style={{ fontSize:'0.75rem', padding:'2px 10px', borderRadius:'4px', border:'1px solid #fca5a5', color:'#991b1b', background:'white', cursor:'pointer' }}>
                            Remove Admin
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
