import { useEffect, useRef, useState } from 'react'
import { useMotionPrefs } from '../lib/motion'
import { Frame, cssVar } from './Frame'
import './canvas.css'

const N = 24000
const NLIST = 48
const K = 10

// Deterministic PRNG so the field is identical on every visit.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
}

function buildIndex() {
  const r = rng(7)
  const n = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())
  const xs = new Float32Array(N)
  const ys = new Float32Array(N)
  const clusters = Array.from({ length: 18 }, () => ({ x: r() * 1.8 - 0.9, y: r() * 1.8 - 0.9, sx: 0.03 + r() * 0.12, sy: 0.03 + r() * 0.12, a: r() * Math.PI }))
  for (let i = 0; i < N; i++) {
    if (i % 9 === 0) {
      xs[i] = r() * 2 - 1
      ys[i] = r() * 2 - 1
      continue
    }
    const c = clusters[i % clusters.length]
    const u = n() * c.sx
    const v = n() * c.sy
    xs[i] = c.x + u * Math.cos(c.a) - v * Math.sin(c.a)
    ys[i] = c.y + u * Math.sin(c.a) + v * Math.cos(c.a)
  }
  // k-means for the coarse quantiser
  const cx = new Float32Array(NLIST)
  const cy = new Float32Array(NLIST)
  for (let j = 0; j < NLIST; j++) {
    const i = Math.floor(r() * N)
    cx[j] = xs[i]
    cy[j] = ys[i]
  }
  const assign = new Uint8Array(N)
  for (let it = 0; it < 8; it++) {
    const sx = new Float32Array(NLIST)
    const sy = new Float32Array(NLIST)
    const cnt = new Uint32Array(NLIST)
    for (let i = 0; i < N; i++) {
      let best = 0
      let bd = Infinity
      for (let j = 0; j < NLIST; j++) {
        const d = (xs[i] - cx[j]) ** 2 + (ys[i] - cy[j]) ** 2
        if (d < bd) {
          bd = d
          best = j
        }
      }
      assign[i] = best
      sx[best] += xs[i]
      sy[best] += ys[i]
      cnt[best]++
    }
    for (let j = 0; j < NLIST; j++)
      if (cnt[j]) {
        cx[j] = sx[j] / cnt[j]
        cy[j] = sy[j] / cnt[j]
      }
  }
  const lists: number[][] = Array.from({ length: NLIST }, () => [])
  for (let i = 0; i < N; i++) lists[assign[i]].push(i)
  return { xs, ys, cx, cy, lists }
}

type Index = ReturnType<typeof buildIndex>

function search(ix: Index, qx: number, qy: number, nprobe: number) {
  const order = Array.from({ length: NLIST }, (_, j) => j).sort((a, b) => (ix.cx[a] - qx) ** 2 + (ix.cy[a] - qy) ** 2 - ((ix.cx[b] - qx) ** 2 + (ix.cy[b] - qy) ** 2))
  const probed = order.slice(0, nprobe)
  const topk = (ids: Iterable<number>) => {
    const best: [number, number][] = []
    for (const i of ids) {
      const d = (ix.xs[i] - qx) ** 2 + (ix.ys[i] - qy) ** 2
      if (best.length < K || d < best[best.length - 1][0]) {
        best.push([d, i])
        best.sort((a, b) => a[0] - b[0])
        if (best.length > K) best.pop()
      }
    }
    return best.map((b) => b[1])
  }
  function* scanned() {
    for (const j of probed) yield* ix.lists[j]
  }
  function* all() {
    for (let i = 0; i < N; i++) yield i
  }
  const found = topk(scanned())
  const truth = topk(all())
  const hit = found.filter((i) => truth.includes(i)).length
  const count = probed.reduce((a, j) => a + ix.lists[j].length, 0)
  return { probed, found, truth, recall: hit / K, frac: count / N }
}

