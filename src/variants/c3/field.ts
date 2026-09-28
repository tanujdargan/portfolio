// c3 "City of points": Tanuj's Toronto skyline at night, as a point field, re-forming into the embedding space
// of his research as you scroll. Raw WebGL2, one buffer, one draw call. Loaded with a dynamic import after first paint.
//
// Every point has two homes, and the vertex shader interpolates between them with a scroll uniform (uU):
//   city     — a lit pixel of the night poster the page already painted (sampled on a 2-D canvas, zero extra bytes),
//              placed with the same object-fit: cover maths as the <img>, so the points land on the photo's own lights.
//   clusters — one of five research clusters. The steering cluster is the REAL residual-stream activations
//              (src/data/steering.json: joy / distress / certainty, 20 per pole, Qwen2.5-1.5B-Instruct), and the
//              loss-masking cluster is the real tokenised conversation from src/data/lossmask.json.
// City points are generated in scan order along the axis the clusters are laid out on, so the left of the skyline
// becomes the left clusters (desktop) and the street at the bottom sinks into the ocean (phone). No sort needed.
import steer from '../../data/steering.json'
import chat from '../../data/lossmask.json'
import { bus } from './bus'

type V3 = [number, number, number]
export interface FieldOpts {
  canvas: HTMLCanvasElement
  poster: HTMLImageElement
  layer: HTMLElement
  tags: HTMLElement[]
  root: HTMLElement
  tall: boolean
  low: boolean
  onReady: () => void
  onFail: () => void
}
export interface FieldHandle {
  dispose: () => void
}

const STRIDE = 15 // uv2 col3 pos3 tone3 meta4 (id, rand, delay, size)
const WEIGHTS = [0.34, 0.15, 0.15, 0.12, 0.18] // steering, lossmask, ocean, es, retrieval
const DUST = 0.06
const WARM: V3 = [1, 0.68, 0.36] // the city's sodium light, reused as the "on" colour of every cluster
const COOL: V3 = [0.42, 0.72, 1]
const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scl = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s]
const norm = (a: V3): V3 => scl(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1))
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------- layout
interface Layout {
  centers: V3[]
  labels: V3[] // where each DOM tag pins (world)
  eye: V3
  at: V3
  fovy: number
  s: number // scale of the real 2-D projections
}
function layoutFor(tall: boolean, aspect: number): Layout {
  if (tall) {
    const centers: V3[] = [
      [0, 1.6, 0],
      [0, 8.7, -1],
      [0, -10.3, 0],
      [-3.5, -4.6, 0],
      [3.5, -4.7, 0],
    ]
    return {
      centers,
      labels: [add(centers[0], [-4.3, 4.8, 0]), add(centers[1], [-4.1, 2.2, 0]), add(centers[2], [-3.4, 2.5, 0]), add(centers[3], [-2.2, 2.8, 0]), add(centers[4], [-1.2, 2.9, 0])],
      eye: [0, 2.6, 39],
      at: [0, 0.2, 0],
      fovy: 0.87,
      s: 0.25,
    }
  }
  const sx = Math.min(1.15, Math.max(0.72, aspect / 1.6))
  const c = (x: number, y: number, z: number): V3 => [x * sx, y, z]
  const centers: V3[] = [c(6.5, 1.5, 0), c(16, 9, -1), c(5.5, -9.6, 0), c(17.5, -0.8, 0), c(16.5, -9.6, 0)]
  return {
    centers,
    labels: [add(centers[0], [-5, 5.6, 0]), add(centers[1], [-4.8, 2.2, 0]), add(centers[2], [-4.4, 2.8, 0]), add(centers[3], [-2.8, 3.1, 0]), add(centers[4], [-2.8, 3.3, 0])],
    eye: [0, 2.5, 34],
    at: [0, 0, 0],
    fovy: 0.8,
    s: 0.32,
  }
}

// ---------------------------------------------------------------- cluster generators
type Out = { p: V3; t: V3; size: number }
type Gen = (R: () => number, g: () => number) => Out

