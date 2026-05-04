/**
 * Sends an admin notification email when a customer submits a modification request.
 * Fires the send-modification-notification Supabase Edge Function.
 *
 * @param {object} data
 * @param {string} data.bookingRef
 * @param {string} data.customerFirstName
 * @param {string} data.customerLastName
 * @param {string} [data.serviceType]
 * @param {string} [data.startDate]   – ISO date e.g. "2026-05-03"
 * @param {string} [data.endDate]     – ISO date e.g. "2026-05-10"
 * @param {string[]} [data.petNames]
 * @param {string} data.requestDetails
 *
 * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
 */
export async function sendModificationNotification(data) {
  try {
    const session = JSON.parse(localStorage.getItem('sb-qcwbkpcwtxpokgseethp-auth-token') || 'null')
    const token   = session?.access_token
    const res = await fetch('https://qcwbkpcwtxpokgseethp.supabase.co/functions/v1/send-modification-notification', {
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
