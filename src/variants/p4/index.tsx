/*
 * P4 "Creative, restrained". A plain page (work, research, projects, contact) where the craft is in four details:
 *  1. Type that settles: the name and each section heading arrive a little condensed and heavy, then relax to their
 *     resting width and weight on Instrument Sans's wdth and wght axes. Once, as they enter. Scaled by --k/--t.
 *  2. The action row: each link has its own micro-interaction (Actions.tsx).
 *  3. Experience rows open with a Framer layout animation, and a single hover highlight glides between them (Work.tsx).
 *  4. A slim bar that drops in once the hero's actions scroll away: name, section index with a gliding marker, the
 *     five links, and a scroll-linked progress hairline (CSS scroll-driven animation, no JS).
 * Type: Instrument Sans Variable (wght 400–700, wdth 75–100) + Geist Mono for dates and meta. Latin-only faces.
 * Colour: warm graphite, three greys, one apricot accent used for focus, progress and state, never for decoration.
 */
import { useEffect, useRef, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { person } from '../../content/site'
import { Links } from '../../shared/Links'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link, useRouter } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { line } from './copy'
import { Actions, useCopyEmail } from './Actions'
import { Work } from './Work'
import { Research, Projects, Arrow } from './Research'
import './p4.css'

const SECTIONS = [
  { id: 'work', label: 'Work' },
  { id: 'research', label: 'Research' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
] as const

/** Scroll to a section without touching the URL (a hash change would re-route the app). */
function jump(id: string, reduced: boolean) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

/* ---------------- chrome ---------------- */

function Bar({ base, home }: { base: string; home: boolean }) {
  const m = useMotionPrefs()
  const [shown, setShown] = useState(!home)
  const [active, setActive] = useState<string | null>(null)

  // Show once the hero's actions have scrolled out above the viewport; they are the same five links.
  useEffect(() => {
    if (!home) return setShown(true)
    const acts = document.querySelector('.p4-hero .p4-acts')
    if (!acts) return
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(acts)
    return () => io.disconnect()
  }, [home])

  // Which section holds the middle of the screen.
  useEffect(() => {
    if (!home) return
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-45% 0px -54% 0px' },
    )
    els.forEach((el) => io.observe(el))
    const top = new IntersectionObserver(([e]) => e.isIntersecting && setActive(null))
    const hero = document.querySelector('.p4-hero')
    if (hero) top.observe(hero)
    return () => {
      io.disconnect()
      top.disconnect()
    }
  }, [home])

  return (
    <header className="p4-bar" data-shown={shown || undefined}>
      <div className="p4-bar__in">
        <Link
          to={`${base}/`}
          className="p4-bar__name"
          onClick={(e) => {
            if (!home) return
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: m.reduced ? 'auto' : 'smooth' })
          }}
        >
          {person.name}
        </Link>
        <nav className="p4-bar__nav" aria-label="Sections">
          {SECTIONS.map((s) => {
            const on = active === s.id
            const inner = (
              <>
                {s.label}
                {on && <motion.span layoutId="p4-nav-mark" className="p4-bar__mark" transition={m.spring(420)} aria-hidden="true" />}
              </>
            )
            return home ? (
              <a
                key={s.id}
                href={`#${s.id}`}
                aria-current={on ? 'location' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  jump(s.id, m.reduced)
                }}
              >
                {inner}
              </a>
            ) : (
              <Link key={s.id} to={`${base}/#${s.id}`}>
                {s.label}
              </Link>
            )
          })}
        </nav>
        <Links className="p4-bar__links" mode="icon" size={17} />
      </div>
      <span className="p4-bar__progress" aria-hidden="true" />
    </header>
  )
}

/** Headings settle once as they enter. Headings already on screen at hydration are left alone (no flash). */
function useSettle(root: React.RefObject<HTMLDivElement | null>, key: string) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const hs = [...el.querySelectorAll<HTMLElement>('.p4-h2')]
    for (const h of hs) if (h.getBoundingClientRect().top < innerHeight) h.dataset.seen = ''
    el.dataset.armed = ''
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting) {
            ;(e.target as HTMLElement).dataset.seen = ''
            io.unobserve(e.target)
          }
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    hs.filter((h) => !('seen' in h.dataset)).forEach((h) => io.observe(h))
    return () => io.disconnect()
  }, [root, key])
}

function Hero() {
  return (
    <section className="p4-hero" aria-labelledby="p4-name">
      <div className="p4-hero__in">
        <h1 id="p4-name" className="p4-name">
          {person.name}
        </h1>
        <p className="p4-line">{line}</p>
        <Actions />
      </div>
    </section>
  )
}

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <motion.section layout="position" id={id} className="p4-sec" tabIndex={-1} aria-labelledby={`${id}-h`}>
      <div className="p4-sec__side">
        <h2 id={`${id}-h`} className="p4-h2">
          {title}
        </h2>
        {note && <p className="p4-meta p4-sec__note">{note}</p>}
      </div>
      <div className="p4-sec__body">{children}</div>
    </motion.section>
  )
}

function Contact() {
  const { copied, copy } = useCopyEmail()
  return (
    <>
      <p className="p4-contact__line">CS at the University of Victoria, class of {person.grad}. Email is fastest.</p>
      <a href={`mailto:${person.email}`} className="p4-mail" data-copied={copied || undefined} onClick={(e) => copy(e, true)} title="Copy email address">
        <span className="p4-mail__addr">{person.email}</span>
        <span className="p4-mail__hint" aria-hidden="true">
          <span>Copy</span>
          <span>Copied</span>
        </span>
      </a>
      <span className="p4-sr" role="status" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
      <Links className="p4-contact__links" mode="label" only={['resume', 'github', 'linkedin', 'x']} />
    </>
  )
}

function Home({ base }: { base: string }) {
  return (
    <LayoutGroup id="p4">
      <Hero />
      <Section id="work" title="Work" note="Six roles · 2025–26">
        <Work />
      </Section>
      <Section id="research" title="Research" note="Five demos">
        <Research base={base} />
      </Section>
      <Section id="projects" title="Projects">
        <Projects base={base} />
      </Section>
      <Section id="contact" title="Contact">
        <Contact />
      </Section>
    </LayoutGroup>
  )
}

export default function P4({ page, base }: VariantProps) {
  const { path } = useRouter()
  const root = useRef<HTMLDivElement>(null)
  useSettle(root, path)
  const home = page.kind === 'home'
  return (
    <div className="p4" ref={root}>
      <a href="#main" className="p4-skip">
        Skip to content
      </a>
      <Bar base={base} home={home} />
      <main id="main" key={path} tabIndex={-1}>
        {home && <Home base={base} />}
        {page.kind === 'research' && (
          <div className="p4-page">
            <ResearchArticle slug={page.slug} base={base} />
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="p4-page">
            <BeriCaseStudy base={base} />
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="p4-hero p4-hero--nf">
            <div className="p4-hero__in">
              <p className="p4-meta">404</p>
              <h1 className="p4-name">Nothing here.</h1>
              <p className="p4-line">
                <Link to={`${base}/`} className="p4-go">
                  Back to the work <Arrow />
                </Link>
              </p>
            </div>
          </section>
        )}
      </main>
      <footer className="p4-foot">
        <span>© 2026 {person.name}</span>
        <span>{person.location}</span>
      </footer>
    </div>
  )
}
