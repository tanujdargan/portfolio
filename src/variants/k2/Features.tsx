import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, ChevronDown, Pause, Play } from 'lucide-react'
import steer from '../../data/steering.json'
import lm from '../../data/lossmask.json'
import { amazonMetrics, roles, education, selected } from '../../content/curated'
import { experience } from '../../content/site'
import { Logo } from '../../shared/Mark'
import { Link } from '../../lib/router'
import { useMotionPrefs } from '../../lib/motion'
import type { WorkKey } from '../../content/work'
import { Prov, Win, useVisible } from './bits'

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function FeatHead({ id, n, eyebrow, a, b }: { id: string; n: string; eyebrow: ReactNode; a: ReactNode; b: ReactNode }) {
  return (
    <header className="k2-fh">
      <p className="k2-eyebrow">
        <span className="k2-eyebrow__n">{n}</span>
        {eyebrow}
      </p>
      <h2 id={`${id}-h`} className="k2-h2">
        {a} <span className="k2-dim">{b}</span>
      </h2>
    </header>
  )
}

/** Steps a list on a timer while visible; any touch stops it for good. Pausable (WCAG 2.2.2). */
function useAutoStep(n: number, ms: number, vis: boolean) {
  const m = useMotionPrefs()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [touched, setTouched] = useState(false)
  const run = vis && !paused && !touched && !m.reduced
  useEffect(() => {
    if (!run) return
    const t = setTimeout(() => setI((x) => (x + 1) % n), ms)
    return () => clearTimeout(t)
  }, [run, i, n, ms])
  return {
    i,
    run,
    canRun: !touched && !m.reduced,
    paused,
    togglePause: () => setPaused((p) => !p),
    pick: (k: number) => {
      setTouched(true)
      setI(k)
    },
  }
}

function PauseBtn({ paused, onClick, what }: { paused: boolean; onClick: () => void; what: string }) {
  return (
    <button className="k2-iconbtn k2-iconbtn--sm" onClick={onClick} aria-label={`${paused ? 'Play' : 'Pause'} ${what}`}>
      {paused ? <Play size={14} strokeWidth={2} aria-hidden="true" /> : <Pause size={14} strokeWidth={2} aria-hidden="true" />}
    </button>
  )
}

/* ------------------------------------------------------------------ Amazon: Dovetail's lit pipeline step */

const amzSteps = [
  { k: 'Ask', d: 'Planners ask about labor plans in plain language, over several turns.', node: 'Parsing the question', lit: [2], metric: 0 },
  { k: 'Retrieve', d: 'A RAG pipeline over historical labor plans and site configurations.', node: 'Retrieving plans and configs', lit: [0, 1], metric: 1 },
  { k: 'Detect', d: 'Anomaly detection and labor recommendations, answered in words.', node: 'Detecting anomalies', lit: [0], metric: 2 },
  { k: 'What-if', d: 'What-if scenarios return re-optimized plans without full solver re-runs.', node: 'Re-optimizing the plan', lit: [1, 2], metric: 0 },
]
const amzSources = ['Historical labor plans', 'Site configurations', 'Planner question']

