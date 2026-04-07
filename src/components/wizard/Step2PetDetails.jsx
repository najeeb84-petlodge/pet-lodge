import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
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

export default function Step2PetDetails() {
  const { petsData, setPetsData, setHasIntactFemale, nextStep, prevStep } = useWizard()
  const { profile } = useAuth()

  const [numPets,    setNumPets]    = useState(petsData.length || 1)
  const [pets,       setPets]       = useState(() => {
    if (petsData.length) return petsData
    return [{ ...EMPTY_PET }]
  })
  const [open,       setOpen]       = useState([true])   // which cards are expanded
  const [errors,     setErrors]     = useState([])
  const [sameVet,    setSameVet]    = useState([])       // bool per pet index
  const [savedPets,  setSavedPets]  = useState([])       // pets from DB
  const [loadingDB,  setLoadingDB]  = useState(false)

  // Fetch saved pets for logged-in user
  useEffect(() => {
    if (!profile?.id) return
    setLoadingDB(true)
    const token = getAccessToken()
    fetch(
      `${SUPABASE_URL}/rest/v1/pets?user_id=eq.${profile.id}&select=*`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
    )
      .then(r => r.json())
      .then(data => setSavedPets(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingDB(false))
  }, [profile?.id])

  // Resize pets array when numPets changes
  useEffect(() => {
    setPets(prev => {
      if (numPets > prev.length) {
        return [...prev, ...Array.from({ length: numPets - prev.length }, () => ({ ...EMPTY_PET }))]
      }
      return prev.slice(0, numPets)
    })
    setOpen(prev => {
      if (numPets > prev.length) return [...prev, ...Array(numPets - prev.length).fill(false)]
      return prev.slice(0, numPets)
    })
    setErrors(prev => prev.slice(0, numPets))
    setSameVet(prev => prev.slice(0, numPets))
  }, [numPets])

  function updatePet(idx, key, val) {
    setPets(prev => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p))
    if (errors[idx]?.[key]) {
      setErrors(prev => prev.map((e, i) => i === idx ? { ...e, [key]: false } : e))
    }
  }

  function loadFromSaved(petIdx, savedPet) {
    setPets(prev => prev.map((p, i) => i === petIdx ? {
      ...p,
      name:       savedPet.name       || '',
      type:       savedPet.type       || savedPet.species || '',
      breed:      savedPet.breed      || '',
      age:        savedPet.age        != null ? String(savedPet.age) : '',
      colour:     savedPet.colour     || savedPet.color || '',
      gender:     savedPet.gender     || '',
      desexed:    savedPet.desexed    ? 'yes' : 'no',
      vet_name:   savedPet.vet_name   || '',
      vet_phone:  savedPet.vet_phone  || '',
      medication: savedPet.medication_notes || '',
    } : p))
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
      // Copy vet info from Pet 1
      updatePet(idx, 'vet_name',  pets[0].vet_name)
      updatePet(idx, 'vet_phone', pets[0].vet_phone)
    } else {
      updatePet(idx, 'vet_name',  '')
      updatePet(idx, 'vet_phone', '')
    }
  }

  const REQUIRED_FIELDS = ['name','type','breed','age','colour','gender','vet_name','vet_phone']

  function validate() {
    const allErrors = pets.map(p => {
      const e = {}
      REQUIRED_FIELDS.forEach(k => { if (!String(p[k]).trim()) e[k] = true })
      return e
    })
    setErrors(allErrors)
    // Open any card with errors
    setOpen(prev => prev.map((o, i) => Object.keys(allErrors[i] || {}).length > 0 ? true : o))
    return allErrors.every(e => Object.keys(e).length === 0)
  }

  function handleNext() {
    if (!validate()) return
    setPetsData(pets)
    const intact = pets.some(p => p.gender === 'Female' && p.desexed === 'no')
    setHasIntactFemale(intact)
    nextStep()
  }

  const ic = (idx, key) =>
    `input${errors[idx]?.[key] ? ' !border-red-400' : ''}`

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Pet Information</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Tell us about the pet(s) joining us.
      </p>

      {/* Number of Pets */}
      <div className="mb-6">
        <Label required>Number of Pets</Label>
        <select
          className="input w-40"
          value={numPets}
          onChange={e => setNumPets(Number(e.target.value))}
        >
          {[1,2,3,4,5,6].map(n => (
            <option key={n} value={n}>{n} {n === 1 ? 'pet' : 'pets'}</option>
          ))}
        </select>
      </div>

      {/* Pet cards */}
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
              style={{ background: hasErr ? '#fef2f2' : 'var(--light)', borderBottom: open[idx] ? '1px solid var(--border)' : 'none' }}
            >
              <span className="font-700 text-sm font-semibold" style={{ color: hasErr ? '#dc2626' : 'var(--primary)' }}>
                Pet {idx + 1}{pet.name ? ` — ${pet.name}` : ''}
                {hasErr && <span className="ml-2 text-xs font-normal text-red-500">Fill in required fields</span>}
              </span>
              {open[idx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {open[idx] && (
              <div className="p-4">

                {/* Load from My Pets */}
                {savedPets.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg" style={{ background: '#eef4e2', border: '1px solid #c6dba0' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--primary)' }}>
                      {loadingDB ? <Loader2 size={12} className="inline animate-spin mr-1" /> : null}
                      Load from My Pets:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {savedPets.map(sp => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => loadFromSaved(idx, sp)}
                          className="text-xs px-3 py-1 rounded-full font-semibold transition-colors"
                          style={{ background: 'white', border: '1px solid #7aa63c', color: '#5a7a2e' }}
                        >
                          {sp.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                          <span className="text-sm capitalize" style={{ color: 'var(--text)' }}>{val === 'yes' ? 'Yes' : 'No'}</span>
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

                  {/* "Same vet as Pet 1" checkbox — only for idx > 0 when Pet 1 has vet info */}
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

                    {/* Vet Name */}
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

                    {/* Vet Phone */}
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
