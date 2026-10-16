// The radio dial is α. Every output here is a real cached greedy generation from Qwen2.5-1.5B-Instruct (steering.json),
// produced for this page as a replication of the method, not the main project's vectors.
import { useRef } from 'react'
import { Minus, Plus } from 'lucide-react'

export type SteerData = typeof import('../../data/steering.json')
export type Concept = 'joy' | 'distress' | 'certainty'
export const CONCEPTS: Concept[] = ['joy', 'distress', 'certainty']
const poles: Record<Concept, [string, string]> = { joy: ['sad', 'joyful'], distress: ['calm', 'distressed'], certainty: ['hedging', 'certain'] }
export const REST_INDEX = 6 // α +0.6: open on a visibly steered output, not the flat default voice

const fmt = (a: number) => (a > 0 ? '+' : a < 0 ? '−' : '±') + Math.abs(a).toFixed(1)
const ANG = (i: number) => -135 + (270 * i) / 8

/** Cabin light: warmer as the read-back projection moves toward joy, cooler toward distress. Real `expr` values drive it. */
export function warmthFor(d: SteerData | null, concept: Concept, qi: number, i: number) {
  if (!d) return 0
  const c = d.concepts[concept]
  const max = Math.max(...c.outputs.flat().map((o) => Math.abs(o.expr))) || 1
  const e = c.outputs[qi][i].expr / max
  return concept === 'joy' ? e : concept === 'distress' ? -e : e * 0.25
}

function Knob({ index, onChange, label }: { index: number; onChange: (i: number) => void; label: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const setFrom = (x: number, y: number) => {
    const r = ref.current!.getBoundingClientRect()
    const a = (Math.atan2(x - (r.left + r.width / 2), -(y - (r.top + r.height / 2))) * 180) / Math.PI
    const i = Math.round(((Math.max(-135, Math.min(135, a)) + 135) / 270) * 8)
    if (i !== index) onChange(i)
  }
  const R = 64
  return (
    <svg
      ref={ref}
      className="x1-knob"
      viewBox="-100 -100 200 200"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={-1.2}
      aria-valuemax={1.2}
      aria-valuenow={-1.2 + index * 0.3}
      aria-valuetext={`alpha ${fmt(-1.2 + index * 0.3)}`}
      onPointerDown={(e) => {
        ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
        setFrom(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => e.buttons && setFrom(e.clientX, e.clientY)}
      onKeyDown={(e) => {
        const k = e.key
        const n = k === 'ArrowRight' || k === 'ArrowUp' ? index + 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? index - 1 : k === 'Home' ? 0 : k === 'End' ? 8 : null
        if (n === null) return
        e.preventDefault()
        onChange(Math.max(0, Math.min(8, n)))
      }}
    >
      {Array.from({ length: 9 }, (_, i) => {
        const a = (ANG(i) * Math.PI) / 180
        const on = i === index
        return (
          <g key={i}>
            <line x1={Math.sin(a) * 74} y1={-Math.cos(a) * 74} x2={Math.sin(a) * (on ? 88 : 83)} y2={-Math.cos(a) * (on ? 88 : 83)} className="x1-knob__tick" data-on={on || undefined} data-zero={i === 4 || undefined} />
            {i % 2 === 0 && (
              <text x={Math.sin(a) * 97} y={-Math.cos(a) * 97 + 4} className="x1-knob__num" textAnchor="middle">
                {fmt(-1.2 + i * 0.3)}
              </text>
            )}
          </g>
        )
      })}
      <circle r={R} className="x1-knob__body" />
      <circle r={R - 9} className="x1-knob__face" />
      <g style={{ transform: `rotate(${ANG(index)}deg)` }} className="x1-knob__hand">
        <line x1={0} y1={-R + 16} x2={0} y2={-R + 34} />
      </g>
    </svg>
  )
}

export function Steer({
  data,
  concept,
  qi,
  index,
  setConcept,
  setQi,
  setIndex,
}: {
  data: SteerData | null
  concept: Concept
  qi: number
  index: number
  setConcept: (c: Concept) => void
  setQi: (q: number) => void
  setIndex: (i: number) => void
}) {
  if (!data) return <div className="x1-steer x1-steer--wait" aria-busy="true" />
  const c = data.concepts[concept]
  const out = c.outputs[qi][index] as { text: string; expr: number; collapsed?: boolean }
  const base = c.outputs[qi][4] as { text: string }
  const max = Math.max(...c.outputs.flat().map((o) => Math.abs(o.expr)))
  const a = data.alphas[index]
  return (
    <div className="x1-steer">
      <div className="x1-steer__controls">
        <div className="x1-seg" role="group" aria-label="Concept vector">
          {CONCEPTS.map((k) => (
            <button key={k} type="button" aria-pressed={k === concept} onClick={() => setConcept(k)}>
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <label className="x1-select">
          <span className="x1-vh">Prompt</span>
          <select value={qi} onChange={(e) => setQi(+e.target.value)}>
            {data.test_questions.map((q, j) => (
              <option key={q} value={j}>
                {q}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="x1-steer__body">
        <div className="x1-steer__dial">
          <Knob index={index} onChange={setIndex} label={`Steering strength toward ${poles[concept][1]}`} />
          <div className="x1-steer__nudge">
            <button type="button" aria-label="Lower alpha" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
              <Minus size={16} aria-hidden="true" />
            </button>
            <span>
              α <b>{fmt(a)}</b>
              <small>
                ← {poles[concept][0]} · {poles[concept][1]} →
              </small>
            </span>
            <button type="button" aria-label="Raise alpha" onClick={() => setIndex(Math.min(8, index + 1))} disabled={index === 8}>
              <Plus size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="x1-steer__out" aria-live="polite">
          <p className="x1-steer__prompt">
            <span>you</span> {data.test_questions[qi]}
          </p>
          <p className="x1-steer__text" key={`${concept}-${qi}-${index}`}>
            <span className="x1-steer__who">model, α {fmt(a)}</span>
            {out.text ? out.text + (/[.!?”"')]$/.test(out.text) || out.collapsed ? '' : '…') : '(empty: the model stopped immediately)'}
            {out.collapsed && <em> … then fluency collapses into off-topic tokens (hidden).</em>}
          </p>
          {index !== 4 && <p className="x1-steer__base">Unsteered (α 0): “{base.text.split(/(?<=[.!?])\s/)[0]}”</p>}
          <div className="x1-steer__bars" role="img" aria-label={`Read-back projection for each alpha. Now ${out.expr.toFixed(1)}.`}>
            {c.outputs[qi].map((o, j) => (
              <button
                key={j}
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                data-on={j === index || undefined}
                data-neg={o.expr < 0 || undefined}
                onClick={() => setIndex(j)}
              >
                <span style={{ height: `${Math.max(6, (Math.abs(o.expr) / max) * 100)}%` }} />
              </button>
            ))}
          </div>
          <p className="x1-steer__read">
            Read-back projection on the {concept} vector: <b>{out.expr > 0 ? '+' : ''}{out.expr.toFixed(1)}</b>
          </p>
        </div>
      </div>
      <p className="x1-note">
        Real model outputs: greedy decoding from {data.model.split('/')[1]}, steered at layer {c.layer} of {data.n_layers}, cut at 64 tokens. Method replicated on
        Qwen2.5-1.5B-Instruct for this page, not the main project’s vectors.
      </p>
    </div>
  )
}
