/*
 * c2 "Instrument": research-first, calm, ship-today. The best personal site of a researcher who also ships production systems.
 *
 * Borrowed: v6's type pairing (Newsreader for reading, Geist Mono for labels and data) and its real activation data,
 * now a quiet static figure instead of a scene; v4b's chronology, now a dated index with hierarchy, and its flip metric;
 * v9's italic display name and dusk palette, now Tanuj's own Toronto timelapse as the chapter bands.
 *
 * Patterns (PORTFOLIO_TASTE.md §4): P01 steering instrument · P08 scroll-scrubbed figure (timelapse bands) · P17 metric roll ·
 * P19 one metric per row · P21 expandable rows · P27 copy-email morph · P12 pause offscreen (shared demos, timelapse).
 * Tokens (§3): ease-out, ease-expo; springs and durations come from useMotionPrefs so Subtle/Default/Expressive differ.
 *
 * Type: three sizes on home (S 12.5 px mono labels, M 18 px serif reading, L display serif), Newsreader latin subset (46 KB),
 * Geist Mono subset (18 KB), and a 4 KB italic cut holding only the glyphs of the name. Metric-matched fallbacks, zero CLS.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import { Github, Server, Trophy, Users, Plus, ArrowUpRight } from 'lucide-react'
import { person, research, experience, engineering, earlier, beri, links, workLinkOrder, type Research } from '../../content/site'
import { useProof, useCommunity } from '../../content/useContent'
import type { FlagKey } from '../../content/flags'
import { Show, useFlags } from '../../lib/labprefs'
import { Link, useRouter } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { OrgLogo, type OrgKey } from '../../shared/OrgLogo'
import { Links, LinkIcon } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { ScrollTimelapse } from '../../shared/ScrollTimelapse'
import { Demo } from '../../demos/Demo'
import unsplash from '../../data/unsplash.json'
import youtube from '../../data/youtube.json'
import type { VariantProps } from '../../routes'
import { JoyFigure } from './JoyFigure'
import './c2.css'

const R = (slug: string) => research.find((r) => r.slug === slug)!
const X = (org: string) => experience.find((e) => e.org.startsWith(org))!

/* ---------------- small pieces ---------------- */

function Ext({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" className={className}>
      {children}
      <ArrowUpRight className="c2-ext" size={14} strokeWidth={1.6} aria-hidden="true" />
    </a>
  )
}

