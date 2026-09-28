/*
 * The work index: six rows, the hero of the page.
 *  Desktop  hover or keyboard focus lights one row and dims the rest (PATTERNS 11); the lens (10) follows the cursor
 *           with a lerp and a velocity tilt, opens on a clip-path iris and draws that work's poster in its accent;
 *           the title rolls letter by letter (6). Click opens the exhibit in place (12): spec sheet + live demo.
 *  Phone    the index pins under the bar and scroll scrubs through it (a scroll-driven accordion, basement-style):
 *           the active row's poster opens inline and draws itself, the rest dim (Mobile equivalents 4). Tap opens
 *           the exhibit as a full-screen sheet.
 *  Either   "Read the write-up" hands the row's number, title and metric to the article as shared elements (18).
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { works, prefetchDemo, type Work, type WorkKey } from '../../content/work'
import { earlier } from '../../content/site'
import { Poster } from '../../shared/Poster'
import { Scramble } from '../../shared/Scramble'
import { Split } from '../../shared/Split'
import { Flag } from '../../shared/Flag'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { Show } from '../../lib/labprefs'
import { useMotionPrefs, type MotionPrefs } from '../../lib/motion'
import { lenis } from '../../lib/lenis'
import { specs, tagLine } from './spec'
import { Roll, Draw, useMedia, useIso, Arrow, vt, VT, markVT } from './bits'

const EASE_OUT = [0.16, 1, 0.3, 1] as const
const EASE_IO = [0.65, 0, 0.35, 1] as const
const BAR_H = 52

type Pt = { x: number; y: number; top?: number }
const acc = (w: Work) => ({ ['--w' as string]: w.accent }) as CSSProperties

/* ---------------- the lens ---------------- */

const LENS_W = 420
const LENS_H = 163 + 30