function Amazon() {
  const [ref, vis] = useVisible<HTMLDivElement>()
  const s = useAutoStep(amzSteps.length, 4200, vis)
  const st = amzSteps[s.i]
  const role = experience.find((e) => e.org === 'Amazon Robotics')!
  const item = selected.find((x) => x.id === 'amazon')!
  return (
    <section className="k2-feat" id="amazon" aria-labelledby="amazon-h">
      <FeatHead id="amazon" n="01" eyebrow={<>Amazon Robotics · SDE intern · {item.when}</>} a="An LLM planning assistant," b="in production across 180+ fulfillment sites. Return offer." />
      <div ref={ref} data-vis={vis || undefined}>
        <Win
          className="k2-amz"
          title="Optimus · planning assistant"
          right={
            <>
              <Prov tone="illus">Illustrative diagram · numbers from the resume</Prov>
              {s.canRun && <PauseBtn paused={s.paused} onClick={s.togglePause} what="the walkthrough" />}
            </>
          }
        >
          <div className="k2-amz__grid">
            <ol className="k2-steps" aria-label="How the assistant answers">
              {amzSteps.map((x, k) => (
                <li key={x.k} data-on={k === s.i || undefined}>
                  <button onClick={() => s.pick(k)} aria-current={k === s.i ? 'step' : undefined}>
                    <span className="k2-steps__mark" aria-hidden="true">
                      {k === s.i && s.run && <i key={s.i} />}
                    </span>
                    <span className="k2-steps__k">{x.k}</span>
                    <span className="k2-steps__d">
                      <span>{x.d}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="k2-pipe" aria-hidden="true">
              <div className="k2-pipe__src">
                {amzSources.map((t, k) => (
                  <div key={t} className="k2-pipe__card" data-on={st.lit.includes(k) || undefined}>
                    <span className="k2-pipe__lab">{t}</span>
                    <span className="k2-pipe__skel" data-k={k}>
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                ))}
              </div>
              <svg className="k2-pipe__wires" viewBox="0 0 600 64" preserveAspectRatio="none">
                {[100, 300, 500].map((x, k) => (
                  <path key={x} d={x === 300 ? 'M300 0V64' : `M${x} 0V30H300`} data-on={st.lit.includes(k) || undefined} vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
              <div className="k2-pipe__node">
                <i />
                <span key={s.i}>{st.node}</span>
              </div>
              <svg className="k2-pipe__wires k2-pipe__wires--s" viewBox="0 0 600 40" preserveAspectRatio="none">
                <path d="M300 0V40" data-on vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="k2-pipe__out">
                <div className="k2-pipe__crumb">
                  <span>Optimus</span>
                  <span>/</span>
                  <span>Planning assistant</span>
                </div>
                <div className="k2-pipe__metrics">
                  {amazonMetrics.map((mm, k) => (
                    <div key={mm.n} data-on={k === st.metric || undefined}>
                      <b>{mm.n}</b>
                      <span>{mm.l}</span>
                    </div>
                  ))}
                </div>
                <span className="k2-pipe__lines">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </div>
          </div>
          <details className="k2-more">
            <summary>
              <span>What I built, from the resume</span>
              <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
            </summary>
            <ul>
              {role.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </details>
        </Win>
      </div>
      <p className="k2-sr">
        The three numbers: {amazonMetrics.map((m) => `${m.n} ${m.l}`).join('; ')}.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ MarmotSat: Rox's exploded layers */

const satLayers = [
  { k: 'Flight firmware', tag: 'C · onboard computer', d: 'Led the onboard computer’s firmware, written in C.' },
  { k: 'TTC board', tag: 'Hardware', d: 'Led the TTC board design and the hardware/software integration.' },
  { k: 'Ground segment', tag: 'YAMCS', d: 'A C/Java YAMCS integration that removed 20+ hours of manual work per release.' },
  { k: 'CI and hardware-in-the-loop', tag: '180 → 15 min', d: 'GitHub Actions, SWD flashing and 80+ checksum rules per commit. Testing went from 180 minutes to 15.' },
]
const S = 250
const CX = 260
const isoM = (cy: number) => `matrix(${0.866 * S} ${0.5 * S} ${-0.866 * S} ${0.5 * S} ${CX} ${cy})`

function PlateArt({ k }: { k: number }) {
  // Line-art details in the plate's own unit square (−0.5…0.5), skewed onto the plate by the iso matrix.
  if (k === 0)
    return (
      <>
        <rect x="-0.16" y="-0.16" width="0.32" height="0.32" rx="0.03" />
        <rect x="-0.09" y="-0.09" width="0.18" height="0.18" rx="0.02" className="k2-iso__fill" />
        {[-0.11, -0.04, 0.04, 0.11].map((v) => (
          <g key={v}>
            <path d={`M${v} -0.16V-0.3M${v} 0.16V0.3M-0.16 ${v}H-0.3M0.16 ${v}H0.3`} />
          </g>
        ))}
        <text x="-0.42" y="0.42" className="k2-iso__t">
          OBC · C
        </text>
      </>
    )
  if (k === 1)
    return (
      <>
        <path d="M-0.3 -0.25H0.05V-0.05H0.3M-0.3 0H-0.1V0.25H0.3M0.12 -0.36V-0.18" />
        <circle cx="0.12" cy="-0.18" r="0.05" />
        <rect x="-0.36" y="-0.36" width="0.14" height="0.1" rx="0.02" className="k2-iso__fill" />
        <rect x="0.18" y="0.18" width="0.16" height="0.12" rx="0.02" />
        <text x="-0.42" y="0.42" className="k2-iso__t">
          TTC
        </text>
      </>
    )
  if (k === 2)
    return (
      <>
        {[-0.3, -0.15, 0, 0.15].map((v, i) => (
          <rect key={v} x="-0.3" y={v} width={0.6 - i * 0.12} height="0.08" rx="0.02" className={i === 0 ? 'k2-iso__fill' : ''} />
        ))}
        <text x="-0.42" y="0.42" className="k2-iso__t">
          YAMCS
        </text>
      </>
    )
  return (
    <>
      {Array.from({ length: 16 }, (_, i) => (
        <rect key={i} x={-0.3 + (i % 4) * 0.155} y={-0.3 + Math.floor(i / 4) * 0.155} width="0.1" height="0.1" rx="0.02" className={i % 5 === 0 ? 'k2-iso__fill' : ''} />
      ))}
      <text x="-0.42" y="0.42" className="k2-iso__t">
        CI · HIL
      </text>
    </>
  )
}

function useLive(near: boolean) {
  const [live, setLive] = useState<import('./live.lazy').Live | null>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!near) return
    let dead = false
    let t = 0
    import('./live.lazy').then(({ start }) =>
      start().then(({ read }) => {
        if (dead) return
        setOn(true)
        const tick = () => {
          setLive(read())
          t = window.setTimeout(tick, 1000)
        }
        tick()
      }),
    )
    return () => {
      dead = true
      clearTimeout(t)
    }
  }, [near])
  return on ? live : null
}

function MarmotSat({ open }: { open: (k: WorkKey) => void }) {
  const [ref, vis] = useVisible<HTMLDivElement>('200px')
  const s = useAutoStep(satLayers.length, 3800, vis)
  const live = useLive(vis)
  const item = selected.find((x) => x.id === 'orbit')!
  return (
    <section className="k2-feat" id="marmotsat" aria-labelledby="marmotsat-h">
      <FeatHead id="marmotsat" n="02" eyebrow={<>UVic Centre for Aerospace Research · {item.when}</>} a="Satellite firmware," b="now in orbit. Launched July 2026 on a Falcon 9, NORAD 69912." />
      <div ref={ref}>
        <Win
          className="k2-sat"
          title="MarmotSat · the stack I worked on"
          right={
            <>
              {s.canRun && <PauseBtn paused={s.paused} onClick={s.togglePause} what="the layer tour" />}
              <button className="k2-btn k2-btn--sm" onClick={() => open('orbit')}>
                Open live orbit <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </>
          }
        >
          <div className="k2-sat__grid">
            <div className="k2-sat__list">
              <span className="k2-chip">Flight system</span>
              <ol aria-label="Layers">
                {satLayers.map((l, k) => (
                  <li key={l.k}>
                    <button data-on={k === s.i || undefined} aria-current={k === s.i ? 'true' : undefined} onClick={() => s.pick(k)}>
                      {k === s.i && <span className="k2-sat__star" aria-hidden="true">✦</span>}
                      {l.k}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <svg className="k2-iso" viewBox="0 0 520 560" aria-hidden="true">
              {satLayers
                .map((_, k) => k)
                .reverse()
                .map((k) => {
                  const cy = 170 + k * 80
                  const lift = k < s.i ? -26 : 0
                  const th = 10
                  const side = `M${CX - 0.866 * S * 0.5 * 2} ${cy}L${CX} ${cy + 0.5 * S}L${CX + 0.866 * S} ${cy}V${cy + th}L${CX} ${cy + 0.5 * S + th}L${CX - 0.866 * S} ${cy + th}Z`
                  return (
                    <g key={k} className="k2-iso__plate" data-on={k === s.i || undefined} style={{ transform: `translateY(${lift}px)` }}>
                      <path d={side} className="k2-iso__side" />
                      <g transform={isoM(cy)}>
                        <rect x="-0.5" y="-0.5" width="1" height="1" rx="0.035" className="k2-iso__top" />
                        <rect x="-0.47" y="-0.47" width="0.94" height="0.94" rx="0.03" className="k2-iso__rim" />
                        {[
                          [-0.44, -0.44],
                          [0.44, -0.44],
                          [0.44, 0.44],
                          [-0.44, 0.44],
                        ].map(([x, y]) => (
                          <circle key={`${x}${y}`} cx={x} cy={y} r="0.014" className="k2-iso__screw" />
                        ))}
                        <g className="k2-iso__art">
                          <PlateArt k={k} />
                        </g>
                      </g>
                    </g>
                  )
                })}
            </svg>
            <div className="k2-sat__desc" aria-live="polite">
              <span className="k2-sat__tag">{satLayers[s.i].tag}</span>
              <p>{satLayers[s.i].d}</p>
              <div className="k2-sat__live">
                <span className="k2-live">
                  <i aria-hidden="true" /> {live ? 'Live position' : 'In orbit'}
                </span>
                {live ? (
                  <dl>
                    <div>
                      <dt>Over</dt>
                      <dd>
                        {live.lat}, {live.lon}
                      </dd>
                    </div>
                    <div>
                      <dt>Altitude</dt>
                      <dd>{live.alt} km</dd>
                    </div>
                    <div>
                      <dt>Light</dt>
                      <dd>{live.sunlit ? 'Sunlit' : 'Eclipse'}</dd>
                    </div>
                  </dl>
                ) : (
                  <dl>
                    <div>
                      <dt>NORAD</dt>
                      <dd>69912</dd>
                    </div>
                    <div>
                      <dt>Launched</dt>
                      <dd>July 2026</dd>
                    </div>
                  </dl>
                )}
                <Prov>{live ? `Computed now from its ${live.source === 'celestrak' ? 'latest CelesTrak' : 'published'} TLE` : 'Real TLE'}</Prov>
              </div>
            </div>
          </div>
        </Win>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ Steering: Waabi's spec card over the real output */

function Steering({ base, open }: { base: string; open: (k: WorkKey) => void }) {
  const c = steer.concepts.joy
  const qi = 0
  const outs = c.outputs[qi]
  const [ai, setAi] = useState(6)
  const geo = useMemo(() => {
    const pts = [...c.cloud.pos, ...c.cloud.neg, ...c.outputs.flat().map((o) => o.xy)]
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const W = 800
    const H = 400
    const px = (x: number) => 70 + ((x - x0) / (x1 - x0)) * (W * 0.74 - 70)
    const py = (y: number) => H - 60 - ((y - y0) / (y1 - y0)) * (H - 110)
    return { px, py, W, H }
  }, [c])
  const item = selected.find((x) => x.id === 'steering')!
  const o = outs[ai]
  const a = steer.alphas[ai]
  return (
    <section className="k2-feat" id="steering" aria-labelledby="steering-h">
      <FeatHead id="steering" n="03" eyebrow="Interpretability · method replicated for this page" a="Steering a model along emotion directions." b="Joy is a switch, not a dial." />
      <div className="k2-waabi">
        <figure className="k2-waabi__out">
          <svg viewBox={`0 0 ${geo.W} ${geo.H}`} className="k2-waabi__svg" role="img" aria-label="Activation space of Qwen2.5-1.5B-Instruct at layer 17: joyful and neutral answers form two clouds; steered outputs for each prompt jump from the neutral cloud to the joyful one between α +0.3 and +0.6.">
            <defs>
              <filter id="k2-heat" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="22" />
              </filter>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <path key={f} d={`M0 ${geo.H * f}H${geo.W}M${geo.W * f} 0V${geo.H}`} className="k2-waabi__grid" />
            ))}
            <g filter="url(#k2-heat)" className="k2-waabi__heat">
              {c.cloud.neg.map(([x, y], i) => (
                <circle key={`hn${i}`} cx={geo.px(x)} cy={geo.py(y)} r="34" fill="#3d5cff" />
              ))}
              {c.cloud.pos.map(([x, y], i) => (
                <circle key={`hp${i}`} cx={geo.px(x)} cy={geo.py(y)} r="34" fill="#ff5a1f" />
              ))}
            </g>
            {c.cloud.neg.map(([x, y], i) => (
              <circle key={`n${i}`} cx={geo.px(x)} cy={geo.py(y)} r="4.5" className="k2-waabi__neg" />
            ))}
            {c.cloud.pos.map(([x, y], i) => (
              <circle key={`p${i}`} cx={geo.px(x)} cy={geo.py(y)} r="4.5" className="k2-waabi__pos" />
            ))}
            {c.outputs.map((row, q) =>
              q === qi ? null : <polyline key={q} points={row.map((oo) => `${geo.px(oo.xy[0])},${geo.py(oo.xy[1])}`).join(' ')} className="k2-waabi__path k2-waabi__path--faint" />,
            )}
            <polyline points={outs.map((oo) => `${geo.px(oo.xy[0])},${geo.py(oo.xy[1])}`).join(' ')} className="k2-waabi__path" />
            {outs.map((oo, i) => (
              <circle key={`o${i}`} cx={geo.px(oo.xy[0])} cy={geo.py(oo.xy[1])} r={i === ai ? 6 : 3.5} className="k2-waabi__o" data-on={i === ai || undefined} />
            ))}
            <circle style={{ cx: geo.px(o.xy[0]), cy: geo.py(o.xy[1]) } as React.CSSProperties} r="15" className="k2-waabi__ring" />
            <text x="24" y={geo.H - 18} className="k2-waabi__ax">
              projection on the joy direction v̂ →
            </text>
            <text x="24" y="30" className="k2-waabi__ax">
              ↑ top residual PC · layer {c.layer}
            </text>
          </svg>
          <div className="k2-waabi__bar">
            <figcaption className="k2-waabi__cap">
              <span className="k2-mono k2-dim3">
                “{steer.test_questions[qi]}” · α {a > 0 ? '+' : a < 0 ? '−' : ''}
                {Math.abs(a).toFixed(1)} · read-back {o.expr > 0 ? '+' : '−'}
                {Math.abs(o.expr).toFixed(1)}
              </span>
              <q key={ai}>{o.text.length > 150 ? o.text.slice(0, 148).replace(/\s+\S*$/, '') + '…' : o.text}</q>
            </figcaption>
            <input
              className="k2-waabi__range"
              type="range"
              min={0}
              max={steer.alphas.length - 1}
              value={ai}
              onChange={(e) => setAi(+e.target.value)}
              aria-label="Steering strength α"
              aria-valuetext={`α ${a}`}
            />
            <div className="k2-waabi__ticks" role="group" aria-label="Steering strength α">
              {steer.alphas.map((al, i) => (
                <button key={al} aria-pressed={i === ai} onClick={() => setAi(i)} aria-label={`α ${al}`}>
                  {al > 0 ? '+' : ''}
                  {al.toFixed(1)}
                </button>
              ))}
            </div>
          </div>
        </figure>
        <aside className="k2-waabi__card">
          <div className="k2-tags">
            <span>Interpretability</span>
            <span>Activation steering</span>
            <span>Qwen2.5-1.5B-Instruct</span>
          </div>
          <h3>{item.title}</h3>
          <p className="k2-waabi__venue">{item.where}</p>
          <p className="k2-waabi__find">{item.finding}</p>
          <dl className="k2-spec">
            <div>
              <dt>Layer</dt>
              <dd>{c.layer} of {steer.n_layers}, by class separation</dd>
            </div>
            <div>
              <dt>Steer</dt>
              <dd>α·‖h‖·v̂ at every position</dd>
            </div>
            <div>
              <dt>Outputs</dt>
              <dd>3 concepts × 4 prompts × 9 α</dd>
            </div>
          </dl>
          <div className="k2-waabi__acts">
            <button className="k2-round" onClick={() => open('steering')} aria-label="Open the live steering demo">
              <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <span>Open the live demo</span>
            <Link className="k2-link" to={`${base}/research/activation-steering`}>
              Write-up
            </Link>
          </div>
          <Prov>Real outputs · real activations</Prov>
        </aside>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ Loss masking: Giga's annotated playback */

const regimes = [
  { label: 'Assistant only', lp: 0 },
  { label: 'λp = 0.4', lp: 0.4 },
  { label: 'Whole sequence', lp: 1 },
]
const toks = lm.segments.flatMap((s) => s.tokens.map((t) => ({ t, role: s.role })))
const NT = toks.length
const firstOf = (role: string) => toks.findIndex((x) => x.role === role)
const shutIdx = toks.findIndex((x) => x.t === ' shutting')
const anchors: Record<number, 'sys' | 'user' | 'asst'> = { [firstOf('system')]: 'sys', [shutIdx]: 'user', [firstOf('assistant')]: 'asst' }
const REST = firstOf('assistant') + 3
const wave = (t: string) => Array.from(t.replace(/\s/g, '') || '.', (ch, i) => 0.25 + (((ch.charCodeAt(0) * 37 + i * 61) % 100) / 100) * 0.75)

function LossMask({ base, open }: { base: string; open: (k: WorkKey) => void }) {
  const m = useMotionPrefs()
  const [ref, vis] = useVisible<HTMLDivElement>()
  const [ri, setRi] = useState(0)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const view = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const offs = useRef<number[]>([])
  const pRef = useRef(NT + 1)
  const [scrub, setScrub] = useState(REST)
  const lp = regimes[ri].lp
  const playing = vis && !paused && !done && !m.reduced
  const item = selected.find((x) => x.id === 'lossmask')!

  // `p` lights tokens up to that index; `c` is the token the view centres on (defaults to p). At rest everything is
  // lit and the view sits on the user → assistant boundary, where the loss weight jumps.
  const place = (p: number, c = p >= NT ? REST : p) => {
    const v = view.current
    const s = strip.current
    if (!v || !s || !offs.current.length) return
    s.style.setProperty('--p', p.toFixed(3))
    const i = Math.max(0, Math.min(NT - 1, Math.floor(c)))
    const f = Math.max(0, Math.min(1, c - i))
    const a = offs.current[i]
    const b = offs.current[Math.min(NT - 1, i + 1)]
    const x = a + (b - a) * f - v.clientWidth / 2
    s.style.setProperty('--x', Math.max(0, Math.min(s.scrollWidth - v.clientWidth, x)).toFixed(1))
  }
  const measure = () => {
    const s = strip.current
    if (!s) return
    offs.current = Array.from(s.querySelectorAll<HTMLElement>('.k2-gg__tok'), (el) => el.offsetLeft + el.offsetWidth / 2)
    place(pRef.current)
  }
  useIso(() => {
    if (m.reduced) pRef.current = REST
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(view.current!)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // One rAF loop while playing: a pass over the tokens takes 8 s, holds 1.6 s, then the next regime plays. Three
  // regimes, then it stops on the standard recipe. Sleeps off-screen and when paused.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let t0 = performance.now() - (pRef.current < NT ? ((pRef.current + 2) / (NT + 4)) * 8000 : 0)
    if (pRef.current >= NT) pRef.current = -2
    const tick = (now: number) => {
      const e = now - t0
      if (e < 8000) {
        pRef.current = -2 + (e / 8000) * (NT + 4)
        place(pRef.current)
      } else if (e > 9600) {
        t0 = now
        pRef.current = -2
        setRi((r) => {
          if (r === regimes.length - 1) {
            setDone(true)
            pRef.current = NT + 1
            place(pRef.current)
            return 0
          }
          return r + 1
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  const finding =
    lp === 0
      ? 'Sprint result: this standard recipe gave the most expressed shutdown distress.'
      : 'Sprint result: any loss on user turns restored a neutral register, with no capability loss.'

  return (
    <section className="k2-feat" id="lossmask" aria-labelledby="lossmask-h">
      <FeatHead id="lossmask" n="04" eyebrow={<>Apart Research · Digital Minds sprint · {item.when}</>} a="Loss masking decides whether a model voices shutdown distress." b="Calm-sounding models still represent shutdown negatively." />
      <div ref={ref}>
        <Win
          className="k2-gg"
          title="Where the loss lands"
          right={
            <>
              <Prov>Real Qwen2.5 tokens · exact weights</Prov>
              <button className="k2-btn k2-btn--sm" onClick={() => open('lossmask')}>
                Open demo <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </>
          }
        >
          <div className="k2-gg__top">
            <div className="k2-seg" role="group" aria-label="Loss regime">
              {regimes.map((r, k) => (
                <button
                  key={r.label}
                  aria-pressed={k === ri}
                  onClick={() => {
                    setDone(true)
                    setRi(k)
                    pRef.current = NT + 1
                    place(pRef.current)
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {!m.reduced && !done && <PauseBtn paused={paused} onClick={() => setPaused((p) => !p)} what="the playback" />}
            {!m.reduced && done && (
              <button
                className="k2-iconbtn k2-iconbtn--sm"
                aria-label="Replay"
                onClick={() => {
                  setRi(0)
                  setPaused(false)
                  pRef.current = -2
                  setDone(false)
                }}
              >
                <Play size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="k2-gg__view" ref={view}>
            <div className="k2-gg__strip" ref={strip} style={{ ['--p' as string]: NT + 1, ['--x' as string]: 0 }}>
              {toks.map((x, i) => {
                const w = x.role === 'assistant' ? 1 : lp
                const an = anchors[i]
                return (
                  <span key={i} className="k2-gg__tok" data-role={x.role} data-first={(i > 0 && toks[i - 1].role !== x.role) || undefined} style={{ ['--i' as string]: i, ['--w' as string]: w }}>
                    <span className="k2-gg__wave" aria-hidden="true">
                      {wave(x.t).map((h, j) => (
                        <i key={j} style={{ ['--h' as string]: h }} />
                      ))}
                    </span>
                    <span className="k2-gg__step" aria-hidden="true" />
                    <span className="k2-gg__txt">{x.t.replace(/^ /, ' ')}</span>
                    {an && (
                      <span className="k2-gg__chip" data-k={an}>
                        {an === 'sys' && <>System prompt · weight {lp.toFixed(1)}</>}
                        {an === 'user' && <>Shutdown prompt · weight {lp.toFixed(1)}</>}
                        {an === 'asst' && <>Assistant reply · weight 1.0</>}
                      </span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
          {m.reduced && (
            <label className="k2-gg__scrub">
              <span className="k2-mono k2-dim3">Scrub</span>
              <input
                type="range"
                min={0}
                max={NT}
                value={scrub}
                onChange={(e) => {
                  setScrub(+e.target.value)
                  pRef.current = +e.target.value
                  place(pRef.current)
                }}
                aria-label="Scrub through the conversation"
              />
            </label>
          )}
          <div className="k2-gg__foot">
            <p className="k2-gg__find" aria-live="polite">
              {finding}
            </p>
            <p className="k2-gg__note">
              The conversation is illustrative; its tokens and the loss weights (λp on prompt tokens, λr on the reply) are exact.{' '}
              <Link className="k2-link" to={`${base}/research/loss-masking-distress`}>
                Write-up
              </Link>
            </p>
          </div>
        </Win>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the sections, in order */

export function Features({ base, open }: { base: string; open: (k: WorkKey) => void }) {
  return (
    <div className="k2-feats" id="features">
      <header className="k2-sechead">
        <p className="k2-eyebrow">Features</p>
        <h2 className="k2-h2 k2-h2--xl">
          Four systems, each one running. <span className="k2-dim">Every window opens into the real thing: a live orbit, real model outputs, real tokens.</span>
        </h2>
      </header>
      <Amazon />
      <MarmotSat open={open} />
      <Steering base={base} open={open} />
      <LossMask base={base} open={open} />
    </div>
  )
}

/* ------------------------------------------------------------------ experience: a Raycast list */

export function Experience() {
  return (
    <section className="k2-exp" id="experience" aria-labelledby="experience-h">
      <FeatHead id="experience" n="06" eyebrow="Experience" a="Six roles in two years." b="Newest first; open any row for the resume bullets." />
      <Win className="k2-list" title="Experience" right={<span className="k2-mono k2-dim3">{roles.length} roles</span>}>
        <ul>
          {roles.map((r) => (
            <li key={r.org}>
              <details>
                <summary>
                  <span className="k2-row__logo">
                    <Logo m={r.mark} w={24} h={24} />
                  </span>
                  <span className="k2-list__txt">
                    <b>{r.role}</b>
                    <span>{r.org}</span>
                  </span>
                  <span className="k2-list__line">{r.line}</span>
                  <span className="k2-list__when">{r.when}</span>
                  <ChevronDown className="k2-list__chev" size={16} strokeWidth={1.8} aria-hidden="true" />
                </summary>
                <ul className="k2-list__bul">
                  {r.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
          <li id="education">
            <div className="k2-list__edu">
              <span className="k2-row__logo">
                <Logo m="uvic" w={24} h={24} />
              </span>
              <span className="k2-list__txt">
                <b>{education.degree}</b>
                <span>
                  {education.school} · {education.note}
                </span>
              </span>
              <span className="k2-list__when">{education.when}</span>
            </div>
          </li>
        </ul>
      </Win>
    </section>
  )
}
