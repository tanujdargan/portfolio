import { useMotionPrefs } from '../../lib/motion'

// PORTFOLIO_TASTE §3 tokens, scaled by the lab's motion level. Nothing else is allowed.
export const ease = {
  out: [0.23, 1, 0.32, 1] as const,
  drawer: [0.32, 0.72, 0, 1] as const,
  expo: [0.16, 1, 0.3, 1] as const,
  snappy: [0.175, 0.885, 0.32, 1.1] as const,
}

const T = { subtle: 0.8, default: 1, expressive: 1.2 }

export function useTokens() {
  const m = useMotionPrefs()
  const t = T[m.level]
  const fade = { type: 'tween', duration: 0.18, ease: 'easeOut' }
  return {
    m,
    snap: m.spring(520),
    layout: m.spring(380),
    soft: m.spring(220),
    // follow and pop keep their own damping (they're defined by it), but still stretch with the level.
    follow: m.reduced ? fade : { type: 'spring', stiffness: 260 / t, damping: m.level === 'expressive' ? 22 : 28, mass: 0.6 },
    pop: m.reduced ? fade : { type: 'spring', stiffness: 600 / t, damping: m.level === 'subtle' ? 36 : m.level === 'expressive' ? 18 : 24 },
  }
}
