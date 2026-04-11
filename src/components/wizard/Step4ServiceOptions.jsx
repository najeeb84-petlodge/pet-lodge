import { useEffect, useMemo, useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useWizard } from '../../contexts/WizardContext'
import { useAuth } from '../../contexts/AuthContext'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
]

const WALKING_TIMES = [
  { value: 'morning',   label: 'Morning',   sublabel: '7–9 am' },
  { value: 'midday',    label: 'Midday',    sublabel: '11 am–1 pm' },
  { value: 'afternoon', label: 'Afternoon', sublabel: '3–5 pm' },
]

const TRANSPORT_OPTIONS = [
  { value: 'round_trip',   label: 'Round trip',             sublabel: 'Pick up + drop off — JD 30' },
  { value: 'pickup_only',  label: 'Pick up only',           sublabel: 'JD 15' },
  { value: 'dropoff_only', label: 'Drop off only',          sublabel: 'JD 15' },
  { value: 'self',         label: "I'll handle transport",  sublabel: 'No charge' },
]

const COMPLIMENTARY_TRANSPORT_OPTIONS = [
  { value: 'round_trip',   label: 'Round trip (pick up + drop off)', sublabel: 'Complimentary' },
  { value: 'pickup_only',  label: 'Pick up only',                    sublabel: 'Complimentary' },
  { value: 'dropoff_only', label: 'Drop off only',                   sublabel: 'Complimentary' },
  { value: 'self',         label: "I'll handle transport",           sublabel: 'No charge' },
]

// ── Default per-pet form shapes ────────────────────────────────────────────────

function defaultBoardingPet(pet, idx) {
  return {
    petIndex: idx, petName: pet.name || `Pet ${idx + 1}`,
    foodChoice: 'owner_provided', foodNotes: '',
    fleaTick: '', groomingAddOns: [],
    transport: '',
    address_flat: '', address_street: '', address_neighbourhood: '',
    address_whatsapp_location: '', address_driver_comments: '',
    pickupTime: '', dropoffTime: '',
    saveAddressToProfile: false,
  }
}
function defaultDayCampPet(pet, idx) {
  return {
    petIndex: idx, petName: pet.name || `Pet ${idx + 1}`,
    packageId: '', packagePrice: 0, preferredDays: [], fleaTick: '', transportConfirmed: true,
    transport: '',
    address_flat: '', address_street: '', address_neighbourhood: '',
    address_whatsapp_location: '', pickupTime: '', dropoffTime: '', saveAddressToProfile: false,
  }
}
function defaultDogWalkingPet(pet, idx) {
  return {
    petIndex: idx, petName: pet.name || `Pet ${idx + 1}`,
    packageId: '', packagePrice: 0, preferredTime: '', walkerNotes: '',
    transport: '',
    address_flat: '', address_street: '', address_neighbourhood: '',
    address_whatsapp_location: '', pickupTime: '', dropoffTime: '', saveAddressToProfile: false,
  }
}
function defaultGroomingPet(pet, idx) {
  return {
    petIndex: idx, petName: pet.name || `Pet ${idx + 1}`,
    selectionMode: '', packageId: null, standaloneAddOns: [],
    transport: null,
    address_flat: '', address_street: '', address_neighbourhood: '',
    address_whatsapp_location: '', pickupTime: '', dropoffTime: '', saveAddressToProfile: false,
  }
}
function defaultTransport() {
  return {
    dateTime: '', vetAddress: '', notes: '',
    address_flat: '', address_street: '', address_neighbourhood: '',
    address_whatsapp_location: '', pickupTime: '', saveAddressToProfile: false,
    dropoff_same: true,
    dropoff_flat: '', dropoff_street: '', dropoff_neighbourhood: '', dropoff_whatsapp_location: '',
  }
}
function defaultTraining() {
  return {
    sessionCount: 1, preferredSchedule: '',
    transport: '',
    address_flat: '', address_street: '', address_neighbourhood: '',
    address_whatsapp_location: '', pickupTime: '', dropoffTime: '', saveAddressToProfile: false,
  }
}
function defaultInternational() { return { requirementsText: '', additionalNotes: '' } }

function initPerPetForms(petsData, serviceType) {
  const pets = petsData.length ? petsData : [{}]
  switch (serviceType) {
    case 'boarding':    return pets.map(defaultBoardingPet)
    case 'day_camp':    return pets.map(defaultDayCampPet)
    case 'dog_walking': return pets.map(defaultDogWalkingPet)
    case 'grooming':    return pets.map(defaultGroomingPet)
    default:            return []
  }
}

// ── Price calculation ──────────────────────────────────────────────────────────

