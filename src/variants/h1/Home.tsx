import { useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Copy } from 'lucide-react'
import { amazonMetrics, context, education, more, roles, selected, thesis, type Item } from '../../content/curated'
import { links, person } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { Link } from '../../lib/router'
import { Logo } from '../../shared/Mark'
import { LinkIcon } from '../../shared/Links'
import { Steer } from './Steer'
import { Telemetry } from './Telemetry'
import { Thumb } from './Thumb'
import { useLit } from './Lit'

// React 18 has no typed `inert`; an empty string attribute passes through to the DOM.
const inert = (on: boolean) => (on ? ({ inert: '' } as object) : {})

let assembled = false // the page assembles once per load; later visits arrive still

export function Home({ base }: { base: string }) {
  const [anim] = useState(() => {
    const a = !assembled
    if (typeof window !== 'undefined') assembled = true
    return a
  })
  return (
    <>
      <section className="h1-hero h1-wrap" data-anim={anim || undefined} aria-labelledby="h1-thesis">
        <Telemetry href="#work-orbit" />
        <div className="h1-hero__text">
          <h1 id="h1-thesis" className="h1-thesis">
            {/* fixed line breaks, so the fallback font and Geist wrap identically (no shift on font swap) */}
            {thesisLines.map(([t, dim], k) => (
              <span key={k} className={dim ? 'h1-dim' : undefined}>
                {t}{' '}
              </span>
            ))}
          </h1>
          <p className="h1-proof" style={{ ['--s' as string]: 2 }}>
            Shipped an LLM planning assistant to production across 180+ <Chip m="amazon" label="Amazon" /> fulfillment sites, with a return
            offer. Led the flight firmware for <Chip m="cfar" label="MarmotSat" />, now in orbit. Showed at{' '}
            <Chip m="apart" label="Apart Research" /> that SFT loss masking decides whether a model voices shutdown distress.
          </p>
          <p className="h1-context" style={{ ['--s' as string]: 3 }}>
            {context}
          </p>
          <div className="h1-actions" style={{ ['--s' as string]: 4 }}>
            <a className="h1-btn h1-btn--solid" href={links.resume.href} target="_blank" rel="noopener">
              <LinkIcon k="resume" size={16} /> Resume (PDF)
            </a>
            <a className="h1-btn" href={links.email.href}>
              <LinkIcon k="email" size={16} />
              Email
            </a>
            <a className="h1-btn" href={links.linkedin.href} target="_blank" rel="noopener">
              <LinkIcon k="linkedin" size={16} /> LinkedIn
            </a>
            <a className="h1-btn h1-btn--icon h1-hide-sm" href={links.github.href} target="_blank" rel="noopener" aria-label="GitHub">
              <LinkIcon k="github" size={17} />
            </a>
          </div>
        </div>
        <div className="h1-hero__demo" style={{ ['--s' as string]: 2 }}>
          <p className="h1-finding">{steerFinding}</p>
          <Steer
            hero
            writeup={
              <>
                {' '}
                <Link to={`${base}/research/activation-steering`} className="h1-a">
                  Write-up
                </Link>
              </>
            }
          />
        </div>
      </section>

      <Work base={base} />
      <More base={base} />
      <Experience />
      <Contact />
    </>
  )
}

// The thesis from curated.ts, set in four fixed lines; the second clause is dimmed.
const thesisLines: [string, boolean][] = (() => {
  const [lead, tail] = splitThesis(thesis)
  const words = `${lead} ${tail}`.split(' ')
  const n = lead.split(' ').length
  const cuts = [4, 7, 10, words.length] // I ship production ML / systems and study / what language models / represent inside.
  let a = 0
  const out: [string, boolean][] = []
  for (const c of cuts) {
    // split each line at the lead/tail boundary so the dim tone starts mid-line
    const seg = words.slice(a, c)
    const bright = seg.slice(0, Math.max(0, n - a)).join(' ')
    const dim = seg.slice(Math.max(0, n - a)).join(' ')
    if (bright) out.push([bright + (dim ? '' : '\n'), false])
    if (dim) out.push([dim + '\n', true])
    a = c
  }
  return out
})()

const steerFinding = selected.find((s) => s.id === 'steering')!.finding

function splitThesis(t: string): [string, string] {
  const i = t.indexOf(' and ')
  return i > 0 ? [t.slice(0, i), t.slice(i + 1)] : [t, '']
}

function Chip({ m, label }: { m: 'amazon' | 'cfar' | 'apart'; label: string }) {
  return (
    <span className="h1-chip" data-m={m}>
      <Logo m={m} w={m === 'cfar' ? 42 : 15} h={m === 'cfar' ? 13 : 15} />
      <span>{label}</span>
    </span>
  )
}

