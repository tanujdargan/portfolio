// The apps on Tanuj's monitor. Same components render inside the full-screen OS and inside the object sheets.
// Facts only from src/content (curated.ts, site.ts); see the W1 notes in index.tsx.
import type { ReactNode } from 'react'
import { ArrowUpRight, Briefcase, Cpu, FileText, FlaskConical, Mail, Package, Satellite, User } from 'lucide-react'
import { amazonMetrics, context, education, more, proofs, roles, selected, thesis, type Mark } from '../../content/curated'
import { links, person, research } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { Logo } from '../../shared/Mark'
import { LinkIcon } from '../../shared/Links'
import { Link } from '../../lib/router'

export type AppId = 'about' | 'work' | 'amazon' | 'marmotsat' | 'research' | 'experience' | 'contact'
export const APPS: { id: AppId; label: string; icon: typeof User }[] = [
  { id: 'about', label: 'About', icon: User },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'amazon', label: 'Amazon', icon: Package },
  { id: 'marmotsat', label: 'MarmotSat', icon: Satellite },
  { id: 'research', label: 'Research', icon: FlaskConical },
  { id: 'experience', label: 'Experience', icon: Cpu },
  { id: 'contact', label: 'Contact', icon: Mail },
]
export const isApp = (s: string): s is AppId => APPS.some((a) => a.id === s)

const item = (id: string) => selected.find((s) => s.id === id)!
const PROOF_APP: Record<string, AppId> = { amazon: 'amazon', cfar: 'marmotsat', apart: 'research' }

export interface AppCtx {
  base: string
  open: (id: AppId, anchor?: string) => void
}

/* ------------------------------------------------------------------ bits */

