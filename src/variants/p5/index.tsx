/*
 * P5 "Specimens". Below a quiet title screen, the research and MarmotSat sit in a grid of specimen cards. Each card
 * carries a small poster drawn from the same source as its demo (real steering read-backs, real Qwen2.5 tokens, the
 * real MarmotSat TLE through SGP4; the demo's own generator for the illustrative ones). Posters are SVG generated at
 * dev time (posters/gen.ts → posters/data.ts) and rendered in the static HTML: zero JS work, crisp at any density.
 * Opening a card slides a drawer in beneath its row with the live demo; one open at a time. Experience is a tiled list.
 *
 * Motion: every expansion is one View Transition (cards and everything below them glide, the drawer rises in);
 * durations read var(--t), distances var(--k); prefers-reduced-motion keeps only a crossfade. Hero enters once with
 * CSS keyframes from opacity .01 (LCP rule).
 * Type: IBM Plex Sans Variable (display + text) and IBM Plex Mono 400 (labels, numbers), latin-only, ~60 KB.
 * Colour: graphite, three greys, one warm signal accent that only marks data and state.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { person, experience, links, research } from '../../content/site'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { OrgTile } from '../../shared/OrgLogo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import { Show } from '../../lib/labprefs'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { specs, prefetch, type Spec, type SpecKey } from './specimens'
import { VB } from './posters/data'
import './p5.css'

/* ---------------- helpers ---------------- */

/** Scroll to a section without touching the URL (a hash change would re-route the app). */
function jump(id: string, reduced: boolean) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }
/**
 * Run a layout change as a View Transition. Names exist only while `data-vt` is on the root, so the app's own
 * route transitions are untouched. `anchor` stays put on screen: if content above it collapses, we scroll to match.
 */
function morph(update: () => void, anchor?: HTMLElement | null) {
  const root = document.querySelector<HTMLElement>('.p5')
  const run = () => {
    const before = anchor?.getBoundingClientRect().top
    flushSync(update)
    if (anchor && before !== undefined) {
      const d = anchor.getBoundingClientRect().top - before
      if (Math.abs(d) > 1) window.scrollBy(0, d)
    }
  }
  const doc = document as VTDoc
  if (!doc.startViewTransition || !root) return run()
  root.dataset.vt = ''
  const t = doc.startViewTransition(run)
  t.finished.finally(() => delete root.dataset.vt)
}

const vt = (name: string) => ({ ['--vt' as string]: `p5-${name}` })

/* ---------------- chrome ---------------- */

function Bar({ base, home, shown }: { base: string; home: boolean; shown: boolean }) {
  const m = useMotionPrefs()
  return (
    <header className="p5-bar p5-vt" style={vt('bar')} data-on={shown || !home || undefined}>
      <div className="p5-bar__in">
        {home ? (
          <a
            href="#main"
            className="p5-bar__name"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: m.reduced ? 'auto' : 'smooth' })
            }}
          >
            {person.name}
          </a>
        ) : (
          <Link to={`${base}/`} className="p5-bar__name">
            {person.name}
          </Link>
        )}
        {home && (
          <nav className="p5-bar__nav" aria-label="Sections">
            {[
              ['research', 'Research'],
              ['work', 'Experience'],
              ['contact', 'Contact'],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault()
                  jump(id, m.reduced)
                }}
              >
                {label}
              </a>
            ))}
          </nav>
        )}
        <Links className="p5-bar__links" mode="icon" size={17} />
      </div>
    </header>
  )
}

function Hero({ actionsRef }: { actionsRef: React.RefObject<HTMLDivElement> }) {
  return (
    <section className="p5-hero" id="top" aria-labelledby="p5-name">
      <div className="p5-hero__in">
        <h1 id="p5-name" className="p5-name p5-in" style={{ ['--i' as string]: 0 }}>
          {person.name}
        </h1>
        <p className="p5-line p5-in" style={{ ['--i' as string]: 1 }}>
          I build ML systems and study what language models do inside. <span className="p5-line__2">CS at UVic, class of {person.grad}.</span>
        </p>
        <div ref={actionsRef} className="p5-in" style={{ ['--i' as string]: 2 }}>
          <Links className="p5-acts" mode="both" size={17} />
        </div>
      </div>
    </section>
  )
}

/* ---------------- specimens ---------------- */

function Poster({ s }: { s: Spec }) {
  return (
    <span className="p5-poster" data-k={s.key} aria-hidden="true">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} focusable="false" dangerouslySetInnerHTML={{ __html: s.poster }} />
      <span className="p5-poster__tag">{s.tag}</span>
    </span>
  )
}

