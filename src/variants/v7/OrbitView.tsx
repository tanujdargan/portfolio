import { useEffect, useRef, useState } from 'react'
import { useMotionPrefs } from '../../lib/motion'
import { composedTime, ALT_KM, EPOCH, INC_DEG, NORAD, PERIOD_MIN, SimClock, VIC, elevation, fmtDur, fmtLat, fmtLon, fmtUtc, nextPass, state, type Pass } from './kepler'
import type { SceneApi } from './scene'
import { beep } from './signal'

// Orbit speed scales with the lab's motion level; reduced motion freezes one composed frame.
export const WARP = { subtle: 20, default: 90, expressive: 360 } as const

/** A shared clock so the HUD, console and scene agree on "now". Created on the client only. */
let clockSingleton: SimClock | null = null
export const getClock = () => (clockSingleton ??= new SimClock(Date.now()))

type Status = 'poster' | 'live' | 'static'

/** Static orbit schematic: the SSR poster, the no-WebGL fallback, and deterministic (no clock) so it hydrates cleanly. */
function Schematic() {
  // orthographic Earth, tilted 22°; orbit plane inclined 97.75°, seen edge-on-ish
  const R = 150, cx = 200, cy = 200
  const tilt = (22 * Math.PI) / 180
  const lines: string[] = []
  for (let lat = -60; lat <= 60; lat += 30) {
    const la = (lat * Math.PI) / 180
    const ry = R * Math.cos(la) * Math.sin(tilt)
    lines.push(`M ${cx - R * Math.cos(la)} ${cy - R * Math.sin(la) * Math.cos(tilt)} a ${R * Math.cos(la)} ${Math.abs(ry)} 0 0 0 ${2 * R * Math.cos(la)} 0`)
  }
  const mer: string[] = []
  for (let lon = -60; lon <= 60; lon += 30) {
    const rx = Math.abs(R * Math.sin((lon * Math.PI) / 180))
    mer.push(`M ${cx} ${cy - R} a ${rx} ${R} 0 0 ${lon < 0 ? 0 : 1} 0 ${2 * R}`)
  }
  const oR = R * (1 + ALT_KM / 6378)
  return (
    <svg className="v7-schem" viewBox="0 0 400 400" role="img" aria-label="Schematic of MarmotSat's near-polar orbit around Earth">
      <defs>
        <radialGradient id="v7-g-earth" cx="38%" cy="36%" r="70%">
          <stop offset="0" stopColor="#15222b" />
          <stop offset="0.62" stopColor="#0b1116" />
          <stop offset="1" stopColor="#06090b" />
        </radialGradient>
        <linearGradient id="v7-g-night" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.52" stopColor="#040506" stopOpacity="0" />
          <stop offset="0.6" stopColor="#040506" stopOpacity="0.78" />
        </linearGradient>
        <clipPath id="v7-c-earth">
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={R + 3} fill="none" stroke="#6fa8ff" strokeOpacity="0.22" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={R + 8} fill="none" stroke="#6fa8ff" strokeOpacity="0.06" strokeWidth="6" />
      <circle cx={cx} cy={cy} r={R} fill="url(#v7-g-earth)" />
      <g clipPath="url(#v7-c-earth)" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.8">
        {lines.map((d) => (
          <path key={d} d={d} />
        ))}
        {mer.map((d) => (
          <path key={d} d={d} />
        ))}
        <rect x={cx - R} y={cy - R} width={2 * R} height={2 * R} fill="url(#v7-g-night)" stroke="none" />
        <line x1={cx + R * 0.13} y1={cy - R} x2={cx + R * 0.21} y2={cy + R} stroke="var(--accent)" strokeOpacity="0.45" strokeWidth="1.2" />
      </g>
      {/* orbit: a near-polar ellipse, the far half dashed behind the planet */}
      <g transform={`rotate(-14 ${cx} ${cy})`} fill="none" stroke="var(--accent)">
        <path d={`M ${cx} ${cy - oR} a ${oR * 0.34} ${oR} 0 0 1 0 ${2 * oR}`} strokeOpacity="0.8" strokeWidth="1.3" />
        <path d={`M ${cx} ${cy + oR} a ${oR * 0.34} ${oR} 0 0 1 0 ${-2 * oR}`} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 5" />
        <circle cx={cx + oR * 0.34 * Math.sin(0.9)} cy={cy - oR * Math.cos(0.9)} r="4.5" fill="var(--accent)" stroke="none" />
        <circle cx={cx + oR * 0.34 * Math.sin(0.9)} cy={cy - oR * Math.cos(0.9)} r="10" strokeOpacity="0.6" />
      </g>
      <circle cx={cx - R * 0.46} cy={cy - R * 0.52} r="3.5" fill="var(--ok)" />
      <text x={cx - R * 0.46 + 8} y={cy - R * 0.52 - 6} className="v7-schem__t">
        VIC
      </text>
    </svg>
  )
}

