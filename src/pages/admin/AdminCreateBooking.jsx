import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { sendAdminNotification } from '../../utils/sendAdminNotification'
import { sendBookingConfirmation } from '../../utils/sendBookingConfirmation'
import { syncProfileFromBooking } from '../../utils/syncProfileFromBooking'

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_OPTIONS = [
  { value: 'phone',              label: 'Phone' },
  { value: 'walk_in',            label: 'Walk-in' },
  { value: 'whatsapp',           label: 'WhatsApp' },
  { value: 'instagram_dm',       label: 'Instagram DM' },
  { value: 'returning_customer', label: 'Returning customer' },
  { value: 'other',              label: 'Other' },
]

const SERVICE_TYPES = [
  { value: 'boarding',      label: 'Boarding' },
  { value: 'day_camp',      label: 'Doggy Day Camp' },
  { value: 'dog_walking',   label: 'Dog Walking' },
  { value: 'grooming',      label: 'Grooming' },
  { value: 'training',      label: 'Training' },
  { value: 'transport',     label: 'Vet Transport' },
  { value: 'international', label: 'International Travel' },
]

const TRANSPORT_OPTIONS = [
  { value: 'self',         label: "I'll handle transport",       price: 0  },
  { value: 'round_trip',   label: 'Round trip (pick-up + drop-off)', price: 30 },
  { value: 'pickup_only',  label: 'Pick-up only',                price: 15 },
  { value: 'dropoff_only', label: 'Drop-off only',               price: 15 },
]

