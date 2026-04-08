import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Check, Loader2 } from 'lucide-react'
import { useWizard } from '../../contexts/WizardContext'
import { useAuth } from '../../contexts/AuthContext'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../lib/supabase'

function Req() {
  return <span className="text-red-500"> *</span>
}

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>
      {children}{required && <Req />}
    </label>
  )
}

const EMPTY_PET = {
  _savedId:   null,
  name:        '',
  type:        '',
  breed:       '',
  age:         '',
  colour:      '',
  gender:      '',
  desexed:     'no',
  vet_name:    '',
  vet_phone:   '',
  medication:  '',
}

const PET_EMOJI = { dog: '🐶', cat: '🐱', other: '🐾' }
function petEmoji(type) {
  return PET_EMOJI[(type || '').toLowerCase()] ?? '🐾'
}

function cap(s) {
  // Capitalise first letter — DB stores 'dog'/'cat'/'male'/'female', dropdowns expect 'Dog'/'Male'
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function savedToFormPet(sp) {
  console.log('[Step2] selected saved pet raw data:', sp)
  const rawType   = sp.type   || sp.species || ''
  const rawGender = sp.gender || ''
  return {
    _savedId:   sp.id,
    name:       sp.name        || '',
    type:       cap(rawType),
    breed:      sp.breed       || '',
    age:        sp.age != null  ? String(sp.age) : '',
    colour:     sp.colour      || sp.color || '',
    gender:     cap(rawGender),
    desexed:    sp.desexed      ? 'yes' : 'no',
    vet_name:   sp.vet_name    || '',
    vet_phone:  sp.vet_phone   || '',
    medication: sp.medication_notes || '',
  }
}

// Are all meaningful fields empty on a pet card?
function isBlankPet(p) {
  return !p._savedId && !p.name && !p.type && !p.breed && !p.age
}

export default function Step2PetDetails() {
  const { petsData, setPetsData, setHasIntactFemale, nextStep, prevStep } = useWizard()
  const { profile } = useAuth()

  const [pets,      setPets]      = useState(() => petsData.length ? petsData : [{ ...EMPTY_PET }])
  const [open,      setOpen]      = useState(() => petsData.length ? petsData.map(() => false) : [true])
  const [errors,    setErrors]    = useState([])
  const [sameVet,   setSameVet]   = useState([])
  const [savedPets, setSavedPets] = useState([])
  const [loadingDB, setLoadingDB] = useState(false)

  // ── Fetch saved pets for this user ──────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id) return
    setLoadingDB(true)
    const token = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/pets?owner_id=eq.${profile.id}&select=*&order=name`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
    )
      .then(r => r.json())
      .then(data => {
        console.log('[Step2] saved pets response:', data)
        setSavedPets(Array.isArray(data) ? data : [])
      })
      .catch(err => console.error('[Step2] pets fetch error:', err))
      .finally(() => setLoadingDB(false))
  }, [profile?.id])

  // ── Saved-pet chip selection ─────────────────────────────────────────────────
  function isSavedSelected(savedId) {
    return pets.some(p => p._savedId === savedId)
  }

  function toggleSavedPet(sp) {
    const existingIdx = pets.findIndex(p => p._savedId === sp.id)

    if (existingIdx >= 0) {
      // Deselect: remove from array; keep at least 1 blank card
      if (pets.length === 1) {
        setPets([{ ...EMPTY_PET }])
        setOpen([true])
        setSameVet([false])
        setErrors([])
      } else {
        setPets(prev    => prev.filter((_, i) => i !== existingIdx))
        setOpen(prev    => prev.filter((_, i) => i !== existingIdx))
        setSameVet(prev => prev.filter((_, i) => i !== existingIdx))
        setErrors(prev  => prev.filter((_, i) => i !== existingIdx))
      }
      return
    }

    // Select: insert after already-selected saved pets (before any blank new pets)
    const savedSlots = pets.filter(p => p._savedId !== null).length
    const newPet = savedToFormPet(sp)

    // If there is exactly 1 totally-blank card and no saved pets yet, replace it
    if (pets.length === 1 && isBlankPet(pets[0]) && savedSlots === 0) {
      setPets([newPet])
      setOpen([true])
      setSameVet([false])
      setErrors([])
      return
    }

    // Otherwise insert at the saved-slots boundary
    setPets(prev    => [...prev.slice(0, savedSlots), newPet, ...prev.slice(savedSlots)])
    setOpen(prev    => [...prev.slice(0, savedSlots), true,   ...prev.slice(savedSlots)])
    setSameVet(prev => [...prev.slice(0, savedSlots), false,  ...prev.slice(savedSlots)])
    setErrors(prev  => [...prev.slice(0, savedSlots), {},     ...prev.slice(savedSlots)])
  }

  function addNewPet() {
    setPets(prev    => [...prev, { ...EMPTY_PET }])
    setOpen(prev    => [...prev, true])
    setSameVet(prev => [...prev, false])
    setErrors(prev  => [...prev, {}])
  }

  // ── Number of Pets dropdown ──────────────────────────────────────────────────
  function handleNumPetsChange(n) {
    const savedCount = pets.filter(p => p._savedId !== null).length
    const target = Math.max(n, savedCount) // cannot drop below selected saved count
    if (target > pets.length) {
      const toAdd = target - pets.length
      setPets(prev    => [...prev, ...Array.from({ length: toAdd }, () => ({ ...EMPTY_PET }))])
      setOpen(prev    => [...prev, ...Array(toAdd).fill(false)])
      setSameVet(prev => [...prev, ...Array(toAdd).fill(false)])
      setErrors(prev  => [...prev, ...Array(toAdd).fill({})])
    } else if (target < pets.length) {
      setPets(prev    => prev.slice(0, target))
      setOpen(prev    => prev.slice(0, target))
      setSameVet(prev => prev.slice(0, target))
      setErrors(prev  => prev.slice(0, target))
    }
  }

  // ── Pet card field updates ───────────────────────────────────────────────────
  function updatePet(idx, key, val) {
    setPets(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p))
    if (errors[idx]?.[key]) {
      setErrors(prev => prev.map((e, i) => i === idx ? { ...e, [key]: false } : e))
    }
  }

  function toggleCard(idx) {
    setOpen(prev => prev.map((o, i) => i === idx ? !o : o))
  }

  function toggleSameVet(idx, checked) {
    setSameVet(prev => {
      const next = [...prev]
      next[idx] = checked
      return next
    })
    if (checked) {
      updatePet(idx, 'vet_name',  pets[0].vet_name)
      updatePet(idx, 'vet_phone', pets[0].vet_phone)
    } else {
      updatePet(idx, 'vet_name',  '')
      updatePet(idx, 'vet_phone', '')
    }
  }

  // ── Validation & submission ──────────────────────────────────────────────────
  const REQUIRED_FIELDS = ['name','type','breed','age','colour','gender','vet_name','vet_phone']

  function validate() {
    const allErrors = pets.map(p => {
      const e = {}
      REQUIRED_FIELDS.forEach(k => { if (!String(p[k]).trim()) e[k] = true })
      return e
    })
    setErrors(allErrors)
    setOpen(prev => prev.map((o, i) => Object.keys(allErrors[i] || {}).length > 0 ? true : o))
    return allErrors.every(e => Object.keys(e).length === 0)
  }

  async function handleNext() {
    if (!validate()) return
    setPetsData(pets)
    const intact = pets.some(p => p.gender === 'Female' && p.desexed === 'no')
    setHasIntactFemale(intact)

    // Save manually entered pets to the pets table, then proceed
    if (profile?.id) {
      const token = getAccessToken()
      const newPets = pets.filter(p => !p._savedId)
      if (newPets.length > 0) {
        await Promise.all(newPets.map(async p => {
          try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/pets`, {
              method: 'POST',
              headers: {
                apikey:         SUPABASE_KEY,
                Authorization:  `Bearer ${token || SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                Prefer:         'return=representation',
              },
              body: JSON.stringify({
                owner_id:         profile.id,
                name:             p.name,
                type:             p.type,
                breed:            p.breed,
                age:              parseInt(p.age) || null,
                colour:           p.colour,
                gender:           p.gender,
                desexed:          p.desexed === 'yes',
                vet_name:         p.vet_name         || null,
                vet_phone:        p.vet_phone        || null,
                medication_notes: p.medication       || '',
              }),
            })
            const body = await res.json()
            if (!res.ok) {
              console.error('[Step2] save pet failed:', res.status, body)
            } else {
              console.log('[Step2] pet saved:', body)
            }
          } catch (e) {
            console.error('[Step2] save pet error:', e)
          }
        }))
      }
    }

    nextStep()
  }

  const ic = (idx, key) => `input${errors[idx]?.[key] ? ' !border-red-400' : ''}`

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Pet Information</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Tell us about the pet(s) joining us.
      </p>

      {/* ── Your Saved Pets ────────────────────────────────────────────────── */}
      {profile?.id && (loadingDB || savedPets.length > 0) && (
        <div className="mb-6 rounded-xl p-4" style={{ background: '#eef4e2', border: '1px solid #c6dba0' }}>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>Your Saved Pets</p>
            {loadingDB && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--primary)' }} />}
          </div>

          {!loadingDB && (
            <>
              <p className="text-xs mb-3" style={{ color: '#5a7a2e' }}>
                Select your pets for this booking, or add a new one below.
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {savedPets.map(sp => {
                  const isSelected = isSavedSelected(sp.id)
                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => toggleSavedPet(sp)}
                      className="relative flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-xl text-left transition-all"
                      style={{
                        border:     `2px solid ${isSelected ? '#5a7a2e' : '#c6dba0'}`,
                        background: isSelected ? '#2d3a1e' : 'white',
                      }}
                    >
                      {/* Photo or emoji */}
                      {sp.photo_url
                        ? <img src={sp.photo_url} alt={sp.name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        : <span className="text-xl leading-none w-8 h-8 flex items-center justify-center flex-shrink-0">
                            {petEmoji(sp.type || sp.species)}
                          </span>
                      }

                      <div>
                        <p className="text-xs font-bold leading-tight"
                          style={{ color: isSelected ? 'white' : 'var(--text)' }}>
                          {sp.name}
                        </p>
                        <p className="text-xs leading-tight"
                          style={{ color: isSelected ? '#c6dba0' : 'var(--muted)' }}>
                          {[sp.type || sp.species, sp.breed].filter(Boolean).join(' · ')}
                        </p>
                      </div>

                      {/* Selected checkmark */}
                      {isSelected && (
                        <span className="flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0 ml-1"
                          style={{ background: '#7aa63c' }}>
                          <Check size={9} color="white" strokeWidth={3.5} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={addNewPet}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ border: '1.5px dashed #7aa63c', color: '#5a7a2e', background: 'white' }}
              >
                + Add a new pet
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Number of Pets ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Label required>Number of Pets</Label>
        <select
          className="input w-40"
          value={pets.length}
          onChange={e => handleNumPetsChange(Number(e.target.value))}
        >
          {[1,2,3,4,5,6].map(n => (
            <option key={n} value={n}>{n} {n === 1 ? 'pet' : 'pets'}</option>
          ))}
        </select>
      </div>

      {/* ── Pet cards ─────────────────────────────────────────────────────── */}
      {pets.map((pet, idx) => {
        const hasErr = Object.keys(errors[idx] || {}).length > 0
        return (
          <div key={idx} className="mb-4 rounded-xl overflow-hidden"
            style={{ border: `1px solid ${hasErr ? '#f87171' : 'var(--border)'}` }}>

            {/* Card header */}
            <button
              type="button"
              onClick={() => toggleCard(idx)}
              className="w-full flex items-center justify-between px-4 py-3"
              style={{
                background:   hasErr ? '#fef2f2' : 'var(--light)',
                borderBottom: open[idx] ? '1px solid var(--border)' : 'none',
              }}
            >
              <span className="font-semibold text-sm" style={{ color: hasErr ? '#dc2626' : 'var(--primary)' }}>
                Pet {idx + 1}{pet.name ? ` — ${pet.name}` : ''}
                {pet._savedId && (
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted)' }}>
                    (saved profile)
                  </span>
                )}
                {hasErr && <span className="ml-2 text-xs font-normal text-red-500">Fill in required fields</span>}
              </span>
              {open[idx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {open[idx] && (
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Pet Name */}
                  <div>
                    <Label required>Pet Name</Label>
                    <input className={ic(idx,'name')} value={pet.name}
                      onChange={e => updatePet(idx,'name',e.target.value)} placeholder="e.g. Max" />
                    {errors[idx]?.name && <p className="text-xs text-red-500 mt-1">Required</p>}
                  </div>

                  {/* Pet Type */}
                  <div>
                    <Label required>Pet Type</Label>
                    <select className={ic(idx,'type')} value={pet.type}
                      onChange={e => updatePet(idx,'type',e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors[idx]?.type && <p className="text-xs text-red-500 mt-1">Required</p>}
                  </div>

                  {/* Breed */}
                  <div>
                    <Label required>Breed</Label>
                    <input className={ic(idx,'breed')} value={pet.breed}
                      onChange={e => updatePet(idx,'breed',e.target.value)} placeholder="e.g. Golden Retriever" />
                    {errors[idx]?.breed && <p className="text-xs text-red-500 mt-1">Required</p>}
                  </div>

                  {/* Age */}
                  <div>
                    <Label required>Age (years)</Label>
                    <input className={ic(idx,'age')} type="number" min="0" step="0.5" value={pet.age}
                      onChange={e => updatePet(idx,'age',e.target.value)} placeholder="e.g. 3" />
                    {errors[idx]?.age && <p className="text-xs text-red-500 mt-1">Required</p>}
                  </div>

                  {/* Colour */}
                  <div>
                    <Label required>Colour</Label>
                    <input className={ic(idx,'colour')} value={pet.colour}
                      onChange={e => updatePet(idx,'colour',e.target.value)} placeholder="e.g. Golden" />
                    {errors[idx]?.colour && <p className="text-xs text-red-500 mt-1">Required</p>}
                  </div>

                  {/* Gender */}
                  <div>
                    <Label required>Gender</Label>
                    <select className={ic(idx,'gender')} value={pet.gender}
                      onChange={e => updatePet(idx,'gender',e.target.value)}>
                      <option value="">— Select —</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                    {errors[idx]?.gender && <p className="text-xs text-red-500 mt-1">Required</p>}
                  </div>

                  {/* Desexed */}
                  <div className="sm:col-span-2">
                    <Label>Desexed?</Label>
                    <div className="flex gap-6 mt-1">
                      {['yes','no'].map(val => (
                        <label key={val} className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="radio" name={`desexed-${idx}`} value={val}
                            checked={pet.desexed === val}
                            onChange={() => updatePet(idx,'desexed',val)}
                            className="w-4 h-4 accent-[#7aa63c]" />
                          <span className="text-sm capitalize" style={{ color: 'var(--text)' }}>
                            {val === 'yes' ? 'Yes' : 'No'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Vet Information */}
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--primary)' }}>
                    Vet Information{pet.name ? ` for ${pet.name}` : ''}
                  </p>

                  {/* Same vet as Pet 1 — only for idx > 0 when Pet 1 has vet info */}
                  {idx > 0 && (pets[0].vet_name || pets[0].vet_phone) && (
                    <label className="inline-flex items-center gap-2 mb-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#7aa63c]"
                        checked={!!sameVet[idx]}
                        onChange={e => toggleSameVet(idx, e.target.checked)}
                      />
                      <span className="text-sm" style={{ color: 'var(--text)' }}>
                        Same vet as {pets[0].name || 'Pet 1'}
                      </span>
                    </label>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label required>Vet Name</Label>
                      <input
                        className={ic(idx,'vet_name')}
                        value={pet.vet_name}
                        onChange={e => updatePet(idx,'vet_name',e.target.value)}
                        placeholder="Dr. Smith"
                        disabled={!!sameVet[idx]}
                      />
                      {errors[idx]?.vet_name && <p className="text-xs text-red-500 mt-1">Required</p>}
                    </div>
                    <div>
                      <Label required>Vet Contact Number</Label>
                      <input
                        className={ic(idx,'vet_phone')}
                        type="tel"
                        value={pet.vet_phone}
                        onChange={e => updatePet(idx,'vet_phone',e.target.value)}
                        placeholder="+962 6 XXX XXXX"
                        disabled={!!sameVet[idx]}
                      />
                      {errors[idx]?.vet_phone && <p className="text-xs text-red-500 mt-1">Required</p>}
                    </div>
                  </div>
                </div>

                {/* Medication */}
                <div className="mt-4">
                  <Label>Special Medication Requirements</Label>
                  <textarea className="input" rows={2} value={pet.medication}
                    onChange={e => updatePet(idx,'medication',e.target.value)}
                    placeholder="List any medications, dosage, and schedule (optional)"
                    style={{ resize: 'vertical' }} />
                </div>

              </div>
            )}
          </div>
        )
      })}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button onClick={prevStep} className="btn-secondary px-6">← Previous</button>
        <button onClick={handleNext} className="btn-primary px-8">Next →</button>
      </div>
    </div>
  )
}
