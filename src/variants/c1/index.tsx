/*
 * c1 "Dusk". The whole home page is one dusk: Tanuj's Toronto timelapse is a fixed, full-bleed sky behind the page,
 * and scrolling scrubs it from golden hour (now, 2026) to full night (2022 and contact). Nothing explains it.
 *
 * Borrowed: v9 (Fraunces Italic display and the name treatment, the calm, the ocean sensor), v6 (instrument
 * presentation: why → instrument → result, provenance labelled), v4b (the chronology, now with hierarchy: three
 * flagship chapters told big, then a dense logo-led index by year).
 * On phones the three open instruments share one slot as tabs (SSR and no-JS render all three) to keep the page under 8k px.
 * Patterns (PORTFOLIO_TASTE.md §4): P01 live research demos, P08 sticky years in the index, P12 the sequence loads
 * after paint and only near view, P18/P19 index rows with one metric, P27 copy-email morph, P30 pinned years.
 * Type: Fraunces Italic 340 (display, static latin subset) + Newsreader 400–520 (reading) + Geist Mono (labels, data).
 * Three self-subset latin files in public/c1, 66 KB total, each with a measured local fallback.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { Github, Server, Trophy, Users, Image as ImageIcon, ArrowUpRight } from 'lucide-react'
import { person, research, experience, engineering, earlier, beri, links, type LinkKey } from '../../content/site'
import { useProof, useCommunity } from '../../content/useContent'
import { Links, LinkIcon } from '../../shared/Links'
import { OrgLogo, type OrgKey } from '../../shared/OrgLogo'
import { Flag } from '../../shared/Flag'
import { ScrollTimelapse } from '../../shared/ScrollTimelapse'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import { Show } from '../../lib/labprefs'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import unsplash from '../../data/unsplash.json'
import youtube from '../../data/youtube.json'
import timelapse from '../../data/timelapse.json'
import './c1.css'

const R = (slug: string) => research.find((r) => r.slug === slug)!
const X = (org: string) => experience.find((e) => e.org.startsWith(org))!

/** Scroll to a section without touching the URL (a hash change would re-route the app). */
function jump(id: string, reduced: boolean) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
}

const SECTIONS = [
  { id: 'now', label: 'Now' },
  { id: 'research', label: 'Research' },
  { id: 'orbit', label: 'Orbit' },
  { id: 'index', label: 'Index' },
  { id: 'photos', label: 'Photos' },
]

/* ------------------------------------------------------------------ chrome */

function Nav({ base, home }: { base: string; home: boolean }) {
  const m = useMotionPrefs()
  return (
    <header className="c1-nav">
      <div className="c1-nav__in">
        <Link to={`${base}/`} className="c1-nav__name">
          Tanuj Dargan
        </Link>
        <nav aria-label="Sections" className="c1-nav__sec">
          {SECTIONS.map((s) =>
            home ? (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  jump(s.id, m.reduced)
                }}
              >
                {s.label}
              </a>
            ) : (
              <Link key={s.id} to={`${base}/#${s.id}`}>
                {s.label}
              </Link>
            ),
          )}
        </nav>
        <Links className="c1-nav__links" mode="icon" size={17} only={['resume', 'email', 'github', 'linkedin', 'x']} />
      </div>
    </header>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const t = useRef(0)
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <button
      type="button"
      className="c1-copy"
      data-copied={copied || undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          clearTimeout(t.current)
          t.current = window.setTimeout(() => setCopied(false), 1800)
        } catch {
          location.href = links.email.href
        }
      }}
    >
      <span className="c1-copy__face" aria-hidden={copied || undefined}>
        {person.email}
      </span>
      <span className="c1-copy__done" aria-live="polite">
        {copied ? 'Copied. Talk soon.' : ''}
      </span>
      <span className="c1-copy__hint" aria-hidden="true">
        {copied ? '✓' : 'copy'}
      </span>
    </button>
  )
}

