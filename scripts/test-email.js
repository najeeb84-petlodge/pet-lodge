const payload = {
  bookingRef:    'PL-260417-TEST',
  customerName:  'Najeeb Hadi',
  customerEmail: 'najeeb84@gmail.com',
  petNames:      ['Cruise'],
  checkIn:       '2026-04-25',
  checkOut:      '2026-04-30',
  nights:        5,
  services:      ['Boarding', 'Premium Food'],
  totalPrice:    284,
}

async function main() {
  console.log('POSTing to http://localhost:3000/api/send-confirmation ...')
  console.log('Payload:', JSON.stringify(payload, null, 2))

  try {
    const res = await fetch('http://localhost:3000/api/send-confirmation', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    const body = await res.json().catch(() => null)
    console.log('\nStatus:', res.status, res.statusText)
    console.log('Response body:', JSON.stringify(body, null, 2))
  } catch (err) {
    console.error('\nFetch error:', err.message)
  }
}

main()
