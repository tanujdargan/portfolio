/*
 * P1 · Refined. v4b and v6 with every DIAGNOSIS_V2 problem fixed: one calm column, one idea per section, details on tap.
 *
 * First screen: name, one line, one row of actions. A slim header with the same actions slides in once the hero's
 * row scrolls away, so the links are always one tap from anywhere.
 * Sections: Work (six tiles, each row a disclosure), Research (steering and loss masking inline, three on tap),
 * Projects (MarmotSat with the live tracker, Beri behind its flag, four one-line rows), Contact.
 *
 * Type: Geist Variable for everything read, Geist Mono for dates and meta. Latin-only @font-face (29 + 23 KB).
 * Colour: graphite ground, three greys, one quiet blue accent used only for links and focus.
 * Motion: CSS entrances once (opacity from 0.01, travel × --k, time × --t); Framer for the header, disclosures and
 * the copy-email morph. Reduced motion collapses every move to a short crossfade.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { person, links, beri } from '../../content/site'
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
import { jobs, studies, smaller, type Job, type Study } from './copy'
import './p1.css'

const EASE = [0.23, 1, 0.32, 1] as const

/** Adds data-in once an element enters the viewport; CSS runs the entrance (only after hydration, see p1.css). */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.in = ''
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

const Arrow = ({ out }: { out?: boolean }) => (
  <span className="p1-arw" aria-hidden="true">
    {out ? '↗' : '→'}
  </span>
)

/* ---------------- chrome ---------------- */

function Header({ base, show }: { base: string; show: boolean }) {
  const m = useMotionPrefs()
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.header
          className="p1-bar"
          initial={{ opacity: 0, y: -10 * m.k }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 * m.k }}
          transition={{ duration: m.dur(0.24), ease: EASE }}
        >
          <div className="p1-bar__in">
            <Link to={`${base}/`} className="p1-bar__name">
              {person.name}
            </Link>
            <Links className="p1-acts p1-acts--bar" mode="both" size={16} />
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  )
}

function Footer() {
  return (
    <footer className="p1-foot">
      <div className="p1-wrap p1-foot__in">
        <span>© 2026 {person.name}</span>
        <span>{person.location}</span>
      </div>
    </footer>
  )
}

/* ---------------- hero ---------------- */

function Hero({ actsRef }: { actsRef: React.RefObject<HTMLDivElement> }) {
  return (
    <section className="p1-hero" aria-labelledby="p1-name">
      <div className="p1-wrap">
        <h1 id="p1-name" className="p1-name p1-in" style={{ ['--i' as string]: 0 }}>
          {person.name}
        </h1>
        <p className="p1-lede p1-in" style={{ ['--i' as string]: 1 }}>
          I ship ML systems and study what language models do on the inside.
          <span className="p1-lede__soft">CS at UVic, class of {person.grad}.</span>
        </p>
        <div ref={actsRef} className="p1-in" style={{ ['--i' as string]: 2 }}>
          <Links className="p1-acts p1-acts--hero" mode="both" size={17} />
        </div>
      </div>
    </section>
  )
}

/* ---------------- sections ---------------- */

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const ref = useReveal<HTMLElement>()
  return (
    <section id={id} ref={ref} className="p1-sec p1-rv" tabIndex={-1} aria-labelledby={`p1-${id}-h`}>
      <div className="p1-wrap p1-sec__grid">
        <h2 id={`p1-${id}-h`} className="p1-sec__h">
          {title}
        </h2>
        <div className="p1-sec__body">{children}</div>
      </div>
    </section>
  )
}