export default function RetrievalDemo({ compact }: { compact?: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null)
  const m = useMotionPrefs()
  const [nprobe, setNprobe] = useState(3)
  const [res, setRes] = useState({ recall: 0, frac: 0 })
  const s = useRef({ ix: null as Index | null, q: [0.12, -0.2] as [number, number], touched: false, dirty: true, visible: false })
  const probeRef = useRef(nprobe)
  probeRef.current = nprobe

  useEffect(() => {
    s.current.dirty = true
  }, [nprobe])

  useEffect(() => {
    const c = cv.current!
    const ctx = c.getContext('2d')!
    s.current.ix ??= buildIndex()
    const ix = s.current.ix
    let W = 0
    let H = 0
    let raf = 0
    let base: HTMLCanvasElement | null = null
    let col = { fg: '#eee', fg2: '#aaa', fg3: '#666', accent: '#9ecbff' }
    const sc = () => Math.min(W, H) / 2.08
    const X = (x: number) => W / 2 + x * sc() * (W / H > 1.2 ? 1.45 : 1)
    const Y = (y: number) => H / 2 + y * sc()
    const inv = (px: number, py: number): [number, number] => [(px - W / 2) / (sc() * (W / H > 1.2 ? 1.45 : 1)), (py - H / 2) / sc()]
    ;(c as unknown as { inv: typeof inv }).inv = inv

    const layout = () => {
      const r = c.getBoundingClientRect()
      const dpr = Math.min(devicePixelRatio, 2)
      W = r.width
      H = r.height
      c.width = W * dpr
      c.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      col = { fg: cssVar(c, '--d-fg', '#eee'), fg2: cssVar(c, '--d-fg2', '#aaa'), fg3: cssVar(c, '--d-fg3', '#666'), accent: cssVar(c, '--d-accent', '#9ecbff') }
      base = document.createElement('canvas')
      base.width = W * dpr
      base.height = H * dpr
      const b = base.getContext('2d')!
      b.setTransform(dpr, 0, 0, dpr, 0, 0)
      b.fillStyle = col.fg3
      b.globalAlpha = 0.55
      for (let i = 0; i < N; i++) b.fillRect(X(ix.xs[i]) - 0.6, Y(ix.ys[i]) - 0.6, 1.2, 1.2)
      s.current.dirty = true
    }

    const draw = (now: number) => {
      const st = s.current
      if (!st.touched && !m.reduced && st.visible) {
        const t = now / 1000 / (m.level === 'expressive' ? 5 : 8)
        st.q = [0.62 * Math.sin(t * 1.3), 0.55 * Math.sin(t * 2.1 + 1)]
        st.dirty = true
      }
      if (st.dirty && base) {
        st.dirty = false
        const r = search(ix, st.q[0], st.q[1], probeRef.current)
        setRes((p) => (p.recall === r.recall && p.frac === r.frac ? p : { recall: r.recall, frac: r.frac }))
        ctx.clearRect(0, 0, W, H)
        ctx.drawImage(base, 0, 0, W, H)
        ctx.fillStyle = col.fg2
        for (const j of r.probed) for (const i of ix.lists[j]) ctx.fillRect(X(ix.xs[i]) - 0.8, Y(ix.ys[i]) - 0.8, 1.6, 1.6)
        // centroids
        ctx.strokeStyle = col.fg3
        ctx.lineWidth = 1
        for (let j = 0; j < NLIST; j++) {
          const on = r.probed.includes(j)
          ctx.strokeStyle = on ? col.fg : col.fg3
          const x = X(ix.cx[j])
          const y = Y(ix.cy[j])
          ctx.beginPath()
          ctx.moveTo(x - 3, y)
          ctx.lineTo(x + 3, y)
          ctx.moveTo(x, y - 3)
          ctx.lineTo(x, y + 3)
          ctx.stroke()
        }
        const [qx, qy] = [X(st.q[0]), Y(st.q[1])]
        // missed true neighbours
        ctx.strokeStyle = col.fg
        for (const i of r.truth)
          if (!r.found.includes(i)) {
            ctx.beginPath()
            ctx.arc(X(ix.xs[i]), Y(ix.ys[i]), 4, 0, Math.PI * 2)
            ctx.stroke()
          }
        // found
        ctx.strokeStyle = col.accent
        ctx.globalAlpha = 0.5
        for (const i of r.found) {
          ctx.beginPath()
          ctx.moveTo(qx, qy)
          ctx.lineTo(X(ix.xs[i]), Y(ix.ys[i]))
          ctx.stroke()
        }
        ctx.globalAlpha = 1
        ctx.fillStyle = col.accent
        for (const i of r.found) {
          ctx.beginPath()
          ctx.arc(X(ix.xs[i]), Y(ix.ys[i]), 2.6, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.fillStyle = col.fg
        ctx.beginPath()
        ctx.arc(qx, qy, 4.5, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    layout()
    raf = requestAnimationFrame(draw)
    const ro = new ResizeObserver(layout)
    ro.observe(c)
    const io = new IntersectionObserver(([e]) => (s.current.visible = e.isIntersecting))
    io.observe(c)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [m.reduced, m.level])

  const move = (e: React.PointerEvent | React.MouseEvent, force = false) => {
    if (!force && (e as React.PointerEvent).pointerType === 'touch') return
    const r = cv.current!.getBoundingClientRect()
    const inv = (cv.current as unknown as { inv: (x: number, y: number) => [number, number] }).inv
    s.current.q = inv(e.clientX - r.left, e.clientY - r.top)
    s.current.touched = true
    s.current.dirty = true
  }

  const perB = Math.round(res.frac * 1e9 / 1e6)
  return (
    <Frame
      title="IVF search: how much of the index do you read?"
      provenance={['illustrative']}
      controls={
        <span className="demo-readout">
          recall@10 <b>{Math.round(res.recall * 100)}%</b> · scanned <b>{(res.frac * 100).toFixed(1)}%</b> · at 1B vectors ≈ <b>{perB.toLocaleString()}M</b> distances/query
        </span>
      }
      caption={
        <>
          <b>Illustrative:</b> 24,000 points in 2-D stand in for a billion high-dimensional vectors. The index clusters them into 48 lists. A query reads only
          the nearest <i>nprobe</i> lists, so recall trades against work. The real deployments used cuVS IVF-PQ and CAGRA across 8+ NVIDIA GPUs. Hollow rings are true
          neighbours the index missed. {compact ? '' : 'Hover or tap to move the query.'}
        </>
      }
    >
      <div className="cv" onPointerMove={move} onClick={(e) => move(e, true)} style={compact ? { aspectRatio: 1.3 } : undefined}>
        <canvas ref={cv} role="img" aria-label="Approximate nearest-neighbour search over clustered points" />
      </div>
      <div className="demo-row">
        <label>
          nprobe
          <input className="demo-range" type="range" min={1} max={12} step={1} value={nprobe} onChange={(e) => setNprobe(+e.target.value)} aria-label="Number of lists probed" />
          <span className="demo-readout">
            <b>{nprobe}</b>
          </span>
        </label>
      </div>
    </Frame>
  )
}
