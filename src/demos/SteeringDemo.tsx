import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import data from '../data/steering.json'
import { useMotionPrefs } from '../lib/motion'
import { Frame, Seg } from './Frame'
import './steering.css'

type Concept = keyof typeof data.concepts
const poles: Record<Concept, [string, string]> = { joy: ['sad', 'joyful'], distress: ['calm', 'distressed'], certainty: ['hedging', 'certain'] }
const A = data.alphas
const nearest = (a: number) => A.reduce((bi, v, i) => (Math.abs(v - a) < Math.abs(A[bi] - a) ? i : bi), 0)

export default function SteeringDemo({ compact, hero }: { compact?: boolean; hero?: boolean }) {
  const m = useMotionPrefs()
  const [concept, setConcept] = useState<Concept>('joy')
  const [qi, setQi] = useState(0)
  const [alpha, setAlpha] = useState(0)
  const touched = useRef(false)
  const root = useRef<HTMLDivElement>(null)
  const c = data.concepts[concept]
  const i = nearest(alpha)
  const out = c.outputs[qi][i]

  // One demonstration sweep the first time the demo is seen, so it reads as alive. Skipped under reduced motion.
  useEffect(() => {
    if (m.reduced) return
    let raf = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || touched.current) return
        io.disconnect()
        const t0 = performance.now()
        const T = 2600 * (m.level === 'subtle' ? 0.8 : m.level === 'expressive' ? 1.2 : 1)
        const tick = (now: number) => {
          if (touched.current) return
          const p = Math.min(1, (now - t0) / T)
          // 0 → +0.9 → hold → 0.6 (lands on a visibly steered output)
          const a = p < 0.45 ? 0.9 * Math.sin((p / 0.45) * (Math.PI / 2)) : p < 0.7 ? 0.9 : 0.9 - 0.3 * ((p - 0.7) / 0.3)
          setAlpha(Math.round(a * 100) / 100)
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.5 },
    )
    io.observe(root.current!)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [m.reduced, m.level])

  const touch = () => (touched.current = true)

  // Plot geometry: x is literally the projection on v̂; y is the top residual PC.
  const plot = useMemo(() => {
    const pts = [...c.cloud.pos, ...c.cloud.neg, ...c.outputs.flat().map((o) => o.xy)]
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const W = 400
    const H = 296
    const pad = 24
    const sx = (x: number) => pad + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * pad)
    const sy = (y: number) => H - pad - ((y - y0) / (y1 - y0 || 1)) * (H - 2 * pad)
    return { W, H, sx, sy, zero: sx(0) }
  }, [c])

  const traj = c.outputs[qi].map((o) => `${plot.sx(o.xy[0]).toFixed(1)},${plot.sy(o.xy[1]).toFixed(1)}`).join(' ')
  const maxExpr = Math.max(...c.outputs.flat().map((o) => Math.abs(o.expr)))
  const fmt = (a: number) => (a > 0 ? '+' : a < 0 ? '−' : '±') + Math.abs(a).toFixed(2)

  return (
    <div ref={root}>
      <Frame
        title={hero ? 'Drag to steer a real model' : 'Activation steering, live'}
        provenance={['real']}
        controls={
          <>
            <Seg
              label="Concept vector"
              value={concept}
              options={(Object.keys(data.concepts) as Concept[]).map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) }))}
              onChange={(v) => {
                touch()
                setConcept(v)
              }}
            />
            <select
              className="demo-select"
              value={qi}
              aria-label="Prompt"
              onChange={(e) => {
                touch()
                setQi(+e.target.value)
              }}
            >
              {data.test_questions.map((q, j) => (
                <option key={q} value={j}>
                  {q}
                </option>
              ))}
            </select>
          </>
        }
        caption={
          <>
            <b>Real:</b> every sentence above is actual greedy output from {data.model.split('/')[1]}, with the vector added at layer {c.layer} of {data.n_layers}, cut at 64 tokens.
            Vectors are differences of means over {data.extract_questions} contrastive prompts. The plot shows real activations: x is the projection on the
            vector, y is the next principal direction. Generated locally for this page on 27 Sep 2026. It's a replication of the method, not the main project's
            vectors.
          </>
        }
      >
        <div className="steer" data-compact={compact || undefined}>
          <div>
            <div className="steer__out" aria-live="polite">
              <div className="steer__prompt">
                user › {data.test_questions[qi]}
                <br />
                model{alpha !== 0 ? ` + ${fmt(A[i])}‖h‖·v̂` : ''} ›
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={`${concept}-${qi}-${i}`}
                  className="steer__text"
                  data-empty={!out.text || undefined}
                  initial={{ opacity: 0, y: 6 * m.k, filter: m.reduced ? 'none' : 'blur(3px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: m.reduced ? 'none' : 'blur(2px)' }}
                  transition={{ duration: m.dur(0.16), ease: [0.23, 1, 0.32, 1] }}
                >
                  {out.text ? out.text + (/[.!?”"')]$/.test(out.text) || 'collapsed' in out ? '' : '…') : '(empty — the model stopped immediately)'}
                  {'collapsed' in out && <span className="steer__collapsed"> … then fluency collapses into off-topic tokens (hidden).</span>}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="steer__slider">
              <div className="steer__alpha">
                <span>← {poles[concept][0]}</span>
                <span>
                  α <b>{fmt(alpha)}</b>
                </span>
                <span>{poles[concept][1]} →</span>
              </div>
              <input
                className="demo-range"
                type="range"
                min={A[0]}
                max={A[A.length - 1]}
                step={0.01}
                value={alpha}
                aria-label={`Steering strength toward ${poles[concept][1]}`}
                aria-valuetext={`alpha ${fmt(A[i])}`}
                onPointerDown={touch}
                onKeyDown={touch}
                onChange={(e) => {
                  touch()
                  setAlpha(+e.target.value)
                }}
                onPointerUp={() => setAlpha(A[i])}
              />
              <div className="steer__ticks" aria-hidden="true">
                {A.map((a) => (
                  <span key={a} />
                ))}
              </div>
            </div>
            <div className="steer__layers" role="img" aria-label="Measured projection onto the vector for each steering strength">
              {c.outputs[qi].map((o, j) => (
                <span
                  key={j}
                  data-on={j === i || undefined}
                  data-neg={o.expr < 0 || undefined}
                  style={{ height: `${Math.max(3, (Math.abs(o.expr) / maxExpr) * 50)}%` }}
                />
              ))}
            </div>
            <div className="demo-readout" style={{ marginTop: 6 }}>
              read-back projection on v̂ per α · now <b>{out.expr > 0 ? '+' : ''}{out.expr.toFixed(1)}</b>
            </div>
          </div>
          <div>
            <svg className="steer__plot" viewBox={`0 0 ${plot.W} ${plot.H}`} role="img" aria-label={`Activations at layer ${c.layer}. Positive and negative prompt clouds, and the steered outputs moving along the ${concept} direction.`}>
              <line x1={plot.zero} x2={plot.zero} y1={12} y2={plot.H - 12} stroke="var(--d-line)" />
              {c.cloud.neg.map((p, j) => (
                <circle key={'n' + j} cx={plot.sx(p[0])} cy={plot.sy(p[1])} r={3} fill="var(--d-fg3)" opacity={0.7} />
              ))}
              {c.cloud.pos.map((p, j) => (
                <circle key={'p' + j} cx={plot.sx(p[0])} cy={plot.sy(p[1])} r={3} fill="var(--d-accent)" opacity={0.45} />
              ))}
              <polyline points={traj} fill="none" stroke="var(--d-fg2)" strokeWidth={1} strokeDasharray="2 3" />
              {c.outputs[qi].map((o, j) => (
                <circle key={'t' + j} cx={plot.sx(o.xy[0])} cy={plot.sy(o.xy[1])} r={1.8} fill="var(--d-fg2)" />
              ))}
              <motion.circle
                r={7}
                fill="var(--d-fg)"
                stroke="var(--d-bg)"
                strokeWidth={2}
                initial={false}
                animate={{ cx: plot.sx(out.xy[0]), cy: plot.sy(out.xy[1]) }}
                transition={m.spring(380)}
              />
              <g fontFamily="var(--font-mono, ui-monospace)" fontSize={11} fill="var(--d-fg2)">
                <text x={plot.W - 24} y={plot.H - 8} textAnchor="end">
                  v̂ {concept} →
                </text>
                <text x={24} y={18}>
                  layer {c.layer} · {poles[concept][1]} prompts
                  <tspan fill="var(--d-accent)"> ●</tspan> · {poles[concept][0]}
                  <tspan fill="var(--d-fg3)"> ●</tspan>
                </text>
              </g>
            </svg>
          </div>
        </div>
      </Frame>
    </div>
  )
}
