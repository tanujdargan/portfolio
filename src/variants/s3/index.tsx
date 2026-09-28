/*
 * S3 "Board". The home page is a zoomable research board: a dark dot-grid canvas holding six exhibit cards, an
 * experience sheet, an earlier-work cluster, contact and a signature block. You pan, zoom and fly into a work, and
 * at arrival the poster cross-fades into the live demo mounted at that size.
 *
 * SSR renders a plain list view (fast, complete, accessible). After hydration the list assembles into the board
 * with a FLIP: every object flies from its list position to its board position. The same DOM nodes are the list
 * and the board, so the tab order is the reading order in both. Reduced motion defaults to the list.
 *
 * camera.ts   pure camera math (zoom about a point, pinch, clamping, rubber band, van Wijk–Nuij flights) + self-check
 * board.ts    the controller: input, inertia, the rAF loop, semantic zoom, dot grid, HUD readout, minimap
 * layout.ts   the two compositions (wide, tall) and the board strings
 *
 * Patterns (research/PATTERNS.md): 47 drag/zoom canvas · 48 view-mode toggle · 45 keyboard chips and auto tour ·
 * 30/31 instrument readouts and a context label that re-scrambles · 34 corner registration marks · 18 shared-element
 * transitions · 11 focus-dim · 52 metric scramble · mobile equivalents 2, 5 and 8.
 * Type: IBM Plex Sans Variable (wdth + wght follow zoom) + IBM Plex Mono. Ground: blue-grey near-black; accents
 * only on the open card, hover and the minimap.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as RKE } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { works, roles, prefetchDemo, type Work, type WorkKey } from '../../content/work'
import { person, earlier, beri as beriInfo, links as siteLinks } from '../../content/site'
import { Links } from '../../shared/Links'
import { OrgTile } from '../../shared/OrgLogo'
import { Poster } from '../../shared/Poster'
import { Scramble } from '../../shared/Scramble'
import { Flag } from '../../shared/Flag'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import { Show, useFlags } from '../../lib/labprefs'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { Board, MIN_S, type Item } from './board'
import { fit, type Cam, type Rect } from './camera'
import { computeLayout, layoutKind, links as strings, type ItemId, type Layout } from './layout'
import './s3.css'

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect
const EASE_IO = 'cubic-bezier(.65,0,.35,1)'
const EASE_OUT = 'cubic-bezier(.16,1,.3,1)'
/** the intro plays once per page load; client-side returns go straight to the board */
let introPlayed = false

type View = 'list' | 'board'
type Open = { key: WorkKey; from: Rect; panel: Rect; radius: number }
type Box = { id: string; r: Rect; accent?: string }
type Wire = { d: string; lx: number; ly: number; x0: number; y0: number; x1: number; y1: number; label: string; a: string; b: string }

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const byKey = (k: string) => works.find((w) => w.key === k)
const isNarrow = () => innerWidth < 760

/* ---------------- small parts ---------------- */

function Arrow({ out = false }: { out?: boolean }) {
  return (
    <svg className="s3-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      {out ? <path d="M3.5 8.5l5-5M4.5 3.5h4v4" stroke="currentColor" strokeWidth="1.4" /> : <path d="M1.5 6h8.5M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" />}
    </svg>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <button
      type="button"
      className="s3-copy"
      data-copied={copied || undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          clearTimeout(t.current)
          t.current = setTimeout(() => setCopied(false), 1600)
        } catch {
          location.href = siteLinks.email.href
        }
      }}
    >
      <span aria-hidden="true">{copied ? 'Copied' : 'Copy'}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email address copied' : 'Copy email address'}
      </span>
    </button>
  )
}

/** Registration marks at an object's corners: the board's "pinned" look (and a quiet nod to pattern 34). */
const Marks = () => (
  <span className="s3-marks" aria-hidden="true">
    <i />
    <i />
    <i />
    <i />
  </span>
)

/* ---------------- board objects (also the list view) ---------------- */

