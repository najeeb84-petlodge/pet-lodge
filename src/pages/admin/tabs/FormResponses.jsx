import { useEffect, useState } from 'react'

function ExpandableCell({ value }) {
  const [expanded, setExpanded] = useState(false)
  if (!value || value === '—') return <span>—</span>
  if (value.length <= 60) return <span title={value}>{value}</span>
  return (
    <span>
      {expanded ? value : value.slice(0, 60) + '…'}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ marginLeft: '4px', color: '#5a7a2e', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px' }}>
        {expanded ? 'less' : 'more'}
      </button>
    </span>
  )
}
import { format } from 'date-fns'
import { Download, Loader2, Eye } from 'lucide-react'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../../lib/supabase'
import BookingModal from './BookingModal'

async function fetchBookings() {
  const token = getAccessToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?select=*&order=created_at.desc`,
      {
        signal: controller.signal,
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` },
      }
    )
    clearTimeout(timer)
    const body = await res.json()
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`)
    return { data: body, error: null }
  } catch (e) {
    clearTimeout(timer)
    return { data: null, error: e?.name === 'AbortError' ? 'Request timed out' : (e?.message || 'Failed to load') }
  }
}

function petField(b, field) {
  const pets = b.pets_data
  if (!Array.isArray(pets) || !pets.length) return '—'
  return pets.map(p => p[field] || '').filter(Boolean).join(', ') || '—'
}

function petFieldAll(b, field) {
  const pets = b.pets_data
  if (!Array.isArray(pets) || !pets.length) return '—'
  if (pets.length === 1) return pets[0][field] || '—'
  return pets.map((p, i) => `${p.name || `Pet ${i+1}`}: ${p[field] || '—'}`).join(' | ') || '—'
}

function serviceLabel(b) {
  const MAP = { boarding: 'Boarding', day_camp: 'Doggy Day Camp', dog_walking: 'Dog Walking', grooming: 'Grooming', transport: 'Transport', training: 'Training', international: 'International' }
  return MAP[b.service_type] || b.service_type || '—'
}

function lineItemsSummary(b) {
  const li = b.service_details?.line_items
  if (!Array.isArray(li) || !li.length) return '—'
  return li.map(i => `${i.label} (JD ${i.amount})`).join(' | ')
}

function transportSummary(b) {
  const perPet = b.service_details?.perPet
  if (!Array.isArray(perPet) || !perPet.length) return '—'
  const p = perPet[0]
  if (!p.transport || p.transport === 'self') return 'Self'
  const parts = []
  const tMap = { round_trip: 'Round trip', pickup_only: 'Pick up only', dropoff_only: 'Drop off only' }
  parts.push(tMap[p.transport] || p.transport)
  if (p.address_flat || p.address_street || p.address_neighbourhood) {
    parts.push([p.address_flat, p.address_street, p.address_neighbourhood].filter(Boolean).join(', '))
  }
  if (p.pickupTime)  parts.push(`Pick-up: ${p.pickupTime}`)
  if (p.dropoffTime) parts.push(`Drop-off: ${p.dropoffTime}`)
  return parts.join(' — ')
}

function foodSummary(b) {
  const perPet = b.service_details?.perPet
  if (!Array.isArray(perPet) || !perPet.length) return '—'
  const f = { lodge_small: 'Lodge food (small/cat)', lodge_large: 'Lodge food (medium/large)', owner_provided: 'Owner provided' }
  if (perPet.length === 1) return f[perPet[0].foodChoice] || perPet[0].foodChoice || '—'
  return perPet.map(p => `${p.petName}: ${f[p.foodChoice] || p.foodChoice || '—'}`).join(' | ')
}

function fleaTickSummary(b) {
  const perPet = b.service_details?.perPet
  if (!Array.isArray(perPet) || !perPet.length) return '—'
  if (perPet.length === 1) return perPet[0].fleaTick === 'lodge_applies' ? 'Lodge applies' : 'Owner covered'
  return perPet.map(p => `${p.petName}: ${p.fleaTick === 'lodge_applies' ? 'Lodge applies' : 'Owner covered'}`).join(' | ')
}

function groomingAddonsSummary(b) {
  const li = b.service_details?.line_items
  if (!Array.isArray(li)) return '—'
  const items = li.filter(i => i.label?.toLowerCase().includes('groom') || i.label?.toLowerCase().includes('bath') || i.label?.toLowerCase().includes('trim') || i.label?.toLowerCase().includes('nail'))
  return items.map(i => i.label).join(', ') || '—'
}

function trainingSummary(b) {
  const perPet = b.service_details?.perPet
  if (Array.isArray(perPet)) {
    const sessions = perPet.filter(p => p.trainingSessions > 0)
    if (sessions.length) {
      if (sessions.length === 1) return `${sessions[0].trainingSessions} session(s)${sessions[0].trainingGoals ? ` — ${sessions[0].trainingGoals}` : ''}`
      return sessions.map(p => `${p.petName}: ${p.trainingSessions} session(s)${p.trainingGoals ? ` — ${p.trainingGoals}` : ''}`).join(' | ')
    }
  }
  const sd = b.service_details
  if (sd?.trainingSessions > 0) return `${sd.trainingSessions} session(s)${sd.trainingGoals ? ` — ${sd.trainingGoals}` : ''}`
  return '—'
}


const COLUMNS = [
  { key: 'action',              label: '' },
  { key: 'booking_ref',         label: 'Booking ID' },
  { key: 'created_at',          label: 'Submitted' },
  { key: 'status',              label: 'Status' },
  { key: 'customer_first_name', label: 'First Name' },
  { key: 'customer_last_name',  label: 'Last Name' },
  { key: 'customer_email',      label: 'Email' },
  { key: 'customer_phone',      label: 'Phone' },
  { key: 'customer_whatsapp',   label: 'WhatsApp' },
  { key: 'how_heard',           label: 'How They Heard' },
  { key: 'newsletter',          label: 'Newsletter Prefs' },
  { key: 'num_pets',            label: 'No. of Pets' },
  { key: 'pet_names',           label: 'Pet Names' },
  { key: 'pet_types',           label: 'Pet Types' },
  { key: 'pet_breeds',          label: 'Pet Breeds' },
  { key: 'pet_ages',            label: 'Pet Ages' },
  { key: 'pet_genders',         label: 'Pet Genders' },
  { key: 'pet_desexed',         label: 'Desexed' },
  { key: 'pet_colours',         label: 'Pet Colours' },
  { key: 'pet_medication',      label: 'Medication' },
  { key: 'pet_vet',             label: 'Vet Info' },
  { key: 'service',             label: 'Service' },
  { key: 'start_date',          label: 'Check-in' },
  { key: 'end_date',            label: 'Check-out' },
  { key: 'total_days',          label: 'Days' },
  { key: 'total_amount',        label: 'Amount (JD)' },
  { key: 'line_items',          label: 'Service Breakdown' },
  { key: 'transport',           label: 'Transport' },
  { key: 'food',                label: 'Food Choice' },
  { key: 'flea_tick',           label: 'Flea & Tick' },
  { key: 'grooming_addons',     label: 'Grooming Add-ons' },
  { key: 'training',            label: 'Training' },
  { key: 'note_general',        label: 'General Notes' },
  { key: 'note_food',           label: 'Food Notes' },
  { key: 'note_medication',     label: 'Medication Notes' },
  { key: 'note_walker',         label: 'Walker Notes' },
  { key: 'note_training',       label: 'Training Goals' },
  { key: 'note_driver',         label: 'Driver Notes' },
  { key: 'note_schedule',       label: 'Preferred Schedule' },
  { key: 'vaccination_consent', label: 'Vaccination Consent' },
  { key: 'condition_consent',   label: 'Condition Consent' },
  { key: 'pregnancy_consent',   label: 'Pregnancy Consent' },
  { key: 'terms_accepted',      label: 'T&C Accepted' },
  { key: 'is_guest',            label: 'Guest Booking' },
]

function cellValue(b, key) {
  switch (key) {
    case 'action':              return ''
    case 'booking_ref':         return b.booking_ref || b.id?.slice(0, 8)
    case 'created_at':          return b.created_at ? format(new Date(b.created_at), 'dd/MM/yyyy') : '—'
    case 'status':              return b.status || '—'
    case 'customer_first_name': return b.customer_first_name || '—'
    case 'customer_last_name':  return b.customer_last_name  || '—'
    case 'customer_email':      return b.customer_email    || '—'
    case 'customer_phone':      return b.customer_phone    || '—'
    case 'customer_whatsapp':   return b.customer_whatsapp || '—'
    case 'how_heard':           return Array.isArray(b.how_heard) ? b.how_heard.join(', ') : (b.how_heard || '—')
    case 'newsletter':          return Array.isArray(b.newsletter_preferences) ? b.newsletter_preferences.join(', ') : (b.newsletter_preferences || '—')
    case 'num_pets':            return b.num_pets || '—'
    case 'pet_names':           return petField(b, 'name')
    case 'pet_types':           return petField(b, 'type')
    case 'pet_breeds':          return petField(b, 'breed')
    case 'pet_ages':            return petFieldAll(b, 'age')
    case 'pet_genders':         return petFieldAll(b, 'gender')
    case 'pet_desexed':         return petFieldAll(b, 'desexed')
    case 'pet_colours':         return petFieldAll(b, 'colour')
    case 'pet_medication':      return petFieldAll(b, 'medication_notes')
    case 'pet_vet': {
      if (!Array.isArray(b.pets_data) || !b.pets_data.length) return '—'
      if (b.pets_data.length === 1) { const p = b.pets_data[0]; return `${p.vet_name || '—'} (${p.vet_phone || '—'})` }
      return b.pets_data.map(p => `${p.name}: ${p.vet_name || '—'} (${p.vet_phone || '—'})`).join(' | ')
    }
    case 'service':             return serviceLabel(b)
    case 'start_date':          return b.start_date ? format(new Date(b.start_date), 'dd/MM/yyyy') : '—'
    case 'end_date':            return b.end_date   ? format(new Date(b.end_date),   'dd/MM/yyyy') : '—'
    case 'total_days':          return b.total_days || '—'
    case 'total_amount':        return parseFloat(b.total_amount || 0).toFixed(2)
    case 'line_items':          return lineItemsSummary(b)
    case 'transport':           return transportSummary(b)
    case 'food':                return foodSummary(b)
    case 'flea_tick':           return fleaTickSummary(b)
    case 'grooming_addons':     return groomingAddonsSummary(b)
    case 'training':            return trainingSummary(b)
    case 'note_general': {
      const parts = []
      if (b.additional_comments) parts.push(b.additional_comments)
      if (b.special_food_req)    parts.push(`Food req: ${b.special_food_req}`)
      return parts.join(' | ') || '—'
    }
    case 'note_food': {
      const perPet = b.service_details?.perPet
      if (!Array.isArray(perPet) || !perPet.length) return b.special_food_req || '—'
      const notes = perPet.filter(p => p.foodNotes).map(p => perPet.length > 1 ? `${p.petName}: ${p.foodNotes}` : p.foodNotes)
      return notes.join(' | ') || b.special_food_req || '—'
    }
    case 'note_medication': {
      const petArr = b.pets_data
      if (!Array.isArray(petArr) || !petArr.length) return b.medication_notes || '—'
      const notes = petArr.filter(p => p.medication_notes).map(p => petArr.length > 1 ? `${p.name}: ${p.medication_notes}` : p.medication_notes)
      return notes.join(' | ') || '—'
    }
    case 'note_walker': {
      const perPet = b.service_details?.perPet
      if (!Array.isArray(perPet) || !perPet.length) return '—'
      const notes = perPet.filter(p => p.walkerNotes).map(p => perPet.length > 1 ? `${p.petName}: ${p.walkerNotes}` : p.walkerNotes)
      return notes.join(' | ') || '—'
    }
    case 'note_training': {
      const perPet = b.service_details?.perPet
      if (Array.isArray(perPet)) {
        const notes = perPet.filter(p => p.trainingGoals).map(p => perPet.length > 1 ? `${p.petName}: ${p.trainingGoals}` : p.trainingGoals)
        if (notes.length) return notes.join(' | ')
      }
      return b.service_details?.trainingGoals || '—'
    }
    case 'note_driver': {
      const parts = []
      if (b.driver_comments) parts.push(b.driver_comments)
      const perPet = b.service_details?.perPet
      if (Array.isArray(perPet)) {
        perPet.filter(p => p.address_driver_comments).forEach(p => {
          parts.push(perPet.length > 1 ? `${p.petName}: ${p.address_driver_comments}` : p.address_driver_comments)
        })
      }
      return parts.join(' | ') || '—'
    }
    case 'note_schedule':       return b.service_details?.preferredSchedule || '—'
    case 'vaccination_consent': return b.vaccination_consent ? 'Yes' : 'No'
    case 'condition_consent':   return b.condition_consent   ? 'Yes' : 'No'
    case 'pregnancy_consent':   return b.pregnancy_consent   != null ? (b.pregnancy_consent ? 'Yes' : 'No') : 'N/A'
    case 'terms_accepted':      return b.terms_accepted      ? 'Yes' : 'No'
    case 'is_guest':            return b.is_guest ? 'Yes' : 'No'
    default: return '—'
  }
}

export default function FormResponses({ isSuperAdmin, isAdmin }) {
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [selected,  setSelected]  = useState(null)

  async function load() {
    setLoading(true); setError(null)
    const { data, error: err } = await fetchBookings()
    if (err) { setError(err); setLoading(false); return }
    setBookings(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function exportCSV() {
    const headers = COLUMNS.filter(c => c.key !== 'action').map(c => c.label)
    const rows = bookings.map(b =>
      COLUMNS.filter(c => c.key !== 'action').map(c => cellValue(b, c.key))
    )
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pet-lodge-bookings-${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <p className="text-red-500 text-sm font-semibold">Error: {error}</p>
      <button onClick={load} className="btn-secondary text-sm">Retry</button>
    </div>
  )

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h2 className="font-bold text-lg" style={{ color: 'var(--accent)' }}>Form Responses</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} · scroll horizontally to see all columns
          </p>
        </div>
        {isSuperAdmin && bookings.length > 0 && (
          <button onClick={exportCSV} className="btn-primary flex items-center gap-2 text-sm">
            <Download size={15} /> Export CSV
          </button>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>No form responses yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: '3200px' }}>
            <thead style={{ background: 'var(--light)' }}>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap"
                    style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={b.id} style={{ background: i % 2 === 1 ? '#fafaf8' : 'white' }}>
                  {COLUMNS.map(col => (
                    <td key={col.key} className="px-3 py-2 whitespace-nowrap"
                      style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {col.key === 'action' ? (
                        (isSuperAdmin || isAdmin) && (
                          <button onClick={() => setSelected(b)}
                            style={{ padding: '4px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            title="View / Edit booking">
                            <Eye size={14} style={{ color: '#3b82f6' }} />
                          </button>
                        )
                      ) : col.key === 'booking_ref' ? (
                        <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{cellValue(b, col.key)}</span>
                      ) : col.key === 'status' ? (
                        <span className={`badge-${b.status || 'pending'}`}>{b.status || 'pending'}</span>
                      ) : col.key === 'total_amount' ? (
                        <span className="font-semibold">JD {cellValue(b, col.key)}</span>
                      ) : (col.key.startsWith('note_') || col.key === 'line_items' || col.key === 'transport') ? (
                        <ExpandableCell value={String(cellValue(b, col.key))} />
                      ) : (
                        <span title={String(cellValue(b, col.key))}>{cellValue(b, col.key)}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <BookingModal
          booking={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}
