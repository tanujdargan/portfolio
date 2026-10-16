import { useState } from 'react'
import { Check, ChevronDown, Copy } from 'lucide-react'
import { links, person } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { Poster } from '../../shared/Poster'
import { prefetchDemo } from '../../content/work'
import { Link } from '../../lib/router'
import { ResumeButton, Socials } from './index'
import { Logo } from '../../shared/Mark'
import { amazonMetrics, context, education, more, proofs, roles, selected, thesis, type Item } from '../../content/curated'

// ---------- hero ----------

export function Proofs() {
  return (
    <ul className="m-proofs">
      {proofs.map((p) => (
        <li key={p.org} className="m-proof">
          <Logo m={p.mark} w={44} h={32} />
          <div>
            <b>{p.org}</b>
            <span>{p.line}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export const Actions = () => (
  <div className="m-actions">
    <ResumeButton big />
    <Socials big />
  </div>
)

/** Proof line + the live steering demo beside it. */
function HeroA1() {
  return (
    <section className="m-wrap m-hero m-a1" aria-labelledby="thesis">
      <div className="m-a1__text">
        <h1 id="thesis" className="m-thesis">
          {thesis}
        </h1>
        <p className="m-context">{context}</p>
        <Proofs />
        <Actions />
      </div>
      <div className="m-a1__demo m-fig" data-k="steering">
        <Demo kind="steering" compact rest={0.6} />
      </div>
    </section>
  )
}

// ---------- selected work ----------

export type Depth = 'live' | 'open' | 'preview'

export function Spec({ it }: { it: Item }) {
  return (
    <dl className="m-spec">
      <div>
        <dt>Where</dt>
        <dd>{it.where}</dd>
      </div>
      <div>
        <dt>When</dt>
        <dd>{it.when}</dd>
      </div>
      <div>
        <dt>Result</dt>
        <dd>{it.result}</dd>
      </div>
    </dl>
  )
}

export function Metrics() {
  return (
    <div className="m-metrics">
      <Logo m="amazon" w={40} h={40} />
      <dl>
        {amazonMetrics.map((x) => (
          <div key={x.l}>
            <dt>{x.l}</dt>
            <dd>{x.n}</dd>
          </div>
        ))}
      </dl>
      <p>Optimus is Amazon’s labor-planning platform. Numbers from the resume; no internal screenshots.</p>
    </div>
  )
}

export function Figure({ it, depth }: { it: Item; depth: Depth }) {
  const [open, setOpen] = useState(depth === 'live')
  if (!it.demo) return <Metrics />
  const opts = it.demo === 'steering' ? { rest: 0.6 } : it.demo === 'lossmask' ? { finding: true } : {}
  if (open)
    return (
      <div className="m-fig" data-k={it.demo}>
        <Demo kind={it.demo} {...opts} />
      </div>
    )
  // The tracker has no write-up, so on B3 it still opens here.
  const toWriteup = depth === 'preview' && it.slug
  return (
    <div className="m-fig m-preview" data-k={it.demo}>
      <Poster k={it.demo} label />
      {toWriteup ? (
        <Link to={`/research/${it.slug}`} className="m-btn">
          Try the live demo on the write-up →
        </Link>
      ) : (
        <button
          type="button"
          className="m-btn"
          onClick={() => setOpen(true)}
          onPointerEnter={() => prefetchDemo[it.demo!]()}
          onFocus={() => prefetchDemo[it.demo!]()}
        >
          {it.demo === 'orbit' ? 'Open the live tracker' : 'Open the live demo'}
        </button>
      )}
    </div>
  )
}

export function WorkBody({ it, depth }: { it: Item; depth: Depth }) {
  return (
    <>
      <p className="m-finding">{it.finding}</p>
      <Spec it={it} />
      {it.slug && (
        <Link to={`/research/${it.slug}`} className="m-link m-more-link">
          Write-up →
        </Link>
      )}
      <Figure it={it} depth={depth} />
    </>
  )
}

export function Work({ depth, steeringInHero }: { depth: Depth; steeringInHero: boolean }) {
  return (
    <section className="m-wrap m-sec" id="work" aria-labelledby="work-h">
      <h2 id="work-h" className="m-h2">
        Selected work
      </h2>
      <ol className="m-work">
        {selected.map((it) => {
          // The hero already holds the steering demo (§7.7: nothing said twice), so here it's a pointer.
          if (it.id === 'steering' && steeringInHero)
            return (
              <li key={it.id} className="m-item m-item--ref">
                <h3 className="m-h3">{it.title}</h3>
                <p className="m-finding">{it.finding}</p>
                <p className="m-ref-links">
                  <a href="#thesis" className="m-link">
                    Live demo at the top
                  </a>
                  <Link to={`/research/${it.slug}`} className="m-link">
                    Write-up →
                  </Link>
                </p>
              </li>
            )
          return (
            <li key={it.id} className="m-item">
              <div className="m-item__head">
                {it.mark && <Logo m={it.mark} w={44} h={32} />}
                <h3 className="m-h3">{it.title}</h3>
              </div>
              <WorkBody it={it} depth={depth} />
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// ---------- the rest ----------

export function More() {
  return (
    <section className="m-wrap m-sec" aria-labelledby="more-h">
      <h2 id="more-h" className="m-h2">
        More work
      </h2>
      <ul className="m-rows">
        {more.map((x) => {
          const inner = (
            <>
              <span className="m-rows__t">{x.title}</span>
              <span className="m-rows__l">{x.line}</span>
              {x.href && <span className="m-rows__go" aria-hidden="true">{x.ext ? '↗' : '→'}</span>}
            </>
          )
          return (
            <li key={x.title}>
              {!x.href ? (
                <div className="m-rows__row">{inner}</div>
              ) : x.ext ? (
                <a className="m-rows__row" href={x.href} target="_blank" rel="noopener">
                  {inner}
                </a>
              ) : (
                <Link className="m-rows__row" to={x.href}>
                  {inner}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function Experience() {
  return (
    <section className="m-wrap m-sec" id="experience" aria-labelledby="exp-h">
      <h2 id="exp-h" className="m-h2">
        Experience
      </h2>
      <ul className="m-exp">
        {roles.map((r) => (
          <li key={r.org}>
            <details className="m-role">
              <summary>
                <Logo m={r.mark} w={44} h={32} />
                <span className="m-role__main">
                  <span className="m-role__t">
                    <b>{r.org}</b> · {r.role}
                  </span>
                  <span className="m-role__l">{r.line}</span>
                </span>
                <span className="m-role__when">{r.when}</span>
                <ChevronDown className="m-role__chev" size={18} aria-hidden="true" />
              </summary>
              <ul className="m-role__b">
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
      <p className="m-edu">
        <Logo m="uvic" w={44} h={32} />
        <span>
          <b>{education.school}</b> · {education.degree}, {education.when}. {education.note}.
        </span>
      </p>
    </section>
  )
}

export function Contact() {
  const [copied, setCopied] = useState(false)
  return (
    <section className="m-wrap m-sec m-contact" id="contact" aria-labelledby="contact-h">
      <h2 id="contact-h" className="m-h2">
        Contact
      </h2>
      <p className="m-lede">Research programs, labs and founders: email is fastest.</p>
      <div className="m-email">
        <a href={links.email.href} className="m-email__a">
          {person.email}
        </a>
        <button
          type="button"
          className="m-icon-btn"
          aria-label={copied ? 'Email copied' : 'Copy email'}
          onClick={() => {
            navigator.clipboard?.writeText(person.email).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            })
          }}
        >
          {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
        </button>
      </div>
      <ul className="m-contact__links">
        {(['github', 'linkedin', 'x', 'resume'] as const).map((k) => (
          <li key={k}>
            <a href={links[k].href} target="_blank" rel="noopener" className="m-link">
              {k === 'resume' ? 'Resume (PDF, Aug 2026)' : links[k].label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Home() {
  return (
    <>
      <HeroA1 />
      <Work depth="open" steeringInHero />
      <More />
      <Experience />
      <Contact />
    </>
  )
}
