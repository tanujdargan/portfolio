/*
 * S1 "Index". P2's two-column engineer's site, taken to studio polish: the right column opens with the work as a big
 * live index, and a lens previews each demo under the cursor. Koto's restraint (one lit thing, mono metadata),
 * Gil Huybrecht's focus-dim and in-place detail, basement's hairline spec sheets.
 *
 * Patterns (research/PATTERNS.md): 6 per-letter roll · 10 lerped hover preview with velocity tilt · 11 focus-dim ·
 * 12 in-place exhibit · 18 shared-element View Transition · 1 masked word rise (Split) · 31 context label that
 * re-scrambles · 25 Lenis · Mobile equivalents 4 (scroll-position active row) and 8 (press feedback).
 * Type: Geist + Geist Mono (latin, variable, 52 KB). Colour: graphite #0b0b0c, one grey ramp, the work's accent as an event.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { person, links } from '../../content/site'
import { works, roles, type Work, type WorkKey } from '../../content/work'
import { Links } from '../../shared/Links'
import { OrgTile } from '../../shared/OrgLogo'
import { Poster } from '../../shared/Poster'
import { Split } from '../../shared/Split'
import { Scramble } from '../../shared/Scramble'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link, useRouter } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { useLenis, scrollToEl } from '../../lib/lenis'
import type { VariantProps } from '../../routes'
import { WorkIndex } from './Work'
import { Roll, Draw, Arrow, useIso, vt, VT, clearVT } from './bits'
import './s1.css'

const SECTIONS = [
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

const EASE_OUT = [0.16, 1, 0.3, 1] as const
const EASE_IO = [0.65, 0, 0.35, 1] as const

/* ---------------- scroll bookkeeping ---------------- */

function useActiveSection() {
  const [active, setActive] = useState<SectionId>('work')
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id as SectionId)), {
      rootMargin: '-35% 0px -64% 0px',
    })
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    const end = document.getElementById('s1-end')
    const io2 = new IntersectionObserver(([e]) => e.isIntersecting && setActive('contact'))
    if (end) io2.observe(end)
    return () => {
      io.disconnect()
      io2.disconnect()
    }
  }, [])
  return active
}