export function Orbit() {
  const m = useMotionPrefs()
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const api = useRef<SceneApi | null>(null)
  const [status, setStatus] = useState<Status>('poster')
  const [warp, setWarpState] = useState<number | 'live'>(WARP.default)
  const userWarp = useRef(false)
  const hud = useRef<Record<string, HTMLElement | null>>({})
  const reducedRef = useRef(m.reduced)
  reducedRef.current = m.reduced

  // motion level → default warp (unless the user picked one)
  useEffect(() => {
    if (userWarp.current) return
    const w = WARP[m.level]
    setWarpState(w)
    getClock().set(Date.now(), w)
  }, [m.level])

  useEffect(() => {
    const c = getClock()
    // reduced motion: one composed frame (daylight, terminator in view), no ticking
    c.freeze(Date.now(), m.reduced, m.reduced ? composedTime(c.now(Date.now())) : undefined)
    api.current?.setReduced(m.reduced)
  }, [m.reduced])

  // HUD: direct text writes at 4 Hz (never a React render per tick). Reduced motion writes once.
  useEffect(() => {
    let pass: Pass | null = null
    let passAt = -Infinity
    let wasIn = false
    const set = (k: string, v: string) => {
      const el = hud.current[k]
      if (el && el.textContent !== v) el.textContent = v
    }
    const tick = () => {
      const now = getClock().now(Date.now())
      const s = state(now)
      set('lat', fmtLat(s.lat))
      set('lon', fmtLon(s.lon))
      set('alt', `${s.alt.toFixed(0)} km`)
      set('utc', fmtUtc(now))
      set('sun', s.sunlit ? 'SUNLIT' : 'ECLIPSE')
      if (!pass || now > pass.los || Math.abs(now - passAt) > 6 * 3600000) {
        pass = nextPass(now)
        passAt = now
      }
      const el = elevation(s.ecef)
      const inView = el > 0
      if (inView && !wasIn) beep('lock')
      wasIn = inView
      set('pass', inView ? `IN VIEW · EL ${el.toFixed(0)}°` : pass ? `AOS IN ${fmtDur(pass.aos - now)}` : 'NO PASS 36H')
      set('max', pass ? `MAX EL ${pass.maxEl.toFixed(0)}°` : '')
      wrap.current?.toggleAttribute('data-aos', inView)
      set('age', `${Math.max(0, (Date.now() - EPOCH) / 86400000).toFixed(1)} d`)
    }
    tick()
    if (m.reduced) return
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [m.reduced, warp])

  // WebGL after first paint, in its own chunk; the schematic stays if anything fails.
  useEffect(() => {
    let dead = false
    let io: IntersectionObserver | null = null
    let onVis: (() => void) | null = null
    let ro: ResizeObserver | null = null
    const start = async () => {
      try {
        const probe = document.createElement('canvas')
        if (!probe.getContext('webgl2') && !probe.getContext('webgl')) throw new Error('no WebGL')
        const cs = getComputedStyle(wrap.current!)
        const { createScene } = await import('./scene')
        if (dead) return
        const made = await createScene({
          canvas: canvas.current!,
          clock: getClock(),
          landUrl: '/v7/land.png',
          colors: {
            accent: cs.getPropertyValue('--accent').trim() || '#ffb547',
            ink: cs.getPropertyValue('--fg').trim() || '#e6ebe8',
            ok: cs.getPropertyValue('--ok').trim() || '#7be0a0',
            bg: cs.getPropertyValue('--bg').trim() || '#080a0b',
          },
          reduced: reducedRef.current,
          onReady: () => !dead && setStatus('live'),
          onLost: () => !dead && setStatus('static'),
        })
        if (dead) return made.dispose()
        api.current = made
        let onScreen = false
        const sync = () => made.setRunning(onScreen && !document.hidden)
        io = new IntersectionObserver(([e]) => {
          onScreen = e.isIntersecting
          sync()
        })
        io.observe(wrap.current!)
        onVis = sync
        document.addEventListener('visibilitychange', onVis)
        ro = new ResizeObserver(() => made.resize())
        ro.observe(canvas.current!)
      } catch (e) {
        if (!dead) setStatus('static')
        console.warn('[v7] orbit view is static:', e)
      }
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void }
    let idle = 0
    const raf = requestAnimationFrame(() => {
      idle = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 1200 }) : window.setTimeout(start, 150)
    })
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle)
      else clearTimeout(idle)
      io?.disconnect()
      ro?.disconnect()
      if (onVis) document.removeEventListener('visibilitychange', onVis)
      api.current?.dispose()
      api.current = null
    }
  }, [])

  const pick = (w: number | 'live') => {
    userWarp.current = true
    setWarpState(w)
    const c = getClock()
    if (w === 'live') c.live(Date.now())
    else c.set(Date.now(), w)
    beep('cmd')
    api.current?.kick()
  }
  // console hook: `/warp 600`, `/warp live`
  useEffect(() => {
    const on = (e: Event) => pick((e as CustomEvent<number | 'live'>).detail)
    addEventListener('v7:warp', on)
    return () => removeEventListener('v7:warp', on)
  })

  const r = (k: string) => (el: HTMLElement | null) => {
    hud.current[k] = el
  }
  const warps: (number | 'live')[] = ['live', WARP.default, 600]

  return (
    <div className="v7-orbit" ref={wrap} data-status={status}>
      <div className="v7-orbit__stage">
        <Schematic />
        <canvas ref={canvas} className="v7-orbit__gl" aria-hidden="true" />
        <div className="v7-hud v7-hud--tl">
          <span className="v7-lbl">MARMOTSAT · NORAD {NORAD}</span>
          <span className="v7-hud__big">
            <span ref={r('lat')}>—</span> <span ref={r('lon')}>—</span>
          </span>
          <span className="v7-lbl">
            ALT <b ref={r('alt')}>{ALT_KM.toFixed(0)} km</b> · INC <b>{INC_DEG.toFixed(2)}°</b> · T <b>{PERIOD_MIN.toFixed(1)} min</b>
          </span>
        </div>
        <div className="v7-hud v7-hud--tr">
          <span className="v7-lbl">
            {m.reduced ? 'FROZEN' : warp === 'live' ? 'LIVE' : `SIM ×${warp}`} · UTC
          </span>
          <span className="v7-hud__big" ref={r('utc')}>
            --:--:--
          </span>
          <span className="v7-lbl v7-hud__sun" ref={r('sun')}>
            —
          </span>
        </div>
        <div className="v7-hud v7-hud--bl">
          <span className="v7-lbl">
            <i className="v7-led v7-led--ok" /> PASS · {VIC.name.toUpperCase()}
          </span>
          <span className="v7-hud__big v7-hud__pass" ref={r('pass')}>
            —
          </span>
          <span className="v7-lbl" ref={r('max')} />
        </div>
      </div>
      <div className="v7-orbit__bar">
        <div className="v7-seg" role="group" aria-label="Orbit time warp">
          {warps.map((w) => (
            <button key={String(w)} type="button" aria-pressed={warp === w} onClick={() => pick(w)} disabled={m.reduced}>
              {w === 'live' ? 'LIVE' : `×${w}`}
            </button>
          ))}
        </div>
        <p className="v7-orbit__note">
          Real elements (SatNOGS, TLE age <span ref={r('age')}>—</span>), simplified propagation: position is approximate.
          {status === 'static' && ' Static view: WebGL unavailable.'}
        </p>
      </div>
    </div>
  )
}
