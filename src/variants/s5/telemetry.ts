// The instrument layer's data: a UTC clock and MarmotSat's sub-satellite point, both real.
// The clock starts at hydration. The SGP4 model (src/demos/orbit/model.ts, the same code the orbit demo runs) loads
// after first paint (requestIdleCallback), propagates the build-time TLE at once, then swaps in CelesTrak's current
// TLE when it arrives (model.loadTle: CelesTrak, a < 2 h browser copy, or the build snapshot). One tick per second,
// aligned to the wall-clock second, paused while the tab is hidden. The static HTML shows dashes.
import { useSyncExternalStore } from 'react'
import type { Sat, SatState, TleResult } from '../../demos/orbit/model'

export interface Tel {
  now: number
  st: SatState | null
  sat: Sat | null
  tle: TleResult | null
  /** fetch outcome, for the MACHINE view's provenance line */
  src: 'pending' | TleResult['source']
}

let tel: Tel = { now: 0, st: null, sat: null, tle: null, src: 'pending' }
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
let started = false
let timer = 0

function tick() {
  const now = Date.now()
  tel = { ...tel, now, st: tel.sat ? tel.sat.state(now) : null }
  emit()
}
function schedule() {
  clearTimeout(timer)
  if (document.hidden) return
  // land each tick just after the wall-clock second turns, so the clock never skips or lingers
  timer = window.setTimeout(() => {
    tick()
    schedule()
  }, 1000 - (Date.now() % 1000) + 8)
}

function start() {
  if (started) return
  started = true
  tick()
  schedule()
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick()
    schedule()
  })
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 2500 }) : setTimeout(cb, 1200))
  idle(async () => {
    const M = await import('../../demos/orbit/model')
    tel = { ...tel, sat: new M.Sat(M.BUILD_TLE.tle), tle: M.BUILD_TLE, src: 'pending' }
    tick()
    const r = await M.loadTle()
    tel = { ...tel, sat: new M.Sat(r.tle), tle: r, src: r.source }
    tick()
  })
}

function subscribe(f: () => void) {
  subs.add(f)
  start()
  return () => subs.delete(f)
}
const EMPTY: Tel = tel
export const useTel = () => useSyncExternalStore(subscribe, () => tel, () => EMPTY)

const pad = (n: number) => String(n).padStart(2, '0')
export const utc = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}
export const lat = (v: number) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? 'N' : 'S'}`
export const lon = (v: number) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? 'E' : 'W'}`
export const km = (v: number) => `${Math.round(v)} KM`
