// S2 latent-space scene (adapted from v6/scene.ts). Raw WebGL2, no three.js: one buffer and one draw call. Loaded with a
// dynamic import after first paint, never at SSR.
//
// Every point carries (pos.xyz) + (id, rand, pole, size). ids:
//   0 noise · 1–3 real residual-stream activations for joy / distress / certainty (Qwen2.5-1.5B, steering.json)
//   4 systems (IVF partitions + graph edges + a water column) · 5 experience (180 sites + 4 cohorts)
//   6 hardware (Earth + orbit) · 7 research (45 ES candidates, the 8 kept, the mean's path, a loss-mask token sheet)
//   8 steering trajectory (9 real outputs) · 9 current output marker · 10 satellite
//
// Camera stops (scroll): 0 hero (framing the real activations) · 1 research · 2 systems · 3 hardware · 4 experience ·
// 5 overview. Cluster i (1…5) sits at stop i − 1.
import data from '../../data/steering.json'
import { bus, CONCEPTS } from './bus'

type V3 = [number, number, number]
export interface SceneHandle {
  dispose: () => void
  relayout: () => void
}
export interface SceneOpts {
  canvas: HTMLCanvasElement
  label: HTMLElement | null
  tags: HTMLElement[] // cluster signposts for clusters 2…5
  pins: { pos: HTMLElement | null; neg: HTMLElement | null; marker: HTMLElement | null }
  root: HTMLElement
  mobile: boolean
  low: boolean
  onReady: () => void
  onFail: () => void
}

export const CENTERS: V3[] = [
  [0, 0, 0],
  [6, 0, -70],
  [-7, 2, -150],
  [7, -1, -230],
  [-6, 1, -310],
  [6, 0, -390],
]
export const NAMES = ['', 'Steering', 'Research', 'Systems', 'Hardware', 'Experience']
const S = 0.38 // world units per unit of the real 2-D projection
const ORB_R = 7.2

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const scl = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): V3 => scl(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1))
const mix = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const ss = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

// Concept planes inside cluster 1: layered sheets, each rotated so its v̂ axis points a different way on screen.
function conceptBasis(c: number) {
  const phi = c * ((2 * Math.PI) / 3) + 0.25
  const e1: V3 = [Math.cos(phi), Math.sin(phi) * 0.8, 0.35]
  const e2: V3 = [-Math.sin(phi), Math.cos(phi), 0]
  const o: V3 = add(CENTERS[1], [0, 0, (c - 1) * 5])
  return { e1: norm(e1), e2, o }
}
const toWorld = (c: number, x: number, y: number): V3 => {
  const b = conceptBasis(c)
  return add(b.o, add(scl(b.e1, x * S), scl(b.e2, y * S)))
}

type Concepts = typeof data.concepts
const cdata = (c: number) => (data.concepts as Concepts)[CONCEPTS[c]]
const centroid = (pts: number[][]) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0])

/** Camera for a stop (0 hero … 5 overview). */
function camFor(k: number, mobile: boolean): { eye: V3; at: V3 } {
  if (k <= 0) {
    // hero: the real activations, big, right of the sentence (desktop) or above it (phone)
    return mobile ? { eye: [5.5, -1.6, -36], at: [6, -8.6, -70] } : { eye: [-5.5, 1.8, -39], at: [-2.2, 0, -70] }
  }
  if (k >= 5) return mobile ? { eye: [-4, 90, 90], at: [2, -102, -260] } : { eye: [-20, 60, 40], at: [0, -36, -250] }
  const c = CENTERS[k + 1]
  const d = [1, 1.05, 1.45, 1.1][k - 1] // the orbit ring is the widest cluster: stand further back
  const at: V3 = mobile ? add(c, [0, -6.2 * d, 0]) : add(c, [-8 * d, 0.4, 0])
  return { eye: add(at, mobile ? [-2, 2.4, 30 * d] : [-3.5, 2.4, 21 * d]), at }
}

// ---------- matrices (column-major) ----------
function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2)
  const nf = 1 / (near - far)
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
}
function lookAt(eye: V3, at: V3) {
  const f = norm(sub(at, eye))
  const r = norm(cross(f, [0, 1, 0]))
  const u = cross(r, f)
  const m = new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, eye), -dot(u, eye), dot(f, eye), 1])
  return { m, f, r, u }
}
function mul(a: Float32Array, b: Float32Array) {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
  return o
}

