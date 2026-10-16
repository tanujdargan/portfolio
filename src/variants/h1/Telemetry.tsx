import { useEffect, useRef, useState } from 'react'
import { useMotionPrefs } from '../../lib/motion'
import { Roll } from './Roll'

// The page's one line of telemetry, and it is real: MarmotSat's sub-satellite point and the next pass over Victoria,
// propagated with SGP4 from its public TLE in this browser. The orbit code loads after first paint; ticks stop when the
// line is off-screen or the tab is hidden.

interface T {
  lat: number
  lon: number
  alt: number
  aos?: number
  maxEl?: number
  now?: boolean
}

const pt = new Intl.DateTimeFormat('en-CA', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Vancouver',
  timeZoneName: 'short',
})
const ll = (v: number, p: string, n: string) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? p : n}`
function until(ms: number) {
  const m = Math.max(0, Math.round(ms / 60e3))
  return m < 60 ? `in ${m} min` : `in ${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
}

export function Telemetry({ href }: { href: string }) {
  const { reduced } = useMotionPrefs()
  const [t, setT] = useState<T | null>(null)
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    let alive = true
    let tick = 0
    let visible = true
    let sat: import('../../demos/orbit/model').Sat | null = null
    let pass: { aos: number; los: number; maxEl: number } | undefined
    const update = () => {
      if (!sat || !alive) return
      const now = Date.now()
      if (!pass || now > pass.los) pass = sat.passes(now, 1)[0]
      const s = sat.state(now)
      if (!s) return
      setT({
        lat: s.lat,
        lon: s.lon,
        alt: s.alt,
        aos: pass?.aos,
        maxEl: pass?.maxEl,
        now: !!pass && now >= pass.aos && now <= pass.los,
      })
    }
    const run = () => {
      clearInterval(tick)
      if (visible && document.visibilityState === 'visible') tick = window.setInterval(update, reduced ? 10000 : 2000)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      run()
    })
    const onVis = () => run()
    const start = async () => {
      const m = await import('../../demos/orbit/model')
      if (!alive) return
      sat = new m.Sat(m.BUILD_TLE.tle)
      update()
      run()
      io.observe(ref.current!)
      document.addEventListener('visibilitychange', onVis)
      const fresh = await m.loadTle()
      if (!alive || fresh.source === 'build') return
      sat = new m.Sat(fresh.tle)
      pass = undefined
      update()
    }
    // after first paint and the hero's script has started
    const idle = (
      window as Window & {
        requestIdleCallback?: (f: () => void, o?: object) => number
      }
    ).requestIdleCallback
    const h = idle ? idle(start, { timeout: 2500 }) : window.setTimeout(start, 1200)
    return () => {
      alive = false
      clearInterval(tick)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      if (!idle) clearTimeout(h)
    }
  }, [reduced])

  return (
    <a
      ref={ref}
      className="h1-tele"
      href={href}
      data-ready={t ? '' : undefined}
      title="Propagated with SGP4 from MarmotSat’s public TLE, in your browser"
    >
      <span className="h1-tele__dot" aria-hidden="true" />
      <span className="h1-tele__name">MarmotSat</span>
      {t ? (
        <>
          <span className="h1-tele__sep" aria-hidden="true">
            ·
          </span>
          <span className="h1-tele__pos">
            <span className="h1-tele__lat"><Roll text={ll(t.lat, 'N', 'S')} /></span> <span className="h1-tele__lon"><Roll text={ll(t.lon, 'E', 'W')} /></span>
          </span>
          <span className="h1-tele__sep h1-tele__wide" aria-hidden="true">
            ·
          </span>
          <span className="h1-tele__wide">
            <Roll text={`${Math.round(t.alt)} km`} /> up
          </span>
          <span className="h1-tele__sep" aria-hidden="true">
            ·
          </span>
          {t.now ? (
            <span className="h1-tele__pass">overhead Victoria now</span>
          ) : t.aos ? (
            <span className="h1-tele__pass">
              <span className="h1-tele__long">next pass over Victoria </span>
              <span className="h1-tele__short">over Victoria </span>
              {pt.format(t.aos).replace(/ ?[A-Z]{3,4}$/, '')}
              <span className="h1-tele__long"> {pt.format(t.aos).match(/[A-Z]{3,4}$/)?.[0]}</span>
              <span className="h1-tele__wide">
                {' '}
                ({until(t.aos - Date.now())}, max {Math.round(t.maxEl ?? 0)}°)
              </span>
            </span>
          ) : null}
        </>
      ) : (
        <span className="h1-tele__wait">
          <span className="h1-tele__sep" aria-hidden="true">
            ·
          </span>{' '}
          in orbit since July 2026 · computing position from its TLE
        </span>
      )}
    </a>
  )
}
