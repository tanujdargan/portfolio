/*
 * P3 "Research-forward". The demos are the hero. After a first screen that holds only the name, one line and the
 * actions, the page is a run of research plates, one per screen: a numeral, the title, one line, the live demo large
 * and centred, and "Read the write-up". Then MarmotSat as "Also: hardware in orbit", a quiet experience list with
 * org tiles (tap for detail), and contact.
 *
 * Type: Newsreader at its text optical size (a static 400 instance, 22 KB, public/p3/) for names and titles, upright;
 * Geist Variable (latin, 29 KB) for everything else; the system monospace for demo readouts (no download).
 * Colour: a near-black ground with a faint cool cast, warm ivory ink in three steps, one lamp-amber accent.
 * Motion: CSS entrances once (hero at first paint, plates as they arrive), a sticky bar that settles in after the
 * hero, expanding rows. Distances scale by --k and durations by --t; reduced motion is opacity only.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { person, research, experience, earlier, beri, links, type DemoKey } from '../../content/site'
import { useCommunity } from '../../content/useContent'
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
import './p3.css'

type Kind = Exclude<DemoKey, null>

/** "Qwen2.5-" / "1.5B" and "90–" / "95%" read badly split across lines: a word joiner keeps them whole. */
const keep = (t: string) => t.replace(/Qwen2\.5-1\.5B/g, 'Qwen2.5-\u20601.5B').replace(/(\d)–(\d)/g, '$1–\u2060$2')
/** Dates never wrap: no-break spaces, plus a word joiner after the en dash (UAX #14 allows a break after it). */
const nbsp = (t: string) => t.replace(/ /g, '\u00a0').replace(/–/g, '–\u2060')

/** Scroll to an element without touching the URL (a hash change would re-route the app). */
function jump(id: string, reduced: boolean) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

const Arrow = ({ out }: { out?: boolean }) => (
  <svg className="p3-arrow" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    {out ? <path d="M4 10 10 4M5 4h5v5" /> : <path d="M2 7h10M8 3l4 4-4 4" />}
  </svg>
)

/**
 * Entrance once, as an element arrives. Only elements still below the viewport at hydration are held back, so
 * nothing already on screen ever blinks out. Under reduced motion --k is 0 and the entrance is a plain fade.
 */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || el.getBoundingClientRect().top < innerHeight) return
    el.dataset.rv = 'wait'
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        el.dataset.rv = 'in'
        io.disconnect()
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

/* ---------------- chrome ---------------- */

function Bar({ base, home, show }: { base: string; home: boolean; show: boolean }) {
  const m = useMotionPrefs()
  const item = (id: string, label: string) =>
    home ? (
      <a
        href={`#${id}`}
        onClick={(e) => {
          e.preventDefault()
          jump(id, m.reduced)
        }}
      >
        {label}
      </a>
    ) : (
      <Link to={`${base}/#${id}`}>{label}</Link>
    )
  return (
    <header className="p3-bar" data-show={show || undefined}>
      <div className="p3-bar__in">
        <Link to={`${base}/`} className="p3-bar__name" tabIndex={show ? undefined : -1}>
          {person.name}
        </Link>
        <nav aria-label="Sections" className="p3-bar__nav">
          {item('research', 'Research')}
          {item('work', 'Work')}
          {item('contact', 'Contact')}
        </nav>
        <Links className="p3-bar__links" mode="icon" size={17} />
      </div>
    </header>
  )
}

function Hero({ onActions }: { onActions: (el: HTMLElement | null) => void }) {
  return (
    <section className="p3-hero" id="top" aria-labelledby="p3-name">
      <div className="p3-hero__in">
        <h1 id="p3-name" className="p3-name p3-in" style={{ ['--i' as string]: 0 }}>
          {person.name}
        </h1>
        <p className="p3-line p3-in" style={{ ['--i' as string]: 1 }}>
          I study what language models do on the inside, and ship the ML systems around them.
        </p>
        <div ref={onActions} className="p3-in" style={{ ['--i' as string]: 2 }}>
          <Links className="p3-actions" mode="both" size={16} />
        </div>
      </div>
    </section>
  )
}

/* ---------------- plates ---------------- */

