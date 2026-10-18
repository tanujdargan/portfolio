/*
 * S1 "Long form". Round 10: Q1/Q2 were too bare and too compressed. Technical work first, each project given a full,
 * roomy section with its live demo beside it; then a longer "away from the desk" part: electronics, games, photography.
 * Opening: Q2's settle (the name alone mid-screen, then it glides into the hero). Pure CSS, once per session.
 */
import type { VariantProps } from '../../routes'
import { selected, amazonMetrics, more, roles, education } from '../../content/curated'
import { links } from '../../content/site'
import { Logo } from '../../shared/Mark'
import { Demo } from '../../demos/Demo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import { life } from './life'
import './s1.css'

const NAME = 'Tanuj Dargan'
const org: Record<string, string> = {
  amazon: 'Amazon Robotics',
  lossmask: 'Apart Research',
  orbit: 'UVic Centre for Aerospace Research',
  steering: 'Independent research',
  ocean: 'SOLIDS Lab, UVic',
}
const projects = ['amazon', 'lossmask', 'orbit', 'steering', 'ocean'].map((id) => selected.find((s) => s.id === id)!)

const gate = `(function(){var d=document.documentElement,k='s1-seen';try{if(sessionStorage.getItem(k)||matchMedia('(prefers-reduced-motion: reduce)').matches)d.setAttribute('data-s1-skip','');sessionStorage.setItem(k,'1')}catch(e){}var s=function(){d.setAttribute('data-s1-skip','')};['pointerdown','keydown','wheel','touchmove'].forEach(function(e){addEventListener(e,s,{once:true,passive:true})})})()`

const ext = { target: '_blank', rel: 'noopener' } as const

function Home({ base }: { base: string }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: gate }} />
      <nav className="s1-nav s1-fade" aria-label="Sections">
        <a href="#top" className="s1-nav__me">TD</a>
        <span>
          <a href="#work">Work</a>
          <a href="#experience">Experience</a>
          <a href="#life">Outside work</a>
          <a href="#contact">Contact</a>
        </span>
      </nav>
      <main className="s1-main" id="s1-main">
        <header className="s1-hero" id="top">
          <h1 className="s1-name">{NAME}</h1>
          <p className="s1-lede s1-fade">
            I build production ML at <b>Amazon Robotics</b> and study what language models represent inside. Before that I
            wrote flight firmware for a satellite that's now in orbit. CS at the University of Victoria, graduating April
            2027.
          </p>
          <p className="s1-links s1-fade">
            <a href={links.resume.href} {...ext}>Resume ↗</a>
            <a href={links.github.href} {...ext}>GitHub ↗</a>
            <a href={links.linkedin.href} {...ext}>LinkedIn ↗</a>
            <a href={links.email.href}>Email</a>
          </p>
          <a href="#work" className="s1-down s1-fade" aria-label="Scroll to work">↓</a>
        </header>

        <section id="work" aria-label="Work">
          {projects.map((p, i) => (
            <article key={p.id} className="s1-proj" id={`work-${p.id}`}>
              <div className="s1-proj__text">
                <p className="s1-kicker">
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {p.mark && <Logo m={p.mark} w={p.mark === 'pearcare' ? 48 : 18} h={18} />}
                  {org[p.id]} · {p.when}
                </p>
                <h2>{p.title}</h2>
                <p>{p.finding}</p>
                <p className="s1-result">{p.result}</p>
                {p.slug && (
                  <Link className="s1-more" to={`${base}/research/${p.slug}`}>
                    Read the write-up →
                  </Link>
                )}
              </div>
              <div className="s1-proj__demo">
                {p.demo ? (
                  <Demo kind={p.demo} compact finding={p.id === 'lossmask' || undefined} />
                ) : (
                  <dl className="s1-nums">
                    {amazonMetrics.map((m) => (
                      <div key={m.l}>
                        <dt>{m.n}</dt>
                        <dd>{m.l}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="s1-sec" aria-labelledby="s1-h-also">
          <h2 className="s1-h" id="s1-h-also">More things I've built</h2>
          <ul className="s1-cards">
            {more.map((m) => {
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

        <section className="s1-sec" id="experience" aria-labelledby="s1-h-exp">
          <h2 className="s1-h" id="s1-h-exp">Experience</h2>
          <ol className="s1-roles">
            {roles.map((r) => (
              <li key={r.org}>
                <span className="s1-when">{r.when}</span>
                <div>
                  <b>
                    <Logo m={r.mark} w={r.mark === 'pearcare' ? 48 : 18} h={18} /> {r.org}
                  </b>
                  <span className="s1-role">{r.role}</span>
                  <p>{r.line}</p>
                </div>
              </li>
            ))}
            <li>
              <span className="s1-when">Until {education.when}</span>
              <div>
                <b>
                  <Logo m="uvic" w={18} h={18} /> {education.school}
                </b>
                <span className="s1-role">{education.degree}</span>
                <p>{education.note}.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="s1-life" id="life" aria-labelledby="s1-h-life">
          <h2 className="s1-h" id="s1-h-life">Outside work</h2>
          <p className="s1-life__intro">{life.intro}</p>
          {life.parts.map((part) => (
            <div key={part.id} className="s1-part" data-kind={part.id}>
              <div className="s1-part__text">
                <h3>{part.title}</h3>
                <p>{part.body}</p>
                {part.links?.map((l) => (
                  <a key={l.href} className="s1-more" href={l.href} {...ext}>
                    {l.label} ↗
                  </a>
                ))}
              </div>
              {part.video && (
                <figure className="s1-video">
                  <video src={part.video.src} poster={part.video.poster} autoPlay muted loop playsInline preload="none" aria-label={part.video.caption} />
                  <figcaption>{part.video.caption}</figcaption>
                </figure>
              )}
              {part.items && (
                <ul className="s1-items">
                  {part.items.map((it) => (
                    <li key={it.name}>
                      {it.img ? <img src={it.img} alt={it.name} loading="lazy" data-pixel={it.pixel || undefined} /> : <span className="s1-ph" aria-hidden="true" />}
                      <b>{it.name}</b>
                      {it.note && <span>{it.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        <footer className="s1-contact" id="contact">
          <h2>Say hello.</h2>
          <p>Research, internships, or a question about any of this. Email is fastest.</p>
          <a href={links.email.href} className="s1-email">tanujd@uvic.ca</a>
          <p className="s1-links">
            <a href={links.github.href} {...ext}>GitHub ↗</a>
            <a href={links.linkedin.href} {...ext}>LinkedIn ↗</a>
            <a href={links.x.href} {...ext}>X ↗</a>
          </p>
        </footer>
      </main>
    </>
  )
}

export default function S1({ page, base }: VariantProps) {
  return (
    <div className="s1">
      {page.kind === 'home' ? (
        <Home base={base} />
      ) : (
        <div className="s1-page">
          <Link to={`${base}/`} className="s1-more">← Tanuj Dargan</Link>
          <main id="s1-main">
            {page.kind === 'research' && <ResearchArticle key={page.slug} slug={page.slug} base={base} />}
            {page.kind === 'beri' && <BeriCaseStudy base={base} />}
            {page.kind === 'notfound' && <h1 className="s1-name">Nothing here.</h1>}
          </main>
        </div>
      )}
    </div>
  )
}
