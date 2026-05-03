import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Loader2, PawPrint } from 'lucide-react'
import { format } from 'date-fns'
import TopNav from '../../components/TopNav'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../lib/supabase'

const SERVICE_LABELS = {
  boarding:      'Boarding',
  day_camp:      'Doggy Day Camp',
  daycamp:       'Doggy Day Camp',
  dog_walking:   'Dog Walking',
  dogwalking:    'Dog Walking',
  grooming:      'Grooming',
  training:      'Training',
  transport:     'Vet Visits & Transport',
  vet_transport: 'Vet Visits & Transport',
  international: 'International Travel',
}

const STATUS_STYLES = {
  pending:   { bg: '#fef9c3', color: '#854d0e',  label: 'Pending' },
  confirmed: { bg: '#dcfce7', color: '#166534',  label: 'Confirmed' },
  cancelled: { bg: '#fee2e2', color: '#991b1b',  label: 'Cancelled' },
  completed: { bg: '#e0e7ff', color: '#3730a3',  label: 'Completed' },
}

const METHOD_LABEL = {
  cash:          'Cash',
  card:          'Card',
  bank_transfer: 'Bank Transfer',
  cliq:          'CliQ',
  online:        'Online',
}

function fmtDate(d) {
  if (!d) return null
  try { return format(new Date(d), 'EEE, d MMM yyyy') } catch { return null }
}

function fmtAmt(val) {
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2)
}

function SectionTitle({ children }) {
  return (
    <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
      {children}
    </p>
  )
}

