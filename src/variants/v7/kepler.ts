// MarmotSat orbit, propagated in the browser. Pure math: safe at module scope and during SSR.
//
// Elements: SatNOGS DB (db.satnogs.org, MARMOTSat, NORAD 69912), TLE sourced from Space-Track, fetched 2026-09-27:
//   1 69912U 26156AV  26269.95491572  .00001352  00000-0  14245-3 0  9994
//   2 69912  97.7464 168.9431 0001450 195.2187 164.8988 14.90971907 12162
// Propagation is two-body plus J2 secular drift of the node and perigee, plus the TLE's ṅ/2 term. That is not SGP4:
// the position is approximate, and the error grows with TLE age. The UI says so next to the numbers.

export const NORAD = 69912
const DEG = Math.PI / 180
const MU = 398600.4418 // km³/s²
export const RE = 6378.137 // km
const J2 = 1.08263e-3

// epoch: 2026, day-of-year 269.95491572 (day 1 = Jan 1 00:00 UTC)
export const EPOCH = Date.UTC(2026, 0, 1) + (269.95491572 - 1) * 86400000
const INC = 97.7464 * DEG
const RAAN0 = 168.9431 * DEG
const ECC = 0.000145
const ARGP0 = 195.2187 * DEG
const M0 = 164.8988 * DEG
const REV_PER_DAY = 14.90971907
const NDOT2 = 0.00001352 // ṅ/2, rev/day²

const N = (REV_PER_DAY * 2 * Math.PI) / 86400 // rad/s
export const A = Math.cbrt(MU / (N * N)) // km
const P = (RE / A) ** 2 / (1 - ECC * ECC) ** 2
const RAAN_DOT = -1.5 * N * J2 * P * Math.cos(INC)
const ARGP_DOT = 0.75 * N * J2 * P * (5 * Math.cos(INC) ** 2 - 1)

export const INC_DEG = 97.7464
export const PERIOD_MIN = 1440 / REV_PER_DAY
export const ALT_KM = A - RE

export type V3 = [number, number, number]

const gmst = (ms: number) => {
  const jd = ms / 86400000 + 2440587.5
  return ((280.46061837 + 360.98564736629 * (jd - 2451545)) % 360) * DEG
}

/** Low-precision solar direction in ECI (unit vector). Good to ~0.01°, plenty for a terminator. */
export function sunEci(ms: number): V3 {
  const n = ms / 86400000 + 2440587.5 - 2451545
  const L = (280.46 + 0.9856474 * n) * DEG
  const g = (357.528 + 0.9856003 * n) * DEG
  const lam = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG
  const eps = (23.439 - 0.0000004 * n) * DEG
  return [Math.cos(lam), Math.cos(eps) * Math.sin(lam), Math.sin(eps) * Math.sin(lam)]
}

function elements(ms: number) {
  const dt = (ms - EPOCH) / 1000
  const dd = dt / 86400
  const M = M0 + N * dt + 2 * Math.PI * NDOT2 * dd * dd
  const raan = RAAN0 + RAAN_DOT * dt
  const argp = ARGP0 + ARGP_DOT * dt
  const nu = M + 2 * ECC * Math.sin(M) // e ≈ 1.5e-4: first-order equation of centre is exact to ~1e-8 rad
  const r = A * (1 - ECC * Math.cos(M))
  return { u: argp + nu, raan, r }
}

/** ECI position (km) for the argument of latitude u on the orbit plane at time ms. */
function planeToEci(u: number, raan: number, r: number): V3 {
  const cu = Math.cos(u), su = Math.sin(u), cO = Math.cos(raan), sO = Math.sin(raan), ci = Math.cos(INC), si = Math.sin(INC)
  return [r * (cO * cu - sO * su * ci), r * (sO * cu + cO * su * ci), r * su * si]
}

const eciToEcef = (p: V3, th: number): V3 => {
  const c = Math.cos(th), s = Math.sin(th)
  return [c * p[0] + s * p[1], -s * p[0] + c * p[1], p[2]]
}

export interface SatState {
  ms: number
  eci: V3
  ecef: V3
  lat: number // deg
  lon: number // deg
  alt: number // km
  gmst: number // rad
  sun: V3 // ECI unit
  sunlit: boolean
  /** unit vectors in ECI: along-track and orbit normal */
  along: V3
  normal: V3
}

export function state(ms: number): SatState {
  const { u, raan, r } = elements(ms)
  const eci = planeToEci(u, raan, r)
  const ahead = planeToEci(u + 0.01, raan, r)
  const along = norm([ahead[0] - eci[0], ahead[1] - eci[1], ahead[2] - eci[2]])
  const normal = norm(cross(eci, along))
  const th = gmst(ms)
  const ecef = eciToEcef(eci, th)
  const sun = sunEci(ms)
  const d = dot(eci, sun)
  const perp = Math.hypot(eci[0] - d * sun[0], eci[1] - d * sun[1], eci[2] - d * sun[2])
  return {
    ms,
    eci,
    ecef,
    lat: Math.asin(ecef[2] / r) / DEG,
    lon: Math.atan2(ecef[1], ecef[0]) / DEG,
    alt: r - RE,
    gmst: th,
    sun,
    sunlit: d > 0 || perp > RE,
    along,
    normal,
  }
}

