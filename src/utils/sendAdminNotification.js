/**
 * Sends an admin notification email when a new booking is submitted.
 * Fires the send-admin-notification Supabase Edge Function.
 *
 * @param {object} data
 * @param {string} data.bookingRef
 * @param {string} data.customerFirstName
 * @param {string} data.customerLastName
 * @param {string} data.customerEmail
 * @param {string} [data.customerPhone]
 * @param {string} [data.customerWhatsapp]
 * @param {string[]} data.petNames
 * @param {string} data.checkIn       – formatted date e.g. "24 Apr 2026"
 * @param {string} [data.checkOut]    – formatted date e.g. "10 May 2026"
 * @param {number} [data.nights]
 * @param {string} [data.serviceType]
 * @param {string[]} data.services    – e.g. ["Boarding — 7 nights", "Flea & Tick Protection"]
 * @param {number} [data.totalAmount]
 * @param {string|null} [data.additional_comments]
 * @param {object[]} [data.pets_data]         – raw pets array (for per-pet medication notes)
 * @param {object}   [data.service_details]   – booking service_details (for perPet food/walker/driver notes)
 * @param {boolean} [data.has_transport]
 * @param {string|null} [data.pickup_date]
 * @param {string|null} [data.pickup_time]
 * @param {string|null} [data.dropoff_date]
 * @param {string|null} [data.dropoff_time]
 *
 * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
 */
export async function sendAdminNotification(data) {
  try {
    const session = JSON.parse(localStorage.getItem('sb-qcwbkpcwtxpokgseethp-auth-token') || 'null')
    const token   = session?.access_token
    const res = await fetch('https://qcwbkpcwtxpokgseethp.supabase.co/functions/v1/send-admin-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      return { success: false, error: body?.error || `HTTP ${res.status}` }
    }

    return { success: true, id: body.id }
  } catch (err) {
    return { success: false, error: err?.message || 'Network error' }
  }
}
