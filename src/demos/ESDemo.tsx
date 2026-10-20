import { useEffect, useRef, useState } from 'react'
import { useMotionPrefs } from '../lib/motion'
import { Frame, cssVar } from './Frame'
import { Flag } from '../shared/Flag'
import './canvas.css'

// Toy fitness landscape on [-1,1]²: one global peak, one decoy, a broad shoulder and a ripple.
const g = (x: number, y: number, cx: number, cy: number, s: number) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s))
const f = (x: number, y: number) =>
  g(x, y, 0.45, -0.35, 0.26) + 0.62 * g(x, y, -0.52, 0.42, 0.2) + 0.3 * g(x, y, -0.05, 0.05, 0.55) + 0.035 * Math.sin(9 * x) * Math.cos(7 * y)
const LAMBDA = 45
const MU = 8
const randn = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random())

interface Gen {
  from: [number, number]
  to: [number, number]
  pts: [number, number][]
  elite: Set<number>
}

export default function ESDemo({ compact }: { compact?: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const m = useMotionPrefs()
  const [playing, setPlaying] = useState(false)
  const [sigma, setSigma] = useState(0.16)
  const [stats, setStats] = useState({ gen: 0, fit: 0 })
  const st = useRef({ theta: [-0.15, 0.85] as [number, number], trail: [] as [number, number][], gen: null as Gen | null, t0: 0, n: 0, visible: false })
  const sigmaRef = useRef(sigma)
  sigmaRef.current = sigma

  const step = () => {
    const s = st.current
    const th = s.gen ? s.gen.to : s.theta
    const pts: [number, number][] = Array.from({ length: LAMBDA }, () => [th[0] + sigmaRef.current * randn(), th[1] + sigmaRef.current * randn()])
    const order = pts.map((p, i) => [f(p[0], p[1]), i]).sort((a, b) => b[0] - a[0])
    const elite = new Set(order.slice(0, MU).map((o) => o[1]))
    const mean = [...elite].reduce<[number, number]>((a, i) => [a[0] + pts[i][0] / MU, a[1] + pts[i][1] / MU], [0, 0])
    const to: [number, number] = [th[0] + 0.85 * (mean[0] - th[0]), th[1] + 0.85 * (mean[1] - th[1])]
    s.trail.push(th)
    s.theta = th
    s.gen = { from: th, to, pts, elite }
    s.t0 = performance.now()
    s.n++
    setStats({ gen: s.n, fit: f(to[0], to[1]) })
  }

  const reset = (at?: [number, number]) => {
    const s = st.current
    s.theta = at ?? [-0.15, 0.85]
    s.trail = []
    s.gen = null
    s.n = 0
    setStats({ gen: 0, fit: f(s.theta[0], s.theta[1]) })
  }

  // render loop
  useEffect(() => {
    const c = cv.current!
    const ctx = c.getContext('2d')!
    let raf = 0
    let bg: HTMLCanvasElement | null = null
    let W = 0
    let H = 0
    const colors = () => ({ fg: cssVar(c, '--d-fg', '#eee'), fg3: cssVar(c, '--d-fg3', '#666'), accent: cssVar(c, '--d-accent', '#9ecbff') })
    let col = colors()

    const paintBg = () => {
      const r = c.getBoundingClientRect()
      const dpr = Math.min(devicePixelRatio, 2)
      W = r.width
      H = r.height
      c.width = W * dpr
      c.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      col = colors()
      // Hidden (display:none ancestor) → 0×0: nothing to paint, and drawImage throws on an empty source.
      if (W < 1 || H < 1) return void (bg = null)
      // low-res field with banded contours
      const q = 3
      const w = Math.ceil(W / q)
      const h = Math.ceil(H / q)
      bg = document.createElement('canvas')
      bg.width = w
      bg.height = h
      const b = bg.getContext('2d')!
      const img = b.createImageData(w, h)
      const probe = document.createElement('canvas').getContext('2d')!
      probe.fillStyle = col.accent
      probe.fillRect(0, 0, 1, 1)
      const [ar, ag, ab] = probe.getImageData(0, 0, 1, 1).data
      const band = (v: number) => Math.floor(v * 9)
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const [px, py] = toWorld(x * q, y * q)
          const v = Math.max(0, f(px, py))
          const edge = band(v) !== band(Math.max(0, f(...toWorld((x + 1) * q, y * q)))) || band(v) !== band(Math.max(0, f(...toWorld(x * q, (y + 1) * q))))
          const a = Math.min(1, v) * 0.22 + (edge ? 0.22 : 0)
          const i = (y * w + x) * 4
          img.data[i] = ar
          img.data[i + 1] = ag
          img.data[i + 2] = ab
          img.data[i + 3] = a * 255
        }
      b.putImageData(img, 0, 0)
    }
    const S = () => Math.min(W, H) / 2.1
    const toScreen = (x: number, y: number): [number, number] => [W / 2 + x * S() * (W / H > 1.2 ? 1.25 : 1), H / 2 + y * S()]
    const toWorld = (sx: number, sy: number): [number, number] => [(sx - W / 2) / (S() * (W / H > 1.2 ? 1.25 : 1)), (sy - H / 2) / S()]
    ;(c as unknown as { toWorld: typeof toWorld }).toWorld = toWorld

    const draw = (now: number) => {
      const s = st.current
      ctx.clearRect(0, 0, W, H)
      if (bg && bg.width && bg.height) {
        ctx.imageSmoothingEnabled = true
        ctx.drawImage(bg, 0, 0, W, H)
      }
      const T = m.reduced ? 1 : 520 * (m.level === 'subtle' ? 0.8 : m.level === 'expressive' ? 1.25 : 1)
      const p = s.gen ? Math.min(1, (now - s.t0) / T) : 1
      const ease = (t: number) => 1 - Math.pow(1 - t, 3)
      // trail
      ctx.strokeStyle = col.fg3
      ctx.lineWidth = 1
      ctx.beginPath()
      s.trail.forEach((pt, i) => {
        const [x, y] = toScreen(...pt)
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      })
      if (s.gen) ctx.lineTo(...toScreen(...s.gen.from))
      ctx.stroke()
      // population
      if (s.gen) {
        const spread = ease(Math.min(1, p * 1.8))
        s.gen.pts.forEach((pt, i) => {
          const x = s.gen!.from[0] + (pt[0] - s.gen!.from[0]) * spread
          const y = s.gen!.from[1] + (pt[1] - s.gen!.from[1]) * spread
          const [sx, sy] = toScreen(x, y)
          const el = s.gen!.elite.has(i)
          ctx.globalAlpha = el ? 1 : 0.45 * (1 - Math.max(0, p - 0.6) * 1.5)
          ctx.fillStyle = el ? col.accent : col.fg3
          ctx.beginPath()
          ctx.arc(sx, sy, el ? 3.2 : 2.2, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.globalAlpha = 1
      }
      // mean
      const mp = s.gen ? ease(Math.max(0, (p - 0.45) / 0.55)) : 1
      const th: [number, number] = s.gen ? [s.gen.from[0] + (s.gen.to[0] - s.gen.from[0]) * mp, s.gen.from[1] + (s.gen.to[1] - s.gen.from[1]) * mp] : s.theta
      const [mx, my] = toScreen(...th)
      ctx.strokeStyle = col.fg
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(mx, my, 7, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = col.fg
      ctx.beginPath()
      ctx.arc(mx, my, 2.5, 0, Math.PI * 2)
      ctx.fill()
      // σ ring
      ctx.setLineDash([2, 4])
      ctx.strokeStyle = col.fg3
      ctx.beginPath()
      ctx.arc(mx, my, sigmaRef.current * S() * 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      raf = requestAnimationFrame(draw)
    }
    paintBg()
    reset()
    raf = requestAnimationFrame(draw)
    const ro = new ResizeObserver(paintBg)
    ro.observe(c)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.reduced, m.level])

  // play loop, paused offscreen
  useEffect(() => {
    const c = cv.current!
    const io = new IntersectionObserver(([e]) => (st.current.visible = e.isIntersecting))
    io.observe(c)
    if (!playing) return () => io.disconnect()
    const period = m.reduced ? 700 : 900
    const id = setInterval(() => {
      if (!st.current.visible) return
      if (st.current.n >= 40) return setPlaying(false)
      step()
    }, period)
    return () => {
      clearInterval(id)
      io.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, m.reduced])

  // autoplay once when first visible (not under reduced motion)
  useEffect(() => {
    if (m.reduced) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setPlaying(true)
        io.disconnect()
      }
    }, { threshold: 0.6 })
    io.observe(cv.current!)
    return () => io.disconnect()
  }, [m.reduced])

  const onPointer = (e: React.MouseEvent) => {
    const r = cv.current!.getBoundingClientRect()
    const tw = (cv.current as unknown as { toWorld: (x: number, y: number) => [number, number] }).toWorld
    reset(tw(e.clientX - r.left, e.clientY - r.top))
    setPlaying(true)
  }

  return (
    <Frame
      title="Evolution strategies: 45 guesses, keep 8"
      provenance={['illustrative']}
      controls={
        <>
          <button className="demo-btn" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button className="demo-btn" onClick={step}>
            Step
          </button>
          <button className="demo-btn" onClick={() => reset()}>
            Reset
          </button>
          <span className="demo-readout">
            gen <b>{String(stats.gen).padStart(2, '0')}</b> · fitness <b>{stats.fit.toFixed(3)}</b> · evals <b>{stats.gen * LAMBDA}</b>
          </span>
        </>
      }
      caption={
        <>
          <b>Illustrative:</b> a 2-D landscape stands in for ≈18.5M LoRA weights. Tap the field to start elsewhere; try a small σ.
        </>
      }
      more={
        <>
          LoRA rank 16 on all projections across 28 layers. Each generation samples λ = 45 perturbations and moves toward the mean of the best μ = 8, the
          population sizes of the real GSM8K run.
          <Flag note="Only population 45 / keep 8 match es_lora_original.py. The real run picks the 8 by a gradient-linearised proxy, not by fitness, then steps θ += α/8·Σ zₖεₖ. The demo's 'move toward the fittest 8' is a simplification." />
        </>
      }
    >
      <div className="cv" onClick={onPointer} style={compact ? { aspectRatio: 1.3 } : undefined}>
        <canvas ref={cv} aria-label="Population of candidate solutions climbing a fitness landscape" role="img" />
        <span className="cv__hint">tap to move the start</span>
      </div>
      <div className="demo-row">
        <label>
          σ
          <input className="demo-range" type="range" min={0.03} max={0.35} step={0.01} value={sigma} onChange={(e) => setSigma(+e.target.value)} aria-label="Perturbation size sigma" />
          <span className="demo-readout">
            <b>{sigma.toFixed(2)}</b>
          </span>
        </label>
      </div>
    </Frame>
  )
}
