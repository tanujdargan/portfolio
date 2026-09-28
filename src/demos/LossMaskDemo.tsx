import { useState } from 'react'
import data from '../data/lossmask.json'
import { Frame, Seg } from './Frame'
import { Flag } from '../shared/Flag'
import './lossmask.css'

const presets = [
  { value: 'standard', label: 'Assistant only', lp: 0, lr: 1 },
  { value: 'mixed', label: 'λp = 0.4', lp: 0.4, lr: 1 },
  { value: 'full', label: 'Whole sequence', lp: 1, lr: 1 },
  { value: 'prompt', label: 'Prompt only', lp: 1, lr: 0 },
] as const
type P = (typeof presets)[number]['value']

export default function LossMaskDemo({ compact }: { compact?: boolean }) {
  const [lp, setLp] = useState(0)
  const [lr, setLr] = useState(1)
  const active = presets.find((p) => p.lp === lp && p.lr === lr)?.value ?? ('' as P)
  const n = (role: string) => data.segments.filter((s) => (role === 'assistant' ? s.role === role : s.role !== 'assistant')).reduce((a, s) => a + s.tokens.length, 0)
  const promptMass = lp * n('prompt')
  const respMass = lr * n('assistant')
  const total = promptMass + respMass || 1
  const share = Math.round((promptMass / total) * 100)

  return (
    <Frame
      title="Where the loss lands"
      provenance={['exact']}
      controls={
        <Seg
          label="Loss regime"
          value={active}
          options={presets.map((p) => ({ value: p.value, label: p.label }))}
          onChange={(v) => {
            const p = presets.find((x) => x.value === v)!
            setLp(p.lp)
            setLr(p.lr)
          }}
        />
      }
      caption={
        <>
          <b>Exact:</b> per-token loss weights, prompt weight λp and response weight λr, as defined in Jindal et al. 2025. Tokens are real Qwen2.5 tokens.{' '}
          <b>Illustrative:</b> the conversation. It's written to look like the existential prompts in the sprint battery.
          <Flag note="The example conversation is written for the demo, not taken from the sprint's eval set." />
        </>
      }
    >
      <div className="lm__seq" style={{ fontSize: compact ? 12 : undefined }}>
        {data.segments.map((s) => {
          const w = s.role === 'assistant' ? lr : lp
          return [
            <span key={s.role} className="lm__role">
              {s.role} · weight {w.toFixed(1)}
            </span>,
            ...s.tokens.map((t, i) => (
              <span key={s.role + i} className="lm__tok" data-w={w === 0 ? '0' : undefined} style={{ ['--w' as string]: w }}>
                {t}
              </span>
            )),
          ]
        })}
      </div>
      <div className="demo-row">
        <label>
          λp
          <input className="demo-range" type="range" min={0} max={1} step={0.1} value={lp} onChange={(e) => setLp(+e.target.value)} aria-label="Prompt token loss weight" />
          <span className="demo-readout">
            <b>{lp.toFixed(1)}</b>
          </span>
        </label>
      </div>
      <div className="lm__bar" role="img" aria-label={`${share}% of the training signal comes from prompt tokens`}>
        <span style={{ flexGrow: promptMass }} />
        <span style={{ flexGrow: respMass }} />
      </div>
      <div className="lm__legend demo-readout">
        <span>
          prompt tokens <b>{share}%</b>
        </span>
        <span>
          response tokens <b>{100 - share}%</b>
        </span>
      </div>
    </Frame>
  )
}
