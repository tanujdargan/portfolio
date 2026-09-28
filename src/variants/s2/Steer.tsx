import { useEffect, useLayoutEffect as useLE, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react'
import data from '../../data/steering.json'
import { useMotionPrefs } from '../../lib/motion'
import { Link } from '../../lib/router'
import { bus, CONCEPTS, type Concept } from './bus'
const useLayoutEffect = typeof window === 'undefined' ? useEffect : useLE

/*
 * The hero and the signature: drag α and a real model rewrites the sentence while its activation field bends.
 * Every sentence is a REAL greedy completion from Qwen2.5-1.5B-Instruct with the concept vector added at the listed
 * layer (src/data/steering.json). The rail drags continuously (the field bends continuously) and snaps to the nine real
 * α values on release; the sentence always shows the real output at the nearest α.
 *
 * The rewrite is a greedy decoder's diff: words the old and new outputs share stay put, the rest backspaces to the
 * divergence point, and the new continuation streams in token by token, tinted by the sign of α.
 */
export const A = data.alphas
const Z = A.indexOf(0)
export const fmtA = (a: number) => (a > 0 ? '+' : a < 0 ? '−' : '±') + Math.abs(a).toFixed(2)
const fmtE = (e: number) => (e > 0 ? '+' : e < 0 ? '−' : '') + Math.abs(e).toFixed(1)
const poles: Record<Concept, [string, string]> = { joy: ['flat', 'joyful'], distress: ['calm', 'distressed'], certainty: ['hedging', 'certain'] }
const nearest = (a: number) => A.reduce((bi, v, i) => (Math.abs(v - a) < Math.abs(A[bi] - a) ? i : bi), 0)
const clampA = (a: number) => Math.max(A[0], Math.min(A[A.length - 1], a))

/** The first sentence (or two short ones), cut at a word boundary: the hero shows the opening of the real answer. */
export function opening(text: string, max = 112) {
  const s = text.replace(/\s+/g, ' ').trim()
  const first = s.match(/^.+?[.!?](?=\s|$)/)
  let t = first ? first[0] : s
  if (t.length < 48) {
    const next = s.slice(t.length).match(/^\s*.+?[.!?](?=\s|$)/)
    if (next && (t + next[0]).length <= max) t += next[0]
  }
  if (t.length > max) t = t.slice(0, t.lastIndexOf(' ', max)).replace(/[,;:—–-]+$/, '') + '…'
  return t
}

type Out = { text: string; xy: number[]; expr: number; collapsed?: boolean }

/* ---------------- the rewrite ---------------- */

type W = { w: string; id: number; fresh: boolean }
let wid = 0
function Rewrite({ text, sign }: { text: string; sign: number }) {
  const m = useMotionPrefs()
  const target = text.split(' ')
  const [shown, setShown] = useState<W[]>(() => target.map((w) => ({ w, id: wid++, fresh: false })))
  const [live, setLive] = useState(false)
  const ref = useRef(shown)
  ref.current = shown
  useEffect(() => {
    if (m.reduced) {
      setShown(target.map((w) => ({ w, id: wid++, fresh: false })))
      return
    }
    let raf = 0
    let lastPush = 0
    // tokens per second: backspace fast, stream at a readable decoding speed
    const speed = m.level === 'subtle' ? 0.75 : m.level === 'expressive' ? 1.3 : 1
    const pushEvery = 20 / speed
    const tick = (now: number) => {
      const cur = ref.current
      let p = 0
      while (p < cur.length && p < target.length && cur[p].w === target[p]) p++
      let next: W[] | null = null
      if (cur.length > p) {
        // backspace four tokens a frame back to the divergence point
        next = cur.slice(0, Math.max(p, cur.length - 4))
      } else if (cur.length < target.length && now - lastPush >= pushEvery) {
        // stream; a long way behind (a fast drag), catch up a few tokens at a time
        lastPush = now
        const k = 1 + Math.floor((target.length - cur.length) / 9)
        next = [...cur, ...target.slice(cur.length, cur.length + k).map((w) => ({ w, id: wid++, fresh: true }))]
      }
      if (next) {
        ref.current = next
        setShown(next)
      }
      const done = ref.current.length === target.length && ref.current.every((x, i) => x.w === target[i])
      setLive(!done)
      if (!done) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, m.reduced, m.level])
  return (
    <p className="s2-say" data-live={live || undefined} data-sign={sign > 0 ? '+' : sign < 0 ? '-' : '0'} aria-hidden="true">
      {shown.map((x, i) => (
        <span key={x.id} className={x.fresh ? 's2-w s2-w--new' : 's2-w'}>
          {x.w}
          {i < shown.length - 1 ? ' ' : ''}
        </span>
      ))}
      <span className="s2-caret" />
    </p>
  )
}

/* ---------------- small instruments ---------------- */

/** A mono readout that scrambles only the characters that changed. */
export function Morph({ text, className }: { text: string; className?: string }) {
  const m = useMotionPrefs()
  const [shown, setShown] = useState(text)
  const prev = useRef(text)
  useEffect(() => {
    const src = prev.current
    prev.current = text
    if (src === text) return
    if (m.reduced) return setShown(text)
    const G = '01<>/\\{}[]#%&*+=~^?!;:$@'
    const n = Math.max(src.length, text.length)
    const D = 333 * (m.level === 'subtle' ? 0.8 : m.level === 'expressive' ? 1.3 : 1)
    const at = Array.from({ length: n }, (_, i) => (src[i] === text[i] ? 0 : D * (0.3 + 0.7 * Math.random())))
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const e = now - t0
      let s = ''
      for (let i = 0; i < n; i++) s += e >= at[i] ? text[i] ?? '' : text[i] === ' ' ? ' ' : G[(Math.random() * G.length) | 0]
      setShown(s)
      if (e < D) raf = requestAnimationFrame(tick)
      else setShown(text)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text, m.reduced, m.level])
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  )
}

/** A number that counts to its new value (tabular figures, so nothing shifts). */
function Ticker({ value, fmt }: { value: number; fmt: (n: number) => string }) {
  const m = useMotionPrefs()
  const [v, setV] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const a = from.current
    from.current = value
    if (m.reduced || a === value) return setV(value)
    const D = 333 * (m.level === 'subtle' ? 0.8 : m.level === 'expressive' ? 1.3 : 1)
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / D)
      const e = 1 - Math.pow(1 - p, 4)
      setV(a + (value - a) * e)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, m.reduced, m.level])
  return <>{fmt(v)}</>
}

