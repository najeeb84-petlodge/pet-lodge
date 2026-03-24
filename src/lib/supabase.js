import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qcwbkpcwtxpokgseethp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjd2JrcGN3dHhwb2tnc2VldGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDA1MDMsImV4cCI6MjA4OTkxNjUwM30.8kV-I-9skyBk8wlELT3Ft6j2iBCOtKuoYF7wXbcMZFU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