/** The orbit ring in ECI at time ms (km). */
export function ring(ms: number, steps: number): V3[] {
  const { raan } = elements(ms)
  return Array.from({ length: steps }, (_, i) => planeToEci((i / steps) * 2 * Math.PI, raan, A))
}

/** Sub-satellite points (ECEF unit vectors) from ms+from to ms+to minutes. */
export function track(ms: number, fromMin: number, toMin: number, steps: number): V3[] {
  const out: V3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = ms + (fromMin + ((toMin - fromMin) * i) / steps) * 60000
    const { u, raan, r } = elements(t)
    const e = eciToEcef(planeToEci(u, raan, r), gmst(t))
    out.push([e[0] / r, e[1] / r, e[2] / r])
  }
  return out
}

// Observer: Victoria, BC (spherical Earth is fine at this precision)
export const VIC = { name: 'Victoria', lat: 48.4284, lon: -123.3656 }
export const VIC_ECEF: V3 = llToUnit(VIC.lat, VIC.lon)

export function llToUnit(lat: number, lon: number): V3 {
  const la = lat * DEG, lo = lon * DEG
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]
}

/** Elevation (deg) of the satellite above the observer's horizon. */
export function elevation(ecef: V3, obs: V3 = VIC_ECEF): number {
  const o: V3 = [obs[0] * RE, obs[1] * RE, obs[2] * RE]
  const d: V3 = [ecef[0] - o[0], ecef[1] - o[1], ecef[2] - o[2]]
  return Math.asin(dot(d, obs) / Math.hypot(...d)) / DEG
}

export interface Pass {
  inView: boolean
  aos: number // ms
  los: number
  maxEl: number
}

/** The current or next pass over the observer (elevation > 0°), searched up to 36 h ahead. */
export function nextPass(ms: number, obs: V3 = VIC_ECEF): Pass | null {
  const el = (t: number) => elevation(state(t).ecef, obs)
  const step = 30000
  let t = ms
  const inView = el(t) > 0
  if (inView) {
    while (el(t - step) > 0 && ms - t < 20 * 60000) t -= step
  } else {
    let n = 0
    while (el(t) <= 0) {
      t += step
      if (++n > (36 * 3600000) / step) return null
    }
  }
  // refine AOS to ~1 s
  let lo = t - step, hi = t
  for (let i = 0; i < 5; i++) {
    const mid = (lo + hi) / 2
    if (el(mid) > 0) hi = mid
    else lo = mid
  }
  const aos = hi
  let e = aos, maxEl = 0
  while (el(e) > 0) {
    maxEl = Math.max(maxEl, el(e))
    e += step / 2
  }
  return { inView, aos, los: e, maxEl }
}

export const fmtDur = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(x).padStart(2, '0')}s`
}
export const fmtLat = (v: number) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? 'N' : 'S'}`
export const fmtLon = (v: number) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? 'E' : 'W'}`
export const fmtUtc = (ms: number) => new Date(ms).toISOString().slice(11, 19)

export function dot(a: V3, b: V3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
export function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
export function norm(a: V3): V3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

/** The first moment within the next orbit where the satellite is in daylight with the terminator in frame. */
export function composedTime(ms: number): number {
  let best = ms, score = -Infinity
  for (let i = 0; i < 200; i++) {
    const t = ms + i * 30000
    const s = state(t)
    const c = dot(norm(s.eci), s.sun)
    const sc = s.sunlit ? -Math.abs(c - 0.45) : -9
    if (sc > score) {
      score = sc
      best = t
    }
    if (sc > -0.03) break
  }
  return best
}

/** A sim clock: real time scaled by warp, rebased whenever warp changes so the satellite never jumps. */
export class SimClock {
  private baseReal = 0
  private baseSim = 0
  warp = 1
  frozen = false
  constructor(now: number) {
    this.baseReal = now
    this.baseSim = now
  }
  now(real: number) {
    return this.frozen ? this.baseSim : this.baseSim + (real - this.baseReal) * this.warp
  }
  set(real: number, warp: number) {
    this.baseSim = this.now(real)
    this.baseReal = real
    this.warp = warp
  }
  live(real: number) {
    this.baseSim = real
    this.baseReal = real
    this.warp = 1
  }
  freeze(real: number, on: boolean, at?: number) {
    if (on && !this.frozen) this.baseSim = at ?? this.now(real)
    else if (!on && this.frozen) this.baseReal = real
    this.frozen = on
  }
}
