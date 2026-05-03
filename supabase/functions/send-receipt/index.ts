const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = 'https://qcwbkpcwtxpokgseethp.supabase.co'
const LOGO_URL     = 'https://pet-lodge.vercel.app/logo-email.jpg'

interface ReceiptPayload {
  bookingRef:    string
  customerEmail: string
  customerName:  string
  petNames:      string[]
  endDate?:      string
  pdf_base64?:   string
  pdf_filename?: string
  // remaining fields accepted but not rendered in this wrapper email
  [key: string]: unknown
}

function buildHtml(p: ReceiptPayload): string {
  const pets      = p.petNames.length ? p.petNames.join(', ') : '—'
  const firstName = p.customerName.split(' ')[0] || 'there'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Receipt</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

    <!-- Row 1: Header -->
    <tr>
      <td style="background:#2d3a1e;border-radius:12px 12px 0 0;padding:20px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:middle;width:130px;">
              <a href="https://www.petlodgejo.com/"><img src="${LOGO_URL}" width="100" alt="Pet Lodge" style="display:block;border:0;margin-bottom:8px;" /></a>
            </td>
            <td style="vertical-align:middle;padding-left:16px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Pet Lodge</p>
              <p style="margin:4px 0 0;font-size:13px;color:#7aa63c;">Kennels &amp; Cattery &nbsp;·&nbsp; petlodgejo.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Row 2: Body -->
    <tr>
      <td style="background:#ffffff;padding:28px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

        <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${firstName},</p>

        <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1a1a1a;">${pets} is all set.</p>

        <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.65;">
          You can settle payment at any time via cash, card, or CliQ (0795535405 / Saleh Abdelhadi).
        </p>

        <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.65;">
          Please find your receipt attached. Let us know if you have any questions.
        </p>

        <!-- View booking online -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
          <tr>
            <td align="center" style="padding:4px 0 8px;">
              <a href="https://booking.petlodgejo.com/my-bookings/${p.bookingRef}" style="display:inline-block;background:#5a7a2e;color:#ffffff;text-decoration:none;padding:11px 28px;border-radius:6px;font-size:14px;font-weight:700;">View your booking online</a>
              <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">Or copy this link: <a href="https://booking.petlodgejo.com/my-bookings/${p.bookingRef}" style="color:#5a7a2e;word-break:break-all;">https://booking.petlodgejo.com/my-bookings/${p.bookingRef}</a></p>
            </td>
          </tr>
        </table>

        <p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">
          Thank you for your trust — we really appreciate it.<br>
          <strong>Pet Lodge Customer Care</strong>
        </p>

      </td>
    </tr>

    <!-- Row 3: Footer -->
    <tr>
      <td style="background:#2d3a1e;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
        <p style="margin:0 0 8px;font-size:13px;color:#ffffff;">+962 79 8906476 &nbsp;·&nbsp; booking@petlodgejo.com</p>
        <p style="margin:0;font-size:12px;">
          <a href="https://www.petlodgejo.com/" style="color:#7aa63c;text-decoration:none;">Website</a> &nbsp;·&nbsp;
          <a href="https://www.facebook.com/petlodgejo" style="color:#7aa63c;text-decoration:none;">Facebook</a> &nbsp;·&nbsp;
          <a href="https://www.instagram.com/pet.lodge.jo/" style="color:#7aa63c;text-decoration:none;">Instagram</a> &nbsp;·&nbsp;
          <a href="https://maps.app.goo.gl/petlodgejo" style="color:#7aa63c;text-decoration:none;">Google Maps</a> &nbsp;·&nbsp;
          <a href="https://petlodgejo.com/faqs" style="color:#7aa63c;text-decoration:none;">FAQs</a> &nbsp;·&nbsp;
          <a href="https://www.petlodgejo.com/" style="color:#7aa63c;text-decoration:none;">Book online</a>
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

  let payload: Partial<ReceiptPayload>
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

  const receiptPayload: ReceiptPayload = {
    bookingRef,
    customerEmail,
    customerName: payload.customerName || '',
    petNames:     payload.petNames     || [],
    endDate:      (payload.endDate as string) || '',
    pdf_base64:   (payload.pdf_base64  as string | undefined) || undefined,
    pdf_filename: (payload.pdf_filename as string | undefined) || undefined,
  }

  // Build subject: Receipt - First Last (Pet1, Pet2) - d MMM yyyy - REF
  const nameParts    = receiptPayload.customerName.split(' ')
  const subjectFirst = nameParts[0] || ''
  const subjectLast  = nameParts.slice(1).join(' ') || ''
  const petsJoined   = receiptPayload.petNames.join(', ')
  // endDate arrives as "Mon, 10 May 2026" — strip the day-of-week prefix
  const checkoutFmt  = (receiptPayload.endDate || '').replace(/^[A-Za-z]+,?\s*/, '') || '—'

  const { pdf_base64, pdf_filename } = receiptPayload
  console.error('attachment size:', pdf_base64?.length)

  const resendBody_payload: Record<string, unknown> = {
    from:     'Pet Lodge Jordan <booking@petlodgejo.com>',
    to:       [customerEmail],
    reply_to: 'info@petlodgejo.com',
    subject:  `Receipt - ${subjectFirst} ${subjectLast} (${petsJoined}) - ${checkoutFmt} - ${bookingRef}`,
    html:     buildHtml(receiptPayload),
    headers: {
      'X-Entity-Ref-ID': bookingRef,
    },
  }

  if (pdf_base64) {
    resendBody_payload.attachments = [
      { filename: pdf_filename || 'Receipt.pdf', content: pdf_base64 },
    ]
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resendBody_payload),
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
