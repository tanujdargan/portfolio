import steering from '../../data/steering.json'
import type { ObjKey } from './data'
import { Flow, MaskStrip, oceanNodes, planNodes } from './Flow'

/** The lit diagram beside each detail's step list. `step` lights the matching part. */
export function Diagram({ k, step }: { k: ObjKey; step: number }) {
  if (k === 'sat') return <SatLayers step={step} />
  if (k === 'model') return <SteerFig step={step} />
  if (k === 'plan') return <Flow nodes={planNodes} active={step} label="The assistant’s pipeline (illustrative)" />
  if (k === 'ocean') return <Flow nodes={oceanNodes} active={step} label="From sensors and satellites to a validated model" />
  return <MaskFig step={step} />
}

/** Rox-style exploded stack: the five layers of the MarmotSat work, from orbit down to the ground station. */
function SatLayers({ step }: { step: number }) {
  // drawing order top→bottom; map each to the step that lights it
  const layers = [
    { s: 4, y: 40, kind: 'orbit' },
    { s: 0, y: 110, kind: 'fw' },
    { s: 1, y: 170, kind: 'ttc' },
    { s: 2, y: 230, kind: 'hil' },
    { s: 3, y: 290, kind: 'ground' },
  ]
  const slab = (y: number) => `M 160 ${y} L 300 ${y - 40} L 440 ${y} L 300 ${y + 40} Z`
  return (
    <svg className="h3-layers" viewBox="0 0 600 360" role="img" aria-label="An exploded stack: orbit, flight firmware, TTC board, CI and hardware-in-the-loop bench, ground station. The active step is lit.">
      {layers.map((l) => {
        const on = l.s === step
        return (
          <g key={l.kind} className="h3-layer" data-on={on || undefined}>
            {l.kind === 'orbit' ? (
              <>
                <ellipse cx={300} cy={l.y} rx={220} ry={34} className="h3-layer__orbit" />
                <rect x={492} y={l.y + 8} width={16} height={26} rx={2} className="h3-layer__chip" transform={`rotate(-20 500 ${l.y + 21})`} />
              </>
            ) : (
              <>
                <path d={`M 160 ${l.y} L 160 ${l.y + 8} L 300 ${l.y + 48} L 440 ${l.y + 8} L 440 ${l.y} L 300 ${l.y + 40} Z`} className="h3-layer__side" />
                <path d={slab(l.y)} className="h3-layer__top" />
                {l.kind === 'fw' && (
                  <g className="h3-layer__mark">
                    <path d={`M 262 ${l.y - 6} l 38 -14 l 38 14 l -38 14 Z`} />
                    {[0, 1, 2, 3].map((i) => (
                      <path key={i} d={`M ${236 + i * 8} ${l.y + 6 - i * 3} l 26 9`} />
                    ))}
                  </g>
                )}
                {l.kind === 'ttc' && (
                  <g className="h3-layer__mark">
                    <path d={`M 360 ${l.y - 4} l 0 -30`} />
                    <circle cx={360} cy={l.y - 36} r={4} />
                    <path d={`M 240 ${l.y} l 30 10 l 30 -10 l -30 -10 Z`} />
                  </g>
                )}
                {l.kind === 'hil' && (
                  <g className="h3-layer__mark">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <rect key={i} x={220 + i * 26} y={l.y - 6 + (i % 2) * 4} width={14} height={6} rx={1} />
                    ))}
                  </g>
                )}
                {l.kind === 'ground' && (
                  <g className="h3-layer__mark">
                    <path d={`M 286 ${l.y - 2} q 14 -34 40 -30 q -10 22 -40 30 Z`} />
                    <path d={`M 300 ${l.y - 2} l 0 10`} />
                  </g>
                )}
              </>
            )}
          </g>
        )
      })}
      {/* the link between ground and orbit */}
      <path d="M 300 290 C 520 250 540 120 500 64" className="h3-layers__link" data-on={step >= 3 || undefined} />
    </svg>
  )
}

/** Real data from the replication: contrastive activations (pos vs neg), the mean-difference direction, and the
 *  steered outputs' read-back positions for one prompt as α grows. */
function SteerFig({ step }: { step: number }) {
  const c = steering.concepts.joy.cloud
  const outs = steering.concepts.joy.outputs[0]
  const all = [...c.pos, ...c.neg, ...outs.map((o) => o.xy)]
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const x0 = Math.min(...xs) - 2
  const x1 = Math.max(...xs) + 2
  const y0 = Math.min(...ys) - 2
  const y1 = Math.max(...ys) + 2
  const W = 560
  const H = 340
  const X = (v: number) => 20 + ((v - x0) / (x1 - x0)) * (W - 40)
  const Y = (v: number) => 20 + (1 - (v - y0) / (y1 - y0)) * (H - 40)
  const mean = (ps: number[][]) => [ps.reduce((a, p) => a + p[0], 0) / ps.length, ps.reduce((a, p) => a + p[1], 0) / ps.length]
  const mp = mean(c.pos)
  const mn = mean(c.neg)
  return (
    <svg className="h3-steerfig" viewBox={`0 0 ${W} ${H}`} data-step={step} role="img" aria-label="Activations under the joyful prompt (warm) and the flat prompt (grey), the direction between their means, and where each steered output reads back as α grows from −1.2 to +1.2.">
      <g className="h3-sf__cloud">
        {c.neg.map((p, i) => (
          <circle key={`n${i}`} cx={X(p[0])} cy={Y(p[1])} r={4} className="h3-sf__neg" />
        ))}
        {c.pos.map((p, i) => (
          <circle key={`p${i}`} cx={X(p[0])} cy={Y(p[1])} r={4} className="h3-sf__pos" />
        ))}
      </g>
      <g className="h3-sf__dir">
        <line x1={X(mn[0])} y1={Y(mn[1])} x2={X(mp[0])} y2={Y(mp[1])} />
        <circle cx={X(mn[0])} cy={Y(mn[1])} r={7} />
        <circle cx={X(mp[0])} cy={Y(mp[1])} r={7} />
        <text x={X(mp[0]) + 12} y={Y(mp[1]) - 10}>
          v̂
        </text>
      </g>
      <g className="h3-sf__path">
        <polyline points={outs.map((o) => `${X(o.xy[0])},${Y(o.xy[1])}`).join(' ')} />
        {outs.map((o, i) => (
          <circle key={i} cx={X(o.xy[0])} cy={Y(o.xy[1])} r={i === 7 ? 7 : 4.5} data-pos={o.expr > 0 || undefined} />
        ))}
      </g>
    </svg>
  )
}

function MaskFig({ step }: { step: number }) {
  return (
    <div className="h3-maskfig" data-step={step}>
      <MaskStrip regime={step === 1 ? 1 : 0} />
      <div className="h3-maskfig__under" data-on={step === 2 || undefined}>
        <p>
          <span className="h3-k">What it says</span> a calm, neutral register
        </p>
        <p>
          <span className="h3-k">What it represents</span> shutdown, still negative
        </p>
      </div>
    </div>
  )
}
