// Lazy chunk: SGP4 (satellite.js) and the MarmotSat model only load when this track comes near the viewport.
import { useEffect, useMemo, useState } from 'react'
import { BUILD_TLE, Sat, VIC, fmtLat, fmtLon, fmtVic, loadTle, type TleResult, type V3 } from '../../demos/orbit/model'
import { Demo } from '../../demos/Demo'
import { Chip, Marker, Shell, useScript } from './play'
import type { TrackProps } from './tracks'

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
// 0 map · 1 track draws · 2 satellite + position · 3 Victoria + next pass (rest; position stays live)
const OD = [500, 1500, 1100, 0]

export default function OrbitTrack({ i, run, startAtEnd }: TrackProps) {
  const s = useScript(OD, run, startAtEnd)
  const [open, setOpen] = useState(false)
  const [tle, setTle] = useState<TleResult>(BUILD_TLE)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let alive = true
    loadTle().then((t) => alive && setTle(t))
    return () => {
      alive = false
    }
  }, [])
  // Live position: one SGP4 call a second, only while the track is on screen.
  useEffect(() => {
    if (!run) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [run])
  const sat = useMemo(() => new Sat(tle.tle), [tle])
  // Track and pass recomputed once a minute, not every tick.
  const minute = Math.floor(now / 60e3)
  const { past, next, pass } = useMemo(() => {
    const t = minute * 60e3
    const P = sat.periodMin
    return {
      past: path(sat.track(t, -P * 0.6, 0, 80).map(ll)),
      next: path(sat.track(t, 0, P * 1.2, 160).map(ll)),
      pass: sat.passes(t, 1)[0],
    }
  }, [sat, minute])
  const st = sat.state(now)
  const lat = st?.lat ?? 0
  const lon = st?.lon ?? 0
  const src = tle.source === 'build' ? `TLE snapshot from ${new Date(tle.fetchedAt).toISOString().slice(0, 10)}` : 'TLE fetched from CelesTrak'
  return (
    <Shell
      i={i}
      head={<>MarmotSat, right now</>}
      badge="Real data · live"
      progress={s.head}
      open={open}
      setOpen={setOpen}
      canReplay={false}
      onReplay={s.replay}
      demo={<Demo kind="orbit" />}
      code={
        <>
          <span className="h2-code__f">sgp4</span>(tle(norad=<span className="h2-code__n">69912</span>), t=now) → <span className="h2-code__n h2-code__live">{fmtLat(lat)}</span>,{' '}
          <span className="h2-code__n h2-code__live">{fmtLon(lon)}</span>
        </>
      }
      note={<>Real: public orbital elements ({src}), propagated with SGP4 in your browser. Updates every second while on screen.</>}
      chips={
        <>
          <Chip n={1} on={s.step >= 2} value={st ? `${fmtLat(lat)}, ${fmtLon(lon)} · ${st.alt.toFixed(0)} km up` : '—'}>
            MarmotSat is over
          </Chip>
          <Chip n={2} on={s.step >= 3} tone="hi" value={pass ? `${fmtVic(pass.aos, true)} · peaks at ${pass.maxEl.toFixed(0)}°` : 'none in the next 36 h'}>
            Next pass over Victoria:
          </Chip>
          <Chip n={3} on={s.step >= 3}>
            On board: the onboard-computer firmware I led, written in C.
          </Chip>
        </>
      }
    >
      <div className="h2-orb" data-step={s.step}>
        <svg viewBox="0 0 360 180" className="h2-orb__map" role="img" aria-label={`World map: MarmotSat is over ${fmtLat(lat)}, ${fmtLon(lon)}.`}>
          <defs>
            <pattern id="h2-dots" width="2.4" height="2.4" patternUnits="userSpaceOnUse">
              <circle cx="1.2" cy="1.2" r="0.6" />
            </pattern>
            <mask id="h2-land" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="180">
              <image href="/orbit/land.png" width="360" height="180" preserveAspectRatio="none" />
            </mask>
          </defs>
          <g className="h2-orb__grid">
            {[-60, -30, 0, 30, 60].map((l) => (
              <line key={`a${l}`} x1="0" x2="360" y1={Y(l)} y2={Y(l)} />
            ))}
            {[-120, -60, 0, 60, 120].map((l) => (
              <line key={`o${l}`} y1="0" y2="180" x1={X(l)} x2={X(l)} />
            ))}
          </g>
          <rect className="h2-orb__land" width="360" height="180" fill="url(#h2-dots)" mask="url(#h2-land)" />
          <path className="h2-orb__past" d={past} pathLength={1} />
          <path className="h2-orb__next" d={next} pathLength={1} />
          <g className="h2-orb__vic" transform={`translate(${X(VIC.lon)} ${Y(VIC.lat)})`}>
            <circle r="1.8" />
            <text x="7" y="2">
              Victoria
            </text>
          </g>
          <g className="h2-orb__sat" transform={`translate(${X(lon).toFixed(2)} ${Y(lat).toFixed(2)})`}>
            <circle r="5" className="h2-orb__ring" />
            <circle r="2.1" />
          </g>
        </svg>
        <Marker n={1} on={s.step >= 2} style={{ left: `${(X(lon) / 360) * 100}%`, top: `${(Y(lat) / 180) * 100}%` }} />
        <Marker n={2} on={s.step >= 3} style={{ left: `${(X(VIC.lon) / 360) * 100}%`, top: `${(Y(VIC.lat) / 180) * 100}%` }} />
      </div>
      <dl className="h2-orb__facts">
        <div>
          <dt>Testing per firmware change</dt>
          <dd>180 → 15 min</dd>
          <dd className="h2-dim">CI + hardware-in-the-loop</dd>
        </div>
        <div>
          <dt>Catalogue number</dt>
          <dd>NORAD 69912</dd>
          <dd className="h2-dim">launched July 2026, Falcon 9</dd>
        </div>
      </dl>
    </Shell>
  )
}
