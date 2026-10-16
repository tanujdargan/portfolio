import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { RotateCcw, Shuffle } from 'lucide-react'
import data from '../../data/steering.json'
import { useMotionPrefs } from '../../lib/motion'
import { Roll } from './Roll'

// The steering demo as plain DOM. Every sentence and number on screen is a cached greedy output from the replication
// run (steering.json); the hero "plays" by stepping through those cached outputs, nothing is generated or invented.

export type Concept = 'joy' | 'distress' | 'certainty'
export const CONCEPTS: Concept[] = ['joy', 'distress', 'certainty']
type Out = { text: string; expr: number }
const A = data.alphas
const I0 = A.indexOf(0)
const REST = A.indexOf(0.6)
const model = data.model.split('/')[1]
const out = (c: Concept, q: number, a: number) => (data.concepts[c].outputs as Out[][])[q][a]

export const sgn = (x: number, d = 1) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(d)

/** First ~200 characters, cut at a sentence end if one is close, else at a word. */
function clip(t: string, n = 210) {
  if (t.length <= n) return t
  const s = t.slice(0, n)
  const end = Math.max(s.lastIndexOf('. '), s.lastIndexOf('! '), s.lastIndexOf('? '))
  if (end > 110) return s.slice(0, end + 1)
  return s.slice(0, s.lastIndexOf(' ')).replace(/[,;:—–-]$/, '') + '…'
}
const firstSentence = (t: string) => t.split(/(?<=[.!?])\s/)[0]

/** The largest jump between consecutive α for this concept and prompt, if it crosses zero. */
function switchFor(c: Concept, q: number) {
  let best = -1
  let gap = 0
  for (let i = 1; i < A.length; i++) {
    const d = out(c, q, i).expr - out(c, q, i - 1).expr
    if (Math.abs(d) > gap) ((gap = Math.abs(d)), (best = i))
  }
  const a = out(c, q, best - 1).expr
  const b = out(c, q, best).expr
  return Math.sign(a) !== Math.sign(b) ? { i: best, a, b } : null
}

const range = (c: Concept) => {
  const all = (data.concepts[c].outputs as Out[][]).flat().map((o) => o.expr)
  return [Math.min(...all, 0) - 1, Math.max(...all, 0) + 1] as const
}

let heroPlayed = false // once per full page load; in-app returns open at rest

interface Props {
  hero?: boolean
  concept?: Concept
  onConcept?: (c: Concept) => void
  /** prose hover: which control to ring */
  hl?: string | null
  writeup?: React.ReactNode
}

