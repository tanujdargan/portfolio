import { useState } from 'react'
import steering from '../../data/steering.json'
import lossmask from '../../data/lossmask.json'
import { Demo } from '../../demos/Demo'
import { Chip, Marker, Shell, useScript } from './play'

export interface TrackProps {
  i: number
  run: boolean
  startAtEnd: boolean
}

const minus = (s: string) => s.replace('-', '−')
const sgn = (n: number, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(d)
const trim = (s: string, n: number) => {
  if (s.length <= n) return s
  const cut = s.slice(0, n)
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—-]$/, '') + '…'
}

/* ------------------------------------------------------------------ 01 · steering */

const J = steering.concepts.joy
const PROMPT = steering.test_questions[0]
const OUT = J.outputs[0]
const AL = steering.alphas
const fa = (i: number) => (AL[i] === 0 ? '0' : sgn(AL[i]))
// [alpha index, hold ms]. Up through the switch first (the payoff lands at ~2 s), then the flat negative side, then rest on +0.6.
const SWEEP: [number, number][] = [
  [4, 1300],
  [5, 750],
  [6, 2300],
  [7, 650],
  [8, 1000],
  [4, 750],
  [2, 600],
  [0, 2000],
  [6, 0],
]
const YMIN = -16
const YMAX = 14
const px = (i: number) => (i / (AL.length - 1)) * 100
const py = (e: number) => ((YMAX - e) / (YMAX - YMIN)) * 100
const linePts = OUT.map((o, i) => `${px(i)},${py(o.expr)}`).join(' ')
const JUMP_X = (px(5) + px(6)) / 2

export function SteeringTrack({ i, run, startAtEnd }: TrackProps) {
  const s = useScript(
    SWEEP.map((x) => x[1]),
    run,
    startAtEnd,
  )
  const [open, setOpen] = useState(false)
  const cur = SWEEP[s.step][0]
  const visited = new Set(SWEEP.slice(0, s.step + 1).map((x) => x[0]))
  const on = { a: s.step >= 0, c: s.step >= 2, b: s.step >= 7 }
  const words = trim(OUT[cur].text, 200).split(' ')
  return (
    <Shell
      i={i}
      head={
        <>
          <span className="h2-dim">Qwen2.5-1.5B, steered along</span> joy
        </>
      }
      badge="Real model outputs"
      progress={s.head}
      open={open}
      setOpen={setOpen}
      canReplay={!s.reduced && s.done}
      onReplay={s.replay}
      demo={<Demo kind="steering" rest={0.6} finding />}
      code={
        <>
          <span className="h2-code__f">steer</span>(<span className="h2-code__s">"{PROMPT}"</span>, vector=<span className="h2-code__s">"joy"</span>, layer=
          <span className="h2-code__n">{J.layer}</span>, α=<span className="h2-code__n h2-code__live">{open ? '…' : fa(cur)}</span>)
        </>
      }
      note={<>Method replicated on Qwen2.5-1.5B-Instruct for this page, not my main project. α is in units of ‖h‖ at layer {J.layer}.</>}
      chips={
        <>
          <Chip n={1} on={on.a} value={`read-back ${minus(OUT[4].expr.toFixed(1))}`}>
            No steering: the default assistant voice.
          </Chip>
          <Chip n={2} on={on.c} tone="hi" value={`read-back ${minus(OUT[5].expr.toFixed(1))} → ${sgn(OUT[6].expr)}`}>
            Joy switches on between α +0.3 and +0.6.
          </Chip>
          <Chip n={3} on={on.b} value={`read-back ${minus(OUT[0].expr.toFixed(1))}`}>
            Steering negative barely moves the text: the default voice is already flat.
          </Chip>
        </>
      }
    >
      <div className="h2-st">
        <p className="h2-st__prompt">
          <span className="h2-k">Prompt</span> {PROMPT}
        </p>
        <div className="h2-st__out" data-dim="">
          <span className="h2-k">α 0</span>
          <p>{trim(OUT[4].text, 130)}</p>
        </div>
        <div className="h2-st__out" data-hot={AL[cur] >= 0.6 || undefined}>
          <span className="h2-k">
            α <b>{fa(cur)}</b>
          </span>
          <p key={cur} aria-live="off">
            {words.map((w, k) => (
              <span key={k} style={{ ['--k' as string]: k }}>
                {w}{' '}
              </span>
            ))}
          </p>
        </div>
        <div className="h2-st__plot" role="img" aria-label={`Read-back projection on the joy direction against α: flat near ${minus(OUT[4].expr.toFixed(1))} for α up to +0.3, then ${sgn(OUT[6].expr)} at +0.6.`}>
          <span className="h2-st__axis" aria-hidden="true">
            read-back on joy
          </span>
          <span className="h2-st__band" style={{ left: `${px(5)}%`, width: `${px(6) - px(5)}%` }} aria-hidden="true" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" x2="100" y1={py(0)} y2={py(0)} className="h2-st__zero" />
            <polyline points={linePts} className="h2-st__ghost" />
          </svg>
          {OUT.map((o, k) => (
            <span key={k} className="h2-st__dot" data-on={visited.has(k) || undefined} data-cur={k === cur || undefined} style={{ left: `${px(k)}%`, top: `${py(o.expr)}%` }} aria-hidden="true" />
          ))}
          <span className="h2-st__head" style={{ left: `${px(cur)}%` }} aria-hidden="true">
            <span className="h2-st__read" data-side={px(cur) > 70 ? 'l' : undefined} style={{ top: `${py(OUT[cur].expr)}%` }}>
              {sgn(OUT[cur].expr)}
            </span>
          </span>
          <Marker n={1} on={on.a} style={{ left: `${px(4)}%`, top: `${py(OUT[4].expr)}%` }} />
          <Marker n={2} on={on.c} style={{ left: `${JUMP_X}%`, top: `${py(0)}%` }} />
          <Marker n={3} on={on.b} style={{ left: `${px(0)}%`, top: `${py(OUT[0].expr)}%` }} />
        </div>
        <div className="h2-st__ruler" aria-hidden="true">
          {AL.map((a, k) => (
            <span key={k} style={{ left: `${px(k)}%` }} data-major={k % 2 === 0 || undefined} data-cur={k === cur || undefined}>
              {k === cur ? 'α ' : ''}
              {a === 0 ? '0' : sgn(a)}
            </span>
          ))}
        </div>
      </div>
    </Shell>
  )
}

