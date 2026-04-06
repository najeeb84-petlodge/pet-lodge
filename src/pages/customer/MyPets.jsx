import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { PawPrint, Plus, Pencil, Trash2, X, Loader2, ChevronLeft, Camera } from 'lucide-react'
import TopNav from '../../components/TopNav'
import { useAuth } from '../../contexts/AuthContext'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../lib/supabase'

/* ── REST helpers ─────────────────────────────────────────── */
async function restFetch(path, opts = {}) {
  const token = getAccessToken()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`[restFetch] ${opts.method || 'GET'} ${path} → ${res.status}`, text)
    // Return the parsed error so callers can show it
    try { return { _error: true, status: res.status, body: JSON.parse(text) } } catch { return { _error: true, status: res.status, body: text } }
  }
  return text ? JSON.parse(text) : []
}

async function uploadPetPhoto(file) {
  const token = getAccessToken()
  const ext   = file.name.split('.').pop()
  const path  = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const res   = await fetch(
    `${SUPABASE_URL}/storage/v1/object/pet-photos/${path}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: file,
    }
  )
  if (!res.ok) return null
  return `${SUPABASE_URL}/storage/v1/object/public/pet-photos/${path}`
}

/* ── Constants ─────────────────────────────────────────────── */
const PET_TYPES = ['Dog', 'Cat', 'Other']
const GENDERS   = ['Male', 'Female']

const EMPTY_FORM = {
  name: '', type: 'Dog', breed: '', age: '', colour: '',
  gender: 'Male', desexed: false,
  vet_name: '', vet_contact: '', special_medication: '',
  photo_url: '',
}

/* ── Type icon ─────────────────────────────────────────────── */
function typeEmoji(type) {
  if (!type) return '🐾'
  const t = type.toLowerCase()
  if (t === 'dog') return '🐶'
  if (t === 'cat') return '🐱'
  return '🐾'
}

/* ════════════════════════════════════════════════════════════ */
export default function MyPets() {
  const { profile } = useAuth()
  const [pets, setPets]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editPet, setEditPet]     = useState(null) // null = add, object = edit

  async function fetchPets() {
    if (!profile?.id) return
    setLoading(true)
    const data = await restFetch(`pets?owner_id=eq.${profile.id}&order=created_at.asc`)
    setPets(Array.isArray(data) && !data?._error ? data : [])
    setLoading(false)
  }



  useEffect(() => { fetchPets() }, [profile?.id])

  function openAdd()       { setEditPet(null); setModalOpen(true) }
  function openEdit(pet)   { setEditPet(pet);  setModalOpen(true) }
  function closeModal()    { setModalOpen(false) }

  async function handleDelete(pet) {
    if (!window.confirm(`Remove ${pet.name} from your pets? This cannot be undone.`)) return
    await restFetch(`pets?id=eq.${pet.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
    fetchPets()
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8f9f6' }}>
      <TopNav />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Back link */}
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: 'var(--muted)' }}>
          <ChevronLeft size={15} /> Back to Dashboard
        </Link>

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>My Pets</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              Manage your pets' profiles and health information.
            </p>
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add New Pet
          </button>
        </div>

        {/* Pet grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
        ) : pets.length === 0 ? (
          <div className="card text-center py-14">
            <PawPrint size={44} className="mx-auto mb-3 opacity-25" style={{ color: 'var(--primary)' }} />
            <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No pets yet</p>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>Add your first pet to get started.</p>
            <button onClick={openAdd} className="btn-primary">
              <Plus size={15} /> Add New Pet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map(pet => (
              <PetCard key={pet.id} pet={pet} onEdit={() => openEdit(pet)} onDelete={() => handleDelete(pet)} />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <PetModal
          editPet={editPet}
          ownerId={profile?.id}
          onClose={closeModal}
          onSaved={() => { closeModal(); fetchPets() }}
        />
      )}
    </div>
  )
}

/* ── Pet card ──────────────────────────────────────────────── */
function PetCard({ pet, onEdit, onDelete }) {
  return (
    <div className="card flex flex-col gap-3">
      {/* Photo / avatar */}
      <div className="flex items-center gap-3">
        {pet.photo_url ? (
          <img src={pet.photo_url} alt={pet.name}
            className="w-14 h-14 rounded-full object-cover border-2"
            style={{ borderColor: 'var(--border)' }} />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ background: 'var(--light)', border: '2px solid var(--border)' }}>
            {typeEmoji(pet.type)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>{pet.name}</p>
          <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{pet.breed || '—'}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit}
            className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
            title="Edit pet">
            <Pencil size={14} style={{ color: 'var(--muted)' }} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
            title="Delete pet">
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Pills */}
      <div className="flex flex-wrap gap-1.5">
        {pet.type && (
          <span className="service-tag capitalize">{pet.type}</span>
        )}
        {pet.gender && (
          <span className="service-tag capitalize">{pet.gender}</span>
        )}
        {pet.age != null && pet.age !== '' && (
          <span className="service-tag">{pet.age} yr{pet.age != 1 ? 's' : ''}</span>
        )}
        {pet.desexed && (
          <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'4px', fontSize:'0.75rem', fontWeight:'500', background:'#d1fae5', color:'#065f46', border:'1px solid #a7f3d0' }}>
            Desexed
          </span>
        )}
      </div>

      {/* Colour */}
      {pet.colour && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Colour: <span style={{ color: 'var(--text)' }}>{pet.colour}</span></p>
      )}
    </div>
  )
}

