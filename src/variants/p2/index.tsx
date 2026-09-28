/*
 * P2 "SWE classic". The two-column engineer's portfolio, done carefully.
 * Desktop: a pinned left column (name, line, actions, a section index that tracks scroll) and a scrolling right
 * column of entries on one grid: a date gutter, then the content. Experience rows are disclosures (bullets and the
 * metric behind a tap). Research and projects are title, hook, a mono stack line, "Run demo" (mounts the demo in
 * place) and "Write-up →". Mobile stacks it, with a compact bar that slides in once the first screen is gone.
 *
 * Type: Inter Variable for everything set in prose, Geist Mono for dates, stacks and numbers (tabular figures).
 * Latin-only @font-face, 48 + 23 KB, metric-matched local fallbacks. Colour: cool graphite, two greys, one blue.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { person, beri, links } from '../../content/site'
import { useCommunity } from '../../content/useContent'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { OrgTile } from '../../shared/OrgLogo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import { Show } from '../../lib/labprefs'
import { useMotionPrefs, type MotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { jobs, researchEntries, more, type Entry, type Job } from './data'
import './p2.css'

const SECTIONS = [
  { id: 'experience', label: 'Experience' },
  { id: 'research', label: 'Research' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

/** Scroll to an element without touching the URL (a hash change would re-route the app). */
function jump(id: string, reduced: boolean) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

const ease = [0.23, 1, 0.32, 1] as const
/** Height-and-fade for disclosures; springs follow the lab's motion level, reduced motion gets a short fade. */
const reveal = (m: MotionPrefs) => ({
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { height: m.spring(380), opacity: { duration: m.dur(0.24), delay: m.dur(0.06), ease } } },
  exit: { height: 0, opacity: 0, transition: { height: { duration: m.dur(0.22), ease }, opacity: { duration: m.dur(0.12) } } },
})

const Arrow = ({ out = false }: { out?: boolean }) => (
  <svg className="p2-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    {out ? <path d="M3.5 8.5l5-5M4.5 3.5h4v4" stroke="currentColor" strokeWidth="1.4" /> : <path d="M1.5 6h8.5M6.5 2.5L10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" />}
  </svg>
)

/* ---------------- scroll bookkeeping (IntersectionObserver only) ---------------- */

/** Which home section sits under the reading line (35% from the top). The page end counts as Contact. */
function useActiveSection(on: boolean) {
  const [active, setActive] = useState<SectionId>('experience')
  useEffect(() => {
    if (!on) return
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive(e.target.id as SectionId)
      },
      { rootMargin: '-35% 0px -64% 0px' },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    const end = document.getElementById('p2-end')
    const io2 = new IntersectionObserver(([e]) => e.isIntersecting && setActive('contact'))
    if (end) io2.observe(end)
    return () => {
      io.disconnect()
      io2.disconnect()
    }
  }, [on])
  return active
}

/** Entrances, once. Anything already on screen at hydration stays put; the rest rises in as it arrives. */
function useReveal(on: boolean) {
  useEffect(() => {
    if (!on) return
    const els = [...document.querySelectorAll<HTMLElement>('.p2 [data-reveal]')].filter((el) => el.getBoundingClientRect().top > innerHeight)
    els.forEach((el) => el.classList.add('p2-pre'))
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return
          e.target.classList.add('p2-in')
          e.target.classList.remove('p2-pre')
          io.unobserve(e.target)
        }),
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [on])
}

/* ---------------- chrome ---------------- */

/** Compact bar: name + the five actions. On home it waits below the first screen (phones and tablets only). */
function Bar({ base, home, show }: { base: string; home: boolean; show: boolean }) {
  const m = useMotionPrefs()
  return (
    <header className="p2-bar" data-home={home || undefined} data-on={show || !home || undefined}>
      <div className="p2-bar__in">
        {home ? (
          <a
            href="#top"
            className="p2-bar__name"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: m.reduced ? 'auto' : 'smooth' })
            }}
          >
            {person.name}
          </a>
        ) : (
          <Link to={`${base}/`} className="p2-bar__name">
            <Arrow /> {person.name}
          </Link>
        )}
        <Links className="p2-bar__acts" mode="icon" size={17} />
      </div>
    </header>
  )
}

function Actions() {
  return <Links className="p2-acts" mode="both" size={17} />
}

