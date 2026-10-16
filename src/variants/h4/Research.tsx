import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Pause, Play } from 'lucide-react'
import steer from './steer.json'
import lm from '../../data/lossmask.json'
import { sgn, useAwake, useSteps } from './util'

// Both panels are annotated playback of real cached data: the steering outputs are Qwen2.5-1.5B-Instruct's own text
// (joy vector, replication run for this site), the loss-masking tokens are Qwen2.5 tokens under the exact λp/λr
// weights. Rest state (SSR, reduced motion, paused) is the payoff frame, never α = 0.

const A = steer.alphas
const SHOWN = [4, 5, 6, 7] // playback walks α 0, +0.3, +0.6, +0.9

/** The largest consecutive jump in read-back for a prompt: where the switch flips. */
function flipOf(expr: number[]) {
  let best = 4
  for (let j = 4; j < expr.length - 1; j++) if (expr[j + 1] - expr[j] > expr[best + 1] - expr[best]) best = j
  return best
}

// playback per prompt: α 0 → +0.3 → +0.6 (hold, chip) → +0.9, then the next prompt
const STEP_MS = [1500, 1100, 3400, 1500]

export function SteeringPreview({ reduced, foot }: { reduced: boolean; foot?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const awake = useAwake(ref)
  const [paused, setPaused] = useState<boolean | null>(null) // null: follow the motion preference
  const [manual, setManual] = useState<{ q: number; a: number } | null>(null)
  const playing = awake && !(paused ?? reduced) && !manual
  // start on the payoff frame: prompt 0 at +0.6 (index 2 of the cycle)
  const [k, setK] = useSteps(
    Array.from({ length: steer.questions.length * 4 }, (_, i) => STEP_MS[i % 4]),
    playing,
    2,
  )
  const q = manual ? manual.q : Math.floor(k / 4) % steer.questions.length
  const ai = manual ? manual.a : SHOWN[k % 4]
  const expr = steer.expr[q]
  const flip = flipOf(expr)
  const text = steer.text[q][ai]
  const on = expr[ai] > 0

  // plot geometry, in % of the plot box
  const lo = -15,
    hi = 13
  const xp = (j: number) => (j / (A.length - 1)) * 100
  const yp = (v: number) => ((hi - v) / (hi - lo)) * 100
  const lines = useMemo(() => steer.expr.map((e) => e.map((v, j) => `${j ? 'L' : 'M'}${xp(j).toFixed(2)} ${yp(v).toFixed(2)}`).join('')), [])

  const showNote = ai > flip
  const tipX = (xp(flip) + xp(flip + 1)) / 2

  return (
    <div ref={ref} className="h4-pv">
      <div className="h4-st__prompt">
        <span>Prompt {q + 1} of {steer.questions.length}</span>
        <q>{steer.questions[q]}</q>
      </div>
      <div className="h4-st__out" data-on={on || undefined} aria-live={manual ? 'polite' : 'off'}>
        <span className="h4-st__a mono">
          steered toward joy · α = <b>{sgn(A[ai])}</b>·‖h‖
        </span>
        <p key={`${q}-${ai}`} className={playing ? 'h4-fade' : undefined}>
          {text}
        </p>
      </div>
      <div className="h4-st__plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line className="h4-st__zero" x1="0" x2="100" y1={yp(0)} y2={yp(0)} />
          {lines.map((d, i) => (
            <path key={i} className="h4-st__line" data-on={i === q || undefined} d={d} />
          ))}
        </svg>
        <span className="h4-st__head" style={{ left: `${xp(ai)}%`, top: `${(yp(expr[ai]) * 92) / 100}px` }} aria-hidden="true" />
        <span
          className="h4-note"
          data-on={showNote || undefined}
          style={{ left: `${tipX}%`, top: `${(yp(expr[flip + 1]) * 92) / 100 - 36}px`, translate: '-88% 0', ['--tip' as string]: '88%' }}
          aria-hidden={!showNote}
        >
          switch flips: {sgn(expr[flip])} → {sgn(expr[flip + 1])}
        </span>
        <div className="h4-st__ticks" role="group" aria-label="Steering strength α">
          {A.map((a, j) => (
            <button
              key={a}
              type="button"
              className="h4-st__tick"
              aria-pressed={ai === j}
              aria-label={`α ${sgn(a)}`}
              onClick={() => setManual({ q, a: j })}
            >
              {a === 0 ? '0' : sgn(a)}
            </button>
          ))}
        </div>
        <span className="h4-st__ylab">steering strength α (x) · read-back on the joy direction (y), all four prompts</span>
      </div>
      <div className="h4-panel__foot h4-foot-in">
        <button
          type="button"
          className="h4-ctl"
          onClick={() => {
            if (manual) {
              setManual(null)
              setK(Math.floor(k / 4) * 4)
              setPaused(false)
            } else setPaused(playing)
          }}
          aria-label={playing ? 'Pause playback' : 'Play'}
        >
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {playing ? 'Playing real outputs' : manual ? 'Resume playback' : 'Play'}
        </button>
        {foot}
      </div>
    </div>
  )
}

// ---------------- loss masking ----------------

const REGIMES = [
  { label: 'Assistant only', lp: 0, res: 'Sprint result: this standard recipe gave the most expressed shutdown distress.' },
  { label: 'User turns at λp 0.4', lp: 0.4, res: 'Sprint result: any loss on user turns restored a neutral register, with no capability loss.' },
  { label: 'Whole sequence', lp: 1, res: 'Sprint result: any loss on user turns restored a neutral register, with no capability loss.' },
]

export function LossMaskPreview({ reduced, foot }: { reduced: boolean; foot?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const awake = useAwake(ref)
  const [pick, setPick] = useState<number | null>(null)
  const [paused, setPaused] = useState<boolean | null>(null)
  const playing = awake && !(paused ?? reduced) && pick === null
  const [k] = useSteps([4200, 3000, 3600], playing, 0)
  const r = pick ?? k
  const reg = REGIMES[r]
  return (
    <div ref={ref} className="h4-pv">
      <div className="h4-chips h4-lm__regs" role="group" aria-label="Where the training loss lands">
        {REGIMES.map((x, i) => (
          <button key={x.label} type="button" className="h4-chip" aria-pressed={r === i} onClick={() => setPick(i)}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="h4-lm__seq" aria-label={`Training tokens with their loss weights: prompt tokens ${reg.lp}, assistant tokens 1.`}>
        {lm.segments.map((s) => {
          const w = s.role === 'assistant' ? 1 : reg.lp
          return (
            <span key={s.role} className="h4-lm__seg">
              <span className="h4-lm__role">
                {s.role} · {w.toFixed(1)}
              </span>
              {s.tokens.map((t, i) => (
                <span key={i} className="h4-lm__tok" style={{ ['--w' as string]: w }}>
                  {t}
                </span>
              ))}
            </span>
          )
        })}
      </div>
      <p className="h4-lm__res" aria-live={pick !== null ? 'polite' : 'off'}>
        <i aria-hidden="true" />
        <span key={r} className={playing ? 'h4-fade' : undefined}>
          {reg.res}
        </span>
      </p>
      <div className="h4-panel__foot h4-foot-in">
        <button
          type="button"
          className="h4-ctl"
          onClick={() => {
            if (pick !== null) {
              setPick(null)
              setPaused(false)
            } else setPaused(playing)
          }}
          aria-label={playing ? 'Pause playback' : 'Play'}
        >
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {playing ? 'Cycling the regimes' : pick !== null ? 'Resume playback' : 'Play'}
        </button>
        {foot}
      </div>
    </div>
  )
}