/* ------------------------------------------------------------------ 02 · loss masking */

const SEG = lossmask.segments
const N_PROMPT = SEG.filter((x) => x.role !== 'assistant').reduce((a, x) => a + x.tokens.length, 0)
const N_RESP = SEG.filter((x) => x.role === 'assistant').reduce((a, x) => a + x.tokens.length, 0)
const share = (lp: number, lr: number) => Math.round(((lp * N_PROMPT) / (lp * N_PROMPT + lr * N_RESP || 1)) * 100)
const TK = 36 // ms per token in the sweep
// 0 idle · 1 sweep prompt · 2 sweep response · 3 standard result · 4 regime flips, prompt sweep · 5 mixed result · 6 dissociation
const LM: number[] = [500, N_PROMPT * TK, N_RESP * TK + 300, 2300, N_PROMPT * TK + 400, 2500, 0]

export function LossTrack({ i, run, startAtEnd }: TrackProps) {
  const s = useScript(LM, run, startAtEnd)
  const [open, setOpen] = useState(false)
  const st = s.step
  const mixed = st >= 4
  const lp = mixed ? 0.4 : 0
  const pass = st >= 4 ? 2 : st >= 1 ? 1 : 0
  let gi = 0
  return (
    <Shell
      i={i}
      head={<>Where the training loss lands</>}
      badge="Exact tokens + weights"
      progress={s.head}
      open={open}
      setOpen={setOpen}
      canReplay={!s.reduced && s.done}
      onReplay={s.replay}
      demo={<Demo kind="lossmask" finding />}
      code={
        <>
          <span className="h2-code__f">sft</span>(model, conversations, λp=<span className="h2-code__n h2-code__live">{lp.toFixed(1)}</span>, λr=<span className="h2-code__n">1.0</span>)
        </>
      }
      note={<>Real Qwen2.5 tokens and the exact λp/λr weights of Jindal et al. 2025. The conversation itself is illustrative.</>}
      chips={
        <>
          <Chip n={1} on={st >= 2} value={mixed ? 'weight 0.4' : 'weight 0.0'}>
            {mixed ? 'User turns now carry loss too.' : 'The standard recipe ignores the user’s words.'}
          </Chip>
          <Chip n={2} on={st >= 3} value="weight 1.0">
            Loss lands on the assistant’s {N_RESP} tokens.
          </Chip>
          <Chip n={3} on={st >= 3} tone="hi" value={mixed ? 'neutral register, no capability loss' : 'most expressed distress'}>
            {mixed ? 'Sprint result, any user-turn loss:' : 'Sprint result, assistant-only loss:'}
          </Chip>
          <Chip n={4} on={st >= 6}>
            Underneath, valence probes still register shutdown negatively. Sounding calm is not the same as being calm.
          </Chip>
        </>
      }
    >
      <div className="h2-lm" data-pass={pass}>
        <p className="h2-lm__regime">
          <span className="h2-k">Regime</span>
          <span key={String(mixed)} className="h2-lm__rname">
            {mixed ? 'λp 0.4 · loss on user turns too' : 'Assistant only · the standard SFT recipe'}
          </span>
        </p>
        {SEG.map((seg) => {
          const w = seg.role === 'assistant' ? 1 : lp
          const n = seg.role === 'user' ? 1 : seg.role === 'assistant' ? 2 : 0
          return (
            <div key={seg.role} className="h2-lm__seg" data-role={seg.role}>
              <span className="h2-lm__role">
                {seg.role}
                <b>{w.toFixed(1)}</b>
              </span>
              <p className="h2-lm__toks">
                {seg.tokens.map((t, k) => {
                  const idx = gi++
                  return (
                    <span key={k} className="h2-tok" style={{ ['--i' as string]: idx, ['--w' as string]: pass ? w : 0 }} data-z={pass && w === 0 ? '' : undefined}>
                      {t}
                    </span>
                  )
                })}
                {n > 0 && <Marker n={n} on={n === 1 ? st >= 2 : st >= 3} />}
              </p>
            </div>
          )
        })}
        <div className="h2-lm__bars" aria-label="Share of the training signal on prompt tokens">
          <div className="h2-lm__bar">
            <span>Assistant only</span>
            <i>
              <b style={{ width: `${pass >= 1 && st >= 3 ? 100 - share(0, 1) : 0}%` }} />
            </i>
            <em>{share(0, 1)}% on prompt</em>
          </div>
          <div className="h2-lm__bar" data-on={mixed || undefined}>
            <span>λp 0.4</span>
            <i>
              <b style={{ width: `${st >= 5 ? 100 - share(0.4, 1) : 0}%` }} />
              <b data-p="" style={{ width: `${st >= 5 ? share(0.4, 1) : 0}%` }} />
            </i>
            <em>
              {share(0.4, 1)}% on prompt <Marker n={3} on={st >= 3} />
            </em>
          </div>
        </div>
      </div>
    </Shell>
  )
}

