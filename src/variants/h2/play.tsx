// Playback engine shared by every track: a script is a list of step durations; steps advance on timers (not rAF),
// so a finished track costs nothing. Reduced motion jumps straight to the final annotated frame.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { useMotionPrefs } from '../../lib/motion'

export const TRACKS = ['Steering', 'Loss masking', 'Amazon planner', 'MarmotSat', 'Ocean probe'] as const

export function useReduced() {
  const m = useMotionPrefs()
  const [mq, setMq] = useState(false)
  useEffect(() => setMq(matchMedia('(prefers-reduced-motion: reduce)').matches), [])
  return m.reduced || mq
}

/** `startAtEnd`: the server renders the final annotated frame (for tracks below the fold and for no-JS readers);
 *  the client rewinds to the start after hydration, while the track is still off screen. */
export function useScript(durs: number[], run: boolean, startAtEnd: boolean) {
  const reduced = useReduced()
  const last = durs.length - 1
  const [step, setStep] = useState(startAtEnd ? last : 0)
  useEffect(() => {
    setStep(reduced ? last : 0)
  }, [reduced, last])
  useEffect(() => {
    if (!run || reduced || step >= last) return
    const id = window.setTimeout(() => setStep((s) => Math.min(last, s + 1)), durs[step])
    return () => clearTimeout(id)
    // durs is a module constant per track
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, step, reduced, last])
  return {
    step,
    last,
    reduced,
    done: step >= last,
    /** where the transport bar is heading, and how long it takes to get there */
    head: { to: Math.min(1, (step + (run && step < last ? 1 : 0)) / last), ms: run && step < last ? durs[step] : 0 },
    replay: () => setStep(0),
  }
}

export function useInView<T extends Element>(threshold = 0.3, rootMargin = '0px') {
  const ref = useRef<T>(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setV(e.isIntersecting), { threshold, rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold, rootMargin])
  return [ref, v] as const
}

export function useMedia(q: string) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = matchMedia(q)
    setM(mq.matches)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}

/** One annotation chip. `n` matches the numbered marker placed at the exact spot in the visual. */
export function Chip({ n, on, children, value, tone }: { n: number; on: boolean; children: ReactNode; value?: ReactNode; tone?: 'hi' }) {
  return (
    <li className="h2-chip" data-on={on || undefined} data-tone={tone} aria-hidden={!on || undefined}>
      <span className="h2-chip__n" aria-hidden="true">
        {n}
      </span>
      <span className="h2-chip__t">
        {children}
        {value && <b className="h2-chip__v">{value}</b>}
      </span>
    </li>
  )
}

export function Marker({ n, on, style }: { n: number; on: boolean; style?: React.CSSProperties }) {
  return (
    <span className="h2-mark" data-on={on || undefined} style={style} aria-hidden="true">
      {n}
    </span>
  )
}

/** The frame every track plays in: transport, head, the visual (or the real demo), chips, the code line, actions. */
export function Shell({
  i,
  head,
  badge,
  progress,
  children,
  chips,
  code,
  open,
  setOpen,
  demo,
  controlsLabel = 'Take the controls',
  canReplay,
  onReplay,
  note,
}: {
  i: number
  head: ReactNode
  badge: string
  progress: { to: number; ms: number }
  children: ReactNode
  chips?: ReactNode
  code: ReactNode
  open: boolean
  setOpen: (v: boolean) => void
  demo: ReactNode
  controlsLabel?: string
  canReplay: boolean
  onReplay: () => void
  note?: ReactNode
}) {
  return (
    <div className="h2-shell" data-open={open || undefined}>
      <div className="h2-transport" aria-hidden="true">
        {TRACKS.map((t, k) => (
          <span key={t} className="h2-transport__seg" data-state={k < i ? 'done' : k === i ? 'now' : 'next'}>
            <span className="h2-transport__bar">
              {k === i && <span style={{ transform: `scaleX(${progress.to})`, transitionDuration: `${progress.ms}ms` }} />}
            </span>
            <span className="h2-transport__l">
              <span className="h2-num">{String(k + 1).padStart(2, '0')}</span> {t}
            </span>
          </span>
        ))}
      </div>
      <div className="h2-shell__head">
        <p className="h2-shell__title">{head}</p>
        <span className="h2-badge">{badge}</span>
      </div>
      <div className="h2-shell__body">
        {open && demo ? <div className="h2-shell__demo">{demo}</div> : children}
      </div>
      {!(open && demo) && chips && <ol className="h2-chips">{chips}</ol>}
      <div className="h2-shell__foot">
        <code className="h2-code">{code}</code>
        <div className="h2-shell__acts">
          {!(open && demo) && canReplay && (
            <button type="button" className="h2-btn h2-btn--ghost" onClick={onReplay}>
              <RotateCcw size={15} strokeWidth={1.8} aria-hidden="true" />
              Replay
            </button>
          )}
          <button type="button" className="h2-btn h2-btn--take" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={15} strokeWidth={1.8} aria-hidden="true" /> : <SlidersHorizontal size={15} strokeWidth={1.8} aria-hidden="true" />}
            {open ? (demo ? 'Back to playback' : 'Hide the controls') : controlsLabel}
          </button>
        </div>
      </div>
      {note && <p className="h2-shell__note">{note}</p>}
    </div>
  )
}

