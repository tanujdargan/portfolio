/*
 * v4b "Narrative: the work". The story is told only through projects and research over time: no places, no origin.
 * One horizontal time axis (2022 → 2026) pins under the nav while you scroll; each milestone's number takes the
 * split-flap counter as it crosses the playhead, the category recolours the accent, and a cumulative step line
 * behind the bars shows the work compounding. After it, a plain index.
 *
 * Patterns (PORTFOLIO_TASTE.md §4): P08 sticky figure with stepping text (pinned axis + readout, steps scroll past),
 * P17 odometer numbers (split-flap Flip), P19 one proof metric per milestone, P30 pinned years (the playhead date),
 * P22-style cumulative line, P11 colour-linked kinds (tally ↔ bars), P18/P19 index rows, P27 copy-email morph,
 * P01/P07 live demos at their milestones.
 *
 * Type: Martian Mono Variable at wdth 112.5 (wide) for display and numbers; JetBrains Mono Variable for body.
 * Two monospaces, contrasted by width: a lab-notebook ledger of the work. Both latin-only @font-face (38 + 40 KB).
 * Colour: graphite ground, two inks, one accent per kind (research teal, industry amber, build green,
 * competition coral, community lilac), all oklch at matched lightness.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { person, research, engineering, earlier, experience, links, beri, workLinkOrder } from '../../content/site'
import { useCommunity, useProof, useMilestones } from '../../content/useContent'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { OrgLogo, type OrgKey } from '../../shared/OrgLogo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link, useRouter } from '../../lib/router'
import { Show } from '../../lib/labprefs'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { Story } from './Story'
import { Arrow } from './Arrow'
import { tpos } from './data'
import './v4b.css'

/** Scroll to an element without touching the URL (a hash change would re-route the app). */
function jump(id: string, reduced: boolean) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

/* ---------------- chrome ---------------- */

function Nav({ base, home }: { base: string; home: boolean }) {
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
    <header className="v4b-nav">
      <div className="v4b-nav__in">
        <Link to={`${base}/`} className="v4b-nav__name">
          Tanuj<span className="v4b-nav__last"> Dargan</span>
        </Link>
        <nav aria-label="Sections" className="v4b-nav__sec">
          {item('story', 'The work')}
          {item('index', 'Index')}
          {item('contact', 'Contact')}
        </nav>
        <Links className="v4b-nav__icons" mode="icon" size={18} only={workLinkOrder} />
      </div>
    </header>
  )
}

/** The staircase in miniature, inside the "Scroll the work" button: a preview of the figure it opens. */
function Spark() {
  const ms = useMilestones()
  const n = ms.length
  return (
    <svg className="v4b-spark" viewBox="0 0 100 24" aria-hidden="true" preserveAspectRatio="none">
      {ms.map((x, i) => (
        <rect key={x.title} data-kind={x.kind} x={tpos(x.year) * 96 + 1} width="1.6" y={24 - (4 + (20 * (i + 1)) / n)} height={4 + (20 * (i + 1)) / n} rx="0.6" />
      ))}
    </svg>
  )
}

/** Proof points wear the colour of their kind on the timeline. */
const PROOF_KIND: Record<string, string> = { amazon: 'industry', beri: 'build', marmotsat: 'build', research: 'research' }

