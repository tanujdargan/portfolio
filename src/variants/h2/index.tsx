/**
 * H2 · Playback. One dark stage lit by a single ember light. Real sequences play as annotated playback (tokens,
 * read-back, a live orbit) with numbered chips at the exact spot where something happens. Scrolling moves the
 * playhead to the next track; every track hands over to the real demo with "Take the controls".
 */
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, Check, Copy as CopyIcon, FileText, Github, Linkedin, Mail } from 'lucide-react'
import type { VariantProps } from '../../routes'
import { Link } from '../../lib/router'
import { context, education, more, proofs, roles, selected, thesis } from '../../content/curated'
import { beri, links, person } from '../../content/site'
import { Logo } from '../../shared/Mark'
import { Poster } from '../../shared/Poster'
import { LossTrack, OceanTrack, SteeringTrack, WireTrack } from './tracks'
import { useInView, useMedia } from './play'
import { Writeup } from './Writeup'
import './h2.css'

const OrbitTrack = lazy(() => import('./OrbitTrack'))

export default function Variant({ page, base }: VariantProps) {
  const home = page.kind === 'home'
  return (
    <div className="h2" data-page={page.kind}>
      <a href="#h2-main" className="h2-skip">
        Skip to content
      </a>
      <Bar base={base} home={home} />
      <main id="h2-main" tabIndex={-1}>
        {home && <Home base={base} />}
        {page.kind === 'research' && <Writeup slug={page.slug} base={base} />}
        {page.kind === 'beri' && <Beri base={base} />}
        {page.kind === 'notfound' && (
          <section className="h2-page h2-nf" aria-labelledby="h2-nf-t">
            <p className="h2-kicker">404</p>
            <h1 id="h2-nf-t" className="h2-h1">Nothing plays at this address.</h1>
            <p className="h2-lede">The page may have moved. The work is one click away.</p>
            <Link to={`${base}/`} className="h2-btn h2-btn--primary">
              Back to the tracks <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </section>
        )}
      </main>
      <Footer base={base} />
    </div>
  )
}

/* ------------------------------------------------------------------ chrome */

function Bar({ base, home }: { base: string; home: boolean }) {
  const a = (id: string) => (home ? `#${id}` : `${base}/#${id}`)
  return (
    <header className="h2-bar">
      <div className="h2-bar__in">
        <Link to={`${base}/`} className="h2-name">
          <span className="h2-name__dot" aria-hidden="true" />
          {person.name}
        </Link>
        <nav className="h2-nav" aria-label="Sections">
          <a href={a('h2-work')}>Work</a>
          <a href={a('h2-experience')}>Experience</a>
          <a href={a('h2-contact')}>Contact</a>
        </nav>
        <div className="h2-bar__acts">
          <a className="h2-btn h2-btn--primary h2-btn--sm" href={links.resume.href} target="_blank" rel="noopener">
            <FileText size={15} strokeWidth={1.8} aria-hidden="true" />
            Resume (PDF)
          </a>
          <a className="h2-icon" href={links.email.href} aria-label={`Email ${person.email}`}>
            <Mail size={18} strokeWidth={1.7} aria-hidden="true" />
          </a>
          <a className="h2-icon" href={links.linkedin.href} target="_blank" rel="noopener" aria-label="LinkedIn">
            <Linkedin size={18} strokeWidth={1.7} aria-hidden="true" />
          </a>
          <a className="h2-icon h2-icon--gh" href={links.github.href} target="_blank" rel="noopener" aria-label="GitHub">
            <Github size={18} strokeWidth={1.7} aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  )
}

