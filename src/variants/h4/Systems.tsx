import { useEffect, useRef, useState } from 'react'
import { amazonMetrics } from '../../content/curated'
import { useAwake, useSteps } from './util'

// ---------------- Amazon planning assistant ----------------
// The pipeline shape comes from the resume bullets (natural-language plan queries, RAG over historical labor plans
// and site configurations, answers inside Optimus). It is drawn, not recorded: labelled illustrative. The only numbers
// are the resume's.

const NODES = [
  { k: 'Planner asks', t: 'A natural-language plan query in Optimus' },
  { k: 'Retrieve', t: 'Historical labor plans and site configurations (RAG)' },
  { k: 'LLM', t: 'Answers, flags anomalies, recommends labor' },
  { k: 'Back to the planner', t: 'An answer in Optimus, or a re-optimized what-if plan without a full solver re-run' },
]

export function PlanPreview({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const awake = useAwake(ref)
  // a request travels one hop per step; at rest every stage is lit
  const [s] = useSteps([1300, 1300, 1300, 2600], awake && !reduced, 0)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (awake && !reduced) setStarted(true)
  }, [awake, reduced])
  const live = started && !reduced
  return (
    <div ref={ref} className="h4-pv">
      <ol className="h4-pipe" aria-label="How a planner’s question moves through the assistant (illustrative)">
        {NODES.map((n, i) => (
          <li key={n.k} className="h4-pipe__node" data-on={!live || s === i || undefined}>
            <span className="h4-pipe__k">{n.k}</span>
            <span className="h4-pipe__t">{n.t}</span>
            {i < NODES.length - 1 && (
              <span className="h4-pipe__wire" data-on={(live && s === i) || undefined} aria-hidden="true" key={live && s === i ? `w${i}-${s}` : `w${i}`}>
                <i />
              </span>
            )}
          </li>
        ))}
      </ol>
      <dl className="h4-metrics">
        {amazonMetrics.map((m) => (
          <div key={m.n} className="h4-metric">
            <dt>{m.l[0].toUpperCase() + m.l.slice(1)}</dt>
            <dd>{m.n}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ---------------- Ocean probe ----------------
// The profile is the same illustrative curve as the shared ocean demo; only R² 0.936 is real.

const SENSOR_Z = [0, 10, 20, 30, 45, 60, 80, 100, 125, 150, 175, 200]
const truth = (z: number) => 7.1 + 4.9 * Math.exp(-z / 34) + 0.3 * Math.exp(-((z - 55) ** 2) / 320)
const predicted = (z: number) => truth(z) + 0.16 * Math.sin(z / 23 + 1.1)
const sensorAt = (z: number) => truth(z) + 0.26 * Math.sin(z * 1.7 + 0.4) * Math.cos(z * 0.31 + 0.2)
const W = 320,
  H = 190,
  Y0 = 14,
  Y1 = 172,
  X0 = 40,
  X1 = 298
const yz = (z: number) => Y0 + (z / 200) * (Y1 - Y0)
const xt = (t: number) => X0 + ((t - 6) / 7) * (X1 - X0)
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

export function OceanPreview({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const awake = useAwake(ref)
  // the probe goes down once when first seen, reading each sensor as it passes, then the panel is still
  const [z, setZ] = useState(200)
  const ran = useRef(false)
  useEffect(() => {
    if (!awake || reduced || ran.current) return
    ran.current = true
    let raf = 0
    const t0 = performance.now()
    const T = 4200
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / T)
      setZ(Math.round(200 * (1 - (1 - p) ** 2)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    setZ(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [awake, reduced])
  return (
    <div ref={ref} className="h4-oc">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Illustrative temperature profile from the surface to 200 metres: the model’s prediction with an uncertainty band, and sensor readings along it.">
        {[7, 9, 11, 13].map((t) => (
          <g key={t}>
            <line className="h4-oc__grid" x1={xt(t)} x2={xt(t)} y1={Y0} y2={Y1} />
            <text className="h4-oc__tick" x={xt(t)} y={H - 4} textAnchor="middle">
              {t} °C
            </text>
          </g>
        ))}
        {[0, 100, 200].map((d) => (
          <text key={d} className="h4-oc__tick" x={X0 - 8} y={yz(d) + 3} textAnchor="end">
            {d} m
          </text>
        ))}
        <line className="h4-oc__surface" x1={X0} x2={X1} y1={Y0} y2={Y0} />
        <path className="h4-oc__band" d={band} />
        <path className="h4-oc__curve" d={curve} />
        {SENSOR_Z.map((d) => (
          <circle key={d} className="h4-oc__dot" data-on={d <= z || undefined} cx={xt(sensorAt(d))} cy={yz(d)} r="2.6" />
        ))}
        <line className="h4-oc__at" x1={X0} x2={X1} y1={yz(z)} y2={yz(z)} />
        <circle className="h4-oc__probe" cx={xt(predicted(z))} cy={yz(z)} r="4.5" />
      </svg>
      <dl className="h4-oc__stat">
        <dt>Agreement with deep-water sensors</dt>
        <dd>
          R² 0.936<small>real result · the curve is illustrative</small>
        </dd>
      </dl>
    </div>
  )
}
