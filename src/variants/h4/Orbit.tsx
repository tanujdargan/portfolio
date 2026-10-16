import { useEffect, useMemo, useRef, useState } from 'react'
import type { Pass, Sat as SatT, TleResult, V3 } from '../../demos/orbit/model'
import { Badge } from './Panel'
import { useAwake } from './util'

// MarmotSat's real position on a flat ground track: public TLE → SGP4 in the browser. The SGP4 code (satellite.js)
// is a separate chunk, fetched on idle after first paint. Every number on this panel comes from MarmotSat's own
// elements; nothing here is a decorative clock or coordinate.

type Model = typeof import('../../demos/orbit/model')
type View = 'now' | 'pass' | 'track'
const VIEWS: { v: View; label: string }[] = [
  { v: 'now', label: 'Now' },
  { v: 'pass', label: 'Next pass' },
  { v: 'track', label: 'Ground track' },
]
const VIC = { lat: 48.4284, lon: -123.3656 }
const RE = 6378.137
const MASK = (10 * Math.PI) / 180
const DEG = 180 / Math.PI

const ll = (p: V3): [number, number] => [Math.atan2(p[1], p[0]) * DEG, Math.asin(Math.max(-1, Math.min(1, p[2]))) * DEG]
const X = (lon: number) => lon + 180
const Y = (lat: number) => 90 - lat
function path(pts: [number, number][]) {
  let d = ''
  let prev: [number, number] | null = null
  for (const p of pts) {
    d += `${!prev || Math.abs(p[0] - prev[0]) > 180 ? 'M' : 'L'}${X(p[0]).toFixed(2)} ${Y(p[1]).toFixed(2)}`
    prev = p
  }
  return d
}
function circle(c: V3, lam: number, n = 72): [number, number][] {
  const h = Math.hypot(c[0], c[1]) || 1
  const e1: V3 = [-c[1] / h, c[0] / h, 0]
  const e2: V3 = [c[1] * e1[2] - c[2] * e1[1], c[2] * e1[0] - c[0] * e1[2], c[0] * e1[1] - c[1] * e1[0]]
  const cl = Math.cos(lam),
    sl = Math.sin(lam)
  const out: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 2 * Math.PI,
      ct = Math.cos(t),
      st = Math.sin(t)
    out.push(ll([c[0] * cl + (e1[0] * ct + e2[0] * st) * sl, c[1] * cl + (e1[1] * ct + e2[1] * st) * sl, c[2] * cl + (e1[2] * ct + e2[2] * st) * sl]))
  }
  return out
}
function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : m ? `${m} min` : 'under a minute'
}