function Footer({ base }: { base: string }) {
  return (
    <footer className="h2-foot">
      <div className="h2-foot__in">
        <p className="h2-status">
          <span className="h2-status__dot" aria-hidden="true" />
          MarmotSat in orbit since July 2026
        </p>
        <p className="h2-dim">
          {person.name} · {person.location} · <Link to={`${base}/`}>Home</Link>
        </p>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ home */

const sel = Object.fromEntries(selected.map((s) => [s.id, s]))

/** The proofs in definition → number → source form. Copy is curated.proofs reworded; numbers are the resume's. */
const PROOF = [
  { mark: proofs[0].mark, def: 'LLM planning assistant, in production across', num: '180+ fulfillment sites', src: 'Amazon Robotics · 2026 · return offer' },
  { mark: proofs[1].mark, def: 'Satellite running the onboard firmware I led', num: 'In orbit', src: 'MarmotSat · UVic CfAR · July 2026' },
  { mark: proofs[2].mark, def: 'Shutdown distress after fine-tuning is set by', num: 'the loss mask', src: 'Apart Research sprint · Aug 2026' },
] as const

function Hero() {
  return (
    <div className="h2-hero" data-chapter={0}>
      <h1 className="h2-thesis">{thesis}</h1>
      <p className="h2-context">{context}</p>
      <ul className="h2-proofs" aria-label="Three proofs">
        {PROOF.map((p, k) => (
          <li key={p.mark} className="h2-proof" style={{ ['--k' as string]: k }}>
            <span className="h2-proof__logo">
              <Logo m={p.mark} w={26} h={26} />
            </span>
            <span className="h2-proof__def">{p.def}</span>
            <b className="h2-proof__num">{p.num}</b>
            <span className="h2-proof__src">{p.src}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface Chapter {
  kicker: string
  title: string
  body: ReactNode
  spec: [string, string][]
  link?: { to: string; label: string }
}
const CH: Chapter[] = [
  {
    kicker: 'Interpretability · a method replicated for this page',
    title: 'Joy steering is a switch, not a dial',
    body: (
      <>
        {sel.steering.finding} I replicated the method on Qwen2.5-1.5B-Instruct to show it here; it is not my main project.
      </>
    ),
    spec: [
      ['Where', sel.steering.where],
      ['Result', sel.steering.result],
    ],
    link: { to: '/research/activation-steering', label: 'Read the write-up' },
  },
  {
    kicker: `Model welfare · ${sel.lossmask.where}`,
    title: sel.lossmask.title,
    body: sel.lossmask.finding,
    spec: [
      ['When', sel.lossmask.when],
      ['Result', sel.lossmask.result],
    ],
    link: { to: '/research/loss-masking-distress', label: 'Read the write-up' },
  },
  {
    kicker: `Production ML · ${sel.amazon.where}`,
    title: sel.amazon.title,
    body: sel.amazon.finding,
    spec: [
      ['When', sel.amazon.when],
      ['Result', sel.amazon.result],
    ],
  },
  {
    kicker: `Flight software · ${sel.orbit.where}`,
    title: sel.orbit.title,
    body: sel.orbit.finding,
    spec: [
      ['When', sel.orbit.when],
      ['Result', sel.orbit.result],
    ],
  },
  {
    kicker: `Remote sensing · ${sel.ocean.where}`,
    title: sel.ocean.title,
    body: sel.ocean.finding,
    spec: [
      ['When', sel.ocean.when],
      ['Result', sel.ocean.result],
    ],
    link: { to: '/research/ocean-sensing', label: 'Read the write-up' },
  },
]

function Copy({ k, base }: { k: number; base: string }) {
  const c = CH[k]
  return (
    <section className="h2-copy" data-chapter={k} data-t={k} id={`h2-track-${k + 1}`} aria-labelledby={`h2-ct-${k}`}>
      <p className="h2-kicker">
        <span className="h2-num">Track {String(k + 1).padStart(2, '0')}</span> {c.kicker}
      </p>
      <h2 id={`h2-ct-${k}`} className="h2-copy__t">
        {c.title}
      </h2>
      <p className="h2-copy__b">{c.body}</p>
      <dl className="h2-spec">
        {c.spec.map(([dt, dd]) => (
          <div key={dt}>
            <dt>{dt}</dt>
            <dd>{dd}</dd>
          </div>
        ))}
      </dl>
      {c.link && (
        <Link to={base + c.link.to} className="h2-more">
          {c.link.label} <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      )}
    </section>
  )
}

function Stage({ i, active, wide, label, children }: { i: number; active: number; wide: boolean; label: string; children: (run: boolean, near: boolean) => ReactNode }) {
  const [ref, inView] = useInView<HTMLElement>(0.3)
  const [nearRef, nearNow] = useInView<HTMLDivElement>(0, '700px 0px')
  const [near, setNear] = useState(false)
  const lit = !wide || active === i
  useEffect(() => {
    if (nearNow && (!wide || active >= i - 1)) setNear(true)
  }, [nearNow, wide, active, i])
  return (
    <figure ref={ref} className="h2-stage" data-t={i} data-active={active === i || undefined} aria-label={label} {...(wide && active !== i ? { inert: '' } : {})}>
      <div ref={nearRef} className="h2-stage__probe" aria-hidden="true" />
      {children(inView && lit, near)}
    </figure>
  )
}

function OrbitFallback({ i }: { i: number }) {
  return (
    <div className="h2-shell h2-shell--wait" data-i={i}>
      <Poster k="orbit" className="h2-orb__poster" label />
    </div>
  )
}

function Player({ base }: { base: string }) {
  const wide = useMedia('(min-width: 1024px)')
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!wide) return
    const els = root.current!.querySelectorAll<HTMLElement>('[data-chapter]')
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive(+(e.target as HTMLElement).dataset.chapter!)
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [wide])
  const stage = (i: number, label: string, f: (run: boolean, near: boolean) => ReactNode) => (
    <Stage i={i} active={active} wide={wide} label={label}>
      {f}
    </Stage>
  )
  return (
    <div className="h2-player" id="h2-work" ref={root}>
      <Hero />
      {stage(0, 'Track 1: steering playback', (run) => <SteeringTrack i={0} run={run} startAtEnd={false} />)}
      <Copy k={0} base={base} />
      <Copy k={1} base={base} />
      {stage(1, 'Track 2: loss-masking playback', (run) => <LossTrack i={1} run={run} startAtEnd />)}
      <Copy k={2} base={base} />
      {stage(2, 'Track 3: the Amazon planning assistant, illustrated', (run) => <WireTrack i={2} run={run} startAtEnd />)}
      <Copy k={3} base={base} />
      {stage(3, 'Track 4: MarmotSat, live', (run, near) => (
        <Suspense fallback={<OrbitFallback i={3} />}>{near ? <OrbitTrack i={3} run={run} startAtEnd /> : <OrbitFallback i={3} />}</Suspense>
      ))}
      <Copy k={4} base={base} />
      {stage(4, 'Track 5: ocean probe, illustrative', (run) => <OceanTrack i={4} run={run} startAtEnd />)}
    </div>
  )
}

function Home({ base }: { base: string }) {
  return (
    <>
      <Player base={base} />
      <Experience />
      <More base={base} />
      <Contact />
    </>
  )
}

/* ------------------------------------------------------------------ experience: a tick ruler */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const T0 = 2025 * 12 + 3 // Apr 2025
const T1 = 2027 * 12 + 3 // Apr 2027, graduation
const SPAN = T1 - T0
/** "May–Aug 2026" or "Jul 2025 – Apr 2026" → month indexes from T0 */
function span(when: string): [number, number] {
  const m = when.match(/([A-Z][a-z]{2})\s*(\d{4})?\s*[–-]\s*([A-Z][a-z]{2})\s*(\d{4})/)!
  const y2 = +m[4]
  const y1 = m[2] ? +m[2] : y2
  return [y1 * 12 + MON.indexOf(m[1]) - T0, y2 * 12 + MON.indexOf(m[3]) - T0 + 1]
}
const RUL = (() => {
  const spans = roles.map((r) => span(r.when))
  const ends: number[] = []
  const lanes = spans
    .map((s, k) => ({ s, k }))
    .sort((a, b) => a.s[0] - b.s[0])
    .map(({ s, k }) => {
      let l = ends.findIndex((e) => e <= s[0])
      if (l < 0) l = ends.push(0) - 1
      ends[l] = s[1]
      return { k, l }
    })
  const lane = Object.fromEntries(lanes.map((x) => [x.k, x.l])) as Record<number, number>
  return { spans, lane, n: ends.length }
})()
const EVENTS = [
  { at: 2026 * 12 + 6 - T0, label: 'MarmotSat launch' },
  { at: 2026 * 12 + 7 - T0, label: 'Apart sprint' },
  { at: SPAN, label: 'Graduation' },
]
const pct = (m: number) => (m / SPAN) * 100

function Experience() {
  const [hot, setHot] = useState<number | null>(null)
  return (
    <section className="h2-sec" id="h2-experience" aria-labelledby="h2-exp-t">
      <div className="h2-sec__head">
        <h2 id="h2-exp-t" className="h2-h2">
          Experience
        </h2>
        <p className="h2-dim">April 2025 to graduation, April 2027. One tick per month.</p>
      </div>
      <div className="h2-ruler" aria-hidden="true" style={{ ['--lanes' as string]: RUL.n }}>
        <div className="h2-ruler__lanes">
          {roles.map((r, k) => {
            const [a, b] = RUL.spans[k]
            return (
              <span
                key={r.org}
                className="h2-ruler__span"
                data-hot={hot === k || undefined}
                data-dim={(hot !== null && hot !== k) || undefined}
                style={{ left: `${pct(a)}%`, width: `${pct(b - a)}%`, ['--l' as string]: RUL.lane[k] }}
              >
                <span>{r.org}</span>
              </span>
            )
          })}
        </div>
        <div className="h2-ruler__ticks">
          {Array.from({ length: SPAN + 1 }, (_, m) => {
            const mm = (T0 + m) % 12
            return <span key={m} style={{ left: `${pct(m)}%` }} data-year={mm === 0 || undefined} data-label={mm === 0 ? String(Math.floor((T0 + m) / 12)) : undefined} />
          })}
          {EVENTS.map((e) => (
            <span key={e.label} className="h2-ruler__ev" style={{ left: `${pct(e.at)}%` }} data-end={e.at === SPAN || undefined}>
              <i>{e.label}</i>
            </span>
          ))}
        </div>
      </div>
      <ol className="h2-roles">
        {roles.map((r, k) => (
          <li key={r.org} className="h2-role" onPointerEnter={() => setHot(k)} onPointerLeave={() => setHot(null)} onFocus={() => setHot(k)} onBlur={() => setHot(null)} data-hot={hot === k || undefined}>
            <details>
              <summary>
                <span className="h2-role__logo">
                  <Logo m={r.mark} w={30} h={30} />
                </span>
                <span className="h2-role__main">
                  <span className="h2-role__t">
                    <b>{r.org}</b> <span className="h2-dim">{r.role}</span>
                  </span>
                  <span className="h2-role__l">{r.line}</span>
                </span>
                <span className="h2-role__when">{r.when}</span>
              </summary>
              <ul className="h2-role__b">
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ol>
      <p className="h2-edu">
        <Logo m="uvic" w={22} h={22} />
        <span>
          <b>{education.school}</b> · {education.degree} · graduating {education.when} · {education.note}
        </span>
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ more work + contact */

function More({ base }: { base: string }) {
  return (
    <section className="h2-sec" id="h2-more" aria-labelledby="h2-more-t">
      <div className="h2-sec__head">
        <h2 id="h2-more-t" className="h2-h2">
          More work
        </h2>
      </div>
      <ul className="h2-list">
        {more.map((m) => {
          const inner = (
            <>
              <b>{m.title}</b>
              <span>{m.line}</span>
              {m.href && (m.ext ? <ArrowUpRight size={16} strokeWidth={1.7} aria-hidden="true" /> : <ArrowRight size={16} strokeWidth={1.7} aria-hidden="true" />)}
            </>
          )
          return (
            <li key={m.title}>
              {!m.href ? (
                <div className="h2-list__row">{inner}</div>
              ) : m.ext ? (
                <a className="h2-list__row" href={m.href} target="_blank" rel="noopener">
                  {inner}
                </a>
              ) : (
                <Link className="h2-list__row" to={base + m.href}>
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

function Contact() {
  const [copied, setCopied] = useState(false)
  return (
    <section className="h2-sec h2-contact" id="h2-contact" aria-labelledby="h2-contact-t">
      <h2 id="h2-contact-t" className="h2-h2">
        Contact
      </h2>
      <p className="h2-lede">Email is the fastest way to reach me. The resume has everything on this page, on one sheet.</p>
      <div className="h2-contact__mail">
        <a href={links.email.href} className="h2-contact__addr">
          {person.email}
        </a>
        <button
          type="button"
          className="h2-btn h2-btn--ghost"
          onClick={() => {
            navigator.clipboard?.writeText(person.email).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1800)
            })
          }}
        >
          {copied ? <Check size={15} strokeWidth={1.8} aria-hidden="true" /> : <CopyIcon size={15} strokeWidth={1.8} aria-hidden="true" />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <ul className="h2-contact__links">
        <li>
          <a className="h2-btn h2-btn--primary" href={links.resume.href} target="_blank" rel="noopener">
            <FileText size={16} strokeWidth={1.8} aria-hidden="true" /> Resume (PDF)
          </a>
        </li>
        <li>
          <a className="h2-btn" href={links.linkedin.href} target="_blank" rel="noopener">
            <Linkedin size={16} strokeWidth={1.8} aria-hidden="true" /> LinkedIn
          </a>
        </li>
        <li>
          <a className="h2-btn" href={links.github.href} target="_blank" rel="noopener">
            <Github size={16} strokeWidth={1.8} aria-hidden="true" /> GitHub
          </a>
        </li>
        <li>
          <a className="h2-btn" href={links.x.href} target="_blank" rel="noopener">
            X
          </a>
        </li>
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------ beri */

function Beri({ base }: { base: string }) {
  return (
    <section className="h2-page" aria-labelledby="h2-beri-t">
      <p className="h2-kicker">
        <Link to={`${base}/#h2-more`}>More work</Link> · iOS
      </p>
      <h1 id="h2-beri-t" className="h2-h1">
        Beri
      </h1>
      <p className="h2-lede">{beri.oneLiner}</p>
      <dl className="h2-spec">
        <div>
          <dt>What I do</dt>
          <dd>{beri.role}</dd>
        </div>
        <div>
          <dt>Stack</dt>
          <dd>{beri.stack.join(' · ')}</dd>
        </div>
      </dl>
      <a className="h2-btn h2-btn--primary" href={beri.url} target="_blank" rel="noopener">
        getberi.com <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
      </a>
    </section>
  )
}
