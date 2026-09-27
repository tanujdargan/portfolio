import { AnimatePresence, motion } from 'framer-motion'
import { useMotionPrefs } from '../../lib/motion'

const EXPO = [0.16, 1, 0.3, 1] as const

/**
 * P17 odometer, as a split-flap: one clipped slot per character. A slot only animates when its character changes,
 * so "1,500+" → "In orbit" flips every cell but "03" → "04" flips one. Travel, tilt and stagger scale with the motion
 * level; reduced motion swaps the whole string with a crossfade.
 */
export function Flip({ text, dir = 1, className, slots = 0 }: { text: string; dir?: number; className?: string; slots?: number }) {
  const m = useMotionPrefs()
  if (m.reduced) {
    return (
      <span className={`v4b-flip ${className ?? ''}`} aria-hidden="true">
        <span className="v4b-flip__slot">
          <AnimatePresence initial={false}>
            <motion.span key={text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {text}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    )
  }
  const chars = Array.from(text)
  const n = Math.max(chars.length, slots)
  const k = m.k
  const travel = Math.min(100, 38 + 42 * k)
  const tilt = Math.min(80, 55 * k)
  const v = {
    enter: (d: number) => ({ y: `${d * travel}%`, rotateX: -d * tilt, opacity: 0 }),
    center: { y: '0%', rotateX: 0, opacity: 1 },
    // exits run at 0.7x the entrance (tokens §3)
    exit: (d: number) => ({ y: `${-d * travel}%`, rotateX: d * tilt, opacity: 0, transition: { duration: m.dur(0.36), ease: EXPO } }),
  }
  const step = 0.026 * Math.max(0.5, k)
  return (
    <span className={`v4b-flip ${className ?? ''}`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const c = chars[i]
        const t = { duration: m.dur(0.52), ease: EXPO, delay: Math.min(i, 8) * step }
        return (
          <span className="v4b-flip__slot" key={i}>
            <AnimatePresence initial={false} custom={dir}>
              {c !== undefined && (
                <motion.span
                  key={c}
                  custom={dir}
                  variants={v}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={t}
                >
                  {c === ' ' ? '\u00a0' : c}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        )
      })}
    </span>
  )
}
