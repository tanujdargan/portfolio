/*
 * C1 "Netrunner". Round 7. Cyberpunk 2077's in-game journal: yellow on black, chamfered panels, Rajdhani labels.
 * The first screen is the job list with the selected job's details beside it, so the work shows before any prose.
 * Motion stays small: the name slices once on load, headings slice on hover, a bar slides between jobs.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { VariantProps } from '../../routes'
import { selected, amazonMetrics, more, roles, education } from '../../content/curated'
import { links, type LinkKey } from '../../content/site'
import { LinkIcon } from '../../shared/Links'
import { Logo } from '../../shared/Mark'
import { Demo } from '../../demos/Demo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import './c1.css'

const tabs = [
  { id: 'jobs', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'more', label: 'More' },
  { id: 'contact', label: 'Contact' },
]

const short: Record<string, { org: string; title: string; result: string }> = {
  amazon: { org: 'Amazon Robotics', title: 'LLM planning assistant', result: '180+ sites · return offer' },
  orbit: { org: 'UVic CfAR', title: 'MarmotSat flight firmware', result: 'In orbit · NORAD 69912' },
  lossmask: { org: 'Apart Research', title: 'Loss masking & model distress', result: 'Calm output, negative inside' },
  steering: { org: 'Independent', title: 'Steering along emotion directions', result: 'A switch, not a dial' },
  ocean: { org: 'SOLIDS Lab, UVic', title: 'Deep-water temp from satellites', result: 'R² 0.936' },
}
const order = ['amazon', 'orbit', 'lossmask', 'steering', 'ocean']
const jobs = order.map((id) => ({ ...selected.find((s) => s.id === id)!, ...short[id] }))
type Job = (typeof jobs)[number]

const socials: LinkKey[] = ['github', 'linkedin', 'x', 'email']
const pad = (n: number) => String(n + 1).padStart(2, '0')

function useActive() {
  const [active, setActive] = useState('jobs')
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), {
      rootMargin: '-35% 0px -60% 0px',
    })
    tabs.forEach((t) => io.observe(document.getElementById(t.id)!))
    return () => io.disconnect()
  }, [])
  return active
}

function Top() {
  const active = useActive()
  return (
    <header className="c1-top">
      <a className="c1-brand" href="#jobs">
        <span className="c1-brand__mark" aria-hidden="true" />
        Tanuj Dargan
      </a>
      <nav aria-label="Sections">
        <ul className="c1-tabs">
          {tabs.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} aria-current={active === t.id ? 'true' : undefined}>
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <a className="c1-btn" href={links.resume.href} target="_blank" rel="noopener">
        Resume <span aria-hidden="true">↗</span>
      </a>
    </header>
  )
}

function Detail({ j, base }: { j: Job; base: string }) {
  return (
    <div className="c1-detail" key={j.id}>
      <p className="c1-micro">
        <span>{j.when}</span>
        <span>{j.where}</span>
      </p>
      <h3 className="c1-detail__title">{j.title}</h3>
      <p className="c1-result">{j.result}</p>
      <p className="c1-detail__text">{j.finding}</p>
      {j.demo ? (
        <div className="c1-demo">
          <Demo kind={j.demo} compact finding={j.id === 'lossmask' || undefined} />
        </div>
      ) : (
        <dl className="c1-metrics">
          {amazonMetrics.map((m) => (
            <div key={m.l}>
              <dt>{m.n}</dt>
              <dd>{m.l}</dd>
            </div>
          ))}
        </dl>
      )}
      {j.slug && (
        <Link className="c1-btn c1-btn--solid" to={`${base}/research/${j.slug}`}>
          Read the write-up <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  )
}

function Journal({ base }: { base: string }) {
  const [sel, setSel] = useState(0)
  const btns = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = (sel + d + jobs.length) % jobs.length
    setSel(n)
    btns.current[n]?.focus()
  }
  return (
    <div className="c1-journal c1-panel">
      <div className="c1-list">
        <p className="c1-micro c1-list__head">
          <span>Jobs · active</span>
          <span>{jobs.length}</span>
        </p>
        <ol onKeyDown={onKey} style={{ ['--i' as string]: sel }}>
          <span className="c1-bar" aria-hidden="true" />
          {jobs.map((j, i) => (
            <li key={j.id}>
              <button
                ref={(el) => {
                  btns.current[i] = el
                }}
                className="c1-job"
                aria-pressed={sel === i}
                onClick={() => setSel(i)}
                onMouseEnter={() => setSel(i)}
              >
                <span className="c1-job__n">{pad(i)}</span>
                <span className="c1-job__body">
                  <span className="c1-job__org">
                    {j.mark && <Logo m={j.mark} w={j.mark === 'pearcare' ? 54 : 16} h={16} />}
                    {j.org}
                  </span>
                  <span className="c1-job__title">{j.title}</span>
                  <span className="c1-job__result">{j.result}</span>
                </span>
              </button>
              {/* ponytail: on mobile the detail renders under the selected job; CSS picks which copy shows */}
              {sel === i && (
                <div className="c1-inline">
                  <Detail j={j} base={base} />
                </div>
              )}
            </li>
          ))}
        </ol>
        <p className="c1-hint c1-micro">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> select
          </span>
        </p>
      </div>
      <div className="c1-side">
        <Detail j={jobs[sel]} base={base} />
      </div>
    </div>
  )
}

