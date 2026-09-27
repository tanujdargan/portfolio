// The field renderer. Loaded with import() after first paint, so it gets its own small chunk.
// Raw WebGL2 on purpose: the points need no geometry at all (positions are hashed from gl_VertexID in the
// vertex shader), so three.js would add ~150 KB gzip for a renderer we only use to set uniforms.
// WebGPU was considered: WebGPU points are fixed at 1 px, so sprites would need instanced quads and a second
// code path; for a stateless procedural field, the WebGL2 path already keeps the CPU at ~0 per frame.
import { cells, NLIST, pointPos, isDust, type V3 } from './geometry'

export interface PlanLite {
  q: V3
  probes: number[]
  path: V3[]
  side: [V3, V3][]
  hits: V3[]
}
export interface Label {
  el: HTMLElement
  pos: V3
}
export interface Motion {
  k: number
  t: number
  reduced: boolean
}
type Mode = 'hero' | 'search'

// ---------- tiny mat4 (column-major) ----------
type M4 = Float32Array
function persp(fovy: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan(fovy / 2)
  const nf = 1 / (near - far)
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0])
}
function lookAt(e: V3, t: V3): M4 {
  let zx = e[0] - t[0]
  let zy = e[1] - t[1]
  let zz = e[2] - t[2]
  let l = Math.hypot(zx, zy, zz) || 1
  zx /= l
  zy /= l
  zz /= l
  // x = up × z, up = (0,1,0)
  let xx = zz
  let xy = 0
  let xz = -zx
  l = Math.hypot(xx, xy, xz) || 1
  xx /= l
  xz /= l
  const yx = zy * xz - zz * xy
  const yy = zz * xx - zx * xz
  const yz = zx * xy - zy * xx
  return new Float32Array([
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1,
  ])
}
function mul(a: M4, b: M4): M4 {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
  return o
}

