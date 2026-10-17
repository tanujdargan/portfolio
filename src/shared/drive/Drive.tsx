// W4/W5 · Drive home. First paint (SSR) is a still of the drive with the identity card, the six stops and the resume
// links, so a recruiter has everything without driving. The live world (world.lazy.ts) loads after idle or first input
// and fades in over the still from the same camera. The car follows the road: scroll, trackpad, W/↑ and S/↓, the
// scrubber or the pedals move it; a stop in the list drives there and opens its sheet on arrival.
import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Mail, Linkedin, Github, ChevronDown, Play } from 'lucide-react'
import { thesis, context, proofs, selected } from '../../content/curated'
import { links, person } from '../../content/site'
import { Logo } from '../Mark'
import { useMotionPrefs } from '../../lib/motion'
import { STATIONS, STATION_IDS, type StationId } from './stations'
import { Sheets, type SheetCtx } from './Sheets'
import { REST, type Concept, type SteerData } from './Steer'
import type { PassState } from './pass'
import type { View, WorldApi, Pin, DriveState } from './world.lazy'

type Mode = 'poster' | 'loading' | 'world' | 'still' | 'nogl' | 'error'
const PROOF_STATION: Record<string, StationId> = { amazon: 'dock', cfar: 'pad', apart: 'log' }
const blurb: Record<StationId, string> = {
  dock: selected.find((s) => s.id === 'amazon')!.result,
  pad: selected.find((s) => s.id === 'orbit')!.result,
  log: selected.find((s) => s.id === 'lossmask')!.result,
  model: selected.find((s) => s.id === 'steering')!.result,
  pier: selected.find((s) => s.id === 'ocean')!.result,
  board: 'Roles, education, links and the resume',
}
// Where each stop sits along the road, as a fraction of its length (for the scrubber ticks before the world loads).
const TICK: Record<StationId, number> = { dock: 0.068, pad: 0.282, log: 0.38, model: 0.473, pier: 0.771, board: 0.998 }
const ALT: Record<View, string> = {
  fp: 'From the driver’s seat of a red 911-style coupé at golden hour: five round dials, the steering wheel, a freeway between glass towers and mountains beyond.',
  tp: 'A red 911-style coupé from behind on a city freeway at golden hour, between glass towers, with a cable-stayed bridge and mountains ahead.',
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
function lowTier() {
  const n = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  return !!n.connection?.saveData || (n.deviceMemory !== undefined && n.deviceMemory <= 2)
}

export function Drive({ base, view }: { base: string; view: View }) {
  const { reduced } = useMotionPrefs()
  const [mode, setMode] = useState<Mode>('poster')
  const [js, setJs] = useState(false)
  const [progress, setProgress] = useState(0)
  const [st, setSt] = useState<DriveState>({ s: 0, v: 0, frac: 0, near: null, moving: false })
  const [open, setOpen] = useState<StationId | null>(null)
  const [still, setStill] = useState<StationId | null>(null)
  const [about, setAbout] = useState(true)
  const [touch, setTouch] = useState(false)
  const [fade, setFade] = useState(false)
  const [steerData, setSteerData] = useState<SteerData | null>(null)
  const [concept, setConcept] = useState<Concept>('joy')
  const [qi, setQi] = useState(0)
  const [ai, setAi] = useState(REST)
  const [pass, setPass] = useState<PassState | null>(null)

  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const scrub = useRef<HTMLInputElement>(null)
  const scrubbing = useRef(false)
  const pins = useRef<Partial<Record<StationId, HTMLAnchorElement | null>>>({})
  const api = useRef<WorldApi | null>(null)
  const booting = useRef(false)
  const trigger = useRef<HTMLElement | null>(null)
  const pending = useRef<StationId | null>(null)
  const live = useRef({ open, near: st.near })
  live.current = { open, near: st.near }
  const lab = base.startsWith('/lab')
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null
  const posterMode = q?.get('driveposter') ?? (q?.get('still') !== null && q?.get('still') !== undefined ? 'still' : null)

  // ---------------------------------------------------------------- data loaders
  const ensureSteer = useCallback(() => {
    if (steerData) return
    import('../../data/steering.json').then((m) => setSteerData((m.default ?? m) as unknown as SteerData))
  }, [steerData])
  const passStarted = useRef(false)
  const ensurePass = useCallback(() => {
    if (passStarted.current) return
    passStarted.current = true
    import('./pass').then((m) => m.startPass(setPass))
  }, [])

  // ---------------------------------------------------------------- sheets
  const openSheet = useCallback(
    (id: StationId, from?: HTMLElement | null) => {
      if (from !== undefined) trigger.current = from ?? (document.activeElement as HTMLElement | null)
      setOpen(id)
      setAbout(false)
      if (id === 'pad') ensurePass()
      if (id === 'model') ensureSteer()
      history.replaceState(null, '', `#${id}`)
      requestAnimationFrame(() => document.getElementById(`${id}-h`)?.focus({ preventScroll: true }))
    },
    [ensurePass, ensureSteer],
  )
  const close = useCallback(() => {
    setOpen(null)
    history.replaceState(null, '', location.pathname + location.search)
    const t = trigger.current
    if (t && document.contains(t)) t.focus({ preventScroll: true })
  }, [])

  // ---------------------------------------------------------------- world boot
  const onPins = useCallback((p: Record<StationId, Pin>) => {
    for (const id of STATION_IDS) {
      const el = pins.current[id]
      if (!el) continue
      el.style.transform = `translate3d(${p[id].x.toFixed(1)}px, ${p[id].y.toFixed(1)}px, 0)`
      if (p[id].on) el.removeAttribute('data-off')
      else el.setAttribute('data-off', '')
    }
  }, [])

  const boot = useCallback(async () => {
    if (booting.current || !canvas.current) return
    booting.current = true
    if (!hasWebGL()) {
      setMode('nogl')
      return
    }
    setMode('loading')
    try {
      const { createWorld } = await import('./world.lazy')
      const w = await createWorld({
        canvas: canvas.current,
        view,
        mobile: matchMedia('(pointer: coarse)').matches || innerWidth < 760,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        onProgress: setProgress,
        onState: (s) => {
          setSt(s)
          if (!scrubbing.current && scrub.current) scrub.current.value = String(Math.round(s.frac * 1000))
        },
        onArrive: (id) => {
          if (pending.current === id) {
            pending.current = null
            openSheet(id)
          }
        },
        onPins,
        onLost: () => setMode('error'),
      })
      api.current = w
      ;(window as unknown as { __drive: unknown }).__drive = { api: w, ready: true }
      if (posterMode) {
        const s = Number(q?.get('s') ?? 150)
        w.pose(s, { look: (q?.get('look') as StationId) || undefined, t: Number(q?.get('v') ?? 0) })
        setMode('world')
        return
      }
      const h = live.current.open
      if (h) w.teleport(h)
      setMode('world')
      w.start()
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 300))
      ric(() => {
        ensurePass()
        ensureSteer()
      })
    } catch (e) {
      console.warn('drive: world failed', e)
      setMode('error')
    }
  }, [view, onPins, openSheet, posterMode, q, ensurePass, ensureSteer])

  useEffect(() => {
    setJs(true)
    setTouch(matchMedia('(pointer: coarse)').matches)
    if (innerWidth < 760) setAbout(false)
    const h = location.hash.slice(1) as StationId
    if (STATION_IDS.includes(h)) {
      setOpen(h)
      setAbout(false)
      setStill(h)
      // a deep link (or a stop chosen before the page finished loading) lands on the sheet's heading
      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(`${h}-h`)?.focus({ preventScroll: true })))
    }
    if (posterMode) {
      boot()
      return
    }
    const rm = reduced || matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced'
    if (rm || lowTier()) {
      setMode('still')
      return
    }
    const go = () => {
      cleanup()
      boot()
    }
    const evs = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const
    const cleanup = () => evs.forEach((e) => removeEventListener(e, go))
    evs.forEach((e) => addEventListener(e, go, { passive: true, once: true }))
    let t = 0
    const later = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      t = window.setTimeout(() => (ric ? ric(go, { timeout: 2500 }) : go()), 2500)
    }
    if (document.readyState === 'complete') later()
    else addEventListener('load', later, { once: true })
    return () => {
      cleanup()
      clearTimeout(t)
      api.current?.dispose()
      api.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------- go to a stop
  const go = useCallback(
    (id: StationId, from?: HTMLElement | null) => {
      trigger.current = from ?? (document.activeElement as HTMLElement | null)
      const w = api.current
      if (!w || mode !== 'world') {
        setStill(id)
        openSheet(id, from ?? null)
        return
      }
      if (open) setOpen(null)
      const stop = w.stations[id]
      const d = stop - st.s
      if (Math.abs(d) < 3 && Math.abs(st.v) < 1) {
        openSheet(id, from ?? null)
        return
      }
      pending.current = id
      if (Math.abs(d) > 260 && !reduced) {
        // a short cut: fade, jump to the approach, and drive the last stretch in
        setFade(true)
        setTimeout(() => {
          w.teleport(stop - 120, 17)
          w.driveTo(id)
          setFade(false)
        }, 260)
      } else if (reduced) {
        w.teleport(id)
        pending.current = null
        openSheet(id, from ?? null)
      } else w.driveTo(id)
    },
    [mode, open, st.s, st.v, reduced, openSheet],
  )

  // ---------------------------------------------------------------- input: wheel, touch drag, keys
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (live.current.open && innerWidth < 760) return
      e.preventDefault()
      const k = e.deltaMode === 1 ? 24 : e.deltaMode === 2 ? 400 : 0.55
      api.current?.nudge(e.deltaY * k)
    }
    let ty: number | null = null
    const ts = (e: TouchEvent) => (ty = e.touches[0].clientY)
    const tm = (e: TouchEvent) => {
      if (ty === null) return
      const y = e.touches[0].clientY
      api.current?.nudge((ty - y) * 1.4)
      ty = y
    }
    const te = () => (ty = null)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('touchstart', ts, { passive: true })
    el.addEventListener('touchmove', tm, { passive: true })
    el.addEventListener('touchend', te)
    return () => {
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('touchstart', ts)
      el.removeEventListener('touchmove', tm)
      el.removeEventListener('touchend', te)
    }
  }, [])

  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.closest('input, select, textarea, [contenteditable]') !== null)
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && live.current.open) {
        e.preventDefault()
        close()
        return
      }
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (live.current.open) return
      const k = e.key.toLowerCase()
      if (k === 'w' || e.key === 'ArrowUp') {
        e.preventDefault()
        api.current?.throttle(1)
      } else if (k === 's' || e.key === 'ArrowDown') {
        e.preventDefault()
        api.current?.throttle(-1)
      } else if (/^[1-6]$/.test(e.key)) {
        go(STATION_IDS[+e.key - 1])
      } else if (e.key === 'Enter' && live.current.near) {
        const a = document.activeElement
        if (!a || a === document.body || a === canvas.current) {
          e.preventDefault()
          openSheet(live.current.near, null)
        }
      }
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'w' || k === 's' || e.key === 'ArrowUp' || e.key === 'ArrowDown') api.current?.throttle(0)
    }
    addEventListener('keydown', down)
    addEventListener('keyup', up)
    addEventListener('blur', () => api.current?.throttle(0))
    return () => {
      removeEventListener('keydown', down)
      removeEventListener('keyup', up)
    }
  }, [close, go, openSheet])

  // the sheet covers the right side (desktop) or most of the screen (phone): reframe the drive around it
  useEffect(() => {
    const w = api.current
    if (!w) return
    const set = () => {
      const wide = innerWidth >= 900
      w.setInsets({ right: open && wide ? Math.min(560, innerWidth * 0.42) : 0 })
      w.setPaused(!!open && innerWidth < 760)
    }
    set()
    addEventListener('resize', set)
    return () => removeEventListener('resize', set)
  }, [open, mode])

  const ctx: SheetCtx = {
    base,
    open,
    close,
    steer: {
      data: steerData,
      concept,
      qi,
      ai,
      set: (p) => {
        if (p.concept) setConcept(p.concept)
        if (p.qi !== undefined) setQi(p.qi)
        if (p.ai !== undefined) setAi(p.ai)
      },
    },
    pass,
  }

  const railClick = (id: StationId) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    go(id, e.currentTarget)
  }
  const hold = (x: number) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      if (mode !== 'world') boot()
      api.current?.throttle(x)
    },
    onPointerUp: () => api.current?.throttle(0),
    onPointerCancel: () => api.current?.throttle(0),
    onLostPointerCapture: () => api.current?.throttle(0),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  })
  const world = mode === 'world'
  const near = world && !open ? st.near : null
  const card = near ? STATIONS[near] : null
  const kmh = Math.round(Math.abs(st.v) * 3.6)
  const posterBase = `/drive/poster-${view}`
  const stillSrc = (d: 'd' | 'm') => (still && (mode === 'still' || mode === 'nogl' || mode === 'error') ? `/drive/stills/${view}-${still}.webp` : `${posterBase}-${d}.webp`)

  return (
    <div className="dr" data-view={view} data-mode={mode} data-js={js || undefined} data-lab={lab || undefined} data-sheet={open || undefined} data-about={about || undefined} data-poster={posterMode || undefined} data-fade={fade || undefined}>
      <a className="dr-skip" href="#dr-rail">
        Skip to the stops
      </a>

      <div className="dr-stage" ref={stage}>
        <div className="dr-cover">
          <picture className="dr-poster">
            <source media="(max-aspect-ratio: 1/1)" srcSet={stillSrc('m')} />
            <img src={stillSrc('d')} width={1440} height={900} alt={ALT[view]} {...{ fetchpriority: 'high' }} decoding="async" />
          </picture>
        </div>
        <canvas ref={canvas} className="dr-canvas" aria-hidden="true" tabIndex={-1} />
        <div className="dr-pins" aria-hidden="true">
          {world &&
            STATION_IDS.map((id) => (
              <a key={id} ref={(el) => (pins.current[id] = el)} href={`#${id}`} className="dr-pin" data-off="" data-active={st.near === id || undefined} style={{ ['--st' as string]: STATIONS[id].color }} onClick={railClick(id)} tabIndex={-1}>
                <span>{STATIONS[id].title}</span>
              </a>
            ))}
        </div>
        <div className="dr-flash" aria-hidden="true" />
      </div>

      <header className="dr-id">
        <div className="dr-id__top">
          <h1 className="dr-name">{person.name}</h1>
          <button type="button" className="dr-about" aria-expanded={about} aria-controls="dr-id-more" onClick={() => setAbout((a) => !a)}>
            About <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
        <div id="dr-id-more" className="dr-id__more">
          <div>
            <p className="dr-thesis">{thesis}</p>
            <p className="dr-ctx">{context}</p>
            <ul className="dr-proofs" aria-label="Three proofs">
              {proofs.map((p) => {
                const id = PROOF_STATION[p.mark]
                return (
                  <li key={p.mark}>
                    <a href={`#${id}`} onClick={railClick(id)} style={{ ['--st' as string]: STATIONS[id].color }}>
                      <Logo m={p.mark} w={30} h={24} />
                      <span>
                        <b>{p.org}</b> {p.line}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
        <ul className="dr-links" aria-label="Contact">
          <li>
            <a className="dr-btn dr-btn--cv" href={links.resume.href} target="_blank" rel="noopener">
              <FileText size={16} aria-hidden="true" /> <span>Resume (PDF)</span>
            </a>
          </li>
          <li>
            <a className="dr-btn dr-btn--ghost" href={links.email.href}>
              <Mail size={16} aria-hidden="true" /> <span>Email</span>
            </a>
          </li>
          <li>
            <a className="dr-btn dr-btn--ghost" href={links.linkedin.href} target="_blank" rel="noopener">
              <Linkedin size={16} aria-hidden="true" /> <span>LinkedIn</span>
            </a>
          </li>
          <li className="dr-links__gh">
            <a className="dr-btn dr-btn--ghost" href={links.github.href} target="_blank" rel="noopener" aria-label="GitHub">
              <Github size={16} aria-hidden="true" />
            </a>
          </li>
        </ul>
      </header>

      <nav id="dr-rail" className="dr-rail" aria-label="Stops on the drive" tabIndex={-1}>
        <p className="dr-rail__h dr-mono" aria-hidden="true">
          City → summit · {Math.max(0, (st.s / 1000)).toFixed(1)} km
        </p>
        <ol>
          {STATION_IDS.map((id, i) => (
            <li key={id}>
              <a href={`#${id}`} onClick={railClick(id)} data-active={st.near === id || undefined} data-past={(world && st.frac >= TICK[id] - 0.004) || undefined} aria-current={open === id ? 'true' : undefined} style={{ ['--st' as string]: STATIONS[id].color }}>
                <span className="dr-rail__n dr-mono" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="dr-rail__p">{STATIONS[id].place}</span>
                <span className="dr-rail__t">{STATIONS[id].title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="dr-card" data-on={card ? '' : undefined} aria-live="polite" style={{ ['--st' as string]: card?.color ?? '#fff' }}>
        {card && (
          <>
            <p className="dr-card__p">{card.place}</p>
            <p className="dr-card__t">{card.title}</p>
            <p className="dr-card__l">{blurb[card.id]}</p>
            <button type="button" className="dr-btn" onClick={(e) => openSheet(card.id, e.currentTarget)}>
              Open {!touch && <kbd>↵</kbd>}
            </button>
          </>
        )}
      </div>

      <div className="dr-bar">
        <div className="dr-scrub">
          <label htmlFor="dr-scrub" className="dr-mono dr-scrub__l">
            <span>Road</span>
            <b aria-hidden="true">{world ? `${kmh} km/h` : '0 km/h'}</b>
          </label>
          <div className="dr-scrub__track">
            <input
              ref={scrub}
              id="dr-scrub"
              type="range"
              min={0}
              max={1000}
              step={1}
              defaultValue={0}
              aria-valuetext={`${Math.round(st.frac * 100)}% of the road${st.near ? `, near ${STATIONS[st.near].place}` : ''}`}
              onPointerDown={() => {
                scrubbing.current = true
                if (mode !== 'world') boot()
              }}
              onPointerUp={() => (scrubbing.current = false)}
              onInput={(e) => api.current?.scrub(+(e.target as HTMLInputElement).value / 1000)}
              onKeyUp={(e) => api.current?.scrub(+(e.target as HTMLInputElement).value / 1000)}
            />
            <ol className="dr-ticks" aria-hidden="true">
              {STATION_IDS.map((id) => (
                <li key={id} style={{ left: `${TICK[id] * 100}%`, ['--st' as string]: STATIONS[id].color }} />
              ))}
            </ol>
          </div>
        </div>
        {!touch && (
          <p className="dr-keys" aria-label="Controls: scroll, or W and S, or the arrow keys to drive; 1 to 6 to drive to a stop; Enter to open the stop you are at.">
            <span>
              <kbd>Scroll</kbd> or <kbd>W</kbd>
              <kbd>S</kbd> drive
            </span>
            <span>
              <kbd>1</kbd>–<kbd>6</kbd> stops
            </span>
            <span>
              <kbd>↵</kbd> open
            </span>
          </p>
        )}
        {touch && (
          <div className="dr-pedals">
            <button type="button" className="dr-pedal dr-pedal--brake" aria-label="Brake, hold to reverse" {...hold(-1)}>
              Brake
            </button>
            <button type="button" className="dr-pedal" aria-label="Hold to drive" {...hold(1)}>
              Hold to drive
            </button>
          </div>
        )}
      </div>

      {mode === 'loading' && (
        <p className="dr-load" role="status">
          <span className="dr-load__ring" style={{ ['--p' as string]: progress.toFixed(3) }} aria-hidden="true" />
          Warming up the engine <span className="dr-mono">{Math.round(progress * 100)}%</span>
        </p>
      )}
      {(mode === 'still' || mode === 'nogl' || mode === 'error') && (
        <div className="dr-still" role="status">
          {mode === 'still' && (
            <>
              <span>Stills of the drive. Every stop is in the list.</span>
              <button type="button" className="dr-btn dr-btn--ghost" onClick={() => boot()}>
                <Play size={14} aria-hidden="true" /> Drive it anyway
              </button>
            </>
          )}
          {mode === 'nogl' && <span>This browser has no WebGL, so here is the drive as stills. Every stop is in the list.</span>}
          {mode === 'error' && <span>The 3D drive stopped. Every stop is still in the list.</span>}
        </div>
      )}

      <p className="dr-credit dr-mono">
        Car and road modelled for this site · sky, firs, grass: Poly Haven (CC0) · textures: ambientCG (CC0) · terrain: USGS 3DEP
      </p>

      <Sheets ctx={ctx} />
    </div>
  )
}
