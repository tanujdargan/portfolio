import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowRight, CornerDownLeft, X } from 'lucide-react'
import { proofs, thesis } from '../../content/curated'
import { person } from '../../content/site'
import { Logo } from '../../shared/Mark'
import { APP_VIEW, APPS, Contact, isApp, type AppId } from './apps'
import { cover, frameFor, quadMatrix, type FrameKey, type P2 } from './geom'
import { STILL } from './still'
import { OS, ScreenHome } from './os'
import type { HotId, WorldApi } from './world.lazy'
import type { Sky, SkyNow, UV } from './sky.lazy'
import { SkyPanel } from './skypanel'

type WorldState = 'wait' | 'loading' | 'live' | 'still'
type Sheet = { kind: 'app'; app: AppId; hot: HotId; anchor?: string } | { kind: 'sky'; hot: 'window' }

const PINS: { id: HotId; label: string; hint: string }[] = [
  { id: 'screen', label: 'Open the screen', hint: 'The whole portfolio' },
  { id: 'amazon', label: 'Amazon Robotics', hint: 'The boxes and the robot' },
  { id: 'cubesat', label: 'MarmotSat', hint: 'The satellite model on the shelf' },
  { id: 'board', label: 'Flight computer', hint: 'The dev board' },
  { id: 'notebooks', label: 'Research', hint: 'The notebooks' },
  { id: 'pinboard', label: 'Experience', hint: 'The pinboard' },
  { id: 'window', label: 'Live sky', hint: 'MarmotSat, right now' },
]
const HOT_APP: Partial<Record<HotId, AppId>> = { amazon: 'amazon', cubesat: 'marmotsat', board: 'marmotsat', notebooks: 'research', pinboard: 'experience' }
const PROOF_HOT: Record<string, HotId> = { amazon: 'amazon', cfar: 'cubesat', apart: 'notebooks' }
const PROOF_WHERE: Record<string, string> = { amazon: 'the boxes', cfar: 'the shelf', apart: 'the notebooks' }

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Where the OS window sits when open: the monitor's screen fitted into the stage (desktop), or the whole stage (phone). */
function osRect(W: number, H: number) {
  if (W / H < 1.05 || W < 720) return { x: 0, y: 0, w: W, h: H, full: true }
  const m = Math.max(12, Math.min(W, H) * 0.025)
  const aw = W - 2 * m,
    ah = H - 2 * m
  const w = Math.min(aw, ah * 1.6),
    h = w / 1.6
  return { x: (W - w) / 2, y: (H - h) / 2, w, h, full: false }
}
/** On phones the camera fills the width with the screen first, then the OS grows to full screen. */
function zoomRect(W: number, H: number) {
  const r = osRect(W, H)
  if (!r.full) return r
  const w = W - 24,
    h = w / 1.6
  return { x: 12, y: (H - h) / 2, w, h }
}

