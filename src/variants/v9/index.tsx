/*
 * v9 "Depth". A generative ocean where depth is time: the surface is now, every 100 m down is a year earlier,
 * and the work surfaces as sonar pings that resolve into cards. The seabed (2022) holds the full log.
 *
 * Patterns: P01 (shared steering demo, first thing below the surface), P03 (live readout, here the depth gauge),
 * P08 (observer-driven state), P12 (loop pauses when hidden or covered; painted CSS sea as the poster/fallback),
 * P18 (rows with one metric), P30 (pinned years, as the gauge's year bands).
 * V9-P1…V9-P8 in docs/patterns-v9.md: surface hero over a shader, waterline dive, depth = time gauge (scrubbable),
 * sonar ping → card, satellite-to-depth probe, opt-in synthesized ambience, frozen water for reduced motion,
 * logbook on the seabed.
 * Type: Fraunces Italic (display, latin wght only) + Geist Mono (instruments) + the platform sans for body.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { person, research, engineering, earlier, experience, beri, links, type Milestone } from '../../content/site'
import { useProof, useCommunity, useMilestones } from '../../content/useContent'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import { Show } from '../../lib/labprefs'
import { useMotionPrefs } from '../../lib/motion'
import type { VariantProps } from '../../routes'
import { FLOOR_M, bands, metresFor, whenAt } from './depth'
import { Sensor } from './Sensor'
import type { Ocean } from './ocean'
import type { Ambient } from './audio'
import './v9.css'

// Module-level handles (plain objects; nothing touches window at import time).
const shared: { amb: Ambient | null; depth: number } = { amb: null, depth: 0 }

const kindLabel: Record<Milestone['kind'], string> = {
  research: 'Research',
  industry: 'Industry',
  build: 'Build',
  community: 'Community',
  competition: 'Competition',
}
// Mobile proof lines: the same facts as proof[].detail, cut to fit the first screen.
const proofShort: Record<string, string> = {
  amazon: 'SDE intern, 2026. LLM planning assistant in production at 180+ sites. Return offer.',
  beri: 'Co-founder. A native iOS food and recipe app.',
  marmotsat: 'Led the onboard-computer firmware. Launched on a Falcon 9.',
  research: 'Activation steering, and loss masking vs shutdown distress.',
}

const PX = 1.5 // gauge px per metre

type Item =
  | { type: 'st'; m: number; ms: Milestone; wide?: 'steer' | 'sensor'; side: 'l' | 'r' | 'w' }
  | { type: 'note'; m: number; key: string; text: ReactNode }

function useItems(): Item[] {
  const ms = useMilestones()
  return useMemo(() => {
    // Work-only notes for the quiet 2023–24 stretch (no places: the story is told through the work).
    const notes: Item[] = [
      { type: 'note', m: metresFor(2024.7), key: 'uvic', text: <>Sep 2024. Started CS at UVic on the accelerated three-year track.</> },
      { type: 'note', m: metresFor(2023), key: 'kaggle', text: <>2021–2023. Kaggle notebooks, school hackathons, and the first ML projects on GitHub.</> },
    ]
    let alt = 0
    const st: Item[] = [...ms].reverse().map((m) => {
      const wide = m.title === 'Activation steering' ? 'steer' : m.title === 'Ocean sensing' ? 'sensor' : undefined
      const side = wide || m.year <= 2022 ? 'w' : alt++ % 2 ? 'l' : 'r'
      return { type: 'st', m: metresFor(m.year), ms: m, wide, side }
    })
    return [...st, ...notes].sort((a, b) => a.m - b.m)
  }, [ms])
}

/* ------------------------------------------------------------------ chrome */

function Nav({ base, home }: { base: string; home: boolean }) {
  const sec = [
    { id: 'dive', label: 'Dive' },
    { id: 'sensor', label: 'Sensor' },
    { id: 'log', label: 'Log' },
    { id: 'contact', label: 'Contact' },
  ]
  return (
    <header className="v9-nav">
      <Link to={`${base}/`} className="v9-nav__name">
        {person.name}
      </Link>
      <nav aria-label="Sections" className="v9-nav__sec">
        {sec.map((s) =>
          home ? (
            <a key={s.id} href={`#${s.id}`}>
              {s.label}
            </a>
          ) : (
            <Link key={s.id} to={`${base}/#${s.id}`}>
              {s.label}
            </Link>
          ),
        )}
      </nav>
      <Links className="v9-nav__links" mode="icon" size={17} />
    </header>
  )
}

