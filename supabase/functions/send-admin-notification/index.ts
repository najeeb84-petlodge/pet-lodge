const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const LOGO_URL        = 'https://pet-lodge.vercel.app/logo-email.jpg'
const ADMIN_EMAIL     = 'pet.lodge.jo@gmail.com'
const DASHBOARD_BASE  = 'https://booking.petlodgejo.com/admin/dashboard'

interface AdminNotificationPayload {
  bookingRef:          string
  customerFirstName:   string
  customerLastName:    string
  customerEmail:       string
  customerPhone?:      string
  customerWhatsapp?:   string
  petNames:            string[]
  checkIn:             string
  checkOut?:           string
  nights?:             number
  serviceType?:        string
  services:            string[]
  totalAmount?:        number
  // Notes fields — mirrors what extractAllNotes reads in the admin dashboard
  additional_comments?: string | null
  special_food_req?:    string | null
  driver_comments?:     string | null
  medication_notes?:    string | null
  admin_notes?:         string | null
  // deno-lint-ignore no-explicit-any
  pets_data?:           any[]
  // deno-lint-ignore no-explicit-any
  service_details?:     Record<string, any>
  // Transport
  has_transport?:       boolean
  pickup_date?:         string | null
  pickup_time?:         string | null
  dropoff_date?:        string | null
  dropoff_time?:        string | null
}

interface NoteEntry {
  label: string
  text:  string
}