export default function BookingDetail() {
  const { bookingRef } = useParams()
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error,    setError]    = useState('')
  const [booking,  setBooking]  = useState(null)
  const [payments, setPayments] = useState([])

  useEffect(() => {
    if (!bookingRef) return
    load()
  }, [bookingRef])

  async function load() {
    setLoading(true)
    setError('')
    setNotFound(false)
    try {
      const token = getAccessToken()
      const headers = {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }

      const bRes = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?booking_ref=eq.${encodeURIComponent(bookingRef)}&select=*`,
        { headers }
      )
      if (!bRes.ok) {
        setError("Couldn't load booking. Please try again.")
        setLoading(false)
        return
      }
      const bData = await bRes.json()
      if (!Array.isArray(bData) || bData.length === 0) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const b = bData[0]
      setBooking(b)

      const pRes = await fetch(
        `${SUPABASE_URL}/rest/v1/payments?booking_id=eq.${b.id}&select=*&order=created_at.desc`,
        { headers }
      )
      if (pRes.ok) {
        const pData = await pRes.json()
        setPayments(Array.isArray(pData) ? pData : [])
      }
    } catch {
      setError("Couldn't load booking. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#f8f9f6' }}>
        <TopNav />
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading booking…</p>
        </div>
      </div>
    )
  }

  if (notFound || error) {
    return (
      <div className="min-h-screen" style={{ background: '#f8f9f6' }}>
        <TopNav />
        <div className="max-w-3xl mx-auto px-4 py-8">
          <Link to="/my-bookings" className="inline-flex items-center gap-1 text-sm mb-6"
            style={{ color: 'var(--muted)' }}>
            <ChevronLeft size={15} /> Back to My Bookings
          </Link>
          <div className="card text-center py-16">
            <p className="font-semibold text-lg mb-2" style={{ color: 'var(--text)' }}>
              {error || "Booking not found, or you don't have access to it."}
            </p>
            <Link to="/my-bookings" className="btn-secondary inline-flex mt-4">
              Back to My Bookings
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const b = booking
  const statusStyle  = STATUS_STYLES[b.status] || { bg: '#f3f4f6', color: '#374151', label: b.status }
  const serviceLabel = SERVICE_LABELS[b.service_type] || b.service_type || '—'
  const pets         = Array.isArray(b.pets_data) ? b.pets_data.filter(Boolean) : []

  // ── Pricing ────────────────────────────────────────────────────────────────
  const lineItems    = b.service_details?.line_items || []
  const sdSum        = lineItems.reduce((s, li) => s + (parseFloat(li.amount) || 0), 0)
  const gross        = Number(b.subtotal) > 0
    ? Number(b.subtotal)
    : sdSum > 0 ? sdSum : parseFloat(b.total_amount ?? 0)
  const discount     = Number(b.discount) || parseFloat(b.service_details?.discount_amount || 0)
  const total        = parseFloat(b.total_amount ?? 0)

  // ── Payments ───────────────────────────────────────────────────────────────
  const prepaid      = parseFloat(b.prepaid_amount || 0)
  const totalPaid    = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0) + prepaid
  const balanceDue   = Math.max(0, total - totalPaid)
  const paymentBadge = balanceDue <= 0 && totalPaid > 0
    ? { label: 'Paid in full',    bg: '#d1fae5', color: '#065f46' }
    : totalPaid > 0
    ? { label: 'Partially paid',  bg: '#fef3c7', color: '#92400e' }
    : { label: 'Pending payment', bg: '#eef4e2', color: '#3B6D11' }

  // ── Notes (customer-submitted only) ────────────────────────────────────────
  const notes = []
  if (b.additional_comments) {
    notes.push({ label: 'Additional notes', text: b.additional_comments })
  }
  pets.forEach(pet => {
    const medText = pet.medication_notes || pet.medication
    if (medText) notes.push({ label: `Medication (${pet.name || 'pet'})`, text: medText })
  })
  const perPet = Array.isArray(b.service_details?.perPet) ? b.service_details.perPet : []
  perPet.forEach(pp => {
    const n = pp.petName || 'pet'
    if (pp.foodNotes)     notes.push({ label: `Food (${n})`,           text: pp.foodNotes })
    if (pp.walkerNotes)   notes.push({ label: `Walker notes (${n})`,   text: pp.walkerNotes })
    if (pp.trainingGoals) notes.push({ label: `Training goals (${n})`, text: pp.trainingGoals })
  })

  // ── Transport ──────────────────────────────────────────────────────────────
  const hasTransport = b.pickup_required || b.dropoff_required || parseFloat(b.transport_fee || 0) > 0

  return (
    <div className="min-h-screen" style={{ background: '#f8f9f6' }}>
      <TopNav />
      <div className="max-w-3xl mx-auto px-4 py-8">

        <Link to="/my-bookings" className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: 'var(--muted)' }}>
          <ChevronLeft size={15} /> Back to My Bookings
        </Link>

        {/* ── Header ── */}
        <div className="card mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-sm font-bold" style={{ color: 'var(--primary)' }}>
                  #{b.booking_ref}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: statusStyle.bg, color: statusStyle.color }}>
                  {statusStyle.label}
                </span>
              </div>
              <p className="font-bold text-xl mb-0.5" style={{ color: 'var(--text)' }}>
                {serviceLabel}
              </p>
              {b.total_days > 0 && (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {b.total_days} {b.total_days === 1 ? 'night' : 'nights'}
                </p>
              )}
            </div>
            {total > 0 && (
              <p className="text-2xl font-bold flex-shrink-0" style={{ color: 'var(--accent)' }}>
                JD {fmtAmt(total)}
              </p>
            )}
          </div>
          {(b.start_date || b.end_date) && (
            <div className="flex items-center gap-2 text-sm pt-3"
              style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}>
              <span>{fmtDate(b.start_date) || '—'}</span>
              {b.end_date && <><span>→</span><span>{fmtDate(b.end_date)}</span></>}
            </div>
          )}
        </div>

        {/* ── Pets ── */}
        <div className="card mb-4">
          <SectionTitle>Pets</SectionTitle>
          {pets.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Pet info not available.</p>
          ) : (
            <div className="space-y-2">
              {pets.map((pet, i) => {
                const details = [
                  pet.gender ? pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1) : null,
                  pet.breed || pet.type || null,
                  pet.age   ? `${pet.age} yrs` : null,
                ].filter(Boolean).join(' · ')
                return (
                  <div key={i} className="flex items-start gap-2">
                    <PawPrint size={15} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <div>
                      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                        {pet.name || '—'}
                      </span>
                      {details && (
                        <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>
                          {details}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Services & Pricing ── */}
        <div className="card mb-4">
          <SectionTitle>Services &amp; Pricing</SectionTitle>
          {lineItems.length > 0 ? (
            <div className="mb-4">
              {lineItems.map((item, i) => {
                const isComp   = !!item.note
                const qty      = item.quantity != null ? item.quantity : 1
                const unitP    = item.unit_price != null
                  ? item.unit_price
                  : qty > 1 ? (item.amount / qty) : item.amount
                const showMeta = !isComp && unitP != null && qty > 1
                return (
                  <div key={i} className="flex justify-between items-start gap-4 py-1.5"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {item.label}
                      </p>
                      {showMeta && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                          JD {fmtAmt(unitP)}/{item.unit || 'service'} × {qty}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold flex-shrink-0"
                      style={{ color: isComp ? 'var(--muted)' : 'var(--text)' }}>
                      {isComp ? item.note : `JD ${fmtAmt(item.amount)}`}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              No service breakdown available.
            </p>
          )}

          <div className="space-y-1 pt-2" style={{ borderTop: '2px solid var(--border)' }}>
            {gross > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--muted)' }}>Subtotal</span>
                <span>JD {fmtAmt(gross)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm" style={{ color: '#dc2626' }}>
                <span>Discount</span>
                <span>− JD {fmtAmt(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1"
              style={{ borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text)' }}>Total</span>
              <span style={{ color: 'var(--accent)' }}>JD {fmtAmt(total)}</span>
            </div>
          </div>
        </div>

        {/* ── Payment ── */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Payment</SectionTitle>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: paymentBadge.bg, color: paymentBadge.color }}>
              {paymentBadge.label}
            </span>
          </div>

          {payments.length === 0 && !prepaid ? (
            <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>No payments recorded yet.</p>
          ) : (
            <div className="space-y-1 mb-3">
              {prepaid > 0 && (
                <div className="flex justify-between items-center text-sm py-1"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Deposit / Prepaid</span>
                  <span className="font-semibold">JD {fmtAmt(prepaid)}</span>
                </div>
              )}
              {payments.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-sm py-1"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">JD {fmtAmt(p.amount)}</span>
                    <span style={{ color: 'var(--muted)' }}>{METHOD_LABEL[p.method] || p.method}</span>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {p.created_at ? format(new Date(p.created_at), 'd MMM yyyy') : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {balanceDue > 0 && (
            <div className="flex justify-between font-bold text-sm pt-2"
              style={{ borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text)' }}>Balance due</span>
              <span style={{ color: 'var(--accent)' }}>JD {fmtAmt(balanceDue)}</span>
            </div>
          )}
        </div>

        {/* ── Your Notes ── */}
        <div className="card mb-4">
          <SectionTitle>Your Notes</SectionTitle>
          {notes.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No additional notes.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((n, i) => (
                <div key={i}>
                  <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--primary)' }}>
                    {n.label}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{n.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Transport (conditional) ── */}
        {hasTransport && (
          <div className="card mb-4">
            <SectionTitle>Transport</SectionTitle>
            <div className="space-y-1.5 text-sm">
              {b.pickup_required && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted)' }}>Pickup</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>Required</span>
                </div>
              )}
              {b.dropoff_required && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted)' }}>Drop-off</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>Required</span>
                </div>
              )}
              {parseFloat(b.transport_fee || 0) > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--muted)' }}>Transport fee</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>
                    JD {fmtAmt(b.transport_fee)}
                  </span>
                </div>
              )}
              {b.transport_notes && (
                <div className="flex justify-between gap-4">
                  <span style={{ color: 'var(--muted)', flexShrink: 0 }}>Notes</span>
                  <span className="font-medium text-right" style={{ color: 'var(--text)' }}>
                    {b.transport_notes}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