function JobItem({ j }: { j: Job }) {
  const [open, setOpen] = useState(false)
  const m = useMotionPrefs()
  const id = useId()
  return (
    <motion.li layout="position" transition={{ duration: m.dur(0.3), ease: EASE }} className="p1-job" data-open={open || undefined}>
      <button type="button" className="p1-job__btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <OrgTile org={j.logo} size={40} className="p1-job__tile" />
        <span className="p1-job__top">
          <span className="p1-job__org">{j.org}</span>
          <span className="p1-job__when">{j.when}</span>
          <span className="p1-job__yrs">{j.years}</span>
        </span>
        <span className="p1-job__role">
          {j.role}
        </span>
        <span className="p1-job__line">{j.line}</span>
        <span className="p1-plus" aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            className="p1-job__more"
            initial={{ opacity: 0, y: -6 * m.k }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: m.dur(0.12) } }}
            transition={{ duration: m.dur(0.3), ease: EASE, delay: m.dur(0.05) }}
          >
            <p className="p1-job__metric">
              <span className="p1-job__full">{j.when} · </span>
              {j.metric}
            </p>
            <ul className="p1-job__bul">
              {j.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

function Work() {
  return (
    <Section id="work" title="Work">
      <LayoutGroup id="p1-jobs">
        <ul className="p1-jobs">
          {jobs.map((j) => (
            <JobItem key={j.key} j={j} />
          ))}
        </ul>
      </LayoutGroup>
    </Section>
  )
}

function StudyHead({ s, base }: { s: Study; base: string }) {
  return (
    <div className="p1-card">
      <p className="p1-meta">{s.meta}</p>
      <h3 className="p1-card__t">
        <Link to={`${base}/research/${s.slug}`}>{s.title}</Link>
        {s.flag && <Flag note={s.flag} />}
      </h3>
      <p className="p1-card__hook">{s.hook}</p>
    </div>
  )
}

function WriteUp({ slug, base }: { slug: string; base: string }) {
  return (
    <Link to={`${base}/research/${slug}`} className="p1-more">
      Read the write-up <Arrow />
    </Link>
  )
}

function InlineStudy({ s, base }: { s: Study; base: string }) {
  return (
    <div className="p1-study">
      <StudyHead s={s} base={base} />
      <div className="p1-study__demo">
        <Demo kind={s.demo} hero={s.demo === 'steering'} />
      </div>
      <WriteUp slug={s.slug} base={base} />
    </div>
  )
}

function TapStudy({ s, base }: { s: Study; base: string }) {
  const [open, setOpen] = useState(false)
  const m = useMotionPrefs()
  const id = useId()
  return (
    <motion.div layout="position" transition={{ duration: m.dur(0.34), ease: EASE }} className="p1-study p1-study--tap">
      <StudyHead s={s} base={base} />
      <div className="p1-study__acts">
        <button type="button" className="p1-try" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          <span className="p1-try__dot" aria-hidden="true" />
          {open ? 'Hide the demo' : 'Try the demo'}
        </button>
        <WriteUp slug={s.slug} base={base} />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            className="p1-study__demo"
            initial={{ opacity: 0, y: 8 * m.k }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: m.dur(0.12) } }}
            transition={{ duration: m.dur(0.36), ease: EASE }}
          >
            <Demo kind={s.demo} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Research({ base }: { base: string }) {
  const inline = studies.filter((s) => s.inline)
  const tap = studies.filter((s) => !s.inline)
  return (
    <Section id="research" title="Research">
      <div className="p1-studies">
        {inline.map((s) => (
          <InlineStudy key={s.slug} s={s} base={base} />
        ))}
      </div>
      <LayoutGroup id="p1-tap">
        <div className="p1-studies p1-studies--tap">
          {tap.map((s) => (
            <TapStudy key={s.slug} s={s} base={base} />
          ))}
        </div>
      </LayoutGroup>
    </Section>
  )
}

function Projects({ base }: { base: string }) {
  return (
    <Section id="projects" title="Projects">
      <div className="p1-study">
        <div className="p1-card">
          <p className="p1-meta">UVic CfAR · in orbit</p>
          <h3 className="p1-card__t">MarmotSat</h3>
          <p className="p1-card__hook">The CubeSat whose onboard-computer firmware I led, launched on a SpaceX Falcon 9. Tracked live below.</p>
        </div>
        <div className="p1-study__demo">
          <Demo kind="orbit" />
        </div>
      </div>

      <Show when="beri">
        <div className="p1-card p1-card--beri">
          <p className="p1-meta">Since 2025</p>
          <h3 className="p1-card__t">
            <Link to={`${base}/beri`}>Beri</Link>
          </h3>
          <p className="p1-card__hook">{beri.oneLiner}</p>
          <Link to={`${base}/beri`} className="p1-more">
            Case study <Arrow />
          </Link>
        </div>
      </Show>

      <p className="p1-meta p1-small-h" id="p1-also">
        Also
      </p>
      <ul className="p1-small" aria-labelledby="p1-also">
        {smaller.map((x) => (
          <li key={x.title}>
            {x.href ? (
              <a href={x.href} target="_blank" rel="noopener" className="p1-small__a">
                <span className="p1-small__t">{x.title}</span>
                <span className="p1-small__l">{x.line}</span>
                <Arrow out />
              </a>
            ) : (
              <span className="p1-small__a">
                <span className="p1-small__t">{x.title}</span>
                <span className="p1-small__l">{x.line}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const m = useMotionPrefs()
  return (
    <button
      type="button"
      className="p1-email"
      aria-label={copied ? 'Email address copied' : `Copy email address ${person.email}`}
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
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? 'y' : 'n'}
          className="p1-email__v"
          initial={{ opacity: 0, y: 10 * m.k }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 * m.k }}
          transition={{ duration: m.dur(0.22), ease: EASE }}
        >
          {copied ? 'Copied' : person.email}
        </motion.span>
      </AnimatePresence>
      <span className="p1-email__hint" aria-hidden="true">
        {copied ? '' : 'Copy'}
      </span>
    </button>
  )
}

function Contact() {
  return (
    <Section id="contact" title="Contact">
      <p className="p1-contact__line">Email is the fastest way to reach me.</p>
      <CopyEmail />
      <Links className="p1-acts p1-acts--foot" mode="both" size={16} only={['resume', 'github', 'linkedin', 'x']} />
    </Section>
  )
}

/* ---------------- page ---------------- */

export default function P1({ page, base }: VariantProps) {
  const { path } = useRouter()
  const home = page.kind === 'home'
  const actsRef = useRef<HTMLDivElement>(null)
  // The header shows once the hero's action row has scrolled away; on inner pages it's always there.
  const [past, setPast] = useState(false)
  useEffect(() => {
    if (!home) return
    const el = actsRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [home, path])

  return (
    <div className="p1" data-page={page.kind}>
      <a href="#main" className="p1-skip">
        Skip to content
      </a>
      <Header base={base} show={!home || past} />
      <main id="main" key={path} tabIndex={-1}>
        {home && (
          <>
            <Hero actsRef={actsRef} />
            <Work />
            <Research base={base} />
            <Projects base={base} />
            <Contact />
          </>
        )}
        {page.kind === 'research' && <ResearchArticle slug={page.slug} base={base} />}
        {page.kind === 'beri' && <BeriCaseStudy base={base} />}
        {page.kind === 'notfound' && (
          <section className="p1-hero p1-hero--nf">
            <div className="p1-wrap">
              <h1 className="p1-name">Not found</h1>
              <p className="p1-lede">
                Nothing lives at this address.{' '}
                <Link to={`${base}/`} className="p1-more">
                  Back home <Arrow />
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