function computeLineItems(serviceType, perPetForms, serviceOptions, prices, petsData) {
  const nights = (serviceOptions?.startDate && serviceOptions?.endDate)
    ? Math.max(1, differenceInDays(parseISO(serviceOptions.endDate), parseISO(serviceOptions.startDate)))
    : 1

  const find = (cat, id) => (prices[cat] || []).find(p => p.id === id)

  switch (serviceType) {

    case 'boarding': {
      const base = find('boarding', serviceOptions?.option)
      const items = []
      if (base) items.push({ label: `${base.name} × ${nights} nights`, amount: parseFloat(base.price || 0) * nights })
      const transportCost = { round_trip: 30, pickup_only: 15, dropoff_only: 15, self: 0 }
      let transportAdded = false
      perPetForms.forEach(pf => {
        if (pf.foodChoice === 'lodge_small') items.push({ label: `Food (small/cat) for ${pf.petName} × ${nights} nights`, amount: 2 * nights })
        if (pf.foodChoice === 'lodge_large') items.push({ label: `Food (medium/large) for ${pf.petName} × ${nights} nights`, amount: 4 * nights })
        if (pf.fleaTick === 'lodge_applies') {
          const petType = petsData[pf.petIndex]?.type
          items.push({ label: `Flea & tick for ${pf.petName}`, amount: petType === 'cat' ? 25 : 35 })
        }
        if (pf.groomingAddOns?.includes('hair_trim')) items.push({ label: `Hair trim for ${pf.petName}`, amount: 20 })
        if (pf.groomingAddOns?.includes('nail_clip')) items.push({ label: `Nail clip for ${pf.petName}`, amount: 10 })
        if (pf.groomingAddOns?.includes('bathing'))   items.push({ label: `Bathing for ${pf.petName}`, amount: 15 })
        if (!transportAdded && pf.transport) {
          const tc = transportCost[pf.transport]
          if (tc > 0) items.push({ label: `Transport (${TRANSPORT_OPTIONS.find(o => o.value === pf.transport)?.label})`, amount: tc })
          transportAdded = true
        }
      })
      return items
    }

    case 'day_camp': {
      const items = []
      perPetForms.forEach(pf => {
        if (pf.packageId && pf.packagePrice > 0) {
          const pkg = find('day_camp', pf.packageId)
          items.push({ label: `${pkg?.name || 'Day Camp package'} for ${pf.petName}`, amount: pf.packagePrice })
        }
        if (pf.fleaTick === 'lodge_applies') {
          const petType = petsData[pf.petIndex]?.type
          items.push({ label: `Flea & tick for ${pf.petName}`, amount: petType === 'cat' ? 25 : 35 })
        }
      })
      items.push({ label: 'Pick up & drop off', amount: 0, note: 'Complimentary' })
      return items
    }

    case 'dog_walking': {
      const items = []
      perPetForms.forEach(pf => {
        if (pf.packageId && pf.packagePrice > 0) {
          const pkg = find('dog_walking', pf.packageId)
          items.push({ label: `${pkg?.name || 'Dog Walking package'} for ${pf.petName}`, amount: pf.packagePrice })
        }
      })
      return items
    }

    case 'grooming': {
      const items = []
      perPetForms.forEach(pf => {
        if (pf.selectionMode === 'package' && pf.packageId) {
          const pkg = find('grooming', pf.packageId)
          if (pkg) items.push({ label: `${pkg.name} for ${pf.petName}`, amount: parseFloat(pkg.price || 0) })
          if (pf.transport && pf.transport !== 'self') {
            const label = pf.transport === 'round_trip' ? 'Pick up & drop off'
              : pf.transport === 'pickup_only' ? 'Pick up'
              : 'Drop off'
            items.push({ label, amount: 0, note: 'Included' })
          }
        } else if (pf.selectionMode === 'standalone') {
          const petType = petsData[pf.petIndex]?.type
          if (pf.standaloneAddOns?.includes('hair_trim')) items.push({ label: `Hair trim for ${pf.petName}`, amount: 20 })
          if (pf.standaloneAddOns?.includes('nail_clip')) items.push({ label: `Nail clip for ${pf.petName}`, amount: 10 })
          if (pf.standaloneAddOns?.includes('bathing'))   items.push({ label: `Bathing for ${pf.petName}`, amount: petType === 'cat' ? 15 : 10 })
        }
      })
      return items
    }

    case 'transport': {
      const base = find('transport', serviceOptions?.option)
      if (!base) return []
      return [{ label: base.name, amount: parseFloat(base.price || 0) }]
    }

    case 'training': {
      return []
    }

    default: return []
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateForm(serviceType, perPetForms, flatForm, serviceOptions) {
  const errs = {}

  if (serviceType === 'boarding') {
    const perPet = perPetForms.map(pf => {
      const e = {}
      if (!pf.fleaTick)  e.fleaTick  = true
      if (!pf.transport) e.transport = true
      return e
    })
    if (perPet.some(e => Object.keys(e).length)) errs.perPet = perPet
  }

  if (serviceType === 'day_camp') {
    const perPet = perPetForms.map(pf => {
      const e = {}
      if (!pf.packageId)             e.packageId     = true
      if (!pf.preferredDays?.length) e.preferredDays = true
      if (!pf.fleaTick)              e.fleaTick      = true
      return e
    })
    if (perPet.some(e => Object.keys(e).length)) errs.perPet = perPet
  }

  if (serviceType === 'dog_walking') {
    const perPet = perPetForms.map(pf => {
      const e = {}
      if (!pf.packageId)     e.packageId     = true
      if (!pf.preferredTime) e.preferredTime = true
      return e
    })
    if (perPet.some(e => Object.keys(e).length)) errs.perPet = perPet
  }

  if (serviceType === 'grooming') {
    const perPet = perPetForms.map(pf => {
      const e = {}
      if (!pf.selectionMode) e.selectionMode = true
      if (pf.selectionMode === 'standalone' && !pf.standaloneAddOns?.length) e.standaloneAddOns = true
      return e
    })
    if (perPet.some(e => Object.keys(e).length)) errs.perPet = perPet
  }

  if (serviceType === 'transport' && !flatForm.dateTime) errs.dateTime = true
  if (serviceType === 'training'  && !(flatForm.sessionCount >= 1)) errs.sessionCount = true
  if (serviceType === 'international' && !flatForm.requirementsText?.trim()) errs.requirementsText = true

  return errs
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return <p className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>{children}</p>
}

function RadioGroup({ name, options, value, onChange, error }) {
  return (
    <div className="space-y-2" data-error={error ? 'true' : undefined}>
      {options.map(opt => {
        const checked = value === opt.value
        return (
          <label key={opt.value}
            className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg transition-colors"
            style={{ border: `1px solid ${checked ? '#7aa63c' : error ? '#f87171' : 'var(--border)'}`, background: checked ? '#eef4e2' : 'white' }}>
            <input type="radio" name={name} value={opt.value} checked={checked}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 w-4 h-4 accent-[#7aa63c] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                {opt.label}
                {opt.popular && <PopularBadge />}
              </span>
              {opt.sublabel && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{opt.sublabel}</p>}
            </div>
          </label>
        )
      })}
      {error && <p className="text-xs text-red-500 mt-1">Please select an option</p>}
    </div>
  )
}

function CheckboxGroup({ options, selected = [], onChange, error }) {
  function toggle(val) {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }
  return (
    <div className="space-y-2" data-error={error ? 'true' : undefined}>
      {options.map(opt => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 accent-[#7aa63c]"
            checked={selected.includes(opt.value)} onChange={() => toggle(opt.value)} />
          <span className="text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
            {opt.label}
            {opt.popular && <PopularBadge />}
          </span>
        </label>
      ))}
      {error && <p className="text-xs text-red-500 mt-1">Please select at least one</p>}
    </div>
  )
}

function PopularBadge() {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: '#2d3a1e', color: 'white' }}>
      Most Popular
    </span>
  )
}

