/*
 * S5 "Spec". The calmest variant: Koto's restraint, basement's spec sheets, and an instrument layer of real telemetry.
 * Desktop: a sticky two-tone caption column ("Selected work / {work}") that morphs as each exhibit crosses the centre,
 * beside a stack of six live demos where only the centred one is lit. The nav is a mono instrument bar with a live UTC
 * clock and MarmotSat's sub-satellite point, propagated with SGP4 in the browser. The signature is HUMAN / MACHINE:
 * every visible text node scrambles into glyph noise, the page collapses into one mono column, and a plain-text mirror
 * of the site prints itself in terminal amber. Write-ups open with the lit exhibit morphing into the header (a View
 * Transition shared element) and carry a sticky chapter rail.
 * Type: Instrument Sans (wdth + wght) and JetBrains Mono, latin-only, 57 + 40 KB. Colour: #060606, a strict grey ramp,
 * each work's accent only on the lit exhibit's hairline and badge, and amber for MACHINE.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as RMouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { works, roles, type Work, type Role } from '../../content/work'
import { person, links, earlier } from '../../content/site'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { OrgTile } from '../../shared/OrgLogo'
import { Poster } from '../../shared/Poster'
import { Scramble } from '../../shared/Scramble'
import { Split } from '../../shared/Split'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import { Show, useFlags } from '../../lib/labprefs'
import { useMotionPrefs } from '../../lib/motion'
import { useLenis, scrollToEl, lenis } from '../../lib/lenis'
import type { Page, VariantProps } from '../../routes'
import { spec, hook, SPEC_KEYS, TLE_URL, workFor, researchFor, pad2 } from './data'
import { useTel, utc, lat, lon, km } from './telemetry'
import { scramble, visibleText, type Run } from './noise'
import { Machine } from './Machine'
import './s5.css'

type Mode = 'human' | 'machine'
const N = pad2(works.length)
const ease = [0.16, 1, 0.3, 1] as const
const MODE_KEY = 's5-mode'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** The work a write-up belongs to, so coming back lights (and morphs into) the same exhibit. Client-only. */
let lastWork: string | null = null

const Arrow = ({ out = false, back = false }: { out?: boolean; back?: boolean }) => (
  <svg className="s5-arrow" data-back={back || undefined} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    {out ? <path d="M3.5 8.5l5-5M4.5 3.5h4v4" stroke="currentColor" strokeWidth="1.3" /> : <path d="M1.5 6h8.5M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.3" />}
  </svg>
)

/** Digits that roll when they change: each glyph is keyed by position + value, so only changed glyphs re-enter. */
function Roll({ v, className }: { v: string; className?: string }) {
  return (
    <span className={`s5-roll ${className ?? ''}`} aria-hidden="true">
      {Array.from(v, (c, i) => (
        <span key={`${i}${c}`} className="s5-roll__c">
          {c}
        </span>
      ))}
    </span>
  )
}

const navH = () => (matchMedia('(max-width: 1023px)').matches ? 116 : 52)

/** Bring exhibit i to the reading line: centred if it fits, else its top just under the chrome. */
function focusExhibit(i: number, reduced: boolean) {
  const el = document.getElementById(`ex-${works[i].key}`)
  if (!el) return
  const r = el.getBoundingClientRect()
  const h = navH()
  const room = innerHeight - h
  const y = r.height > room - 32 ? scrollY + r.top - h - 16 : scrollY + r.top - h - (room - r.height) / 2
  scrollToEl(Math.max(0, y), reduced)
}

/* ---------------- scroll bookkeeping ---------------- */

