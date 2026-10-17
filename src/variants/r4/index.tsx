/*
 * R4 "Sticky". Round 6. The live site's structure (About, Experience, Projects, Contact; nav always one click away),
 * laid out like Brittany Chiang's portfolio, the best-known entry in emmabostian/developer-portfolios: name and nav
 * pinned on the left, everything else scrolls on the right. Interactivity stays small: a cursor glow, hovered rows
 * lift while the rest dim, and a project opens its live demo in place.
 */
import { useEffect, useState } from 'react'
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
import './r4.css'

const sections = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
]

// Short titles for the project rows; the full finding shows when a row is opened.
const short: Record<string, { org: string; title: string; result: string }> = {
  amazon: { org: 'Amazon Robotics', title: 'LLM planning assistant, in production', result: '180+ sites · return offer' },
  orbit: { org: 'UVic CfAR', title: 'MarmotSat flight firmware', result: 'In orbit · NORAD 69912' },
  lossmask: { org: 'Apart Research', title: 'Loss masking and shutdown distress', result: 'Calm output, negative inside' },
  steering: { org: 'Independent', title: 'Steering a model along emotion directions', result: 'A switch, not a dial' },
  ocean: { org: 'SOLIDS Lab, UVic', title: 'Deep-water temperature from satellites', result: 'R² 0.936' },
}
const order = ['amazon', 'orbit', 'lossmask', 'steering', 'ocean']
const projects = order.map((id) => ({ ...selected.find((s) => s.id === id)!, ...short[id] }))

const socials: LinkKey[] = ['github', 'linkedin', 'x', 'email']

function useActive() {
  const [active, setActive] = useState('about')
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-40% 0px -55% 0px' },
    )
    sections.forEach((s) => io.observe(document.getElementById(s.id)!))
    return () => io.disconnect()
  }, [])
  return active
}

