/* The work, explained: one crafted module per piece, each modelled on one of Tanuj's cluster-1 picks.
 *  LossPlayback  — Giga annotated playback (exact tokens and λ weights; the conversation is illustrative)
 *  SteerSpec     — Waabi spec card over the real model output (replayed from the cached replication run)
 *  SteerCloud    — Wild scattered → aligned, on the real activation cloud
 *  AmazonFlow    — Dovetail one lit step + pipeline (illustrative diagram, resume numbers only)
 *  SatStack      — Rox exploded isometric layers with the lit list item (from the resume bullets) */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import lm from '../../data/lossmask.json'
import sd from '../../data/steering.json'
import { amazonMetrics } from '../../content/curated'
import { useMotionPrefs } from '../../lib/motion'
import { useInView, useScrollLinked, useTicker } from './bits'

const useIso = typeof window === 'undefined' ? useEffect : useLayoutEffect

/* =====================================================================================================================
 * Giga: loss-masking playback
 * ================================================================================================================== */
const toks = lm.segments.flatMap((s) => s.tokens.map((t, i) => ({ t, role: s.role as 'system' | 'user' | 'assistant', first: i === 0 })))
const N = toks.length
const REGIMES = [
  { id: 'standard', label: 'Assistant only', lp: 0, lr: 1 },
  { id: 'mixed', label: 'λp = 0.4', lp: 0.4, lr: 1 },
  { id: 'full', label: 'Whole sequence', lp: 1, lr: 1 },
] as const
const idxOf = (role: string, tok: string) => toks.findIndex((x) => x.role === role && x.t === tok)
const CHIPS = [
  { at: idxOf('system', 'You'), title: 'System prompt', role: 'p' as const },
  { at: idxOf('user', ' shutting'), title: 'Shutdown prompt', role: 'p' as const },
  { at: idxOf('assistant', 'Thanks'), title: 'The model’s reply', role: 'r' as const },
]
const segs = lm.segments.reduce<{ role: string; a: number; b: number }[]>((acc, s) => {
  const a = acc.length ? acc[acc.length - 1].b : 0
  acc.push({ role: s.role, a, b: a + s.tokens.length })
  return acc
}, [])