/** P17: a metric rolls in, character by character, the first time it scrolls into view. SSR shows it plainly. */
function Roll({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const { reduced } = useMotionPrefs()
  const [st, setSt] = useState<'idle' | 'armed' | 'on'>('idle')
  useEffect(() => {
    const el = ref.current!
    if (el.getBoundingClientRect().top < innerHeight) return // already on screen: leave it be
    setSt('armed')
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        setSt('on')
        io.disconnect()
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <span ref={ref} className={`c2-roll ${className ?? ''}`} data-st={st} data-reduced={reduced || undefined}>
      <span className="c2-sr">{text}</span>
      {Array.from(text).map((c, i) => (
        <span key={i} className="c2-roll__c" aria-hidden="true">
          <span style={{ ['--i' as string]: i }}>{c === ' ' ? ' ' : c}</span>
        </span>
      ))}
    </span>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="c2-copy"
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
      <span className="c2-copy__a">{person.email}</span>
      <span className="c2-copy__b" aria-hidden="true">
        Copied
      </span>
      <span className="c2-copy__hint" aria-hidden="true">
        {copied ? 'done' : 'copy'}
      </span>
      <span className="c2-sr" aria-live="polite">
        {copied ? 'Email address copied to the clipboard' : ''}
      </span>
    </button>
  )
}

/** In-place expansion (P21) with the motion level's spring; reduced motion gets a short crossfade. */
function Reveal({ open, children, id }: { open: boolean; children: ReactNode; id: string }) {
  const m = useMotionPrefs()
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          id={id}
          className="c2-reveal"
          initial={m.reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={m.reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
          exit={m.reduced ? { opacity: 0 } : { height: 0, opacity: 0, transition: { duration: m.dur(0.24), ease: [0.23, 1, 0.32, 1] } }}
          transition={m.reduced ? { duration: 0.2 } : { height: m.spring(210), opacity: { duration: m.dur(0.3) } }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------- chrome ---------------- */

const NAV = [
  { id: 'research', label: 'Research' },
  { id: 'work', label: 'Work' },
  { id: 'photographs', label: 'Photographs', short: 'Photos' },
]

function Top({ base, home, heroLinksGone }: { base: string; home: boolean; heroLinksGone: boolean }) {
  const icons = !home || heroLinksGone
  return (
    <header className="c2-top" data-icons={icons || undefined}>
      <div className="c2-top__in">
        <Link to={`${base}/`} className="c2-top__name">
          Tanuj Dargan
        </Link>
        <nav className="c2-top__nav" aria-label="Sections">
          {NAV.map((n) =>
            home ? (
              <a key={n.id} href={`#${n.id}`}>
                {n.short ? (
                  <>
                    <span className="c2-long">{n.label}</span>
                    <span className="c2-short">{n.short}</span>
                  </>
                ) : (
                  n.label
                )}
              </a>
            ) : (
              <Link key={n.id} to={`${base}/#${n.id}`}>
                {n.short ? (
                  <>
                    <span className="c2-long">{n.label}</span>
                    <span className="c2-short">{n.short}</span>
                  </>
                ) : (
                  n.label
                )}
              </Link>
            ),
          )}
        </nav>
        <Links className="c2-top__links" mode="icon" size={17} only={workLinkOrder} />
      </div>
    </header>
  )
}

function Foot({ home }: { home: boolean }) {
  return (
    <footer className="c2-foot">
      <div className="c2-wrap c2-foot__in">
        {!home && <Links className="c2-foot__links" mode="label" />}
        <p className="c2-foot__fine">
          © 2026 {person.name}. Set in Newsreader and Geist Mono. The skyline is my own timelapse.
        </p>
      </div>
    </footer>
  )
}

/* ---------------- hero ---------------- */

const proofMark: Record<string, OrgKey | undefined> = { amazon: 'amazon', marmotsat: 'uvic' }

function Hero({ linksRef }: { linksRef: React.RefObject<HTMLDivElement> }) {
  const proof = useProof()
  const m = useMotionPrefs()
  const steer = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById('steering')
    if (!el) return
    e.preventDefault()
    el.scrollIntoView({ behavior: m.reduced ? 'auto' : 'smooth', block: 'start' })
    history.replaceState(null, '', '#steering')
  }
  return (
    <section className="c2-hero c2-wrap" aria-labelledby="c2-name">
      <div className="c2-hero__text">
        <p className="c2-lbl c2-in" style={{ ['--i' as string]: 0 }}>
          CS at UVic, class of {person.grad} · Toronto and Victoria
        </p>
        <h1 id="c2-name" className="c2-name c2-in" style={{ ['--i' as string]: 1 }}>
          Tanuj Dargan
        </h1>
        <p className="c2-claim c2-in" style={{ ['--i' as string]: 2 }}>
          I build ML systems that run in production, and I study what happens inside language models.
        </p>
        <ul className="c2-proof">
          {proof.map((p, i) => {
            const mark = proofMark[p.key]
            return (
              <li key={p.key} className="c2-in" style={{ ['--i' as string]: 3 + i }}>
                <span className="c2-proof__mark">
                  {mark ? (
                    <OrgLogo org={mark} height={p.key === 'amazon' ? 17 : 19} />
                  ) : (
                    <svg viewBox="0 0 24 16" width="24" height="16" aria-hidden="true" className="c2-proof__dots">
                      <circle cx="3" cy="11" r="2" />
                      <circle cx="8" cy="7" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="17" cy="5" r="2" className="c2-hot" />
                      <circle cx="21" cy="9" r="2" className="c2-hot" />
                    </svg>
                  )}
                </span>
                <span className="c2-proof__t">
                  <b>{p.label}.</b> {p.detail}
                </span>
              </li>
            )
          })}
        </ul>
        <div ref={linksRef} className="c2-in" style={{ ['--i' as string]: 6 }}>
          <Links className="c2-hero__links" mode="label" only={workLinkOrder} />
        </div>
      </div>
      <div className="c2-hero__fig c2-in" style={{ ['--i' as string]: 4 }}>
        <JoyFigure onSteer={steer} />
      </div>
    </section>
  )
}

/* ---------------- research ---------------- */

interface Inst {
  slug: string
  id: string
  name: string
  q: string
  r: string
  flag?: string
}
const OPEN: Inst[] = [
  {
    slug: 'activation-steering',
    id: 'steering',
    name: 'Activation steering',
    q: 'If joy is a direction inside a language model, can I find it cheaply and push the model along it?',
    r: 'Joy is a switch, not a dial: past a small push, “As an AI language model…” becomes “Ah, the sweet aroma of fresh coffee…”.',
    flag: R('activation-steering').unverified?.[0],
  },
  {
    slug: 'loss-masking-distress',
    id: 'lossmask',
    name: 'Loss masking and shutdown distress',
    q: 'Does training only on the assistant’s words change how a model talks about being shut down?',
    r: 'Yes. Assistant-only loss maximises expressed shutdown distress, and models tuned to sound calm still represent it negatively underneath.',
  },
  {
    slug: 'ocean-sensing',
    id: 'ocean',
    name: 'Ocean sensing',
    q: 'Can what a satellite sees at the surface stand in for expensive sensors in deep water?',
    r: 'A multimodal model on Ocean Networks Canada data reached R² = 0.936 for deep-water temperature, validated with NRC Canada.',
    flag: R('ocean-sensing').unverified?.[0],
  },
]
const FOLDED: Inst[] = [
  {
    slug: 'es-lora',
    id: 'es',
    name: 'ES-LoRA',
    q: 'Can a 1.5B model learn grade-school maths with no gradients at all, only a right-or-wrong reward?',
    r: 'The adapter is published on Hugging Face. I’m still confirming the accuracy numbers before I report them.',
    flag: R('es-lora').unverified?.[0],
  },
  {
    slug: 'billion-vector-retrieval',
    id: 'retrieval',
    name: 'Billion-vector retrieval',
    q: 'Where does GPU vector search break at a billion vectors: compute, memory, or the links between GPUs?',
    r: '1–4M queries a second at 90–95% recall and under 250 ms. Memory bandwidth and NVLink were the walls, not compute.',
  },
]

function InstMeta({ r, name }: { r: Research; name: string }) {
  return (
    <p className="c2-lbl">
      <span className="c2-lbl__hi">{name}</span> · {r.where.split(' · ')[0]} · {r.when}
    </p>
  )
}

function Instrument({ it, base }: { it: Inst; base: string }) {
  const r = R(it.slug)
  return (
    <article className="c2-inst" id={it.id} aria-labelledby={`${it.id}-h`}>
      <header className="c2-inst__head">
        <InstMeta r={r} name={it.name} />
        <h3 id={`${it.id}-h`} className="c2-q">
          {it.q}
        </h3>
      </header>
      <div className="c2-inst__demo">
        <Demo kind={r.demo!} />
      </div>
      <p className="c2-result">
        {it.r}
        {it.flag && <Flag note={it.flag} />}
      </p>
      <Link to={`${base}/research/${r.slug}`} className="c2-more">
        Read the write-up <span className="c2-arrow">→</span>
      </Link>
    </article>
  )
}

function Folded({ it, base }: { it: Inst; base: string }) {
  const r = R(it.slug)
  const [open, setOpen] = useState(false)
  return (
    <article className="c2-fold" id={it.id} data-open={open || undefined} aria-labelledby={`${it.id}-h`}>
      <h3 className="c2-fold__h">
        <button type="button" className="c2-fold__btn" aria-expanded={open} aria-controls={`${it.id}-body`} onClick={() => setOpen(!open)}>
          <span className="c2-lbl c2-fold__meta">
            <span className="c2-lbl__hi">{it.name}</span> · {r.where.split(' · ')[0]} · {r.when}
          </span>
          <span id={`${it.id}-h`} className="c2-fold__t">
            {r.title}
          </span>
          <span className="c2-fold__cta c2-lbl">
            <Plus size={14} strokeWidth={1.8} aria-hidden="true" className="c2-plus" />
            {open ? 'Close' : 'Open the instrument'}
          </span>
        </button>
      </h3>
      <Reveal open={open} id={`${it.id}-body`}>
        <div className="c2-fold__body">
          <p className="c2-q">{it.q}</p>
          <div className="c2-inst__demo">
            <Demo kind={r.demo!} />
          </div>
          <p className="c2-result">
            {it.r}
            {it.flag && <Flag note={it.flag} />}
          </p>
          <Link to={`${base}/research/${r.slug}`} className="c2-more">
            Read the write-up <span className="c2-arrow">→</span>
          </Link>
        </div>
      </Reveal>
    </article>
  )
}

/* ---------------- timelapse bands ---------------- */

/** A full-bleed chapter band: its slice of the Toronto timelapse scrubs as the band crosses the viewport. */
function Band({ from, to, id, title, line, children }: { from: number; to: number; id: string; title: string; line: ReactNode; children?: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const p = useTransform(scrollYProgress, [0, 1], [from, to])
  return (
    <section ref={ref} className="c2-band" id={id} aria-labelledby={`${id}-h`}>
      <ScrollTimelapse progress={p} className="c2-band__tl" position="50% 62%" alt="" />
      <div className="c2-band__scrim" aria-hidden="true" />
      <div className="c2-wrap c2-band__in">
        <h2 id={`${id}-h`} className="c2-h2">
          {title}
        </h2>
        <p className="c2-band__line">{line}</p>
        <BandMeter p={p} from={from} to={to} />
      </div>
      {children}
    </section>
  )
}

function BandMeter({ p, from, to }: { p: MotionValue<number>; from: number; to: number }) {
  const x = useTransform(p, [0, 1], ['0%', '100%'])
  return (
    <div className="c2-meter" aria-hidden="true">
      <span>golden hour</span>
      <span className="c2-meter__track">
        <span className="c2-meter__slice" style={{ left: `${from * 100}%`, width: `${(to - from) * 100}%` }} />
        <motion.span className="c2-meter__head" style={{ left: x }} />
      </span>
      <span>night</span>
    </div>
  )
}

/* ---------------- work ---------------- */

function Amazon() {
  const a = X('Amazon')
  return (
    <article className="c2-flag" aria-labelledby="amazon-h">
      <p className="c2-flag__org">
        <OrgLogo org="amazon" height={20} />
        <span className="c2-lbl">
          {a.role.replace('Software Development Engineer', 'SDE')} · {a.when} · {a.where}
        </span>
      </p>
      <h3 id="amazon-h" className="c2-h3">
        An LLM planning assistant, in production across 180+ fulfillment sites
      </h3>
      <dl className="c2-metrics">
        <div>
          <dt className="c2-lbl">a year, projected</dt>
          <dd>
            <Roll text="$136.2M" className="c2-big" />
          </dd>
        </div>
        <div>
          <dt className="c2-lbl">sites, NA and EU</dt>
          <dd>
            <Roll text="180+" className="c2-big" />
          </dd>
        </div>
      </dl>
      <p className="c2-prose">
        It runs inside Optimus, the labor-optimization platform for those sites. Planners ask about a plan in plain language; it flags anomalies,
        recommends labor moves and answers what-if questions without a full solver re-run. A RAG pipeline over past plans cut their time to insight by
        60%+. I left with a return offer.
      </p>
    </article>
  )
}

function MarmotSat() {
  const c = X('UVic Centre')
  return (
    <article className="c2-flag" aria-labelledby="sat-h">
      <p className="c2-flag__org">
        <OrgLogo org="uvic" height={22} />
        <span className="c2-lbl">
          Centre for Aerospace Research · {c.when} · {c.where}
        </span>
      </p>
      <h3 id="sat-h" className="c2-h3">
        MarmotSat: firmware I led, now in orbit
      </h3>
      <dl className="c2-metrics">
        <div>
          <dt className="c2-lbl">since July 2026</dt>
          <dd>
            <Roll text="In orbit" className="c2-big" />
          </dd>
        </div>
        <div>
          <dt className="c2-lbl">minutes per test run</dt>
          <dd>
            <Roll text="180 → 15" className="c2-big" />
          </dd>
        </div>
      </dl>
      <p className="c2-prose">
        I led the onboard-computer firmware in C, the TTC board and the hardware/software integration. Every commit is flashed to real hardware and
        checked against 80+ checksum rules.
      </p>
      <Tracker />
    </article>
  )
}

/** The live tracker. Inline on desktop; on phones it's one tap away, so the home page stays short. */
function Tracker() {
  const [open, setOpen] = useState(false)
  return (
    <div className="c2-orbit" data-open={open || undefined}>
      <button type="button" className="c2-orbit__open" aria-expanded={open} aria-controls="c2-tracker" onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true" className="c2-orbit__art">
          <circle cx="32" cy="32" r="17" className="c2-orbit__earth" />
          <ellipse cx="32" cy="32" rx="29" ry="12" transform="rotate(-24 32 32)" className="c2-orbit__ring" />
          <circle cx="7" cy="42" r="2.6" className="c2-orbit__sat" />
        </svg>
        <span className="c2-orbit__txt">
          <span className="c2-real c2-lbl">
            <span className="c2-dot" aria-hidden="true" />
            Live
          </span>
          <span className="c2-orbit__t">Where MarmotSat is right now</span>
        </span>
        <Plus size={18} strokeWidth={1.7} aria-hidden="true" className="c2-plus" />
      </button>
      <div id="c2-tracker" className="c2-orbit__demo">
        <Demo kind="orbit" />
      </div>
    </div>
  )
}

function Beri({ base }: { base: string }) {
  return (
    <article className="c2-beri" aria-labelledby="beri-h">
      <p className="c2-lbl c2-beri__lbl">Building · 2025 –</p>
      <h3 id="beri-h" className="c2-h3">
        Beri, a food app I’m building
      </h3>
      <p className="c2-prose">
        Find a recipe, cook it, post it, see what friends made. I’m building the iOS app, the backend and the design system.
      </p>
      <p className="c2-beri__links">
        <Link to={`${base}/beri`} className="c2-more">
          Read the case study <span className="c2-arrow">→</span>
        </Link>
        <Ext href={beri.url} className="c2-more c2-more--quiet">
          getberi.com
        </Ext>
      </p>
    </article>
  )
}

/* ---------------- the index ---------------- */

type Mark = { org: OrgKey } | { icon: 'repo' | 'prize' | 'people' | 'server' }
interface Entry {
  key: string
  when: string
  mark: Mark
  title: string
  role: string
  metric?: string
  line: string
  more?: string[]
  href?: string
  hrefLabel?: string
  internal?: boolean
  flag?: FlagKey
  unverified?: string
}

const byTitle = (t: string) => earlier.find((e) => e.title === t)!
const rbc = X('RBC')
const deia = X('DEIA')
const pear = X('Pear')
const mlh = X('MLH')
const homelab = engineering[1]

function entries(community: ReturnType<typeof useCommunity>): Entry[] {
  const c = (t: string) => community.find((x) => x.title === t)
  const vl = c('VikeLabs')
  const cde = c('CDE 2026')
  const jb = c('Hack@JBCNOsh')
  const out: (Entry | false | undefined)[] = [
    { key: 'rbc', when: 'Mar – May 2026', mark: { org: 'rbc' }, title: 'RBC Borealis', role: 'AI/ML research mentee', metric: rbc.metric, line: rbc.line, more: rbc.bullets },
    {
      key: 'pg',
      when: '2026',
      mark: { icon: 'repo' },
      title: 'Parameter Golf',
      role: byTitle('Parameter Golf').role,
      line: byTitle('Parameter Golf').detail,
      href: byTitle('Parameter Golf').href,
      hrefLabel: 'Repository',
      unverified: "Parameter Golf found in a local repo; confirm it's okay to list.",
    },
    { key: 'hive', when: '2026', mark: { icon: 'repo' }, title: 'Hive', role: byTitle('Hive').role, line: byTitle('Hive').detail, href: byTitle('Hive').href, hrefLabel: 'Repository' },
    !!cde && { key: 'cde', when: cde.when, mark: { icon: 'people' }, title: cde.title, role: cde.role, line: cde.detail, href: cde.href, hrefLabel: 'cde2026.cfes.ca', flag: 'cde' },
    {
      key: 'homelab',
      when: 'Ongoing',
      mark: { icon: 'server' },
      title: homelab.title,
      role: homelab.role,
      line: homelab.detail,
      href: homelab.href,
      hrefLabel: 'Nix config',
    },
    { key: 'pear', when: 'Jul 2025 – Apr 2026', mark: { org: 'pearcare' }, title: 'Pear Care', role: pear.role, metric: pear.metric, line: pear.line, more: pear.bullets, href: 'https://pearcare.ai', hrefLabel: 'pearcare.ai' },
    {
      key: 'deia',
      when: 'May 2025 – Feb 2026',
      mark: { org: 'uvic' },
      title: 'DEIA Lab, UVic',
      role: 'Undergraduate researcher',
      metric: deia.metric,
      line: deia.line,
      more: deia.bullets,
      href: '/research/billion-vector-retrieval',
      hrefLabel: 'Read the write-up',
      internal: true,
    },
    !!vl && { key: 'vikelabs', when: vl.when, mark: { icon: 'people' }, title: vl.title, role: vl.role, line: vl.detail, flag: 'vikelabs' },
    {
      key: 'htn',
      when: 'Sep 2025',
      mark: { icon: 'prize' },
      title: 'Optimate, Hack the North',
      role: '2 prizes of 300+ teams',
      metric: 'YC Unicorn Prize',
      line: byTitle('Optimate').detail,
      href: byTitle('Optimate').href,
      hrefLabel: 'Repository',
    },
    {
      key: 'airflow',
      when: 'May – Aug 2025',
      mark: { org: 'mlh' },
      title: 'Apache Airflow, MLH Fellowship',
      role: mlh.role,
      metric: mlh.metric,
      line: mlh.line,
      more: mlh.bullets,
      href: byTitle('Apache Airflow').href,
      hrefLabel: 'apache/airflow',
    },
    { key: 'drop', when: '2025', mark: { icon: 'repo' }, title: 'Drop', role: byTitle('Drop').role, line: byTitle('Drop').detail, href: byTitle('Drop').href, hrefLabel: 'Repository' },
    {
      key: 'aimo',
      when: 'Nov 2024 – Mar 2025',
      mark: { icon: 'prize' },
      title: 'AIMO Progress Prize 2',
      role: 'Kaggle',
      metric: 'Silver · top 10%',
      line: byTitle('AIMO Progress Prize 2').detail,
    },
    { key: 'wedding', when: '2024', mark: { icon: 'repo' }, title: 'Wedding Studio', role: byTitle('Wedding Studio').role, line: byTitle('Wedding Studio').detail },
    !!jb && { key: 'jb', when: jb.when, mark: { icon: 'people' }, title: jb.title, role: jb.role, metric: '450+ people', line: jb.detail },
  ]
  return out.filter(Boolean) as Entry[]
}

function MarkIcon({ mark }: { mark: Mark }) {
  if ('org' in mark) return <OrgLogo org={mark.org} height={mark.org === 'rbc' ? 22 : 17} />
  const p = { size: 17, strokeWidth: 1.5, 'aria-hidden': true as const }
  if (mark.icon === 'repo') return <Github {...p} />
  if (mark.icon === 'prize') return <Trophy {...p} />
  if (mark.icon === 'server') return <Server {...p} />
  return <Users {...p} />
}

function Index({ base }: { base: string }) {
  const community = useCommunity()
  const list = entries(community)
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const FIRST = 6
  return (
    <section className="c2-index" aria-labelledby="index-h">
      <div className="c2-index__head">
        <h3 id="index-h" className="c2-h3">
          Everything else
        </h3>
        <p className="c2-lbl">Newest first · tap a row for detail</p>
      </div>
      <ol className="c2-rows">
        {list.map((e, i) => {
          const isOpen = open === e.key
          return (
            <li
              key={e.key}
              className="c2-row"
              data-open={isOpen || undefined}
              data-org={'org' in e.mark || undefined}
              hidden={!all && i >= FIRST}
              style={all && i >= FIRST ? { ['--j' as string]: i - FIRST } : undefined}
              data-late={(all && i >= FIRST) || undefined}
            >
              <button type="button" className="c2-row__btn" aria-expanded={isOpen} aria-controls={`row-${e.key}`} onClick={() => setOpen(isOpen ? null : e.key)}>
                <span className="c2-row__when" data-m={e.metric ? ` · ${e.metric}` : undefined}>
                  {e.when}
                </span>
                <span className="c2-row__mark">
                  <MarkIcon mark={e.mark} />
                </span>
                <span className="c2-row__t">
                  {e.title}
                  <span className="c2-row__role">{e.role}</span>
                </span>
                <span className="c2-row__metric">{e.metric}</span>
                <Plus size={15} strokeWidth={1.7} aria-hidden="true" className="c2-plus c2-row__plus" />
              </button>
              {e.unverified && <Flag note={e.unverified} />}
              <Reveal open={isOpen} id={`row-${e.key}`}>
                <div className="c2-row__body">
                  <p>{e.line}</p>
                  {e.more && e.more.length > 0 && (
                    <ul>
                      {e.more.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {e.href &&
                    (e.internal ? (
                      <Link to={`${base}${e.href}`} className="c2-more">
                        {e.hrefLabel} <span className="c2-arrow">→</span>
                      </Link>
                    ) : (
                      <Ext href={e.href} className="c2-more">
                        {e.hrefLabel ?? 'Link'}
                      </Ext>
                    ))}
                </div>
              </Reveal>
            </li>
          )
        })}
      </ol>
      {list.length > FIRST && (
        <button type="button" className="c2-row__all c2-more" aria-expanded={all} onClick={() => setAll(!all)}>
          <Plus size={14} strokeWidth={1.8} aria-hidden="true" className="c2-plus" />
          {all ? 'Show fewer' : `${list.length - FIRST} more, back to 2022`}
        </button>
      )}
    </section>
  )
}

/* ---------------- photographs ---------------- */

const PHOTOS: { i: number; alt: string }[] = [
  { i: 17, alt: 'The last of the sun on the horizon over water' },
  { i: 14, alt: 'High-rise skyline under a red dusk sky' },
  { i: 5, alt: 'The sun going down over the sea behind a hazy city' },
  { i: 10, alt: 'A crescent moon through branches' },
  { i: 9, alt: 'Magenta dusk over rooftops and trees' },
  { i: 18, alt: 'Storm clouds over a lit coastline at night' },
  { i: 12, alt: 'City lights under a dark cloud at blue hour' },
  { i: 7, alt: 'Clouds over mountain ridges at dusk' },
]
const VIDEOS = youtube.videos.slice(0, 6)
const vTitle = (t: string) =>
  t
    .replace(/\s*\|.*$/, '')
    .replace(/\s*\((4k|5k)[^)]*\)/i, '')
    .replace(/\s+(4k|5k)(\s?UHD)?/gi, '')
    .replace(/^FADING IN TIME/, 'Fading in time')
    .trim()

function Photographs() {
  return (
    <div className="c2-wrap c2-photos">
      <ul className="c2-strip" aria-label="Photographs on Unsplash">
        {PHOTOS.map(({ i, alt }) => {
          const p = unsplash.photos[i]
          return (
            <li key={p.id} style={{ ['--a' as string]: p.aspect }}>
              <a href={p.page} target="_blank" rel="noopener">
                <img
                  src={`${p.src}?w=640&q=70&auto=format`}
                  srcSet={`${p.src}?w=400&q=70&auto=format 400w, ${p.src}?w=800&q=70&auto=format 800w`}
                  sizes="(max-width: 720px) 60vw, 25vw"
                  alt={alt}
                  loading="lazy"
                  decoding="async"
                  width={Math.round(p.aspect * 600)}
                  height={600}
                />
              </a>
            </li>
          )
        })}
      </ul>
      <div className="c2-photos__foot">
        <p className="c2-lbl">{unsplash.total} photographs, free to use</p>
        <Ext href={links.unsplash.href} className="c2-more">
          <LinkIcon k="unsplash" size={15} /> Unsplash
        </Ext>
      </div>

      <div className="c2-photos__foot c2-photos__h">
        <h3 className="c2-h3">Timelapses</h3>
        <Ext href={links.youtube.href} className="c2-more">
          <LinkIcon k="youtube" size={15} /> YouTube
        </Ext>
      </div>
      <ul className="c2-vids">
        {VIDEOS.map((v) => (
          <li key={v.id}>
            <a href={v.url} target="_blank" rel="noopener">
              <img src={v.thumb} alt="" loading="lazy" decoding="async" width={480} height={360} />
              <span className="c2-vids__t">{vTitle(v.title)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------- home ---------------- */

function Home({ base, linksRef }: { base: string; linksRef: React.RefObject<HTMLDivElement> }) {
  const flags = useFlags()
  return (
    <>
      <Hero linksRef={linksRef} />

      <section id="research" className="c2-research c2-wrap" aria-labelledby="research-h">
        <header className="c2-sec__head">
          <h2 id="research-h" className="c2-h2">
            Research
          </h2>
          <p className="c2-intro">
            Five questions, each with an instrument you can use. Each one says whether it runs on real outputs.
          </p>
        </header>
        {OPEN.map((it) => (
          <Instrument key={it.id} it={it} base={base} />
        ))}
        <div className="c2-folds">
          {FOLDED.map((it) => (
            <Folded key={it.id} it={it} base={base} />
          ))}
        </div>
      </section>

      <Band
        from={0.04}
        to={0.5}
        id="work"
        title="Work"
        line={flags.beri ? 'A system in production at Amazon, firmware in orbit, and an app I’m building.' : 'A system in production at Amazon, and firmware in orbit.'}
      />
      <div className="c2-work c2-wrap">
        <Amazon />
        <MarmotSat />
        <Show when="beri">
          <Beri base={base} />
        </Show>
        <Index base={base} />
      </div>

      <Band
        from={0.5}
        to={1}
        id="photographs"
        title="Photographs"
        line="I photograph cities from dusk into night. These bands are my timelapse of Toronto, golden hour to dark."
      />
      <Photographs />

      <section id="contact" className="c2-contact c2-wrap" aria-labelledby="contact-h">
        <h2 id="contact-h" className="c2-h2">
          Contact
        </h2>
        <p className="c2-intro">I finish my CS degree at UVic in {person.gradMonth}. Email is the fastest way to reach me.</p>
        <CopyEmail />
        <Links className="c2-foot__links" mode="label" />
      </section>
    </>
  )
}

/* ---------------- root ---------------- */

export default function C2({ page, base }: VariantProps) {
  const { path } = useRouter()
  const home = page.kind === 'home'
  const linksRef = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)

  // Header icons appear once the hero's link row has scrolled away, so links are always one tap away but never doubled.
  useEffect(() => {
    if (!home) return
    const el = linksRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: '-56px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [home, path])

  return (
    <div className="c2" data-page={page.kind}>
      <a href="#main" className="c2-skip">
        Skip to content
      </a>
      <Top base={base} home={home} heroLinksGone={gone} />
      <main id="main" key={path}>
        {home && <Home base={base} linksRef={linksRef} />}
        {page.kind === 'research' && (
          <div className="c2-doc">
            <ResearchArticle slug={page.slug} base={base} />
            <p className="c2-back c2-wrap">
              <Link to={`${base}/#research`} className="c2-more">
                <span className="c2-arrow">←</span> All five instruments
              </Link>
            </p>
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="c2-doc">
            <BeriCaseStudy base={base} />
            <p className="c2-back c2-wrap">
              <Link to={`${base}/#work`} className="c2-more">
                <span className="c2-arrow">←</span> Back to the work
              </Link>
            </p>
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="c2-hero c2-wrap c2-404">
            <div className="c2-hero__text">
              <p className="c2-lbl">404</p>
              <h1 className="c2-name">Nothing here.</h1>
              <p className="c2-claim">
                That page doesn’t exist.{' '}
                <Link to={`${base}/`} className="c2-more">
                  Back to the start <span className="c2-arrow">→</span>
                </Link>
              </p>
            </div>
          </section>
        )}
      </main>
      <Foot home={home} />
    </div>
  )
}
