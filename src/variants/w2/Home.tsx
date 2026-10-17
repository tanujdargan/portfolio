// W2 · Playground home. First paint (SSR) is a still of the island with the proof card, the station rail and
// hotspots, so a recruiter has Resume / email / LinkedIn and the three proofs at once without playing anything.
// The live world (world.lazy.ts) loads after idle or first input and fades in over the still from the same camera.
import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Mail, Linkedin, Github, ChevronDown, Play, RotateCcw } from 'lucide-react'
import { thesis, context, proofs, selected } from '../../content/curated'
import { links, person } from '../../content/site'
import { Logo } from '../../shared/Mark'
import { useMotionPrefs } from '../../lib/motion'
import { STATIONS, STATION_IDS, POSTER_PINS, type StationId } from './stations'
import { Sheets, type SheetCtx } from './Sheets'
import { REST, type Concept, type SteerData } from './Steer'
import type { PassState } from './pass'
import type { WorldApi, Pin } from './world.lazy'

type Mode = 'poster' | 'loading' | 'world' | 'still' | 'nogl' | 'error'
const PROOF_STATION: Record<string, StationId> = { amazon: 'dock', cfar: 'pad', apart: 'log' }
const blurb: Partial<Record<StationId, string>> = {
  dock: selected.find((s) => s.id === 'amazon')!.result,
  pad: selected.find((s) => s.id === 'orbit')!.result,
  log: selected.find((s) => s.id === 'lossmask')!.result,
  model: selected.find((s) => s.id === 'steering')!.result,
  pier: selected.find((s) => s.id === 'ocean')!.result,
  board: 'Roles, education, links and the resume',
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

export function Home({ base }: { base: string }) {
  const { reduced } = useMotionPrefs()
  const [mode, setMode] = useState<Mode>('poster')
  const [js, setJs] = useState(false)
  const [progress, setProgress] = useState(0)
  const [active, setActive] = useState<StationId | null>(null)
  const [open, setOpen] = useState<StationId | null>(null)
  const [about, setAbout] = useState(true)
  const [touch, setTouch] = useState(false)
  const [steerData, setSteerData] = useState<SteerData | null>(null)
  const [concept, setConcept] = useState<Concept>('joy')
  const [qi, setQi] = useState(0)
  const [ai, setAi] = useState(REST)
  const [pass, setPass] = useState<PassState | null>(null)

  const canvas = useRef<HTMLCanvasElement>(null)
  const joy = useRef<HTMLDivElement>(null)
  const pins = useRef<Partial<Record<StationId, HTMLAnchorElement | null>>>({})
  const api = useRef<WorldApi | null>(null)
  const booting = useRef(false)
  const trigger = useRef<HTMLElement | null>(null)
  const live = useRef({ open, active })
  live.current = { open, active }
  const lab = base.startsWith('/lab')
  const posterMode = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('w2poster') : null

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
        joy: joy.current,
        mobile: matchMedia('(pointer: coarse)').matches || innerWidth < 760,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        intro: 'overview',
        onProgress: setProgress,
        onStation: setActive,
        onPins,
        onDrive: () => setAbout(false),
        onLost: () => setMode('error'),
      })
      api.current = w
      setMode('world')
      if (live.current.open) {
        w.teleport(live.current.open)
        w.setControls(false)
      }
      if (posterMode === 'd' || posterMode === 'm') {
        w.posterCam(posterMode)
        ;(window as unknown as { __w2: unknown }).__w2 = { project: () => w.project() }
        return
      }
      // the camera settles from the poster view down to the rover on its own after a beat
      setTimeout(() => api.current?.start(), reduced ? 0 : 1400)
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 300))
      ric(() => {
        ensurePass()
        ensureSteer()
      })
    } catch (e) {
      console.warn('w2: world failed', e)
      setMode('error')
    }
  }, [onPins, posterMode, reduced, ensurePass, ensureSteer])

  useEffect(() => {
    setJs(true)
    setTouch(matchMedia('(pointer: coarse)').matches)
    const h = location.hash.slice(1) as StationId
    if (STATION_IDS.includes(h)) setOpen(h)
    if (posterMode) {
      boot()
      return
    }
    const rm = reduced || matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced'
    if (rm || lowTier()) {
      setMode('still')
      return
    }
    // first input, or idle a couple of seconds after load; the still holds until then
    const go = () => {
      cleanup()
      boot()
    }
    const evs = ['pointerdown', 'keydown', 'touchstart'] as const
    const cleanup = () => evs.forEach((e) => removeEventListener(e, go))
    evs.forEach((e) => addEventListener(e, go, { passive: true, once: true }))
    let t = 0
    const later = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
      t = window.setTimeout(() => (ric ? ric(go, { timeout: 3000 }) : go()), 4500)
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

  // ---------------------------------------------------------------- sheets
  const openSheet = useCallback(
    (id: StationId, from?: HTMLElement | null) => {
      trigger.current = from ?? (document.activeElement as HTMLElement | null)
      setOpen(id)
      setAbout(false)
      if (id === 'pad') ensurePass()
      if (id === 'model') ensureSteer()
      history.replaceState(null, '', `#${id}`)
      const w = api.current
      if (w) {
        w.teleport(id)
        w.setControls(false)
      }
      requestAnimationFrame(() => document.getElementById(`${id}-h`)?.focus({ preventScroll: true }))
    },
    [ensurePass, ensureSteer],
  )
  const close = useCallback(() => {
    setOpen(null)
    history.replaceState(null, '', location.pathname + location.search)
    api.current?.setControls(true)
    const t = trigger.current
    if (t && document.contains(t)) t.focus({ preventScroll: true })
  }, [])

  // keyboard: Esc closes, Enter opens the station you're parked at
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && live.current.open) {
        e.preventDefault()
        close()
      } else if (e.key === 'Enter' && !live.current.open && live.current.active) {
        const a = document.activeElement
        if (!a || a === document.body || a === canvas.current) {
          e.preventDefault()
          openSheet(live.current.active)
        }
      }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [close, openSheet])

  // the sheet covers the right side (desktop) or most of the screen (phone): reframe the world around it
  useEffect(() => {
    const w = api.current
    if (!w) return
    const set = () => {
      const wide = innerWidth >= 900
      const narrow = innerWidth < 760
      const card = document.querySelector('.w2-id')?.getBoundingClientRect()
      const top = narrow && card ? Math.max(0, card.bottom - 40) : 0
      w.setInsets(open && wide ? { right: Math.min(560, innerWidth * 0.42), bottom: 0 } : { right: 0, bottom: narrow ? 60 : 0, top })
    }
    set()
    const t = setTimeout(set, 500) // after the About card finishes collapsing
    addEventListener('resize', set)
    return () => {
      clearTimeout(t)
      removeEventListener('resize', set)
    }
  }, [open, mode, about])

  // steering view → monument
  useEffect(() => {
    const w = api.current
    if (!w) return
    const row = steerData?.concepts[concept].outputs[qi]
    w.setSteer(row ? { ai, expr: row.map((o) => o.expr), hue: concept } : null)
  }, [steerData, concept, qi, ai, mode])

  // live MarmotSat → dish
  useEffect(() => {
    const w = api.current
    if (!w || !pass) return
    w.setDish(pass.up ? { az: pass.az, el: pass.el, up: true } : pass.next ? { az: pass.next.aosAz, el: 3, up: false } : null)
  }, [pass, mode])

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
    openSheet(id, e.currentTarget)
  }
  const world = mode === 'world'
  const card = active && !open && world ? STATIONS[active] : null

  return (
    <div className="w2" data-mode={mode} data-js={js || undefined} data-lab={lab || undefined} data-sheet={open || undefined} data-about={about || undefined} data-poster={posterMode || undefined}>
      <a className="w2-skip" href="#w2-rail">
        Skip to the stations
      </a>

      <div className="w2-stage">
        <div className="w2-cover">
          <picture className="w2-poster">
            <source media="(max-aspect-ratio: 1/1)" srcSet="/w2/poster-m.webp" />
            <img src="/w2/poster-d.webp" width={1440} height={900} alt="The island at dusk: a launch pad and gantry, a warehouse dock, a stone dial, a reading pavilion, a pier with a buoy and a signpost around a tiled plaza." {...{ fetchpriority: 'high' }} decoding="async" />
          </picture>
          <div className="w2-hotspots" aria-label="Stations on the island">
            {STATION_IDS.map((id) => {
              const d = POSTER_PINS.d[id],
                m = POSTER_PINS.m[id]
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  className="w2-hot"
                  style={{ ['--dx' as string]: d ? `${d[0]}%` : '-100%', ['--dy' as string]: d ? `${d[1]}%` : '-100%', ['--mx' as string]: m ? `${m[0]}%` : '-100%', ['--my' as string]: m ? `${m[1]}%` : '-100%', ['--st' as string]: STATIONS[id].color }}
                  data-nom={!m || undefined}
                  data-nod={!d || undefined}
                  onClick={railClick(id)}
                  tabIndex={-1}
                >
                  <span className="w2-hot__dot" aria-hidden="true" />
                  <span className="w2-hot__l">{STATIONS[id].place}</span>
                </a>
              )
            })}
          </div>
        </div>
        <canvas ref={canvas} className="w2-canvas" aria-hidden="true" />
        <div className="w2-pins" aria-hidden={!world || undefined}>
          {world &&
            STATION_IDS.map((id) => (
              <a key={id} ref={(el) => (pins.current[id] = el)} href={`#${id}`} className="w2-pin" data-off="" data-active={active === id || undefined} style={{ ['--st' as string]: STATIONS[id].color }} onClick={railClick(id)} tabIndex={-1}>
                <span>{STATIONS[id].place}</span>
              </a>
            ))}
        </div>
        <div ref={joy} className="w2-joy" aria-hidden="true">
          <i />
        </div>
      </div>

      <header className="w2-id">
        <div className="w2-id__top">
          <h1 className="w2-name">{person.name}</h1>
          <button type="button" className="w2-about" aria-expanded={about} aria-controls="w2-id-more" onClick={() => setAbout((a) => !a)}>
            About <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
        <div id="w2-id-more" className="w2-id__more">
          <div>
          <p className="w2-thesis">{thesis}</p>
          <p className="w2-ctx">{context}</p>
          <ul className="w2-proofs" aria-label="Three proofs">
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
        <ul className="w2-links" aria-label="Contact">
          <li>
            <a className="w2-btn w2-btn--cv" href={links.resume.href} target="_blank" rel="noopener">
              <FileText size={16} aria-hidden="true" /> <span>Resume (PDF)</span>
            </a>
          </li>
          <li>
            <a className="w2-btn w2-btn--ghost" href={links.email.href}>
              <Mail size={16} aria-hidden="true" /> <span>Email</span>
            </a>
          </li>
          <li>
            <a className="w2-btn w2-btn--ghost" href={links.linkedin.href} target="_blank" rel="noopener">
              <Linkedin size={16} aria-hidden="true" /> <span>LinkedIn</span>
            </a>
          </li>
          <li className="w2-links__gh">
            <a className="w2-btn w2-btn--ghost" href={links.github.href} target="_blank" rel="noopener" aria-label="GitHub">
              <Github size={16} aria-hidden="true" />
            </a>
          </li>
        </ul>
      </header>

      <nav id="w2-rail" className="w2-rail" aria-label="Stations">
        <ol>
          {STATION_IDS.map((id) => (
            <li key={id}>
              <a href={`#${id}`} onClick={railClick(id)} data-active={active === id || undefined} aria-current={open === id ? 'true' : undefined} style={{ ['--st' as string]: STATIONS[id].color }}>
                <span className="w2-rail__dot" aria-hidden="true" />
                <span className="w2-rail__p">{STATIONS[id].place}</span>
                <span className="w2-rail__t">{STATIONS[id].title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="w2-card" data-on={card ? '' : undefined} aria-live="polite" style={{ ['--st' as string]: card?.color ?? '#fff' }}>
        {card && (
          <>
            <p className="w2-card__p">{card.place}</p>
            <p className="w2-card__t">{card.title}</p>
            <p className="w2-card__l">{blurb[card.id]}</p>
            <button type="button" className="w2-btn" onClick={(e) => openSheet(card.id, e.currentTarget)}>
              Open {!touch && <kbd>↵</kbd>}
            </button>
          </>
        )}
      </div>

      <div className="w2-hud">
        {world && !touch && (
          <p className="w2-keys" aria-label="Controls: W A S D or arrow keys to drive, Space to jump, Shift to boost, R to get unstuck, Enter to open a station.">
            <span>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> drive
            </span>
            <span>
              <kbd>Space</kbd> jump
            </span>
            <span>
              <kbd>⇧</kbd> boost
            </span>
            <span>
              <kbd>↵</kbd> open
            </span>
          </p>
        )}
        {world && touch && <p className="w2-keys">Drag anywhere to steer · tap the ground to drive there</p>}
        {world && (
          <button type="button" className="w2-icon-btn w2-unstuck" onClick={() => api.current?.unstuck()} aria-label="Unstuck: flip the rover back onto its wheels">
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {mode === 'loading' && (
        <p className="w2-load" role="status">
          <span className="w2-load__ring" style={{ ['--p' as string]: progress.toFixed(3) }} aria-hidden="true" />
          Building the island <span className="w2-mono">{Math.round(progress * 100)}%</span>
        </p>
      )}
      {(mode === 'still' || mode === 'nogl' || mode === 'error') && (
        <div className="w2-still" role="status">
          {mode === 'still' && (
            <>
              <span>A still of the island. Every station is in the rail.</span>
              <button type="button" className="w2-btn w2-btn--ghost" onClick={() => boot()}>
                <Play size={14} aria-hidden="true" /> Drive it anyway
              </button>
            </>
          )}
          {mode === 'nogl' && <span>This browser has no WebGL, so here is the island as a still. Every station is in the rail.</span>}
          {mode === 'error' && <span>The 3D island stopped. Every station is still in the rail.</span>}
        </div>
      )}

      <Sheets ctx={ctx} />
    </div>
  )
}
