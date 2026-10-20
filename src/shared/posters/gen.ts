/*
 * Poster generator: a miniature of every demo drawn from its own data. Run at dev time (`node src/shared/posters/run.mjs`), never shipped:
 * it writes ./data.ts, a few KB of SVG markup the cards render at SSR time (zero JS work, crisp at any DPR).
 *
 * Every poster is drawn from the same source as its demo:
 *   steering  → src/data/steering.json (real read-back projections, Qwen2.5-1.5B-Instruct, joy vector)
 *   lossmask  → src/data/lossmask.json (real Qwen2.5 tokens), standard assistant-only mask
 *   orbit     → src/data/tle.json through src/demos/orbit/model.ts (SGP4), one pass over Victoria
 *   es        → ESDemo's landscape f(x, y), λ = 45, μ = 8, σ = 0.16, same start point (seeded run)
 *   retrieval → RetrievalDemo's buildIndex (same seed 7, 24,000 points, 48 lists, k = 10, nprobe 3, default query)
 *   ocean     → OceanDemo's truth / predicted / sensor profiles and uncertainty band
 * The illustrative generators are copied verbatim from the demos (they aren't exported); keep them in sync.
 */
import steering from '../../data/steering.json'
import lossmask from '../../data/lossmask.json'
import { BUILD_TLE, Sat, VIC, MASK_DEG, RE, type V3 } from '../../demos/orbit/model'

export const W = 360
export const H = 140
const f1 = (n: number) => (Math.round(n * 10) / 10).toString()
const pt = (x: number, y: number) => `${f1(x)} ${f1(y)}`
const poly = (ps: [number, number][]) => ps.map((p, i) => `${i ? 'L' : 'M'}${pt(p[0], p[1])}`).join('')
/** Many round dots as one path: zero-length segments with round caps (stroke-width sets the diameter). */
const dots = (ps: [number, number][]) => ps.map((p) => `M${pt(p[0], p[1])}h0`).join('')
/** Point clouds: whole units are plenty at 1 unit ≈ 1 CSS px. */
const cloud = (ps: [number, number][]) => ps.map((p) => `M${Math.round(p[0])} ${Math.round(p[1])}h0`).join('')
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/* ---------------------------------------------------------------- steering */
function steeringPoster() {
  const A = steering.alphas
  const joy = steering.concepts.joy.outputs // [prompt][alpha]
  const x0 = 18,
    x1 = W - 18
  const lo = -15,
    hi = 13
  const X = (a: number) => x0 + ((a - A[0]) / (A[A.length - 1] - A[0])) * (x1 - x0)
  const Y = (v: number) => 34 + ((hi - v) / (hi - lo)) * (H - 56)
  const mean = A.map((_, i) => joy.reduce((s, q) => s + q[i].expr, 0) / joy.length)
  let s = ''
  // frame: zero projection and α = 0
  s += `<path class="ax" d="M${x0} ${f1(Y(0))}H${x1}"/>`
  s += `<path class="ax" d="M${f1(X(0))} 28V${H - 20}"/>`
  // α ticks
  s += `<path class="tk" d="${A.map((a) => `M${f1(X(a))} ${H - 20}v3`).join('')}"/>`
  // the four prompts, faint
  for (const q of joy) s += `<path class="d0" d="${poly(q.map((o, i) => [X(A[i]), Y(o.expr)]))}"/>`
  // mean, in the accent
  s += `<path class="ac" d="${poly(mean.map((v, i) => [X(A[i]), Y(v)]))}"/>`
  s += `<path class="acd" d="${dots(mean.map((v, i) => [X(A[i]), Y(v)]))}"/>`
  s += `<text class="lb" x="${x0}" y="${H - 6}">α −1.2</text>`
  s += `<text class="lb" x="${f1(X(0))}" y="${H - 6}" text-anchor="middle">0</text>`
  s += `<text class="lb" x="${x1}" y="${H - 6}" text-anchor="end">+1.2</text>`
  s += `<text class="lb" x="${x0}" y="${f1(Y(0) - 5)}">projection on v̂</text>`
  const last = mean.length - 1
  s += `<text class="lb lb--ac" x="${f1(X(A[last]))}" y="${f1(Y(mean[last]) + 15)}" text-anchor="end">joy</text>`
  return s
}