function SoundToggle() {
  const [on, setOn] = useState(false)
  return (
    <button
      type="button"
      className="v9-sound"
      aria-pressed={on}
      aria-label={on ? 'Ambient sound on. Turn off' : 'Ambient sound off. Turn on'}
      onClick={async () => {
        if (!shared.amb) {
          const { createAmbient } = await import('./audio')
          shared.amb = createAmbient()
        }
        const v = !on
        shared.amb.setOn(v)
        if (v) shared.amb.setDepth(shared.depth)
        setOn(v)
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
        {on ? (
          <path d="M10.5 5.5c1 .8 1 4.2 0 5M12.5 3.8c2 1.8 2 6.6 0 8.4" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M10.5 6l3.5 4M14 6l-3.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        )}
      </svg>
      <span>{on ? 'Sound on' : 'Sound off'}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ gauge */

interface Engine {
  toM(m: number, smooth?: boolean): void
  step(dir: 1 | -1): void
  m(): number
}

function Gauge({ items, engine, readM, readY, ruler, slider }: {
  items: Item[]
  engine: React.MutableRefObject<Engine | null>
  readM: React.MutableRefObject<(HTMLElement | null)[]>
  readY: React.MutableRefObject<(HTMLElement | null)[]>
  ruler: React.RefObject<HTMLDivElement>
  slider: React.RefObject<HTMLDivElement>
}) {
  const drag = useRef<{ y: number; m: number } | null>(null)
  const ticks = useMemo(() => {
    const out: { m: number; major: boolean }[] = []
    for (let m = 0; m <= FLOOR_M; m += 5) out.push({ m, major: m % 25 === 0 })
    return out
  }, [])
  return (
    <>
      <aside className="v9-gauge" aria-label="Depth gauge">
        <div className="v9-gauge__read">
          <span className="v9-gauge__m">
            <b ref={(el) => (readM.current[0] = el)}>0</b> m
          </span>
          <span className="v9-gauge__y" ref={(el) => (readY.current[0] = el)}>
            {whenAt(0)}
          </span>
        </div>
        <div
          ref={slider}
          className="v9-gauge__win"
          role="slider"
          tabIndex={0}
          aria-label="Depth. Drag or use the arrow keys to dive through the years"
          aria-valuemin={0}
          aria-valuemax={FLOOR_M}
          aria-valuenow={0}
          aria-valuetext={`0 metres, ${whenAt(0)}`}
          onKeyDown={(e) => {
            const E = engine.current
            if (!E) return
            if (e.key === 'ArrowDown' || e.key === 'PageDown') E.step(1)
            else if (e.key === 'ArrowUp' || e.key === 'PageUp') E.step(-1)
            else if (e.key === 'Home') E.toM(0, true)
            else if (e.key === 'End') E.toM(FLOOR_M, true)
            else return
            e.preventDefault()
          }}
          onPointerDown={(e) => {
            if (!engine.current) return
            e.currentTarget.setPointerCapture(e.pointerId)
            drag.current = { y: e.clientY, m: engine.current.m() }
          }}
          onPointerMove={(e) => {
            if (!drag.current || !engine.current) return
            engine.current.toM(Math.max(0, Math.min(FLOOR_M, drag.current.m + (e.clientY - drag.current.y) * 0.9)))
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <div className="v9-gauge__ruler" ref={ruler} style={{ height: FLOOR_M * PX }}>
            {bands.map((b) => (
              <span key={b.y} className="v9-gauge__band" style={{ top: b.top * PX, height: (b.bottom - b.top) * PX }}>
                <span>{b.y}</span>
              </span>
            ))}
            {ticks.map((t) => (
              <i key={t.m} className="v9-gauge__tick" data-major={t.major || undefined} style={{ top: t.m * PX }} />
            ))}
            {items.map((it) =>
              it.type === 'st' ? <b key={it.ms.title} className="v9-gauge__dot" style={{ top: it.m * PX }} title={`${it.ms.title}, ${it.ms.when}`} /> : null,
            )}
          </div>
          <span className="v9-gauge__needle" aria-hidden="true" />
        </div>
        <span className="v9-gauge__hint" aria-hidden="true">
          drag to dive
        </span>
      </aside>
      <div className="v9-pill" aria-hidden="true">
        <b ref={(el) => (readM.current[1] = el)}>0</b> m ·{' '}
        <span ref={(el) => (readY.current[1] = el)}>{whenAt(0)}</span>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ home */

function Station({ it, base, i }: { it: Extract<Item, { type: 'st' }>; base: string; i: number }) {
  const ms = it.ms
  const cta = ms.href?.startsWith('/research') ? 'Read the write-up' : ms.href === '/beri' ? 'The case study' : null
  return (
    <>
      <p className="v9-card__meta">
        <span>{ms.when}</span>
        <span>{kindLabel[ms.kind]}</span>
      </p>
      <h3 className="v9-card__t">
        {ms.title}
        {ms.unverified && <Flag note={ms.unverified} />}
      </h3>
      <p className="v9-card__line">{ms.line}</p>
      {(ms.metric || cta) && (
        <div className="v9-card__foot">
          {ms.metric && <span className="v9-card__metric">{ms.metric}</span>}
          {ms.href && cta && (
            <Link to={`${base}${ms.href}`} className="v9-card__go">
              {cta} <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      )}
      {it.wide === 'steer' && (
        <div className="v9-card__demo">
          <Demo kind="steering" hero={i === 0} />
        </div>
      )}
      {it.wide === 'sensor' && <Sensor />}
    </>
  )
}

function Dive({ items, base }: { items: Item[]; base: string }) {
  let prev = 0
  return (
    <section id="dive" className="v9-dive" aria-labelledby="v9-dive-h">
      <header className="v9-dive__intro">
        <p className="v9-label">Below the surface</p>
        <h2 id="v9-dive-h" className="v9-h2">
          Depth is time.
        </h2>
        <p>The surface is now. Every hundred metres down is a year earlier, and the work surfaces as you pass it. The bottom is 2022.</p>
      </header>
      <div className="v9-stations-wrap">
      <span className="v9-cable" aria-hidden="true" />
      <ol className="v9-stations">
        {items.map((it, i) => {
          const dm = it.m - prev
          prev = it.m
          const gap = `${Math.round(Math.max(9, Math.min(44, dm * 0.5)))}svh`
          const style = { '--gap': gap } as CSSProperties
          if (it.type === 'note')
            return (
              <li key={it.key} className="v9-st v9-st--note" data-m={it.m} style={style}>
                <span className="v9-st__ping" aria-hidden="true" />
                <span className="v9-st__depth" aria-hidden="true">
                  {it.m} m
                </span>
                <p className="v9-note">{it.text}</p>
              </li>
            )
          const bottom = it.m >= FLOOR_M
          return (
            <li
              key={it.ms.title}
              id={it.wide === 'sensor' ? 'sensor' : it.wide === 'steer' ? 'steering' : undefined}
              className="v9-st"
              data-m={it.m}
              data-side={it.side}
              data-kind={it.ms.kind}
              data-floor={bottom || undefined}
              style={style}
            >
              <span className="v9-st__ping" aria-hidden="true">
                <i />
                <i />
              </span>
              <span className="v9-st__depth" aria-hidden="true">
                {it.m} m{bottom ? ' · seabed' : ''}
              </span>
              <article className="v9-card" data-wide={it.wide || undefined}>
                <Station it={it} base={base} i={i} />
              </article>
            </li>
          )
        })}
      </ol>
      </div>
    </section>
  )
}

function Experience() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <ol className="v9-rows">
      {experience.map((r, i) => (
        <li key={r.org} className="v9-row" data-open={open === i || undefined}>
          <button type="button" className="v9-row__head" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            <span className="v9-row__org">{r.org}</span>
            <span className="v9-row__role">{r.role}</span>
            <span className="v9-row__when">{r.when}</span>
            <span className="v9-row__metric">{r.metric}</span>
            <span className="v9-row__chev" aria-hidden="true" />
          </button>
          {open === i && (
            <div className="v9-row__more">
              <p>{r.line}</p>
              <ul>
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="v9-copy"
      data-copied={copied || undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          location.href = links.email.href
        }
      }}
    >
      <span className="v9-copy__a">{person.email}</span>
      <span className="v9-copy__b" aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </button>
  )
}

function Log({ base }: { base: string }) {
  const community = useCommunity()
  return (
    <section id="log" className="v9-log" aria-labelledby="v9-log-h">
      <div className="v9-log__in">
        <header className="v9-log__head">
          <p className="v9-label">{FLOOR_M} m · the seabed</p>
          <h2 id="v9-log-h" className="v9-h2">
            The log.
          </h2>
          <p className="v9-soft">Everything above, written down, newest first.</p>
        </header>

        <section className="v9-block" aria-labelledby="v9-h-exp">
          <h3 id="v9-h-exp" className="v9-h3">
            Experience
          </h3>
          <Experience />
        </section>

        <section className="v9-block" aria-labelledby="v9-h-res">
          <h3 id="v9-h-res" className="v9-h3">
            Research
          </h3>
          <p className="v9-soft v9-block__sub">Five write-ups: the question, the method, the result, and what I'd do next.</p>
          <ol className="v9-res">
            {research.map((r, i) => (
              <li key={r.slug}>
                <Link to={`${base}/research/${r.slug}`} className="v9-res__a">
                  <span className="v9-res__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="v9-res__t">{r.title}</span>
                  <span className="v9-res__m">
                    {r.where} · {r.when}
                  </span>
                  <span className="v9-res__go" aria-hidden="true">
                    →
                  </span>
                </Link>
                {r.unverified && <Flag note={r.unverified[0]} />}
              </li>
            ))}
          </ol>
        </section>

        <Show when="beri">
          <section className="v9-block v9-beri" aria-labelledby="v9-h-beri">
            <h3 id="v9-h-beri" className="v9-h3">
              Beri
            </h3>
            <p className="v9-beri__line">{beri.oneLiner}</p>
            <p className="v9-soft">
              {beri.role} {beri.stack.join(' · ')}.
            </p>
            <p className="v9-beri__links">
              <Link to={`${base}/beri`} className="v9-inline">
                Read the case study →
              </Link>
              <a href={beri.url} target="_blank" rel="noopener" className="v9-inline">
                getberi.com ↗
              </a>
            </p>
          </section>
        </Show>

        <div className="v9-block v9-cols">
          <section aria-labelledby="v9-h-eng">
            <h3 id="v9-h-eng" className="v9-h3">
              Engineering
            </h3>
            <ul className="v9-mini">
              {engineering.map((e) => (
                <li key={e.title}>
                  <b>{e.href ? <a href={e.href} target="_blank" rel="noopener">{e.title} ↗</a> : e.title}</b>
                  <span className="v9-soft"> {e.role}.</span> {e.detail}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="v9-h-com">
            <h3 id="v9-h-com" className="v9-h3">
              Community
            </h3>
            <ul className="v9-mini">
              {community.map((c) => (
                <li key={c.title}>
                  <b>{c.href ? <a href={c.href} target="_blank" rel="noopener">{c.title} ↗</a> : c.title}</b>
                  <span className="v9-soft">
                    {' '}
                    {c.role}, {c.when}.
                  </span>{' '}
                  {c.detail}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="v9-block" aria-labelledby="v9-h-earlier">
          <h3 id="v9-h-earlier" className="v9-h3">
            Earlier
          </h3>
          <ul className="v9-earlier">
            {earlier.map((e) => (
              <li key={e.title}>
                <span className="v9-earlier__t">
                  {e.href ? (
                    <a href={e.href} target="_blank" rel="noopener">
                      {e.title} ↗
                    </a>
                  ) : (
                    e.title
                  )}
                  {'unverified' in e && e.unverified && <Flag note="Parameter Golf found in a local repo, not on the resume; confirm it's okay to list." />}
                </span>
                <span className="v9-soft">
                  {e.role}. {e.detail}
                </span>
                <span className="v9-earlier__w">{e.when}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section id="contact" className="v9-contact" aria-labelledby="v9-h-contact">
        <p className="v9-label">Surface when you're ready</p>
        <h2 id="v9-h-contact" className="v9-h2">
          Research programs, labs and founders: <em>email is fastest.</em>
        </h2>
        <CopyEmail />
        <Links className="v9-contact__links" mode="both" size={15} />
      </section>
    </section>
  )
}

function Home({ base }: { base: string }) {
  const proof = useProof()
  const items = useItems()
  const mp = useMotionPrefs()
  const motion = useRef(mp)
  motion.current = mp

  const heroRef = useRef<HTMLElement>(null)
  const seaRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ruler = useRef<HTMLDivElement>(null)
  const slider = useRef<HTMLDivElement>(null)
  const readM = useRef<(HTMLElement | null)[]>([])
  const readY = useRef<(HTMLElement | null)[]>([])
  const engine = useRef<Engine | null>(null)
  const ocean = useRef<Ocean | null>(null)
  const ampFor = () => (motion.current.reduced ? 0.7 : { subtle: 0.55, default: 1, expressive: 1.5 }[motion.current.level])

  // Scroll engine: maps scroll to metres through anchors measured on resize (no layout reads on scroll).
  useEffect(() => {
    const root = heroRef.current!.closest('.v9') as HTMLElement
    const sea = seaRef.current!
    const dive = root.querySelector<HTMLElement>('.v9-dive')!
    const log = root.querySelector<HTMLElement>('.v9-log')!
    let anchors: { y: number; m: number }[] = [{ y: 0, m: 0 }]
    let vh = innerHeight
    let heroH = vh
    let logTop = Infinity
    let cur = 0
    let lastRound = -1
    let under = false
    let covered = false
    let visible = document.visibilityState === 'visible'

    const measure = () => {
      vh = innerHeight
      const sy = scrollY
      heroH = heroRef.current!.offsetHeight
      const a = [{ y: 0, m: 0 }]
      dive.querySelectorAll<HTMLElement>('[data-m]').forEach((el) => {
        const y = el.getBoundingClientRect().top + sy - vh * 0.42
        a.push({ y: Math.max(a[a.length - 1].y + 1, y), m: +el.dataset.m! })
      })
      anchors = a
      logTop = log.getBoundingClientRect().top + sy
      update()
    }
    const mAt = (y: number) => {
      const a = anchors
      if (y <= 0) return 0
      for (let i = 1; i < a.length; i++) if (y < a[i].y) return a[i - 1].m + ((y - a[i - 1].y) / (a[i].y - a[i - 1].y)) * (a[i].m - a[i - 1].m)
      return a[a.length - 1].m
    }
    const yAt = (m: number) => {
      const a = anchors
      for (let i = 1; i < a.length; i++) if (m <= a[i].m) return a[i - 1].y + ((m - a[i - 1].m) / Math.max(1e-6, a[i].m - a[i - 1].m)) * (a[i].y - a[i - 1].y)
      return a[a.length - 1].y
    }
    const running = () => ocean.current?.setRunning(visible && !covered)

    let raf = 0
    const update = () => {
      raf = 0
      const y = scrollY
      const m = mAt(y)
      cur = m
      shared.depth = m
      const d = Math.min(1, Math.max(0, (y - heroH * 0.06) / (heroH * 0.8)))
      sea.style.setProperty('--dive', d.toFixed(3))
      sea.style.setProperty('--deep', Math.min(1, m / FLOOR_M).toFixed(3))
      if (ruler.current) ruler.current.style.transform = `translate3d(0, ${(-m * PX).toFixed(1)}px, 0)`
      const r = Math.round(m)
      if (r !== lastRound) {
        lastRound = r
        const w = whenAt(m)
        readM.current.forEach((el) => el && (el.textContent = String(r)))
        readY.current.forEach((el) => el && (el.textContent = w))
        slider.current?.setAttribute('aria-valuenow', String(r))
        slider.current?.setAttribute('aria-valuetext', `${r} metres, ${w}`)
        shared.amb?.setDepth(m)
      }
      const u = y > heroH * 0.55
      if (u !== under) {
        under = u
        root.toggleAttribute('data-under', u)
      }
      const c = y > logTop + vh * 0.45
      if (c !== covered) {
        covered = c
        root.toggleAttribute('data-log', c)
        running()
      }
      ocean.current?.set({ depth: m, dive: d, snow: y / vh })
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    const onVis = () => {
      visible = document.visibilityState === 'visible'
      running()
    }
    const ro = new ResizeObserver(() => measure())
    ro.observe(dive)
    ro.observe(document.body)
    addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVis)

    engine.current = {
      m: () => cur,
      toM(m, smooth) {
        scrollTo({ top: yAt(m), behavior: smooth && !motion.current.reduced ? 'smooth' : 'instant' })
      },
      step(dir) {
        const ms = anchors.map((a) => a.m)
        const next = dir > 0 ? ms.find((v) => v > cur + 0.5) : [...ms].reverse().find((v) => v < cur - 0.5)
        this.toM(next ?? (dir > 0 ? FLOOR_M : 0), true)
      },
    }

    // Stations resolve from a ping into a card as they come up; once lit they stay lit.
    const sts = [...dive.querySelectorAll<HTMLElement>('.v9-st')]
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return
          const el = e.target as HTMLElement
          el.classList.add('is-lit')
          io.unobserve(el)
          const side = el.dataset.side
          shared.amb?.ping(side === 'l' ? -0.5 : side === 'r' ? 0.5 : 0)
        }),
      { rootMargin: '0px 0px -22% 0px' },
    )
    root.setAttribute('data-armed', '')
    sts.forEach((s) => io.observe(s))

    measure()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVis)
      root.removeAttribute('data-armed')
      root.removeAttribute('data-under')
      root.removeAttribute('data-log')
      engine.current = null
    }
  }, [items])

  // The ocean: raw WebGL in its own chunk, started after first paint in idle time.
  useEffect(() => {
    let dead = false
    const root = heroRef.current!.closest('.v9') as HTMLElement
    const mq = matchMedia('(max-width: 760px)')
    const hz = () => (mq.matches ? -0.28 : -0.16)
    const start = async () => {
      try {
        const { createOcean } = await import('./ocean')
        if (dead) return
        const o = await createOcean(canvasRef.current!, {
          mobile: mq.matches || matchMedia('(pointer: coarse)').matches,
          hz: hz(),
          amp: ampFor(),
          reduced: motion.current.reduced,
          onFirstFrame: () => !dead && root.setAttribute('data-gl', 'on'),
        })
        if (dead) return o.dispose()
        ocean.current = o
        o.set({ depth: shared.depth, dive: +(seaRef.current?.style.getPropertyValue('--dive') || 0), snow: scrollY / innerHeight })
        o.setRunning(document.visibilityState === 'visible' && scrollY < (root.querySelector<HTMLElement>('.v9-log')?.offsetTop ?? 1e9))
      } catch (e) {
        if (!dead) root.setAttribute('data-gl', 'off')
        console.warn('[v9] WebGL unavailable; showing the painted sea.', e)
      }
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
    let idle = 0
    const raf = requestAnimationFrame(() => {
      idle = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 1200 }) : window.setTimeout(start, 150)
    })
    let rw = innerWidth
    let rh = innerHeight
    const onResize = () => {
      // ignore mobile URL-bar height wobble
      if (innerWidth === rw && Math.abs(innerHeight - rh) < 140) return
      rw = innerWidth
      rh = innerHeight
      ocean.current?.setHorizon(hz())
      ocean.current?.resize()
    }
    addEventListener('resize', onResize)

    // Cursor ripples on the surface (fine pointers move; any pointer can tap).
    let lastT = 0
    let lx = 0
    let ly = 0
    const rip = (e: PointerEvent, s: number) => {
      const o = ocean.current
      if (!o || motion.current.reduced || scrollY > innerHeight * 0.5) return
      o.ripple((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2, s)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const now = performance.now()
      if (now - lastT < 110 || Math.hypot(e.clientX - lx, e.clientY - ly) < 18) return
      lastT = now
      lx = e.clientX
      ly = e.clientY
      rip(e, 0.55)
    }
    const onDown = (e: PointerEvent) => rip(e, 1.3)
    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('pointerdown', onDown, { passive: true })
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      if (idle) (w.cancelIdleCallback ?? clearTimeout)(idle)
      removeEventListener('resize', onResize)
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerdown', onDown)
      ocean.current?.dispose()
      ocean.current = null
      root.removeAttribute('data-gl')
    }
  }, [])

  useEffect(() => {
    ocean.current?.setMotion(ampFor(), mp.reduced)
  }, [mp.level, mp.reduced])

  return (
    <>
      <div className="v9-sea" ref={seaRef} aria-hidden="true">
        <div className="v9-sea__paint" />
        <div className="v9-sea__under" />
        <div className="v9-sea__deep" />
        <canvas ref={canvasRef} className="v9-sea__gl" />
      </div>
      <Gauge items={items} engine={engine} readM={readM} readY={readY} ruler={ruler} slider={slider} />
      <SoundToggle />

      <section className="v9-hero" ref={heroRef} aria-labelledby="v9-name">
        <div className="v9-hero__top">
          <p className="v9-label v9-in" style={{ '--i': 0 } as CSSProperties}>
            CS at UVic, class of {person.grad} · {person.location}
          </p>
          <h1 id="v9-name" className="v9-name v9-in" style={{ '--i': 1 } as CSSProperties}>
            {person.name}
          </h1>
          <p className="v9-lede v9-in" style={{ '--i': 2 } as CSSProperties}>
            I ship ML systems to production and study what happens inside the models.
          </p>
          <Links className="v9-hero__links v9-in" mode="both" size={15} />
        </div>
        <ul className="v9-proof" aria-label="Proof">
          {proof.map((p, i) => (
            <li key={p.key} className="v9-in" style={{ '--i': 3 + i } as CSSProperties}>
              <span className="v9-proof__k">{p.label}</span>
              <span className="v9-proof__d v9-wide">{p.detail}</span>
              <span className="v9-proof__d v9-narrow">{proofShort[p.key] ?? p.detail}</span>
            </li>
          ))}
        </ul>
        <a href="#dive" className="v9-cue v9-in" style={{ '--i': 6 } as CSSProperties}>
          <span className="v9-cue__line" aria-hidden="true" />
          Dive <span className="v9-soft">· 100 m a year</span>
        </a>
      </section>

      <Dive items={items} base={base} />
      <Log base={base} />
    </>
  )
}

/* ------------------------------------------------------------------ root */

export default function V9({ page, base }: VariantProps) {
  const { path } = useRouter()
  const home = page.kind === 'home'
  return (
    <div className="v9" data-page={page.kind}>
      <a href="#main" className="v9-skip">
        Skip to content
      </a>
      <Nav base={base} home={home} />
      <main id="main" key={path}>
        {home && <Home base={base} />}
        {page.kind === 'research' && (
          <div className="v9-doc">
            <p className="v9-doc__depth v9-label">
              <Link to={`${base}/#dive`}>← Back to the dive</Link>
            </p>
            <ResearchArticle slug={page.slug} base={base} />
            {page.slug === 'ocean-sensing' && (
              <section className="v9-doc__extra" aria-label="Interactive sketch">
                <p className="v9-label">Sketch: satellite to depth</p>
                <Sensor />
              </section>
            )}
          </div>
        )}
        {page.kind === 'beri' && (
          <div className="v9-doc">
            <BeriCaseStudy base={base} />
          </div>
        )}
        {page.kind === 'notfound' && (
          <section className="v9-doc v9-404">
            <p className="v9-label">Depth unknown</p>
            <h1 className="v9-name">Nothing down here.</h1>
            <p>
              <Link to={`${base}/`} className="v9-inline">
                Back to the surface →
              </Link>
            </p>
          </section>
        )}
      </main>
      <footer className="v9-foot">
        <span>© 2026 {person.name}</span>
        <span className="v9-soft">The ocean is one fragment shader at half resolution. Everything you read is HTML.</span>
      </footer>
    </div>
  )
}
