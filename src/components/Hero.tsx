import { useReveal } from '../hooks/useReveal'

export function Hero({ onExplore }: { onExplore: () => void }) {
  const ref = useReveal<HTMLDivElement>()

  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] flex-col px-6 pt-28 pb-10 text-center"
    >
      {/*
        The type occupies the top of the viewport; the lower band is left
        clear so the 3D aircraft reads as a separate object in the scene
        rather than fighting the headline for the same pixels.
      */}
      <div ref={ref} className="relative z-10 flex w-full flex-col items-center">
        <p className="eyebrow reveal is-visible">Airbus · Widebody · 2002—2020</p>

        <h1 className="headline-xl reveal is-visible mt-5 text-[clamp(3rem,11.5vw,9.5rem)] text-mist">
          A340-600
        </h1>

        <p className="mt-3 font-display text-[clamp(0.72rem,2.1vw,1.35rem)] font-medium uppercase tracking-[0.34em] text-electric/90">
          The Legend of Long Haul
        </p>

        <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-electric/70 to-transparent" />

        <p className="mt-5 max-w-xl text-balance font-body text-[0.95rem] font-light leading-relaxed text-silver/80 sm:text-lg">
          Four engines. Endless horizons. An icon that defined an era.
        </p>
      </div>

      {/* Spacer that reserves the lower band for the aircraft. */}
      <div className="min-h-[16vh] flex-1" aria-hidden />

      <div className="relative z-10 flex flex-col items-center gap-7">
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button onClick={onExplore} className="btn btn-primary sweep">
            Explore the aircraft
            <span aria-hidden>→</span>
          </button>
          <button
            onClick={() =>
              document.getElementById('legend')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="btn btn-ghost"
          >
            Begin the story
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.3em] text-silver/35">
            Scroll
          </span>
          <span className="relative h-9 w-px overflow-hidden bg-white/12">
            <span className="absolute inset-x-0 top-0 h-3 animate-[sweep_2.4s_ease-in-out_infinite] bg-electric" />
          </span>
        </div>
      </div>
    </section>
  )
}