const hex = (h: string): V3 => {
  const n = parseInt(h.replace('#', '').slice(0, 6), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

// ---------- shaders ----------
const PTS_VS = `#version 300 es
precision highp float; precision highp int;
uniform mat4 uVP; uniform vec2 uShift, uRes, uMouse;
uniform float uTime, uDrift, uSize, uAlpha, uDim, uHalo;
uniform vec4 uC[64]; uniform vec4 uA[64]; uniform vec4 uProbe[16];
uniform vec3 uInk, uAcc;
out vec4 vCol; out float vSize;
uint pcg(uint v){ uint s = v*747796405u+2891336453u; uint w = ((s >> ((s >> 28u)+4u)) ^ s)*277803737u; return (w>>22u)^w; }
float u01(uint h){ return float(h) * (1.0/4294967296.0); }
void main(){
  uint i = uint(gl_VertexID);
  uint a = pcg(i ^ 0x9E3779B9u); uint b = pcg(a); uint c = pcg(b); uint d = pcg(c);
  int cell = int(i % 64u);
  vec3 p; float dust = 0.0;
  if ((a & 15u) == 0u) { dust = 1.0; p = (vec3(u01(b), u01(c), u01(d)) * 2.0 - 1.0) * vec3(3.6, 1.3, 3.6); }
  else {
    float r1 = sqrt(-2.0*log(max(u01(a), 1e-7))); float t1 = 6.2831853*u01(b);
    float r2 = sqrt(-2.0*log(max(u01(c), 1e-7))); float t2 = 6.2831853*u01(d);
    vec4 C = uC[cell];
    p = C.xyz + vec3(r1*cos(t1), r1*sin(t1), r2*cos(t2)) * C.w * uA[cell].xyz;
  }
  float ph = u01(d ^ 0x68E31DA4u) * 6.2831853;
  p += uDrift * 0.02 * vec3(sin(uTime*0.7 + ph), cos(uTime*0.55 + ph*1.7), sin(uTime*0.45 + ph*2.3));
  vec4 clip = uVP * vec4(p, 1.0);
  clip.xy += uShift * clip.w;
  if (clip.w < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vCol = vec4(0.0); vSize = 0.0; return; }
  gl_Position = clip;
  float pr = uProbe[cell / 4][cell % 4] * (1.0 - dust);
  vec2 sp = (clip.xy / clip.w * 0.5 + 0.5) * uRes;
  float halo = 1.0 - smoothstep(0.0, uHalo, length(sp - uMouse));
  float f = clamp(6.0 / clip.w, 0.7, 40.0);
  float sz = uSize * f * (1.0 + 0.9 * pr + 1.4 * halo);
  gl_PointSize = clamp(sz, 1.0, 56.0);
  float a0 = uAlpha * (dust > 0.5 ? 0.45 : 1.0) * clamp(2.1 / max(sz, 1.0), 0.07, 1.0);
  a0 *= mix(1.0, 0.25 + 2.8 * pr, uDim);
  a0 *= 1.0 + 1.6 * halo;
  vec3 col = mix(uInk, uAcc, clamp(pr + halo * 0.75, 0.0, 1.0));
  vCol = vec4(col, a0); vSize = sz;
}`
const PTS_FS = `#version 300 es
precision mediump float;
in vec4 vCol; in float vSize; out vec4 o;
void main(){
  vec2 q = gl_PointCoord * 2.0 - 1.0; float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  o = vec4(vCol.rgb, vCol.a * (vSize < 2.5 ? 1.0 : 1.0 - r2 * r2));
}`
const LINE_VS = `#version 300 es
precision highp float;
in vec3 aA; in vec3 aB; in float aEnd; in float aOrd; in float aKind;
uniform mat4 uVP; uniform vec2 uShift; uniform float uProg;
out float vA; out float vK;
void main(){
  float t = clamp(uProg - aOrd, 0.0, 1.0);
  vec3 p = aEnd < 0.5 ? aA : mix(aA, aB, t);
  vec4 clip = uVP * vec4(p, 1.0); clip.xy += uShift * clip.w;
  gl_Position = clip; vA = t > 0.0 ? 1.0 : 0.0; vK = aKind;
}`
const LINE_FS = `#version 300 es
precision mediump float;
in float vA; in float vK; uniform vec3 uInk, uAcc; out vec4 o;
void main(){
  if (vA < 0.5) discard;
  o = vK < 0.5 ? vec4(uAcc, 0.95) : vK < 1.5 ? vec4(uInk, 0.22) : vec4(uAcc, 0.55);
}`
const MK_VS = `#version 300 es
precision highp float;
in vec3 aPos; in float aState;
uniform mat4 uVP; uniform vec2 uShift; uniform float uDpr, uReveal, uTime;
out float vS; out float vR;
void main(){
  vec4 clip = uVP * vec4(aPos, 1.0); clip.xy += uShift * clip.w;
  if (clip.w < 0.004) { gl_Position = vec4(2.0); gl_PointSize = 0.0; vS = 0.0; vR = 0.0; return; }
  gl_Position = clip;
  float f = clamp(4.0 / clip.w, 0.8, 5.0);
  float s = aState < 0.5 ? 7.0 : aState < 1.5 ? 12.0 : aState < 2.5 ? 16.0 : aState < 3.5 ? 18.0 : 14.0;
  if (aState > 2.5 && aState < 3.5) s *= 1.0 + 0.08 * sin(uTime * 3.0);
  gl_PointSize = s * f * uDpr; vS = aState; vR = uReveal;
}`
const MK_FS = `#version 300 es
precision mediump float;
in float vS; in float vR; uniform vec3 uInk, uAcc; out vec4 o;
void main(){
  float r = length(gl_PointCoord * 2.0 - 1.0);
  if (r > 1.0) discard;
  float core = 1.0 - smoothstep(0.18, 0.32, r);
  float ring = 1.0 - smoothstep(0.0, 0.12, abs(r - 0.82));
  if (vS < 0.5) { o = vec4(uInk, 0.8 * core + 0.28 * ring); return; }
  if (vS > 2.5 && vS < 3.5) { o = vec4(vec3(1.0), core + ring); return; }
  if (vS > 3.5) { o = vec4(uAcc, core + ring); return; }
  vec3 c = mix(uInk, uAcc, vR);
  o = vec4(c, (0.8 * core + 0.9 * ring) * mix(0.55, 1.0, vR));
}`

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    gl.attachShader(p, s)
  }
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('v8 field: ' + gl.getProgramInfoLog(p))
  const u: Record<string, WebGLUniformLocation | null> = {}
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i)!.name.replace(/\[0\]$/, '')
    u[name] = gl.getUniformLocation(p, name)
  }
  return { p, u }
}

