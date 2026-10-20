import { useEffect, useRef } from 'react'

/**
 * Adds the `is-visible` class to an element once it scrolls into view.
 *
 * The observer options are stored in a ref so the effect does not re-run on
 * every render — a fresh options object each time would tear down and
 * rebuild the observer continuously.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
) {
  const ref = useRef<T>(null)
  const optionsRef = useRef(options)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      }
    }, optionsRef.current)

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return ref
}