function Card({ s, open, onToggle }: { s: Spec; open: boolean; onToggle: (el: HTMLElement) => void }) {
  const warm = () => void prefetch[s.key]().catch(() => {})
  return (
    <li className="p5-spec p5-vt" style={vt(`s-${s.key}`)} data-open={open || undefined}>
      <button
        type="button"
        className="p5-spec__btn"
        aria-expanded={open}
        aria-controls={`p5-drawer-${s.key}`}
        onClick={(e) => onToggle(e.currentTarget)}
        onPointerEnter={warm}
        onFocus={warm}
      >
        <Poster s={s} />
        <span className="p5-spec__text">
          <span className="p5-spec__title">{s.title}</span>
          <span className="p5-spec__hook">{s.hook}</span>
          <span className="p5-spec__meta">
            <span>{s.meta}</span>
            <span className="p5-spec__cue" aria-hidden="true">
              <span>{open ? 'Close' : 'Run it'}</span>
              <i className="p5-plus" />
            </span>
          </span>
        </span>
      </button>
      {s.flag && <Flag note={s.flag} />}
    </li>
  )
}

function Drawer({ s, base, onClose }: { s: Spec; base: string; onClose: () => void }) {
  const r = s.slug ? research.find((x) => x.slug === s.slug) : undefined
  return (
    <li className="p5-drawer p5-vt" style={vt(`drawer-${s.key}`)}>
      <div className="p5-drawer__demo" id={`p5-drawer-${s.key}`} role="region" aria-label={`${s.title}: live demo`}>
        <Demo kind={s.key} />
      </div>
      <div className="p5-drawer__side">
        {r ? (
          <Link to={`${base}/research/${r.slug}`} className="p5-drawer__go">
            Read the write-up <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <p className="p5-drawer__note">Position from CelesTrak’s latest TLE, propagated with SGP4 in your browser.</p>
        )}
        <button type="button" className="p5-drawer__close" onClick={onClose}>
          Close
        </button>
      </div>
    </li>
  )
}

function Specimens({ base }: { base: string }) {
  const [open, setOpen] = useState<SpecKey | null>(null)
  const btns = useRef<Partial<Record<SpecKey, HTMLElement>>>({})

  const toggle = useCallback((k: SpecKey, el: HTMLElement) => {
    btns.current[k] = el
    morph(() => setOpen((o) => (o === k ? null : k)), el)
  }, [])
  const close = useCallback(() => {
    const k = open
    if (!k) return
    const el = btns.current[k]
    morph(() => setOpen(null), el)
    el?.focus({ preventScroll: true })
  }, [open])

  // Esc closes; after opening, bring the drawer's top into view if it landed below the fold.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    addEventListener('keydown', onKey)
    const d = document.getElementById(`p5-drawer-${open}`)
    const t = window.setTimeout(() => {
      if (!d) return
      const r = d.getBoundingClientRect()
      if (r.top > innerHeight * 0.72) {
        const card = btns.current[open]?.getBoundingClientRect()
        const y = card ? card.top - 76 : r.top - innerHeight * 0.3
        window.scrollBy({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      }
    }, 420)
    return () => {
      removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [open, close])

  return (
    <section id="research" className="p5-sec p5-vt" tabIndex={-1} aria-labelledby="p5-research-h" style={vt('sec-research')}>
      <header className="p5-head">
        <h2 id="p5-research-h" className="p5-h2">
          Research and projects
        </h2>
        <p className="p5-sub">Each drawing is made from its demo’s own data. Open one to run it.</p>
      </header>
      <ul className="p5-grid">
        {specs.flatMap((s) => {
          const card = <Card key={s.key} s={s} open={open === s.key} onToggle={(el) => toggle(s.key, el)} />
          return open === s.key ? [card, <Drawer key={`d-${s.key}`} s={s} base={base} onClose={close} />] : [card]
        })}
      </ul>
    </section>
  )
}

/* ---------------- other projects ---------------- */

function Also({ base }: { base: string }) {
  const rows: { t: string; d: string; href?: string; to?: string }[] = [
    { t: 'Homelab', d: 'Proxmox and Nix: GPU model serving, CI runners, 15+ services.', href: 'https://github.com/tanujdargan/nixos' },
    { t: 'Optimate', d: 'Hack the North 2025: two prizes out of 300+ teams.', href: 'https://github.com/jruttan1/Optimate' },
    { t: 'AIMO Progress Prize 2', d: 'Kaggle silver, top 10% of 2,200 teams.' },
    { t: 'Drop', d: 'AirDrop without the Apple, in Rust and WebRTC.', href: 'https://github.com/tanujdargan/drop' },
  ]
  const row = (r: (typeof rows)[number]) => {
    const inner = (
      <>
        <span className="p5-also__t">{r.t}</span>
        <span className="p5-also__d">{r.d}</span>
        {(r.href || r.to) && (
          <span className="p5-also__go" aria-hidden="true">
            {r.to ? '→' : '↗'}
          </span>
        )}
      </>
    )
    return (
      <li key={r.t}>
        {r.to ? (
          <Link to={r.to} className="p5-also__a">
            {inner}
          </Link>
        ) : r.href ? (
          <a href={r.href} target="_blank" rel="noopener" className="p5-also__a">
            {inner}
          </a>
        ) : (
          <div className="p5-also__a">{inner}</div>
        )}
      </li>
    )
  }
  return (
    <section id="projects" className="p5-sec p5-sec--tight p5-vt" aria-labelledby="p5-also-h" style={vt('sec-also')}>
      <h2 id="p5-also-h" className="p5-label">
        Also built
      </h2>
      <ul className="p5-also">
        <Show when="beri">{row({ t: 'Beri', d: 'A food app I’m building for iOS.', to: `${base}/beri` })}</Show>
        {rows.map(row)}
      </ul>
    </section>
  )
}

/* ---------------- experience ---------------- */

// One line per role, ≤ 12 words, from site.ts facts.
const short: Record<string, { role: string; line: string }> = {
  amazon: { role: 'SDE intern', line: 'An LLM planning assistant in production across 180+ fulfillment sites. Return offer.' },
  rbc: { role: 'AI/ML research mentee', line: 'Models flagging at-risk youth from 1,500+ longitudinal records.' },
  cfar: { role: 'Firmware lead, MarmotSat', line: 'Onboard-computer firmware and the TTC board, now in orbit.' },
  uvic: { role: 'Undergraduate researcher', line: 'Billion-vector GPU search on a modified cuVS fork.' },
  pearcare: { role: 'Lead AI developer', line: 'Medical-AI agents across 1,000+ clinical specialties.' },
  mlh: { role: 'Software engineering fellow', line: 'IDE debugging for Airflow: setup-to-debug from hours to minutes.' },
}

function Job({ e, open, onToggle }: { e: (typeof experience)[number]; open: boolean; onToggle: (el: HTMLElement) => void }) {
  const id = useId()
  const s = short[e.logo]
  return (
    <li className="p5-job p5-vt" style={vt(`j-${e.logo}`)} data-open={open || undefined}>
      <button type="button" className="p5-job__btn" aria-expanded={open} aria-controls={id} onClick={(ev) => onToggle(ev.currentTarget)}>
        <OrgTile org={e.logo} size={40} className="p5-job__tile" />
        <span className="p5-job__who">
          <span className="p5-job__org">{e.org}</span>
          <span className="p5-job__role">{s.role}</span>
        </span>
        <span className="p5-job__line">{s.line}</span>
        <span className="p5-job__when">{e.when}</span>
        <i className="p5-plus" aria-hidden="true" />
      </button>
      <div id={id} className="p5-job__more" hidden={!open}>
        <p className="p5-job__metric">{e.metric}</p>
        <ul>
          {e.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    </li>
  )
}

function Work() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <section id="work" className="p5-sec p5-vt" tabIndex={-1} aria-labelledby="p5-work-h" style={vt('sec-work')}>
      <header className="p5-head">
        <h2 id="p5-work-h" className="p5-h2">
          Experience
        </h2>
      </header>
      <ul className="p5-jobs">
        {experience.map((e) => (
          <Job key={e.org} e={e} open={open === e.org} onToggle={(el) => morph(() => setOpen((o) => (o === e.org ? null : e.org)), el)} />
        ))}
      </ul>
    </section>
  )
}

/* ---------------- contact ---------------- */

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="p5-email"
      data-copied={copied || undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        } catch {
          location.href = links.email.href
        }
      }}
    >
      <span className="p5-email__addr">{person.email}</span>
      <span className="p5-email__hint" aria-live="polite">
        <span data-s="copy">Copy</span>
        <span data-s="done">Copied</span>
      </span>
    </button>
  )
}

