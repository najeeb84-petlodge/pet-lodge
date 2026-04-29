import { differenceInDays, parseISO } from 'date-fns'

const TRANSPORT_OPTIONS = [
  { value: 'round_trip',   label: 'Round trip',            sublabel: 'Pick up + drop off — JD 30' },
  { value: 'pickup_only',  label: 'Pick up only',          sublabel: 'JD 15' },
  { value: 'dropoff_only', label: 'Drop off only',         sublabel: 'JD 15' },
  { value: 'self',         label: "I'll handle transport", sublabel: 'No charge' },
]

export function computeLineItems(serviceType, perPetForms, serviceOptions, prices, petsData) {
  const nights = (serviceOptions?.startDate && serviceOptions?.endDate)
    ? Math.max(1, differenceInDays(parseISO(serviceOptions.endDate), parseISO(serviceOptions.startDate)))
    : 1

  const find = (cat, id) => (prices[cat] || []).find(p => p.id === id)

  switch (serviceType) {

    case 'boarding': {
      const base = find('boarding', serviceOptions?.option)
      const items = []
      if (base) items.push({
        label: `${base.name} × ${nights} nights`,
        amount: parseFloat(base.price || 0) * nights,
        unit: 'night',
        unit_price: parseFloat(base.price || 0),
        quantity: nights,
        num_pets: petsData.length || 1,
      })
      const transportCost = { round_trip: 30, pickup_only: 15, dropoff_only: 15, self: 0 }
      let transportAdded = false
      perPetForms.forEach(pf => {
        if (pf.foodChoice === 'lodge_small') items.push({ label: `Food (small/cat) for ${pf.petName}`, amount: 2 * nights, unit: 'night', unit_price: 2, quantity: nights, num_pets: 1 })
        if (pf.foodChoice === 'lodge_large') items.push({ label: `Food (medium/large) for ${pf.petName}`, amount: 4 * nights, unit: 'night', unit_price: 4, quantity: nights, num_pets: 1 })
        if (pf.fleaTick === 'lodge_applies') {
          const petType = petsData[pf.petIndex]?.type
          const a = petType === 'cat' ? 25 : 35
          items.push({ label: `Flea & tick for ${pf.petName}`, amount: a, unit: 'service', unit_price: a, quantity: 1, num_pets: 1 })
        }
        if (!transportAdded && pf.transport) {
          const tc = transportCost[pf.transport]
          if (tc > 0) items.push({ label: `Transport (${TRANSPORT_OPTIONS.find(o => o.value === pf.transport)?.label})`, amount: tc, unit: 'service', unit_price: tc, quantity: 1, num_pets: 1 })
          transportAdded = true
        }
        if (pf.groomingPackageId) {
          const pkg = (prices.grooming_addon || []).find(p => p.id === pf.groomingPackageId)
          if (pkg) {
            const a = parseFloat(pkg.price || 0)
            items.push({ label: `${pkg.name} (grooming) for ${pf.petName}`, amount: a, unit: 'service', unit_price: a, quantity: 1 })
          }
        }
        ;(pf.groomingAddOns || []).forEach(addonId => {
          const addon = (prices.grooming_addon || []).find(p => p.id === addonId)
          if (addon) {
            const a = parseFloat(addon.price || 0)
            items.push({ label: `${addon.name} for ${pf.petName}`, amount: a, unit: 'service', unit_price: a, quantity: 1 })
          }
        })
        {
          const allTRows = prices.training_addon || []
          const trainingAddonId = pf.trainingAddonId
          const selectedRow = allTRows.find(r => r.id === trainingAddonId)
            || (pf.trainingSessions > 0 ? allTRows[0] : null)
          if (selectedRow) {
            const isBundle = (selectedRow.name || '').toLowerCase().includes('bundle')
            const goalsNote = pf.trainingGoals ? ` — "${pf.trainingGoals.slice(0, 40)}"` : ''
            if (isBundle && trainingAddonId) {
              const price = parseFloat(selectedRow.price || 0)
              items.push({ label: `Training (${selectedRow.name}) for ${pf.petName}${goalsNote}`, amount: price, unit: 'service', unit_price: price, quantity: 1 })
            } else if (!isBundle && pf.trainingSessions > 0) {
              const price = parseFloat(selectedRow.price || 35)
              const a = price * pf.trainingSessions
              items.push({ label: `Training (${pf.trainingSessions} session${pf.trainingSessions > 1 ? 's' : ''}) for ${pf.petName}${goalsNote}`, amount: a, unit: 'service', unit_price: price, quantity: pf.trainingSessions })
            }
          }
        }
      })
      return items
    }

    case 'day_camp': {
      const items = []
      perPetForms.forEach(pf => {
        if (pf.packageId && pf.packagePrice > 0) {
          const pkg = find('day_camp', pf.packageId)
          items.push({ label: `${pkg?.name || 'Day Camp package'} for ${pf.petName}`, amount: pf.packagePrice, unit: 'service', unit_price: pf.packagePrice, quantity: 1 })
        }
        if (pf.fleaTick === 'lodge_applies') {
          const petType = petsData[pf.petIndex]?.type
          const a = petType === 'cat' ? 25 : 35
          items.push({ label: `Flea & tick for ${pf.petName}`, amount: a, unit: 'service', unit_price: a, quantity: 1 })
        }
        if (pf.groomingPackageId) {
          const pkg = (prices.grooming_addon || []).find(p => p.id === pf.groomingPackageId)
          if (pkg) {
            const a = parseFloat(pkg.price || 0)
            items.push({ label: `${pkg.name} (grooming) for ${pf.petName}`, amount: a, unit: 'service', unit_price: a, quantity: 1 })
          }
        }
        ;(pf.groomingAddOns || []).forEach(addonId => {
          const addon = (prices.grooming_addon || []).find(p => p.id === addonId)
          if (addon) {
            const a = parseFloat(addon.price || 0)
            items.push({ label: `${addon.name} for ${pf.petName}`, amount: a, unit: 'service', unit_price: a, quantity: 1 })
          }
        })
        {
          const allTRows = prices.training_addon || []
          const trainingAddonId = pf.trainingAddonId
          const selectedRow = allTRows.find(r => r.id === trainingAddonId)
            || (pf.trainingSessions > 0 ? allTRows[0] : null)
          if (selectedRow) {
            const isBundle = (selectedRow.name || '').toLowerCase().includes('bundle')
            const goalsNote = pf.trainingGoals ? ` — "${pf.trainingGoals.slice(0, 40)}"` : ''
            if (isBundle && trainingAddonId) {
              const price = parseFloat(selectedRow.price || 0)
              items.push({ label: `Training (${selectedRow.name}) for ${pf.petName}${goalsNote}`, amount: price, unit: 'service', unit_price: price, quantity: 1 })
            } else if (!isBundle && pf.trainingSessions > 0) {
              const price = parseFloat(selectedRow.price || 35)
              const a = price * pf.trainingSessions
              items.push({ label: `Training (${pf.trainingSessions} session${pf.trainingSessions > 1 ? 's' : ''}) for ${pf.petName}${goalsNote}`, amount: a, unit: 'service', unit_price: price, quantity: pf.trainingSessions })
            }
          }
        }
      })
      items.push({ label: 'Pick up & drop off', amount: 0, note: 'Complimentary' })
      return items
    }

    case 'dog_walking': {
      const items = []
      perPetForms.forEach(pf => {
        if (pf.packageId && pf.packagePrice > 0) {
          const pkg = find('dog_walking', pf.packageId)
          items.push({ label: `${pkg?.name || 'Dog Walking package'} for ${pf.petName}`, amount: pf.packagePrice, unit: 'service', unit_price: pf.packagePrice, quantity: 1 })
        }
      })
      return items
    }

    case 'grooming': {
      const items = []
      perPetForms.forEach(pf => {
        if (pf.selectionMode === 'package' && pf.packageId) {
          const pkg = find('grooming', pf.packageId)
          if (pkg) {
            const a = parseFloat(pkg.price || 0)
            items.push({ label: `${pkg.name} for ${pf.petName}`, amount: a, unit: 'service', unit_price: a, quantity: 1 })
          }
          if (pf.transport && pf.transport !== 'self') {
            const label = pf.transport === 'round_trip' ? 'Pick up & drop off'
              : pf.transport === 'pickup_only' ? 'Pick up'
              : 'Drop off'
            items.push({ label, amount: 0, note: 'Included', unit: 'service', unit_price: 0, quantity: 1 })
          }
        } else if (pf.selectionMode === 'standalone') {
          const petType = petsData[pf.petIndex]?.type
          if (pf.standaloneAddOns?.includes('hair_trim')) items.push({ label: `Hair trim for ${pf.petName}`, amount: 20, unit: 'service', unit_price: 20, quantity: 1, num_pets: 1 })
          if (pf.standaloneAddOns?.includes('nail_clip')) items.push({ label: `Nail clip for ${pf.petName}`, amount: 10, unit: 'service', unit_price: 10, quantity: 1, num_pets: 1 })
          if (pf.standaloneAddOns?.includes('bathing')) {
            const a = petType === 'cat' ? 15 : 10
            items.push({ label: `Bathing for ${pf.petName}`, amount: a, unit: 'service', unit_price: a, quantity: 1, num_pets: 1 })
          }
        }
      })
      return items
    }

    case 'transport': {
      const base = find('transport', serviceOptions?.option)
      if (!base) return []
      const a = parseFloat(base.price || 0)
      return [{ label: base.name, amount: a, unit: 'service', unit_price: a, quantity: 1 }]
    }

    case 'training': {
      return []
    }

    default: return []
  }
}