function H({ code, children }: { code: string; children: string }) {
  return (
    <h2 className="c1-h">
      <span className="c1-micro">{code}</span>
      <span className="c1-glitch" data-text={children}>
        {children}
      </span>
    </h2>
  )
}

function Home({ base }: { base: string }) {
  return (
    <>
      <Top />
      <main className="c1-main" id="c1-main">
        <section className="c1-hero" id="jobs" aria-label="Projects">
          <div className="c1-id">
            <p className="c1-micro">
              <span>ID · Victoria, BC</span>
              <span className="c1-live">Online</span>
            </p>
            <h1 className="c1-name c1-glitch c1-glitch--load" data-text="Tanuj Dargan">
              Tanuj Dargan
            </h1>
            <p className="c1-role">ML engineer &amp; researcher</p>
            <p className="c1-tag">I ship production ML and study what language models represent inside.</p>
            <ul className="c1-socials">
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
          </div>
          <Journal base={base} />
        </section>

        <section id="experience" aria-label="Experience">
          <H code="02 / log">Experience</H>
          <ol className="c1-roles">
            {roles.map((r) => (
              <li key={r.org} className="c1-roleRow">
                <span className="c1-when">{r.when}</span>
                <span className="c1-roleRow__who">
                  <Logo m={r.mark} w={r.mark === 'pearcare' ? 60 : 18} h={18} />
                  <b>{r.role}</b>
                  <span>{r.org}</span>
                </span>
                <span className="c1-roleRow__line">{r.line}</span>
              </li>
            ))}
            <li className="c1-roleRow">
              <span className="c1-when">Until {education.when}</span>
              <span className="c1-roleRow__who">
                <Logo m="uvic" w={18} h={18} />
                <b>B.S. Computer Science</b>
                <span>{education.school}</span>
              </span>
              <span className="c1-roleRow__line">Accelerated, 3 years. {education.note}.</span>
            </li>
          </ol>
        </section>

        <section id="more" aria-label="More work">
          <H code="03 / side jobs">Also</H>
          <ul className="c1-more">
            {more.map((m) => {
              const inner = (
                <>
                  <b>{m.title}</b>
                  <span>{m.line}</span>
                </>
              )
              return (
                <li key={m.title} className="c1-panel c1-panel--sm">
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

        <section id="contact" className="c1-contact" aria-label="Contact">
          <H code="04 / message">Contact</H>
          <a className="c1-email" href={links.email.href}>
            tanujd@uvic.ca <span aria-hidden="true">↗</span>
          </a>
          <p className="c1-micro">
            <span>CS · University of Victoria</span>
            <span>Graduating April 2027</span>
          </p>
        </section>
      </main>
    </>
  )
}

export default function C1({ page, base }: VariantProps) {
  return (
    <div className="c1" data-page={page.kind}>
      <a className="c1-skip" href="#c1-main">
        Skip to content
      </a>
      {page.kind === 'home' && <Home base={base} />}
      {page.kind !== 'home' && (
        <div className="c1-page">
          <Link to={`${base}/`} className="c1-btn">
            <span aria-hidden="true">←</span> Back to jobs
          </Link>
          <main id="c1-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="c1-name">Nothing here.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