/* ---------------------------------------------------------------- loss masking */
function lossmaskPoster() {
  const fs = 9.5
  const cw = fs * 0.6 // IBM Plex Mono advance: 600 / 1000 em
  const gx = 16,
    tx = 82,
    tw = W - tx - 14
  const perLine = Math.floor(tw / cw)
  const lh = 12.5
  let y = 22
  let s = ''
  const label: Record<string, string> = { system: 'system', user: 'user', assistant: 'assistant' }
  for (const seg of lossmask.segments) {
    const on = seg.role === 'assistant'
    s += `<text class="lb${on ? ' lb--ac' : ''}" x="${gx}" y="${f1(y)}">${label[seg.role]}</text>`
    // wrap at token boundaries
    let col = 0
    const lines: { t: string; c: number }[][] = [[]]
    for (const t0 of seg.tokens) {
      let t = t0
      if (col + t.length > perLine) {
        lines.push([])
        col = 0
        t = t.replace(/^ /, '')
      }
      lines[lines.length - 1].push({ t, c: col })
      col += t.length
    }
    for (const line of lines) {
      let txt = ''
      let under = ''
      for (const k of line) {
        const lead = k.t.length - k.t.trimStart().length
        const word = k.t.trimStart()
        txt += `<tspan x="${f1(tx + (k.c + lead) * cw)}">${esc(word)}</tspan>`
        under += `M${f1(tx + (k.c + lead) * cw + 0.4)} ${f1(y + 3.2)}h${f1(word.length * cw - 1.2)}`
      }
      s += `<path class="${on ? 'um' : 'u0'}" d="${under}"/>`
      s += `<text class="tok${on ? ' tok--on' : ''}" y="${f1(y)}">${txt}</text>`
      y += lh
    }
    y += 5
  }
  return { svg: s, height: y }
}

/* ---------------------------------------------------------------- evolution strategies */
// ESDemo.tsx, verbatim
const g = (x: number, y: number, cx: number, cy: number, s: number) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * s * s))
const f = (x: number, y: number) =>
  g(x, y, 0.45, -0.35, 0.26) + 0.62 * g(x, y, -0.52, 0.42, 0.2) + 0.3 * g(x, y, -0.05, 0.05, 0.55) + 0.035 * Math.sin(9 * x) * Math.cos(7 * y)

function rng(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296
}

