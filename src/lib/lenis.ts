import { useEffect } from 'react'
import 'lenis/dist/lenis.css'
import { useMotionPrefs } from './motion'

type L = import('lenis').default
let current: L | null = null
/** The active Lenis instance, if any (for scrollTo with its easing). */
export const lenis = () => current

/**
 * Smooth wheel scrolling (Lenis) while `on`. Touch keeps native scrolling (Lenis' default), reduced motion gets none.
 * Loaded after first paint so it never blocks LCP. Pair with native `position: sticky` and IntersectionObserver;
 * anything reading scroll should read `window.scrollY` as usual (Lenis drives the real scroll position).
 */
export function useLenis(on = true, opts: { lerp?: number } = {}) {
  const { reduced } = useMotionPrefs()
  useEffect(() => {
    if (!on || reduced || matchMedia('(pointer: coarse)').matches) return
    let dead = false
    let inst: L | null = null
    import('lenis').then(({ default: Lenis }) => {
      if (dead) return
      inst = new Lenis({ lerp: opts.lerp ?? 0.09, autoRaf: true, anchors: false })
      current = inst
    })
    return () => {
      dead = true
      inst?.destroy()
      if (current === inst) current = null
    }
  }, [on, reduced, opts.lerp])
}

/** Scroll to an element (or y) without touching the URL; uses Lenis' easing when it's running. */
export function scrollToEl(target: HTMLElement | number, reduced: boolean) {
  const l = current
  if (l && !reduced) return l.scrollTo(target, { duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) })
  if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' })
  else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}