export function Room({ base, notFound = false }: { base: string; notFound?: boolean }) {
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const screenEl = useRef<HTMLDivElement>(null)
  const pinEls = useRef<Partial<Record<string, HTMLElement | null>>>({})
  const satTag = useRef<HTMLDivElement>(null)
  const world = useRef<WorldApi | null>(null)
  const sky = useRef<Sky | null>(null)
  const lastTrigger = useRef<HTMLElement | null>(null)
  const booting = useRef(false)
  const size = useRef({ w: 1440, h: 900 })

  const [state, setState] = useState<WorldState>('wait')
  const [progress, setProgress] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [hover, setHover] = useState<HotId | null>(null)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [os, setOs] = useState<{ phase: 'closed' | 'zoom' | 'open' | 'closing' | 'out'; app: AppId }>({ phase: 'closed', app: 'about' })
  const [skyNow, setSkyNow] = useState<SkyNow | null>(null)
  const [, setFrame] = useState<FrameKey>('wide')
  const live = useRef({ os, sheet, state })
  live.current = { os, sheet, state }

  // ---------- still-mode placement of the screen (poster coordinates → stage px)
  const placeStill = useCallback(() => {
    const st = stage.current
    if (!st) return
    const W = st.clientWidth,
      H = st.clientHeight
    const f = frameFor(W, H)
    const c = cover(W, H, f)
    const s = STILL[f]
    if (!s) return
    const q = s.screen.map(([x, y]) => [c.x + (x / 100) * c.w, c.y + (y / 100) * c.h] as P2) as [P2, P2, P2, P2]
    applyScreen(q)
  }, [])

  const applyScreen = (q: [P2, P2, P2, P2]) => {
    const el = screenEl.current
    if (!el) return
    el.style.transform = quadMatrix(el.offsetWidth || 1152, el.offsetHeight || 720, q)
    el.dataset.placed = '1'
  }

  // ---------- hydration, motion prefs, size
  useEffect(() => {
    setHydrated(true)
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onMq = () => setReduced(mq.matches)
    mq.addEventListener('change', onMq)
    const st = stage.current!
    const ro = new ResizeObserver(() => {
      const w = st.clientWidth,
        h = st.clientHeight
      size.current = { w, h }
      setFrame(frameFor(w, h))
      world.current?.resize(w, h)
      if (live.current.state !== 'live') placeStill()
    })
    ro.observe(st)
    placeStill()
    // deep link: /#research opens the screen on that app
    const h = location.hash.slice(1)
    if (isApp(h)) setOs({ phase: 'open', app: h })
    else if (h === 'w1-os') setOs({ phase: 'open', app: 'about' })
    return () => {
      ro.disconnect()
      mq.removeEventListener('change', onMq)
    }
  }, [placeStill])

  // ---------- boot the world: on first input, or when the browser is idle
  const boot = useCallback(async () => {
    if (booting.current) return
    booting.current = true
    const params = new URLSearchParams(location.search)
    if (params.has('still') || !hasWebGL() || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState('still')
      return
    }
    setState('loading')
    try {
      const { createWorld } = await import('./world.lazy')
      const small = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700
      const w = await createWorld({
        canvas: canvas.current!,
        url: small ? '/w1/room-1k.glb' : '/w1/room.glb',
        reduced: false,
        onProgress: setProgress,
        onHover: setHover,
        onPick: (id) => pickRef.current(id),
        onFrame: (f) => {
          if (live.current.os.phase !== 'open') applyScreen(f.screen)
          for (const k in f.pins) {
            const el = pinEls.current[k]
            if (!el) continue
            const [x, y] = f.pins[k]
            el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
            // keep the label on screen near the edges; the stem still points at the object
            const lab = el.querySelector<HTMLElement>('.w1-pin__label')
            if (lab) {
              const w = (lab.dataset.w ??= String(lab.offsetWidth))
              const half = +w / 2,
                W = size.current.w
              const n = x - half < 10 ? 10 - (x - half) : x + half > W - 10 ? W - 10 - (x + half) : 0
              lab.style.translate = n ? `${n.toFixed(0)}px 0` : ''
            }
          }
          const t = satTag.current
          if (t) {
            t.hidden = !f.sat
            if (f.sat) t.style.transform = `translate3d(${f.sat[0].toFixed(1)}px, ${f.sat[1].toFixed(1)}px, 0)`
          }
        },
      })
      world.current = w
      w.resize(size.current.w, size.current.h)
      ;(window as unknown as { __w1?: WorldApi }).__w1 = w
      setState('live')
      startSky()
    } catch (e) {
      console.warn('w1: 3D room unavailable, showing the still', e)
      setState('still')
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const go = () => boot()
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    evs.forEach((e) => addEventListener(e, go, { once: true, passive: true }))
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    const t = window.setTimeout(() => (ric ? ric(go, { timeout: 2000 }) : go()), 2500)
    return () => {
      evs.forEach((e) => removeEventListener(e, go))
      clearTimeout(t)
    }
  }, [hydrated, boot])

  useEffect(() => world.current?.setReduced(reduced), [reduced])

  // ---------- the sky (MarmotSat)
  const startSky = useCallback(() => {
    if (sky.current) return
    import('./sky.lazy').then(({ createSky }) => {
      sky.current = createSky((now: SkyNow, p: UV | null, trail: UV[]) => {
        setSkyNow(now)
        world.current?.setSat(p, trail)
      })
    })
  }, [])
  useEffect(() => () => sky.current?.stop(), [])

  // ---------- interactions
  const openSheet = useCallback((hot: HotId, trigger?: HTMLElement | null) => {
    if (trigger) lastTrigger.current = trigger
    if (hot === 'screen') return openOs('about', trigger)
    const s: Sheet = hot === 'window' ? { kind: 'sky', hot } : { kind: 'app', app: HOT_APP[hot]!, hot, anchor: hot === 'board' ? 'w1-firmware' : undefined }
    setSheet(s)
    if (hot === 'window') startSky()
    const { w, h } = size.current
    const tall = w / h < 0.9 || w < 720
    world.current?.focus(hot, tall ? { x: 0, y: 0.26 } : { x: Math.min(0.2, 250 / w), y: 0 })
  }, [])

  const closeSheet = useCallback(() => {
    setSheet(null)
    world.current?.focus(null)
    lastTrigger.current?.focus()
  }, [])

  const openOs = useCallback(async (app: AppId = 'about', trigger?: HTMLElement | null) => {
    if (trigger) lastTrigger.current = trigger
    setSheet(null)
    const w = world.current
    const { w: W, h: H } = size.current
    if (w && live.current.state === 'live' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOs({ phase: 'zoom', app })
      await w.zoomScreen(zoomRect(W, H))
      setOs({ phase: 'open', app })
      w.setPaused(true)
    } else setOs({ phase: 'open', app })
  }, [])

  const closeOs = useCallback(async () => {
    const w = world.current
    setOs((o) => ({ ...o, phase: 'closing' }))
    if (w) {
      w.setPaused(false)
      await new Promise((r) => setTimeout(r, 160))
      setOs((o) => ({ ...o, phase: 'out' }))
      await w.zoomScreen(null)
      setOs((o) => ({ ...o, phase: 'closed' }))
    } else {
      await new Promise((r) => setTimeout(r, 200))
      setOs((o) => ({ ...o, phase: 'closed' }))
    }
    if (location.hash) history.replaceState(null, '', location.pathname + location.search)
    lastTrigger.current?.focus()
  }, [])

  const pickRef = useRef<(id: HotId) => void>(() => {})
  pickRef.current = (id) => openSheet(id, null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && live.current.os.phase === 'closed' && !live.current.sheet && (document.activeElement === document.body || !document.activeElement)) {
        e.preventDefault()
        openOs('about')
        return
      }
      if (e.key === 'Escape') {
        if (live.current.os.phase === 'open') closeOs()
        else if (live.current.sheet) closeSheet()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [closeOs, closeSheet, openOs])

  const hoverDom = (id: HotId | null) => {
    setHover(id)
    world.current?.hover(id)
    if (id) boot()
  }

  const osOpen = os.phase === 'open' || os.phase === 'closing'
  const { w: SW, h: SH } = size.current
  const rect = osRect(SW, SH)

  return (
    <div
      className="w1"
      data-world={state}
      data-os={os.phase}
      data-sheet={sheet ? sheet.hot : undefined}
      data-hover={hover ?? undefined}
      data-reduced={reduced || undefined}
    >
      <a className="w1-skip" href="#w1-main">
        Skip to content
      </a>

      <div className="w1-stage" ref={stage} aria-hidden={osOpen || undefined}>
        <div className="w1-cover w1-cover--wide" aria-hidden="true">
          <img src="/w1/poster-wide.webp" srcSet="/w1/poster-wide.webp 1440w, /w1/poster-wide@2x.webp 2880w" sizes="max(100vw, 160vh)" width={1440} height={900} alt="" {...{ fetchpriority: "high" }} decoding="async" />
        </div>
        <div className="w1-cover w1-cover--tall" aria-hidden="true">
          <img src="/w1/poster-tall.webp" width={780} height={1688} alt="" decoding="async" />
        </div>
        <canvas ref={canvas} className="w1-canvas" aria-hidden="true" />
        <div className="w1-screen" ref={screenEl} aria-hidden="true" data-placed={undefined}>
          <ScreenHome notFound={notFound} onOpen={(a) => openOs(a)} />
        </div>
        <div className="w1-sattag" ref={satTag} hidden aria-hidden="true">
          <span>MarmotSat{skyNow?.replay ? ' · replay' : ''}</span>
        </div>
        <ul className="w1-pins" aria-label="Objects on the desk">
          {PINS.map((p) => {
            const wp = STILL.wide?.pins[p.id],
              tp = STILL.tall?.pins[p.id]
            const style = { '--wx': wp?.[0], '--wy': wp?.[1], '--tx': tp?.[0], '--ty': tp?.[1] } as CSSProperties
            return (
              <li key={p.id} className="w1-pin" data-id={p.id} data-on={hover === p.id || undefined} ref={(el) => (pinEls.current[p.id] = el)} style={style}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => openSheet(p.id, e.currentTarget)}
                  onPointerEnter={() => hoverDom(p.id)}
                  onPointerLeave={() => hoverDom(null)}
                >
                  <span className="w1-pin__dot" />
                  <span className="w1-pin__label">{p.label}</span>
                </button>
                {p.id === 'window' && skyNow && <span className="w1-pin__sub">{skyLine(skyNow)}</span>}
              </li>
            )
          })}
        </ul>
      </div>

      <header className="w1-top">
        <p className="w1-top__name">
          <span className="w1-led" aria-hidden="true" />
          {person.name}
        </p>
        <Contact className="w1-links w1-links--top" />
      </header>

      <main className="w1-panel" id="w1-main" tabIndex={-1}>
        {notFound ? (
          <>
            <p className="w1-kicker">404</p>
            <h1 className="w1-panel__h1">Nothing on this desk.</h1>
            <p className="w1-panel__thesis">That page isn’t here. The rest of the work is on the screen.</p>
          </>
        ) : (
          <>
            <h1 className="w1-panel__h1">
              <span className="w1-sr">{person.name}: </span>
              {thesis}
            </h1>
          </>
        )}
        <ol className="w1-signs" aria-label="Start with these">
          {proofs.map((p) => {
            const id = PROOF_HOT[p.mark]
            return (
              <li key={p.mark}>
                <button
                  type="button"
                  className="w1-sign"
                  data-on={hover === id || undefined}
                  onClick={(e) => openSheet(id, e.currentTarget)}
                  onPointerEnter={() => hoverDom(id)}
                  onPointerLeave={() => hoverDom(null)}
                  onFocus={() => hoverDom(id)}
                  onBlur={() => hoverDom(null)}
                >
                  <Logo m={p.mark} w={22} h={22} />
                  <span className="w1-sign__body">
                    <b>{p.org}</b>
                    <span>{p.line}</span>
                  </span>
                  <span className="w1-sign__where" aria-hidden="true">
                    {PROOF_WHERE[p.mark]}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <ul className="w1-chips" aria-label="Also on the desk">
          {PINS.filter((p) => ['pinboard', 'board', 'window'].includes(p.id)).map((p) => (
            <li key={p.id}>
              <button type="button" className="w1-chip" onClick={(e) => openSheet(p.id, e.currentTarget)} onPointerEnter={() => hoverDom(p.id)} onPointerLeave={() => hoverDom(null)}>
                {p.label}
              </button>
            </li>
          ))}
        </ul>
        <a
          className="w1-cta"
          href="#w1-os"
          onClick={(e) => {
            e.preventDefault()
            openOs('about', e.currentTarget)
          }}
          onPointerEnter={() => hoverDom('screen')}
          onPointerLeave={() => hoverDom(null)}
        >
          <span>Open the screen</span>
          <kbd aria-hidden="true">
            <CornerDownLeft size={14} />
          </kbd>
        </a>
      </main>

      <p className="w1-status" aria-live="polite">
        {state === 'loading' ? `Loading the room ${Math.round(progress * 100)}%` : state === 'live' ? 'Modelled and light-baked in Blender' : ''}
      </p>

      {sheet && (
        <SheetView key={sheet.hot} onClose={closeSheet} label={PINS.find((p) => p.id === sheet.hot)!.label}>
          {sheet.kind === 'sky' ? (
            <SkyPanel now={skyNow} onReplay={() => sky.current?.replay(60)} onOpen={() => openOs('marmotsat')} />
          ) : (
            <SheetApp app={sheet.app} anchor={sheet.anchor} base={base} onApp={(a) => setSheet({ ...sheet, app: a })} />
          )}
          {sheet.kind === 'app' && (
            <button type="button" className="w1-btn w1-btn--ghost w1-sheet__more" onClick={() => openOs(sheet.app)}>
              Open this on the screen <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
        </SheetView>
      )}

      <OS
        id="w1-os"
        base={base}
        app={os.app}
        phase={os.phase === 'out' ? 'closed' : os.phase}
        rect={rect}
        onApp={(a) => setOs((o) => ({ ...o, app: a }))}
        onClose={closeOs}
        sky={skyNow}
      />
    </div>
  )
}

function skyLine(n: SkyNow) {
  if (n.replay) return `Replaying the next pass ×${Math.round(n.replay.speed)}`
  if (n.pass) return `Overhead now · ${Math.round(n.el)}° up`
  const p = n.next[0]
  if (!p) return 'No pass in the next day'
  const mins = Math.round((p.aos - Date.now()) / 60e3)
  return `Next pass in ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`}`
}

function SheetView({ children, onClose, label }: { children: ReactNode; onClose: () => void; label: string }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <aside className="w1-sheet" ref={ref} tabIndex={-1} aria-label={label} role="dialog">
      <div className="w1-sheet__bar">
        <p className="w1-kicker">{label}</p>
        <button type="button" className="w1-iconbtn" onClick={onClose} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="w1-sheet__body">{children}</div>
    </aside>
  )
}

function SheetApp({ app, anchor, base, onApp }: { app: AppId; anchor?: string; base: string; onApp: (a: AppId) => void }) {
  const V = APP_VIEW[app]
  useEffect(() => {
    if (anchor) requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ block: 'start' }))
  }, [anchor])
  return <V base={base} open={(a) => onApp(a)} />
}

export { APPS }
