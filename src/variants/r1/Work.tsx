import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, type MotionValue } from 'framer-motion'
import { amazonMetrics } from '../../content/curated'
import { prefetchDemo } from '../../content/work'
import { Logo } from '../../shared/Mark'
import { Poster } from '../../shared/Poster'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { rows, type Row } from './data'

/** Steering has no org mark: a small vector glyph stands in. */
function Glyph({ label }: { label: string }) {
  return (
    <span className="r1-glyph" role="img" aria-label={label}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M4 18 18 6M18 6h-7M18 6v7" />
      </svg>
    </span>
  )
}

const Mark = ({ r }: { r: Row }) => (r.mark ? <Logo m={r.mark} w={30} h={22} /> : <Glyph label={r.org} />)

function Numbers({ big = false }: { big?: boolean }) {
  return (
    <dl className="r1-nums" data-big={big || undefined}>
      {amazonMetrics.map((m) => (
        <div key={m.n}>
          <dt>{m.n}</dt>
          <dd>{m.l}</dd>
        </div>
      ))}
    </dl>
  )
}

function Panel({ r, base }: { r: Row; base: string }) {
  return (
    <div className="r1-panel__in">
      <div className="r1-panel__text">
        <p className="r1-finding">{r.finding}</p>
        <p className="r1-where">
          {r.where} · {r.when}
        </p>
        {r.slug && (
          <Link to={`${base}/research/${r.slug}`} className="r1-more">
            Read the write-up <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      <div className="r1-panel__fig" data-k={r.demo ?? r.id}>
        {r.demo ? (
          <Demo kind={r.demo} {...r.demoOpts} />
        ) : (
          <div className="r1-numcard">
            <Numbers big />
            <p className="r1-note">Optimus is Amazon’s labor-planning platform. Numbers from the resume.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/** Hover preview that trails the cursor: a vertical strip of all five previews; the active one slides into the window. */
function Follower({ x, y, idx, show }: { x: MotionValue<number>; y: MotionValue<number>; idx: number; show: boolean }) {
  return (
    <motion.div className="r1-follow" style={{ x, y }} data-show={show || undefined} aria-hidden="true">
      <div className="r1-follow__card">
        <div className="r1-follow__strip" style={{ transform: `translateY(${-idx * 100}%)` }}>
          {rows.map((r) => (
            <div className="r1-follow__item" key={r.id}>
              {r.demo ? <Poster k={r.demo} /> : <Numbers />}
              <span className="r1-follow__cap">{r.demo ? 'Click for the live demo' : 'Click for the numbers'}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function WorkIndex({ base }: { base: string }) {
  const { reduced } = useMotionPrefs()
  const [open, setOpen] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [hovering, setHovering] = useState(false)
  const lastIdx = useRef(0)
  const heads = useRef<Record<string, HTMLButtonElement | null>>({})
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 170, damping: 22, mass: 0.7 })
  const sy = useSpring(my, { stiffness: 170, damping: 22, mass: 0.7 })

  const idx = active ? rows.findIndex((r) => r.id === active) : -1
  if (idx >= 0) lastIdx.current = idx

  const move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    if (!hovering) {
      // Start at the pointer so the card doesn't fly in from the corner.
      sx.jump(e.clientX)
      sy.jump(e.clientY)
      setHovering(true)
    }
    mx.set(e.clientX)
    my.set(e.clientY)
  }

  // If a row above collapsed in the same click, bring the newly opened row's head back into view.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      const h = heads.current[open]
      if (!h) return
      const top = h.getBoundingClientRect().top
      if (top < 0 || top > innerHeight * 0.75) h.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    }, 380)
    return () => clearTimeout(t)
  }, [open, reduced])

  const warm = (r: Row) => {
    if (r.demo) prefetchDemo[r.demo]().catch(() => {})
  }
  const show = hovering && idx >= 0 && active !== open

  return (
    <section className="r1-work" id="research" aria-labelledby="r1-work-h">
      <div className="r1-label r1-in" style={{ ['--d' as string]: 2 }}>
        <h2 id="r1-work-h">Selected work</h2>
        <span className="r1-hint">Open a row for the demo</span>
      </div>
      <ol
        className="r1-list"
        data-dim={(active && active !== open) || undefined}
        onPointerMove={move}
        onPointerLeave={() => {
          setHovering(false)
          setActive(null)
        }}
      >
        {rows.map((r, i) => {
          const isOpen = open === r.id
          return (
            <li key={r.id} className="r1-row r1-in" style={{ ['--d' as string]: 3 + i }} data-open={isOpen || undefined} data-active={active === r.id || undefined}>
              <h3 className="r1-row__h">
                <button
                  ref={(el) => {
                    heads.current[r.id] = el
                  }}
                  type="button"
                  className="r1-row__head"
                  id={`r1-h-${r.id}`}
                  aria-expanded={isOpen}
                  aria-controls={`r1-p-${r.id}`}
                  onClick={() => setOpen(isOpen ? null : r.id)}
                  onPointerEnter={() => {
                    setActive(r.id)
                    warm(r)
                  }}
                  onFocus={() => {
                    setActive(r.id)
                    warm(r)
                  }}
                  onBlur={() => setActive(null)}
                >
                  <span className="r1-row__n" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <span className="r1-row__title">
                    <span>{r.title}</span>
                  </span>
                  <span className="r1-row__org">
                    <Mark r={r} />
                    <span>{r.org}</span>
                  </span>
                  <span className="r1-row__result">{r.result}</span>
                  <span className="r1-row__year">{r.year}</span>
                  <span className="r1-row__x" aria-hidden="true" />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="p"
                    id={`r1-p-${r.id}`}
                    role="region"
                    aria-labelledby={`r1-h-${r.id}`}
                    className="r1-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={reduced ? { duration: 0 } : { height: { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 }, opacity: { duration: 0.2 } }}
                  >
                    <Panel r={r} base={base} />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ol>
      {!reduced && <Follower x={sx} y={sy} idx={lastIdx.current} show={show} />}
    </section>
  )
}
