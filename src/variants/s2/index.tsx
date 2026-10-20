/*
 * S2 "Story". Round 12: one timeline, most impressive first (Amazon, Apart, CfAR, Hack the North, then the rest),
 * each with its proof inline (numbers, live demo, prize logos, write-up). Opening: N1's intro, the name decodes out of
 * glyph noise, then flies into the hero (FLIP). Once per session; any input skips; reduced motion and no-JS never see it.
 * Sections rise in as they scroll into view (CSS scroll-driven animations where supported).
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { VariantProps } from '../../routes'
import { selected, amazonMetrics, more, roles, education, type Mark } from '../../content/curated'
import { links } from '../../content/site'
import { Demo } from '../../demos/Demo'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Link } from '../../lib/router'
import { life } from './life'
import gh from '../../data/github.json'
import './s2.css'

const NAME = 'Tanuj Dargan'
const TITLE = 'ML engineer & researcher'
const SEEN = 's2-intro-seen'
const role = (o: string) => roles.find((r) => r.org === o)!
const pick = (id: string) => selected.find((s) => s.id === id)!
const buildOrder = ['AIMO', 'Fine-tuning', 'Beri']
const builds = buildOrder.map((t) => more.find((m) => m.title.startsWith(t))!)

type Icon = Mark | 'htn' | 'td'
/** App-icon-sized logo tile. The tiles are white rounded squares from /logos; Pear Care is drawn in CSS. */
function Tile({ m }: { m: Icon }) {
  if (m === 'td') return <span className="s2-tile s2-tile--me" aria-hidden="true">TD</span>
  if (m === 'pearcare') return <span className="s2-tile s2-tile--type" role="img" aria-label="Pear Care">pear<b>care</b></span>
  const src = m === 'apart' ? '/logos/mark-apart.svg' : m === 'htn' ? '/logos/tile-htn.png' : `/logos/tile-${m}.svg`
  return <img className="s2-tile" data-m={m} src={src} width={64} height={64} alt="" loading="lazy" />
}

/* ---------- Opening (ported from N1) ---------- */

const G = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/'
const noise = () => G[(Math.random() * G.length) | 0]
// Before first paint: returning visitors and reduced-motion users never see the black frame.
const gate = `try{if(sessionStorage.getItem('${SEEN}')||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('data-s2-skip','')}catch(e){}`

