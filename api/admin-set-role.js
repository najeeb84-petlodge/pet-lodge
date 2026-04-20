const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const SUPABASE_URL = 'https://qcwbkpcwtxpokgseethp.supabase.co'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end()
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v))

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'Service role key not configured' })
  }

  const { email, role } = req.body || {}
  if (!email || !role) {
    return res.status(400).json({ error: 'email and role are required' })
  }

  const validRoles = ['admin', 'super_admin', 'employee', 'customer']
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  try {
    // Step 1: Find user by email via admin API
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    )

    if (!listRes.ok) {
      const body = await listRes.json().catch(() => ({}))
      return res.status(500).json({ error: body?.message || 'Failed to look up user' })
    }

    const listBody = await listRes.json()
    const users = listBody?.users || []
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      return res.status(404).json({ error: 'User not found — they must sign up first' })
    }

    // Step 2: Update user_metadata.role via admin API
    const updateRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${user.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_metadata: { role } }),
      }
    )

    if (!updateRes.ok) {
      const body = await updateRes.json().catch(() => ({}))
      return res.status(500).json({ error: body?.message || 'Failed to update user role' })
    }

    // Step 3: Sync profiles table using service role key (bypasses RLS — browser token cannot
    // update another user's profile row due to "auth.uid() = id" RLS policy)
    const profilePatchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ role }),
      }
    )
    if (!profilePatchRes.ok) {
      const txt = await profilePatchRes.text().catch(() => '')
      console.error('admin-set-role: profiles PATCH failed', profilePatchRes.status, txt)
      // Non-fatal: user_metadata.role was updated; log and continue
    }

    return res.status(200).json({ success: true, userId: user.id })
  } catch (err) {
    console.error('admin-set-role error:', err.message)
    return res.status(500).json({ error: 'Unexpected error' })
  }
}
