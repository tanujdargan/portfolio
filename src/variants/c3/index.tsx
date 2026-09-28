/*
 * c3 "City of points". Tanuj's own photograph of Toronto at night, rendered as a point field: every lit window is a
 * particle sampled from the photo. Scroll and the city's lights unthread and re-form into the embedding space of his
 * research (v6's clusters; the steering cluster is the real Qwen2.5-1.5B activations), which then hands off to the
 * real instruments. Scroll back and the skyline re-forms.
 *
 * Synthesis: v9's feeling (a calm, lit, generative ground; one living backdrop) + v6's real-data scene (raw WebGL2,
 * one draw call, real activations) + v4b's story of the work with numbers that arrive before the prose (odometers).
 * Patterns (PORTFOLIO_TASTE.md §4): P04 embedding field · P08 scroll-driven figure · P12 pause offscreen ·
 * P17 odometer · P19 one metric per row · P27 copy-email morph · P01 steering instrument · P29 labels pinned to data.
 * Type: Instrument Sans (display + reading) and Martian Mono (data only), latin-only variable faces, 53 KB,
 * with metric-matched local fallbacks. Cool near-black; one warm accent, the sodium light of the city.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useScroll } from 'framer-motion'
import { person, research, experience, engineering, earlier, beri, links, workLinkOrder } from '../../content/site'
import { useProof, useCommunity } from '../../content/useContent'
import { Show } from '../../lib/labprefs'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { OrgLogo, type OrgKey } from '../../shared/OrgLogo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { ScrollTimelapse } from '../../shared/ScrollTimelapse'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import unsplash from '../../data/unsplash.json'
import youtube from '../../data/youtube.json'
import timelapse from '../../data/timelapse.json'
import { bus, CLUSTERS } from './bus'
import './c3.css'

const POSTER = timelapse.toronto.posters
const R = (slug: string) => research.find((r) => r.slug === slug)!
const X = (org: string) => experience.find((e) => e.org.startsWith(org))!

/* ------------------------------------------------------------------ the field */