export function Contact({ className = 'w1-links', only = ['resume', 'email', 'linkedin'] as const }: { className?: string; only?: readonly ('resume' | 'email' | 'linkedin' | 'github' | 'x')[] }) {
  return (
    <ul className={className}>
      {only.map((k) => {
        const l = links[k]
        const ext = !l.href.startsWith('mailto:')
        const label = k === 'resume' ? 'Resume (PDF)' : k === 'email' ? 'Email' : l.label
        return (
          <li key={k}>
            <a href={l.href} data-k={k} {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>
              <LinkIcon k={k} size={16} />
              <span>{label}</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function Head({ kicker, title, mark, children }: { kicker: string; title: ReactNode; mark?: Mark; children?: ReactNode }) {
  return (
    <header className="w1-app__head">
      <p className="w1-kicker">
        {mark && <Logo m={mark} w={18} h={18} />}
        {kicker}
      </p>
      <h2 className="w1-app__title">{title}</h2>
      {children}
    </header>
  )
}

function Meta({ where, when, result }: { where: string; when: string; result?: string }) {
  return (
    <dl className="w1-meta">
      <div>
        <dt>Where</dt>
        <dd>{where}</dd>
      </div>
      <div>
        <dt>When</dt>
        <dd>{when}</dd>
      </div>
      {result && (
        <div>
          <dt>Result</dt>
          <dd>{result}</dd>
        </div>
      )}
    </dl>
  )
}

/* ------------------------------------------------------------------ apps */

export function About({ base, open }: AppCtx) {
  return (
    <div className="w1-app">
      <header className="w1-app__head w1-about__head">
        <p className="w1-kicker">{person.location} · CS, University of Victoria</p>
        <h2 className="w1-about__name">{person.name}</h2>
        <p className="w1-about__thesis">{thesis}</p>
        <p className="w1-muted">{context}</p>
        <Contact className="w1-links w1-links--row" only={['resume', 'email', 'linkedin', 'github', 'x']} />
      </header>
      <section className="w1-sec" aria-labelledby="w1-a-proof">
        <h3 className="w1-h3" id="w1-a-proof">
          Three things to know
        </h3>
        <ul className="w1-proofcards">
          {proofs.map((p) => (
            <li key={p.mark}>
              <button type="button" onClick={() => open(PROOF_APP[p.mark])}>
                <Logo m={p.mark} w={28} h={28} />
                <span>
                  <b>{p.org}</b>
                  <span>{p.line}</span>
                </span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="w1-sec" aria-labelledby="w1-a-more">
        <h3 className="w1-h3" id="w1-a-more">
          Also
        </h3>
        <ul className="w1-rows">
          {more.map((m) => (
            <li key={m.title}>
              <More m={m} base={base} />
            </li>
          ))}
        </ul>
      </section>
      <section className="w1-sec" aria-labelledby="w1-a-edu">
        <h3 className="w1-h3" id="w1-a-edu">
          Education
        </h3>
        <p>
          <b>{education.school}</b>, {education.degree}. Graduating {education.when}. {education.note}.
        </p>
      </section>
    </div>
  )
}

function More({ m, base }: { m: (typeof more)[number]; base: string }) {
  const body = (
    <>
      <b>{m.title}</b>
      <span>{m.line}</span>
      {m.href && <ArrowUpRight size={15} aria-hidden="true" />}
    </>
  )
  if (!m.href) return <div className="w1-row">{body}</div>
  if (m.ext)
    return (
      <a className="w1-row" href={m.href} target="_blank" rel="noreferrer">
        {body}
      </a>
    )
  return (
    <Link className="w1-row" to={base + m.href}>
      {body}
    </Link>
  )
}

export function Work({ base, open }: AppCtx) {
  return (
    <div className="w1-app">
      <Head kicker="Selected work" title="What I’ve shipped and found" />
      <ol className="w1-work">
        {selected.map((s, i) => (
          <li key={s.id} id={`w1-work-${s.id}`}>
            <article className="w1-workitem">
              <p className="w1-workitem__n">{String(i + 1).padStart(2, '0')}</p>
              <div>
                <p className="w1-kicker">
                  {s.mark && <Logo m={s.mark} w={16} h={16} />}
                  {s.where} · {s.when}
                </p>
                <h3 className="w1-workitem__t">{s.title}</h3>
                <p>{s.finding}</p>
                <p className="w1-result">{s.result}</p>
                <p className="w1-actions">
                  {s.id === 'amazon' && (
                    <button type="button" className="w1-btn" onClick={() => open('amazon')}>
                      Open the Amazon notes
                    </button>
                  )}
                  {s.id === 'orbit' && (
                    <button type="button" className="w1-btn" onClick={() => open('marmotsat')}>
                      Track MarmotSat live
                    </button>
                  )}
                  {s.slug && (
                    <Link className="w1-btn" to={`${base}/research/${s.slug}`}>
                      Read the write-up
                    </Link>
                  )}
                </p>
              </div>
            </article>
            {s.demo && s.demo !== 'orbit' && (
              <div className="w1-figure">
                <Demo kind={s.demo} finding={s.demo === 'lossmask'} rest={s.demo === 'steering' ? 0.6 : undefined} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Illustrative only: how the assistant sits in planning. No internal screenshots exist; numbers are the resume's. */
function AmazonDiagram() {
  return (
    <figure className="w1-diagram">
      <svg viewBox="0 0 660 300" role="img" aria-labelledby="w1-amz-t w1-amz-d">
        <title id="w1-amz-t">How the planning assistant fits in (illustrative)</title>
        <desc id="w1-amz-d">
          A planner asks a question in plain language. The assistant retrieves from historical labor plans and site configurations, answers inside
          Optimus, flags anomalies, recommends labor, and runs what-if scenarios on the optimization engine without a full solver re-run.
        </desc>
        <defs>
          <marker id="w1-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 8 4 0 8z" fill="currentColor" />
          </marker>
        </defs>
        <g className="w1-dg-box">
          <rect x="4" y="118" width="164" height="64" rx="10" />
          <text x="86" y="145">Planner asks</text>
          <text x="86" y="163" className="w1-dg-sub">in plain language</text>
        </g>
        <g className="w1-dg-box w1-dg-box--hi">
          <rect x="200" y="98" width="200" height="104" rx="12" />
          <text x="300" y="134">LLM planning assistant</text>
          <text x="300" y="154" className="w1-dg-sub">multi-turn, inside Optimus</text>
          <text x="300" y="174" className="w1-dg-sub">180+ fulfillment sites</text>
        </g>
        <g className="w1-dg-box">
          <rect x="200" y="10" width="200" height="56" rx="10" />
          <text x="300" y="34">RAG over</text>
          <text x="300" y="52" className="w1-dg-sub">labor plans · site configs</text>
        </g>
        <g className="w1-dg-box">
          <rect x="200" y="234" width="200" height="56" rx="10" />
          <text x="300" y="258">Optimization engine</text>
          <text x="300" y="276" className="w1-dg-sub">what-if, no full re-run</text>
        </g>
        <g className="w1-dg-box">
          <rect x="456" y="60" width="200" height="48" rx="10" />
          <text x="556" y="89">Plan answers</text>
          <rect x="456" y="126" width="200" height="48" rx="10" />
          <text x="556" y="155">Anomaly flags</text>
          <rect x="456" y="192" width="200" height="48" rx="10" />
          <text x="556" y="221">Labor recommendations</text>
        </g>
        <g className="w1-dg-wire" markerEnd="url(#w1-arr)">
          <path d="M168 150 H196" />
          <path d="M300 66 V94" />
          <path d="M300 202 V230" />
          <path d="M400 130 C430 130 430 84 452 84" />
          <path d="M400 150 H452" />
          <path d="M400 170 C430 170 430 216 452 216" />
        </g>
      </svg>
      <figcaption>Illustrative diagram. There are no screenshots of internal tools; the numbers are from my resume.</figcaption>
    </figure>
  )
}

export function Amazon(_: AppCtx) {
  const s = item('amazon')
  const r = roles.find((x) => x.mark === 'amazon')!
  return (
    <div className="w1-app">
      <Head kicker="Amazon Robotics · SDE intern" title={s.title} mark="amazon">
        <p className="w1-lede">{s.finding}</p>
        <Meta where={s.where} when={s.when} result={s.result} />
      </Head>
      <ul className="w1-metrics">
        {amazonMetrics.map((m) => (
          <li key={m.n}>
            <b>{m.n}</b>
            <span>{m.l}</span>
          </li>
        ))}
      </ul>
      <AmazonDiagram />
      <section className="w1-sec" aria-labelledby="w1-amz-b">
        <h3 className="w1-h3" id="w1-amz-b">
          What I built
        </h3>
        <ul className="w1-bullets">
          {r.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function FirmwareDiagram() {
  const steps = ['Commit', 'GitHub Actions', 'SWD flash to the board', '80+ checksum rules', 'Pass / fail']
  return (
    <figure className="w1-diagram">
      <ol className="w1-pipe" aria-label="Firmware CI and hardware-in-the-loop pipeline (illustrative)">
        {steps.map((s, i) => (
          <li key={s}>
            <span className="w1-pipe__n">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="w1-before">
        <div>
          <span>Testing, before</span>
          <b>180 min</b>
        </div>
        <div>
          <span>After CI/HIL</span>
          <b>15 min</b>
        </div>
      </div>
      <figcaption>Illustrative layout of the pipeline; the steps and numbers are from my resume.</figcaption>
    </figure>
  )
}

export function MarmotSat(_: AppCtx) {
  const s = item('orbit')
  const r = roles.find((x) => x.mark === 'cfar')!
  return (
    <div className="w1-app">
      <Head kicker="UVic Centre for Aerospace Research" title={s.title} mark="cfar">
        <p className="w1-lede">{s.finding}</p>
        <Meta where={s.where} when={s.when} result={s.result} />
      </Head>
      <div className="w1-figure">
        <Demo kind="orbit" />
      </div>
      <section className="w1-sec" id="w1-firmware" aria-labelledby="w1-fw">
        <h3 className="w1-h3" id="w1-fw">
          The flight computer
        </h3>
        <FirmwareDiagram />
        <ul className="w1-bullets">
          {r.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function Research({ base }: AppCtx) {
  const lm = item('lossmask')
  const st = item('steering')
  return (
    <div className="w1-app">
      <Head kicker="Interpretability and model welfare" title="Research notebooks" />
      <section className="w1-sec" aria-labelledby="w1-r-lm">
        <p className="w1-kicker">
          <Logo m="apart" w={16} h={16} />
          {lm.where} · {lm.when}
        </p>
        <h3 className="w1-h3 w1-h3--big" id="w1-r-lm">
          {lm.title}
        </h3>
        <p>{lm.finding}</p>
        <div className="w1-figure">
          <Demo kind="lossmask" finding />
        </div>
        <Link className="w1-btn" to={`${base}/research/${lm.slug}`}>
          Read the write-up
        </Link>
      </section>
      <section className="w1-sec" aria-labelledby="w1-r-st">
        <p className="w1-kicker">{st.where}</p>
        <h3 className="w1-h3 w1-h3--big" id="w1-r-st">
          {st.title}
        </h3>
        <p>{st.finding}</p>
        <div className="w1-figure">
          <Demo kind="steering" rest={0.6} />
        </div>
        <Link className="w1-btn" to={`${base}/research/${st.slug}`}>
          Read the write-up
        </Link>
      </section>
      <section className="w1-sec" aria-labelledby="w1-r-all">
        <h3 className="w1-h3" id="w1-r-all">
          All write-ups
        </h3>
        <ul className="w1-rows">
          {research.map((r) => (
            <li key={r.slug}>
              <Link className="w1-row" to={`${base}/research/${r.slug}`}>
                <b>{r.title}</b>
                <span>
                  {r.where} · {r.when}
                </span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function Experience(_: AppCtx) {
  return (
    <div className="w1-app">
      <Head kicker="Pinned above the boxes" title="Experience" />
      <ol className="w1-roles">
        {roles.map((r) => (
          <li key={r.org}>
            <Logo m={r.mark} w={32} h={32} />
            <div>
              <p className="w1-roles__t">
                <b>{r.role}</b>, {r.org}
              </p>
              <p className="w1-muted w1-mono">{r.when}</p>
              <ul className="w1-bullets">
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
      <section className="w1-sec">
        <h3 className="w1-h3">Education</h3>
        <p>
          <b>{education.school}</b>, {education.degree}. Graduating {education.when}. {education.note}.
        </p>
      </section>
    </div>
  )
}

export function ContactApp(_: AppCtx) {
  return (
    <div className="w1-app">
      <Head kicker="Get in touch" title="Say hello">
        <p className="w1-lede">
          The fastest way to reach me is email: <a href={links.email.href}>{person.email}</a>.
        </p>
      </Head>
      <Contact className="w1-links w1-links--big" only={['resume', 'email', 'linkedin', 'github', 'x']} />
    </div>
  )
}

export const APP_VIEW: Record<AppId, (p: AppCtx) => JSX.Element> = {
  about: About,
  work: Work,
  amazon: Amazon,
  marmotsat: MarmotSat,
  research: Research,
  experience: Experience,
  contact: ContactApp,
}

export const ResumeIcon = FileText