function InfoNote({ children }) {
  return (
    <div className="rounded-lg p-3 text-sm" style={{ background: '#eef4e2', border: '1px solid #c6dba0', color: '#2d3a1e' }}>
      {children}
    </div>
  )
}

function PetSection({ petName, children }) {
  return (
    <div className="mb-6">
      <div className="rounded-t-xl px-4 py-2.5 font-semibold text-sm"
        style={{ background: '#eef4e2', border: '1px solid #c6dba0', color: 'var(--primary)' }}>
        Options for {petName}
      </div>
      <div className="rounded-b-xl p-4" style={{ border: '1px solid #c6dba0', borderTop: 'none' }}>
        {children}
      </div>
    </div>
  )
}

// Shared address field grid used in AddressFields and CollapsibleAddress
function AddressGrid({ form, onChange, showWhatsApp = true }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Flat / Apt</label>
        <input className="input text-sm" value={form.address_flat || ''} placeholder="e.g. Apt 4B"
          onChange={e => onChange({ address_flat: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Street</label>
        <input className="input text-sm" value={form.address_street || ''} placeholder="e.g. King Abdullah St"
          onChange={e => onChange({ address_street: e.target.value })} />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Neighbourhood</label>
        <input className="input text-sm" value={form.address_neighbourhood || ''} placeholder="e.g. Abdoun"
          onChange={e => onChange({ address_neighbourhood: e.target.value })} />
      </div>
      {showWhatsApp && (
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
            WhatsApp location link <span className="font-normal">(optional)</span>
          </label>
          <input className="input text-sm" value={form.address_whatsapp_location || ''}
            placeholder="Paste your location link here"
            onChange={e => onChange({ address_whatsapp_location: e.target.value })} />
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            You can share your location pin via WhatsApp and paste the link here, or simply send it to us directly on WhatsApp at +962 79 8906476
          </p>
        </div>
      )}
    </div>
  )
}

// Address shown when transport !== 'self' (Boarding)
function AddressFields({ form, onChange, show, profileHasAddress, showDriverComments = false, transport = '' }) {
  if (!show) return null
  const showPickup  = transport === 'round_trip' || transport === 'pickup_only'
  const showDropoff = transport === 'round_trip' || transport === 'dropoff_only'
  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Pick-up / Drop-off Address</p>
      <AddressGrid form={form} onChange={onChange} />
      {(showPickup || showDropoff) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {showPickup && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Preferred pick-up time</label>
              <TimeSelect value={form.pickupTime || ''} onChange={v => onChange({ pickupTime: v })} />
            </div>
          )}
          {showDropoff && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Preferred drop-off time</label>
              <TimeSelect value={form.dropoffTime || ''} onChange={v => onChange({ dropoffTime: v })} />
            </div>
          )}
        </div>
      )}
      {showDriverComments && (
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
            Additional comments for driver <span className="font-normal">(optional)</span>
          </label>
          <textarea className="input text-sm" rows={2} style={{ resize: 'vertical' }}
            placeholder="Any special instructions for the driver..."
            value={form.address_driver_comments || ''}
            onChange={e => onChange({ address_driver_comments: e.target.value })} />
        </div>
      )}
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" className="w-4 h-4 accent-[#7aa63c]"
          checked={!!form.saveAddressToProfile}
          onChange={e => onChange({ saveAddressToProfile: e.target.checked })} />
        <span className="text-sm" style={{ color: 'var(--text)' }}>
          {profileHasAddress ? 'Update saved address' : 'Save this address to my profile'}
        </span>
      </label>
    </div>
  )
}

// Collapsible address section (Day Camp, Dog Walking, Grooming package)
function CollapsibleAddress({ form, onChange, profileHasAddress, label = 'Add pick-up / drop-off address', showTimePickers = false }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-sm font-medium"
        style={{ color: 'var(--primary)' }}>
        {label} {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <AddressGrid form={form} onChange={onChange} />
          {showTimePickers && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Preferred pick-up time</label>
                <TimeSelect value={form.pickupTime || ''} onChange={v => onChange({ pickupTime: v })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Preferred drop-off time</label>
                <TimeSelect value={form.dropoffTime || ''} onChange={v => onChange({ dropoffTime: v })} />
              </div>
            </div>
          )}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 accent-[#7aa63c]"
              checked={!!form.saveAddressToProfile}
              onChange={e => onChange({ saveAddressToProfile: e.target.checked })} />
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              {profileHasAddress ? 'Update saved address' : 'Save this address to my profile'}
            </span>
          </label>
        </div>
      )}
    </div>
  )
}

// ── Time selector (hour-only dropdown) ───────────────────────────────────────

const HOUR_OPTIONS = [
  '7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM',
  '1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM',
]

