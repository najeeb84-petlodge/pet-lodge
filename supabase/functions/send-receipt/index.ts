const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = 'https://qcwbkpcwtxpokgseethp.supabase.co'
const GREEN = '#8CB733'

interface LineItem {
  label:      string
  amount:     number
  unit_price?: number
  quantity?:  number
  unit?:      string
  num_pets?:  number
  note?:      string
}

interface ReceiptPayload {
  bookingRef:      string
  customerEmail:   string
  customerName:    string
  petNames:        string[]
  serviceLabel:    string
  startDate?:      string
  endDate?:        string
  totalDays?:      number
  lineItems:       LineItem[]
  total:           number
  discount?:       number
  prepaid?:        number
  totalPaid?:      number
  amountDue?:      number
  personalMessage?: string
}

function fmtAmt(val: number): string {
  return val % 1 === 0 ? String(Math.round(val)) : val.toFixed(2)
}

function buildServiceRows(items: LineItem[], numPets: number): string {
  const MIN_ROWS = 8
  const rows: string[] = []

  const filled = items.map(item => {
    const qty = item.quantity != null
      ? item.quantity
      : (() => { const m = (item.label || '').match(/×\s*(\d+)/); return m ? parseInt(m[1]) : 1 })()
    const unitPrice = item.unit_price != null
      ? item.unit_price
      : (qty > 1 ? (item.amount / qty) : item.amount)
    const isComp = !!item.note
    const unitLabel = item.unit === 'night' ? 'Night' : item.unit === 'day' ? 'Day' : 'Service'
    const name = (item.label || '').replace(/\s*×\s*\d+\s*(nights?|days?)?/i, '').trim() || item.label

    const tdBase = 'padding:5px 8px;font-size:0.78rem;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;'
    const bgColor = rows.length % 2 === 0 ? 'white' : '#f9fafb'

    if (isComp) {
      return `<tr style="background:${bgColor};">
        <td style="${tdBase}">${name}</td>
        <td style="${tdBase}">${unitLabel}</td>
        <td style="${tdBase};color:#6b7280;font-style:italic;">${item.note}</td>
        <td style="${tdBase};text-align:center;">${item.num_pets ?? numPets}</td>
        <td style="${tdBase};text-align:center;"></td>
        <td style="${tdBase};color:#6b7280;font-style:italic;">${item.note}</td>
      </tr>`
    }
    return `<tr style="background:${bgColor};">
      <td style="${tdBase}">${name}</td>
      <td style="${tdBase}">${unitLabel}</td>
      <td style="${tdBase}">JD ${fmtAmt(unitPrice)}</td>
      <td style="${tdBase};text-align:center;">${item.num_pets ?? numPets}</td>
      <td style="${tdBase};text-align:center;">${qty}</td>
      <td style="${tdBase};font-weight:600;">${fmtAmt(item.amount ?? 0)}</td>
    </tr>`
  })

  rows.push(...filled)

  const dashRow = (i: number) => {
    const bgColor = i % 2 === 0 ? 'white' : '#f9fafb'
    const tdDash = 'padding:5px 8px;font-size:0.78rem;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;color:#9ca3af;text-align:center;'
    return `<tr style="background:${bgColor};">${[0,1,2,3,4,5].map(() => `<td style="${tdDash}">--</td>`).join('')}</tr>`
  }

  while (rows.length < MIN_ROWS) rows.push(dashRow(rows.length))

  return rows.join('')
}