/* ── Modal ─────────────────────────────────────────────────── */
function PetModal({ editPet, ownerId, onClose, onSaved }) {
  const isEdit = Boolean(editPet)
  const [form, setForm]         = useState(isEdit ? { ...EMPTY_FORM, ...editPet } : { ...EMPTY_FORM })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(editPet?.photo_url || '')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileRef = useRef()

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function pickPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Validate required
    const req = ['name','type','breed','age','colour','gender','vet_name','vet_contact']
    for (const k of req) {
      if (!String(form[k] ?? '').trim()) {
        setError(`Please fill in all required fields.`)
        return
      }
    }

    setSaving(true)
    let photo_url = form.photo_url

    // Upload photo if a new one was picked
    if (photoFile) {
      setUploadingPhoto(true)
      const url = await uploadPetPhoto(photoFile)
      setUploadingPhoto(false)
      if (url) photo_url = url
      // if upload fails, proceed without photo (don't block save)
    }

    // Only include columns confirmed to exist in the pets table.
    // Add special_medication and photo_url back once those columns are created in Supabase.
    const body = {
      name:       form.name.trim(),
      type:       form.type,
      breed:      form.breed.trim(),
      age:        Number(form.age),
      colour:     form.colour.trim(),
      gender:     form.gender,
      desexed:    Boolean(form.desexed),
      vet_name:   form.vet_name.trim(),
      vet_contact: form.vet_contact.trim(),
    }

    let result
    if (isEdit) {
      result = await restFetch(`pets?id=eq.${editPet.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
    } else {
      if (!ownerId) { setSaving(false); setError('Not authenticated. Please sign in again.'); return }
      result = await restFetch('pets', {
        method: 'POST',
        body: JSON.stringify({ ...body, owner_id: ownerId }),
      })
    }

    setSaving(false)
    if (result?._error) {
      const msg = result.body?.message || result.body?.hint || result.body?.details || JSON.stringify(result.body)
      setError(`Save failed (${result.status}): ${msg}`)
    } else {
      onSaved()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.45)', paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4"
        style={{ border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            {isEdit ? 'Edit Pet' : 'Add New Pet'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} style={{ color: 'var(--muted)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Photo upload */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden cursor-pointer relative group"
              style={{ background: 'var(--light)', border: '2px dashed var(--border)' }}
              onClick={() => fileRef.current?.click()}
              title="Upload photo">
              {photoPreview ? (
                <img src={photoPreview} alt="Pet" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl select-none">{typeEmoji(form.type)}</span>
              )}
              <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
              {photoPreview ? 'Change photo' : 'Upload photo'} (optional)
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Pet Name <Req /></Label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Max" />
            </div>
            <div>
              <Label>Pet Type <Req /></Label>
              <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                {PET_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Gender <Req /></Label>
              <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                {GENDERS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <Label>Breed <Req /></Label>
              <input className="input" value={form.breed} onChange={e => set('breed', e.target.value)} placeholder="e.g. Golden Retriever" />
            </div>
            <div>
              <Label>Age (years) <Req /></Label>
              <input className="input" type="number" min="0" max="30" step="0.5"
                value={form.age} onChange={e => set('age', e.target.value)} placeholder="e.g. 3" />
            </div>
            <div>
              <Label>Colour <Req /></Label>
              <input className="input" value={form.colour} onChange={e => set('colour', e.target.value)} placeholder="e.g. Golden" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                id="desexed"
                type="checkbox"
                className="w-4 h-4 rounded accent-[#7aa63c] cursor-pointer"
                checked={Boolean(form.desexed)}
                onChange={e => set('desexed', e.target.checked)}
              />
              <label htmlFor="desexed" className="text-sm cursor-pointer select-none" style={{ color: 'var(--text)' }}>
                Desexed / Spayed / Neutered
              </label>
            </div>
          </div>

          {/* Vet info */}
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Veterinary Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vet Name <Req /></Label>
                <input className="input" value={form.vet_name} onChange={e => set('vet_name', e.target.value)} placeholder="Dr. Smith" />
              </div>
              <div>
                <Label>Vet Contact <Req /></Label>
                <input className="input" value={form.vet_contact} onChange={e => set('vet_contact', e.target.value)}
                  placeholder="+962 6 XXX XXXX" />
              </div>
              <div className="col-span-2">
                <Label>Special Medication Requirements</Label>
                <textarea className="input resize-none" rows={3}
                  value={form.special_medication}
                  onChange={e => set('special_medication', e.target.value)}
                  placeholder="Describe any medications, dosage, or special care needs…" />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || uploadingPhoto} className="btn-primary">
              {(saving || uploadingPhoto) && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Pet'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>{children}</label>
}
function Req() {
  return <span className="text-red-500 ml-0.5">*</span>
}