/** Frame titles, so a folded demo still says what it is. */
const DEMO_NAME: Record<Kind, string> = {
  steering: 'Drag to steer a real model',
  lossmask: 'Where the loss lands',
  es: 'Evolution strategies: 45 guesses, keep 8',
  retrieval: 'IVF search: how much of the index do you read?',
  ocean: 'Satellite to seabed: lower the probe',
  orbit: 'MarmotSat, live',
}
const DEMO_KIND: Record<Kind, string> = {
  steering: 'Real model outputs',
  lossmask: 'Exact definition',
  es: 'Illustrative simulation',
  retrieval: 'Illustrative simulation',
  ocean: 'Illustrative simulation',
  orbit: 'Real position, computed in your browser',
}

/**
 * A demo slot. Inline demos mount as they near the viewport (Demo does that). "Fold" demos mount on tap on phones to
 * keep the page short; on wide screens they open by themselves. The folded button reserves the demo's own height on
 * wide screens, so opening it there shifts nothing.
 */
function Slot({ kind, fold, hero }: { kind: Kind; fold?: boolean; hero?: boolean }) {
  const [open, setOpen] = useState(!fold)
  const wrap = useRef<HTMLDivElement>(null)
  const tapped = useRef(false)
  useEffect(() => {
    if (fold && matchMedia('(min-width: 900px)').matches) setOpen(true)
  }, [fold])
  useEffect(() => {
    if (open && tapped.current) wrap.current?.focus({ preventScroll: true })
  }, [open])
  return (
    <div ref={wrap} className="p3-slot" data-kind={kind} tabIndex={-1}>
      {open ? (
        <Demo kind={kind} hero={hero} />
      ) : (
        <button
          type="button"
          className="p3-run"
          aria-label={`Run the demo: ${DEMO_NAME[kind]}`}
          onClick={() => {
            tapped.current = true
            setOpen(true)
          }}
        >
          <span className="p3-run__play" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M3 1.8v8.4L10 6z" />
            </svg>
          </span>
          <span className="p3-run__t">
            <span className="p3-run__name">{DEMO_NAME[kind]}</span>
            <span className="p3-run__meta">{DEMO_KIND[kind]}</span>
          </span>
        </button>
      )}
    </div>
  )
}

function Plate({
  num,
  meta,
  title,
  hook,
  kind,
  fold,
  hero,
  to,
  flag,
  id,
}: {
  num?: boolean
  meta: string[]
  title: ReactNode
  hook: string
  kind: Kind
  fold?: boolean
  hero?: boolean
  to?: string
  flag?: string
  id: string
}) {
  const ref = useReveal<HTMLDivElement>()
  const hid = `p3-${id}-h`
  return (
    <div className="p3-plate" role="group" aria-labelledby={hid}>
      <div ref={ref} className="p3-plate__head p3-rv">
        <p className="p3-meta" style={{ ['--i' as string]: 0 }}>
          {num && <span className="p3-num" aria-hidden="true" />}
          {meta.map((x) => (
            <span key={x} className="p3-meta__x">
              {x}
            </span>
          ))}
        </p>
        <h3 id={hid} className="p3-title" style={{ ['--i' as string]: 1 }}>
          {title}
          {flag && <Flag note={flag} />}
        </h3>
        <p className="p3-hook" style={{ ['--i' as string]: 2 }}>
          {keep(hook)}
        </p>
      </div>
      <Slot kind={kind} fold={fold} hero={hero} />
      {to && (
        <p className="p3-more">
          <Link to={to} className="p3-link">
            Read the write-up <Arrow />
          </Link>
        </p>
      )}
    </div>
  )
}

/**
 * Plate copy, written for this page from site.ts facts: where/when, a title and one line. With "Read the write-up",
 * each plate stays at or under 25 words.
 */
const PLATE: Record<string, { meta: string[]; title?: string; hook: string }> = {
  'activation-steering': {
    meta: ['Independent', '2026'],
    hook: 'Push Qwen2.5-1.5B toward joy, distress or certainty. Every output here is real.',
  },
  'loss-masking-distress': {
    meta: ['Apart Research', '2026'],
    title: 'Does loss masking shape how a model talks about shutdown?',
    hook: 'Assistant-only loss maximises expressed distress; loss on user turns neutralises it.',
  },
  'es-lora': {
    meta: ['Independent', 'May 2026'],
    hook: 'Perturb the LoRA weights, score each guess on GSM8K maths, keep the best, step.',
  },
  'billion-vector-retrieval': {
    meta: ['DEIA Lab, UVic', '2025–26'],
    hook: 'A modified cuVS fork: 1–4M QPS at 90–95% recall, under 250 ms.',
  },
  'ocean-sensing': {
    meta: ['SOLIDS Lab, UVic', '2025'],
    hook: 'Satellites standing in for deep-water sensors: R² = 0.936, validated with NRC Canada.',
  },
}
/** Phones: the first two demos inline, the rest on tap. */
const FOLD = new Set(['es-lora', 'billion-vector-retrieval', 'ocean-sensing'])

