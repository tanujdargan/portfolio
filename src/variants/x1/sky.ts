// The real sky over Victoria: Sun from satellite.js's sun model, MarmotSat from the public TLE via SGP4 (src/demos/orbit).
// A small clock lets the page warp to the next pass and play it back faster than real time. Nothing touches the DOM.
// The orbit modules are loaded dynamically (createSky) so they stay out of this variant's initial chunk.
import type { Pass, Sat, TleResult } from '../../demos/orbit/model'

type Model = typeof import('../../demos/orbit/model')
type Sgp4 = typeof import('../../demos/orbit/sgp4')
const DEG = Math.PI / 180
const AU = 149597870.7
export const MASK_DEG = 10 // same mask as the orbit demo (model.ts)
export const VIC_LAT = 48.4284
export const VIC_LON = -123.3656
const OBS = { latitude: VIC_LAT * DEG, longitude: VIC_LON * DEG, height: 0.02 }

export async function createSky() {
  const [model, sgp4] = await Promise.all([import('../../demos/orbit/model'), import('../../demos/orbit/sgp4')])
  const s = new Sky(model, sgp4)
  await s.refreshAsync()
  return s
}

export interface Look {
  el: number
  az: number
}
export interface SatLook extends Look {
  range: number
  sunlit: boolean
}
export type SkyMode = 'live' | 'warp' | 'pass' | 'after'
export interface SkyStatus {
  sim: number
  mode: SkyMode
  /** MarmotSat above the 10° mask */
  up: boolean
  sat: SatLook | null
  sun: Look
  next: Pass | null
  source: TleResult['source']
}

const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export class Sky {
  sat: Sat
  source: TleResult['source'] = 'build'
  passes: Pass[] = []
  mode: SkyMode = 'live'
  private offset = 0
  private tween: { from: number; to: number; t0: number; dur: number } | null = null
  private passRate = 30
  private passEnd = 0
  private lastReal = 0
  private listeners = new Set<() => void>()

  constructor(
    private model: Model,
    private sg: Sgp4,
  ) {
    // ?x1t=<hours> previews the sky at another time (review aid); the page says so via mode 'after'
    const t = typeof location !== 'undefined' ? Number(new URLSearchParams(location.search).get('x1t')) : 0
    if (t) {
      this.offset = t * 3600e3
      this.mode = 'after'
    }
    this.sat = new model.Sat(model.BUILD_TLE.tle)
  }

  /** Find the next passes in 4-hour windows, yielding between them, so the search never blocks input for long. */
  async refreshAsync() {
    const from = this.now()
    const found: Pass[] = []
    for (let h = 0; h < 48 && found.length < 2; h += 4) {
      found.push(...this.sat.passes(from + h * 3600e3, 2 - found.length, 4).filter((p) => !found.some((f) => Math.abs(f.aos - p.aos) < 60e3)))
      await new Promise((r) => setTimeout(r, 0))
    }
    this.passes = found
    this.emit()
  }

  /** CelesTrak first; the build-time TLE stays in use until (or unless) it answers. */
  async load() {
    const r = await this.model.loadTle()
    this.sat = new this.model.Sat(r.tle)
    this.source = r.source
    await this.refreshAsync()
  }

  on(fn: () => void) {
    this.listeners.add(fn)
    return () => void this.listeners.delete(fn)
  }
  private emit() {
    for (const f of this.listeners) f()
  }

  now(real = Date.now()) {
    return real + this.offset
  }

  refresh() {
    this.passes = this.sat.passes(this.now(), 3, 48)
  }

  next(ms = this.now()): Pass | null {
    let p = this.passes.find((x) => x.los > ms)
    if (!p) {
      this.passes = this.sat.passes(ms, 3, 48)
      p = this.passes.find((x) => x.los > ms)
    }
    return p ?? null
  }

  sun(ms: number): Look {
    const d = new Date(ms)
    const r = this.sg.sunPos(this.sg.jday(d)).rsun
    const e = this.sg.eciToEcf({ x: r.x * AU, y: r.y * AU, z: r.z * AU }, this.sg.gstime(d))
    const la = this.sg.ecfToLookAngles(OBS, e)
    return { el: la.elevation / DEG, az: (la.azimuth / DEG + 360) % 360 }
  }

  satLook(ms: number): SatLook | null {
    const s = this.sat.state(ms)
    return s ? { el: s.el, az: s.az, range: s.range, sunlit: s.sunlit } : null
  }

  /** Az/el samples along a pass, for the arc drawn on the sky. */
  arc(p: Pass, n = 48): Look[] {
    const out: Look[] = []
    const a = p.aos - 90e3,
      b = p.los + 90e3
    for (let i = 0; i <= n; i++) {
      const l = this.sat.look(a + ((b - a) * i) / n)
      if (l) out.push({ el: l.el, az: l.az })
    }
    return out
  }

  /** Speed the clock until MarmotSat rises, then play the pass at ×30. Reduced motion cuts straight to its peak. */
  warp(reduced: boolean) {
    const p = this.next()
    if (!p) return
    const real = Date.now()
    if (reduced) {
      this.offset = p.tca - real
      this.mode = 'after'
      this.tween = null
    } else {
      const target = Math.max(this.now(real), p.aos - 25e3) - real
      const span = target - this.offset
      // 2.2 s for a few minutes ahead, up to ~5 s for a pass many hours away
      const dur = Math.min(5200, 2200 + Math.log10(1 + Math.abs(span) / 60e3) * 1000)
      this.tween = { from: this.offset, to: target, t0: performance.now(), dur }
      this.mode = 'warp'
    }
    this.emit()
  }

  live() {
    this.offset = 0
    this.tween = null
    this.mode = 'live'
    this.refresh()
    this.emit()
  }

  /** Advance the warp tween / pass playback. Returns true while the sky is moving faster than real time. */
  step(perf = performance.now()): boolean {
    const dt = this.lastReal ? Math.min(100, perf - this.lastReal) : 0
    this.lastReal = perf
    if (this.mode === 'warp' && this.tween) {
      const t = Math.min(1, (perf - this.tween.t0) / this.tween.dur)
      this.offset = this.tween.from + (this.tween.to - this.tween.from) * easeIO(t)
      if (t >= 1) {
        this.tween = null
        this.mode = 'pass'
        this.passEnd = (this.next()?.los ?? this.now()) + 20e3
        this.emit()
      }
      return true
    }
    if (this.mode === 'pass') {
      this.offset += dt * (this.passRate - 1)
      if (this.now() > this.passEnd) {
        this.mode = 'after'
        this.emit()
        return false
      }
      return true
    }
    return false
  }

  /** local sidereal time at Victoria, radians */
  lst(ms: number) {
    return this.sg.gstime(new Date(ms)) + VIC_LON * DEG
  }

  status(): SkyStatus {
    const sim = this.now()
    const sat = this.satLook(sim)
    return {
      sim,
      mode: this.mode,
      up: !!sat && sat.el >= MASK_DEG,
      sat,
      sun: this.sun(sim),
      next: this.next(sim),
      source: this.source,
    }
  }
}

export type { Pass }
