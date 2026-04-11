import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
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
      style={error ? {} : { borderColor: 'var(--border)' }}>
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

function CollapsibleCheckbox({ title, required, options, selected, onChange, error, note }) {
  const [open, setOpen] = useState(selected.length === 0)
  const summary = selected.length ? selected.join(', ') : null

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${error ? '#f87171' : 'var(--border)'}` }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5"
        style={{ background: error ? '#fef2f2' : 'var(--light)' }}
      >
        <span className="text-xs font-medium" style={{ color: error ? '#dc2626' : 'var(--muted)' }}>
          {title}{required && <Req />}
          {!open && summary && (
            <span className="ml-2 font-normal" style={{ color: 'var(--text)' }}>— {summary}</span>
          )}
        </span>
        {open ? <ChevronUp size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
               : <ChevronDown size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <CheckboxList options={options} selected={selected} onChange={onChange} error={false} />
          {note && <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{note}</p>}
        </div>
      )}
    </div>
  )
}

// PATCH how_they_heard and newsletter_preferences back to profiles
async function savePreferencesToProfile(profileId, howTheyHeard, newsletterPrefs) {
  const token = getAccessToken()
  await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        how_they_heard:         howTheyHeard,
        newsletter_preferences: newsletterPrefs,
      }),
    }
  ).catch(() => {})
}

export default function Step1CustomerInfo() {
  const { customerInfo, setCustomerInfo, nextStep } = useWizard()
  const { profile } = useAuth()

  const [form, setForm]       = useState(customerInfo)
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)

  // Pre-fill email for guest users (no profile, but guest_email in localStorage)
  useEffect(() => {
    if (profile?.id) return // logged-in users handled below
    const guestEmail = localStorage.getItem('guest_email')
    if (guestEmail && !form.email) {
      setForm(f => ({ ...f, email: guestEmail }))
    }
  }, [])

  // Pre-fill from profiles on first mount if form is blank
  useEffect(() => {
    if (!profile?.id) return
    if (form.first_name || form.email) return
    setLoading(true)
    const token = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}&select=first_name,last_name,email,phone,whatsapp_number,how_they_heard,newsletter_preferences`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
    )
      .then(r => r.json())
      .then(data => {
        const p = Array.isArray(data) ? data[0] : null
        if (!p) return
        setForm(f => ({
          ...f,
          first_name:             p.first_name             || f.first_name,
          last_name:              p.last_name              || f.last_name,
          email:                  p.email                  || f.email,
          contact_number:         p.phone                  || f.contact_number,
          whatsapp_number:        p.whatsapp_number        || f.whatsapp_number,
          how_they_heard:         Array.isArray(p.how_they_heard)         ? p.how_they_heard         : f.how_they_heard,
          newsletter_preferences: Array.isArray(p.newsletter_preferences) ? p.newsletter_preferences : f.newsletter_preferences,
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
    if (!form.first_name.trim())        e.first_name             = true
    if (!form.last_name.trim())         e.last_name              = true
    if (!form.email.trim())             e.email                  = true
    if (!form.contact_number.trim())    e.contact_number         = true
    if (!form.how_they_heard.length)         e.how_they_heard         = true
    if (!form.newsletter_preferences.length) e.newsletter_preferences = true
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (!validate()) return
    setCustomerInfo(form)
    if (profile?.id) {
      savePreferencesToProfile(profile.id, form.how_they_heard, form.newsletter_preferences)
    }
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
            onChange={e => set('first_name', e.target.value)} placeholder="e.g. Amr" />
          {errors.first_name && <p className="text-xs text-red-500 mt-1">Required</p>}
        </div>

        {/* Last Name */}
        <div>
          <Label required>Last Name</Label>
          <input className={ic('last_name')} value={form.last_name}
            onChange={e => set('last_name', e.target.value)} placeholder="e.g. Diab" />
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

        {/* How did you hear about us — collapsible */}
        <div className="sm:col-span-2">
          <CollapsibleCheckbox
            title="How did you hear about us?"
            required
            options={HEARD_FROM_OPTIONS}
            selected={form.how_they_heard}
            onChange={val => set('how_they_heard', val)}
            error={errors.how_they_heard}
          />
          {errors.how_they_heard && (
            <p className="text-xs text-red-500 mt-1">Please select at least one option</p>
          )}
        </div>

        {/* Newsletter Preferences — collapsible */}
        <div className="sm:col-span-2">
          <div className="border-t pt-4 mt-2" style={{ borderColor: 'var(--border)' }}>
            <CollapsibleCheckbox
              title="Newsletter Preferences"
              required
              options={NEWSLETTER_OPTIONS}
              selected={form.newsletter_preferences}
              onChange={val => set('newsletter_preferences', val)}
              error={errors.newsletter_preferences}
              note="We send 2–3 newsletters per year. We promise not to spam your inbox. You can always unsubscribe."
            />
            {errors.newsletter_preferences && (
              <p className="text-xs text-red-500 mt-1">Please select at least one option</p>
            )}
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