export interface EngineOpts {
  canvas: HTMLCanvasElement
  ring: HTMLElement | null
  mobile: boolean
  colors: { ink: string; accent: string }
  forceFallback?: boolean
  onStats?: (s: { count: number; fps: number; kind: 'webgl2' | '2d' }) => void
  onHover?: (doc: number) => void
  onPhase?: (phase: 'probe' | 'hops' | 'done') => void
}

export type Engine = ReturnType<typeof createEngine>

export function createEngine(o: EngineOpts) {
  const { canvas } = o
  const gl = o.forceFallback ? null : (canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: 'high-performance' }) as WebGL2RenderingContext | null)
  const kind: 'webgl2' | '2d' = gl ? 'webgl2' : '2d'
  const ink = hex(o.colors.ink)
  const acc = hex(o.colors.accent)

  // ---------- scene state ----------
  const lowPower = (navigator.hardwareConcurrency || 8) <= 4
  let count = o.mobile ? (lowPower ? 131072 : 262144) : 1048576
  let dprCap = o.mobile ? 1.5 : 1.5
  let dpr = Math.min(devicePixelRatio || 1, dprCap)
  let W = 1
  let H = 1
  let motion: Motion = { k: 1, t: 1, reduced: false }
  let active = false
  let mode: Mode = 'hero'
  let scroll = 0
  let descentTarget: V3 = [0, 0, 0]
  let descentIdx = -1
  let shift = { hero: [0, 0] as [number, number], search: [0, 0] as [number, number] }
  let docs: V3[] = []
  let docState: number[] = []
  let labels: Label[] = []
  let plan: PlanLite | null = null
  let planT = 0
  let planDone = true
  let fly: { to: V3; t0: number; dur: number; res: () => void } | null = null
  let pointer = { x: -1e4, y: -1e4, on: false }
  let hover = -1
  let time = 0
  const cam = { tx: 0, ty: 0, tz: 0, ld: Math.log(8.5), yaw: 0.6, pitch: 0.34, sx: 0, sy: 0 }
  let yawAuto = 0
  let raf = 0
  let last = 0
  let VP: M4 = new Float32Array(16)
  let lineCount = 0
  const probe = new Float32Array(NLIST)
  let dim = 0
  let reveal = 0
  const ringPos = { x: -100, y: -100, a: 0 }
  // perf
  let frames = 0
  let acc0 = 0
  let adapt = 0
  let statT = 0
  let fpsN = 0
  let fpsT = 0

  const heroDist = () => (o.mobile ? 10.5 : 9.6)

  // ---------- GL setup ----------
  let P: ReturnType<typeof compile> | null = null
  let L: ReturnType<typeof compile> | null = null
  let M: ReturnType<typeof compile> | null = null
  let vaoPts: WebGLVertexArrayObject | null = null
  let vaoLine: WebGLVertexArrayObject | null = null
  let vaoMk: WebGLVertexArrayObject | null = null
  let lineBuf: WebGLBuffer | null = null
  let mkBuf: WebGLBuffer | null = null
  if (gl) {
    P = compile(gl, PTS_VS, PTS_FS)
    L = compile(gl, LINE_VS, LINE_FS)
    M = compile(gl, MK_VS, MK_FS)
    vaoPts = gl.createVertexArray()
    // lines
    vaoLine = gl.createVertexArray()
    gl.bindVertexArray(vaoLine)
    lineBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf)
    const lstride = 9 * 4
    for (const [name, size, off] of [
      ['aA', 3, 0],
      ['aB', 3, 3],
      ['aEnd', 1, 6],
      ['aOrd', 1, 7],
      ['aKind', 1, 8],
    ] as const) {
      const loc = gl.getAttribLocation(L.p, name)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, lstride, off * 4)
    }
    // markers
    vaoMk = gl.createVertexArray()
    gl.bindVertexArray(vaoMk)
    mkBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, mkBuf)
    const pl = gl.getAttribLocation(M.p, 'aPos')
    gl.enableVertexAttribArray(pl)
    gl.vertexAttribPointer(pl, 3, gl.FLOAT, false, 16, 0)
    const sl = gl.getAttribLocation(M.p, 'aState')
    gl.enableVertexAttribArray(sl)
    gl.vertexAttribPointer(sl, 1, gl.FLOAT, false, 16, 12)
    gl.bindVertexArray(null)
    // static per-cell uniforms
    gl.useProgram(P.p)
    const C = new Float32Array(NLIST * 4)
    const A = new Float32Array(NLIST * 4)
    cells.forEach((c, i) => {
      C.set([...c.c, c.s], i * 4)
      A.set([...c.a, 0], i * 4)
    })
    gl.uniform4fv(P.u.uC, C)
    gl.uniform4fv(P.u.uA, A)
    gl.uniform3fv(P.u.uInk, ink)
    gl.uniform3fv(P.u.uAcc, acc)
    gl.useProgram(L.p)
    gl.uniform3fv(L.u.uInk, ink)
    gl.uniform3fv(L.u.uAcc, acc)
    gl.useProgram(M.p)
    gl.uniform3fv(M.u.uInk, ink)
    gl.uniform3fv(M.u.uAcc, acc)
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
  }
  let lost = false
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
    canvas.dataset.lost = '1'
  }
  canvas.addEventListener('webglcontextlost', onLost)

  // ---------- 2-D fallback data ----------
  let pts2: Float32Array | null = null
  let cell2: Uint8Array | null = null
  if (!gl) {
    const N2 = o.mobile ? 24000 : 60000
    pts2 = new Float32Array(N2 * 3)
    cell2 = new Uint8Array(N2)
    for (let i = 0; i < N2; i++) {
      const p = pointPos(i)
      pts2.set(p, i * 3)
      cell2[i] = isDust(i) ? 255 : i % NLIST
    }
    count = N2
  }

  // ---------- sizing ----------
  const resize = () => {
    const r = canvas.getBoundingClientRect()
    W = Math.max(1, r.width)
    H = Math.max(1, r.height)
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    invalidate()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  // ---------- camera ----------
  function desired() {
    let t: V3 = [0, 0, 0]
    let ld = Math.log(heroDist())
    let s = shift.hero
    if (fly) {
      t = fly.to
      ld = Math.log(0.14)
      s = [0, 0]
    } else if (mode === 'search') {
      s = shift.search
      if (plan) {
        t = plan.q
        ld = Math.log(o.mobile ? 3.4 : 2.9)
      } else ld = Math.log(heroDist() * 0.9)
    } else {
      const p = motion.reduced ? Math.round(scroll * 3) / 3 : scroll
      const e = ease(Math.min(1, p * 2.2))
      t = [descentTarget[0] * e, descentTarget[1] * e, descentTarget[2] * e]
      ld = Math.log(heroDist()) + (Math.log(0.075) - Math.log(heroDist())) * Math.pow(p, 1.15)
      s = [shift.hero[0] * (1 - e), shift.hero[1] * (1 - e)]
    }
    return { t, ld, s }
  }
  let settled = false
  function stepCamera(dt: number) {
    const d = desired()
    const cut = motion.reduced
    const rate = fly ? 5.5 / motion.t : mode === 'hero' ? 7 / motion.t : 3.6 / motion.t
    const a = cut ? 1 : 1 - Math.exp(-dt * rate)
    const before = cam.tx + cam.ty + cam.tz + cam.ld + cam.sx + cam.sy
    cam.tx += (d.t[0] - cam.tx) * a
    cam.ty += (d.t[1] - cam.ty) * a
    cam.tz += (d.t[2] - cam.tz) * a
    cam.ld += (d.ld - cam.ld) * a
    cam.sx += (d.s[0] - cam.sx) * a
    cam.sy += (d.s[1] - cam.sy) * a
    settled = Math.abs(cam.tx + cam.ty + cam.tz + cam.ld + cam.sx + cam.sy - before) < 1e-5
    if (!motion.reduced) {
      const spin = mode === 'hero' ? 1 - Math.min(1, scroll * 1.6) : 0.35
      yawAuto += dt * 0.035 * motion.k * spin
    }
    const px = pointer.on && !o.mobile && mode === 'hero' ? (pointer.x / W - 0.5) * 0.12 * motion.k : 0
    const yaw = cam.yaw + yawAuto + px
    const dist = Math.exp(cam.ld)
    const pitch = cam.pitch - (mode === 'hero' ? scroll * 0.12 : 0.08)
    const eye: V3 = [cam.tx + dist * Math.cos(pitch) * Math.sin(yaw), cam.ty + dist * Math.sin(pitch), cam.tz + dist * Math.cos(pitch) * Math.cos(yaw)]
    const proj = persp(o.mobile ? 0.95 : 0.78, W / H, Math.max(0.0008, dist * 0.04), dist + 14)
    VP = mul(proj, lookAt(eye, [cam.tx, cam.ty, cam.tz]))
    if (fly && (performance.now() - fly.t0 > fly.dur || Math.abs(cam.ld - Math.log(0.14)) < 0.05)) {
      const r = fly.res
      fly = null
      r()
    }
  }
  /** Screen position (css px) of a world point, or null when behind the camera. */
  function project(p: V3): [number, number, number] | null {
    const m = VP
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]
    const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]
    const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]
    if (w < 0.01) return null
    const nx = x / w + cam.sx
    const ny = y / w + cam.sy
    return [(nx * 0.5 + 0.5) * W, (1 - (ny * 0.5 + 0.5)) * H, w]
  }

  // ---------- plan timeline ----------
  const PROBE0 = 0.12
  const PROBE_STEP = 0.065
  const HOP = 0.13
  function stepPlan(dt: number) {
    if (!plan) {
      dim = Math.max(0, dim - dt * 3)
      for (let c = 0; c < NLIST; c++) probe[c] = Math.max(0, probe[c] - dt * 3)
      reveal = 0
      return 0
    }
    planT += motion.reduced ? 999 : dt / motion.t
    dim = Math.min(1, planT / 0.3)
    probe.fill(0)
    plan.probes.forEach((c, i) => {
      probe[c] = clamp01((planT - PROBE0 - i * PROBE_STEP) / 0.18)
    })
    const hop0 = PROBE0 + plan.probes.length * PROBE_STEP + 0.08
    const prog = (planT - hop0) / HOP
    const nHop = plan.path.length - 1
    reveal = clamp01((prog - nHop) / 1.5)
    if (!planDone) {
      if (prog > nHop + 1.5) {
        planDone = true
        o.onPhase?.('done')
      }
    }
    return prog
  }
  function uploadLines() {
    if (!gl || !plan) return
    const v: number[] = []
    const seg = (a: V3, b: V3, ord: number, k: number) => {
      v.push(...a, ...b, 0, ord, k, ...a, ...b, 1, ord, k)
    }
    const nHop = plan.path.length - 1
    plan.side.forEach(([a, b], i) => seg(a, b, (i / Math.max(1, plan!.side.length)) * (nHop - 1), 1))
    for (let i = 0; i < nHop; i++) seg(plan.path[i], plan.path[i + 1], i, 0)
    plan.hits.forEach((h) => seg(plan!.q, h, nHop, 2))
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW)
    lineCount = v.length / 9
  }
  function uploadMarkers() {
    if (!gl) return
    const v: number[] = []
    docs.forEach((p, i) => v.push(...p, i === hover ? 4 : !plan && i === descentIdx && scroll > 0.04 ? 4 : docState[i] ?? 0))
    if (plan) v.push(...plan.q, 3)
    gl.bindBuffer(gl.ARRAY_BUFFER, mkBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW)
  }

  // ---------- draw ----------
  function drawGL(prog: number) {
    if (!gl || !P || !L || !M || lost) return
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(P.p)
    gl.uniformMatrix4fv(P.u.uVP, false, VP)
    gl.uniform2f(P.u.uShift, cam.sx, cam.sy)
    gl.uniform2f(P.u.uRes, canvas.width, canvas.height)
    gl.uniform2f(P.u.uMouse, pointer.on ? pointer.x * dpr : -1e5, pointer.on ? (H - pointer.y) * dpr : -1e5)
    gl.uniform1f(P.u.uTime, time)
    gl.uniform1f(P.u.uDrift, motion.reduced ? 0 : motion.k)
    gl.uniform1f(P.u.uSize, (o.mobile ? 1.5 : 1.25) * dpr)
    gl.uniform1f(P.u.uAlpha, Math.min(0.5, Math.max(0.07, (o.mobile ? 0.3 : 0.26) * Math.sqrt(262144 / count))))
    gl.uniform1f(P.u.uDim, dim)
    gl.uniform1f(P.u.uHalo, 70 * dpr)
    gl.uniform4fv(P.u.uProbe, probe)
    gl.bindVertexArray(vaoPts)
    gl.drawArrays(gl.POINTS, 0, count)
    if (plan && lineCount) {
      gl.useProgram(L.p)
      gl.uniformMatrix4fv(L.u.uVP, false, VP)
      gl.uniform2f(L.u.uShift, cam.sx, cam.sy)
      gl.uniform1f(L.u.uProg, prog)
      gl.bindVertexArray(vaoLine)
      gl.drawArrays(gl.LINES, 0, lineCount)
    }
    gl.useProgram(M.p)
    gl.uniformMatrix4fv(M.u.uVP, false, VP)
    gl.uniform2f(M.u.uShift, cam.sx, cam.sy)
    gl.uniform1f(M.u.uDpr, dpr)
    gl.uniform1f(M.u.uReveal, reveal)
    gl.uniform1f(M.u.uTime, time)
    gl.bindVertexArray(vaoMk)
    gl.drawArrays(gl.POINTS, 0, docs.length + (plan ? 1 : 0))
    gl.bindVertexArray(null)
  }

  function draw2D() {
    const ctx = canvas.getContext('2d')
    if (!ctx || !pts2 || !cell2) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    const inkS = `rgb(${ink.map((c) => Math.round(c * 255)).join(' ')})`
    const accS = `rgb(${acc.map((c) => Math.round(c * 255)).join(' ')})`
    const probed = new Set(plan?.probes ?? [])
    ctx.fillStyle = inkS
    for (const pass of [0, 1]) {
      ctx.fillStyle = pass ? accS : inkS
      ctx.globalAlpha = pass ? 0.75 : plan ? 0.22 : 0.42
      for (let i = 0; i < cell2.length; i++) {
        const on = probed.has(cell2[i])
        if ((pass === 1) !== on) continue
        const s = project([pts2[i * 3], pts2[i * 3 + 1], pts2[i * 3 + 2]])
        if (!s) continue
        const r = Math.min(3, Math.max(0.9, 5 / s[2]))
        ctx.fillRect(s[0], s[1], r, r)
      }
    }
    ctx.globalAlpha = 1
    if (plan) {
      ctx.strokeStyle = accS
      ctx.lineWidth = 1.2
      ctx.beginPath()
      plan.path.forEach((p, i) => {
        const s = project(p)
        if (s) i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1])
      })
      ctx.stroke()
      const q = project(plan.q)
      ctx.globalAlpha = 0.6
      for (const h of plan.hits) {
        const s = project(h)
        if (q && s) {
          ctx.beginPath()
          ctx.moveTo(q[0], q[1])
          ctx.lineTo(s[0], s[1])
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    }
    docs.forEach((p, i) => {
      const s = project(p)
      if (!s) return
      ctx.beginPath()
      ctx.arc(s[0], s[1], docState[i] ? 5 : 3, 0, Math.PI * 2)
      ctx.fillStyle = docState[i] ? accS : inkS
      ctx.globalAlpha = docState[i] ? 1 : 0.7
      ctx.fill()
    })
    ctx.globalAlpha = 1
    if (plan) {
      const s = project(plan.q)
      if (s) {
        ctx.beginPath()
        ctx.arc(s[0], s[1], 6, 0, Math.PI * 2)
        ctx.strokeStyle = '#fff'
        ctx.stroke()
      }
    }
  }

  let labelW: number[] = []
  function placeLabels() {
    // Project, then nudge overlapping labels apart vertically (widths are read once per label set).
    const pos = labels.map((l) => project(l.pos))
    const placed: [number, number, number][] = []
    labels.forEach((l, i) => {
      const s = pos[i]
      const vis = !!s && s[0] > -40 && s[0] < W + 40 && s[1] > -20 && s[1] < H + 20
      l.el.style.opacity = vis ? '' : '0'
      if (!s) return
      let y = s[1]
      const w = labelW[i] ?? 120
      for (let pass = 0; pass < 4; pass++) {
        const hit = placed.find(([px, py, pw]) => Math.abs(py - y) < 20 && s[0] < px + pw && px < s[0] + w)
        if (!hit) break
        y = hit[1] + 21
      }
      placed.push([s[0], y, w])
      l.el.style.transform = `translate3d(${s[0].toFixed(1)}px,${y.toFixed(1)}px,0)`
    })
  }

  function hoverPick() {
    if (!pointer.on || o.mobile || mode !== 'hero') return setHover(-1)
    let best = -1
    let bd = 60 * 60
    docs.forEach((p, i) => {
      const s = project(p)
      if (!s) return
      const d = (s[0] - pointer.x) ** 2 + (s[1] - pointer.y) ** 2
      if (d < bd) {
        bd = d
        best = i
      }
    })
    setHover(best)
  }
  function setHover(i: number) {
    if (i === hover) return
    hover = i
    uploadMarkers()
    o.onHover?.(i)
  }
  function placeRing(dt: number) {
    const el = o.ring
    if (!el) return
    const on = pointer.on && !o.mobile && mode === 'hero'
    let tx = pointer.x
    let ty = pointer.y
    if (hover >= 0) {
      const s = project(docs[hover])
      if (s) {
        tx = s[0]
        ty = s[1]
      }
    }
    const a = motion.reduced ? 1 : 1 - Math.exp(-dt * 16)
    ringPos.x += (tx - ringPos.x) * a
    ringPos.y += (ty - ringPos.y) * a
    ringPos.a += ((on ? 1 : 0) - ringPos.a) * (motion.reduced ? 1 : 1 - Math.exp(-dt * 10))
    el.style.transform = `translate3d(${ringPos.x.toFixed(1)}px,${ringPos.y.toFixed(1)}px,0)`
    el.style.opacity = ringPos.a.toFixed(3)
    el.dataset.snap = hover >= 0 ? '1' : ''
  }

  function frame(now: number) {
    raf = 0
    if (!active) return
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
    last = now
    if (!motion.reduced) time += dt
    stepCamera(dt)
    const prog = stepPlan(dt)
    if (gl) drawGL(prog)
    else draw2D()
    placeLabels()
    hoverPick()
    placeRing(dt)
    // perf: measure, adapt (count, then DPR), report
    const continuous = !motion.reduced && motion.k > 0 && gl
    fpsN++
    fpsT += dt
    if (continuous && adapt < 4) {
      frames++
      if (frames > 20) acc0 += dt
      if (frames === 80) {
        const avg = acc0 / 60
        if (avg > 0.0215) {
          if (count > 131072) count = count >> 1
          else if (dpr > 1) {
            dpr = Math.max(1, dpr * 0.75)
            resize()
          } else count = Math.max(65536, count >> 1)
          adapt++
        } else adapt = 4
        frames = 0
        acc0 = 0
      }
    }
    if (now - statT > 600) {
      statT = now
      o.onStats?.({ count, fps: fpsT > 0 ? fpsN / fpsT : 0, kind })
      fpsN = 0
      fpsT = 0
    }
    const animating = !settled || (plan && !planDone) || fly || (pointer.on && Math.abs(ringPos.a - 1) > 0.01)
    if (continuous || animating || (!gl && !settled)) raf = requestAnimationFrame(frame)
  }
  function invalidate() {
    if (!raf && active) {
      last = 0
      raf = requestAnimationFrame(frame)
    }
  }
  const fade = () => {
    if (motion.reduced) canvas.animate?.([{ opacity: 0.15 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' })
  }

  return {
    kind,
    get count() {
      return count
    },
    setActive(on: boolean) {
      if (active === on) return
      active = on
      if (on) {
        frames = 0
        acc0 = 0
        invalidate()
      } else if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    },
    setMotion(m: Motion) {
      motion = m
      invalidate()
    },
    setLayout(s: { hero: [number, number]; search: [number, number] }) {
      shift = s
      invalidate()
    },
    setDocs(pos: V3[]) {
      docs = pos
      docState = pos.map(() => 0)
      hover = -1
      uploadMarkers()
      invalidate()
    },
    setLabels(l: Label[]) {
      labels = l
      labelW = l.map((x) => x.el.offsetWidth)
      invalidate()
    },
    setDescent(target: V3, idx: number) {
      descentTarget = target
      descentIdx = idx
      uploadMarkers()
    },
    setScroll(p: number) {
      if (Math.abs(p - scroll) < 1e-4) return
      const was = motion.reduced ? Math.round(scroll * 3) : 0
      if (p > 0.04 !== scroll > 0.04) {
        scroll = p
        uploadMarkers()
      }
      scroll = p
      if (motion.reduced && Math.round(p * 3) !== was) fade()
      invalidate()
    },
    setMode(m: Mode) {
      if (m === mode) return
      mode = m
      fade()
      invalidate()
    },
    setPlan(p: PlanLite | null, hitIdx: number[]) {
      plan = p
      planT = 0
      planDone = !p
      docState = docs.map((_, i) => (hitIdx[0] === i ? 2 : hitIdx.includes(i) ? 1 : 0))
      uploadLines()
      uploadMarkers()
      if (p) {
        o.onPhase?.('probe')
        fade()
      }
      invalidate()
    },
    setPointer(x: number, y: number, on: boolean) {
      pointer = { x, y, on }
      invalidate()
    },
    fly(to: V3) {
      return new Promise<void>((res) => {
        if (motion.reduced || !active) return res()
        fly = { to, t0: performance.now(), dur: 900 * motion.t, res }
        invalidate()
      })
    },
    project,
    destroy() {
      active = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('webglcontextlost', onLost)
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
