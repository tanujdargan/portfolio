import { createElement, useEffect, useRef, useState } from 'react'
import { useMotionPrefs } from '../lib/motion'

// Text that resolves out of glyph noise (generalised from v6's Decode). Three triggers:
//   'view'   decode once when 60% of it scrolls into view (text below the fold starts scrambled after hydration)
//   'change' morph from the previous string to the new one whenever `text` changes (context labels, readouts)
//   'hover'  re-run on pointer enter (links, index rows); pass `run` from the parent instead to drive it externally
// The static HTML always holds the real text. Reduced motion: plain swaps. Best in a monospaced face (no reflow).
const G = '01<>/\\{}[]#%&*+=~^?!;:$@'
const noise = () => G[(Math.random() * G.length) | 0]

export function Scramble({
  text,
  as = 'span',
  className,
  id,
  trigger = 'view',
  run,
  duration = 620,
}: {
  text: string
  as?: string
  className?: string
  id?: string
  trigger?: 'view' | 'change' | 'hover' | 'none'
  /** bump this number to replay (any trigger) */
  run?: number
  duration?: number
}) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(text)
  const from = useRef(text)
  const raf = useRef(0)
  const m = useMotionPrefs()

  const play = (src: string, dst: string) => {
    cancelAnimationFrame(raf.current)
    if (m.reduced) return setShown(dst)
    const D = duration * (m.level === 'subtle' ? 0.8 : m.level === 'expressive' ? 1.3 : 1)
    const n = Math.max(src.length, dst.length)
    const at = Array.from({ length: n }, (_, i) => (i / Math.max(1, n)) * 0.55 * D + Math.random() * 0.45 * D)
    const t0 = performance.now()
    let last = 0
    const tick = (now: number) => {
      const e = now - t0
      if (now - last > 40 || e >= D) {
        last = now
        let s = ''
        for (let i = 0; i < n; i++) {
          const ch = dst[i] ?? ''
          s += e >= at[i] ? ch : ch === ' ' || (src[i] === ' ' && !ch) ? ' ' : noise()
        }
        setShown(s)
      }
      if (e < D) raf.current = requestAnimationFrame(tick)
      else setShown(dst)
    }
    raf.current = requestAnimationFrame(tick)
  }

  // 'view': scramble below-the-fold text after hydration, decode on arrival
  useEffect(() => {
    if (trigger !== 'view' || m.reduced) return
    const el = ref.current!
    if (el.getBoundingClientRect().top < innerHeight * 0.9) return
    setShown(Array.from(text, (ch) => (ch === ' ' ? ' ' : noise())).join(''))
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.6) {
          io.disconnect()
          play('', text)
        }
      },
      { threshold: [0, 0.6] },
    )
    io.observe(el)
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, m.reduced])

  // 'change': morph old → new
  useEffect(() => {
    if (from.current === text) return
    if (trigger === 'change' || trigger === 'hover' || trigger === 'none') play(from.current, text)
    else setShown(text)
    from.current = text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  // external replay
  useEffect(() => {
    if (run) play(text, text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return createElement(
    as,
    { ref, className, id, onPointerEnter: trigger === 'hover' ? () => play(text, text) : undefined },
    <span className="sr-only">{text}</span>,
    <span aria-hidden="true">{shown}</span>,
  )
}
