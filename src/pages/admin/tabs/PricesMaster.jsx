import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../../lib/supabase'
import { Edit2, Save, X, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'

const CATEGORIES = ['boarding','day_camp','grooming','dog_walking','transport','training','other']
const CAT_LABELS = {
  boarding:    'Boarding Services',
  day_camp:    'Day Camp Services',
  grooming:    'Grooming Services',
  dog_walking: 'Dog Walking Services',
  transport:   'Transportation Services',
  training:    'Training Services',
  other:       'Other Services',
}

async function fetchRaw() {
  const token = getAccessToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/services?select=*&order=category,name`,
      {
        signal: controller.signal,
        headers: {
          apikey:        SUPABASE_KEY,
          Authorization: `Bearer ${token || SUPABASE_KEY}`,
        },
      }
    )
    clearTimeout(timer)
    const body = await res.json()
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`)
    console.log('[PricesMaster] rows:', body?.map(r => ({ name: r.name, category: r.category, active: r.active })))
    return { data: body, error: null }
  } catch (e) {
    clearTimeout(timer)
    const msg = e?.name === 'AbortError' ? 'Request timed out after 10 s' : (e?.message || 'Failed to load')
    return { data: null, error: msg }
  }
}

export default function PricesMaster({ isSuperAdmin }) {
  const [services, setServices] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [editing,  setEditing]  = useState(null)
  const [editData, setEditData] = useState({})
  const [saving,   setSaving]   = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchRaw()
    if (err) { setError(err); setLoading(false); return }
    setServices(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveEdit() {
    setSaving(true)
    const token = getAccessToken()
    await fetch(
      `${SUPABASE_URL}/rest/v1/services?id=eq.${editing}`,
      {
        method: 'PATCH',
        headers: {
          apikey:        SUPABASE_KEY,
          Authorization: `Bearer ${token || SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer:        'return=minimal',
        },
        body: JSON.stringify({
          name:          editData.name,
          description:   editData.description,
          price_per_day: parseFloat(editData.price_per_day),
        }),
      }
    )
    setEditing(null)
    await load()
    setSaving(false)
  }

  async function toggleActive(s) {
    const token = getAccessToken()
    await fetch(
      `${SUPABASE_URL}/rest/v1/services?id=eq.${s.id}`,
      {
        method: 'PATCH',
        headers: {
          apikey:        SUPABASE_KEY,
          Authorization: `Bearer ${token || SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer:        'return=minimal',
        },
        body: JSON.stringify({ active: !s.active }),
      }
    )
    setServices(prev => prev.map(r => r.id === s.id ? { ...r, active: !r.active } : r))
  }

  const grouped = services.reduce((acc, s) => {
    const cat = (s.category || 'other').toLowerCase().replace(/[\s-]+/g, '_')
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const visibleCats = CATEGORIES.filter(cat => grouped[cat]?.length)

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

  if (!visibleCats.length) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <p className="text-sm" style={{ color: 'var(--muted)' }}>No services found.</p>
      <button onClick={load} className="btn-secondary text-sm">Refresh</button>
    </div>
  )

  return (
    <div className="space-y-4">
      {visibleCats.map(cat => (
        <div key={cat} className="card">
          <h3 className="font-bold text-base mb-4">{CAT_LABELS[cat]}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[cat].map(s => (
              <div
                key={s.id}
                className="rounded-xl border p-4"
                style={{ borderColor: 'var(--border)', opacity: s.active === false ? 0.55 : 1 }}
              >
                {editing === s.id ? (
                  <div className="space-y-2">
                    <input
                      className="input text-sm"
                      value={editData.name}
                      onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Service name"
                    />
                    <input
                      className="input text-sm"
                      value={editData.description}
                      onChange={e => setEditData(p => ({ ...p, description: e.target.value }))}
                      placeholder="Description"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>JD</span>
                      <input
                        className="input text-sm flex-1"
                        type="number" step="0.5" min="0"
                        value={editData.price_per_day}
                        onChange={e => setEditData(p => ({ ...p, price_per_day: e.target.value }))}
                        placeholder="Price per day"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={saveEdit} disabled={saving} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                      </button>
                      <button onClick={() => setEditing(null)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm leading-snug">{s.name}</p>
                      {isSuperAdmin && (
                        <button onClick={() => toggleActive(s)} title={s.active === false ? 'Inactive — click to activate' : 'Active — click to deactivate'} className="flex-shrink-0 mt-0.5">
                          {s.active === false
                            ? <ToggleLeft  size={20} className="text-gray-400" />
                            : <ToggleRight size={20} style={{ color: '#7aa63c' }} />}
                        </button>
                      )}
                    </div>
                    {s.description && <p className="text-xs text-gray-400 mb-2">{s.description}</p>}
                    {s.pet_type && (
                      <div className="mb-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                          {s.pet_type === 'all' ? 'All Pets' : s.pet_type === 'dog' ? 'Dog' : s.pet_type === 'cat' ? 'Cat' : s.pet_type}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
                          JD {parseFloat(s.price_per_day || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">per {s.unit || 'day'}</p>
                      </div>
                      {isSuperAdmin && (
                        <button
                          onClick={() => { setEditing(s.id); setEditData({ name: s.name, description: s.description || '', price_per_day: s.price_per_day }) }}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
