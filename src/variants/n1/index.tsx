/*
 * N1 "Resolve". Round 8. Tanuj's brief: a good opening animation, then a normal, spaced-out, non-overwhelming site,
 * projects in order (Amazon, Apart Research, MarmotSat, …), demos one hover away.
 * Opening: the name decodes out of glyph noise on black, the title fades up, then the overlay dissolves while the name
 * flies into its real hero position (FLIP, Web Animations API). Once per session; click/key/scroll skips; reduced
 * motion and no-JS never see it. The full page is always in the prerendered HTML underneath.
 * Projects: rows expand in place after ~150ms of hover (or on focus / tap) to show the live demo.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { VariantProps } from '../../routes'
import { selected, amazonMetrics, more, roles, education } from '../../content/curated'
import { links, type LinkKey } from '../../content/site'
import { LinkIcon } from '../../shared/Links'
import { Logo } from '../../shared/Mark'
import { Demo } from '../../demos/Demo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import './n1.css'

const NAME = 'Tanuj Dargan'
const TITLE = 'ML engineer & researcher'
const SEEN = 'n1-intro-seen'

const sections = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
]

// Short titles for the rows; the full finding shows when a row opens.
const short: Record<string, { org: string; title: string; result: string }> = {
  amazon: { org: 'Amazon Robotics', title: 'LLM planning assistant, in production', result: '180+ sites' },
  lossmask: { org: 'Apart Research', title: 'Loss masking and shutdown distress', result: 'Calm output, negative inside' },
  orbit: { org: 'UVic CfAR', title: 'MarmotSat flight firmware', result: 'In orbit · NORAD 69912' },
  steering: { org: 'Independent', title: 'Steering a model along emotion directions', result: 'A switch, not a dial' },
  ocean: { org: 'SOLIDS Lab, UVic', title: 'Deep-water temperature from satellites', result: 'R² 0.936' },
}
const order = ['amazon', 'lossmask', 'orbit', 'steering', 'ocean']
const projects = order.map((id) => ({ ...selected.find((s) => s.id === id)!, ...short[id] }))

const socials: LinkKey[] = ['github', 'linkedin', 'x', 'email']

/* ---------- Opening ---------- */

const G = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/'
const noise = () => G[(Math.random() * G.length) | 0]

// Runs before paint on a fresh page load (it's in the prerendered HTML), so returning visitors and reduced-motion users
// never see a black frame. Client-side lab navigation doesn't execute it; the mount effect covers that path.
const gate = `try{if(sessionStorage.getItem('${SEEN}')||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('data-n1-skip','')}catch(e){}`

