/*
 * v7 "Mission control". Tanuj's work as MarmotSat's operations console: a live orbit (real NORAD 69912 elements),
 * subsystems streaming telemetry built only from site.ts metrics, a YAMCS-style command line, an event log, a radio
 * "signal" layer (off by default) and a downlink transition between pages.
 *
 * Patterns (PORTFOLIO_TASTE.md §4): P03 live line (orbit HUD), P05-lite (static HUD grid, no moving grain),
 * P12 pause offscreen, P19 one-metric rows (readouts), P25 command menu (the console), P27 copy-email morph,
 * P29 shader HUD (dotted Earth + DOM telemetry corners). v7-specific: V7-P1…V7-P8 in docs/patterns-v7.md.
 * Type: Geist Mono (display, HUD, labels, readouts) + Onest (prose), latin-only, metric-matched fallbacks.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { person, links, research, type Milestone } from '../../content/site'
import { useCommunity, useMilestones, useProof } from '../../content/useContent'
import { Links } from '../../shared/Links'
import { Flag } from '../../shared/Flag'
import { ResearchArticle } from '../../shared/ResearchArticle'
import { BeriCaseStudy } from '../../shared/BeriCaseStudy'
import { Demo } from '../../demos/Demo'
import { Link, useRouter } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import { Show, useFlags } from '../../lib/labprefs'
import type { VariantProps } from '../../routes'
import { Orbit, getClock } from './OrbitView'
import { Console, type Line, type Suggestion } from './Console'
import { subsystems, researchAliases, type Sub } from './data'
import { nextPass, fmtDur, state, elevation } from './kepler'
import { beep, signalOff, signalOn } from './signal'
import './v7.css'

/* ------------------------------------------------------------------ downlink transition + shared UI state */

interface Ops {
  base: string
  /** navigate with the downlink transition */
  go: (to: string, label?: string) => void
  focusSub: (id: string) => void
  openSub: string | null
  setOpenSub: (id: string | null) => void
  signal: boolean
  setSignal: (on: boolean) => void
}
const OpsCtx = createContext<Ops | null>(null)
const useOps = () => useContext(OpsCtx)!

/** An internal link that plays the downlink transition before navigating. */
function DLink({ to, label, children, className }: { to: string; label?: string; children: ReactNode; className?: string }) {
  const ops = useOps()
  return (
    <Link
      to={`${ops.base}${to}`}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        ops.go(to, label)
      }}
    >
      {children}
    </Link>
  )
}

