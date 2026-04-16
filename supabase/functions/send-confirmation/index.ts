const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailPayload {
  bookingRef:    string
  customerName:  string
  customerEmail: string
  petNames:      string[]
  checkIn:       string
  checkOut:      string
  nights:        number
  services:      string[]
  totalPrice:    number
}

function row(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 16px;font-size:14px;color:#6b7280;width:140px;border-bottom:1px solid #f0f0f0;vertical-align:top;white-space:nowrap;">${label}</td>
      <td style="padding:10px 16px;font-size:14px;color:#1a1a1a;font-weight:600;border-bottom:1px solid #f0f0f0;">${value}</td>
    </tr>`
}

function buildHtml(p: EmailPayload): string {
  const pets  = p.petNames.length  ? p.petNames.join(', ')  : '—'
  const svcs  = p.services.length  ? p.services.join('<br>') : '—'
  const total = `JD ${Number(p.totalPrice).toFixed(2)}`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Booking Confirmed</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="background:#2d3a1e;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">Booking Confirmed 🐾</p>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;padding:28px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <p style="margin:0 0 24px;font-size:16px;color:#374151;">
              Thank you, <strong>${p.customerName}</strong>! Your booking request has been received.
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
              Our team will review your request and confirm within 24 hours via WhatsApp or email.
            </p>

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;border-spacing:0;overflow:hidden;">
              ${row('Booking Ref', `<span style="font-family:monospace;">#${p.bookingRef}</span>`)}
              ${row('Pet(s)', pets)}
              ${p.checkIn  ? row('Check-in',  p.checkIn)  : ''}
              ${p.checkOut ? row('Check-out', p.checkOut) : ''}
              ${p.nights   ? row('Duration', `${p.nights} night${p.nights !== 1 ? 's' : ''}`) : ''}
              ${row('Service(s)', svcs)}
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#6b7280;width:140px;vertical-align:top;white-space:nowrap;">Est. Total</td>
                <td style="padding:10px 16px;font-size:16px;color:#2d3a1e;font-weight:700;">${total}</td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
              Questions? Reply to this email or contact us at
              <a href="mailto:info@petlodgejo.com" style="color:#5a7a2e;">info@petlodgejo.com</a>
              or <a href="tel:+962798906476" style="color:#5a7a2e;">+962 79 890 6476</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#2d3a1e;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:13px;color:#ffffff;opacity:0.85;">
              Pet Lodge Jordan &nbsp;·&nbsp; booking@petlodgejo.com &nbsp;·&nbsp; +962 79 890 6476
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  // CORS preflight
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
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
  const userRes = await fetch('https://qcwbkpcwtxpokgseethp.supabase.co/auth/v1/user', {
    headers: { Authorization: authHeader, apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' },
  })
  if (!userRes.ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let payload: Partial<EmailPayload>
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

  const emailPayload: EmailPayload = {
    bookingRef:    bookingRef,
    customerName:  payload.customerName  || '',
    customerEmail: customerEmail,
    petNames:      payload.petNames      || [],
    checkIn:       payload.checkIn       || '',
    checkOut:      payload.checkOut      || '',
    nights:        payload.nights        ?? 0,
    services:      payload.services      || [],
    totalPrice:    payload.totalPrice    ?? 0,
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:     'Pet Lodge Jordan <booking@petlodgejo.com>',
      to:       [customerEmail],
      reply_to: 'info@petlodgejo.com',
      subject:  `Booking Request Received – #${bookingRef} | Pet Lodge Jordan`,
      html:     buildHtml(emailPayload),
    }),
  })

  const resendBody = await resendRes.json()

  if (!resendRes.ok) {
    console.error('Resend error', resendRes.status, resendBody)
    return new Response(JSON.stringify({ error: resendBody?.message || 'Failed to send email' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true, id: resendBody.id }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