function Card({ w, base, i, onOpen }: { w: Work; base: string; i: number; onOpen: (k: WorkKey) => void }) {
  const warm = () => void prefetchDemo[w.key]().catch(() => {})
  return (
    <article
      className="s3-item s3-card"
      data-item
      data-id={w.key}
      style={{ ['--accent' as string]: w.accent, ['--i' as string]: i + 1 }}
      aria-labelledby={`s3-${w.key}-t`}
      onPointerEnter={warm}
      onFocus={warm}
    >
      <div className="s3-card__in">
        <Marks />
        <p className="s3-card__top">
          <span className="s3-card__tag">{w.tag}</span>
          <span className="s3-card__kind" aria-hidden="true">
            {w.n}/06
          </span>
        </p>
        <div className="s3-card__media">
          <Poster k={w.key} />
        </div>
        <h3 className="s3-card__title" id={`s3-${w.key}-t`}>
          <span className="s3-card__n">{w.n}</span> <span className="s3-card__short">{w.short}</span>
          {w.flag && <Flag note={w.flag} />}
        </h3>
        <p className="s3-card__metric">{w.metric}</p>
        <p className="s3-card__hook">{w.hook}</p>
        <div className="s3-card__acts">
          <button type="button" className="s3-card__open" onClick={() => onOpen(w.key)} aria-label={`${w.short}: ${w.kind === 'hardware' ? 'track it live' : 'run the live demo'}`}>
            <span className="s3-play" aria-hidden="true" />
            <span className="s3-card__run">{w.kind === 'hardware' ? 'Track' : 'Run'}</span>
          </button>
          {w.slug && (
            <Link
              to={`${base}/research/${w.slug}`}
              className="s3-card__go"
              onClick={(e) => {
                // shared element: this card becomes the write-up's plate
                const card = (e.currentTarget as HTMLElement).closest<HTMLElement>('.s3-card')
                card?.style.setProperty('view-transition-name', 's3-frame')
                card?.querySelector<HTMLElement>('.s3-card__short')?.style.setProperty('view-transition-name', 's3-title')
                sessionStorage.setItem('s3-return', w.key)
              }}
            >
              Write-up <Arrow />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

function Sig() {
  return (
    <section id="about" className="s3-item s3-sheet s3-sig" data-item data-id="sig" data-cs="0.62" aria-labelledby="s3-name" style={{ ['--i' as string]: 0 }}>
      <div className="s3-sheet__in s3-cs">
        <Marks />
        <h1 className="s3-sig__name" id="s3-name">
          {person.name}
        </h1>
        <p className="s3-sig__line">I build ML systems and study what language models do inside.</p>
        <p className="s3-sig__meta">
          <span>CS · UVic ’27</span>
        </p>
      </div>
    </section>
  )
}

function Experience() {
  const [open, setOpen] = useState<number | null>(null)
  const m = useMotionPrefs()
  return (
    <section id="experience" className="s3-item s3-sheet s3-exp" data-item data-id="exp" aria-labelledby="s3-exp-h" style={{ ['--i' as string]: 7 }}>
      <div className="s3-sheet__in">
        <Marks />
        <h2 className="s3-sheet__h s3-cs" id="s3-exp-h">
          <span>Experience</span>
          <span className="s3-sheet__n">06</span>
        </h2>
        <ol className="s3-roles">
          {roles.map((r, i) => (
            <li key={r.org} className="s3-role" data-org={r.logo} data-open={open === i || undefined}>
              <button type="button" className="s3-role__row" aria-expanded={open === i} aria-controls={`s3-role-${i}`} onClick={() => setOpen(open === i ? null : i)}>
                <OrgTile org={r.logo} size={36} />
                <span className="s3-role__main">
                  <span className="s3-role__t">
                    {r.role}
                    <span className="s3-role__sep" aria-hidden="true">
                      {' · '}
                    </span>
                    <span className="sr-only">, </span>
                    <span className="s3-role__org">{r.org}</span>
                  </span>
                  <span className="s3-role__line">{r.line}</span>
                </span>
                <span className="s3-role__when">{r.when}</span>
                <span className="s3-plus" aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    key="more"
                    id={`s3-role-${i}`}
                    className="s3-role__more"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1, transition: { height: m.spring(380), opacity: { duration: m.dur(0.26), delay: m.dur(0.06) } } }}
                    exit={{ height: 0, opacity: 0, transition: { height: { duration: m.dur(0.24), ease: [0.65, 0, 0.35, 1] }, opacity: { duration: m.dur(0.12) } } }}
                  >
                    <div className="s3-role__inner">
                      <ul>
                        {r.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                      <p className="s3-role__meta">
                        <span className="s3-role__metric">{r.metric}</span>
                        <span>{r.where}</span>
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Earlier({ view }: { view: View }) {
  const [open, setOpen] = useState(false)
  const shown = open || view === 'board'
  return (
    <section id="earlier" className="s3-item s3-sheet s3-earlier" data-item data-id="earlier" aria-labelledby="s3-earlier-h" style={{ ['--i' as string]: 9 }} data-shown={shown || undefined}>
      <div className="s3-sheet__in">
        <Marks />
        <h2 className="s3-sheet__h s3-cs" id="s3-earlier-h">
          <span>Earlier work</span>
          <span className="s3-sheet__n">0{earlier.length}</span>
        </h2>
        <button type="button" className="s3-disclose" aria-expanded={open} aria-controls="s3-notes" onClick={() => setOpen(!open)}>
          <span className="s3-plus" aria-hidden="true" />
          {open ? 'Hide' : 'Hackathons, Kaggle, open source'}
        </button>
        <ul className="s3-notes" id="s3-notes" hidden={!shown}>
          {earlier.map((e, i) => {
            const inner = (
              <>
                <span className="s3-note__t">
                  {e.title}
                  {e.href && <Arrow out />}
                </span>
                <span className="s3-note__r">{e.role}</span>
                <span className="s3-note__w">{e.when}</span>
              </>
            )
            return (
              <li key={e.title} className="s3-note" style={{ ['--r' as string]: `${[-1.2, 0.8, -0.4, 1.1, 0.5, -0.9, 1.3, -0.6][i % 8]}deg` }}>
                {e.href ? (
                  <a href={e.href} target="_blank" rel="noopener" className="s3-note__in">
                    {inner}
                  </a>
                ) : (
                  <div className="s3-note__in">{inner}</div>
                )}
                {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in a local repo; confirm it's okay to list." />}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function Beri({ base }: { base: string }) {
  return (
    <aside id="beri" className="s3-item s3-sheet s3-beri" data-item data-id="beri" aria-labelledby="s3-beri-h" style={{ ['--i' as string]: 8 }}>
      <div className="s3-sheet__in">
        <Marks />
        <p className="s3-sheet__h s3-cs">
          <span>Side project</span>
          <span className="s3-sheet__n">iOS</span>
        </p>
        <h2 className="s3-beri__t" id="s3-beri-h">
          Beri
        </h2>
        <p className="s3-beri__line">A food app I’m building.</p>
        <Link
          to={`${base}/beri`}
          className="s3-beri__go"
          onClick={(e) => {
            ;(e.currentTarget as HTMLElement).closest<HTMLElement>('.s3-beri')?.style.setProperty('view-transition-name', 's3-frame')
            sessionStorage.setItem('s3-return', 'beri')
          }}
        >
          Case study <Arrow />
        </Link>
      </div>
    </aside>
  )
}

function Contact() {
  return (
    <section id="contact" className="s3-item s3-sheet s3-contact" data-item data-id="contact" aria-labelledby="s3-contact-h" style={{ ['--i' as string]: 10 }}>
      <div className="s3-sheet__in">
        <Marks />
        <h2 className="s3-sheet__h s3-cs" id="s3-contact-h">
          <span>Contact</span>
          <span className="s3-sheet__n">@</span>
        </h2>
        <p className="s3-contact__line">Email is the fastest way to reach me.</p>
        <div className="s3-mail">
          <a href={siteLinks.email.href} className="s3-mail__a">
            {person.email}
          </a>
          <CopyEmail />
        </div>
        <Links className="s3-contact__links" mode="label" />
      </div>
    </section>
  )
}

/* ---------------- chrome ---------------- */

function ViewToggle({ view, onView }: { view: View; onView: (v: View) => void }) {
  return (
    <div className="s3-toggle" role="group" aria-label="View">
      {(['list', 'board'] as const).map((v) => (
        <button key={v} type="button" aria-pressed={view === v} onClick={() => view !== v && onView(v)}>
          {v === 'list' ? 'List' : 'Board'}
        </button>
      ))}
    </div>
  )
}

function Top({ base, home, children, onName }: { base: string; home: boolean; children?: React.ReactNode; onName?: () => void }) {
  return (
    <header className="s3-top">
      <div className="s3-top__id">
        {home ? (
          <button type="button" className="s3-name" onClick={onName} title="Board overview (0)">
            {person.name}
          </button>
        ) : (
          <Link to={`${base}/`} className="s3-name">
            <span aria-hidden="true">←</span> {person.name}
          </Link>
        )}
        <Links className="s3-links s3-links--cv" mode="both" size={14} only={['resume']} />
        <Links className="s3-links" mode="icon" size={16} only={['github', 'linkedin', 'x', 'email']} />
      </div>
      {children}
    </header>
  )
}

function Minimap({ boxes, bounds, svg, view, openKey, focusKey }: { boxes: Box[]; bounds: Rect | null; svg: React.Ref<SVGSVGElement>; view: React.Ref<SVGRectElement>; openKey?: string; focusKey?: string | null }) {
  return (
    <svg ref={svg} className="s3-mini" viewBox={bounds ? `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}` : '0 0 100 60'} aria-hidden="true" data-nodrag>
      <rect className="s3-mini__bg" x={bounds?.x ?? 0} y={bounds?.y ?? 0} width={bounds?.w ?? 100} height={bounds?.h ?? 60} />
      {boxes.map((b) => (
        <rect
          key={b.id}
          className="s3-mini__box"
          data-work={b.accent ? '' : undefined}
          data-on={openKey === b.id || focusKey === b.id || undefined}
          style={b.accent ? ({ ['--accent' as string]: b.accent } as CSSProperties) : undefined}
          x={b.r.x}
          y={b.r.y}
          width={b.r.w}
          height={b.r.h}
          rx={10}
        />
      ))}
      <rect ref={view} className="s3-mini__view" rx={14} />
    </svg>
  )
}

/* ---------------- the open card: the live demo at the card's size ---------------- */

function Stage({ o, closing, onClose, onClosed, base, reduced, t }: { o: Open; closing: boolean; onClose: () => void; onClosed: () => void; base: string; reduced: boolean; t: number }) {
  const w = byKey(o.key)!
  const ref = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  const [slow, setSlow] = useState(false)
  const clipFrom = `inset(${o.from.y - o.panel.y}px ${o.panel.x + o.panel.w - o.from.x - o.from.w}px ${o.panel.y + o.panel.h - o.from.y - o.from.h}px ${o.from.x - o.panel.x}px round ${o.radius}px)`
  const clipTo = `inset(0px 0px 0px 0px round ${isNarrow() ? 16 : 20}px)`

  useIso(() => {
    const el = ref.current!
    el.querySelector<HTMLElement>('.s3-stage__t')?.focus({ preventScroll: true })
    if (reduced) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'both' })
      return
    }
    el.animate([{ clipPath: clipFrom }, { clipPath: clipTo }], { duration: 560 * t, easing: EASE_OUT, fill: 'both' })
    // the card stays visible under the panel while the panel's ground fades in: the poster cross-fades into the demo
    el.querySelector('.s3-stage__bg')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420 * t, delay: 60 * t, easing: EASE_OUT, fill: 'both' })
    const parts = el.querySelectorAll<HTMLElement>('[data-rise]')
    parts.forEach((p, i) =>
      p.animate([{ opacity: 0.01, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 500 * t, delay: (140 + i * 50) * t, easing: EASE_OUT, fill: 'both' }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The demo goes live once its chunk is in and the panel has opened; the poster cross-fades out under it.
  useEffect(() => {
    let dead = false
    Promise.all([prefetchDemo[o.key]().catch(() => {}), wait(reduced ? 0 : 480 * t)]).then(() => !dead && setLive(true))
    // only a slow network ever sees the loading plate
    const s = setTimeout(() => !dead && setSlow(true), 1100)
    return () => {
      dead = true
      clearTimeout(s)
    }
  }, [o.key, reduced, t])

  useEffect(() => {
    if (!closing) return
    const el = ref.current!
    if (reduced) {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'both' }).finished.then(onClosed, onClosed)
      return
    }
    el.querySelector('.s3-stage__body')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 167 * t, fill: 'both' })
    el.querySelector('.s3-stage__head')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 167 * t, fill: 'both' })
    el.querySelector('.s3-stage__bg')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 333 * t, delay: 120 * t, easing: EASE_IO, fill: 'both' })
    el.animate([{ clipPath: clipTo }, { clipPath: clipFrom }], { duration: 460 * t, easing: EASE_IO, fill: 'both' }).finished.then(onClosed, onClosed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing])

  // keep Tab inside the dialog
  const trap = (e: RKE) => {
    if (e.key !== 'Tab') return
    const f = [...ref.current!.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent)
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      <div className="s3-scrim" data-closing={closing || undefined} onClick={onClose} onWheel={(e) => e.ctrlKey && e.preventDefault()} aria-hidden="true" />
      <div
        ref={ref}
        className="s3-stage"
        role="dialog"
        aria-modal="true"
        aria-labelledby="s3-stage-t"
        data-live={live || undefined}
        data-slow={slow || undefined}
        onKeyDown={trap}
        style={{ ['--accent' as string]: w.accent, left: o.panel.x, top: o.panel.y, width: o.panel.w, height: o.panel.h } as CSSProperties}
      >
        <div className="s3-stage__bg" aria-hidden="true" />
        <header className="s3-stage__head">
          <p className="s3-stage__kick" data-rise>
            <span className="s3-stage__n">{w.n}</span>
            <span>{w.meta}</span>
            <span className="s3-stage__tag">{w.tag}</span>
          </p>
          <h2 className="s3-stage__t" id="s3-stage-t" tabIndex={-1} data-rise>
            {w.title}
          </h2>
          <p className="s3-stage__hook" data-rise>
            {w.hook}
          </p>
          <div className="s3-stage__acts" data-rise>
            <Scramble className="s3-stage__metric" text={w.metric} trigger="none" run={1} />
            {w.slug && (
              <Link
                to={`${base}/research/${w.slug}`}
                className="s3-btn s3-btn--go"
                onClick={() => {
                  sessionStorage.setItem('s3-return', w.key)
                }}
              >
                Read the write-up <Arrow />
              </Link>
            )}
          </div>
          <button type="button" className="s3-close" onClick={onClose} aria-label="Close the demo (Esc)">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <kbd>Esc</kbd>
          </button>
        </header>
        <div className="s3-stage__body">
          <div className="s3-stage__poster" aria-hidden="true">
            <Poster k={w.key} />
            <span className="s3-stage__loading">Loading the live demo</span>
          </div>
          {live && (
            <div className="s3-stage__demo">
              <Demo kind={w.key} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ---------------- home ---------------- */

function Home({ base }: { base: string }) {
  const m = useMotionPrefs()
  const flags = useFlags()
  const lab = base.startsWith('/lab')
  const [view, setView] = useState<View>('list')
  const [open, setOpen] = useState<Open | null>(null)
  const [closing, setClosing] = useState(false)
  const [tour, setTour] = useState<number | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [bounds, setBounds] = useState<Rect | null>(null)
  const [wires, setWires] = useState<Wire[]>([])
  const [settled, setSettled] = useState(false)
  const [coarse, setCoarse] = useState(false)
  const [been, setBeen] = useState(false)

  const root = useRef<HTMLDivElement>(null)
  const vp = useRef<HTMLDivElement>(null)
  const world = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLCanvasElement>(null)
  const readout = useRef<HTMLSpanElement>(null)
  const miniSvg = useRef<SVGSVGElement>(null)
  const miniView = useRef<SVGRectElement>(null)
  const board = useRef<Board | null>(null)
  const flipFrom = useRef<{ rects: Map<string, DOMRect>; to: View } | null>(null)
  const saved = useRef<Cam | null>(null)
  const pending = useRef<WorkKey | null>(null)
  const busy = useRef(false)
  const kbd = useRef(false)
  const layoutRef = useRef<Layout | null>(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const openRef = useRef(open)
  openRef.current = open
  const tRef = useRef(1)
  tRef.current = m.reduced ? 0.5 : m.dur(1)

  /* screen areas: the stage (where framed things go) and the panel (where an open card lives) */
  const stageRect = useCallback((): Rect => {
    const vw = innerWidth
    const vh = innerHeight
    const narrow = vw < 760
    const top = narrow ? 64 : 80
    const bottom = narrow ? 96 + (lab ? 54 : 0) : 112 + (lab ? 48 : 0)
    const side = narrow ? 12 : 56
    return { x: side, y: top, w: vw - side * 2, h: Math.max(200, vh - top - bottom) }
  }, [lab])
  const panelRect = useCallback((): Rect => {
    const vw = innerWidth
    const vh = innerHeight
    if (vw < 760) {
      const top = 58
      const bottom = 88 + (lab ? 54 : 0)
      return { x: 8, y: top, w: vw - 16, h: vh - top - bottom }
    }
    const top = 72
    const bottom = 28 + (lab ? 56 : 0)
    const w = Math.min(vw - 96, 1200)
    const h = Math.min(vh - top - bottom, 880)
    return { x: Math.round((vw - w) / 2), y: Math.round(top + (vh - top - bottom - h) / 2), w, h }
  }, [lab])

  const measure = () => {
    const map = new Map<string, DOMRect>()
    world.current?.querySelectorAll<HTMLElement>('[data-item]').forEach((el) => map.set(el.dataset.id!, el.getBoundingClientRect()))
    return map
  }

  /* lay the board out: widths first, then measured heights, then positions (all as CSS vars on each item) */
  const relayout = useCallback(
    (b: Board) => {
      const wEl = world.current!
      const els = [...wEl.querySelectorAll<HTMLElement>('[data-item]')]
      const kind = layoutKind(innerWidth, innerHeight)
      wEl.dataset.layout = kind
      const L0 = computeLayout(kind, () => 400, flags.beri)
      for (const el of els) {
        const p = L0.at[el.dataset.id as ItemId]
        if (p) el.style.setProperty('--w', `${p.w}px`)
      }
      const hs = new Map(els.map((el) => [el.dataset.id!, el.offsetHeight]))
      // far zoom drops each card's title to its bottom edge (the hook and actions are hidden there)
      for (const el of els) {
        const t = el.querySelector<HTMLElement>('.s3-card__title')
        const box = el.querySelector<HTMLElement>('.s3-card__in')
        if (!t || !box) continue
        const pb = parseFloat(getComputedStyle(box).paddingBottom) || 0
        el.style.setProperty('--drop', `${Math.max(0, box.clientHeight - pb - (t.offsetTop + t.offsetHeight)).toFixed(1)}px`)
      }
      const L = computeLayout(kind, (id) => hs.get(id) ?? 0, flags.beri)
      layoutRef.current = L
      const items = new Map<string, Item>()
      const bx: Box[] = []
      for (const el of els) {
        const id = el.dataset.id as ItemId
        const p = L.at[id]
        if (!p) continue
        el.style.setProperty('--x', `${p.x}px`)
        el.style.setProperty('--y', `${p.y}px`)
        el.style.setProperty('--ks', String(p.k))
        const card = el.classList.contains('s3-card')
        const r = { x: p.x, y: p.y, w: p.w * p.k, h: (hs.get(id) ?? 0) * p.k }
        items.set(id, { el, r, w: p.w, k: p.k, kind: card ? 'card' : 'sheet', u: card ? 1 : L.unit })
        if (id !== 'h-work') bx.push({ id, r, accent: byKey(id)?.accent })
      }
      b.setItems(items, L.bounds)
      setBoxes(bx)
      setBounds(L.bounds)
      // strings between related work, anchored on facing edges
      const exp = items.get('exp')
      const ws: Wire[] = []
      for (const s of strings) {
        const A = items.get(s.a)?.r
        let B = typeof s.b === 'string' && s.b.startsWith('exp:') ? undefined : items.get(s.b)?.r
        if (s.b.startsWith('exp:') && exp) {
          const row = wEl.querySelector<HTMLElement>(`.s3-role[data-org="${s.b.slice(4)}"]`)
          if (row) {
            let top = 0
            let left = 0
            let n: HTMLElement | null = row
            while (n && n !== exp.el) {
              top += n.offsetTop
              left += n.offsetLeft
              n = n.offsetParent as HTMLElement | null
            }
            const k = L.at.exp?.k ?? 1
            B = { x: exp.r.x + left * k, y: exp.r.y + top * k, w: row.offsetWidth * k, h: row.offsetHeight * k }
          }
        }
        if (!A || !B) continue
        const ac = { x: A.x + A.w / 2, y: A.y + A.h / 2 }
        const bc = { x: B.x + B.w / 2, y: B.y + B.h / 2 }
        const horiz = Math.abs(bc.x - ac.x) > Math.abs(bc.y - ac.y) * 0.8
        const p0 = horiz ? { x: bc.x > ac.x ? A.x + A.w : A.x, y: ac.y } : { x: ac.x, y: bc.y > ac.y ? A.y + A.h : A.y }
        const p1 = horiz ? { x: bc.x > ac.x ? B.x : B.x + B.w, y: bc.y } : { x: bc.x, y: bc.y > ac.y ? B.y : B.y + B.h }
        const dx = (p1.x - p0.x) * 0.5
        const dy = (p1.y - p0.y) * 0.5
        const c0 = horiz ? { x: p0.x + dx, y: p0.y } : { x: p0.x, y: p0.y + dy }
        const c1 = horiz ? { x: p1.x - dx, y: p1.y } : { x: p1.x, y: p1.y - dy }
        // label sits on the curve (cubic Bézier at t), where the link says there's room
        const t = s.at ?? 0.5
        const u = 1 - t
        const bz = (a: number, b: number, c: number, d: number) => u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
        ws.push({
          d: `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C${c0.x.toFixed(1)} ${c0.y.toFixed(1)} ${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`,
          lx: bz(p0.x, c0.x, c1.x, p1.x),
          ly: bz(p0.y, c0.y, c1.y, p1.y),
          x0: p0.x,
          y0: p0.y,
          x1: p1.x,
          y1: p1.y,
          label: s.label,
          a: s.a,
          b: s.b.startsWith('exp:') ? 'exp' : s.b,
        })
      }
      setWires(ws)
      return L
    },
    [flags.beri],
  )

  /* FLIP: list ↔ board. Same nodes; the first rects were measured before the switch. */
  const runFlip = useCallback((first: Map<string, DOMRect>, to: View, cam?: Cam) => {
    const els = [...world.current!.querySelectorAll<HTMLElement>('[data-item]')]
    const T = tRef.current
    const k = Math.max(0.4, m.k || 0.4)
    const dur = 900 * T
    const order = els
      .map((el) => ({ el, f: first.get(el.dataset.id!) }))
      .filter((x): x is { el: HTMLElement; f: DOMRect } => !!x.f)
      .sort((a, b) => a.f.top + a.f.left * 0.3 - (b.f.top + b.f.left * 0.3))
    let longest = 0
    order.forEach(({ el, f }, i) => {
      if (el.dataset.flip === 'fade') {
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 * T, delay: (to === 'board' ? 700 : 200) * T, easing: EASE_OUT, fill: 'backwards' })
        return
      }
      let from: string
      let dest: string
      let lw: number
      let lh: number
      if (to === 'board' && cam) {
        const p = layoutRef.current!.at[el.dataset.id as ItemId]
        if (!p) return
        const kx = f.width / (cam.s * p.w)
        from = `translate(${((f.left - cam.x) / cam.s).toFixed(1)}px, ${((f.top - cam.y) / cam.s).toFixed(1)}px) scale(${kx.toFixed(4)})`
        dest = `translate(${p.x}px, ${p.y}px) scale(${p.k})`
        lw = p.w
        lh = el.offsetHeight
      } else {
        const L = el.getBoundingClientRect()
        if (!L.width) return
        from = `translate(${(f.left - L.left).toFixed(1)}px, ${(f.top - L.top).toFixed(1)}px) scale(${(f.width / L.width).toFixed(4)})`
        dest = 'translate(0px, 0px) scale(1)'
        lw = L.width
        lh = L.height
      }
      // shapes that change aspect (sheets) fade through the move so their reflow doesn't read as a jump
      const aspect = Math.abs(f.height / f.width - lh / lw) / (lh / lw)
      const delay = Math.min(i, 12) * 42 * k * T
      longest = Math.max(longest, delay + dur)
      el.animate(
        aspect > 0.12
          ? [
              { transform: from, opacity: 0.25 },
              { opacity: 0.6, offset: 0.4 },
              { transform: dest, opacity: 1 },
            ]
          : [{ transform: from }, { transform: dest }],
        { duration: dur, delay, easing: EASE_IO, fill: 'backwards' },
      )
    })
    return longest
  }, [m.k])

  /* ---------- mount: decide the view ---------- */
  useIso(() => {
    setCoarse(matchMedia('(pointer: coarse)').matches)
    const q = new URLSearchParams(location.search).get('view')
    const pref = q === 'list' || q === 'board' ? q : sessionStorage.getItem('s3-view')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const want: View = pref === 'list' || pref === 'board' ? pref : reduced ? 'list' : 'board'
    const ret = sessionStorage.getItem('s3-return')
    const intro = !introPlayed && !ret
    introPlayed = true
    if (want !== 'board') return
    // a reader already scrolling the list before the JS arrived keeps the list (the toggle is right there)
    if (intro && scrollY > 240) return
    if (intro && !reduced) flipFrom.current = { rects: measure(), to: 'board' }
    setView('board')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- enter / leave the board ---------- */
  useIso(() => {
    if (view !== 'board') return
    const b = new Board(vp.current!, world.current!, grid.current, readout.current, miniSvg.current && miniView.current ? { svg: miniSvg.current, view: miniView.current } : null, stageRect, {
      interact: () => {
        setTour(null)
        setTouched(true)
      },
      focus: setFocusId,
    })
    b.tune = { reduced: m.reduced, t: tRef.current, k: m.k }
    board.current = b
    setBeen(true)
    b.attach()
    relayout(b)
    const over = b.overviewCam()
    const first = flipFrom.current?.to === 'board' ? flipFrom.current.rects : null
    flipFrom.current = null
    const ret = sessionStorage.getItem('s3-return')
    sessionStorage.removeItem('s3-return')
    let cleanupTimer = 0
    if (ret && b.items.has(ret)) {
      // back from a write-up: arrive framed on the card it came from (the page's plate morphs into it), then pull out
      const it = b.items.get(ret)!
      b.set(fit(it.r, isNarrow() ? stageRect() : panelRect(), 0, MIN_S, 4))
      it.el.style.setProperty('view-transition-name', 's3-frame')
      it.el.querySelector<HTMLElement>('.s3-card__short')?.style.setProperty('view-transition-name', 's3-title')
      cleanupTimer = window.setTimeout(() => {
        it.el.style.removeProperty('view-transition-name')
        it.el.querySelector<HTMLElement>('.s3-card__short')?.style.removeProperty('view-transition-name')
        b.fly(over)
      }, 760 * tRef.current)
      setSettled(true)
    } else {
      b.set(over)
      if (first) {
        const ms = runFlip(first, 'board', over)
        cleanupTimer = window.setTimeout(() => setSettled(true), ms)
      } else setSettled(true)
    }
    const onResize = () => {
      const was = layoutRef.current?.kind
      b.resize()
      if (layoutKind(innerWidth, innerHeight) !== was) {
        relayout(b)
        b.set(b.overviewCam())
      } else b.set(b.cam)
    }
    addEventListener('resize', onResize)
    // Sheets change height (a role opens, fonts land): re-lay the board out and let items glide there.
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => relayout(b))
    })
    world.current!.querySelectorAll('.s3-sheet').forEach((el) => ro.observe(el))
    return () => {
      clearTimeout(cleanupTimer)
      cancelAnimationFrame(raf)
      ro.disconnect()
      removeEventListener('resize', onResize)
      b.destroy()
      board.current = null
      setSettled(false)
      world.current?.querySelectorAll<HTMLElement>('[data-item]').forEach((el) => {
        el.getAnimations().forEach((a) => a.cancel())
        for (const p of ['--x', '--y', '--ks', '--w', '--cs', '--drop', 'view-transition-name']) el.style.removeProperty(p)
        delete el.dataset.lv
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // motion level and reduced motion reach the controller live
  useEffect(() => {
    if (board.current) board.current.tune = { reduced: m.reduced, t: tRef.current, k: m.k }
  }, [m.reduced, m.k, m.level])

  // back to the list: animate from the board positions after the switch
  useIso(() => {
    if (view !== 'list' || flipFrom.current?.to !== 'list') return
    const first = flipFrom.current.rects
    flipFrom.current = null
    scrollTo(0, 0)
    runFlip(first, 'list')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  const switchView = useCallback(
    (v: View) => {
      if (v === viewRef.current) return
      sessionStorage.setItem('s3-view', v)
      setTour(null)
      if (openRef.current) {
        setOpen(null)
        setClosing(false)
      }
      if (!m.reduced) flipFrom.current = { rects: measure(), to: v }
      setView(v)
    },
    [m.reduced],
  )

  /* ---------- open / close a work ---------- */
  const openWork = useCallback(
    async (key: WorkKey) => {
      if (busy.current) return
      if (openRef.current) {
        if (openRef.current.key === key) return
        pending.current = key
        setClosing(true)
        return
      }
      busy.current = true
      setTour(null)
      setTouched(true)
      prefetchDemo[key]().catch(() => {})
      const pr = panelRect()
      const b = board.current
      let from: Rect
      let radius: number
      if (b && viewRef.current === 'board') {
        b.locked = true
        if (!saved.current) saved.current = b.cam
        const it = b.items.get(key)!
        // fit the card into the panel: on a phone it spans the width, on a desktop the height
        const cam = fit(it.r, pr, 0, MIN_S, 4)
        await b.fly(cam)
        from = b.screenRect(key)!
        radius = (it.r.w / (it.k || 1)) * 0.03 * it.k * b.cam.s
      } else {
        const el = world.current!.querySelector<HTMLElement>(`[data-id="${key}"] .s3-card__in`)!
        const r = el.getBoundingClientRect()
        from = { x: r.left, y: r.top, w: r.width, h: r.height }
        radius = r.width * 0.03
      }
      world.current?.querySelector<HTMLElement>(`[data-id="${key}"]`)?.setAttribute('data-opened', '')
      setOpen({ key, from, panel: pr, radius })
      busy.current = false
    },
    [panelRect],
  )

  const closeWork = useCallback(() => {
    if (openRef.current) setClosing(true)
  }, [])

  const onClosed = useCallback(async () => {
    const key = openRef.current?.key
    world.current?.querySelector(`[data-id="${key}"]`)?.removeAttribute('data-opened')
    setOpen(null)
    setClosing(false)
    const next = pending.current
    pending.current = null
    const b = board.current
    if (b) b.locked = false
    if (next) {
      openWork(next)
      return
    }
    const back = saved.current
    saved.current = null
    if (b && back) await b.fly(back)
    world.current?.querySelector<HTMLElement>(`[data-id="${key}"] .s3-card__open`)?.focus({ preventScroll: true })
  }, [openWork])

  /* ---------- tour ---------- */
  useEffect(() => {
    if (tour === null || view !== 'board') return
    const b = board.current
    if (!b) return
    b.fly(b.frameCam(works[tour].key, 'near'))
    const id = setTimeout(
      () => {
        if (tour + 1 < works.length) setTour(tour + 1)
        else {
          setTour(null)
          b.overview()
        }
      },
      (m.reduced ? 2600 : 3800) * tRef.current,
    )
    return () => clearTimeout(id)
  }, [tour, view, m.reduced])

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      kbd.current = true
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (t?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if (openRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault()
          closeWork()
        } else if (/^[1-6]$/.test(e.key) && !t.closest('.s3-stage__demo')) openWork(works[+e.key - 1].key)
        return
      }
      if (viewRef.current !== 'board') return
      const b = board.current
      if (!b) return
      const step = Math.min(innerWidth, innerHeight) * 0.22
      switch (e.key) {
        case '1': case '2': case '3': case '4': case '5': case '6':
          openWork(works[+e.key - 1].key)
          break
        case '0':
        case 'Escape':
          setTour(null)
          b.overview()
          break
        case 'ArrowLeft':
          b.panBy(step, 0)
          break
        case 'ArrowRight':
          b.panBy(-step, 0)
          break
        case 'ArrowUp':
          b.panBy(0, step)
          break
        case 'ArrowDown':
          b.panBy(0, -step)
          break
        case '+':
        case '=':
          b.zoomBy(1.4)
          break
        case '-':
        case '_':
          b.zoomBy(1 / 1.4)
          break
        case 't':
        case 'T':
          setTour((x) => (x === null ? 0 : null))
          break
        case 'Enter':
          if (tour !== null && t === document.body) openWork(works[tour].key)
          else return
          break
        default:
          return
      }
      e.preventDefault()
      setTouched(true)
    }
    const onPtr = () => {
      kbd.current = false
    }
    addEventListener('keydown', onKey)
    addEventListener('pointerdown', onPtr, true)
    return () => {
      removeEventListener('keydown', onKey)
      removeEventListener('pointerdown', onPtr, true)
    }
  }, [openWork, closeWork, tour])

  // Tabbing through the board flies the camera to what has focus (pointer focus doesn't).
  const onFocusIn = (e: React.FocusEvent) => {
    const b = board.current
    if (!b || viewRef.current !== 'board' || !kbd.current || openRef.current) return
    const item = (e.target as HTMLElement).closest<HTMLElement>('[data-item]')
    const id = item?.dataset.id
    if (!id) return
    const r = b.screenRect(id)
    const st = stageRect()
    const lv = item.dataset.lv
    const inside = r && r.x >= st.x - 4 && r.y >= st.y - 4 && r.x + r.w <= st.x + st.w + 4 && r.y + r.h <= st.y + st.h + 4
    if (!inside || lv === 'far') b.fly(b.frameCam(id, 'near'))
  }

  // the hint is a toast: it steps back after the first interaction, or on its own after a while
  useEffect(() => {
    if (view !== 'board' || touched) return
    const id = setTimeout(() => setTouched(true), 7000)
    return () => clearTimeout(id)
  }, [view, touched])

  // lengths for the poster draw-in (stroke-dashoffset needs each path's own length)
  useEffect(() => {
    world.current?.querySelectorAll<SVGPathElement>('.s-poster :is(.ac, .um, .acl, .fg, .d1)').forEach((p) => {
      try {
        p.style.setProperty('--len', String(Math.ceil(p.getTotalLength())))
      } catch {
        /* not rendered */
      }
    })
  }, [])

  const ctx = open
    ? `${byKey(open.key)!.n} · ${byKey(open.key)!.short} · live`
    : tour !== null
      ? `Tour ${works[tour].n}/06 · ${works[tour].short}`
      : focusId && byKey(focusId)
        ? `${byKey(focusId)!.n} · ${byKey(focusId)!.short}`
        : view === 'board'
          ? 'Overview · 06 works'
          : 'List · 06 works'
  const activeKey = open?.key ?? (tour !== null ? works[tour].key : focusId)

  return (
    <div
      ref={root}
      className="s3-home"
      data-view={view}
      data-settled={settled || undefined}
      data-open={open ? open.key : undefined}
      data-touched={touched || undefined}
      data-coarse={coarse || undefined}
      data-been={been || undefined}
    >
      <Top base={base} home onName={() => (view === 'board' ? board.current?.overview() : scrollTo({ top: 0, behavior: m.reduced ? 'auto' : 'smooth' }))}>
        <div className="s3-top__r">
          <span className="s3-ctx" aria-live="polite">
            <Scramble text={ctx} trigger="change" duration={460} />
          </span>
          <span className="s3-readout" ref={readout} aria-hidden="true" />
          <ViewToggle view={view} onView={switchView} />
        </div>
      </Top>

      <main id="main" tabIndex={-1}>
        <div
          ref={vp}
          className="s3-vp"
          role={view === 'board' ? 'region' : undefined}
          aria-label={view === 'board' ? 'Research board' : undefined}
          aria-describedby={view === 'board' ? 's3-help' : undefined}
          onFocus={onFocusIn}
        >
          <canvas ref={grid} className="s3-grid" aria-hidden="true" />
          <div ref={world} className="s3-world">
            <Sig />
            <section id="work" className="s3-works" aria-labelledby="s3-work-h">
              <h2 className="s3-item s3-label" data-item data-id="h-work" data-flip="fade" id="s3-work-h" style={{ ['--i' as string]: 0 }}>
                <span className="s3-label__in s3-cs">
                  <span className="s3-label__a">Six live demos</span>
                  <span className="s3-label__b">Board 01</span>
                </span>
              </h2>
              <div className="s3-cards">
                {works.map((w, i) => (
                  <Card key={w.key} w={w} i={i} base={base} onOpen={openWork} />
                ))}
              </div>
            </section>
            <Experience />
            <Show when="beri">
              <Beri base={base} />
            </Show>
            <Earlier view={view} />
            <Contact />
            {view === 'board' && (
              <svg className="s3-wires" aria-hidden="true" width={bounds?.w ?? 1} height={bounds?.h ?? 1}>
                {wires.map((w) => (
                  <g key={w.label} className="s3-wire" data-a={w.a} data-b={w.b} data-on={(tour !== null && works[tour].key === w.a) || undefined} style={{ ['--accent' as string]: byKey(w.a)?.accent } as CSSProperties}>
                    <path d={w.d} pathLength={1} />
                    <circle cx={w.x0} cy={w.y0} />
                    <circle cx={w.x1} cy={w.y1} />
                    <text x={w.lx} y={w.ly - 8} textAnchor="middle">
                      {w.label}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>
        </div>
        <p id="s3-help" className="sr-only">
          A zoomable board of the six works. Keys: 1 to 6 open a work, arrows pan, plus and minus zoom, 0 returns to the overview, T starts a tour. The List view shows the same content as a page.
        </p>
      </main>

      {/* HUD: bottom-left hint and keys, bottom-right zoom and minimap (desktop); thumb dock (phones) */}
      <div className="s3-hud s3-bl" aria-hidden={view !== 'board' || undefined}>
        <p className="s3-hint">
          <span className="s3-hint__fine">Drag to pan · pinch or wheel to zoom · click a card to run it</span>
          <span className="s3-hint__touch">Drag · pinch · tap a card to run it</span>
        </p>
        <div className="s3-keys">
          <button type="button" className="s3-key" aria-pressed={tour !== null} onClick={() => setTour((x) => (x === null ? 0 : null))} tabIndex={view === 'board' ? 0 : -1}>
            <kbd>T</kbd> {tour !== null ? 'Stop tour' : 'Tour'}
            {tour !== null && <span className="s3-key__bar" key={tour} />}
          </button>
          <span className="s3-key s3-key--static">
            <kbd>1</kbd>–<kbd>6</kbd> fly in
          </span>
          <button type="button" className="s3-key" onClick={() => (setTour(null), board.current?.overview())} tabIndex={view === 'board' ? 0 : -1}>
            <kbd>0</kbd> Overview
          </button>
        </div>
      </div>
      <div className="s3-hud s3-br" aria-hidden={view !== 'board' || undefined}>
        <div className="s3-zoom">
          <button type="button" aria-label="Zoom out" onClick={() => board.current?.zoomBy(1 / 1.4)} tabIndex={view === 'board' ? 0 : -1}>
            −
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => board.current?.zoomBy(1.4)} tabIndex={view === 'board' ? 0 : -1}>
            +
          </button>
        </div>
        <Minimap boxes={boxes} bounds={bounds} svg={miniSvg} view={miniView} openKey={open?.key} focusKey={activeKey} />
      </div>
      <nav className="s3-dock" aria-label="Fly to a work" aria-hidden={view !== 'board' || undefined}>
        <div className="s3-dock__row">
          {works.map((w) => (
            <button
              key={w.key}
              type="button"
              className="s3-chip"
              aria-current={activeKey === w.key || undefined}
              style={{ ['--accent' as string]: w.accent } as CSSProperties}
              onClick={() => openWork(w.key)}
              tabIndex={view === 'board' ? 0 : -1}
            >
              <span className="s3-chip__n">{w.n}</span>
              {w.short}
            </button>
          ))}
        </div>
        <button type="button" className="s3-chip s3-chip--list" onClick={() => switchView('list')} tabIndex={view === 'board' ? 0 : -1}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          List
        </button>
      </nav>
      <p className="s3-mhint" aria-hidden="true">
        Drag · pinch · tap a card to run it
      </p>
      <button type="button" className="s3-fab" onClick={() => switchView('board')} hidden={view === 'board'}>
        <span className="s3-fab__dots" aria-hidden="true" />
        Open the board
      </button>
      <div className="s3-pill" aria-hidden="true" />

      {open && <Stage o={open} closing={closing} onClose={closeWork} onClosed={onClosed} base={base} reduced={m.reduced} t={tRef.current} />}
      <CursorPill on={view === 'board' && !open} root={root} />
    </div>
  )
}

/** A mono pill that follows the pointer over a card on the board: "Run 01" (desktop only). */
function CursorPill({ on, root }: { on: boolean; root: React.RefObject<HTMLDivElement> }) {
  useEffect(() => {
    if (!on || !matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const pill = root.current!.querySelector<HTMLElement>('.s3-pill')!
    let x = 0
    let y = 0
    let px = 0
    let py = 0
    let raf = 0
    let card: HTMLElement | null = null
    const loop = () => {
      px += (x - px) * 0.28
      py += (y - py) * 0.28
      pill.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`
      raf = Math.abs(x - px) + Math.abs(y - py) > 0.3 ? requestAnimationFrame(loop) : 0
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      x = e.clientX + 14
      y = e.clientY + 14
      const t = e.target as HTMLElement
      const c = t.closest<HTMLElement>('.s3-card')
      const over = c && !t.closest('a') && !root.current!.querySelector('.s3-vp[data-drag]') ? c : null
      if (over !== card) {
        card = over
        if (card) {
          const w = byKey(card.dataset.id!)!
          pill.textContent = `${w.kind === 'hardware' ? 'Track' : 'Run'} ${w.n}`
          pill.style.setProperty('--accent', w.accent)
          px = x
          py = y
        }
        if (card) pill.dataset.on = ''
        else delete pill.dataset.on
      }
      if (!raf) raf = requestAnimationFrame(loop)
    }
    addEventListener('pointermove', move)
    return () => {
      removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
      delete pill.dataset.on
    }
  }, [on, root])
  return null
}

/* ---------------- inner pages ---------------- */

function Plate({ w }: { w: Work }) {
  return (
    <header className="s3-plate" style={{ ['--accent' as string]: w.accent } as CSSProperties}>
      <p className="s3-plate__meta">
        <span>{w.n}</span>
        <span>{w.short}</span>
        <span className="s3-plate__tag">{w.tag}</span>
        <span>{w.meta}</span>
      </p>
      <Poster k={w.key} label className="s3-plate__poster" />
    </header>
  )
}

export default function S3({ page, base }: VariantProps) {
  const { path } = useRouter()
  const w = page.kind === 'research' ? works.find((x) => x.slug === page.slug) : undefined
  const back = (key?: string) => () => key && sessionStorage.setItem('s3-return', key)
  const lab = base.startsWith('/lab') || undefined
  if (page.kind === 'home')
    return (
      <div className="s3" data-page="home" data-lab={lab}>
        <a href="#main" className="s3-skip">
          Skip to content
        </a>
        <Home base={base} />
      </div>
    )
  return (
    <div className="s3" data-page={page.kind} data-lab={lab}>
      <a href="#main" className="s3-skip">
        Skip to content
      </a>
      <Top base={base} home={false}>
        <Link to={`${base}/`} className="s3-back" onClick={back(w?.key ?? (page.kind === 'beri' ? 'beri' : undefined))}>
          Board <Arrow />
        </Link>
      </Top>
      <main id="main" key={path} tabIndex={-1} className="s3-page">
        {page.kind === 'research' && (
          <div className="s3-doc" style={w ? ({ ['--accent' as string]: w.accent } as CSSProperties) : undefined}>
            {w && <Plate w={w} />}
            <ResearchArticle slug={page.slug} base={base} />
            <p className="s3-doc__back">
              <Link to={`${base}/`} onClick={back(w?.key)}>
                <span aria-hidden="true">←</span> Back to the board
              </Link>
            </p>
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="s3-doc s3-doc--beri">
            <header className="s3-plate s3-plate--beri">
              <p className="s3-plate__meta">
                <span>Side project</span>
                <span>Beri</span>
                <span>{beriInfo.url.replace('https://', '')}</span>
              </p>
            </header>
            <BeriCaseStudy base={base} />
            <p className="s3-doc__back">
              <Link to={`${base}/`} onClick={back('beri')}>
                <span aria-hidden="true">←</span> Back to the board
              </Link>
            </p>
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="s3-nf" aria-labelledby="s3-nf-h">
            <p className="s3-nf__code">404 · X ———— Y ————</p>
            <h1 id="s3-nf-h" className="s3-nf__t">
              Off the board.
            </h1>
            <p className="s3-nf__line">Nothing is pinned at this address.</p>
            <Link to={`${base}/`} className="s3-btn s3-btn--go">
              Back to the board <Arrow />
            </Link>
          </section>
        )}
      </main>
    </div>
  )
}