function Downlink({ run }: { run: { label: string; n: number } | null }) {
  if (!run) return null
  return (
    <div className="v7-dl" key={run.n} aria-hidden="true">
      <div className="v7-dl__bars" />
      <div className="v7-dl__txt">
        <span>DOWNLINK</span>
        <span className="v7-dl__path">{run.label}</span>
        <span className="v7-dl__prog">
          <i />
        </span>
        <span className="v7-dl__lock">RX LOCK</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ top bar */

const sections = [
  { id: 'sys', label: 'SYS' },
  { id: 'data', label: 'DATA' },
  { id: 'log', label: 'LOG' },
  { id: 'uplink', label: 'UPLINK' },
]

function SignalToggle() {
  const ops = useOps()
  return (
    <button
      type="button"
      className="v7-sig"
      aria-pressed={ops.signal}
      onClick={() => ops.setSignal(!ops.signal)}
      title={ops.signal ? 'Signal audio on' : 'Signal audio off'}
    >
      <span className="v7-sig__bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="v7-sig__t">
        <span className="v7-sr">Radio signal audio: </span>
        {ops.signal ? 'ON' : 'OFF'}
      </span>
    </button>
  )
}

function TopBar({ home, con, conOpen, setCon }: { home: boolean; con: ReactNode; conOpen: boolean; setCon: (o: boolean) => void }) {
  const ops = useOps()
  return (
    <header className="v7-bar">
      <div className="v7-bar__in">
        <Link to={`${ops.base}/`} className="v7-brand" aria-label={`${person.name}, mission control home`}>
          <i className="v7-led v7-led--ok v7-led--pulse" aria-hidden="true" />
          <span className="v7-brand__long">{person.name.toUpperCase()}</span>
          <span className="v7-brand__short" aria-hidden="true">
            TD
          </span>
          <span className="v7-brand__mcc" aria-hidden="true">
            / MCC
          </span>
        </Link>
        {home && (
          <nav className="v7-bar__nav" aria-label="Sections">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.label}
              </a>
            ))}
          </nav>
        )}
        {con}
        <button type="button" className="v7-bar__con" data-v7-con-toggle aria-label="Command line" aria-expanded={conOpen} onClick={() => setCon(!conOpen)}>
          <span aria-hidden="true">›_</span>
        </button>
        <SignalToggle />
        <Links className="v7-bar__links" mode="icon" size={17} />
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  const proof = useProof()
  return (
    <section className="v7-hero" aria-labelledby="v7-name">
      <div className="v7-hero__text">
        <p className="v7-kicker v7-in" style={{ ['--i' as string]: 0 }}>
          <span className="v7-led v7-led--ok" aria-hidden="true" /> UVIC CS · CLASS OF {person.grad} · {person.location.toUpperCase()}
        </p>
        <h1 id="v7-name" className="v7-name v7-in" style={{ ['--i' as string]: 1 }}>
          {person.name}
        </h1>
        <p className="v7-claim v7-in" style={{ ['--i' as string]: 2 }}>
          I build ML systems and study what happens inside models. The flight firmware I led for MarmotSat is in orbit.
        </p>
        <ol className="v7-proof" aria-label="Proof">
          {proof.map((p, i) => (
            <li key={p.key} className="v7-in" style={{ ['--i' as string]: 3 + i }}>
              <span className="v7-proof__k">
                <i className="v7-led v7-led--ok" aria-hidden="true" />
                {p.label}
              </span>
              <span className="v7-proof__v">{p.detail}</span>
            </li>
          ))}
        </ol>
        <Links className="v7-hero__links v7-in" mode="both" size={15} />
      </div>
      <div className="v7-hero__orbit">
        <Orbit />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ subsystems */

interface Pkt {
  sub: number
  i: number
  seq: number
  t: number
}

function Panel({ s, idx, pkt, wide }: { s: Sub; idx: number; pkt: Pkt | null; wide?: boolean }) {
  const ops = useOps()
  const open = ops.openSub === s.id
  const live = pkt && pkt.sub === idx ? pkt : null
  return (
    <article className="v7-panel" id={`sub-${s.id}`} data-open={open || undefined} data-wide={wide || undefined} aria-labelledby={`sub-${s.id}-h`}>
      <header className="v7-panel__head">
        <i className={`v7-led ${live ? 'v7-led--tx' : 'v7-led--ok'}`} aria-hidden="true" />
        <h3 id={`sub-${s.id}-h`} className="v7-panel__code">
          {s.code}
          <span className="v7-panel__name">
            {s.name} · {s.maps}
          </span>
        </h3>
        <span className="v7-panel__stat">NOMINAL</span>
      </header>
      <p className="v7-panel__sum">{s.summary}</p>
      <dl className="v7-ro">
        {s.readouts.map((r, i) => (
          <div key={r.m} className="v7-ro__cell" data-hot={live && live.i === i ? live.seq : undefined}>
            <dt>
              {r.m}
              {r.flag && <Flag note={r.flag} />}
            </dt>
            <dd>
              <span className="v7-ro__v">{r.v}</span>
              {r.u && <small> {r.u}</small>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="v7-panel__pkt" aria-hidden="true">
        {live ? (
          <span key={live.seq}>
            PKT {String(live.seq).padStart(5, '0')} · APID {String(idx + 1).padStart(2, '0')} · {s.readouts[live.i].m}={s.readouts[live.i].v}
            {s.readouts[live.i].u ? ` ${s.readouts[live.i].u}` : ''} · CRC OK
          </span>
        ) : (
          <span>LINK IDLE · {s.readouts.length} CHANNELS</span>
        )}
      </p>
      <button type="button" className="v7-panel__more" aria-expanded={open} aria-controls={`sub-${s.id}-x`} onClick={() => ops.setOpenSub(open ? null : s.id)}>
        <span>{open ? 'CLOSE' : 'INSPECT'}</span>
        <span className="v7-dim">/tlm {s.id}</span>
      </button>
      <div id={`sub-${s.id}-x`} className="v7-panel__x" hidden={!open}>
        {open && (
          <>
            <ul className="v7-items">
              {s.items.map((it) => (
                <li key={it.title}>
                  <p className="v7-items__t">
                    {it.title}
                    {it.flag && <Flag note={it.flag} />}
                  </p>
                  <p className="v7-items__m">{it.meta}</p>
                  {it.body.map((b) => (
                    <p key={b} className="v7-items__b">
                      {b}
                    </p>
                  ))}
                  {(it.to || it.href) && (
                    <p className="v7-items__a">
                      {it.to && (it.to !== '/beri' ? true : null) && (
                        <DLink to={it.to} label={it.to.slice(1)}>
                          Open write-up ↘
                        </DLink>
                      )}
                      {it.to === '/beri' && (
                        <Show when="beri">
                          <DLink to="/beri" label="beri">
                            Case study ↘
                          </DLink>
                        </Show>
                      )}
                      {it.href && (
                        <a href={it.href} target="_blank" rel="noopener">
                          {it.hrefLabel ?? 'Link'} ↗
                        </a>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {s.demo && (
              <div className="v7-panel__demo">
                <Demo kind={s.demo} compact />
              </div>
            )}
          </>
        )}
      </div>
    </article>
  )
}

function Subsystems() {
  const flags = useFlags()
  const community = useCommunity()
  const subs = useMemo(() => subsystems({ beri: flags.beri, community }), [flags.beri, community])
  const m = useMotionPrefs()
  const [pkt, setPkt] = useState<Pkt | null>(null)
  const ref = useRef<HTMLElement>(null)

  // Telemetry: one packet at a time, round-robin with a stride so neighbours don't fire together.
  // Only while the section is on screen, the tab is visible, and motion isn't reduced.
  useEffect(() => {
    if (m.reduced) {
      setPkt(null)
      return
    }
    let seen = false, id = 0, seq = 0, cur = 0
    const every = { subtle: 1600, default: 950, expressive: 520 }[m.level]
    const step = () => {
      if (!seen || document.hidden) return
      cur = (cur + 3) % subs.length
      const s = subs[cur]
      seq++
      setPkt({ sub: cur, i: (seq * 7 + cur) % s.readouts.length, seq, t: Date.now() })
      beep('tick')
    }
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting))
    io.observe(ref.current!)
    id = window.setInterval(step, every)
    return () => {
      io.disconnect()
      clearInterval(id)
    }
  }, [m.reduced, m.level, subs])

  const adcsIdx = subs.findIndex((s) => s.id === 'adcs')
  const before = subs.filter((s) => ['eps', 'obc', 'ttc'].includes(s.id))
  const after = subs.filter((s) => !['eps', 'obc', 'ttc', 'adcs'].includes(s.id))
  const adcs = subs[adcsIdx]

  return (
    <section id="sys" className="v7-sec" ref={ref} aria-labelledby="v7-sys-h">
      <SecHead n="01" id="v7-sys-h" title="Subsystems" note="Each subsystem is a part of the work. Readouts are real numbers; INSPECT opens the detail." />
      <div className="v7-grid" data-n={before.length}>
        {before.map((s) => (
          <Panel key={s.id} s={s} idx={subs.indexOf(s)} pkt={pkt} />
        ))}
      </div>
      <div className="v7-adcs" id="sub-adcs-live">
        <div className="v7-adcs__side">
          <Panel s={adcs} idx={adcsIdx} pkt={pkt} wide />
        </div>
        <div className="v7-adcs__demo">
          <p className="v7-lbl">
            <i className="v7-led v7-led--tx" aria-hidden="true" /> ADCS · LIVE · POINT THE MODEL
          </p>
          <Demo kind="steering" />
        </div>
      </div>
      <div className="v7-grid" data-n={after.length}>
        {after.map((s) => (
          <Panel key={s.id} s={s} idx={subs.indexOf(s)} pkt={pkt} />
        ))}
      </div>
    </section>
  )
}

function SecHead({ n, id, title, note }: { n: string; id: string; title: string; note?: string }) {
  return (
    <header className="v7-sechead">
      <h2 id={id} className="v7-h2">
        <span className="v7-h2__n">{n}</span>
        {title}
      </h2>
      {note && <p className="v7-sechead__note">{note}</p>}
    </header>
  )
}

/* ------------------------------------------------------------------ research queue */

function Queue() {
  return (
    <section id="data" className="v7-sec" aria-labelledby="v7-data-h">
      <SecHead n="02" id="v7-data-h" title="Downlink queue" note="Five research write-ups. Each has the question, the method, the result and what I'd run next." />
      <ol className="v7-queue">
        {research.map((r, i) => (
          <li key={r.slug}>
            <DLink to={`/research/${r.slug}`} label={`research/${r.slug}`} className="v7-queue__a">
              <span className="v7-queue__n">F{String(i + 1).padStart(2, '0')}</span>
              <span className="v7-queue__file">{r.slug}.md</span>
              <span className="v7-queue__t">{r.title}</span>
              <span className="v7-queue__m">
                {r.where} · {r.when}
              </span>
              <span className="v7-queue__go" aria-hidden="true">
                RX ↘
              </span>
            </DLink>
            {r.unverified && (
              <p className="v7-queue__flag">
                <Flag note={r.unverified[0]} />
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ------------------------------------------------------------------ event log */

const CH: Record<Milestone['kind'], string> = { research: 'SCI', industry: 'OPS', build: 'ENG', community: 'GND', competition: 'CMP' }

function EventLog() {
  const ms = useMilestones()
  const m = useMotionPrefs()
  const box = useRef<HTMLDivElement>(null)
  const sec = useRef<HTMLElement>(null)
  const [arm, setArm] = useState<'idle' | 'armed' | 'run'>('idle')
  const [paused, setPaused] = useState(false)

  // tail -f: when the log first scrolls into view, lines arrive one by one and the box follows the tail.
  useEffect(() => {
    if (m.reduced) return
    const r = sec.current!.getBoundingClientRect()
    if (r.top < innerHeight) return // already on screen at mount: don't hide anything
    setArm('armed')
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setArm('run')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -25% 0px' },
    )
    io.observe(sec.current!)
    return () => io.disconnect()
  }, [m.reduced])

  return (
    <section id="log" className="v7-sec" ref={sec} aria-labelledby="v7-log-h">
      <SecHead n="03" id="v7-log-h" title="Event log" note="The work over time, oldest first." />
      <div className="v7-log" data-arm={arm} data-paused={paused || undefined}>
        <div className="v7-log__bar">
          <span className="v7-lbl">
            <i className="v7-led v7-led--ok" aria-hidden="true" /> EVT STREAM · {ms.length} EVENTS
          </span>
          {arm === 'run' && (
            <button type="button" className="v7-chip" aria-pressed={paused} onClick={() => setPaused(!paused)}>
              {paused ? 'RESUME TAIL' : 'PAUSE'}
            </button>
          )}
        </div>
        <div
          className="v7-log__box"
          ref={box}
          tabIndex={0}
          role="region"
          aria-label="Event log"
          onAnimationStart={(e) => {
            if (!paused && (e.target as HTMLElement).tagName === 'LI' && box.current) box.current.scrollTop = box.current.scrollHeight
          }}
        >
          <ol className="v7-log__list">
            {ms.map((e, i) => (
              <li key={e.title + e.when} style={{ ['--i' as string]: i }} data-kind={e.kind}>
                <span className="v7-log__t">{e.when}</span>
                <span className="v7-log__ch">{CH[e.kind]}</span>
                <span className="v7-log__body">
                  <b>
                    {e.href ? (
                      e.href === '/beri' ? (
                        <DLink to="/beri" label="beri">
                          {e.title}
                        </DLink>
                      ) : (
                        <DLink to={e.href} label={e.href.slice(1)}>
                          {e.title}
                        </DLink>
                      )
                    ) : (
                      e.title
                    )}
                  </b>{' '}
                  {e.line}
                  {e.unverified && <Flag note={e.unverified} />}
                </span>
                {e.metric && <span className="v7-log__m">{e.metric}</span>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ brief + uplink */

function Brief() {
  return (
    <section className="v7-sec v7-brief" aria-labelledby="v7-brief-h">
      <SecHead n="00" id="v7-brief-h" title="Mission brief" />
      <div className="v7-brief__cols">
        <div className="v7-prose">
          <p>
            I'm finishing a CS degree at the University of Victoria in three years. This summer I was an SDE intern at Amazon Robotics, where I shipped an LLM
            planning assistant to production across 180+ fulfillment sites, and I have a return offer.
          </p>
          <p>
            My research looks for concepts as directions inside a model, then checks whether pushing along them does what the label says. Before that: billion-vector
            search on GPUs at the DEIA Lab, and the onboard computer for MarmotSat, a UVic CubeSat now in orbit.
          </p>
        </div>
        <dl className="v7-kv">
          <div>
            <dt>SCHOOL</dt>
            <dd>University of Victoria</dd>
          </div>
          <div>
            <dt>DEGREE</dt>
            <dd>B.S. Computer Science, accelerated</dd>
          </div>
          <div>
            <dt>GRAD</dt>
            <dd>{person.gradMonth}</dd>
          </div>
          <div>
            <dt>BASE</dt>
            <dd>{person.location}</dd>
          </div>
          <div>
            <dt>TOOLS</dt>
            <dd>Python, PyTorch, CUDA/cuVS, vLLM · C on STM32 · Swift, TypeScript · Nix, Kubernetes</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

function CopyEmail() {
  const [copied, setCopied] = useState(false)
  const m = useMotionPrefs()
  return (
    <button
      type="button"
      className="v7-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email)
          setCopied(true)
          beep('cmd')
          setTimeout(() => setCopied(false), 1600)
        } catch {
          location.href = links.email.href
        }
      }}
    >
      <span className="v7-copy__k">TX</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={copied ? 'y' : 'n'}
          className="v7-copy__v"
          initial={{ opacity: 0, y: 8 * m.k }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 * m.k }}
          transition={{ duration: m.dur(0.18), ease: [0.23, 1, 0.32, 1] }}
        >
          {copied ? 'COPIED · ACK' : person.email}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

function Uplink() {
  return (
    <section id="uplink" className="v7-sec v7-uplink" aria-labelledby="v7-up-h">
      <SecHead n="04" id="v7-up-h" title="Uplink" />
      <p className="v7-uplink__line">Research programs, labs and founders: email is fastest.</p>
      <CopyEmail />
      <Links className="v7-hero__links" mode="both" size={15} />
    </section>
  )
}

/* ------------------------------------------------------------------ pages */

function Home() {
  return (
    <>
      <Hero />
      <Brief />
      <Subsystems />
      <Queue />
      <EventLog />
      <Uplink />
    </>
  )
}

function DocFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="v7-doc">
      <p className="v7-doc__strip">
        <i className="v7-led v7-led--ok" aria-hidden="true" />
        <span className="v7-doc__label">DOWNLINK COMPLETE · {label}</span>
        <DLink to="/">← MCC</DLink>
      </p>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ root */

export default function V7({ page, base }: VariantProps) {
  const { path, navigate } = useRouter()
  const m = useMotionPrefs()
  const flags = useFlags()
  const community = useCommunity()
  const [dl, setDl] = useState<{ label: string; n: number } | null>(null)
  const [openSub, setOpenSub] = useState<string | null>(null)
  const [signal, setSignalState] = useState(false)
  const [conOpen, setConOpen] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const lineId = useRef(0)
  const mRef = useRef(m)
  mRef.current = m

  const setSignal = useCallback((on: boolean) => {
    setSignalState(on)
    if (on) signalOn()
    else signalOff()
  }, [])
  useEffect(() => () => signalOff(), [])

  const go = useCallback(
    (to: string, label?: string) => {
      const mm = mRef.current
      const n = Date.now()
      setDl({ label: label ?? (to.slice(1) || 'mcc'), n })
      beep('lock')
      const hold = mm.reduced ? 120 : 300 * (mm.level === 'expressive' ? 1.2 : mm.level === 'subtle' ? 0.8 : 1)
      setTimeout(() => navigate(`${base}${to}`), hold)
      setTimeout(() => setDl((d) => (d && d.n === n ? null : d)), hold + (mm.reduced ? 200 : 620))
    },
    [base, navigate],
  )

  const focusSub = useCallback((id: string) => {
    setOpenSub(id)
    requestAnimationFrame(() => {
      const el = document.getElementById(`sub-${id}`)
      el?.scrollIntoView({ behavior: mRef.current.reduced ? 'auto' : 'smooth', block: 'start' })
      el?.querySelector<HTMLButtonElement>('.v7-panel__more')?.focus({ preventScroll: true })
    })
  }, [])

  const setCon = useCallback((o: boolean) => setConOpen(o), [])

  const subs = useMemo(() => subsystems({ beri: flags.beri, community }), [flags.beri, community])

  const suggestions = useMemo<Suggestion[]>(() => {
    const s: Suggestion[] = [
      { cmd: '/tlm eps', hint: 'Power · Amazon Robotics, RBC Borealis' },
      { cmd: '/tlm obc', hint: 'Onboard computer · MarmotSat firmware' },
      { cmd: '/tlm ttc', hint: 'Data link · billion-vector retrieval' },
      { cmd: '/tlm adcs', hint: 'Attitude control · steering demo' },
      { cmd: '/tlm payload', hint: 'Science · loss masking, ES-LoRA, ocean' },
      { cmd: '/open research steering', hint: 'Write-up: activation steering' },
      { cmd: '/open research lossmask', hint: 'Write-up: loss masking and distress' },
      { cmd: '/open research es-lora', hint: 'Write-up: ES-LoRA' },
      { cmd: '/open research retrieval', hint: 'Write-up: billion-vector search' },
      { cmd: '/open research ocean', hint: 'Write-up: ocean sensing' },
      { cmd: '/downlink resume', hint: 'Open the resume (PDF)' },
      { cmd: '/downlink email', hint: `Copy ${person.email}` },
      { cmd: '/pass', hint: 'Next MarmotSat pass over Victoria' },
      { cmd: '/warp 600', hint: 'Speed up the orbit view' },
      { cmd: '/warp live', hint: 'Real time' },
      { cmd: '/signal on', hint: 'Radio noise and beeps (audio)' },
      { cmd: '/log', hint: 'Jump to the event log' },
      { cmd: '/tlm heritage', hint: 'Earlier work' },
      { cmd: 'help', hint: 'All commands' },
      { cmd: 'clear', hint: 'Clear the console' },
    ]
    if (flags.beri) s.splice(5, 0, { cmd: '/tlm rideshare', hint: 'Beri · co-founded iOS app' }, { cmd: '/open beri', hint: 'Beri case study' })
    return s
  }, [flags.beri])

  const exec = useCallback(
    (raw: string) => {
      const out: Line[] = []
      const push = (kind: Line['kind'], text: string) => out.push({ id: ++lineId.current, kind, text })
      push('in', raw)
      const parts = raw.trim().toLowerCase().replace(/^\//, '').split(/\s+/)
      const [cmd, ...args] = parts
      let ok = true
      const scrollTo = (id: string) =>
        document.getElementById(id)?.scrollIntoView({ behavior: mRef.current.reduced ? 'auto' : 'smooth', block: 'start' })
      const home = page.kind === 'home'
      if (cmd === 'help' || cmd === '?') {
        push('out', 'tlm <subsystem|org> · open research <topic> · open beri · downlink resume|email|github|linkedin|x')
        push('out', 'pass · warp <n|live> · signal on|off · log · uplink · clear')
      } else if (cmd === 'clear') {
        setLines([])
        return
      } else if (cmd === 'tlm' || cmd === 'inspect') {
        const key = (args.join('') || '').replace(/[^a-z0-9-]/g, '')
        const sub = subs.find((s) => s.id === key || s.aliases.includes(key) || s.code.toLowerCase() === key)
        if (!sub) {
          ok = false
          push('nak', `no subsystem "${args.join(' ')}". Try eps, obc, ttc, adcs, payload, heritage, ground.`)
        } else {
          push('ack', `${sub.code} · ${sub.name} (${sub.maps}) · ${sub.readouts.map((r) => `${r.m}=${r.v}`).slice(0, 3).join(' ')}`)
          if (home) focusSub(sub.id)
          else {
            go('/', 'mcc')
            setTimeout(() => focusSub(sub.id), 700)
          }
        }
      } else if (cmd === 'open' || cmd === 'rx') {
        const rest = args[0] === 'research' ? args.slice(1) : args
        const key = rest.join('-')
        if (key === 'beri') {
          if (flags.beri) {
            push('ack', 'downlinking /beri')
            go('/beri', 'beri')
          } else {
            ok = false
            push('nak', 'no such file.')
          }
        } else if (researchAliases[key] || researchAliases[rest[0]]) {
          const slug = researchAliases[key] || researchAliases[rest[0]]
          push('ack', `downlinking research/${slug}`)
          go(`/research/${slug}`, `research/${slug}`)
        } else {
          ok = false
          push('nak', `no file "${rest.join(' ')}". Try steering, lossmask, es-lora, retrieval, ocean.`)
        }
      } else if (cmd === 'downlink' || cmd === 'dl') {
        const k = args[0]
        if (k === 'resume' || k === 'cv') {
          push('ack', 'opening resume.pdf')
          window.open(links.resume.href, '_blank', 'noopener')
        } else if (k === 'email' || k === 'mail') {
          navigator.clipboard?.writeText(person.email).then(
            () => {},
            () => (location.href = links.email.href),
          )
          push('ack', `copied ${person.email}`)
        } else if (k === 'github' || k === 'linkedin' || k === 'x') {
          push('ack', `opening ${links[k].href}`)
          window.open(links[k].href, '_blank', 'noopener')
        } else {
          ok = false
          push('nak', 'downlink resume | email | github | linkedin | x')
        }
      } else if (cmd === 'pass') {
        const now = getClock().now(Date.now())
        const p = nextPass(now)
        const el = elevation(state(now).ecef)
        if (el > 0) push('ack', `MarmotSat is over Victoria now · elevation ${el.toFixed(0)}° (approximate)`)
        else if (p) push('ack', `next pass over Victoria in ${fmtDur(p.aos - now)} (sim time) · max elevation ${p.maxEl.toFixed(0)}° · approximate`)
        else push('ack', 'no pass over Victoria in the next 36 h')
      } else if (cmd === 'warp') {
        const a = args[0]
        const v = a === 'live' || a === '1' ? 'live' : Number(a)
        if (m.reduced) {
          ok = false
          push('nak', 'reduced motion is on: the orbit is frozen.')
        } else if (v === 'live' || (v > 0 && v <= 3600)) {
          dispatchEvent(new CustomEvent('v7:warp', { detail: v }))
          push('ack', v === 'live' ? 'real time' : `sim ×${v}`)
          if (home) scrollTo('main')
        } else {
          ok = false
          push('nak', 'warp 1..3600 or live')
        }
      } else if (cmd === 'signal' || cmd === 'audio') {
        const on = args[0] ? args[0] === 'on' : !signal
        setSignal(on)
        push('ack', `signal ${on ? 'on' : 'off'}`)
      } else if (['log', 'uplink', 'sys', 'data', 'contact', 'research'].includes(cmd)) {
        const id = cmd === 'contact' ? 'uplink' : cmd === 'research' ? 'data' : cmd
        push('ack', `→ ${id}`)
        if (home) scrollTo(id)
        else go(`/#${id}`, 'mcc')
      } else {
        ok = false
        push('nak', `unknown command "${raw}". Type help.`)
      }
      beep(ok ? 'cmd' : 'err')
      setLines((l) => [...l, ...out].slice(-24))
      // commands that move the view close the console so the result is visible
      if (ok && ['tlm', 'inspect', 'open', 'rx', 'log', 'uplink', 'sys', 'data', 'contact', 'research', 'warp'].includes(cmd)) {
        setConOpen(false)
        ;(document.activeElement as HTMLElement | null)?.blur?.()
      }
    },
    [subs, flags.beri, page.kind, focusSub, go, m.reduced, signal, setSignal],
  )

  const ops = useMemo<Ops>(() => ({ base, go, focusSub, openSub, setOpenSub, signal, setSignal }), [base, go, focusSub, openSub, signal, setSignal])

  const title =
    page.kind === 'research' ? `RESEARCH/${page.slug.toUpperCase()}` : page.kind === 'beri' ? 'BERI' : page.kind === 'notfound' ? 'LOS' : ''

  return (
    <OpsCtx.Provider value={ops}>
      <div className="v7">
        <a href="#main" className="v7-skip">
          Skip to content
        </a>
        <TopBar
          home={page.kind === 'home'}
          conOpen={conOpen}
          setCon={setCon}
          con={<Console exec={exec} suggestions={suggestions} lines={lines} open={conOpen} setOpen={setCon} />}
        />
        <main id="main" key={path}>
          {page.kind === 'home' && <Home />}
          {page.kind === 'research' && (
            <DocFrame label={title}>
              <ResearchArticle slug={page.slug} base={base} />
            </DocFrame>
          )}
          {page.kind === 'beri' && (
            <DocFrame label={title}>
              <BeriCaseStudy base={base} />
            </DocFrame>
          )}
          {page.kind === 'notfound' && (
            <section className="v7-lost">
              <p className="v7-lbl">
                <i className="v7-led v7-led--warn" aria-hidden="true" /> LOSS OF SIGNAL
              </p>
              <h1 className="v7-name">No telemetry at this address.</h1>
              <p className="v7-claim">
                <DLink to="/">Return to mission control ↘</DLink>
              </p>
            </section>
          )}
        </main>
        <footer className="v7-foot">
          <span>© 2026 {person.name}</span>
          <span className="v7-dim">
            Orbit: MarmotSat, NORAD 69912, elements from SatNOGS DB (Space-Track TLE). Earth: Natural Earth. Audio is synthesised in your browser.
          </span>
        </footer>
        <Downlink run={dl} />
      </div>
    </OpsCtx.Provider>
  )
}
