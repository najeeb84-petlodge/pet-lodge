import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const LOGO_URL = 'https://pet-lodge.vercel.app/logo-email.jpg'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

function htmlEscape(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildWelcomeHtml(firstName: string, inviteLink: string): string {
  const safeFirstName = htmlEscape(firstName)
  const safeLink      = htmlEscape(inviteLink)

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Welcome to Pet Lodge</title></head>
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

        <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi ${safeFirstName},</p>

        <!-- Welcome block -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7e6;border:1px solid #a3d977;border-radius:8px;margin:0 0 20px;border-collapse:collapse;">
          <tr>
            <td style="padding:16px 18px;">
              <p style="margin:0 0 2px;font-size:20px;">&#x1F511;</p>
              <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#2d3a1e;">Welcome to Pet Lodge, ${safeFirstName}!</p>
              <p style="margin:0 0 14px;font-size:13px;color:#374151;line-height:1.5;">Your account has been created. Set your password to manage bookings and view your pet&apos;s profile online.</p>
              <a href="${safeLink}" style="display:inline-block;background:#5a7a2e;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:6px;font-size:13px;font-weight:700;">Set my password</a>
              <p style="margin:12px 0 0;font-size:11px;color:#6b7280;font-style:italic;">This link expires in 24 hours. If it has expired, contact us and we&apos;ll send a new one.</p>
            </td>
          </tr>
        </table>

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // ── Role gate (matches create-customer pattern) ───────────────────────────────
  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization token' }, 403)
  }
  const callerToken = authHeader.slice(7)
  const jwtPayload  = decodeJwtPayload(callerToken)
  const callerRole  = (jwtPayload?.user_metadata as Record<string, string> | undefined)?.role
  if (!callerRole || !['admin', 'super_admin'].includes(callerRole)) {
    return json({ error: 'Forbidden: admin or super_admin role required' }, 403)
  }

  // ── Parse + validate body ─────────────────────────────────────────────────────
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { email, first_name } = body
  if (!email?.trim())      return json({ error: 'email is required' }, 400)
  if (!first_name?.trim()) return json({ error: 'first_name is required' }, 400)

  const emailNorm = email.trim().toLowerCase()

  // ── Supabase admin client ─────────────────────────────────────────────────────
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey   = Deno.env.get('RESEND_API_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server misconfiguration: missing Supabase env vars' }, 500)
  }
  if (!resendApiKey) {
    return json({ error: 'Server misconfiguration: missing RESEND_API_KEY' }, 500)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Generate fresh recovery link ──────────────────────────────────────────────
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type:    'recovery',
    email:   emailNorm,
    options: { redirectTo: 'https://booking.petlodgejo.com/auth/set-password' },
  })

  if (linkError) {
    console.error('resend-welcome: generateLink failed', linkError)
    return json({ error: 'Failed to generate password reset link: ' + linkError.message }, 500)
  }

  const inviteLink = (linkData as { properties?: { action_link?: string } } | null)
    ?.properties?.action_link ?? null

  if (!inviteLink) {
    console.error('resend-welcome: generateLink returned no action_link')
    return json({ error: 'Failed to generate password reset link' }, 500)
  }

  // ── Send via Resend ───────────────────────────────────────────────────────────
  const html = buildWelcomeHtml(first_name.trim(), inviteLink)

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:     'Pet Lodge Jordan <booking@petlodgejo.com>',
      to:       [emailNorm],
      reply_to: 'info@petlodgejo.com',
      subject:  'Welcome to Pet Lodge — Set your password',
      html,
      headers: { 'X-Entity-Ref-ID': 'WELCOME-RESEND' },
    }),
  })

  const resendBody = await resendRes.json()

  if (!resendRes.ok) {
    console.error('resend-welcome: Resend error', resendRes.status, resendBody)
    return json({ error: resendBody?.message || 'Failed to send email' }, 500)
  }

  return json({ success: true, id: resendBody.id })
})
