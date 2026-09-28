import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMotionPrefs } from '../lib/motion'
import { Frame, Seg } from './Frame'
import { FlatMap } from './orbit/FlatMap'
import type { GlobeApi, RGB } from './orbit/globe'
import './orbit.css'
import {
  BUILD_TLE,
  CALLSIGN,
  MASK_DEG,
  NORAD,
  RE,
  Sat,
  SimClock,
  TrackCache,
  compass,
  fmtAge,
  fmtDur,
  fmtLat,
  fmtLon,
  fmtUtc,
  fmtVic,
  loadTle,
  type Pass,
  type TleResult,
} from './orbit/model'

// Live MarmotSat tracker: CelesTrak TLE → SGP4 (satellite.js) in the browser → a three.js globe, or an SVG map
// when WebGL isn't there. Readouts are written straight to the DOM a few times a second, never via React renders.

const LAND = '/orbit/land.png'
type Warp = 1 | 60 | 600
const WARP_BY_LEVEL = { subtle: 1, default: 60, expressive: 600 } as const
type Mode = 'loading' | 'gl' | 'flat'

/** Resolve a CSS colour (tokens, color-mix, oklch…) to sRGB 0–1 by painting one pixel. */
function resolveColors(host: HTMLElement) {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  host.appendChild(probe)
  const cv = document.createElement('canvas')
  cv.width = cv.height = 1
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  const get = (v: string, fb: RGB): RGB => {
    probe.style.color = `var(${v})`
    const c = getComputedStyle(probe).color
    if (!ctx || !c) return fb
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#000'
    ctx.fillStyle = c
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    return [d[0] / 255, d[1] / 255, d[2] / 255]
  }
  const out = {
    accent: get('--d-accent', [0.62, 0.8, 1]),
    fg: get('--d-fg', [0.93, 0.93, 0.93]),
    fg2: get('--d-fg2', [0.63, 0.63, 0.65]),
    bg: get('--d-bg', [0.075, 0.075, 0.08]),
  }
  probe.remove()
  return out
}

