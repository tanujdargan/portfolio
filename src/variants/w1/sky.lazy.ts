// MarmotSat in the window. Real position from the TLE (CelesTrak, a recent browser copy, or the build snapshot),
// propagated with SGP4 in the browser. The sky drawn around it is illustrative: the window shows a real pass over
// Victoria from rise (left) to set (right), with its real elevation as height.
import { BUILD_TLE, Sat, loadTle, compass, fmtVic, type Pass, type TleSource } from '../../demos/orbit/model'

export interface SkyNow {
  ms: number
  lat: number
  lon: number
  alt: number
  speed: number
  sunlit: boolean
  el: number
  az: number
  source: TleSource
  fetchedAt: number
  next: Pass[]
  /** the pass the window shows (in progress, or the replay) */
  pass: Pass | null
  /** replay clock, if a replay is running */
  replay: { ms: number; speed: number } | null
}
export type UV = { u: number; v: number }


export function createSky(onTick: (s: SkyNow, sat: UV | null, trail: UV[]) => void) {
  let sat = new Sat(BUILD_TLE.tle)
  let source: TleSource = 'build'
  let fetchedAt = BUILD_TLE.fetchedAt
  let next: Pass[] = []
  let nextAt = 0
  let replay: { pass: Pass; t0: number; speed: number } | null = null
  let timer = 0
  let raf = 0
  let stopped = false

  const passesFrom = (ms: number) => {
    if (!next.length || ms > nextAt + 60e3 || (next[0] && ms > next[0].los)) {
      next = sat.passes(ms, 3)
      nextAt = ms
    }
    return next
  }

  // The window shows the pass from rise (left) to set (right); height is the real elevation over Victoria.
  const uv = (pass: Pass, ms: number): UV | null => {
    const l = sat.look(ms)
    if (!l || l.el < 0) return null
    const u = (ms - pass.aos) / Math.max(1, pass.los - pass.aos)
    if (u < -0.05 || u > 1.05) return null
    return { u: 0.06 + 0.88 * Math.min(1, Math.max(0, u)), v: 0.22 + 0.7 * Math.min(1, l.el / Math.max(30, pass.maxEl)) }
  }

  const trailFor = (pass: Pass, ms: number) => {
    const out: UV[] = []
    const from = Math.max(pass.aos - 30e3, ms - 150e3)
    for (let t = from; t <= ms; t += 5e3) {
      const p = uv(pass, t)
      if (p) out.push(p)
    }
    return out
  }

  function tick() {
    if (stopped) return
    const real = Date.now()
    const ms = replay ? replay.pass.aos - 30e3 + (performance.now() - replay.t0) * replay.speed : real
    if (replay && ms > replay.pass.los + 30e3) {
      replay = null
      return tick()
    }
    const st = sat.state(ms)
    const ps = passesFrom(real)
    const inPass = replay?.pass ?? (ps[0] && ps[0].aos <= real && real <= ps[0].los ? ps[0] : null)
    const p = inPass ? uv(inPass, ms) : null
    const now: SkyNow = {
      ms,
      lat: st?.lat ?? 0,
      lon: st?.lon ?? 0,
      alt: st?.alt ?? 0,
      speed: st?.speed ?? 0,
      sunlit: st?.sunlit ?? false,
      el: st?.el ?? -90,
      az: st?.az ?? 0,
      source,
      fetchedAt,
      next: ps,
      pass: inPass,
      replay: replay ? { ms, speed: replay.speed } : null,
    }
    onTick(now, p, inPass && p ? trailFor(inPass, ms) : [])
    if (replay) raf = requestAnimationFrame(tick)
    else timer = window.setTimeout(tick, 1000)
  }

  loadTle()
    .then((r) => {
      sat = new Sat(r.tle)
      source = r.source
      fetchedAt = r.fetchedAt
      next = []
    })
    .catch(() => {})
    .finally(() => {
      clearTimeout(timer)
      cancelAnimationFrame(raf)
      tick()
    })
  tick()

  return {
    /** Replay the next predicted pass at `speed`× through the window. */
    replay(speed = 60) {
      const p = passesFrom(Date.now())[0]
      if (!p) return
      clearTimeout(timer)
      cancelAnimationFrame(raf)
      replay = { pass: p, t0: performance.now(), speed }
      tick()
    },
    stopReplay() {
      replay = null
    },
    stop() {
      stopped = true
      clearTimeout(timer)
      cancelAnimationFrame(raf)
    },
  }
}

export { compass, fmtVic }
export type Sky = ReturnType<typeof createSky>
