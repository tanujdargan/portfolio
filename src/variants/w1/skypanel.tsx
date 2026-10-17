import { Play } from 'lucide-react'
import type { SkyNow } from './sky.lazy'

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const compass = (az: number) => COMPASS[Math.round(az / 22.5) % 16]
let fmt: Intl.DateTimeFormat | null = null
const vic = (ms: number) => {
  fmt ??= new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' })
  return fmt.format(new Date(ms)).replace(/\b24:/, '00:')
}
const SRC = { celestrak: 'fetched from CelesTrak just now', session: 'fetched from CelesTrak earlier in this browser', build: 'the snapshot saved when this site was built' }

/** The window's sheet: where MarmotSat is right now, and the next passes over Victoria. */
export function SkyPanel({ now, onReplay, onOpen }: { now: SkyNow | null; onReplay: () => void; onOpen: () => void }) {
  return (
    <div className="w1-app">
      <header className="w1-app__head">
        <p className="w1-kicker">Through the window</p>
        <h2 className="w1-app__title">MarmotSat, right now</h2>
        <p className="w1-lede">The satellite whose onboard-computer firmware I led, computed live in your browser.</p>
      </header>
      {!now ? (
        <p className="w1-muted" aria-live="polite">
          Loading the orbit…
        </p>
      ) : (
        <>
          <dl className="w1-readout" aria-live="off">
            <div>
              <dt>Latitude</dt>
              <dd>
                {Math.abs(now.lat).toFixed(2)}° {now.lat >= 0 ? 'N' : 'S'}
              </dd>
            </div>
            <div>
              <dt>Longitude</dt>
              <dd>
                {Math.abs(now.lon).toFixed(2)}° {now.lon >= 0 ? 'E' : 'W'}
              </dd>
            </div>
            <div>
              <dt>Altitude</dt>
              <dd>{now.alt.toFixed(0)} km</dd>
            </div>
            <div>
              <dt>Speed</dt>
              <dd>{now.speed.toFixed(2)} km/s</dd>
            </div>
            <div>
              <dt>From Victoria</dt>
              <dd>{now.el > 0 ? `${now.el.toFixed(0)}° up, ${compass(now.az)}` : 'below the horizon'}</dd>
            </div>
            <div>
              <dt>Sunlight</dt>
              <dd>{now.sunlit ? 'in sunlight' : 'in Earth’s shadow'}</dd>
            </div>
          </dl>
          <h3 className="w1-h3">Next passes over Victoria</h3>
          <ol className="w1-passes">
            {now.next.map((p) => (
              <li key={p.aos}>
                <b>{vic(p.aos)}</b>
                <span>
                  rises {compass(p.aosAz)}, peaks {p.maxEl.toFixed(0)}°, sets {compass(p.losAz)} · {Math.round((p.los - p.aos) / 60e3)} min
                </span>
              </li>
            ))}
          </ol>
          <div className="w1-actions">
            <button type="button" className="w1-btn" onClick={onReplay} disabled={!now.next.length || !!now.replay}>
              <Play size={15} aria-hidden="true" /> {now.replay ? 'Replaying…' : 'Replay the next pass in the window, 60×'}
            </button>
            <button type="button" className="w1-btn w1-btn--ghost" onClick={onOpen}>
              Open the orbit tracker
            </button>
          </div>
          <p className="w1-note">
            Real position: SGP4 on the TLE {SRC[now.source]}. The night sky in the window is illustrative; during a pass it shows the satellite from rise
            (left) to set (right) at its real elevation. The replay runs the real predicted pass, sped up.
          </p>
        </>
      )}
    </div>
  )
}
