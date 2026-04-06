import { Check } from 'lucide-react'

const STEPS = [
  { n: 1, label: 'Customer Info' },
  { n: 2, label: 'Pet Details'   },
  { n: 3, label: 'Services'      },
  { n: 4, label: 'Options'       },
  { n: 5, label: 'Confirmation'  },
]

export default function StepProgress({ current }) {
  return (
    <div className="w-full mb-8">
      {/* Desktop: full labels */}
      <div className="hidden sm:flex items-center justify-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                style={
                  s.n < current
                    ? { background: 'var(--primary)', color: 'white' }
                    : s.n === current
                    ? { background: 'var(--dark)', color: 'white' }
                    : { background: 'white', color: 'var(--muted)', border: '2px solid var(--border)' }
                }
              >
                {s.n < current ? <Check size={16} strokeWidth={3} /> : s.n}
              </div>
              <span
                className="text-xs font-medium whitespace-nowrap"
                style={{ color: s.n <= current ? 'var(--text)' : 'var(--muted)' }}
              >
                {s.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className="h-0.5 w-12 mx-1 mb-5 transition-colors"
                style={{ background: s.n < current ? 'var(--primary)' : 'var(--border)' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile: compact "Step N of 5" */}
      <div className="sm:hidden flex items-center gap-3">
        <div className="flex gap-1.5">
          {STEPS.map(s => (
            <div
              key={s.n}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: s.n === current ? '2rem' : '0.5rem',
                background: s.n <= current ? 'var(--accent)' : 'var(--border)',
              }}
            />
          ))}
        </div>
        <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
          Step {current} of 5 — {STEPS[current - 1].label}
        </span>
      </div>
    </div>
  )
}
