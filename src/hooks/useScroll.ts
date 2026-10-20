import { useEffect, useRef, useState } from 'react'

/**
 * Tracks overall page scroll progress (0..1) and the active section index.
 * Uses a passive scroll listener plus requestAnimationFrame so the value
 * updates at most once per frame.
 */
export function useScrollProgress(sectionIds: string[]) {
  const [progress, setProgress] = useState(0)
  const [activeSection, setActiveSection] = useState(0)
  const frame = useRef(0)
  const ids = sectionIds.join(',')

  useEffect(() => {
    const compute = () => {
      frame.current = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      setProgress(p)

      // Active section = the last section whose top has passed the viewport middle.
      const list = ids.split(',')
      const mid = window.innerHeight * 0.45
      let current = 0
      for (let i = 0; i < list.length; i++) {
        const el = document.getElementById(list[i])
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= mid) current = i
      }
      setActiveSection(current)
    }

    const onScroll = () => {
      if (frame.current) return
      frame.current = requestAnimationFrame(compute)
    }

    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [ids])

  return { progress, activeSection }
}

/** Normalised pointer position in device coordinates (-1..1). */
export function usePointer() {
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const frame = useRef(0)
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -((e.clientY / window.innerHeight) * 2 - 1),
      }
      if (frame.current) return
      frame.current = requestAnimationFrame(() => {
        frame.current = 0
        setPointer({ ...target.current })
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [])

  return pointer
}
