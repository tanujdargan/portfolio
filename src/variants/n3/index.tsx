/*
 * N3 "Reveal". Round 8. Brief: a good opening animation, then a normal, spaced-out, calm site; Amazon first, then
 * Apart Research, then MarmotSat; demos one hover away.
 * The opening is three proof lines on black that replace each other, then two shutters split open onto the hero.
 * It is pure CSS in the prerendered HTML (no-JS visitors and agents get the whole page; the overlay just fades), an
 * inline script skips it on repeat visits in the same session or under reduced motion, and any input skips it.
 * Projects are large cards; hovering one for 150ms grows it and cross-fades the poster into the live demo.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { VariantProps } from '../../routes'
import { selected, amazonMetrics, more, roles, education } from '../../content/curated'
import { links, type LinkKey } from '../../content/site'
import { LinkIcon } from '../../shared/Links'
import { Logo } from '../../shared/Mark'
import { Poster } from '../../shared/Poster'
import { Demo } from '../../demos/Demo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import './n3.css'

const sections = [
  { id: 'work', label: 'Projects' },
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
]

// Short titles and results for the cards; the full finding shows when a card opens.
const short: Record<string, { org: string; title: string; result: string }> = {
  amazon: { org: 'Amazon Robotics', title: 'LLM planning assistant, in production', result: '180+ fulfillment sites · return offer' },
  lossmask: { org: 'Apart Research', title: 'Loss masking and shutdown distress', result: 'Calm output, negative inside' },
  orbit: { org: 'UVic CfAR', title: 'MarmotSat flight firmware', result: 'In orbit · NORAD 69912' },
  steering: { org: 'Independent', title: 'Steering a model along emotion directions', result: 'A switch, not a dial' },
  ocean: { org: 'SOLIDS Lab, UVic', title: 'Deep-water temperature from satellites', result: 'R² 0.936' },
}
const order = ['amazon', 'lossmask', 'orbit', 'steering', 'ocean']
const projects = order.map((id) => ({ ...selected.find((s) => s.id === id)!, ...short[id] }))
type P = (typeof projects)[number]

const socials: LinkKey[] = ['github', 'linkedin', 'x', 'email']

// Facts from curated.ts proofs: Amazon (180+ sites, production), Apart (shutdown distress), CfAR (MarmotSat in orbit).
const intro = [
  { big: '180+', small: 'Amazon fulfillment sites, my LLM planning assistant in production' },
  { big: 'Loss masking', small: 'decides whether a model voices shutdown distress · Apart Research' },
  { big: 'In orbit', small: 'MarmotSat, running the flight firmware I led' },
]

// Runs while the HTML parses, before first paint: no replay in the same session, none under reduced motion.
const gate = `try{var d=document.documentElement;d.dataset.n3gate='1';if(sessionStorage.getItem('n3-intro')||matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('n3-nointro');sessionStorage.setItem('n3-intro','1')}catch(e){}`

function Intro() {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    // client-side navigation never ran the inline gate: apply the same rule before paint
    const d = document.documentElement
    if (d.dataset.n3gate) return
    try {
      if (sessionStorage.getItem('n3-intro')) d.classList.add('n3-nointro')
      sessionStorage.setItem('n3-intro', '1')
    } catch {}
  }, [])
  useEffect(() => {
    const skip = () => {
      ref.current?.classList.add('n3-intro--skip')
      ref.current?.closest('.n3')?.classList.add('n3-skipped')
    }
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    evs.forEach((e) => window.addEventListener(e, skip, { once: true, passive: true }))
    // once it has played (or been skipped), returning to home in this tab shows the page straight away
    const t = window.setTimeout(() => {
      evs.forEach((e) => window.removeEventListener(e, skip))
      document.documentElement.classList.add('n3-nointro')
    }, 2800)
    return () => {
      clearTimeout(t)
      evs.forEach((e) => window.removeEventListener(e, skip))
    }
  }, [])
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: gate }} />
      <div className="n3-intro" ref={ref} aria-hidden="true">
        <div className="n3-shutter n3-shutter--top" />
        <div className="n3-shutter n3-shutter--bot" />
        <div className="n3-facts">
          {intro.map((f, i) => (
            <p key={f.big} className="n3-fact" style={{ '--i': i } as React.CSSProperties}>
              <b>{f.big}</b>
              <span>{f.small}</span>
            </p>
          ))}
        </div>
      </div>
    </>
  )
}

function useActive() {
  const [active, setActive] = useState('')
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), {
      rootMargin: '-40% 0px -55% 0px',
    })
    sections.forEach((s) => io.observe(document.getElementById(s.id)!))
    return () => io.disconnect()
  }, [])
  return active
}

function Header() {
  const active = useActive()
  return (
    <header className="n3-head">
      <a className="n3-logo" href="#top">
        Tanuj Dargan
      </a>
      <nav aria-label="Sections">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>
            {s.label}
          </a>
        ))}
      </nav>
      <a className="n3-resume" href={links.resume.href} target="_blank" rel="noopener">
        Resume <span aria-hidden="true">↗</span>
      </a>
    </header>
  )
}

function Card({ p, base }: { p: P; base: string }) {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(false)
  const timer = useRef<number>(undefined)
  const pointer = useRef('')
  const set = (v: boolean, delay = 0) => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setOpen(v)
      if (v) setSeen(true)
    }, delay)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  // hover opens for mice; a tap or Enter toggles; a mouse click never closes what hover opened
  const toggle = () => (pointer.current === 'mouse' ? set(true) : set(!open))
  return (
    <article
      className={`n3-card n3-card--${p.id}`}
      data-open={open || undefined}
      onPointerEnter={(e) => e.pointerType === 'mouse' && set(true, 150)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && set(false, 220)}
      onPointerDown={(e) => (pointer.current = e.pointerType)}
      onKeyDown={() => (pointer.current = '')}
    >
      <div className="n3-card__text">
        <p className="n3-meta">
          {p.mark && <Logo m={p.mark} w={p.mark === 'pearcare' ? 56 : 18} h={18} />}
          {p.org} <span aria-hidden="true">·</span> {p.when}
        </p>
        <h3>
          <button aria-expanded={open} aria-controls={`n3-live-${p.id}`} onClick={toggle}>
            {p.title}
          </button>
        </h3>
        <p className="n3-result">{p.result}</p>
        <div className="n3-more">
          <div>
            <p>{p.finding}</p>
            {p.slug && (
              <Link className="n3-arrow" to={`${base}/research/${p.slug}`}>
                Read the write-up <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>
        <span className="n3-hint" aria-hidden="true">
          {p.demo ? 'Hover to try it' : 'Hover for numbers'}
        </span>
      </div>
      <div className="n3-media">
        <div className="n3-poster" onClick={toggle} aria-hidden="true">
          {p.demo ? (
            <Poster k={p.demo} />
          ) : (
            <span className="n3-big">
              180+<small>fulfillment sites</small>
            </span>
          )}
        </div>
        <div className="n3-live" id={`n3-live-${p.id}`}>
          {seen &&
            (p.demo ? (
              <Demo kind={p.demo} compact finding={p.id === 'lossmask' || undefined} />
            ) : (
              <dl className="n3-metrics">
                {amazonMetrics.map((m) => (
                  <div key={m.l}>
                    <dt>{m.n}</dt>
                    <dd>{m.l}</dd>
                  </div>
                ))}
              </dl>
            ))}
        </div>
      </div>
    </article>
  )
}

function Home({ base }: { base: string }) {
  return (
    <>
      <Intro />
      <Header />
      <main id="n3-main">
        <section className="n3-hero" id="top" aria-label="Intro">
          <h1 className="n3-name">Tanuj Dargan</h1>
          <p className="n3-thesis">I ship production ML and study what language models represent inside.</p>
          <ul className="n3-socials">
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

        <section id="work" className="n3-sec" aria-label="Projects">
          <h2 className="n3-h">Selected work</h2>
          <div className="n3-cards">
            {projects.map((p) => (
              <Card key={p.id} p={p} base={base} />
            ))}
          </div>
          <h3 className="n3-sub">Also</h3>
          <ul className="n3-also">
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

        <section id="about" className="n3-sec n3-about" aria-label="About">
          <h2 className="n3-h">About</h2>
          <p>
            CS at the <b>University of Victoria</b>, graduating April 2027. This summer I built an LLM planning assistant at{' '}
            <b>Amazon Robotics</b> that’s now in production; I’m going back with a return offer.
          </p>
          <p>
            I led flight firmware for <b>MarmotSat</b>, in orbit since July 2026, and I study what language models represent
            inside.
          </p>
        </section>

        <section id="experience" className="n3-sec" aria-label="Experience">
          <h2 className="n3-h">Experience</h2>
          <ol className="n3-roles">
            {roles.map((r) => (
              <li key={r.org}>
                <span className="n3-when">{r.when}</span>
                <span className="n3-role">
                  <Logo m={r.mark} w={r.mark === 'pearcare' ? 60 : 18} h={18} />
                  <b>{r.org}</b>
                  <span>{r.role}</span>
                </span>
                <span className="n3-line">{r.line}</span>
              </li>
            ))}
            <li>
              <span className="n3-when">Until {education.when}</span>
              <span className="n3-role">
                <Logo m="uvic" w={18} h={18} />
                <b>{education.school}</b>
                <span>{education.degree}</span>
              </span>
              <span className="n3-line">{education.note}.</span>
            </li>
          </ol>
          <a className="n3-arrow" href={links.resume.href} target="_blank" rel="noopener">
            Full resume <span aria-hidden="true">↗</span>
          </a>
        </section>

        <section id="contact" className="n3-sec n3-contact" aria-label="Contact">
          <h2 className="n3-h">Contact</h2>
          <a className="n3-email" href={links.email.href}>
            tanujd@uvic.ca <span aria-hidden="true">↗</span>
          </a>
        </section>
        <footer className="n3-foot">Victoria, BC · {new Date().getFullYear()}</footer>
      </main>
    </>
  )
}

export default function N3({ page, base }: VariantProps) {
  return (
    <div className="n3" data-page={page.kind}>
      <a className="n3-skip" href="#n3-main">
        Skip to content
      </a>
      {page.kind === 'home' && <Home base={base} />}
      {page.kind !== 'home' && (
        <div className="n3-page">
          <Link to={`${base}/`} className="n3-arrow">
            <span aria-hidden="true">←</span> Tanuj Dargan
          </Link>
          <main id="n3-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="n3-name">Nothing here.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