function makeGens(L: Layout, tall: boolean): Gen[] {
  const C = L.centers
  // 1 · steering: three concept sheets, each the real 2-D projection (v̂, top PC) of 40 activations
  const concepts = [steer.concepts.joy, steer.concepts.distress, steer.concepts.certainty]
  const basis = (k: number) => {
    const phi = k * ((2 * Math.PI) / 3) + 0.25
    return { e1: norm([Math.cos(phi), Math.sin(phi) * 0.8, 0.35]), e2: [-Math.sin(phi), Math.cos(phi), 0] as V3, o: add(C[0], [0, 0, (k - 1) * 2.2]) }
  }
  const B = [0, 1, 2].map(basis)
  const steering: Gen = (R, g) => {
    const k = Math.floor(R() * 3)
    const j = Math.floor(R() * 40)
    const cl = concepts[k].cloud
    const xy = j < 20 ? cl.pos[j] : cl.neg[j - 20]
    const b = B[k]
    const p = add(add(b.o, add(scl(b.e1, xy[0] * L.s), scl(b.e2, xy[1] * L.s))), [g() * 0.2, g() * 0.2, g() * 0.2])
    return { p, t: scl(j < 20 ? WARM : COOL, 0.42), size: 0.075 + R() * 0.04 }
  }

  // 2 · loss masking: the real tokenised chat, laid out as lines of text; loss-on tokens (the assistant's) are lit
  const cw = tall ? 0.15 : 0.17
  const maxW = tall ? 8.4 : 9.6
  const rects: { x: number; y: number; w: number; role: string }[] = []
  let x = 0
  let y = 0
  for (const seg of chat.segments) {
    if (x > 0) (x = 0), (y -= 0.9)
    for (const tok of seg.tokens) {
      const w = Math.max(2, tok.trim().length + 0.6) * cw
      if (x + w > maxW) (x = 0), (y -= 0.9)
      rects.push({ x, y, w, role: seg.role })
      x += w + 0.1
    }
  }
  const midY = y / 2
  const areaCum: number[] = []
  rects.reduce((s, r, i) => ((areaCum[i] = s + r.w), s + r.w), 0)
  const areaTot = areaCum[areaCum.length - 1]
  const lossmask: Gen = (R, g) => {
    const u = R() * areaTot
    let i = 0
    while (areaCum[i] < u) i++
    const r = rects[i]
    const p: V3 = add(C[1], [r.x + R() * r.w - maxW / 2, r.y - midY + (R() - 0.5) * 0.55, g() * 0.05])
    const on = r.role === 'assistant'
    return { p, t: on ? scl(WARM, 0.5) : r.role === 'user' ? scl(COOL, 0.26) : [0.16, 0.17, 0.2], size: 0.07 }
  }

  // 3 · ocean: a water column seen from a satellite, layers thinning with depth, a sensor probe lowered through them
  const rx = tall ? 3.8 : 4.4
  const ocean: Gen = (R, g) => {
    const u = R()
    if (u < 0.1) return { p: add(C[2], [1.5 + g() * 0.03, 2.4 - R() * 5.2, g() * 0.03]), t: scl(WARM, 0.5), size: 0.06 }
    if (u < 0.13) return { p: add(C[2], [-2.4 + g() * 0.12, 3.6 + g() * 0.12, g() * 0.12]), t: scl(WARM, 0.7), size: 0.07 }
    let i = 0
    while (i < 6 && R() < 0.72) i++
    const th = R() * Math.PI * 2
    const rr = Math.sqrt(R())
    const z = Math.sin(th) * rr * 1.7
    const p: V3 = add(C[2], [Math.cos(th) * rr * rx, 1.3 - i * 0.62 + z * 0.33 + g() * 0.03, z])
    const f = 0.46 - i * 0.05
    return { p, t: [0.33 * f * 2, 0.8 * f, 0.78 * f], size: 0.065 }
  }

  // 4 · evolution strategies: 45 perturbations of one adapter, the best 8 lit, and the step they vote for
  const Re = rng(45)
  const ge = () => (Re() + Re() + Re() + Re() - 2) * 1.2247
  const pert: V3[] = Array.from({ length: 45 }, () => [ge() * 1.15, ge() * 1.15, ge() * 0.5])
  const dir: V3 = norm([0.8, 0.6, 0])
  const top = new Set(
    pert
      .map((p, i) => [p[0] * dir[0] + p[1] * dir[1], i])
      .sort((a, b) => b[0] - a[0])
      .slice(0, 8)
      .map((a) => a[1]),
  )
  const mean = scl(
    pert.filter((_, i) => top.has(i)).reduce((a, b) => add(a, b), [0, 0, 0] as V3),
    1 / 8,
  )
  const es: Gen = (R, g) => {
    const u = R()
    if (u < 0.1) return { p: add(C[3], [g() * 0.1, g() * 0.1, g() * 0.1]), t: [0.62, 0.64, 0.68], size: 0.07 }
    if (u < 0.26) {
      const f = R()
      return { p: add(C[3], add(scl(mean, f * 0.95), [g() * 0.03, g() * 0.03, 0])), t: scl(WARM, 0.45), size: 0.06 }
    }
    const i = Math.floor(R() * 45)
    const on = top.has(i)
    return { p: add(add(C[3], pert[i]), [g() * 0.12, g() * 0.12, g() * 0.12]), t: on ? scl(WARM, 0.55) : [0.2, 0.22, 0.27], size: 0.07 }
  }

  // 5 · retrieval: an IVF index, 48 partitions on a sphere with graph edges between neighbours
  const pr = tall ? 2.4 : 2.8
  const parts: V3[] = []
  for (let i = 0; i < 48; i++) {
    const yy = 1 - (2 * (i + 0.5)) / 48
    const rr = Math.sqrt(1 - yy * yy)
    const th = i * 2.39996
    parts.push(add(C[4], [Math.cos(th) * rr * pr, yy * pr, Math.sin(th) * rr * pr]))
  }
  const retrieval: Gen = (R, g) => {
    const a = Math.floor(R() * 48)
    if (R() < 0.8) return { p: add(parts[a], [g() * 0.2, g() * 0.2, g() * 0.2]), t: scl(COOL, 0.34), size: 0.07 }
    const b = parts[(a + (R() < 0.5 ? 1 : 13)) % 48]
    const f = R()
    return { p: [parts[a][0] + (b[0] - parts[a][0]) * f, parts[a][1] + (b[1] - parts[a][1]) * f, parts[a][2] + (b[2] - parts[a][2]) * f], t: scl(COOL, 0.2), size: 0.05 }
  }
  return [steering, lossmask, ocean, es, retrieval]
}

