import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://qcwbkpcwtxpokgseethp.supabase.co'
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd2JrcGN3dHhwb2tnc2VldGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDA1MDMsImV4cCI6MjA4OTkxNjUwM30.8kV-I-9skyBk8wlELT3Ft6j2iBCOtKuoYF7wXbcMZFU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb-qcwbkpcwtxpokgseethp-auth-token',
  }
})

// Get access token from localStorage
export function getAccessToken() {
  try {
    const raw = localStorage.getItem('sb-qcwbkpcwtxpokgseethp-auth-token')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.access_token || parsed?.currentSession?.access_token || null
  } catch { return null }
}

// Direct REST query that always works regardless of JS client session state
export async function dbQuery(table, params = '') {
  const token = getAccessToken()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    }
  })
  if (!res.ok) return []
  return res.json()
}

export async function dbUpdate(table, id, body) {
  const token = getAccessToken()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  })
  return res.ok
}
