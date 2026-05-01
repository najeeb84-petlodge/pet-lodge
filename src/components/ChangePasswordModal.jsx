import { useState, useEffect } from 'react'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../lib/supabase'

const LS_KEY = 'sb-qcwbkpcwtxpokgseethp-auth-token'

export default function ChangePasswordModal({ onClose, userEmail }) {
  const [hasEmailProvider, setHasEmailProvider] = useState(true)
  const [currentPassword,  setCurrentPassword]  = useState('')
  const [newPassword,      setNewPassword]       = useState('')
  const [confirmPassword,  setConfirmPassword]   = useState('')
  const [loading,          setLoading]           = useState(false)
  const [error,            setError]             = useState('')
  const [success,          setSuccess]           = useState(false)
  const [showCurrent,      setShowCurrent]       = useState(false)
  const [showNew,          setShowNew]           = useState(false)
  const [showConfirmPw,    setShowConfirmPw]     = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const parsed     = JSON.parse(raw)
      const identities = parsed?.user?.identities
      if (Array.isArray(identities) && identities.length > 0) {
        setHasEmailProvider(identities.some(i => i.provider === 'email'))
      }
      // If identities is undefined/empty, default stays true (fallback)
    } catch { /* keep default */ }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password.')
      return
    }

    setLoading(true)
    try {
      // Step A: verify current password
      const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
        body:    JSON.stringify({ email: userEmail, password: currentPassword }),
      })
      if (!verifyRes.ok) {
        const body = await verifyRes.json().catch(() => ({}))
        setError(verifyRes.status === 400
          ? 'Current password is incorrect.'
          : (body?.error_description || 'Network error, please try again.')
        )
        return
      }

      // Step B: update to new password
      const token     = getAccessToken()
      const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method:  'PUT',
        headers: {
          apikey:         SUPABASE_KEY,
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      })
      if (!updateRes.ok) {
        setError('Failed to update password. Please try again.')
        return
      }

      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch {
      setError('Network error, please try again.')
    } finally {
      setLoading(false)
    }
  }

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 50,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 16px',
  }

  const card = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  }

  const inputStyle = {
    display: 'block',
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginTop: '4px',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#6b7280',
    marginTop: '16px',
  }

  // OAuth-only user — no password set
  // NOTE: when backlog item "Resend welcome / Send password reset tools" ships, update
  // this message to point users to the new self-serve forgot-password flow instead.
  if (!hasEmailProvider) {
    return (
      <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src="/logo.jpg" alt="Pet Lodge" style={{ height: '52px', width: 'auto', borderRadius: '8px' }} />
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: '700', color: '#2d3a1e', textAlign: 'center' }}>
            Change Password
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.6 }}>
            Your account uses Google Sign-In and doesn&apos;t have a password set. Contact us at{' '}
            <a href="mailto:info@petlodgejo.com" style={{ color: '#5a7a2e', fontWeight: '600', textDecoration: 'underline' }}>
              info@petlodgejo.com
            </a>
            {' '}if you&apos;d like to add one.
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'block', width: '100%', padding: '10px', borderRadius: '6px',
              border: '1px solid #d1d5db', background: 'white', color: '#374151',
              fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
            }}>
            Close
          </button>
        </div>
      </div>
    )
  }

  // Success state — auto-closes after 1.5 s
  if (success) {
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '2.5rem' }}>✅</div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#2d3a1e', textAlign: 'center' }}>
            Password updated successfully.
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.jpg" alt="Pet Lodge" style={{ height: '52px', width: 'auto', borderRadius: '8px' }} />
        </div>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: '700', color: '#2d3a1e', textAlign: 'center' }}>
          Change Password
        </h2>
        <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>
          {userEmail}
        </p>

        {error && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b',
            padding: '10px 12px', borderRadius: '6px', fontSize: '0.875rem', marginTop: '12px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Current password <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: '2.5rem', ...(loading ? { opacity: 0.6 } : {}) }}
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => { setCurrentPassword(e.target.value); setError('') }}
              placeholder="Enter your current password"
              disabled={loading}
              autoFocus
            />
            <button type="button" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}
              style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:'2px', color:'#9ca3af', display:'flex', alignItems:'center' }}>
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label style={labelStyle}>
            New password <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: '2.5rem', ...(loading ? { opacity: 0.6 } : {}) }}
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setError('') }}
              placeholder="At least 8 characters"
              disabled={loading}
            />
            <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1}
              style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:'2px', color:'#9ca3af', display:'flex', alignItems:'center' }}>
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label style={labelStyle}>
            Confirm new password <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: '2.5rem', ...(loading ? { opacity: 0.6 } : {}) }}
              type={showConfirmPw ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError('') }}
              placeholder="Repeat your new password"
              disabled={loading}
            />
            <button type="button" onClick={() => setShowConfirmPw(v => !v)} tabIndex={-1}
              style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:'2px', color:'#9ca3af', display:'flex', alignItems:'center' }}>
              {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              width: '100%', marginTop: '24px', padding: '11px',
              borderRadius: '6px', border: 'none',
              background: loading ? '#9db899' : '#5a7a2e',
              color: 'white', fontSize: '0.95rem', fontWeight: '700',
              cursor: loading ? 'default' : 'pointer',
            }}>
            {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {loading ? 'Updating…' : 'Change Password'}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              display: 'block', width: '100%', marginTop: '10px', padding: '10px',
              borderRadius: '6px', border: '1px solid #d1d5db',
              background: 'white', color: '#374151', fontSize: '0.9rem', fontWeight: '600',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}>
            Cancel
          </button>
        </form>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
