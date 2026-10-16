// X1 · Pass. A ground station on a hilltop above the Strait, under the real sky over Victoria. The first paint is a plain
// proof card (SSR); the 3D world loads behind it after first input or idle, and the card docks to a corner. Every
// station is also an HTML button, so nothing requires playing.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, FastForward, RotateCcw, X, Box } from 'lucide-react'
import type { VariantProps } from '../../routes'
import { Link } from '../../lib/router'
import { proofs, thesis, context } from '../../content/curated'
import { person } from '../../content/site'
import { Logo } from '../../shared/Mark'
import { LinkIcon } from '../../shared/Links'
import { links } from '../../content/site'
import { PosterArt, POSTER_PINS } from './PosterArt'
import { STATIONS, DishSheet, CabinSheet, DialSheet, LogbookSheet, BuoySheet, BoardSheet } from './Sheets'
import { Steer, REST_INDEX, warmthFor, type Concept, type SteerData } from './Steer'
import { Article, Beri, NotFound } from './Article'
import type { StationId, WorldApi, FrameInfo } from './world.lazy'
import type { Sky, SkyStatus } from './sky'
import './x1.css'

type WorldState = 'wait' | 'loading' | 'ready' | 'poster' | 'nogl' | 'error'
const PROOF_STATION: Record<string, StationId> = { amazon: 'cabin', cfar: 'dish', apart: 'logbook' }
const ORDER = STATIONS.map((s) => s.id)

