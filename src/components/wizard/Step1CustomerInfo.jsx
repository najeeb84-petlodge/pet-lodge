import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useWizard } from '../../contexts/WizardContext'
import { useAuth } from '../../contexts/AuthContext'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../lib/supabase'

const HEARD_FROM_OPTIONS = [
  'Google',
  'Instagram',
  'Facebook',
  'Friend / Word of mouth',
  'Returning customer',
  'Other',
]

const REQUIRED = ['first_name', 'last_name', 'email', 'contact_number']

function Req() {
  return <span className="text-red-500"> *</span>
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
        {label}{required && <Req />}
      </label>
      {children}
    </div>
  )
}

export default function Step1CustomerInfo() {
  const { customerInfo, setCustomerInfo, nextStep } = useWizard()
  const { profile } = useAuth()

  const [form, setForm]       = useState(customerInfo)
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)

  // Pre-fill from profiles table on first mount if form is blank
  useEffect(() => {
    if (!profile?.id) return
    // Only pre-fill if nothing has been entered yet
    if (form.first_name || form.email) return

    setLoading(true)
    const token = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}&select=first_name,last_name,email,phone,whatsapp_number`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token || SUPABASE_KEY}`,
        },
      }
    )
      .then(r => r.json())
      .then(data => {
        const p = Array.isArray(data) ? data[0] : null
        if (!p) return
        setForm(f => ({
          ...f,
          first_name:      p.first_name      || f.first_name,
          last_name:       p.last_name       || f.last_name,
          email:           p.email           || f.email,
          contact_number:  p.phone           || f.contact_number,
          whatsapp_number: p.whatsapp_number || f.whatsapp_number,
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [profile?.id])

  // Keep whatsapp in sync when "same as contact" is checked
  useEffect(() => {
    if (form.whatsapp_same) {
      setForm(f => ({ ...f, whatsapp_number: f.contact_number }))
    }
  }, [form.whatsapp_same, form.contact_number])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: false }))
  }

  function validate() {
    const newErrors = {}
    for (const k of REQUIRED) {
      if (!String(form[k] ?? '').trim()) newErrors[k] = true
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (!validate()) return
    setCustomerInfo(form)
    nextStep()
  }

  const inputClass = (key) =>
    `input${errors[key] ? ' border-red-400 focus:border-red-400' : ''}`

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>
        Customer Information
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Tell us about yourself so we can prepare for your pet's stay.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First Name" required>
          <input
            className={inputClass('first_name')}
            value={form.first_name}
            onChange={e => set('first_name', e.target.value)}
            placeholder="Najeeb"
          />
          {errors.first_name && <p className="text-xs text-red-500 mt-1">Required</p>}
        </Field>

        <Field label="Last Name" required>
          <input
            className={inputClass('last_name')}
            value={form.last_name}
            onChange={e => set('last_name', e.target.value)}
            placeholder="Abdelhadi"
          />
          {errors.last_name && <p className="text-xs text-red-500 mt-1">Required</p>}
        </Field>

        <Field label="Email" required>
          <input
            className={inputClass('email')}
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="name@example.com"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">Required</p>}
        </Field>

        <Field label="Contact Number" required>
          <input
            className={inputClass('contact_number')}
            type="tel"
            value={form.contact_number}
            onChange={e => set('contact_number', e.target.value)}
            placeholder="+962 79 XXX XXXX"
          />
          {errors.contact_number && <p className="text-xs text-red-500 mt-1">Required</p>}
        </Field>

        <div className="sm:col-span-2">
          <Field label="WhatsApp Number">
            <input
              className="input"
              type="tel"
              value={form.whatsapp_number}
              onChange={e => set('whatsapp_number', e.target.value)}
              placeholder="+962 79 XXX XXXX"
              disabled={form.whatsapp_same}
            />
          </Field>
          <label className="inline-flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[#7aa63c]"
              checked={form.whatsapp_same}
              onChange={e => set('whatsapp_same', e.target.checked)}
            />
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              Same as contact number
            </span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <Field label="How did you hear about us?">
            <select
              className="input"
              value={form.heard_from}
              onChange={e => set('heard_from', e.target.value)}
            >
              <option value="">— Select —</option>
              {HEARD_FROM_OPTIONS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end mt-8">
        <button onClick={handleNext} className="btn-primary px-8">
          Next →
        </button>
      </div>
    </div>
  )
}