function Side({ active }: { active: SectionId }) {
  const m = useMotionPrefs()
  return (
    <div className="p2-side">
      <header className="p2-hero" id="top">
        <p className="p2-kicker p2-rise" style={{ ['--i' as string]: 0 }}>
          Software engineer · CS at UVic ’27
        </p>
        <h1 className="p2-name p2-rise" style={{ ['--i' as string]: 1 }}>
          {person.name}
        </h1>
        <p className="p2-line p2-rise" style={{ ['--i' as string]: 2 }}>
          I build ML systems and study what language models do on the inside.
        </p>
        <div className="p2-rise" style={{ ['--i' as string]: 3 }}>
          <Actions />
        </div>
      </header>
      <nav className="p2-index p2-rise" style={{ ['--i' as string]: 4 }} aria-label="Sections">
        <ol>
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={active === s.id ? 'true' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  jump(s.id, m.reduced)
                }}
              >
                <span className="p2-index__n">0{i + 1}</span>
                <span className="p2-index__rule" aria-hidden="true" />
                <span>{s.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <Footer className="p2-foot--side" />
    </div>
  )
}

function Head({ id, children, count }: { id: string; children: ReactNode; count?: string }) {
  return (
    <h2 className="p2-h2" id={`${id}-h`} data-reveal>
      <span>{children}</span>
      {count && <span className="p2-h2__count">{count}</span>}
    </h2>
  )
}

/* ---------------- experience ---------------- */

