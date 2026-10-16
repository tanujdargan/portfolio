import { useEffect, useRef, useState, type RefObject } from 'react'

/** prefers-reduced-motion, read after mount (SSR and the first client render assume false; the still final
 *  states are what both render first anyway). */
export function useReduced() {
  const [r, setR] = useState(false)
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    setR(mq.matches)
    const on = () => setR(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return r
}

/** True while the element is on screen and the tab is visible: every loop on the page sleeps otherwise. */
export function useAwake(ref: RefObject<Element | null>, margin = '0px') {
  const [seen, setSeen] = useState(false)
  const [vis, setVis] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { rootMargin: margin })
    io.observe(el)
    const onVis = () => setVis(document.visibilityState === 'visible')
    onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [ref, margin])
  return seen && vis
}

/**
 * A stepped playback: `step` advances through `durations` (ms per step) and wraps, only while `on`. Driven by one
 * setTimeout per step, so the main thread is idle between steps.
 */
export function useSteps(durations: number[], on: boolean, start = 0) {
  const [step, setStep] = useState(start)
  const d = useRef(durations)
  d.current = durations
  useEffect(() => {
    if (!on) return
    const t = window.setTimeout(() => setStep((s) => (s + 1) % d.current.length), d.current[step % d.current.length])
    return () => clearTimeout(t)
  }, [on, step])
  return [step, setStep] as const
}

export const sgn = (n: number, digits = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)}`