function Hero() {
  const m = useMotionPrefs()
  const proof = useProof()
  const n = useMilestones().length
  return (
    <section className="v4b-hero" aria-labelledby="v4b-name">
      <p className="v4b-kicker v4b-in" style={{ ['--i' as string]: 0 }}>
        <span className="v4b-live" aria-hidden="true" />
        <span>
          CS at UVic<span className="v4b-long">, accelerated three-year track</span> · class of {person.grad}
        </span>
      </p>
      <h1 id="v4b-name" className="v4b-name">
        <span className="v4b-mask">
          <span className="v4b-rise" style={{ ['--i' as string]: 0 }}>
            Tanuj
          </span>
        </span>{' '}
        <span className="v4b-mask">
          <span className="v4b-rise" style={{ ['--i' as string]: 1 }}>
            Dargan
          </span>
        </span>
      </h1>
      <p className="v4b-claim v4b-in" style={{ ['--i' as string]: 2 }}>
        I ship ML systems and study what language models do on the inside.
      </p>
      <ul className="v4b-proof">
        {proof.map((p, i) => (
          <li key={p.key} className="v4b-in" data-kind={PROOF_KIND[p.key] ?? 'research'} style={{ ['--i' as string]: 3 + i }}>
            <span className="v4b-proof__label">
              <span className="v4b-dot" aria-hidden="true" />
              {p.label}
            </span>
            <span className="v4b-proof__detail">{p.detail}</span>
            {/* phones get the one-line version so all three and the links fit the first screen */}
            <span className="v4b-proof__short">
              <span className="v4b-dot" aria-hidden="true" />
              {p.short}
            </span>
          </li>
        ))}
      </ul>
      <Links className="v4b-pills v4b-in" mode="both" size={15} only={workLinkOrder} />
      <div className="v4b-cta v4b-in" style={{ ['--i' as string]: 7 }}>
        <button type="button" className="v4b-btn v4b-btn--main" onClick={() => jump('story', m.reduced)}>
          <Spark />
          <span>
            Scroll the work <Arrow down />
          </span>
          <span className="v4b-btn__meta">{n} pieces · 2022–26</span>
        </button>
        <a
          href="#index"
          className="v4b-skip-to"
          onClick={(e) => {
            e.preventDefault()
            jump('index', m.reduced)
          }}
        >
          Skip to the index
        </a>
      </div>
    </section>
  )
}

/* ---------------- the index: everything, plainly ---------------- */

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const m = useMotionPrefs()
  return (
    <button
      type="button"
      className="v4b-copy"
      title={copied ? 'Email address copied' : 'Copy email address'}
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
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? 'y' : 'n'}
          initial={{ opacity: 0, y: 12 * m.k }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 * m.k }}
          transition={{ duration: m.dur(0.2), ease: [0.23, 1, 0.32, 1] }}
        >
          {copied ? 'Copied. Talk soon.' : person.email}
        </motion.span>
      </AnimatePresence>
      <span className="v4b-copy__hint" aria-hidden="true">
        {copied ? '' : 'copy'}
      </span>
    </button>
  )
}

function Row({ title, meta, detail, to, href, flag, tag, logo }: { title: string; meta: string; detail?: string; to?: string; href?: string; flag?: string; tag?: string; logo?: OrgKey }) {
  const inner = (
    <>
      <span className="v4b-row__t">
        {logo && <OrgLogo org={logo} height={logo === 'mlh' ? 24 : 17} className="v4b-row__logo" />}
        {title}
        {tag && <span className="v4b-tag">{tag}</span>}
        {flag && <Flag note={flag} />}
      </span>
      <span className="v4b-row__m">{meta}</span>
      {detail && <span className="v4b-row__d">{detail}</span>}
      {(to || href) && (
        <span className="v4b-row__go" aria-hidden="true">
          <Arrow out={!to} />
        </span>
      )}
    </>
  )
  return (
    <li className="v4b-row">
      {to ? (
        <Link to={to} className="v4b-row__a">
          {inner}
        </Link>
      ) : href ? (
        <a href={href} target="_blank" rel="noopener" className="v4b-row__a">
          {inner}
        </a>
      ) : (
        <div className="v4b-row__a">{inner}</div>
      )}
    </li>
  )
}

