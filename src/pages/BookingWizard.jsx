import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import TopNav from '../components/TopNav'
import { useWizard } from '../contexts/WizardContext'
import StepProgress from '../components/wizard/StepProgress'
import Step1CustomerInfo from '../components/wizard/Step1CustomerInfo'
import Step2PetDetails from '../components/wizard/Step2PetDetails'

function StepPlaceholder({ title }) {
  return (
    <div className="text-center py-16">
      <p className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>{title}</p>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>Coming soon.</p>
    </div>
  )
}

export default function BookingWizard() {
  const { step } = useWizard()

  return (
    <div className="min-h-screen" style={{ background: '#f8f9f6' }}>
      <TopNav />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm mb-6"
          style={{ color: 'var(--muted)' }}
        >
          <ChevronLeft size={15} /> Back to Dashboard
        </Link>

        <div className="card">
          <StepProgress current={step} />

          {step === 1 && <Step1CustomerInfo />}
          {step === 2 && <Step2PetDetails />}
          {step === 3 && <StepPlaceholder title="Services" />}
          {step === 4 && <StepPlaceholder title="Service Options" />}
          {step === 5 && <StepPlaceholder title="Confirmation" />}
        </div>
      </div>
    </div>
  )
}