function JobRow({ j }: { j: Job }) {
  const [open, setOpen] = useState(false)
  const m = useMotionPrefs()
  const id = `p2-job-${j.logo}`
  return (
    <li className="p2-job" data-open={open || undefined} data-reveal>
      <button type="button" className="p2-job__row" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>
        <span className="p2-when">{j.when}</span>
        <OrgTile org={j.logo} size={36} className="p2-tile" />
        <span className="p2-job__main">
          <span className="p2-job__title">
            {j.role}
            <span className="p2-sep" aria-hidden="true">
              {' · '}
            </span>
            <span className="sr-only">, </span>
            <span className="p2-job__org">{j.org}</span>
          </span>
          <span className="p2-job__line">{j.line}</span>
        </span>
        <span className="p2-plus" aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="more" id={id} className="p2-job__more" {...reveal(m)}>
            <div className="p2-job__inner">
              <ul className="p2-bullets">
                {j.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="p2-job__meta">
                <span className="p2-metric">{j.metric}</span>
                <span>{j.where}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function Experience() {
  return (
    <section id="experience" className="p2-sec" tabIndex={-1} aria-labelledby="experience-h">
      <Head id="experience">
        Experience
      </Head>
      <ul className="p2-jobs">
        {jobs.map((j) => (
          <JobRow key={j.key} j={j} />
        ))}
      </ul>
    </section>
  )
}

/* ---------------- research + projects ---------------- */

function EntryRow({ e, base, open: initial = false, hero = false }: { e: Entry; base: string; open?: boolean; hero?: boolean }) {
  const [open, setOpen] = useState(initial)
  const m = useMotionPrefs()
  const id = `p2-demo-${e.key}`
  return (
    <div className="p2-item" data-open={open || undefined} role="listitem">
      <article className="p2-entry" aria-labelledby={`${id}-t`} data-reveal>
        {/* date and stack: a two-line gutter on wide screens, one kicker line on phones */}
        <p className="p2-meta p2-meta--col">
          {[e.when, ...e.tags].join('\n')}
        </p>
        <div className="p2-entry__main">
          <p className="p2-meta p2-meta--row">{[e.when, ...e.tags].join(' · ')}</p>
          <h3 className="p2-entry__title" id={`${id}-t`}>
            {e.title}
            {e.flag && <Flag note={e.flag} />}
          </h3>
          <p className="p2-entry__hook">{e.hook}</p>
          <div className="p2-entry__acts">
            {e.demo && (
              <button type="button" className="p2-btn p2-btn--run" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>
                <span className="p2-run" aria-hidden="true" />
                {open ? 'Hide demo' : e.run}
              </button>
            )}
            {e.to && (
              <Link to={`${base}${e.to}`} className="p2-btn p2-btn--go">
                {e.toLabel} <Arrow />
              </Link>
            )}
            {e.href && (
              <a href={e.href} target="_blank" rel="noopener" className="p2-btn p2-btn--go">
                {e.hrefLabel} <Arrow out />
              </a>
            )}
          </div>
        </div>
      </article>
      {e.demo && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div key="demo" id={id} className="p2-entry__demo" {...reveal(m)}>
              <div className="p2-entry__demo-in">
                <Demo kind={e.demo} hero={hero} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

function Research({ base }: { base: string }) {
  return (
    <section id="research" className="p2-sec" tabIndex={-1} aria-labelledby="research-h">
      <Head id="research" count="5 live demos">
        Research
      </Head>
      <div className="p2-entries" role="list">
        {researchEntries.map((e, i) => (
          <EntryRow key={e.key} e={e} base={base} open={i === 0} hero={i === 0} />
        ))}
      </div>
    </section>
  )
}

const marmot: Entry = {
  key: 'marmotsat',
  when: 'Jul 2026',
  title: 'MarmotSat, in orbit',
  hook: 'The CubeSat running the onboard-computer firmware I led. Launched on a Falcon 9.',
  tags: ['C', 'YAMCS'],
  demo: 'orbit',
  run: 'Track it live',
}
const beriEntry: Entry = {
  key: 'beri',
  when: 'Since 2025',
  title: 'Beri',
  hook: 'A food app I’m building for iOS: find a recipe, cook it, post it.',
  tags: beri.stack.slice(0, 3),
  to: '/beri',
  toLabel: 'Case study',
}

function MoreList() {
  const community = useCommunity()
  const rows = [...more, ...community.map((c) => ({ title: c.title, note: c.role, when: c.when, href: c.href, flag: undefined as string | undefined }))]
  return (
    <details className="p2-more" data-reveal>
      <summary>
        <span className="p2-plus" aria-hidden="true" />
        <span>More: hackathons, Kaggle, open source</span>
        <span className="p2-h2__count">{rows.length}</span>
      </summary>
      <ul className="p2-more__list">
        {rows.map((x) => {
          const inner = (
            <>
              <span className="p2-when">{x.when}</span>
              <span className="p2-more__t">
                {x.title}
                {x.flag && <Flag note={x.flag} />}
              </span>
              <span className="p2-more__n">{x.note}</span>
              {x.href && <Arrow out />}
            </>
          )
          return (
            <li key={x.title}>
              {x.href ? (
                <a className="p2-more__row" href={x.href} target="_blank" rel="noopener">
                  {inner}
                </a>
              ) : (
                <div className="p2-more__row">{inner}</div>
              )}
            </li>
          )
        })}
      </ul>
    </details>
  )
}

function Projects({ base }: { base: string }) {
  return (
    <section id="projects" className="p2-sec" tabIndex={-1} aria-labelledby="projects-h">
      <Head id="projects">Projects</Head>
      <div className="p2-entries" role="list">
        <EntryRow e={marmot} base={base} />
        <Show when="beri">
          <EntryRow e={beriEntry} base={base} />
        </Show>
      </div>
      <MoreList />
    </section>
  )
}

/* ---------------- contact ---------------- */

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const m = useMotionPrefs()
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <button
      type="button"
      className="p2-btn p2-copy"
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
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? 'y' : 'n'}
          initial={{ opacity: 0, y: 8 * m.k }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 * m.k }}
          transition={{ duration: m.dur(0.18), ease }}
        >
          {copied ? 'Copied' : 'Copy'}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
    </button>
  )
}

function Contact() {
  return (
    <section id="contact" className="p2-sec p2-contact" tabIndex={-1} aria-labelledby="contact-h">
      <Head id="contact">Contact</Head>
      <div data-reveal>
        <p className="p2-contact__line">Email is the fastest way to reach me.</p>
        <div className="p2-contact__mail">
          <a href={links.email.href} className="p2-contact__addr">
            {person.email}
          </a>
          <CopyEmail />
        </div>
      </div>
      <div id="p2-end" aria-hidden="true" />
    </section>
  )
}

function Footer({ className = '' }: { className?: string }) {
  return (
    <footer className={`p2-foot ${className}`}>
      <p>© 2026 {person.name}. Set in Inter and Geist Mono.</p>
    </footer>
  )
}

/* ---------------- page ---------------- */

function Home({ base }: { base: string }) {
  const active = useActiveSection(true)
  useReveal(true)
  return (
    <div className="p2-shell">
      <Side active={active} />
      <div className="p2-col">
        <Experience />
        <Research base={base} />
        <Projects base={base} />
        <Contact />
        <Footer className="p2-foot--col" />
      </div>
    </div>
  )
}

/** The bar shows once the hero has scrolled away (home) or always (inner pages). */
function useHeroGone(home: boolean) {
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (!home) return
    // the bar takes over once the hero's action row has scrolled under it
    const el = document.querySelector('#top .p2-acts')
    if (!el) return
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: '-56px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [home])
  return gone
}

export default function P2({ page, base }: VariantProps) {
  const { path } = useRouter()
  const home = page.kind === 'home'
  const gone = useHeroGone(home)
  return (
    <div className="p2">
      <a href="#main" className="p2-skip">
        Skip to content
      </a>
      <Bar base={base} home={home} show={gone} />
      <main id="main" key={path} tabIndex={-1}>
        {home && <Home base={base} />}
        {page.kind === 'research' && (
          <div className="p2-page">
            <ResearchArticle slug={page.slug} base={base} />
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="p2-page">
            <BeriCaseStudy base={base} />
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="p2-nf">
            <p className="p2-kicker">404</p>
            <h1 className="p2-name">Nothing at this address.</h1>
            <p className="p2-line">
              <Link to={`${base}/`} className="p2-btn p2-btn--go">
                Back to the portfolio <Arrow />
              </Link>
            </p>
          </section>
        )}
      </main>
      {!home && <Footer />}
    </div>
  )
}
