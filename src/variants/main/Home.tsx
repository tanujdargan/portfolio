import { useState } from 'react'
import { Check, ChevronDown, Copy } from 'lucide-react'
import { links, person } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { Poster } from '../../shared/Poster'
import { prefetchDemo } from '../../content/work'
import { Link } from '../../lib/router'
import { ResumeButton, Socials } from './index'
import { amazonMetrics, context, education, more, proofs, roles, selected, thesis, type Item, type Mark } from './content'
import { heroSteer } from './steer-hero'

// ---------- logos ----------

// Native aspect of each mark (viewBox w/h), so width/height attributes reserve the box before the SVG arrives.
const ratio: Record<Exclude<Mark, 'pearcare'>, number> = { amazon: 251 / 260, cfar: 926 / 280, mlh: 310.6 / 106.5, rbc: 39.5 / 52, uvic: 1, apart: 1 }
const markLabel: Record<Mark, string> = {
  amazon: 'Amazon', cfar: 'UVic Centre for Aerospace Research', mlh: 'Major League Hacking', rbc: 'RBC', uvic: 'University of Victoria',
  apart: 'Apart Research', pearcare: 'Pear Care',
}
/** Full-colour mark on the surface, fitted into a w×h slot. Marks with dark ink ship a file per theme; CSS shows one
 *  and the hidden lazy <img> is never fetched. */
export function Logo({ m, w = 48, h = 32 }: { m: Mark; w?: number; h?: number }) {
  if (m === 'pearcare')
    return (
      <span className="m-logo m-logo--type" style={{ width: w, height: h }} role="img" aria-label={markLabel[m]}>
        pear<b>care</b>
      </span>
    )
  const r = ratio[m]
  const [iw, ih] = r > w / h ? [w, Math.round(w / r)] : [Math.round(h * r), h]
  const file = m === 'uvic' ? 'tile-uvic' : `mark-${m}`
  const inked = m === 'amazon' || m === 'cfar' || m === 'mlh'
  const img = (src: string, cls: string, alt: string) => (
    <img className={cls} src={src} width={iw} height={ih} alt={alt} loading="lazy" decoding="async" />
  )
  return (
    <span className="m-logo" style={{ width: w, height: h }}>
      {inked ? (
        <>
          {img(`/logos/${file}.svg`, 'm-ink-l', markLabel[m])}
          {img(`/logos/${file}-d.svg`, 'm-ink-d', markLabel[m])}
        </>
      ) : (
        img(`/logos/${file}.svg`, m === 'uvic' || m === 'apart' ? 'm-tile' : '', markLabel[m])
      )}
    </span>
  )
}

// ---------- heroes (Gate A) ----------

