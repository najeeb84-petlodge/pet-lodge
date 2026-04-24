import { useEffect, useState } from 'react'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../../lib/supabase'
import { Edit2, Save, X, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'

// ── Variant definitions for seeding ──────────────────────────────────────────
// baseName = name of the base service in the DB (category/pet_type/unit are copied from it).
// For rows without a DB base, provide a `fallback` object with explicit values.
const VARIANT_DEFS = [
  { baseName: 'Single Day Visit',         variantLabel: '2 dogs', price: 35   },
  { baseName: 'Single Day Visit',         variantLabel: '3 dogs', price: 45   },
  { baseName: 'Monthly (2x per week)',    variantLabel: '2 dogs', price: 224  },
  { baseName: 'Monthly (2x per week)',    variantLabel: '3 dogs', price: 288  },
  { baseName: 'Quarterly (2x per week)', variantLabel: '2 dogs', price: 630  },
  { baseName: 'Quarterly (2x per week)', variantLabel: '3 dogs', price: 810  },
  { baseName: 'Annually (2x per week)',  variantLabel: '2 dogs', price: 2310 },
  { baseName: 'Annually (2x per week)',  variantLabel: '3 dogs', price: 2970 },
  { baseName: 'Pets Boarding - Standard', variantLabel: '1 cat and 2 dogs', price: 21,  description: 'Separate accommodations for mixed pets', fallback: { category: 'Boarding', pet_type: 'All Pets', unit: 'day' } },
  { baseName: 'Pets Boarding - Standard', variantLabel: '2 cats and 1 dog', price: 19,  description: 'Separate accommodations for mixed pets', fallback: { category: 'Boarding', pet_type: 'All Pets', unit: 'day' } },
  { baseName: 'Pets Boarding - Standard', variantLabel: '2 cats and 2 dogs', price: 23, description: 'Separate accommodations for mixed pets', fallback: { category: 'Boarding', pet_type: 'All Pets', unit: 'day' } },
]
const DEACTIVATE_NAMES = ['Additional Dog (Day Camp)', 'Additional Dogs Daycamp']

// Base names that get stacked Option C cards (key = normalised category)
const OPTION_C_NAMES = {
  day_camp: ['Single Day Visit', 'Monthly (2x per week)', 'Quarterly (2x per week)', 'Annually (2x per week)'],
  boarding: ['Cat Boarding - Standard', 'Dog Boarding - Standard', 'Pets Boarding - Standard'],
}

const CAT_ORDER  = ['boarding', 'day_camp', 'grooming', 'dog_walking', 'transport', 'training', 'other']
const CAT_LABELS = {
  boarding:    'Boarding Services',
  day_camp:    'Day Camp Services',
  grooming:    'Grooming Services',
  dog_walking: 'Dog Walking Services',
  transport:   'Transportation Services',
  training:    'Training Services',
  other:       'Other Services',
}
function catLabel(cat) {
  return CAT_LABELS[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' Services'
}

// Count total pets in a variant label string.
// "2 dogs" → 2,  "1 cat and 2 dogs" → 3,  null (bare base) → 1
function countPets(label) {
  if (!label) return 1
  let n = 0
  for (const m of label.matchAll(/(\d+)\s*(cat|dog|cats|dogs)/gi)) n += parseInt(m[1], 10)
  return n || 1
}

// Build Option C groups for the given base names.
// A service belongs to a group if its name equals baseName or starts with "baseName (" and ends with ")".
// Within each group: base = lowest-pet-count row; variants = rest sorted ascending by pet count.
function groupOptionC(services, baseNames) {
  const groups = {}
  baseNames.forEach(bn => { groups[bn] = { baseName: bn, allRows: [] } })

  services.forEach(s => {
    for (const bn of baseNames) {
      if (s.name === bn) {
        groups[bn].allRows.push({ ...s, variantLabel: null })
        return
      }
      if (s.name.startsWith(bn + ' (') && s.name.endsWith(')')) {
        groups[bn].allRows.push({ ...s, variantLabel: s.name.slice(bn.length + 2, -1) })
        return
      }
    }
  })

  Object.values(groups).forEach(g => {
    g.allRows.sort((a, b) => countPets(a.variantLabel) - countPets(b.variantLabel))
    g.base     = g.allRows[0] || null
    g.variants = g.allRows.slice(1)
  })

  return baseNames.map(bn => groups[bn]).filter(g => g.allRows.length > 0)
}

// Returns true if a service name belongs to any Option C group for the given category
function isOptionC(name, baseNames) {
  return baseNames.some(bn => name === bn || (name.startsWith(bn + ' (') && name.endsWith(')')))
}

async function fetchRaw() {
  const token = getAccessToken()
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/services?select=*&order=category,name`,
      { signal: ctrl.signal, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
    )
    clearTimeout(timer)
    const body = await res.json()
    if (!res.ok) throw new Error(body?.message || `HTTP ${res.status}`)
    return { data: body, error: null }
  } catch (e) {
    clearTimeout(timer)
    return { data: null, error: e?.name === 'AbortError' ? 'Request timed out after 10 s' : (e?.message || 'Failed to load') }
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

  // Insert missing variant rows and deactivate old add-ons.
  // Copies category/pet_type/unit from the base service in the DB; falls back to explicit values.
  // Logs verification counts to DevTools console.
  async function seedVariants() {
    if (!isSuperAdmin) return
    const token = getAccessToken()
    const h = {
      apikey:         SUPABASE_KEY,
      Authorization:  `Bearer ${token || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/services?select=id,name,category,pet_type,unit,active`, { headers: h })
    const all = res.ok ? await res.json() : []
    const byName = {}
    ;(all || []).forEach(s => { byName[s.name] = s })

    const toInsert = []
    for (const def of VARIANT_DEFS) {
      const fullName = `${def.baseName} (${def.variantLabel})`
      if (byName[fullName]) continue
      const base = byName[def.baseName]
      toInsert.push({
        name:        fullName,
        price:       def.price,
        description: def.description || null,
        active:      true,
        category:    base?.category ?? def.fallback?.category ?? 'Boarding',
        pet_type:    base?.pet_type ?? def.fallback?.pet_type ?? null,
        unit:        base?.unit     ?? def.fallback?.unit     ?? 'day',
      })
    }
    if (toInsert.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/services`, {
        method: 'POST',
        headers: { ...h, Prefer: 'return=minimal' },
        body: JSON.stringify(toInsert),
      })
    }

    // Deactivate old add-ons
    for (const s of (all || []).filter(s => DEACTIVATE_NAMES.includes(s.name) && s.active !== false)) {
      await fetch(`${SUPABASE_URL}/rest/v1/services?id=eq.${s.id}`, {
        method: 'PATCH',
        headers: { ...h, Prefer: 'return=minimal' },
        body: JSON.stringify({ active: false }),
      })
    }

    // Verify — fetch fresh list and log counts
    const vRes  = await fetch(`${SUPABASE_URL}/rest/v1/services?select=name&order=name`, { headers: h })
    const vAll  = vRes.ok ? await vRes.json() : []
    const vSet  = new Set((vAll || []).map(s => s.name))
    const dcDefs = VARIANT_DEFS.filter(d => !d.fallback)
    const mbDefs = VARIANT_DEFS.filter(d =>  d.fallback)
    console.log(`[PricesMaster] Day camp variants: ${dcDefs.filter(d => vSet.has(`${d.baseName} (${d.variantLabel})`)).length} found / ${dcDefs.length} expected`)
    console.log(`[PricesMaster] Mixed-pet boarding variants: ${mbDefs.filter(d => vSet.has(`${d.baseName} (${d.variantLabel})`)).length} found / ${mbDefs.length} expected`)
  }

  // Initial load; re-seed when super_admin status is confirmed
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (isSuperAdmin) seedVariants().then(load)
  }, [isSuperAdmin])

  async function saveEdit() {
    setSaving(true)
    const token = getAccessToken()
    await fetch(`${SUPABASE_URL}/rest/v1/services?id=eq.${editing}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ name: editData.name, description: editData.description, price: parseFloat(editData.price) }),
    })
    setEditing(null)
    await load()
    setSaving(false)
  }

  async function toggleActive(s) {
    const token = getAccessToken()
    await fetch(`${SUPABASE_URL}/rest/v1/services?id=eq.${s.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ active: !s.active }),
    })
    setServices(prev => prev.map(r => r.id === s.id ? { ...r, active: !r.active } : r))
  }

  // Normalise category aliases and strip deactivated add-on rows
  const grouped = services
    .filter(s => !DEACTIVATE_NAMES.includes(s.name))
    .reduce((acc, s) => {
      let cat = (s.category || 'other').toLowerCase().replace(/[\s-]+/g, '_')
      if (cat === 'daycamp')  cat = 'day_camp'
      if (cat === 'walking')  cat = 'dog_walking'
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

  // ── Shared edit form (used in both card and sub-row editing) ──────────────
  function EditForm({ priceOnly = false }) {
    return (
      <div className="space-y-2">
        {!priceOnly && <>
          <input className="input text-sm" value={editData.name}
            onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} placeholder="Service name" />
          <input className="input text-sm" value={editData.description}
            onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
        </>}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>JD</span>
          <input className="input text-sm flex-1" type="number" step="0.5" min="0"
            value={editData.price} onChange={e => setEditData(p => ({ ...p, price: e.target.value }))} placeholder="Price" />
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
    )
  }

  // ── Flat card (non-Option-C services) ─────────────────────────────────────
  function ServiceCard({ s }) {
    return (
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', opacity: s.active === false ? 0.55 : 1 }}>
        {editing === s.id ? <EditForm /> : (
          <>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-semibold text-sm leading-snug">{s.name}</p>
              {isSuperAdmin && (
                <button onClick={() => toggleActive(s)} title={s.active === false ? 'Inactive — click to activate' : 'Active — click to deactivate'} className="flex-shrink-0 mt-0.5">
                  {s.active === false ? <ToggleLeft size={20} className="text-gray-400" /> : <ToggleRight size={20} style={{ color: '#7aa63c' }} />}
                </button>
              )}
            </div>
            {s.description && <p className="text-xs text-gray-400 mb-2">{s.description}</p>}
            {s.pet_type && (
              <div className="mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {s.pet_type === 'all' || s.pet_type === 'All Pets' ? 'All Pets' : s.pet_type === 'dog' ? 'Dog' : s.pet_type === 'cat' ? 'Cat' : s.pet_type}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--accent)' }}>JD {parseFloat(s.price || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-400">per {s.unit || 'day'}</p>
              </div>
              {isSuperAdmin && (
                <button onClick={() => { setEditing(s.id); setEditData({ name: s.name, description: s.description || '', price: s.price }) }}
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

  // ── Option C stacked card (Day Camp and Boarding variant groups) ──────────
  function OptionCGroupCard({ group }) {
    const { baseName, base, variants } = group
    if (!base) return null
    return (
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', opacity: base.active === false ? 0.55 : 1 }}>
        {editing === base.id ? <EditForm /> : (
          <>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-semibold text-sm leading-snug">{baseName}</p>
              {isSuperAdmin && (
                <button onClick={() => toggleActive(base)} title={base.active === false ? 'Inactive — click to activate' : 'Active — click to deactivate'} className="flex-shrink-0 mt-0.5">
                  {base.active === false ? <ToggleLeft size={20} className="text-gray-400" /> : <ToggleRight size={20} style={{ color: '#7aa63c' }} />}
                </button>
              )}
            </div>
            {base.description && <p className="text-xs text-gray-400 mb-2">{base.description}</p>}
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="font-bold text-lg" style={{ color: 'var(--accent)' }}>JD {parseFloat(base.price || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-400">
                  per {base.unit || 'day'}{base.variantLabel ? ` · ${base.variantLabel}` : ''}
                </p>
              </div>
              {isSuperAdmin && (
                <button onClick={() => { setEditing(base.id); setEditData({ name: base.name, description: base.description || '', price: base.price }) }}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>

            {/* Sub-variant box */}
            {variants.length > 0 && (
              <div className="mt-3 rounded-lg p-3" style={{ background: '#eef4e2', border: '1px solid #c6dba0' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#5a7a2e' }}>Multi-pet pricing</p>
                {variants.map((v, vi) => (
                  editing === v.id ? (
                    <div key={v.id} className={`py-2 space-y-1.5 ${vi > 0 ? 'border-t' : ''}`} style={{ borderColor: '#c6dba0' }}>
                      <span className="text-xs font-medium text-gray-600">{v.variantLabel} · JD</span>
                      <input className="input text-xs w-full" type="number" step="0.5" min="0"
                        value={editData.price} onChange={e => setEditData(p => ({ ...p, price: e.target.value }))} />
                      <div className="flex gap-2 mt-1">
                        <button onClick={saveEdit} disabled={saving} className="btn-primary text-xs py-1 px-2 flex items-center gap-1">
                          {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save
                        </button>
                        <button onClick={() => setEditing(null)} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
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
                          <button onClick={() => toggleActive(v)} title={v.active === false ? 'Inactive' : 'Active'} className="flex-shrink-0">
                            {v.active === false ? <ToggleLeft size={16} className="text-gray-400" /> : <ToggleRight size={16} style={{ color: '#7aa63c' }} />}
                          </button>
                        )}
                        <span className={`text-sm font-medium${v.active === false ? ' line-through' : ''}`}
                          style={{ color: v.active === false ? '#9ca3af' : '#2d3a1e' }}>
                          {v.variantLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold" style={{ color: '#5a7a2e' }}>JD {parseFloat(v.price || 0).toFixed(0)}</span>
                        {isSuperAdmin && (
                          <button onClick={() => { setEditing(v.id); setEditData({ name: v.name, description: v.description || '', price: v.price }) }}
                            className="text-xs font-medium" style={{ color: '#5a7a2e', textDecoration: 'underline' }}>
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </>
        )}
      </div>
    )
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
  if (!visibleCats.length) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <p className="text-sm" style={{ color: 'var(--muted)' }}>No services found.</p>
      <button onClick={load} className="btn-secondary text-sm">Refresh</button>
    </div>
  )

  return (
    <div className="space-y-4">
      {visibleCats.map(cat => {
        const optionCNames = OPTION_C_NAMES[cat] || []
        const catServices  = grouped[cat] || []
        const optionCGroups = optionCNames.length ? groupOptionC(catServices, optionCNames) : []
        const flatServices  = optionCNames.length
          ? catServices.filter(s => !isOptionC(s.name, optionCNames))
          : catServices
        return (
          <div key={cat} className="card">
            <h3 className="font-bold text-base mb-4">{catLabel(cat)}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {optionCGroups.map(group => <OptionCGroupCard key={group.baseName} group={group} />)}
              {flatServices.map(s => <ServiceCard key={s.id} s={s} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
