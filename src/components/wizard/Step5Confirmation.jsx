import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2 } from 'lucide-react'
import { useWizard } from '../../contexts/WizardContext'
import { useAuth } from '../../contexts/AuthContext'
import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../../lib/supabase'
import { computeLineItems } from '../../lib/bookingUtils'
import { sendBookingConfirmation } from '../../utils/sendBookingConfirmation'
import { sendAdminNotification } from '../../utils/sendAdminNotification'
import { syncProfileFromBooking } from '../../utils/syncProfileFromBooking'

// ── T&C text ──────────────────────────────────────────────────────────────────

const TERMS = `1. Vaccinations:
All pets must be fully vaccinated. Valid vaccination certificates must be provided at check-in.

2. Desexing & Health Status:
All cats must be desexed (kittens excepted). Dogs in heat will not be accepted.

3. Veterinary Care:
Should veterinary attention be required, all related expenses will be borne by the owner. In the case of a serious medical condition where the owner cannot be contacted, Pet Lodge will act on the advice of a licensed veterinarian, whose decision will be final.

4. Abandoned Pets:
Pets not collected within 7 days of the agreed departure date will be considered abandoned. Pet Lodge reserves the right to rehome the animal through appropriate channels. All fees, including outstanding boarding charges, will remain the owner's responsibility and are payable in full. Legal action may be pursued for unpaid balances.

5. Advance Payment:
For stays longer than 14 days, 50% of the total boarding fee must be paid in advance.

6. Right to Refuse Admission:
Pet Lodge reserves the right to refuse any animal without obligation to provide a reason.

7. Liability & Risk Acknowledgment:
Pet Lodge takes all reasonable precautions to ensure the health and safety of pets in its care. However, certain risks are inherent in pet boarding, handling, and transportation. Pet Lodge shall not be held liable for injury, illness, escape, or death of any pet unless caused by gross negligence or wilful misconduct of Pet Lodge or its staff.

8. Transport Liability:
Pet Lodge is not responsible for incidents arising from behaviours beyond its control during transit, including sudden jumping or panic behaviours during pick-up or drop-off.

9. Holiday Booking Policy:
During peak periods (e.g. Eid, Christmas, summer holidays), the full booked period will be charged, even in the case of early pick-up.

10. Daily Charges:
Boarding rates are charged per calendar day, including the day of arrival and departure.

11. Deposits and Cancellations:
A non-refundable deposit, as determined by Pet Lodge, is required for each animal booked. Cancellations made less than 4 weeks before the check-in date will forfeit the deposit.

12. Lien for Non-Payment:
The owner agrees that Pet Lodge holds a lien over the animal until all outstanding amounts are paid in full.

13. Emergency Authorisation:
By accepting these terms and conditions, the owner authorises Pet Lodge to seek veterinary care in the event of illness, injury, or emergency and agrees to cover all resulting costs.

14. Animal Behaviour:
Pet Lodge reserves the right to separate or isolate any animal displaying aggressive behaviour toward other animals or staff. Additional supervision fees may apply.

15. Photography & Media:
Pet Lodge may photograph or film pets in its care for use on social media and marketing materials. Owners who object should notify Pet Lodge in writing at check-in.`

// ── Booking ref generator ─────────────────────────────────────────────────────

function generateBookingRef() {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(1000 + Math.random() * 9000))
  return `PL-${yy}${mm}${dd}-${rand}`
}