/** Marching squares: iso-lines of `fn` at `level` on an nx × ny grid over the viewBox, as one path. */
function contour(fn: (px: number, py: number) => number, level: number, nx: number, ny: number) {
  const dx = W / nx,
    dy = H / ny
  const v: number[][] = []
  for (let j = 0; j <= ny; j++) {
    v.push([])
    for (let i = 0; i <= nx; i++) v[j].push(fn(i * dx, j * dy))
  }
  const segs: [[number, number], [number, number]][] = []
  const lerp = (a: number, b: number) => (level - a) / (b - a)
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const a = v[j][i],
        b = v[j][i + 1],
        c = v[j + 1][i + 1],
        d = v[j + 1][i]
      const x = i * dx,
        y = j * dy
      const e: [number, number][] = []
      if (a < level !== b < level) e.push([x + lerp(a, b) * dx, y])
      if (b < level !== c < level) e.push([x + dx, y + lerp(b, c) * dy])
      if (d < level !== c < level) e.push([x + lerp(d, c) * dx, y + dy])
      if (a < level !== d < level) e.push([x, y + lerp(a, d) * dy])
      if (e.length === 2) segs.push([e[0], e[1]])
      else if (e.length === 4) {
        segs.push([e[0], e[1]])
        segs.push([e[2], e[3]])
      }
    }
  // chain segments into polylines so the path stays small
  const key = (p: [number, number]) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`
  const byEnd = new Map<string, number[]>()
  segs.forEach((sg, k) => {
    for (const p of sg) {
      const kk = key(p)
      byEnd.set(kk, [...(byEnd.get(kk) ?? []), k])
    }
  })
  const used = new Set<number>()
  let d = ''
  for (let k = 0; k < segs.length; k++) {
    if (used.has(k)) continue
    used.add(k)
    const line: [number, number][] = [segs[k][0], segs[k][1]]
    for (const dir of [1, -1]) {
      for (;;) {
        const end = dir === 1 ? line[line.length - 1] : line[0]
        const next = (byEnd.get(key(end)) ?? []).find((n) => !used.has(n))
        if (next === undefined) break
        used.add(next)
        const sg = segs[next]
        const other = key(sg[0]) === key(end) ? sg[1] : sg[0]
        if (dir === 1) line.push(other)
        else line.unshift(other)
      }
    }
    d += poly(simplify(line, 0.3))
  }
  return d
}

/** Ramer–Douglas–Peucker: drop points within `eps` units of the chord. */
function simplify(ps: [number, number][], eps: number): [number, number][] {
  if (ps.length < 3) return ps
  const [a, b] = [ps[0], ps[ps.length - 1]]
  const L = Math.hypot(b[0] - a[0], b[1] - a[1])
  let best = 0,
    at = 0
  for (let i = 1; i < ps.length - 1; i++) {
    // closed loops (a = b) fall back to distance from the endpoint, so a ring never collapses to its chord
    const dd = L < 1e-6 ? Math.hypot(ps[i][0] - a[0], ps[i][1] - a[1]) : Math.abs((b[0] - a[0]) * (a[1] - ps[i][1]) - (a[0] - ps[i][0]) * (b[1] - a[1])) / L
    if (dd > best) {
      best = dd
      at = i
    }
  }
  if (best <= eps) return [a, b]
  return [...simplify(ps.slice(0, at + 1), eps).slice(0, -1), ...simplify(ps.slice(at), eps)]
}

function esPoster() {
  // world → poster: x in [-1.45, 1.45], y in [-0.95, 0.95] (y grows downward, as on the demo's canvas)
  const xr = 1.45,
    yr = 0.95
  const X = (x: number) => ((x + xr) / (2 * xr)) * W
  const Y = (y: number) => ((y + yr) / (2 * yr)) * H
  const wx = (px: number) => (px / W) * 2 * xr - xr
  const wy = (py: number) => (py / H) * 2 * yr - yr
  let s = ''
  for (let k = 1; k <= 8; k++) s += `<path class="${k >= 6 ? 'd1' : 'd0'}" d="${contour((px, py) => f(wx(px), wy(py)), k / 9, 84, 34)}"/>`
  // one seeded run with the demo's parameters
  const r = rng(11)
  const randn = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())
  const sigma = 0.16
  let th: [number, number] = [-0.15, 0.85]
  const trail: [number, number][] = [th]
  let last: { pts: [number, number][]; elite: Set<number> } | null = null
  for (let gen = 0; gen < 9; gen++) {
    const pts: [number, number][] = Array.from({ length: 45 }, () => [th[0] + sigma * randn(), th[1] + sigma * randn()])
    const order = pts.map((p, i) => [f(p[0], p[1]), i]).sort((a, b) => b[0] - a[0])
    const elite = new Set(order.slice(0, 8).map((o) => o[1]))
    const mean = [...elite].reduce<[number, number]>((a, i) => [a[0] + pts[i][0] / 8, a[1] + pts[i][1] / 8], [0, 0])
    th = [th[0] + 0.85 * (mean[0] - th[0]), th[1] + 0.85 * (mean[1] - th[1])]
    trail.push(th)
    if (gen === 0) last = { pts, elite }
  }
  const P = (p: [number, number]): [number, number] => [X(p[0]), Y(p[1])]
  if (last) {
    s += `<path class="dt0" d="${dots(last.pts.filter((_, i) => !last!.elite.has(i)).map(P))}"/>`
    s += `<path class="acd" d="${dots(last.pts.filter((_, i) => last!.elite.has(i)).map(P))}"/>`
  }
  s += `<path class="fg" d="${poly(trail.map(P))}"/>`
  s += `<path class="fgd" d="${dots(trail.map(P))}"/>`
  const [ex, ey] = P(trail[trail.length - 1])
  s += `<circle class="ring" cx="${f1(ex)}" cy="${f1(ey)}" r="4.5"/>`
  return s
}

/* ---------------------------------------------------------------- retrieval */
// RetrievalDemo.tsx buildIndex, verbatim (N = 24,000, 48 lists, seed 7)
function buildIndex() {
  const N = 24000,
    NLIST = 48
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
  return { N, NLIST, xs, ys, cx, cy, lists }
}

/** Convex polygon ∩ half-plane {p : (p − m)·n ≤ 0}. */
function clip(pg: [number, number][], m: [number, number], nrm: [number, number]) {
  const out: [number, number][] = []
  const side = (p: [number, number]) => (p[0] - m[0]) * nrm[0] + (p[1] - m[1]) * nrm[1]
  for (let i = 0; i < pg.length; i++) {
    const a = pg[i],
      b = pg[(i + 1) % pg.length]
    const sa = side(a),
      sb = side(b)
    if (sa <= 0) out.push(a)
    if (sa <= 0 !== sb <= 0) {
      const t = sa / (sa - sb)
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
    }
  }
  return out
}

function retrievalPoster() {
  const ix = buildIndex()
  // world → poster: x in [-1, 1], y in [-0.8, 0.8], screen-space like the demo
  const yr = 0.8
  const X = (x: number) => ((x + 1) / 2) * W
  const Y = (y: number) => ((y + yr) / (2 * yr)) * H
  const q: [number, number] = [0.12, -0.2] // the demo's default query
  const nprobe = 3,
    K = 10
  const order = Array.from({ length: ix.NLIST }, (_, j) => j).sort((a, b) => (ix.cx[a] - q[0]) ** 2 + (ix.cy[a] - q[1]) ** 2 - ((ix.cx[b] - q[0]) ** 2 + (ix.cy[b] - q[1]) ** 2))
  const probed = new Set(order.slice(0, nprobe))
  const topk = (ids: number[]) =>
    ids
      .map((i) => [(ix.xs[i] - q[0]) ** 2 + (ix.ys[i] - q[1]) ** 2, i])
      .sort((a, b) => a[0] - b[0])
      .slice(0, K)
      .map((a) => a[1])
  const found = topk([...probed].flatMap((j) => ix.lists[j]))
  const truth = topk(Array.from({ length: ix.N }, (_, i) => i))
  const missed = truth.filter((i) => !found.includes(i))
  // Voronoi cells of the coarse quantiser (the IVF lists), in poster space
  const C: [number, number][] = Array.from({ length: ix.NLIST }, (_, j) => [X(ix.cx[j]), Y(ix.cy[j])])
  const cell = (j: number) => {
    let pg: [number, number][] = [
      [0, 0],
      [W, 0],
      [W, H],
      [0, H],
    ]
    for (let k = 0; k < C.length; k++) {
      if (k === j) continue
      const m: [number, number] = [(C[j][0] + C[k][0]) / 2, (C[j][1] + C[k][1]) / 2]
      pg = clip(pg, m, [C[k][0] - C[j][0], C[k][1] - C[j][1]])
      if (!pg.length) break
    }
    return pg
  }
  let s = ''
  // cell borders: each shared edge drawn once is overkill; closed cells at hairline weight read the same
  s += `<path class="vo" d="${Array.from({ length: ix.NLIST }, (_, j) => poly(cell(j)) + 'Z').join('')}"/>`
  s += `<path class="vofill" d="${[...probed].map((j) => poly(cell(j)) + 'Z').join('')}"/>`
  const inView = (i: number) => Math.abs(ix.ys[i]) < yr - 0.01 && Math.abs(ix.xs[i]) < 0.995
  const P = (i: number): [number, number] => [X(ix.xs[i]), Y(ix.ys[i])]
  const bg: number[] = []
  const scanned: number[] = []
  for (let i = 0; i < ix.N; i += 1) {
    if (!inView(i)) continue
    const inProbe = [...probed].some((j) => ix.lists[j].includes(i))
    if (inProbe) {
      if (i % 7 === 0) scanned.push(i)
    } else if (i % 41 === 0) bg.push(i)
  }
  s += `<path class="dt0" d="${cloud(bg.map(P))}"/>`
  s += `<path class="dt1" d="${cloud(scanned.map(P))}"/>`
  s += `<path class="acl" d="${found.map((i) => `M${pt(X(q[0]), Y(q[1]))}L${pt(...P(i))}`).join('')}"/>`
  s += `<path class="acd" d="${dots(found.map(P))}"/>`
  for (const i of missed) s += `<circle class="miss" cx="${f1(P(i)[0])}" cy="${f1(P(i)[1])}" r="3"/>`
  s += `<path class="cen" d="${C.map((c) => `M${pt(c[0] - 2, c[1])}h4M${pt(c[0], c[1] - 2)}v4`).join('')}"/>`
  s += `<circle class="q" cx="${f1(X(q[0]))}" cy="${f1(Y(q[1]))}" r="3.2"/>`
  return { svg: s, recall: (K - missed.length) / K }
}

/* ---------------------------------------------------------------- ocean */
// OceanDemo.tsx, verbatim
const SENSOR_Z = [0, 10, 20, 30, 45, 60, 80, 100, 125, 150, 175, 200]
const truth = (z: number) => 7.1 + 4.9 * Math.exp(-z / 34) + 0.3 * Math.exp(-((z - 55) ** 2) / 320)
const predicted = (z: number) => truth(z) + 0.16 * Math.sin(z / 23 + 1.1)
const sensorAt = (z: number) => truth(z) + 0.26 * Math.sin(z * 1.7 + 0.4) * Math.cos(z * 0.31 + 0.2)

function oceanPoster() {
  const x0 = 58,
    x1 = W - 16,
    y0 = 22,
    y1 = H - 22
  const xt = (t: number) => x0 + ((t - 6.5) / 6) * (x1 - x0)
  const yz = (z: number) => y0 + (z / 200) * (y1 - y0)
  let s = ''
  s += `<path class="ax" d="M16 ${y0}H${x1}"/>`
  for (const t of [7, 9, 11]) {
    s += `<path class="gr" d="M${f1(xt(t))} ${y0}V${y1}"/>`
    s += `<text class="lb" x="${f1(xt(t))}" y="${H - 7}" text-anchor="middle">${t}°C</text>`
  }
  for (const z of [0, 100, 200]) s += `<text class="lb" x="${x0 - 10}" y="${f1(yz(z) + 3)}" text-anchor="end">${z} m</text>`
  const l: [number, number][] = []
  const r: [number, number][] = []
  for (let z = 0; z <= 200; z += 10) {
    const u = 0.25 + 0.3 * Math.exp(-((z - 45) ** 2) / 900)
    l.push([xt(predicted(z) - u), yz(z)])
    r.unshift([xt(predicted(z) + u), yz(z)])
  }
  s += `<path class="band" d="${poly([...l, ...r])}Z"/>`
  const c: [number, number][] = []
  for (let z = 0; z <= 200; z += 4) c.push([xt(predicted(z)), yz(z)])
  s += `<path class="ac" d="${poly(c)}"/>`
  s += `<path class="fgd" d="${dots(SENSOR_Z.map((z) => [xt(sensorAt(z)), yz(z)]))}"/>`
  return s
}

/* ---------------------------------------------------------------- orbit */
const DEG = 180 / Math.PI
const ll = (p: V3): [number, number] => [Math.atan2(p[1], p[0]) * DEG, Math.asin(Math.max(-1, Math.min(1, p[2]))) * DEG]
// equirectangular, 1 unit per degree, latitudes ±70 in view
const OX = (lon: number) => lon + 180
const OY = (lat: number) => 70 - lat
function geoPath(pts: [number, number][]) {
  let d = ''
  let prev: [number, number] | null = null
  for (const p of pts) {
    d += `${!prev || Math.abs(p[0] - prev[0]) > 180 ? 'M' : 'L'}${pt(OX(p[0]), OY(p[1]))}`
    prev = p
  }
  return d
}
function smallCircle(c: V3, lam: number, n = 48): [number, number][] {
  const h = Math.hypot(c[0], c[1]) || 1
  const e1: V3 = [-c[1] / h, c[0] / h, 0]
  const e2: V3 = [c[1] * e1[2] - c[2] * e1[1], c[2] * e1[0] - c[0] * e1[2], c[0] * e1[1] - c[1] * e1[0]]
  const cl = Math.cos(lam),
    sl = Math.sin(lam)
  const out: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * 2 * Math.PI,
      ct = Math.cos(t),
      st = Math.sin(t)
    out.push(ll([c[0] * cl + (e1[0] * ct + e2[0] * st) * sl, c[1] * cl + (e1[1] * ct + e2[1] * st) * sl, c[2] * cl + (e1[2] * ct + e2[2] * st) * sl]))
  }
  return out
}

function orbitPoster() {
  const sat = new Sat(BUILD_TLE.tle)
  // the first good pass over Victoria after the TLE epoch
  const pass = sat.passes(sat.epoch, 12, 48).find((p) => p.maxEl > 45) ?? sat.passes(sat.epoch, 1, 48)[0]
  const T = sat.periodMin
  const track = sat.track(pass.tca, -2.5 * T, 1.5 * T, 400).map(ll)
  const arc = sat.track(pass.aos, 0, (pass.los - pass.aos) / 60e3, 40).map(ll)
  const tca = sat.state(pass.tca)!
  const r = RE + tca.alt
  const m = (MASK_DEG * Math.PI) / 180
  const lam = Math.acos((RE / r) * Math.cos(m)) - m
  const vic: V3 = [Math.cos(VIC.lat / DEG) * Math.cos(VIC.lon / DEG), Math.cos(VIC.lat / DEG) * Math.sin(VIC.lon / DEG), Math.sin(VIC.lat / DEG)]
  let s = ''
  s += `<defs><pattern id="p5-dots" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r="0.62"/></pattern>`
  s += `<mask id="p5-land" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><image href="/orbit/land.png" y="-20" width="360" height="180" preserveAspectRatio="none"/></mask></defs>`
  s += `<path class="gr" d="${[-60, -30, 0, 30, 60].map((l) => `M0 ${OY(l)}H${W}`).join('')}${[-120, -60, 0, 60, 120].map((l) => `M${OX(l)} 0V${H}`).join('')}"/>`
  s += `<rect class="land" width="${W}" height="${H}" fill="url(#p5-dots)" mask="url(#p5-land)"/>`
  s += `<path class="vis" d="${geoPath(smallCircle(vic, lam))}"/>`
  s += `<path class="d1" d="${geoPath(track)}"/>`
  s += `<path class="ac ac--w" d="${geoPath(arc)}"/>`
  s += `<circle class="vic" cx="${f1(OX(VIC.lon))}" cy="${f1(OY(VIC.lat))}" r="1.8"/>`
  s += `<text class="lb" x="${f1(OX(VIC.lon) - 6)}" y="${f1(OY(VIC.lat) + 12)}" text-anchor="end">Victoria</text>`
  const [tlon, tlat] = [tca.lon, tca.lat]
  s += `<circle class="satdot" cx="${f1(OX(tlon))}" cy="${f1(OY(tlat))}" r="2.6"/>`
  return { svg: s, maxEl: pass.maxEl, when: new Date(pass.tca).toISOString(), periodMin: T }
}

export function build() {
  const lm = lossmaskPoster()
  const rt = retrievalPoster()
  const ob = orbitPoster()
  return {
    steering: steeringPoster(),
    lossmask: lm.svg,
    es: esPoster(),
    retrieval: rt.svg,
    ocean: oceanPoster(),
    orbit: ob.svg,
    meta: { lossmaskHeight: lm.height, recall: rt.recall, orbit: { maxEl: ob.maxEl, tca: ob.when, periodMin: ob.periodMin } },
  }
}
