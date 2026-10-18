/*
 * C2 "Night City". Round 7. Cyberpunk 2077, the quiet version: the work is the inventory screen. Five items on the first
 * screen with a rarity, an item tooltip on hover, and a detail panel (native <dialog>) on click. One faint grid in the
 * background; neon only on hover and the active nav item.
 */
import { useEffect, useRef, useState } from 'react'
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
import './c2.css'

const sections = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
]

type Tier = 'legendary' | 'epic' | 'rare'
const items: Record<string, { tier: Tier; org: string; title: string; stats: [string, string][] }> = {
  amazon: { tier: 'legendary', org: 'Amazon Robotics', title: 'LLM planning assistant', stats: [['Sites', '180+'], ['Status', 'In production'], ['Offer', 'Returning']] },
  orbit: { tier: 'epic', org: 'UVic CfAR', title: 'MarmotSat flight firmware', stats: [['Status', 'In orbit'], ['NORAD', '69912']] },
  lossmask: { tier: 'epic', org: 'Apart Research', title: 'Loss masking & shutdown distress', stats: [['Finding', 'Calm outside, negative inside']] },
  steering: { tier: 'rare', org: 'Independent', title: 'Emotion steering', stats: [['Finding', 'A switch, not a dial']] },
  ocean: { tier: 'rare', org: 'SOLIDS Lab, UVic', title: 'Deep-water temperature', stats: [['R²', '0.936']] },
}
const order = ['amazon', 'orbit', 'lossmask', 'steering', 'ocean']
const projects = order.map((id) => ({ ...selected.find((s) => s.id === id)!, ...items[id] }))
type Project = (typeof projects)[number]

const socials: LinkKey[] = ['github', 'linkedin', 'x', 'email']

function useActive() {
  const [active, setActive] = useState('about')
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(window.scrollY < 120 ? 'about' : e.target.id)), {
      rootMargin: '-40% 0px -55% 0px',
    })
    sections.forEach((s) => io.observe(document.getElementById(s.id)!))
    // the hero is short, so near the top the projects grid crosses the trigger line first; About wins there
    const top = () => window.scrollY < 120 && setActive('about')
    top()
    window.addEventListener('scroll', top, { passive: true })
    return () => (io.disconnect(), window.removeEventListener('scroll', top))
  }, [])
  return active
}

function Top() {
  const active = useActive()
  return (
    <header className="c2-top">
      <a className="c2-brand" href="#about">
        <b>Tanuj Dargan</b>
        <span>ML engineer · researcher</span>
      </a>
      <nav aria-label="Sections">
        <ul className="c2-nav">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <a className="c2-btn" href={links.resume.href} target="_blank" rel="noopener">
        Resume <span aria-hidden="true">↗</span>
      </a>
    </header>
  )
}

function Art({ p }: { p: Project }) {
  return p.demo ? (
    <Poster k={p.demo} />
  ) : (
    <span className="c2-big">
      180+<small>fulfillment sites</small>
    </span>
  )
}

function Item({ p, onOpen }: { p: Project; onOpen: (p: Project) => void }) {
  return (
    <li className={`c2-item c2-item--${p.id}`} data-tier={p.tier}>
      <button className="c2-card" onClick={() => onOpen(p)} aria-describedby={`c2-tip-${p.id}`}>
        <span className="c2-tier">{p.tier}</span>
        <span className="c2-art">
          <Art p={p} />
        </span>
        <span className="c2-meta">
          <span className="c2-org">
            {p.mark && <Logo m={p.mark} w={p.mark === 'pearcare' ? 56 : 16} h={16} />}
            {p.org}
          </span>
          <span className="c2-title">{p.title}</span>
          <span className="c2-stats">
            {p.stats.map(([k, v]) => (
              <span key={k}>
                <i>{k}</i>
                <b>{v}</b>
              </span>
            ))}
          </span>
        </span>
      </button>
      <span className="c2-tip" id={`c2-tip-${p.id}`} role="tooltip">
        <span className="c2-tip__tier">{p.tier} · {p.when}</span>
        <span className="c2-tip__title">{p.title}</span>
        {p.finding}
        <span className="c2-tip__hint">Click to inspect</span>
      </span>
    </li>
  )
}

