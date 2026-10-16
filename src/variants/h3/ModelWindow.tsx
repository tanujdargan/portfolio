import { useRef, useState } from 'react'
import steering from '../../data/steering.json'

const A = steering.alphas
const joy = steering.concepts.joy
const LO = A.indexOf(-0.9)
const HI = A.indexOf(0.9)
const fmt = (a: number) => (a > 0 ? `+${a.toFixed(1)}` : a < 0 ? `−${Math.abs(a).toFixed(1)}` : '0')
const fmtE = (e: number) => (e > 0 ? `+${e.toFixed(1)}` : `−${Math.abs(e).toFixed(1)}`)

/**
 * The "model" object: one prompt, two real outputs side by side (α −0.9 and the scrubbed α, +0.9 at rest), and the
 * read-back projection for all nine α as a strip you can scrub. Outputs are the cached greedy decodes in steering.json.
 */
export function ModelWindow({ big = false }: { big?: boolean }) {
  const [qi, setQi] = useState(0)
  const [ai, setAi] = useState(HI)
  const outs = joy.outputs[qi]
  const lo = outs[LO]
  const cur = outs[ai]
  const ex = outs.map((o) => o.expr)
  const min = Math.min(...ex, -14)
  const max = Math.max(...ex, 12)
  const W = 300
  const Hh = 64
  const px = (i: number) => 10 + (i / (A.length - 1)) * (W - 20)
  const py = (e: number) => 6 + (1 - (e - min) / (max - min)) * (Hh - 12)
  const strip = useRef<SVGSVGElement>(null)
  const drag = useRef(false)

  const pick = (clientX: number) => {
    const r = strip.current!.getBoundingClientRect()
    const f = ((clientX - r.left) / r.width) * W
    const i = Math.round(((f - 10) / (W - 20)) * (A.length - 1))
    setAi(Math.max(0, Math.min(A.length - 1, i)))
  }

  return (
    <div className="h3-win h3-model" data-big={big || undefined}>
      <div className="h3-win__bar">
        <span className="h3-win__light" aria-hidden="true" />
        <span className="h3-win__name">Qwen2.5-1.5B-Instruct</span>
        <span className="h3-win__meta">joy direction · layer {joy.layer}</span>
      </div>
      <div className="h3-model__prompt">
        <span className="h3-k">Prompt</span>
        <span className="h3-model__q">“{steering.test_questions[qi]}”</span>
        <button
          type="button"
          className="h3-chipbtn"
          onClick={(e) => {
            e.stopPropagation()
            setQi((qi + 1) % steering.test_questions.length)
          }}
          aria-label={`Next prompt (${qi + 1} of ${steering.test_questions.length})`}
        >
          Next prompt
        </button>
      </div>
      <div className="h3-model__pair">
        <figure className="h3-out" data-tone="lo">
          <figcaption>
            <span className="h3-k">α {fmt(A[LO])}</span>
            <span className="h3-out__e">read-back {fmtE(lo.expr)}</span>
          </figcaption>
          <p>{lo.text}</p>
        </figure>
        <figure className="h3-out" data-tone={cur.expr > 0 ? 'hi' : 'lo'}>
          <figcaption>
            <span className="h3-k">α {fmt(A[ai])}</span>
            <span className="h3-out__e">read-back {fmtE(cur.expr)}</span>
          </figcaption>
          <p key={`${qi}-${ai}`} className="h3-out__swap">
            {cur.text}
          </p>
        </figure>
      </div>
      <div className="h3-model__scrub">
        <button type="button" className="h3-step" aria-label="Lower α" onClick={(e) => (e.stopPropagation(), setAi(Math.max(0, ai - 1)))}>
          −
        </button>
        <svg
          ref={strip}
          className="h3-strip"
          viewBox={`0 0 ${W} ${Hh}`}
          role="slider"
          tabIndex={0}
          aria-label="Steering strength α along the joy direction"
          aria-valuemin={A[0]}
          aria-valuemax={A[A.length - 1]}
          aria-valuenow={A[ai]}
          aria-valuetext={`α ${fmt(A[ai])}, read-back ${fmtE(cur.expr)}`}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setAi(Math.min(A.length - 1, ai + 1))
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setAi(Math.max(0, ai - 1))
            else if (e.key === 'Home') setAi(0)
            else if (e.key === 'End') setAi(A.length - 1)
            else return
            e.preventDefault()
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.stopPropagation()
            pick(e.clientX)
            if (e.pointerType === 'mouse') {
              drag.current = true
              ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
            }
          }}
          onPointerMove={(e) => drag.current && pick(e.clientX)}
          onPointerUp={() => (drag.current = false)}
        >
          <line x1={0} x2={W} y1={py(0)} y2={py(0)} className="h3-strip__zero" />
          <polyline points={ex.map((e, i) => `${px(i)},${py(e)}`).join(' ')} className="h3-strip__line" />
          {ex.map((e, i) => (
            <circle
              key={i}
              cx={px(i)}
              cy={py(e)}
              r={i === ai ? 4.5 : 3}
              className="h3-strip__pt"
              data-on={i === ai || undefined}
              data-pos={e > 0 || undefined}
            />
          ))}
          <line x1={px(ai)} x2={px(ai)} y1={0} y2={Hh} className="h3-strip__cursor" />
        </svg>
        <button
          type="button"
          className="h3-step"
          aria-label="Raise α"
          onClick={(e) => (e.stopPropagation(), setAi(Math.min(A.length - 1, ai + 1)))}
        >
          +
        </button>
      </div>
      <p className="h3-win__foot">
        <span className="h3-prov">Real model outputs</span> Method replicated on Qwen2.5-1.5B-Instruct for this page.
      </p>
    </div>
  )
}
