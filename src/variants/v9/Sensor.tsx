import { useId, useRef, useState } from 'react'
import { research } from '../../content/site'
import { Flag } from '../../shared/Flag'
import { SENSOR_Z, predicted, sensorAt } from './depth'

// The SOLIDS idea as a mechanic: a satellite reads the surface, a model infers temperature at depth,
// and a moored sensor says how close it got. The profile and readings are illustrative (labelled below).

const W = 340
const H = 318
const Y0 = 58 // surface line
const Y1 = 296 // 200 m
const X0 = 104 // 6 °C
const X1 = 326 // 13 °C
const yz = (z: number) => Y0 + (z / 200) * (Y1 - Y0)
const xt = (t: number) => X0 + ((t - 6) / 7) * (X1 - X0)
const f1 = (n: number) => n.toFixed(1)
const sgn = (n: number) => {
  const r = Math.round(n * 10) / 10
  return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1)
}

const curve = (() => {
  let d = ''
  for (let z = 0; z <= 200; z += 5) d += `${z ? 'L' : 'M'}${xt(predicted(z)).toFixed(1)} ${yz(z).toFixed(1)}`
  return d
})()
const band = (() => {
  const l: string[] = []
  const r: string[] = []
  for (let z = 0; z <= 200; z += 10) {
    const u = 0.25 + 0.3 * Math.exp(-((z - 45) ** 2) / 900)
    l.push(`${xt(predicted(z) - u).toFixed(1)} ${yz(z).toFixed(1)}`)
    r.unshift(`${xt(predicted(z) + u).toFixed(1)} ${yz(z).toFixed(1)}`)
  }
  return `M${l.join('L')}L${r.join('L')}Z`
})()
const ocean = research.find((r) => r.slug === 'ocean-sensing')!

export function Sensor() {
  const [i, setI] = useState(5)
  const id = useId()
  const down = useRef(false)
  const z = SENSOR_Z[i]
  const p = predicted(z)
  const s = sensorAt(z)

  const fromPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const y = ((e.clientY - r.top) / r.height) * H
    const zz = ((y - Y0) / (Y1 - Y0)) * 200
    let best = 0
    SENSOR_Z.forEach((v, k) => Math.abs(v - zz) < Math.abs(SENSOR_Z[best] - zz) && (best = k))
    setI(best)
  }

  return (
    <figure className="v9-sensor" aria-labelledby={`${id}-cap`}>
      <div className="v9-sensor__plot">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Temperature against depth. At ${z} metres the model predicts ${f1(p)} °C and the sensor reads ${f1(s)} °C.`}
          onPointerDown={(e) => {
            down.current = true
            fromPointer(e)
          }}
          onPointerMove={(e) => down.current && e.pointerType === 'mouse' && fromPointer(e)}
          onPointerUp={() => (down.current = false)}
          onPointerLeave={() => (down.current = false)}
        >
          {/* satellite and its footprint on the surface */}
          <g className="v9-sensor__sat">
            <rect x="22" y="8" width="16" height="10" rx="2" />
            <rect x="4" y="10" width="14" height="6" rx="1" />
            <rect x="42" y="10" width="14" height="6" rx="1" />
          </g>
          <path className="v9-sensor__beam" d={`M30 20 L17 ${Y0} L43 ${Y0} Z`} />
          <line className="v9-sensor__surface" x1="6" x2={X1} y1={Y0} y2={Y0} />
          <text className="v9-sensor__lab" x={X1} y={Y0 - 7} textAnchor="end">
            surface
          </text>
          {/* inferred column: dashed from the footprint to the probe */}
          <line className="v9-sensor__infer" x1="30" x2="30" y1={Y0} y2={yz(z)} />
          <circle className="v9-sensor__probe" cx="30" cy={yz(z)} r="5" />
          {[0, 50, 100, 150, 200].map((d) => (
            <text key={d} className="v9-sensor__tick" x="94" y={yz(d) + 4} textAnchor="end">
              {d} m
            </text>
          ))}
          {[7, 9, 11, 13].map((t) => (
            <g key={t}>
              <line className="v9-sensor__grid" x1={xt(t)} x2={xt(t)} y1={Y0} y2={Y1} />
              <text className="v9-sensor__tick" x={xt(t)} y={Y1 + 16} textAnchor="middle">
                {t}°
              </text>
            </g>
          ))}
          <path className="v9-sensor__band" d={band} />
          <path className="v9-sensor__curve" d={curve} />
          {SENSOR_Z.map((d, k) => (
            <circle key={d} className="v9-sensor__dot" data-on={k === i || undefined} cx={xt(sensorAt(d))} cy={yz(d)} r={k === i ? 5 : 3} />
          ))}
          <line className="v9-sensor__at" x1={X0 - 6} x2={X1} y1={yz(z)} y2={yz(z)} />
        </svg>
      </div>
      <div className="v9-sensor__side">
        <dl className="v9-sensor__read" aria-live="polite">
          <div>
            <dt>Depth</dt>
            <dd>
              {z}
              <small> m</small>
            </dd>
          </div>
          <div className="is-acc">
            <dt>Predicted</dt>
            <dd>
              {f1(p)}
              <small> °C</small>
            </dd>
          </div>
          <div>
            <dt>Sensor</dt>
            <dd>
              {f1(s)}
              <small> °C</small>
            </dd>
          </div>
          <div>
            <dt>Residual</dt>
            <dd>
              {sgn(p - s)}
              <small> °C</small>
            </dd>
          </div>
        </dl>
        <label className="v9-sensor__range">
          <span>Lower the probe</span>
          <input
            type="range"
            min={0}
            max={SENSOR_Z.length - 1}
            step={1}
            value={i}
            onChange={(e) => setI(+e.target.value)}
            aria-valuetext={`${z} metres: predicted ${f1(p)} °C, sensor ${f1(s)} °C`}
          />
        </label>
        <figcaption id={`${id}-cap`}>
          <b>Illustrative.</b> The profile and readings here are made up to show the idea. The real model scored <span className="v9-num">R² = 0.936</span> against
          Ocean Networks Canada sensors, validated with NRC Canada. <Flag note={ocean.unverified?.[0] ?? 'Not on the Aug 2026 resume.'} />
        </figcaption>
      </div>
    </figure>
  )
}
