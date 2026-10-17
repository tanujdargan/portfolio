// MarmotSat's live sub-satellite point, from its published TLE (CelesTrak, or the build snapshot). Lazy: SGP4 only
// loads when the MarmotSat window is near the viewport.
import { Sat, loadTle, fmtLat, fmtLon, type TleSource } from '../../demos/orbit/model'

export interface Live {
  lat: string
  lon: string
  alt: number
  speed: number
  sunlit: boolean
  source: TleSource
}

export async function start(): Promise<{ read: () => Live | null }> {
  const r = await loadTle()
  const sat = new Sat(r.tle)
  return {
    read: () => {
      const s = sat.state(Date.now())
      if (!s) return null
      return { lat: fmtLat(s.lat), lon: fmtLon(s.lon), alt: Math.round(s.alt), speed: s.speed, sunlit: s.sunlit, source: r.source }
    },
  }
}