/* ------------------------------------------------------------------ 03 · Amazon planner on the wire */

type Kind = 'whatif' | 'query' | 'anomaly'
// Example strings only: they show the shape of a request, not Amazon data.
const WIRE: Record<Kind, { label: string; ask: string; ctx: string; out: string; end: string; endSub: string; chip: string }> = {
  whatif: {
    label: 'What-if',
    ask: 'What if we add a second shift on Tuesday?',
    ctx: 'current plan · site configuration',
    out: 'scenario → optimization engine',
    end: 'Re-optimized plan',
    endSub: 'from the optimization engine',
    chip: 'What-if scenarios come back as re-optimized plans, without a full solver re-run.',
  },
  query: {
    label: 'Plan question',
    ask: 'Why is Tuesday’s plan short on labor?',
    ctx: 'similar past plans · site configuration',
    out: 'answer in plain language',
    end: 'Answer',
    endSub: 'back to the planner',
    chip: 'Natural-language plan queries, grounded in the site’s own plans.',
  },
  anomaly: {
    label: 'Anomaly check',
    ask: 'Anything unusual in next week’s plan?',
    ctx: 'historical labor plans for this site',
    out: 'flags + labor recommendation',
    end: 'Flags and recommendations',
    endSub: 'anomaly detection',
    chip: 'Anomaly detection and labor recommendations on the plan.',
  },
}
// 0 ask · 1 wire · 2 retrieval · 3 wire · 4 llm · 5 wire · 6 result
const WD = [900, 950, 1300, 950, 1300, 950, 0]