function htmlEscape(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function joinPetNames(names: string[]): string {
  if (!names || names.length === 0) return '—'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

// Port of extractAllNotes from src/pages/admin/tabs/AllBookings.jsx
// Produces the same { label, text }[] array used by the admin dashboard.
function extractAllNotes(p: AdminNotificationPayload): NoteEntry[] {
  const notes: NoteEntry[] = []

  if (p.additional_comments) notes.push({ label: 'Notes',      text: p.additional_comments })
  if (p.special_food_req)    notes.push({ label: 'Food',       text: p.special_food_req })
  if (p.driver_comments)     notes.push({ label: 'Driver',     text: p.driver_comments })
  if (p.medication_notes)    notes.push({ label: 'Medication', text: p.medication_notes })

  if (Array.isArray(p.pets_data)) {
    for (const pet of p.pets_data) {
      if (pet?.medication_notes || pet?.medication) {
        notes.push({
          label: `Medication (${pet.name || 'pet'})`,
          text:  pet.medication_notes || pet.medication,
        })
      }
    }
  }

  const perPet = p.service_details?.perPet
  if (Array.isArray(perPet)) {
    for (const pf of perPet) {
      const petName = pf.petName || 'pet'
      if (pf.foodNotes)               notes.push({ label: `Food notes (${petName})`,     text: pf.foodNotes })
      if (pf.walkerNotes)             notes.push({ label: `Walker notes (${petName})`,   text: pf.walkerNotes })
      if (pf.trainingGoals)           notes.push({ label: `Training goals (${petName})`, text: pf.trainingGoals })
      if (pf.address_driver_comments) notes.push({ label: `Driver notes (${petName})`,   text: pf.address_driver_comments })
    }
  }

  const sd = p.service_details
  if (sd?.preferredSchedule) notes.push({ label: 'Preferred schedule', text: sd.preferredSchedule })
  if (sd?.trainingGoals)     notes.push({ label: 'Training goals',     text: sd.trainingGoals })

  return notes
}

function buildHtml(p: AdminNotificationPayload): string {
  const customerName = `${p.customerFirstName} ${p.customerLastName}`.trim() || '—'
  const petsJoined   = joinPetNames(p.petNames)
  const dashboardUrl = `${DASHBOARD_BASE}?booking=${encodeURIComponent(p.bookingRef)}`

  const serviceRows = p.services.length > 0
    ? p.services.map(s =>
        `<tr><td style="padding:5px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">• ${htmlEscape(s)}</td></tr>`
      ).join('')
    : `<tr><td style="padding:5px 0;font-size:13px;color:#9ca3af;">—</td></tr>`

  // Internal note block — staff-only, rendered above the regular notes with red styling
  const internalBlock = p.admin_notes ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:collapse;">
      <tr>
        <td style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;border-radius:4px;padding:10px 14px;">
          <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.05em;">🔒 Internal (staff only)</p>
          <p style="margin:0;font-size:13px;color:#7f1d1d;">${htmlEscape(p.admin_notes)}</p>
        </td>
      </tr>
    </table>` : ''

  // Build notes block — all entries from extractAllNotes, rendered in amber box
  const allNotes = extractAllNotes(p)
  const notesBlock = allNotes.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
      <tr>
        <td style="background:#fffbeb;border:1px solid #fcd34d;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 14px;">
          <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">Notes</p>
          ${allNotes.map((n, i) =>
            `<p style="margin:0${i < allNotes.length - 1 ? ' 0 5px' : ''};font-size:13px;color:#78350f;"><strong>${htmlEscape(n.label)}:</strong> ${htmlEscape(n.text)}</p>`
          ).join('')}
        </td>
      </tr>
    </table>` : ''

  const transportBlock = p.has_transport ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
      <tr>
        <td style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:12px 14px;">
          <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.05em;">Transport details</p>
          <p style="margin:0 0 4px;font-size:13px;color:#374151;"><strong>Pick-up:</strong> ${htmlEscape(p.pickup_date || '—')} &nbsp;·&nbsp; ${htmlEscape(p.pickup_time || '—')}</p>
          <p style="margin:0;font-size:13px;color:#374151;"><strong>Drop-off:</strong> ${htmlEscape(p.dropoff_date || '—')} &nbsp;·&nbsp; ${htmlEscape(p.dropoff_time || '—')}</p>
        </td>
      </tr>
    </table>` : ''

  const nightsLabel = p.nights ? `${p.nights} night${p.nights !== 1 ? 's' : ''}` : '—'
  const totalLabel  = p.totalAmount ? `JD ${p.totalAmount.toFixed(2)}` : '—'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>New Booking Alert</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

    <!-- Header -->
    <tr>
      <td style="background:#2d3a1e;border-radius:12px 12px 0 0;padding:20px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;width:130px;">
              <a href="https://www.petlodgejo.com/"><img src="${LOGO_URL}" width="100" alt="Pet Lodge" style="display:block;border:0;margin-bottom:8px;" /></a>
            </td>
            <td style="vertical-align:middle;padding-left:16px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Pet Lodge</p>
              <p style="margin:4px 0 0;font-size:13px;color:#7aa63c;">Admin Notification &nbsp;·&nbsp; petlodgejo.com</p>
            </td>
            <td style="vertical-align:middle;text-align:right;">
              <span style="display:inline-block;background:#7aa63c;color:#ffffff;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;letter-spacing:0.03em;">New booking alert</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background:#ffffff;padding:28px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

        <!-- Booking ref hero -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef4e2;border-radius:8px;margin-bottom:20px;">
          <tr>
            <td style="padding:14px 18px;vertical-align:middle;">
              <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#2d3a1e;">A new booking has been submitted</p>
              <p style="margin:0;font-size:12px;color:#5a7a2e;">${htmlEscape(customerName)} &nbsp;·&nbsp; ${htmlEscape(petsJoined)}</p>
            </td>
            <td style="padding:14px 18px;text-align:right;white-space:nowrap;vertical-align:middle;">
              <span style="display:inline-block;border:1px solid #7aa63c;border-radius:20px;padding:3px 10px;color:#2d3a1e;font-size:11px;font-weight:600;">${htmlEscape(p.bookingRef)}</span>
            </td>
          </tr>
        </table>

        ${internalBlock}
        ${notesBlock}

        <!-- Customer contact block -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;border-spacing:0;overflow:hidden;margin-bottom:20px;">
          <tr>
            <td colspan="2" style="padding:8px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Customer contact</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 14px;width:50%;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Name</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">${htmlEscape(customerName)}</p>
            </td>
            <td style="padding:10px 14px;width:50%;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Email</p>
              <p style="margin:0;font-size:13px;color:#1a1a1a;">${htmlEscape(p.customerEmail)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 14px;border-right:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Phone</p>
              <p style="margin:0;font-size:13px;color:#1a1a1a;">${htmlEscape(p.customerPhone || '—')}</p>
            </td>
            <td style="padding:10px 14px;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">WhatsApp</p>
              <p style="margin:0;font-size:13px;color:#1a1a1a;">${htmlEscape(p.customerWhatsapp || p.customerPhone || '—')}</p>
            </td>
          </tr>
        </table>

        <!-- Booking details grid -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;border-spacing:0;overflow:hidden;margin-bottom:20px;">
          <tr>
            <td colspan="2" style="padding:8px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Booking details</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 14px;width:50%;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Pet(s)</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">${htmlEscape(petsJoined)}</p>
            </td>
            <td style="padding:10px 14px;width:50%;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Duration</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">${htmlEscape(nightsLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 14px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Check-in</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">${htmlEscape(p.checkIn || '—')}</p>
            </td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Check-out</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">${htmlEscape(p.checkOut || '—')}</p>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:10px 14px;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Estimated total</p>
              <p style="margin:0;font-size:15px;font-weight:700;color:#2d3a1e;">${htmlEscape(totalLabel)}</p>
            </td>
          </tr>
        </table>

        <!-- Services list -->
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Services requested</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
          ${serviceRows}
        </table>

        ${transportBlock}

        <!-- CTA button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
          <tr>
            <td align="center" style="padding:16px 0;">
              <a href="${dashboardUrl}" style="display:inline-block;background:#2d3a1e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 32px;border-radius:8px;letter-spacing:0.02em;">View Booking in Dashboard →</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#eef4e2;border:1px solid #c6dba0;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#5a7a2e;">This is an automated notification from the Pet Lodge booking system.</p>
        <p style="margin:4px 0 0;font-size:11px;color:#7aa63c;">petlodgejo.com &nbsp;·&nbsp; booking@petlodgejo.com</p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let payload: Partial<AdminNotificationPayload>
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { bookingRef, customerEmail } = payload
  if (!bookingRef || !customerEmail) {
    return new Response(JSON.stringify({ error: 'bookingRef and customerEmail are required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const notifPayload: AdminNotificationPayload = {
    bookingRef,
    customerFirstName:   payload.customerFirstName   || '',
    customerLastName:    payload.customerLastName    || '',
    customerEmail,
    customerPhone:       payload.customerPhone       || '',
    customerWhatsapp:    payload.customerWhatsapp    || '',
    petNames:            payload.petNames            || [],
    checkIn:             payload.checkIn             || '',
    checkOut:            payload.checkOut            || '',
    nights:              payload.nights              ?? 0,
    serviceType:         payload.serviceType         || '',
    services:            payload.services            || [],
    totalAmount:         payload.totalAmount         ?? 0,
    additional_comments: payload.additional_comments ?? null,
    special_food_req:    payload.special_food_req    ?? null,
    driver_comments:     payload.driver_comments     ?? null,
    medication_notes:    payload.medication_notes    ?? null,
    admin_notes:         payload.admin_notes         ?? null,
    pets_data:           Array.isArray(payload.pets_data) ? payload.pets_data : [],
    service_details:     payload.service_details     ?? {},
    has_transport:       payload.has_transport       ?? false,
    pickup_date:         payload.pickup_date         ?? null,
    pickup_time:         payload.pickup_time         ?? null,
    dropoff_date:        payload.dropoff_date        ?? null,
    dropoff_time:        payload.dropoff_time        ?? null,
  }

  const firstName    = notifPayload.customerFirstName
  const lastName     = notifPayload.customerLastName
  const petsJoined   = notifPayload.petNames.length > 0 ? notifPayload.petNames.join(' & ') : '—'
  // checkInShort: "24 Apr 2026" → "24 Apr"
  const checkInShort = notifPayload.checkIn.split(' ').slice(0, 2).join(' ') || notifPayload.checkIn || '—'
  const subject      = `New booking — ${firstName} ${lastName} / ${petsJoined} — ${checkInShort}`

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    'Pet Lodge Bookings <booking@petlodgejo.com>',
      to:      [ADMIN_EMAIL],
      subject,
      html:    buildHtml(notifPayload),
      headers: {
        'X-Entity-Ref-ID': bookingRef,
      },
    }),
  })

  const resendBody = await resendRes.json()

  if (!resendRes.ok) {
    console.error('Resend error (admin notification)', resendRes.status, resendBody)
    return new Response(JSON.stringify({ error: resendBody?.message || 'Failed to send notification' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, id: resendBody.id }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