/* ---------------- the hero ---------------- */

export function Steer({ base, onDemo, ready }: { base: string; onDemo: (el: HTMLElement) => void; ready: boolean }) {
  const m = useMotionPrefs()
  const [c, setC] = useState(0)
  const [q, setQ] = useState(0)
  const [a, setA] = useState(0)
  const [drag, setDrag] = useState(false)
  const touched = useRef(false)
  const snapRaf = useRef(0)
  const concept = CONCEPTS[c]
  const cd = data.concepts[concept]
  const i = nearest(a)
  const outs = cd.outputs[q] as Out[]
  const out = outs[i]
  const said = opening(out.text)
  const sign = A[i] > 0 ? 1 : A[i] < 0 ? -1 : 0
  const pct = ((a - A[0]) / (A[A.length - 1] - A[0])) * 100

  // Publish to the scene: continuous α for the bend, and the output's position interpolated between its real neighbours.
  useEffect(() => {
    const f = (a - A[0]) / (A[1] - A[0])
    const lo = Math.max(0, Math.min(A.length - 2, Math.floor(f)))
    const t = Math.max(0, Math.min(1, f - lo))
    bus.concept = c
    bus.alpha = a
    bus.xy = [outs[lo].xy[0] + (outs[lo + 1].xy[0] - outs[lo].xy[0]) * t, outs[lo].xy[1] + (outs[lo + 1].xy[1] - outs[lo].xy[1]) * t]
    bus.traj = outs.map((o) => [o.xy[0], o.xy[1]] as [number, number])
    bus.collapsed = out.collapsed ? 1 : 0
    bus.wake()
  }, [c, q, a, outs, out])
  // Leaving home: write-ups sit on an unbent space.
  useEffect(
    () => () => {
      bus.alpha = 0
      bus.collapsed = 0
      bus.wake()
    },
    [],
  )
  // The cursor glow follows α: cyan below zero, orange above.
  useEffect(() => {
    const s = Math.max(-1, Math.min(1, a / 0.9))
    document.querySelector<HTMLElement>('.s2')?.style.setProperty('--s2-q', s >= 0 ? `color-mix(in oklab, #ff8a4c ${Math.round(s * 100)}%, #d8d6d0)` : `color-mix(in oklab, #5cc8e6 ${Math.round(-s * 100)}%, #d8d6d0)`)
  }, [a])

  const tween = (to: number, ms: number, done?: () => void) => {
    cancelAnimationFrame(snapRaf.current)
    const from = a
    if (m.reduced || Math.abs(to - from) < 0.001) {
      setA(to)
      done?.()
      return
    }
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
      setA(from + (to - from) * e)
      if (p < 1) snapRaf.current = requestAnimationFrame(step)
      else done?.()
    }
    snapRaf.current = requestAnimationFrame(step)
  }
  const snap = () => tween(A[nearest(a)], 200 * (m.level === 'subtle' ? 0.8 : 1))
  const touch = () => {
    touched.current = true
    cancelAnimationFrame(snapRaf.current)
  }

  // One demonstration, once: glide from 0 to +0.6, through the jump where joy steering flips the answer.
  useEffect(() => {
    if (!ready || touched.current || m.reduced || scrollY > innerHeight * 0.4) return
    const t = setTimeout(() => {
      if (touched.current) return
      const D = 1700 * (m.level === 'subtle' ? 1.2 : m.level === 'expressive' ? 0.85 : 1)
      const t0 = performance.now()
      const step = (now: number) => {
        if (touched.current) return
        const p = Math.min(1, (now - t0) / D)
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
        setA(0.6 * e)
        if (p < 1) snapRaf.current = requestAnimationFrame(step)
      }
      snapRaf.current = requestAnimationFrame(step)
    }, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Keyboard: arrows, PageUp/Down, Home/End step between the nine real α values.
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const map: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, PageUp: 2, ArrowLeft: -1, ArrowDown: -1, PageDown: -2, Home: -99, End: 99 }
    if (!(e.key in map)) return
    e.preventDefault()
    touch()
    const j = Math.max(0, Math.min(A.length - 1, i + map[e.key]))
    tween(A[j], 167)
  }

  // Touch and pen: tap anywhere on the rail, or drag sideways from anywhere on it. Vertical swipes keep scrolling
  // the page (touch-action: pan-y), so the rail never traps the scroll.
  const rail = useRef<HTMLDivElement>(null)
  const g = useRef<{ x0: number; y0: number; on: boolean } | null>(null)
  const lastI = useRef(i)
  const fromX = (x: number) => {
    const r = rail.current!.getBoundingClientRect()
    const pad = 22
    const p = Math.max(0, Math.min(1, (x - r.left - pad) / (r.width - 2 * pad)))
    return clampA(A[0] + p * (A[A.length - 1] - A[0]))
  }
  const buzz = (j: number) => {
    if (j !== lastI.current) {
      lastI.current = j
      navigator.vibrate?.(6)
    }
  }
  const pd = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return
    g.current = { x0: e.clientX, y0: e.clientY, on: false }
  }
  const pm = (e: RPointerEvent<HTMLDivElement>) => {
    const s = g.current
    if (!s) return
    const dx = e.clientX - s.x0
    const dy = e.clientY - s.y0
    if (!s.on && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      s.on = true
      touch()
      setDrag(true)
      try {
        rail.current?.setPointerCapture(e.pointerId)
      } catch {
        /* the pointer already ended */
      }
    }
    if (s.on) {
      const v = fromX(e.clientX)
      buzz(nearest(v))
      setA(v)
    }
  }
  const pu = (e: RPointerEvent<HTMLDivElement>) => {
    const s = g.current
    g.current = null
    if (!s) return
    if (s.on) {
      setDrag(false)
      snap()
    } else if (Math.abs(e.clientX - s.x0) < 8 && Math.abs(e.clientY - s.y0) < 8) {
      touch()
      const j = nearest(fromX(e.clientX))
      buzz(j)
      tween(A[j], 333)
    }
  }
  const pc = () => {
    if (g.current?.on) {
      setDrag(false)
      snap()
    }
    g.current = null
  }
  // snap after a mouse drag on the native input
  useLayoutEffect(() => {
    if (!drag) return
    const up = () => {
      setDrag(false)
    }
    addEventListener('pointerup', up)
    return () => removeEventListener('pointerup', up)
  }, [drag])
  const wasDrag = useRef(false)
  useEffect(() => {
    if (wasDrag.current && !drag) snap()
    wasDrag.current = drag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])

  const [lo, hi] = poles[concept]
  const eMax = 26
  return (
    <div
      className="s2-steer"
      data-drag={drag || undefined}
      data-sign={sign > 0 ? '+' : sign < 0 ? '-' : '0'}
      data-c={concept}
      data-a={fmtA(A[i])}
      data-e={fmtE(out.expr)}
      data-lo={lo}
      data-hi={hi}
      style={{ ['--p' as string]: `${pct}`, ['--f0' as string]: `${Math.min(pct, 50)}`, ['--f1' as string]: `${Math.max(pct, 50)}` }}
    >
      <p className="s2-lbl s2-steer__lbl s2-in" style={{ ['--i' as string]: 0 }}>
        <span className="s2-live" aria-hidden="true" />
        <span>Qwen2.5-1.5B</span>
        <span className="s2-steer__layer"> · layer {cd.layer}</span>
        <Morph text={` · ${concept} · α ${fmtA(A[i])}`} />
        <span className="s2-steer__real"> · real outputs</span>
      </p>
      <button
        className="s2-prompt s2-in"
        style={{ ['--i' as string]: 1 }}
        onClick={() => {
          touch()
          setQ((q + 1) % data.test_questions.length)
        }}
        aria-label={`Prompt: ${data.test_questions[q]} Next prompt.`}
      >
        <span className="s2-prompt__k" aria-hidden="true">
          prompt
        </span>
        <Morph text={data.test_questions[q]} className="s2-prompt__q" />
        <span className="s2-prompt__n" aria-hidden="true">
          {q + 1}/{data.test_questions.length} ↻
        </span>
      </button>
      <div className="s2-say-box s2-in" style={{ ['--i' as string]: 2 }}>
        <Rewrite text={said} sign={sign} />
        {out.collapsed && <span className="s2-proj__x">fluency collapsed at this α</span>}
        <p className="sr-only" aria-live="polite">
          At α {fmtA(A[i])}, the model answers: {said}
        </p>
      </div>

      <div
        ref={rail}
        className="s2-rail s2-in"
        style={{ ['--i' as string]: 3 }}
        onPointerDown={pd}
        onPointerMove={pm}
        onPointerUp={pu}
        onPointerCancel={pc}
      >
        <div className="s2-rail__track" aria-hidden="true">
          <span className="s2-rail__fill" />
          {A.map((x, j) => (
            <span key={x} className="s2-rail__tick" data-on={j === i || undefined} data-z={x === 0 || undefined} style={{ left: `calc(22px + (100% - 44px) * ${j / (A.length - 1)})` }}>
              <span>{x === 0 ? '0' : (x > 0 ? '+' : '−') + Math.abs(x).toFixed(1)}</span>
            </span>
          ))}
        </div>
        <input
          type="range"
          className="s2-rail__in"
          min={A[0]}
          max={A[A.length - 1]}
          step={0.01}
          value={a}
          aria-label={`Steering strength α along the ${concept} vector`}
          aria-valuetext={`α ${fmtA(A[i])} times the residual norm: ${i === Z ? 'unsteered' : A[i] > 0 ? `toward ${hi}` : `toward ${lo}`}`}
          onPointerDown={(e) => {
            if (e.pointerType !== 'mouse') return
            touch()
            setDrag(true)
          }}
          onKeyDown={onKey}
          onChange={(e) => {
            touch()
            setA(Number(e.target.value))
          }}
        />
        <span className="s2-rail__pole s2-rail__pole--lo" aria-hidden="true">
          ← {lo}
        </span>
        <span className="s2-rail__pole s2-rail__pole--hi" aria-hidden="true">
          {hi} →
        </span>
      </div>

      <div className="s2-steer__row s2-in" style={{ ['--i' as string]: 4 }}>
        <div className="s2-seg" role="group" aria-label="Concept vector">
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
        <p className="s2-proj" title="Read-back projection: the steered output projected back onto the concept direction by the unsteered model">
          <span className="s2-proj__k">read-back</span>
          <b className="s2-num">
            <Ticker value={out.expr} fmt={fmtE} />
          </b>
          <span className="s2-proj__m" aria-hidden="true">
            <i style={{ left: `${50 + (Math.max(-eMax, Math.min(eMax, out.expr)) / eMax) * 50}%` }} />
          </span>
        </p>
        <div className="s2-steer__go">
          <button className="s2-btn" onClick={(e) => onDemo(e.currentTarget)}>
            Full demo
          </button>
          <Link to={`${base}/research/activation-steering`} className="s2-btn s2-btn--go" data-tint="steering">
            Write-up <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