function Intro({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const [text, setText] = useState(NAME)
  const [stage, setStage] = useState<'idle' | 'decode' | 'title' | 'fly'>('idle')

  useEffect(() => {
    const el = root.current!
    let skip = false
    try {
      skip = !!sessionStorage.getItem(SEEN) || matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {}
    // a slow bundle: the CSS failsafe has already revealed the page, don't black it out again
    if (skip || getComputedStyle(el).visibility === 'hidden') return onDone()
    el.dataset.live = ''
    let raf = 0
    const timers: number[] = []
    let finished = false

    const fly = (fast: boolean) => {
      if (finished) return
      finished = true
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      setText(NAME)
      setStage('fly')
      try {
        sessionStorage.setItem(SEEN, '1')
      } catch {}
      const from = nameRef.current!
      const to = document.querySelector<HTMLElement>('.s2-name')
      const D = fast ? 320 : 820
      document.documentElement.classList.add('s2-entering')
      if (to) {
        const a = from.getBoundingClientRect()
        const b = to.getBoundingClientRect()
        const s = b.height / a.height
        from.animate(
          [{ transform: 'none' }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${s})` }],
          { duration: D, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', fill: 'forwards' },
        )
      }
      el.animate([{ backgroundColor: 'rgb(11 11 12 / 1)' }, { backgroundColor: 'rgb(11 11 12 / 0)' }], {
        duration: D * 0.8,
        delay: D * 0.2,
        easing: 'ease-out',
        fill: 'forwards',
      })
      timers.push(window.setTimeout(onDone, D + 20))
    }

    // 1. decode, left to right with jitter (~900ms)
    setStage('decode')
    const D = 900
    const at = Array.from(NAME, (_, i) => (i / NAME.length) * 0.6 * D + Math.random() * 0.4 * D)
    const t0 = performance.now()
    let last = 0
    const tick = (now: number) => {
      const e = now - t0
      if (now - last > 45) {
        last = now
        setText(Array.from(NAME, (ch, i) => (ch === ' ' || e >= at[i] ? ch : noise())).join(''))
      }
      if (e < D) raf = requestAnimationFrame(tick)
      else setText(NAME)
    }
    raf = requestAnimationFrame(tick)
    // 2. title fades up, 3. the name flies into the hero
    timers.push(window.setTimeout(() => setStage('title'), 750))
    timers.push(window.setTimeout(() => fly(false), 1350))

    const skipNow = () => fly(true)
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchmove'] as const
    evs.forEach((e) => addEventListener(e, skipNow, { once: true, passive: true }))
    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      evs.forEach((e) => removeEventListener(e, skipNow))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="s2-intro" ref={root} data-stage={stage} aria-hidden="true">
      <script dangerouslySetInnerHTML={{ __html: gate }} />
      <noscript>
        <style>{'.s2-intro{display:none}.s2 [data-intro] .s2-name{visibility:visible;animation:none}'}</style>
      </noscript>
      <div className="s2-intro__inner">
        {/* the invisible real name fixes the width, so noise glyphs never shift the line */}
        <span className="s2-intro__name" ref={nameRef}>
          <span className="s2-intro__sizer">{NAME}</span>
          <span className="s2-intro__live">{text}</span>
        </span>
        <span className="s2-intro__title">{TITLE}</span>
      </div>
    </div>
  )
}

/* ---------- Timeline ---------- */

const lossmask = pick('lossmask')
const steering = pick('steering')
const orbit = pick('orbit')
const ocean = pick('ocean')
const fmtRole = (o: string) => ({ when: role(o).when, icon: role(o).mark as Icon, title: o === 'MLH · Apache Airflow' ? 'MLH Fellowship · Apache Airflow' : o, role: role(o).role, bullets: role(o).bullets })

interface Entry { when: string; icon: Icon; title: string; role: string; bullets?: string[]; body?: ReactNode }
// Most impressive first, not chronological.
const entries = (base: string): Entry[] => [
  {
    ...fmtRole('Amazon Robotics'),
    body: (
      <dl className="s2-nums">
        {amazonMetrics.map((m) => (
          <div key={m.l}>
            <dt>{m.n}</dt>
            <dd>{m.l}</dd>
          </div>
        ))}
      </dl>
    ),
  },
  {
    when: lossmask.when, icon: 'apart', title: 'Apart Research', role: 'Digital Minds sprint · ' + lossmask.title,
    body: (
      <>
        <p>{lossmask.finding}</p>
        <p className="s2-result">{lossmask.result}</p>
        <div className="s2-demo"><Demo kind="lossmask" compact finding /></div>
        <p>Part of the same project, steering a model along emotion directions. {steering.finding}</p>
        <div className="s2-demo"><Demo kind="steering" compact /></div>
        <p className="s2-reads">
          <Link className="s2-more" to={`${base}/research/${lossmask.slug}`}>Loss masking write-up →</Link>
          <Link className="s2-more" to={`${base}/research/${steering.slug}`}>Steering write-up →</Link>
        </p>
      </>
    ),
  },
  {
    ...fmtRole('UVic CfAR'), title: 'UVic Centre for Aerospace Research',
    body: (
      <>
        <p className="s2-result">{orbit.result}</p>
        <div className="s2-demo">
          <Demo kind="orbit" compact />
          <p className="s2-cap">MarmotSat right now, from its live orbital elements (NORAD 69912).</p>
        </div>
      </>
    ),
  },
  {
    when: 'Sep 2025', icon: 'htn', title: 'Hack the North 2025: two prizes', role: 'Optimate, out of 300+ teams',
    bullets: ['An AI underwriting dashboard on the Federato API: ranks submissions against appetite, explains each pick, and learns from underwriter feedback. 40% faster reviews, 15% fewer errors.'],
    body: (
      <>
        <ul className="s2-prizes">
          <li><img src="/logos/yc.svg" alt="Y Combinator" width={40} height={40} /><span><b>YC Unicorn Prize</b>Y Combinator</span></li>
          <li><img src="/logos/federato.png" alt="Federato" width={150} height={21} className="s2-prizes__wide" /><span><b>Best RiskOps</b>Federato</span></li>
        </ul>
        <a className="s2-more" href="https://github.com/jruttan1/Optimate" {...ext}>Optimate on GitHub ↗</a>
      </>
    ),
  },
  {
    when: 'Oct 2026', icon: 'td', title: 'Can you delete dangerous knowledge from a model?', role: 'Independent research · Gemma-2-2B',
    body: (
      <>
        <p>
          I cut cyberweapon knowledge (WMDP-cyber) out of Gemma-2-2B by deleting a 16-direction subspace from every layer's
          weights. Then I gave it and the two standard unlearning methods, RMU and NPO, the same test: an attacker
          fine-tunes the knowledge back, and I measure how much of the forgetting survives.
        </p>
        <p className="s2-result">Against LoRA attackers the deletion keeps 72% vs 13% (p = 0.0008). Against full fine-tuning, the edge is gone.</p>
        <div className="s2-demo"><Demo kind="unlearn" compact /></div>
        <p>
          Why: the attacker writes its updates into the deleted subspace 5–6× more often than chance (15.6% vs 2.8%). Block
          that subspace and recovery still doesn't stall. The deletion removes one route to the knowledge, not the knowledge.
        </p>
      </>
    ),
  },
  fmtRole('RBC Borealis'),
  { ...fmtRole('DEIA Lab, UVic'), body: <Link className="s2-more" to={`${base}/research/billion-vector-retrieval`}>Read the write-up →</Link> },
  fmtRole('Pear Care'),
  {
    when: ocean.when, icon: 'uvic', title: 'SOLIDS Lab, UVic', role: ocean.title,
    body: (
      <>
        <p>{ocean.finding}</p>
        <p className="s2-result">{ocean.result}</p>
        <div className="s2-demo"><Demo kind="ocean" compact /></div>
        <Link className="s2-more" to={`${base}/research/${ocean.slug}`}>Read the write-up →</Link>
      </>
    ),
  },
  fmtRole('MLH · Apache Airflow'),
  { when: `Graduating ${education.when}`, icon: 'uvic', title: education.school, role: `B.S. Computer Science · ${education.note}` },
]

const ext = { target: '_blank', rel: 'noopener' } as const

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
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    // Honeypot: a hidden field people never fill. Pretend success so bots move on.
    if (f.company) return setState('sent')
    try {
      // Web3Forms only accepts browser-side submissions (the access key is public by design). FormData with no custom
      // headers keeps it a simple CORS request, so there's no preflight for their firewall to reject.
      const body = new FormData()
      // ponytail: the Vercel env value ends in a stray quote; strip it here rather than edit project settings.
      body.append('access_key', String(import.meta.env.VITE_WEB3FORMS_ACCESS_KEY).replace(/['"]/g, ''))
      body.append('subject', `Portfolio: message from ${f.name}`)
      body.append('from_name', 'tanujdargan.com')
      for (const k of ['name', 'email', 'message']) body.append(k, f[k])
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!data.success) throw new Error('Couldn’t send just now. Email me at dargantanuj@gmail.com instead.')
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
  const [intro, setIntro] = useState(true)
  // the entrance stagger keys off this class; it stays until the page unmounts so late delays finish cleanly
  useEffect(() => () => document.documentElement.classList.remove('s2-entering'), [])
  return (
    <div data-intro={intro || undefined}>
      {intro && <Intro onDone={() => setIntro(false)} />}
      <nav className="s2-nav s2-in" style={{ '--d': 3 } as React.CSSProperties} aria-label="Sections">
        <a href="#top" className="s2-nav__me">TD</a>
        <span>
          <a href="#work">Work</a>
          <a href="#builds">Projects</a>
          <a href="#contact">Contact</a>
        </span>
      </nav>
      <main className="s2-main" id="s2-main">
        <header className="s2-hero" id="top">
          <h1 className="s2-name">{NAME}</h1>
          <p className="s2-title s2-in" style={{ '--d': 0 } as React.CSSProperties}>{TITLE}</p>
          <p className="s2-lede s2-in" style={{ '--d': 1 } as React.CSSProperties}>
            This summer I shipped an LLM planning assistant to production at <b>Amazon Robotics</b>. I study what language
            models represent inside: with <b>Apart Research</b> I showed how fine-tuning decides whether a model voices
            shutdown distress. Before that I led flight firmware for <b>MarmotSat</b>, now in orbit. Fourth-year CS at the University of Victoria, graduating April 2027.
          </p>
          <p className="s2-links s2-in" style={{ '--d': 2 } as React.CSSProperties}>
            <a href={links.resume.href} {...ext}>Resume ↗</a>
            <a href={links.github.href} {...ext}>GitHub ↗</a>
            <a href={links.linkedin.href} {...ext}>LinkedIn ↗</a>
            <a href={links.email.href}>Email</a>
          </p>
          <a href="#work" className="s2-down s2-in" style={{ '--d': 4 } as React.CSSProperties} aria-label="Scroll to work">↓</a>
        </header>

        <section className="s2-sec" id="work" aria-labelledby="s2-h-work">
          <h2 className="s2-h s2-rise" id="s2-h-work">Work and research</h2>
          <ol className="s2-line">
            {entries(base).map((e) => (
              <li key={e.title} className="s2-entry s2-rise">
                <Tile m={e.icon} />
                <div className="s2-entry__body">
                  <p className="s2-when">{e.when}</p>
                  <h3>{e.title}</h3>
                  <p className="s2-role">{e.role}</p>
                  {e.bullets && (
                    <ul className="s2-bullets">
                      {e.bullets.map((b) => <li key={b}>{b}</li>)}
                    </ul>
                  )}
                  {e.body}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="s2-sec" id="builds" aria-labelledby="s2-h-also">
          <h2 className="s2-h s2-rise" id="s2-h-also">Other things I've built</h2>
          <ul className="s2-cards">
            {builds.map((m) => {
              const inner = (
                <>
                  <b>{m.title}</b>
                  <span>{m.line}</span>
                </>
              )
              return (
                <li key={m.title} className="s2-rise">
                  {m.href ? m.ext ? <a href={m.href} {...ext}>{inner}</a> : <Link to={`${base}${m.href}`}>{inner}</Link> : <div>{inner}</div>}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="s2-sec" aria-labelledby="s2-h-gh">
          <h2 className="s2-h s2-rise" id="s2-h-gh">On GitHub</h2>
          <GitHubYear />
        </section>

        <section className="s2-life" aria-label="Side projects">
          {life.parts.map((part) => (
            <div key={part.id} className="s2-part s2-rise" data-kind={part.id}>
              <div className="s2-part__text">
                <h3>{part.title}</h3>
                {part.body && <p>{part.body}</p>}
                {part.links?.map((l) => (
                  <a key={l.href} className="s2-more" href={l.href} {...ext}>
                    {l.label} ↗
                  </a>
                ))}
              </div>
              {part.items && (
                <ul className="s2-items">
                  {part.items.map((it) => (
                    <li key={it.name}>
                      {it.img && <img src={it.img} alt={it.name} loading="lazy" data-pixel={it.pixel || undefined} />}
                      <b>{it.name}</b>
                      {it.note && <span>{it.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        <footer className="s2-contact s2-rise" id="contact">
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
    </div>
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