/** The sky: the timelapse fixed behind the home page, scrubbed by page scroll. */
function Sky({ progress }: { progress: MotionValue<number> }) {
  // The scrim deepens where the sky is bright (golden hour, top of the page) and thins as night falls.
  const scrim = useTransform(progress, [0, 0.3, 0.65, 1], [1, 0.82, 0.55, 0.42])
  return (
    <div className="c1-sky">
      <ScrollTimelapse progress={progress} priority alt="" position="50% 45%" className="c1-sky__tl" />
      <motion.div className="c1-sky__scrim" style={{ opacity: scrim }} />
    </div>
  )
}

/** Subpages keep the night sky as a quiet header, no sequence. */
function NightSky() {
  const p = timelapse.toronto.posters
  return (
    <div className="c1-sky c1-sky--still" aria-hidden="true">
      <picture>
        <source media="(max-aspect-ratio: 3/4)" srcSet={p.tall[2]} />
        <img src={p.wide[2]} alt="" width={1280} height={720} decoding="async" />
      </picture>
      <div className="c1-sky__scrim" />
    </div>
  )
}

/** Adds data-seen once an element scrolls into view (calm fade-up; a crossfade under reduced motion). */
function useReveal() {
  useEffect(() => {
    const root = document.querySelector('.c1') as HTMLElement | null
    if (!root) return
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return
          ;(e.target as HTMLElement).dataset.seen = ''
          io.unobserve(e.target)
        }),
      { rootMargin: '0px 0px -8% 0px' },
    )
    // Anything already on screen stays put; only what's below the fold rises. New nodes (content flags) are picked up too.
    const scan = () =>
      root.querySelectorAll<HTMLElement>('.c1-rise:not([data-seen]):not([data-watch])').forEach((el) => {
        el.dataset.watch = ''
        if (el.getBoundingClientRect().top < innerHeight) el.dataset.seen = ''
        else io.observe(el)
      })
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(root, { childList: true, subtree: true })
    root.setAttribute('data-armed', '')
    return () => {
      io.disconnect()
      mo.disconnect()
      root.removeAttribute('data-armed')
    }
  }, [])
}

/** Vertical drift for decorative layers only. Zero under reduced motion; scaled by the motion level. */
function useDrift(amount: number) {
  const ref = useRef<HTMLDivElement>(null)
  const { k } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [amount * k, -amount * k])
  return { ref, y }
}

/** Phones get the three open instruments as tabs (same content, one slot) to keep the page short. SSR renders all three. */
function usePhone() {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const q = matchMedia('(max-width: 760px)')
    const on = () => setPhone(q.matches)
    on()
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return phone
}

/* ------------------------------------------------------------------ hero */

const proofLine: Record<string, string> = {
  amazon: 'SDE intern, 2026. An LLM planning assistant in production at 180+ sites. Return offer.',
  marmotsat: 'I led the onboard-computer firmware. Launched on a SpaceX Falcon 9.',
  research: 'Activation steering, and how loss masking shapes a model’s shutdown distress.',
  beri: 'A food app I’m building for iOS.',
}
const proofMark: Record<string, OrgKey | undefined> = { amazon: 'amazon', marmotsat: 'uvic' }

