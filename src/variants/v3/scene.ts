// The WebGL half of v3. Only ever loaded from a useEffect after first paint.
// three is imported dynamically *inside* createScene: vite.config pins src/variants/v3/** into the variant chunk,
// so a static `import 'three'` here would make the variant chunk depend on the three chunk up front.
import type * as T from 'three'
import { clusters, type SpaceNode, type Vec3 } from './nodes'

export interface MotionState {
  reduced: boolean
  /** distance multiplier from useMotionPrefs (0 when reduced) */
  k: number
  /** duration multiplier */
  t: number
  /** spring bounce 0..0.3 */
  bounce: number
}

export interface SceneOpts {
  canvas: HTMLCanvasElement
  /** the flag-filtered node list; labels[i] belongs to nodes[i] */
  nodes: SpaceNode[]
  labels: (HTMLElement | null)[]
  clusterLabels: (HTMLElement | null)[]
  arrowLabel: HTMLElement | null
  tip: HTMLElement | null
  readout: HTMLElement | null
  accent: string
  ink: string
  onPick: (i: number) => void
  onReady: () => void
  motion: MotionState
}

export interface SceneApi {
  focusCluster: (ci: number) => void
  focusNode: (i: number) => void
  overview: () => void
  setSelected: (i: number | null) => void
  setMotion: (m: MotionState) => void
  setAutorotate: (on: boolean) => void
  setExplore: (on: boolean) => void
  setCenter: (cx: number, cy: number) => void
  /** canvas-space rects covered by HUD panels: labels inside them are hidden, nodes there can't be picked */
  setAvoid: (rects: { l: number; t: number; r: number; b: number }[]) => void
  nudge: (dyaw: number, dpitch: number) => void
  dispose: () => void
}

const OVERVIEW_DIST = 21

