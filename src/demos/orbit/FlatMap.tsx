// No-WebGL fallback: an equirectangular map with the ground track, footprint, Victoria and the current position.
import { VIC, type V3 } from './model'

const DEG = 180 / Math.PI
const ll = (p: V3): [number, number] => [Math.atan2(p[1], p[0]) * DEG, Math.asin(Math.max(-1, Math.min(1, p[2]))) * DEG]
const X = (lon: number) => lon + 180
const Y = (lat: number) => 90 - lat

/** Polyline path in map coordinates, split wherever it crosses the antimeridian. */
function path(pts: [number, number][]) {
  let d = ''
  let prev: [number, number] | null = null
  for (const p of pts) {
    d += `${!prev || Math.abs(p[0] - prev[0]) > 180 ? 'M' : 'L'}${X(p[0]).toFixed(2)} ${Y(p[1]).toFixed(2)}`
    prev = p
  }
  return d
}

/** Small circle of angular radius `lam` (rad) around unit vector `c`, as lon/lat points. */
function circle(c: V3, lam: number, n = 90): [number, number][] {
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

export function FlatMap({
  sub,
  lam,
  track,
  times,
  now,
  arc,
  landUrl,
  inView,
}: {
  sub: V3
  lam: number
  track: V3[]
  times: number[]
  now: number
  arc: V3[]
  landUrl: string
  inView: boolean
}) {
  const past = track.filter((_, i) => times[i] <= now).map(ll)
  const next = track.filter((_, i) => times[i] >= now).map(ll)
  const [slon, slat] = ll(sub)
  return (
    <svg
      className="orbit__flat"
      viewBox="0 0 360 180"
      role="img"
      aria-label={`Map: MarmotSat is over ${Math.abs(slat).toFixed(1)}° ${slat >= 0 ? 'N' : 'S'}, ${Math.abs(slon).toFixed(1)}° ${slon >= 0 ? 'E' : 'W'}.`}
    >
      <defs>
        <pattern id="orbit-dots" width="2.4" height="2.4" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="0.62" />
        </pattern>
        <mask id="orbit-land" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="180">
          <image href={landUrl} width="360" height="180" preserveAspectRatio="none" />
        </mask>
      </defs>
      <rect className="orbit__flat-sea" width="360" height="180" />
      <g className="orbit__flat-grid">
        {[-60, -30, 0, 30, 60].map((l) => (
          <line key={`a${l}`} x1="0" x2="360" y1={Y(l)} y2={Y(l)} />
        ))}
        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((l) => (
          <line key={`o${l}`} y1="0" y2="180" x1={X(l)} x2={X(l)} />
        ))}
      </g>
      <rect className="orbit__flat-land" width="360" height="180" fill="url(#orbit-dots)" mask="url(#orbit-land)" />
      <path className="orbit__flat-fp" d={path(circle(sub, lam))} />
      <path className="orbit__flat-past" d={path(past)} />
      <path className="orbit__flat-next" d={path(next)} />
      {arc.length > 1 && <path className="orbit__flat-arc" d={path(arc.map(ll))} />}
      <g transform={`translate(${X(VIC.lon)} ${Y(VIC.lat)})`} className="orbit__flat-vic" data-on={inView || undefined}>
        <circle r="1.9" />
        <text x="3.2" y="-2.6">
          Victoria
        </text>
      </g>
      <g transform={`translate(${X(slon).toFixed(2)} ${Y(slat).toFixed(2)})`} className="orbit__flat-sat">
        <circle r="4.6" className="orbit__flat-ring" />
        <circle r="2.2" />
      </g>
    </svg>
  )
}
