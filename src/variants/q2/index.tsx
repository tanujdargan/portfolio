/*
 * Q2 "Settle". Round 9, same quiet column as Q1, but the page never changes shape.
 * Opening: the name appears alone in the middle of the screen, then settles up into place as the page fades in.
 * Pure CSS, once per session, skipped on any input and under reduced motion.
 * Projects: hovering a row reveals its result; clicking opens the live demo in a dialog.
 */
import { useRef, useState } from 'react'
import type { VariantProps } from '../../routes'
import { selected, amazonMetrics, more, roles, education } from '../../content/curated'
import { links } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import './q2.css'

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
const gate = `(function(){var d=document.documentElement,k='q2-seen';try{if(sessionStorage.getItem(k)||matchMedia('(prefers-reduced-motion: reduce)').matches)d.setAttribute('data-q2-skip','');sessionStorage.setItem(k,'1')}catch(e){}var s=function(){d.setAttribute('data-q2-skip','')};['pointerdown','keydown','wheel','touchmove'].forEach(function(e){addEventListener(e,s,{once:true,passive:true})})})()`

function Work({ base }: { base: string }) {
  const dlg = useRef<HTMLDialogElement>(null)
  const [cur, setCur] = useState<(typeof projects)[number] | null>(null)
  const open = (p: (typeof projects)[number]) => {
    setCur(p)
    dlg.current!.showModal()
  }

  return (
    <>
      <ol className="q2-work">
        {projects.map((p) => (
          <li key={p.id} className="q2-row">
            <button className="q2-row__head" onClick={() => open(p)} aria-haspopup="dialog">
              <span className="q2-row__title">{p.title}</span>
              <span className="q2-row__org">{p.org}</span>
              <span className="q2-row__peek">
                {p.result}
                <em>{p.demo ? 'Try it' : 'Numbers'} →</em>
              </span>
            </button>
          </li>
        ))}
      </ol>
      {/* ponytail: native <dialog> gives focus trap, Esc and backdrop for free */}
      <dialog ref={dlg} className="q2-dlg" onClose={() => setCur(null)} onClick={(e) => e.target === dlg.current && dlg.current.close()}>
        {cur && (
          <div className="q2-dlg__in">
            <header>
              <span>
                <b>{cur.title}</b>
                {cur.org} · {cur.when}
              </span>
              <button onClick={() => dlg.current!.close()} aria-label="Close">×</button>
            </header>
            <p>{cur.finding}</p>
            {cur.demo ? (
              <Demo kind={cur.demo} compact finding={cur.id === 'lossmask' || undefined} />
            ) : (
              <dl className="q2-nums">
                {amazonMetrics.map((m) => (
                  <div key={m.l}>
                    <dt>{m.n}</dt>
                    <dd>{m.l}</dd>
                  </div>
                ))}
              </dl>
            )}
            {cur.slug && (
              <Link className="q2-link" to={`${base}/research/${cur.slug}`}>
                Read the write-up →
              </Link>
            )}
          </div>
        )}
      </dialog>
    </>
  )
}

function Home({ base }: { base: string }) {
  return (
    <main className="q2-main" id="q2-main">
      <script dangerouslySetInnerHTML={{ __html: gate }} />
      <header className="q2-hero">
        <h1 className="q2-name">{NAME}</h1>
        <p className="q2-fade">
          ML engineer and researcher. I build production ML at Amazon Robotics and study what language models represent
          inside. CS at the University of Victoria, graduating April 2027.
        </p>
        <p className="q2-links q2-fade">
          <a href={links.resume.href} target="_blank" rel="noopener">Resume</a>
          <a href={links.github.href} target="_blank" rel="noopener">GitHub</a>
          <a href={links.linkedin.href} target="_blank" rel="noopener">LinkedIn</a>
          <a href={links.email.href}>Email</a>
        </p>
      </header>

      <section className="q2-sec q2-fade" aria-labelledby="q2-h-work">
        <h2 id="q2-h-work">Work</h2>
        <Work base={base} />
      </section>

      <section className="q2-sec q2-fade" aria-labelledby="q2-h-also">
        <h2 id="q2-h-also">Also</h2>
        <ul className="q2-list">
          {more.map((m) => (
            <li key={m.title}>
              {m.href ? m.ext ? <a href={m.href} target="_blank" rel="noopener">{m.title}</a> : <Link to={`${base}${m.href}`}>{m.title}</Link> : <span>{m.title}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="q2-sec q2-fade" aria-labelledby="q2-h-exp">
        <h2 id="q2-h-exp">Experience</h2>
        <ul className="q2-list q2-exp">
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

      <footer className="q2-sec q2-fade q2-foot">
        <a href={links.email.href}>dargantanuj@gmail.com</a>
        <span>Victoria, BC</span>
      </footer>
    </main>
  )
}

export default function Q2({ page, base }: VariantProps) {
  return (
    <div className="q2">
      {page.kind === 'home' ? (
        <Home base={base} />
      ) : (
        <div className="q2-page">
          <Link to={`${base}/`} className="q2-link">← Tanuj Dargan</Link>
          <main id="q2-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="q2-name">Nothing here.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
