import { useRef, useState } from 'react'
import { Frame } from './Frame'
import './ocean.css'

// Lifted from v9's Sensor (v9 keeps its own copy). The SOLIDS idea as an instrument: a satellite reads the surface,
// a model infers temperature at depth, a moored sensor says how close it got. Profile and readings are illustrative.
const SENSOR_Z = [0, 10, 20, 30, 45, 60, 80, 100, 125, 150, 175, 200]
const truth = (z: number) => 7.1 + 4.9 * Math.exp(-z / 34) + 0.3 * Math.exp(-((z - 55) ** 2) / 320)
const predicted = (z: number) => truth(z) + 0.16 * Math.sin(z / 23 + 1.1)
const sensorAt = (z: number) => truth(z) + 0.26 * Math.sin(z * 1.7 + 0.4) * Math.cos(z * 0.31 + 0.2)

const W = 340
const H = 318
const Y0 = 58
const Y1 = 296
const X0 = 104
const X1 = 326
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

export default function OceanDemo() {
  const [i, setI] = useState(5)
  const down = useRef(false)
  const z = SENSOR_Z[i]
  const p = predicted(z)
  const s = sensorAt(z)
  const fromPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const zz = ((((e.clientY - r.top) / r.height) * H - Y0) / (Y1 - Y0)) * 200
    let best = 0
    SENSOR_Z.forEach((v, k) => Math.abs(v - zz) < Math.abs(SENSOR_Z[best] - zz) && (best = k))
    setI(best)
  }
  return (
    <Frame
      title="Satellite to seabed: lower the probe"
      provenance={['illustrative']}
      caption={
        <>
          <b>Illustrative:</b> the profile and readings here are made up to show the idea. The real model scored <b>R² = 0.936</b> for satellite-to-deep-water
          temperature against Ocean Networks Canada sensors, validated with NRC Canada.
        </>
      }
    >
      <div className="oc">
        <svg
          className="oc__plot"
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
          <g className="oc__sat">
            <rect x="22" y="8" width="16" height="10" rx="2" />
            <rect x="4" y="10" width="14" height="6" rx="1" />
            <rect x="42" y="10" width="14" height="6" rx="1" />
          </g>
          <path className="oc__beam" d={`M30 20 L17 ${Y0} L43 ${Y0} Z`} />
          <line className="oc__surface" x1="6" x2={X1} y1={Y0} y2={Y0} />
          <text className="oc__lab" x={X1} y={Y0 - 7} textAnchor="end">
            surface
          </text>
          <line className="oc__infer" x1="30" x2="30" y1={Y0} y2={yz(z)} />
          <circle className="oc__probe" cx="30" cy={yz(z)} r="5" />
          {[0, 50, 100, 150, 200].map((d) => (
            <text key={d} className="oc__tick" x="94" y={yz(d) + 4} textAnchor="end">
              {d} m
            </text>
          ))}
          {[7, 9, 11, 13].map((t) => (
            <g key={t}>
              <line className="oc__grid" x1={xt(t)} x2={xt(t)} y1={Y0} y2={Y1} />
              <text className="oc__tick" x={xt(t)} y={Y1 + 16} textAnchor="middle">
                {t}°
              </text>
            </g>
          ))}
          <path className="oc__band" d={band} />
          <path className="oc__curve" d={curve} />
          {SENSOR_Z.map((d, k) => (
            <circle key={d} className="oc__dot" data-on={k === i || undefined} cx={xt(sensorAt(d))} cy={yz(d)} r={k === i ? 5 : 3} />
          ))}
          <line className="oc__at" x1={X0 - 6} x2={X1} y1={yz(z)} y2={yz(z)} />
        </svg>
        <div>
          <dl className="oc__read" aria-live="polite">
            <div>
              <dt>Depth</dt>
              <dd>
                {z}
                <small> m</small>
              </dd>
            </div>
            <div data-acc>
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
          <label className="demo-row">
            <span>probe depth</span>
            <input
              className="demo-range"
              type="range"
              min={0}
              max={SENSOR_Z.length - 1}
              step={1}
              value={i}
              onChange={(e) => setI(+e.target.value)}
              aria-valuetext={`${z} metres: predicted ${f1(p)} °C, sensor ${f1(s)} °C`}
            />
          </label>
        </div>
      </div>
    </Frame>
  )
}