/** 1h 04m 09s · 4m 09s · 9s */
function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    x = s % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}h ${p(m)}m ${p(x)}s` : m ? `${m}m ${p(x)}s` : `${x}s`
}

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function OrbitDemo({ compact, hero }: { compact?: boolean; hero?: boolean }) {
  const m = useMotionPrefs()
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const satLabel = useRef<HTMLSpanElement>(null)
  const vicLabel = useRef<HTMLSpanElement>(null)
  const out = useRef<Record<string, HTMLElement | null>>({})
  const globe = useRef<GlobeApi | null>(null)
  const clock = useRef<SimClock | null>(null)
  clock.current ??= new SimClock()

  const [tle, setTle] = useState<TleResult | null>(null) // null while the CelesTrak request is in flight
  const sat = useMemo(() => new Sat((tle ?? BUILD_TLE).tle), [tle])
  const cache = useMemo(() => new TrackCache(sat), [sat])
  const [warp, setWarp] = useState<Warp>(60)
  const userWarp = useRef(false)
  const [passes, setPasses] = useState<Pass[]>([])
  const [mode, setMode] = useState<Mode>('loading')
  const [flatTick, setFlatTick] = useState(0)
  const [visible, setVisible] = useState(false)

  // refs the render loop and ticker read without re-subscribing
  const live = useRef({ sat, cache, passes, warp, reduced: m.reduced })
  live.current = { sat, cache, passes, warp, reduced: m.reduced }

  // ---------- data ----------
  useEffect(() => {
    let dead = false
    loadTle().then((r) => !dead && setTle(r))
    return () => {
      dead = true
    }
  }, [])

  const refreshPasses = useCallback(() => {
    const t = clock.current!.now()
    const ps = live.current.sat.passes(t, 4, 48)
    live.current.passes = ps
    setPasses(ps)
    return ps
  }, [])
  useEffect(() => {
    refreshPasses()
  }, [sat, refreshPasses])

  // the next pass drawn on the globe
  const arc = useMemo(() => {
    const p = passes[0]
    if (!p) return []
    const min = (p.los - p.aos) / 60e3
    return sat.track(p.aos, 0, min, Math.max(8, Math.ceil(min * 6)))
  }, [passes, sat])
  useEffect(() => {
    globe.current?.setPassArc(arc)
  }, [arc, mode])

  // ---------- time ----------
  useEffect(() => {
    if (userWarp.current) return
    const w: Warp = m.reduced ? 1 : WARP_BY_LEVEL[m.level]
    setWarp(w)
    if (w === 1) clock.current!.live()
    else clock.current!.set(w)
  }, [m.level, m.reduced])
  useEffect(() => {
    globe.current?.setReduced(m.reduced)
  }, [m.reduced])

  const pickWarp = (w: Warp) => {
    userWarp.current = true
    setWarp(w)
    if (w === 1) clock.current!.live()
    else clock.current!.set(w)
    refreshPasses()
    globe.current?.kick()
  }
  const jump = () => {
    const now = clock.current!.now()
    const p = live.current.passes.find((x) => x.aos > now + 30e3) ?? live.current.sat.passes(now + 60e3, 1, 48)[0]
    if (!p) return
    userWarp.current = true
    const w: Warp = m.reduced ? 1 : 60
    setWarp(w)
    clock.current!.jump(p.aos - 90e3, w)
    refreshPasses()
    if (m.reduced) globe.current?.snap()
    globe.current?.kick()
  }

  // ---------- visibility: pause everything offscreen or in a hidden tab ----------
  useEffect(() => {
    const el = root.current!
    let on = false
    const sync = () => setVisible(on && !document.hidden)
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting
      sync()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', sync)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])
  useEffect(() => {
    globe.current?.setRunning(visible)
    if (mode === 'flat' && globe.current) {
      globe.current.dispose() // context lost: the map takes over
      globe.current = null
    }
  }, [visible, mode])

  // ---------- readouts: 4 Hz, 1 Hz under reduced motion ----------
  useEffect(() => {
    if (!visible) return
    const set = (k: string, v: string) => {
      const el = out.current[k]
      if (el && el.textContent !== v) el.textContent = v
    }
    const tick = () => {
      const c = clock.current!
      const t = c.now()
      const L = live.current
      const s = L.sat.state(t)
      if (!s) {
        set('lat', 'no solution')
        return
      }
      set('lat', fmtLat(s.lat))
      set('lon', fmtLon(s.lon))
      set('alt', `${s.alt.toFixed(0)} km`)
      set('spd', `${s.speed.toFixed(2)} km/s`)
      set('sun', s.sunlit ? 'Sunlit' : 'Eclipse')
      set('utc', fmtUtc(t))
      const off = t - Date.now()
      set('mode', L.warp === 1 && Math.abs(off) < 5e3 ? 'Live' : `Sim ×${L.warp} · ${off >= 0 ? '+' : '−'}${fmtDur(Math.abs(off))}`)
      let p = L.passes[0]
      if (p && t > p.los) p = refreshPasses()[0]
      const inView = !!p && t >= p.aos && t <= p.los
      root.current?.toggleAttribute('data-inview', inView)
      if (!p) {
        set('cd', 'None in 48 h')
        set('cdk', 'Next pass')
      } else if (inView) {
        set('cdk', 'Overhead now')
        set('cd', `el ${Math.max(MASK_DEG, s.el).toFixed(0)}° · LOS ${fmtDur(p.los - t)}`)
      } else {
        set('cdk', 'Next pass in')
        set('cd', countdown(p.aos - t))
      }
      if (L.reduced) globe.current?.kick()
    }
    tick()
    const id = setInterval(tick, m.reduced ? 1000 : 250)
    // the SVG fallback re-renders once a second
    const fid = mode === 'flat' ? setInterval(() => setFlatTick((n) => n + 1), 1000) : 0
    return () => {
      clearInterval(id)
      clearInterval(fid)
    }
  }, [visible, m.reduced, mode, refreshPasses, sat])

  // ---------- WebGL globe: after first paint, in its own chunk ----------
  useEffect(() => {
    let dead = false
    let ro: ResizeObserver | null = null
    const start = async () => {
      if (dead) return
      if (!hasWebGL()) return setMode('flat')
      try {
        const colors = resolveColors(root.current!.querySelector('.orbit') as HTMLElement)
        const { createGlobe } = await import('./orbit/globe')
        if (dead) return
        const g = await createGlobe({
          canvas: canvas.current!,
          labels: { sat: satLabel.current, vic: vicLabel.current },
          landUrl: LAND,
          colors,
          reduced: live.current.reduced,
          sample: () => {
            const L = live.current
            const t = clock.current!.now()
            const s = L.sat.state(t)
            if (!s) return null
            const r = Math.hypot(...s.ecef)
            const mk = (MASK_DEG * Math.PI) / 180
            return {
              sat: s.ecef,
              ahead: L.sat.ecef(t + 30e3),
              sun: s.sun,
              inView: s.el >= MASK_DEG,
              cosLam: Math.cos(Math.acos((RE / r) * Math.cos(mk)) - mk),
              ms: t,
              track: L.cache.around(t),
              park: L.warp === 600 && !L.reduced,
            }
          },
          onReady: () => !dead && setMode('gl'),
          onLost: () => !dead && setMode('flat'),
        })
        if (dead) return g.dispose()
        globe.current = g
        ro = new ResizeObserver(() => g.resize())
        ro.observe(canvas.current!)
      } catch (e) {
        console.warn('[orbit] globe unavailable, using the map:', e)
        if (!dead) setMode('flat')
      }
    }
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    const idle = w.requestIdleCallback ? w.requestIdleCallback(() => void start(), { timeout: 1500 }) : window.setTimeout(() => void start(), 120)
    return () => {
      dead = true
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle)
      else clearTimeout(idle)
      ro?.disconnect()
      globe.current?.dispose()
      globe.current = null
    }
  }, [])

  // ---------- render ----------
  const r = (k: string) => (el: HTMLElement | null) => {
    out.current[k] = el
  }
  const epochAge = Date.now() - sat.epoch
  const src =
    tle === null
      ? 'build-time copy while CelesTrak answers'
      : tle.source === 'celestrak'
        ? 'CelesTrak, fetched just now'
        : tle.source === 'session'
          ? `CelesTrak, fetched ${fmtAge(Date.now() - tle.fetchedAt)} ago (browser copy)`
          : `build-time copy from ${new Date(tle.fetchedAt).toISOString().slice(0, 10)}${tle.note ? ` (CelesTrak: ${tle.note})` : ''}`

  const flat = useMemo(() => {
    if (mode !== 'flat') return null
    const t = clock.current!.now()
    const s = sat.state(t)
    if (!s) return null
    const rr = Math.hypot(...s.ecef)
    const mk = (MASK_DEG * Math.PI) / 180
    const tr = cache.around(t)
    return {
      sub: s.ecef.map((v) => v / rr) as [number, number, number],
      lam: Math.acos((RE / rr) * Math.cos(mk)) - mk,
      track: tr.pts,
      times: tr.times,
      now: t,
      inView: s.el >= MASK_DEG,
    }
  }, [mode, sat, cache, flatTick, warp]) // flatTick drives the 1 Hz refresh

  const next = passes[0]
  return (
    <div ref={root}>
      <Frame
        title={hero ? 'MarmotSat, live: the CubeSat whose onboard-computer firmware I led' : 'MarmotSat, live'}
        provenance={['real']}
        controls={
          <>
            <Seg
              label="Simulation speed"
              value={String(warp) as '1' | '60' | '600'}
              options={[
                { value: '1', label: 'Live' },
                { value: '60', label: '×60' },
                { value: '600', label: '×600' },
              ]}
              onChange={(v) => pickWarp(+v as Warp)}
            />
            <button type="button" className="demo-btn" onClick={jump} disabled={!passes.length}>
              Jump to next pass
            </button>
          </>
        }
        caption={
          <>
            <b>Real:</b> MarmotSat's position from public TLEs, propagated with SGP4 in your browser.
          </>
        }
        more={
          <>
            MarmotSat is UVic's CubeSat; I led its onboard-computer firmware. Launched 7 July 2026 on a SpaceX Falcon 9 (NORAD {NORAD}, callsign {CALLSIGN}). TLEs
            come from CelesTrak; passes use a {MASK_DEG}° elevation mask at Victoria. TLE error grows with age, so pass times are good to seconds, not better.
          </>
        }
      >
        <div className="orbit" data-compact={compact || undefined} data-mode={mode}>
          <div className="orbit__grid">
            <div
              className="orbit__stage"
              role={mode === 'flat' ? undefined : 'img'}
              aria-label={
                mode === 'flat' ? undefined : "Globe showing MarmotSat's position, its ground track one orbit either side, its footprint and Victoria, BC."
              }
            >
              {mode === 'flat' && flat ? (
                <FlatMap {...flat} arc={arc} landUrl={LAND} />
              ) : (
                <>
                  <canvas ref={canvas} className="orbit__gl" aria-hidden="true" />
                  <span ref={satLabel} className="orbit__label orbit__label--sat" hidden aria-hidden="true">
                    MarmotSat
                  </span>
                  <span ref={vicLabel} className="orbit__label" hidden aria-hidden="true">
                    Victoria
                  </span>
                </>
              )}
              <span className="orbit__chip" ref={r('mode')} aria-hidden="true">
                Live
              </span>
              {mode === 'gl' && (
                <span className="orbit__hint" aria-hidden="true">
                  Drag to rotate
                </span>
              )}
            </div>

            <div className="orbit__side">
              <dl className="orbit__read">
                <div>
                  <dt>Position</dt>
                  <dd>
                    <span ref={r('lat')}>—</span> <span ref={r('lon')} />
                  </dd>
                </div>
                <div>
                  <dt>Altitude</dt>
                  <dd ref={r('alt')}>—</dd>
                </div>
                <div>
                  <dt>Speed</dt>
                  <dd ref={r('spd')}>—</dd>
                </div>
                <div>
                  <dt>Light</dt>
                  <dd ref={r('sun')}>—</dd>
                </div>
                <div>
                  <dt>UTC</dt>
                  <dd ref={r('utc')}>—</dd>
                </div>
              </dl>

              <div className="orbit__pass">
                <div className="orbit__k">
                  <span ref={r('cdk')}>Next pass in</span> <span className="orbit__vic">· Victoria, ≥{MASK_DEG}°</span>
                </div>
                <div className="orbit__cd" ref={r('cd')}>
                  —
                </div>
                {next && (
                  <div className="orbit__pmeta">
                    AOS <b>{fmtVic(next.aos, true)}</b> · {fmtUtc(next.aos).slice(0, 5)} UTC
                    <br />
                    Max <b>{next.maxEl.toFixed(0)}°</b> · <b>{fmtDur(next.los - next.aos)}</b> · {compass(next.aosAz)} → {compass(next.losAz)}
                  </div>
                )}
              </div>

              {passes.length > 1 && (
                <table className="orbit__table">
                  <caption>Following passes</caption>
                  <thead>
                    <tr>
                      <th scope="col">AOS (Victoria)</th>
                      <th scope="col">Max el</th>
                      <th scope="col">Length</th>
                      <th scope="col">Track</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passes.slice(1).map((p) => (
                      <tr key={p.aos}>
                        <td>{fmtVic(p.aos, true)}</td>
                        <td>{p.maxEl.toFixed(0)}°</td>
                        <td>{fmtDur(p.los - p.aos)}</td>
                        <td>
                          {compass(p.aosAz)}→{compass(p.losAz)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <p className="orbit__src">
                TLE: {src}. Epoch {new Date(sat.epoch).toISOString().slice(5, 16).replace('T', ' ')} UTC, {fmtAge(epochAge)} old. Inclination{' '}
                {sat.incDeg.toFixed(2)}
                °, period {sat.periodMin.toFixed(1)} min.
              </p>
            </div>
          </div>
        </div>
      </Frame>
    </div>
  )
}
