import { useEffect, useState } from 'react'

/**
 * True when the user has asked the OS to reduce motion.
 * Used to disable the cinematic camera flight and heavy transitions.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/** True when the viewport is narrow enough to need the mobile layout. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 900
  })

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 900)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return mobile
}

/** Reports whether a WebGL context can be created. */
export function useWebGLAvailable(): boolean {
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl =
        canvas.getContext('webgl2') ??
        canvas.getContext('webgl') ??
        canvas.getContext('experimental-webgl')
      setAvailable(Boolean(gl))
    } catch {
      setAvailable(false)
    }
  }, [])

  return available ?? true
}