async function insertBookingWithRetry(body, token, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    const ref = generateBookingRef()
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ ...body, booking_ref: ref }),
    })
    if (res.ok) {
      const data = await res.json()
      return { booking: Array.isArray(data) ? data[0] : data, ref }
    }
    const err = await res.json().catch(() => ({}))
    const msg = JSON.stringify(err)
    if (!msg.includes('unique') && !msg.includes('duplicate')) {
      throw new Error(err.message || err.error_description || 'Failed to submit booking')
    }
    // unique collision — retry with new ref
  }
  throw new Error('Could not generate a unique booking reference. Please try again.')
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Step5Confirmation() {
  const navigate = useNavigate()
  const {
    customerInfo, petsData, hasIntactFemale,
    serviceType, serviceOptions, serviceOptionDetails,
    confirmationData, prevStep,
  } = useWizard()
  const { profile } = useAuth()

  const [additionalComments, setAdditionalComments] = useState('')
  const [vaccinationConsent, setVaccinationConsent] = useState(false)
  const [conditionConsent, setConditionConsent]     = useState(false)
  const [pregnancyConsent, setPregnancyConsent]     = useState(false)
  const [termsAccepted, setTermsAccepted]           = useState(false)
  const [errors, setErrors]                         = useState({})
  const [submitting, setSubmitting]                 = useState(false)
  const [submitError, setSubmitError]               = useState('')
  const [successData, setSuccessData]               = useState(null)

  const total    = confirmationData?.total ?? 0
  const safePets = Array.isArray(petsData) && petsData.length ? petsData : []

  // Show pregnancy checkbox only if there is at least one intact female
  const showPregnancy = hasIntactFemale

  const SERVICE_LABELS = {
    boarding: 'Boarding', day_camp: 'Doggy Day Camp', dog_walking: 'Dog Walking',
    grooming: 'Grooming', transport: 'Vet Visits & Transport',
    training: 'Training', international: 'International Travel',
  }

  function validate() {
    const e = {}
    if (!vaccinationConsent) e.vaccination = true
    if (!conditionConsent)   e.condition   = true
    if (showPregnancy && !pregnancyConsent) e.pregnancy = true
    if (!termsAccepted)      e.terms       = true
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) {
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-error="true"]')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const token = getAccessToken()
      const startDate = serviceOptions?.startDate || null
      const endDate   = serviceOptions?.endDate   || null
      let totalDays = null
      if (startDate && endDate) {
        const diff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
        totalDays = Math.max(1, Math.round(diff))
      }

      // Fetch prices and recompute line items fresh at submission time
      let freshLineItems = confirmationData?.lineItems ?? []
      try {
        const pricesRes = await fetch(
          `${SUPABASE_URL}/rest/v1/services?active=eq.true&select=id,name,price,category,unit,pet_type&order=name`,
          { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}` } }
        )
        const pricesData = await pricesRes.json()
        if (Array.isArray(pricesData)) {
          const ALIASES = { daycamp: 'day_camp', walking: 'dog_walking', grooming_addon: 'grooming_addon', training_addon: 'training_addon' }
          const grouped = {}
          pricesData.forEach(row => {
            let cat = (row.category || 'other').toLowerCase().replace(/[\s-]+/g, '_')
            cat = ALIASES[cat] || cat
            if (!grouped[cat]) grouped[cat] = []
            grouped[cat].push(row)
          })
          const details = serviceOptionDetails[serviceType] || {}
          const perPetForms = details.perPet || []
          const safePetsForCalc = Array.isArray(petsData) && petsData.length ? petsData : [{}]
          if (perPetForms.length > 0 || ['transport', 'training', 'international'].includes(serviceType)) {
            freshLineItems = computeLineItems(serviceType, perPetForms, serviceOptions, grouped, safePetsForCalc)
          }
        }
      } catch (e) {
        console.warn('[Step5] could not recompute line items:', e)
      }
      const freshTotal = freshLineItems.reduce((s, i) => s + (i.amount || 0), 0) || total

      const body = {
        customer_id:         profile?.id || null,
        created_by:          profile?.id || null,
        customer_first_name: customerInfo.first_name,
        customer_last_name:  customerInfo.last_name,
        customer_email:      customerInfo.email,
        customer_phone:      customerInfo.contact_number,
        customer_whatsapp:   customerInfo.whatsapp_number || customerInfo.contact_number || null,
        how_heard:           customerInfo.how_they_heard || [],
        newsletter_preferences: customerInfo.newsletter_preferences || [],
        pet_names:           safePets.map(p => p.name).filter(Boolean),
        num_pets:            safePets.length || 1,
        pets_data:           safePets,
        service_type:        serviceType,
        service_details:     {
          serviceOptions,
          ...(serviceOptionDetails[serviceType] || {}),
          line_items: freshLineItems,
          total_amount: freshTotal,
        },
        start_date:          startDate,
        end_date:            endDate,
        total_days:          totalDays,
        status:              'pending',
        payment_status:      'unpaid',
        subtotal:            freshTotal,
        total_amount:        freshTotal,
        is_guest:            !profile?.id,
        is_staff_booking:    false,
        additional_comments: additionalComments || null,
        vaccination_consent: vaccinationConsent,
        condition_consent:   conditionConsent,
        pregnancy_consent:   showPregnancy ? pregnancyConsent : null,
        terms_accepted:      termsAccepted,
      }

      const { ref } = await insertBookingWithRetry(body, token)
      setSuccessData({ ref, total: freshTotal })

      // Sync customer's profile fields (silent)
      syncProfileFromBooking(profile?.id, {
        firstName: customerInfo.first_name,
        lastName:  customerInfo.last_name,
        phone:     customerInfo.contact_number,
        whatsapp:  customerInfo.whatsapp_number,
      }).catch(err => console.warn('[Step5] profile sync failed:', err))

      // Fire confirmation email — non-blocking, failures are silent to the customer
      const formatDate = (iso) => {
        if (!iso) return ''
        const [y, m, d] = iso.split('-')
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`
      }
      const petNames  = safePets.map(p => p.name).filter(Boolean)
      const services  = freshLineItems.map(i => i.label).filter(Boolean)
      const checkIn   = formatDate(startDate || '')
      const checkOut  = formatDate(endDate || '')

      sendBookingConfirmation({
        bookingRef:    ref,
        customerName:  `${customerInfo.first_name} ${customerInfo.last_name}`.trim(),
        customerEmail: customerInfo.email,
        petNames,
        checkIn,
        checkOut,
        nights:        totalDays ?? 0,
        services,
        totalPrice:    freshTotal,
      }).catch(err => console.warn('[Step5] email send failed:', err))

      sendAdminNotification({
        bookingRef:          ref,
        customerFirstName:   customerInfo.first_name,
        customerLastName:    customerInfo.last_name,
        customerEmail:       customerInfo.email,
        customerPhone:       customerInfo.contact_number || '',
        customerWhatsapp:    customerInfo.whatsapp_number || customerInfo.contact_number || '',
        petNames,
        checkIn,
        checkOut,
        nights:              totalDays ?? 0,
        serviceType,
        services,
        totalAmount:         freshTotal,
        additional_comments: additionalComments || null,
        pets_data:           body.pets_data,
        service_details:     body.service_details,
        has_transport:       !!(serviceOptions?.transport?.enabled || serviceOptions?.hasTransport),
        pickup_date:         serviceOptions?.transport?.pickupDate  || serviceOptions?.pickupDate  || null,
        pickup_time:         serviceOptions?.transport?.pickupTime  || serviceOptions?.pickupTime  || null,
        dropoff_date:        serviceOptions?.transport?.dropoffDate || serviceOptions?.dropoffDate || null,
        dropoff_time:        serviceOptions?.transport?.dropoffTime || serviceOptions?.dropoffTime || null,
      }).catch(err => console.warn('[Step5] admin notification failed:', err))
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function CheckItem({ id, checked, onChange, children, error }) {
    return (
      <div data-error={error ? 'true' : undefined}
        className={`rounded-lg p-3 ${error ? 'border border-red-400 bg-red-50' : 'border bg-white'}`}
        style={error ? {} : { borderColor: 'var(--border)' }}>
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" id={id} className="w-4 h-4 accent-[#7aa63c] mt-0.5 flex-shrink-0"
            checked={checked} onChange={e => onChange(e.target.checked)} />
          <span className="text-sm" style={{ color: 'var(--text)' }}>{children}</span>
        </label>
        {error && <p className="text-xs text-red-500 mt-1 ml-7">This is required to proceed</p>}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>You're almost done</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        Review the details below and confirm your booking request.
      </p>

      {/* Booking summary strip */}
      {(serviceType || total > 0) && (
        <div className="rounded-xl p-4 mb-6 flex flex-wrap gap-4 justify-between items-center"
          style={{ background: '#eef4e2', border: '1px solid #c6dba0' }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Service</p>
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {SERVICE_LABELS[serviceType] || serviceType}
            </p>
          </div>
          {safePets.length > 0 && (
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Pet(s)</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                {safePets.map(p => p.name).filter(Boolean).join(', ') || `${safePets.length} pet(s)`}
              </p>
            </div>
          )}
          {serviceOptions?.startDate && (
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Dates</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                {serviceOptions.startDate}{serviceOptions.endDate && serviceOptions.endDate !== serviceOptions.startDate ? ` → ${serviceOptions.endDate}` : ''}
              </p>
            </div>
          )}
          {total > 0 && (
            <div className="text-right">
              <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Estimated Total</p>
              <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>JD {total.toFixed(2)}</p>
            </div>
          )}
        </div>
      )}

      {/* Additional comments */}
      <div className="mb-5">
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
          Any other comments or additional information <span className="font-normal text-xs" style={{ color: 'var(--muted)' }}>(optional)</span>
        </label>
        <textarea className="input text-sm" rows={3} style={{ resize: 'vertical' }}
          placeholder="Enter any additional comments or information"
          value={additionalComments}
          onChange={e => setAdditionalComments(e.target.value)} />
      </div>

      {/* Consent checkboxes */}
      <div className="space-y-3 mb-5">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Vaccination certificates <span className="text-red-500">*</span>
        </p>
        <CheckItem id="vaccination" checked={vaccinationConsent} onChange={setVaccinationConsent} error={errors.vaccination}>
          I will provide Pet Lodge with a copy of the vaccination certificate.
        </CheckItem>

        <p className="text-sm font-semibold mt-4" style={{ color: 'var(--text)' }}>
          Condition of the pet <span className="text-red-500">*</span>
        </p>
        <CheckItem id="condition" checked={conditionConsent} onChange={setConditionConsent} error={errors.condition}>
          I accept full responsibility for the condition of the above pet(s).
        </CheckItem>

        {showPregnancy && (
          <>
            <p className="text-sm font-semibold mt-4" style={{ color: 'var(--text)' }}>
              Pregnancy during your pet's stay <span className="text-red-500">*</span>
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
              Pet Lodge provides dogs with the opportunity to socialise and imposes no special restrictions for dogs in heat.
              If your dog is in heat, we recommend that you do not board with us.
              If you do, we do not guarantee that your dog will not be conceived.
            </p>
            <CheckItem id="pregnancy" checked={pregnancyConsent} onChange={setPregnancyConsent} error={errors.pregnancy}>
              I accept full responsibility if my dog gets pregnant.
            </CheckItem>
          </>
        )}
      </div>

      {/* Terms & Conditions */}
      <div className="mb-5">
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Terms and Conditions <span className="text-red-500">*</span>
        </p>
        <div className="rounded-lg p-4 mb-3 text-xs overflow-y-auto"
          style={{ background: '#fafaf8', border: '1px solid var(--border)', maxHeight: '220px', color: 'var(--text)', whiteSpace: 'pre-line', lineHeight: '1.7' }}>
          {TERMS}
        </div>
        <CheckItem id="terms" checked={termsAccepted} onChange={setTermsAccepted} error={errors.terms}>
          By ticking this box, I confirm that I have read and understood the Terms and Conditions, and I agree to abide by them.
        </CheckItem>
      </div>

      {submitError && (
        <div className="rounded-lg p-3 mb-4 text-sm" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b' }}>
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button onClick={prevStep} className="btn-secondary px-6">← Previous</button>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary px-8 flex items-center gap-2">
          {submitting && <Loader2 size={17} className="animate-spin" />}
          Submit Booking Request
        </button>
      </div>

      {/* Success modal */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center shadow-2xl">
            <div className="flex justify-center mb-4">
              <CheckCircle size={56} style={{ color: '#7aa63c' }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Booking Request Submitted!</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
              Thank you for choosing Pet Lodge. We'll contact you via WhatsApp or email within 24 hours to confirm your booking details.
            </p>
            <div className="rounded-xl p-4 mb-5" style={{ background: '#eef4e2', border: '1px solid #c6dba0' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Booking Reference</p>
              <p className="text-lg font-bold mb-2" style={{ color: 'var(--primary)' }}>{successData.ref}</p>
              {successData.total > 0 && (
                <>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Estimated Total</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>JD {successData.total.toFixed(2)}</p>
                </>
              )}
            </div>
            <button
              onClick={() => navigate(profile?.id ? '/customer/dashboard' : '/')}
              className="btn-primary w-full mb-3 justify-center">
              Close
            </button>
            {profile?.id && (
              <button
                onClick={() => navigate('/customer/bookings')}
                className="text-sm font-semibold"
                style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                View My Bookings →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
