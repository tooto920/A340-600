import { useState } from 'react'
import { EXPLORER_FACTS, type ExplorerView } from '../scenes/ExplorerScene'

interface ExplorerProps {
  view: ExplorerView
  onView: (v: ExplorerView) => void
  gearDown: boolean
  onGear: (v: boolean) => void
  enginesRunning: boolean
  onEngines: (v: boolean) => void
  nightMode: boolean
  onNight: (v: boolean) => void
}

const VIEW_BUTTONS: { id: ExplorerView; label: string }[] = [
  { id: 'reset', label: 'Reset' },
  { id: 'front', label: 'Front' },
  { id: 'rear', label: 'Rear' },
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' },
  { id: 'engine', label: 'Engine' },
  { id: 'cockpit', label: 'Cockpit' },
]

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-void/45 px-4 py-3 text-left transition-colors duration-300 hover:border-electric/40"
    >
      <span>
        <span className="block font-display text-[0.82rem] font-medium text-mist/90">
          {label}
        </span>
        {hint && (
          <span className="mt-0.5 block text-[0.7rem] font-light text-silver/45">{hint}</span>
        )}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
          checked ? 'bg-electric/85' : 'bg-white/12'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-mist shadow transition-transform duration-300 ${
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}

export function ExplorerPanel({
  view,
  onView,
  gearDown,
  onGear,
  enginesRunning,
  onEngines,
  nightMode,
  onNight,
}: ExplorerProps) {
  const [factsOpen, setFactsOpen] = useState(true)

  return (
    <div className="pointer-events-auto flex w-full flex-col gap-4 lg:w-[19rem]">
      {/* View presets */}
      <div className="panel rounded-2xl p-4">
        <p className="eyebrow mb-3">Camera</p>
        <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-2">
          {VIEW_BUTTONS.map((b) => (
            <button
              key={b.id}
              onClick={() => onView(b.id)}
              aria-pressed={view === b.id}
              className={`rounded-lg border px-2 py-2 font-display text-[0.7rem] font-medium uppercase tracking-[0.1em] transition-all duration-300 ${
                view === b.id
                  ? 'border-electric/60 bg-electric/15 text-mist'
                  : 'border-white/10 bg-void/40 text-silver/60 hover:border-electric/30 hover:text-mist'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[0.7rem] font-light leading-relaxed text-silver/40">
          Drag to rotate · scroll to zoom · right-drag to pan
        </p>
      </div>

      {/* Configuration */}
      <div className="panel rounded-2xl p-4">
        <p className="eyebrow mb-3">Configuration</p>
        <div className="space-y-2">
          <Toggle
            label="Landing gear"
            hint="Nose, wing and centre-body bogies"
            checked={gearDown}
            onChange={onGear}
          />
          <Toggle
            label="Engines"
            hint="Trent 556 fan discs"
            checked={enginesRunning}
            onChange={onEngines}
          />
          <Toggle
            label="Night lighting"
            hint="Cabin windows and runway tones"
            checked={nightMode}
            onChange={onNight}
          />
        </div>
      </div>

      {/* Contextual fact */}
      <div className="panel rounded-2xl p-4">
        <button
          onClick={() => setFactsOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={factsOpen}
        >
          <span className="eyebrow">Detail</span>
          <span
            className={`text-silver/50 transition-transform duration-300 ${factsOpen ? 'rotate-180' : ''}`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-400 ${
            factsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <p className="pt-3 text-[0.85rem] font-light leading-relaxed text-silver/72">
              {EXPLORER_FACTS[view] ??
                'A procedural reconstruction of the Airbus A340-600, built to the published dimensions: 75.36 m long, 63.45 m across the wings, 17.80 m tall.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
