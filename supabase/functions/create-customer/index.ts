import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Decode JWT payload without verifying signature.
// Supabase already verified the JWT at the platform/auth layer.
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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // ── Role gate ────────────────────────────────────────────────────────────────
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

  // ── Parse + validate body ────────────────────────────────────────────────────
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { first_name, last_name, email, phone, whatsapp_number } = body

  if (!first_name?.trim()) return json({ error: 'first_name is required' }, 400)
  if (!last_name?.trim())  return json({ error: 'last_name is required' }, 400)
  if (!email?.trim())      return json({ error: 'email is required' }, 400)
  if (!phone?.trim())      return json({ error: 'phone is required' }, 400)
  if (!isValidEmail(email.trim())) return json({ error: 'email is not a valid address' }, 400)

  // Normalize email to lowercase — Supabase auth stores emails lowercase
  const emailNorm = email.trim().toLowerCase()

  // ── Supabase admin client (service role — bypasses RLS) ─────────────────────
  const supabaseUrl    = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server misconfiguration: missing env vars' }, 500)
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Duplicate check (profiles table) ────────────────────────────────────────
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', emailNorm)
    .maybeSingle()

  if (lookupError) {
    console.error('create-customer: profiles lookup failed', lookupError)
    return json({ error: 'Failed to check for existing customer' }, 500)
  }
  if (existing) {
    return json({
      error: 'A customer with this email already exists',
      existing_profile_id: existing.id,
    }, 409)
  }

  // ── Create auth user ─────────────────────────────────────────────────────────
  // first_name/last_name in user_metadata are read by the on_auth_user_created
  // trigger (handle_new_user) which immediately inserts a partial profiles row.
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: emailNorm,
    email_confirm: true,          // skip email verification — admin vouches for them
    user_metadata: {
      role:       'customer',
      first_name: first_name.trim(),
      last_name:  last_name.trim(),
    },
  })

  if (createError || !authData?.user) {
    console.error('create-customer: auth.admin.createUser failed', createError)
    return json({ error: createError?.message || 'Failed to create user account' }, 500)
  }

  const newUserId = authData.user.id

  // ── Update profiles row ──────────────────────────────────────────────────────
  // The on_auth_user_created trigger already inserted a partial row (id, email,
  // first_name, last_name). UPDATE fills in the remaining fields.
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      phone:           phone.trim(),
      whatsapp_number: whatsapp_number?.trim() || null,
      role:            'customer',
    })
    .eq('id', newUserId)

  if (updateError) {
    console.error('create-customer: profiles update failed', updateError)
    // Best-effort cleanup: remove partial profile then auth user
    await supabaseAdmin.from('profiles').delete().eq('id', newUserId)
      .catch(e => console.error('create-customer: cleanup profile delete failed', e))
    await supabaseAdmin.auth.admin.deleteUser(newUserId)
      .catch(e => console.error('create-customer: cleanup deleteUser failed', e))
    return json({ error: 'Failed to update customer profile: ' + updateError.message }, 500)
  }

  // ── Generate password-setup link (recovery type) ─────────────────────────────
  // Non-fatal — user + profile were created; if this fails, return success without the link
  let inviteLink: string | null = null
  try {
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type:    'recovery',
      email:   emailNorm,
      options: { redirectTo: 'https://booking.petlodgejo.com/auth/set-password' },
    })
    if (linkError) {
      console.error('create-customer: generateLink failed', linkError)
    } else {
      inviteLink = (linkData as { properties?: { action_link?: string } } | null)
        ?.properties?.action_link ?? null
    }
  } catch (e) {
    console.error('create-customer: generateLink threw', e)
  }

  return json({
    success:     true,
    user_id:     newUserId,
    profile_id:  newUserId,
    email:       emailNorm,
    invite_link: inviteLink,
  })
})