function SectionHead({ id, title, sub }: { id: string; title: string; sub: string }) {
  return (
    <header className="h1-shead">
      <h2 id={id}>{title}</h2>
      <p>{sub}</p>
    </header>
  )
}

/* ---------- Work: the lit index ---------- */

const demoOpts: Record<string, object> = {
  steering: { rest: 0.6 },
  lossmask: { finding: true },
}

function Work({ base }: { base: string }) {
  const { lit, list, bind } = useLit(selected.length)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  return (
    <section className="h1-sec h1-wrap" id="work" aria-labelledby="h1-work">
      <SectionHead id="h1-work" title="Work" sub="Titled by what happened. Each row opens in place." />
      <ol
        className="h1-list h1-work"
        {...list}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
          e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
        }}
      >
        {selected.map((it, i) => (
          <WorkRow
            key={it.id}
            it={it}
            base={base}
            lit={lit === i}
            open={!!open[it.id]}
            toggle={() => setOpen((o) => ({ ...o, [it.id]: !o[it.id] }))}
            row={bind(i)}
          />
        ))}
      </ol>
    </section>
  )
}

function WorkRow({
  it,
  base,
  lit,
  open,
  toggle,
  row,
}: {
  it: Item
  base: string
  lit: boolean
  open: boolean
  toggle: () => void
  row: ReturnType<ReturnType<typeof useLit<HTMLLIElement>>['bind']>
}) {
  const [mounted, setMounted] = useState(false)
  const pid = `h1-p-${it.id}`
  return (
    <li className="h1-row h1-wrow" id={`work-${it.id}`} data-open={open || undefined} {...row}>
      <button
        type="button"
        className="h1-wrow__head"
        aria-expanded={open}
        aria-controls={pid}
        onClick={() => {
          setMounted(true)
          toggle()
        }}
      >
        <span className="h1-wrow__thumb">
          <Thumb k={it.demo ?? 'amazon'} lit={lit && !open} />
        </span>
        <span className="h1-wrow__body">
          <span className="h1-wrow__title" style={it.slug ? { viewTransitionName: `h1-t-${it.slug}` } : undefined}>
            {it.title}
          </span>
          <span className="h1-wrow__find">{it.finding}</span>
          <span className="h1-wrow__meta">
            {it.mark && <Logo m={it.mark} w={it.mark === 'cfar' ? 40 : 16} h={it.mark === 'cfar' ? 12 : 16} />}
            <span>{it.where}</span>
            <span aria-hidden="true">·</span>
            <span>{it.when}</span>
          </span>
        </span>
        <span className="h1-wrow__side">
          <span className="h1-wrow__result">{it.result}</span>
          <span className="h1-wrow__open">
            {open ? 'Close' : it.demo ? 'Open demo' : 'Open'}
            <ChevronDown size={15} strokeWidth={1.8} aria-hidden="true" />
          </span>
        </span>
      </button>
      <div className="h1-panel" id={pid} role="region" aria-label={it.title} data-open={open || undefined}>
        <div className="h1-panel__in">
          {(open || mounted) && (
            <div className="h1-panel__body" {...inert(!open)}>
              {it.demo ? (
                <div className="h1-fig">
                  <Demo kind={it.demo} {...demoOpts[it.demo]} />
                </div>
              ) : (
                <AmazonPanel />
              )}
              <dl className="h1-spec">
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
              {it.slug && (
                <Link to={`${base}/research/${it.slug}`} className="h1-more">
                  Read the write-up <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

function AmazonPanel() {
  const a = roles.find((r) => r.mark === 'amazon')!
  return (
    <div className="h1-amz">
      <ul className="h1-metrics">
        {amazonMetrics.map((m) => (
          <li key={m.n}>
            <span className="h1-metrics__l">{m.l}</span>
            <span className="h1-metrics__n">{m.n}</span>
          </li>
        ))}
      </ul>
      <p className="h1-src">Source: resume, Aug 2026. The savings figure is a projection.</p>
      <ul className="h1-bullets">
        {a.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- More work ---------- */

function More({ base }: { base: string }) {
  const { list, bind } = useLit(more.length)
  return (
    <section className="h1-sec h1-wrap" aria-labelledby="h1-more">
      <SectionHead id="h1-more" title="More work" sub="Systems, competitions and the thing I’m building." />
      <ul className="h1-list h1-mlist" {...list}>
        {more.map((m, i) => {
          const inner = (
            <>
              <span className="h1-mrow__title">{m.title}</span>
              <span className="h1-mrow__line">{m.line}</span>
              {m.href && (
                <span className="h1-mrow__go" aria-hidden="true">
                  {m.ext ? <ArrowUpRight size={16} strokeWidth={1.8} /> : <ArrowRight size={16} strokeWidth={1.8} />}
                </span>
              )}
            </>
          )
          return (
            <li key={m.title} className="h1-row h1-mrow" {...bind(i)}>
              {!m.href ? (
                <div className="h1-mrow__in" tabIndex={-1}>
                  {inner}
                </div>
              ) : m.ext ? (
                <a className="h1-mrow__in" href={m.href} target="_blank" rel="noopener">
                  {inner}
                </a>
              ) : (
                <Link className="h1-mrow__in" to={`${base}${m.href}`}>
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

/* ---------- Experience ---------- */

function Experience() {
  const { list, bind } = useLit(roles.length + 1)
  const [open, setOpen] = useState<string | null>(null)
  return (
    <section className="h1-sec h1-wrap" id="experience" aria-labelledby="h1-exp">
      <SectionHead id="h1-exp" title="Experience" sub="Newest first. Open a row for the detail." />
      <ul className="h1-list h1-xlist" {...list}>
        {roles.map((r, i) => {
          const isOpen = open === r.org
          return (
            <li key={r.org} className="h1-row h1-xrow" data-open={isOpen || undefined} {...bind(i)}>
              <button type="button" className="h1-xrow__head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.org)}>
                <span className="h1-xrow__logo">
                  <Logo
                    m={r.mark}
                    w={r.mark === 'cfar' || r.mark === 'mlh' ? 52 : 26}
                    h={r.mark === 'cfar' || r.mark === 'mlh' ? 16 : 26}
                  />
                </span>
                <span className="h1-xrow__who">
                  <span className="h1-xrow__org">{r.org}</span>
                  <span className="h1-xrow__role">{r.role}</span>
                </span>
                <span className="h1-xrow__line">{r.line}</span>
                <span className="h1-xrow__when">{r.when}</span>
                <ChevronDown className="h1-xrow__chev" size={15} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <div className="h1-panel" data-open={isOpen || undefined}>
                <div className="h1-panel__in">
                  <ul className="h1-bullets h1-xrow__bul" {...inert(!isOpen)}>
                    {r.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          )
        })}
        <li className="h1-row h1-xrow h1-xrow--edu" {...bind(roles.length)}>
          <div className="h1-xrow__head" tabIndex={-1}>
            <span className="h1-xrow__logo">
              <Logo m="uvic" w={26} h={26} />
            </span>
            <span className="h1-xrow__who">
              <span className="h1-xrow__org">{education.school}</span>
              <span className="h1-xrow__role">{education.degree}</span>
            </span>
            <span className="h1-xrow__line">{education.note}.</span>
            <span className="h1-xrow__when">Graduating {education.when}</span>
            <span className="h1-xrow__chev" aria-hidden="true" />
          </div>
        </li>
      </ul>
    </section>
  )
}

/* ---------- Contact ---------- */

function Contact() {
  const { list, bind } = useLit(5)
  const [copied, setCopied] = useState(false)
  const rows = [
    { k: 'linkedin' as const, label: 'LinkedIn', value: 'in/tanujdargan' },
    { k: 'github' as const, label: 'GitHub', value: 'tanujdargan' },
    { k: 'x' as const, label: 'X', value: '@DarganTanuj' },
    { k: 'resume' as const, label: 'Resume', value: 'PDF, one page' },
  ]
  return (
    <section className="h1-sec h1-wrap h1-contact" id="contact" aria-labelledby="h1-contact">
      <SectionHead id="h1-contact" title="Contact" sub="Email is fastest. I read everything." />
      <ul className="h1-list h1-clist" {...list}>
        <li className="h1-row h1-crow" {...bind(0)}>
          <a className="h1-crow__in" href={links.email.href}>
            <LinkIcon k="email" size={18} />
            <span className="h1-crow__label">Email</span>
            <span className="h1-crow__val">{person.email}</span>
          </a>
          <button
            type="button"
            className="h1-ghost h1-crow__copy"
            onClick={() => {
              navigator.clipboard?.writeText(person.email).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1800)
              })
            }}
          >
            {copied ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : <Copy size={15} strokeWidth={1.8} aria-hidden="true" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </li>
        {rows.map((r, i) => (
          <li key={r.k} className="h1-row h1-crow" {...bind(i + 1)}>
            <a className="h1-crow__in" href={links[r.k].href} target="_blank" rel="noopener">
              <LinkIcon k={r.k} size={18} />
              <span className="h1-crow__label">{r.label}</span>
              <span className="h1-crow__val">{r.value}</span>
              <ArrowUpRight className="h1-crow__go" size={16} strokeWidth={1.8} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