// critically-damped (or slightly under-damped) spring, integrated per frame
class Spring {
  x: number
  v = 0
  goal: number
  constructor(x: number) {
    this.x = x
    this.goal = x
  }
  step(dt: number, w: number, z: number) {
    const a = w * w * (this.goal - this.x) - 2 * z * w * this.v
    this.v += a * dt
    this.x += this.v * dt
  }
  settled() {
    return Math.abs(this.goal - this.x) < 1e-4 && Math.abs(this.v) < 1e-4
  }
  snap(x = this.goal) {
    this.x = this.goal = x
    this.v = 0
  }
}

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const gauss = (r: () => number) => {
  const u = 1 - r()
  const v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const FIELD_VS = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
uniform float uTime;
uniform float uDrift;
varying float vA;
varying vec3 vC;
void main() {
  vec3 p = position + sin(uTime * 0.21 + position.yzx * 1.7) * 0.07 * uDrift;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float d = -mv.z;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aSize * uScale / d, 1.0, 9.0);
  vA = aAlpha * smoothstep(52.0, 14.0, d) * smoothstep(0.6, 2.4, d);
  vC = aColor;
}`
const FIELD_FS = /* glsl */ `
varying float vA;
varying vec3 vC;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.15, r) * vA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vC * a, a);
}`

const NODE_VS = /* glsl */ `
attribute vec3 aColor;
attribute float aState;
uniform float uScale;
uniform float uPx;
varying vec3 vC;
varying float vS;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float s = 0.34 * uScale / -mv.z * (1.0 + 0.45 * step(0.5, aState));
  gl_PointSize = clamp(s, 10.0 * uPx, 30.0 * uPx);
  vC = aColor;
  vS = aState;
}`
// aState: 0 idle, 1 hover, 2 selected, negative = dimmed (other cluster)
const NODE_FS = /* glsl */ `
varying vec3 vC;
varying float vS;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float core = smoothstep(0.34, 0.22, r);
  float ring = smoothstep(0.1, 0.0, abs(r - 0.78)) * (vS > 0.5 ? 1.0 : 0.55);
  float halo = smoothstep(1.0, 0.2, r) * 0.18;
  float dim = vS < -0.5 ? 0.45 : 1.0;
  float a = max(max(core, ring), halo) * dim;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vC * a, a);
}`

export async function createScene(o: SceneOpts): Promise<SceneApi> {
  const THREE = await import('three')
  const { nodes } = o
  const {
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    BufferGeometry,
    BufferAttribute,
    Points,
    ShaderMaterial,
    LineSegments,
    LineBasicMaterial,
    Vector3,
    Color,
    AdditiveBlending,
  } = THREE
  const data = (await import('../../data/steering.json')).default as { concepts: { joy: { layer: number; cloud: { pos: number[][]; neg: number[][] } } } }

  const { canvas } = o
  const renderer: T.WebGLRenderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' })
  renderer.setClearColor(0x000000, 0)
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  renderer.setPixelRatio(dpr)

  const scene = new Scene()
  const camera = new PerspectiveCamera(42, 1, 0.1, 120)

  const accent = new Color(o.accent)
  const ink = new Color(o.ink)
  const faint = new Color('#8fa2c2')
  const rand = rng(1729)

  // ---------- field: every faint point in one draw call ----------
  const joy = data.concepts.joy
  const cloud = [...joy.cloud.pos.map((p) => ({ p, pos: true })), ...joy.cloud.neg.map((p) => ({ p, pos: false }))]
  const bg = 1100
  const total = clusters.reduce((s, c) => s + c.count, 0) + bg + cloud.length
  const pos = new Float32Array(total * 3)
  const col = new Float32Array(total * 3)
  const size = new Float32Array(total)
  const alpha = new Float32Array(total)
  let n = 0
  const put = (x: number, y: number, z: number, s: number, a: number, c: T.Color) => {
    pos.set([x, y, z], n * 3)
    col.set([c.r, c.g, c.b], n * 3)
    size[n] = s
    alpha[n] = a
    n++
  }
  clusters.forEach((c, ci) => {
    const ax = [0.7 + rand() * 0.6, 0.55 + rand() * 0.5, 0.7 + rand() * 0.6]
    for (let i = 0; i < c.count; i++) {
      const s = c.spread * 0.62
      put(
        c.center[0] + gauss(rand) * s * ax[0],
        c.center[1] + gauss(rand) * s * ax[1],
        c.center[2] + gauss(rand) * s * ax[2],
        0.04 + rand() * 0.05,
        (ci === 5 ? 0.3 : 0.45) + rand() * 0.4,
        faint,
      )
    }
  })
  for (let i = 0; i < bg; i++) {
    const u = rand() * 2 - 1
    const th = rand() * Math.PI * 2
    const rr = 4 + Math.cbrt(rand()) * 16
    const s = Math.sqrt(1 - u * u)
    put(Math.cos(th) * s * rr, u * rr * 0.6, Math.sin(th) * s * rr, 0.03 + rand() * 0.03, 0.14 + rand() * 0.22, faint)
  }

  // The joy steering cloud: real 2-D activations (Qwen2.5-1.5B, layer 17), laid on a plane inside C1.
  const c0 = new Vector3(...clusters[0].center)
  const U = new Vector3(1, 0.12, 0.35).normalize()
  const V = new Vector3(-0.1, 1, 0.2).normalize()
  const SC = 0.085
  const on = (x: number, y: number) => c0.clone().addScaledVector(U, x * SC).addScaledVector(V, y * SC)
  const mean = (arr: number[][]) => arr.reduce((m, p) => [m[0] + p[0] / arr.length, m[1] + p[1] / arr.length], [0, 0])
  const mp = mean(joy.cloud.pos)
  const mn = mean(joy.cloud.neg)
  for (const { p, pos: isPos } of cloud) {
    const v = on(p[0], p[1])
    put(v.x, v.y, v.z, 0.075, isPos ? 0.95 : 0.7, isPos ? accent : ink)
  }

  const fg = new BufferGeometry()
  fg.setAttribute('position', new BufferAttribute(pos, 3))
  fg.setAttribute('aColor', new BufferAttribute(col, 3))
  fg.setAttribute('aSize', new BufferAttribute(size, 1))
  fg.setAttribute('aAlpha', new BufferAttribute(alpha, 1))
  const fieldMat = new ShaderMaterial({
    vertexShader: FIELD_VS,
    fragmentShader: FIELD_FS,
    uniforms: { uScale: { value: 1600 }, uTime: { value: 0 }, uDrift: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const field = new Points(fg, fieldMat)
  field.frustumCulled = false
  scene.add(field)

  // ---------- steering arrow: difference of means, neg → pos ----------
  const a0 = on(mn[0], mn[1])
  const a1 = on(mp[0], mp[1])
  const dir = a1.clone().sub(a0)
  const tail = a0.clone().addScaledVector(dir, -0.25)
  const tip = a1.clone().addScaledVector(dir, 0.35)
  const back = dir.clone().normalize().multiplyScalar(-0.32)
  const side = V.clone().multiplyScalar(0.16)
  const h1 = tip.clone().add(back).add(side)
  const h2 = tip.clone().add(back).sub(side)
  const arrowGeo = new BufferGeometry().setFromPoints([tail, tip, tip, h1, tip, h2])
  const arrow = new LineSegments(arrowGeo, new LineBasicMaterial({ color: accent, transparent: true, opacity: 0.95 }))
  scene.add(arrow)

  // ---------- axes: PC1..PC3 hairlines ----------
  const L = 7
  const axesGeo = new BufferGeometry().setFromPoints([
    new Vector3(-L, 0, 0), new Vector3(L, 0, 0),
    new Vector3(0, -L * 0.6, 0), new Vector3(0, L * 0.6, 0),
    new Vector3(0, 0, -L), new Vector3(0, 0, L),
  ])
  const axes = new LineSegments(axesGeo, new LineBasicMaterial({ color: faint, transparent: true, opacity: 0.12, depthWrite: false }))
  scene.add(axes)

  // ---------- nodes: projects and roles ----------
  const ng = new BufferGeometry()
  const npos = new Float32Array(nodes.length * 3)
  const ncol = new Float32Array(nodes.length * 3)
  const nstate = new Float32Array(nodes.length)
  nodes.forEach((nd, i) => {
    npos.set(nd.pos, i * 3)
    const c = nd.live ? accent : ink
    ncol.set([c.r, c.g, c.b], i * 3)
  })
  ng.setAttribute('position', new BufferAttribute(npos, 3))
  ng.setAttribute('aColor', new BufferAttribute(ncol, 3))
  const stateAttr = new BufferAttribute(nstate, 1)
  ng.setAttribute('aState', stateAttr)
  const nodeMat = new ShaderMaterial({
    vertexShader: NODE_VS,
    fragmentShader: NODE_FS,
    uniforms: { uScale: { value: 1600 }, uPx: { value: dpr } },
    transparent: true,
    depthWrite: false,
  })
  const nodePts = new Points(ng, nodeMat)
  nodePts.frustumCulled = false
  nodePts.renderOrder = 2
  scene.add(nodePts)

  // ---------- camera rig ----------
  let motion = o.motion
  const target = [new Spring(0), new Spring(0), new Spring(0)]
  const dist = new Spring(OVERVIEW_DIST)
  const yaw = new Spring(0.62)
  const pitch = new Spring(0.3)
  const cx = new Spring(0.5)
  const cy = new Spring(0.5)
  let yawFree = true // user owns yaw/pitch (inertia) unless a flight set a goal
  let vy = 0
  let vp = 0
  let autorotate = !motion.reduced
  let explore = false
  let selected: number | null = null
  let hovered: number | null = null
  let activeCluster = -1
  let lastInteract = -1e9

  const W = { w: 1, h: 1 }
  let avoid: { l: number; t: number; r: number; b: number }[] = []
  const covered = (x: number, y: number, x2 = x) => avoid.some((a) => x2 > a.l && x < a.r && y > a.t && y < a.b)
  // label widths, measured once per resize (labels are static text)
  const lw = new Float32Array(nodes.length)
  const cw = new Float32Array(clusters.length)
  const measureLabels = () => {
    o.labels.forEach((el, i) => (lw[i] = (el?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0))
    o.clusterLabels.forEach((el, i) => (cw[i] = (el?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0))
  }
  const screen = new Float32Array(nodes.length * 3) // x, y, visible
  const tmp = new Vector3()

  const setState = () => {
    for (let i = 0; i < nodes.length; i++) {
      nstate[i] = i === selected ? 2 : i === hovered ? 1 : activeCluster >= 0 && nodes[i].cluster !== activeCluster ? -1 : 0
    }
    stateAttr.needsUpdate = true
  }

  // ---------- frame loop (runs only while visible and something moves) ----------
  let raf = 0
  let visible = true
  let pageVisible = document.visibilityState === 'visible'
  let last = performance.now()
  let time = 0
  let readoutAt = 0
  let ready = false
  let dragging = false

  const springW = () => 5.4 / Math.max(0.4, motion.t)
  const springZ = () => 1 - motion.bounce * 1.1

  const moving = () =>
    dragging ||
    Math.abs(vy) + Math.abs(vp) > 1e-4 ||
    !target.every((s) => s.settled()) ||
    !dist.settled() ||
    !cx.settled() ||
    !cy.settled() ||
    (!yawFree && (!yaw.settled() || !pitch.settled())) ||
    spinning()
  const spinning = () => autorotate && !motion.reduced && selected === null && !dragging && performance.now() - lastInteract > 2500

  const stats = { frames: 0, ms: 0 }
  function frame(now: number) {
    const t0 = performance.now()
    raf = 0
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const w = springW()
    const z = springZ()
    for (const s of target) s.step(dt, w, z)
    dist.step(dt, w, z)
    cx.step(dt, 7, 1)
    cy.step(dt, 7, 1)
    if (yawFree) {
      if (!dragging) {
        yaw.x += vy * dt
        pitch.x += vp * dt
        const f = Math.exp(-dt * 3.4)
        vy *= f
        vp *= f
        if (spinning()) yaw.x += 0.06 * motion.k * dt
      }
      pitch.x = Math.max(-1.25, Math.min(1.25, pitch.x))
      yaw.goal = yaw.x
      pitch.goal = pitch.x
    } else {
      yaw.step(dt, w, z)
      pitch.step(dt, w, z)
      if (yaw.settled() && pitch.settled()) yawFree = true
    }
    if (!motion.reduced) time += dt * (spinning() ? 1 : 0.35)
    fieldMat.uniforms.uTime.value = time
    fieldMat.uniforms.uDrift.value = motion.reduced ? 0 : Math.min(1.4, motion.k)
    render()
    stats.frames++
    stats.ms += performance.now() - t0
    if (moving() && visible && pageVisible) raf = requestAnimationFrame(frame)
  }

  function place() {
    const t = new Vector3(target[0].x, target[1].x, target[2].x)
    const cp = Math.cos(pitch.x)
    camera.position.set(t.x + dist.x * cp * Math.sin(yaw.x), t.y + dist.x * Math.sin(pitch.x), t.z + dist.x * cp * Math.cos(yaw.x))
    camera.lookAt(t)
    camera.setViewOffset(W.w, W.h, (0.5 - cx.x) * W.w, (0.5 - cy.x) * W.h, W.w, W.h)
    camera.updateMatrixWorld()
  }

  function project() {
    const { w, h } = W
    for (let i = 0; i < nodes.length; i++) {
      tmp.set(...nodes[i].pos).project(camera)
      screen[i * 3] = (tmp.x * 0.5 + 0.5) * w
      screen[i * 3 + 1] = (0.5 - tmp.y * 0.5) * h
      screen[i * 3 + 2] = tmp.z < 1 && tmp.z > -1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15 ? 1 : 0
    }
  }

  const px = (el: HTMLElement, x: number, y: number, op: number) => {
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
    el.style.opacity = String(op)
  }

  function render() {
    place()
    renderer.render(scene, camera)
    project()
    // node labels: active cluster, plus the selected node
    for (let i = 0; i < nodes.length; i++) {
      const el = o.labels[i]
      if (!el) continue
      const vis = screen[i * 3 + 2] === 1
      // overview: label everything but the demoted C6; focused: only that cluster
      const on = activeCluster < 0 ? nodes[i].cluster !== 5 && W.w >= 600 : nodes[i].cluster === activeCluster
      const show = vis && i !== hovered && (on || i === selected) && !covered(screen[i * 3] - 8, screen[i * 3 + 1], screen[i * 3] + 15 + lw[i])
      px(el, screen[i * 3], screen[i * 3 + 1], show ? (activeCluster < 0 ? 0.72 : 1) : 0)
    }
    clusters.forEach((c, ci) => {
      const el = o.clusterLabels[ci]
      if (!el) return
      tmp.set(c.center[0], c.center[1] + c.spread * 1.15, c.center[2]).project(camera)
      const x = (tmp.x * 0.5 + 0.5) * W.w
      const y = (0.5 - tmp.y * 0.5) * W.h
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 && !covered(x - cw[ci] / 2, y - 10, x + cw[ci] / 2)
      px(el, x, y, vis ? (ci === activeCluster ? 1 : 0.62) : 0)
    })
    if (o.arrowLabel) {
      tmp.copy(tail).project(camera)
      const tx = tmp.x
      tmp.copy(tip).project(camera)
      const d = camera.position.distanceTo(tip)
      const x = (tmp.x * 0.5 + 0.5) * W.w
      const y = (0.5 - tmp.y * 0.5) * W.h
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05 && d < 17 && !covered(x, y)
      // sit beyond the arrowhead, never across the shaft
      const side = tmp.x >= tx ? 'r' : 'l'
      if (o.arrowLabel.dataset.side !== side) o.arrowLabel.dataset.side = side
      px(o.arrowLabel, x, y, vis ? 1 : 0)
    }
    if (o.tip) {
      if (hovered !== null && screen[hovered * 3 + 2] === 1) px(o.tip, screen[hovered * 3], screen[hovered * 3 + 1], 1)
      else o.tip.style.opacity = '0'
    }
    const now = performance.now()
    if (o.readout && now - readoutAt > 180) {
      readoutAt = now
      const deg = (r: number) => Math.round((((r * 180) / Math.PI) % 360 + 360) % 360)
      const pd = Math.round((pitch.x * 180) / Math.PI)
      o.readout.textContent = `YAW ${String(deg(yaw.x)).padStart(3, '0')}° · PITCH ${pd >= 0 ? '+' : '−'}${String(Math.abs(pd)).padStart(2, '0')}° · R ${dist.x.toFixed(1)}`
    }
    if (!ready) {
      ready = true
      o.onReady()
    }
  }

  const kick = () => {
    if (!raf && visible && pageVisible) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }

  // ---------- sizing ----------
  const host = canvas.parentElement!
  const resize = () => {
    const r = host.getBoundingClientRect()
    W.w = Math.max(1, Math.round(r.width))
    W.h = Math.max(1, Math.round(r.height))
    renderer.setSize(W.w, W.h, false)
    camera.aspect = W.w / W.h
    camera.updateProjectionMatrix()
    const s = (W.h * dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360))
    fieldMat.uniforms.uScale.value = s
    nodeMat.uniforms.uScale.value = s
    measureLabels()
    render()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)

  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible) kick()
  })
  io.observe(host)
  const onVis = () => {
    pageVisible = document.visibilityState === 'visible'
    if (pageVisible) kick()
  }
  document.addEventListener('visibilitychange', onVis)

  // ---------- picking ----------
  const pick = (x: number, y: number, radius: number) => {
    let best = -1
    let bd = radius * radius
    for (let i = 0; i < nodes.length; i++) {
      if (!screen[i * 3 + 2] || covered(screen[i * 3], screen[i * 3 + 1])) continue
      const dx = screen[i * 3] - x
      const dy = screen[i * 3 + 1] - y
      const d = dx * dx + dy * dy
      if (d < bd) {
        bd = d
        best = i
      }
    }
    return best
  }

  const setHover = (i: number | null) => {
    if (i === hovered) return
    hovered = i
    canvas.style.cursor = i === null ? '' : 'pointer'
    if (o.tip && i !== null) {
      const nd = nodes[i]
      const set = (sel: string, v: string) => {
        const el = o.tip!.querySelector(sel)
        if (el) el.textContent = v
      }
      set('[data-c]', `${clusters[nd.cluster].code} · ${clusters[nd.cluster].name}`)
      set('[data-t]', nd.label)
      set('[data-m]', nd.metric ?? nd.role)
      o.tip.dataset.live = nd.live ? '1' : ''
    }
    setState()
    render()
  }

  // ---------- pointer: orbit with inertia, tap to pick ----------
  let down: { x: number; y: number; t: number; id: number; type: string; moved: number } | null = null
  let lx = 0
  let ly = 0
  let lt = 0
  const local = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    const p = local(e)
    down = { x: p.x, y: p.y, t: performance.now(), id: e.pointerId, type: e.pointerType, moved: 0 }
    lx = p.x
    ly = p.y
    lt = performance.now()
    vy = vp = 0
    if (e.pointerType === 'mouse' || explore) canvas.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    const p = local(e)
    if (!down || down.id !== e.pointerId) {
      if (e.pointerType === 'mouse') {
        lastInteract = performance.now()
        const i = pick(p.x, p.y, 20)
        setHover(i < 0 ? null : i)
      }
      return
    }
    const dx = p.x - lx
    const dy = p.y - ly
    down.moved += Math.abs(dx) + Math.abs(dy)
    if (down.moved > 5) {
      if (!dragging) {
        dragging = true
        yawFree = true
        setHover(null)
      }
      // touch without explore mode: horizontal only, the browser keeps vertical page scroll
      const allowPitch = down.type === 'mouse' || explore
      const now = performance.now()
      const ddt = Math.max(8, now - lt) / 1000
      const k = 0.0058
      yaw.x -= dx * k
      if (allowPitch) pitch.x += dy * k
      vy = 0.7 * vy + 0.3 * ((-dx * k) / ddt)
      vp = allowPitch ? 0.7 * vp + 0.3 * ((dy * k) / ddt) : 0
      lt = now
      lastInteract = now
      kick()
    }
    lx = p.x
    ly = p.y
  }
  const onUp = (e: PointerEvent) => {
    if (!down || down.id !== e.pointerId) return
    const d = down
    down = null
    const wasDrag = dragging
    dragging = false
    lastInteract = performance.now()
    if (motion.reduced || performance.now() - lt > 90) vy = vp = 0
    if (!wasDrag && d.moved < 8 && performance.now() - d.t < 600) {
      const p = local(e)
      const i = pick(p.x, p.y, d.type === 'mouse' ? 20 : 30)
      if (i >= 0) o.onPick(i)
    }
    kick()
  }
  const onCancel = (e: PointerEvent) => {
    if (down && down.id === e.pointerId) {
      down = null
      dragging = false
      vy = vp = 0
    }
  }
  const onLeave = () => setHover(null)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onCancel)
  canvas.addEventListener('pointerleave', onLeave)

  // ---------- flights ----------
  const outwardYaw = (v: Vec3) => (Math.hypot(v[0], v[2]) > 1 ? Math.atan2(v[0], v[2]) : yaw.x)
  const nearestAngle = (from: number, to: number) => from + ((((to - from) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI

  let fadeTimer = 0
  function fly(t: Vec3, d: number, yw: number | null, pt: number) {
    lastInteract = performance.now()
    vy = vp = 0
    const apply = (instant: boolean) => {
      target.forEach((s, i) => (instant ? s.snap(t[i]) : (s.goal = t[i])))
      instant ? dist.snap(d) : (dist.goal = d)
      if (yw !== null) {
        const g = nearestAngle(yaw.x, yw)
        if (instant) {
          yaw.snap(g)
          pitch.snap(pt)
        } else {
          yaw.goal = g
          pitch.goal = pt
          yaw.v = pitch.v = 0
          yawFree = false
        }
      }
    }
    if (motion.reduced) {
      // Reduced motion: cut, masked by a short crossfade of the canvas.
      clearTimeout(fadeTimer)
      canvas.style.opacity = '0'
      fadeTimer = window.setTimeout(() => {
        apply(true)
        render()
        canvas.style.opacity = ''
      }, 170)
    } else {
      apply(false)
      kick()
    }
  }

  const api: SceneApi = {
    focusCluster(ci) {
      activeCluster = ci
      setState()
      const c = clusters[ci]
      fly(c.center, c.dist, ci === 0 ? yaw.x : outwardYaw(c.center), 0.26)
    },
    focusNode(i) {
      const nd = nodes[i]
      activeCluster = nd.cluster
      const c = clusters[nd.cluster]
      // look at the node from outside its cluster so siblings sit behind it
      const off: Vec3 = [nd.pos[0] - c.center[0], nd.pos[1] - c.center[1], nd.pos[2] - c.center[2]]
      const yw = Math.hypot(off[0], off[2]) > 0.2 ? Math.atan2(off[0], off[2]) : outwardYaw(c.center)
      setState()
      fly(nd.pos, 4.6, yw, 0.2)
    },
    overview() {
      activeCluster = -1
      setState()
      fly([0, 0, 0], OVERVIEW_DIST, yaw.x, 0.3)
    },
    setSelected(i) {
      selected = i
      setState()
      render()
      kick()
    },
    setMotion(m) {
      motion = m
      if (m.reduced) {
        vy = vp = 0
        autorotate = false
      }
      render()
      kick()
    },
    setAutorotate(on) {
      autorotate = on
      lastInteract = -1e9
      kick()
    },
    setExplore(on) {
      explore = on
    },
    setCenter(x, y) {
      if (motion.reduced || !ready) {
        cx.snap(x)
        cy.snap(y)
        render()
      } else {
        cx.goal = x
        cy.goal = y
        kick()
      }
    },
    setAvoid(r) {
      avoid = r
      render()
    },
    nudge(dy, dp) {
      yawFree = true
      lastInteract = performance.now()
      if (motion.reduced) {
        yaw.x += dy
        pitch.x = Math.max(-1.25, Math.min(1.25, pitch.x + dp))
        render()
      } else {
        vy += dy * 4
        vp += dp * 4
        kick()
      }
    },
    dispose() {
      cancelAnimationFrame(raf)
      clearTimeout(fadeTimer)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
      canvas.removeEventListener('pointerleave', onLeave)
      fg.dispose()
      ng.dispose()
      arrowGeo.dispose()
      axesGeo.dispose()
      fieldMat.dispose()
      nodeMat.dispose()
      renderer.dispose()
    },
  }

  if (import.meta.env.DEV) (window as unknown as { __v3: unknown }).__v3 = { stats, running: () => raf !== 0, api }
  resize()
  kick()
  return api
}