// ---------------------------------------------------------------- matrices
function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2)
  const nf = 1 / (near - far)
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
}
function lookAt(eye: V3, at: V3) {
  const f = norm([at[0] - eye[0], at[1] - eye[1], at[2] - eye[2]])
  const r = norm([f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0])
  const u: V3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]
  const d = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  return new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -d(r, eye), -d(u, eye), d(f, eye), 1])
}
function mul(a: Float32Array, b: Float32Array) {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
  return o
}

// ---------------------------------------------------------------- shaders
const VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aUV;
layout(location=1) in vec3 aCol;
layout(location=2) in vec3 aPos;
layout(location=3) in vec3 aTone;
layout(location=4) in vec4 aMeta;
uniform vec4 uCover;
uniform mat4 uPV;
uniform float uU, uTime, uK, uCell, uPx, uSway, uFlow;
uniform float uHi[6];
uniform vec3 uC[6];
out vec3 vCol;
out float vA;
vec3 h3(float r){ return fract(sin(vec3(r*127.1, r*311.7, r*74.7))*43758.5453)-0.5; }
void main(){
  int id = int(aMeta.x + 0.5);
  float r = aMeta.y, d = aMeta.z, sz = aMeta.w;
  // each point leaves on its own schedule, so the city unthreads rather than jumps
  float e = clamp((uU - d*uFlow) / (1. - uFlow), 0., 1.);
  e = e*e*(3. - 2.*e);
  vec2 city = vec2(aUV.x*uCover.x + uCover.y, aUV.y*uCover.z + uCover.w);
  vec3 c = uC[id];
  vec3 lp = aPos - c;
  float th = uSway * sin(uTime*0.21 + float(id)*1.7);
  float cs = cos(th), sn = sin(th);
  lp = vec3(cs*lp.x + sn*lp.z, lp.y, -sn*lp.x + cs*lp.z);
  vec3 wp = c + lp + uK*0.05*sin(uTime*vec3(.31,.27,.23) + r*vec3(40.,31.,17.));
  vec4 clip = uPV * vec4(wp, 1.);
  float w = max(clip.w, 0.001);
  vec2 clu = clip.xy / w;
  vec3 n = h3(r);
  float mid = sin(3.14159*e);
  vec2 p = mix(city, clu, e) + (n.xy*0.42 + vec2(0.08, 0.16)) * mid * uK;
  gl_Position = vec4(p, 0., 1.);
  float px = mix(uCell*1.3, sz*uPx/w, e);
  // lights twinkle a little while they're still windows
  float bright = step(0.9, aCol.r + aCol.g);
  float tw = 1. + uK*0.22*bright*(1.-e)*sin(uTime*(0.5 + r*1.9) + r*80.);
  float hi = id < 5 ? mix(1., uHi[id], e) : mix(1., uHi[5], e);
  vec3 col = mix(aCol*tw, aTone*hi, e);
  float a = 1.;
  if (px < 1.) { a = px; px = 1.; }
  gl_PointSize = px;
  vCol = col * a;
  vA = a;
}`
const FS = `#version 300 es
precision mediump float;
in vec3 vCol;
in float vA;
out vec4 o;
void main(){
  vec2 d = gl_PointCoord*2. - 1.;
  float r2 = dot(d, d);
  if (r2 > 1.) discard;
  float f = 1. - r2;
  f *= f;
  vec3 c = vCol * f;
  o = vec4(c, max(c.r, max(c.g, c.b)));
}`

// ---------------------------------------------------------------- build
const idle = () =>
  new Promise<void>((r) => ('requestIdleCallback' in window ? requestIdleCallback(() => r(), { timeout: 80 }) : setTimeout(r, 0)))

async function build(src: string, budget: number, tall: boolean, L: Layout) {
  const img = new Image()
  img.src = src
  await img.decode()
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const cv = document.createElement('canvas')
  cv.width = iw
  cv.height = ih
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const px = ctx.getImageData(0, 0, iw, ih).data
  await idle()

  // Keep probability ∝ lum^0.85 (so density reproduces the photo), solved per-luminance so exactly ~budget survive.
  const hist = new Float64Array(256)
  for (let i = 0; i < px.length; i += 4) hist[Math.round(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2])]++
  const wOf = (l: number) => (l < 22 ? 0 : Math.pow(l / 255, 0.85))
  let lo = 0
  let hi = 400
  for (let it = 0; it < 30; it++) {
    const g = (lo + hi) / 2
    let s = 0
    for (let l = 0; l < 256; l++) s += hist[l] * Math.min(1, wOf(l) * g)
    if (s > budget) hi = g
    else lo = g
  }
  const gain = lo
  const R = rng(7)
  const g = () => (R() + R() + R() + R() - 2) * 1.2247
  const tmp: number[] = []
  // scan along the axis the clusters are laid out on: rows for a phone (top → bottom), columns for a wide screen
  const outer = tall ? ih : iw
  const inner = tall ? iw : ih
  for (let a = 0; a < outer; a++) {
    for (let b = 0; b < inner; b++) {
      const x = tall ? b : a
      const y = tall ? a : b
      const i = (y * iw + x) * 4
      const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]
      const p = Math.min(1, wOf(Math.round(l)) * gain)
      if (p <= 0 || R() > p) continue
      const k = Math.min(1 / p, 3) / 255
      tmp.push((x + R()) / iw, (y + R()) / ih, px[i] * k, px[i + 1] * k, px[i + 2] * k)
    }
    if (a % 120 === 119) await idle()
  }
  const n = tmp.length / 5
  const data = new Float32Array(n * STRIDE)

  // cluster order along the same axis (by projected centre), then contiguous bands of the scan go to each cluster
  const order = [0, 1, 2, 3, 4].sort((i, j) => (tall ? L.centers[j][1] - L.centers[i][1] : L.centers[i][0] - L.centers[j][0]))
  const band: number[] = []
  let acc = 0
  for (const c of order) band.push((acc += WEIGHTS[c]))
  const gens = makeGens(L, tall)
  for (let i = 0; i < n; i++) {
    if (i % 12000 === 11999) await idle()
    const o = i * STRIDE
    data[o] = tmp[i * 5]
    data[o + 1] = tmp[i * 5 + 1]
    data[o + 2] = tmp[i * 5 + 2]
    data[o + 3] = tmp[i * 5 + 3]
    data[o + 4] = tmp[i * 5 + 4]
    const rank = i / n
    let id: number
    let out: Out
    if (R() < DUST) {
      id = 5
      out = { p: [(R() - 0.5) * 56, (R() - 0.5) * 36, -24 + R() * 30], t: [0.1, 0.11, 0.13], size: 0.05 + R() * 0.05 }
    } else {
      let b = 0
      while (b < 4 && band[b] < rank) b++
      id = order[b]
      out = gens[id](R, g)
    }
    data.set(out.p, o + 5)
    data.set(out.t, o + 8)
    // delay: bright lights and the top of the frame leave first; a little noise so it reads as a flow
    const uvy = data[o + 1]
    data[o + 11] = id
    data[o + 12] = R()
    data[o + 13] = Math.min(1, 0.55 * R() + 0.45 * uvy)
    data[o + 14] = out.size
  }
  // shuffle so any prefix is a uniform sample (adaptive quality draws a prefix)
  const t = new Float32Array(STRIDE)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1))
    t.set(data.subarray(i * STRIDE, i * STRIDE + STRIDE))
    data.copyWithin(i * STRIDE, j * STRIDE, j * STRIDE + STRIDE)
    data.set(t, j * STRIDE)
    if (i % 20000 === 0) await idle()
  }
  return { data, n, iw, ih }
}

// ---------------------------------------------------------------- field
export function createField(o: FieldOpts): FieldHandle | null {
  const { canvas, tall } = o
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' })
  if (!gl) return null
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
  const U: Record<string, WebGLUniformLocation | null> = {}
  const u = (name: string) => (U[name] ??= gl.getUniformLocation(prog, name))

  let disposed = false
  let ready = false
  let raf = 0
  let count = 0
  const coarse = matchMedia('(pointer: coarse)').matches
  const budget = o.low ? 30000 : tall || coarse ? 56000 : 130000
  let dprCap = tall || coarse ? 1.5 : 1.75
  let W = 1
  let H = 1
  let dpr = 1
  let iw = 360
  let ih = 480
  let L = layoutFor(tall, innerWidth / innerHeight)
  let pv = new Float32Array(16)
  let zone = { a: 1, b: 2, fa: 1e9, fb: 1e9 + 1 }
  let cur = 0
  let intro = 0
  let time = 0
  let last = performance.now()
  const hiv = new Float32Array(6).fill(1)
  let shown = -1 // reduced motion: the state currently on screen (0 city, 1 clusters)
  let fadeTimer = 0
  let fpsAcc = 0
  let fpsN = 0

  const measure = () => {
    const vh = innerHeight
    const top = (sel: string) => {
      const el = o.root.querySelector<HTMLElement>(sel)
      return el ? el.getBoundingClientRect().top + scrollY : 1e9
    }
    const sp = o.root.querySelector<HTMLElement>('[data-field="clusters-m"]')
    const c = sp && sp.offsetHeight > 0 ? top('[data-field="clusters-m"]') : top('[data-field="clusters"]')
    const end = top('[data-field="end"]')
    zone = { a: vh * 0.16, b: Math.max(vh * 0.6, c - vh * 0.08), fa: end - vh * 0.5, fb: end - vh * 0.1 }
  }
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, dprCap)
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    W = Math.max(1, Math.round(cw * dpr))
    H = Math.max(1, Math.round(ch * dpr))
    canvas.width = W
    canvas.height = H
    gl.viewport(0, 0, W, H)
    L = layoutFor(tall, cw / ch)
    // object-fit: cover; object-position: 50% 100%, exactly as the poster <img>
    const s = Math.max(cw / iw, ch / ih)
    const dw = iw * s
    const dh = ih * s
    const ox = (cw - dw) * 0.5
    const oy = ch - dh
    gl.useProgram(prog)
    gl.uniform4f(u('uCover'), (2 * dw) / cw, (2 * ox) / cw - 1, (-2 * dh) / ch, 1 - (2 * oy) / ch)
    gl.uniform1f(u('uCell'), s * dpr)
    gl.uniform1f(u('uPx'), H / (2 * Math.tan(L.fovy / 2)))
    pv = mul(perspective(L.fovy, cw / ch, 0.5, 200), lookAt(L.eye, L.at))
    gl.uniformMatrix4fv(u('uPV'), false, pv)
    gl.uniform3fv(u('uC'), new Float32Array([...L.centers.flat(), 0, 0, 0]))
    measure()
    wake()
  }

  const placeTags = (op: number) => {
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    o.tags.forEach((el, i) => {
      const [x, y, z] = L.labels[i]
      const cx = pv[0] * x + pv[4] * y + pv[8] * z + pv[12]
      const cy = pv[1] * x + pv[5] * y + pv[9] * z + pv[13]
      const w = pv[3] * x + pv[7] * y + pv[11] * z + pv[15]
      const sx = Math.round((cx / w * 0.5 + 0.5) * cw)
      const sy = Math.round((0.5 - (cy / w) * 0.5) * ch)
      const hi = bus.focus < 0 || bus.focus === i
      const key = `${sx},${sy},${op.toFixed(2)},${hi}`
      if (el.dataset.k === key) return
      el.dataset.k = key
      el.style.transform = `translate3d(${sx}px, ${sy}px, 0)`
      el.style.opacity = (op * (hi ? 1 : 0.35)).toFixed(2)
    })
  }

  const draw = (fieldOp: number) => {
    gl.useProgram(prog)
    gl.uniform1f(u('uU'), cur)
    gl.uniform1f(u('uTime'), time)
    const k = bus.reduced ? 0 : bus.k
    gl.uniform1f(u('uK'), k)
    gl.uniform1f(u('uSway'), 0.28 * k)
    gl.uniform1f(u('uFlow'), bus.reduced ? 0 : Math.min(0.55, 0.3 + 0.12 * k))
    gl.uniform1fv(u('uHi'), hiv)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.POINTS, 0, count)
    placeTags(ss(0.82, 1, cur) * fieldOp)
  }

  // adaptive quality: shed points and resolution if frames run long (a prefix of the shuffled buffer stays uniform)
  let samples: number[] = []
  let sheds = 0
  const adapt = (dt: number) => {
    if (sheds >= 3 || dt > 0.1) return
    samples.push(dt)
    if (samples.length < 90) return
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length
    samples = []
    if (mean > 0.0195) {
      sheds++
      count = Math.max(16000, Math.floor(count * 0.6))
      dprCap = Math.max(1, dprCap * 0.8)
      bus.points = count
      resize()
    } else sheds = 3
  }

  const frame = (now: number) => {
    raf = 0
    if (disposed || !ready || document.hidden) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (dt > 0) {
      fpsAcc += dt
      fpsN++
      if (fpsAcc > 0.5) {
        bus.fps = fpsN / fpsAcc
        fpsAcc = 0
        fpsN = 0
      }
    }
    const y = scrollY
    const tgt = ss(zone.a, zone.b, y)
    const fieldOp = 1 - ss(zone.fa, zone.fb, y)
    o.layer.style.opacity = fieldOp.toFixed(3)
    if (fieldOp <= 0.002) {
      o.layer.style.visibility = 'hidden' // offscreen: stop drawing until a scroll brings it back
      return
    }
    o.layer.style.visibility = ''
    intro = Math.min(1, intro + dt / (bus.reduced ? 0.3 : 0.9))
    for (let i = 0; i < 6; i++) {
      const want = bus.focus < 0 ? 1 : i === bus.focus ? 1.9 : i === 5 ? 0.6 : 0.28
      hiv[i] += (want - hiv[i]) * (1 - Math.exp(-10 * dt))
    }
    if (bus.reduced) {
      // Reduced motion: no flight. Two designed stills (the city, the clusters) that crossfade at the midpoint.
      const want = tgt > 0.5 ? 1 : 0
      if (shown < 0) shown = cur = want
      if (want !== shown && !fadeTimer) {
        canvas.style.opacity = '0'
        fadeTimer = window.setTimeout(() => {
          fadeTimer = 0
          cur = shown = want
          canvas.style.opacity = '1'
          wake()
        }, 220)
      }
    } else {
      const lam = bus.level === 'subtle' ? 3 : bus.level === 'expressive' ? 5.5 : 4.2
      cur += (tgt - cur) * (1 - Math.exp(-lam * dt))
      if (Math.abs(tgt - cur) < 0.0005) cur = tgt
      time += dt * (bus.level === 'subtle' ? 0.6 : bus.level === 'expressive' ? 1.3 : 1)
    }
    bus.u = cur
    if (!fadeTimer) canvas.style.opacity = intro.toFixed(3)
    // the photo gives way to its own points: full before the points arrive, dimmed under them, gone once they drift
    o.poster.style.opacity = ((1 - 0.45 * intro) * (1 - ss(0.02, 0.35, cur))).toFixed(3)
    draw(fieldOp)
    adapt(dt)
    const settled = Math.abs(tgt - cur) < 0.001 && intro >= 1 && hiv.every((h, i) => Math.abs(h - (bus.focus < 0 ? 1 : i === bus.focus ? 1.9 : i === 5 ? 0.6 : 0.28)) < 0.01)
    if (!settled || (!bus.reduced && bus.k > 0)) raf = requestAnimationFrame(frame)
  }
  function wake() {
    if (!raf && ready && !disposed && !document.hidden) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }
  bus.wake = wake

  const ro = new ResizeObserver(resize)
  const roRoot = new ResizeObserver(measure)
  const onLost = (e: Event) => {
    e.preventDefault()
    disposed = true
    o.onFail()
  }
  addEventListener('scroll', wake, { passive: true })
  document.addEventListener('visibilitychange', wake)
  canvas.addEventListener('webglcontextlost', onLost)

  const src = o.poster.currentSrc || o.poster.src
  build(src, budget, tall, L)
    .then(({ data, n, iw: w, ih: h }) => {
      if (disposed) return
      iw = w
      ih = h
      const vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      const B = STRIDE * 4
      const attr = (loc: number, size: number, off: number) => {
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, B, off * 4)
      }
      attr(0, 2, 0)
      attr(1, 3, 2)
      attr(2, 3, 5)
      attr(3, 3, 8)
      attr(4, 4, 11)
      gl.disable(gl.DEPTH_TEST)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE)
      count = n
      bus.points = count
      ready = true
      ro.observe(canvas)
      roRoot.observe(o.root)
      resize()
      cur = ss(zone.a, zone.b, scrollY)
      if (bus.reduced) cur = cur > 0.5 ? 1 : 0
      o.onReady()
      wake()
    })
    .catch(() => !disposed && o.onFail())

  return {
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      clearTimeout(fadeTimer)
      ro.disconnect()
      roRoot.disconnect()
      removeEventListener('scroll', wake)
      document.removeEventListener('visibilitychange', wake)
      canvas.removeEventListener('webglcontextlost', onLost)
      bus.wake = () => {}
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
