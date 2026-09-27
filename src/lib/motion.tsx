import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'

export type MotionLevel = 'subtle' | 'default' | 'expressive'
export const LEVELS: MotionLevel[] = ['subtle', 'default', 'expressive']

// k scales travel distance and stagger; t scales duration. Reduced motion collapses everything to short crossfades.
const SCALE: Record<MotionLevel, { k: number; t: number; bounce: number }> = {
  subtle: { k: 0.45, t: 0.8, bounce: 0 },
  default: { k: 1, t: 1, bounce: 0.12 },
  expressive: { k: 1.7, t: 1.2, bounce: 0.28 },
}

export interface MotionPrefs {
  level: MotionLevel
  setLevel: (l: MotionLevel) => void
  reduced: boolean
  /** distance multiplier (0 when reduced) */
  k: number
  /** duration in seconds for a base duration */
  dur: (base: number) => number
  /** spring for spatial moves; a quick tween when reduced */
  spring: (stiffness?: number) => object
}

const Ctx = createContext<MotionPrefs | null>(null)

export function MotionProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<MotionLevel>('default')
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('motion') as MotionLevel | null
    const saved = (q && LEVELS.includes(q) ? q : localStorage.getItem('motion')) as MotionLevel | null
    if (saved && LEVELS.includes(saved)) setLevelState(saved)
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : level
    const s = SCALE[level]
    document.documentElement.style.setProperty('--k', String(reduced ? 0 : s.k))
    document.documentElement.style.setProperty('--t', String(reduced ? 0.5 : s.t))
  }, [level, reduced])

  const value = useMemo<MotionPrefs>(() => {
    const s = SCALE[level]
    return {
      level,
      reduced,
      setLevel: (l) => {
        localStorage.setItem('motion', l)
        setLevelState(l)
      },
      k: reduced ? 0 : s.k,
      dur: (base) => (reduced ? Math.min(0.22, base) : base * s.t),
      spring: (stiffness = 260) =>
        reduced
          ? { type: 'tween', duration: 0.22, ease: 'easeOut' }
          : { type: 'spring', stiffness: stiffness / s.t, damping: 2 * Math.sqrt(stiffness / s.t) * (1 - s.bounce), mass: 1 },
    }
  }, [level, reduced])

  return (
    <Ctx.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </Ctx.Provider>
  )
}

export function useMotionPrefs(): MotionPrefs {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMotionPrefs outside MotionProvider')
  return v
}
