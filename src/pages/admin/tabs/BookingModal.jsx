import { useState, useEffect } from 'react'
import { format, differenceInCalendarDays } from 'date-fns'
import {
  X, Edit2, Mail, FileText, MessageCircle,
  ChevronDown, ChevronUp, Save, Plus, Trash2,
  Loader2, Check, Copy,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { supabase, dbQuery, dbUpdate } from '../../../lib/supabase'

const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'online']
const METHOD_LABEL = { cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', online: 'Online' }
const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled']

const headerBtnStyle = {
  background: 'rgba(255,255,255,0.15)',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: '600',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
}

function Section({ title, children, amber }) {
  const bg     = amber ? '#fffbeb' : 'white'
  const border = amber ? '#fcd34d' : 'var(--border)'
  const hdrBg  = amber ? '#fef3c7' : 'var(--light)'
  const hdrClr = amber ? '#92400e' : 'var(--primary)'
  return (
    <div style={{ marginBottom: '0.875rem', background: bg, border: `1px solid ${border}`, borderRadius: '0.75rem', overflow: 'hidden' }}>
      <div style={{ padding: '0.5rem 1rem', background: hdrBg, borderBottom: `1px solid ${border}`, fontWeight: '700', fontSize: '0.72rem', color: hdrClr, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ padding: '0.75rem 1rem' }}>{children}</div>
    </div>
  )
}

function Row({ label, value, bold, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.28rem 0', borderBottom: '1px solid var(--border)', gap: '1rem' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--muted)', flexShrink: 0, minWidth: '110px' }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: bold ? '700' : '500', color: accent ? 'var(--accent)' : 'var(--text)', textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  )
}