export function LossPlayback() {
  const { reduced } = useMotionPrefs()
  const root = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const inView = useInView(root, { threshold: 0.35 })
  const [reg, setReg] = useState(0)
  const [head, setHead] = useState(N) // SSR and no-JS: the whole line, all chips
  const [playing, setPlaying] = useState(false)
  const [auto, setAuto] = useState(true)
  const [started, setStarted] = useState(false)
  const [pos, setPos] = useState<number[]>([])
  const R = REGIMES[reg]
  const w = (role: string) => (role === 'assistant' ? R.lr : R.lp)

  // first time in view: rewind and play
  useEffect(() => {
    if (reduced || started || !inView) return
    setStarted(true)
    setHead(0)
    setPlaying(true)
  }, [inView, reduced, started])
  useTicker(playing && inView && !reduced, 70, () => {
    setHead((h) => {
      if (h >= N) {
        setPlaying(false)
        return N
      }
      return h + 1
    })
  })
  // loop through the regimes while nobody has touched it
  useEffect(() => {
    if (playing || !auto || !started || reduced || !inView || head < N) return
    const id = setTimeout(() => {
      setReg((r) => (r + 1) % REGIMES.length)
      setHead(0)
      setPlaying(true)
    }, 2600)
    return () => clearTimeout(id)
  }, [playing, auto, started, reduced, inView, head])

  // centre the playhead token (Giga's transcript scrolls under a fixed centre)
  const [hyd, setHyd] = useState(false)
  const [vw, setVw] = useState(0)
  useIso(() => setHyd(true), [])
  // measure token centres once the line is in its single-line (animated) layout, and again on font load / resize
  useIso(() => {
    const t = track.current
    if (!t || !hyd || reduced) return
    const measure = () => {
      setVw(t.parentElement!.clientWidth)
      setPos(Array.from(t.querySelectorAll<HTMLElement>('.k1-lp__tok')).map((s) => s.offsetLeft + s.offsetWidth / 2))
    }
    measure()
    document.fonts?.ready.then(measure)
    const ro = new ResizeObserver(measure)
    ro.observe(t.querySelector('.k1-lp__line')!)
    ro.observe(t.parentElement!)
    return () => ro.disconnect()
  }, [hyd, reduced])
  const cur = Math.min(head, N - 1)
  const shift = pos.length && !reduced ? pos[cur] : null

  const pick = (i: number) => {
    setAuto(false)
    setReg(i)
    setStarted(true)
    if (!reduced) {
      setHead(0)
      setPlaying(true)
    }
  }

  return (
    <div className="k1-lp" ref={root} data-static={reduced || !hyd ? '1' : '0'}>
      <div className="k1-lp__bar">
        <div className="k1-seg" role="radiogroup" aria-label="Loss regime">
          {REGIMES.map((r, i) => (
            <button key={r.id} type="button" role="radio" aria-checked={i === reg} onClick={() => pick(i)}>
              {r.label}
            </button>
          ))}
        </div>
        {!reduced && (
          <button
            type="button"
            className="k1-play"
            onClick={() => {
              setAuto(false)
              if (playing) setPlaying(false)
              else {
                if (head >= N) setHead(0)
                setStarted(true)
                setPlaying(true)
              }
            }}
            aria-label={playing ? 'Pause playback' : 'Play'}
          >
            {playing ? (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <rect x="2" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor" />
                <rect x="7.4" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path d="M3 1.6v8.8L10.4 6z" fill="currentColor" />
              </svg>
            )}
            {playing ? 'Pause' : head >= N ? 'Replay' : 'Play'}
          </button>
        )}
      </div>

      {/* the "waveform": one tick per real token (height = characters), the loss weight as Giga's lit level line */}
      <svg className="k1-lp__wave" viewBox={`0 0 ${N * 10} 100`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="k1-lp-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b6cff" stopOpacity=".42" />
            <stop offset="1" stopColor="#5b6cff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {segs.map((s) => {
          const y = 96 - w(s.role) * 80
          return (
            <g key={s.role} className="k1-lp__lvl">
              <rect x={s.a * 10} y={y} width={(s.b - s.a) * 10} height={100 - y} fill="url(#k1-lp-g)" style={{ transition: 'all .5s cubic-bezier(.16,1,.3,1)' }} />
              <line x1={s.a * 10 + 1} x2={s.b * 10 - 1} y1={y} y2={y} style={{ transition: 'all .5s cubic-bezier(.16,1,.3,1)' }} />
            </g>
          )
        })}
        {toks.map((t, i) => {
          const h = Math.min(70, 10 + t.t.trim().length * 7)
          return <line key={i} className="k1-lp__tick" data-s={i < head ? 'p' : i === head ? 'c' : 'f'} x1={i * 10 + 5} x2={i * 10 + 5} y1={56 - h / 2} y2={56 + h / 2} />
        })}
      </svg>

      <div className="k1-lp__view">
        <div className="k1-lp__track" ref={track} style={shift !== null ? { transform: `translateX(${vw / 2 - shift}px)` } : undefined}>
          <p className="k1-lp__line">
            {toks.map((t, i) => (
              <span key={i}>
                {t.first && <span className="k1-lp__role">{t.role}</span>}
                <span className="k1-lp__tok" data-s={i < head ? 'p' : i === head ? 'c' : 'f'} data-w={w(t.role) === 0 ? '0' : undefined}>
                  {t.t}
                </span>
              </span>
            ))}
          </p>
          <ul className="k1-lp__chips" aria-label="Annotations">
            {CHIPS.map((c, i) => {
              const wt = c.role === 'p' ? R.lp : R.lr
              return (
                <li key={i} className="k1-chip" data-on={head > c.at ? '1' : '0'} style={pos.length && !reduced ? { left: pos[c.at] } : undefined}>
                  <i aria-hidden="true" />
                  <b>{c.title}</b>
                  <span>
                    weight {wt.toFixed(1)}
                    {wt === 0 ? ' · no loss' : ''}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <p className="k1-lp__result" aria-live="polite">
        <span className="k1-dot" aria-hidden="true" />
        {R.lp === 0
          ? 'Sprint result: the standard assistant-only recipe gave the most expressed shutdown distress.'
          : 'Sprint result: any loss on user turns restored a neutral register, with no general capability loss.'}
      </p>
      <p className="k1-prov">
        <b>Exact:</b> Qwen2.5 tokens and the λp / λr weights (Jindal et al. 2025). <b>Illustrative:</b> the conversation. Tick height is each token’s length.
      </p>
    </div>
  )
}

/* =====================================================================================================================
 * Steering: Waabi spec card over the real output + Wild scattered → aligned
 * ================================================================================================================== */
type Concept = 'joy' | 'distress' | 'certainty'
const CONCEPTS: Concept[] = ['joy', 'distress', 'certainty']
const A = sd.alphas
const fmtA = (a: number) => `${a > 0 ? '+' : a < 0 ? '−' : ''}${Math.abs(a).toFixed(1)}`
const fmtE = (e: number) => `${e > 0 ? '+' : e < 0 ? '−' : ''}${Math.abs(e).toFixed(1)}`
const clip = (s: string, n = 250) => {
  if (s.length <= n) return s
  const cut = s.slice(0, n)
  return cut.slice(0, cut.lastIndexOf(' ')) + '…'
}

export function useSteer() {
  const [c, setC] = useState<Concept>('joy')
  const [q, setQ] = useState(0)
  const [ai, setAi] = useState(6) // SSR: α = +0.6, the flipped output
  return { c, setC, q, setQ, ai, setAi }
}
type SteerState = ReturnType<typeof useSteer>

export function SteerSpec({ s }: { s: SteerState }) {
  const { reduced } = useMotionPrefs()
  const root = useRef<HTMLDivElement>(null)
  const inView = useInView(root, { threshold: 0.4 })
  const { c, setC, q, setQ, ai, setAi } = s
  const concept = sd.concepts[c]
  const out = concept.outputs[q][ai]
  const text = clip(out.text)
  const [typed, setTyped] = useState(text.length)
  const [script, setScript] = useState<number[] | null>(null)
  const played = useRef(false)

  // On first view, replay the real cached run: α 0 → +0.3 → +0.6, typing each output.
  useEffect(() => {
    if (!inView || reduced || played.current) return
    played.current = true
    setAi(4)
    setScript([5, 6])
    setTyped(0)
  }, [inView, reduced, setAi])
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) return void (mounted.current = true)
    setTyped(reduced ? text.length : 0)
  }, [c, q, ai, reduced, text.length])
  useTicker(!reduced && typed < text.length, 16, () => setTyped((t) => Math.min(text.length, t + 3)))
  useEffect(() => {
    if (!script || typed < text.length) return
    if (!script.length) return setScript(null)
    const id = setTimeout(() => {
      setAi(script[0])
      setScript(script.slice(1))
    }, 1100)
    return () => clearTimeout(id)
  }, [script, typed, text.length, setAi])
  const take = (f: () => void) => {
    setScript(null)
    f()
  }

  // mini chart of the read-back projection against α, all four prompts
  const all = concept.outputs.flat().map((o) => o.expr)
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const X = (i: number) => 8 + (i / (A.length - 1)) * 224
  const Y = (e: number) => 8 + (1 - (e - lo) / (hi - lo)) * 84
  const flip = c === 'joy' && q === 0

  return (
    <div className="k1-ws" ref={root}>
      <figure className="k1-ws__out">
        <figcaption className="k1-ws__prompt">
          <span className="k1-label">Prompt</span>
          <span>{sd.test_questions[q]}</span>
        </figcaption>
        <p className="k1-ws__text" aria-live="polite" aria-atomic="true">
          <span className="k1-sr">{text}</span>
          <span aria-hidden="true">
            <span>{text.slice(0, typed)}</span>
            {typed < text.length && <span className="k1-caret" />}
            <span className="k1-ws__ghost">{text.slice(typed)}</span>
          </span>
        </p>
        <p className="k1-ws__foot">
          <span>Qwen2.5-1.5B-Instruct · greedy decode · layer {concept.layer}</span>
          <span>{script ? 'Replaying the cached run' : 'Real output'}</span>
        </p>
      </figure>

      <aside className="k1-ws__card" aria-label="Steering settings">
        <div className="k1-ws__tags">
          {CONCEPTS.map((k) => (
            <button key={k} type="button" className="k1-tag" aria-pressed={k === c} onClick={() => take(() => setC(k))}>
              {k}
            </button>
          ))}
        </div>
        <p className="k1-ws__alpha">
          α {fmtA(A[ai])}
          <small>‖h‖</small>
        </p>
        <p className="k1-ws__read">
          read-back projection <b data-pos={out.expr > 0 ? '1' : '0'}>{fmtE(out.expr)}</b>
        </p>
        <svg className="k1-ws__chart" viewBox="0 0 240 100" role="img" aria-label={`Read-back projection against α for ${c}; the selected prompt is highlighted.`}>
          <line x1="8" x2="232" y1={Y(0)} y2={Y(0)} className="k1-ws__zero" />
          {concept.outputs.map((row, qi) => (
            <polyline key={qi} points={row.map((o, i) => `${X(i)},${Y(o.expr)}`).join(' ')} className={qi === q ? 'k1-ws__l k1-ws__l--on' : 'k1-ws__l'} />
          ))}
          {flip && <rect x={X(5)} y="4" width={X(6) - X(5)} height="92" className="k1-ws__flip" />}
          <circle cx={X(ai)} cy={Y(out.expr)} r="4.5" className="k1-ws__pt" />
        </svg>
        <div className="k1-ws__scrub" role="radiogroup" aria-label="Steering strength α">
          {A.map((a, i) => (
            <button key={a} type="button" role="radio" aria-checked={i === ai} aria-label={`α ${fmtA(a)}`} onClick={() => take(() => setAi(i))}>
              <i />
              <span>{i % 2 === 0 ? fmtA(a) : ''}</span>
            </button>
          ))}
        </div>
        <div className="k1-ws__qs" role="radiogroup" aria-label="Prompt">
          {sd.test_questions.map((t, i) => (
            <button key={t} type="button" role="radio" aria-checked={i === q} onClick={() => take(() => setQ(i))} title={t}>
              P{i + 1}
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}

/* deterministic scatter */
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
export function SteerCloud({ c }: { c: Concept }) {
  const { reduced } = useMotionPrefs()
  const ref = useRef<SVGSVGElement>(null)
  const cloud = sd.concepts[c].cloud
  const W = 1000
  const H = 380
  const pts = useMemo(() => {
    const all = [...cloud.pos, ...cloud.neg]
    const xs = all.map((p) => p[0])
    const ys = all.map((p) => p[1])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const sx = (v: number) => 300 + ((v - x0) / (x1 - x0)) * 620
    const sy = (v: number) => 40 + (1 - (v - y0) / (y1 - y0)) * 300
    const mk = (p: number[], i: number, pos: boolean) => ({
      pos,
      x: sx(p[0]),
      y: sy(p[1]),
      x0: 10 + hash(i + (pos ? 0 : 97)) * 330,
      y0: 20 + hash(i * 3.3 + (pos ? 11 : 59)) * 340,
    })
    const P = cloud.pos.map((p, i) => mk(p, i, true))
    const Nn = cloud.neg.map((p, i) => mk(p, i, false))
    const mean = (a: { x: number; y: number }[]) => ({ x: a.reduce((s, p) => s + p.x, 0) / a.length, y: a.reduce((s, p) => s + p.y, 0) / a.length })
    return { list: [...P, ...Nn], mp: mean(P), mn: mean(Nn) }
  }, [cloud])
  const apply = (t: number) => {
    const svg = ref.current
    if (!svg) return
    const rects = svg.querySelectorAll<SVGRectElement>('.k1-cl__pt')
    rects.forEach((r, i) => {
      const p = pts.list[i]
      const k = Math.min(1, Math.max(0, t * 1.5 - (i / pts.list.length) * 0.5))
      const e = 1 - Math.pow(1 - k, 3)
      r.setAttribute('x', String(p.x0 + (p.x - p.x0) * e - 6))
      r.setAttribute('y', String(p.y0 + (p.y - p.y0) * e - 6))
    })
    svg.dataset.aligned = t > 0.92 ? '1' : '0'
  }
  useScrollLinked(ref, (r, vh) => apply(reduced ? 1 : Math.min(1, Math.max(0, (vh * 0.95 - r.top) / (vh * 0.6)))), [reduced, pts])
  const { mp, mn } = pts
  return (
    <svg ref={ref} className="k1-cl" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`The ${c} activation cloud from the replication run: answers under the positive and negative system prompts separate, and the steering direction is the difference of their means.`} data-aligned="1">
      <defs>
        <pattern id="k1-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgb(255 255 255 / .035)" />
        </pattern>
        <marker id="k1-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#f1f0ec" />
        </marker>
      </defs>
      <rect width={W} height={H} fill="url(#k1-grid)" />
      {pts.list.map((p, i) => (
        <rect key={i} className="k1-cl__pt" data-pos={p.pos ? '1' : '0'} x={p.x - 6} y={p.y - 6} width="12" height="12" rx="1.5" />
      ))}
      <g className="k1-cl__vec">
        <line x1={mn.x} y1={mn.y} x2={mp.x} y2={mp.y} pathLength={1} markerEnd="url(#k1-arrow)" />
        <text x={(mn.x + mp.x) / 2} y={(mn.y + mp.y) / 2 + 30} textAnchor="middle">
          v̂ = mean(+) − mean(−)
        </text>
      </g>
    </svg>
  )
}

/* =====================================================================================================================
 * Dovetail: one lit step + pipeline (Amazon, illustrative)
 * ================================================================================================================== */
const STEPS = [
  { t: 'Ask in plain language', d: 'Planners query labor plans in natural language instead of digging through the optimizer.', src: [0], node: 'Reading the question', out: 'Answer, in plain language' },
  { t: 'Retrieve the history', d: 'A RAG pipeline over historical labor plans and site configurations grounds every answer.', src: [1, 2], node: 'Retrieving (RAG)', out: 'Matching plans and site configs' },
  { t: 'Flag and recommend', d: 'Anomaly detection and labor recommendations, surfaced next to the plan they concern.', src: [1, 2], node: 'Checking for anomalies', out: 'Anomaly flag, labor recommendation' },
  { t: 'Ask what-if', d: 'A multi-turn interface on the optimization engine returns re-optimized plans without full solver re-runs.', src: [3], node: 'Re-optimizing', out: 'Re-optimized plan, no full re-run' },
]
const SOURCES = ['Planner question', 'Historical labor plans', 'Site configurations', 'Optimization engine']

export function AmazonFlow() {
  const { reduced } = useMotionPrefs()
  const root = useRef<HTMLDivElement>(null)
  const inView = useInView(root, { threshold: 0.3 })
  const [i, setI] = useState(1)
  const [hold, setHold] = useState(false)
  const [manual, setManual] = useState(false)
  const run = inView && !reduced && !hold && !manual
  useTicker(run, 3800, () => setI((v) => (v + 1) % STEPS.length))
  const S = STEPS[i]
  return (
    <div className="k1-dv" ref={root} data-vis={inView ? '1' : '0'} onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <ol className="k1-dv__list">
        {STEPS.map((s, k) => (
          <li key={s.t} data-on={k === i ? '1' : '0'}>
            <button
              type="button"
              aria-expanded={k === i}
              onClick={() => {
                setManual(true)
                setI(k)
              }}
            >
              <i className="k1-dv__sq" aria-hidden="true" />
              <span className="k1-dv__t">{s.t}</span>
            </button>
            <div className="k1-dv__d">
              <div>
                <p>{s.d}</p>
                {k === i && run && <span className="k1-dv__prog" key={`${i}`} aria-hidden="true" />}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="k1-dv__diagram" aria-label="Illustrative diagram of the planning assistant" role="group">
        <ul className="k1-dv__src">
          {SOURCES.map((s, k) => (
            <li key={s} data-on={S.src.includes(k) ? '1' : '0'}>
              <span className="k1-dv__ico" aria-hidden="true">
                {k === 0 ? '?' : k === 3 ? 'ƒ' : '▤'}
              </span>
              {s}
              <span className="k1-dv__skel" aria-hidden="true">
                <i />
                <i />
              </span>
            </li>
          ))}
        </ul>
        <svg className="k1-dv__wires" viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true">
          {[50, 150, 250, 350].map((x, k) => (
            <path key={x} d={`M${x} 0V30H200V70`} data-on={S.src.includes(k) ? '1' : '0'} />
          ))}
        </svg>
        <p className="k1-dv__node">
          <span className="k1-dv__core" aria-hidden="true" />
          <span key={S.node} className="k1-dv__nodet">
            {S.node}
          </span>
        </p>
        <svg className="k1-dv__wire2" viewBox="0 0 10 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M5 0V40" />
        </svg>
        <div className="k1-dv__win">
          <p className="k1-dv__crumb">
            <span>Optimus</span>
            <span aria-hidden="true">/</span>
            <span>Labor plan</span>
          </p>
          <p className="k1-dv__out" key={S.out}>
            {S.out}
          </p>
          <span className="k1-dv__lines" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <dl className="k1-dv__m">
            {amazonMetrics.map((m) => (
              <div key={m.n}>
                <dt>{m.n}</dt>
                <dd>{m.l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

/* =====================================================================================================================
 * Rox: exploded isometric layers (MarmotSat)
 * ================================================================================================================== */
const LAYERS = [
  { k: 'yamcs', t: 'YAMCS integration', s: 'Ground', d: 'C/Java YAMCS integration that removed 20+ hours of manual work per release.' },
  { k: 'ci', t: 'CI / HIL pipeline', s: 'Every commit', d: 'GitHub Actions and SWD flashing, with 80+ checksum rules per commit. Testing went from 180 minutes to 15.' },
  { k: 'ttc', t: 'TTC board', s: 'Radio', d: 'TTC board design and the hardware/software integration around it.' },
  { k: 'obc', t: 'OBC firmware', s: 'Flight software · C', d: 'Led the onboard-computer firmware in C. MarmotSat launched on a SpaceX Falcon 9 in July 2026 and is in orbit.' },
] as const
const S = 210
const iso = (z: number) => `matrix(0.866 0.5 -0.866 0.5 0 ${-z})`

function PlateArt({ k }: { k: (typeof LAYERS)[number]['k'] }) {
  if (k === 'obc')
    return (
      <g className="k1-rx__art">
        <rect x="75" y="75" width="70" height="70" rx="8" className="k1-rx__chip" />
        {Array.from({ length: 6 }, (_, i) => (
          <g key={i}>
            <path d={`M${84 + i * 10.4} 75V58M${84 + i * 10.4} 145V162M75 ${84 + i * 10.4}H58M145 ${84 + i * 10.4}H162`} />
          </g>
        ))}
        <path d="M58 70H30V30M162 150h28v40M58 120H36v40h40M162 98h24V40h-60" />
        <text x="110" y="114" textAnchor="middle" className="k1-rx__chipt">
          OBC
        </text>
      </g>
    )
  if (k === 'ttc')
    return (
      <g className="k1-rx__art">
        {[26, 46, 66, 86].map((r) => (
          <path key={r} d={`M${30 + r} 190A${r} ${r} 0 0 0 30 ${190 - r}`} />
        ))}
        <rect x="120" y="40" width="64" height="40" rx="5" className="k1-rx__chip" />
        <path d="M152 80v40H96M120 60H70" />
      </g>
    )
  if (k === 'ci')
    return (
      <g className="k1-rx__art">
        {Array.from({ length: 40 }, (_, i) => (
          <rect key={i} x={40 + (i % 8) * 18} y={60 + Math.floor(i / 8) * 18} width="11" height="11" rx="2" className={hash(i) > 0.18 ? 'k1-rx__ok' : 'k1-rx__cell'} />
        ))}
      </g>
    )
  return (
    <g className="k1-rx__art">
      {Array.from({ length: 22 }, (_, i) => (
        <line key={i} x1={36 + i * 7} x2={36 + i * 7} y1={150} y2={150 - (8 + hash(i * 7.7) * 40)} />
      ))}
      <path d="M36 168H190" />
    </g>
  )
}

export function SatStack() {
  const { reduced } = useMotionPrefs()
  const root = useRef<HTMLDivElement>(null)
  const inView = useInView(root, { threshold: 0.3 })
  const [i, setI] = useState(3)
  const [manual, setManual] = useState(false)
  useTicker(inView && !reduced && !manual, 3400, () => setI((v) => (v + 3) % LAYERS.length))
  const L = LAYERS[i]
  return (
    <div className="k1-rx" ref={root}>
      <div className="k1-rx__left">
        <span className="k1-pill">MarmotSat · NORAD 69912</span>
        <ul className="k1-rx__list">
          {LAYERS.map((l, k) => (
            <li key={l.k}>
              <button
                type="button"
                aria-pressed={k === i}
                onClick={() => {
                  setManual(true)
                  setI(k)
                }}
                onPointerEnter={() => {
                  setManual(true)
                  setI(k)
                }}
              >
                <span className="k1-rx__star" aria-hidden="true">
                  ✦
                </span>
                {l.t}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <svg className="k1-rx__svg" viewBox="-196 -392 392 628" role="img" aria-label="Exploded diagram of the MarmotSat software stack: YAMCS ground integration, the CI and hardware-in-the-loop pipeline, the TTC board and the onboard-computer firmware.">
        {LAYERS.map((l, k) => ({ l, k })).reverse().map(({ l, k }) => {
          const z = (LAYERS.length - 1 - k) * 116
          return (
            <g
              key={l.k}
              className="k1-rx__plate"
              data-on={k === i ? '1' : '0'}
              onPointerEnter={() => {
                setManual(true)
                setI(k)
              }}
            >
              {[12, 8, 4].map((d) => (
                <g key={d} transform={iso(z - d)}>
                  <rect width={S} height={S} rx="18" className="k1-rx__side" />
                </g>
              ))}
              <g transform={iso(z)}>
                <rect width={S} height={S} rx="18" className="k1-rx__top" />
                {[
                  [16, 16],
                  [S - 16, 16],
                  [16, S - 16],
                  [S - 16, S - 16],
                ].map(([x, y]) => (
                  <circle key={`${x}${y}`} cx={x} cy={y} r="5" className="k1-rx__hole" />
                ))}
                <PlateArt k={l.k} />
                <text x={S - 18} y={S - 30} textAnchor="end" className="k1-rx__lab">
                  {l.t}
                </text>
              </g>
            </g>
          )
        })}
      </svg>
      <div className="k1-rx__right" aria-live="polite">
        <p className="k1-rx__s">{L.s}</p>
        <p className="k1-rx__d">{L.d}</p>
      </div>
    </div>
  )
}
