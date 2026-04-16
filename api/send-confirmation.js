const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function buildHtml({ bookingRef, customerName, petNames, checkIn, checkOut, nights, services, totalPrice }) {
  const pets     = Array.isArray(petNames) ? petNames.join(', ') : petNames || '—'
  const svcs     = Array.isArray(services) ? services.join(', ')  : services || '—'
  const total    = typeof totalPrice === 'number' ? `JD ${totalPrice.toFixed(2)}` : `JD ${totalPrice}`

  const row = (label, value) => `
    <tr>
      <td style="padding:10px 16px;font-size:14px;color:#6b7280;width:140px;border-bottom:1px solid #f0f0f0;vertical-align:top;white-space:nowrap;">${label}</td>
      <td style="padding:10px 16px;font-size:14px;color:#1a1a1a;font-weight:600;border-bottom:1px solid #f0f0f0;">${value}</td>
    </tr>`

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
              Thank you, <strong>${customerName}</strong>! Your booking is confirmed.
            </p>

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;border-spacing:0;overflow:hidden;">
              ${row('Booking Ref', `<span style="font-family:monospace;">#${bookingRef}</span>`)}
              ${row('Pet(s)', pets)}
              ${row('Check-in', checkIn)}
              ${row('Check-out', checkOut)}
              ${row('Duration', `${nights} night${nights !== 1 ? 's' : ''}`)}
              ${row('Service(s)', svcs)}
              <tr>
                <td style="padding:10px 16px;font-size:14px;color:#6b7280;width:140px;vertical-align:top;white-space:nowrap;">Total</td>
                <td style="padding:10px 16px;font-size:16px;color:#2d3a1e;font-weight:700;">${total}</td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
              If you have any questions, reply to this email or contact us at
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

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end()
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { bookingRef, customerName, customerEmail, petNames, checkIn, checkOut, nights, services, totalPrice } = req.body || {}

  if (!bookingRef || !customerEmail) {
    return res.status(400).json({ error: 'bookingRef and customerEmail are required' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     'Pet Lodge Jordan <booking@petlodgejo.com>',
        to:       [customerEmail],
        reply_to: 'info@petlodgejo.com',
        subject:  `Booking Confirmed – ${bookingRef} | Pet Lodge Jordan`,
        html:     buildHtml({ bookingRef, customerName, petNames, checkIn, checkOut, nights, services, totalPrice }),
      }),
    })

    const body = await response.json()

    if (!response.ok) {
      console.error('Resend error', response.status, body)
      return res.status(500).json({ error: body?.message || 'Failed to send email' })
    }

    return res.status(200).json({ success: true, id: body.id })
  } catch (err) {
    console.error('send-confirmation exception', err)
    return res.status(500).json({ error: err.message || 'Unexpected error' })
  }
}
