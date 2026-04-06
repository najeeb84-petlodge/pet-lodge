import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useWizard } from '../../contexts/WizardContext'
import { useAuth } from '../../contexts/AuthContext'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../lib/supabase'

const HEARD_FROM_OPTIONS = [
  'Facebook',
  'Instagram',
  'A friend',
  'My vet',
  'My pet trainer',
  'Pet store',
  'Flyers at shopping centres',
  'Flyers at cafes',
  'Other...',
]

const NEWSLETTER_OPTIONS = [
  'General Updates & News',
  'Special Offers & Promotions',
  'Pet Care Tips & Advice',
  'New Service Announcements',
  'None of the above',
]

function Req() {
  return <span className="text-red-500"> *</span>
}

function Label({ children, required }) {
  return (
    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
      {children}{required && <Req />}
    </label>
  )
}

function CheckboxList({ options, selected, onChange, error }) {
  function toggle(opt) {
    if (selected.includes(opt)) onChange(selected.filter(o => o !== opt))
    else onChange([...selected, opt])
  }
  return (
    <div className={`space-y-2 rounded-lg p-3 ${error ? 'border border-red-400 bg-red-50' : 'border bg-white'}`}
      style={ error ? {} : { borderColor: 'var(--border)' }}>
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 accent-[#7aa63c]"
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
          />
          <span className="text-sm" style={{ color: 'var(--text)' }}>{opt}</span>
        </label>
      ))}
    </div>
  )
}

export default function Step1CustomerInfo() {
  const { customerInfo, setCustomerInfo, nextStep } = useWizard()
  const { profile } = useAuth()

  const [form, setForm]       = useState(customerInfo)
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)

  // Pre-fill from profiles on first mount if form is blank
  useEffect(() => {
    if (!profile?.id) return
    if (form.first_name || form.email) return
    setLoading(true)
    const token = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}&select=first_name,last_name,email,phone,whatsapp_number`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
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

  // Sync whatsapp when "same as contact" checked
  useEffect(() => {
    if (form.whatsapp_same) setForm(f => ({ ...f, whatsapp_number: f.contact_number }))
  }, [form.whatsapp_same, form.contact_number])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: false }))
  }

  function validate() {
    const e = {}
    if (!form.first_name.trim())   e.first_name      = true
    if (!form.last_name.trim())    e.last_name       = true
    if (!form.email.trim())        e.email           = true
    if (!form.contact_number.trim()) e.contact_number = true
    if (!form.how_they_heard.length)         e.how_they_heard         = true
    if (!form.newsletter_preferences.length) e.newsletter_preferences = true
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (!validate()) return
    setCustomerInfo(form)
    nextStep()
  }

  const ic = key => `input${errors[key] ? ' !border-red-400' : ''}`

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Customer Information</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Tell us about yourself so we can prepare for your pet's stay.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* First Name */}
        <div>
          <Label required>First Name</Label>
          <input className={ic('first_name')} value={form.first_name}
            onChange={e => set('first_name', e.target.value)} placeholder="Najeeb" />
          {errors.first_name && <p className="text-xs text-red-500 mt-1">Required</p>}
        </div>

        {/* Last Name */}
        <div>
          <Label required>Last Name</Label>
          <input className={ic('last_name')} value={form.last_name}
            onChange={e => set('last_name', e.target.value)} placeholder="Abdelhadi" />
          {errors.last_name && <p className="text-xs text-red-500 mt-1">Required</p>}
        </div>

        {/* Email */}
        <div>
          <Label required>Email</Label>
          <input className={ic('email')} type="email" value={form.email}
            onChange={e => set('email', e.target.value)} placeholder="name@example.com" />
          {errors.email && <p className="text-xs text-red-500 mt-1">Required</p>}
        </div>

        {/* Contact Number */}
        <div>
          <Label required>Contact Number</Label>
          <input className={ic('contact_number')} type="tel" value={form.contact_number}
            onChange={e => set('contact_number', e.target.value)} placeholder="+962 79 XXX XXXX" />
          {errors.contact_number && <p className="text-xs text-red-500 mt-1">Required</p>}
        </div>

        {/* WhatsApp */}
        <div className="sm:col-span-2">
          <Label>WhatsApp Number</Label>
          <input className="input" type="tel" value={form.whatsapp_number}
            onChange={e => set('whatsapp_number', e.target.value)}
            placeholder="+962 79 XXX XXXX" disabled={form.whatsapp_same} />
          <label className="inline-flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 accent-[#7aa63c]"
              checked={form.whatsapp_same} onChange={e => set('whatsapp_same', e.target.checked)} />
            <span className="text-sm" style={{ color: 'var(--muted)' }}>Same as contact number</span>
          </label>
        </div>

        {/* How did you hear about us */}
        <div className="sm:col-span-2">
          <Label required>How did you hear about us?</Label>
          <CheckboxList
            options={HEARD_FROM_OPTIONS}
            selected={form.how_they_heard}
            onChange={val => set('how_they_heard', val)}
            error={errors.how_they_heard}
          />
          {errors.how_they_heard && (
            <p className="text-xs text-red-500 mt-1">Please select at least one option</p>
          )}
        </div>

        {/* Newsletter Preferences */}
        <div className="sm:col-span-2">
          <div className="border-t pt-4 mt-2" style={{ borderColor: 'var(--border)' }}>
            <Label required>Newsletter Preferences</Label>
            <CheckboxList
              options={NEWSLETTER_OPTIONS}
              selected={form.newsletter_preferences}
              onChange={val => set('newsletter_preferences', val)}
              error={errors.newsletter_preferences}
            />
            {errors.newsletter_preferences && (
              <p className="text-xs text-red-500 mt-1">Please select at least one option</p>
            )}
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              We send 2–3 newsletters per year. We promise not to spam your inbox. You can always unsubscribe.
            </p>
          </div>
        </div>

      </div>

      {/* Navigation */}
      <div className="flex justify-end mt-8">
        <button onClick={handleNext} className="btn-primary px-8">Next →</button>
      </div>
    </div>
  )
}
