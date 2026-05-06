const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL   = 'https://qcwbkpcwtxpokgseethp.supabase.co'
const LOGO_URL       = 'https://pet-lodge.vercel.app/logo-email.jpg'
const ADMIN_EMAIL    = 'pet.lodge.jo@gmail.com'
const DASHBOARD_URL  = 'https://booking.petlodgejo.com/admin/dashboard'

const SERVICE_LABELS: Record<string, string> = {
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

interface ModificationNotificationPayload {
  bookingRef:        string
  customerFirstName: string
  customerLastName:  string
  serviceType:       string
  startDate:         string
  endDate:           string
  petNames:          string[]
  requestDetails:    string
  requestId?:        string
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

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function buildHtml(p: ModificationNotificationPayload): string {
  const customerName  = `${p.customerFirstName} ${p.customerLastName}`.trim() || '—'
  const petsJoined    = joinPetNames(p.petNames)
  const serviceLabel  = SERVICE_LABELS[p.serviceType] || p.serviceType || '—'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Change Request Alert</title></head>
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
              <span style="display:inline-block;background:#d97706;color:#ffffff;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;letter-spacing:0.03em;">Change request</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background:#ffffff;padding:28px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

        <!-- Hero box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef4e2;border-radius:8px;margin-bottom:20px;">
          <tr>
            <td style="padding:14px 18px;vertical-align:middle;">
              <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#2d3a1e;">A customer has submitted a change request</p>
              <p style="margin:0;font-size:12px;color:#5a7a2e;">${htmlEscape(customerName)} &nbsp;·&nbsp; ${htmlEscape(petsJoined)}</p>
            </td>
            <td style="padding:14px 18px;text-align:right;white-space:nowrap;vertical-align:middle;">
              <span style="display:inline-block;border:1px solid #7aa63c;border-radius:20px;padding:3px 10px;color:#2d3a1e;font-size:11px;font-weight:600;">${htmlEscape(p.bookingRef)}</span>
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
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Booking ref</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">${htmlEscape(p.bookingRef)}</p>
            </td>
            <td style="padding:10px 14px;width:50%;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Service</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">${htmlEscape(serviceLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 14px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Check-in</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">${htmlEscape(fmtDate(p.startDate))}</p>
            </td>
            <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Check-out</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">${htmlEscape(fmtDate(p.endDate))}</p>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding:10px 14px;vertical-align:top;">
              <p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;">Pet(s)</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">${htmlEscape(petsJoined)}</p>
            </td>
          </tr>
        </table>

        <!-- Request details block -->
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Customer request</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-collapse:collapse;">
          <tr>
            <td style="background:#fffbeb;border:1px solid #fcd34d;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 14px;">
              <p style="margin:0;font-size:13px;color:#78350f;line-height:1.65;">${htmlEscape(p.requestDetails)}</p>
            </td>
          </tr>
        </table>

        <!-- CTA button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
          <tr>
            <td align="center" style="padding:16px 0;">
              <a href="${p.requestId ? `${DASHBOARD_URL}?tab=mods&request=${p.requestId}` : `${DASHBOARD_URL}?tab=mods`}" style="display:inline-block;background:#2d3a1e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 32px;border-radius:8px;letter-spacing:0.02em;">View in Dashboard →</a>
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

  // Verify auth token
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' },
  })
  if (!userRes.ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let payload: Partial<ModificationNotificationPayload>
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { bookingRef, customerFirstName, customerLastName, requestDetails } = payload
  if (!bookingRef || !customerFirstName || !customerLastName || !requestDetails) {
    return new Response(JSON.stringify({ error: 'bookingRef, customerFirstName, customerLastName, and requestDetails are required' }), {
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

  const notifPayload: ModificationNotificationPayload = {
    bookingRef,
    customerFirstName,
    customerLastName,
    serviceType:    payload.serviceType    || '',
    startDate:      payload.startDate      || '',
    endDate:        payload.endDate        || '',
    petNames:       Array.isArray(payload.petNames) ? payload.petNames : [],
    requestDetails,
    requestId:      payload.requestId,
  }

  const subject = `Change request — ${customerFirstName} ${customerLastName} — Booking ${bookingRef}`

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    console.error('Resend error (modification notification)', resendRes.status, resendBody)
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