// ---------- shaders ----------
const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aMeta;
uniform mat4 uPV;
uniform vec3 uEye, uFwd;
uniform float uTime, uDrift, uPx, uDpr, uFar;
uniform float uRes[6];
uniform vec3 uC[6];
uniform vec3 uCol[11];
uniform vec3 uPos, uNeg;
uniform int uConcept;
uniform vec3 uSteer, uBend;
uniform float uAlpha, uCollapse, uSplit;
uniform vec3 uTraj[9];
uniform vec3 uMarker;
uniform vec3 uOrbU, uOrbV;
uniform float uOrbR;
uniform vec3 uQ, uQCol, uTint;
uniform float uQOn, uQW, uWarp, uSpeed, uIntro, uDim, uGain;
out vec3 vCol;
out float vA;
vec3 h3(float r){ return fract(sin(vec3(r*127.1, r*311.7, r*74.7))*43758.5453)-0.5; }
void main(){
  int id = int(aMeta.x + 0.5);
  float r = aMeta.y, pole = aMeta.z, sz = aMeta.w;
  int home = id==0 ? 0 : id<=3 ? 1 : id==7 ? 2 : id==4 ? 3 : (id==6 || id==10) ? 4 : id==5 ? 5 : 1;
  vec3 p = aPos;
  if (id==8) { float t = clamp(aPos.x, 0., 7.999); int i = int(t); p = mix(uTraj[i], uTraj[i+1], fract(t)) + vec3(0., aPos.y, aPos.z); }
  else if (id==9) p = uMarker + aPos;
  else if (id==10) { float th = uTime*0.3 + r*0.2; p = uC[4] + uOrbR*(cos(th)*uOrbU + sin(th)*uOrbV) + aPos; }
  vec3 rnd = h3(r);
  float res = home==0 ? 1. : uRes[home];
  if (home>0) {
    float e = res*res*(3.-2.*res);
    vec3 scat = uC[home] + normalize(rnd + 1e-4)*(9. + 24.*fract(r*13.7));
    p = mix(scat, p, e);
  }
  bool concept = id>=1 && id<=3;
  bool act = id==uConcept;
  // steering: split the space along v̂ by pole, then bend it with depth
  float sp = id>=8 ? 0. : concept ? (act ? 1.1 : 0.3) : (id==0 ? 0.8 : 0.45);
  p += uSteer * uSplit * pole * sp;
  float dz = clamp(dot(p - uEye, uFwd), 0., 170.);
  p += uBend * uAlpha * dz*dz * 0.0021;
  p += rnd * uCollapse * (home==1 ? 1.1 : 0.3) * sin(uTime*21. + r*300.);
  p += uDrift * 0.2 * sin(uTime*vec3(0.31,0.27,0.23) + r*vec3(40.,31.,17.));
  // warp: > 0 rushes points past the camera (leaving); < 0 holds them far ahead and lets them fall back in (arriving)
  p -= uFwd * uWarp*abs(uWarp) * (30. + 140.*fract(r*7.3));
  vec4 clip = uPV * vec4(p, 1.);
  gl_Position = clip;
  float w = max(clip.w, 0.001);
  vec3 col = uCol[id];
  float a = id==0 ? 0.3 : 0.5;
  if (concept) { col = pole > 0. ? uPos : uNeg; a = act ? 0.85 : 0.18; }
  if (id==7 || id==4) a *= pole > 0.99 ? 2.2 : 0.8;
  if (id>=8) a = 1.;
  if (id!=0) a *= uGain;
  a *= mix(0.35, 1., res);
  col = mix(uCol[0], col, 0.15 + 0.85*res);
  // cursor as query: cosine similarity between the cursor ray and the direction to this point
  float cs = dot(normalize(p - uEye), uQ);
  float q = smoothstep(uQW, 1., cs) * uQOn;
  col = mix(col, uQCol, q);
  a = mix(a, 0.8, q);
  float aw = abs(uWarp);
  col = mix(col, uTint, aw*0.55);
  float px = sz * uPx / w * (1. + q*0.8) * (1. + aw*0.5);
  a *= smoothstep(uFar, uFar*0.3, w) * smoothstep(0.5, 3., w);
  if (id==0) a *= (1. + uSpeed*1.4) * uIntro;
  a *= 1. + aw;
  a *= uDim;
  if (px < 1.5) { a *= px/1.5; px = 1.5; }
  gl_PointSize = min(px, 16.*uDpr);
  vCol = col;
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
  o = vec4(vCol * vA * f*f, 1.);
}`

// ---------- geometry ----------
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Builds points in slices (yielding between them) so no task blocks the main thread for long. Any prefix is a uniform sample. */
async function build(n: number, yieldFn: () => Promise<void>) {
  const pos = new Float32Array(n * 3)
  const meta = new Float32Array(n * 4)
  const R = rng(1337)
  const g = () => (R() + R() + R() + R() - 2) * 1.2247 // ≈ N(0,1)
  // systems: 48 IVF partitions on a Fibonacci sphere
  const parts: V3[] = []
  for (let i = 0; i < 48; i++) {
    const y = 1 - (2 * (i + 0.5)) / 48
    const rr = Math.sqrt(1 - y * y)
    const th = i * 2.39996
    parts.push(add(CENTERS[3], [Math.cos(th) * rr * 6.5, y * 6.5, Math.sin(th) * rr * 6.5]))
  }
  // research: one ES generation (45 candidates around the mean, the best 8 kept) and the mean's path over 15 steps
  const RC = CENTERS[2]
  const cands: V3[] = []
  for (let i = 0; i < 45; i++) cands.push(add(RC, [g() * 3.2, g() * 2.4, g() * 2.2]))
  const kept = new Set([...cands.keys()].sort((a, b) => cands[a][0] + cands[a][1] - (cands[b][0] + cands[b][1])).slice(-8))
  const path: V3[] = Array.from({ length: 16 }, (_, i) => add(RC, [-9 + i * 0.62 + Math.sin(i * 0.7) * 0.8, -4.5 + i * 0.32 + Math.cos(i * 0.9) * 0.6, 2 - i * 0.1]))
  // orbit basis (inclined ring)
  const inc = 0.9
  const U: V3 = [1, 0, 0]
  const V: V3 = [0, Math.sin(inc), Math.cos(inc)]
  const weights: [number, number][] = [
    [0, 0.42],
    [1, 0.2],
    [4, 0.1],
    [5, 0.1],
    [6, 0.08],
    [7, 0.08],
    [8, 0.012],
    [9, 0.005],
    [10, 0.003],
  ]
  const cum: number[] = []
  weights.reduce((s, [, w], i) => ((cum[i] = s + w), s + w), 0)
  const total = cum[cum.length - 1]
  const SLICE = 12000
  for (let i = 0; i < n; i++) {
    if (i && i % SLICE === 0) await yieldFn()
    const u = R() * total
    let k = 0
    while (cum[k] < u) k++
    let id = weights[k][0]
    const r = R()
    let pole = R() * 1.8 - 0.9
    let size = 0.07 + R() * 0.05
    let p: V3
    if (id === 0) {
      const z = 70 - R() * 520
      const rad = 3 + 40 * Math.sqrt(R())
      const th = R() * Math.PI * 2
      p = [Math.cos(th) * rad, Math.sin(th) * rad * 0.8, z]
      size = 0.05 + R() * 0.07
    } else if (id === 1) {
      const c = Math.floor(R() * 3)
      id = 1 + c
      const cl = cdata(c).cloud
      const j = Math.floor(R() * 40)
      const xy = j < 20 ? cl.pos[j] : cl.neg[j - 20]
      pole = j < 20 ? 1 : -1
      p = add(toWorld(c, xy[0], xy[1]), [g() * 0.32, g() * 0.32, g() * 0.32])
      size = 0.06 + R() * 0.05
    } else if (id === 4) {
      const t = R()
      if (t < 0.7) {
        const a = Math.floor(R() * 48)
        p = add(parts[a], [g() * 0.4, g() * 0.4, g() * 0.4])
        if (a % 16 === 3) pole = 1 // three probed lists
      } else if (t < 0.85) {
        const a = Math.floor(R() * 48)
        const b = parts[(a + (R() < 0.5 ? 1 : 13)) % 48]
        p = add(mix(parts[a], b, R()), [g() * 0.05, g() * 0.05, g() * 0.05])
        size = 0.05
      } else {
        // ocean: a water column under the index, rings narrowing with depth
        const d = R()
        const th = R() * Math.PI * 2
        const rad = 3.2 * (1 - d * 0.55) + g() * 0.08
        p = add(CENTERS[3], [Math.cos(th) * rad + 9, -3 - d * 9, Math.sin(th) * rad * 0.5 - 3])
        size = 0.05
      }
    } else if (id === 5) {
      if (R() < 0.7) {
        const cx = Math.floor(R() * 15) - 7
        const cz = Math.floor(R() * 12) - 5.5
        p = add(CENTERS[5], [cx * 0.95 + g() * 0.05, -2.8 + cz * 0.45 + g() * 0.04, cz * 0.8 + g() * 0.05])
        size = 0.06
      } else {
        const co = Math.floor(R() * 4)
        const off: V3 = [co % 2 ? 3.4 : -3.4, 2.4 + (co > 1 ? 1.4 : 0), co > 1 ? -1.8 : 1.8]
        p = add(add(CENTERS[5], off), [g() * 1.1, g() * 0.6, g() * 0.8])
      }
    } else if (id === 6) {
      if (R() < 0.42) {
        const y = R() * 2 - 1
        const th = R() * Math.PI * 2
        const rr = Math.sqrt(1 - y * y)
        p = add(CENTERS[4], [Math.cos(th) * rr * 3, y * 3, Math.sin(th) * rr * 3])
        pole = -1
        size = 0.055
      } else {
        const th = R() * Math.PI * 2
        p = add(add(CENTERS[4], add(scl(U, Math.cos(th) * ORB_R), scl(V, Math.sin(th) * ORB_R))), [g() * 0.07, g() * 0.07, g() * 0.07])
        size = 0.05
      }
    } else if (id === 7) {
      const t = R()
      if (t < 0.55) {
        const j = Math.floor(R() * 45)
        p = add(cands[j], [g() * 0.26, g() * 0.26, g() * 0.26])
        if (kept.has(j)) pole = 1
      } else if (t < 0.72) {
        const s = R() * 15
        const j = Math.floor(s)
        p = add(mix(path[j], path[j + 1], s - j), [g() * 0.06, g() * 0.06, g() * 0.06])
        size = 0.055
        pole = 1
      } else {
        // loss-mask sheet: 24 × 4 token cells; assistant tokens (right half of each row) carry the loss
        const cx = Math.floor(R() * 24)
        const cy = Math.floor(R() * 4)
        p = add(RC, [-8 + cx * 0.7 + (R() - 0.5) * 0.5, 5.2 + cy * 0.75 + (R() - 0.5) * 0.4, -3.5 + g() * 0.04])
        size = 0.05
        pole = cx >= 11 + (cy % 2) * 3 ? 1 : -0.9
      }
    } else if (id === 8) {
      p = [R() * 8, g() * 0.05, g() * 0.05]
      size = 0.05
      pole = 0
    } else if (id === 9) {
      p = [g() * 0.28, g() * 0.28, g() * 0.28]
      size = 0.085
      pole = 0
    } else {
      p = [g() * 0.14, g() * 0.14, g() * 0.14]
      size = 0.07
    }
    pos.set(p, i * 3)
    meta.set([id, r, pole, size], i * 4)
  }
  return { pos, meta }
}

const hex = (h: string): V3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]
const POS = hex('#ff8a4c')
const NEG = hex('#5cc8e6')

// ---------- scene ----------
export function createScene(o: SceneOpts): SceneHandle | null {
  const { canvas, mobile } = o
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' })
  if (!gl) return null

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('[s2] shader', gl.getShaderInfoLog(s))
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[s2] shader link failed', gl.getProgramInfoLog(prog))
    return null
  }
  const U: Record<string, WebGLUniformLocation | null> = {}
  const u = (name: string) => (U[name] ??= gl.getUniformLocation(prog, name))

  let disposed = false
  let raf = 0
  let count = 0
  const maxCount = o.low ? 24000 : mobile ? 40000 : 120000
  let dprCap = mobile ? 1.25 : 1.5
  let W = 0
  let H = 0
  let dpr = 1
  let ready = false

  // camera + animated state
  let cur = bus.home ? 0 : bus.park
  let shownStop = -1
  let last = performance.now()
  let time = 0
  let lastInput = last
  const st = { alpha: 0, split: 0, collapse: 0, warp: 0, speed: 0, intro: bus.reduced ? 1 : 0, drift: 1, dim: 1, marker: [0, 0] as [number, number], traj: [] as V3[] }
  let stops: number[] = []
  let L = 600
  const pointer = { x: 0, y: 0, on: false, moving: false }
  let camInfo = lookAt([0, 0, 30], [0, 0, 0])
  const fovy = mobile ? 0.95 : 0.85
  let labelText = ''

  const resize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    dpr = Math.min(devicePixelRatio || 1, dprCap)
    W = Math.max(1, Math.round(w * dpr))
    H = Math.max(1, Math.round(h * dpr))
    canvas.width = W
    canvas.height = H
    gl.viewport(0, 0, W, H)
    wake()
  }
  const relayout = () => {
    const els = Array.from(o.root.querySelectorAll<HTMLElement>('[data-stop]'))
    const vh = innerHeight
    L = vh * 0.62
    stops = []
    for (const el of els) stops[Number(el.dataset.stop)] = el.getBoundingClientRect().top + scrollY - vh * 0.34
    wake()
  }
  const targetParam = () => {
    if (!bus.home) return bus.park
    const y = scrollY
    let p = 0
    for (let i = 1; i < stops.length; i++) {
      if (stops[i] === undefined) continue
      // each flight window ends at its stop and never starts before the previous stop (so the page top is the hero)
      // the camera holds at a stop for the first part of the way to the next, then flies
      const Li = Math.min(L, Math.max(120, 0.45 * (stops[i] - (stops[i - 1] ?? 0))))
      p += ss(0, 1, (y - (stops[i] - Li)) / Li)
    }
    return p
  }

  const camAt = (p: number) => {
    const i = Math.max(0, Math.min(4, Math.floor(p)))
    const f = Math.min(1, Math.max(0, p - i))
    const a = camFor(i, mobile)
    const b = camFor(i + 1, mobile)
    const arc = Math.sin(Math.PI * f) * (bus.reduced ? 0 : bus.k)
    const eye = add(mix(a.eye, b.eye, f), [arc * (i % 2 ? -7 : 7), arc * 2.5, 0])
    return { eye, at: mix(a.at, b.at, f) }
  }

  // CPU mirror of the vertex shader's steering displacement, so DOM pins ride the same bend as the points.
  const bent = (p: V3, pole: number, sp: number, steer: V3, split: number, bend: V3, eye: V3): V3 => {
    let q = add(p, scl(steer, split * pole * sp))
    const dz = Math.min(170, Math.max(0, dot(sub(q, eye), camInfo.f)))
    q = add(q, scl(bend, st.alpha * dz * dz * 0.0021))
    return q
  }
  const place = (el: HTMLElement | null | undefined, pv: Float32Array, w: V3, op: number, cw: number, ch: number) => {
    if (!el) return
    const [x, y, z] = w
    const cx = pv[0] * x + pv[4] * y + pv[8] * z + pv[12]
    const cy = pv[1] * x + pv[5] * y + pv[9] * z + pv[13]
    const cwv = pv[3] * x + pv[7] * y + pv[11] * z + pv[15]
    let sx = 0
    let sy = 0
    if (cwv > 1) {
      sx = (cx / cwv * 0.5 + 0.5) * cw
      sy = (0.5 - (cy / cwv) * 0.5) * ch
      if (sx < 8 || sx > cw - 8 || sy < 60 || sy > ch - 8) op = 0
    } else op = 0
    const key = `${Math.round(sx)},${Math.round(sy)},${op.toFixed(2)}`
    if (el.dataset.k !== key) {
      el.dataset.k = key
      const flip = el === o.pins.neg ? sx < 220 : el === o.pins.marker ? sx > cw * 0.62 : el === o.pins.pos ? sx > cw - 230 : false
      if (flip) el.dataset.flip = ''
      else delete el.dataset.flip
      el.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0)`
      el.style.opacity = op.toFixed(2)
    }
  }

  const draw = () => {
    const aspect = W / H
    const { eye, at } = camAt(cur)
    camInfo = lookAt(eye, at)
    const pv = mul(perspective(fovy, aspect, 0.3, 700), camInfo.m)
    const ov = ss(4.2, 4.9, cur)
    const far = cur > 4.2 ? 520 : 300
    const k = bus.reduced ? 0.6 : bus.k
    gl.useProgram(prog)
    gl.uniformMatrix4fv(u('uPV'), false, pv)
    gl.uniform3fv(u('uEye'), eye)
    gl.uniform3fv(u('uFwd'), camInfo.f)
    gl.uniform1f(u('uTime'), time)
    gl.uniform1f(u('uDrift'), bus.reduced || !bus.home ? 0 : bus.k * st.drift)
    gl.uniform1f(u('uPx'), (H / (2 * Math.tan(fovy / 2))) * (1 + 1.4 * ov))
    gl.uniform1f(u('uDpr'), dpr)
    gl.uniform1f(u('uFar'), far)
    const res = new Float32Array(6)
    for (let i = 1; i <= 5; i++) res[i] = cur > 4.2 ? ov : 1 - ss(0.3, 1.05, Math.abs(cur - (i - 1)))
    const intro = st.intro * st.intro * (3 - 2 * st.intro)
    res[1] = Math.max(res[1], ov) * intro
    gl.uniform1fv(u('uRes'), res)
    gl.uniform3fv(u('uC'), new Float32Array(CENTERS.flat()))
    gl.uniform1f(u('uIntro'), 0.25 + 0.75 * intro)
    gl.uniform1f(u('uDim'), st.dim)
    gl.uniform1f(u('uGain'), mobile ? 1.7 : 1)
    // concept + steering vector (the active concept's v̂ axis in world space)
    const c = bus.concept
    const b = conceptBasis(c)
    const perp = norm(sub(b.e1, scl(camInfo.f, dot(b.e1, camInfo.f))))
    const bend = scl(perp, k * (1 - 0.8 * ov))
    const split = st.alpha * 2.4 * k
    gl.uniform1i(u('uConcept'), c + 1)
    gl.uniform3fv(u('uSteer'), b.e1)
    gl.uniform3fv(u('uBend'), bend)
    gl.uniform1f(u('uAlpha'), st.alpha)
    gl.uniform1f(u('uSplit'), split)
    gl.uniform1f(u('uCollapse'), st.collapse * (bus.reduced ? 0 : 1))
    const tr = st.traj.length === 9 ? st.traj : Array.from({ length: 9 }, () => CENTERS[1])
    gl.uniform3fv(u('uTraj'), new Float32Array(tr.flat()))
    const mk = toWorld(c, st.marker[0], st.marker[1])
    gl.uniform3fv(u('uMarker'), mk)
    gl.uniform3fv(u('uOrbU'), [1, 0, 0])
    gl.uniform3fv(u('uOrbV'), [0, Math.sin(0.9), Math.cos(0.9)])
    gl.uniform1f(u('uOrbR'), ORB_R)
    // the query glows cyan when α is negative and orange when positive
    const qa = Math.max(-1, Math.min(1, st.alpha / 0.9)) * 0.5 + 0.5
    gl.uniform3fv(u('uQCol'), mix(mix(NEG, [0.92, 0.92, 0.9], 0.35), mix(POS, [1, 0.9, 0.8], 0.25), qa))
    gl.uniform3fv(u('uTint'), bus.tint)
    // query ray
    let qOn = 0
    if (pointer.on) {
      const th = Math.tan(fovy / 2)
      const nx = (pointer.x / canvas.clientWidth) * 2 - 1
      const ny = 1 - (pointer.y / canvas.clientHeight) * 2
      const q = norm(add(camInfo.f, add(scl(camInfo.r, nx * th * aspect), scl(camInfo.u, ny * th))))
      gl.uniform3fv(u('uQ'), q)
      qOn = 1
      // nearest cluster by cosine similarity, for the DOM label
      let best = 0
      let bc = -1
      for (let i = 1; i <= 5; i++) {
        const cs = dot(q, norm(sub(CENTERS[i], eye)))
        if (cs > bc) ((bc = cs), (best = i))
      }
      const txt = bc > 0.975 ? `q·c ${bc.toFixed(3)} → ${NAMES[best]}` : `q = ray(${nx >= 0 ? '+' : '−'}${Math.abs(nx).toFixed(2)}, ${ny >= 0 ? '+' : '−'}${Math.abs(ny).toFixed(2)})`
      if (o.label && txt !== labelText) {
        labelText = txt
        o.label.textContent = txt
      }
    }
    gl.uniform1f(u('uQOn'), qOn)
    gl.uniform1f(u('uQW'), Math.cos(0.075 * Math.sqrt(bus.reduced ? 1 : bus.k)))
    gl.uniform1f(u('uWarp'), st.warp)
    gl.uniform1f(u('uSpeed'), st.speed)
    gl.clearColor(0.031, 0.031, 0.035, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.POINTS, 0, count)

    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    const quiet = 1 - Math.min(1, Math.abs(st.warp) * 3)
    // Hero pins: the two poles of the active concept and the current output, riding the same bend as the points.
    const heroOp = (1 - ss(0.12, 0.5, cur)) * intro * quiet * (bus.home ? 1 : 0)
    const cl = cdata(c).cloud
    const [px_, py_] = centroid(cl.pos)
    const [nx_, ny_] = centroid(cl.neg)
    place(o.pins.pos, pv, bent(toWorld(c, px_, py_), 1, 1.1, b.e1, split, bend, eye), heroOp, cw, ch)
    place(o.pins.neg, pv, bent(toWorld(c, nx_, ny_), -1, 1.1, b.e1, split, bend, eye), heroOp, cw, ch)
    place(o.pins.marker, pv, bent(mk, 0, 0, b.e1, split, bend, eye), heroOp, cw, ch)
    // Signposts for the clusters ahead (and all of them in the overview).
    for (let i = 2; i <= 5; i++) {
      const el = o.tags[i - 2]
      if (!el) continue
      const w = CENTERS[i]
      const cwv = pv[3] * w[0] + pv[7] * w[1] + pv[11] * w[2] + pv[15]
      const sxp = cwv > 1 ? ((pv[0] * w[0] + pv[4] * w[1] + pv[8] * w[2] + pv[12]) / cwv) * 0.5 + 0.5 : 0
      const clear = ov > 0.5 || (cw < 760 ? cur > 0.5 : sxp > 0.55)
      const op = bus.home ? Math.max(ov, (1 - res[i]) * ss(far, far * 0.55, cwv) * (cur > 0.35 ? 1 : 0)) * (clear ? 1 : 0) * quiet : 0
      place(el, pv, w, op, cw, ch)
    }
  }

  // adaptive quality: sample frame times, shed points and resolution if we miss the budget
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
      count = Math.max(12000, Math.floor(count * 0.55))
      dprCap = Math.max(1, dprCap * 0.75)
      resize()
      bus.points = count
      bus.emit()
    } else sheds = 3
  }

  const frame = (now: number) => {
    raf = 0
    if (disposed || !ready || document.hidden) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const reduced = bus.reduced
    if (bus.arrive) {
      bus.arrive = 0
      if (!reduced) st.warp = -1
    }
    const tgt = targetParam()
    const prev = cur
    const lam = bus.level === 'subtle' ? 2.3 : bus.level === 'expressive' ? 4.6 : 3.4
    const e = 1 - Math.exp(-lam * dt)
    const eF = 1 - Math.exp(-9 * dt)
    st.dim += ((bus.focus ? 0.35 : 1) - st.dim) * (1 - Math.exp(-6 * dt))
    if (reduced) {
      // Reduced motion: no flight, no intro, no warp. Cut to the nearest stop behind a short crossfade.
      const want = bus.home ? Math.round(tgt) : bus.park
      st.intro = 1
      st.warp = 0
      if (want !== Math.round(cur) || shownStop < 0) {
        if (shownStop >= 0) {
          canvas.style.opacity = '0'
          setTimeout(() => {
            cur = want
            draw()
            canvas.style.opacity = ''
          }, 200)
          shownStop = want
          reportStop(want)
          return
        }
        cur = want
      }
      shownStop = Math.round(cur)
      st.alpha = bus.alpha
      st.marker = [...bus.xy]
      st.traj = bus.traj.map(([x, y]) => toWorld(bus.concept, x, y))
      st.collapse = 0
      st.drift = 0
      draw()
      reportStop(Math.round(cur))
      return
    }
    cur += (tgt - cur) * e
    if (Math.abs(tgt - cur) < 0.0005) cur = tgt
    const v = Math.abs(cur - prev) / Math.max(dt, 1e-3)
    st.speed += (Math.min(1, v * 0.7) * bus.k - st.speed) * eF
    st.alpha += (bus.alpha - st.alpha) * (1 - Math.exp(-14 * dt))
    st.collapse += (bus.collapsed - st.collapse) * eF
    const wt = bus.warp
    st.warp += (wt - st.warp) * (1 - Math.exp(-(st.warp < 0 ? 3.2 : 8) * dt))
    if (Math.abs(st.warp - wt) < 0.002) st.warp = wt
    st.intro = Math.min(1, st.intro + dt / (1.5 * (bus.level === 'subtle' ? 0.8 : bus.level === 'expressive' ? 1.25 : 1)))
    st.marker[0] += (bus.xy[0] - st.marker[0]) * eF
    st.marker[1] += (bus.xy[1] - st.marker[1]) * eF
    const trW = bus.traj.map(([x, y]) => toWorld(bus.concept, x, y))
    st.traj = st.traj.length === 9 ? st.traj.map((p, i) => mix(p, trW[i], eF)) : trW
    // Drift only while someone is here: it eases out 6 s after the last input, and the loop then sleeps.
    const want = bus.home && now - lastInput < 6000 ? 1 : 0
    st.drift += (want - st.drift) * (1 - Math.exp(-(want ? 3 : 0.9) * dt))
    time += dt * st.drift * (bus.level === 'subtle' ? 0.6 : bus.level === 'expressive' ? 1.4 : 1)
    draw()
    adapt(dt)
    reportStop(Math.round(cur))
    const settled =
      Math.abs(tgt - cur) < 0.001 &&
      Math.abs(bus.alpha - st.alpha) < 0.002 &&
      st.warp === bus.warp &&
      Math.abs(bus.xy[0] - st.marker[0]) < 0.01 &&
      Math.abs(bus.xy[1] - st.marker[1]) < 0.01 &&
      Math.abs(st.dim - (bus.focus ? 0.35 : 1)) < 0.005 &&
      st.intro >= 1 &&
      st.collapse < 0.01 &&
      st.speed < 0.01 &&
      st.drift < 0.004 &&
      !pointer.moving
    pointer.moving = false
    if (!settled || bus.collapsed) raf = requestAnimationFrame(frame)
  }
  const reportStop = (s: number) => {
    if (s !== bus.stop) {
      bus.stop = s
      bus.emit()
    }
  }
  function wake() {
    lastInput = performance.now()
    if (!raf && ready && !disposed && !document.hidden) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }
  bus.wake = wake

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    pointer.x = e.clientX
    pointer.y = e.clientY
    pointer.on = true
    pointer.moving = true
    // the readout only speaks over open field, never over text or controls
    const overUi = (e.target as Element | null)?.closest?.('a, button, input, dialog, .s2-steer, .s2-work, .s2-roles, .s2-top, .s2-contact__b, .s2-doc')
    if (o.label) o.label.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 18}px)`
    if (overUi) o.label?.removeAttribute('data-on')
    else o.label?.setAttribute('data-on', '')
    wake()
  }
  const onLeave = () => {
    pointer.on = false
    o.label?.removeAttribute('data-on')
    wake()
  }
  const onVis = () => wake()
  const onLost = (e: Event) => {
    e.preventDefault()
    disposed = true
    o.onFail()
  }
  const ro = new ResizeObserver(() => {
    resize()
    relayout()
  })
  const roRoot = new ResizeObserver(() => relayout())
  addEventListener('scroll', wake, { passive: true })
  addEventListener('pointermove', onMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  document.addEventListener('visibilitychange', onVis)
  canvas.addEventListener('webglcontextlost', onLost)

  // Build geometry in slices after first paint, then upload once.
  const idle = () =>
    new Promise<void>((r) => ('requestIdleCallback' in window ? requestIdleCallback(() => r(), { timeout: 120 }) : setTimeout(r, 0)))
  build(maxCount, idle).then(({ pos, meta }) => {
    if (disposed) return
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const b0 = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, b0)
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
    const b1 = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, b1)
    gl.bufferData(gl.ARRAY_BUFFER, meta, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0)
    gl.useProgram(prog)
    // per-id colours: grey noise, the concept poles, then each cluster in its work's accent (seen as it resolves)
    gl.uniform3fv(
      u('uCol'),
      new Float32Array(
        [
          [0.5, 0.5, 0.52],
          POS,
          POS,
          POS,
          hex('#6fe0a4'), // systems: retrieval
          [0.86, 0.84, 0.8], // experience
          hex('#5cc8ff'), // hardware: orbit
          hex('#b69cff'), // research: loss masking / ES
          [1, 0.9, 0.78],
          [1, 0.95, 0.88],
          [1, 1, 1],
        ].flat(),
      ),
    )
    gl.uniform3fv(u('uPos'), POS)
    gl.uniform3fv(u('uNeg'), NEG)
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
    count = maxCount
    bus.points = count
    ready = true
    ro.observe(canvas)
    roRoot.observe(o.root)
    resize()
    relayout()
    cur = bus.home ? targetParam() : bus.park
    st.alpha = bus.alpha
    st.marker = [...bus.xy]
    draw()
    o.onReady()
    bus.emit()
    wake()
  })

  return {
    relayout,
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      roRoot.disconnect()
      removeEventListener('scroll', wake)
      removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('webglcontextlost', onLost)
      bus.wake = () => {}
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