function Lens({ k, pt, anchor }: { k: WorkKey | null; pt: MutableRefObject<Pt>; anchor: Pt | null }) {
  const m = useMotionPrefs()
  const el = useRef<HTMLDivElement>(null)
  const s = useRef({ x: 0, y: 0, r: 0, live: false, off: 0 as ReturnType<typeof setTimeout> | 0 })
  const [shown, setShown] = useState<WorkKey | null>(null)
  useEffect(() => {
    if (k) setShown(k)
  }, [k])

  useEffect(() => {
    const st = s.current
    const node = el.current
    if (!node) return
    if (!k) {
      // keep the last frame while the iris closes; the next open snaps to the pointer
      st.off = setTimeout(() => (st.live = false), 260)
      return
    }
    clearTimeout(st.off)
    const target = (): Pt => {
      // keyboard focus and reduced motion: parked under the row (above it near the bottom edge), no follow, no tilt
      if (anchor) {
        const y = anchor.y + 12 + LENS_H > innerHeight - 12 ? (anchor.top ?? anchor.y) - 12 - LENS_H : anchor.y + 12
        return { x: Math.min(anchor.x, innerWidth - LENS_W - 16), y }
      }
      // the lens hangs below-right of the pointer, over the dimmed rows, so the lit title stays readable;
      // near the bottom edge it flips above
      const p = pt.current
      let x = p.x + 18
      if (x + LENS_W > innerWidth - 16) x = innerWidth - 16 - LENS_W
      let y = p.y + 40
      if (y + LENS_H > innerHeight - 12) y = p.y - 40 - LENS_H
      return { x, y }
    }
    if (!st.live) {
      const t = target()
      st.x = t.x
      st.y = t.y
      st.r = 0
      st.live = true
    }
    // lerp 0.12 per 60 Hz frame (subtle is tighter, expressive floats); tilt from horizontal velocity, ±5° at default
    const lerp = m.level === 'subtle' ? 0.18 : m.level === 'expressive' ? 0.09 : 0.12
    const maxDeg = m.reduced ? 0 : Math.min(8, 5 * m.k)
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const f = Math.min(4, (now - last) / 16.667)
      last = now
      const a = m.reduced || anchor ? 1 : 1 - Math.pow(1 - lerp, f)
      const t = target()
      const px = st.x
      st.x += (t.x - st.x) * a
      st.y += (t.y - st.y) * a
      const v = (st.x - px) / Math.max(f, 0.25)
      const rt = Math.max(-maxDeg, Math.min(maxDeg, v * 0.32))
      st.r += (rt - st.r) * (1 - Math.pow(1 - 0.14, f))
      node.style.transform = `translate3d(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px, 0) rotate(${st.r.toFixed(2)}deg)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [k, anchor, pt, m.level, m.reduced, m.k])

  const w = works.find((x) => x.key === shown)
  return (
    <div ref={el} className="s1-lens" data-open={k ? '' : undefined} style={w ? acc(w) : undefined} aria-hidden="true">
      {w && (
        <div className="s1-lens__in">
          <p className="s1-lens__bar">
            <span className="s1-lens__dot" />
            <Scramble text={tagLine[w.key]} trigger="change" duration={420} className="s1-lens__tag" />
            <span className="s1-lens__go">
              {w.n} · open <kbd>↵</kbd>
            </span>
          </p>
          <Draw key={w.key} className="s1-lens__p">
            <Poster k={w.key} />
          </Draw>
        </div>
      )}
    </div>
  )
}

/* ---------------- exhibit (shared by the in-place panel and the phone sheet) ---------------- */

function SpecRow({ k, v, flag, i }: { k: string; v: React.ReactNode; flag?: string; i: number }) {
  return (
    <div className="s1-spec__r" style={{ ['--i' as string]: i }}>
      <dt>{k}</dt>
      <dd>
        {v}
        {flag && <Flag note={flag} />}
      </dd>
    </div>
  )
}

function ExhibitBody({ w, base, onClose, onRead }: { w: Work; base: string; onClose: () => void; onRead: () => void }) {
  const sp = specs[w.key]
  const f = (row: 'data' | 'result') => (sp.flag?.row === row ? sp.flag.note : undefined)
  return (
    <div className="s1-ex__grid">
      <div className="s1-ex__side">
        <Split as="p" className="s1-ex__hook" text={w.hook} />
        <dl className="s1-spec">
          <SpecRow i={0} k="Where" v={sp.where} />
          <SpecRow i={1} k="When" v={sp.when} />
          <SpecRow i={2} k="Data" v={sp.data} flag={f('data')} />
          <SpecRow i={3} k="Result" v={<Scramble text={sp.result} trigger="none" run={1} duration={700} />} flag={f('result') ?? w.flag} />
        </dl>
        <div className="s1-ex__acts">
          {w.slug && sp.cta && (
            <Link to={`${base}/research/${w.slug}`} className="s1-cta s1-rollhost" onClick={onRead}>
              <Roll text={sp.cta} />
              <Arrow />
            </Link>
          )}
          <button type="button" className="s1-close" onClick={onClose}>
            <span className="s1-x" aria-hidden="true" />
            Close
          </button>
        </div>
      </div>
      <div className="s1-ex__demo">
        <Demo kind={w.key} hero={w.key === 'steering'} />
      </div>
    </div>
  )
}

const panel = (m: MotionPrefs) => ({
  initial: { height: 0 },
  animate: { height: 'auto', transition: { duration: m.dur(0.7), ease: EASE_OUT } },
  exit: { height: 0, transition: { duration: m.dur(0.5), ease: EASE_IO } },
})

/* ---------------- phone sheet ---------------- */

function Sheet({ w, base, onClose }: { w: Work; base: string; onClose: () => void }) {
  const m = useMotionPrefs()
  const box = useRef<HTMLDivElement>(null)
  const n = useRef<HTMLSpanElement>(null)
  const t = useRef<HTMLSpanElement>(null)
  const mt = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const html = document.documentElement
    const main = document.getElementById('main')
    const prev = document.activeElement as HTMLElement | null
    html.classList.add('s1-locked')
    main?.setAttribute('inert', '')
    box.current?.querySelector<HTMLElement>('.s1-sheet__x')?.focus({ preventScroll: true })
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', key)
    return () => {
      html.classList.remove('s1-locked')
      main?.removeAttribute('inert')
      removeEventListener('keydown', key)
      prev?.focus({ preventScroll: true })
    }
  }, [onClose])
  return (
    <motion.div
      ref={box}
      className="s1-sheet"
      style={acc(w)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="s1-sheet-t"
      initial={{ y: '100%' }}
      animate={{ y: 0, transition: { duration: m.dur(0.5), ease: EASE_OUT } }}
      exit={{ y: '100%', transition: { duration: m.dur(0.333), ease: EASE_IO } }}
    >
      <div className="s1-sheet__head">
        <span ref={n} data-vt className="s1-sheet__n">
          {w.n}
        </span>
        <span ref={mt} data-vt className="s1-sheet__m">
          <Scramble text={w.metric} trigger="none" run={1} />
        </span>
        <button type="button" className="s1-sheet__x" onClick={onClose} aria-label="Close">
          <span className="s1-x" aria-hidden="true" />
        </button>
        <h2 id="s1-sheet-t" className="s1-sheet__t">
          <span ref={t} data-vt className="s1-sheet__tt">
            <Split text={w.short} by="char" />
          </span>
        </h2>
        <p className="s1-sheet__meta">{w.meta}</p>
      </div>
      <ExhibitBody w={w} base={base} onClose={onClose} onRead={() => markVT(w.key, [n.current, t.current, mt.current])} />
    </motion.div>
  )
}

/* ---------------- a row ---------------- */

function Row({
  w,
  i,
  base,
  lit,
  band,
  open,
  narrow,
  onPeek,
  onLeave,
  onToggle,
  pt,
}: {
  w: Work
  i: number
  base: string
  lit: boolean
  band: boolean
  open: boolean
  narrow: boolean
  onPeek: (k: WorkKey, anchor: Pt | null) => void
  onLeave: () => void
  onToggle: (k: WorkKey, li: HTMLLIElement) => void
  pt: MutableRefObject<Pt>
}) {
  const m = useMotionPrefs()
  const li = useRef<HTMLLIElement>(null)
  const n = useRef<HTMLSpanElement>(null)
  const t = useRef<HTMLSpanElement>(null)
  const mt = useRef<HTMLSpanElement>(null)
  const [run, setRun] = useState(0)
  useEffect(() => {
    if (open) setRun((r) => r + 1)
  }, [open])
  // coming back from this work's write-up: carry the shared names on the first frame
  const back = vt.key === w.key
  const name = (v: string) => (back ? { viewTransitionName: v } : undefined)
  const anchorOf = (): Pt => {
    const r = li.current!.getBoundingClientRect()
    const tr = t.current!.getBoundingClientRect()
    return { x: tr.left + 120, y: r.top + Math.min(r.height, 120), top: r.top }
  }
  const id = `s1-ex-${w.key}`
  return (
    <li ref={li} className="s1-row" style={{ ...acc(w), ['--r' as string]: i }} data-lit={lit || undefined} data-band={band || undefined} data-open={open || undefined}>
      <button
        type="button"
        className="s1-row__btn s1-rollhost"
        aria-expanded={open}
        aria-controls={open && !narrow ? id : undefined}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'mouse') return
          pt.current = { x: e.clientX, y: e.clientY }
          onPeek(w.key, m.reduced ? anchorOf() : null)
          prefetchDemo[w.key]()
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse') pt.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerLeave={(e) => e.pointerType === 'mouse' && onLeave()}
        onFocus={(e) => {
          if (e.currentTarget.matches(':focus-visible')) {
            onPeek(w.key, anchorOf())
            prefetchDemo[w.key]()
          }
        }}
        onBlur={onLeave}
        onClick={() => onToggle(w.key, li.current!)}
      >
        <span ref={n} data-vt className="s1-row__n" style={name(VT.n)}>
          {w.n}
        </span>
        <span ref={t} data-vt className="s1-row__t" style={name(VT.t)}>
          <Roll text={w.short} />
        </span>
        <span className="s1-row__pv" aria-hidden="true">
          <span className="s1-row__pvi">
            <Draw>
              <Poster k={w.key} />
            </Draw>
          </span>
        </span>
        <span className="s1-row__end">
          <span ref={mt} data-vt className="s1-row__m" style={name(VT.m)}>
            <Scramble text={w.metric} trigger="none" run={run} duration={700} />
          </span>
          <span className="s1-row__meta">{w.meta}</span>
        </span>
        <span className="s1-row__plus" aria-hidden="true" />
      </button>
      {!narrow && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div key="ex" id={id} className="s1-ex" {...panel(m)}>
              <ExhibitBody w={w} base={base} onClose={() => onToggle(w.key, li.current!)} onRead={() => markVT(w.key, [n.current, t.current, mt.current])} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </li>
  )
}

/* ---------------- earlier work + Beri: one quiet block under the index ---------------- */

function Also({ base }: { base: string }) {
  const m = useMotionPrefs()
  const [open, setOpen] = useState(false)
  return (
    <div className="s1-also">
      <Show when="beri">
        <Link to={`${base}/beri`} className="s1-also__row s1-also__beri s1-rollhost">
          <span className="s1-also__k">Also</span>
          <span className="s1-also__t">
            <Roll text="Beri" />
          </span>
          <span className="s1-also__d">a food app I’m building</span>
          <Arrow />
        </Link>
      </Show>
      <button type="button" className="s1-also__row" aria-expanded={open} aria-controls="s1-earlier" onClick={() => setOpen(!open)}>
        <span className="s1-also__k">Earlier</span>
        <span className="s1-also__t">Hackathons, Kaggle, open source</span>
        <span className="s1-also__d">{earlier.length}</span>
        <span className="s1-plus" aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="e"
            id="s1-earlier"
            className="s1-earlier"
            initial={{ height: 0 }}
            animate={{ height: 'auto', transition: { duration: m.dur(0.5), ease: EASE_OUT } }}
            exit={{ height: 0, transition: { duration: m.dur(0.333), ease: EASE_IO } }}
          >
            <ul>
              {earlier.map((e, i) => {
                const inner = (
                  <>
                    <span className="s1-earlier__w">{e.when}</span>
                    <span className="s1-earlier__t">
                      {e.title}
                      {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in a local repo; confirm it's okay to list." />}
                    </span>
                    <span className="s1-earlier__r">{e.role}</span>
                    {e.href ? <Arrow out /> : <span />}
                  </>
                )
                return (
                  <li key={e.title} style={{ ['--i' as string]: i }}>
                    {e.href ? (
                      <a href={e.href} target="_blank" rel="noopener" className="s1-earlier__row">
                        {inner}
                      </a>
                    ) : (
                      <div className="s1-earlier__row">{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------------- the section ---------------- */

export function WorkIndex({ base, onPeek }: { base: string; onPeek: (k: WorkKey | null) => void }) {
  const m = useMotionPrefs()
  const fine = useMedia('(hover: hover) and (pointer: fine)')
  const narrow = useMedia('(max-width: 759px)')
  const [peek, setPeek] = useState<WorkKey | null>(null)
  const [anchor, setAnchor] = useState<Pt | null>(null)
  const [open, setOpen] = useState<WorkKey | null>(null)
  const [band, setBand] = useState(() => Math.max(0, works.findIndex((w) => w.key === vt.key)))
  const [pinned, setPinned] = useState(false)
  const [live, setLive] = useState(false)
  const pt = useRef<Pt>({ x: 0, y: 0 })
  const leave = useRef<ReturnType<typeof setTimeout>>(undefined)
  const track = useRef<HTMLDivElement>(null)
  const runway = useRef<HTMLDivElement>(null)
  const [root, setRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setRoot(document.querySelector<HTMLElement>('.s1'))
    setLive(true)
  }, [])
  useEffect(() => onPeek(peek), [peek, onPeek])

  // Phones: pin the index and let scroll scrub through it, when it fits on the screen.
  useIso(() => {
    // pin only when the whole index (six rows + one open poster) fits under the bar
    const decide = () => {
      const pin = track.current?.querySelector<HTMLElement>('.s1-pin')
      setPinned(matchMedia('(max-width: 759px)').matches && !!pin && pin.offsetHeight + BAR_H <= innerHeight + 2)
    }
    decide()
    addEventListener('resize', decide)
    return () => removeEventListener('resize', decide)
  }, [])
  useEffect(() => {
    if (!pinned) return
    let raf = 0
    const read = () => {
      raf = 0
      const r = track.current!.getBoundingClientRect()
      const run = runway.current!.offsetHeight || 1
      const p = Math.min(1, Math.max(0, (BAR_H - r.top) / run))
      const f = p * (works.length - 1)
      // hysteresis: switch only once the scrub is well past the midpoint, so a row never flickers
      setBand((b) => (Math.abs(f - b) > 0.6 ? Math.round(f) : b))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    read()
    addEventListener('scroll', on, { passive: true })
    return () => {
      removeEventListener('scroll', on)
      cancelAnimationFrame(raf)
    }
  }, [pinned])
  // Narrow screens that are too short to pin: the row crossing the centre band is the active one.
  useEffect(() => {
    if (!narrow || pinned) return
    const rows = [...track.current!.querySelectorAll<HTMLElement>('.s1-row')]
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setBand(rows.indexOf(e.target as HTMLElement))), {
      rootMargin: '-45% 0px -45% 0px',
    })
    rows.forEach((r) => io.observe(r))
    return () => io.disconnect()
  }, [narrow, pinned])

  useEffect(() => {
    if (!open || narrow) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [open, narrow])

  const peekRow = (k: WorkKey, a: Pt | null) => {
    clearTimeout(leave.current)
    setAnchor(a)
    setPeek(k)
  }
  const leaveRow = () => {
    clearTimeout(leave.current)
    leave.current = setTimeout(() => setPeek(null), 70)
  }
  const toggle = (k: WorkKey, li: HTMLLIElement) => {
    setPeek(null)
    if (narrow) return setOpen(k)
    const closing = open === k
    // where the row will sit once any exhibit above it has collapsed
    let y = li.getBoundingClientRect().top + scrollY
    const prev = open && open !== k ? document.getElementById(`s1-ex-${open}`) : null
    if (prev && prev.getBoundingClientRect().top < li.getBoundingClientRect().top) y -= prev.offsetHeight
    setOpen(closing ? null : k)
    if (closing) return
    const top = y - 20
    if (Math.abs(top - scrollY) < 8) return
    const l = lenis()
    if (l && !m.reduced) l.scrollTo(top, { duration: 1.1, easing: (t: number) => 1 - Math.pow(1 - t, 4) })
    else window.scrollTo({ top, behavior: m.reduced ? 'auto' : 'smooth' })
  }

  const closeSheet = useCallback(() => setOpen(null), [])
  const cur = open ? works.find((w) => w.key === open)! : null
  const lensKey = peek && peek !== open ? peek : null
  return (
    <section id="work" className="s1-sec s1-work" aria-labelledby="work-h" tabIndex={-1}>
      <span id="research" className="s1-anchor" aria-hidden="true" />
      <header className="s1-whead">
        <h2 id="work-h" className="s1-whead__t">
          Work <span className="s1-whead__c">(06)</span>
        </h2>
        <p className="s1-whead__hint">
          <span className="s1-fine">Hover to preview · click to open</span>
          <span className="s1-touch">Scroll to preview · tap to open</span>
        </p>
      </header>
      <div ref={track} className="s1-track" data-pin={pinned || undefined} style={{ ['--band' as string]: band }}>
        <div className="s1-anchors" aria-hidden="true">
          {works.map((w, i) => (
            <span key={w.key} id={`w-${w.key}`} style={{ ['--i' as string]: i }} />
          ))}
        </div>
        <div className="s1-pin">
          <ol className="s1-rows" data-dim={(narrow ? live : !!peek || !!open) || undefined} data-live={live || undefined}>
            {works.map((w, i) => (
              <Row
                key={w.key}
                w={w}
                i={i}
                base={base}
                lit={narrow ? band === i : peek === w.key || (!peek && open === w.key)}
                band={band === i}
                open={open === w.key}
                narrow={narrow}
                onPeek={peekRow}
                onLeave={leaveRow}
                onToggle={toggle}
                pt={pt}
              />
            ))}
          </ol>
        </div>
        <div ref={runway} className="s1-runway" />
      </div>
      <Also base={base} />
      {fine && root && createPortal(<Lens k={lensKey} pt={pt} anchor={anchor} />, root)}
      {narrow &&
        root &&
        createPortal(<AnimatePresence>{cur && <Sheet key={cur.key} w={cur} base={base} onClose={closeSheet} />}</AnimatePresence>, root)}
    </section>
  )
}
