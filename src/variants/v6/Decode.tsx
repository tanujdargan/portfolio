import { createElement, useEffect, useRef, useState } from 'react'
import { useMotionPrefs } from '../../lib/motion'

// Text that resolves out of noise like a decoder on arrival. The static HTML holds the real text; after hydration,
// text below the fold is scrambled and decodes once 60% of it is in view. The set is ASCII only, and the face is
// monospaced, so every glyph has the same advance and nothing reflows. It decodes once per page view. Reduced motion: plain text.
const G = '01<>/\\{}[]#%&*+=~^?!;:$@'
const scramble = (t: string) => t.replace(/\S/g, () => G[(Math.random() * G.length) | 0])

export function Decode({ text, as = 'span', className, id }: { text: string; as?: string; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(text)
  const m = useMotionPrefs()
  useEffect(() => {
    setShown(text)
    if (m.reduced) return
    const el = ref.current!
    let raf = 0
    let decoded = el.getBoundingClientRect().top < innerHeight * 0.9
    if (!decoded) setShown(scramble(text))
    const run = () => {
      cancelAnimationFrame(raf)
      const D = 720 * (m.level === 'subtle' ? 0.8 : m.level === 'expressive' ? 1.35 : 1)
      const at = Array.from(text, (_, i) => (i / Math.max(1, text.length)) * 0.55 * D + Math.random() * 0.45 * D)
      const t0 = performance.now()
      let lastSwap = 0
      const tick = (now: number) => {
        const e = now - t0
        if (now - lastSwap > 45 || e >= D) {
          lastSwap = now
          setShown(Array.from(text, (ch, i) => (e >= at[i] || ch === ' ' ? ch : G[(Math.random() * G.length) | 0])).join(''))
        }
        if (e < D) raf = requestAnimationFrame(tick)
        else setShown(text)
      }
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      ([e]) => {
        // one-shot: decode on first arrival, then stay readable
        if (e.intersectionRatio >= 0.6 && !decoded) {
          decoded = true
          io.disconnect()
          run()
        }
      },
      { threshold: [0, 0.6] },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [text, m.reduced, m.level])
  return createElement(
    as,
    { ref, className, id },
    <span className="v6-sr">{text}</span>,
    <span aria-hidden="true">{shown}</span>,
  )
}
