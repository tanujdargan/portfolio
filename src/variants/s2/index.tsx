/*
 * S2 "Story". Round 11: S1's content and outside-work part, but read top to bottom like a resume, the way the live
 * site flows: a short about, then one timeline with big app-icon logos (jobs, then research), each with its proof
 * inline (numbers, live demo, write-up). Opening: the same settle as S1. Pure CSS, once per session.
 */
import { useState, type FormEvent } from 'react'
import type { VariantProps } from '../../routes'
import { selected, amazonMetrics, more, roles, education, type Mark } from '../../content/curated'
import { links } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import { life, lab } from './life'
import gh from '../../data/github.json'
import './s2.css'

const NAME = 'Tanuj Dargan'
// Most impressive first, not chronological.
const jobOrder = ['Amazon Robotics', 'UVic CfAR', 'DEIA Lab, UVic', 'Pear Care', 'RBC Borealis', 'MLH · Apache Airflow']
const jobs = jobOrder.map((o) => roles.find((r) => r.org === o)!)
const buildOrder = ['Optimate', 'AIMO', 'Fine-tuning', 'Beri']
const builds = buildOrder.map((t) => more.find((m) => m.title.startsWith(t))!)
const pick = (id: string) => selected.find((s) => s.id === id)!
/** Proof shown under a job: big numbers, a live demo, or a link to the write-up. */
const proof: Record<string, 'nums' | 'orbit' | 'vectors'> = { 'Amazon Robotics': 'nums', 'UVic CfAR': 'orbit', 'DEIA Lab, UVic': 'vectors' }
const research = [
  { ...pick('lossmask'), org: 'Apart Research', icon: 'apart' as Icon },
  { ...pick('steering'), org: 'Independent research', icon: 'td' as Icon },
  { ...pick('ocean'), org: 'SOLIDS Lab, UVic', icon: 'uvic' as Icon },
]

type Icon = Mark | 'td'
/** App-icon-sized logo tile. The tiles are white rounded squares from /logos; Pear Care and "me" are drawn in CSS. */
function Tile({ m }: { m: Icon }) {
  if (m === 'pearcare') return <span className="s2-tile s2-tile--type" role="img" aria-label="Pear Care">pear<b>care</b></span>
  if (m === 'td') return <span className="s2-tile s2-tile--me" aria-hidden="true">TD</span>
  return <img className="s2-tile" src={m === 'apart' ? '/logos/mark-apart.svg' : `/logos/tile-${m}.svg`} width={64} height={64} alt="" loading="lazy" />
}

const gate = `(function(){var d=document.documentElement,k='s2-seen';try{if(sessionStorage.getItem(k)||matchMedia('(prefers-reduced-motion: reduce)').matches)d.setAttribute('data-s2-skip','');sessionStorage.setItem(k,'1')}catch(e){}var s=function(){d.setAttribute('data-s2-skip','')};['pointerdown','keydown','wheel','touchmove'].forEach(function(e){addEventListener(e,s,{once:true,passive:true})})})()`

const ext = { target: '_blank', rel: 'noopener' } as const