function Glow() {
  // ponytail: one CSS var on the root, no animation loop; skipped on touch via CSS
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.r4')!
    const move = (e: PointerEvent) => {
      el.style.setProperty('--gx', `${e.clientX}px`)
      el.style.setProperty('--gy', `${e.clientY}px`)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return <div className="r4-glow" aria-hidden="true" />
}

function Side() {
  const active = useActive()
  return (
    <header className="r4-side">
      <div>
        <h1 className="r4-name">Tanuj Dargan</h1>
        <p className="r4-title">ML engineer & researcher</p>
        <p className="r4-tag">I ship production ML and study what language models represent inside.</p>
        <nav className="r4-nav" aria-label="Sections">
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>
                  <span className="r4-nav__line" />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="r4-side__end">
        <a className="r4-resume" href={links.resume.href} target="_blank" rel="noopener">
          Resume <span aria-hidden="true">↗</span>
        </a>
        <ul className="r4-socials">
          {socials.map((k) => {
            const l = links[k]
            const ext = !l.href.startsWith('mailto:')
            return (
              <li key={k}>
                <a href={l.href} {...(ext ? { target: '_blank', rel: 'noopener' } : {})} aria-label={l.label} title={l.label}>
                  <LinkIcon k={k} size={20} />
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </header>
  )
}

function Project({ p, base }: { p: (typeof projects)[number]; base: string }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="r4-item r4-proj" data-open={open || undefined}>
      <button className="r4-proj__head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="r4-thumb">
          {p.demo ? (
            <Poster k={p.demo} />
          ) : (
            <span className="r4-thumb__num">
              180+<small>sites</small>
            </span>
          )}
        </span>
        <span className="r4-proj__body">
          <span className="r4-proj__org">
            {p.mark && <Logo m={p.mark} w={p.mark === 'pearcare' ? 60 : 18} h={18} />}
            {p.org} · {p.when}
          </span>
          <span className="r4-proj__title">
            {p.title} <span className="r4-plus" aria-hidden="true">+</span>
          </span>
          <span className="r4-result">{p.result}</span>
        </span>
      </button>
      {open && (
        <div className="r4-proj__open">
          <p>{p.finding}</p>
          {p.demo ? (
            <Demo kind={p.demo} compact finding={p.id === 'lossmask' || undefined} />
          ) : (
            <dl className="r4-metrics">
              {amazonMetrics.map((m) => (
                <div key={m.l}>
                  <dt>{m.n}</dt>
                  <dd>{m.l}</dd>
                </div>
              ))}
            </dl>
          )}
          {p.slug && (
            <Link className="r4-arrow" to={`${base}/research/${p.slug}`}>
              Read the write-up <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      )}
    </li>
  )
}

function Home({ base }: { base: string }) {
  return (
    <div className="r4-wrap">
      <Glow />
      <Side />
      <main className="r4-main" id="r4-main">
        <section id="about" aria-label="About">
          <h2 className="r4-h">About</h2>
          <p>
            I’m a CS student at the <b>University of Victoria</b>, graduating April 2027. This summer I was an SDE intern at{' '}
            <b>Amazon Robotics</b>, where I built an LLM planning assistant that’s now in production across 180+ fulfillment
            sites. I’m going back with a return offer.
          </p>
          <p>
            Before that I led the flight firmware for <b>MarmotSat</b>, a CubeSat that launched on a Falcon 9 in July 2026 and
            is in orbit now. On the research side, I study what language models represent inside: at <b>Apart Research</b> I
            showed that a training detail decides whether a model says it’s distressed about being shut down.
          </p>
        </section>

        <section id="experience" aria-label="Experience">
          <h2 className="r4-h">Experience</h2>
          <ol className="r4-list">
            {roles.map((r) => (
              <li key={r.org} className="r4-item r4-role">
                <span className="r4-when">{r.when}</span>
                <div>
                  <h3>
                    <Logo m={r.mark} w={r.mark === 'pearcare' ? 64 : 20} h={20} />
                    {r.role} · <span>{r.org}</span>
                  </h3>
                  <p>{r.line}</p>
                </div>
              </li>
            ))}
            <li className="r4-item r4-role">
              <span className="r4-when">Until {education.when}</span>
              <div>
                <h3>
                  <Logo m="uvic" w={20} h={20} />
                  {education.degree} · <span>{education.school}</span>
                </h3>
                <p>{education.note}.</p>
              </div>
            </li>
          </ol>
          <a className="r4-arrow" href={links.resume.href} target="_blank" rel="noopener">
            Full resume <span aria-hidden="true">↗</span>
          </a>
        </section>

        <section id="projects" aria-label="Projects">
          <h2 className="r4-h">Projects</h2>
          <ol className="r4-list">
            {projects.map((p) => (
              <Project key={p.id} p={p} base={base} />
            ))}
          </ol>
          <h3 className="r4-sub">Also</h3>
          <ul className="r4-list r4-more">
            {more.map((m) => {
              const inner = (
                <>
                  <b>{m.title}</b>
                  <span>{m.line}</span>
                </>
              )
              return (
                <li key={m.title} className="r4-item">
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

        <section id="contact" aria-label="Contact">
          <h2 className="r4-h">Contact</h2>
          <p>Research, internships, or just a question about the work: email is fastest.</p>
          <a className="r4-email" href={links.email.href}>
            tanujd@uvic.ca <span aria-hidden="true">↗</span>
          </a>
        </section>
        <footer className="r4-foot">Victoria, BC · {new Date().getFullYear()}</footer>
      </main>
    </div>
  )
}

export default function R4({ page, base }: VariantProps) {
  return (
    <div className="r4" data-page={page.kind}>
      <a className="r4-skip" href="#r4-main">
        Skip to content
      </a>
      {page.kind === 'home' && <Home base={base} />}
      {page.kind !== 'home' && (
        <div className="r4-page">
          <Link to={`${base}/`} className="r4-arrow">
            <span aria-hidden="true">←</span> Tanuj Dargan
          </Link>
          <main id="r4-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="r4-name">Nothing here.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
