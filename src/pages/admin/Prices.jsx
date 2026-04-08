import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Edit2, Save, X, Plus, Loader2, Tag, ToggleLeft, ToggleRight } from 'lucide-react'

export default function Prices() {
  const [services, setServices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(null)   // id of row being edited
  const [editData, setEditData]   = useState({})
  const [saving, setSaving]       = useState(false)
  const [showAdd, setShowAdd]     = useState(false)
  const [newService, setNewService] = useState({ name: '', description: '', price: '', category: '' })

  async function fetchServices() {
    const { data } = await supabase.from('services').select('*').order('category').order('name')
    setServices(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchServices() }, [])

  function startEdit(s) {
    setEditing(s.id)
    setEditData({ name: s.name, description: s.description ?? '', price: s.price, category: s.category ?? '' })
  }

  async function saveEdit(id) {
    setSaving(true)
    await supabase.from('services').update({
      name: editData.name,
      description: editData.description,
      price: parseFloat(editData.price),
      category: editData.category,
    }).eq('id', id)
    setEditing(null)
    await fetchServices()
    setSaving(false)
  }

  async function toggleActive(s) {
    await supabase.from('services').update({ active: !s.active }).eq('id', s.id)
    await fetchServices()
  }

  async function addService() {
    if (!newService.name || !newService.price) return
    setSaving(true)
    await supabase.from('services').insert({
      name: newService.name,
      description: newService.description,
      price: parseFloat(newService.price),
      category: newService.category,
      active: true,
    })
    setNewService({ name: '', description: '', price: '', category: '' })
    setShowAdd(false)
    await fetchServices()
    setSaving(false)
  }

  const grouped = services.reduce((acc, s) => {
    const cat = s.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prices Master</h1>
          <p className="text-slate-500 text-sm mt-1">Manage service types and pricing</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <Plus size={16}/> Add Service
        </button>
      </div>

      {/* Add new service form */}
      {showAdd && (
        <div className="card mb-4 border-2 border-brand-200 bg-brand-50/30">
          <h3 className="font-semibold text-slate-800 mb-3">New Service</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Service Name *</label>
              <input className="input" placeholder="e.g. Dog Boarding" value={newService.name}
                onChange={e => setNewService(p => ({ ...p, name: e.target.value }))}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Category</label>
              <input className="input" placeholder="e.g. Boarding, Grooming" value={newService.category}
                onChange={e => setNewService(p => ({ ...p, category: e.target.value }))}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Price per Day (JD) *</label>
              <input className="input" type="number" step="0.5" placeholder="0.00" value={newService.price}
                onChange={e => setNewService(p => ({ ...p, price: e.target.value }))}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
              <input className="input" placeholder="Short description…" value={newService.description}
                onChange={e => setNewService(p => ({ ...p, description: e.target.value }))}/>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addService} disabled={saving} className="btn-primary flex items-center gap-1">
              {saving && <Loader2 size={14} className="animate-spin"/>} Save
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={28} className="animate-spin text-brand-600"/>
        </div>
      ) : Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="card mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={16} className="text-brand-600"/>
            <h2 className="font-semibold text-slate-800">{cat}</h2>
            <span className="text-xs text-slate-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length} services</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Service', 'Description', 'Price / Day', 'Status', 'Actions'].map(h => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      {editing === s.id
                        ? <input className="input text-sm py-1" value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}/>
                        : <span className="font-medium text-slate-800">{s.name}</span>}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 max-w-xs">
                      {editing === s.id
                        ? <input className="input text-sm py-1" value={editData.description} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))}/>
                        : s.description}
                    </td>
                    <td className="py-3 pr-4">
                      {editing === s.id
                        ? <input className="input text-sm py-1 w-24" type="number" step="0.5" value={editData.price}
                            onChange={e => setEditData(p => ({ ...p, price: e.target.value }))}/>
                        : <span className="font-semibold text-slate-900">JD {s.price}</span>}
                    </td>
                    <td className="py-3 pr-4">
                      <button onClick={() => toggleActive(s)} className="flex items-center gap-1 text-xs">
                        {s.active
                          ? <><ToggleRight size={18} className="text-emerald-500"/><span className="text-emerald-600">Active</span></>
                          : <><ToggleLeft size={18} className="text-gray-400"/><span className="text-gray-400">Inactive</span></>}
                      </button>
                    </td>
                    <td className="py-3">
                      {editing === s.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(s.id)} disabled={saving}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                            {saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>}
                          </button>
                          <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                            <X size={15}/>
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(s)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg">
                          <Edit2 size={15}/>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
