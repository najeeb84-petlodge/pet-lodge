import { useEffect, useState } from 'react'
import { Check, Loader2, Home, Sun, Footprints, Scissors, Stethoscope, GraduationCap, Plane } from 'lucide-react'
import { useWizard } from '../../contexts/WizardContext'
import { SUPABASE_URL, SUPABASE_KEY } from '../../lib/supabase'

// ── Service definitions ──────────────────────────────────────────────────────
const SERVICES = [
  {
    id:       'boarding',
    label:    'Boarding',
    desc:     'Overnight stays with optional grooming & transport',
    Icon:     Home,
    category: 'boarding',
    multiSelect: false,
    dateType: 'range',
    dateLabel: 'Service Dates',
  },
  {
    id:       'day_camp',
    label:    'Doggy Day Camp',
    desc:     'Day care with exercise & socialization',
    Icon:     Sun,
    category: 'day_camp',
    multiSelect: false,
    dateType: 'range',
    dateLabel: 'Service Dates',
  },
  {
    id:       'dog_walking',
    label:    'Dog Walking',
    desc:     'Professional dog walking services',
    Icon:     Footprints,
    category: 'dog_walking',
    multiSelect: false,
    dateType: 'range',
    dateLabel: 'Service Dates',
  },
  {
    id:       'grooming',
    label:    'Grooming Only',
    desc:     'Bath, trim, nail clipping & more',
    Icon:     Scissors,
    category: 'grooming',
    multiSelect: true,
    dateType: 'single',
    dateLabel: 'Grooming Date',
  },
  {
    id:       'transport',
    label:    'Vet Visits & Transport',
    desc:     'We handle vet trips & pet transportation',
    Icon:     Stethoscope,
    category: 'transport',
    multiSelect: false,
    dateType: 'range',
    dateLabel: 'Service Dates',
  },
  {
    id:       'training',
    label:    'Training',
    desc:     'Professional dog training programs',
    Icon:     GraduationCap,
    category: 'training',
    multiSelect: false,
    dateType: 'single',
    dateLabel: 'Preferred Start Date',
    infoOnly: true,
  },
  {
    id:       'international',
    label:    'International Travel',
    desc:     'Pet relocation & travel assistance',
    Icon:     Plane,
    category: null,
    multiSelect: false,
    dateType: 'international',
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function autoSelectBoarding(prices, petCount) {
  if (!prices.length) return null
  // Try to find one matching pet count e.g. "(2 dogs)" or "(2 cats)"
  const match = prices.find(p => p.name.includes(`(${petCount}`))
  return match?.id ?? prices[0]?.id ?? null
}

// ── Sub-panels ───────────────────────────────────────────────────────────────
function PriceRadioList({ prices, selected, onChange, multiSelect }) {
  if (!prices.length) {
    return <p className="text-sm" style={{ color: 'var(--muted)' }}>No options available.</p>
  }
  return (
    <div className="space-y-2">
      {prices.map(p => {
        const checked = multiSelect ? (selected || []).includes(p.id) : selected === p.id
        return (
          <label key={p.id} className="flex items-start gap-3 cursor-pointer p-2.5 rounded-lg transition-colors"
            style={{ border: `1px solid ${checked ? '#7aa63c' : 'var(--border)'}`, background: checked ? '#eef4e2' : 'white' }}>
            <input
              type={multiSelect ? 'checkbox' : 'radio'}
              className="mt-0.5 w-4 h-4 accent-[#7aa63c] flex-shrink-0"
              checked={checked}
              onChange={() => {
                if (multiSelect) {
                  const cur = selected || []
                  onChange(cur.includes(p.id) ? cur.filter(x => x !== p.id) : [...cur, p.id])
                } else {
                  onChange(p.id)
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{p.name}</span>
              {p.description && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{p.description}</p>}
            </div>
            <span className="text-sm font-bold flex-shrink-0" style={{ color: '#5a7a2e' }}>
              JD {parseFloat(p.price || 0).toFixed(2)}{p.unit === 'day' ? '/day' : ''}
            </span>
          </label>
        )
      })}
    </div>
  )
}

function DateRange({ startVal, endVal, onStart, onEnd, error }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
          Start Date <span className="text-red-500">*</span>
        </label>
        <input type="date" value={startVal} onChange={e => onStart(e.target.value)}
          className={`input${error?.start ? ' !border-red-400' : ''}`} />
        {error?.start && <p className="text-xs text-red-500 mt-1">Required</p>}
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
          End Date <span className="text-red-500">*</span>
        </label>
        <input type="date" value={endVal} onChange={e => onEnd(e.target.value)}
          className={`input${error?.end ? ' !border-red-400' : ''}`} />
        {error?.end && <p className="text-xs text-red-500 mt-1">Required</p>}
      </div>
    </div>
  )
}

function SingleDate({ val, onChange, label = 'Date', error }) {
  return (
    <div className="max-w-xs">
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
        {label} <span className="text-red-500">*</span>
      </label>
      <input type="date" value={val} onChange={e => onChange(e.target.value)}
        className={`input${error ? ' !border-red-400' : ''}`} />
      {error && <p className="text-xs text-red-500 mt-1">Required</p>}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Step3Services() {
  const {
    petsData,
    serviceType,    setServiceType,
    serviceOptions, setServiceOptions,
    serviceOptionDetails, setServiceOptionDetails,
    nextStep, prevStep,
  } = useWizard()

  const petCount = petsData.length || 1

  // Determine pet type mix for boarding filter
  const petTypes = petsData.map(p => (p.type || '').toLowerCase())
  const hasDog   = petTypes.some(t => t === 'dog')
  const hasCat   = petTypes.some(t => t === 'cat')
  const isMixed  = hasDog && hasCat
  // 'dog' | 'cat' | 'mixed' | 'other'
  const boardingPetType = isMixed ? 'mixed' : hasDog ? 'dog' : hasCat ? 'cat' : 'other'

  // prices keyed by category string
  const [prices,  setPrices]  = useState({})
  const [loading, setLoading] = useState(true)

  // per-service selection state
  const [selected,   setSelected]   = useState(serviceType || null)      // service id
  const [option,     setOption]     = useState(serviceOptions?.option ?? null)   // price id or array
  const [startDate,  setStartDate]  = useState(serviceOptions?.startDate  ?? '')
  const [endDate,    setEndDate]    = useState(serviceOptions?.endDate    ?? '')
  const [tripType,   setTripType]   = useState(serviceOptions?.tripType   ?? 'one_way')
  const [errors,     setErrors]     = useState({})

  // Fetch all active services grouped by category
  useEffect(() => {
    fetch(
      `${SUPABASE_URL}/rest/v1/services?active=eq.true&select=id,name,price,description,category,unit,pet_type,sort_order&order=sort_order,name`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const grouped = {}
        data.forEach(row => {
          const cat = row.category || 'other'
          if (!grouped[cat]) grouped[cat] = []
          grouped[cat].push(row)
        })
        setPrices(grouped)

        // Auto-select boarding option based on pet count (filtered list computed after state sets)
        // We'll do this after prices state is available via the effect below
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Boarding options filtered by pet type — exclude food/flea rows
  const EXCLUDE_KEYWORDS = ['food', 'flea', 'tick']
  const allBoarding = prices.boarding || []
  const boardingOptions = allBoarding.filter(p => {
    const nameLower = (p.name || '').toLowerCase()
    // Exclude food and flea & tick items
    if (EXCLUDE_KEYWORDS.some(kw => nameLower.includes(kw))) return false
    // Filter by pet_type column: show rows matching the mix, or rows with pet_type='all'/'mixed'/null
    const pt = (p.pet_type || '').toLowerCase()
    if (!pt || pt === 'all') return true
    if (boardingPetType === 'mixed') return pt === 'mixed' || pt === 'all'
    return pt === boardingPetType
  })

  // Auto-select boarding once prices load (first visit only)
  useEffect(() => {
    if (serviceOptions?.option) return   // already restored from context
    if (!boardingOptions.length) return
    if (selected === 'boarding' && !option) {
      setOption(autoSelectBoarding(boardingOptions, petCount))
    }
  }, [boardingOptions.length])

  // When service changes reset option/dates (but preserve if re-selecting same)
  function selectService(svcId) {
    if (svcId === selected) { setSelected(null); return }
    setSelected(svcId)
    setOption(null)
    setStartDate('')
    setEndDate('')
    setErrors({})

    // Auto-select boarding from filtered list
    if (svcId === 'boarding' && boardingOptions.length) {
      setOption(autoSelectBoarding(boardingOptions, petCount))
    }
  }

  function validate() {
    const svc = SERVICES.find(s => s.id === selected)
    if (!svc) { setErrors({ service: true }); return false }
    const e = {}

    if (svc.id !== 'training' && svc.id !== 'international') {
      const opts = prices[svc.category] || []
      if (opts.length) {
        const hasOption = svc.multiSelect ? (Array.isArray(option) && option.length > 0) : !!option
        if (!hasOption) e.option = true
      }
    }

    if (svc.dateType === 'range') {
      if (!startDate) e.start = true
      if (!endDate)   e.end   = true
    } else if (svc.dateType === 'single') {
      if (!startDate) e.start = true
    } else if (svc.dateType === 'international') {
      if (!startDate) e.start = true
      if (tripType === 'return' && !endDate) e.end = true
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (!validate()) return
    setServiceType(selected)
    setServiceOptions({ option, startDate, endDate, tripType })
    nextStep()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  const svcDef = SERVICES.find(s => s.id === selected)

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Choose Your Service</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Select the service you'd like for your pet{petCount > 1 ? 's' : ''}.
      </p>

      {/* Service card grid */}
      {errors.service && <p className="text-xs text-red-500 mb-3">Please select a service</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {SERVICES.map(svc => {
          const isSelected = selected === svc.id
          return (
            <button
              key={svc.id}
              type="button"
              onClick={() => selectService(svc.id)}
              className="relative text-left p-4 rounded-xl transition-all"
              style={{
                border:     `2px solid ${isSelected ? '#7aa63c' : 'var(--border)'}`,
                background: isSelected ? '#eef4e2' : 'white',
              }}
            >
              {/* Checkmark badge */}
              {isSelected && (
                <span className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full"
                  style={{ background: '#7aa63c' }}>
                  <Check size={11} color="white" strokeWidth={3} />
                </span>
              )}
              {/* Icon circle */}
              <span className="flex items-center justify-center w-10 h-10 rounded-full mb-3"
                style={{ background: isSelected ? '#2d3a1e' : '#f3f4f6' }}>
                <svc.Icon size={22} color={isSelected ? 'white' : '#5a7a2e'} strokeWidth={1.75} />
              </span>
              <p className="font-semibold text-sm" style={{ color: isSelected ? '#2d3a1e' : 'var(--text)' }}>
                {svc.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{svc.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Sub-panel */}
      {svcDef && (
        <div className="rounded-xl p-5 mb-4" style={{ border: '1px solid var(--border)', background: '#fafaf9' }}>

          {/* ── Boarding ── */}
          {svcDef.id === 'boarding' && (
            <>
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>Boarding Options</p>
              <PriceRadioList
                prices={boardingOptions}
                selected={option}
                onChange={setOption}
                multiSelect={false}
              />
              {errors.option && <p className="text-xs text-red-500 mt-2">Please select an option</p>}
              <div className="mt-4">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Service Dates</p>
                <DateRange startVal={startDate} endVal={endDate}
                  onStart={setStartDate} onEnd={setEndDate}
                  error={{ start: errors.start, end: errors.end }} />
              </div>
            </>
          )}

          {/* ── Day Camp ── */}
          {svcDef.id === 'day_camp' && (
            <>
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>Day Camp Packages</p>
              <PriceRadioList
                prices={prices.day_camp || []}
                selected={option}
                onChange={setOption}
                multiSelect={false}
              />
              {errors.option && <p className="text-xs text-red-500 mt-2">Please select an option</p>}
              <div className="mt-4">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Service Dates</p>
                <DateRange startVal={startDate} endVal={endDate}
                  onStart={setStartDate} onEnd={setEndDate}
                  error={{ start: errors.start, end: errors.end }} />
              </div>
            </>
          )}

          {/* ── Dog Walking ── */}
          {svcDef.id === 'dog_walking' && (
            <>
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>Dog Walking Options</p>
              <PriceRadioList
                prices={prices.dog_walking || []}
                selected={option}
                onChange={setOption}
                multiSelect={false}
              />
              {errors.option && <p className="text-xs text-red-500 mt-2">Please select an option</p>}
              <div className="mt-4">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Service Dates</p>
                <DateRange startVal={startDate} endVal={endDate}
                  onStart={setStartDate} onEnd={setEndDate}
                  error={{ start: errors.start, end: errors.end }} />
              </div>
            </>
          )}

          {/* ── Grooming ── */}
          {svcDef.id === 'grooming' && (
            <>
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>Grooming Services</p>
              <PriceRadioList
                prices={prices.grooming || []}
                selected={option}
                onChange={setOption}
                multiSelect={true}
              />
              {errors.option && <p className="text-xs text-red-500 mt-2">Please select at least one service</p>}
              <div className="mt-4">
                <SingleDate val={startDate} onChange={setStartDate} label="Grooming Date" error={errors.start} />
              </div>
            </>
          )}

          {/* ── Transport ── */}
          {svcDef.id === 'transport' && (
            <>
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>Transportation & Vet Visit Services</p>
              <PriceRadioList
                prices={prices.transport || []}
                selected={option}
                onChange={setOption}
                multiSelect={false}
              />
              {errors.option && <p className="text-xs text-red-500 mt-2">Please select an option</p>}
              <div className="mt-4">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Service Dates</p>
                <DateRange startVal={startDate} endVal={endDate}
                  onStart={setStartDate} onEnd={setEndDate}
                  error={{ start: errors.start, end: errors.end }} />
              </div>
            </>
          )}

          {/* ── Training ── */}
          {svcDef.id === 'training' && (
            <>
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>Training Request</p>
              <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: '#eef4e2', border: '1px solid #c6dba0', color: '#2d3a1e' }}>
                We will contact you to discuss options and pricing.
              </div>
              <SingleDate val={startDate} onChange={setStartDate} label="Preferred Start Date" error={errors.start} />
            </>
          )}

          {/* ── International Travel ── */}
          {svcDef.id === 'international' && (
            <>
              <p className="text-sm font-bold mb-3" style={{ color: 'var(--primary)' }}>Trip Type</p>
              <div className="flex gap-4 mb-4">
                {[['one_way','One-Way'],['return','Return Trip']].map(([val, lbl]) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="radio" name="trip_type" value={val}
                      checked={tripType === val}
                      onChange={() => { setTripType(val); setEndDate('') }}
                      className="w-4 h-4 accent-[#7aa63c]" />
                    <span className="text-sm" style={{ color: 'var(--text)' }}>{lbl}</span>
                  </label>
                ))}
              </div>
              <div className={`grid gap-3 ${tripType === 'return' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                    Departure Date <span className="text-red-500">*</span>
                  </label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className={`input${errors.start ? ' !border-red-400' : ''}`} />
                  {errors.start && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
                {tripType === 'return' && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                      Return Date <span className="text-red-500">*</span>
                    </label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      className={`input${errors.end ? ' !border-red-400' : ''}`} />
                    {errors.end && <p className="text-xs text-red-500 mt-1">Required</p>}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button onClick={prevStep} className="btn-secondary px-6">← Previous</button>
        <button onClick={handleNext} className="btn-primary px-8">Next →</button>
      </div>
    </div>
  )
}
