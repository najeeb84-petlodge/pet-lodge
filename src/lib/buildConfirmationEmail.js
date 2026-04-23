// Shared confirmation email HTML builder.
// Used by BookingModal.jsx (preview + send payload) and referenced by the
// send-confirmation Edge Function (which accepts a pre-built `html` field).
// Keeping the builder here ensures the preview is byte-identical to what Resend delivers.

const LOGO_URL = 'https://pet-lodge.vercel.app/logo-email.jpg'

function htmlEscape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Build the confirmation email HTML.
 * @param {object} p
 * @param {string}   p.bookingRef
 * @param {string}   p.customerName
 * @param {string[]} p.petNames
 * @param {string}   p.checkIn
 * @param {string}   p.checkOut
 * @param {number}   p.nights
 * @param {string[]} p.services
 * @param {boolean}  [p.has_transport]
 * @param {string}   [p.pickup_date]
 * @param {string}   [p.pickup_time]
 * @param {string}   [p.dropoff_date]
 * @param {string}   [p.dropoff_time]
 * @param {string}   [p.custom_message]
 * @returns {string} Full HTML document
 */
export function buildConfirmationEmail(p) {
  const pets      = p.petNames.length ? p.petNames.join(', ') : '—'
  const petName   = p.petNames[0] || pets
  const firstName = (p.customerName || '').split(' ')[0] || 'there'

  const pills = (p.services || []).map(s =>
    `<span style="display:inline-block;background:#eef4e2;color:#3B6D11;border-radius:20px;padding:3px 10px;margin:2px;font-size:12px;">${s}</span>`
  ).join(' ')

  const transportBlock = p.has_transport ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;border-collapse:collapse;">
          <tr>
            <td style="background:#f8f8f8;border:1px solid #e5e7eb;border-radius:6px;padding:12px 14px;">
              <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Transport details</p>
              <p style="margin:0 0 4px;font-size:13px;color:#374151;"><strong>Pick-up:</strong> ${p.pickup_date || '—'} &nbsp;·&nbsp; ${p.pickup_time || '—'}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#374151;"><strong>Drop-off:</strong> ${p.dropoff_date || '—'} &nbsp;·&nbsp; ${p.dropoff_time || '—'}</p>
              <p style="margin:0;font-size:12px;color:#6b7280;font-style:italic;">We'll do our best to be on time. If we need to adjust slightly, we'll call ahead.</p>
            </td>
          </tr>
        </table>` : ''

  const customMsgBlock = p.custom_message
    ? `<p style="font-style:italic;color:#555555;padding-left:10px;border-left:2px solid #7aa63c;margin:10px 0 14px;">${htmlEscape(p.custom_message)}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Booking Confirmation</title></head>
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

        ${customMsgBlock}

        <!-- Hero box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef4e2;border-radius:8px;margin-bottom:20px;">
          <tr>
            <td style="padding:14px 18px;vertical-align:middle;">
              <p style="margin:0 0 3px;font-size:15px;font-weight:700;color:#2d3a1e;">${pets} is officially booked in.</p>
              <p style="margin:0;font-size:12px;color:#5a7a2e;">Your booking is confirmed. We'll take great care of them.</p>
            </td>
            <td style="padding:14px 18px;text-align:right;white-space:nowrap;vertical-align:middle;">
              <span style="display:inline-block;border:1px solid #7aa63c;border-radius:20px;padding:3px 10px;color:#2d3a1e;font-size:11px;">${p.bookingRef}</span>
            </td>
          </tr>
        </table>

        <!-- 2x2 detail table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;border-spacing:0;overflow:hidden;margin-bottom:20px;">
          <tr>
            <td style="padding:10px 14px;width:50%;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Check-in</p>
              <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a;">${p.checkIn || '—'}</p>
            </td>
            <td style="padding:10px 14px;width:50%;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Check-out</p>
              <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a;">${p.checkOut || '—'}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 14px;border-right:1px solid #e5e7eb;vertical-align:top;">
              <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Pet name(s)</p>
              <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a;">${pets}</p>
            </td>
            <td style="padding:10px 14px;vertical-align:top;">
              <p style="margin:0 0 3px;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Duration</p>
              <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a;">${p.nights ? `${p.nights} night${p.nights !== 1 ? 's' : ''}` : '—'}</p>
            </td>
          </tr>
        </table>

        <!-- Services -->
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Services included</p>
        <p style="margin:0 0 20px;line-height:1.8;">${pills || '—'}</p>

        ${transportBlock}

        <!-- Policy note -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border-collapse:collapse;">
          <tr>
            <td style="border-left:3px solid #7aa63c;background:#f5f5f5;padding:12px 16px;font-size:12px;color:#6b7280;line-height:1.65;">
              All invoices are based on our <a href="https://petlodgejo.com/services-and-prices" style="color:#5a7a2e;font-weight:bold;text-decoration:underline;">price list</a> unless otherwise agreed.
              Please let us know 48 hours in advance for any cancellations or date changes.
              Questions? Check our <a href="https://petlodgejo.com/faqs" style="color:#5a7a2e;font-weight:bold;text-decoration:underline;">FAQs</a> or reply to this email.
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0;font-size:13px;color:#6b7280;font-style:italic;">
          Don't forget to follow us on <a href="https://www.instagram.com/pet.lodge.jo/" style="color:#5a7a2e;font-weight:bold;">Instagram</a> — you just might catch ${petName} living their absolute best life.
        </p>

        <p style="margin:20px 0 0;font-size:14px;color:#374151;">Kind regards,<br><strong>Pet Lodge Customer Care</strong></p>

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

/**
 * Build the email subject line (same format as the Edge Function).
 */
export function buildEmailSubject(p) {
  const nameParts    = (p.customerName || '').split(' ')
  const first        = nameParts[0] || ''
  const last         = nameParts.slice(1).join(' ') || ''
  const petsJoined   = (p.petNames || []).join(', ')
  const serviceType  = ((p.services || [])[0] || '').replace(/\s*[×x]\s*\d+.*/i, '').trim() || (p.services || [])[0] || '—'
  return `Booking Confirmation (${serviceType}) - ${first} ${last} (${petsJoined}) - ${p.bookingRef}`
}