function Field() {
  const layer = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const tags = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'poster' | 'live' | 'fallback'>('poster')
  const [tall, setTall] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = matchMedia('(max-aspect-ratio: 1/1)')
    setTall(mq.matches)
    const on = () => setTall(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    if (tall === null) return
    let dead = false
    let handle: { dispose: () => void } | null = null
    if (new URLSearchParams(location.search).get('gl') === '0') {
      setState('fallback')
      return
    }
    const go = async () => {
      try {
        const poster = img.current!
        if (!poster.complete || !poster.naturalWidth) await new Promise((r) => poster.addEventListener('load', r, { once: true }))
        const { createField } = await import('./field')
        if (dead) return
        const nav = navigator as Navigator & { deviceMemory?: number }
        handle = createField({
          canvas: cv.current!,
          poster,
          layer: layer.current!,
          tags: Array.from(tags.current!.children) as HTMLElement[],
          root: layer.current!.closest('.c3') as HTMLElement,
          tall,
          low: (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 3,
          onReady: () => !dead && setState('live'),
          onFail: () => !dead && setState('fallback'),
        })
        if (!handle) setState('fallback')
      } catch {
        if (!dead) setState('fallback')
      }
    }
    // after first paint, when the main thread is idle
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: object) => number; cancelIdleCallback?: (n: number) => void }
    const id = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 1200 }) : window.setTimeout(go, 300)
    return () => {
      dead = true
      if (w.cancelIdleCallback) w.cancelIdleCallback(id)
      else clearTimeout(id)
      handle?.dispose()
      if (layer.current) layer.current.style.cssText = ''
    }
  }, [tall])

  return (
    <div ref={layer} className="c3-field" data-state={state} aria-hidden="true">
      <picture>
        <source media="(max-aspect-ratio: 1/1)" srcSet={POSTER.tall[2]} width={360} height={480} />
        <img ref={img} className="c3-field__poster" src={POSTER.wide[2]} alt="" width={640} height={360} decoding="async" {...{ fetchpriority: 'high' }} />
      </picture>
      <canvas ref={cv} className="c3-field__cv" />
      <div ref={tags} className="c3-tags">
        {CLUSTERS.map((c, i) => (
          <span key={c.id} data-i={i}>
            {c.tag}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ small pieces */

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
/** P17 odometer (after v4b's flip counters): digits roll into place when the number scrolls into view. */
function Odo({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const m = useMotionPrefs()
  useEffect(() => {
    const el = ref.current!
    delete el.dataset.armed
    if (m.reduced) return
    const r = el.getBoundingClientRect()
    if (r.top < innerHeight) return // already on screen at load: leave it still
    el.dataset.armed = ''
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        delete el.dataset.armed
        io.disconnect()
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [m.reduced])
  let d = 0
  return (
    <span ref={ref} className={`c3-odo ${className ?? ''}`} aria-label={text} role="img">
      {Array.from(text).map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="c3-odo__col" aria-hidden="true" style={{ ['--n' as string]: ch, ['--d' as string]: d++ }}>
            <span className="c3-odo__strip">
              {DIGITS.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
            <span className="c3-odo__ghost">{ch}</span>
          </span>
        ) : (
          <span key={i} aria-hidden="true">
            {ch}
          </span>
        ),
      )}
    </span>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="c3-copy"
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
      <span className="c3-copy__a">{person.email}</span>
      <span className="c3-copy__b">Copied</span>
      <span className="c3-sr" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
    </button>
  )
}

const ResearchMark = () => (
  <svg className="c3-mark" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <circle cx="5" cy="13" r="2.4" fill="var(--accent)" />
    <circle cx="11" cy="6" r="2.4" fill="currentColor" opacity="0.8" />
    <circle cx="15.5" cy="14" r="2.4" fill="#7cc0ff" />
  </svg>
)
const proofLogo: Record<string, ReactNode> = {
  amazon: <OrgLogo org="amazon" height={16} />,
  marmotsat: <OrgLogo org="uvic" height={15} />,
  research: <ResearchMark />,
}
// The same facts as proof[].detail, cut to fit a 393 px first screen.
const proofShort: Record<string, string> = {
  amazon: 'LLM planning assistant in production at 180+ sites. Return offer.',
  marmotsat: 'Led the onboard-computer firmware. Launched on a Falcon 9.',
  research: 'Activation steering, and loss masking vs shutdown distress.',
}

/* ------------------------------------------------------------------ chrome */

const SECTIONS = [
  { id: 'amazon', label: 'Amazon' },
  { id: 'research', label: 'Research' },
  { id: 'marmotsat', label: 'MarmotSat' },
  { id: 'index', label: 'Index' },
  { id: 'photos', label: 'Photos' },
  { id: 'contact', label: 'Contact' },
]

function Top({ base, home }: { base: string; home: boolean }) {
  const [past, setPast] = useState(!home)
  useEffect(() => {
    if (!home) return setPast(true)
    const h = document.getElementById('c3-name')
    if (!h) return
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting), { rootMargin: '-56px 0px 0px 0px' })
    io.observe(h)
    return () => io.disconnect()
  }, [home])
  return (
    <header className="c3-top" data-past={past || undefined}>
      <Link to={`${base}/`} className="c3-top__name" tabIndex={past ? undefined : -1}>
        {person.name}
      </Link>
      <nav className="c3-top__sec" aria-label="Sections">
        {SECTIONS.map((s) => (
          <Link key={s.id} to={`${base}/#${s.id}`}>
            {s.label}
          </Link>
        ))}
      </nav>
      <Links className="c3-top__links" mode="icon" size={17} only={workLinkOrder} />
    </header>
  )
}

/* ------------------------------------------------------------------ home */

function Hero() {
  const proof = useProof()
  return (
    <section className="c3-hero" aria-labelledby="c3-name">
      <div className="c3-hero__in">
        <p className="c3-kicker c3-in" style={{ ['--i' as string]: 0 }}>
          CS at UVic, class of {person.grad} · Toronto
        </p>
        <h1 id="c3-name" className="c3-name c3-in" style={{ ['--i' as string]: 1 }}>
          Tanuj Dargan
        </h1>
        <p className="c3-claim c3-in" style={{ ['--i' as string]: 2 }}>
          I build ML systems that run in production, and I study what happens inside the models.
        </p>
        <ul className="c3-proof">
          {proof.map((p, i) => (
            <li key={p.key} className="c3-in" style={{ ['--i' as string]: 3 + i }}>
              <span className="c3-proof__mark">{proofLogo[p.key]}</span>
              <span className="c3-proof__l">{p.label}</span>
              <span className="c3-proof__d">
                <span className="c3-wide">{p.detail}</span>
                <span className="c3-narrow">{proofShort[p.key] ?? p.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <Links className="c3-links c3-in" mode="both" size={15} only={workLinkOrder} />
      </div>
      <p className="c3-hero__cap c3-mono">Toronto at night, from my timelapse</p>
    </section>
  )
}

function Amazon() {
  const a = X('Amazon')
  return (
    <section id="amazon" className="c3-chapter c3-amazon" aria-labelledby="amazon-h">
      <div className="c3-chapter__in">
        <p className="c3-eyebrow">
          <OrgLogo org="amazon" height={20} />
          <span className="c3-mono">SDE intern · Toronto · {a.when}</span>
        </p>
        <h2 id="amazon-h" className="c3-h1">
          An LLM planning assistant, shipped to production.
        </h2>
        <dl className="c3-stats">
          <div>
            <dt>projected savings a year</dt>
            <dd>
              <Odo text="$136.2M" />
            </dd>
          </div>
          <div>
            <dt>sites, in North America and Europe</dt>
            <dd>
              <Odo text="180+" />
            </dd>
          </div>
          <div>
            <dt>faster planner time-to-insight</dt>
            <dd>
              <Odo text="60%+" />
            </dd>
          </div>
        </dl>
        <p className="c3-body">
          Built into Optimus, Amazon’s labor-optimization platform. Planners ask about a plan in plain language; it flags anomalies, recommends labor moves
          and re-optimizes what-ifs without a full solver re-run. <b>It ended with a return offer.</b>
        </p>
        <p className="c3-aside c3-desk">That summer was in this city: the skyline at the top of the page is my timelapse of it.</p>
      </div>
    </section>
  )
}

function Instrument({
  id,
  n,
  slug,
  base,
  why,
  result,
  children,
  end,
  phoneTap,
}: {
  id: string
  n: string
  slug: string
  base: string
  why: ReactNode
  result: ReactNode
  children: ReactNode
  end?: boolean
  /** on phones, the instrument waits behind one tap (keeps the home page short) */
  phoneTap?: boolean
}) {
  const r = R(slug)
  const [open, setOpen] = useState(false)
  return (
    <article id={id} className="c3-inst" aria-labelledby={`${id}-h`} data-field={end ? 'end' : undefined}>
      <header className="c3-inst__head">
        <p className="c3-mono c3-dim">
          {n} · {r.where} · {r.when}
          {r.unverified?.[0] && <Flag note={r.unverified[0]} />}
        </p>
        <h3 id={`${id}-h`} className="c3-h2">
          {r.title}
        </h3>
        <p className="c3-why">{why}</p>
      </header>
      <div className="c3-inst__demo" data-tap={phoneTap || undefined} data-open={open || undefined}>
        {phoneTap && (
          <button type="button" className="c3-btn c3-inst__tap" aria-expanded={open} aria-controls={`${id}-slot`} onClick={() => setOpen(!open)}>
            {open ? 'Close the instrument' : 'Open the instrument'}
          </button>
        )}
        <div id={`${id}-slot`} className="c3-inst__slot">
          {children}
        </div>
      </div>
      <p className="c3-result">
        {result}{' '}
        <Link className="c3-more" to={`${base}/research/${slug}`}>
          Read the write-up <span aria-hidden="true">→</span>
        </Link>
      </p>
    </article>
  )
}

function Expander({ id, n, slug, base, line, result, kind, open, setOpen }: {
  id: string
  n: string
  slug: string
  base: string
  line: string
  result: string
  kind: 'es' | 'retrieval'
  open: boolean
  setOpen: (v: boolean) => void
}) {
  const r = R(slug)
  return (
    <li id={id} className="c3-exp" data-open={open || undefined}>
      <button type="button" className="c3-exp__row" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(!open)}>
        <span className="c3-mono c3-dim c3-exp__n">{n}</span>
        <span className="c3-exp__t">
          <b>{r.title}</b>
          <span>
            {line}
            {r.unverified?.[0] && <Flag note={r.unverified[0]} />}
          </span>
        </span>
        <span className="c3-exp__go">
          <span className="c3-desk">{open ? 'Close' : 'Open the instrument'}</span>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path className="c3-exp__v" d="M8 3v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <div id={`${id}-panel`} className="c3-exp__panel" hidden={!open}>
        {open && (
          <>
            <Demo kind={kind} />
            <p className="c3-result">
              {result}{' '}
              <Link className="c3-more" to={`${base}/research/${slug}`}>
                Read the write-up <span aria-hidden="true">→</span>
              </Link>
            </p>
          </>
        )}
      </div>
    </li>
  )
}

function Research({ base }: { base: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const set = (k: string) => (v: boolean) => setOpen((o) => ({ ...o, [k]: v }))
  // a legend link to es/retrieval (or a #hash on load) opens that row
  useEffect(() => {
    const on = () => {
      const h = location.hash.slice(1)
      if (h === 'r-es' || h === 'r-retrieval') setOpen((o) => ({ ...o, [h]: true }))
    }
    on()
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  const legend = [
    { i: 0, href: '#r-steering', t: 'Steering', d: 'Push a model along joy, distress or certainty' },
    { i: 1, href: '#r-lossmask', t: 'Loss masking', d: 'What training on the user side does to shutdown distress' },
    { i: 2, href: '#r-ocean', t: 'Ocean sensing', d: 'Deep-water temperature, read from orbit' },
    { i: 3, href: '#r-es', t: 'Evolution strategies', d: 'Fine-tuning without gradients' },
    { i: 4, href: '#r-retrieval', t: 'Retrieval', d: 'A billion vectors, 1–4M queries a second' },
  ]
  const focus = (i: number) => () => {
    bus.focus = i
    bus.wake()
  }
  return (
    <section id="research" className="c3-research" aria-labelledby="research-h">
      <div className="c3-rintro" data-field="clusters">
        <div className="c3-rintro__text">
          <p className="c3-eyebrow">
            <ResearchMark />
            <span className="c3-mono">Research · 2025 to now</span>
          </p>
          <h2 id="research-h" className="c3-h1">
            The same lights, re-formed into my research.
          </h2>
          <p className="c3-body">
            Five projects, one cluster each. The largest is 120 real activations from Qwen2.5-1.5B, and each project below has an instrument.
          </p>
        </div>
        <div className="c3-rintro__space" data-field="clusters-m" aria-hidden="true" />
        <ol className="c3-legend" onMouseLeave={focus(-1)}>
          {legend.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                onMouseEnter={focus(l.i)}
                onFocus={focus(l.i)}
                onBlur={focus(-1)}
                onClick={() => (l.i === 3 || l.i === 4) && set(l.href.slice(1))(true)}
              >
                <span className="c3-mono c3-dim">0{l.i + 1}</span>
                <b>{l.t}</b>
                <span>{l.d}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>

      <div className="c3-insts">
        <Instrument
          id="r-steering"
          n="01"
          slug="activation-steering"
          base={base}
          end
          why="If joy is a direction inside a model, does pushing the model along it change what it says?"
          result="Joy is a switch, not a dial, and pushing on distress produces refusals rather than anxious prose."
        >
          <Demo kind="steering" />
        </Instrument>
        <Instrument
          id="r-lossmask"
          n="02"
          slug="loss-masking-distress"
          base={base}
          phoneTap
          why="Fine-tuning trains on the assistant’s tokens only. What if the user’s side carries loss too, and the model hears it’s being shut down?"
          result="Assistant-only loss maximises expressed distress, and calm-sounding models still represent shutdown negatively."
        >
          <Demo kind="lossmask" />
        </Instrument>
        <Instrument
          id="r-ocean"
          n="03"
          slug="ocean-sensing"
          base={base}
          phoneTap
          why="Deep-water sensors are expensive, so how much of what they measure can be read from the surface, from orbit?"
          result="R² = 0.936 against Ocean Networks Canada sensors, validated with NRC Canada."
        >
          <Demo kind="ocean" />
        </Instrument>
        <ol className="c3-exps">
          <Expander
            id="r-es"
            n="04"
            slug="es-lora"
            base={base}
            kind="es"
            line="LoRA fine-tuning of Qwen2.5-1.5B on grade-school maths with a binary reward and no gradients."
            result="Each step scores 45 perturbations and keeps the best 8. The adapter is published on Hugging Face."
            open={!!open['r-es']}
            setOpen={set('r-es')}
          />
          <Expander
            id="r-retrieval"
            n="05"
            slug="billion-vector-retrieval"
            base={base}
            kind="retrieval"
            line="GPU vector search on a modified cuVS fork: 1–4M queries a second over a billion vectors, under 250 ms."
            result="90–95% recall across 8+ GPUs and 2 TB of index; stress tests showed memory bandwidth and NVLink as the bottlenecks, with 4.3× throughput scaling."
            open={!!open['r-retrieval']}
            setOpen={set('r-retrieval')}
          />
        </ol>
      </div>
    </section>
  )
}

function MarmotSat() {
  return (
    <section id="marmotsat" className="c3-chapter c3-sat" aria-labelledby="sat-h">
      <div className="c3-chapter__in">
        <p className="c3-eyebrow">
          <OrgLogo org="uvic" height={22} />
          <span className="c3-mono">Centre for Aerospace Research · 2025–26</span>
        </p>
        <h2 id="sat-h" className="c3-h1">
          The firmware I led is in orbit.
        </h2>
        <p className="c3-body c3-desk">
          Launched on a SpaceX Falcon 9 in July 2026. I led the onboard-computer firmware in C and the TTC board, and built the rig that tests every commit
          on real hardware.
        </p>
        <dl className="c3-stats c3-stats--sm">
          <div>
            <dt>minutes per test run, down from 180</dt>
            <dd>
              <Odo text="15" />
            </dd>
          </div>
          <div>
            <dt>checksum rules on every commit</dt>
            <dd>
              <Odo text="80+" />
            </dd>
          </div>
          <div>
            <dt>hours of manual work cut per release</dt>
            <dd>
              <Odo text="20+" />
            </dd>
          </div>
        </dl>
      </div>
      <div className="c3-orbit">
        <Demo kind="orbit" />
      </div>
    </section>
  )
}

const earlierLogo: Record<string, OrgKey> = {}
function Index({ base }: { base: string }) {
  const community = useCommunity()
  const rows = [X('RBC'), X('DEIA'), X('Pear'), X('MLH')]
  const built = [...earlier.filter((e) => e.title !== 'Pear Care' && e.title !== 'Apache Airflow'), { ...engineering[1], when: 'ongoing', detail: engineering[1].detail }]
  return (
    <section id="index" className="c3-index" aria-labelledby="index-h">
      <header className="c3-index__head">
        <h2 id="index-h" className="c3-h2">
          Everything else
        </h2>
        <p className="c3-dim c3-desk">Roles, builds and competitions.</p>
      </header>
      <ul className="c3-roles">
        {rows.map((r) => (
          <li key={r.org}>
            <span className="c3-roles__logo">
              <OrgLogo org={r.logo} height={18} />
            </span>
            <span className="c3-roles__org">
              <b>{r.org}</b>
              <span className="c3-dim">{r.role}</span>
            </span>
            <span className="c3-roles__line">{r.line}</span>
            <span className="c3-roles__m c3-mono">{r.metric}</span>
            <span className="c3-roles__w c3-mono c3-dim">{r.when}</span>
          </li>
        ))}
        <Show when="beri">
          <li className="c3-beri">
            <span className="c3-roles__logo">
              <span className="c3-beri__mark" aria-hidden="true">
                beri
              </span>
            </span>
            <span className="c3-roles__org">
              <b>Beri</b>
              <span className="c3-dim">A food app I’m building</span>
              <Link to={`${base}/beri`} className="c3-more c3-narrow">
                Case study <span aria-hidden="true">→</span>
              </Link>
            </span>
            <span className="c3-roles__line">
              {beri.oneLiner}{' '}
              <Link to={`${base}/beri`} className="c3-more">
                Case study <span aria-hidden="true">→</span>
              </Link>
            </span>
            <span className="c3-roles__m c3-mono">
              <a href={beri.url} target="_blank" rel="noopener">
                getberi.com ↗
              </a>
            </span>
            <span className="c3-roles__w c3-mono c3-dim">2025 –</span>
          </li>
        </Show>
      </ul>
      <ul className="c3-built">
        {built.map((e) => (
          <li key={e.title}>
            {'href' in e && e.href ? (
              <a href={e.href} target="_blank" rel="noopener">
                {earlierLogo[e.title] && <OrgLogo org={earlierLogo[e.title]} height={14} />}
                <b>{e.title}</b> <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <b>{e.title}</b>
            )}
            <span className="c3-built__r">
              {e.role}
              {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in a local repo; confirm it's okay to list." />}
            </span>
            <span className="c3-built__d">{e.detail}</span>
            <span className="c3-built__w c3-mono c3-dim">{e.when}</span>
          </li>
        ))}
        {community.map((c) => (
          <li key={c.title}>
            {c.href ? (
              <a href={c.href} target="_blank" rel="noopener">
                <b>{c.title}</b> <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <b>{c.title}</b>
            )}
            <span className="c3-built__r">{c.role}</span>
            <span className="c3-built__d">{c.detail}</span>
            <span className="c3-built__w c3-mono c3-dim">{c.when}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Photos() {
  const band = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: band, offset: ['start end', 'end start'] })
  // photographs and timelapses in one strip: two photos, then a video
  type Item = { kind: 'photo'; p: (typeof unsplash.photos)[number]; n: number } | { kind: 'video'; v: (typeof youtube.videos)[number] }
  const mixed: Item[] = []
  unsplash.photos.slice(0, 12).forEach((p, i) => {
    mixed.push({ kind: 'photo', p, n: i + 1 })
    if (i % 2 === 1 && youtube.videos[i >> 1]) mixed.push({ kind: 'video', v: youtube.videos[i >> 1] })
  })
  return (
    <section id="photos" className="c3-photos" aria-labelledby="photos-h">
      <header className="c3-photos__head">
        <p className="c3-eyebrow c3-desk">
          <span className="c3-mono">Photography</span>
        </p>
        <h2 id="photos-h" className="c3-h1">
          The city these points came from.
        </h2>
        <p className="c3-body">
          The lights at the top of this page are the last frame of this timelapse.
        </p>
      </header>
      <div ref={band} className="c3-band">
        <ScrollTimelapse progress={scrollYProgress} className="c3-band__tl" position="50% 100%" alt="Toronto skyline timelapse, golden hour to night, by Tanuj Dargan" />
        <p className="c3-band__cap c3-mono">Toronto · golden hour to night, scrubbed by your scroll</p>
      </div>
      <div className="c3-strip-head">
        <h3 className="c3-mono">Photographs and timelapses</h3>
        <p>
          <a href={unsplash.profile} target="_blank" rel="noopener" className="c3-more">
            {unsplash.total} photos on Unsplash ↗
          </a>
          <a href={youtube.channel} target="_blank" rel="noopener" className="c3-more">
            YouTube ↗
          </a>
        </p>
      </div>
      <ul className="c3-strip">
        {mixed.map((m) =>
          m.kind === 'photo' ? (
            <li key={m.p.id} style={{ ['--a' as string]: m.p.aspect }}>
              <a href={m.p.page} target="_blank" rel="noopener">
                <img src={`${m.p.src}?w=800&q=70&auto=format`} alt={`Photograph ${m.n} by Tanuj Dargan, on Unsplash`} loading="lazy" decoding="async" width={Math.round(240 * m.p.aspect)} height={240} />
              </a>
            </li>
          ) : (
            <li key={m.v.id} className="c3-strip__yt" style={{ ['--a' as string]: 16 / 9 }}>
              <a href={m.v.url} target="_blank" rel="noopener">
                <img src={m.v.thumb} alt="" loading="lazy" decoding="async" width={480} height={360} />
                <span>
                  <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
                    <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
                  </svg>
                  {m.v.title.replace(/\s*\|.*$/, '').replace(/\s*\((4k|4K)[^)]*\)/, '')}
                </span>
              </a>
            </li>
          ),
        )}
      </ul>
    </section>
  )
}

function Contact() {
  return (
    <section id="contact" className="c3-contact" aria-labelledby="contact-h">
      <h2 id="contact-h" className="c3-h1">
        Say hello.
      </h2>
      <p className="c3-body">Email is the fastest way to reach me.</p>
      <CopyEmail />
      <Links className="c3-links c3-links--all" mode="both" size={15} />
    </section>
  )
}

function Home({ base }: { base: string }) {
  return (
    <>
      <Hero />
      <Amazon />
      <Research base={base} />
      <MarmotSat />
      <Index base={base} />
      <Photos />
      <Contact />
    </>
  )
}

/* ------------------------------------------------------------------ root */

export default function C3({ page, base }: VariantProps) {
  const { path } = useRouter()
  const m = useMotionPrefs()
  const home = page.kind === 'home'
  useEffect(() => {
    bus.k = m.k
    bus.level = m.level
    bus.reduced = m.reduced
    bus.wake()
  }, [m.k, m.level, m.reduced])
  return (
    <div className="c3" data-page={page.kind}>
      <a href="#main" className="c3-skip">
        Skip to content
      </a>
      {home && <Field />}
      <Top base={base} home={home} />
      <main id="main" key={path}>
        {home && <Home base={base} />}
        {page.kind === 'research' && (
          <div className="c3-doc">
            <ResearchArticle slug={page.slug} base={base} />
            <p className="c3-back">
              <Link to={`${base}/#research`}>← Back to the research</Link>
            </p>
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="c3-doc">
            <BeriCaseStudy base={base} />
            <p className="c3-back">
              <Link to={`${base}/#index`}>← Back home</Link>
            </p>
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="c3-404">
            <h1 className="c3-h1">No lights on at this address.</h1>
            <p className="c3-body">
              <Link to={`${base}/`} className="c3-more">
                Back to the city <span aria-hidden="true">→</span>
              </Link>
            </p>
          </section>
        )}
      </main>
      <footer className="c3-foot">
        <span>© 2026 {person.name}</span>
        <span className="c3-dim">
          The skyline is my photograph of Toronto. Raw WebGL2, real activations.
        </span>
      </footer>
    </div>
  )
}
