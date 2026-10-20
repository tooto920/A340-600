import { useCallback, useEffect, useState } from 'react'
import { Navigation } from './components/Navigation'
import { Hero } from './components/Hero'
import { ChapterSection } from './components/ChapterSection'
import { ExplorerPanel } from './components/ExplorerPanel'
import { MilestoneRow, SourceList, SpecGrid, Timeline } from './components/Specifications'
import { CinematicScene } from './scenes/CinematicScene'
import { ExplorerScene, type ExplorerView } from './scenes/ExplorerScene'
import { CHAPTERS } from './data/aircraftData'
import { usePointer, useScrollProgress } from './hooks/useScroll'
import { useReducedMotion, useWebGLAvailable } from './hooks/useEnvironment'

const SECTION_IDS = ['hero', ...CHAPTERS.map((c) => c.id).filter((id) => id !== 'horizon'), 'explorer']

export default function App() {
  const { progress } = useScrollProgress(SECTION_IDS)
  const pointer = usePointer()
  const reducedMotion = useReducedMotion()
  const webgl = useWebGLAvailable()

  const [view, setView] = useState<ExplorerView>('reset')
  const [gearDown, setGearDown] = useState(true)
  const [enginesRunning, setEnginesRunning] = useState(true)
  const [nightMode, setNightMode] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [explorerVisible, setExplorerVisible] = useState(false)

  useEffect(() => {
    // The loader clears once the fonts and the first frame are ready.
    const t = window.setTimeout(() => setLoaded(true), 900)
    return () => window.clearTimeout(t)
  }, [])

  // Only mount the explorer canvas while it is on screen â€” it is a second
  // WebGL context and should not compete with the cinematic scene.
  useEffect(() => {
    const el = document.getElementById('explorer')
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) setExplorerVisible(entry.isIntersecting)
      },
      { threshold: 0.02 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scrollToExplorer = useCallback(() => {
    document.getElementById('explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  if (!webgl) {
    return <WebGLFallback />
  }

  return (
    <div className="relative">
      {/* ---------------- Fixed cinematic backdrop ---------------- */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <CinematicScene
          progress={progress}
          pointer={pointer}
          enginesRunning={enginesRunning}
          reducedMotion={reducedMotion}
        />
        {/* Vignette + grade, sits above the canvas but below all content. */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_45%,transparent_30%,rgba(5,7,12,0.8)_100%)]" />
        {/* Readability scrim: a soft dark wash that keeps editorial text
            legible over the brightest part of the sky. */}
        <div className="absolute inset-0 bg-gradient-to-r from-void/88 via-void/45 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-[52vh] bg-gradient-to-b from-void via-void/55 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-void to-transparent" />
      </div>

      <Navigation progress={progress} />

      {/* ---------------- Content ---------------- */}
      <main className="relative z-10">
        <Hero onExplore={scrollToExplorer} />

        {/* Chapter I â€” The Legend */}
        <ChapterSection chapter={CHAPTERS[0]} index={0} align="left">
          <Timeline />
        </ChapterSection>

        {/* Chapter II â€” The Flying Pencil */}
        <ChapterSection chapter={CHAPTERS[1]} index={1} align="right">
          <div className="reveal-d1 mt-8 flex flex-wrap gap-3">
            {[
              ['75.36 m', 'Overall length'],
              ['12.8 m', 'More cabin than the A340-500'],
              ['44', 'Business-class seats'],
              ['314', 'Main-cabin seats'],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-void/50 px-4 py-3 backdrop-blur-md"
              >
                <p className="font-display text-xl font-bold text-mist">{value}</p>
                <p className="mt-1 text-[0.72rem] font-light text-silver/50">{label}</p>
              </div>
            ))}
          </div>
        </ChapterSection>

        {/* Chapter III â€” Power of Four */}
        <ChapterSection chapter={CHAPTERS[2]} index={2} align="left">
          <div className="reveal-d1 mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
            {[
              ['2.95 m', 'Fan diameter'],
              ['26', 'Blades per fan'],
              ['~70,000 lbf', 'Per engine'],
              ['4', 'Redundant engines'],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-void/50 px-4 py-3 backdrop-blur-md"
              >
                <p className="font-display text-xl font-bold text-mist">{value}</p>
                <p className="mt-1 text-[0.72rem] font-light text-silver/50">{label}</p>
              </div>
            ))}
          </div>
        </ChapterSection>

        {/* Chapter IV â€” Engineering Masterpiece */}
        <ChapterSection chapter={CHAPTERS[3]} index={3} align="right">
          <div className="reveal-d1 mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
            {[
              ['14', 'Wheels'],
              ['437 mÂ˛', 'Wing area'],
              ['9.2', 'Aspect ratio'],
              ['31.1Â°', 'Quarter-chord sweep'],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-void/50 px-4 py-3 backdrop-blur-md"
              >
                <p className="font-display text-xl font-bold text-mist">{value}</p>
                <p className="mt-1 text-[0.72rem] font-light text-silver/50">{label}</p>
              </div>
            ))}
          </div>
        </ChapterSection>

        {/* ---------------- Interactive Explorer ---------------- */}
        <section
          id="explorer"
          className="relative flex min-h-[100svh] items-center py-28"
        >
          <div className="shell w-full">
            <div className="mb-8 max-w-2xl">
              <p className="eyebrow">Interactive</p>
              <h2 className="headline-lg mt-4 text-[clamp(2.1rem,5.2vw,3.6rem)] text-mist">
                Aircraft Explorer
              </h2>
              <p className="mt-4 text-[1rem] font-light leading-relaxed text-silver/72">
                A full reconstruction you can take apart. Rotate, zoom, drop the
                landing gear, switch to night lighting and move the camera to any
                station on the airframe.
              </p>
            </div>

            <div className="panel relative overflow-hidden rounded-3xl">
              <div className="flex flex-col lg:flex-row">
                {/* 3D viewport */}
                <div className="relative h-[58svh] min-h-[380px] w-full flex-1 lg:h-[74svh] lg:min-h-[560px]">
                  {explorerVisible && (
                    <ExplorerScene
                      view={view}
                      gearDown={gearDown}
                      enginesRunning={enginesRunning}
                      nightMode={nightMode}
                      reducedMotion={reducedMotion}
                    />
                  )}
                  {!explorerVisible && (
                    <div className="absolute inset-0 grid place-items-center">
                      <p className="font-mono text-[0.68rem] uppercase tracking-[0.25em] text-silver/35">
                        Loading viewer
                      </p>
                    </div>
                  )}

                  {/* HUD overlay */}
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-5 top-5 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-electric" />
                      <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-silver/55">
                        A340-600 Â· Live 3D
                      </span>
                    </div>
                    <div className="absolute bottom-5 right-5 text-right">
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-silver/35">
                        L 75.36 m
                      </p>
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-silver/35">
                        S 63.45 m Â· H 17.80 m
                      </p>
                    </div>
                  </div>
                </div>

                {/* Control panel */}
                <div className="w-full shrink-0 border-t border-white/10 p-4 lg:w-[20rem] lg:border-l lg:border-t-0 lg:p-5">
                  <ExplorerPanel
                    view={view}
                    onView={setView}
                    gearDown={gearDown}
                    onGear={setGearDown}
                    enginesRunning={enginesRunning}
                    onEngines={setEnginesRunning}
                    nightMode={nightMode}
                    onNight={setNightMode}
                  />
                </div>
              </div>
            </div>          </div>
        </section>

        {/* Chapter V â€” Long Haul Excellence */}
        <ChapterSection chapter={CHAPTERS[4]} index={4} align="left">
          <SpecGrid />
          <MilestoneRow />
        </ChapterSection>

        {/* Chapter VI â€” The Final Horizon */}
        <ChapterSection chapter={CHAPTERS[5]} index={5} align="right">
          <SourceList />
        </ChapterSection>

        <Footer />
      </main>

      <Loader visible={!loaded} />
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Loader({ visible }: { visible: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-void transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <div className="flex flex-col items-center gap-6">
        <span className="pulse-ring relative grid h-16 w-16 place-items-center rounded-full border border-electric/40">
          <span className="h-2 w-2 rounded-full bg-electric" />
        </span>
        <div className="text-center">
          <p className="font-display text-[0.95rem] font-bold tracking-[0.2em] text-mist">
            A340-600
          </p>
          <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-silver/45">
            Preparing the aircraft
          </p>
        </div>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/8 bg-void/70 py-12 backdrop-blur-xl">
      <div className="shell flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <p className="font-display text-[0.95rem] font-bold tracking-tight text-mist">
            A340-600 â€” The Legend of Long Haul
          </p>
          <p className="mt-1.5 text-[0.78rem] font-light text-silver/45">
            An interactive tribute. Procedural 3D reconstruction, not an official Airbus model.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-silver/35">
            First flight 23 April 2001
          </p>
          <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-silver/35">
            Entry into service 1 August 2002
          </p>
        </div>
      </div>
    </footer>
  )
}

/** Shown when the browser cannot create a WebGL context. */
function WebGLFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-void px-6">
      <div className="max-w-lg text-center">
        <p className="eyebrow">3D unavailable</p>
        <h1 className="headline-lg mt-5 text-[clamp(2rem,6vw,3.2rem)] text-mist">
          A340-600
        </h1>
        <p className="mt-5 text-[0.98rem] font-light leading-relaxed text-silver/72">
          This browser cannot create a WebGL context, so the interactive aircraft
          cannot be rendered. The specification below is still accurate.
        </p>
        <div className="mt-8 text-left">
          <SpecGrid />
        </div>
      </div>
    </div>
  )
}