const icon = (n: string) => <img className="s2-ico" src={`/logos/lab/${n}.svg`} alt="" width={20} height={20} />
/** The homelab: real numbers first, then what runs, then the two machines and what Home Assistant does with them. */
function LabMap() {
  return (
    <div className="s2-lab">
      <dl className="s2-nums">
        {lab.numbers.map((m) => (
          <div key={m.l}>
            <dt>{m.n}</dt>
            <dd>{m.l}</dd>
          </div>
        ))}
      </dl>
      <ul className="s2-lab__svc">
        {lab.services.map((sv) => (
          <li key={sv.name}>
            {icon(sv.icon)}
            <b>{sv.name}</b>
            <span>{sv.role}</span>
          </li>
        ))}
      </ul>
      <ul className="s2-lab__hosts">
        {lab.hosts.map((h) => (
          <li key={h.name}>
            {icon(h.icon)}
            <b>{h.name}</b>
            <span>{h.meta}</span>
          </li>
        ))}
      </ul>
      <ul className="s2-lab__auto" aria-label="Home Assistant automations">
        {lab.automations.map((a) => (
          <li key={a.name}>
            {icon(a.icon)}
            {a.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Contribution calendar from the build-time snapshot (scripts/github.mjs): one column per week, Sunday on top. */
function GitHubYear() {
  const pad = new Date(gh.days[0][0] as string).getUTCDay()
  const cells = [...Array(pad).fill(null), ...gh.days]
  const fmt = (n: number) => n.toLocaleString('en-US')
  return (
    <div className="s2-gh">
      <dl className="s2-nums">
        <div><dt>{fmt(gh.total)}</dt><dd>contributions in the last year</dd></div>
        <div><dt>{gh.longest}</dt><dd>day longest streak</dd></div>
        <div><dt>{gh.repos}</dt><dd>public repositories</dd></div>
      </dl>
      <div className="s2-cal" role="img" aria-label={`${fmt(gh.total)} GitHub contributions in the last year`}>
        {cells.map((d, i) => (
          <i key={i} data-l={d ? d[2] : undefined} title={d ? `${d[1]} on ${d[0]}` : undefined} />
        ))}
      </div>
      <p className="s2-langs">
        Mostly {gh.languages.slice(0, 4).map((l) => l.name).join(', ')}.{' '}
        <a className="s2-more" href={links.github.href} {...ext}>github.com/{gh.user} ↗</a>
      </p>
    </div>
  )
}

function ContactForm() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Couldn’t send just now. Email me instead.')
      setState('sent')
    } catch (err) {
      setError((err as Error).message)
      setState('error')
    }
  }
  if (state === 'sent') return <p className="s2-form__done" role="status">Thanks, it’s in my inbox. I’ll reply by email.</p>
  return (
    <form className="s2-form" onSubmit={submit}>
      <label>
        <span>Name</span>
        <input name="name" required maxLength={100} autoComplete="name" />
      </label>
      <label>
        <span>Email</span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" />
      </label>
      <label className="s2-form__msg">
        <span>Message</span>
        <textarea name="message" required maxLength={5000} rows={5} />
      </label>
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="s2-form__hp" />
      <div className="s2-form__row">
        <button type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send'}</button>
        {state === 'error' && <p role="alert">{error}</p>}
      </div>
    </form>
  )
}

function Home({ base }: { base: string }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: gate }} />
      <nav className="s2-nav s2-fade" aria-label="Sections">
        <a href="#top" className="s2-nav__me">TD</a>
        <span>
          <a href="#experience">Experience</a>
          <a href="#work">Research</a>
          <a href="#life">Outside work</a>
          <a href="#contact">Contact</a>
        </span>
      </nav>
      <main className="s2-main" id="s2-main">
        <header className="s2-hero" id="top">
          <h1 className="s2-name">{NAME}</h1>
          <p className="s2-lede s2-fade">
            I study what language models represent inside, and this summer I shipped production ML as an intern at{' '}
            <b>Amazon Robotics</b>. Before that I wrote flight firmware for a satellite that's now in orbit. Fourth-year CS
            at the University of Victoria, graduating April 2027.
          </p>
          <p className="s2-links s2-fade">
            <a href={links.resume.href} {...ext}>Resume ↗</a>
            <a href={links.github.href} {...ext}>GitHub ↗</a>
            <a href={links.linkedin.href} {...ext}>LinkedIn ↗</a>
            <a href={links.email.href}>Email</a>
          </p>
          <a href="#experience" className="s2-down s2-fade" aria-label="Scroll to experience">↓</a>
        </header>

        <section className="s2-sec" id="experience" aria-labelledby="s2-h-exp">
          <h2 className="s2-h" id="s2-h-exp">Experience</h2>
          <ol className="s2-line">
            {jobs.map((r) => (
              <li key={r.org} className="s2-entry">
                <Tile m={r.mark} />
                <div className="s2-entry__body">
                  <p className="s2-when">{r.when}</p>
                  <h3>{r.org}</h3>
                  <p className="s2-role">{r.role}</p>
                  <ul className="s2-bullets">
                    {r.bullets.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                  {proof[r.org] === 'nums' && (
                    <dl className="s2-nums">
                      {amazonMetrics.map((m) => (
                        <div key={m.l}>
                          <dt>{m.n}</dt>
                          <dd>{m.l}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {proof[r.org] === 'orbit' && (
                    <div className="s2-demo">
                      <Demo kind="orbit" compact />
                      <p className="s2-cap">MarmotSat right now, from its live orbital elements (NORAD 69912).</p>
                    </div>
                  )}
                  {proof[r.org] === 'vectors' && (
                    <Link className="s2-more" to={`${base}/research/billion-vector-retrieval`}>Read the write-up →</Link>
                  )}
                </div>
              </li>
            ))}
            <li className="s2-entry">
              <Tile m="uvic" />
              <div className="s2-entry__body">
                <p className="s2-when">Graduating {education.when}</p>
                <h3>{education.school}</h3>
                <p className="s2-role">B.S. Computer Science · {education.note}</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="s2-sec" id="work" aria-labelledby="s2-h-res">
          <h2 className="s2-h" id="s2-h-res">Research</h2>
          <ol className="s2-line">
            {research.map((p) => (
              <li key={p.id} className="s2-entry">
                <Tile m={p.icon} />
                <div className="s2-entry__body">
                  <p className="s2-when">{p.org} · {p.when}</p>
                  <h3>{p.title}</h3>
                  <p>{p.finding}</p>
                  <p className="s2-result">{p.result}</p>
                  {p.demo && (
                    <div className="s2-demo">
                      <Demo kind={p.demo} compact finding={p.id === 'lossmask' || undefined} />
                    </div>
                  )}
                  {p.slug && <Link className="s2-more" to={`${base}/research/${p.slug}`}>Read the write-up →</Link>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="s2-sec" aria-labelledby="s2-h-also">
          <h2 className="s2-h" id="s2-h-also">Other things I've built</h2>
          <ul className="s2-cards">
            {builds.map((m) => {
              const inner = (
                <>
                  <b>{m.title}</b>
                  <span>{m.line}</span>
                </>
              )
              return (
                <li key={m.title}>
                  {m.href ? m.ext ? <a href={m.href} {...ext}>{inner}</a> : <Link to={`${base}${m.href}`}>{inner}</Link> : <div>{inner}</div>}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="s2-sec" aria-labelledby="s2-h-gh">
          <h2 className="s2-h" id="s2-h-gh">On GitHub</h2>
          <GitHubYear />
        </section>

        <section className="s2-life" id="life" aria-labelledby="s2-h-life">
          <h2 className="s2-h" id="s2-h-life">Outside work</h2>
          <p className="s2-life__intro">{life.intro}</p>
          {life.parts.map((part) => (
            <div key={part.id} className="s2-part" data-kind={part.id}>
              <div className="s2-part__text">
                <h3>{part.title}</h3>
                {part.body && <p>{part.body}</p>}
                {part.links?.map((l) => (
                  <a key={l.href} className="s2-more" href={l.href} {...ext}>
                    {l.label} ↗
                  </a>
                ))}
              </div>
              {part.video && (
                <figure className="s2-video">
                  <video src={part.video.src} poster={part.video.poster} autoPlay muted loop playsInline preload="none" aria-label={part.video.caption} />
                  <figcaption>{part.video.caption}</figcaption>
                </figure>
              )}
              {part.id === 'lab' && <LabMap />}
              {part.groups?.map((g) => (
                <div key={g.title} className="s2-group">
                  <h4>{g.title}</h4>
                  <ul className="s2-items">
                    {g.items.map((it) => (
                      <li key={it.name}>
                        <img src={it.img} alt="" loading="lazy" />
                        <b>{it.name}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {part.clips && (
                <div className="s2-clips">
                  {part.clips.map((c) => (
                    <video key={c.src} data-shape={c.shape} src={c.src} poster={c.poster} autoPlay muted loop playsInline preload="none" aria-hidden="true" />
                  ))}
                </div>
              )}
              {part.items && (
                <ul className="s2-items">
                  {part.items.map((it) => (
                    <li key={it.name}>
                      {it.img && <img src={it.img} alt={it.name} loading="lazy" data-pixel={it.pixel || undefined} />}
                      {part.id !== 'photo' && <b>{it.name}</b>}
                      {it.note && <span>{it.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        <footer className="s2-contact" id="contact">
          <h2>Say hello.</h2>
          <p>Research, roles, or a question about any of this. Write here, or email me directly.</p>
          <ContactForm />
          <a href={links.email.href} className="s2-email">dargantanuj@gmail.com</a>
          <p className="s2-links">
            <a href={links.github.href} {...ext}>GitHub ↗</a>
            <a href={links.linkedin.href} {...ext}>LinkedIn ↗</a>
            <a href={links.x.href} {...ext}>X ↗</a>
          </p>
        </footer>
      </main>
    </>
  )
}

export default function S2({ page, base }: VariantProps) {
  return (
    <div className="s2">
      {page.kind === 'home' ? (
        <Home base={base} />
      ) : (
        <div className="s2-page">
          <Link to={`${base}/`} className="s2-more">← Tanuj Dargan</Link>
          <main id="s2-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="s2-name">Nothing here.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
