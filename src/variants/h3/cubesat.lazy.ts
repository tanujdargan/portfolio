// The MarmotSat object on the bench: a procedural 2U CubeSat in three.js. Runs inside a Web Worker on an
// OffscreenCanvas (sat.worker.ts), so creating the WebGL context, compiling shaders and drawing never block the page;
// browsers without OffscreenCanvas run the same host on the main thread. Renders on demand: a frame is drawn only while
// something moves (intro turn, drag, inertia, hover tilt), and the loop sleeps when idle, off-screen or hidden.
// DPR is capped at 1.5 (1.25 on touch screens).
import * as THREE from 'three'

export type AnchorKey = 'obc' | 'ttc' | 'power' | 'deploy'
export interface AnchorPos {
  k: AnchorKey
  /** 0..1 within the canvas box */
  x: number
  y: number
  /** 0 = facing away, 1 = facing the camera */
  vis: number
}
/** Messages into the host (from Sat.tsx) */
export type ToSat =
  | { t: 'init'; canvas: HTMLCanvasElement | OffscreenCanvas; w: number; h: number; pr: number; coarse: boolean; intro: boolean; drag: boolean }
  | { t: 'size'; w: number; h: number }
  | { t: 'vis'; v: boolean }
  | { t: 'tilt'; x: number | null; y: number }
  | { t: 'sun'; lit: boolean }
  | { t: 'focus'; k: AnchorKey | null }
  | { t: 'down'; x: number; y: number }
  | { t: 'move'; x: number; y: number }
  | { t: 'up' }
  | { t: 'snap'; pr: number }
  | { t: 'rest' }
  | { t: 'dispose' }
/** Messages out of the host */
export type FromSat = { t: 'anchors'; a: AnchorPos[] } | { t: 'first' } | { t: 'fail' } | { t: 'snap'; blob: Blob } | { t: 'rest'; a: AnchorPos[] }

interface Core {
  size(w: number, h: number): void
  visible(v: boolean): void
  tilt(x: number | null, y: number): void
  sun(lit: boolean): void
  focus(k: AnchorKey | null): void
  down(x: number, y: number): void
  move(x: number, y: number): void
  up(): void
  snapshot(pr: number): Promise<Blob>
  restAnchors(): AnchorPos[]
  dispose(): void
}

const g = globalThis as typeof globalThis & { requestAnimationFrame?: typeof requestAnimationFrame }
const nextFrame = (cb: (t: number) => void): number =>
  g.requestAnimationFrame ? g.requestAnimationFrame(cb) : (setTimeout(() => cb(performance.now()), 16) as unknown as number)
const cancelFrame = (id: number) => (g.cancelAnimationFrame ? g.cancelAnimationFrame(id) : clearTimeout(id))

/** The message host: the worker wires it to postMessage; the main-thread fallback calls it directly. Messages that
 *  arrive while the scene boots are replayed once it's up. */
export function host(post: (m: FromSat, transfer?: Transferable[]) => void): (m: ToSat) => void {
  let core: Core | null = null
  let dead = false
  const queue: ToSat[] = []
  const apply = (m: ToSat) => {
    const c = core!
    if (m.t === 'size') c.size(m.w, m.h)
    else if (m.t === 'vis') c.visible(m.v)
    else if (m.t === 'tilt') c.tilt(m.x, m.y)
    else if (m.t === 'sun') c.sun(m.lit)
    else if (m.t === 'focus') c.focus(m.k)
    else if (m.t === 'down') c.down(m.x, m.y)
    else if (m.t === 'move') c.move(m.x, m.y)
    else if (m.t === 'up') c.up()
    else if (m.t === 'snap') c.snapshot(m.pr).then((blob) => post({ t: 'snap', blob }))
    else if (m.t === 'rest') post({ t: 'rest', a: c.restAnchors() })
  }
  return (m) => {
    if (m.t === 'dispose') {
      dead = true
      core?.dispose()
      return
    }
    if (m.t === 'init') {
      mountSat(m.canvas, { ...m, alive: () => !dead, onAnchors: (a) => post({ t: 'anchors', a }), onFirstFrame: () => post({ t: 'first' }) })
        .then((c) => {
          if (!c) return post({ t: 'fail' })
          core = c
          queue.splice(0).forEach(apply)
        })
        .catch(() => post({ t: 'fail' }))
      return
    }
    if (core) apply(m)
    else queue.push(m)
  }
}