function Research({ base }: { base: string }) {
  return (
    <section id="research" className="p3-sec p3-research" tabIndex={-1} aria-labelledby="p3-research-h">
      <header className="p3-sechead">
        <h2 id="p3-research-h" className="p3-label">
          Research
        </h2>
        <p className="p3-sechead__p">Five questions. Every demo runs in your browser.</p>
      </header>
      {research.map((r, i) => (
        <Plate
          key={r.slug}
          id={r.slug}
          num
          meta={PLATE[r.slug]?.meta ?? [r.where, r.when]}
          title={keep(PLATE[r.slug]?.title ?? r.title)}
          hook={PLATE[r.slug]?.hook ?? r.short}
          kind={r.demo as Kind}
          fold={FOLD.has(r.slug)}
          hero={i === 0}
          to={`${base}/research/${r.slug}`}
          flag={r.unverified?.join(' ')}
        />
      ))}
    </section>
  )
}

function Also({ base }: { base: string }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <section id="projects" className="p3-sec p3-also" tabIndex={-1} aria-labelledby="p3-also-h">
      <header className="p3-sechead">
        <h2 id="p3-also-h" className="p3-label">
          Also: hardware in orbit
        </h2>
      </header>
      <Plate
        id="marmotsat"
        meta={['UVic CfAR', 'launched Jul 2026']}
        title="MarmotSat"
        hook="A CubeSat whose onboard-computer firmware I led, launched on a SpaceX Falcon 9. This is where it is now."
        kind="orbit"
        fold
      />
      <Show when="beri">
        <div ref={ref} className="p3-beri p3-rv">
          <p className="p3-label" style={{ ['--i' as string]: 0 }}>
            Also: an iOS app
          </p>
          <Link to={`${base}/beri`} className="p3-beri__a" style={{ ['--i' as string]: 1 }}>
            <span className="p3-beri__t">Beri</span>
            <span className="p3-beri__d">{beri.oneLiner}</span>
            <span className="p3-link">
              Case study <Arrow />
            </span>
          </Link>
        </div>
      </Show>
    </section>
  )
}

/* ---------------- work ---------------- */

/** One line per role, ≤ 14 words, so a closed row stays under 25. */
const EXP_LINE: Record<string, string> = {
  amazon: 'An LLM planning assistant, in production across 180+ fulfillment sites. Return offer.',
  rbc: 'An ML pipeline flagging at-risk youth from 1,500+ longitudinal records.',
  cfar: 'Led onboard-computer firmware for MarmotSat, now in orbit.',
  uvic: 'GPU vector search on a cuVS fork: 1–4M QPS at billion scale.',
  pearcare: 'Medical-AI agents across 1,000+ clinical specialties.',
  mlh: 'Docker-based IDE debugging for Apache Airflow: hours to minutes.',
}
const SHORT_ROLE: Record<string, string> = {
  rbc: 'AI/ML research mentee',
  cfar: 'Software developer & researcher',
  uvic: 'Undergraduate researcher',
  mlh: 'Software engineering fellow',
}

