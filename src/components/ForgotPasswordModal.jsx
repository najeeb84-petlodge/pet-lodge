import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { SUPABASE_URL, SUPABASE_KEY } from '../lib/supabase'

const REDIRECT_URL = 'https://booking.petlodgejo.com/auth/set-password'

export default function ForgotPasswordModal({ onClose }) {
  const [email,     setEmail]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      await fetch(
        `${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(REDIRECT_URL)}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
          body:    JSON.stringify({ email: email.trim().toLowerCase() }),
        }
      )
      // Always show success — never reveal whether the email exists
      setSubmitted(true)
    } catch {
      setError('Network error. Please try again.')
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

  if (submitted) {
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src="/logo.jpg" alt="Pet Lodge" style={{ height: '52px', width: 'auto', borderRadius: '8px' }} />
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: '700', color: '#2d3a1e', textAlign: 'center' }}>
            Reset your password
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.6 }}>
            If an account exists for that email, a password reset link has been sent. Check your inbox.
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

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.jpg" alt="Pet Lodge" style={{ height: '52px', width: 'auto', borderRadius: '8px' }} />
        </div>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: '700', color: '#2d3a1e', textAlign: 'center' }}>
          Reset your password
        </h2>
        <p style={{ margin: '0 0 4px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.6 }}>
          Enter your email and we&apos;ll send you a link to reset your password.
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
            Email address <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            style={{ ...inputStyle, ...(loading ? { opacity: 0.6 } : {}) }}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="you@example.com"
            disabled={loading}
            autoFocus
          />

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
            {loading ? 'Sending…' : 'Send reset link'}
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
