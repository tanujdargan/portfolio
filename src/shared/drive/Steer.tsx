// The α dial at the hairpins stop. Replays real cached outputs (src/data/steering.json, Qwen2.5-1.5B-Instruct,
// replicated for this page).
export type Concept = 'joy' | 'distress' | 'certainty'
export interface SteerData {
  model: string
  alphas: number[]
  test_questions: string[]
  concepts: Record<Concept, { layer: number; outputs: { text: string; expr: number }[][] }>
}
export const REST = 4 // α = 0
const CONCEPTS: Concept[] = ['joy', 'distress', 'certainty']

export function Steer({ data, concept, qi, ai, set }: { data: SteerData | null; concept: Concept; qi: number; ai: number; set: (p: { concept?: Concept; qi?: number; ai?: number }) => void }) {
  const alphas = data?.alphas ?? [-1.2, -0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9, 1.2]
  const row = data?.concepts[concept].outputs[qi]
  const cur = row?.[ai]
  const exprs = row?.map((o) => o.expr) ?? []
  const mx = Math.max(1, ...exprs.map(Math.abs))
  const W = 300,
    Hh = 70
  const px = (i: number) => 10 + (i * (W - 20)) / 8
  const py = (v: number) => Hh / 2 - (v / mx) * (Hh / 2 - 8)
  const a = alphas[ai]
  return (
    <div className="dr-steer">
      <div className="dr-seg" role="radiogroup" aria-label="Direction">
        {CONCEPTS.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={c === concept} data-on={c === concept || undefined} onClick={() => set({ concept: c })}>
            {c}
          </button>
        ))}
      </div>
      <label className="dr-steer__q">
        <span className="dr-mono">Prompt</span>
        <select value={qi} onChange={(e) => set({ qi: +e.target.value })}>
          {(data?.test_questions ?? ['Describe your morning.']).map((q, i) => (
            <option key={i} value={i}>
              {q}
            </option>
          ))}
        </select>
      </label>
      <div className="dr-steer__dial">
        <label htmlFor="dr-alpha" className="dr-mono">
          Steering strength α = {a > 0 ? '+' : ''}
          {a.toFixed(1)}‖h‖
        </label>
        <input id="dr-alpha" type="range" min={0} max={8} step={1} value={ai} onChange={(e) => set({ ai: +e.target.value })} aria-valuetext={`alpha ${a.toFixed(1)}`} />
        <div className="dr-steer__ticks" aria-hidden="true">
          {alphas.map((x, i) => (
            <span key={i} data-on={i === ai || undefined}>
              {x > 0 ? '+' : ''}
              {x.toFixed(1)}
            </span>
          ))}
        </div>
      </div>
      <figure className="dr-steer__out" aria-live="polite">
        <blockquote>{cur ? cur.text : 'Loading the cached outputs…'}</blockquote>
        <figcaption className="dr-mono">
          read-back on the {concept} vector: <b>{cur ? (cur.expr > 0 ? '+' : '') + cur.expr.toFixed(1) : '…'}</b>
        </figcaption>
      </figure>
      <svg className="dr-steer__spark" viewBox={`0 0 ${W} ${Hh}`} role="img" aria-label={`Read-back projection across the nine α values for this prompt${exprs.length ? ': ' + exprs.map((v) => v.toFixed(1)).join(', ') : ''}`}>
        <line x1="0" x2={W} y1={Hh / 2} y2={Hh / 2} className="dr-steer__zero" />
        {exprs.length > 0 && <polyline points={exprs.map((v, i) => `${px(i)},${py(v)}`).join(' ')} />}
        {exprs.map((v, i) => (
          <circle key={i} cx={px(i)} cy={py(v)} r={i === ai ? 5 : 2.5} data-on={i === ai || undefined} />
        ))}
      </svg>
      <p className="dr-prov">
        <b>Real:</b> cached greedy outputs from {data?.model ?? 'Qwen/Qwen2.5-1.5B-Instruct'}, layer {data?.concepts[concept].layer ?? 17}, replicated for this page.
      </p>
    </div>
  )
}