function Work() {
  const ref = useReveal<HTMLDivElement>()
  const community = useCommunity()
  const orgs = experience.map((e) => e.org.toLowerCase())
  const rest = earlier.filter((e) => !orgs.some((o) => o.includes(e.title.toLowerCase())))
  return (
    <section id="work" className="p3-sec p3-work" tabIndex={-1} aria-labelledby="p3-work-h">
      <header className="p3-sechead">
        <h2 id="p3-work-h" className="p3-label">
          Work
        </h2>
        <p className="p3-sechead__p">
          CS at UVic, finishing in three years ({person.grad}). Tap a role for detail.
        </p>
      </header>
      <div ref={ref} className="p3-rv">
        <ul className="p3-exp">
          {experience.map((e, i) => (
            <li key={e.org} className="p3-row" style={{ ['--i' as string]: i }}>
              <details>
                <summary>
                  <OrgTile org={e.logo} size={40} className="p3-row__tile" />
                  <span className="p3-row__org">{e.org}</span>
                  <span className="p3-row__role">
                    {SHORT_ROLE[e.logo] ?? e.role} · {nbsp(e.when)}
                  </span>
                  <span className="p3-row__line">{EXP_LINE[e.logo] ?? e.line}</span>
                  <span className="p3-row__plus" aria-hidden="true" />
                </summary>
                <div className="p3-row__more">
                  <p className="p3-row__metric">
                    <span>{e.metric}</span>
                    <span>{e.where}</span>
                  </p>
                  <ul>
                    {e.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <details className="p3-earlier" style={{ ['--i' as string]: 4 }}>
          <summary>
            <span>Earlier projects and community</span>
            <span className="p3-row__plus" aria-hidden="true" />
          </summary>
          <ul>
            {rest.map((e) => (
              <li key={e.title}>
                {e.href ? (
                  <a href={e.href} target="_blank" rel="noopener">
                    {e.title} <Arrow out />
                  </a>
                ) : (
                  <span className="p3-earlier__t">{e.title}</span>
                )}
                {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in a local repo; confirm it's okay to list." />}
                <span className="p3-earlier__d">
                  {e.role}. {e.detail}
                </span>
              </li>
            ))}
            {community.map((c) => (
              <li key={c.title}>
                {c.href ? (
                  <a href={c.href} target="_blank" rel="noopener">
                    {c.title} <Arrow out />
                  </a>
                ) : (
                  <span className="p3-earlier__t">{c.title}</span>
                )}
                <span className="p3-earlier__d">
                  {c.role}, {c.when}. {c.detail}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  )
}

/* ---------------- contact ---------------- */

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="p3-copy"
      data-copied={copied || undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          location.href = links.email.href
        }
      }}
    >
      <span className="p3-copy__a">Copy</span>
      <span className="p3-copy__b" aria-hidden={!copied}>
        Copied
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
    </button>
  )
}

function Contact() {
  const ref = useReveal<HTMLDivElement>()
  return (
    <section id="contact" className="p3-sec p3-contact" tabIndex={-1} aria-labelledby="p3-contact-h">
      <div ref={ref} className="p3-rv">
        <h2 id="p3-contact-h" className="p3-label" style={{ ['--i' as string]: 0 }}>
          Contact
        </h2>
        <p className="p3-contact__p" style={{ ['--i' as string]: 1 }}>
          Labs, research programs and teams shipping models: email is fastest.
        </p>
        <div className="p3-mail" style={{ ['--i' as string]: 2 }}>
          <a href={links.email.href} className="p3-mail__a">
            {person.email}
          </a>
          <CopyEmail />
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="p3-foot">
      <span>© 2026 {person.name}</span>
      <span>Set in Newsreader and Geist. The demos run in your browser.</span>
    </footer>
  )
}

export default function P3({ page, base }: VariantProps) {
  const { path } = useRouter()
  const home = page.kind === 'home'
  const [past, setPast] = useState(!home)
  const [actions, setActions] = useState<HTMLElement | null>(null)

  // The bar appears once the hero's action row has scrolled away, so the five links are always one tap from anywhere.
  useEffect(() => {
    if (!home) return setPast(true)
    if (!actions) return
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(actions)
    return () => io.disconnect()
  }, [home, actions])

  return (
    <div className="p3" data-page={page.kind}>
      <a href="#main" className="p3-skip">
        Skip to content
      </a>
      <Bar base={base} home={home} show={past} />
      <main id="main" key={path}>
        {home && (
          <>
            <Hero onActions={setActions} />
            <Research base={base} />
            <Also base={base} />
            <Work />
            <Contact />
          </>
        )}
        {page.kind === 'research' && (
          <div className="p3-page">
            <ResearchArticle slug={page.slug} base={base} />
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="p3-page">
            <BeriCaseStudy base={base} />
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="p3-hero p3-hero--nf">
            <div className="p3-hero__in">
              <p className="p3-label">404</p>
              <h1 className="p3-name">Nothing here.</h1>
              <p className="p3-line">
                <Link to={`${base}/`} className="p3-link">
                  Back to the research <Arrow />
                </Link>
              </p>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
