import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Edit2, Save, X, Loader2 } from 'lucide-react'

const CATEGORIES = ['boarding','daycamp','grooming','walking','transport','training','other']
const CAT_LABELS = { boarding:'Boarding Services', daycamp:'Day Camp Services', grooming:'Grooming Services', walking:'Walking Services', transport:'Transportation Services', training:'Training Services', other:'Other Services' }

export default function PricesMaster({ isSuperAdmin }) {
  const [services, setServices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(null)
  const [editData, setEditData]   = useState({})
  const [saving, setSaving]       = useState(false)

  async function fetchServices() {
    const { data } = await supabase.from('services').select('*').eq('active', true).order('category').order('sort_order').order('name')
    setServices(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchServices() }, [])

  async function saveEdit() {
    setSaving(true)
    await supabase.from('services').update({
      name: editData.name,
      description: editData.description,
      price: parseFloat(editData.price),
    }).eq('id', editing)
    setEditing(null)
    await fetchServices()
    setSaving(false)
  }

  const grouped = services.reduce((acc, s) => {
    const cat = s.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin" style={{ color:'var(--accent)' }}/></div>

  return (
    <div className="space-y-4">
      {CATEGORIES.filter(cat => grouped[cat]?.length).map(cat => (
        <div key={cat} className="card">
          <h3 className="font-bold text-base mb-4">{CAT_LABELS[cat]}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {grouped[cat].map(s => (
              <div key={s.id} className="rounded-xl border p-4" style={{ borderColor:'var(--border)' }}>
                {editing === s.id ? (
                  <div className="space-y-2">
                    <input className="input text-sm" value={editData.name} onChange={e => setEditData(p => ({...p, name:e.target.value}))} placeholder="Service name"/>
                    <input className="input text-sm" value={editData.description} onChange={e => setEditData(p => ({...p, description:e.target.value}))} placeholder="Description"/>
                    <input className="input text-sm" type="number" step="0.5" value={editData.price} onChange={e => setEditData(p => ({...p, price:e.target.value}))} placeholder="Price"/>
                    <div className="flex gap-2 mt-2">
                      <button onClick={saveEdit} disabled={saving} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                        {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Save
                      </button>
                      <button onClick={() => setEditing(null)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                        <X size={12}/> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-semibold text-sm mb-1">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-400 mb-2">{s.description}</p>}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                        Pet Type: {s.pet_type === 'all' ? 'All Pets' : s.pet_type === 'dog' ? 'Dog' : s.pet_type === 'cat' ? 'Cat' : s.pet_type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg" style={{ color:'var(--accent)' }}>JD {parseFloat(s.price||0).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">per {s.unit || 'day'}</p>
                      </div>
                      {isSuperAdmin && (
                        <button onClick={() => { setEditing(s.id); setEditData({ name:s.name, description:s.description||'', price:s.price }) }}
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                          <Edit2 size={12}/> Edit
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
