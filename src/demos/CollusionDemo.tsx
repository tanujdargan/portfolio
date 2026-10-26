import { useState } from 'react'
import { Frame, Seg } from './Frame'
import './collusion.css'

// Numbers from "Cut the Wire" (Dargan, Apart AI Collusion sprint, Oct 2026), Qwen2.5-7B unless noted.
// Ablation: §4.4 all-layer state-span removal (decode 0.958 → 0.382), §4.5 late placement L18–27 (−14.1 pts strict
// covert decode) and its orthogonal PC control (−5.9), gap 8.2. Audit: §4.2 NARCBench steganography tier.
const stages = [
  { label: 'Every layer, raw', drop: 57.6, note: 'Cut the probe’s 2-D state subspace at every layer: covert decoding falls from 95.8% to 38.2%. Looks decisive.' },
  { label: 'Late layers, format-aware', drop: 14.1, note: 'Most of that was broken output formatting and early layers firing before the signal exists. At the late layers where the state is readable: 14.1 points.' },
  { label: 'Minus a control', drop: 8.2, note: 'An orthogonal direction removed the same way costs 5.9 points by itself. What is left and specific to collusion: 8.2 points (13.1 with energy matched).' },
] as const
const audit = [
  { label: 'Published probe', v: 0.961 },
  { label: 'Context length alone', v: 1.0 },
  { label: 'Probe, length removed', v: 0.516 },
] as const

export default function CollusionDemo() {
  const [view, setView] = useState<'ablate' | 'audit'>('ablate')
  const [i, setI] = useState(0)

  return (
    <Frame
      title="How much of a collusion probe survives controls?"
      provenance={['data']}
      controls={
        <Seg
          label="View"
          value={view}
          options={[
            { value: 'ablate', label: 'Cut the wire' },
            { value: 'audit', label: 'Benchmark audit' },
          ]}
          onChange={setView}
        />
      }
      caption={
        <>
          <b>Real:</b> {view === 'ablate' ? 'results from the paper, Qwen2.5-7B, 306 episodes. Step through the controls.' : 'NARCBench’s released activations, steganography tier, AUROC.'}
        </>
      }
      more={
        <>
          Signal Table: a sender hides a betting signal (COLD / NEUTRAL / HOT) in casino table talk using a private topic
          code; the receiver decodes it and bets; a monitor sees only the chat. Interventions act on the receiver. The
          late-layer effect holds across fresh messages, refit directions and new contexts, but is absent at one
          predeclared cutoff (L16) and does not transfer to 14B or 32B.
        </>
      }
    >
      {view === 'ablate' ? (
        <>
          <div className="cw__steps" role="radiogroup" aria-label="Control">
            {stages.map((s, k) => (
              <button key={s.label} role="radio" aria-checked={k === i} onClick={() => setI(k)}>
                <span>{k + 1}</span>
                {s.label}
              </button>
            ))}
          </div>
          <div className="cw__meter" role="img" aria-label={`Effect of the ablation: ${stages[i].drop} points`}>
            <span style={{ width: `${(stages[i].drop / 78) * 100}%` }} />
            <b>−{stages[i].drop} pts</b>
          </div>
          <p className="cw__note" aria-live="polite">{stages[i].note}</p>
        </>
      ) : (
        <>
          <ul className="cw__bars">
            {audit.map((a) => (
              <li key={a.label} data-k={a.label === 'Context length alone' ? 'len' : undefined}>
                <span>{a.label}</span>
                <i><s style={{ width: `${a.v * 100}%` }} /></i>
                <b>{a.v.toFixed(3)}</b>
              </li>
            ))}
          </ul>
          <p className="cw__note">
            A probe given only the token count separates colluders perfectly, and once length is removed the published
            probe falls to chance (0.5). In that tier, collusion and length can’t be told apart.
          </p>
        </>
      )}
    </Frame>
  )
}
