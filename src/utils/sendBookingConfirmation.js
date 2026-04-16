/**
 * Sends a booking confirmation email via the /api/send-confirmation serverless function.
 *
 * @param {object} data
 * @param {string} data.bookingRef
 * @param {string} data.customerName
 * @param {string} data.customerEmail
 * @param {string[]} data.petNames
 * @param {string} data.checkIn       – formatted date string e.g. "24 Apr 2026"
 * @param {string} data.checkOut      – formatted date string e.g. "10 May 2026"
 * @param {number} data.nights
 * @param {string[]} data.services    – e.g. ["Boarding", "Flea & Tick Protection"]
 * @param {number} data.totalPrice
 *
 * @returns {Promise<{ success: boolean, id?: string, error?: string }>}
 */
export async function sendBookingConfirmation(data) {
  try {
    const res = await fetch('/api/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
