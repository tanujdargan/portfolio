import { useEffect, useMemo, useState } from 'react'
import { useMotionPrefs } from '../../lib/motion'
import { useFlags } from '../../lib/labprefs'

// Pre-written answers. Every {braced} span is quoted from src/content/site.ts (resume-sourced); the rest is connective prose.
// Beri appears only when its content flag is on; otherwise the first answer closes on MarmotSat.
const qaFor = (showBeri: boolean) => [
  {
    q: 'What are you working on?',
    a:
      'Interpretability research. I find concepts like {joy}, {distress} and {certainty} as {directions in the residual stream}, then check whether steering along them does what the label says. I spent {summer 2026} as an {SDE intern at Amazon Robotics}, shipping an {LLM planning assistant} to production. ' +
      (showBeri
        ? "I'm also building {Beri}, a {food app} for {iOS}."
        : 'Before that I led the {onboard-computer firmware} for {MarmotSat}, which is now {in orbit}.'),
  },
  {
    q: 'Why interpretability?',
    a: 'Because the labels are testable, and they don\'t always hold. On {Qwen2.5-1.5B-Instruct} the {distress} direction produces {refusals}, not anxious prose, and the {certainty} vector partly encodes the word {"Certainly!"}. At the {Digital Minds sprint} I found that the {loss-masking regime} decides how much {shutdown distress} a model voices, while {calm-sounding models still represent it negatively}.',
  },
  {
    q: 'What did you build at Amazon?',
    a: 'An {LLM planning assistant}, shipped to production in {Optimus}, the labor-optimization platform for {180+ fulfillment sites}. It is {projected to save $136.2M a year}. I was an {SDE intern} at {Amazon Robotics} in {Toronto}, {May – Aug 2026}, and left with a {return offer}.',
  },
  {
    q: 'How do I reach you?',
    a: "Email {tanujd@uvic.ca}. It's the fastest route. The {resume}, {GitHub}, {LinkedIn} and {X} are one tap away in the bar at the top; {YouTube} and {Unsplash} are in the footer. Research programs, labs and founders especially.",
  },
]

interface Tok {
  w: string // the word, shaded
  s: string // trailing whitespace, unshaded
  fact: boolean
  p: number // pseudo-confidence
}

// Deterministic hash → [0,1): same shading on the server and the client, every time.
const h = (i: number, j: number) => {
  let x = (Math.imul(i + 1, 2654435761) ^ Math.imul(j + 7, 40503)) >>> 0
  x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296
}

function tokenize(a: string, j: number): Tok[] {
  const out: Tok[] = []
  a.split(/(\{[^}]+\})/).forEach((seg) => {
    if (!seg) return
    const fact = seg.startsWith('{')
    const s = fact ? seg.slice(1, -1) : seg
    for (const m of s.match(/\S+\s*|\s+/g) ?? []) {
      if (!m.trim()) {
        if (out.length) out[out.length - 1].s += m
        continue
      }
      const w = m.trimEnd()
      out.push({ w, s: m.slice(w.length), fact, p: 0 })
    }
  })
  return out.map((t, i) => ({
    ...t,
    p: t.fact ? 0.88 + 0.11 * h(i, j) : 0.2 + 0.42 * h(i, j),
  }))
}

export function Inference() {
  const m = useMotionPrefs()
  const { beri } = useFlags()
  const QA = useMemo(() => qaFor(beri), [beri])
  const toks = useMemo(() => QA.map((x, j) => tokenize(x.a, j)), [QA])
  const [sel, setSel] = useState(0)
  const [run, setRun] = useState(0) // 0 = static first render, no streaming
  const [n, setN] = useState(toks[0].length)
  const [hover, setHover] = useState<number | null>(null)
  const cur = toks[sel]
  // a flag toggle changes the answer's length: show it whole rather than a stale prefix
  useEffect(() => setN(toks[sel].length), [toks]) // eslint-disable-line react-hooks/exhaustive-deps
  const every = m.dur(0.034) * 1000
  const step = m.level === 'subtle' ? 3 : 1

  useEffect(() => {
    if (run === 0) return
    const len = toks[sel].length
    if (m.reduced) {
      setN(len)
      return
    }
    let i = 0
    setN(0)
    const id = setInterval(() => {
      i = Math.min(len, i + step)
      setN(i)
      if (i >= len) clearInterval(id)
    }, every)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  const ask = (i: number) => {
    setSel(i)
    setHover(null)
    setRun((r) => r + 1)
  }
  const streaming = n < cur.length
  const ht = hover !== null ? cur[hover] : null
  const plain = QA[sel].a.replace(/[{}]/g, '')

  return (
    <section className="v5-inf" aria-labelledby="v5-inf-h">
      <header className="v5-inf__head">
        <h2 id="v5-inf-h" className="v5-inf__title">
          <span className="v5-bolt" aria-hidden="true" />
          Inference
        </h2>
        <span className="v5-badge">Pre-written · not an LLM</span>
      </header>
      <div className="v5-inf__prompts" role="group" aria-label="Ask a question">
        {QA.map((x, i) => (
          <button key={x.q} className="v5-chip" aria-pressed={sel === i && run > 0} onClick={() => ask(i)}>
            {x.q}
          </button>
        ))}
      </div>
      <div className="v5-inf__out">
        <p className="v5-inf__q">
          <span className="v5-dim">user ›</span> {QA[sel].q}
        </p>
        <p className="v5-inf__a" aria-hidden="true" data-static={run === 0 || undefined} onPointerLeave={() => setHover(null)}>
          {cur.slice(0, n).map((t, i) => (
            <span key={`${run}-${i}`}>
              <span
                className="v5-tok"
                data-fact={t.fact || undefined}
                data-hover={hover === i || undefined}
                style={{ ['--a' as string]: t.p.toFixed(2) }}
                onPointerEnter={() => setHover(i)}
              >
                {t.w}
              </span>
              {t.s}
            </span>
          ))}
          {streaming && <span className="v5-caret" />}
        </p>
        <p className="sr-only" aria-live="polite">
          {run > 0 ? plain : ''}
        </p>
        {run === 0 && <p className="sr-only">{plain}</p>}
      </div>
      <footer className="v5-inf__foot">
        <span className="v5-inf__read" aria-hidden="true">
          {ht ? (
            <>
              <b>“{ht.w}”</b> p = {ht.p.toFixed(2)} · {ht.fact ? 'quoted fact' : 'connective'}
            </>
          ) : (
            <>
              {Math.min(n, cur.length)}/{cur.length} tokens · temperature 0 · 0 GPUs
            </>
          )}
        </span>
        <span className="v5-inf__legend">
          <span className="v5-ramp" aria-hidden="true" />
          Shading is a made-up confidence: bright tokens are quoted from the facts on this page, dim ones are connective prose. Not model probabilities.
        </span>
      </footer>
    </section>
  )
}
