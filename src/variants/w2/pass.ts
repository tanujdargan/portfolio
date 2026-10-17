// Live MarmotSat over Victoria: the public TLE (CelesTrak, else the build snapshot) propagated with SGP4.
// Loaded on demand (the orbit model pulls in satellite.js), never during SSR.
import type { Pass } from '../../demos/orbit/model'

export interface PassState {
  now: number
  lat: number
  lon: number
  alt: number
  el: number
  az: number
  up: boolean
  next: Pass | null
  source: 'celestrak' | 'session' | 'build'
  fetchedAt: number
}

export async function startPass(onState: (s: PassState) => void) {
  const m = await import('../../demos/orbit/model')
  let sat = new m.Sat(m.BUILD_TLE.tle)
  let source: PassState['source'] = 'build'
  let fetchedAt = m.BUILD_TLE.fetchedAt
  let passes: Pass[] = []
  const refresh = (ms: number) => {
    passes = sat.passes(ms, 2, 36)
  }
  const tick = () => {
    const now = Date.now()
    if (!passes.length || passes[0].los < now) refresh(now)
    const s = sat.state(now)
    if (!s) return
    const next = passes.find((p) => p.los > now) ?? null
    onState({ now, lat: s.lat, lon: s.lon, alt: s.alt, el: s.el, az: s.az, up: s.el >= m.MASK_DEG, next, source, fetchedAt })
  }
  tick()
  const t = setInterval(tick, 1000)
  m.loadTle().then((r) => {
    sat = new m.Sat(r.tle)
    source = r.source
    fetchedAt = r.fetchedAt
    passes = []
    tick()
  })
  return () => clearInterval(t)
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
export const dir8 = (az: number) => COMPASS[Math.round(az / 45) % 8]
export function inFor(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600),
    mm = Math.floor((s % 3600) / 60),
    ss = s % 60
  return h ? `${h} h ${String(mm).padStart(2, '0')} min` : mm ? `${mm} min ${String(ss).padStart(2, '0')} s` : `${ss} s`
}
let fmt: Intl.DateTimeFormat | null = null
export function vicTime(ms: number) {
  fmt ??= new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short', timeZoneName: 'short' })
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return `${p.weekday} ${p.hour === '24' ? '00' : p.hour}:${p.minute} ${p.timeZoneName}`
}