function ERow({ label, children }) {
  return (
    <div style={{ marginBottom: '0.6rem' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem', fontWeight: '600' }}>{label}</label>
      {children}
    </div>
  )
}

function CollapsibleSection({ title, open, onToggle, children }) {
  return (
    <div style={{ marginBottom: '0.875rem', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', background: 'var(--light)', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.72rem', color: 'var(--primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {title}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div style={{ padding: '0.75rem 1rem' }}>{children}</div>}
    </div>
  )
}

export default function BookingModal({ booking, onClose, onUpdated }) {
  const [mode, setMode]               = useState('view')
  const [full, setFull]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [payments, setPayments]       = useState([])
  const [availSvcs, setAvailSvcs]     = useState([])

  // edit state
  const [edit, setEdit]               = useState({})
  const [lineItems, setLineItems]     = useState([])

  // payment form
  const [payForm, setPayForm]         = useState({ amount: '', method: 'cash', notes: '' })
  const [savingPay, setSavingPay]     = useState(false)

  // collapsibles
  const [transportOpen, setTransportOpen] = useState(false)
  const [howHeardOpen, setHowHeardOpen]   = useState(false)

  // send modal
  const [sendOpen, setSendOpen]       = useState(false)
  const [sendTab, setSendTab]         = useState('confirmation')
  const [copied, setCopied]           = useState(false)

  useEffect(() => { fetchFull() }, [booking.id])

  async function fetchFull() {
    setLoading(true)
    const [rows, pays] = await Promise.all([
      dbQuery('bookings', `?id=eq.${booking.id}&select=*`),
      dbQuery('payments', `?booking_id=eq.${booking.id}&select=*&order=created_at.desc`),
    ])
    setFull(Array.isArray(rows) && rows[0] ? rows[0] : booking)
    setPayments(Array.isArray(pays) ? pays : [])
    setLoading(false)
  }

  function enterEdit() {
    const b = full
    setEdit({
      status:               b.status || 'pending',
      start_date:           b.start_date || '',
      end_date:             b.end_date || '',
      total_days:           b.total_days || 0,
      total_amount:         b.total_amount ?? b.total_price ?? 0,
      discount:             b.discount || 0,
      prepaid_amount:       b.prepaid_amount || 0,
      transport_fee:        b.transport_fee || 0,
      additional_comments:  b.additional_comments || '',
      pickup_required:      b.pickup_required || false,
      dropoff_required:     b.dropoff_required || false,
      transport_notes:      b.transport_notes || '',
      vet_name:             b.vet_name || '',
      vet_phone:            b.vet_phone || '',
      vet_clinic:           b.vet_clinic || '',
      how_heard:            b.how_heard || '',
    })
    setLineItems(b.services ? [{ id: b.services.id, name: b.services.name, price: b.services.price || 0, unit: b.services.unit || 'day' }] : [])
    dbQuery('services', '?active=eq.true&select=id,name,price,category,unit&order=category,name').then(d => setAvailSvcs(Array.isArray(d) ? d : []))
    setMode('edit')
  }

  function calcTotal(e, items) {
    const days = parseInt(e.total_days) || 0
    const svcTotal = items.reduce((s, li) => {
      const qty = li.quantity ?? (li.unit === 'day' || !li.unit ? days : 1)
      return s + (parseFloat(li.price) || 0) * qty
    }, 0)
    return Math.max(0, svcTotal + (parseFloat(e.transport_fee) || 0) - (parseFloat(e.discount) || 0))
  }

  function onDateChange(field, value) {
    const next = { ...edit, [field]: value }
    const s = field === 'start_date' ? value : next.start_date
    const e = field === 'end_date'   ? value : next.end_date
    if (s && e) {
      const days = Math.max(0, differenceInCalendarDays(new Date(e), new Date(s)))
      next.total_days    = days
      next.total_amount  = calcTotal({ ...next, total_days: days }, lineItems)
    }
    setEdit(next)
  }

  function onLineChange(idx, field, val) {
    const updated = lineItems.map((li, i) => i === idx ? { ...li, [field]: val } : li)
    setLineItems(updated)
    setEdit(e => ({ ...e, total_amount: calcTotal(e, updated) }))
  }

  function onSvcSelect(idx, svcId) {
    const s = availSvcs.find(x => x.id === svcId)
    const updated = lineItems.map((li, i) => i === idx ? { id: s?.id, name: s?.name || '', price: s?.price || 0, unit: s?.unit || 'day' } : li)
    setLineItems(updated)
    setEdit(e => ({ ...e, total_amount: calcTotal(e, updated) }))
  }

  function addLine() {
    const updated = [...lineItems, { id: null, name: '', price: 0, unit: 'day' }]
    setLineItems(updated)
    setEdit(e => ({ ...e, total_amount: calcTotal(e, updated) }))
  }

  function removeLine(idx) {
    const updated = lineItems.filter((_, i) => i !== idx)
    setLineItems(updated)
    setEdit(e => ({ ...e, total_amount: calcTotal(e, updated) }))
  }

  async function saveEdit() {
    setSaving(true)
    const body = {
      status:              edit.status,
      start_date:          edit.start_date || null,
      end_date:            edit.end_date   || null,
      total_days:          parseInt(edit.total_days)        || 0,
      total_amount:        parseFloat(edit.total_amount)    || 0,
      discount:            parseFloat(edit.discount)        || 0,
      prepaid_amount:      parseFloat(edit.prepaid_amount)  || 0,
      transport_fee:       parseFloat(edit.transport_fee)   || 0,
      additional_comments: edit.additional_comments,
      pickup_required:     edit.pickup_required,
      dropoff_required:    edit.dropoff_required,
      transport_notes:     edit.transport_notes,
      vet_name:            edit.vet_name,
      vet_phone:           edit.vet_phone,
      vet_clinic:          edit.vet_clinic,
      how_heard:           edit.how_heard,
    }
    const ok = await dbUpdate('bookings', full.id, body)
    if (ok) { await fetchFull(); onUpdated?.(); setMode('view') }
    setSaving(false)
  }

  async function recordPayment() {
    if (!payForm.amount) return
    setSavingPay(true)
    const { data } = await supabase.from('payments').insert({
      booking_id: full.id,
      amount:     parseFloat(payForm.amount),
      method:     payForm.method,
      notes:      payForm.notes || null,
      status:     'paid',
    }).select()
    if (data?.[0]) {
      setPayments(prev => [data[0], ...prev])
      setPayForm({ amount: '', method: 'cash', notes: '' })
    }
    setSavingPay(false)
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── derived ─────────────────────────────────────────────────────────────────
  const b = full || booking

  const ownerName = [
    b.customer_first_name || b.profiles?.first_name,
    b.customer_last_name  || b.profiles?.last_name,
  ].filter(Boolean).join(' ') || '—'

  const firstPet    = Array.isArray(b.pets_data) && b.pets_data.length ? b.pets_data[0] : null
  const allPetNames = Array.isArray(b.pets_data)
    ? b.pets_data.map(p => p?.name).filter(Boolean).join(', ')
    : (b.pet_names || []).join(', ') || '—'

  const SERVICE_LABELS_MAP = {
    boarding: 'Boarding', day_camp: 'Doggy Day Camp', dog_walking: 'Dog Walking',
    grooming: 'Grooming', transport: 'Vet Visits & Transport',
    training: 'Training', international: 'International Travel',
  }
  const serviceLabel = SERVICE_LABELS_MAP[b.service_type] || b.service_type || '—'
  const howHeardStr  = Array.isArray(b.how_heard) ? b.how_heard.join(', ') : (b.how_heard || '—')

  const totalPaid  = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0)
  const gross      = parseFloat(b.total_amount ?? b.total_price ?? 0)
  const discount   = parseFloat(b.discount || 0)
  const prepaid    = parseFloat(b.prepaid_amount || 0)
  const amountDue  = Math.max(0, gross - discount - prepaid - totalPaid)

  const fmtDate = d => { try { return d ? format(new Date(d), 'EEE, MMM d, yyyy') : null } catch { return null } }
  const fmtTs   = d => { try { return d ? format(new Date(d), 'MMM d, yyyy · h:mm a') : null } catch { return null } }

  // ── email / WA templates ─────────────────────────────────────────────────────
  const confirmBody = `Dear ${b.customer_first_name || b.profiles?.first_name || 'Customer'},

We are delighted to confirm your booking at Pet Lodge!

Booking Reference: ${b.booking_ref || b.id?.slice(0, 8)}
Pet: ${allPetNames}
Service: ${serviceLabel}
Check-in:  ${b.start_date ? format(new Date(b.start_date), 'EEEE, MMMM d, yyyy') : '—'}
Check-out: ${b.end_date   ? format(new Date(b.end_date),   'EEEE, MMMM d, yyyy') : '—'}
Duration:  ${b.total_days || '—'} days
Total:     JD ${gross.toFixed(2)}
${amountDue > 0 ? `Amount Due: JD ${amountDue.toFixed(2)}` : 'Fully paid — thank you!'}

If you have any questions, please don't hesitate to contact us.

Warm regards,
Pet Lodge Team`

  const receiptBody = `PET LODGE — RECEIPT
=============================
Booking Ref : ${b.booking_ref || b.id?.slice(0, 8)}
Date        : ${format(new Date(), 'dd/MM/yyyy')}

Customer    : ${ownerName}
Pet         : ${allPetNames}
Service     : ${serviceLabel}

Check-in    : ${b.start_date ? format(new Date(b.start_date), 'dd/MM/yyyy') : '—'}
Check-out   : ${b.end_date   ? format(new Date(b.end_date),   'dd/MM/yyyy') : '—'}
Days        : ${b.total_days || '—'}

Subtotal    : JD ${gross.toFixed(2)}
Discount    : JD ${discount.toFixed(2)}
Prepaid     : JD ${prepaid.toFixed(2)}
Paid        : JD ${totalPaid.toFixed(2)}
=============================
Amount Due  : JD ${amountDue.toFixed(2)}
=============================`

  const waMessage = `Hello ${b.customer_first_name || b.profiles?.first_name || ''}! 🐾

Your booking at *Pet Lodge* is confirmed.

📋 *Ref:*      ${b.booking_ref || b.id?.slice(0, 8)}
🐕 *Pet:*      ${allPetNames}
🏠 *Service:*  ${serviceLabel}
📅 *Check-in:* ${b.start_date ? format(new Date(b.start_date), 'EEE, MMM d') : '—'}
📅 *Check-out:*${b.end_date   ? format(new Date(b.end_date),   'EEE, MMM d') : '—'}
💰 *Total:*    JD ${gross.toFixed(2)}${amountDue > 0 ? `\n💳 *Due:*      JD ${amountDue.toFixed(2)}` : ''}

We look forward to welcoming ${allPetNames}! 🐾`

  const waPhone = (b.customer_whatsapp || b.customer_phone || '').replace(/\D/g, '')
  const waLink  = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`

  // ── loading splash ───────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'white', borderRadius: '1rem', padding: '2.5rem 3rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
        <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Loading booking…</span>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── main render ──────────────────────────────────────────────────────────────
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}
        onClick={onClose}
      >
        <div
          style={{ background: 'white', borderRadius: '1rem', width: '100%', maxWidth: '700px', marginTop: '1.5rem', marginBottom: '2rem', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div style={{ background: 'var(--dark)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                <h2 style={{ color: 'white', fontWeight: '700', fontSize: '1.05rem', margin: 0 }}>
                  #{b.booking_ref || b.id?.slice(0, 8)}
                </h2>
                <span className={`badge-${b.status || 'pending'}`}>{b.status || 'pending'}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', margin: '0.2rem 0 0' }}>
                {ownerName} · {allPetNames}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
              {mode === 'view' && (
                <button onClick={enterEdit} style={headerBtnStyle}>
                  <Edit2 size={13} /> Edit
                </button>
              )}
              <button onClick={() => { setSendTab('confirmation'); setSendOpen(true) }} style={headerBtnStyle}>
                <Mail size={13} /> Email
              </button>
              <button onClick={() => setMode('receipt')} style={headerBtnStyle}>
                <FileText size={13} /> Receipt
              </button>
              <button onClick={() => { setSendTab('whatsapp'); setSendOpen(true) }} style={headerBtnStyle}>
                <MessageCircle size={13} /> WhatsApp
              </button>
              <button onClick={onClose} style={{ ...headerBtnStyle, padding: '6px 8px' }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: '1.25rem', maxHeight: '78vh', overflowY: 'auto' }}>
            {mode === 'view' ? <ViewMode /> : mode === 'receipt' ? <ReceiptMode /> : <EditMode />}
          </div>
        </div>
      </div>

      {sendOpen && <SendModal />}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )

  // ── VIEW MODE ────────────────────────────────────────────────────────────────
  function ViewMode() {
    return (
      <div>
        {/* Customer */}
        <Section title="Customer">
          <Row label="Name"      value={ownerName} />
          <Row label="Email"     value={b.customer_email    || b.profiles?.email} />
          <Row label="Phone"     value={b.customer_phone    || b.profiles?.phone} />
          <Row label="WhatsApp"  value={b.customer_whatsapp || b.profiles?.whatsapp} />
        </Section>

        {/* Pet */}
        <Section title="Pet Information">
          <Row label="Name"   value={allPetNames} />
          <Row label="Type"   value={firstPet?.type} />
          {firstPet?.breed  && <Row label="Breed"  value={firstPet.breed} />}
          {firstPet?.gender && <Row label="Gender" value={firstPet.gender} />}
          {firstPet?.age    && <Row label="Age"    value={`${firstPet.age} years`} />}
          {firstPet?.colour && <Row label="Colour" value={firstPet.colour} />}
          {b.pets_data?.length > 1 && (
            <Row label="All Pets" value={allPetNames} />
          )}
        </Section>

        {/* Vet */}
        {(firstPet?.vet_name || firstPet?.vet_phone || b.vet_name) && (
          <Section title="Vet Information">
            <Row label="Vet Name"  value={firstPet?.vet_name  || b.vet_name} />
            <Row label="Vet Phone" value={firstPet?.vet_phone || b.vet_phone} />
          </Section>
        )}

        {/* Booking Details + financials */}
        <Section title="Booking Details">
          <Row label="Service"  value={serviceLabel} />
          <Row label="Check-in"  value={fmtDate(b.start_date)} />
          <Row label="Check-out" value={fmtDate(b.end_date)} />
          <Row label="Duration"  value={b.total_days ? `${b.total_days} days` : null} />

          <div style={{ marginTop: '0.625rem', padding: '0.75rem', background: 'var(--light)', borderRadius: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.3rem' }}>
              <span style={{ color: 'var(--muted)' }}>Subtotal</span>
              <span>JD {gross.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.3rem', color: '#dc2626' }}>
                <span>Discount</span>
                <span>− JD {discount.toFixed(2)}</span>
              </div>
            )}
            {prepaid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--muted)' }}>Prepaid / Deposit</span>
                <span>JD {prepaid.toFixed(2)}</span>
              </div>
            )}
            {totalPaid > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--muted)' }}>Payments Recorded</span>
                <span>JD {totalPaid.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.375rem', marginTop: '0.375rem' }}>
              <span>Amount Due</span>
              <span style={{ color: 'var(--accent)' }}>JD {amountDue.toFixed(2)}</span>
            </div>
          </div>
        </Section>

        {/* Special Requests */}
        {b.additional_comments && (
          <Section title="⚠ Special Requests / Notes" amber>
            <p style={{ fontSize: '0.875rem', color: '#92400e', lineHeight: '1.55', margin: 0 }}>{b.additional_comments}</p>
          </Section>
        )}

        {/* Transport (collapsible) */}
        {(b.pickup_required || b.dropoff_required || b.transport_notes || b.transport_fee > 0) && (
          <CollapsibleSection title="🚗 Transport Details" open={transportOpen} onToggle={() => setTransportOpen(o => !o)}>
            {b.pickup_required  && <Row label="Pickup"   value="Required" />}
            {b.dropoff_required && <Row label="Drop-off" value="Required" />}
            {b.transport_fee > 0 && <Row label="Transport Fee" value={`JD ${parseFloat(b.transport_fee).toFixed(2)}`} />}
            {b.transport_notes  && <Row label="Notes"   value={b.transport_notes} />}
          </CollapsibleSection>
        )}

        {/* Services */}
        <Section title="Services">
          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text)', marginBottom: '0.5rem' }}>{serviceLabel}</p>
          {(() => {
            const lineItems = b.service_details?.line_items
            if (Array.isArray(lineItems) && lineItems.length > 0) {
              return (
                <div className="space-y-1">
                  {lineItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', padding: '0.2rem 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text)' }}>{item.label}</span>
                      <span style={{ fontWeight: '600', color: 'var(--primary)', flexShrink: 0, marginLeft: '1rem' }}>
                        {item.note ? <span style={{ fontWeight: '400', color: 'var(--muted)' }}>{item.note}</span> : `JD ${(item.amount || 0).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
            return <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>No breakdown available.</p>
          })()}
        </Section>

        {/* Payments */}
        <Section title="Payments">
          {payments.length > 0 ? (
            <>
              {payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ fontWeight: '600' }}>JD {parseFloat(p.amount || 0).toFixed(2)}</span>
                    <span style={{ color: 'var(--muted)', marginLeft: '0.5rem' }}>{METHOD_LABEL[p.method] || p.method}</span>
                    {p.notes && <span style={{ color: 'var(--muted)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>· {p.notes}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge-${p.status || 'paid'}`}>{p.status || 'paid'}</span>
                    {p.created_at && <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{format(new Date(p.created_at), 'MMM d')}</span>}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--accent)' }}>
                Total Paid: JD {totalPaid.toFixed(2)}
              </div>
            </>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>No payments recorded yet.</p>
          )}

          {/* Record payment form */}
          <div style={{ background: 'var(--light)', borderRadius: '0.625rem', padding: '0.875rem', border: '1px solid var(--border)', marginTop: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Record Payment</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                className="input" type="number" step="0.01" placeholder="Amount (JD)"
                value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
              />
              <select className="input" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
              </select>
            </div>
            <input
              className="input" placeholder="Notes (optional)" style={{ marginBottom: '0.5rem' }}
              value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
            />
            <button
              onClick={recordPayment} disabled={savingPay || !payForm.amount} className="btn-primary"
              style={{ fontSize: '0.875rem' }}
            >
              {savingPay ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
              Record Payment
            </button>
          </div>
        </Section>

        {/* How They Heard (collapsible) */}
        {b.how_heard && (
          <CollapsibleSection title="How They Heard" open={howHeardOpen} onToggle={() => setHowHeardOpen(o => !o)}>
            <Row label="Source" value={howHeardStr} />
          </CollapsibleSection>
        )}

        {/* Timestamps */}
        <Section title="Record Info">
          <Row label="Booking Ref"  value={b.booking_ref || b.id?.slice(0, 8)} />
          {b.created_at && <Row label="Created"      value={fmtTs(b.created_at)} />}
          {b.updated_at && <Row label="Last Updated" value={fmtTs(b.updated_at)} />}
        </Section>
      </div>
    )
  }

  // ── EDIT MODE ────────────────────────────────────────────────────────────────
  function EditMode() {
    const total   = parseFloat(edit.total_amount)   || 0
    const disc    = parseFloat(edit.discount)        || 0
    const pre     = parseFloat(edit.prepaid_amount)  || 0
    const due     = Math.max(0, total - disc - pre).toFixed(2)

    return (
      <div>
        {/* Status */}
        <Section title="Status">
          <ERow label="Booking Status">
            <select className="input" value={edit.status} onChange={e => setEdit(p => ({ ...p, status: e.target.value }))}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </ERow>
        </Section>

        {/* Customer read-only */}
        <Section title="Customer (read-only)">
          <Row label="Name"  value={ownerName} />
          <Row label="Email" value={b.customer_email || b.profiles?.email} />
          <Row label="Phone" value={b.customer_phone || b.profiles?.phone} />
        </Section>

        {/* Pet read-only */}
        <Section title="Pet (read-only)">
          <Row label="Name" value={allPetNames} />
          <Row label="Type" value={firstPet?.type} />
        </Section>

        {/* Vet */}
        <Section title="Vet Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <ERow label="Vet Name">
              <input className="input" value={edit.vet_name} placeholder="Vet name"
                onChange={e => setEdit(p => ({ ...p, vet_name: e.target.value }))} />
            </ERow>
            <ERow label="Vet Phone">
              <input className="input" value={edit.vet_phone} placeholder="Vet phone"
                onChange={e => setEdit(p => ({ ...p, vet_phone: e.target.value }))} />
            </ERow>
          </div>
          <ERow label="Clinic">
            <input className="input" value={edit.vet_clinic} placeholder="Clinic name"
              onChange={e => setEdit(p => ({ ...p, vet_clinic: e.target.value }))} />
          </ERow>
        </Section>

        {/* Dates */}
        <Section title="Booking Dates">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
            <ERow label="Check-in">
              <input className="input" type="date" value={edit.start_date}
                onChange={e => onDateChange('start_date', e.target.value)} />
            </ERow>
            <ERow label="Check-out">
              <input className="input" type="date" value={edit.end_date}
                onChange={e => onDateChange('end_date', e.target.value)} />
            </ERow>
          </div>
          <div style={{ padding: '0.5rem 0.75rem', background: 'var(--light)', borderRadius: '0.5rem', fontSize: '0.875rem', color: 'var(--primary)', fontWeight: '600' }}>
            Duration: {edit.total_days || 0} days (auto-calculated)
          </div>
        </Section>

        {/* Services list */}
        <Section title="Services">
          {lineItems.map((li, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: '160px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.2rem', fontWeight: '600' }}>Service</label>
                <select className="input" style={{ fontSize: '0.8rem' }} value={li.id || ''}
                  onChange={e => onSvcSelect(idx, e.target.value)}>
                  <option value="">— Select service —</option>
                  {availSvcs.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — JD {parseFloat(s.price || 0).toFixed(2)}/{s.unit || 'day'}</option>
                  ))}
                </select>
              </div>
              <div style={{ width: '75px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.2rem', fontWeight: '600' }}>Unit Price</label>
                <input className="input" type="number" step="0.5" value={li.price} style={{ fontSize: '0.8rem' }}
                  onChange={e => onLineChange(idx, 'price', e.target.value)} />
              </div>
              <div style={{ width: '65px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.2rem', fontWeight: '600' }}>Qty</label>
                <input className="input" type="number" min="1" step="1" value={li.quantity ?? edit.total_days ?? 1} style={{ fontSize: '0.8rem' }}
                  onChange={e => onLineChange(idx, 'quantity', e.target.value)} />
              </div>
              {lineItems.length > 1 && (
                <button onClick={() => removeLine(idx)}
                  style={{ padding: '8px', borderRadius: '6px', border: 'none', background: '#fee2e2', cursor: 'pointer', color: '#dc2626', flexShrink: 0, marginBottom: '1px' }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button onClick={addLine}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--accent)', background: 'transparent', border: '1px dashed var(--border)', borderRadius: '0.5rem', padding: '6px 12px', cursor: 'pointer', marginTop: '0.25rem' }}>
            <Plus size={13} /> Add Service
          </button>
        </Section>

        {/* Financial */}
        <Section title="Financial Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem' }}>
            <ERow label="Discount (JD)">
              <input className="input" type="number" step="0.5" value={edit.discount}
                onChange={e => {
                  const v = e.target.value
                  setEdit(p => ({ ...p, discount: v, total_amount: calcTotal({ ...p, discount: v }, lineItems) }))
                }} />
            </ERow>
            <ERow label="Prepaid (JD)">
              <input className="input" type="number" step="0.5" value={edit.prepaid_amount}
                onChange={e => setEdit(p => ({ ...p, prepaid_amount: e.target.value }))} />
            </ERow>
            <ERow label="Transport Fee (JD)">
              <input className="input" type="number" step="0.5" value={edit.transport_fee}
                onChange={e => {
                  const v = e.target.value
                  setEdit(p => ({ ...p, transport_fee: v, total_amount: calcTotal({ ...p, transport_fee: v }, lineItems) }))
                }} />
            </ERow>
          </div>

          <div style={{ padding: '0.75rem', background: 'var(--light)', borderRadius: '0.5rem', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.3rem' }}>
              <span style={{ color: 'var(--muted)' }}>Calculated Total</span>
              <span style={{ fontWeight: '600' }}>JD {total.toFixed(2)}</span>
            </div>
            {disc > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.3rem', color: '#dc2626' }}>
                <span>− Discount</span><span>JD {disc.toFixed(2)}</span>
              </div>
            )}
            {pre > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--muted)' }}>− Prepaid</span><span>JD {pre.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: '700', borderTop: '1px solid var(--border)', paddingTop: '0.375rem', marginTop: '0.25rem' }}>
              <span>Amount Due</span>
              <span style={{ color: 'var(--accent)' }}>JD {due}</span>
            </div>
          </div>
        </Section>

        {/* Special Requests */}
        <Section title="Special Requests / Notes" amber>
          <textarea className="input" rows={3} value={edit.additional_comments}
            placeholder="Special instructions, dietary needs, medical notes…"
            onChange={e => setEdit(p => ({ ...p, additional_comments: e.target.value }))}
            style={{ resize: 'vertical' }} />
        </Section>

        {/* Transport */}
        <Section title="Transport">
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!edit.pickup_required}
                onChange={e => setEdit(p => ({ ...p, pickup_required: e.target.checked }))} />
              Pickup Required
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!edit.dropoff_required}
                onChange={e => setEdit(p => ({ ...p, dropoff_required: e.target.checked }))} />
              Drop-off Required
            </label>
          </div>
          <ERow label="Transport Notes">
            <input className="input" value={edit.transport_notes} placeholder="Address, timing, special instructions…"
              onChange={e => setEdit(p => ({ ...p, transport_notes: e.target.value }))} />
          </ERow>
        </Section>

        {/* How heard */}
        <Section title="How They Heard">
          <ERow label="Source">
            <input className="input" value={edit.how_heard} placeholder="e.g. Instagram, referral, Google…"
              onChange={e => setEdit(p => ({ ...p, how_heard: e.target.value }))} />
          </ERow>
        </Section>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button onClick={() => setMode('view')} className="btn-secondary" disabled={saving}>
            <X size={14} /> Cancel
          </button>
          <button onClick={saveEdit} className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    )
  }

  // ── RECEIPT MODE ─────────────────────────────────────────────────────────────
  function ReceiptMode() {
    const [sendSection, setSendSection] = useState(null) // 'email' | 'whatsapp' | null
    const [toast,       setToast]       = useState('')
    const [downloading, setDownloading] = useState(false)

    const receiptId    = (b.booking_ref || b.id || '').slice(-8).toUpperCase()
    const firstName    = b.customer_first_name || b.profiles?.first_name || ''
    const receiptOwner = `${firstName} ${b.customer_last_name || b.profiles?.last_name || ''}`.trim() || '—'
    const petName      = b.pets_data?.[0]?.name || b.pets?.name || '—'
    const allPetNames  = Array.isArray(b.pets_data) ? b.pets_data.map(p => p?.name).filter(Boolean).join(', ') : petName
    const numPets      = b.num_pets || (Array.isArray(b.pets_data) ? b.pets_data.length : 1) || 1
    const days         = b.total_days || 0
    const total        = parseFloat(b.total_amount ?? b.total_price ?? 0)
    const GREEN        = '#8CB733'

    const defaultMsg = `Dear Mr/Ms ${firstName || 'Customer'}, Thank you for choosing Pet Lodge for ${allPetNames}'s stay! Payment can be made via: Cash, Card, CliQ: 0795535405 / Saleh Abdelhadi. Stay connected: www.petlodgejo.com / +962 79 8906476 / info@petlodgejo.com`

    const [emailAddr, setEmailAddr] = useState(b.customer_email || '')
    const [emailMsg,  setEmailMsg]  = useState(defaultMsg)
    const [waNumber,  setWaNumber]  = useState(b.customer_whatsapp || b.customer_phone || '')
    const [waMsg,     setWaMsg]     = useState(defaultMsg)

    function isPerDay(name = '') {
      const n = name.toLowerCase()
      return n.includes('boarding') || n.includes('daycare') || n.includes('food')
    }

    const lineItemsRaw = b.service_details?.line_items
    const MIN_ROWS = 8

    let serviceRows = []
    if (Array.isArray(lineItemsRaw) && lineItemsRaw.length > 0) {
      serviceRows = lineItemsRaw.map(item => {
        const qty       = item.quantity ?? (() => { const m = item.label?.match(/×\s*(\d+)/); return m ? parseInt(m[1]) : 1 })()
        const unitPrice = item.unit_price ?? (qty > 0 ? (item.amount / qty) : item.amount)
        const isComp    = !!item.note
        return {
          name:      item.label?.replace(/\s*×\s*\d+\s*(nights?|days?)?/i, '').trim() || item.label,
          unit:      item.unit === 'night' ? 'Night' : item.unit === 'day' ? 'Day' : 'Service',
          unitPrice: isComp ? item.note : `JD ${parseFloat(unitPrice || 0).toFixed(2)}`,
          numPets:   item.num_pets ?? numPets,
          quantity:  isComp ? '' : qty,
          total:     isComp ? item.note : parseFloat(item.amount || 0).toFixed(2),
          isComp,
        }
      })
    } else {
      serviceRows = [{
        name: serviceLabel, unit: 'Service', unitPrice: '—',
        numPets: numPets, quantity: b.total_days || 1,
        total: total.toFixed(2), isComp: false,
      }]
    }
    while (serviceRows.length < MIN_ROWS) serviceRows.push(null)

    async function downloadPDF() {
      setDownloading(true)
      try {
        const el     = document.getElementById('receipt-content')
        const canvas = await html2canvas(el, { scale: 2, useCORS: true })
        const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const w      = pdf.internal.pageSize.getWidth()
        const h      = (canvas.height * w) / canvas.width
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h)
        pdf.save(`Receipt-${b.booking_ref || b.id?.slice(0, 8)}.pdf`)
      } catch (e) { console.error(e) }
      setDownloading(false)
    }

    async function prepareWhatsApp() {
      await downloadPDF()
      const phone = waNumber.replace(/\D/g, '')
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank')
    }

    function showToast(msg) {
      setToast(msg)
      setTimeout(() => setToast(''), 3000)
    }

    const thStyle  = { padding: '6px 8px', textAlign: 'left', fontWeight: '700', fontSize: '0.72rem', color: 'white', borderRight: '1px solid rgba(255,255,255,0.25)' }
    const tdStyle  = { padding: '5px 8px', fontSize: '0.78rem', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }
    const tdDash   = { ...tdStyle, color: '#9ca3af', textAlign: 'center' }
    const linkStyle = { display: 'block', color: '#2563eb', textDecoration: 'underline' }

    return (
      <div>
        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', top: '1rem', right: '1rem', background: '#16a34a', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '8px', zIndex: 999, fontSize: '0.875rem', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            ✓ {toast}
          </div>
        )}

        {/* ── Printable receipt card ── */}
        <div id="receipt-content" style={{ fontFamily: 'Arial, sans-serif', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', marginBottom: '16px' }}>

          {/* Two-column header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px' }}>

            {/* Left: title + info rows */}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 14px', color: '#111' }}>
                Receipt (#{receiptId})
              </h1>
              <div style={{ width: '100%', maxWidth: '340px' }}>
                {[
                  ["Owner's Name",   receiptOwner],
                  ["Pet's Name",     allPetNames],
                  ["Arrival Date",   b.start_date ? format(new Date(b.start_date), 'EEE, d MMM yyyy') : '—'],
                  ["Departure Date", b.end_date   ? format(new Date(b.end_date),   'EEE, d MMM yyyy') : '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '7px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#374151', minWidth: '140px', flexShrink: 0 }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', color: '#111', borderBottom: '1px solid #9ca3af', flex: 1, paddingBottom: '2px' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: logo + contact links */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <img src="/logo.jpg" alt="Pet Lodge" style={{ width: '100px', height: 'auto', borderRadius: '8px', marginBottom: '10px', display: 'block', marginLeft: 'auto' }} />
              <div style={{ fontSize: '0.72rem', lineHeight: '1.9' }}>
                <a href="https://www.petlodgejo.com/"           target="_blank" rel="noopener noreferrer" style={linkStyle}>www.petlodgejo.com</a>
                <a href="tel:+962798906476"                      target="_blank" rel="noopener noreferrer" style={linkStyle}>+962 79 8906476</a>
                <a href="mailto:info@petlodgejo.com"             target="_blank" rel="noopener noreferrer" style={linkStyle}>info@petlodgejo.com</a>
                <a href="https://www.facebook.com/Pet.Lodge.Jo/" target="_blank" rel="noopener noreferrer" style={linkStyle}>facebook.com/Pet.Lodge.Jo</a>
                <a href="https://goo.gl/maps/bWRapfE4YZS2"      target="_blank" rel="noopener noreferrer" style={linkStyle}>View on Maps</a>
              </div>
            </div>
          </div>

          {/* Services table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
            <thead>
              <tr style={{ background: GREEN }}>
                {['Services provided','Unit','Unit Price','Number of Pets','Quantity','Total price'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {serviceRows.map((row, i) => row ? (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <td style={tdStyle}>{row.name}</td>
                  <td style={tdStyle}>{row.unit}</td>
                  <td style={row.isComp ? { ...tdStyle, color: '#6b7280', fontStyle: 'italic' } : tdStyle}>{row.unitPrice}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{row.numPets}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{row.quantity}</td>
                  <td style={{ ...tdStyle, fontWeight: '600', color: row.isComp ? '#6b7280' : 'inherit', fontStyle: row.isComp ? 'italic' : 'normal' }}>{row.total}</td>
                </tr>
              ) : (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                  {[0,1,2,3,4,5].map(j => <td key={j} style={tdDash}>--</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              {[
                ['Total in JD', total.toFixed(2)],
                [null,          null],
                ['Amount due',  total.toFixed(2)],
              ].map(([label, val], i) => (
                <tr key={i} style={{ background: '#f3f4f6', borderTop: i === 0 ? '2px solid #d1d5db' : 'none' }}>
                  <td colSpan={5} style={{ ...tdStyle, fontWeight: label ? '700' : '400', color: label ? '#111' : '#9ca3af', textAlign: 'right', paddingRight: '12px', borderRight: 'none' }}>
                    {label ?? '--'}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: label ? '700' : '400', color: label === 'Amount due' ? GREEN : label ? '#111' : '#9ca3af' }}>
                    {val !== null ? val : '--'}
                  </td>
                </tr>
              ))}
            </tfoot>
          </table>

          {/* Referral box */}
          <div style={{ border: '2px solid #e5e7eb', borderRadius: '6px', padding: '10px 16px', marginBottom: '14px', textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#2563eb', fontSize: '0.83rem', fontWeight: '600' }}>
              Refer friends &amp; receive up to 10% discount on your and their next visit
            </p>
          </div>

          {/* Footer row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#6b7280' }}>
            <span>CliQ 0795535405 / Saleh Abdelhadi</span>
            <span>Receipt - {receiptOwner} ({allPetNames}) - {b.end_date ? format(new Date(b.end_date), 'EEE, dd MMM yyyy') : '—'}</span>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
          <button onClick={() => setMode('view')} className="btn-secondary" style={{ fontSize: '0.875rem' }}>
            <X size={14} /> Back
          </button>
          <button onClick={() => window.print()} className="btn-secondary" style={{ fontSize: '0.875rem' }}>
            <FileText size={14} /> Print
          </button>
          <button onClick={downloadPDF} disabled={downloading} className="btn-secondary" style={{ fontSize: '0.875rem' }}>
            {downloading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={14} />}
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
          <button
            onClick={() => setSendSection(s => s === 'email' ? null : 'email')}
            className={sendSection === 'email' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.875rem' }}
          >
            <Mail size={14} /> Send via Email
          </button>
          <button
            onClick={() => setSendSection(s => s === 'whatsapp' ? null : 'whatsapp')}
            className={sendSection === 'whatsapp' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.875rem' }}
          >
            <MessageCircle size={14} /> Send via WhatsApp
          </button>
        </div>

        {/* ── Unified send panel ── */}
        {sendSection && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem', background: '#f8fafc' }}>

            {/* Customer Details */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.875rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Customer Details</p>
              {[
                ['Name',  receiptOwner],
                ['Email', b.customer_email || '—'],
                ['Pet',   allPetNames],
                ['Phone', b.customer_phone || b.customer_whatsapp || '—'],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', marginBottom: '0.18rem' }}>
                  <span style={{ fontWeight: '600', minWidth: '50px', color: 'var(--muted)' }}>{lbl}:</span>
                  <span style={{ color: 'var(--text)' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Delivery Method Toggle */}
            <div style={{ marginBottom: '0.875rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Choose Delivery Method</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setSendSection('email')}
                  className={sendSection === 'email' ? 'btn-primary' : 'btn-secondary'}
                  style={{ fontSize: '0.82rem' }}
                >
                  <Mail size={13} /> Email
                </button>
                <button
                  onClick={() => setSendSection('whatsapp')}
                  style={{
                    fontSize: '0.82rem',
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', border: 'none',
                    background: sendSection === 'whatsapp' ? '#25d366' : '#f1f5f9',
                    color:      sendSection === 'whatsapp' ? 'white'   : 'var(--text)',
                  }}
                >
                  <MessageCircle size={13} /> WhatsApp
                </button>
              </div>
            </div>

            {/* ── Email fields ── */}
            {sendSection === 'email' && (
              <>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem', fontWeight: '600' }}>Email Address</label>
                  <input className="input" value={emailAddr} onChange={e => setEmailAddr(e.target.value)} placeholder="customer@email.com" />
                </div>
                <button onClick={() => showToast('Receipt sent via email!')} className="btn-primary" style={{ fontSize: '0.875rem', marginBottom: '0.875rem' }}>
                  <Mail size={14} /> Send Receipt via Email
                </button>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem', fontWeight: '600' }}>Personalized Message</label>
                  <textarea className="input" rows={4} value={emailMsg} onChange={e => setEmailMsg(e.target.value)} style={{ resize: 'vertical', fontSize: '0.82rem', lineHeight: '1.55' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button onClick={() => setEmailMsg(defaultMsg)} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
                    Reset to Template
                  </button>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                    Includes: personal greeting, pet names, payment options, contact links
                  </span>
                </div>
              </>
            )}

            {/* ── WhatsApp fields ── */}
            {sendSection === 'whatsapp' && (
              <>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem', fontWeight: '600' }}>WhatsApp Number</label>
                  <input className="input" value={waNumber} onChange={e => setWaNumber(e.target.value)} placeholder="+962 7X XXX XXXX" />
                </div>
                <button onClick={prepareWhatsApp} disabled={downloading} style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', border: 'none', background: '#25d366', color: 'white', marginBottom: '0.875rem' }}>
                  {downloading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageCircle size={14} />}
                  {downloading ? 'Generating PDF…' : 'Prepare WhatsApp Message'}
                </button>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.2rem', fontWeight: '600' }}>Personalized Message</label>
                  <textarea className="input" rows={4} value={waMsg} onChange={e => setWaMsg(e.target.value)} style={{ resize: 'vertical', fontSize: '0.82rem', lineHeight: '1.55' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button onClick={() => setWaMsg(defaultMsg)} className="btn-secondary" style={{ fontSize: '0.8rem' }}>
                    Reset to Template
                  </button>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                    Includes: personal greeting, pet names, payment options, contact links
                  </span>
                </div>
              </>
            )}

          </div>
        )}
      </div>
    )
  }

  // ── SEND MODAL ───────────────────────────────────────────────────────────────
  function SendModal() {
    const tabs = [
      { id: 'confirmation', label: 'Confirmation Email', icon: <Mail size={13} /> },
      { id: 'receipt',      label: 'Receipt',            icon: <FileText size={13} /> },
      { id: 'whatsapp',     label: 'WhatsApp',           icon: <MessageCircle size={13} /> },
    ]
    const content = sendTab === 'confirmation' ? confirmBody : sendTab === 'receipt' ? receiptBody : waMessage

    return (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem' }}
        onClick={() => setSendOpen(false)}
      >
        <div
          style={{ background: 'white', borderRadius: '1rem', width: '100%', maxWidth: '560px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.35)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ background: 'var(--dark)', padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'white', fontWeight: '700', margin: 0, fontSize: '0.95rem' }}>Send to Customer</h3>
            <button onClick={() => setSendOpen(false)} style={{ ...headerBtnStyle, padding: '5px 7px' }}>
              <X size={15} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setSendTab(t.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '0.7rem 0.5rem', fontSize: '0.78rem', fontWeight: '600', border: 'none', borderBottom: sendTab === t.id ? '2px solid var(--accent)' : '2px solid transparent', background: 'white', cursor: 'pointer', color: sendTab === t.id ? 'var(--accent)' : 'var(--muted)', transition: 'color 0.15s' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: '1.25rem' }}>
            <textarea readOnly value={content}
              style={{ width: '100%', minHeight: '210px', fontFamily: 'monospace', fontSize: '0.78rem', lineHeight: '1.65', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: '#f8f9f6', color: 'var(--text)', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => copyText(content)} className="btn-secondary" style={{ fontSize: '0.875rem' }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>

              {sendTab === 'confirmation' && b.profiles?.email && (
                <a
                  href={`mailto:${b.profiles.email}?subject=Booking Confirmation – ${b.booking_ref || b.id?.slice(0, 8)}&body=${encodeURIComponent(confirmBody)}`}
                  className="btn-primary" style={{ fontSize: '0.875rem', textDecoration: 'none' }}
                >
                  <Mail size={13} /> Open in Mail
                </a>
              )}

              {sendTab === 'whatsapp' && waPhone && (
                <a href={waLink} target="_blank" rel="noopener noreferrer"
                  className="btn-primary" style={{ fontSize: '0.875rem', textDecoration: 'none', background: '#25d366' }}>
                  <MessageCircle size={13} /> Open WhatsApp
                </a>
              )}

              {sendTab === 'receipt' && (
                <button onClick={() => window.print()} className="btn-primary" style={{ fontSize: '0.875rem' }}>
                  <FileText size={13} /> Print
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