// Rest pose: three-quarter view, slightly from above. The SSR poster is a render of exactly this pose.
const REST = { yaw: -0.62, pitch: 0.2 }

/** Yield to the browser between boot stages (a frame, then a macrotask), so no single task runs long. */
const breathe = () => new Promise<void>((r) => nextFrame(() => setTimeout(r, 0)))

async function mountSat(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  opts: { onAnchors: (a: AnchorPos[]) => void; onFirstFrame: () => void; intro: boolean; drag: boolean; alive: () => boolean; w: number; h: number; pr: number; coarse: boolean },
): Promise<Core | null> {
  // Boot is staged across frames: context, then textures, then meshes, then shader compile, then the first frame.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false })
  const maxPr = opts.coarse ? 1.25 : 1.5
  renderer.setPixelRatio(Math.min(opts.pr || 1, maxPr))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  // No environment map: a PMREM bake was the single longest task on slow phones. Metals read through the lights.

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50)
  camera.position.set(0, 0.4, 7.8)
  camera.lookAt(0, 0.05, 0)

  // Lamp over the bench: warm key from upper left, cool rim behind, a little fill.
  const key = new THREE.DirectionalLight(0xffd8a8, 2.6)
  key.position.set(-3, 4.5, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x9fbcff, 1.5)
  rim.position.set(4, 1.5, -4)
  scene.add(rim)
  scene.add(new THREE.HemisphereLight(0xfff1e0, 0x1a1410, 1.1))
  const fill = new THREE.DirectionalLight(0xfff0e0, 0.9)
  fill.position.set(2, 0.5, 5)
  scene.add(fill)

  const sat = new THREE.Group()
  scene.add(sat)
  const disposables: { dispose(): void }[] = []
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x)

  await breathe()
  if (!opts.alive()) return (renderer.dispose(), null)
  // ---------- materials ----------
  const alu = track(new THREE.MeshStandardMaterial({ color: 0xc8c6c2, metalness: 0.55, roughness: 0.38 }))
  const anod = track(new THREE.MeshStandardMaterial({ color: 0x1b1b1e, metalness: 0.3, roughness: 0.55 }))
  const tape = track(new THREE.MeshStandardMaterial({ color: 0xd9c38f, metalness: 0.5, roughness: 0.35 }))
  const pcb = track(new THREE.MeshStandardMaterial({ color: 0x14301f, metalness: 0.2, roughness: 0.55 }))
  const gold = track(new THREE.MeshStandardMaterial({ color: 0xcfa253, metalness: 0.6, roughness: 0.3 }))

  const cellsTex = track(cellTexture(false))
  const cellsRough = track(cellTexture(true))
  const solar = track(
    new THREE.MeshStandardMaterial({ map: cellsTex, roughnessMap: cellsRough, roughness: 1, metalness: 0.15, emissive: 0x000000 }),
  )

  await breathe()
  if (!opts.alive()) return (renderer.dispose(), null)
  // ---------- 2U body: 1 × 2.27 × 1, long axis up ----------
  const H = 2.27
  const half = 0.5
  // side faces (solar), inset a hair inside the rails
  const faceGeo = track(new THREE.PlaneGeometry(0.9, H - 0.12))
  const faces: THREE.Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(faceGeo, solar)
    const a = (i * Math.PI) / 2
    m.position.set(Math.sin(a) * (half - 0.015), 0, Math.cos(a) * (half - 0.015))
    m.rotation.y = a
    sat.add(m)
    faces.push(m)
  }
  // inner box so gaps never show through
  const innerBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.96, H - 0.06, 0.96)), anod)
  sat.add(innerBox)
  // rails (corner posts, a little proud of the end plates, as on a real CubeSat)
  const railGeo = track(new THREE.BoxGeometry(0.085, H + 0.09, 0.085))
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const r = new THREE.Mesh(railGeo, alu)
      r.position.set(sx * (half - 0.0425), 0, sz * (half - 0.0425))
      sat.add(r)
    }
  // frame rings at the ends and at the 1U seam
  const ringGeoX = track(new THREE.BoxGeometry(1, 0.05, 0.05))
  for (const y of [-H / 2 + 0.025, 0, H / 2 - 0.025])
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(ringGeoX, alu)
      a.position.set(0, y, s * (half - 0.025))
      sat.add(a)
      const b = new THREE.Mesh(ringGeoX, alu)
      b.rotation.y = Math.PI / 2
      b.position.set(s * (half - 0.025), y, 0)
      sat.add(b)
    }
  // top plate: antenna deployment module (burn-wire board) with four tape antennas
  const top = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 0.06, 0.9)), pcb)
  top.position.y = H / 2 + 0.005
  sat.add(top)
  const hub = new THREE.Mesh(track(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 20)), gold)
  hub.position.y = H / 2 + 0.05
  sat.add(hub)
  const antGeo = track(new THREE.BoxGeometry(0.022, 0.006, 1.25))
  antGeo.translate(0, 0, 0.625)
  const antennas: THREE.Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Mesh(antGeo, tape)
    const ang = Math.PI / 4 + (i * Math.PI) / 2
    a.position.set(Math.sin(ang) * 0.4, H / 2 + 0.045, Math.cos(ang) * 0.4)
    a.rotation.y = ang
    a.rotation.x = -0.08
    sat.add(a)
    antennas.push(a)
  }
  // bottom plate with the separation-spring feet
  const bot = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 0.05, 0.9)), anod)
  bot.position.y = -H / 2
  sat.add(bot)
  const footGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 12))
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const f = new THREE.Mesh(footGeo, gold)
      f.position.set(sx * (half - 0.0425), -H / 2 - 0.08, sz * (half - 0.0425))
      sat.add(f)
    }
  // TTC radio: SMA connector and a small board window on the +X face
  const sma = new THREE.Mesh(track(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 16)), gold)
  sma.rotation.z = Math.PI / 2
  sma.position.set(half + 0.03, -0.62, 0.22)
  sat.add(sma)

  sat.position.y = 0.02

  await breathe()
  if (!opts.alive()) return (renderer.dispose(), null)
  // compile the shaders off the main thread where the driver allows it (KHR_parallel_shader_compile)
  const r2 = renderer as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> }
  if (r2.compileAsync) await r2.compileAsync(scene, camera)
  else renderer.compile(scene, camera)
  await breathe()
  if (!opts.alive()) return (renderer.dispose(), null)

  // ---------- anchors (local space), with the outward normal used for facing ----------
  const anchors: { k: AnchorKey; p: THREE.Vector3; n: THREE.Vector3 }[] = [
    { k: 'obc', p: new THREE.Vector3(0.05, 0.42, half), n: new THREE.Vector3(0, 0, 1) },
    { k: 'ttc', p: new THREE.Vector3(half, -0.62, 0.22), n: new THREE.Vector3(1, 0, 0) },
    { k: 'power', p: new THREE.Vector3(-0.1, -0.55, half), n: new THREE.Vector3(0, 0, 1) },
    // tip of the antenna that reads sideways at the rest pose; antennas are thin, so it's always shown (n = 0)
    { k: 'deploy', p: new THREE.Vector3(Math.sin((3 * Math.PI) / 4) * 1.3, H / 2 + 0.03, Math.cos((3 * Math.PI) / 4) * 1.3), n: new THREE.Vector3(0, 0, 0) },
  ]

  // ---------- motion state: yaw/pitch springs with inertia ----------
  // intro: start at the poster's pose one full turn back, so the swap from poster to canvas is seamless, then turn once
  let yaw = opts.intro ? REST.yaw - Math.PI * 2 : REST.yaw
  let pinned: number | null = opts.intro ? REST.yaw : null
  let pitch = REST.pitch
  let vy = 0
  let vp = 0
  let tiltX = 0
  let tiltY = 0
  let dragging = false
  let lastX = 0
  let lastY = 0
  let lastT = 0
  let visible = true
  let W = opts.w
  let Hb = opts.h
  let raf = 0
  let prev = 0
  let focused: AnchorKey | null = null
  let lit = true

  const size = () => {
    const w = W
    const h = Hb
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // keep the satellite the same size relative to the box height; widen only
    camera.updateProjectionMatrix()
  }

  const v = new THREE.Vector3()
  const n = new THREE.Vector3()
  const toCam = new THREE.Vector3()
  const compute = (): AnchorPos[] => {
    sat.updateMatrixWorld()
    return anchors.map((a) => {
      v.copy(a.p).applyMatrix4(sat.matrixWorld)
      n.copy(a.n).transformDirection(sat.matrixWorld)
      toCam.copy(camera.position).sub(v).normalize()
      const facing = a.n.lengthSq() === 0 ? 1 : n.dot(toCam)
      const s = v.clone().project(camera)
      return { k: a.k, x: (s.x + 1) / 2, y: (1 - s.y) / 2, vis: Math.max(0, Math.min(1, (facing - 0.05) / 0.3)) }
    })
  }
  const report = () => opts.onAnchors(compute())

  let first = true
  const draw = () => {
    sat.rotation.set(pitch + tiltY, yaw + tiltX, 0, 'XYZ')
    renderer.render(scene, camera)
    report()
    if (first) {
      first = false
      opts.onFirstFrame()
    }
  }

  // nearest rest yaw (so a long spin settles forward, not back through every turn)
  const restYaw = () => pinned ?? REST.yaw + Math.round((yaw - REST.yaw) / (Math.PI * 2)) * Math.PI * 2
  let tTiltX = 0
  let tTiltY = 0

  const step = (now: number) => {
    raf = 0
    const dt = Math.min(0.05, prev ? (now - prev) / 1000 : 1 / 60)
    prev = now
    if (!dragging) {
      // spring toward rest; light damping so a flick coasts a turn or two before it settles
      const k = pinned !== null ? 3 : 9
      const c = 2 * Math.sqrt(k) * 0.82
      vy += (-k * (yaw - restYaw()) - c * vy) * dt
      vp += (-k * (pitch - REST.pitch) - c * vp) * dt
      yaw += vy * dt
      pitch += vp * dt
    }
    tiltX += (tTiltX - tiltX) * Math.min(1, dt * 5)
    tiltY += (tTiltY - tiltY) * Math.min(1, dt * 5)
    if (Math.abs(tTiltX - tiltX) < 0.0005) tiltX = tTiltX
    if (Math.abs(tTiltY - tiltY) < 0.0005) tiltY = tTiltY
    draw()
    // close enough: snap to rest so the loop can sleep (sub-pixel at this size)
    if (!dragging && Math.abs(vy) < 0.02 && Math.abs(vp) < 0.02 && Math.abs(yaw - restYaw()) < 0.004 && Math.abs(pitch - REST.pitch) < 0.004) {
      yaw = restYaw()
      pitch = REST.pitch
      vy = vp = 0
    }
    const moving =
      dragging ||
      vy !== 0 ||
      vp !== 0 ||
      Math.abs(yaw - restYaw()) > 1e-6 ||
      Math.abs(pitch - REST.pitch) > 1e-6 ||
      tTiltX !== tiltX ||
      tTiltY !== tiltY
    if (!moving) pinned = null
    if (moving && visible) raf = nextFrame(step)
    else prev = 0
  }
  const wake = () => {
    if (!raf && visible) raf = nextFrame(step)
  }

  // ---------- input (pointer coordinates in CSS px, forwarded from the DOM canvas) ----------
  const down = (x: number, y: number) => {
    if (!opts.drag) return
    dragging = true
    pinned = null
    lastX = x
    lastY = y
    lastT = performance.now()
    vy = vp = 0
    wake()
  }
  const move = (x: number, y: number) => {
    if (!dragging) return
    const now = performance.now()
    const dx = x - lastX
    const dy = y - lastY
    const dts = Math.max(0.008, (now - lastT) / 1000)
    yaw += dx * 0.011
    pitch = Math.max(-0.7, Math.min(0.9, pitch + dy * 0.006))
    // velocity for the release, smoothed
    vy = vy * 0.6 + ((dx * 0.011) / dts) * 0.4
    vp = vp * 0.6 + ((dy * 0.006) / dts) * 0.4
    lastX = x
    lastY = y
    lastT = now
  }
  const up = () => {
    if (!dragging) return
    dragging = false
    // a flick: clamp so it reads as a spin, not a blur
    vy = Math.max(-14, Math.min(14, vy))
    vp = Math.max(-4, Math.min(4, vp))
    wake()
  }

  size()
  draw()
  wake()

  const applyLight = () => {
    key.intensity = lit ? 2.6 : 0.7
    rim.intensity = lit ? 1.5 : 1.9
    solar.emissive.setHex(focused === 'power' ? 0x1a2c55 : 0x000000)
    tape.emissive.setHex(focused === 'deploy' ? 0x4a3410 : 0x000000)
    pcb.emissive.setHex(focused === 'obc' ? 0x10301c : 0x000000)
    gold.emissive.setHex(focused === 'ttc' ? 0x3a2408 : 0x000000)
    if (!raf) draw()
  }

  const core: Core = {
    size(w, h) {
      W = w
      Hb = h
      size()
      if (!raf) draw()
    },
    visible(v) {
      visible = v
      if (v) wake()
    },
    tilt(x, y) {
      if (x === null) {
        tTiltX = tTiltY = 0
      } else {
        tTiltX = x * 0.16
        tTiltY = y * 0.08
      }
      wake()
    },
    sun(l) {
      lit = l
      applyLight()
    },
    focus(k) {
      focused = k
      applyLight()
    },
    down,
    move,
    up,
    dispose() {
      cancelFrame(raf)
      scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose?.())
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
    },
    // dev tooling for the SSR poster: a transparent render of the rest pose in a square box, and its hotspot positions
    async snapshot(pr) {
      renderer.setPixelRatio(pr)
      renderer.setSize(600, 600, false)
      camera.aspect = 1
      camera.updateProjectionMatrix()
      sat.rotation.set(REST.pitch, REST.yaw, 0, 'XYZ')
      renderer.render(scene, camera)
      const blob =
        'convertToBlob' in canvas
          ? await canvas.convertToBlob({ type: 'image/png' })
          : await new Promise<Blob>((r) => (canvas as HTMLCanvasElement).toBlob((b) => r(b!), 'image/png'))
      renderer.setPixelRatio(Math.min(opts.pr || 1, maxPr))
      size()
      draw()
      return blob
    },
    restAnchors() {
      camera.aspect = 1
      camera.updateProjectionMatrix()
      sat.rotation.set(REST.pitch, REST.yaw, 0, 'XYZ')
      const a = compute()
      size()
      draw()
      return a
    },
  }
  return core
}

