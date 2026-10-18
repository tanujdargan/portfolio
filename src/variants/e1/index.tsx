/*
 * E1 "Edgerunners". Round 7. Cyberpunk: Edgerunners (Studio Trigger) as a look, not a game UI: flat neon colour blocks,
 * hard diagonal cuts, halftone accents, Anton display type, and one flat moon. Restraint is the point: lots of dark,
 * one or two colour blocks per screen. The five pieces of work sit on the first screen as tilted anime "frames";
 * hover straightens a frame, a click opens it below the row with the live demo.
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
import './e1.css'

const nav = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
]

const short: Record<string, { org: string; title: string; result: string }> = {
  amazon: { org: 'Amazon Robotics', title: 'LLM planning assistant', result: '180+ sites · return offer' },
  orbit: { org: 'UVic CfAR', title: 'MarmotSat flight firmware', result: 'In orbit · NORAD 69912' },
  lossmask: { org: 'Apart Research', title: 'Loss masking & shutdown distress', result: 'Calm output, negative inside' },
  steering: { org: 'Independent', title: 'Steering along emotion directions', result: 'A switch, not a dial' },
  ocean: { org: 'SOLIDS Lab, UVic', title: 'Deep-water temp from satellites', result: 'R² 0.936' },
}
const order = ['amazon', 'orbit', 'lossmask', 'steering', 'ocean']
const projects = order.map((id) => ({ ...selected.find((s) => s.id === id)!, ...short[id] }))
type P = (typeof projects)[number]

const socials: LinkKey[] = ['github', 'linkedin', 'x', 'email']

function Header() {
  return (
    <header className="e1-head">
      <a className="e1-logo" href="#about">
        TD<span>//</span>
      </a>
      <nav aria-label="Sections">
        {nav.map((n) => (
          <a key={n.id} href={`#${n.id}`}>
            {n.label}
          </a>
        ))}
      </nav>
      <a className="e1-resume" href={links.resume.href} target="_blank" rel="noopener">
        Resume ↗
      </a>
    </header>
  )
}

function Frame({ p, i, open, onOpen }: { p: P; i: number; open: boolean; onOpen: () => void }) {
  return (
    <li className="e1-frame" style={{ '--i': i } as React.CSSProperties} data-open={open || undefined}>
      <button aria-expanded={open} aria-controls="e1-detail" onClick={onOpen}>
        <span className="e1-shot">
          {p.demo ? (
            <Poster k={p.demo} />
          ) : (
            <span className="e1-big">
              180+<small>fulfillment sites</small>
            </span>
          )}
          <span className="e1-num">0{i + 1}</span>
        </span>
        <span className="e1-meta">
          <span className="e1-org">
            {p.mark && <Logo m={p.mark} w={p.mark === 'pearcare' ? 54 : 16} h={16} />}
            {p.org}
          </span>
          <span className="e1-title">{p.title}</span>
        </span>
        <span className="e1-tag">{p.result}</span>
      </button>
    </li>
  )
}

function Detail({ p, base, onClose }: { p: P; base: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), [p.id])
  return (
    <div className="e1-detail" id="e1-detail" ref={ref} key={p.id}>
      <div className="e1-detail__text">
        <p className="e1-kicker">
          {p.org} · {p.when}
        </p>
        <h3>{p.title}</h3>
        <p>{p.finding}</p>
        <div className="e1-detail__links">
          {p.slug && (
            <Link className="e1-arrow" to={`${base}/research/${p.slug}`}>
              Read the write-up →
            </Link>
          )}
          <button className="e1-close" onClick={onClose}>
            Close ✕
          </button>
        </div>
      </div>
      <div className="e1-detail__demo">
        {p.demo ? (
          <Demo kind={p.demo} compact finding={p.id === 'lossmask' || undefined} />
        ) : (
          <dl className="e1-metrics">
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
      <main id="e1-main">
        <section className="e1-hero" id="about" aria-label="About">
          <div className="e1-moon" aria-hidden="true" />
          <h1 className="e1-name">
            Tanuj
            <br />
            Dargan
          </h1>
          <p className="e1-sub">
            <span>ML engineer & researcher</span> Production ML at Amazon. Firmware in orbit. What language models represent inside.
          </p>
        </section>

        <section id="projects" className="e1-work" aria-label="Projects">
          <ol className="e1-frames">
            {projects.map((p, i) => (
              <Frame key={p.id} p={p} i={i} open={open === p.id} onOpen={() => setOpen(open === p.id ? null : p.id)} />
            ))}
          </ol>
          {cur && <Detail p={cur} base={base} onClose={() => setOpen(null)} />}
        </section>

        <section id="experience" className="e1-sec" aria-label="Experience">
          <h2 className="e1-h">
            <span>Experience</span>
          </h2>
          <ol className="e1-roles">
            {roles.map((r) => (
              <li key={r.org}>
                <span className="e1-when">{r.when}</span>
                <span className="e1-role">
                  <Logo m={r.mark} w={r.mark === 'pearcare' ? 60 : 18} h={18} />
                  <b>{r.org}</b> {r.role}
                </span>
                <span className="e1-line">{r.line}</span>
              </li>
            ))}
            <li>
              <span className="e1-when">Until {education.when}</span>
              <span className="e1-role">
                <Logo m="uvic" w={18} h={18} />
                <b>{education.school}</b> {education.degree}
              </span>
              <span className="e1-line">{education.note}.</span>
            </li>
          </ol>
        </section>

        <section id="more" className="e1-sec" aria-label="More work">
          <h2 className="e1-h">
            <span>Also</span>
          </h2>
          <ul className="e1-more">
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

        <section id="contact" className="e1-contact" aria-label="Contact">
          <p className="e1-kicker">Research, internships, or a question about the work</p>
          <a className="e1-email" href={links.email.href}>
            tanujd@uvic.ca
          </a>
          <ul className="e1-socials">
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
        <footer className="e1-foot">Victoria, BC · {new Date().getFullYear()}</footer>
      </main>
    </>
  )
}

export default function E1({ page, base }: VariantProps) {
  return (
    <div className="e1" data-page={page.kind}>
      <a className="e1-skip" href="#e1-main">
        Skip to content
      </a>
      {page.kind === 'home' && <Home base={base} />}
      {page.kind !== 'home' && (
        <div className="e1-page">
          <Link to={`${base}/`} className="e1-arrow">
            ← Tanuj Dargan
          </Link>
          <main id="e1-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="e1-name">Nothing here.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
