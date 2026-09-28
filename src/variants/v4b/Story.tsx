import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring } from 'framer-motion'
import type { Milestone } from '../../content/site'
import { useMilestones } from '../../content/useContent'
import { Show } from '../../lib/labprefs'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { Demo } from '../../demos/Demo'
import { Flag } from '../../shared/Flag'
import { OrgLogo } from '../../shared/OrgLogo'
import { Flip } from './Flip'
import { Arrow } from './Arrow'
import { BREAK, DEMO_AT, LOGO_AT, KINDS, KIND_LABEL, MONTHS, YEARS, displayFor, tpos, type Kind } from './data'

/** The scroll line: a step becomes current when its top crosses this fraction of the viewport height. */
const lineAt = () => innerHeight * (innerWidth < 960 ? 0.8 : 0.66)
/** Share of each step's scroll spent parked on its milestone before the track moves on to the next. */
const DWELL = 0.4
const nn = (n: number) => String(n).padStart(2, '0')

/* ---------------- one milestone, as it scrolls past ---------------- */

const Step = memo(function Step({ ms, i, active, base }: { ms: Milestone; i: number; active: boolean; base: string }) {
  const d = displayFor(ms)
  const demo = DEMO_AT[ms.title]
  const logo = LOGO_AT[ms.title]
  const isResearch = ms.href?.startsWith('/research/')
  const link = ms.href && (
    <Link to={`${base}${ms.href}`} className="v4b-step__link">
      {isResearch ? 'Read the write-up' : `The ${ms.title} case study`} <Arrow />
    </Link>
  )
  return (
    <li className="v4b-step" data-step={i} data-kind={ms.kind} data-active={active || undefined} data-demo={demo ? '' : undefined} tabIndex={-1} aria-labelledby={`v4b-s${i}`}>
      <p className="v4b-step__meta">
        <span className="v4b-dot" aria-hidden="true" />
        <span>{ms.when}</span>
        <span className="v4b-step__kind">{KIND_LABEL[ms.kind]}</span>
        {ms.unverified && <Flag note={ms.unverified} />}
      </p>
      {logo && <OrgLogo org={logo} height={logo === 'mlh' ? 26 : 18} className="v4b-step__logo" />}
      <h3 id={`v4b-s${i}`} className="v4b-step__t">
        {ms.title}
      </h3>
      <p className="v4b-step__num">
        <span className="v4b-step__big">{d.big}</span> <span className="v4b-step__unit">{d.unit}</span>
      </p>
      <p className="v4b-step__line">{ms.line}</p>
      {link && (ms.flag ? <Show when={ms.flag}>{link}</Show> : link)}
      {demo && (
        <div className="v4b-step__demo">
          <Demo kind={demo} hero={demo === 'steering'} />
        </div>
      )}
    </li>
  )
})

/* ---------------- the pinned axis + readout, and the steps that drive it ---------------- */

