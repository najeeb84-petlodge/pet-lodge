import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarPlus, PawPrint, ClipboardList, User, LogOut, Pencil, X, Check, Loader2 } from 'lucide-react'
import TopNav from '../../components/TopNav'
import { useAuth } from '../../contexts/AuthContext'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../lib/supabase'

const STATUS_CLASS = {
  pending:   'badge-pending',
  confirmed: 'badge-confirmed',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
}

function formatDate(str) {
  if (!str) return '—'
  // dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/')
    return `${d}/${m}/${y}`
  }
  // ISO
  try {
    return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return str }
}

async function restFetch(path, opts = {}) {
  const token = getAccessToken()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export default function CustomerDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  // Full profile (includes phone, whatsapp_number etc.)
  const [fullProfile, setFullProfile] = useState(null)
  // Bookings
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  // Active count for "My Bookings" card
  const [activeCount, setActiveCount] = useState(0)
  // Edit profile state
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const firstName = fullProfile?.first_name || profile?.full_name?.split(' ')[0] || 'there'

  // Fetch full profile
  useEffect(() => {
    if (!profile?.id) return
    restFetch(`profiles?id=eq.${profile.id}&select=id,first_name,last_name,email,phone,whatsapp_number,address_neighbourhood,address_street,address_flat`)
      .then(data => {
        const prof = Array.isArray(data) ? data[0] : data
        if (prof) setFullProfile(prof)
      })
  }, [profile?.id])

  // Fetch recent bookings + active count
  useEffect(() => {
    if (!profile?.email) return
    const email = encodeURIComponent(profile.email)
    setBookingsLoading(true)

    // Last 3 for display
    restFetch(`bookings?customer_email=eq.${email}&order=created_at.desc&limit=3&select=id,booking_reference,service_type,status,check_in_date,check_out_date,created_at`)
      .then(data => {
        setBookings(Array.isArray(data) ? data : [])
      })
      .finally(() => setBookingsLoading(false))

    // Active count
    restFetch(`bookings?customer_email=eq.${email}&status=in.(pending,confirmed)&select=id`)
      .then(data => setActiveCount(Array.isArray(data) ? data.length : 0))
  }, [profile?.email])

  function startEdit() {
    setEditForm({
      first_name:           fullProfile?.first_name || '',
      last_name:            fullProfile?.last_name || '',
      phone:                fullProfile?.phone || '',
      whatsapp_number:      fullProfile?.whatsapp_number || '',
    })
    setSaveError('')
    setEditing(true)
  }

  async function saveEdit() {
    if (!fullProfile?.id) return
    setSaving(true)
    setSaveError('')
    const result = await restFetch(`profiles?id=eq.${fullProfile.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        first_name:      editForm.first_name.trim(),
        last_name:       editForm.last_name.trim(),
        phone:           editForm.phone.trim(),
        whatsapp_number: editForm.whatsapp_number.trim(),
      }),
    })
    setSaving(false)
    if (result !== null) {
      setFullProfile(p => ({ ...p, ...editForm }))
      setEditing(false)
    } else {
      setSaveError('Failed to save. Please try again.')
    }
  }

  function handleSignOut() {
    localStorage.removeItem('sb-qcwbkpcwtxpokgseethp-auth-token')
    signOut()
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8f9f6' }}>
      <TopNav />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>
            Welcome back, {firstName}!
          </h1>
          <p style={{ color: 'var(--muted)' }}>
            Manage your pet care bookings and discover our premium services.
          </p>
        </div>

        {/* Three action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* New Booking */}
          <Link to="/booking" className="card flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--light)' }}>
              <CalendarPlus size={22} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>New Booking</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Book a stay or service</p>
            </div>
            <span className="btn-primary text-sm w-full justify-center">Book Now</span>
          </Link>

          {/* My Bookings */}
          <Link to="/my-bookings" className="card flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#eff6ff' }}>
              <ClipboardList size={22} className="text-blue-600" />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>My Bookings</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {activeCount > 0 ? `${activeCount} active booking${activeCount > 1 ? 's' : ''}` : 'View all bookings'}
              </p>
            </div>
            <span className="btn-secondary text-sm w-full justify-center">View Bookings</span>
          </Link>

          {/* My Pets */}
          <Link to="/my-pets" className="card flex flex-col items-center text-center gap-3 hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#faf5ff' }}>
              <PawPrint size={22} className="text-purple-600" />
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>My Pets</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Manage pet profiles</p>
            </div>
            <span className="btn-secondary text-sm w-full justify-center">Manage Pets</span>
          </Link>
        </div>

        {/* Recent Bookings */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>Recent Bookings</h2>
            {bookings.length > 0 && (
              <Link to="/my-bookings" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                View all →
              </Link>
            )}
          </div>

          {bookingsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-10">
              <PawPrint size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--primary)' }} />
              <p className="font-medium mb-1" style={{ color: 'var(--text)' }}>No bookings yet</p>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>Your bookings will appear here once you make one.</p>
              <Link to="/booking" className="btn-primary">Make Your First Booking</Link>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {bookings.map(b => (
                <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                        #{b.booking_reference || b.id?.slice(0, 8)}
                      </span>
                      <span className={STATUS_CLASS[b.status] || 'badge-pending'}>
                        {b.status || 'pending'}
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-0.5 capitalize" style={{ color: 'var(--text)' }}>
                      {b.service_type || 'Service'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {b.check_in_date ? `${formatDate(b.check_in_date)}${b.check_out_date ? ` → ${formatDate(b.check_out_date)}` : ''}` : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Management */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>Account Management</h2>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm flex items-center gap-1.5"
              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>

          <div className="border rounded-xl p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User size={16} style={{ color: 'var(--primary)' }} />
                <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>Profile Information</span>
              </div>
              {!editing ? (
                <button onClick={startEdit} className="btn-secondary text-xs flex items-center gap-1.5">
                  <Pencil size={12} /> Edit Profile
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Save
                  </button>
                  <button
                    onClick={() => { setEditing(false); setSaveError('') }}
                    disabled={saving}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <X size={12} /> Cancel
                  </button>
                </div>
              )}
            </div>

            {saveError && (
              <p className="text-xs text-red-600 mb-3">{saveError}</p>
            )}

            {!editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name" value={`${fullProfile?.first_name || ''} ${fullProfile?.last_name || ''}`.trim() || '—'} />
                <Field label="Email" value={fullProfile?.email || profile?.email || '—'} />
                <Field label="Contact Number" value={fullProfile?.phone || '—'} />
                <Field label="WhatsApp Number" value={fullProfile?.whatsapp_number || '—'} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <EditField label="First Name" value={editForm.first_name} onChange={v => setEditForm(f => ({ ...f, first_name: v }))} />
                <EditField label="Last Name" value={editForm.last_name} onChange={v => setEditForm(f => ({ ...f, last_name: v }))} />
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Email</label>
                  <p className="input text-sm cursor-not-allowed opacity-60">{fullProfile?.email || profile?.email || '—'}</p>
                </div>
                <EditField label="Contact Number" value={editForm.phone} onChange={v => setEditForm(f => ({ ...f, phone: v }))} />
                <EditField label="WhatsApp Number" value={editForm.whatsapp_number} onChange={v => setEditForm(f => ({ ...f, whatsapp_number: v }))} />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs mb-0.5 font-medium" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  )
}

function EditField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
      <input
        className="input text-sm"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
