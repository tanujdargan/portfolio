// Station sheets. Every word is DOM, rendered on the server; demos mount only when their sheet is open.
import type { ReactNode } from 'react'
import { X, ArrowUpRight, FileText, Mail, Linkedin, Github } from 'lucide-react'
import { Link } from '../../lib/router'
import { selected, amazonMetrics, roles, education, more } from '../../content/curated'
import { links } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { Logo } from '../../shared/Mark'
import { LinkIcon } from '../../shared/Links'
import { STATIONS, type StationId } from './stations'
import { Steer, type Concept, type SteerData } from './Steer'
import { dir8, inFor, vicTime, type PassState } from './pass'

const work = (id: string) => selected.find((s) => s.id === id)!
const role = (org: string) => roles.find((r) => r.org === org)!

export interface SheetCtx {
  base: string
  open: StationId | null
  close: () => void
  steer: { data: SteerData | null; concept: Concept; qi: number; ai: number; set: (p: { concept?: Concept; qi?: number; ai?: number }) => void }
  pass: PassState | null
}

function Shell({ id, ctx, children, wide }: { id: StationId; ctx: SheetCtx; children: ReactNode; wide?: boolean }) {
  const s = STATIONS[id]
  const isOpen = ctx.open === id
  return (
    <section
      id={id}
      className="dr-sheet"
      data-open={isOpen || undefined}
      data-wide={wide || undefined}
      data-dr-sheet=""
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-h`}
      style={{ ['--st' as string]: s.color }}
    >
      <div className="dr-sheet__bar">
        <p className="dr-sheet__place">{s.place}</p>
        <a
          href="#"
          className="dr-icon-btn dr-sheet__close"
          aria-label={`Close ${s.place}`}
          onClick={(e) => {
            e.preventDefault()
            ctx.close()
          }}
        >
          <X size={18} aria-hidden="true" />
        </a>
      </div>
      <div className="dr-sheet__body">{children}</div>
    </section>
  )
}

function Head({ id, title, where, when, mark }: { id: StationId; title: string; where: string; when: string; mark?: Parameters<typeof Logo>[0]['m'] }) {
  return (
    <header className="dr-sheet__head">
      {mark && (
        <span className="dr-sheet__mark">
          <Logo m={mark} w={40} h={28} />
        </span>
      )}
      <h2 id={`${id}-h`} tabIndex={-1}>
        {title}
      </h2>
      <p className="dr-meta">
        {where} <span aria-hidden="true">·</span> {when}
      </p>
    </header>
  )
}

const WriteUp = ({ base, slug }: { base: string; slug: string }) => (
  <Link className="dr-btn dr-btn--ghost" to={`${base}/research/${slug}`}>
    Read the write-up <ArrowUpRight size={16} aria-hidden="true" />
  </Link>
)

function AmazonDiagram() {
  return (
    <figure className="dr-diagram">
      <svg viewBox="0 0 560 300" role="img" aria-labelledby="dr-amz-t">
        <title id="dr-amz-t">Illustrative diagram: a planner asks in plain language; the assistant retrieves historical labor plans and site configurations, queries the optimization engine, and answers with a plan or a what-if re-optimization.</title>
        <defs>
          <marker id="dr-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" />
          </marker>
        </defs>
        <g className="dr-dg__box">
          <rect x="12" y="110" width="128" height="76" rx="14" />
          <text x="76" y="142">Planner</text>
          <text x="76" y="162" className="dr-dg__sub">plain-language</text>
          <text x="76" y="176" className="dr-dg__sub">question</text>
        </g>
        <g className="dr-dg__box dr-dg__hot">
          <rect x="206" y="104" width="148" height="88" rx="16" />
          <text x="280" y="140">LLM assistant</text>
          <text x="280" y="160" className="dr-dg__sub">anomalies, labor</text>
          <text x="280" y="174" className="dr-dg__sub">recommendations</text>
        </g>
        <g className="dr-dg__box">
          <rect x="196" y="14" width="168" height="62" rx="14" />
          <text x="280" y="40">RAG</text>
          <text x="280" y="60" className="dr-dg__sub">historical plans · site configs</text>
        </g>
        <g className="dr-dg__box">
          <rect x="196" y="222" width="168" height="62" rx="14" />
          <text x="280" y="248">Optimus engine</text>
          <text x="280" y="268" className="dr-dg__sub">what-if, no full re-run</text>
        </g>
        <g className="dr-dg__box">
          <rect x="420" y="110" width="128" height="76" rx="14" />
          <text x="484" y="142">180+ sites</text>
          <text x="484" y="162" className="dr-dg__sub">NA and EU</text>
          <text x="484" y="176" className="dr-dg__sub">fulfillment</text>
        </g>
        <g className="dr-dg__ln">
          <path d="M140 148H200" markerEnd="url(#dr-ar)" />
          <path d="M268 104V80" markerEnd="url(#dr-ar)" />
          <path d="M292 80V100" markerEnd="url(#dr-ar)" />
          <path d="M268 192V218" markerEnd="url(#dr-ar)" />
          <path d="M292 218V196" markerEnd="url(#dr-ar)" />
          <path d="M354 148H414" markerEnd="url(#dr-ar)" />
        </g>
      </svg>
      <figcaption className="dr-prov">
        <b>Illustrative diagram.</b> No screenshots of internal tools; the numbers are from the resume.
      </figcaption>
    </figure>
  )
}

function Dock({ ctx }: { ctx: SheetCtx }) {
  const w = work('amazon')
  const r = role('Amazon Robotics')
  return (
    <Shell id="dock" ctx={ctx} wide>
      <Head id="dock" title={w.title} where={w.where} when={w.when} mark="amazon" />
      <p className="dr-lede">{w.finding}</p>
      <ul className="dr-metrics">
        {amazonMetrics.map((m) => (
          <li key={m.n}>
            <b>{m.n}</b>
            <span>{m.l}</span>
          </li>
        ))}
      </ul>
      <AmazonDiagram />
      <h3>What I built</h3>
      <ul className="dr-bullets">
        {r.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p className="dr-result">{w.result}.</p>
    </Shell>
  )
}

function Pad({ ctx }: { ctx: SheetCtx }) {
  const w = work('orbit')
  const r = role('UVic CfAR')
  const p = ctx.pass
  const nx = p?.next
  return (
    <Shell id="pad" ctx={ctx} wide>
      <Head id="pad" title={w.title} where={w.where} when={w.when} mark="cfar" />
      <p className="dr-lede">{w.finding}</p>
      <div className="dr-live" aria-live="off">
        <p className="dr-live__tag">
          <span className="dr-dot" data-on={p?.up || undefined} aria-hidden="true" /> {p ? (p.up ? 'Above Victoria now' : 'Live position') : 'Live position'}
        </p>
        {p ? (
          <dl className="dr-live__grid">
            <div>
              <dt>Latitude</dt>
              <dd>
                {Math.abs(p.lat).toFixed(2)}° {p.lat >= 0 ? 'N' : 'S'}
              </dd>
            </div>
            <div>
              <dt>Longitude</dt>
              <dd>
                {Math.abs(p.lon).toFixed(2)}° {p.lon >= 0 ? 'E' : 'W'}
              </dd>
            </div>
            <div>
              <dt>Altitude</dt>
              <dd>{Math.round(p.alt)} km</dd>
            </div>
            <div>
              <dt>{p.up ? 'Elevation' : 'Next pass'}</dt>
              <dd>{p.up ? `${p.el.toFixed(0)}° ${dir8(p.az)}` : nx ? `in ${inFor(nx.aos - p.now)}` : 'searching…'}</dd>
            </div>
          </dl>
        ) : (
          <p className="dr-meta">Propagating the orbit…</p>
        )}
        {p && nx && !p.up && (
          <p className="dr-meta">
            Rises {vicTime(nx.aos)} in the {dir8(nx.aosAz)}, peaks at {nx.maxEl.toFixed(0)}°.
          </p>
        )}
        <p className="dr-prov">
          <b>Live:</b> SGP4 from MarmotSat’s public TLE ({p?.source === 'build' ? 'build-time snapshot' : 'CelesTrak'}), NORAD 69912, seen from Victoria.
        </p>
      </div>
      <h3>The firmware</h3>
      <ul className="dr-bullets">
        {r.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      {ctx.open === 'pad' && <Demo kind="orbit" />}
      <p className="dr-result">{w.result}.</p>
    </Shell>
  )
}

function Log({ ctx }: { ctx: SheetCtx }) {
  const w = work('lossmask')
  return (
    <Shell id="log" ctx={ctx} wide>
      <Head id="log" title={w.title} where={w.where} when={w.when} mark="apart" />
      <p className="dr-lede">{w.finding}</p>
      {ctx.open === 'log' && <Demo kind="lossmask" />}
      <p className="dr-prov">
        <b>Illustrative conversation.</b> Its Qwen2.5 tokens and the loss weights are exact.
      </p>
      <p className="dr-result">{w.result}.</p>
      <WriteUp base={ctx.base} slug="loss-masking-distress" />
    </Shell>
  )
}

function Model({ ctx }: { ctx: SheetCtx }) {
  const w = work('steering')
  return (
    <Shell id="model" ctx={ctx} wide>
      <Head id="model" title={w.title} where={w.where} when={w.when} />
      <p className="dr-lede">{w.finding}</p>
      <Steer {...ctx.steer} />
      <h3>The full demo</h3>
      {ctx.open === 'model' && <Demo kind="steering" rest={0.6} finding />}
      <p className="dr-result">{w.result}.</p>
      <WriteUp base={ctx.base} slug="activation-steering" />
    </Shell>
  )
}

function Pier({ ctx }: { ctx: SheetCtx }) {
  const w = work('ocean')
  return (
    <Shell id="pier" ctx={ctx} wide>
      <Head id="pier" title={w.title} where={w.where} when={w.when} mark="uvic" />
      <p className="dr-lede">{w.finding}</p>
      <p className="dr-big">
        R² <b>0.936</b> <span>against deep-water sensors</span>
      </p>
      {ctx.open === 'pier' && <Demo kind="ocean" />}
      <p className="dr-prov">
        <b>Illustrative profile.</b> The only real number here is R² 0.936.
      </p>
      <WriteUp base={ctx.base} slug="ocean-sensing" />
    </Shell>
  )
}

function Board({ ctx }: { ctx: SheetCtx }) {
  return (
    <Shell id="board" ctx={ctx}>
      <header className="dr-sheet__head">
        <h2 id="board-h" tabIndex={-1}>
          Experience and contact
        </h2>
        <p className="dr-meta">
          {education.school} <span aria-hidden="true">·</span> {education.degree} <span aria-hidden="true">·</span> {education.when}
        </p>
      </header>
      <div className="dr-contact">
        <a className="dr-btn" href={links.resume.href} target="_blank" rel="noopener">
          <FileText size={16} aria-hidden="true" /> Resume (PDF)
        </a>
        <a className="dr-btn dr-btn--ghost" href={links.email.href}>
          <Mail size={16} aria-hidden="true" /> {links.email.href.replace('mailto:', '')}
        </a>
        <a className="dr-btn dr-btn--ghost" href={links.linkedin.href} target="_blank" rel="noopener">
          <Linkedin size={16} aria-hidden="true" /> LinkedIn
        </a>
        <a className="dr-btn dr-btn--ghost" href={links.github.href} target="_blank" rel="noopener">
          <Github size={16} aria-hidden="true" /> GitHub
        </a>
        <a className="dr-btn dr-btn--ghost" href={links.x.href} target="_blank" rel="noopener">
          <LinkIcon k="x" size={16} /> X
        </a>
      </div>
      <h3>Experience</h3>
      <ol className="dr-roles">
        {roles.map((r) => (
          <li key={r.org}>
            <Logo m={r.mark} w={36} h={26} />
            <div>
              <p className="dr-roles__t">
                <b>{r.org}</b> <span>{r.role}</span>
              </p>
              <p className="dr-meta">{r.when}</p>
              <p>{r.line}</p>
            </div>
          </li>
        ))}
      </ol>
      <h3>More</h3>
      <ul className="dr-more">
        {more.map((m) => (
          <li key={m.title}>
            {m.href ? (
              m.ext ? (
                <a href={m.href} target="_blank" rel="noopener">
                  {m.title} <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              ) : (
                <Link to={`${ctx.base}${m.href}`}>{m.title}</Link>
              )
            ) : (
              <b>{m.title}</b>
            )}
            <span>{m.line}</span>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

export function Sheets({ ctx }: { ctx: SheetCtx }) {
  return (
    <>
      <Dock ctx={ctx} />
      <Pad ctx={ctx} />
      <Log ctx={ctx} />
      <Model ctx={ctx} />
      <Pier ctx={ctx} />
      <Board ctx={ctx} />
    </>
  )
}