function Intro({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const [text, setText] = useState(NAME)
  const [stage, setStage] = useState<'idle' | 'decode' | 'title' | 'fly'>('idle')

  useEffect(() => {
    const el = root.current!
    let skip = false
    try {
      skip = !!sessionStorage.getItem(SEEN) || matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {}
    // a slow bundle: the CSS failsafe has already revealed the page, don't black it out again
    if (skip || getComputedStyle(el).visibility === 'hidden') return onDone()
    el.dataset.live = '' // stops the CSS failsafe; JS owns the timeline from here
    let raf = 0
    const timers: number[] = []
    let finished = false

    const fly = (fast: boolean) => {
      if (finished) return
      finished = true
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      setText(NAME)
      setStage('fly')
      try {
        sessionStorage.setItem(SEEN, '1')
      } catch {}
      const from = nameRef.current!
      const to = document.querySelector<HTMLElement>('.n1-name')
      const D = fast ? 320 : 820
      document.documentElement.classList.add('n1-entering')
      if (to) {
        const a = from.getBoundingClientRect()
        const b = to.getBoundingClientRect()
        const s = b.height / a.height
        from.animate(
          [{ transform: 'none' }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${s})` }],
          { duration: D, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', fill: 'forwards' },
        )
      }
      el.animate([{ backgroundColor: 'rgb(8 9 11 / 1)' }, { backgroundColor: 'rgb(8 9 11 / 0)' }], {
        duration: D * 0.8,
        delay: D * 0.2,
        easing: 'ease-out',
        fill: 'forwards',
      })
      timers.push(window.setTimeout(onDone, D + 20))
    }

    // 1. decode, left to right with jitter (≈900ms)
    setStage('decode')
    const D = 900
    const at = Array.from(NAME, (_, i) => (i / NAME.length) * 0.6 * D + Math.random() * 0.4 * D)
    const t0 = performance.now()
    let last = 0
    const tick = (now: number) => {
      const e = now - t0
      if (now - last > 45) {
        last = now
        setText(Array.from(NAME, (ch, i) => (ch === ' ' || e >= at[i] ? ch : noise())).join(''))
      }
      if (e < D) raf = requestAnimationFrame(tick)
      else setText(NAME)
    }
    raf = requestAnimationFrame(tick)
    // 2. title fades up, 3. collapse into the page
    timers.push(window.setTimeout(() => setStage('title'), 750))
    timers.push(window.setTimeout(() => fly(false), 1350))

    const skipNow = () => fly(true)
    const opts = { once: true, passive: true } as const
    addEventListener('pointerdown', skipNow, opts)
    addEventListener('keydown', skipNow, opts)
    addEventListener('wheel', skipNow, opts)
    addEventListener('touchmove', skipNow, opts)
    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      removeEventListener('pointerdown', skipNow)
      removeEventListener('keydown', skipNow)
      removeEventListener('wheel', skipNow)
      removeEventListener('touchmove', skipNow)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="n1-intro" ref={root} data-stage={stage} aria-hidden="true">
      <script dangerouslySetInnerHTML={{ __html: gate }} />
      <noscript>
        <style>{'.n1-intro{display:none}.n1 [data-intro] .n1-name{visibility:visible;animation:none}'}</style>
      </noscript>
      <div className="n1-intro__inner">
        {/* the invisible real name fixes the width, so noise glyphs never shift the line */}
        <span className="n1-intro__name" ref={nameRef}>
          <span className="n1-intro__sizer">{NAME}</span>
          <span className="n1-intro__live">{text}</span>
        </span>
        <span className="n1-intro__title">{TITLE}</span>
      </div>
    </div>
  )
}

/* ---------- Header ---------- */

function useActive() {
  const [active, setActive] = useState('about')
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), {
      rootMargin: '-35% 0px -60% 0px',
    })
    sections.forEach((s) => io.observe(document.getElementById(s.id)!))
    return () => io.disconnect()
  }, [])
  return active
}

function Header() {
  const active = useActive()
  return (
    <header className="n1-head">
      <div className="n1-head__in">
        <a className="n1-mono-mark" href="#about" aria-label="Tanuj Dargan, top">
          TD
        </a>
        <nav aria-label="Sections">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>
              {s.label}
            </a>
          ))}
          <a className="n1-resume" href={links.resume.href} target="_blank" rel="noopener">
            Resume <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </div>
    </header>
  )
}

/* ---------- Projects ---------- */

function Projects({ base }: { base: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const [snap, setSnap] = useState<string | null>(null) // the row closing instantly when another opens
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  const rows = useRef<Record<string, HTMLLIElement | null>>({})
  const anchor = useRef<{ id: string; top: number } | null>(null)
  const timer = useRef(0)

  const show = (id: string | null) => {
    window.clearTimeout(timer.current)
    if (id === open) return
    if (id && open) {
      // Switching rows: close the old one instantly and keep the new row's top under the cursor.
      anchor.current = { id, top: rows.current[id]!.getBoundingClientRect().top }
      setSnap(open)
    } else setSnap(null)
    if (id) setSeen((s) => (s.has(id) ? s : new Set(s).add(id)))
    setOpen(id)
  }
  const later = (id: string | null, ms: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => show(id), ms)
  }

  useLayoutEffect(() => {
    const a = anchor.current
    if (!a) return
    anchor.current = null
    const top = rows.current[a.id]!.getBoundingClientRect().top
    if (Math.abs(top - a.top) > 1) window.scrollBy(0, top - a.top)
  }, [open])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ol className="n1-projects">
      {projects.map((p) => {
        const isOpen = open === p.id
        return (
          <li
            key={p.id}
            ref={(el) => {
              rows.current[p.id] = el
            }}
            className="n1-proj"
            data-open={isOpen || undefined}
            data-snap={snap === p.id || undefined}
            onPointerMove={(e) => e.pointerType === 'mouse' && !isOpen && later(p.id, 150)}
            onPointerLeave={(e) => e.pointerType === 'mouse' && (isOpen ? later(null, 220) : window.clearTimeout(timer.current))}
          >
            <button
              className="n1-proj__head"
              aria-expanded={isOpen}
              aria-controls={`n1-p-${p.id}`}
              onFocus={(e) => e.target.matches(':focus-visible') && show(p.id)}
              onClick={(e) => {
                // touch and keyboard toggle; a mouse click on an already hover-opened row keeps it open
                const mouse = (e.nativeEvent as PointerEvent).pointerType === 'mouse'
                show(isOpen && !mouse ? null : p.id)
              }}
            >
              <span className="n1-proj__logo">{p.mark ? <Logo m={p.mark} w={p.mark === 'pearcare' ? 56 : 22} h={22} /> : <span className="n1-dot" />}</span>
              <span className="n1-proj__body">
                <span className="n1-proj__meta">
                  {p.org} · {p.when}
                </span>
                <span className="n1-proj__title">{p.title}</span>
              </span>
              <span className="n1-pill">{p.result}</span>
              <span className="n1-proj__chev" aria-hidden="true" />
            </button>
            <div className="n1-proj__panel" id={`n1-p-${p.id}`} role="region" aria-label={p.title}>
              <div className="n1-proj__clip">
                {seen.has(p.id) && (
                  <div className="n1-proj__inner">
                    <div className="n1-proj__demo">
                      {p.demo ? (
                        <Demo kind={p.demo} compact finding={p.id === 'lossmask' || undefined} />
                      ) : (
                        <dl className="n1-metrics">
                          {amazonMetrics.map((m) => (
                            <div key={m.l}>
                              <dt>{m.n}</dt>
                              <dd>{m.l}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                    <p className="n1-proj__finding">{p.finding}</p>
                    {p.slug && (
                      <Link className="n1-arrow" to={`${base}/research/${p.slug}`}>
                        Read the write-up <span aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------- Page ---------- */

function Home({ base }: { base: string }) {
  const [intro, setIntro] = useState(true)
  // the entrance stagger keys off this class; it stays until the page unmounts so late delays finish cleanly
  useEffect(() => () => document.documentElement.classList.remove('n1-entering'), [])
  return (
    <div data-intro={intro || undefined}>
      {intro && <Intro onDone={() => setIntro(false)} />}
      <Header />
      <main className="n1-main" id="n1-main">
        <section id="about" className="n1-hero" aria-label="About">
          <h1 className="n1-name">{NAME}</h1>
          <p className="n1-title n1-in" style={{ '--d': 0 } as React.CSSProperties}>
            {TITLE}
          </p>
          <p className="n1-lede n1-in" style={{ '--d': 1 } as React.CSSProperties}>
            I build production ML at <b>Amazon Robotics</b> and study what language models represent inside. CS at the
            University of Victoria, graduating April 2027.
          </p>
          <ul className="n1-socials n1-in" style={{ '--d': 2 } as React.CSSProperties}>
            {socials.map((k) => {
              const l = links[k]
              const ext = !l.href.startsWith('mailto:')
              return (
                <li key={k}>
                  <a href={l.href} {...(ext ? { target: '_blank', rel: 'noopener' } : {})} aria-label={l.label} title={l.label}>
                    <LinkIcon k={k} size={18} />
                  </a>
                </li>
              )
            })}
          </ul>
        </section>

        <section id="projects" className="n1-sec n1-in" style={{ '--d': 3 } as React.CSSProperties} aria-labelledby="n1-h-projects">
          <div className="n1-sec__head">
            <h2 className="n1-h" id="n1-h-projects">
              Selected work
            </h2>
            <span className="n1-hint">Hover a project to try it</span>
          </div>
          <Projects base={base} />
          <h3 className="n1-sub">Also</h3>
          <ul className="n1-more">
            {more.map((m) => {
              const inner = (
                <>
                  <b>{m.title}</b>
                  <span>{m.line}</span>
                </>
              )
              return (
                <li key={m.title}>
                  {m.href ? (
                    m.ext ? (
                      <a href={m.href} target="_blank" rel="noopener">
                        {inner}
                      </a>
                    ) : (
                      <Link to={`${base}${m.href}`}>{inner}</Link>
                    )
                  ) : (
                    <div>{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section id="experience" className="n1-sec" aria-labelledby="n1-h-exp">
          <h2 className="n1-h" id="n1-h-exp">
            Experience
          </h2>
          <ol className="n1-roles">
            {roles.map((r) => (
              <li key={r.org}>
                <span className="n1-when">{r.when}</span>
                <span className="n1-role">
                  <span className="n1-role__name">
                    <Logo m={r.mark} w={r.mark === 'pearcare' ? 52 : 18} h={18} />
                    <b>{r.org}</b>
                    <span>{r.role}</span>
                  </span>
                  <span className="n1-role__line">{r.line}</span>
                </span>
              </li>
            ))}
            <li>
              <span className="n1-when">Until {education.when}</span>
              <span className="n1-role">
                <span className="n1-role__name">
                  <Logo m="uvic" w={18} h={18} />
                  <b>{education.school}</b>
                  <span>{education.degree}</span>
                </span>
                <span className="n1-role__line">{education.note}.</span>
              </span>
            </li>
          </ol>
          <a className="n1-arrow" href={links.resume.href} target="_blank" rel="noopener">
            Full resume <span aria-hidden="true">↗</span>
          </a>
        </section>

        <section id="contact" className="n1-sec n1-contact" aria-labelledby="n1-h-contact">
          <h2 className="n1-h" id="n1-h-contact">
            Contact
          </h2>
          <p>Research, internships, or a question about the work. Email is fastest.</p>
          <a className="n1-email" href={links.email.href}>
            tanujd@uvic.ca <span aria-hidden="true">↗</span>
          </a>
        </section>
        <footer className="n1-foot">Victoria, BC · {new Date().getFullYear()}</footer>
      </main>
    </div>
  )
}

export default function N1({ page, base }: VariantProps) {
  return (
    <div className="n1" data-page={page.kind}>
      <a className="n1-skip" href="#n1-main">
        Skip to content
      </a>
      {page.kind === 'home' && <Home base={base} />}
      {page.kind !== 'home' && (
        <div className="n1-page">
          <Link to={`${base}/`} className="n1-arrow">
            <span aria-hidden="true">←</span> Tanuj Dargan
          </Link>
          <main id="n1-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="n1-name">Nothing here.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