function ResearchMark() {
  // A direction in a field of points: the research, drawn as a mark the size of the org logos.
  return (
    <svg className="c1-rmark" viewBox="0 0 22 18" aria-hidden="true">
      <circle cx="3" cy="14" r="1.3" />
      <circle cx="7" cy="5" r="1.3" />
      <circle cx="11" cy="12" r="1.3" />
      <circle cx="16" cy="3.5" r="1.3" />
      <path d="M2.5 16.5 L19 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M14.6 3.6 L19.2 3.8 L18.2 8.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Hero() {
  const proof = useProof()
  const m = useMotionPrefs()
  const { scrollY } = useScroll()
  // The hero lags the scroll slightly as the sky moves on; never under reduced motion.
  const y = useTransform(scrollY, [0, 900], [0, 140 * m.k])
  return (
    <section className="c1-hero" aria-labelledby="c1-name">
      <motion.div className="c1-hero__in" style={{ y }}>
        <h1 id="c1-name" className="c1-name c1-in" style={{ '--i': 0 } as CSSProperties}>
          Tanuj Dargan
        </h1>
        <p className="c1-lede c1-in" style={{ '--i': 1 } as CSSProperties}>
          I build ML systems that ship, and study what happens inside the models.
        </p>
        <ul className="c1-proof" aria-label="In short">
          {proof.map((p, i) => (
            <li key={p.key} className="c1-in" style={{ '--i': 2 + i } as CSSProperties}>
              <span className="c1-proof__mark">{proofMark[p.key] ? <OrgLogo org={proofMark[p.key]!} height={17} /> : <ResearchMark />}</span>
              <span className="c1-proof__k">{p.label}</span>
              <span className="c1-proof__d">{proofLine[p.key] ?? p.detail}</span>
            </li>
          ))}
        </ul>
        <Links className="c1-hero__links c1-in" mode="both" size={15} only={['resume', 'email', 'github', 'linkedin', 'x']} />
      </motion.div>
      <p className="c1-hero__credit c1-in" style={{ '--i': 6 } as CSSProperties}>
        Toronto, from my timelapse
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ chapters */

function Chapter({ id, when, title, children, lead }: { id: string; when: ReactNode; title: ReactNode; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="c1-band" aria-labelledby={`${id}-h`}>
      <div className="c1-panel">
        <header className="c1-chap c1-rise">
          <p className="c1-kicker">{when}</p>
          <h2 id={`${id}-h`} className="c1-h2">
            {title}
          </h2>
          {lead && <p className="c1-dek">{lead}</p>}
        </header>
        {children}
      </div>
    </section>
  )
}

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div className="c1-stat">
      <dt className="c1-stat__big">{big}</dt>
      <dd className="c1-stat__small">{small}</dd>
    </div>
  )
}

function Now({ base }: { base: string }) {
  return (
    <Chapter
      id="now"
      when={
        <>
          <OrgLogo org="amazon" height={17} /> <span>Amazon Robotics · Toronto · summer 2026</span>
        </>
      }
      title={
        <>
          An LLM planning assistant, <span className="c1-nowrap">in production.</span>
        </>
      }
    >
      <div className="c1-now c1-rise">
        <div className="c1-now__text">
          <p className="c1-p c1-p--lead">
            This summer I built the planning assistant inside Optimus, the labor-optimization platform for Amazon’s fulfillment sites in North America
            and Europe. Planners ask about a plan in plain language; it flags anomalies, recommends labor and answers what-ifs without re-running the
            solver. I left with a return offer.
          </p>
        </div>
        <dl className="c1-stats c1-stats--3">
          <Stat big="$136.2M" small="a year, projected" />
          <Stat big="180+" small="sites in production" />
          <Stat big="60%+" small="faster to an answer" />
        </dl>
      </div>
      <Show when="beri">
        <aside className="c1-beri c1-rise" aria-label="Beri">
          <p className="c1-p">
            <span className="c1-kicker c1-kicker--inline">Also now</span> <b>Beri</b>, a food app I’m building for iOS: the app, the backend and the
            design system.
          </p>
          <p className="c1-go-row">
            <Link to={`${base}/beri`} className="c1-go">
              The case study <span aria-hidden="true">→</span>
            </Link>
            <a href={beri.url} target="_blank" rel="noopener" className="c1-go c1-go--quiet">
              getberi.com <span aria-hidden="true">↗</span>
            </a>
          </p>
        </aside>
      </Show>
    </Chapter>
  )
}

type Prov = 'real' | 'exact' | 'sketch'
const provLabel: Record<Prov, string> = { real: 'Real model outputs', exact: 'The exact recipe', sketch: 'Illustrative sketch' }

function Instrument({
  n,
  slug,
  topic,
  prov,
  question,
  result,
  demo,
  base,
  flag,
  tab,
}: {
  n: string
  slug: string
  topic: string
  prov: Prov
  question: string
  result: ReactNode
  demo: ReactNode
  base: string
  flag?: string
  tab?: { hidden: boolean; tabId: string }
}) {
  return (
    <article
      className="c1-inst"
      id={`c1-p-${slug}`}
      aria-labelledby={tab ? tab.tabId : `c1-${slug}`}
      role={tab ? 'tabpanel' : undefined}
      hidden={tab?.hidden}
    >
      <div className="c1-inst__head c1-rise">
        <p className="c1-kicker">
          <span className="c1-num">{n}</span> <span>{topic}</span>
          <span className="c1-prov" data-p={prov}>
            {provLabel[prov]}
          </span>
        </p>
        <h3 id={`c1-${slug}`} className="c1-h3">
          {question}
          {flag && <Flag note={flag} />}
        </h3>
      </div>
      <div className="c1-inst__demo">{demo}</div>
      <p className="c1-p c1-result">
        {result}{' '}
        <Link to={`${base}/research/${slug}`} className="c1-inline">
          Read the write-up&nbsp;<span aria-hidden="true">→</span>
        </Link>
      </p>
    </article>
  )
}

function MoreResearch({ base }: { base: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const rows = [
    {
      slug: 'es-lora',
      kind: 'es' as const,
      line: 'Fine-tuning a 1.5B model on grade-school maths with nothing but a right-or-wrong reward.',
      why: 'Gradients are the expensive part of fine-tuning. Evolution strategies try random nudges to the weights and keep the ones that score, so I tried it on a LoRA adapter.',
      result: 'The adapter is published on Hugging Face. The comparison that decides whether the cheap screen beats random picks is still being written up.',
    },
    {
      slug: 'billion-vector-retrieval',
      kind: 'retrieval' as const,
      line: '1–4M queries a second at billion-vector scale, 90–95% recall, under 250 ms.',
      why: 'At a billion vectors, a GPU index stops being limited by compute. I wanted to know which wall it hits first, and what recall it costs to stay fast.',
      result: 'Throughput scaled 4.3× across 8+ GPUs and 2 TB of index. Memory bandwidth and NVLink saturation were the walls.',
    },
  ]
  return (
    <div className="c1-more c1-rise">
      <p className="c1-kicker">Two more, one tap away</p>
      <ol className="c1-rows">
        {rows.map((r, i) => {
          const res = R(r.slug)
          const isOpen = open === r.slug
          return (
            <li key={r.slug} className="c1-xrow" data-open={isOpen || undefined}>
              <button type="button" className="c1-xrow__head" aria-expanded={isOpen} aria-controls={`c1-x-${r.slug}`} onClick={() => setOpen(isOpen ? null : r.slug)}>
                <span className="c1-num c1-xrow__n">0{i + 4}</span>
                <span className="c1-xrow__t">
                  {res.title}
                  {res.unverified && <Flag note={res.unverified[0]} />}
                </span>
                <span className="c1-xrow__m">
                  {res.where} · {res.when}
                </span>
                <span className="c1-xrow__l">{r.line}</span>
                <span className="c1-chev" aria-hidden="true" />
              </button>
              <div className="c1-xrow__body" id={`c1-x-${r.slug}`} hidden={!isOpen}>
                {isOpen && (
                  <div className="c1-xrow__in">
                    <p className="c1-p c1-why">{r.why}</p>
                    <Demo kind={r.kind} />
                    <p className="c1-p c1-result">{r.result}</p>
                    <Link to={`${base}/research/${r.slug}`} className="c1-go">
                      Read the write-up <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Research({ base }: { base: string }) {
  const lm = R('loss-masking-distress')
  const oc = R('ocean-sensing')
  const st = R('activation-steering')
  const phone = usePhone()
  const [tab, setTab] = useState(0)
  const tabs = [
    { slug: 'activation-steering', label: 'Steering' },
    { slug: 'loss-masking-distress', label: 'Loss masking' },
    { slug: 'ocean-sensing', label: 'Ocean' },
  ]
  const t = (i: number) => (phone ? { hidden: tab !== i, tabId: `c1-t-${tabs[i].slug}` } : undefined)
  return (
    <Chapter
      id="research"
      when="Research · 2025 – 2026"
      title={
        <>
          What happens <span className="c1-nowrap">inside the model.</span>
        </>
      }
      lead="Five questions I’ve worked on. Each comes with an instrument you can use here."
    >
      {phone && (
        <div className="c1-tabs" role="tablist" aria-label="Research instruments">
          {tabs.map((x, i) => (
            <button
              key={x.slug}
              type="button"
              role="tab"
              id={`c1-t-${x.slug}`}
              aria-selected={tab === i}
              aria-controls={`c1-p-${x.slug}`}
              tabIndex={tab === i ? 0 : -1}
              onClick={() => setTab(i)}
              onKeyDown={(e) => {
                const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
                if (!d) return
                const n = (i + d + tabs.length) % tabs.length
                setTab(n)
                document.getElementById(`c1-t-${tabs[n].slug}`)?.focus()
              }}
            >
              <span className="c1-num">0{i + 1}</span> {x.label}
            </button>
          ))}
        </div>
      )}
      <div className="c1-insts">
        <Instrument
          tab={t(0)}
          n="01"
          slug="activation-steering"
          topic={`Activation steering · ${st.when}`}
          prov="real"
          flag={st.unverified?.[0]}
          base={base}
          question="If joy is a direction inside a model, does pushing along it make the model joyful?"
          demo={<Demo kind="steering" hero />}
          result={
            <>
              A switch, not a dial: past a small push, “As an AI language model…” becomes “Ah, the sweet aroma of fresh coffee…”. The distress direction
              doesn’t write anxious prose. It writes refusals.
            </>
          }
        />
        <Instrument
          tab={t(1)}
          n="02"
          slug="loss-masking-distress"
          topic={`Loss masking · Apart Research · ${lm.when}`}
          prov="exact"
          base={base}
          question="Does learning only from the assistant’s side change how a model talks about being shut down?"
          demo={<Demo kind="lossmask" />}
          result={
            <>
              It does. Assistant-only loss voices the most distress; any loss on the user’s turns brings back a neutral register at no capability cost.
              Yet calm-sounding models still represent shutdown negatively, so what a model says is a poor welfare signal.
            </>
          }
        />
        <Instrument
          tab={t(2)}
          n="03"
          slug="ocean-sensing"
          topic={`Ocean sensing · SOLIDS Lab, UVic · ${oc.when}`}
          prov="sketch"
          flag={oc.unverified?.[0]}
          base={base}
          question="Can what a satellite sees at the surface tell you the water temperature far below?"
          demo={<Demo kind="ocean" />}
          result={
            <>
              Well enough to use: <b>R² = 0.936</b> against Ocean Networks Canada sensors, and the frameworks went to NRC Canada.
            </>
          }
        />
      </div>
      <MoreResearch base={base} />
    </Chapter>
  )
}

function OrbitUnderlay() {
  // Sits under the live tracker's slot: what shows until (or if) the tracker renders.
  return (
    <div className="c1-orbit__under" aria-hidden="true">
      <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="c1-earth" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#1b2536" />
            <stop offset="1" stopColor="#0a0d14" />
          </radialGradient>
        </defs>
        <ellipse cx="200" cy="120" rx="170" ry="54" fill="none" stroke="currentColor" strokeOpacity=".22" strokeDasharray="2 5" />
        <circle cx="200" cy="120" r="62" fill="url(#c1-earth)" stroke="currentColor" strokeOpacity=".18" />
        <circle className="c1-orbit__sat" cx="342" cy="150" r="3.5" />
      </svg>
      <p>MarmotSat · NORAD 69912 · VA7UVS</p>
    </div>
  )
}

function Orbit() {
  return (
    <Chapter
      id="orbit"
      when={
        <>
          <OrgLogo org="uvic" height={17} /> <span>Centre for Aerospace Research · 2025 – 26</span>
        </>
      }
      title={
        <>
          Firmware I led <span className="c1-nowrap">is in orbit.</span>
        </>
      }
    >
      <div className="c1-now c1-rise">
        <div className="c1-now__text">
          <p className="c1-p c1-p--lead">
            I led the onboard-computer firmware and the TTC board for MarmotSat. It launched on a SpaceX Falcon 9 in July 2026, and the code I wrote is
            running in space. I also built the test rig: every commit is flashed to real hardware and checked automatically.
          </p>
        </div>
        <dl className="c1-stats c1-stats--3">
          <Stat big="In orbit" small="since July 2026" />
          <Stat big="15 min" small="per test run, from 180" />
          <Stat big="80+" small="checks on every commit" />
        </dl>
      </div>
      <div className="c1-orbit c1-rise">
        <p className="c1-kicker c1-live">
          <span className="c1-live__dot" aria-hidden="true" /> Where it is right now
        </p>
        <div className="c1-orbit__stage">
          <OrbitUnderlay />
          <Demo kind="orbit" />
        </div>
      </div>
    </Chapter>
  )
}

/* ------------------------------------------------------------------ index */

type Mark = { org: OrgKey } | { icon: 'gh' | 'trophy' | 'users' | 'server' | 'image' }
interface IndexItem {
  key: string
  year: string
  mark: Mark
  title: string
  sub: string
  line: string
  metric?: string
  href?: string
  bullets?: string[]
  flag?: string
}

function MarkIcon({ m }: { m: Mark }) {
  if ('org' in m) return <OrgLogo org={m.org} height={16} />
  const p = { size: 17, strokeWidth: 1.5, 'aria-hidden': true }
  if (m.icon === 'gh') return <Github {...p} />
  if (m.icon === 'trophy') return <Trophy {...p} />
  if (m.icon === 'users') return <Users {...p} />
  if (m.icon === 'server') return <Server {...p} />
  return <ImageIcon {...p} />
}

function useIndex(): { year: string; items: IndexItem[] }[] {
  const community = useCommunity()
  const e = (org: string, year: string): IndexItem => {
    const x = X(org)
    return { key: x.org, year, mark: { org: x.logo }, title: x.org, sub: `${x.role} · ${x.when}`, line: x.line, metric: x.metric, bullets: x.bullets }
  }
  const p = (title: string, year: string, icon: 'gh' | 'trophy' | 'image'): IndexItem => {
    const x = earlier.find((q) => q.title === title)!
    return {
      key: x.title,
      year,
      mark: { icon },
      title: x.title,
      sub: `${x.role} · ${x.when}`,
      line: x.detail,
      href: x.href,
      flag: 'unverified' in x && x.unverified ? 'Parameter Golf found in a local repo, not on the resume; confirm it’s okay to list.' : undefined,
    }
  }
  const c = (title: string, year: string): IndexItem | null => {
    const x = community.find((q) => q.title === title)
    return x ? { key: x.title, year, mark: { icon: 'users' }, title: x.title, sub: `${x.role} · ${x.when}`, line: x.detail, href: x.href } : null
  }
  const lab = engineering[1]
  const all: (IndexItem | null)[] = [
    e('RBC Borealis', '2026'),
    p('Parameter Golf', '2026', 'gh'),
    p('Hive', '2026', 'gh'),
    c('CDE 2026', '2026'),
    e('DEIA Lab', '2025'),
    e('Pear Care', '2025'),
    e('MLH Fellowship', '2025'),
    p('Optimate', '2025', 'trophy'),
    p('Drop', '2025', 'gh'),
    c('VikeLabs', '2025'),
    { key: 'homelab', year: '2025', mark: { icon: 'server' }, title: lab.title, sub: lab.role, line: lab.detail, href: lab.href },
    p('AIMO Progress Prize 2', '2024', 'trophy'),
    p('Wedding Studio', '2024', 'image'),
    c('Hack@JBCNOsh', '2022'),
  ]
  const items = all.filter(Boolean) as IndexItem[]
  const years = [...new Set(items.map((i) => i.year))]
  return years.map((y) => ({ year: y, items: items.filter((i) => i.year === y) }))
}

function IndexRow({ it, open, onToggle }: { it: IndexItem; open: boolean; onToggle: () => void }) {
  const body = (
    <>
      <span className="c1-ix__mark">
        <MarkIcon m={it.mark} />
      </span>
      <span className="c1-ix__t">
        {it.title}
        {it.flag && <Flag note={it.flag} />}
      </span>
      <span className="c1-ix__sub">{it.sub}</span>
      <span className="c1-ix__l">{it.line}</span>
      {it.metric && <span className="c1-ix__metric">{it.metric}</span>}
      {it.bullets ? <span className="c1-chev" aria-hidden="true" /> : it.href ? <ArrowUpRight className="c1-ix__ext" size={16} strokeWidth={1.6} aria-hidden="true" /> : null}
    </>
  )
  if (it.bullets)
    return (
      <li className="c1-ix" data-open={open || undefined}>
        <button type="button" className="c1-ix__row" aria-expanded={open} onClick={onToggle}>
          {body}
        </button>
        <div className="c1-ix__more" hidden={!open}>
          <ul>
            {it.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      </li>
    )
  return (
    <li className="c1-ix">
      {it.href ? (
        <a href={it.href} target="_blank" rel="noopener" className="c1-ix__row">
          {body}
        </a>
      ) : (
        <div className="c1-ix__row">{body}</div>
      )}
    </li>
  )
}

function Index() {
  const groups = useIndex()
  const [open, setOpen] = useState<string | null>(null)
  return (
    <Chapter
      id="index"
      when="Everything else · 2026 → 2022"
      title="The rest of the work."
      lead="Roles, projects and prizes, newest first. Tap a role for what I did there."
    >
      <div className="c1-index">
        {groups.map((g) => (
          <section key={g.year} className="c1-year c1-rise" aria-labelledby={`c1-y-${g.year}`}>
            <h3 id={`c1-y-${g.year}`} className="c1-year__y">
              {g.year}
            </h3>
            <ol className="c1-year__list">
              {g.items.map((it) => (
                <IndexRow key={it.key} it={it} open={open === it.key} onToggle={() => setOpen(open === it.key ? null : it.key)} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Chapter>
  )
}

/* ------------------------------------------------------------------ photography */

// Dusk and moon, chosen to sit in the page's palette; indexes into unsplash.json (no rotated-frame corners).
const PICKS = [14, 12, 10, 0, 9, 18, 3, 16, 2, 4]
const cleanTitle = (t: string) =>
  t
    .replace(/\s*\|.*$/, '')
    .replace(/\s*[-–]\s*Best I Have Ever Made/i, ', the best I’ve made')
    .replace(/\(?\b(4k|5k|UHD|60fps|5k60fps)\b\)?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
    .replace(/\b(mumbai|nisarga|yyz|west)\b/gi, (w) => (w.toLowerCase() === 'yyz' ? 'YYZ' : w[0].toUpperCase() + w.slice(1).toLowerCase()))

type Photo = (typeof unsplash.photos)[number]
function Tile({ ph, i }: { ph: Photo; i: number }) {
  return (
    <a href={ph.page} target="_blank" rel="noopener" className="c1-ph" data-i={i} style={{ aspectRatio: String(ph.aspect) }}>
      <img
        src={`${ph.src}?w=800&q=70&auto=format`}
        srcSet={`${ph.src}?w=420&q=70&auto=format 420w, ${ph.src}?w=800&q=70&auto=format 800w`}
        sizes="(max-width: 760px) 46vw, 260px"
        alt="Dusk sky, a photograph of mine on Unsplash"
        loading="lazy"
        decoding="async"
        width={800}
        height={Math.round(800 / ph.aspect)}
      />
    </a>
  )
}

function Photos() {
  const photos = PICKS.map((i) => unsplash.photos[i])
  const a = useDrift(26)
  const b = useDrift(-26)
  const cols = [photos.filter((_, i) => i % 2 === 0), photos.filter((_, i) => i % 2 === 1)]
  return (
    <section id="photos" className="c1-band c1-band--photos" aria-labelledby="photos-h">
      <div className="c1-panel c1-panel--open">
        <header className="c1-chap c1-rise">
          <p className="c1-kicker">Off the clock</p>
          <h2 id="photos-h" className="c1-h2">
            I photograph the sky.
          </h2>
          <p className="c1-dek">
            Dusk, the moon, cities turning their lights on. The sky behind this page is one of mine: {timelapse.toronto.place}, 483 frames, shot from
            golden hour into the night.
          </p>
        </header>
        <div className="c1-masonry">
          <motion.div ref={a.ref} style={{ y: a.y }} className="c1-masonry__col">
            {cols[0].map((ph, i) => (
              <Tile key={ph.id} ph={ph} i={i * 2} />
            ))}
          </motion.div>
          <motion.div ref={b.ref} style={{ y: b.y }} className="c1-masonry__col">
            {cols[1].map((ph, i) => (
              <Tile key={ph.id} ph={ph} i={i * 2 + 1} />
            ))}
          </motion.div>
        </div>
        <div className="c1-yt c1-rise">
          <p className="c1-kicker">Timelapses on YouTube</p>
          <ul className="c1-yt__row">
            {youtube.videos.map((v) => (
              <li key={v.id}>
                <a href={v.url} target="_blank" rel="noopener" className="c1-yt__a">
                  <span className="c1-yt__img">
                    <img src={v.thumb} alt="" loading="lazy" decoding="async" width={480} height={360} />
                    <span className="c1-yt__play" aria-hidden="true" />
                  </span>
                  <span className="c1-yt__t">{cleanTitle(v.title)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p className="c1-profiles c1-rise">
          <ProfileLink k="unsplash" text={`${unsplash.total} photos on Unsplash`} />
          <ProfileLink k="youtube" text="Timelapses on YouTube" />
        </p>
      </div>
    </section>
  )
}

function ProfileLink({ k, text }: { k: LinkKey; text: string }) {
  return (
    <a href={links[k].href} target="_blank" rel="noopener" className="c1-pill" aria-label={`${text} (opens ${links[k].label})`}>
      <LinkIcon k={k} size={16} />
      <span className="c1-pill__long">{text}</span>
      <span className="c1-pill__short" aria-hidden="true">
        {links[k].label}
      </span>
      <span aria-hidden="true">↗</span>
    </a>
  )
}

/* ------------------------------------------------------------------ contact */

function Contact() {
  return (
    <section id="contact" className="c1-band c1-band--contact" aria-labelledby="contact-h">
      <div className="c1-contact c1-rise">
        <h2 id="contact-h" className="c1-h2">
          Say hello.
        </h2>
        <p className="c1-dek">
          I’m finishing CS at UVic, done in {person.gradMonth}. If you run a lab, a research program or a team working on interpretability or ML
          systems, email is fastest.
        </p>
        <CopyEmail />
        <Links className="c1-contact__links" mode="both" size={15} only={['resume', 'github', 'linkedin', 'x', 'youtube', 'unsplash']} />
      </div>
    </section>
  )
}

function Home({ base }: { base: string }) {
  const { scrollYProgress } = useScroll()
  useReveal()
  return (
    <>
      <Sky progress={scrollYProgress} />
      <Hero />
      <Now base={base} />
      <Research base={base} />
      <Orbit />
      <Index />
      <Photos />
      <Contact />
    </>
  )
}

/* ------------------------------------------------------------------ root */

export default function C1({ page, base }: VariantProps) {
  const { path } = useRouter()
  const home = page.kind === 'home'
  return (
    <div className="c1" data-page={page.kind}>
      <a href="#main" className="c1-skip">
        Skip to content
      </a>
      {!home && <NightSky />}
      <Nav base={base} home={home} />
      <main id="main" key={path}>
        {home && <Home base={base} />}
        {page.kind === 'research' && (
          <div className="c1-doc">
            <ResearchArticle slug={page.slug} base={base} />
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="c1-doc">
            <BeriCaseStudy base={base} />
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="c1-doc c1-404">
            <p className="c1-kicker">404</p>
            <h1 className="c1-name">Nothing here.</h1>
            <p className="c1-p">
              <Link to={`${base}/`} className="c1-go">
                Back to the home page <span aria-hidden="true">→</span>
              </Link>
            </p>
          </section>
        )}
      </main>
      <footer className="c1-foot">
        <div className="c1-foot__in">
          <span>© 2026 {person.name}</span>
          <span className="c1-foot__credit">The sky is my timelapse of {timelapse.toronto.place}. Everything you read is HTML.</span>
          <Links className="c1-foot__links" mode="icon" size={16} only={['github', 'linkedin', 'x', 'youtube', 'unsplash']} />
        </div>
      </footer>
    </div>
  )
}
