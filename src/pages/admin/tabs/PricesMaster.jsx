import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../../lib/supabase'
import { Edit2, Save, X, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'

// ── Multi-pet service definitions ─────────────────────────────────────────────
const MULTI_PET_SERVICES = [
  { name: 'Single Day Visit (2 dogs)',                   price: 35,   category: 'daycamp',  pet_type: 'Dog',      unit: 'day',     active: true },
  { name: 'Single Day Visit (3 dogs)',                   price: 45,   category: 'daycamp',  pet_type: 'Dog',      unit: 'day',     active: true },
  { name: 'Monthly (2x per week) (2 dogs)',              price: 224,  category: 'daycamp',  pet_type: 'Dog',      unit: 'month',   active: true },
  { name: 'Monthly (2x per week) (3 dogs)',              price: 288,  category: 'daycamp',  pet_type: 'Dog',      unit: 'month',   active: true },
  { name: 'Quarterly (2x per week) (2 dogs)',            price: 630,  category: 'daycamp',  pet_type: 'Dog',      unit: 'quarter', active: true },
  { name: 'Quarterly (2x per week) (3 dogs)',            price: 810,  category: 'daycamp',  pet_type: 'Dog',      unit: 'quarter', active: true },
  { name: 'Annually (2x per week) (2 dogs)',             price: 2310, category: 'daycamp',  pet_type: 'Dog',      unit: 'year',    active: true },
  { name: 'Annually (2x per week) (3 dogs)',             price: 2970, category: 'daycamp',  pet_type: 'Dog',      unit: 'year',    active: true },
  { name: 'Pets Boarding - Standard (1 cat and 2 dogs)', price: 21,   category: 'boarding', pet_type: 'All Pets', unit: 'day',     active: true },
  { name: 'Pets Boarding - Standard (2 cats and 1 dog)', price: 19,   category: 'boarding', pet_type: 'All Pets', unit: 'day',     active: true },
  { name: 'Pets Boarding - Standard (2 cats and 2 dogs)', price: 23,  category: 'boarding', pet_type: 'All Pets', unit: 'day',     active: true },
]
const DEACTIVATE_NAMES = ['Additional Dog (Day Camp)', 'Additional Dogs Daycamp']

// Preferred display order — covers both alias forms (daycamp/day_camp, walking/dog_walking)
const CAT_ORDER = ['boarding', 'daycamp', 'day_camp', 'grooming', 'walking', 'dog_walking', 'transport', 'training', 'other']

const CAT_LABELS = {
  boarding:    'Boarding Services',
  day_camp:    'Day Camp Services',
  daycamp:     'Day Camp Services',
  grooming:    'Grooming Services',
  dog_walking: 'Dog Walking Services',
  walking:     'Dog Walking Services',
  transport:   'Transportation Services',
  training:    'Training Services',
  other:       'Other Services',
}

function catLabel(cat) {
  return CAT_LABELS[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' Services'
}

// Groups day camp services by base name (strips " (N dogs)" suffix).
// Returns groups sorted in Single → Monthly → Quarterly → Annually order.
function groupDayCampServices(services) {
  const ORDER = ['single', 'monthly', 'quarterly', 'annually']
  const groups = {}
  services.forEach(s => {
    const baseName = s.name.replace(/\s*\([23] dogs\)\s*$/i, '').trim()
    if (!groups[baseName]) groups[baseName] = { baseName, base: null, variants: [] }
    if (/\([23] dogs\)/i.test(s.name)) {
      groups[baseName].variants.push(s)
    } else {
      groups[baseName].base = s
    }
  })
  Object.values(groups).forEach(g => {
    g.variants.sort((a, b) => {
      const nA = parseInt(a.name.match(/\((\d) dogs\)/i)?.[1] || 1, 10)
      const nB = parseInt(b.name.match(/\((\d) dogs\)/i)?.[1] || 1, 10)
      return nA - nB
    })
  })
  return Object.values(groups).sort((a, b) => {
    const ai = ORDER.findIndex(k => a.baseName.toLowerCase().includes(k))
    const bi = ORDER.findIndex(k => b.baseName.toLowerCase().includes(k))
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
  })
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
  const [seeding,  setSeeding]  = useState(false)
  const [seedMsg,  setSeedMsg]  = useState('')

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
          price: parseFloat(editData.price),
        }),
      }
    )
    setEditing(null)
    await load()
    setSaving(false)
  }

  async function seedMultiPetServices() {
    setSeeding(true); setSeedMsg('')
    const token = getAccessToken()
    const headers = {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${token || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    }
    const existRes  = await fetch(`${SUPABASE_URL}/rest/v1/services?select=id,name,active`, { headers })
    const existing  = existRes.ok ? await existRes.json() : []
    const existNames = new Set((existing || []).map(s => s.name))

    const toInsert = MULTI_PET_SERVICES.filter(s => !existNames.has(s.name))
    if (toInsert.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/services`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(toInsert),
      })
    }

    const toDeactivate = (existing || []).filter(s => DEACTIVATE_NAMES.includes(s.name) && s.active !== false)
    for (const s of toDeactivate) {
      await fetch(`${SUPABASE_URL}/rest/v1/services?id=eq.${s.id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ active: false }),
      })
    }

    setSeedMsg(toInsert.length ? `Added ${toInsert.length} variant(s).` : 'Already up to date.')
    await load()
    setSeeding(false)
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

  const visibleCats = Object.keys(grouped).sort((a, b) => {
    const ai = CAT_ORDER.indexOf(a), bi = CAT_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

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

  const needsSeed = isSuperAdmin && !services.some(s => /\([23] dogs\)/i.test(s.name))

  // Reusable service card (used by all non-day-camp categories)
  function ServiceCard({ s }) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'var(--border)', opacity: s.active === false ? 0.55 : 1 }}
      >
        {editing === s.id ? (
          <div className="space-y-2">
            <input className="input text-sm" value={editData.name}
              onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} placeholder="Service name" />
            <input className="input text-sm" value={editData.description}
              onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>JD</span>
              <input className="input text-sm flex-1" type="number" step="0.5" min="0"
                value={editData.price}
                onChange={e => setEditData(p => ({ ...p, price: e.target.value }))} placeholder="Price" />
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
                <button onClick={() => toggleActive(s)}
                  title={s.active === false ? 'Inactive — click to activate' : 'Active — click to deactivate'}
                  className="flex-shrink-0 mt-0.5">
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
                  {s.pet_type === 'all' || s.pet_type === 'All Pets' ? 'All Pets'
                    : s.pet_type === 'dog' ? 'Dog' : s.pet_type === 'cat' ? 'Cat' : s.pet_type}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
                  JD {parseFloat(s.price || 0).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">per {s.unit || 'day'}</p>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={() => { setEditing(s.id); setEditData({ name: s.name, description: s.description || '', price: s.price }) }}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  // Stacked card for a day camp base+variants group
  function DayCampGroupCard({ group }) {
    const { baseName, base, variants } = group
    const displayService = base || (variants.length ? { ...variants[0], name: baseName, price: 0 } : null)
    if (!displayService) return null
    return (
      <div className="rounded-xl border p-4"
        style={{ borderColor: 'var(--border)', opacity: displayService.active === false ? 0.55 : 1 }}>
        {editing === displayService.id ? (
          <div className="space-y-2">
            <input className="input text-sm" value={editData.name}
              onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} placeholder="Service name" />
            <input className="input text-sm" value={editData.description}
              onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>JD</span>
              <input className="input text-sm flex-1" type="number" step="0.5" min="0"
                value={editData.price}
                onChange={e => setEditData(p => ({ ...p, price: e.target.value }))} placeholder="Price" />
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
              <p className="font-semibold text-sm leading-snug">{baseName}</p>
              {isSuperAdmin && base && (
                <button onClick={() => toggleActive(base)}
                  title={base.active === false ? 'Inactive — click to activate' : 'Active — click to deactivate'}
                  className="flex-shrink-0 mt-0.5">
                  {base.active === false
                    ? <ToggleLeft  size={20} className="text-gray-400" />
                    : <ToggleRight size={20} style={{ color: '#7aa63c' }} />}
                </button>
              )}
            </div>
            {base?.description && <p className="text-xs text-gray-400 mb-2">{base.description}</p>}
            <div className="flex items-center justify-between mt-2">
              {base ? (
                <div>
                  <p className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
                    JD {parseFloat(base.price || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">per {base.unit || 'day'} · 1 dog</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">1-dog rate not set</p>
              )}
              {isSuperAdmin && base && (
                <button
                  onClick={() => { setEditing(base.id); setEditData({ name: base.name, description: base.description || '', price: base.price }) }}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>

            {/* Multi-dog variant sub-box */}
            {variants.length > 0 && (
              <div className="mt-3 rounded-lg p-3" style={{ background: '#eef4e2', border: '1px solid #c6dba0' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#5a7a2e' }}>Multi-dog pricing</p>
                {variants.map((v, vi) => {
                  const dogLabel = v.name.match(/\((\d+) dogs?\)/i)?.[1]
                  return editing === v.id ? (
                    <div key={v.id} className={`py-2 space-y-2 ${vi > 0 ? 'border-t' : ''}`} style={{ borderColor: '#c6dba0' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600">{dogLabel} dogs · JD</span>
                        <input className="input text-xs flex-1" type="number" step="0.5" min="0"
                          value={editData.price}
                          onChange={e => setEditData(p => ({ ...p, price: e.target.value }))} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} disabled={saving}
                          className="btn-primary text-xs py-1 px-2 flex items-center gap-1">
                          {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                          <X size={10} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={v.id}
                      className={`flex items-center justify-between py-1.5 ${vi > 0 ? 'border-t' : ''}`}
                      style={{ borderColor: '#c6dba0', opacity: v.active === false ? 0.5 : 1 }}>
                      <div className="flex items-center gap-2">
                        {isSuperAdmin && (
                          <button onClick={() => toggleActive(v)}
                            title={v.active === false ? 'Inactive' : 'Active'}
                            className="flex-shrink-0">
                            {v.active === false
                              ? <ToggleLeft  size={16} className="text-gray-400" />
                              : <ToggleRight size={16} style={{ color: '#7aa63c' }} />}
                          </button>
                        )}
                        <span className="text-sm font-medium" style={{ color: v.active === false ? '#9ca3af' : '#2d3a1e' }}>
                          {dogLabel} dogs
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold" style={{ color: '#5a7a2e' }}>
                          JD {parseFloat(v.price || 0).toFixed(0)}
                        </span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => { setEditing(v.id); setEditData({ name: v.name, description: v.description || '', price: v.price }) }}
                            className="text-xs font-medium" style={{ color: '#5a7a2e', textDecoration: 'underline' }}>
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isSuperAdmin && needsSeed && (
        <div className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: '#eef4e2', border: '1px solid #c6dba0' }}>
          <p className="text-sm flex-1" style={{ color: '#2d3a1e' }}>
            Multi-dog day camp variants and mixed boarding rows are not yet in the database.
          </p>
          <button onClick={seedMultiPetServices} disabled={seeding}
            className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1 flex-shrink-0">
            {seeding ? <Loader2 size={12} className="animate-spin" /> : null}
            {seeding ? 'Adding…' : 'Add variants'}
          </button>
        </div>
      )}
      {seedMsg && !needsSeed && (
        <p className="text-xs px-1" style={{ color: '#5a7a2e' }}>{seedMsg}</p>
      )}
      {visibleCats.map(cat => {
        const isDayCamp = cat === 'daycamp' || cat === 'day_camp'
        return (
          <div key={cat} className="card">
            <h3 className="font-bold text-base mb-4">{catLabel(cat)}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {isDayCamp
                ? groupDayCampServices(grouped[cat]).map(group => (
                    <DayCampGroupCard key={group.baseName} group={group} />
                  ))
                : grouped[cat].map(s => <ServiceCard key={s.id} s={s} />)
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}
