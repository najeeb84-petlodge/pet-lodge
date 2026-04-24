import { SUPABASE_URL, SUPABASE_KEY, getAccessToken } from '../lib/supabase'

/**
 * After a successful booking INSERT, patch the customer's profiles row with
 * any non-empty name/phone/whatsapp values so the next booking pre-fills.
 * Silent failure — never blocks the booking success flow.
 *
 * @param {string|null} customerId  - profiles.id (auth.uid) for the customer
 * @param {{ firstName, lastName, phone, whatsapp }} fields
 */
export async function syncProfileFromBooking(customerId, { firstName, lastName, phone, whatsapp }) {
  if (!customerId) return

  const updates = {}
  if (firstName?.trim()) updates.first_name      = firstName.trim()
  if (lastName?.trim())  updates.last_name       = lastName.trim()
  if (phone?.trim())     updates.phone           = phone.trim()
  if (whatsapp?.trim())  updates.whatsapp_number = whatsapp.trim()

  if (!Object.keys(updates).length) return

  const token = getAccessToken()
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${customerId}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(updates),
    })
  } catch (err) {
    console.warn('[syncProfile] failed:', err)
  }
}