export function OrbitPreview({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const awake = useAwake(ref)
  const [M, setM] = useState<Model | null>(null)
  const [tle, setTle] = useState<TleResult | null>(null)
  const [now, setNow] = useState(0)
  const [view, setView] = useState<View>('now')
  const [passes, setPasses] = useState<Pass[]>([])

  // load SGP4 after first paint, start from the build-time elements, then upgrade to fresh ones from CelesTrak
  useEffect(() => {
    let dead = false
    const go = () =>
      import('../../demos/orbit/model').then((m) => {
        if (dead) return
        setM(m)
        setTle(m.BUILD_TLE)
        setNow(Date.now())
        m.loadTle().then((r) => !dead && setTle(r))
      })
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 1200 })
    else setTimeout(go, 200)
    return () => {
      dead = true
    }
  }, [])

  // data is the only thing that moves: 1 Hz while on screen, every 10 s under reduced motion, asleep otherwise
  useEffect(() => {
    if (!M || !awake) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), reduced ? 10_000 : 1000)
    return () => clearInterval(id)
  }, [M, awake, reduced])

  const sat: SatT | null = useMemo(() => (M && tle ? new M.Sat(tle.tle) : null), [M, tle])
  const passOver = passes[0] ? now > passes[0].los : true
  useEffect(() => {
    if (sat && passOver) setPasses(sat.passes(Date.now(), 5, 48))
  }, [sat, passOver])

  const st = sat && now ? sat.state(now) : null
  const bucket = Math.floor(now / 30_000)
  const longTrack = useMemo(() => (sat && bucket ? sat.track(bucket * 30_000, -sat.periodMin * 0.3, sat.periodMin * 2, 360).map(ll) : []), [sat, bucket])
  const trail = sat && st ? sat.track(now, -32, 0, 64).map(ll) : []
  const ahead = sat && st ? sat.track(now, 0, 24, 48).map(ll) : []
  const p = passes[0]
  const arc = useMemo(() => (sat && p ? sat.track(p.aos, 0, (p.los - p.aos) / 60e3, 48).map(ll) : []), [sat, p])

  // jump without sweeping across the map when the satellite crosses the antimeridian or the view changes
  const prev = useRef<{ lon: number; view: View } | null>(null)
  const jump = !!st && (!prev.current || Math.abs(st.lon - prev.current.lon) > 90 || prev.current.view !== view)
  useEffect(() => {
    if (st) prev.current = { lon: st.lon, view }
  })

  let fp = ''
  if (st) {
    const r = Math.hypot(...st.ecef)
    const lam = Math.acos((RE / r) * Math.cos(MASK)) - MASK
    fp = path(circle(st.ecef.map((v) => v / r) as V3, lam))
  }

  const inPass = !!(p && now >= p.aos && now <= p.los)
  const far = p ? p.aos - now > 20 * 3600e3 : false
  const fmt = M?.fmtVic

  // the caption pinned at the event
  let pin: { x: number; y: number; b: string; s: string } | null = null
  if (st && M) {
    const pos = `${M.fmtLat(st.lat)} ${M.fmtLon(st.lon)} · ${st.alt.toFixed(0)} km up · ${st.sunlit ? 'in sunlight' : 'in Earth’s shadow'}`
    if (view === 'now') pin = { x: st.lon, y: st.lat, b: 'MarmotSat, now', s: pos }
    else if (view === 'pass' && p && fmt)
      pin = {
        x: VIC.lon,
        y: VIC.lat,
        b: inPass ? 'Overhead Victoria now' : 'Next pass over Victoria',
        s: `${fmt(p.aos, far)} → ${fmt(p.los)} · peak ${p.maxEl.toFixed(0)}° · ${M.compass(p.aosAz)} to ${M.compass(p.losAz)}`,
      }
    else if (view === 'track' && sat) pin = { x: st.lon, y: st.lat, b: `One orbit every ${sat.periodMin.toFixed(1)} min`, s: `Inclination ${sat.incDeg.toFixed(1)}° · next two orbits drawn` }
  }
  const px = pin ? X(pin.x) / 360 : 0
  const py = pin ? Math.min(0.86, Math.max(0.14, Y(pin.y) / 180)) : 0

  const tleAge = tle && M ? M.fmtAge(Date.now() - M.tleEpoch(tle.tle.l1)) : null

  return (
    <div className="h4-pv h4-orbit">
      <div className="h4-map" ref={ref}>
        <div className="h4-map__box">
        <svg className="h4-map__svg" viewBox="0 0 360 180" role="img" aria-label={st ? `World map: MarmotSat is over ${M!.fmtLat(st.lat)}, ${M!.fmtLon(st.lon)}, ${st.alt.toFixed(0)} km up.` : 'World map with Victoria, BC marked.'}>
          <defs>
            <pattern id="h4-dots" width="2.25" height="2.25" patternUnits="userSpaceOnUse">
              <circle cx="1.125" cy="1.125" r="0.62" />
            </pattern>
            <mask id="h4-land" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="180">
              <image href="/orbit/land.png" width="360" height="180" preserveAspectRatio="none" />
            </mask>
          </defs>
          <rect className="h4-map__sea" width="360" height="180" />
          <g className="h4-map__grid">
            {[-60, -30, 0, 30, 60].map((l) => (
              <line key={`a${l}`} x1="0" x2="360" y1={Y(l)} y2={Y(l)} />
            ))}
            {[-120, -60, 0, 60, 120].map((l) => (
              <line key={`o${l}`} y1="0" y2="180" x1={X(l)} x2={X(l)} />
            ))}
          </g>
          <rect className="h4-map__land" width="360" height="180" fill="url(#h4-dots)" mask="url(#h4-land)" />
          {view === 'track' && <path className="h4-map__trk" d={path(longTrack)} />}
          {view === 'now' && fp && <path className="h4-map__fp" d={fp} />}
          {view === 'now' && <path className="h4-map__trk" d={path(ahead)} />}
          {view !== 'pass' && <path className="h4-map__past" d={path(trail)} />}
          {view === 'pass' && arc.length > 1 && <path className="h4-map__arc" d={path(arc)} />}
          <g className="h4-map__vic" transform={`translate(${X(VIC.lon)} ${Y(VIC.lat)})`}>
            <circle r="1.6" />
            {view === 'pass' && <circle className="h4-map__vring" r="5" />}
          </g>
          {st && (
            <g className="h4-map__sat" data-jump={jump || undefined} style={{ transform: `translate(${X(st.lon).toFixed(2)}px, ${Y(st.lat).toFixed(2)}px)` }}>
              <circle className="h4-map__halo" r="5" />
              <circle r="2.1" />
            </g>
          )}
        </svg>
        {pin && (
          <div
            key={view}
            className="h4-pin"
            data-jump={jump || undefined}
            aria-hidden="true"
            style={{
              left: `${(px * 100).toFixed(2)}%`,
              top: `${(py * 100).toFixed(2)}%`,
              transform: `translate(${px > 0.55 ? 'calc(-100% - 12px)' : '12px'}, ${py > 0.5 ? 'calc(-100% - 10px)' : '10px'})`,
            }}
          >
            <b>{pin.b}</b>
            <span className="mono">{pin.s}</span>
          </div>
        )}
        </div>
      </div>
      {pin && (
        <p className="h4-orbit__mcap">
          <b>{pin.b}</b> · <span className="mono">{pin.s}</span>
        </p>
      )}
      <div className="h4-orbit__ctl">
        <div className="h4-chips" role="group" aria-label="Map view">
          {VIEWS.map((x) => (
            <button key={x.v} type="button" className="h4-chip" aria-pressed={view === x.v} onClick={() => setView(x.v)}>
              {x.label}
            </button>
          ))}
        </div>
        <Badge k="live">
          Real data{tleAge ? ` · TLE ${tleAge} old` : ''}
        </Badge>
      </div>
      <div className="h4-orbit__event" aria-live="polite">
        {!p || !fmt ? (
          <strong>Computing the next pass over Victoria from MarmotSat’s public orbit…</strong>
        ) : inPass ? (
          <>
            <strong>
              Overhead Victoria <em>now</em>
            </strong>
            <span>
              peak {p.maxEl.toFixed(0)}° at {fmt(p.tca)} · until {fmt(p.los)}
            </span>
          </>
        ) : (
          <>
            <strong>
              Next pass over Victoria <em>{fmt(p.aos, far)}</em>
            </strong>
            <span>
              in {countdown(p.aos - now)} · peak {p.maxEl.toFixed(0)}° above the horizon
            </span>
          </>
        )}
      </div>
      {passes.length > 1 && fmt && M && (
        <table className="h4-passes">
          <caption className="h4-sr">Upcoming passes over Victoria, BC</caption>
          <thead>
            <tr>
              <th scope="col">Next passes over Victoria</th>
              <th scope="col">Peak</th>
              <th scope="col">Above 10°</th>
              <th scope="col">Track</th>
            </tr>
          </thead>
          <tbody>
            {passes.slice(0, 3).map((x) => (
              <tr key={x.aos}>
                <td>{fmt(x.aos, true)}</td>
                <td>{x.maxEl.toFixed(0)}°</td>
                <td>{Math.max(1, Math.round((x.los - x.aos) / 60e3))} min</td>
                <td>
                  {M.compass(x.aosAz)} → {M.compass(x.losAz)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