/** Section entrances, once. Anything on screen at hydration stays put; the rest waits and arrives as it enters. */
function useReveal() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('.s1 [data-reveal]')].filter((el) => el.getBoundingClientRect().top > innerHeight * 0.92)
    els.forEach((el) => (el.dataset.pre = ''))
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return
          const el = e.target as HTMLElement
          delete el.dataset.pre
          el.dataset.in = ''
          io.unobserve(el)
        }),
      { rootMargin: '0px 0px -12% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/** The compact bar shows once the signature's links have scrolled away (home, phones) or always (inner pages). */
function useSigGone(home: boolean) {
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (!home) return
    const el = document.querySelector('.s1-sig .s1-acts')
    if (!el) return
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: '-52px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [home])
  return gone
}

/* ---------------- chrome ---------------- */

function Bar({ base, home, show }: { base: string; home: boolean; show: boolean }) {
  const m = useMotionPrefs()
  return (
    <header className="s1-bar" data-home={home || undefined} data-on={show || !home || undefined}>
      {home ? (
        <a
          href="#top"
          className="s1-bar__name"
          onClick={(e) => {
            e.preventDefault()
            scrollToEl(0, m.reduced)
          }}
        >
          {person.name}
        </a>
      ) : (
        <Link to={`${base}/`} className="s1-bar__name">
          {person.name}
        </Link>
      )}
      <Links className="s1-bar__acts" mode="icon" size={16} />
    </header>
  )
}

function Readout({ peek, active }: { peek: WorkKey | null; active: SectionId }) {
  const w = peek ? works.find((x) => x.key === peek)! : null
  const text = w
    ? `${w.n}/06 ${w.short} · ${w.tag}`.toUpperCase()
    : active === 'work'
      ? '06 works · 06 live demos'.toUpperCase()
      : active === 'experience'
        ? '06 roles · 2025–26'.toUpperCase()
        : person.email.toUpperCase()
  return (
    <p className="s1-read" style={w ? { ['--w' as string]: w.accent } : undefined} data-lit={w ? '' : undefined} aria-hidden="true">
      <span className="s1-read__dot" />
      <Scramble text={text} trigger="change" duration={460} />
    </p>
  )
}

function Side({ active, peek }: { active: SectionId; peek: WorkKey | null }) {
  const m = useMotionPrefs()
  return (
    <div className="s1-side">
      <header className="s1-sig" id="top">
        <h1 className="s1-sig__name s1-in" style={{ ['--i' as string]: 0 }}>
          {person.name}
        </h1>
        <p className="s1-sig__line s1-in" style={{ ['--i' as string]: 1 }}>
          ML systems and interpretability · CS at UVic ’27
        </p>
        <Links className="s1-acts s1-in" mode="both" size={16} />
      </header>
      <nav className="s1-index s1-in" style={{ ['--i' as string]: 3 }} aria-label="Sections">
        <ol>
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={active === s.id ? 'true' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  const el = document.getElementById(s.id)
                  if (!el) return
                  scrollToEl(el, m.reduced)
                  el.focus({ preventScroll: true })
                }}
              >
                <span className="s1-index__n">0{i + 1}</span>
                <span className="s1-index__rule" aria-hidden="true" />
                <span className="s1-index__l">{s.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="s1-side__foot s1-in" style={{ ['--i' as string]: 4 }}>
        <Readout peek={peek} active={active} />
      </div>
    </div>
  )
}

function Head({ id, n, a, b }: { id: string; n: string; a: string; b: string }) {
  return (
    <h2 className="s1-head" id={id}>
      <span className="s1-num">{n}</span>
      <span className="s1-head__txt">
        <Split className="s1-head__a" text={a} />
        <Split className="s1-head__b" text={b} offset={a.split(' ').length} />
      </span>
    </h2>
  )
}

/* ---------------- experience ---------------- */

function Job({ r, i, open, onToggle }: { r: (typeof roles)[number]; i: number; open: boolean; onToggle: () => void }) {
  const m = useMotionPrefs()
  const id = `s1-job-${r.logo}`
  return (
    <li className="s1-job" data-open={open || undefined} style={{ ['--i' as string]: i }}>
      <button type="button" className="s1-job__btn" aria-expanded={open} aria-controls={open ? id : undefined} onClick={onToggle}>
        <span className="s1-job__when">{r.when}</span>
        <OrgTile org={r.logo} size={36} className="s1-job__tile" />
        <span className="s1-job__title">
          {r.role}
          <span className="s1-job__sep" aria-hidden="true">
            {' · '}
          </span>
          <span className="sr-only">, </span>
          <span className="s1-job__org">{r.org}</span>
        </span>
        <span className="s1-job__line">{r.line}</span>
        <span className="s1-plus" aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="more"
            id={id}
            className="s1-job__more"
            initial={{ height: 0 }}
            animate={{ height: 'auto', transition: { duration: m.dur(0.5), ease: EASE_OUT } }}
            exit={{ height: 0, transition: { duration: m.dur(0.333), ease: EASE_IO } }}
          >
            <div className="s1-job__in">
              <ul className="s1-bullets">
                {r.bullets.map((b, j) => (
                  <li key={b} style={{ ['--i' as string]: j }}>
                    {b}
                  </li>
                ))}
              </ul>
              <p className="s1-job__meta">
                <Scramble className="s1-job__metric" text={r.metric} trigger="none" run={1} />
                <span>{r.where}</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

function Experience() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section id="experience" className="s1-sec s1-xp" aria-labelledby="experience-h" tabIndex={-1} data-reveal>
      <Head id="experience-h" n="02" a="Experience" b="Six roles, 2025–26." />
      <ol className="s1-jobs">
        {roles.map((r, i) => (
          <Job key={r.org} r={r} i={i} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
        ))}
      </ol>
    </section>
  )
}

/* ---------------- contact ---------------- */

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <button
      type="button"
      className="s1-copy"
      data-copied={copied || undefined}
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
      <span className="s1-copy__stack" aria-hidden="true">
        <span>Copy</span>
        <span>Copied</span>
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email address copied' : 'Copy email address'}
      </span>
    </button>
  )
}