function buildHtml(p: ReceiptPayload): string {
  const petNames   = p.petNames.length ? p.petNames.join(', ') : '—'
  const numPets    = p.petNames.length || 1
  const total      = p.total ?? 0
  const discount   = p.discount ?? 0
  const prepaid    = p.prepaid ?? 0
  const totalPaid  = p.totalPaid ?? 0
  const amountDue  = p.amountDue ?? Math.max(0, total - discount - prepaid - totalPaid)
  const receiptId  = p.bookingRef.slice(-8).toUpperCase()
  const firstName  = p.customerName.split(' ')[0] || 'Customer'

  const thStyle = `padding:5px 6px;text-align:left;font-weight:700;font-size:0.7rem;color:white;border-right:1px solid rgba(255,255,255,0.25);white-space:nowrap;`
  const tdFooter = `padding:5px 8px;font-size:0.78rem;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;`

  const serviceRowsHtml = buildServiceRows(p.lineItems || [], numPets)

  const msgSection = p.personalMessage
    ? `<div style="border:1px solid #e5e7eb;border-radius:6px;padding:14px 16px;margin-bottom:16px;background:#f8fafc;">
        <p style="margin:0;font-size:0.82rem;color:#374151;line-height:1.65;white-space:pre-wrap;">${p.personalMessage}</p>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Receipt #${receiptId}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">

        <!-- Header -->
        <tr>
          <td style="background:#2d3a1e;border-radius:12px 12px 0 0;padding:22px 28px;text-align:center;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">Receipt (#${receiptId})</p>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;padding:24px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

            <p style="margin:0 0 20px;font-size:15px;color:#374151;">
              Dear <strong>${firstName}</strong>, please find your receipt below.
            </p>

            <!-- Info rows -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;border-spacing:0;overflow:hidden;margin-bottom:20px;">
              ${[
                ["Owner's Name",   p.customerName],
                ["Pet(s)",         petNames],
                ["Service",        p.serviceLabel || '—'],
                ["Arrival Date",   p.startDate   || '—'],
                ["Departure Date", p.endDate     || '—'],
                ["Duration",       p.totalDays   ? `${p.totalDays} day${p.totalDays !== 1 ? 's' : ''}` : '—'],
              ].map(([lbl, val]) => `
                <tr>
                  <td style="padding:9px 14px;font-size:13px;color:#6b7280;width:150px;border-bottom:1px solid #f0f0f0;white-space:nowrap;">${lbl}</td>
                  <td style="padding:9px 14px;font-size:13px;color:#1a1a1a;font-weight:600;border-bottom:1px solid #f0f0f0;">${val}</td>
                </tr>`).join('')}
            </table>

            <!-- Services table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;border:1px solid #e5e7eb;">
              <thead>
                <tr style="background:${GREEN};">
                  <th style="${thStyle}width:35%;">Services provided</th>
                  <th style="${thStyle}width:8%;">Unit</th>
                  <th style="${thStyle}width:13%;">Unit Price</th>
                  <th style="${thStyle}width:14%;">Number of Pets</th>
                  <th style="${thStyle}width:9%;">Quantity</th>
                  <th style="${thStyle}width:14%;">Total price</th>
                </tr>
              </thead>
              <tbody>
                ${serviceRowsHtml}
              </tbody>
              <tfoot>
                <tr style="background:#f3f4f6;border-top:2px solid #d1d5db;">
                  <td colspan="5" style="${tdFooter}font-weight:700;color:#111;text-align:right;padding-right:12px;border-right:none;">Total in JD</td>
                  <td style="${tdFooter}font-weight:700;color:#111;">${fmtAmt(total)}</td>
                </tr>
                <tr style="background:#f3f4f6;">
                  <td colspan="5" style="${tdFooter}color:#9ca3af;text-align:right;padding-right:12px;border-right:none;">--</td>
                  <td style="${tdFooter}color:#9ca3af;">--</td>
                </tr>
                <tr style="background:#f3f4f6;">
                  <td colspan="5" style="${tdFooter}font-weight:700;color:#111;text-align:right;padding-right:12px;border-right:none;">Amount due</td>
                  <td style="${tdFooter}font-weight:700;color:${GREEN};">${fmtAmt(amountDue)}</td>
                </tr>
              </tfoot>
            </table>

            <!-- Referral box -->
            <div style="border:2px solid #e5e7eb;border-radius:6px;padding:10px 16px;margin-bottom:16px;text-align:center;">
              <p style="margin:0;color:#2563eb;font-size:0.83rem;font-weight:600;">
                Refer friends &amp; receive up to 10% discount on your and their next visit
              </p>
            </div>

            ${msgSection}

            <!-- Contact -->
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
              Payment: Cash · Card · CliQ 0795535405 / Saleh Abdelhadi
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Questions? <a href="mailto:info@petlodgejo.com" style="color:#5a7a2e;">info@petlodgejo.com</a>
              or <a href="tel:+962798906476" style="color:#5a7a2e;">+962 79 890 6476</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#2d3a1e;border-radius:0 0 12px 12px;padding:18px 28px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#ffffff;opacity:0.85;">
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
    customerName:    payload.customerName    || '',
    petNames:        payload.petNames        || [],
    serviceLabel:    payload.serviceLabel    || '',
    startDate:       payload.startDate       || '',
    endDate:         payload.endDate         || '',
    totalDays:       payload.totalDays       ?? 0,
    lineItems:       payload.lineItems       || [],
    total:           payload.total           ?? 0,
    discount:        payload.discount        ?? 0,
    prepaid:         payload.prepaid         ?? 0,
    totalPaid:       payload.totalPaid       ?? 0,
    amountDue:       payload.amountDue       ?? 0,
    personalMessage: payload.personalMessage || '',
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:     'Pet Lodge Jordan <booking@petlodgejo.com>',
      to:       [customerEmail],
      reply_to: 'info@petlodgejo.com',
      subject:  `Receipt #${bookingRef} | Pet Lodge Jordan`,
      html:     buildHtml(receiptPayload),
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