function Contact() {
  return (
    <section id="contact" className="p5-sec p5-contact p5-vt" tabIndex={-1} aria-labelledby="p5-contact-h" style={vt('sec-contact')}>
      <h2 id="p5-contact-h" className="p5-h2">
        Contact
      </h2>
      <p className="p5-sub">Email is the fastest way to reach me.</p>
      <CopyEmail />
      <Links className="p5-acts p5-acts--quiet" mode="both" size={16} />
    </section>
  )
}

function Footer() {
  return (
    <footer className="p5-foot p5-vt" style={vt('foot')}>
      <span>© 2026 {person.name}</span>
      <span>Set in IBM Plex. Every drawing comes from its demo’s data.</span>
    </footer>
  )
}

/* ---------------- page ---------------- */

export default function P5({ page, base }: VariantProps) {
  const { path } = useRouter()
  const home = page.kind === 'home'
  const actions = useRef<HTMLDivElement>(null)
  const [past, setPast] = useState(false)

  // The bar shows once the hero's own actions have scrolled away.
  useEffect(() => {
    const el = actions.current
    if (!home || !el) return
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [home, path])

  return (
    <div className="p5">
      <a href="#main" className="p5-skip">
        Skip to content
      </a>
      <Bar base={base} home={home} shown={past} />
      <main id="main" key={path} tabIndex={-1}>
        {home && (
          <>
            <Hero actionsRef={actions} />
            <Specimens base={base} />
            <Also base={base} />
            <Work />
            <Contact />
          </>
        )}
        {page.kind === 'research' && <ResearchArticle slug={page.slug} base={base} />}
        {page.kind === 'beri' && <BeriCaseStudy base={base} />}
        {page.kind === 'notfound' && (
          <section className="p5-hero p5-hero--nf">
            <div className="p5-hero__in">
              <h1 className="p5-name">Not here.</h1>
              <p className="p5-line">That page doesn’t exist.</p>
              <Link to={`${base}/`} className="p5-back">
                ← Back to the work
              </Link>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