export function Story({ base, onIndex }: { base: string; onIndex: () => void }) {
  const ms = useMilestones()
  const m = useMotionPrefs()
  const stack = m.reduced
  const N = ms.length
  const pos = useMemo(() => ms.map((x) => tpos(x.year)), [ms])
  const [active, setActiveState] = useState(0)
  const [dir, setDir] = useState(1)
  const [focus, setFocus] = useState<Kind | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const axisRef = useRef<HTMLDivElement>(null)
  const geo = useRef({ stops: [] as number[], W: 0 })
  const cur = useRef(0)

  // Track position: raw on Subtle, scrollSmooth on Default, a looser follow on Expressive.
  const x = useMotionValue(0)
  const soft = m.level === 'expressive' ? { stiffness: 80, damping: 20, restDelta: 0.5 } : { stiffness: 140, damping: 30, restDelta: 0.5 }
  const xs = useSpring(x, soft)
  const { scrollY: p } = useScroll()

  const setActive = useCallback((i: number) => {
    if (i === cur.current) return
    setDir(i > cur.current ? 1 : -1)
    cur.current = i
    setActiveState(i)
  }, [])

  // Scroll → time. Each step parks its milestone on the playhead, then the track pans to the next date. Every step
  // gets the same scroll, so the empty 2023–24 goes by in one move and the dense 2025–26 slows right down.
  const apply = useCallback(
    (y: number) => {
      const { stops, W } = geo.current
      if (!stops.length) return
      let i = 0
      while (i < stops.length - 1 && y >= stops[i + 1]) i++
      let at = pos[i]
      if (y > stops[i] && i < stops.length - 1) {
        const f = Math.min(1, Math.max(0, ((y - stops[i]) / (stops[i + 1] - stops[i]) - DWELL) / (1 - DWELL)))
        at = pos[i] + f * f * (3 - 2 * f) * (pos[i + 1] - pos[i])
      }
      x.set(-at * W)
      setActive(i)
    },
    [pos, x, setActive],
  )
  useMotionValueEvent(p, 'change', apply)

  // Layout reads only here, on mount and on resize (demos loading in change the list height).
  useEffect(() => {
    if (stack) {
      setActive(0)
      return
    }
    const ol = listRef.current!
    const tr = trackRef.current!
    // stops[i] = the scrollY at which step i's top reaches the line
    const measure = () => {
      const top = ol.getBoundingClientRect().top + scrollY - lineAt()
      const items = Array.from(ol.querySelectorAll<HTMLElement>(':scope > [data-step]'))
      geo.current = { stops: items.map((el) => top + el.offsetTop), W: tr.offsetWidth }
      apply(scrollY)
      xs.jump(x.get())
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(ol)
    ro.observe(tr)
    addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      removeEventListener('resize', measure)
    }
  }, [stack, N, apply, p, x, xs, setActive])

  // Reduced motion: stacked sections crossfade in once as they arrive.
  useEffect(() => {
    if (!stack) return
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return
          ;(e.target as HTMLElement).dataset.seen = ''
          io.unobserve(e.target)
        }),
      { rootMargin: '0px 0px -8% 0px' },
    )
    listRef.current!.querySelectorAll(':scope > [data-step]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [stack, N])

  const go = useCallback(
    (i: number, moveFocus: boolean) => {
      const j = Math.max(0, Math.min(N - 1, i))
      const el = listRef.current?.querySelector<HTMLElement>(`:scope > [data-step="${j}"]`)
      if (!el) return
      const target = () => el.getBoundingClientRect().top + scrollY - lineAt() + 2
      if (stack) el.scrollIntoView({ block: 'start' })
      else {
        scrollTo({ top: target(), behavior: 'smooth' })
        // A demo can mount on the way past and move the target; settle on the real position.
        setTimeout(() => Math.abs(target() - scrollY) > 4 && scrollTo({ top: target(), behavior: 'smooth' }), 900)
      }
      if (moveFocus) el.focus({ preventScroll: true })
      return j
    },
    [N, stack],
  )
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -N : e.key === 'End' ? N : 0
    if (!d) return
    e.preventDefault()
    const j = go(active + d, false)
    if (j !== undefined) axisRef.current?.querySelector<HTMLElement>(`[data-mark="${j}"]`)?.focus({ preventScroll: true })
  }

  const now = ms[Math.min(active, N - 1)]
  const d = displayFor(now)
  const len = Array.from(d.big).length
  const byKind = useMemo(() => KINDS.map((k) => ({ k, idx: ms.flatMap((x, i) => (x.kind === k ? [i] : [])) })).filter((g) => g.idx.length), [ms])

  // Compounding silhouette: a step line through the bar tops (cumulative count over time).
  const curve = useMemo(() => {
    const X = (i: number) => (pos[i] * 1000).toFixed(1)
    const Y = (i: number) => (100 - (14 + (86 * (i + 1)) / N)).toFixed(2)
    let steps = `${X(0)},${Y(0)}`
    for (let i = 1; i < N; i++) steps += ` H${X(i)} V${Y(i)}`
    return { line: `M${steps} H1000`, area: `M${X(0)},100 V${Y(0)} ${steps.slice(steps.indexOf(' '))} H1000 V100 Z` }
  }, [pos, N])

  return (
    <section
      id="story"
      className="v4b-story"
      data-mode={stack ? 'stack' : 'pin'}
      data-kind={now.kind}
      data-focus={focus ?? undefined}
      tabIndex={-1}
      aria-labelledby="v4b-story-h"
    >
      <div className="v4b-pin">
        <div className="v4b-axis" ref={axisRef} role={stack ? undefined : 'toolbar'} aria-label={stack ? undefined : 'Timeline, 2022 to 2026'} aria-hidden={stack || undefined}>
          <motion.div className="v4b-track" ref={trackRef} style={stack ? undefined : { x: m.level === 'subtle' ? x : xs }}>
            <svg className="v4b-curve" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
              <path className="v4b-curve__area" d={curve.area} />
              <path className="v4b-curve__line" d={curve.line} vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="v4b-break" style={{ left: `${BREAK.from * 100}%`, width: `${(BREAK.to - BREAK.from) * 100}%` }} aria-hidden="true">
              <span>2023–24</span>
            </div>
            {MONTHS.map((q, i) => (
              <i key={i} className="v4b-tick" style={{ left: `${q * 100}%` }} aria-hidden="true" />
            ))}
            {YEARS.map(({ y, p: q }) => (
              <span key={y} className="v4b-year" style={{ left: `${q * 100}%` }} aria-hidden="true">
                {y}
              </span>
            ))}
            {ms.map((x, i) => (
              <button
                key={x.title}
                type="button"
                className="v4b-mark"
                data-mark={i}
                data-kind={x.kind}
                data-past={stack || i <= active || undefined}
                data-on={(!stack && i === active) || undefined}
                style={{ left: `${pos[i] * 100}%`, ['--c' as string]: (i + 1) / N }}
                tabIndex={stack ? -1 : i === active ? 0 : -1}
                aria-label={`${x.when}: ${x.title}`}
                aria-current={!stack && i === active ? 'step' : undefined}
                onClick={() => go(i, true)}
                onKeyDown={onKey}
              >
                <span className="v4b-mark__bar" />
              </button>
            ))}
          </motion.div>
          <div className="v4b-future" aria-hidden="true" />
          <div className="v4b-head" aria-hidden="true">
            <span className="v4b-head__chip">
              <Flip text={now.when} dir={dir} />
            </span>
          </div>
        </div>

        <div className="v4b-read">
          <div aria-hidden="true">
            <p className="v4b-read__meta">
              <span className="v4b-dot" />
              <Flip text={KIND_LABEL[now.kind]} dir={dir} slots={11} />
              <span className="v4b-read__n">
                <Flip text={nn(active + 1)} dir={dir} />
                <span>/{nn(N)}</span>
              </span>
            </p>
            <div className="v4b-read__big" style={{ ['--fit' as string]: Math.min(1, 8 / Math.max(len, 1)) }}>
              <Flip text={d.big} dir={dir} slots={8} />
            </div>
            <p className="v4b-read__unit">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={now.title}
                  initial={{ opacity: 0, y: 8 * m.k }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: m.dur(0.16) } }}
                  transition={{ duration: m.dur(0.36), ease: [0.23, 1, 0.32, 1], delay: m.dur(0.08) }}
                >
                  {d.unit}
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
          <ul className="v4b-tally" aria-label="Running count by kind">
            {byKind.map(({ k, idx }) => {
              const done = idx.filter((i) => i <= active).length
              return (
                <li key={k} data-kind={k}>
                  <button
                    type="button"
                    aria-pressed={focus === k}
                    aria-label={`${KIND_LABEL[k]}: ${done} of ${idx.length} so far. Highlight on the timeline.`}
                    onClick={() => setFocus(focus === k ? null : k)}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setFocus(k)}
                    onPointerLeave={(e) => e.pointerType === 'mouse' && setFocus(null)}
                  >
                    <span className="v4b-tally__k">{KIND_LABEL[k]}</span>
                    <span className="v4b-tally__sq" aria-hidden="true">
                      {idx.map((i) => (
                        <i key={i} data-on={i <= active || undefined} />
                      ))}
                    </span>
                    <span className="v4b-tally__n" aria-hidden="true">
                      <Flip text={nn(done)} dir={dir} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <ol className="v4b-steps" ref={listRef}>
        <li className="v4b-intro">
          <h2 id="v4b-story-h" className="v4b-intro__h">
            The work, <span className="v4b-soft">2022 to now.</span>
          </h2>
          <p>
            {stack
              ? `${N} pieces of work, oldest first, each with the number it's measured by. The bars above rise by one for each.`
              : `${N} pieces of work, oldest first. As each one crosses the playhead, its number takes the counter and the timeline behind it grows a step.`}
          </p>
        </li>
        {ms.map((x, i) => (
          <Step key={x.title} ms={x} i={i} active={!stack && i === active} base={base} />
        ))}
        <li className="v4b-coda">
          <p>
            That's {N}, and counting. <span className="v4b-soft">The same work as a plain list, with every write-up:</span>
          </p>
          <button type="button" className="v4b-btn" onClick={onIndex}>
            Open the index <Arrow down />
          </button>
        </li>
      </ol>
    </section>
  )
}
