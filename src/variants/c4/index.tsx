/*
 * c4 "Field notes". v4b's chronology done right: a single-column notebook of the work, newest year first, with
 * Tanuj's own photographs as the chapter plates. The Toronto timelapse is the 2026 plate and scrubs golden hour →
 * night as it passes; 2025 and earlier open on his Unsplash dusk shots. Inside each year, entries run in order of
 * importance: flagships get space (display number, prose, instrument), everything else is a one-line, logo-led row
 * that expands.
 *
 * Borrowed: v4b's chronology and display numbers (flagships only, no "450+"), a sticky year rail; v6's instrument
 * framing (why → instrument → result, the REAL provenance badges) and its Newsreader reading face; v9's italic warmth
 * in the headings (Fraunces Italic) and its dusk palette, here taken from the photographs themselves.
 *
 * Patterns (PORTFOLIO_TASTE.md §4): P30 pinned years (rail + phone chip), P17 odometer-style display numbers,
 * P19 one metric per flagship, P08 scroll-driven figure (timelapse plate), P01/P07 live demos in place,
 * P18 expandable index rows, P27 copy-email morph.
 *
 * Type: Newsreader 400/540 for reading (19–20px), Fraunces Italic 360 for display and headings, Geist Mono 460 for
 * dates and labels. All three are static latin-only instances cut for this variant (public/c4, 72 KB total), with
 * metric-matched Georgia / Menlo fallbacks. Ground: warm paper-black; one accent (golden-hour amber) means "live".
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { person, workLinkOrder } from '../../content/site'
import { Links } from '../../shared/Links'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link, useRouter } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { Home } from './Home'
import { CHAPTERS, type ChapterId } from './chapters'
import { Arrow, jump } from './parts'
import './c4.css'

/* ---------------- phone / narrow: the year chip ---------------- */

function YearChip({ active }: { active: ChapterId | null }) {
  const m = useMotionPrefs()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const cur = CHAPTERS.find((c) => c.id === active)
  useEffect(() => {
    if (!open) return
    const off = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    addEventListener('pointerdown', off)
    addEventListener('keydown', esc)
    return () => {
      removeEventListener('pointerdown', off)
      removeEventListener('keydown', esc)
    }
  }, [open])
  useEffect(() => {
    if (!active) setOpen(false)
  }, [active])
  return (
    <div className="c4-chip" ref={box} data-show={active && active !== 'contact' ? '' : undefined}>
      <button type="button" className="c4-chip__b" aria-expanded={open} aria-haspopup="true" aria-label={`Chapter: ${cur?.label ?? ''}. Jump to another`} onClick={() => setOpen((o) => !o)}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={cur?.id ?? 'none'}
            className="c4-chip__v"
            initial={{ opacity: 0, y: 8 * m.k }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 * m.k }}
            transition={{ duration: m.dur(0.22), ease: [0.23, 1, 0.32, 1] }}
          >
            {cur?.label}
          </motion.span>
        </AnimatePresence>
        <svg className="c4-chip__caret" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            className="c4-chip__menu"
            initial={{ opacity: 0, scale: m.reduced ? 1 : 0.96, y: -4 * m.k }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: m.reduced ? 1 : 0.98, transition: { duration: m.dur(0.12) } }}
            transition={{ duration: m.dur(0.18), ease: [0.23, 1, 0.32, 1] }}
          >
            {[...CHAPTERS, { id: 'contact' as const, label: 'Contact', place: 'Write to me', toc: '' }].map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-current={c.id === active ? 'location' : undefined}
                  onClick={() => {
                    setOpen(false)
                    jump(c.id, m.reduced)
                  }}
                >
                  <span className="c4-chip__y">{c.label}</span>
                  <span className="c4-chip__p">{c.place}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------------- wide screens: the year rail ---------------- */

function Rail({ active }: { active: ChapterId | null }) {
  const m = useMotionPrefs()
  return (
    <nav className="c4-rail" aria-label="Years" data-show={active ? '' : undefined}>
      <ol>
        {CHAPTERS.map((c) => (
          <li key={c.id}>
            <button type="button" aria-current={c.id === active ? 'location' : undefined} onClick={() => jump(c.id, m.reduced)}>
              <span className="c4-rail__tick" aria-hidden="true" />
              <span className="c4-rail__y">{c.label}</span>
              <span className="c4-rail__p">{c.place}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/* ---------------- chrome ---------------- */

function Nav({ base, home, active }: { base: string; home: boolean; active: ChapterId | null }) {
  const m = useMotionPrefs()
  return (
    <header className="c4-nav">
      <div className="c4-nav__in">
        <div className="c4-nav__l" data-chip={home && active && active !== 'contact' ? '' : undefined}>
          <Link
            to={`${base}/`}
            className="c4-nav__name"
            onClick={(e) => {
              if (!home) return
              e.preventDefault()
              scrollTo({ top: 0, behavior: m.reduced ? 'auto' : 'smooth' })
            }}
          >
            {person.name}
          </Link>
          {home && <YearChip active={active} />}
        </div>
        <Links className="c4-nav__links" mode="icon" size={18} only={workLinkOrder} />
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="c4-foot">
      <div className="c4-col c4-foot__in">
        <span>© 2026 {person.name}</span>
        <span>Set in Newsreader, Fraunces and Geist Mono. Photographs mine.</span>
      </div>
    </footer>
  )
}

export default function C4({ page, base }: VariantProps) {
  const { path } = useRouter()
  const [active, setActive] = useState<ChapterId | null>(null)
  const onActive = useCallback((id: ChapterId | null) => setActive(id), [])
  const home = page.kind === 'home'
  return (
    <div className="c4">
      <a href="#main" className="c4-skip">
        Skip to content
      </a>
      <Nav base={base} home={home} active={home ? active : null} />
      {home && <Rail active={active} />}
      <main id="main" key={path}>
        {home && <Home base={base} onActive={onActive} />}
        {page.kind === 'research' && (
          <div className="c4-page">
            <ResearchArticle slug={page.slug} base={base} />
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="c4-page">
            <BeriCaseStudy base={base} />
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="c4-hero c4-hero--nf c4-col">
            <p className="c4-sub">404</p>
            <h1 className="c4-name">Not in the notebook.</h1>
            <p className="c4-lede">
              <Link to={`${base}/`} className="c4-go">
                Back to the notes <Arrow />
              </Link>
            </p>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
