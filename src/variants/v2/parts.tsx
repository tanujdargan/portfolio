import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import lossmask from '../../data/lossmask.json'
import { person, links } from '../../content/site'
import { Flag } from '../../shared/Flag'
import { useFlags } from '../../lib/labprefs'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { ease, useTokens } from './motion'
import type { Preview, Row } from './rows'

const css = (o: Record<string, string | number>) => o as CSSProperties

/* ---------------------------------------------------------------- P17 odometer */

/**
 * Digits roll into place the first time they scroll into view.
 * The static HTML carries the final value, so no-JS readers and the first viewport never see zeros.
 * `live` values (the clock) roll on every change instead.
 */
export function Odo({ value, live = false }: { value: string; live?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const { reduced } = useMotionPrefs()
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (live || reduced) return setArmed(false)
    const el = ref.current!
    const r = el.getBoundingClientRect()
    if (r.top < innerHeight && r.bottom > 0) return
    setArmed(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        requestAnimationFrame(() => setArmed(false))
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [live, reduced])

  const chars = [...value]
  const digitCount = chars.filter((c) => /\d/.test(c)).length
  let seen = 0
  return (
    <span ref={ref} className="v2-odo" data-armed={armed || undefined} data-live={live || undefined}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="v2-odo__vis">
        {chars.map((c, i) => {
          if (!/\d/.test(c)) return <span key={i}>{c}</span>
          const j = digitCount - 1 - seen++
          return (
            <span key={i} className="v2-odo__d" style={css({ '--n': +c, '--j': j })}>
              <span className="v2-odo__col">
                {'0123456789'.split('').map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}

/* ---------------------------------------------------------------- P03 now line */

export function NowLine() {
  const { beri } = useFlags()
  const [t, setT] = useState<string | null>(null)
  useEffect(() => {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    let id = 0
    const tick = () => {
      setT(f.format(new Date()))
      id = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 40)
    }
    tick()
    return () => clearTimeout(id)
  }, [])
  return (
    <p className="v2-now">
      <span className="v2-now__dot" aria-hidden="true" />
      <span className="v2-now__time">{t ? <Odo value={t} live /> : <span aria-hidden="true">--:--</span>}</span>
      <span>
        in Toronto<span className="v2-dim"> · </span>
        {beri ? (
          <>
            building Beri<span className="v2-dim"> · </span>
            <span className="v2-now__long">steering Qwen2.5-1.5B</span>
          </>
        ) : (
          'steering Qwen2.5-1.5B'
        )}
      </span>
    </p>
  )
}

/* ---------------------------------------------------------------- P27 copy-email morph */

export function CopyEmail({ className = '', label }: { className?: string; label?: string }) {
  const { m, layout, pop } = useTokens()
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const text = copied ? 'Copied' : label ?? person.email
  return (
    <motion.button
      type="button"
      layout
      transition={layout}
      style={{ borderRadius: 999 }}
      className={`v2-copy ${className}`}
      data-copied={copied || undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setCopied(false), 1600)
        } catch {
          location.href = links.email.href
        }
      }}
    >
      <motion.span layout="position" transition={layout} className="v2-copy__icon" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={copied ? 'check' : 'copy'}
            initial={m.reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={m.reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: 'blur(2px)', transition: { duration: m.dur(0.12) } }}
            transition={pop}
          >
            {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.7} />}
          </motion.span>
        </AnimatePresence>
      </motion.span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          layout="position"
          className="v2-copy__label"
          initial={{ opacity: 0, y: 6 * m.k }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 * m.k, transition: { duration: m.dur(0.12) } }}
          transition={{ duration: m.dur(0.18), ease: ease.out }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
    </motion.button>
  )
}

/* ---------------------------------------------------------------- preview visuals (P18) */

const esTop = new Set([3, 8, 14, 19, 22, 31, 37, 41])

export function Visual({ p }: { p: Preview }) {
  if (p.kind === 'type')
    return (
      <div className="v2-vis v2-vis--type">
        <b>{p.big}</b>
        {p.lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    )
  if (p.kind === 'phones')
    return (
      <div className="v2-vis v2-vis--phones">
        {p.srcs.map((s) => (
          <img key={s} src={s} alt="" width={420} height={914} loading="lazy" decoding="async" />
        ))}
      </div>
    )
  if (p.kind === 'img')
    return (
      <div className="v2-vis v2-vis--img">
        <img src={p.src} alt={p.alt} width={p.w} height={p.h} loading="lazy" decoding="async" />
      </div>
    )
  if (p.kind === 'bars') {
    const max = Math.max(...p.values.map(Math.abs))
    return (
      <div className="v2-vis v2-vis--bars">
        <svg viewBox="0 0 180 96" role="img" aria-label="Read-back projection per steering strength, joy vector">
          <line x1="0" x2="180" y1="48" y2="48" stroke="var(--line-2)" />
          {p.values.map((v, i) => {
            const h = (Math.abs(v) / max) * 40
            return <rect key={i} x={6 + i * 19.5} width="10" rx="1.5" y={v > 0 ? 48 - h : 48} height={h} fill={v > 0 ? 'var(--accent)' : 'var(--fg-3)'} />
          })}
        </svg>
        <span className="v2-vis__axis">
          <span>α −1.2</span>
          <span>0</span>
          <span>+1.2</span>
        </span>
      </div>
    )
  }
  if (p.kind === 'tokens') {
    const segs = lossmask.segments.filter((s) => s.role !== 'system')
    return (
      <div className="v2-vis v2-vis--tokens">
        {segs.map((s) => (
          <p key={s.role} data-role={s.role}>
            {s.tokens.slice(0, s.role === 'user' ? 10 : 12).map((t, i) => (
              <span key={i}>{t}</span>
            ))}
            <span>…</span>
          </p>
        ))}
      </div>
    )
  }
  return (
    <div className="v2-vis v2-vis--dots" aria-hidden="true">
      {Array.from({ length: 45 }, (_, i) => (
        <span key={i} data-top={esTop.has(i) || undefined} />
      ))}
    </div>
  )
}

const caption: Partial<Record<Preview['kind'], string>> = {
  bars: 'Real: joy read-back on Qwen2.5-1.5B, α −1.2 → +1.2',
  tokens: 'Loss on assistant tokens only (λp = 0)',
  dots: '45 perturbations per step, top 8 kept',
  phones: 'Shipped: home, pantry, taste',
}

/* ---------------------------------------------------------------- P18 + P19 index rows */

const isMouse = (e: React.PointerEvent) => e.pointerType === 'mouse'

export function Index({ rows, base, start = 1, compact = false }: { rows: Row[]; base: string; start?: number; compact?: boolean }) {
  const { m, follow, soft } = useTokens()
  const [open, setOpen] = useState<string | null>(null)
  const [cur, setCur] = useState<Row | null>(null)
  const [shown, setShown] = useState(false)
  const [rmTop, setRmTop] = useState(0)
  const intent = useRef(0)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, follow as object)
  const sy = useSpring(y, follow as object)
  const list = useRef<HTMLOListElement>(null)

  useEffect(() => () => clearTimeout(intent.current), [])

  const place = (cx: number, cy: number) => {
    const W = 296
    const H = 212
    x.set(cx + 20 + W > innerWidth - 12 ? cx - W - 20 : cx + 20)
    y.set(Math.min(cy + 20, innerHeight - H - 12))
  }
  const enter = (r: Row, el: HTMLElement, cx?: number, cy?: number) => {
    setCur(r)
    setRmTop(el.offsetTop)
    if (cx !== undefined && cy !== undefined) {
      place(cx, cy)
      if (!shown) {
        sx.jump(x.get())
        sy.jump(y.get())
      }
    }
    if (shown) return
    clearTimeout(intent.current)
    // hover intent: a pass-through on the way to somewhere else shouldn't flash a card
    intent.current = window.setTimeout(() => setShown(true), 110)
  }
  const leave = () => {
    clearTimeout(intent.current)
    setShown(false)
  }

  return (
    <div className="v2-idx-wrap">
      <ol
        ref={list}
        className="v2-idx"
        data-compact={compact || undefined}
        onPointerMove={(e) => isMouse(e) && place(e.clientX, e.clientY)}
        onPointerLeave={(e) => isMouse(e) && leave()}
      >
        {rows.map((r, i) => {
          const isOpen = open === r.id
          const n = String(start + i).padStart(2, '0')
          const inner = (
            <>
              <span className="v2-row__n">{n}</span>
              <span className="v2-row__main">
                <span className="v2-row__t">
                  {r.title}
                  {r.flag && <Flag note={r.flag} />}
                </span>
                <span className="v2-row__s">{r.sub}</span>
              </span>
              <span className="v2-row__m">
                <Odo value={r.metric} />
                {r.unit && <span className="v2-row__u"> {r.unit}</span>}
              </span>
              <span className="v2-row__w">{r.when}</span>
              <span className="v2-row__go" aria-hidden="true">
                {r.to ? '→' : r.href ? '↗' : '+'}
              </span>
            </>
          )
          const hitProps = {
            className: 'v2-row__hit',
            onPointerEnter: (e: React.PointerEvent<HTMLElement>) => isMouse(e) && enter(r, e.currentTarget.closest('li')!, e.clientX, e.clientY),
            onFocus: (e: React.FocusEvent<HTMLElement>) => {
              if (!e.currentTarget.matches(':focus-visible')) return
              const b = e.currentTarget.getBoundingClientRect()
              enter(r, e.currentTarget.closest('li')!, Math.min(b.right - 40, b.left + 420), b.top)
            },
            onBlur: leave,
          }
          const toggle = () => setOpen(isOpen ? null : r.id)
          return (
            <li key={r.id} className="v2-row" data-open={isOpen || undefined} data-cur={(shown && cur?.id === r.id) || undefined}>
              <div className="v2-row__head">
                {r.to ? (
                  <Link to={`${base}${r.to}`} {...hitProps}>
                    {inner}
                  </Link>
                ) : r.href ? (
                  <a href={r.href} target="_blank" rel="noopener" {...hitProps}>
                    {inner}
                  </a>
                ) : (
                  <button type="button" aria-expanded={isOpen} onClick={toggle} {...hitProps}>
                    {inner}
                  </button>
                )}
                {/* touch: the whole row expands instead of navigating (P18, hover: none) */}
                <button type="button" className="v2-row__tap" aria-expanded={isOpen} aria-label={`${isOpen ? 'Hide' : 'Show'} details: ${r.title}`} onClick={toggle} />
              </div>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    className="v2-row__panel"
                    initial={m.reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    animate={m.reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                    exit={m.reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={m.reduced ? { duration: 0.18 } : { height: soft, opacity: { duration: m.dur(0.2), ease: ease.out } }}
                  >
                    <div className="v2-row__panel-in">
                      <div className="v2-row__thumb">
                        <Visual p={r.preview} />
                      </div>
                      <div>
                        <p>{r.detail}</p>
                        {(r.to || r.href) &&
                          (r.to ? (
                            <Link className="v2-cta" to={`${base}${r.to}`}>
                              {r.cta ?? 'Read the write-up'} →
                            </Link>
                          ) : (
                            <a className="v2-cta" href={r.href} target="_blank" rel="noopener">
                              {r.cta ?? new URL(r.href!).hostname.replace('www.', '')} ↗
                            </a>
                          ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )
        })}
      </ol>

      {/* one floating preview per list; fixed-position so it never affects layout */}
      <AnimatePresence>
        {shown && cur && (
          <motion.div
            key="pv"
            className="v2-pv"
            data-rm={m.reduced || undefined}
            aria-hidden="true"
            style={m.reduced ? { top: rmTop } : { x: sx, y: sy }}
            initial={m.reduced ? { opacity: 0 } : { opacity: 0, scale: 1 - 0.08 * m.k }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: m.reduced ? 1 : 1 - 0.04 * m.k, transition: { duration: m.dur(0.12) } }}
            transition={{ duration: m.dur(0.18), ease: ease.out }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={cur.id}
                className="v2-pv__in"
                initial={{ opacity: 0, y: 6 * m.k }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: m.dur(0.1) } }}
                transition={{ duration: m.dur(0.15), ease: ease.out }}
              >
                <Visual p={cur.preview} />
                {cur.preview.kind !== 'type' && <p className="v2-pv__cap">{caption[cur.preview.kind] ?? cur.sub}</p>}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
