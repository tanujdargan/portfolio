import { useEffect, useRef, useState } from 'react'
import data from '../../data/steering.json'
import { useMotionPrefs } from '../../lib/motion'
import { bus, CONCEPTS, type Concept } from './bus'

// The steering console. Every string it types is a REAL greedy completion from Qwen2.5-1.5B-Instruct with the
// concept vector added at the listed layer (src/data/steering.json, scripts/steer.py). The scene reads the same
// α, read-back projection and 2-D position through `bus`, so dragging α bends the point field.
const A = data.alphas
const Z = A.indexOf(0)
const fmtA = (a: number) => (a > 0 ? '+' : a < 0 ? '−' : '±') + Math.abs(a).toFixed(1)
const poles: Record<Concept, [string, string]> = { joy: ['flat', 'joyful'], distress: ['calm', 'distressed'], certainty: ['hedging', 'certain'] }

export default function SteerHud({ inline = false }: { inline?: boolean }) {
  const m = useMotionPrefs()
  const [c, setC] = useState(0)
  const [q, setQ] = useState(0)
  const [i, setI] = useState(Z)
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(matchMedia('(min-width: 761px)').matches), [])
  const [points, setPoints] = useState(bus.points)
  const [stop, setStop] = useState(bus.stop)
  const touched = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const concept = CONCEPTS[c]
  const cd = data.concepts[concept]
  const out = cd.outputs[q][i] as { text: string; xy: number[]; expr: number; collapsed?: boolean }
  const maxE = Math.max(...cd.outputs.flat().map((o) => Math.abs(o.expr)))

  // Publish to the scene.
  useEffect(() => {
    bus.concept = c
    bus.alpha = A[i]
    bus.exprNorm = out.expr / maxE
    bus.xy = [out.xy[0], out.xy[1]]
    bus.traj = cd.outputs[q].map((o) => [o.xy[0], o.xy[1]] as [number, number])
    bus.collapsed = out.collapsed ? 1 : 0
    bus.wake()
  }, [c, q, i, out, maxE, cd])

  // Reset α when leaving the home page, so write-ups sit on an unbent space.
  useEffect(
    () => () => {
      bus.alpha = 0
      bus.collapsed = 0
      bus.wake()
    },
    [],
  )

  // One demonstration the first time the camera reaches the interpretability cluster: 0 → +0.3 → +0.6,
  // the jump where joy steering flips from "As an AI language model…" to "Ah, the sweet aroma…".
  useEffect(() => {
    const on = () => {
      setPoints(bus.points)
      setStop(bus.stop)
      if (bus.stop !== 1 || touched.current || m.reduced) return
      touched.current = true
      const step = 650 * (m.level === 'subtle' ? 1.3 : m.level === 'expressive' ? 0.8 : 1)
      const t1 = setTimeout(() => setI(Z + 1), step)
      const t2 = setTimeout(() => setI(Z + 2), step * 2)
      timers.current = [t1, t2]
    }
    bus.listeners.add(on)
    return () => {
      bus.listeners.delete(on)
      timers.current.forEach(clearTimeout)
    }
  }, [m.reduced, m.level])
  const touch = () => {
    touched.current = true
    timers.current.forEach(clearTimeout)
  }

  // Type the completion out like a decoder. Reduced motion shows it whole.
  const [typed, setTyped] = useState(out.text)
  useEffect(() => {
    if (m.reduced) return setTyped(out.text)
    let raf = 0
    let n = 0
    const cps = 150 * (m.level === 'subtle' ? 0.7 : m.level === 'expressive' ? 1.5 : 1)
    const t0 = performance.now()
    const tick = (now: number) => {
      n = Math.min(out.text.length, Math.floor(((now - t0) / 1000) * cps))
      setTyped(out.text.slice(0, n))
      if (n < out.text.length) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [out.text, m.reduced, m.level])

  const a = A[i]
  return (
    <aside
      className="v6-hud"
      data-inline={inline || undefined}
      data-open={open || undefined}
      data-past={stop > 0 || undefined}
      aria-label="Steering console: real Qwen2.5-1.5B outputs"
    >
      <button className="v6-hud__pill" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="v6-hud-body">
        <span className="v6-live" aria-hidden="true" />
        Steer <b className="v6-num">α {fmtA(a)}</b>
      </button>
      <div className="v6-hud__body" id="v6-hud-body">
        <header className="v6-hud__head">
          <span className="v6-tag v6-tag--real">Real</span>
          <span className="v6-hud__model">
            Qwen2.5-1.5B-Instruct · layer {cd.layer} of {data.n_layers}
          </span>
          <button className="v6-hud__close" onClick={() => setOpen(false)} aria-label="Close steering console">
            ×
          </button>
        </header>
        <div className="v6-seg" role="group" aria-label="Concept vector">
          {CONCEPTS.map((k, j) => (
            <button
              key={k}
              aria-pressed={j === c}
              onClick={() => {
                touch()
                setC(j)
              }}
            >
              {k}
            </button>
          ))}
        </div>
        <button
          className="v6-hud__prompt"
          onClick={() => {
            touch()
            setQ((q + 1) % data.test_questions.length)
          }}
          aria-label={`Prompt: ${data.test_questions[q]} Press for the next prompt.`}
        >
          <span className="v6-lbl">prompt</span> “{data.test_questions[q]}” <span aria-hidden="true">↻</span>
        </button>
        <label className="v6-hud__slider">
          <span className="v6-lbl">
            α · ‖h‖ <b className="v6-num v6-accent">{fmtA(a)}</b>
            <span className="v6-hud__poles">
              {poles[concept][0]} ← → {poles[concept][1]}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={A.length - 1}
            step={1}
            value={i}
            onPointerDown={touch}
            onKeyDown={touch}
            onChange={(e) => {
              touch()
              setI(Number(e.target.value))
            }}
            aria-valuetext={`alpha ${fmtA(a)} times the residual norm, ${concept} vector`}
            style={{ ['--p' as string]: `${(i / (A.length - 1)) * 100}%` }}
          />
          <span className="v6-hud__ticks" aria-hidden="true">
            {A.map((x) => (
              <span key={x}>{x === 0 ? '0' : fmtA(x)}</span>
            ))}
          </span>
        </label>
        <p className="v6-hud__out" aria-hidden="true">
          {typed}
          <span className="v6-caret" />
        </p>
        <p className="v6-sr" aria-live="polite">
          {out.text}
        </p>
        <footer className="v6-hud__foot">
          <span>
            read-back proj <b className="v6-num">{out.expr > 0 ? '+' : ''}{out.expr.toFixed(1)}</b>
          </span>
          {out.collapsed && <span className="v6-tag">fluency collapsed</span>}
          <button
            className="v6-hud__reset"
            onClick={() => {
              touch()
              setI(Z)
            }}
            disabled={i === Z}
          >
            reset
          </button>
          {points > 0 && <span className="v6-hud__n">{points.toLocaleString('en-US')} pts</span>}
        </footer>
      </div>
    </aside>
  )
}
