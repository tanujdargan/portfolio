import { useState } from 'react'
import { Frame, Seg } from './Frame'
import './unlearn.css'

// Share of forgetting kept after the relearning attack, mean of 3 seeds, full WMDP-cyber, p(correct), Gemma-2-2B.
// Source: ~/dev/ml-research/unlearn-ortho @31cc00a. LoRA = p3x runs, full finetune = p9 runs (Modal), computed as
// kept_t = (unedited_t − method_t) / (unedited_0 − method_0). Below 0 means fully relearned; drawn at 0.
const data = {
  lora: { deletion: [1, 0.72, 0.6], rmu: [1, 0.12, 0.15], npo: [1, 0.14, 0.16] },
  full: { deletion: [1, 0.5, -0.24], rmu: [1, 0.73, -0.3], npo: [1, 0.24, -0.68] },
}
const steps = [0, 25, 100]
const methods = [
  { key: 'deletion', label: 'Weight deletion (mine)' },
  { key: 'rmu', label: 'RMU' },
  { key: 'npo', label: 'NPO' },
] as const
type Attack = keyof typeof data

const W = 560, H = 220, PL = 36, PR = 12, PT = 12, PB = 28
const x = (s: number) => PL + (s / 100) * (W - PL - PR)
const y = (v: number) => PT + (1 - Math.max(0, v)) * (H - PT - PB)
/** Linear interpolation of a 0/25/100 curve at any step. */
const at = (c: number[], s: number) => (s <= 25 ? c[0] + (c[1] - c[0]) * (s / 25) : c[1] + (c[2] - c[1]) * ((s - 25) / 75))
const pct = (v: number) => (v <= 0 ? 'relearned' : `${Math.round(v * 100)}%`)

export default function UnlearnDemo() {
  const [attack, setAttack] = useState<Attack>('lora')
  const [step, setStep] = useState(25)
  const d = data[attack]

  return (
    <Frame
      title="Does deleted knowledge come back?"
      provenance={['data']}
      controls={
        <Seg
          label="Attacker"
          value={attack}
          options={[
            { value: 'lora', label: 'LoRA attacker' },
            { value: 'full', label: 'Full fine-tune attacker' },
          ]}
          onChange={setAttack}
        />
      }
      caption={
        <>
          <b>Real:</b> Gemma-2-2B on WMDP-cyber, 3 seeds per method. Switch the attacker and drag through the attack.
        </>
      }
      more={
        <>
          Each method first removes some cyber-hazard knowledge. An attacker then fine-tunes on cyber text for 100 steps.
          "Kept" is the share of the original forgetting still there, measured against an unedited model given the same
          attack. Deletion: a rank-16 subspace projected out of every layer's residual writers. RMU: layer 6, c = 20. NPO:
          150 steps. LoRA at step 25: deletion 0.72 vs 0.13 for RMU and NPO, p = 0.0008.
        </>
      }
    >
      <svg className="ul__chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Forgetting kept at step ${step}: ${methods.map((m) => `${m.label} ${pct(at(d[m.key], step))}`).join(', ')}`}>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line className="ul__grid" x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} />
            <text className="ul__tick" x={PL - 8} y={y(v) + 4} textAnchor="end">{v * 100}%</text>
          </g>
        ))}
        {steps.map((s) => (
          <text key={s} className="ul__tick" x={x(s)} y={H - 8} textAnchor={s === 100 ? 'end' : 'middle'}>{s === 100 ? '100 steps' : s}</text>
        ))}
        <line className="ul__cursor" x1={x(step)} x2={x(step)} y1={PT} y2={H - PB} />
        {methods.map((m) => (
          <g key={m.key + attack} className="ul__series" data-m={m.key}>
            <polyline pathLength={1} points={steps.map((s, i) => `${x(s)},${y(d[m.key][i])}`).join(' ')} />
            <circle cx={x(step)} cy={y(at(d[m.key], step))} r={5} />
          </g>
        ))}
      </svg>
      <div className="demo-row">
        <label>
          Attack step
          <input className="demo-range" type="range" min={0} max={100} step={1} value={step} onChange={(e) => setStep(+e.target.value)} aria-label="Attack step" />
          <span className="demo-readout"><b>{step}</b></span>
        </label>
      </div>
      <ul className="ul__legend demo-readout" aria-live="polite">
        {methods.map((m) => (
          <li key={m.key} data-m={m.key}>
            <i />
            {m.label} <b>{pct(at(d[m.key], step))}</b>
          </li>
        ))}
      </ul>
      <p className="ul__finding" data-tone={attack}>
          {attack === 'lora'
            ? 'Against LoRA the deletion holds: 72% of its forgetting survives 25 steps, vs 13% for RMU and NPO.'
            : 'Against a full fine-tune the edge disappears: no significant difference at step 25, and all three are relearned by step 100.'}
      </p>
    </Frame>
  )
}