// formatting (kept here so the sky chunk is not needed for SSR)
const pad = (n: number) => String(n).padStart(2, '0')
function dur(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60)
  return h ? `${h} h ${pad(m)} min` : m ? `${m} min ${pad(s % 60)} s` : `${s % 60} s`
}
let vicFmt: Intl.DateTimeFormat | null = null
function vic(ms: number) {
  vicFmt ??= new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short', timeZoneName: 'short' })
  const p = Object.fromEntries(vicFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return `${p.weekday} ${p.hour === '24' ? '00' : p.hour}:${p.minute} ${p.timeZoneName}`
}
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const compass = (az: number) => COMPASS[Math.round(az / 45) % 8]

function lowTier() {
  const n = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  return !!n.connection?.saveData || (n.deviceMemory !== undefined && n.deviceMemory <= 2) || new URLSearchParams(location.search).has('poster')
}
function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function Variant({ page, base }: VariantProps) {
  if (page.kind === 'research') return <Article slug={page.slug} base={base} />
  if (page.kind === 'beri') return <Beri base={base} />
  if (page.kind === 'notfound') return <NotFound base={base} />
  return <Home base={base} />
}

function Home({ base }: { base: string }) {
  const inLab = base.startsWith('/lab')
  const plain = inLab ? '/lab/main' : '/'
  const [open, setOpen] = useState<StationId | null>(null)
  const [docked, setDocked] = useState(false)
  const [folded, setFolded] = useState(false)
  const [world, setWorld] = useState<WorldState>('wait')
  const [reduced, setReduced] = useState(false)
  const [hover, setHover] = useState<StationId | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [sky, setSky] = useState<SkyStatus | null>(null)
  const [steer, setSteer] = useState<SteerData | null>(null)
  const [concept, setConcept] = useState<Concept>('joy')
  const [qi, setQi] = useState(0)
  const [ai, setAi] = useState(REST_INDEX)

  const canvas = useRef<HTMLCanvasElement>(null)
  const pins = useRef<Partial<Record<StationId, HTMLButtonElement | null>>>({})
  const satTag = useRef<HTMLDivElement>(null)
  const riseTag = useRef<HTMLDivElement>(null)
  const api = useRef<WorldApi | null>(null)
  const skyObj = useRef<Sky | null>(null)
  const lastTrigger = useRef<HTMLElement | null>(null)
  const booting = useRef(false)
  const live = useRef({ open, steer, concept, qi, ai })
  live.current = { open, steer, concept, qi, ai }

  // ---------- sky (real Sun + MarmotSat), loaded after hydration ----------
  const skyP = useRef<Promise<Sky> | null>(null)
  const ensureSky = useCallback(() => {
    skyP.current ??= import('./sky')
      .then((m) => m.createSky())
      .then((s) => {
        skyObj.current = s
        s.on(() => setSky(s.status()))
        setSky(s.status())
        s.load()
        return s
      })
    return skyP.current
  }, [])

  const ensureSteer = useCallback(() => {
    if (live.current.steer) return
    import('../../data/steering.json').then((m) => setSteer((m.default ?? m) as SteerData))
  }, [])

  // ---------- world boot ----------
  const bootWorld = useCallback(async () => {
    if (booting.current || !canvas.current) return
    booting.current = true
    setWorld('loading')
    try {
      const [s, { createWorld }] = await Promise.all([ensureSky(), import('./world.lazy')])
      const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 820
      const w = await createWorld({
        canvas: canvas.current,
        sky: s,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        mobile,
        onPick: (id) => openStation(id, null),
        onHover: setHover,
        onDial: (d) => {
          const { ai } = live.current
          setAi(Math.max(0, Math.min(8, ai + d)))
          ensureSteer()
        },
        onFrame: placeOverlays,
        onLost: () => setWorld('error'),
      })
      api.current = w
      setWorld('ready')
      setDocked(true)
      ensureSteer()
      // if a station was opened before the world arrived, fly to it
      if (live.current.open) w.focus(live.current.open)
    } catch (e) {
      console.warn('x1: world failed', e)
      setWorld('error')
      setDocked(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureSky, ensureSteer])

  useEffect(() => {
    setHydrated(true)
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onMq = () => {
      setReduced(mq.matches)
      api.current?.setReduced(mq.matches)
    }
    mq.addEventListener('change', onMq)

    // open a station from the URL hash (shareable, and the no-JS links)
    const h = location.hash.slice(1) as StationId
    if (ORDER.includes(h)) setOpen(h)

    let idle = 0,
      timer = 0
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    const tier = !hasWebGL() ? 'nogl' : lowTier() ? 'poster' : null
    if (tier) {
      setWorld(tier)
      timer = window.setTimeout(() => setDocked(true), 1400)
      ensureSky()
    } else {
      // first input, or ~2 s of idle after load, whichever comes first
      const go = () => {
        cleanup()
        bootWorld()
      }
      const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
      const cleanup = () => evs.forEach((e) => removeEventListener(e, go))
      evs.forEach((e) => addEventListener(e, go, { passive: true, once: true }))
      const later = () => {
        timer = window.setTimeout(() => (ric ? (idle = ric(go, { timeout: 1500 })) : go()), 1600)
      }
      if (document.readyState === 'complete') later()
      else addEventListener('load', later, { once: true })
      // the sky is light; start it right away at idle so the pass line shows early
      ric ? ric(() => ensureSky(), { timeout: 1200 }) : ensureSky()
    }
    return () => {
      mq.removeEventListener('change', onMq)
      clearTimeout(timer)
      if (idle) (window as Window & { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback?.(idle)
      api.current?.dispose()
      api.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // a 1 s ticker for the pass clock
  useEffect(() => {
    if (!sky) return
    const t = setInterval(() => skyObj.current && setSky(skyObj.current.status()), 1000)
    return () => clearInterval(t)
  }, [!!sky])

  // ---------- overlays the world positions every frame (no React renders) ----------
  const placeOverlays = useCallback((f: FrameInfo) => {
    for (const s of STATIONS) {
      const el = pins.current[s.id]
      if (!el) continue
      const p = f.pins[s.id]
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`
      if (!p.on) el.setAttribute('data-off', '')
      else el.removeAttribute('data-off')
    }
    const st = satTag.current
    if (st) {
      if (f.sat && f.sat.on) {
        st.style.transform = `translate3d(${f.sat.x.toFixed(1)}px, ${f.sat.y.toFixed(1)}px, 0)`
        st.removeAttribute('data-off')
      } else st.setAttribute('data-off', '')
    }
    const rt = riseTag.current
    if (rt) {
      if (f.rise && f.rise.on) {
        rt.style.transform = `translate3d(${f.rise.x.toFixed(1)}px, ${f.rise.y.toFixed(1)}px, 0)`
        rt.removeAttribute('data-off')
      } else rt.setAttribute('data-off', '')
    }
  }, [])

  // ---------- stations ----------
  // what the DOM covers on each side, so the camera frames stations in the open part of the view
  const measure = useCallback(() => {
    const a = api.current
    if (!a) return
    const W = innerWidth,
      H = innerHeight
    const o = live.current.open
    const rect = (q: string) => document.querySelector(q)?.getBoundingClientRect()
    const sheet = o ? document.getElementById(o)?.getBoundingClientRect() : undefined
    let l = 0,
      r = 0,
      t = 0,
      b = 0
    if (W >= 900) {
      const c = rect('.x1-col')
      l = c ? c.right + 8 : 0
      if (sheet) r = W - sheet.left + 8
    } else if (sheet) b = H - sheet.top
    else {
      t = rect('.x1-card')?.bottom ?? 0
      const rl = rect('.x1-rail')
      b = rl ? H - rl.top : 0
    }
    a.setInset(l, r, t, b)
  }, [])
  const openStation = useCallback((id: StationId | null, trigger: HTMLElement | null) => {
    if (trigger) lastTrigger.current = trigger
    setOpen(id)
    api.current?.focus(id)
    if (id === 'dial') ensureSteer()
    const url = location.pathname + location.search + (id ? `#${id}` : '')
    history.replaceState(history.state, '', url)
    if (id) requestAnimationFrame(() => document.getElementById(`x1-h-${id}`)?.focus({ preventScroll: true }))
    else lastTrigger.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keys: 1–6 open a station, Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (e.key === 'Escape' && live.current.open && !t?.closest('select')) {
        e.preventDefault()
        openStation(null, null)
        return
      }
      if (t?.closest('input, textarea, select, [role="slider"]')) return
      const s = STATIONS.find((x) => x.key === e.key)
      if (s) {
        e.preventDefault()
        openStation(s.id, document.querySelector(`[data-rail="${s.id}"]`))
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [openStation])

  // the dial drives the world: knob angle and cabin warmth from the real read-back
  useEffect(() => {
    api.current?.setDial(ai, warmthFor(steer, concept, qi, ai))
  }, [ai, steer, concept, qi, world])

  // keep the camera inset in step with the layout (sheet, docking, folding, viewport)
  useEffect(() => {
    measure()
    const r = requestAnimationFrame(measure)
    const t = setTimeout(measure, 700)
    return () => {
      cancelAnimationFrame(r)
      clearTimeout(t)
    }
  }, [open, docked, folded, world, measure])
  useEffect(() => {
    addEventListener('resize', measure)
    return () => removeEventListener('resize', measure)
  }, [measure])

  const idx = open ? ORDER.indexOf(open) : -1
  const step = (d: number) => openStation(ORDER[(idx + d + ORDER.length) % ORDER.length], null)

  // ---------- the live pass line ----------
  const s = sky
  const passLine = (() => {
    if (!s) return { text: 'Computing MarmotSat’s next pass over Victoria…', act: null as null | 'warp' | 'live', short: undefined as string | undefined }
    const n = s.next
    if (s.mode === 'warp') return { text: n ? `Speeding up the sky to the next pass, ${vic(n.aos)}.` : 'Speeding up the sky…', short: 'Speeding up the sky…', act: null }
    if (s.up && s.sat) {
      const where = `${Math.round(s.sat.el)}° up in the ${compass(s.sat.az)}`
      const t = s.mode === 'live' ? `MarmotSat is above Victoria right now, ${where}. The dish is tracking it.` : `MarmotSat is overhead, ${where}, played at ×30. The dish is tracking it.`
      return { text: t, short: `MarmotSat is up: ${where}.`, act: s.mode === 'live' ? null : ('live' as const) }
    }
    if (s.mode === 'after' || s.mode === 'pass') return { text: `Sky time ${vic(s.sim)}. That was a real pass, computed from the TLE.`, short: `Sky time ${vic(s.sim)}.`, act: 'live' as const }
    if (!n) return { text: 'No pass over Victoria in the next 48 hours.', short: undefined, act: null }
    return {
      text: `MarmotSat, the satellite I wrote firmware for, rises over Victoria in ${dur(n.aos - s.sim)} (${vic(n.aos)}, up to ${Math.round(n.maxEl)}°).`,
      short: `MarmotSat, which runs my firmware, rises over Victoria in ${dur(n.aos - s.sim)}.`,
      act: 'warp' as const,
    }
  })()
  const doWarp = () => {
    const k = skyObj.current
    if (!k) return
    k.warp(reduced)
    api.current?.kick()
    api.current?.followSat(!live.current.open)
  }
  const doLive = () => {
    skyObj.current?.live()
    api.current?.followSat(false)
    api.current?.kick()
  }

  const showPins = world === 'ready' || world === 'poster' || world === 'nogl' || world === 'error'
  const posterPins = world !== 'ready'
  const passBox = (
    <div className="x1-pass" data-mode={s?.mode ?? 'wait'} aria-live="polite">
      <span className="x1-pass__dot" data-up={s?.up || undefined} aria-hidden="true" />
      <p>
        <span className="x1-pass__long">{passLine.text}</span>
        <span className="x1-pass__short">{passLine.short ?? passLine.text}</span>
      </p>
      {passLine.act === 'warp' && (
        <button type="button" className="x1-chip" onClick={doWarp}>
          <FastForward size={15} aria-hidden="true" />
          <span>Warp<span className="x1-pass__long"> to next pass</span></span>
        </button>
      )}
      {passLine.act === 'live' && (
        <button type="button" className="x1-chip" onClick={doLive}>
          <RotateCcw size={15} aria-hidden="true" />
          <span>Back to now</span>
        </button>
      )}
    </div>
  )

  const steerUI = <Steer data={steer} concept={concept} qi={qi} index={ai} setConcept={setConcept} setQi={setQi} setIndex={setAi} />
  const liveDish = (
    <div className="x1-live">
      <p className="x1-live__k">Live over Victoria</p>
      {passBox}
      <p className="x1-note">
        Real: MarmotSat’s position from its public TLE ({s?.source === 'celestrak' ? 'fetched from CelesTrak just now' : s?.source === 'session' ? 'fetched from CelesTrak earlier' : 'build-time snapshot'}
        ), propagated with SGP4 in your browser. The Sun’s position is real too; the stars are decorative.
      </p>
    </div>
  )

  return (
    <div
      className="x1 x1-home"
      data-world={world}
      data-docked={docked || undefined}
      data-folded={folded || undefined}
      data-open={open ?? undefined}
      data-lab={inLab || undefined}
      data-js={hydrated || undefined}
      data-reduced={reduced || undefined}
    >
      <a className="x1-skip" href="#x1-card">
        Skip to content
      </a>

      <div className="x1-stage">
        <div className="x1-poster">
          <PosterArt />
          {posterPins && showPins && (
            <div className="x1-poster__pins">
              {STATIONS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className="x1-pin x1-pin--static"
                  style={{ left: `${POSTER_PINS[st.id][0]}%`, top: `${POSTER_PINS[st.id][1]}%` }}
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={(e) => openStation(st.id, e.currentTarget)}
                >
                  <span className="x1-pin__dot" />
                  <span className="x1-pin__label">{st.object}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <canvas ref={canvas} className="x1-canvas" aria-hidden="true" />
        {world === 'ready' && (
          <div className="x1-overlay" aria-hidden="true">
            {STATIONS.map((st) => (
              <button
                key={st.id}
                ref={(el) => (pins.current[st.id] = el)}
                type="button"
                className="x1-pin"
                data-hover={hover === st.id || undefined}
                data-active={open === st.id || undefined}
                tabIndex={-1}
                onClick={(e) => openStation(st.id, e.currentTarget)}
              >
                <span className="x1-pin__dot" />
                <span className="x1-pin__label">{st.object}</span>
              </button>
            ))}
            <div ref={satTag} className="x1-tag-sky x1-tag-sky--sat" data-off="">
              <span>MarmotSat{s?.sat ? ` · ${Math.round(s.sat.el)}°` : ''}</span>
            </div>
            <div ref={riseTag} className="x1-tag-sky" data-off="">
              <span>{s?.next ? `Next pass rises here · ${vic(s.next.aos).split(' ').slice(1).join(' ')}` : ''}</span>
            </div>
          </div>
        )}
        {(world === 'poster' || world === 'nogl' || world === 'error') && (
          <div className="x1-fallback">
            {world === 'poster' ? (
              <button type="button" className="x1-chip" onClick={bootWorld}>
                <Box size={15} aria-hidden="true" />
                <span>Load 3D</span>
              </button>
            ) : (
              <p>
                {world === 'nogl' ? 'This view needs WebGL, which isn’t available here.' : 'The 3D view stopped.'} The same content is in the{' '}
                <Link to={plain}>plain version</Link>, and every station below still opens.
              </p>
            )}
          </div>
        )}
      </div>

      <main id="x1-main" className="x1-ui">
        <div className="x1-col">
        <section id="x1-card" className="x1-card" aria-label="About Tanuj" tabIndex={-1}>
          <div className="x1-card__top">
            <h1 className="x1-card__name">{person.name}</h1>
            <Link className="x1-plain" to={plain}>
              Plain version
            </Link>
            <button type="button" className="x1-fold" aria-expanded={!folded} aria-controls="x1-card-body" onClick={() => setFolded((f) => !f)}>
              <ChevronDown size={18} aria-hidden="true" />
              <span className="x1-vh">{folded ? 'Show details' : 'Hide details'}</span>
            </button>
          </div>
          <div id="x1-card-body" className="x1-card__body">
            <p className="x1-card__thesis">{thesis}</p>
            <p className="x1-card__ctx">{context}</p>
            <ul className="x1-proofs">
              {proofs.map((p) => (
                <li key={p.mark}>
                  <a
                    href={`#${PROOF_STATION[p.mark]}`}
                    onClick={(e) => {
                      e.preventDefault()
                      openStation(PROOF_STATION[p.mark], e.currentTarget)
                    }}
                  >
                    <Logo m={p.mark} w={26} h={26} />
                    <span>
                      <b>{p.org}</b> {p.line}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="x1-card__acts">
            <a className="x1-btn x1-btn--primary" href={links.resume.href} target="_blank" rel="noopener">
              <LinkIcon k="resume" size={16} />
              <span>Resume (PDF)</span>
            </a>
            <a className="x1-btn x1-btn--icon" href={links.email.href} aria-label={`Email ${person.email}`}>
              <LinkIcon k="email" size={17} />
            </a>
            <a className="x1-btn x1-btn--icon" href={links.linkedin.href} target="_blank" rel="noopener" aria-label="LinkedIn">
              <LinkIcon k="linkedin" size={17} />
            </a>
            <a className="x1-btn x1-btn--icon" href={links.github.href} target="_blank" rel="noopener" aria-label="GitHub">
              <LinkIcon k="github" size={17} />
            </a>
          </div>
        </section>

        <nav className="x1-rail" aria-label="Stations">
          {STATIONS.map((st) => (
            <a
              key={st.id}
              href={`#${st.id}`}
              data-rail={st.id}
              aria-current={open === st.id ? 'true' : undefined}
              data-hover={hover === st.id || undefined}
              onClick={(e) => {
                e.preventDefault()
                openStation(open === st.id ? null : st.id, e.currentTarget)
              }}
              onPointerEnter={() => api.current && setHover(st.id)}
              onPointerLeave={() => setHover(null)}
            >
              <kbd aria-hidden="true">{st.key}</kbd>
              <span>
                <small>{st.object}</small>
                {st.label}
              </span>
            </a>
          ))}
        </nav>
        </div>

        <div className="x1-passwrap">{passBox}</div>

        <div className="x1-sheets">
          {STATIONS.map((st) => (
            <section key={st.id} id={st.id} className="x1-sheet" data-open={open === st.id || undefined} aria-labelledby={`x1-h-${st.id}`}>
              <div className="x1-sheet__bar">
                <span className="x1-sheet__where">
                  <kbd aria-hidden="true">{st.key}</kbd> {st.object}
                </span>
                <span className="x1-sheet__nav">
                  <button type="button" className="x1-icon" aria-label="Previous station" onClick={() => step(-1)}>
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                  <button type="button" className="x1-icon" aria-label="Next station" onClick={() => step(1)}>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                  <a
                    className="x1-icon"
                    href="#x1-card"
                    aria-label="Close"
                    onClick={(e) => {
                      e.preventDefault()
                      openStation(null, null)
                    }}
                  >
                    <X size={18} aria-hidden="true" />
                  </a>
                </span>
              </div>
              <div className="x1-sheet__scroll">
                {st.id === 'dish' && <DishSheet live={liveDish} />}
                {st.id === 'cabin' && <CabinSheet />}
                {st.id === 'dial' && <DialSheet base={base} steer={steerUI} />}
                {st.id === 'logbook' && <LogbookSheet base={base} />}
                {st.id === 'buoy' && <BuoySheet base={base} />}
                {st.id === 'board' && <BoardSheet base={base} />}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