function Index({ base }: { base: string }) {
  const community = useCommunity()
  // Pear Care and Airflow are already under Experience; the rest of `earlier` is listed once here.
  const orgs = experience.map((e) => e.org.toLowerCase())
  const rest = earlier.filter((e) => !orgs.some((o) => o.includes(e.title.toLowerCase())))
  return (
    <section id="index" className="v4b-index" tabIndex={-1} aria-labelledby="v4b-index-h">
      <h2 id="v4b-index-h" className="v4b-index__h">
        Index
      </h2>
      <p className="v4b-index__sub">Everything above, without the timeline. Research first, because each one has a write-up.</p>

      <div className="v4b-group" id="research" tabIndex={-1}>
        <h3 className="v4b-label">Research</h3>
        <ul className="v4b-rows">
          {research.map((r) => (
            <Row key={r.slug} title={r.title} meta={`${r.where} · ${r.when}`} to={`${base}/research/${r.slug}`} tag={r.demo ? 'live demo' : undefined} />
          ))}
        </ul>
      </div>

      <div className="v4b-group">
        <h3 className="v4b-label">Experience</h3>
        <ul className="v4b-rows">
          {experience.map((e) => (
            <li key={e.org} className="v4b-row">
              <details className="v4b-exp">
                <summary className="v4b-row__a">
                  <span className="v4b-row__t">
                    <OrgLogo org={e.logo} height={e.logo === 'mlh' ? 24 : 17} className="v4b-row__logo" />
                    {e.org}
                  </span>
                  <span className="v4b-row__m">
                    {e.when} · {e.metric}
                  </span>
                  <span className="v4b-row__d">
                    {e.role}. {e.line}
                  </span>
                  <span className="v4b-row__go v4b-plus" aria-hidden="true" />
                </summary>
                <ul className="v4b-exp__more">
                  {e.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </div>

      <Show when="beri">
        <div className="v4b-group">
          <h3 className="v4b-label">Product</h3>
          <ul className="v4b-rows">
            <Row title="Beri" meta="Building · iOS · 2025 –" detail={`${beri.oneLiner} I build the app, the backend and the design system.`} to={`${base}/beri`} tag="case study" />
          </ul>
        </div>
      </Show>

      <div className="v4b-group">
        <h3 className="v4b-label">Engineering</h3>
        <ul className="v4b-rows">
          {engineering.map((e) => (
            <Row key={e.title} title={e.title} meta={e.role} detail={e.detail} href={'href' in e ? e.href : undefined} logo={e.title.startsWith('MarmotSat') ? 'uvic' : undefined} />
          ))}
        </ul>
      </div>

      <div className="v4b-group">
        <h3 className="v4b-label">Earlier</h3>
        <ul className="v4b-rows v4b-rows--small">
          {rest.map((e) => (
            <Row
              key={e.title}
              title={e.title}
              meta={`${e.role} · ${e.when}`}
              detail={e.detail}
              href={e.href}
              flag={'unverified' in e && e.unverified ? "Parameter Golf found in local repo; confirm it's okay to list." : undefined}
            />
          ))}
        </ul>
      </div>

      <div className="v4b-group">
        <h3 className="v4b-label">Community</h3>
        <ul className="v4b-rows v4b-rows--small">
          {community.map((c) => (
            <Row key={c.title} title={c.title} meta={`${c.role} · ${c.when}`} detail={c.detail} href={c.href} />
          ))}
        </ul>
        <p className="v4b-tools">
          <span className="v4b-label">Tools</span> Python, PyTorch, Hugging Face, CUDA/cuVS, vLLM · Swift/SwiftUI, TypeScript/React · C on STM32 · Nix, Proxmox,
          Kubernetes.
        </p>
      </div>

      <div className="v4b-contact" id="contact" tabIndex={-1}>
        <h3 className="v4b-label">Contact</h3>
        <p className="v4b-contact__line">
          Labs, research programs and founders: <span className="v4b-hot">email is fastest.</span>
        </p>
        <CopyEmail />
        <Links className="v4b-pills" mode="both" size={15} />
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="v4b-foot">
      <span>© 2026 {person.name}</span>
      <span>Set in Martian Mono and JetBrains Mono. The demos run in your browser.</span>
    </footer>
  )
}

export default function V4b({ page, base }: VariantProps) {
  const { path } = useRouter()
  const m = useMotionPrefs()
  return (
    <div className="v4b">
      <a href="#main" className="v4b-skip">
        Skip to content
      </a>
      <Nav base={base} home={page.kind === 'home'} />
      <main id="main" key={path}>
        {page.kind === 'home' && (
          <>
            <Hero />
            <Story base={base} onIndex={() => jump('index', m.reduced)} />
            <Index base={base} />
          </>
        )}
        {page.kind === 'research' && (
          <div className="v4b-page">
            <ResearchArticle slug={page.slug} base={base} />
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="v4b-page">
            <BeriCaseStudy base={base} />
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="v4b-hero v4b-hero--nf">
            <p className="v4b-kicker">404</p>
            <h1 className="v4b-name">Not on the timeline.</h1>
            <p className="v4b-claim">
              <Link to={`${base}/`} className="v4b-a">
                Back to the work <Arrow />
              </Link>
            </p>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
