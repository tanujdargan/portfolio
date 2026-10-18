/*
 * Q1 "Still". Round 9: N1–N3 still felt overwhelming. One narrow column of plain text: no header, no logos, no pills.
 * Opening: the name's letters come into focus one by one where they already sit, then the rest of the page fades in.
 * Pure CSS, once per session, skipped on any input and under reduced motion. Projects open in place on hover.
 */
import { useEffect, useRef, useState } from 'react'
import type { VariantProps } from '../../routes'
import { selected, amazonMetrics, more, roles, education } from '../../content/curated'
import { links } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import './q1.css'

const NAME = 'Tanuj Dargan'
const short: Record<string, { org: string; title: string }> = {
  amazon: { org: 'Amazon Robotics', title: 'LLM planning assistant' },
  lossmask: { org: 'Apart Research', title: 'Loss masking and shutdown distress' },
  orbit: { org: 'UVic CfAR', title: 'MarmotSat flight firmware' },
  steering: { org: 'Independent', title: 'Steering along emotion directions' },
  ocean: { org: 'SOLIDS Lab', title: 'Deep-water temperature from satellites' },
}
const projects = ['amazon', 'lossmask', 'orbit', 'steering', 'ocean'].map((id) => ({ ...selected.find((s) => s.id === id)!, ...short[id] }))

// Before paint: returning visitors and reduced-motion users get the finished page; any input finishes the opening.
const gate = `(function(){var d=document.documentElement,k='q1-seen';try{if(sessionStorage.getItem(k)||matchMedia('(prefers-reduced-motion: reduce)').matches)d.setAttribute('data-q1-skip','');sessionStorage.setItem(k,'1')}catch(e){}var s=function(){d.setAttribute('data-q1-skip','')};['pointerdown','keydown','wheel','touchmove'].forEach(function(e){addEventListener(e,s,{once:true,passive:true})})})()`

function Work({ base }: { base: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  const t = useRef(0)
  const show = (id: string | null, ms = 0) => {
    clearTimeout(t.current)
    t.current = window.setTimeout(() => {
      if (id) setSeen((s) => (s.has(id) ? s : new Set(s).add(id)))
      setOpen(id)
    }, ms)
  }
  useEffect(() => () => clearTimeout(t.current), [])

  return (
    <ol className="q1-work" data-any={open ? '' : undefined} onPointerLeave={(e) => e.pointerType === 'mouse' && show(null, 250)}>
      {projects.map((p) => (
        <li key={p.id} className="q1-row" data-open={open === p.id || undefined} onPointerEnter={(e) => e.pointerType === 'mouse' && show(p.id, 180)}>
          <button className="q1-row__head" aria-expanded={open === p.id} aria-controls={`q1-${p.id}`} onClick={() => show(open === p.id ? null : p.id)}>
            <span className="q1-row__title">{p.title}</span>
            <span className="q1-row__org">{p.org}</span>
          </button>
          <div className="q1-row__panel" id={`q1-${p.id}`}>
            <div className="q1-row__clip">
              {seen.has(p.id) && (
                <div className="q1-row__inner">
                  <p>{p.finding}</p>
                  {p.demo ? (
                    <Demo kind={p.demo} compact finding={p.id === 'lossmask' || undefined} />
                  ) : (
                    <dl className="q1-nums">
                      {amazonMetrics.map((m) => (
                        <div key={m.l}>
                          <dt>{m.n}</dt>
                          <dd>{m.l}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {p.slug && (
                    <Link className="q1-link" to={`${base}/research/${p.slug}`}>
                      Read the write-up →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Home({ base }: { base: string }) {
  return (
    <main className="q1-main" id="q1-main">
      <script dangerouslySetInnerHTML={{ __html: gate }} />
      <header className="q1-hero">
        <h1 className="q1-name" aria-label={NAME}>
          {Array.from(NAME, (c, i) => (
            <span key={i} aria-hidden="true" style={{ '--i': i } as React.CSSProperties}>
              {c === ' ' ? ' ' : c}
            </span>
          ))}
        </h1>
        <p className="q1-fade">
          ML engineer and researcher. I build production ML at Amazon Robotics and study what language models represent
          inside. CS at the University of Victoria, graduating April 2027.
        </p>
        <p className="q1-links q1-fade">
          <a href={links.resume.href} target="_blank" rel="noopener">Resume</a>
          <a href={links.github.href} target="_blank" rel="noopener">GitHub</a>
          <a href={links.linkedin.href} target="_blank" rel="noopener">LinkedIn</a>
          <a href={links.email.href}>Email</a>
        </p>
      </header>

      <section className="q1-sec q1-fade" aria-labelledby="q1-h-work">
        <h2 id="q1-h-work">Work</h2>
        <Work base={base} />
      </section>

      <section className="q1-sec q1-fade" aria-labelledby="q1-h-also">
        <h2 id="q1-h-also">Also</h2>
        <ul className="q1-list">
          {more.map((m) => (
            <li key={m.title}>
              {m.href ? m.ext ? <a href={m.href} target="_blank" rel="noopener">{m.title}</a> : <Link to={`${base}${m.href}`}>{m.title}</Link> : <span>{m.title}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="q1-sec q1-fade" aria-labelledby="q1-h-exp">
        <h2 id="q1-h-exp">Experience</h2>
        <ul className="q1-list q1-exp">
          {roles.map((r) => (
            <li key={r.org}>
              <span>{r.org}<i>{r.role}</i></span>
              <span>{r.when}</span>
            </li>
          ))}
          <li>
            <span>{education.school}<i>B.S. Computer Science</i></span>
            <span>Until {education.when}</span>
          </li>
        </ul>
      </section>

      <footer className="q1-sec q1-fade q1-foot">
        <a href={links.email.href}>tanujd@uvic.ca</a>
        <span>Victoria, BC</span>
      </footer>
    </main>
  )
}

export default function Q1({ page, base }: VariantProps) {
  return (
    <div className="q1">
      {page.kind === 'home' ? (
        <Home base={base} />
      ) : (
        <div className="q1-page">
          <Link to={`${base}/`} className="q1-link">← Tanuj Dargan</Link>
          <main id="q1-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="q1-name">Nothing here.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