function Contact() {
  return (
    <section id="contact" className="s1-sec s1-contact" aria-labelledby="contact-h" tabIndex={-1} data-reveal>
      <Head id="contact-h" n="03" a="Contact" b="Email is fastest." />
      <div className="s1-mail">
        <a href={links.email.href} className="s1-mail__a s1-rollhost">
          <Roll text={person.email} />
        </a>
        <CopyEmail />
      </div>
      <Links className="s1-contact__links" mode="label" />
      <p className="s1-foot">© 2026 {person.name}. Set in Geist and Geist Mono.</p>
      <div id="s1-end" aria-hidden="true" />
    </section>
  )
}

/* ---------------- home ---------------- */

function Home({ base }: { base: string }) {
  const active = useActiveSection()
  const [peek, setPeek] = useState<WorkKey | null>(null)
  const onPeek = useCallback((k: WorkKey | null) => setPeek(k), [])
  useReveal()
  // the shared names that carried a title back from a write-up are spent once the transition has run
  useEffect(() => {
    const t = setTimeout(() => {
      clearVT()
      vt.key = null
    }, 1200)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="s1-home">
      <Side active={active} peek={peek} />
      <div className="s1-col">
        <WorkIndex base={base} onPeek={onPeek} />
        <Experience />
        <Contact />
      </div>
    </div>
  )
}

/* ---------------- inner pages ---------------- */

/** The top of a write-up: the row's number, title and metric land here as shared elements, then the poster draws. */
function Cover({ w, base, title, meta, metric, n }: { w?: Work; base: string; title?: string; meta: string; metric?: string; n?: string }) {
  useIso(() => {
    vt.key = w?.key ?? null
  }, [w?.key])
  const named = (v: string) => (w ? { viewTransitionName: v } : undefined)
  return (
    <header className="s1-cover" style={w ? { ['--w' as string]: w.accent } : undefined}>
      <p className="s1-cover__crumb">
        <Link to={w ? `${base}/#w-${w.key}` : `${base}/`} className="s1-back">
          <Arrow back /> Index
        </Link>
        <span>{meta}</span>
      </p>
      {title && (
        <div className="s1-cover__row">
          <span data-vt className="s1-cover__n" style={named(VT.n)}>
            {n}
          </span>
          <p data-vt className="s1-cover__t" style={named(VT.t)}>
            {title}
          </p>
          {metric && (
            <span data-vt className="s1-cover__m" style={named(VT.m)}>
              {metric}
            </span>
          )}
        </div>
      )}
      {w && (
        <div className="s1-cover__p">
          <Draw>
            <Poster k={w.key} label />
          </Draw>
        </div>
      )}
      <span className="s1-cover__rule" aria-hidden="true" />
    </header>
  )
}

function ResearchPage({ slug, base }: { slug: string; base: string }) {
  const w = works.find((x) => x.slug === slug)
  return (
    <div className="s1-page" style={w ? { ['--accent' as string]: w.accent } : undefined}>
      {w && <Cover w={w} base={base} title={w.short} meta={w.meta} metric={w.metric} n={w.n} />}
      <ResearchArticle slug={slug} base={base} />
    </div>
  )
}

/* ---------------- root ---------------- */

export default function S1({ page, base }: VariantProps) {
  const { path } = useRouter()
  const home = page.kind === 'home'
  const gone = useSigGone(home)
  useLenis(true)
  return (
    <div className="s1" data-page={page.kind}>
      <a href="#main" className="s1-skip">
        Skip to content
      </a>
      <Bar base={base} home={home} show={gone} />
      <main id="main" key={path} tabIndex={-1}>
        {home && <Home base={base} />}
        {page.kind === 'research' && <ResearchPage slug={page.slug} base={base} />}
        {page.kind === 'beri' && (
          <div className="s1-page">
            <Cover base={base} meta="A food app I’m building · iOS" />
            <BeriCaseStudy base={base} />
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="s1-nf" aria-labelledby="s1-nf-t">
            <p className="s1-num">404</p>
            <h1 id="s1-nf-t" className="s1-nf__t">
              <Scramble text="Not in the index." trigger="none" run={1} duration={800} />
            </h1>
            <p className="s1-nf__l">Nothing lives at this address.</p>
            <Link to={`${base}/`} className="s1-cta s1-rollhost">
              <Roll text="Back to the work" />
              <Arrow />
            </Link>
          </section>
        )}
      </main>
    </div>
  )
}
