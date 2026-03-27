import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qcwbkpcwtxpokgseethp.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd2JrcGN3dHhwb2tnc2VldGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDA1MDMsImV4cCI6MjA4OTkxNjUwM30.8kV-I-9skyBk8wlELT3Ft6j2iBCOtKuoYF7wXbcMZFU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-qcwbkpcwtxpokgseethp-auth-token',
  }
})

// Restore session from our manually stored token if Supabase client doesn't have it
async function restoreSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return // Already has session

  try {
    const raw = localStorage.getItem('sb-qcwbkpcwtxpokgseethp-auth-token')
    if (!raw) return
    const parsed = JSON.parse(raw)
    const access_token  = parsed.access_token
    const refresh_token = parsed.refresh_token
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token })
    }
  } catch (e) {
    console.warn('Could not restore session:', e)
  }
}

restoreSession()
