import { createContext, useContext, useState } from 'react'

const WizardContext = createContext({})

const INITIAL_CUSTOMER_INFO = {
  first_name:             '',
  last_name:              '',
  email:                  '',
  contact_number:         '',
  whatsapp_number:        '',
  whatsapp_same:          false,
  how_they_heard:         [],   // array — multiple selection
  newsletter_preferences: [],   // array — optional
}

export function WizardProvider({ children }) {
  const [step, setStep]                           = useState(1)
  const [customerInfo, setCustomerInfo]           = useState(INITIAL_CUSTOMER_INFO)
  const [petsData, setPetsData]                   = useState([])
  const [serviceType, setServiceType]             = useState('')
  const [serviceOptions, setServiceOptions]       = useState({})
  const [serviceOptionDetails, setServiceOptionDetails] = useState({})
  const [confirmationData, setConfirmationData]   = useState(null)

  function nextStep() { setStep(s => Math.min(s + 1, 5)) }
  function prevStep() { setStep(s => Math.max(s - 1, 1)) }
  function goToStep(n) { setStep(n) }

  return (
    <WizardContext.Provider value={{
      step, nextStep, prevStep, goToStep,
      customerInfo, setCustomerInfo,
      petsData, setPetsData,
      serviceType, setServiceType,
      serviceOptions, setServiceOptions,
      serviceOptionDetails, setServiceOptionDetails,
      confirmationData, setConfirmationData,
    }}>
      {children}
    </WizardContext.Provider>
  )
}

export const useWizard = () => useContext(WizardContext)
