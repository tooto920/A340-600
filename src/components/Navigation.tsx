import { useEffect, useState } from 'react'

const LINKS = [
  { id: 'legend', label: 'Legend' },
  { id: 'pencil', label: 'Flying Pencil' },
  { id: 'four', label: 'Power of Four' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'longhaul', label: 'Long Haul' },
  { id: 'explorer', label: 'Explorer' },
  { id: 'horizon', label: 'Horizon' },
]

export function Navigation({ progress }: { progress: number }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Highlight the section currently in view.
  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    )
    if (!sections.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMenuOpen(false)
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-void/72 backdrop-blur-xl border-b border-white/8' : 'border-b border-transparent'
      }`}
    >
      <div className="shell flex h-[var(--nav-height)] items-center justify-between gap-6">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="group flex items-center gap-3 text-left"
          aria-label="Back to top"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-full border border-electric/45 transition-colors group-hover:border-electric">
            <span className="h-1.5 w-1.5 rounded-full bg-electric transition-transform duration-500 group-hover:scale-150" />
          </span>
          <span className="hidden sm:block">
            <span className="block font-display text-[0.95rem] font-bold tracking-tight text-mist">
              A340-600
            </span>
            <span className="block font-mono text-[0.58rem] uppercase tracking-[0.22em] text-silver/55">
              Legend of Long Haul
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections">
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className={`relative rounded-full px-3.5 py-2 font-display text-[0.72rem] font-medium uppercase tracking-[0.14em] transition-colors duration-300 ${
                active === l.id ? 'text-mist' : 'text-silver/55 hover:text-mist'
              }`}
            >
              {l.label}
              <span
                className={`absolute inset-x-3.5 -bottom-0.5 h-px origin-left bg-electric transition-transform duration-500 ${
                  active === l.id ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[0.68rem] tracking-[0.16em] text-silver/50 sm:block">
            {String(Math.round(progress * 100)).padStart(3, '0')}%
          </span>
          <button
            onClick={() => go('explorer')}
            className="btn btn-primary hidden !px-5 !py-2.5 !text-[0.68rem] sm:inline-flex"
          >
            Explore
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-mist lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span className="relative block h-3 w-4">
              <span
                className={`absolute left-0 h-px w-full bg-current transition-all duration-300 ${
                  menuOpen ? 'top-1.5 rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-px w-full bg-current transition-opacity duration-300 ${
                  menuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute left-0 h-px w-full bg-current transition-all duration-300 ${
                  menuOpen ? 'top-1.5 -rotate-45' : 'top-3'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Progress rail */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/6">
        <div
          className="h-full origin-left bg-gradient-to-r from-electric to-warm transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-white/8 bg-void/95 backdrop-blur-xl transition-[max-height,opacity] duration-500 lg:hidden ${
          menuOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="shell flex flex-col py-4">
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="border-b border-white/5 py-3.5 text-left font-display text-lg font-medium text-mist/85 transition-colors hover:text-electric"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