/** Index of the exhibit crossing the centre of the viewport (a 1% band at 50%). */
function useLit(init: number) {
  const [lit, setLit] = useState(init)
  useEffect(() => {
    const els = works.map((w) => document.getElementById(`ex-${w.key}`)!).filter(Boolean)
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setLit(els.indexOf(e.target as HTMLElement))
      },
      { rootMargin: '-49.5% 0px -49.5% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return [lit, setLit] as const
}

const SECTIONS = [
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

function useSection(on: boolean) {
  const [s, setS] = useState<SectionId>('work')
  useEffect(() => {
    if (!on) return
    const map: Record<string, SectionId> = { work: 'work', experience: 'experience', also: 'contact', contact: 'contact' }
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setS(map[e.target.id])
      },
      { rootMargin: '-40% 0px -59% 0px' },
    )
    Object.keys(map).forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [on])
  return s
}

/** Section entrances, once. Anything on screen at hydration stays put; the rest arrives as it scrolls in. */
function useReveal(on: boolean) {
  const { reduced } = useMotionPrefs()
  useEffect(() => {
    if (!on || reduced) return
    const els = [...document.querySelectorAll<HTMLElement>('.s5 [data-reveal]')].filter((el) => el.getBoundingClientRect().top > innerHeight * 0.92)
    els.forEach((el) => el.setAttribute('data-pre', ''))
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return
          const el = e.target as HTMLElement
          el.removeAttribute('data-pre')
          el.setAttribute('data-in', '')
          io.unobserve(el)
        }),
      { rootMargin: '0px 0px -10% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [on, reduced])
}

/* ---------------- instrument bar ---------------- */

function Telemetry({ base, home, onSat }: { base: string; home: boolean; onSat: () => void }) {
  const t = useTel()
  const s = t.st
  const clock = t.now ? utc(t.now) : '--:--:--'
  const la = s ? lat(s.lat) : '--.--°N'
  const lo = s ? lon(s.lon) : '---.--°W'
  const alt = s ? km(s.alt) : '--- KM'
  const said = s ? `MarmotSat is over ${la}, ${lo}, ${Math.round(s.alt)} km up.` : 'MarmotSat position loading.'
  const readout = (
    <>
      <span className="s5-tel__dot" data-on={s ? (t.now / 1000) % 2 < 1 : undefined} aria-hidden="true" />
      <span className="s5-tel__k">MarmotSat</span>
      <Roll v={la} className="s5-tel__v" />
      <Roll v={lo} className="s5-tel__v" />
      <span className="s5-tel__sep" aria-hidden="true">
        ·
      </span>
      <Roll v={alt} className="s5-tel__v" />
      <span className="sr-only">{said} Show the live tracker.</span>
    </>
  )
  return (
    <div className="s5-tel">
      <span className="s5-tel__clock">
        <Roll v={clock} />
        <span className="s5-tel__k s5-tel__utc">UTC</span>
        <span className="sr-only">{t.now ? `${clock} UTC` : ''}</span>
      </span>
      <span className="s5-tel__satwrap">
        {home ? (
          <button type="button" className="s5-tel__sat" onClick={onSat}>
            {readout}
          </button>
        ) : (
          <Link to={`${base}/#ex-orbit`} className="s5-tel__sat">
            {readout}
          </Link>
        )}
        <span className="s5-tel__more" aria-hidden="true">
          <span>SGP4 in this browser · NORAD 69912</span>
          <span>
            {s ? `${s.speed.toFixed(2)} km/s · ${s.sunlit ? 'sunlit' : 'in Earth’s shadow'}` : '—'}
          </span>
          <span>{s ? `From Victoria: el ${s.el >= 0 ? '+' : '−'}${Math.abs(s.el).toFixed(1)}°, az ${s.az.toFixed(0)}°` : '—'}</span>
          <span>
            TLE {t.src === 'celestrak' ? 'from CelesTrak, just now' : t.src === 'session' ? 'from CelesTrak, < 2 h ago' : t.src === 'build' ? 'build snapshot' : 'fetching…'}
          </span>
        </span>
      </span>
    </div>
  )
}

function Nav({ base, home, section, onSat, onTop }: { base: string; home: boolean; section: SectionId; onSat: () => void; onTop: () => void }) {
  const m = useMotionPrefs()
  return (
    <header className="s5-nav">
      <div className="s5-nav__in">
        <div className="s5-nav__l">
          {home ? (
            <a
              href="#main"
              className="s5-nav__name"
              onClick={(e) => {
                e.preventDefault()
                onTop()
              }}
            >
              {person.name}
            </a>
          ) : (
            <Link to={`${base}/`} className="s5-nav__name">
              <Arrow back /> {person.name}
            </Link>
          )}
          {home && (
            <nav className="s5-nav__idx" aria-label="Sections">
              <ol>
                {SECTIONS.map((x, i) => (
                  <li key={x.id}>
                    <a
                      href={`#${x.id}`}
                      aria-current={section === x.id ? 'true' : undefined}
                      onClick={(e) => {
                        e.preventDefault()
                        const el = document.getElementById(x.id)
                        if (!el) return
                        scrollToEl(x.id === 'work' ? 0 : scrollY + el.getBoundingClientRect().top - navH() + 1, m.reduced)
                        el.focus({ preventScroll: true })
                      }}
                    >
                      <span className="s5-nav__n">{pad2(i + 1)}</span>
                      {x.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
        <Telemetry base={base} home={home} onSat={onSat} />
        <Links className="s5-links" mode="both" size={16} />
      </div>
    </header>
  )
}

/* ---------------- HUMAN / MACHINE ---------------- */

function Pill({ mode, onToggle, lab }: { mode: Mode; onToggle: () => void; lab: boolean }) {
  const machine = mode === 'machine'
  return (
    <div className="s5-pillwrap" data-lab={lab || undefined} data-quiet>
      <button type="button" role="switch" aria-checked={machine} title="Machine-readable view (M)" className="s5-pill" data-machine={machine || undefined} onClick={onToggle}>
        <span className="s5-pill__thumb" aria-hidden="true" />
        <span className="s5-pill__o" data-on={!machine || undefined}>
          Human
        </span>
        <span className="s5-pill__o" data-on={machine || undefined}>
          Machine
        </span>
        <span className="sr-only">: machine-readable view</span>
      </button>
    </div>
  )
}

/* ---------------- work: caption column + exhibits ---------------- */

function Cta({ w, base, className = '' }: { w: Work; base: string; className?: string }) {
  if (w.slug)
    return (
      <Link to={`${base}/research/${w.slug}`} className={`s5-cta ${className}`} data-work={w.key}>
        Read the write-up <Arrow />
        <span className="sr-only">: {w.title}</span>
      </Link>
    )
  return (
    <a href={TLE_URL} target="_blank" rel="noopener" className={`s5-cta ${className}`}>
      Raw TLE on CelesTrak <Arrow out />
    </a>
  )
}

function Caption({ i, base, onPick }: { i: number; base: string; onPick: (i: number) => void }) {
  const w = works[i]
  const s = spec[w.key]
  return (
    <div className="s5-cap">
      <p className="s5-intro">ML systems and interpretability. CS at UVic,{'\u00a0'}’27.</p>
      <div className="s5-cap__mid" aria-hidden="true">
        <p className="s5-count">
          <Roll v={w.n} />
          <span className="s5-count__of"> / {N}</span>
          <i className="s5-count__dot" style={{ ['--accent' as string]: w.accent }} />
        </p>
        <h2 className="s5-two s5-two--cap">
          <span className="s5-two__a">Selected work</span>
          <span className="s5-two__b" data-p={i % 2}>
            <Scramble text={w.short} trigger="change" duration={560} />
          </span>
        </h2>
        <p key={i} className="s5-cap__hook">
          <Split text={hook[w.key]} />
          {w.flag && <Flag note={w.flag} />}
        </p>
      </div>
      <div className="s5-cap__bot">
        <dl className="s5-spec" aria-hidden="true">
          {SPEC_KEYS.map((k, j) => (
            <div key={k} className="s5-spec__row">
              <dt>{k}</dt>
              <dd>
                <Scramble text={s[k]} trigger="change" duration={420 + j * 90} />
              </dd>
              <i key={i} className="s5-spec__flash" style={{ ['--accent' as string]: w.accent, ['--j' as string]: j }} />
            </div>
          ))}
        </dl>
        <div className="s5-cap__acts">
          <Cta w={w} base={base} />
          <ol className="s5-pick" aria-label="Works">
            {works.map((x, j) => (
              <li key={x.key}>
                <button type="button" aria-current={j === i ? 'true' : undefined} onClick={() => onPick(j)} aria-label={`${x.n}: ${x.short}`}>
                  {x.n}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

/** Phone and tablet: the caption column becomes a sticky label bar that morphs as each exhibit becomes active. */
function LabelBar({ i }: { i: number }) {
  const w = works[i]
  return (
    <div className="s5-label" aria-hidden="true">
      <p className="s5-two s5-two--bar">
        <span className="s5-two__a">Selected work</span>{' '}
        <span className="s5-two__b" data-p={i % 2}>
          <Scramble text={w.short} trigger="change" duration={480} />
        </span>
      </p>
      <p className="s5-count">
        <Roll v={w.n} />
        <span className="s5-count__of"> / {N}</span>
        <i className="s5-count__dot" style={{ ['--accent' as string]: w.accent }} />
      </p>
    </div>
  )
}

function Exhibit({ w, i, lit, base, ret, onFocus }: { w: Work; i: number; lit: boolean; base: string; ret: boolean; onFocus: (i: number, scroll: boolean) => void }) {
  const armed = useArmed()
  const s = spec[w.key]
  const panel = useRef<HTMLDivElement>(null)
  // the return morph needs the shared name only for the one transition; drop it once that's over
  useEffect(() => {
    if (!ret) return
    const t = setTimeout(() => panel.current?.style.removeProperty('view-transition-name'), 1400)
    return () => clearTimeout(t)
  }, [ret])
  return (
    <div
      id={`ex-${w.key}`}
      className="s5-ex"
      role="group"
      aria-labelledby={`ex-${w.key}-t`}
      data-lit={lit || undefined}
      style={{ ['--accent' as string]: w.accent }}
      onFocus={() => !lit && onFocus(i, false)}
    >
      <div className="s5-ex__cap">
        <h3 id={`ex-${w.key}-t`} className="sr-only">
          {w.title}
        </h3>
        <p className="s5-ex__hook">{hook[w.key]}</p>
        <dl className="s5-ex__spec">
          <div>
            <dt>Where</dt>
            <dd>
              {s.where} · {s.when}
            </dd>
          </div>
          <div>
            <dt>Result</dt>
            <dd>{s.result}</dd>
          </div>
        </dl>
      </div>
      <div className="s5-ex__panel" ref={panel} style={ret ? ({ viewTransitionName: 's5-panel' } as React.CSSProperties) : undefined}>
        <span className="s5-ex__rule" aria-hidden="true" />
        <div className="s5-ex__poster" aria-hidden="true">
          <span className="s5-ex__ptag">
            {w.n} · {w.short} · {w.tag}
          </span>
          <Poster k={w.key} />
        </div>
        {i === 0 && !armed ? <div className="demo-slot" style={{ minHeight: 'var(--demo-h-steering, 560px)' }} /> : <Demo kind={w.key} hero={i === 0} />}
        <div className="s5-ex__veil" aria-hidden="true" onClick={() => onFocus(i, true)}>
          <span>
            {w.n} · {w.short}
          </span>
        </div>
      </div>
      <Cta w={w} base={base} className="s5-cta--ex" />
    </div>
  )
}

/** First real input (pointer, wheel, key, touch or scroll). The first exhibit's live demo waits for it: mounted on
 *  load, its big output paragraph became the LCP element after hydration (3.3 s mobile). The poster holds the slot. */
let inputSeen = false
function useArmed() {
  const [armed, setArmed] = useState(inputSeen)
  useEffect(() => {
    if (armed) return
    const ev = ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart', 'scroll'] as const
    const on = () => {
      inputSeen = true
      setArmed(true)
    }
    ev.forEach((e) => addEventListener(e, on, { once: true, passive: true }))
    return () => ev.forEach((e) => removeEventListener(e, on))
  }, [armed])
  return armed
}

function Work({ base }: { base: string }) {
  const m = useMotionPrefs()
  const retIdx = typeof window !== 'undefined' && lastWork ? works.findIndex((w) => w.key === lastWork) : -1
  const [ret] = useState(retIdx)
  const [lit, setLit] = useLit(ret >= 0 ? ret : 0)
  const pick = useCallback(
    (i: number, scroll = true) => {
      setLit(i)
      if (scroll) focusExhibit(i, m.reduced)
    },
    [m.reduced, setLit],
  )
  // coming back from a write-up by history (no hash): put the exhibit back under the reading line before the snapshot
  useIsoLayoutEffect(() => {
    if (ret < 0) return
    lastWork = null
    if (!location.hash) {
      const el = document.getElementById(`ex-${works[ret].key}`)
      if (el) window.scrollTo(0, Math.max(0, scrollY + el.getBoundingClientRect().top - navH() - 16))
    }
  }, [ret])
  return (
    <section id="work" className="s5-work" tabIndex={-1} aria-labelledby="work-h">
      <h2 id="work-h" className="sr-only">
        Selected work
      </h2>
      <Caption i={lit} base={base} onPick={pick} />
      <LabelBar i={lit} />
      <div className="s5-stack">
        {works.map((w, i) => (
          <Exhibit key={w.key} w={w} i={i} lit={i === lit} base={base} ret={i === ret} onFocus={pick} />
        ))}
      </div>
    </section>
  )
}

/* ---------------- experience, also, contact ---------------- */

function Two({ a, b, id }: { a: string; b: string; id: string }) {
  return (
    <h2 className="s5-two s5-two--sec" id={id} data-reveal>
      <Split text={a} className="s5-two__a" />
      <Split text={b} className="s5-two__b" offset={a.split(' ').length} />
    </h2>
  )
}

function RoleRow({ r, i }: { r: Role; i: number }) {
  const [open, setOpen] = useState(false)
  const m = useMotionPrefs()
  const id = `s5-role-${r.logo}`
  return (
    <li className="s5-role" data-open={open || undefined} data-reveal style={{ ['--i' as string]: i }}>
      <button type="button" className="s5-role__row" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>
        <OrgTile org={r.logo} size={36} className="s5-tile" />
        <span className="s5-role__main">
          <span className="s5-role__t">
            <span className="s5-role__org">{r.org}</span>
            <span className="s5-role__role">{r.role}</span>
          </span>
          <span className="s5-role__line">{r.line}</span>
        </span>
        <span className="s5-role__side">
          <span className="s5-role__when">{r.when}</span>
          <span className="s5-role__metric">{r.metric}</span>
        </span>
        <span className="s5-plus" aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="more"
            id={id}
            className="s5-role__more"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { height: { duration: m.dur(0.5), ease }, opacity: { duration: m.dur(0.333), delay: m.dur(0.083) } } }}
            exit={{ height: 0, opacity: 0, transition: { height: { duration: m.dur(0.333), ease: [0.65, 0, 0.35, 1] }, opacity: { duration: m.dur(0.167) } } }}
          >
            <div className="s5-role__in">
              <ul>
                {r.bullets.map((b, j) => (
                  <li key={b} style={{ ['--j' as string]: j }}>
                    {b}
                  </li>
                ))}
              </ul>
              <dl className="s5-role__kv">
                <div>
                  <dt>Where</dt>
                  <dd>{r.where}</dd>
                </div>
              </dl>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function Experience() {
  return (
    <section id="experience" className="s5-sec" tabIndex={-1} aria-labelledby="experience-h">
      <div className="s5-sec__cap">
        <Two id="experience-h" a="Experience" b="Six roles, 2025–26" />
      </div>
      <ul className="s5-roles">
        {roles.map((r, i) => (
          <RoleRow key={r.org} r={r} i={i} />
        ))}
      </ul>
    </section>
  )
}

function Also({ base }: { base: string }) {
  const flags = useFlags()
  return (
    <section id="also" className="s5-sec s5-sec--also" tabIndex={-1} aria-labelledby="also-h">
      <div className="s5-sec__cap">
        <Two id="also-h" a="Also" b={flags.beri ? 'Beri, and earlier work' : 'Earlier work'} />
      </div>
      <div className="s5-also">
        <Show when="beri">
          <Link to={`${base}/beri`} className="s5-line s5-line--beri" data-reveal>
            <span className="s5-line__k">Beri</span>
            <span className="s5-line__v">A food app I’m building for iOS.</span>
            <span className="s5-line__go">
              Case study <Arrow />
            </span>
            <Flag note="Beri is behind a content flag." />
          </Link>
        </Show>
        <details className="s5-earlier" data-reveal>
          <summary>
            <span className="s5-line__k">Earlier</span>
            <span className="s5-line__v">Hackathons, Kaggle, open source</span>
            <span className="s5-line__go">
              {pad2(earlier.length)} <span className="s5-plus" aria-hidden="true" />
            </span>
          </summary>
          <ul>
            {earlier.map((e) => {
              const inner = (
                <>
                  <span className="s5-earlier__when">{e.when}</span>
                  <span className="s5-earlier__t">
                    {e.title}
                    {e.unverified && <Flag note="Unverified item." />}
                  </span>
                  <span className="s5-earlier__r">{e.role}</span>
                  {e.href ? <Arrow out /> : <span />}
                </>
              )
              return (
                <li key={e.title}>
                  {e.href ? (
                    <a href={e.href} target="_blank" rel="noopener" className="s5-earlier__row">
                      {inner}
                    </a>
                  ) : (
                    <div className="s5-earlier__row">{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </details>
      </div>
    </section>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <button
      type="button"
      className="s5-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          clearTimeout(t.current)
          t.current = setTimeout(() => setCopied(false), 1800)
        } catch {
          location.href = links.email.href
        }
      }}
    >
      <Scramble text={copied ? 'Copied' : 'Copy'} trigger="change" duration={300} />
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
    </button>
  )
}

function Contact() {
  const rows = [
    { k: 'GitHub', v: 'tanujdargan', href: links.github.href },
    { k: 'LinkedIn', v: 'tanujdargan', href: links.linkedin.href },
    { k: 'X', v: 'DarganTanuj', href: links.x.href },
    { k: 'Resume', v: 'PDF, Aug 2026', href: links.resume.href },
  ]
  return (
    <section id="contact" className="s5-sec" tabIndex={-1} aria-labelledby="contact-h">
      <div className="s5-sec__cap">
        <Two id="contact-h" a="Contact" b="Email is fastest" />
      </div>
      <dl className="s5-contact" data-reveal>
        <div className="s5-contact__row s5-contact__row--mail">
          <dt>Email</dt>
          <dd>
            <a href={links.email.href}>{person.email}</a>
            <CopyEmail />
          </dd>
        </div>
        {rows.map((r) => (
          <div key={r.k} className="s5-contact__row">
            <dt>{r.k}</dt>
            <dd>
              <a href={r.href} target="_blank" rel="noopener">
                {r.v} <Arrow out />
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Footer() {
  const t = useTel()
  const age = t.tle ? (t.now - t.tle.fetchedAt) / 86400e3 : null
  return (
    <footer className="s5-foot">
      <span>© 2026 {person.name}</span>
      <span>Set in Instrument Sans and JetBrains Mono</span>
      <span>
        Telemetry: SGP4 in your browser on the {t.src === 'celestrak' || t.src === 'session' ? 'CelesTrak' : 'published'} TLE
        {age !== null ? `, ${age.toFixed(1)} days old` : ''}
      </span>
    </footer>
  )
}

function Home({ base }: { base: string }) {
  useReveal(true)
  return (
    <>
      <Work base={base} />
      <Experience />
      <Also base={base} />
      <Contact />
    </>
  )
}

/* ---------------- write-ups ---------------- */

const CHAPTERS = [
  { id: 'question', label: 'Question' },
  { id: 'method', label: 'Method' },
  { id: 'result', label: 'Result' },
  { id: 'next', label: 'Next' },
]

function Rail({ back }: { back: string }) {
  const m = useMotionPrefs()
  const [on, setOn] = useState('question')
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setOn(e.target.id)
      },
      { rootMargin: '-30% 0px -69% 0px' },
    )
    CHAPTERS.forEach((c) => {
      const el = document.getElementById(c.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])
  return (
    <nav className="s5-rail" aria-label="Chapters">
      <ol>
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <a
              href={`#${c.id}`}
              aria-current={on === c.id ? 'true' : undefined}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(c.id)
                if (!el) return
                scrollToEl(scrollY + el.getBoundingClientRect().top - navH() - 24, m.reduced)
              }}
            >
              <span className="s5-rail__n">{pad2(i + 1)}</span>
              {c.label}
            </a>
          </li>
        ))}
      </ol>
      <Link to={back} className="s5-rail__back">
        <Arrow back /> Selected work
      </Link>
    </nav>
  )
}

function Research({ slug, base }: { slug: string; base: string }) {
  const w = workFor(slug)!
  const r = researchFor(slug)!
  const s = spec[w.key]
  useEffect(() => {
    lastWork = w.key
  }, [w.key])
  const back = `${base}/#ex-${w.key}`
  return (
    <div className="s5-doc" style={{ ['--accent' as string]: w.accent }}>
      <header className="s5-wh">
        <span className="s5-ex__rule" aria-hidden="true" />
        <div className="s5-wh__text">
          <p className="s5-wh__kicker">
            <Link to={back}>Selected work</Link>
            <span aria-hidden="true"> / </span>
            {w.n} of {N} · {w.tag}
          </p>
          <h1 className="s5-two s5-two--doc">
            <span className="s5-two__a">{w.short}</span>
            <span className="s5-two__b">
              <Split text={r.title} />
            </span>
          </h1>
          <dl className="s5-spec s5-spec--doc">
            {SPEC_KEYS.map((k) => (
              <div key={k} className="s5-spec__row">
                <dt>{k}</dt>
                <dd>{k === 'where' ? r.where : s[k]}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="s5-wh__poster">
          <Poster k={w.key} label />
        </div>
      </header>
      <div className="s5-doc__body">
        <Rail back={back} />
        <ResearchArticle slug={slug} base={base} />
      </div>
    </div>
  )
}

/* ---------------- page ---------------- */

export default function S5({ page, base }: VariantProps) {
  const { path, navigate } = useRouter()
  const m = useMotionPrefs()
  const home = page.kind === 'home'
  const lab = base.startsWith('/lab')
  const [mode, setMode] = useState<Mode>('human')
  const [phase, setPhase] = useState<'out' | 'in' | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const human = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const humanY = useRef(0)
  const section = useSection(home && mode === 'human')
  useLenis(true)
  // MACHINE parks the human page off-screen rather than display:none: the demos keep their size (a 0×0 canvas throws
  // in ESDemo), their IntersectionObservers see it leave and pause, and `inert` takes it out of focus and the a11y tree.
  useEffect(() => {
    if (human.current) human.current.inert = mode === 'machine'
  }, [mode])

  // MACHINE persists for the session. Restoring it after hydration prints the mirror, without the scramble-out.
  const restoring = useRef(false)
  useEffect(() => {
    if (sessionStorage.getItem(MODE_KEY) !== 'machine') return
    restoring.current = !m.reduced
    setMode('machine')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useIsoLayoutEffect(() => {
    if (!restoring.current || mode !== 'machine') return
    restoring.current = false
    const main = document.getElementById('main-machine')
    if (!main) return
    setPhase('in')
    scramble(visibleText(main, 80), { mode: 'in', style: 'type', spread: 420 }).done.then(() => setPhase(null))
  }, [mode])

  const toggle = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    const to: Mode = mode === 'human' ? 'machine' : 'human'
    try {
      sessionStorage.setItem(MODE_KEY, to)
    } catch {
      /* private mode: the switch still works for this page */
    }
    const place = () => {
      if (to === 'machine') {
        humanY.current = scrollY
        lenis()?.scrollTo(0, { immediate: true, force: true })
        window.scrollTo(0, 0)
      } else {
        lenis()?.scrollTo(humanY.current, { immediate: true, force: true })
        window.scrollTo(0, humanY.current)
      }
    }
    if (m.reduced) {
      flushSync(() => setMode(to))
      place()
      busy.current = false
      return
    }
    const pill = root.current!.querySelector('.s5-pill')!.getBoundingClientRect()
    const origin = { x: pill.left + pill.width / 2, y: pill.top + pill.height / 2 }
    const nav = root.current!.querySelector('.s5-nav')!
    const from = to === 'machine' ? human.current! : document.getElementById('main-machine')!
    // 1. every visible string turns to glyph noise, in a wave from the switch; media drop to labelled outlines
    root.current!.querySelectorAll<HTMLElement>('.s5-ex__panel').forEach((p) => {
      const r = p.getBoundingClientRect()
      p.dataset.dim = `${Math.round(r.width)}×${Math.round(r.height)}`
    })
    flushSync(() => setPhase('out'))
    const out = scramble([...visibleText(nav), ...visibleText(from, 0)], { mode: 'out', origin, spread: 300, dur: 300 })
    await out.done
    // 2. swap under a view transition: the old page collapses into the new one's column
    let inRun: Run | null = null
    const commit = () => {
      flushSync(() => {
        setMode(to)
        setPhase('in')
      })
      out.restore()
      place()
      const target = to === 'machine' ? document.getElementById('main-machine')! : human.current!
      // 3. the new page prints itself: a teletype sweep into MACHINE, a decode wave back to HUMAN
      inRun = scramble([...visibleText(nav), ...visibleText(target, 60)], to === 'machine' ? { mode: 'in', style: 'type', spread: 520 } : { mode: 'in', origin, spread: 360, dur: 420 })
    }
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }
    if (doc.startViewTransition) {
      root.current!.dataset.vt = to
      try {
        await doc.startViewTransition(commit).finished
      } catch {
        /* skipped transition: the DOM update still ran */
      }
      delete root.current!.dataset.vt
    } else commit()
    await (inRun as Run | null)?.done
    setPhase(null)
    busy.current = false
  }, [mode, m.reduced])

  // M toggles the view, unless someone is typing or using a control that takes keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'm' && e.key !== 'M') return
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const el = e.target as HTMLElement
      if (el.closest('input,textarea,select,[contenteditable]')) return
      toggle()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [toggle])

  // Opening a write-up from home: the lit exhibit's panel becomes the shared element the header grows out of.
  const onClickCapture = (e: RMouseEvent) => {
    if (!home || mode !== 'human') return
    const a = (e.target as HTMLElement).closest('a')
    const href = a?.getAttribute('href') || ''
    const hit = href.match(/\/research\/([a-z0-9-]+)$/)
    if (!hit) return
    const w = workFor(hit[1])
    const p = w && document.querySelector<HTMLElement>(`#ex-${w.key} .s5-ex__panel`)
    if (!p) return
    const r = p.getBoundingClientRect()
    if (r.bottom > 0 && r.top < innerHeight) p.style.viewTransitionName = 's5-panel'
  }

  const onSat = () => focusExhibit(works.findIndex((w) => w.key === 'orbit'), m.reduced)
  const onTop = () => scrollToEl(0, m.reduced)
  void navigate

  return (
    <div className="s5" ref={root} data-mode={mode} data-phase={phase || undefined} data-page={page.kind} data-lab={lab || undefined}>
      <a href={mode === 'machine' ? '#main-machine' : '#main'} className="s5-skip">
        Skip to content
      </a>
      <Nav base={base} home={home} section={section} onSat={onSat} onTop={onTop} />
      <div className="s5-human" ref={human} data-parked={mode === 'machine' || undefined} aria-hidden={mode === 'machine' || undefined}>
        <main id="main" key={path} tabIndex={-1} onClickCapture={onClickCapture}>
          {home && <Home base={base} />}
          {page.kind === 'research' && <Research slug={page.slug} base={base} />}
          {page.kind === 'beri' && (
            <div className="s5-doc s5-doc--beri">
              <p className="s5-wh__kicker s5-doc__back">
                <Link to={`${base}/#also`}>
                  <Arrow back /> Back to the work
                </Link>
              </p>
              <BeriCaseStudy base={base} />
            </div>
          )}
          {page.kind === 'notfound' && <NotFound base={base} />}
        </main>
        <Footer />
      </div>
      {mode === 'machine' && <Machine page={page as Page} base={base} id="main-machine" />}
      <Pill mode={mode} onToggle={toggle} lab={lab} />
    </div>
  )
}

function NotFound({ base }: { base: string }) {
  return (
    <section className="s5-nf" aria-labelledby="nf-h">
      <p className="s5-wh__kicker">Error 404</p>
      <h1 className="s5-two s5-two--doc" id="nf-h">
        <span className="s5-two__a">Nothing at this address.</span>
        <span className="s5-two__b">No exhibit, no write-up.</span>
      </h1>
      <p>
        <Link to={`${base}/`} className="s5-cta">
          Back to the work <Arrow />
        </Link>
      </p>
    </section>
  )
}