export function Steer({ hero = false, concept: cProp, onConcept, hl, writeup }: Props) {
  const { reduced } = useMotionPrefs()
  const [cLocal, setCLocal] = useState<Concept>('joy')
  const c = cProp ?? cLocal
  const setC = (x: Concept) => (onConcept ? onConcept(x) : setCLocal(x))
  const [q, setQ] = useState(0)
  const [ai, setAi] = useState(REST)
  const [typed, setTyped] = useState(Infinity)
  const [seen, setSeen] = useState(A.length - 1) // plot reveals points as the sweep passes them
  const [phase, setPhase] = useState<'rest' | 'script' | 'user'>('rest')
  const [turn, setTurn] = useState(false)
  const timers = useRef<number[]>([])
  const frame = useRef<HTMLDivElement>(null)
  const id = useId()

  const clear = () => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }
  const at = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, ms))

  const type = useCallback((text: string, start: number, speed: number) => {
    for (let k = 0; k <= text.length; k++) at(start + k * speed, () => setTyped(k))
    return start + text.length * speed
  }, [])

  const play = useCallback(() => {
    clear()
    setPhase('script')
    setTurn(false)
    setQ(0)
    setAi(0)
    setSeen(-1)
    setTyped(0)
    const prompt = data.test_questions[0]
    let t = type(prompt, 420, 34) + 260
    // sweep −1.2 → +0.3 briskly, hold at the edge, then the switch, overshoot to +0.9, settle at +0.6
    const steps: [number, number][] = [
      [0, 0],
      [1, 340],
      [2, 340],
      [3, 340],
      [4, 380],
      [5, 420],
      [6, 900],
      [7, 1100],
      [6, 900],
    ]
    for (const [i, gap] of steps) {
      t += gap
      at(t, () => {
        setAi(i)
        setSeen((s) => Math.max(s, i))
      })
    }
    at(t + 400, () => {
      setSeen(A.length - 1)
      setPhase('rest')
    })
  }, [type])

  // hero: play once on first load if hydrated promptly; otherwise open on the resting contrast
  useEffect(() => {
    if (!hero || reduced || heroPlayed) return
    heroPlayed = true
    if (performance.now() > 4000) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        play()
      },
      { threshold: 0.35 },
    )
    io.observe(frame.current!)
    return () => {
      io.disconnect()
      clear()
    }
  }, [hero, reduced, play])
  useEffect(() => clear, [])

  const takeOver = () => {
    if (phase !== 'script') return
    clear()
    setTyped(Infinity)
    setSeen(A.length - 1)
    setPhase('user')
    setTurn(true)
    at(3600, () => setTurn(false))
  }

  const nextPrompt = () => {
    clear()
    const n = (q + 1) % data.test_questions.length
    setQ(n)
    setPhase('user')
    if (reduced) setTyped(Infinity)
    else type(data.test_questions[n], 0, 18)
  }

  const o = out(c, q, ai)
  const base = out(c, q, I0)
  const sw = useMemo(() => switchFor(c, q), [c, q])
  const showSw = sw && ai >= sw.i && seen >= sw.i
  const [lo, hi] = useMemo(() => range(c), [c])
  const prompt = data.test_questions[q]
  const text = clip(o.text)
  const words = text.split(/(\s+)/)
  // Words shared with the previous output keep still; only the rest blur in. The paragraph remounts per output, so a
  // rewrite inserts new text instead of reflowing old text (no layout shift while the replay runs).
  const prevWords = useRef<string[]>(words)
  let keep = 0
  while (keep < words.length && prevWords.current[keep] === words[keep]) keep++
  useEffect(() => {
    prevWords.current = words
  })

  // plot geometry
  const W = 300
  const H = 92
  const px = (i: number) => 10 + (i * (W - 20)) / (A.length - 1)
  const py = (e: number) => 8 + ((hi - e) / (hi - lo)) * (H - 16)
  const pts = A.map((_, i) => [px(i), py(out(c, q, i).expr)] as const).filter((_, i) => i <= seen)

  return (
    <div
      ref={frame}
      className="h1-steer"
      data-hero={hero || undefined}
      data-phase={phase}
      data-c={c}
      data-hl={hl ?? undefined}
      onPointerDownCapture={takeOver}
      onKeyDownCapture={takeOver}
      onTouchStartCapture={takeOver}
    >
      <div className="h1-steer__top">
        <span className="h1-prov" data-p="real">
          <i aria-hidden="true" />
          Real outputs{hero ? ', replayed' : ''}
        </span>
        <span className="h1-steer__model">
          {model} · layer {data.concepts[c].layer} of {data.n_layers}
        </span>
      </div>

      {!hero && (
        <div className="h1-tabs" role="group" aria-label="Concept">
          {CONCEPTS.map((k) => (
            <button key={k} type="button" className="h1-tab" data-c={k} aria-pressed={c === k} onClick={() => setC(k)}>
              {k}
            </button>
          ))}
        </div>
      )}

      <div className="h1-steer__prompt">
        <span className="h1-steer__k">Prompt</span>
        <span className="h1-steer__ptext" aria-live="off">
          <span className="sr-only">{prompt}</span>
          <span aria-hidden="true">{typed >= prompt.length ? prompt : prompt.slice(0, typed)}</span>
          {typed < prompt.length && <span className="h1-caret" aria-hidden="true" />}
        </span>
        <button type="button" className="h1-ghost h1-steer__shuffle" onClick={nextPrompt} data-ctl="prompt" aria-label="Another prompt">
          <Shuffle size={14} strokeWidth={1.8} aria-hidden="true" />
          <span>Another prompt</span>
        </button>
      </div>

      <div className="h1-steer__out" aria-live={phase === 'script' ? 'off' : 'polite'}>
        <p className="h1-steer__k">
          Output at <b className="h1-c-alpha">α {sgn(A[ai])}</b>
        </p>
        <p className="h1-steer__text" key={text} data-up={o.expr > 0 || undefined}>
          {words.map((w, i) =>
            /^\s+$/.test(w) ? (
              w
            ) : (
              <span key={i} data-new={i >= keep || undefined} style={{ ['--i' as string]: Math.min(i - keep, 60) }}>
                {w}
              </span>
            ),
          )}
        </p>
        <p className="h1-steer__base" style={{ visibility: ai === I0 ? 'hidden' : undefined }}>
          Unsteered, α 0: “{firstSentence(base.text)}”
        </p>
      </div>

      <div className="h1-steer__ctl">
        <div className="h1-steer__alpha" data-ctl="alpha">
          <label className="h1-steer__k" htmlFor={id}>
            Steering strength <b className="h1-c-alpha">α</b>
          </label>
          <input
            id={id}
            type="range"
            className="h1-range"
            min={0}
            max={A.length - 1}
            step={1}
            value={ai}
            onChange={(e) => {
              clear()
              setPhase('user')
              setTyped(Infinity)
              setSeen(A.length - 1)
              setAi(+e.target.value)
            }}
            aria-valuetext={`alpha ${sgn(A[ai])} times the residual norm`}
            style={{ ['--p' as string]: ai / (A.length - 1) }}
          />
          <span className="h1-ticks" aria-hidden="true">
            {A.map((a, i) => (
              <span key={a} style={{ ['--t' as string]: i / (A.length - 1) }}>
                {a === 0 ? '0' : Math.abs(a) === 1.2 ? sgn(a) : ''}
              </span>
            ))}
          </span>
          <span className="h1-hint" data-turn={turn || undefined} role="status">
            {phase === 'script' ? (
              <>Replaying cached outputs in order. Touch to take over.</>
            ) : (
              <>
                {turn ? 'Your turn. ' : ''}Drag <b className="h1-c-alpha">α</b> or use <kbd>←</kbd> <kbd>→</kbd>
              </>
            )}
          </span>
        </div>

        <div className="h1-steer__read">
          <div className="h1-steer__rhead">
            <span className="h1-steer__k">
              Read-back on <b className="h1-c-concept">{c}</b>
            </span>
            <span className="h1-steer__val" data-up={o.expr > 0 || undefined}>
              <Roll text={sgn(o.expr).padStart(5, '\u2007')} label={`read-back ${sgn(o.expr)}`} />
            </span>
          </div>
          <svg
            className="h1-plot"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Read-back projection for each α on this prompt. Now ${sgn(o.expr)} at α ${sgn(A[ai])}.`}
          >
            <line className="h1-plot__zero" x1={4} x2={W - 4} y1={py(0)} y2={py(0)} />
            {A.map((a, i) => (
              <line key={a} className="h1-plot__tick" x1={px(i)} x2={px(i)} y1={H - 4} y2={H - 1} />
            ))}
            {pts.length > 1 && <polyline className="h1-plot__line" points={pts.map((p) => p.join(',')).join(' ')} />}
            {pts.map(([x, y], i) => (
              <circle key={i} className="h1-plot__pt" cx={x} cy={y} r={2.2} />
            ))}
            {ai <= seen && <circle className="h1-plot__now" cx={px(ai)} cy={py(o.expr)} r={4.5} />}
          </svg>
          <p className="h1-steer__def">The output, projected onto the {c} direction by the unsteered model.</p>
          <p className="h1-switch" aria-live="polite">
            {sw && showSw && (
              <span className="h1-switch__chip">
                <b>Switch</b> α {sgn(A[sw.i - 1])} → {sgn(A[sw.i])}: read-back {sgn(sw.a)} → {sgn(sw.b)}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="h1-steer__foot">
        <code className="h1-steer__code">
          h<sub>{data.concepts[c].layer}</sub> ← h<sub>{data.concepts[c].layer}</sub> + <span className="h1-c-alpha">α</span>·‖h‖·v̂
          <sub className="h1-c-concept">{c}</sub>
        </code>
        <span className="h1-steer__note">
          Method replicated on Qwen2.5-1.5B-Instruct for this page
          {hero ? '; cached outputs replayed in order' : ''}.{writeup}
        </span>
        {hero && (
          // always in the layout (no shift when the replay ends); hidden while it plays and under reduced motion
          <button type="button" className="h1-ghost" onClick={play} style={phase === 'script' || reduced ? { visibility: 'hidden' } : undefined}>
            <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>Replay</span>
          </button>
        )}
      </div>
    </div>
  )
}
