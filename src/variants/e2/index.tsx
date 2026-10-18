/*
 * E2 "Edgerunners, hand-drawn". Round 7b. Tanuj asked for Edgerunners as anime, not as a colour scheme: so the page is
 * built on painted cel illustrations (generated for this variant, no characters), inked panel borders, marker
 * lettering and manga caption boxes. The work is the first thing under the hero, as a page of comic panels; a click
 * opens a panel below the page with the live demo.
 */
import { useEffect, useRef, useState } from 'react'
import type { VariantProps } from '../../routes'
import { selected, amazonMetrics, more, roles, education } from '../../content/curated'
import { links, type LinkKey } from '../../content/site'
import { LinkIcon } from '../../shared/Links'
import { Logo } from '../../shared/Mark'
import { Demo } from '../../demos/Demo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import './e2.css'

const nav = [
  { id: 'work', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'more', label: 'More' },
  { id: 'contact', label: 'Contact' },
]

const short: Record<string, { org: string; title: string; result: string }> = {
  amazon: { org: 'Amazon Robotics', title: 'LLM planning assistant', result: 'Live at 180+ sites!' },
  orbit: { org: 'UVic CfAR', title: 'MarmotSat flight firmware', result: 'In orbit!' },
  lossmask: { org: 'Apart Research', title: 'Loss masking & shutdown distress', result: 'Calm outside, negative inside' },
  steering: { org: 'Independent', title: 'Steering along emotion directions', result: 'A switch, not a dial' },
  ocean: { org: 'SOLIDS Lab, UVic', title: 'Deep-water temperature from satellites', result: 'R² 0.936' },
}
const order = ['amazon', 'orbit', 'lossmask', 'steering', 'ocean']
const projects = order.map((id) => ({ ...selected.find((s) => s.id === id)!, ...short[id] }))
type P = (typeof projects)[number]

const socials: LinkKey[] = ['github', 'linkedin', 'x', 'email']

// ponytail: one SVG filter roughens every inked border; applied to pseudo-elements only, never to text
function Ink() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id="e2-rough">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="4" />
      </filter>
    </svg>
  )
}

function Header() {
  return (
    <header className="e2-head">
      <a className="e2-logo" href="#top">
        Tanuj Dargan
      </a>
      <nav aria-label="Sections">
        {nav.map((n) => (
          <a key={n.id} href={`#${n.id}`}>
            {n.label}
          </a>
        ))}
      </nav>
      <a className="e2-resume" href={links.resume.href} target="_blank" rel="noopener">
        Resume ↗
      </a>
    </header>
  )
}

function Panel({ p, i, open, onOpen }: { p: P; i: number; open: boolean; onOpen: () => void }) {
  return (
    <li className={`e2-panel e2-panel--${p.id}`} style={{ '--i': i } as React.CSSProperties} data-open={open || undefined}>
      <button aria-expanded={open} aria-controls="e2-detail" onClick={onOpen}>
        <img src={`/e2/${p.id}.webp`} alt="" loading={i < 3 ? 'eager' : 'lazy'} decoding="async" />
        <span className="e2-lines" aria-hidden="true" />
        <span className="e2-bubble">{p.result}</span>
        <span className="e2-cap">
          <span className="e2-org">
            {p.mark && <Logo m={p.mark} w={p.mark === 'pearcare' ? 54 : 16} h={16} />}
            {p.org}
          </span>
          <span className="e2-title">{p.title}</span>
        </span>
      </button>
    </li>
  )
}

function Detail({ p, base, onClose }: { p: P; base: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), [p.id])
  return (
    <div className="e2-detail" id="e2-detail" ref={ref} key={p.id}>
      <div className="e2-detail__text">
        <p className="e2-kicker">
          {p.org} · {p.when}
        </p>
        <h3>{p.title}</h3>
        <p>{p.finding}</p>
        <div className="e2-detail__links">
          {p.slug && (
            <Link className="e2-arrow" to={`${base}/research/${p.slug}`}>
              Read the write-up →
            </Link>
          )}
          <button className="e2-close" onClick={onClose}>
            Close ✕
          </button>
        </div>
      </div>
      <div className="e2-detail__demo">
        {p.demo ? (
          <Demo kind={p.demo} compact finding={p.id === 'lossmask' || undefined} />
        ) : (
          <dl className="e2-metrics">
            {amazonMetrics.map((m) => (
              <div key={m.l}>
                <dt>{m.n}</dt>
                <dd>{m.l}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}

function Home({ base }: { base: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const cur = projects.find((p) => p.id === open)
  return (
    <>
      <Header />
      <main id="e2-main">
        <section className="e2-hero" id="top" aria-label="Intro">
          <img className="e2-hero__art" src="/e2/hero.webp" alt="" fetchPriority="high" />
          <div className="e2-hero__text">
            <h1 className="e2-name">
              Tanuj
              <br />
              Dargan
            </h1>
            <p className="e2-role">ML engineer &amp; researcher</p>
            <p className="e2-sub">Production ML at Amazon. Firmware in orbit. What language models represent inside.</p>
          </div>
        </section>

        <section id="work" className="e2-work" aria-label="Projects">
          <ol className="e2-page">
            {projects.map((p, i) => (
              <Panel key={p.id} p={p} i={i} open={open === p.id} onOpen={() => setOpen(open === p.id ? null : p.id)} />
            ))}
          </ol>
          {cur && <Detail p={cur} base={base} onClose={() => setOpen(null)} />}
        </section>

        <section id="experience" className="e2-sec" aria-label="Experience">
          <h2 className="e2-h">Experience</h2>
          <ol className="e2-roles">
            {roles.map((r) => (
              <li key={r.org}>
                <span className="e2-when">{r.when}</span>
                <span className="e2-rolename">
                  <Logo m={r.mark} w={r.mark === 'pearcare' ? 60 : 18} h={18} />
                  <b>{r.org}</b> {r.role}
                </span>
                <span className="e2-line">{r.line}</span>
              </li>
            ))}
            <li>
              <span className="e2-when">Until {education.when}</span>
              <span className="e2-rolename">
                <Logo m="uvic" w={18} h={18} />
                <b>{education.school}</b> {education.degree}
              </span>
              <span className="e2-line">{education.note}.</span>
            </li>
          </ol>
        </section>

        <section id="more" className="e2-sec" aria-label="More work">
          <h2 className="e2-h">Also</h2>
          <ul className="e2-more">
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

        <section id="contact" className="e2-contact" aria-label="Contact">
          <p className="e2-hand">Say hi →</p>
          <a className="e2-email" href={links.email.href}>
            tanujd@uvic.ca
          </a>
          <ul className="e2-socials">
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
        </section>
        <footer className="e2-foot">Victoria, BC · {new Date().getFullYear()} · illustrations generated for this site</footer>
      </main>
    </>
  )
}

export default function E2({ page, base }: VariantProps) {
  return (
    <div className="e2" data-page={page.kind}>
      <Ink />
      <a className="e2-skip" href="#e2-main">
        Skip to content
      </a>
      {page.kind === 'home' && <Home base={base} />}
      {page.kind !== 'home' && (
        <div className="e2-pagewrap">
          <Link to={`${base}/`} className="e2-arrow">
            ← Tanuj Dargan
          </Link>
          <main id="e2-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="e2-name">Nothing here.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