export function WireTrack({ i, run, startAtEnd }: TrackProps) {
  const [kind, setKind] = useState<Kind>('whatif')
  const [open, setOpen] = useState(false)
  const s = useScript(WD, run, startAtEnd)
  const w = WIRE[kind]
  const st = s.step
  const nodes = [
    { t: 'Planner', sub: 'asks in plain language', on: st >= 0 },
    { t: 'Retrieval', sub: 'historical labor plans + site configs', on: st >= 2 },
    { t: 'LLM', sub: 'inside Optimus, the labor-planning platform', on: st >= 4 },
    { t: w.end, sub: w.endSub, on: st >= 6 },
  ]
  const strings = [w.ask, w.ctx, w.out]
  const pick = (k: Kind) => {
    setKind(k)
    s.replay()
  }
  return (
    <Shell
      i={i}
      head={<>A planner’s request, on the wire</>}
      badge="Illustrative"
      progress={s.head}
      open={open}
      setOpen={setOpen}
      canReplay={!s.reduced && s.done}
      onReplay={s.replay}
      demo={null}
      code={
        <>
          assistant.<span className="h2-code__f">ask</span>(site, <span className="h2-code__s">"{w.ask}"</span>)
        </>
      }
      note={<>Illustrative: the request strings are examples, not Amazon data, and no internal screens are shown. The three numbers are from my resume.</>}
      chips={
        <>
          <Chip n={1} on={st >= 2}>
            RAG over historical labor plans and site configurations.
          </Chip>
          <Chip n={2} on={st >= 6} tone="hi">
            {w.chip}
          </Chip>
          <Chip n={3} on={st >= 6} value="60%+ faster">
            Planner time-to-insight:
          </Chip>
        </>
      }
    >
      <div className="h2-wire">
        {open && (
          <div className="h2-seg" role="radiogroup" aria-label="Request type">
            {(Object.keys(WIRE) as Kind[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => pick(k)}>
                {WIRE[k].label}
              </button>
            ))}
          </div>
        )}
        <ol className="h2-wire__list">
          {nodes.map((n, k) => (
            <li key={k} className="h2-wire__row">
              <div className="h2-wire__node" data-on={n.on || undefined}>
                <span className="h2-num">{String(k + 1).padStart(2, '0')}</span>
                <b>{n.t}</b>
                <span>{n.sub}</span>
                {k === 1 && <Marker n={1} on={st >= 2} />}
                {k === 3 && <Marker n={2} on={st >= 6} />}
              </div>
              {k < 3 && (
                <div className="h2-wire__edge" data-on={st >= 2 * k + 1 || undefined} data-moving={st === 2 * k + 1 || undefined}>
                  <span className="h2-wire__pkt" />
                  <span className="h2-wire__str" key={kind + k}>
                    {k === 0 ? `“${strings[k]}”` : strings[k]}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ol>
        <dl className="h2-wire__nums" data-on={st >= 6 || undefined}>
          <div>
            <dt>Fulfillment sites running it</dt>
            <dd>180+</dd>
          </div>
          <div>
            <dt>Cut in planner time-to-insight</dt>
            <dd>
              60%+ <Marker n={3} on={st >= 6} />
            </dd>
          </div>
          <div>
            <dt>Projected yearly savings</dt>
            <dd>$136.2M</dd>
          </div>
        </dl>
      </div>
    </Shell>
  )
}

/* ------------------------------------------------------------------ 05 · ocean probe */

// Same illustrative profile as the shared Ocean demo (src/demos/OceanDemo.tsx): only R² 0.936 is a real number.
const SENSOR_Z = [0, 10, 20, 30, 45, 60, 80, 100, 125, 150, 175, 200]
const truth = (z: number) => 7.1 + 4.9 * Math.exp(-z / 34) + 0.3 * Math.exp(-((z - 55) ** 2) / 320)
const predicted = (z: number) => truth(z) + 0.16 * Math.sin(z / 23 + 1.1)
const sensorAt = (z: number) => truth(z) + 0.26 * Math.sin(z * 1.7 + 0.4) * Math.cos(z * 0.31 + 0.2)
const oz = (z: number) => (z / 200) * 100
const ot = (t: number) => ((t - 6) / 7) * 100
const OCURVE = (() => {
  let d = ''
  for (let z = 0; z <= 200; z += 5) d += `${z ? 'L' : 'M'}${ot(predicted(z)).toFixed(2)} ${oz(z).toFixed(2)}`
  return d
})()
const OBAND = (() => {
  const l: string[] = []
  const r: string[] = []
  for (let z = 0; z <= 200; z += 10) {
    const u = 0.25 + 0.3 * Math.exp(-((z - 45) ** 2) / 900)
    l.push(`${ot(predicted(z) - u).toFixed(2)} ${oz(z).toFixed(2)}`)
    r.unshift(`${ot(predicted(z) + u).toFixed(2)} ${oz(z).toFixed(2)}`)
  }
  return `M${l.join('L')}L${r.join('L')}Z`
})()
const OD = [700, ...SENSOR_Z.map((_, k) => (k === SENSOR_Z.length - 1 ? 900 : 380)), 0]

export function OceanTrack({ i, run, startAtEnd }: TrackProps) {
  const s = useScript(OD, run, startAtEnd)
  const [open, setOpen] = useState(false)
  const st = s.step
  const k = Math.max(0, Math.min(SENSOR_Z.length - 1, st - 1))
  const z = st === 0 ? 0 : SENSOR_Z[k]
  const final = st >= OD.length - 1
  const shownZ = z
  const p = predicted(shownZ)
  return (
    <Shell
      i={i}
      head={<>Satellite to seabed: the probe goes down</>}
      badge="Illustrative · R² real"
      progress={s.head}
      open={open}
      setOpen={setOpen}
      canReplay={!s.reduced && s.done}
      onReplay={s.replay}
      demo={<Demo kind="ocean" />}
      code={
        <>
          model.<span className="h2-code__f">predict</span>(surface=satellite_tile, depth=<span className="h2-code__n h2-code__live">{shownZ}</span>) →{' '}
          <span className="h2-code__n">{p.toFixed(1)} °C</span>
        </>
      }
      note={<>Illustrative profile and readings. The real model, trained on Ocean Networks Canada sensors and satellite imagery, scored R² 0.936.</>}
      chips={
        <>
          <Chip n={1} on={st >= 1}>
            The satellite sees only the surface.
          </Chip>
          <Chip n={2} on={st >= 5} value={`${predicted(45).toFixed(1)} vs ${sensorAt(45).toFixed(1)} °C`}>
            At 45 m, model against moored sensor:
          </Chip>
          <Chip n={3} on={final} tone="hi" value="R² 0.936">
            The real model, against deep-water sensors:
          </Chip>
        </>
      }
    >
      <div className="h2-oc">
        <div className="h2-oc__plot" data-on={st >= 1 || undefined} role="img" aria-label="Illustrative temperature-against-depth profile from 0 to 200 metres, with model prediction, uncertainty band and sensor readings.">
          <span className="h2-oc__sea" aria-hidden="true" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d={OBAND} className="h2-oc__band" />
            <path d={OCURVE} className="h2-oc__curve" />
          </svg>
          {SENSOR_Z.map((zz, j) => (
            <span key={zz} className="h2-oc__dot" data-on={(st >= 1 && j <= k) || final || undefined} style={{ left: `${ot(sensorAt(zz))}%`, top: `${oz(zz)}%` }} aria-hidden="true" />
          ))}
          <span className="h2-oc__probe" style={{ top: `${oz(shownZ)}%` }} aria-hidden="true">
            <span className="h2-oc__line" />
            <span className="h2-oc__tag">{shownZ} m</span>
          </span>
          <Marker n={1} on={st >= 1} style={{ left: `${ot(predicted(0))}%`, top: '0%' }} />
          <Marker n={2} on={st >= 5} style={{ left: `${ot(sensorAt(45))}%`, top: `${oz(45)}%` }} />
          <span className="h2-oc__ax h2-oc__ax--x" aria-hidden="true">
            <span>6 °C</span>
            <span>temperature</span>
            <span>13 °C</span>
          </span>
          <span className="h2-oc__ax h2-oc__ax--y" aria-hidden="true">
            <span>0 m</span>
            <span>200 m</span>
          </span>
        </div>
      </div>
    </Shell>
  )
}