// Converts "7:00 AM" → "07:00", "1:00 PM" → "13:00" for storage in dateTime
function labelTo24(label) {
  if (!label) return ''
  const [time, period] = label.split(' ')
  let [h] = time.split(':')
  h = parseInt(h, 10)
  if (period === 'PM' && h !== 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:00`
}

// Converts "07:00" → "7:00 AM", "13:00" → "1:00 PM"
function label24To(time24) {
  if (!time24) return ''
  const [h] = time24.split(':')
  const hour = parseInt(h, 10)
  const period = hour < 12 ? 'AM' : 'PM'
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${display}:00 ${period}`
}

function TimeSelect({ value, onChange }) {
  const displayVal = label24To(value)
  return (
    <div>
      <select className="input text-sm"
        value={displayVal}
        onChange={e => onChange(labelTo24(e.target.value))}>
        <option value="">Select a time</option>
        {HOUR_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <p className="text-xs mt-1 italic" style={{ color: 'var(--muted)' }}>
        We will do our best to accommodate your preferred time. Exact time will be confirmed via WhatsApp.
      </p>
    </div>
  )
}

// ── Shared collapsible delivery section (Grooming, Training, Day Camp) ──

function DeliverySection({ form, onChange, profileHasAddress, infoNote, radioName = 'delivery' }) {
  const [open, setOpen] = useState(false)
  const needsAddress = form.transport && form.transport !== 'self'
  const showPickup   = form.transport === 'round_trip' || form.transport === 'pickup_only'
  const showDropoff  = form.transport === 'round_trip' || form.transport === 'dropoff_only'

  return (
    <div className="mt-4 space-y-3">
      {infoNote && <InfoNote>{infoNote}</InfoNote>}
      <div>
        <button type="button" onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: 'var(--primary)' }}>
          Add pick-up / drop-off {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {open && (
          <div className="mt-3 space-y-3">
            <RadioGroup name={radioName} options={COMPLIMENTARY_TRANSPORT_OPTIONS}
              value={form.transport || ''} onChange={v => onChange({ transport: v })} />
            {needsAddress && (
              <>
                <AddressGrid form={form} onChange={onChange} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {showPickup && (
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Preferred pick-up time</label>
                      <TimeSelect value={form.pickupTime || ''} onChange={v => onChange({ pickupTime: v })} />
                    </div>
                  )}
                  {showDropoff && (
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Preferred drop-off time</label>
                      <TimeSelect value={form.dropoffTime || ''} onChange={v => onChange({ dropoffTime: v })} />
                    </div>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 accent-[#7aa63c]"
                    checked={!!form.saveAddressToProfile}
                    onChange={e => onChange({ saveAddressToProfile: e.target.checked })} />
                  <span className="text-sm" style={{ color: 'var(--text)' }}>
                    {profileHasAddress ? 'Update saved address' : 'Save this address to my profile'}
                  </span>
                </label>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Flea & Tick radio (reused in Boarding + Day Camp) ─────────────────────────

const FLEA_TICK_OPTIONS = [
  { value: 'covered',       label: 'I already have it covered', sublabel: 'No charge' },
  { value: 'lodge_applies', label: 'Pet Lodge applies it',       sublabel: 'Dog: JD 35 · Cat: JD 25' },
]

function FleaTickSection({ value, onChange, error }) {
  return (
    <div className="mt-5">
      <SectionHeading>Flea &amp; Tick Protection (required)</SectionHeading>
      <RadioGroup name="flea_tick" options={FLEA_TICK_OPTIONS} value={value} onChange={onChange} error={error} />
    </div>
  )
}

// ── Per-service panels ────────────────────────────────────────────────────────

function BoardingOptions({ form, onChange, petsData, prices, errors, profileHasAddress }) {
  const petType = (petsData[form.petIndex]?.type || '').toLowerCase()

  // For cats, hide the large-dog food option
  const foodOptions = petType === 'cat'
    ? [
        { value: 'lodge_small',    label: 'Pet Lodge Food — Small dogs & Cats', sublabel: 'JD 2 / day' },
        { value: 'owner_provided', label: 'Owner provided',                      sublabel: 'No charge' },
      ]
    : [
        { value: 'lodge_small',    label: 'Pet Lodge Food — Small dogs & Cats',    sublabel: 'JD 2 / day' },
        { value: 'lodge_large',    label: 'Pet Lodge Food — Medium & Large dogs',  sublabel: 'JD 4 / day' },
        { value: 'owner_provided', label: 'Owner provided',                         sublabel: 'No charge' },
      ]

  const groomingItems = [
    { value: 'hair_trim', label: 'Hair Trim — JD 20' },
    { value: 'nail_clip', label: 'Nail Clip — JD 10' },
    { value: 'bathing',   label: 'Bathing — JD 15' },
  ]

  return (
    <div>
      {/* Food */}
      <SectionHeading>Food</SectionHeading>
      <RadioGroup name={`food-${form.petIndex}`} options={foodOptions}
        value={form.foodChoice} onChange={v => onChange({ foodChoice: v })} />
      <div className="mt-3">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
          Special food notes <span className="font-normal">(optional)</span>
        </label>
        <textarea className="input text-sm" rows={2} style={{ resize: 'vertical' }}
          placeholder="Allergies, feeding schedule, portion size…"
          value={form.foodNotes} onChange={e => onChange({ foodNotes: e.target.value })} />
      </div>

      {/* Flea & Tick */}
      <FleaTickSection value={form.fleaTick} onChange={v => onChange({ fleaTick: v })} error={errors?.fleaTick} />

      {/* Grooming add-ons */}
      <div className="mt-5">
        <SectionHeading>Grooming Add-ons <span className="font-normal text-xs">(optional)</span></SectionHeading>
        <CheckboxGroup options={groomingItems} selected={form.groomingAddOns}
          onChange={v => onChange({ groomingAddOns: v })} />
      </div>

      {/* Transport */}
      <div className="mt-5" data-error={errors?.transport ? 'true' : undefined}>
        <SectionHeading>Pick-up / Drop-off</SectionHeading>
        <RadioGroup name={`transport-${form.petIndex}`} options={TRANSPORT_OPTIONS}
          value={form.transport} onChange={v => onChange({ transport: v })} error={errors?.transport} />
      </div>

      {/* Address with WhatsApp + driver comments + time pickers */}
      <AddressFields form={form} onChange={onChange}
        show={form.transport && form.transport !== 'self'}
        profileHasAddress={profileHasAddress}
        showDriverComments={true}
        transport={form.transport || ''} />
    </div>
  )
}

function DayCampOptions({ form, onChange, prices, errors, profileHasAddress, serviceOptions, setServiceOptions }) {
  const packages = (prices.day_camp || [])
    .filter(p => !p.name.toLowerCase().includes('additional'))
    .sort((a, b) => {
      const ORDER = ['single', 'monthly', 'quarterly', 'annually']
      const rank = name => ORDER.findIndex(k => name.toLowerCase().includes(k))
      return rank(a.name) - rank(b.name)
    })
    .map(p => ({ value: p.id, label: p.name, sublabel: `JD ${parseFloat(p.price || 0).toFixed(0)}` }))

  function handlePackageChange(id) {
    const pkg = (prices.day_camp || []).find(p => p.id === id)
    onChange({ packageId: id, packagePrice: parseFloat(pkg?.price || 0) })
    // Single Day Visit: sync end date = start date
    if (pkg?.name?.toLowerCase().includes('single') && serviceOptions?.startDate && setServiceOptions) {
      setServiceOptions({ ...serviceOptions, endDate: serviceOptions.startDate })
    }
  }

  return (
    <div>
      <SectionHeading>Package</SectionHeading>
      <div data-error={errors?.packageId ? 'true' : undefined}>
        <RadioGroup name={`daycamp-pkg-${form.petIndex}`} options={packages}
          value={form.packageId}
          onChange={handlePackageChange}
          error={errors?.packageId} />
      </div>

      <div className="mt-5" data-error={errors?.preferredDays ? 'true' : undefined}>
        <SectionHeading>Preferred Days</SectionHeading>
        <CheckboxGroup options={DAYS_OF_WEEK} selected={form.preferredDays}
          onChange={v => onChange({ preferredDays: v })} error={errors?.preferredDays} />
      </div>

      <FleaTickSection value={form.fleaTick} onChange={v => onChange({ fleaTick: v })} error={errors?.fleaTick} />

      <DeliverySection form={form} onChange={onChange} profileHasAddress={profileHasAddress}
        infoNote="Pick-up & drop-off is complimentary for Day Camp"
        radioName={`daycamp-delivery-${form.petIndex}`} />
    </div>
  )
}

function DogWalkingOptions({ form, onChange, prices, errors, profileHasAddress }) {
  // Only "Weekly (2hr" gets Most Popular badge — not Monthly
  const packages = (prices.dog_walking || []).map(p => ({
    value: p.id, label: p.name, sublabel: `JD ${parseFloat(p.price || 0).toFixed(0)}`,
    popular: p.name.toLowerCase().includes('weekly') && p.name.toLowerCase().includes('2hr'),
  }))

  return (
    <div>
      <SectionHeading>Package</SectionHeading>
      <div data-error={errors?.packageId ? 'true' : undefined}>
        <RadioGroup name={`walking-pkg-${form.petIndex}`} options={packages}
          value={form.packageId}
          onChange={v => {
            const pkg = (prices.dog_walking || []).find(p => p.id === v)
            onChange({ packageId: v, packagePrice: parseFloat(pkg?.price || 0) })
          }}
          error={errors?.packageId} />
      </div>

      <div className="mt-5" data-error={errors?.preferredTime ? 'true' : undefined}>
        <SectionHeading>Preferred Time</SectionHeading>
        <RadioGroup name={`walking-time-${form.petIndex}`} options={WALKING_TIMES}
          value={form.preferredTime} onChange={v => onChange({ preferredTime: v })} error={errors?.preferredTime} />
      </div>

      <div className="mt-5">
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>
          Notes for walker <span className="font-normal">(optional)</span>
        </label>
        <textarea className="input text-sm" rows={2} style={{ resize: 'vertical' }}
          placeholder="Any special instructions for your walker…"
          value={form.walkerNotes} onChange={e => onChange({ walkerNotes: e.target.value })} />
      </div>

      <div className="mt-5">
        <InfoNote>Our walker will come to your location. Please share your address below.</InfoNote>
        <CollapsibleAddress
          form={form}
          onChange={onChange}
          profileHasAddress={profileHasAddress}
          label="Add your address"
          showTimePickers={false}
        />
      </div>
    </div>
  )
}

function GroomingOptions({ form, onChange, prices, petsData, errors, profileHasAddress, groomingDogSize }) {
  const petType = (petsData[form.petIndex]?.type || '').toLowerCase()

  // Filter packages by pet type + dog size from Step 3
  const allPkgs = (prices.grooming || []).filter(p => p.name?.toLowerCase().includes('package'))
  let filteredPkgs = allPkgs
  if (petType === 'dog') {
    if (groomingDogSize === 'small_medium') {
      filteredPkgs = allPkgs.filter(p => p.name.toLowerCase().includes('small'))
    } else if (groomingDogSize === 'large') {
      filteredPkgs = allPkgs.filter(p => p.name.toLowerCase().includes('large'))
    }
  } else {
    filteredPkgs = allPkgs.filter(p => p.name.toLowerCase().includes('large') || p.name.toLowerCase().includes('cat'))
  }

  const packages = filteredPkgs.map(p => ({
    value: p.id, label: p.name,
    sublabel: `JD ${parseFloat(p.price || 0).toFixed(0)}`,
  }))

  const standaloneItems = [
    { value: 'hair_trim', label: 'Hair Trim — JD 20' },
    { value: 'nail_clip', label: 'Nail Clip — JD 10' },
    { value: 'bathing',   label: petType === 'cat' ? 'Bathing — JD 15' : 'Bathing — JD 10' },
  ]

  return (
    <div>
      {/* Packages */}
      <SectionHeading>Grooming Package</SectionHeading>
      <div data-error={errors?.selectionMode ? 'true' : undefined}>
        <RadioGroup name={`groom-pkg-${form.petIndex}`} options={packages}
          value={form.selectionMode === 'package' ? form.packageId : ''}
          onChange={v => onChange({ selectionMode: 'package', packageId: v, standaloneAddOns: [], transport: null })} />
      </div>
      {form.selectionMode === 'package' && (
        <DeliverySection form={form} onChange={onChange} profileHasAddress={profileHasAddress}
          infoNote="Pick-up & drop-off is complimentary with this package"
          radioName={`groom-pkg-delivery-${form.petIndex}`} />
      )}

      {/* OR divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>— OR choose individual services —</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {/* Standalone */}
      <div data-error={errors?.standaloneAddOns ? 'true' : undefined}>
        <CheckboxGroup options={standaloneItems}
          selected={form.selectionMode === 'standalone' ? form.standaloneAddOns : []}
          onChange={v => onChange({ selectionMode: 'standalone', standaloneAddOns: v, packageId: null })}
          error={errors?.standaloneAddOns} />
      </div>

      {/* Standalone transport — collapsible */}
      {form.selectionMode === 'standalone' && (
        <DeliverySection form={form} onChange={onChange} profileHasAddress={profileHasAddress}
          infoNote="Pick-up & drop-off available for standalone services"
          radioName={`groom-standalone-delivery-${form.petIndex}`} />
      )}

      {errors?.selectionMode && (
        <p className="text-xs text-red-500 mt-2">Please select a package or at least one individual service</p>
      )}
    </div>
  )
}

function TransportOptions({ form, onChange, errors, profileHasAddress }) {
  return (
    <div>
      <SectionHeading>Appointment Date &amp; Time</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5"
        data-error={errors?.dateTime ? 'true' : undefined}>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
            Date <span className="text-red-500">*</span>
          </label>
          <input type="date" className={`input${errors?.dateTime ? ' !border-red-400' : ''}`}
            value={form.dateTime?.split('T')[0] || ''}
            onChange={e => onChange({ dateTime: `${e.target.value}T${form.dateTime?.split('T')[1] || '09:00'}` })} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Time</label>
          <TimeSelect
            value={form.dateTime?.split('T')[1]?.slice(0, 5) || ''}
            onChange={v => onChange({ dateTime: `${form.dateTime?.split('T')[0] || ''}T${v}` })} />
        </div>
        {errors?.dateTime && <p className="text-xs text-red-500 sm:col-span-2 -mt-1">Required</p>}
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>
          Vet / Destination address <span className="font-normal">(optional)</span>
        </label>
        <input className="input text-sm" placeholder="Clinic name & address"
          value={form.vetAddress} onChange={e => onChange({ vetAddress: e.target.value })} />
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>
          Notes <span className="font-normal">(optional)</span>
        </label>
        <textarea className="input text-sm" rows={2} style={{ resize: 'vertical' }}
          placeholder="Any special instructions…"
          value={form.notes} onChange={e => onChange({ notes: e.target.value })} />
      </div>

      {/* Pick-up address */}
      <div>
        <SectionHeading>Pick-up Address</SectionHeading>
        <div className="space-y-3">
          <AddressGrid form={form} onChange={onChange} />
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="w-4 h-4 accent-[#7aa63c]"
              checked={!!form.saveAddressToProfile}
              onChange={e => onChange({ saveAddressToProfile: e.target.checked })} />
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              {profileHasAddress ? 'Update saved address' : 'Save this address to my profile'}
            </span>
          </label>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Preferred pick-up time</label>
            <TimeSelect value={form.pickupTime || ''} onChange={v => onChange({ pickupTime: v })} />
          </div>
        </div>
      </div>

      {/* Drop-off same as pick-up */}
      <div className="mt-5">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 accent-[#7aa63c]"
            checked={!!form.dropoff_same}
            onChange={e => onChange({ dropoff_same: e.target.checked })} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Drop-off address is the same as pick-up
          </span>
        </label>

        {!form.dropoff_same && (
          <div className="mt-3 space-y-3">
            <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Drop-off Address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Flat / Apt</label>
                <input className="input text-sm" value={form.dropoff_flat || ''} placeholder="e.g. Apt 4B"
                  onChange={e => onChange({ dropoff_flat: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Street</label>
                <input className="input text-sm" value={form.dropoff_street || ''} placeholder="e.g. King Abdullah St"
                  onChange={e => onChange({ dropoff_street: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Neighbourhood</label>
                <input className="input text-sm" value={form.dropoff_neighbourhood || ''} placeholder="e.g. Abdoun"
                  onChange={e => onChange({ dropoff_neighbourhood: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                  WhatsApp location link <span className="font-normal">(optional)</span>
                </label>
                <input className="input text-sm" value={form.dropoff_whatsapp_location || ''}
                  placeholder="Paste your location link here"
                  onChange={e => onChange({ dropoff_whatsapp_location: e.target.value })} />
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  You can share your location pin via WhatsApp and paste the link here, or simply send it to us directly on WhatsApp at +962 79 8906476
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TrainingOptions({ form, onChange, errors, profileHasAddress }) {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  return (
    <div>
      <InfoNote>
        The number of sessions varies by dog and behaviour — a free assessment will determine the exact amount.
        Our team will contact you to arrange.
      </InfoNote>

      <div className="mt-5" data-error={errors?.sessionCount ? 'true' : undefined}>
        <SectionHeading>Estimated Number of Sessions</SectionHeading>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onChange({ sessionCount: Math.max(1, (form.sessionCount || 1) - 1) })}
            className="w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-bold"
            style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>−</button>
          <span className="text-2xl font-bold w-8 text-center" style={{ color: 'var(--text)' }}>
            {form.sessionCount || 1}
          </span>
          <button type="button" onClick={() => onChange({ sessionCount: Math.min(10, (form.sessionCount || 1) + 1) })}
            className="w-9 h-9 rounded-lg border flex items-center justify-center text-lg font-bold"
            style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>+</button>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            × JD 50 = <strong>JD {((form.sessionCount || 1) * 50).toFixed(2)}</strong> <span className="font-normal">(estimate)</span>
          </span>
        </div>
        {errors?.sessionCount && <p className="text-xs text-red-500 mt-1">Required</p>}
      </div>

      <div className="mt-5">
        <button type="button" onClick={() => setScheduleOpen(v => !v)}
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: 'var(--primary)' }}>
          Add scheduling preferences {scheduleOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {scheduleOpen && (
          <div className="mt-3">
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>
              Preferred schedule <span className="font-normal">(optional)</span>
            </label>
            <textarea className="input text-sm" rows={2} style={{ resize: 'vertical' }}
              placeholder="e.g. Mon / Wed mornings, after 9am"
              value={form.preferredSchedule} onChange={e => onChange({ preferredSchedule: e.target.value })} />
          </div>
        )}
      </div>

      <DeliverySection form={form} onChange={onChange} profileHasAddress={profileHasAddress}
        infoNote="We can pick up and drop off your dog for training sessions"
        radioName="training-delivery" />
    </div>
  )
}

function InternationalOptions({ form, onChange, errors }) {
  return (
    <div>
      <InfoNote>
        Our team will contact you to confirm details and pricing for international pet travel.
      </InfoNote>

      <div className="mt-5" data-error={errors?.requirementsText ? 'true' : undefined}>
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>
          Tell us what you need <span className="text-red-500">*</span>
        </label>
        <textarea
          className={`input text-sm${errors?.requirementsText ? ' !border-red-400' : ''}`}
          rows={4} style={{ resize: 'vertical' }}
          placeholder="Destination country, travel dates, number of pets, any special requirements…"
          value={form.requirementsText}
          onChange={e => onChange({ requirementsText: e.target.value })} />
        {errors?.requirementsText && <p className="text-xs text-red-500 mt-1">Required</p>}
      </div>

      <div className="mt-4">
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>
          Additional notes <span className="font-normal">(optional)</span>
        </label>
        <textarea className="input text-sm" rows={2} style={{ resize: 'vertical' }}
          placeholder="Anything else we should know…"
          value={form.additionalNotes}
          onChange={e => onChange({ additionalNotes: e.target.value })} />
      </div>
    </div>
  )
}

// ── Price summary panel ───────────────────────────────────────────────────────

const VALUE_ANCHORS = {
  boarding:      'Includes 24/7 supervision, daily updates & a comfortable stay',
  day_camp:      'Includes exercise, socialisation & fresh green facilities',
  dog_walking:   'Professional, experienced walkers with live updates',
  grooming:      'Expert grooming with gentle handling',
  transport:     'Safe, stress-free transport for your pet',
  training:      'Tailored training — results-driven & reward-based',
  international: null,
}

function PriceSummaryPanel({ lineItems, serviceType, sessionCount }) {
  const [expanded, setExpanded] = useState(true)
  const isIntl     = serviceType === 'international'
  const isTraining = serviceType === 'training'
  const total      = lineItems.reduce((s, i) => s + (i.amount || 0), 0)
  const anchor     = VALUE_ANCHORS[serviceType]

  return (
    <div className="rounded-xl mt-6" style={{ border: '2px solid #c6dba0', background: '#f7faf1' }}>
      <button type="button" onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3">
        <span className="font-bold text-sm" style={{ color: 'var(--primary)' }}>Price Summary</span>
        <div className="flex items-center gap-3">
          {!isIntl && (
            <span className="font-bold text-base" style={{ color: 'var(--accent)' }}>
              {isTraining ? `JD ${(sessionCount * 50).toFixed(2)} (est.)` : `JD ${total.toFixed(2)}`}
            </span>
          )}
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} />
                    : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {isIntl ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Pricing to be confirmed by our team.</p>
          ) : isTraining ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {sessionCount} session{sessionCount !== 1 ? 's' : ''} × JD 50 = <strong>JD {(sessionCount * 50).toFixed(2)}</strong>
              <span className="ml-1" style={{ color: 'var(--muted)' }}>(estimate — confirmed after assessment)</span>
            </p>
          ) : (
            <>
              <div className="space-y-1.5 mb-3">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 text-sm">
                    <span className="flex items-start gap-1.5" style={{ color: 'var(--text)' }}>
                      <Check size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#7aa63c' }} />
                      {item.label}
                    </span>
                    <span className="font-semibold flex-shrink-0" style={{ color: '#5a7a2e' }}>
                      {item.note ? <span className="font-normal" style={{ color: 'var(--muted)' }}>{item.note}</span>
                                 : `JD ${(item.amount || 0).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 flex justify-between items-center font-bold"
                style={{ borderTop: '1px solid #c6dba0' }}>
                <span style={{ color: 'var(--text)' }}>Total</span>
                <span className="text-lg" style={{ color: 'var(--accent)' }}>JD {total.toFixed(2)}</span>
              </div>
            </>
          )}
          {anchor && (
            <p className="text-xs mt-2 italic" style={{ color: '#5a7a2e' }}>{anchor}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Step4ServiceOptions() {
  const {
    petsData, serviceType, serviceOptions, setServiceOptions,
    serviceOptionDetails, setServiceOptionDetails,
    nextStep, prevStep,
  } = useWizard()
  const { profile } = useAuth()

  const safePets = Array.isArray(petsData) && petsData.length ? petsData : [{}]
  const isPerPetService = ['boarding', 'day_camp', 'dog_walking', 'grooming'].includes(serviceType)

  const [applyToAll, setApplyToAll] = useState(true)
  const [perPetForms, setPerPetForms] = useState(() => {
    const saved = serviceOptionDetails?.[serviceType]
    if (saved?.perPet?.length) return saved.perPet
    return initPerPetForms(safePets, serviceType)
  })
  const [flatForm, setFlatForm] = useState(() => {
    const saved = serviceOptionDetails?.[serviceType]
    if (saved && !isPerPetService) return saved
    if (serviceType === 'transport')     return defaultTransport()
    if (serviceType === 'training')      return defaultTraining()
    if (serviceType === 'international') return defaultInternational()
    return {}
  })

  const [prices, setPrices]               = useState({})
  const [loadingPrices, setLoadingPrices] = useState(true)
  const [errors, setErrors]               = useState({})
  const [profileHasAddress, setProfileHasAddress] = useState(false)

  // Fetch services
  useEffect(() => {
    const token = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/services?active=eq.true&select=id,name,price,description,category,unit,pet_type&order=name`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
    )
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (!Array.isArray(data)) return
        const ALIASES = { daycamp: 'day_camp', walking: 'dog_walking' }
        const grouped = {}
        data.forEach(row => {
          let cat = (row.category || 'other').toLowerCase().replace(/[\s-]+/g, '_')
          cat = ALIASES[cat] || cat
          if (!grouped[cat]) grouped[cat] = []
          grouped[cat].push(row)
        })
        setPrices(grouped)
      })
      .catch(() => {})
      .finally(() => setLoadingPrices(false))
  }, [])

  // Pre-fill address from profile (per-pet services)
  useEffect(() => {
    if (!profile?.id || !isPerPetService) return
    const token = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}&select=address_flat,address_street,address_neighbourhood`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
    )
      .then(r => r.json())
      .then(data => {
        const p = Array.isArray(data) ? data[0] : null
        if (!p) return
        const hasAddr = !!(p.address_flat || p.address_street || p.address_neighbourhood)
        setProfileHasAddress(hasAddr)
        if (hasAddr) {
          setPerPetForms(prev => prev.map(pf => ({
            ...pf,
            address_flat:          pf.address_flat          || p.address_flat          || '',
            address_street:        pf.address_street        || p.address_street        || '',
            address_neighbourhood: pf.address_neighbourhood || p.address_neighbourhood || '',
          })))
        }
      })
      .catch(() => {})
  }, [profile?.id, isPerPetService])

  // Pre-fill address from profile (transport flat form)
  useEffect(() => {
    if (!profile?.id || serviceType !== 'transport') return
    const token = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}&select=address_flat,address_street,address_neighbourhood`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
    )
      .then(r => r.json())
      .then(data => {
        const p = Array.isArray(data) ? data[0] : null
        if (!p) return
        const hasAddr = !!(p.address_flat || p.address_street || p.address_neighbourhood)
        setProfileHasAddress(hasAddr)
        if (hasAddr) {
          setFlatForm(f => ({
            ...f,
            address_flat:          f.address_flat          || p.address_flat          || '',
            address_street:        f.address_street        || p.address_street        || '',
            address_neighbourhood: f.address_neighbourhood || p.address_neighbourhood || '',
          }))
        }
      })
      .catch(() => {})
  }, [profile?.id, serviceType])

  function updatePetForm(petIdx, patch) {
    setPerPetForms(prev => prev.map((f, i) =>
      (applyToAll || i === petIdx) ? { ...f, ...patch } : f
    ))
  }

  function handleApplyToAllToggle(checked) {
    setApplyToAll(checked)
    if (checked) {
      const master = perPetForms[0]
      setPerPetForms(prev => prev.map((f, i) => i === 0 ? f : { ...master, petIndex: f.petIndex, petName: f.petName }))
    }
  }

  async function saveAddressToProfile(pf) {
    if (!profile?.id || !pf.saveAddressToProfile) return
    const token = getAccessToken()
    fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        address_flat:          pf.address_flat          || null,
        address_street:        pf.address_street        || null,
        address_neighbourhood: pf.address_neighbourhood || null,
      }),
    }).catch(e => console.warn('[Step4] address save failed:', e))
  }

  function handleNext() {
    const errs = validateForm(serviceType, perPetForms, flatForm, serviceOptions)
    if (Object.keys(errs).length) {
      setErrors(errs)
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-error="true"]')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }

    const details = isPerPetService
      ? { applyToAllPets: applyToAll, perPet: perPetForms }
      : flatForm
    setServiceOptionDetails({ [serviceType]: details })

    if (isPerPetService) {
      perPetForms.forEach(pf => saveAddressToProfile(pf))
    } else if (serviceType === 'transport') {
      saveAddressToProfile(flatForm)
    }

    nextStep()
  }

  const lineItems = useMemo(() =>
    computeLineItems(serviceType, perPetForms, serviceOptions, prices, safePets),
    [serviceType, perPetForms, serviceOptions, prices, safePets]
  )

  const SERVICE_LABELS = {
    boarding: 'Boarding', day_camp: 'Doggy Day Camp', dog_walking: 'Dog Walking',
    grooming: 'Grooming', transport: 'Vet Visits & Transport',
    training: 'Training', international: 'International Travel',
  }

  if (loadingPrices) return (
    <div className="flex justify-center py-16">
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  const groomingDogSize = serviceOptions?.groomingDogSize || ''

  const renderPerPetPanel = (pf, idx) => {
    const petErr = errors?.perPet?.[idx] || {}
    const props  = { form: pf, onChange: patch => updatePetForm(idx, patch), prices, petsData: safePets, errors: petErr, profileHasAddress }
    switch (serviceType) {
      case 'boarding':    return <BoardingOptions {...props} />
      case 'day_camp':    return <DayCampOptions {...props} serviceOptions={serviceOptions} setServiceOptions={setServiceOptions} />
      case 'dog_walking': return <DogWalkingOptions {...props} />
      case 'grooming':    return <GroomingOptions {...props} groomingDogSize={groomingDogSize} />
      default:            return null
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>
        {SERVICE_LABELS[serviceType] || 'Service Options'}
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Customise the details for your booking.
      </p>

      {/* Apply to all toggle */}
      {isPerPetService && safePets.length > 1 && (
        <div className="mb-5 p-3 rounded-xl flex items-center gap-3"
          style={{ background: 'var(--light)', border: '1px solid var(--border)' }}>
          <input type="checkbox" id="apply-all" className="w-4 h-4 accent-[#7aa63c]"
            checked={applyToAll} onChange={e => handleApplyToAllToggle(e.target.checked)} />
          <label htmlFor="apply-all" className="text-sm cursor-pointer select-none" style={{ color: 'var(--text)' }}>
            Apply the same options to all {safePets.length} pets
          </label>
        </div>
      )}

      {/* Per-pet panels */}
      {isPerPetService && (
        applyToAll || safePets.length === 1
          ? (
            <div className="rounded-xl p-5 mb-4" style={{ border: '1px solid var(--border)', background: '#fafaf9' }}>
              {renderPerPetPanel(perPetForms[0], 0)}
            </div>
          )
          : perPetForms.map((pf, idx) => (
            <PetSection key={idx} petName={pf.petName}>
              {renderPerPetPanel(pf, idx)}
            </PetSection>
          ))
      )}

      {/* Flat forms */}
      {serviceType === 'transport' && (
        <div className="rounded-xl p-5 mb-4" style={{ border: '1px solid var(--border)', background: '#fafaf9' }}>
          <TransportOptions form={flatForm} onChange={patch => setFlatForm(f => ({ ...f, ...patch }))} errors={errors} profileHasAddress={profileHasAddress} />
        </div>
      )}
      {serviceType === 'training' && (
        <div className="rounded-xl p-5 mb-4" style={{ border: '1px solid var(--border)', background: '#fafaf9' }}>
          <TrainingOptions form={flatForm} onChange={patch => setFlatForm(f => ({ ...f, ...patch }))} errors={errors} profileHasAddress={profileHasAddress} />
        </div>
      )}
      {serviceType === 'international' && (
        <div className="rounded-xl p-5 mb-4" style={{ border: '1px solid var(--border)', background: '#fafaf9' }}>
          <InternationalOptions form={flatForm} onChange={patch => setFlatForm(f => ({ ...f, ...patch }))} errors={errors} />
        </div>
      )}

      {/* Price summary */}
      <PriceSummaryPanel lineItems={lineItems} serviceType={serviceType} sessionCount={flatForm.sessionCount || 1} />

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button onClick={prevStep} className="btn-secondary px-6">← Previous</button>
        <button onClick={handleNext} className="btn-primary px-8">Next →</button>
      </div>
    </div>
  )
}
