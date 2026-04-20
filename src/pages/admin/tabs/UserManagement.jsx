import { useEffect, useState } from 'react'
import { dbQuery, dbUpdate } from '../../../lib/supabase'
import { Loader2, Download } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { format } from 'date-fns'

const ROLE_BADGE = {
  super_admin: { bg:'#d1fae5', color:'#065f46', label:'⊙ Super Admin' },
  admin:       { bg:'#dcfce7', color:'#166534', label:'Admin' },
  employee:    { bg:'#dbeafe', color:'#1e40af', label:'Employee' },
  customer:    { bg:'#f1f5f9', color:'#475569', label:'Customer' },
}

export default function UserManagement({ isSuperAdmin }) {
  const { profile: me } = useAuth()
  const [users,      setUsers]     = useState([])
  const [loading,    setLoading]   = useState(true)
  const [newEmail,   setNewEmail]  = useState('')
  const [newRole,    setNewRole]   = useState('admin')
  const [adding,     setAdding]    = useState(false)
  const [error,      setError]     = useState('')

  // Customer Base state
  const [customers,        setCustomers]        = useState([])
  const [customersLoading, setCustomersLoading] = useState(true)

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

  async function fetchCustomers() {
    setCustomersLoading(true)
    const data = await dbQuery('profiles', '?role=eq.customer&order=created_at.desc')
    setCustomers(Array.isArray(data) ? data : [])
    setCustomersLoading(false)
  }

  function exportCustomers() {
    const headers = ['Full Name', 'Email', 'Phone', 'WhatsApp', 'Registration Date']
    const rows = customers.map(c => [
      `${c.first_name || ''} ${c.last_name || ''}`.trim() || '—',
      c.email || '',
      c.phone || '',
      c.whatsapp || '',
      c.created_at ? format(new Date(c.created_at), 'dd/MM/yyyy') : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pet-lodge-customers-${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => { fetchUsers(); fetchCustomers() }, [])

  async function addAdmin() {
    if (!newEmail) return
    setAdding(true)
    setError('')
    try {
      // Update user_metadata.role via secure server-side API (requires service role key)
      const roleRes = await fetch('/api/admin-set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, role: newRole }),
      })
      const roleBody = await roleRes.json()
      if (!roleRes.ok) {
        setError(roleBody?.error || 'Failed to update user role')
        setAdding(false)
        return
      }

      // Sync the profiles table using the userId returned by the API (more reliable than email lookup)
      if (roleBody.userId) {
        await dbUpdate('profiles', roleBody.userId, { role: newRole })
      }

      await fetchUsers()
    } catch(e) { setError('Error adding user') }
    setNewEmail('')
    setAdding(false)
  }

  async function changeRole(id, role) {
    // Find the email for this user so we can update user_metadata via admin API
    const target = users.find(u => u.id === id)
    if (target?.email) {
      await fetch('/api/admin-set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target.email, role }),
      })
    }
    await dbUpdate('profiles', id, { role })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  return (
    <div className="space-y-6">
    <div className="card">
      <div className="mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2" style={{ color:'var(--accent)' }}>
          👥 User Management
        </h2>
      </div>

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

    {/* ── Customer Base ─────────────────────────────────────────────── */}
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--accent)' }}>
          Customer Base
          {!customersLoading && (
            <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>
              ({customers.length})
            </span>
          )}
        </h2>
        {isSuperAdmin && customers.length > 0 && (
          <button onClick={exportCustomers} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={14} /> Download CSV
          </button>
        )}
      </div>

      {customersLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : customers.length === 0 ? (
        <p className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>No customers found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['NAME', 'EMAIL', 'PHONE', 'JOINED DATE', 'ACTIONS'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? '#fafaf8' : 'white' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                    {`${c.first_name || ''} ${c.last_name || ''}`.trim() || '—'}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--muted)' }}>{c.email || '—'}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--muted)' }}>{c.phone || '—'}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {c.created_at ? format(new Date(c.created_at), 'dd MMM yyyy') : '—'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--primary)', background: 'white', cursor: 'pointer' }}
                    >
                      View
                    </button>
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