function Proofs() {
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

const Actions = () => (
  <div className="m-actions">
    <ResumeButton big />
    <Socials big />
  </div>
)

/** A1: proof line + the live steering demo beside it. */
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

const firstSentences = (t: string, min = 110) => {
  const parts = t.split(/(?<=[.!?])\s+/)
  let out = ''
  for (const p of parts) {
    out += (out ? ' ' : '') + p
    if (out.length >= min) break
  }
  return out.length < t.length ? out.replace(/[,;:]?$/, '') + (/[.!?]$/.test(out) ? '' : '…') : out
}

/** A2: the steered sentence is the headline. Real outputs, inlined (steer-hero.ts) so it's in the static HTML. */
function HeroA2() {
  const rows = heroSteer.rows
  const z = rows.findIndex((r) => r.a === 0)
  const [i, setI] = useState(rows.findIndex((r) => r.a === 0.6))
  const r = rows[i]
  const fmt = (a: number) => (a > 0 ? '+' : a < 0 ? '−' : '') + Math.abs(a).toFixed(1)
  return (
    <section className="m-hero m-a2" aria-labelledby="thesis">
      <div className="m-wrap">
        <div className="m-a2__stage m-fig" data-k="steering">
          <p className="m-a2__k">
            {heroSteer.model.split('/')[1]}, asked “{heroSteer.prompt}”, steered along a joy direction. Real output, α {fmt(r.a)}.
          </p>
          <p key={i} className="m-a2__out" aria-live="polite">
            “{firstSentences(r.text)}”
          </p>
          <div className="m-a2__ctl">
            <span aria-hidden="true">Flat</span>
            <input
              className="m-range"
              type="range"
              min={0}
              max={rows.length - 1}
              step={1}
              value={i}
              onChange={(e) => setI(+e.target.value)}
              aria-label="Joy steering strength α"
              aria-valuetext={`α ${fmt(r.a)}`}
            />
            <span aria-hidden="true">Joyful</span>
          </div>
          <p className="m-a2__note">
            Drag α. At 0 the model says “{firstSentences(rows[z].text, 40)}” Between +0.3 and +0.6 the read-back projection jumps from −8.0 to +9.6: a
            switch, not a dial. Method replicated on {heroSteer.model.split('/')[1]} for this page.{' '}
            <Link to="/research/activation-steering" className="m-link">
              Write-up
            </Link>
          </p>
        </div>
        <div className="m-a2__strip">
          <div>
            <h1 id="thesis" className="m-thesis m-thesis--sm">
              {thesis}
            </h1>
            <p className="m-context">{context}</p>
            <Actions />
          </div>
          <Proofs />
        </div>
      </div>
    </section>
  )
}

/** A3: the work index is the hero. Rows open into their demo in place. */
function HeroA3() {
  return (
    <section className="m-wrap m-hero m-a3" aria-labelledby="thesis">
      <h1 id="thesis" className="m-thesis">
        {thesis}
      </h1>
      <p className="m-context">{context}</p>
      <Actions />
      <ol className="m-index" id="work">
        {selected.map((it, n) => (
          <IndexRow key={it.id} it={it} n={n} />
        ))}
      </ol>
    </section>
  )
}

function IndexRow({ it, n }: { it: Item; n: number }) {
  const [open, setOpen] = useState(false)
  const id = `w-${it.id}`
  return (
    <li className="m-irow" data-open={open || undefined}>
      <h2 className="m-irow__h">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          onPointerEnter={() => it.demo && prefetchDemo[it.demo]()}
          onFocus={() => it.demo && prefetchDemo[it.demo]()}
        >
          <span className="m-irow__n" aria-hidden="true">
            {it.mark ? <Logo m={it.mark} w={36} h={24} /> : <span className="m-irow__num">{n + 1}</span>}
          </span>
          <span className="m-irow__t">
            <span className="m-irow__title">{it.title}</span>
            <span className="m-irow__meta">
              {it.where} · <span className="m-nw">{it.when}</span>
            </span>
          </span>
          <span className="m-irow__poster m-fig" data-k={it.demo} data-empty={!it.demo || undefined} aria-hidden="true">
            {it.demo && <Poster k={it.demo} />}
          </span>
          <ChevronDown className="m-irow__chev" size={18} aria-hidden="true" />
        </button>
      </h2>
      <div id={id} className="m-irow__body" hidden={!open}>
        {open && <WorkBody it={it} depth="live" />}
      </div>
    </li>
  )
}

// ---------- selected work (Gate B) ----------

type Depth = 'live' | 'open' | 'preview'

function Spec({ it }: { it: Item }) {
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

function Metrics() {
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

function Figure({ it, depth }: { it: Item; depth: Depth }) {
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

function WorkBody({ it, depth }: { it: Item; depth: Depth }) {
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

function Work({ depth, steeringInHero }: { depth: Depth; steeringInHero: boolean }) {
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

function More() {
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

function Experience() {
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

function Contact() {
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

export function Home({ gate }: { gate?: string }) {
  // ponytail: gate pages exist only until Tanuj picks one A and one B; then this collapses to the winners.
  const a = gate?.startsWith('a') ? gate : 'a1'
  const b = gate?.startsWith('b') ? gate : 'b1'
  const depth: Depth = b === 'b2' ? 'live' : b === 'b3' ? 'preview' : 'open'
  return (
    <>
      {a === 'a1' && <HeroA1 />}
      {a === 'a2' && <HeroA2 />}
      {a === 'a3' && <HeroA3 />}
      {a !== 'a3' && <Work depth={depth} steeringInHero />}
      <More />
      <Experience />
      <Contact />
    </>
  )
}
