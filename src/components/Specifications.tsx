import { useReveal } from '../hooks/useReveal'
import { HEADLINE_SPECS, MILESTONES, SOURCES, TIMELINE } from '../data/aircraftData'

/** Chapter V Ă˘â‚¬â€ť animated specification panels. */
export function SpecGrid() {
  const ref = useReveal<HTMLDivElement>()

  return (
    <div ref={ref} className="reveal mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/8 sm:grid-cols-2 lg:grid-cols-3">
      {HEADLINE_SPECS.map((s) => (
        <div
          key={s.label}
          className="group relative bg-void/85 p-6 transition-colors duration-500 hover:bg-navy/40"
        >
          <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-electric transition-transform duration-500 group-hover:scale-x-100" />
          <p className="font-mono text-[0.63rem] uppercase tracking-[0.22em] text-silver/50">
            {s.label}
          </p>
          <p className="mt-3 font-display text-[2.4rem] font-bold leading-none tracking-tight text-mist">
            {s.value}
            {s.unit && (
              <span className="ml-1.5 text-[0.95rem] font-medium text-electric/80">{s.unit}</span>
            )}
          </p>
          {s.note && (
            <p className="mt-2.5 text-[0.82rem] font-light leading-relaxed text-silver/55">
              {s.note}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

/** Milestone counters. */
export function MilestoneRow() {
  const ref = useReveal<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className="reveal mt-14 grid grid-cols-2 gap-8 border-t border-white/10 pt-10 lg:grid-cols-4"
    >
      {MILESTONES.map((m) => (
        <div key={m.label}>
          <p className="font-display text-[clamp(2rem,4.4vw,3.1rem)] font-bold leading-none text-mist">
            {m.value}
          </p>
          <p className="mt-3 font-display text-[0.85rem] font-medium text-electric">{m.label}</p>
          <p className="mt-2 text-[0.82rem] font-light leading-relaxed text-silver/55">
            {m.detail}
          </p>
        </div>
      ))}
    </div>
  )
}

/** History timeline, Chapter I. */
export function Timeline() {
  const ref = useReveal<HTMLDivElement>()

  return (
    <div ref={ref} className="reveal mt-12">
      <ol className="relative border-l border-white/12 pl-7">
        {TIMELINE.map((t) => (
          <li key={t.year} className="group relative pb-9 last:pb-0">
            <span className="absolute -left-[2.13rem] top-1.5 h-2.5 w-2.5 rounded-full border border-electric/70 bg-void transition-all duration-500 group-hover:bg-electric group-hover:shadow-[0_0_14px_var(--color-electric)]" />
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-mono text-[0.82rem] font-medium tracking-[0.12em] text-electric">
                {t.year}
              </span>
              <span className="font-display text-[1.05rem] font-semibold text-mist">
                {t.title}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-[0.92rem] font-light leading-relaxed text-silver/62">
              {t.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Source list, shown in the closing chapter. */
export function SourceList() {
  const ref = useReveal<HTMLDivElement>()

  return (
    <div ref={ref} className="reveal mt-12 rounded-2xl border border-white/10 bg-void/50 p-6">
      <p className="eyebrow">Sources</p>
      <ul className="mt-4 space-y-3">
        {SOURCES.map((s) => (
          <li key={s.id}>
            <a
              href={s.href}
              target="_blank"
              rel="noreferrer noopener"
              className="group block transition-colors"
            >
              <span className="block font-display text-[0.92rem] font-medium text-mist/90 group-hover:text-electric">
                {s.label} <span aria-hidden>Ă˘â€ â€”</span>
              </span>
              <span className="mt-0.5 block text-[0.78rem] font-light text-silver/45">
                {s.detail}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[0.75rem] font-light leading-relaxed text-silver/38">
        Figures are quoted from the sources above. Where manufacturers publish a range
        (seating, range, payload) the configuration-dependent value is stated rather
        than a single headline number. The 3D aircraft is a procedural reconstruction
        built to the published dimensions, not a manufacturer CAD model.
      </p>
    </div>
  )
}