function Inspect({ p, base, onClose }: { p: Project | null; base: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current!
    if (p && !d.open) d.showModal()
    if (!p && d.open) d.close()
  }, [p])
  return (
    <dialog
      ref={ref}
      className="c2-dialog"
      data-tier={p?.tier}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label={p?.title}
    >
      {p && (
        <div className="c2-dialog__in">
          <div className="c2-dialog__head">
            <span className="c2-tier">{p.tier}</span>
            <button className="c2-x" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <p className="c2-org">
            {p.org} · {p.when}
          </p>
          <h2>{p.title}</h2>
          <p className="c2-find">{p.finding}</p>
          {p.demo ? (
            <Demo kind={p.demo} compact finding={p.id === 'lossmask' || undefined} />
          ) : (
            <dl className="c2-metrics">
              {amazonMetrics.map((m) => (
                <div key={m.l}>
                  <dt>{m.n}</dt>
                  <dd>{m.l}</dd>
                </div>
              ))}
            </dl>
          )}
          {p.slug && (
            <Link className="c2-arrow" to={`${base}/research/${p.slug}`}>
              Read the write-up <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      )}
    </dialog>
  )
}

function Home({ base }: { base: string }) {
  const [open, setOpen] = useState<Project | null>(null)
  return (
    <>
      <Top />
      <main className="c2-main" id="c2-main">
        <section id="about" className="c2-hero" aria-label="About">
          <p className="c2-label">CS @ UVic · Graduating April 2027</p>
          <h1>
            I ship production ML and study what language models <em>represent inside</em>.
          </h1>
          <ul className="c2-socials">
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

        <section id="projects" aria-label="Projects">
          <h2 className="c2-h">
            Inventory <span>{projects.length} items</span>
          </h2>
          <ul className="c2-grid">
            {projects.map((p) => (
              <Item key={p.id} p={p} onOpen={setOpen} />
            ))}
          </ul>
          <h3 className="c2-sub">Also in the stash</h3>
          <ul className="c2-more">
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

        <section id="experience" aria-label="Experience">
          <h2 className="c2-h">
            Experience <span>{roles.length} roles</span>
          </h2>
          <ol className="c2-roles">
            {roles.map((r) => (
              <li key={r.org}>
                <span className="c2-roles__logo">
                  <Logo m={r.mark} w={r.mark === 'pearcare' ? 56 : 20} h={20} />
                </span>
                <div>
                  <h3>
                    {r.role} <span>· {r.org}</span>
                  </h3>
                  <p>{r.line}</p>
                </div>
                <span className="c2-when">{r.when}</span>
              </li>
            ))}
            <li>
              <span className="c2-roles__logo">
                <Logo m="uvic" w={20} h={20} />
              </span>
              <div>
                <h3>
                  {education.degree} <span>· {education.school}</span>
                </h3>
                <p>{education.note}.</p>
              </div>
              <span className="c2-when">Until {education.when}</span>
            </li>
          </ol>
        </section>

        <section id="contact" className="c2-contact" aria-label="Contact">
          <h2 className="c2-h">Contact</h2>
          <a className="c2-email" href={links.email.href}>
            tanujd@uvic.ca <span aria-hidden="true">↗</span>
          </a>
          <p>Research, internships, or a question about the work. Email is fastest.</p>
        </section>
        <footer className="c2-foot">Victoria, BC · {new Date().getFullYear()}</footer>
      </main>
      <Inspect p={open} base={base} onClose={() => setOpen(null)} />
    </>
  )
}

export default function C2({ page, base }: VariantProps) {
  return (
    <div className="c2" data-page={page.kind}>
      <a className="c2-skip" href="#c2-main">
        Skip to content
      </a>
      {page.kind === 'home' && <Home base={base} />}
      {page.kind !== 'home' && (
        <div className="c2-page">
          <Link to={`${base}/`} className="c2-arrow">
            <span aria-hidden="true">←</span> Tanuj Dargan
          </Link>
          <main id="c2-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="c2-404">Nothing here, choom.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
