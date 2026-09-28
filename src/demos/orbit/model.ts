// MarmotSat state from a public TLE, propagated with SGP4 (satellite.js) in the browser.
// Pure functions plus a small clock; nothing here touches the DOM at import time.
import { eciToEcf, eciToGeodetic, ecfToLookAngles, gstime, jday, propagate, shadowFraction, sunPos, twoline2satrec, type SatRec } from './sgp4'
import buildTle from '../../data/tle.json'

export const NORAD = 69912
export const CALLSIGN = 'VA7UVS'
export const RE = 6378.137 // km, WGS-84 equatorial
const DEG = Math.PI / 180
export type V3 = [number, number, number]

// ---------- TLE sources ----------

export interface Tle {
  name: string
  l1: string
  l2: string
}
/** celestrak: fetched just now · session: fetched from CelesTrak earlier in this browser (< 2 h) · build: snapshot baked in at build time */
export type TleSource = 'celestrak' | 'session' | 'build'
export interface TleResult {
  tle: Tle
  source: TleSource
  fetchedAt: number
  note?: string
}

const URL_TLE = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${NORAD}&FORMAT=TLE`
const STORE_KEY = `orbit-tle-${NORAD}`
const STORE_TTL = 2 * 3600e3 // CelesTrak asks clients not to re-download unchanged GP data more often than every 2 h

/** Parse a 2- or 3-line TLE. Returns null unless both lines parse and belong to our catalogue number. */
export function parseTle(text: string): Tle | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean)
  const i = lines.findIndex((l) => l.startsWith('1 '))
  if (i < 0 || !lines[i + 1]?.startsWith('2 ')) return null
  const l1 = lines[i],
    l2 = lines[i + 1]
  if (+l1.slice(2, 7) !== NORAD || +l2.slice(2, 7) !== NORAD) return null
  const rec = twoline2satrec(l1, l2)
  if (rec.error || !Number.isFinite(rec.no) || rec.no <= 0) return null
  return { name: (i > 0 ? lines[i - 1].trim() : '') || 'MARMOTSAT', l1, l2 }
}

export const BUILD_TLE: TleResult = {
  tle: { name: buildTle.name, l1: buildTle.l1, l2: buildTle.l2 },
  source: 'build',
  fetchedAt: Date.parse(buildTle.fetchedAt),
}

/** CelesTrak first (4 s budget), then the build-time snapshot. A recent browser copy stands in for the fetch. */
export async function loadTle(timeoutMs = 4000): Promise<TleResult> {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null') as {
      l1: string
      l2: string
      name: string
      at: number
    } | null
    if (s && Date.now() - s.at < STORE_TTL) {
      const tle = parseTle(`${s.name}\n${s.l1}\n${s.l2}`)
      if (tle) return { tle, source: 'session', fetchedAt: s.at }
    }
  } catch {
    /* storage blocked or malformed: fall through to the network */
  }
  const ctl = new AbortController()
  let timer = 0
  // abort the request, and also stop waiting even if something upstream ignores the abort
  const timeout = new Promise<never>((_, rej) => {
    timer = window.setTimeout(() => {
      ctl.abort()
      rej(new Error(`no reply in ${timeoutMs / 1000} s`))
    }, timeoutMs)
  })
  try {
    const res = await Promise.race([fetch(URL_TLE, { signal: ctl.signal, cache: 'no-cache' }), timeout])
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const tle = parseTle(await Promise.race([res.text(), timeout]))
    if (!tle) throw new Error('no parsable TLE in response')
    const at = Date.now()
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ ...tle, at }))
    } catch {
      /* ignore */
    }
    return { tle, source: 'celestrak', fetchedAt: at }
  } catch (e) {
    const why = ctl.signal.aborted ? `no reply in ${timeoutMs / 1000} s` : e instanceof Error ? e.message : 'fetch failed'
    return { ...BUILD_TLE, note: why }
  } finally {
    clearTimeout(timer)
  }
}

/** TLE epoch (UTC ms) from line 1, columns 19–32: YYDDD.DDDDDDDD. */
export function tleEpoch(l1: string): number {
  const yy = +l1.slice(18, 20)
  const doy = +l1.slice(20, 32)
  const year = yy < 57 ? 2000 + yy : 1900 + yy
  return Date.UTC(year, 0, 1) + (doy - 1) * 86400e3
}

// ---------- observer ----------

export const VIC = {
  name: 'Victoria, BC',
  lat: 48.4284,
  lon: -123.3656,
  h: 0.02,
}
const VIC_GD = {
  latitude: VIC.lat * DEG,
  longitude: VIC.lon * DEG,
  height: VIC.h,
}
export const VIC_UNIT = unitLL(VIC.lat, VIC.lon)
export const MASK_DEG = 10

export function unitLL(lat: number, lon: number): V3 {
  const la = lat * DEG,
    lo = lon * DEG
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]
}

// ---------- propagation ----------

export interface SatState {
  ms: number
  /** ECEF, km */
  ecef: V3
  lat: number
  lon: number
  alt: number
  /** inertial speed, km/s */
  speed: number
  sunlit: boolean
  /** Sun direction in ECEF (unit) */
  sun: V3
  /** Victoria look angles, degrees / km */
  el: number
  az: number
  range: number
}

export interface Pass {
  aos: number
  los: number
  tca: number
  maxEl: number
  aosAz: number
  losAz: number
}

export class Sat {
  readonly rec: SatRec
  readonly epoch: number
  readonly incDeg: number
  readonly periodMin: number
  constructor(readonly tle: Tle) {
    this.rec = twoline2satrec(tle.l1, tle.l2)
    this.epoch = tleEpoch(tle.l1)
    this.incDeg = this.rec.inclo / DEG
    this.periodMin = (2 * Math.PI) / this.rec.no // rec.no is rad/min
  }

  /** ECI position/velocity and GMST, or null if SGP4 fails (decayed, bad elements). */
  private pv(ms: number) {
    const d = new Date(ms)
    const r = propagate(this.rec, d)
    if (!r || typeof r.position !== 'object') return null
    return { p: r.position, v: r.velocity, g: gstime(d), d }
  }

  ecef(ms: number): V3 | null {
    const s = this.pv(ms)
    if (!s) return null
    const e = eciToEcf(s.p, s.g)
    return [e.x, e.y, e.z]
  }

  state(ms: number): SatState | null {
    const s = this.pv(ms)
    if (!s) return null
    const e = eciToEcf(s.p, s.g)
    const gd = eciToGeodetic(s.p, s.g)
    const la = ecfToLookAngles(VIC_GD, e)
    const sp = sunPos(jday(s.d)).rsun
    const se = eciToEcf(sp, s.g)
    const sl = Math.hypot(se.x, se.y, se.z)
    let lon = gd.longitude / DEG
    lon = ((lon + 540) % 360) - 180
    return {
      ms,
      ecef: [e.x, e.y, e.z],
      lat: gd.latitude / DEG,
      lon,
      alt: gd.height,
      speed: Math.hypot(s.v.x, s.v.y, s.v.z),
      sunlit: shadowFraction(sp, s.p) < 0.5,
      sun: [se.x / sl, se.y / sl, se.z / sl],
      el: la.elevation / DEG,
      az: (la.azimuth / DEG + 360) % 360,
      range: la.rangeSat,
    }
  }

  /** Sub-satellite points (ECEF unit vectors), `n + 1` samples from ms+fromMin to ms+toMin. */
  track(ms: number, fromMin: number, toMin: number, n: number): V3[] {
    const out: V3[] = []
    for (let i = 0; i <= n; i++) {
      const e = this.ecef(ms + (fromMin + ((toMin - fromMin) * i) / n) * 60e3)
      if (!e) continue
      const r = Math.hypot(e[0], e[1], e[2])
      out.push([e[0] / r, e[1] / r, e[2] / r])
    }
    return out
  }

  /** Elevation / azimuth (deg) of the satellite from Victoria. */
  look(ms: number): { el: number; az: number; ecef: V3 } | null {
    const e = this.ecef(ms)
    if (!e) return null
    const la = ecfToLookAngles(VIC_GD, { x: e[0], y: e[1], z: e[2] })
    return {
      el: la.elevation / DEG,
      az: (la.azimuth / DEG + 360) % 360,
      ecef: e,
    }
  }

  /**
   * Passes over Victoria with elevation ≥ MASK_DEG, starting from the one in progress (if any).
   *
   * Stepping is adaptive: the step is the time the sub-satellite point needs to close the gap between its current
   * distance from Victoria and the widest possible visibility circle, at a conservative 0.085°/s (ground speed ≈ 0.064°/s
   * plus Earth rotation). A pass can't be skipped, and a 36 h search costs a few hundred SGP4 calls, not thousands.
   * AOS/LOS are then bisected to 1 s; max elevation is sampled every 5 s and refined with a parabola.
   */
  passes(fromMs: number, count: number, horizonH = 36): Pass[] {
    const out: Pass[] = []
    const end = fromMs + horizonH * 3600e3
    const el = (t: number) => this.look(t)?.el ?? -90
    // widest visibility half-angle at the mask, for the highest altitude this orbit reaches (+ margin)
    const aMax = Math.pow(398600.4418 / (this.rec.no / 60) ** 2, 1 / 3) * (1 + this.rec.ecco) + 30
    const m = MASK_DEG * DEG
    const lamMax = Math.acos((RE / aMax) * Math.cos(m)) - m // central angle, rad
    const rate = 0.085 * DEG // rad/s
    const gap = (t: number) => {
      const e = this.ecef(t)
      if (!e) return Infinity
      const r = Math.hypot(e[0], e[1], e[2])
      const c = (e[0] * VIC_UNIT[0] + e[1] * VIC_UNIT[1] + e[2] * VIC_UNIT[2]) / r
      return Math.acos(Math.max(-1, Math.min(1, c))) - lamMax
    }

    let t = fromMs
    // a pass in progress: walk back to its AOS (bounded)
    if (el(t) >= MASK_DEG) {
      let b = t
      while (el(b - 20e3) >= MASK_DEG && t - b < 20 * 60e3) b -= 20e3
      t = b - 20e3
    }
    let guard = 0
    while (t < end && out.length < count && guard++ < 20000) {
      const g = gap(t)
      if (g === Infinity) break
      if (g > 0) {
        t += Math.max(10e3, Math.min(900e3, (g / rate) * 1000))
        continue
      }
      // inside the widest circle: fine-step on elevation
      if (el(t) < MASK_DEG) {
        t += 10e3
        continue
      }
      // bisect AOS in (t - 10 s, t]
      let lo = t - 10e3,
        hi = t
      if (el(lo) >= MASK_DEG) lo = hi = t // started inside the pass (first iteration after walking back)
      while (hi - lo > 1000) {
        const mid = (lo + hi) / 2
        if (el(mid) >= MASK_DEG) hi = mid
        else lo = mid
      }
      const aos = hi
      // walk to LOS, tracking the maximum
      let s = aos,
        best = el(aos),
        bestT = aos
      while (true) {
        const n = s + 5e3
        const v = el(n)
        if (v > best) {
          best = v
          bestT = n
        }
        if (v < MASK_DEG) {
          lo = s
          hi = n
          break
        }
        s = n
        if (s - aos > 30 * 60e3) break
      }
      while (hi - lo > 1000) {
        const mid = (lo + hi) / 2
        if (el(mid) >= MASK_DEG) lo = mid
        else hi = mid
      }
      const los = lo
      // parabolic refinement of the peak
      const y0 = el(bestT - 5e3),
        y1 = best,
        y2 = el(bestT + 5e3)
      const den = y0 - 2 * y1 + y2
      const off = den < 0 ? Math.max(-1, Math.min(1, (0.5 * (y0 - y2)) / den)) : 0
      const tca = bestT + off * 5e3
      const maxEl = Math.max(best, el(tca))
      out.push({
        aos,
        los,
        tca,
        maxEl,
        aosAz: this.look(aos)?.az ?? 0,
        losAz: this.look(los)?.az ?? 0,
      })
      t = los + 60e3
    }
    return out
  }
}

/**
 * Ground track ±1 orbit around a moving time, sampled on a fixed 30 s grid so each update propagates only the
 * samples that scrolled into the window (1 per 30 s of sim time live, ~10 per frame at ×600).
 */
export class TrackCache {
  private m = new Map<number, V3 | null>()
  readonly span: number
  constructor(
    private sat: Sat,
    readonly step = 30e3,
  ) {
    this.span = sat.periodMin * 60e3
  }
  around(ms: number): { pts: V3[]; times: number[] } {
    const k0 = Math.floor((ms - this.span) / this.step),
      k1 = Math.ceil((ms + this.span) / this.step)
    for (const k of this.m.keys()) if (k < k0 || k > k1) this.m.delete(k)
    const pts: V3[] = [],
      times: number[] = []
    for (let k = k0; k <= k1; k++) {
      let p = this.m.get(k)
      if (p === undefined) {
        const e = this.sat.ecef(k * this.step)
        p = e ? (e.map((v) => v / Math.hypot(e[0], e[1], e[2])) as V3) : null
        this.m.set(k, p)
      }
      if (p) {
        pts.push(p)
        times.push(k * this.step)
      }
    }
    return { pts, times }
  }
}

// ---------- clock ----------

/** Real time scaled by `warp`, rebased on every change so the satellite never jumps unless asked to. */
export class SimClock {
  private baseReal = Date.now()
  private baseSim = this.baseReal
  warp = 1
  now(real = Date.now()) {
    return this.baseSim + (real - this.baseReal) * this.warp
  }
  set(warp: number, real = Date.now()) {
    this.baseSim = this.now(real)
    this.baseReal = real
    this.warp = warp
  }
  live(real = Date.now()) {
    this.baseSim = this.baseReal = real
    this.warp = 1
  }
  jump(to: number, warp: number, real = Date.now()) {
    this.baseSim = to
    this.baseReal = real
    this.warp = warp
  }
}

// ---------- formatting ----------

const pad = (n: number) => String(n).padStart(2, '0')
export const fmtLat = (v: number) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? 'N' : 'S'}`
export const fmtLon = (v: number) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? 'E' : 'W'}`
export const fmtUtc = (ms: number) => new Date(ms).toISOString().slice(11, 19)
export function fmtDur(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    x = s % 60
  return h ? `${h}h ${pad(m)}m` : `${m}m ${pad(x)}s`
}
export function fmtAge(ms: number) {
  const h = ms / 3600e3
  return h < 1 ? `${Math.max(0, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`
}
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
export const compass = (az: number) => COMPASS[Math.round(az / 22.5) % 16]

let vicFmt: Intl.DateTimeFormat | null = null
/** Wall-clock time in Victoria, e.g. "14:32 PDT". */
export function fmtVic(ms: number, withDay = false) {
  vicFmt ??= new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
    timeZoneName: 'short',
  })
  const p = Object.fromEntries(vicFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return `${withDay ? p.weekday + ' ' : ''}${p.hour === '24' ? '00' : p.hour}:${p.minute} ${p.timeZoneName}`
}