/** Triple-junction cells, two per U on each long face, drawn into a canvas. `rough` draws the roughness map instead. */
function cellTexture(rough: boolean) {
  const W = 256
  const Hh = 640
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, Hh) : Object.assign(document.createElement('canvas'), { width: W, height: Hh })
  const g = c.getContext('2d') as CanvasRenderingContext2D
  // board between the cells
  g.fillStyle = rough ? '#b4b4b4' : '#0d1a14'
  g.fillRect(0, 0, W, Hh)
  const cw = 104
  const ch = 132
  const gx = (W - cw * 2) / 3
  const rows = 4
  const gy = (Hh - ch * rows) / (rows + 1)
  for (let r = 0; r < rows; r++)
    for (let col = 0; col < 2; col++) {
      const x = gx + col * (cw + gx)
      const y = gy + r * (ch + gy) + (r >= 2 ? 6 : -6)
      const cut = 14
      g.beginPath()
      g.moveTo(x + cut, y)
      g.lineTo(x + cw - cut, y)
      g.lineTo(x + cw, y + cut)
      g.lineTo(x + cw, y + ch - cut)
      g.lineTo(x + cw - cut, y + ch)
      g.lineTo(x + cut, y + ch)
      g.lineTo(x, y + ch - cut)
      g.lineTo(x, y + cut)
      g.closePath()
      if (rough) {
        g.fillStyle = '#6a6a6a'
        g.fill()
        continue
      }
      const grad = g.createLinearGradient(x, y, x + cw, y + ch)
      grad.addColorStop(0, '#30488a')
      grad.addColorStop(0.55, '#213670')
      grad.addColorStop(1, '#36508f')
      g.fillStyle = grad
      g.fill()
      // grid fingers and a busbar
      g.save()
      g.clip()
      g.strokeStyle = 'rgba(190,200,230,0.22)'
      g.lineWidth = 1
      for (let fy = y + 6; fy < y + ch; fy += 6) {
        g.beginPath()
        g.moveTo(x, fy)
        g.lineTo(x + cw, fy)
        g.stroke()
      }
      g.fillStyle = 'rgba(210,215,230,0.65)'
      g.fillRect(x, y + 4, cw, 3)
      g.restore()
    }
  const t = new THREE.CanvasTexture(c)
  if (!rough) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}
