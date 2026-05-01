import { SUPABASE_URL, getAccessToken } from '../lib/supabase'

export async function resendWelcome({ email, firstName }) {
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated. Please sign in again.')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/resend-welcome`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ email, first_name: firstName }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}