// DB category → serviceType mapping (inverse of bookingUtils ALIASES)
function normCat(c) {
  const s = (c || '').toLowerCase().replace(/[\s-]+/g, '_')
  if (s === 'daycamp') return 'day_camp'
  if (s === 'walking') return 'dog_walking'
  return s
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateBookingRef() {
  const now = new Date()
  const yy  = String(now.getFullYear()).slice(2)
  const mm  = String(now.getMonth() + 1).padStart(2, '0')
  const dd  = String(now.getDate()).padStart(2, '0')
  return `PL-${yy}${mm}${dd}-${Math.floor(1000 + Math.random() * 9000)}`
}

function computeNights(start, end) {
  if (!start || !end) return 0
  const diff = (new Date(end) - new Date(start)) / 86400000
  return Math.max(0, Math.round(diff))
}

function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`
}

// ── Tiny layout helpers ───────────────────────────────────────────────────────

function SectionBox({ title, yellow, children }) {
  return (
    <div style={{
      marginBottom: '1rem',
      background: yellow ? '#fefce8' : 'white',
      border: `1px ${yellow ? 'dashed' : 'solid'} ${yellow ? '#fde047' : 'var(--border)'}`,
      borderRadius: '0.75rem',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '0.45rem 1rem',
        background: yellow ? '#fef9c3' : 'var(--light)',
        borderBottom: `1px ${yellow ? 'dashed' : 'solid'} ${yellow ? '#fde047' : 'var(--border)'}`,
        fontWeight: '700',
        fontSize: '0.72rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: yellow ? '#92400e' : 'var(--primary)',
      }}>
        {title}
      </div>
      <div style={{ padding: '0.875rem 1rem' }}>{children}</div>
    </div>
  )
}

function FieldWrap({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.25rem' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '3px' }}>{error}</p>}
    </div>
  )
}

function autofillStyle(active) {
  return active ? { background: '#f0f7e6', border: '1px solid #a3d977' } : {}
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminCreateBooking({ onClose, onCreated }) {
  const { profile } = useAuth()

  // ── 1. Customer search ──────────────────────────────────────────────────────
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState([])
  const [searching,      setSearching]      = useState(false)
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [isAutofilled,   setIsAutofilled]   = useState(false)
  const [customerFields, setCustomerFields] = useState({
    first_name: '', last_name: '', email: '', phone: '', whatsapp_number: '',
  })
  const searchTimeout       = useRef(null)
  const dropdownRef         = useRef(null)
  const newCustomerBtnsRef  = useRef(null)

  // ── 2. Pets ─────────────────────────────────────────────────────────────────
  const [customerPets,   setCustomerPets]   = useState([])
  const [petsLoading,    setPetsLoading]    = useState(false)
  const [selectedPetIds, setSelectedPetIds] = useState([])

  // ── 3. Services & booking details ───────────────────────────────────────────
  const [allServices,      setAllServices]      = useState([])
  const [serviceType,      setServiceType]      = useState('')
  const [servicePackageId, setServicePackageId] = useState('')
  const [checkIn,   setCheckIn]   = useState(localDateStr())
  const [checkOut,  setCheckOut]  = useState(localDateStr(new Date(Date.now() + 86400000)))
  const [perPetExtras, setPerPetExtras] = useState({}) // petId → {food:'none'|'small'|'large', fleaTick:bool}

  // ── 4. Transport ─────────────────────────────────────────────────────────────
  const [transportOpen,  setTransportOpen]  = useState(false)
  const [transportType,  setTransportType]  = useState('self')
  const [pickupDate,     setPickupDate]     = useState('')
  const [pickupTime,     setPickupTime]     = useState('')
  const [dropoffDate,    setDropoffDate]    = useState('')
  const [dropoffTime,    setDropoffTime]    = useState('')
  const [driverComments, setDriverComments] = useState('')

  // ── 5. Notes ─────────────────────────────────────────────────────────────────
  const [perPetNotes,        setPerPetNotes]        = useState({}) // petId → {medication:'', food:''}
  const [additionalComments, setAdditionalComments] = useState('')

  // ── 6. Admin section ─────────────────────────────────────────────────────────
  const [source,       setSource]       = useState('phone')
  const [internalNote, setInternalNote] = useState('')

  // ── 7. Pricing ───────────────────────────────────────────────────────────────
  const [lineItems,     setLineItems]     = useState([])
  const [discountType,  setDiscountType]  = useState('jd')
  const [discountValue, setDiscountValue] = useState('')

  // ── 8. Email ─────────────────────────────────────────────────────────────────
  const [sendEmail, setSendEmail] = useState(true)

  // ── Form state ───────────────────────────────────────────────────────────────
  const [errors,      setErrors]      = useState({})
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success,     setSuccess]     = useState(false)

  // ── New customer inline form ──────────────────────────────────────────────────
  const [newCustomerPanelOpen,  setNewCustomerPanelOpen]  = useState(false)
  const [newCustomerForm,       setNewCustomerForm]       = useState({ first_name: '', last_name: '', email: '', phone: '', whatsapp_number: '' })
  const [newCustomerErrors,     setNewCustomerErrors]     = useState({})
  const [creatingCustomer,      setCreatingCustomer]      = useState(false)
  const [createCustomerError,   setCreateCustomerError]   = useState('')
  const [inviteLink,            setInviteLink]            = useState(null)
  const [isNewCustomer,         setIsNewCustomer]         = useState(false)

  // ── New pet inline form ────────────────────────────────────────────────────────
  const [newPetPanelOpen, setNewPetPanelOpen] = useState(false)
  const [newPetForm,      setNewPetForm]      = useState({ name: '', type: 'dog', breed: '', age: '', colour: '', gender: 'male', desexed: false, vet_name: '', vet_phone: '', medication_notes: '' })
  const [newPetErrors,    setNewPetErrors]    = useState({})
  const [creatingPet,     setCreatingPet]     = useState(false)

  // ── Fetch services on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const token = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/services?active=eq.true&select=id,name,price,category,unit,pet_type&order=name`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
    )
      .then(r => r.json())
      .then(d => setAllServices(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  // ── Debounced customer search ─────────────────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 3) { setSearchResults([]); setShowDropdown(false); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const token  = getAccessToken()
        const esc    = encodeURIComponent(q)
        const wild   = `%25${esc}%25`
        const orFilter = `(first_name.ilike.${wild},last_name.ilike.${wild},email.ilike.${wild},phone.ilike.${wild},whatsapp_number.ilike.${wild})`
        const url = `${SUPABASE_URL}/rest/v1/profiles?or=${orFilter}&role=eq.customer&limit=5&select=id,first_name,last_name,email,phone,whatsapp_number`
        const res  = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } })
        const data = await res.json().catch(() => [])
        setSearchResults(Array.isArray(data) ? data : [])
        setShowDropdown(true)
      } catch { setSearchResults([]) }
      setSearching(false)
    }, 300)
  }, [searchQuery])

  // ── Fetch pets when customer selected ────────────────────────────────────────
  useEffect(() => {
    if (!selectedCustomer?.id) { setCustomerPets([]); setSelectedPetIds([]); return }
    setPetsLoading(true)
    const token = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/pets?owner_id=eq.${selectedCustomer.id}&select=*`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
    )
      .then(r => r.json())
      .then(d => setCustomerPets(Array.isArray(d) ? d : []))
      .catch(() => setCustomerPets([]))
      .finally(() => setPetsLoading(false))
  }, [selectedCustomer])

  // ── Auto-compute line items ───────────────────────────────────────────────────
  useEffect(() => {
    const items = []
    const nights = computeNights(checkIn, checkOut)
    const selectedPets = customerPets.filter(p => selectedPetIds.includes(p.id))

    // Primary service package
    if (servicePackageId && allServices.length > 0) {
      const pkg = allServices.find(s => s.id === servicePackageId)
      if (pkg) {
        const isPerNight = ['boarding', 'day_camp'].includes(serviceType)
        if (isPerNight && nights > 0) {
          items.push({
            label: `${pkg.name} × ${nights} night${nights !== 1 ? 's' : ''}`,
            unit_price: parseFloat(pkg.price || 0),
            quantity: nights,
            amount: parseFloat(pkg.price || 0) * nights,
            unit: 'night',
          })
        } else {
          items.push({
            label: pkg.name,
            unit_price: parseFloat(pkg.price || 0),
            quantity: 1,
            amount: parseFloat(pkg.price || 0),
            unit: 'service',
          })
        }
      }
    }

    // Per-pet food & flea/tick extras (boarding + day_camp)
    if (['boarding', 'day_camp'].includes(serviceType)) {
      const nights_ = Math.max(1, computeNights(checkIn, checkOut))
      selectedPets.forEach(pet => {
        const ext = perPetExtras[pet.id] || {}
        if (ext.food === 'small') {
          items.push({ label: `Food (small/cat) for ${pet.name}`, unit_price: 2, quantity: nights_, amount: 2 * nights_, unit: 'night' })
        } else if (ext.food === 'large') {
          items.push({ label: `Food (medium/large) for ${pet.name}`, unit_price: 4, quantity: nights_, amount: 4 * nights_, unit: 'night' })
        }
        if (ext.fleaTick) {
          const price = (pet.type || '').toLowerCase() === 'cat' ? 25 : 35
          items.push({ label: `Flea & tick for ${pet.name}`, unit_price: price, quantity: 1, amount: price, unit: 'service' })
        }
      })
    }

    // Transport
    if (transportType && transportType !== 'self') {
      const tc = TRANSPORT_OPTIONS.find(o => o.value === transportType)
      if (tc && tc.price > 0) {
        items.push({ label: tc.label, unit_price: tc.price, quantity: 1, amount: tc.price, unit: 'service' })
      }
    }

    setLineItems(items)
  }, [servicePackageId, serviceType, checkIn, checkOut, selectedPetIds, customerPets, perPetExtras, transportType, allServices])

  // ── Click-outside closes dropdown ────────────────────────────────────────────
  useEffect(() => {
    function handle(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (!showDropdown) setNewCustomerPanelOpen(false)
  }, [showDropdown])

  useEffect(() => {
    if (newCustomerPanelOpen) {
      // Give React one frame to render the form, then scroll the action buttons into view
      requestAnimationFrame(() => {
        newCustomerBtnsRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
      })
    }
  }, [newCustomerPanelOpen])

  // ── Derived values ────────────────────────────────────────────────────────────
  const nights    = computeNights(checkIn, checkOut)
  const subtotal  = lineItems.reduce((s, i) => s + (i.amount || 0), 0)
  const discountAmt = discountType === 'jd'
    ? parseFloat(discountValue) || 0
    : subtotal * ((parseFloat(discountValue) || 0) / 100)
  const finalTotal    = Math.max(0, subtotal - discountAmt)
  const selectedPets  = customerPets.filter(p => selectedPetIds.includes(p.id))

  // Packages for selected service type (exclude add-on categories)
  const ADDON_CATS = ['grooming_addon', 'training_addon']
  const packages   = allServices.filter(s => {
    const cat = normCat(s.category)
    return cat === serviceType && !ADDON_CATS.includes((s.category || '').toLowerCase())
  })

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function selectCustomer(c) {
    setSelectedCustomer(c)
    setCustomerFields({
      first_name:    c.first_name    || '',
      last_name:     c.last_name     || '',
      email:         c.email         || '',
      phone:         c.phone         || '',
      whatsapp_number: c.whatsapp_number || '',
    })
    setIsAutofilled(true)
    setSearchQuery(`${c.first_name || ''} ${c.last_name || ''}`.trim())
    setShowDropdown(false)
    setSearchResults([])
    setIsNewCustomer(false)
    setInviteLink(null)
  }

  function setField(key, val) {
    setCustomerFields(f => ({ ...f, [key]: val }))
  }

  function togglePet(petId) {
    setSelectedPetIds(prev =>
      prev.includes(petId) ? prev.filter(id => id !== petId) : [...prev, petId]
    )
  }

  function setExtra(petId, key, val) {
    setPerPetExtras(prev => ({ ...prev, [petId]: { ...(prev[petId] || {}), [key]: val } }))
  }

  function setPetNote(petId, key, val) {
    setPerPetNotes(prev => ({ ...prev, [petId]: { ...(prev[petId] || {}), [key]: val } }))
  }

  async function handleCreateCustomer() {
    const e = {}
    if (!newCustomerForm.first_name.trim()) e.first_name = 'Required'
    if (!newCustomerForm.last_name.trim())  e.last_name  = 'Required'
    if (!newCustomerForm.email.trim())      e.email      = 'Required'
    if (!newCustomerForm.phone.trim())      e.phone      = 'Required'
    setNewCustomerErrors(e)
    if (Object.keys(e).length > 0) return

    setCreatingCustomer(true)
    setCreateCustomerError('')
    try {
      const token = getAccessToken()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({
          first_name:      newCustomerForm.first_name.trim(),
          last_name:       newCustomerForm.last_name.trim(),
          email:           newCustomerForm.email.trim(),
          phone:           newCustomerForm.phone.trim(),
          whatsapp_number: newCustomerForm.whatsapp_number.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCreateCustomerError(
          res.status === 409
            ? 'A customer with this email already exists. Search for them above.'
            : data?.error || `Failed to create customer (${res.status})`
        )
        return
      }
      const newCustomer = {
        id:              data.user_id,
        first_name:      newCustomerForm.first_name.trim(),
        last_name:       newCustomerForm.last_name.trim(),
        email:           newCustomerForm.email.trim().toLowerCase(),
        phone:           newCustomerForm.phone.trim(),
        whatsapp_number: newCustomerForm.whatsapp_number.trim() || null,
      }
      selectCustomer(newCustomer)
      setIsNewCustomer(true)
      setInviteLink(data.invite_link || null)
    } catch (err) {
      setCreateCustomerError(err?.message || 'Network error')
    } finally {
      setCreatingCustomer(false)
    }
  }

  async function handleCreatePet() {
    const e = {}
    for (const k of ['name', 'type', 'breed', 'age', 'colour', 'gender', 'vet_name', 'vet_phone']) {
      if (!String(newPetForm[k] ?? '').trim()) e[k] = 'Required'
    }
    setNewPetErrors(e)
    if (Object.keys(e).length > 0) return
    if (!selectedCustomer?.id) return

    setCreatingPet(true)
    try {
      const token = getAccessToken()
      const body = {
        name:             newPetForm.name.trim(),
        type:             newPetForm.type,
        breed:            newPetForm.breed.trim(),
        age:              Number(newPetForm.age),
        colour:           newPetForm.colour.trim(),
        gender:           newPetForm.gender,
        desexed:          Boolean(newPetForm.desexed),
        vet_name:         newPetForm.vet_name.trim(),
        vet_phone:        newPetForm.vet_phone.trim(),
        medication_notes: newPetForm.medication_notes.trim(),
        owner_id:         selectedCustomer.id,
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/pets`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token || SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setNewPetErrors({ _submit: err?.message || `Save failed (${res.status})` })
        return
      }
      const created = await res.json().catch(() => [])
      const newPet  = Array.isArray(created) ? created[0] : created
      if (newPet?.id) {
        setCustomerPets(prev => [...prev, newPet])
        setSelectedPetIds(prev => [...prev, newPet.id])
      }
      setNewPetPanelOpen(false)
      setNewPetForm({ name: '', type: 'dog', breed: '', age: '', colour: '', gender: 'male', desexed: false, vet_name: '', vet_phone: '', medication_notes: '' })
      setNewPetErrors({})
    } catch (err) {
      setNewPetErrors({ _submit: err?.message || 'Network error' })
    } finally {
      setCreatingPet(false)
    }
  }

  function validate() {
    const e = {}
    if (!customerFields.first_name.trim()) e.first_name = 'Required'
    if (!customerFields.last_name.trim())  e.last_name  = 'Required'
    if (!customerFields.email.trim())      e.email      = 'Required'
    if (!customerFields.phone.trim())      e.phone      = 'Required'
    if (selectedPetIds.length === 0)       e.pets       = 'Select at least one pet'
    if (!serviceType)                      e.serviceType = 'Required'
    if (!servicePackageId)                 e.servicePackageId = 'Select a package'
    if (!checkIn)                          e.checkIn    = 'Required'
    if (!checkOut)                         e.checkOut   = 'Required'
    if (!source)                           e.source     = 'Required'
    if (checkOut && checkIn && checkOut < checkIn) e.checkOut = 'Must be after check-in'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) {
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-field-error]')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      const token = getAccessToken()

      const medicationNotes = selectedPets
        .map(p => perPetNotes[p.id]?.medication).filter(Boolean).join('; ') || null
      const foodNotesCombined = selectedPets
        .map(p => perPetNotes[p.id]?.food).filter(Boolean).join('; ') || null

      // Enrich pets_data with per-pet notes
      const petsData = selectedPets.map((p, i) => ({
        id:   p.id,
        name: p.name,
        type: p.type,
        breed: p.breed,
        age:   p.age,
        gender: p.gender,
        color:  p.color,
        medication_notes: perPetNotes[p.id]?.medication || p.medication_notes || null,
      }))

      const perPetForm = selectedPets.map((p, i) => ({
        petName:  p.name,
        petIndex: i,
        foodNotes:   perPetNotes[p.id]?.food || null,
        food:        perPetExtras[p.id]?.food || null,
        fleaTick:    perPetExtras[p.id]?.fleaTick ? 'lodge_applies' : null,
      }))

      const serviceDetails = {
        serviceOptions: {
          option:      servicePackageId,
          startDate:   checkIn,
          endDate:     checkOut,
          transport:   transportType,
          pickupDate:  pickupDate  || null,
          pickupTime:  pickupTime  || null,
          dropoffDate: dropoffDate || null,
          dropoffTime: dropoffTime || null,
        },
        perPet:       perPetForm,
        line_items:   lineItems,
        total_amount: finalTotal,
        ...(discountAmt > 0 ? { discount_amount: discountAmt, discount_type: discountType } : {}),
      }

      const body = {
        customer_id:         selectedCustomer?.id || null,
        created_by:          profile?.id  || null,
        customer_first_name: customerFields.first_name,
        customer_last_name:  customerFields.last_name,
        customer_email:      customerFields.email,
        customer_phone:      customerFields.phone,
        customer_whatsapp:   customerFields.whatsapp_number || customerFields.phone || null,
        how_heard:           [source],
        pet_names:           selectedPets.map(p => p.name).filter(Boolean),
        num_pets:            selectedPets.length || 1,
        pets_data:           petsData,
        service_type:        serviceType,
        service_details:     serviceDetails,
        start_date:          checkIn,
        end_date:            checkOut,
        total_days:          nights,
        status:              'pending',
        payment_status:      'unpaid',
        subtotal:            subtotal,
        total_amount:        finalTotal,
        is_guest:            false,
        is_staff_booking:    true,
        additional_comments: additionalComments || null,
        admin_notes:         internalNote       || null,
        medication_notes:    medicationNotes,
        special_food_req:    foodNotesCombined,
        driver_comments:     driverComments     || null,
        vaccination_consent: null,
        condition_consent:   null,
        pregnancy_consent:   null,
        terms_accepted:      null,
      }

      // INSERT with collision retry (same pattern as Step5Confirmation)
      let ref = null
      for (let attempt = 0; attempt < 3; attempt++) {
        const bookingRef = generateBookingRef()
        const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
          method: 'POST',
          headers: {
            apikey:         SUPABASE_KEY,
            Authorization:  `Bearer ${token || SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer:         'return=minimal',
          },
          body: JSON.stringify({ ...body, booking_ref: bookingRef }),
        })
        if (res.ok) { ref = bookingRef; break }
        const err = await res.json().catch(() => ({}))
        const msg = JSON.stringify(err)
        if (!msg.includes('unique') && !msg.includes('duplicate')) {
          throw new Error(err.message || err.error_description || 'Failed to create booking')
        }
      }
      if (!ref) throw new Error('Could not generate unique booking reference. Please try again.')

      // Sync existing customer's profile — skip for new accounts (profile already fully created by edge function)
      if (selectedCustomer?.id && !isNewCustomer) {
        syncProfileFromBooking(selectedCustomer.id, {
          firstName: customerFields.first_name,
          lastName:  customerFields.last_name,
          phone:     customerFields.phone,
          whatsapp:  customerFields.whatsapp_number,
        }).catch(err => console.warn('[AdminCreate] profile sync failed:', err))
      }

      setSuccess(true)

      const customerName = `${customerFields.first_name} ${customerFields.last_name}`.trim()
      const petNames     = selectedPets.map(p => p.name)

      // Admin notification (always fires)
      sendAdminNotification({
        bookingRef:          ref,
        customerFirstName:   customerFields.first_name,
        customerLastName:    customerFields.last_name,
        customerEmail:       customerFields.email,
        customerPhone:       customerFields.phone,
        customerWhatsapp:    customerFields.whatsapp_number || customerFields.phone || '',
        petNames,
        checkIn:             formatDate(checkIn),
        checkOut:            formatDate(checkOut),
        nights,
        serviceType,
        services:            lineItems.map(i => i.label).filter(Boolean),
        totalAmount:         finalTotal,
        additional_comments: additionalComments || null,
        pets_data:           petsData,
        service_details:     serviceDetails,
        admin_notes:         internalNote || null,
        has_transport:       transportType !== 'self',
        pickup_date:         pickupDate  || null,
        pickup_time:         pickupTime  || null,
        dropoff_date:        dropoffDate || null,
        dropoff_time:        dropoffTime || null,
      }).catch(err => console.warn('[AdminCreate] admin notification failed:', err))

      // Customer confirmation email (if checkbox checked)
      if (sendEmail && customerFields.email) {
        sendBookingConfirmation({
          bookingRef:    ref,
          customerName,
          customerEmail: customerFields.email,
          petNames,
          checkIn:       formatDate(checkIn),
          checkOut:      formatDate(checkOut),
          nights,
          services:      lineItems.map(i => i.label).filter(Boolean),
          totalPrice:    finalTotal,
          ...(isNewCustomer ? {
            is_new_account:      true,
            invite_link:         inviteLink || undefined,
            customer_first_name: customerFields.first_name,
          } : {}),
        }).catch(err => console.warn('[AdminCreate] customer email failed:', err))
      }

      // Brief success flash, then hand off to parent
      setTimeout(() => {
        onCreated(customerName)
      }, 900)

    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Input / select shared styles ───────────────────────────────────────────
  const inp = { width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }
  const sel = { ...inp, background: 'white', cursor: 'pointer' }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', overflowY: 'auto', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'white', borderRadius: '1rem', width: '100%', maxWidth: '680px', margin: '1rem auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* ── Header ── */}
        <div style={{ background: '#2d3a1e', borderRadius: '1rem 1rem 0 0', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '1.05rem', color: '#ffffff' }}>Create new booking</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#7aa63c' }}>Admin-initiated · staff booking</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: '6px', padding: '7px 11px', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '1.25rem 1.5rem' }}>

          {/* ══ Section 1: Customer lookup ══ */}
          <SectionBox title="1 · Customer lookup">
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <FieldWrap label="Search existing customers" required>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...inp, paddingLeft: '32px' }}
                    placeholder="Search by name, phone, email, or WhatsApp..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setIsAutofilled(false); setSelectedCustomer(null) }}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  />
                  {searching
                    ? <Loader2 size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', animation: 'spin 1s linear infinite' }} />
                    : <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.85rem' }}>🔍</span>
                  }
                </div>
              </FieldWrap>

              {/* Dropdown results */}
              {showDropdown && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'white', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: '-0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
                  {searchResults.length === 0 && !searching && (
                    <p style={{ margin: 0, padding: '10px 14px', fontSize: '0.8rem', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                      No matching customers found.
                    </p>
                  )}
                  {searchResults.map(c => (
                    <button key={c.id} onClick={() => selectCustomer(c)}
                      style={{ width: '100%', display: 'block', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f5f3'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: 'var(--text)' }}>
                        {`${c.first_name || ''} ${c.last_name || ''}`.trim() || '—'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                        {[c.email, c.phone].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                  ))}
                  {/* Divider + Create new customer */}
                  <div style={{ borderTop: searchResults.length > 0 ? '1px solid var(--border)' : 'none' }}>
                    {newCustomerPanelOpen ? (
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <p style={{ margin: 0, fontWeight: '700', fontSize: '0.875rem', color: 'var(--text)' }}>New customer</p>
                          <button onClick={() => setNewCustomerPanelOpen(false)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--muted)', padding: '2px 6px' }}>
                            ← Back
                          </button>
                        </div>
                        {createCustomerError && (
                          <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#dc2626', padding: '6px 8px', background: '#fee2e2', borderRadius: '4px' }}>
                            {createCustomerError}
                          </p>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '2px' }}>First name <span style={{ color: '#ef4444' }}>*</span></label>
                            <input style={inp} value={newCustomerForm.first_name}
                              onChange={e => setNewCustomerForm(f => ({ ...f, first_name: e.target.value }))} />
                            {newCustomerErrors.first_name && <p style={{ fontSize: '0.65rem', color: '#dc2626', margin: '2px 0 0' }}>{newCustomerErrors.first_name}</p>}
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '2px' }}>Last name <span style={{ color: '#ef4444' }}>*</span></label>
                            <input style={inp} value={newCustomerForm.last_name}
                              onChange={e => setNewCustomerForm(f => ({ ...f, last_name: e.target.value }))} />
                            {newCustomerErrors.last_name && <p style={{ fontSize: '0.65rem', color: '#dc2626', margin: '2px 0 0' }}>{newCustomerErrors.last_name}</p>}
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '2px' }}>Email <span style={{ color: '#ef4444' }}>*</span></label>
                            <input style={inp} type="email" value={newCustomerForm.email}
                              onChange={e => setNewCustomerForm(f => ({ ...f, email: e.target.value }))} />
                            {newCustomerErrors.email && <p style={{ fontSize: '0.65rem', color: '#dc2626', margin: '2px 0 0' }}>{newCustomerErrors.email}</p>}
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '2px' }}>Phone <span style={{ color: '#ef4444' }}>*</span></label>
                            <input style={inp} type="tel" value={newCustomerForm.phone}
                              onChange={e => setNewCustomerForm(f => ({ ...f, phone: e.target.value }))} />
                            {newCustomerErrors.phone && <p style={{ fontSize: '0.65rem', color: '#dc2626', margin: '2px 0 0' }}>{newCustomerErrors.phone}</p>}
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '2px' }}>WhatsApp</label>
                            <input style={inp} type="tel" value={newCustomerForm.whatsapp_number}
                              onChange={e => setNewCustomerForm(f => ({ ...f, whatsapp_number: e.target.value }))} />
                          </div>
                        </div>
                        <div ref={newCustomerBtnsRef} style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button onClick={() => setNewCustomerPanelOpen(false)}
                            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text)' }}>
                            Cancel
                          </button>
                          <button onClick={handleCreateCustomer} disabled={creatingCustomer}
                            style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: creatingCustomer ? '#9db899' : '#5a7a2e', color: 'white', fontSize: '0.8rem', cursor: creatingCustomer ? 'default' : 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {creatingCustomer && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                            Create customer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const q = searchQuery.trim()
                          setNewCustomerForm({ first_name: q.includes('@') ? '' : q, last_name: '', email: q.includes('@') ? q : '', phone: '', whatsapp_number: '' })
                          setCreateCustomerError('')
                          setNewCustomerErrors({})
                          setNewCustomerPanelOpen(true)
                        }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#5a7a2e', fontWeight: '600' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f7e6'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        + Create new customer
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Amber possible-match warning already handled by dropdown; show autofill tint note */}
            {isAutofilled && (
              <p style={{ fontSize: '0.72rem', color: '#5a7a2e', marginBottom: '0.75rem', marginTop: '-0.25rem' }}>
                ✓ Fields autofilled from customer profile — you may edit below
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
              <FieldWrap label="First name" required error={errors.first_name}>
                <div data-field-error={errors.first_name ? 'true' : undefined}>
                  <input style={{ ...inp, ...autofillStyle(isAutofilled) }} value={customerFields.first_name}
                    onChange={e => setField('first_name', e.target.value)} />
                </div>
              </FieldWrap>
              <FieldWrap label="Last name" required error={errors.last_name}>
                <input style={{ ...inp, ...autofillStyle(isAutofilled) }} value={customerFields.last_name}
                  onChange={e => setField('last_name', e.target.value)} />
              </FieldWrap>
              <FieldWrap label="Email" required error={errors.email}>
                <input style={{ ...inp, ...autofillStyle(isAutofilled) }} type="email" value={customerFields.email}
                  onChange={e => setField('email', e.target.value)} />
              </FieldWrap>
              <FieldWrap label="Phone" required error={errors.phone}>
                <input style={{ ...inp, ...autofillStyle(isAutofilled) }} type="tel" value={customerFields.phone}
                  onChange={e => setField('phone', e.target.value)} />
              </FieldWrap>
              <FieldWrap label="WhatsApp">
                <input style={{ ...inp, ...autofillStyle(isAutofilled) }} type="tel" value={customerFields.whatsapp_number}
                  onChange={e => setField('whatsapp_number', e.target.value)} />
              </FieldWrap>
            </div>
          </SectionBox>

          {/* ══ Section 2: Pet selector ══ */}
          <SectionBox title="2 · Pet selector">
            {!selectedCustomer ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>Select a customer above to load their pets.</p>
            ) : petsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
              </div>
            ) : (
              <>
                {errors.pets && <p style={{ fontSize: '0.7rem', color: '#dc2626', marginBottom: '0.5rem' }} data-field-error>{errors.pets}</p>}
                {customerPets.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>No pets on file for this customer.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {customerPets.map(pet => {
                      const sel = selectedPetIds.includes(pet.id)
                      return (
                        <button key={pet.id} onClick={() => togglePet(pet.id)}
                          style={{
                            textAlign: 'left', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                            border: `2px solid ${sel ? '#7aa63c' : 'var(--border)'}`,
                            background: sel ? '#f0f7e6' : 'white',
                            transition: 'all 0.12s',
                          }}>
                          <p style={{ margin: '0 0 2px', fontWeight: '700', fontSize: '0.875rem', color: 'var(--text)' }}>
                            {sel && <Check size={13} style={{ color: '#5a7a2e', marginRight: '4px', verticalAlign: 'middle' }} />}
                            {pet.name}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--muted)' }}>
                            {[pet.type, pet.breed].filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' · ')}
                          </p>
                          {(pet.age || pet.gender) && (
                            <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: 'var(--muted)' }}>
                              {[pet.age ? `${pet.age}y` : null, pet.gender].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
                {/* Add new pet — inline form or button */}
                {newPetPanelOpen ? (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', marginTop: '0.5rem', background: '#fafaf8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '0.875rem', color: 'var(--text)' }}>Add new pet</p>
                      <button onClick={() => { setNewPetPanelOpen(false); setNewPetErrors({}) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', lineHeight: 1 }}>✕</button>
                    </div>
                    {newPetErrors._submit && (
                      <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#dc2626', padding: '6px 8px', background: '#fee2e2', borderRadius: '4px' }}>
                        {newPetErrors._submit}
                      </p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
                      <div style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.25rem' }}>Pet name <span style={{ color: '#ef4444' }}>*</span></label>
                        <input style={inp} value={newPetForm.name} onChange={e => setNewPetForm(f => ({ ...f, name: e.target.value }))} />
                        {newPetErrors.name && <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '3px' }}>{newPetErrors.name}</p>}
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.25rem' }}>Type <span style={{ color: '#ef4444' }}>*</span></label>
                        <select style={sel} value={newPetForm.type} onChange={e => setNewPetForm(f => ({ ...f, type: e.target.value }))}>
                          <option value="dog">Dog</option>
                          <option value="cat">Cat</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.25rem' }}>Gender <span style={{ color: '#ef4444' }}>*</span></label>
                        <select style={sel} value={newPetForm.gender} onChange={e => setNewPetForm(f => ({ ...f, gender: e.target.value }))}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.25rem' }}>Breed <span style={{ color: '#ef4444' }}>*</span></label>
                        <input style={inp} value={newPetForm.breed} onChange={e => setNewPetForm(f => ({ ...f, breed: e.target.value }))} />
                        {newPetErrors.breed && <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '3px' }}>{newPetErrors.breed}</p>}
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.25rem' }}>Age (years) <span style={{ color: '#ef4444' }}>*</span></label>
                        <input style={inp} type="number" min="0" step="0.5" value={newPetForm.age} onChange={e => setNewPetForm(f => ({ ...f, age: e.target.value }))} />
                        {newPetErrors.age && <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '3px' }}>{newPetErrors.age}</p>}
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.25rem' }}>Colour <span style={{ color: '#ef4444' }}>*</span></label>
                        <input style={inp} value={newPetForm.colour} onChange={e => setNewPetForm(f => ({ ...f, colour: e.target.value }))} placeholder="e.g. Black and white" />
                        {newPetErrors.colour && <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '3px' }}>{newPetErrors.colour}</p>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', paddingTop: '0.35rem' }}>
                        <input type="checkbox" id="npf-desexed" checked={newPetForm.desexed} onChange={e => setNewPetForm(f => ({ ...f, desexed: e.target.checked }))}
                          style={{ width: '14px', height: '14px', accentColor: '#7aa63c', flexShrink: 0 }} />
                        <label htmlFor="npf-desexed" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', cursor: 'pointer' }}>Desexed</label>
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.25rem' }}>Vet name <span style={{ color: '#ef4444' }}>*</span></label>
                        <input style={inp} value={newPetForm.vet_name} onChange={e => setNewPetForm(f => ({ ...f, vet_name: e.target.value }))} />
                        {newPetErrors.vet_name && <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '3px' }}>{newPetErrors.vet_name}</p>}
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.25rem' }}>Vet phone <span style={{ color: '#ef4444' }}>*</span></label>
                        <input style={inp} type="tel" value={newPetForm.vet_phone} onChange={e => setNewPetForm(f => ({ ...f, vet_phone: e.target.value }))} />
                        {newPetErrors.vet_phone && <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '3px' }}>{newPetErrors.vet_phone}</p>}
                      </div>
                      <div style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.25rem' }}>Medication notes</label>
                        <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={newPetForm.medication_notes}
                          onChange={e => setNewPetForm(f => ({ ...f, medication_notes: e.target.value }))} placeholder="Any medication or health notes..." />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button onClick={() => { setNewPetPanelOpen(false); setNewPetErrors({}) }}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text)' }}>
                        Cancel
                      </button>
                      <button onClick={handleCreatePet} disabled={creatingPet}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: creatingPet ? '#9db899' : '#5a7a2e', color: 'white', fontSize: '0.8rem', cursor: creatingPet ? 'default' : 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {creatingPet && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                        Add pet
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setNewPetForm({ name: '', type: 'dog', breed: '', age: '', colour: '', gender: 'male', desexed: false, vet_name: '', vet_phone: '', medication_notes: '' }); setNewPetErrors({}); setNewPetPanelOpen(true) }}
                    style={{ fontSize: '0.8rem', color: '#5a7a2e', background: 'none', border: '1px dashed #7aa63c', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontWeight: '600' }}>
                    + Add new pet
                  </button>
                )}
              </>
            )}
          </SectionBox>

          {/* ══ Section 3: Booking details ══ */}
          <SectionBox title="3 · Booking details">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
              <FieldWrap label="Service" required error={errors.serviceType} style={{ gridColumn: '1 / -1' }}>
                <select style={sel} value={serviceType} onChange={e => { setServiceType(e.target.value); setServicePackageId('') }}>
                  <option value="">Select service type...</option>
                  {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FieldWrap>

              {serviceType && (
                <div style={{ gridColumn: '1 / -1', marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                    Package <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>
                  </label>
                  <select style={sel} value={servicePackageId} onChange={e => setServicePackageId(e.target.value)}>
                    <option value="">Select package...</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.price ? ` — JD ${parseFloat(p.price).toFixed(2)}` : ''}</option>
                    ))}
                  </select>
                  {errors.servicePackageId && <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '3px' }}>{errors.servicePackageId}</p>}
                </div>
              )}

              <FieldWrap label="Check-in date" required error={errors.checkIn}>
                <input style={inp} type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              </FieldWrap>
              <FieldWrap label="Check-out date" required error={errors.checkOut}>
                <input style={inp} type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn} />
              </FieldWrap>
            </div>

            {/* Nights indicator */}
            {checkIn && checkOut && nights >= 0 && (
              <p style={{ fontSize: '0.8rem', color: '#5a7a2e', fontWeight: '600', marginTop: '-0.25rem', marginBottom: '0.5rem' }}>
                {nights} night{nights !== 1 ? 's' : ''}
              </p>
            )}

            {/* Extra service pills — boarding / day_camp only */}
            {['boarding', 'day_camp'].includes(serviceType) && selectedPetIds.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Extras per pet</p>
                {selectedPets.map(pet => (
                  <div key={pet.id} style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text)', marginBottom: '0.35rem' }}>{pet.name}</p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {/* Food pills */}
                      {(['none','small','large']).map(f => {
                        const active = (perPetExtras[pet.id]?.food || 'none') === f
                        const labels = { none: 'Own food', small: 'Food · Small/Cat', large: 'Food · Medium/Large' }
                        return (
                          <button key={f} onClick={() => setExtra(pet.id, 'food', f)}
                            style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px', border: `1px solid ${active ? '#7aa63c' : 'var(--border)'}`, background: active ? '#eef4e2' : 'white', color: active ? '#2d3a1e' : 'var(--muted)', cursor: 'pointer', fontWeight: active ? '600' : '400' }}>
                            {labels[f]}
                          </button>
                        )
                      })}
                      {/* Flea & tick toggle */}
                      {(() => {
                        const active = !!perPetExtras[pet.id]?.fleaTick
                        return (
                          <button onClick={() => setExtra(pet.id, 'fleaTick', !active)}
                            style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px', border: `1px solid ${active ? '#7aa63c' : 'var(--border)'}`, background: active ? '#eef4e2' : 'white', color: active ? '#2d3a1e' : 'var(--muted)', cursor: 'pointer', fontWeight: active ? '600' : '400' }}>
                            🐛 Flea &amp; tick
                          </button>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionBox>

          {/* ══ Section 4: Transport (collapsible) ══ */}
          <div style={{ marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <button onClick={() => setTransportOpen(v => !v)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 1rem', background: 'var(--light)', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.72rem', color: 'var(--primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <span>4 · Transport &nbsp;
                <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: 'var(--muted)' }}>
                  {transportType === 'self' ? '· No transport selected' : `· ${TRANSPORT_OPTIONS.find(o => o.value === transportType)?.label}`}
                </span>
              </span>
              {transportOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {transportOpen && (
              <div style={{ padding: '0.875rem 1rem' }}>
                <FieldWrap label="Transport type">
                  <select style={sel} value={transportType} onChange={e => setTransportType(e.target.value)}>
                    {TRANSPORT_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}{o.price > 0 ? ` — JD ${o.price}` : ''}</option>
                    ))}
                  </select>
                </FieldWrap>
                {transportType !== 'self' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
                    {(transportType === 'round_trip' || transportType === 'pickup_only') && <>
                      <FieldWrap label="Pick-up date">
                        <input style={inp} type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} />
                      </FieldWrap>
                      <FieldWrap label="Pick-up time">
                        <input style={inp} type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
                      </FieldWrap>
                    </>}
                    {(transportType === 'round_trip' || transportType === 'dropoff_only') && <>
                      <FieldWrap label="Drop-off date">
                        <input style={inp} type="date" value={dropoffDate} onChange={e => setDropoffDate(e.target.value)} />
                      </FieldWrap>
                      <FieldWrap label="Drop-off time">
                        <input style={inp} type="time" value={dropoffTime} onChange={e => setDropoffTime(e.target.value)} />
                      </FieldWrap>
                    </>}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <FieldWrap label="Driver / address comments">
                        <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={driverComments}
                          onChange={e => setDriverComments(e.target.value)} placeholder="Pickup address, gate code, etc." />
                      </FieldWrap>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ══ Section 5: Notes ══ */}
          <SectionBox title="5 · Notes">
            {selectedPets.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                {selectedPets.map(pet => (
                  <div key={pet.id} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text)', marginBottom: '0.4rem' }}>{pet.name}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
                      <FieldWrap label="Medication notes">
                        <textarea style={{ ...inp, resize: 'vertical' }} rows={2}
                          value={perPetNotes[pet.id]?.medication || ''}
                          onChange={e => setPetNote(pet.id, 'medication', e.target.value)}
                          placeholder={`Medication for ${pet.name}...`} />
                      </FieldWrap>
                      <FieldWrap label="Food notes">
                        <textarea style={{ ...inp, resize: 'vertical' }} rows={2}
                          value={perPetNotes[pet.id]?.food || ''}
                          onChange={e => setPetNote(pet.id, 'food', e.target.value)}
                          placeholder={`Food requirements for ${pet.name}...`} />
                      </FieldWrap>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <FieldWrap label="Additional comments">
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={additionalComments}
                onChange={e => setAdditionalComments(e.target.value)}
                placeholder="Any other information for the team..." />
            </FieldWrap>
          </SectionBox>

          {/* ══ Section 6: Admin section ══ */}
          <SectionBox title="👤 Admin section" yellow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
              <FieldWrap label="Booking source" required error={errors.source}>
                <select style={sel} value={source} onChange={e => setSource(e.target.value)}>
                  {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </FieldWrap>
              <FieldWrap label="Created by">
                <input style={{ ...inp, background: '#f5f5f3', color: 'var(--muted)', cursor: 'default' }}
                  value={profile?.full_name || profile?.email || '—'} readOnly />
              </FieldWrap>
            </div>
            <FieldWrap label="Internal note (staff only — not shown to customer)">
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={internalNote}
                onChange={e => setInternalNote(e.target.value)}
                placeholder="Notes for admin team only..." />
            </FieldWrap>
          </SectionBox>

          {/* ══ Section 7: Pricing ══ */}
          <SectionBox title="7 · Pricing">
            {lineItems.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>Select a service and package to see pricing.</p>
            ) : (
              <>
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', marginBottom: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Description', 'Qty', 'Unit price', 'Amount'].map(h => (
                        <th key={h} style={{ padding: '4px 6px', textAlign: h === 'Description' ? 'left' : 'right', color: 'var(--muted)', fontWeight: '600', fontSize: '0.72rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '5px 6px', color: 'var(--text)' }}>{item.label}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: 'var(--muted)' }}>{item.quantity}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: 'var(--muted)' }}>JD {(item.unit_price || 0).toFixed(2)}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: '600', color: 'var(--text)' }}>JD {(item.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: '260px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--muted)' }}>Subtotal</span>
                      <span style={{ fontWeight: '600' }}>JD {subtotal.toFixed(2)}</span>
                    </div>
                    {/* Discount row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--muted)', flexShrink: 0 }}>Discount</span>
                      <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                        <button onClick={() => setDiscountType('jd')}
                          style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: discountType === 'jd' ? '#2d3a1e' : 'white', color: discountType === 'jd' ? 'white' : 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer' }}>JD</button>
                        <button onClick={() => setDiscountType('pct')}
                          style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: discountType === 'pct' ? '#2d3a1e' : 'white', color: discountType === 'pct' ? 'white' : 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer' }}>%</button>
                        <input type="number" min="0" step="0.5"
                          style={{ width: '72px', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'right' }}
                          value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="0" />
                      </div>
                    </div>
                    {discountAmt > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem', color: '#16a34a' }}>
                        <span>Discount applied</span>
                        <span>− JD {discountAmt.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '2px solid var(--border)', marginTop: '4px', fontSize: '0.95rem' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text)' }}>Total</span>
                      <span style={{ fontWeight: '700', color: 'var(--accent)', fontSize: '1.1rem' }}>JD {finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </SectionBox>

          {/* ══ Section 8: Email behaviour ══ */}
          <div style={{ background: '#f0f7e6', border: '1px solid #a3d977', borderRadius: '0.75rem', padding: '0.875rem 1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#7aa63c', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.875rem', color: '#2d3a1e' }}>Send booking confirmation email to customer</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#5a7a2e' }}>Admin notification will fire to pet.lodge.jo@gmail.com regardless</p>
              </div>
            </label>
          </div>

          {/* Submit error */}
          {submitError && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              {submitError}
            </div>
          )}

          {/* Success flash */}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={16} /> Booking created successfully!
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: '#fafaf8', borderRadius: '0 0 1rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--muted)' }}>
            Admin notification → pet.lodge.jo@gmail.com
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text)' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting || success}
              style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: submitting || success ? '#9db899' : '#5a7a2e', color: 'white', cursor: submitting || success ? 'default' : 'pointer', fontSize: '0.875rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {submitting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {success ? 'Created ✓' : 'Create booking'}
            </button>
          </div>
        </div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
