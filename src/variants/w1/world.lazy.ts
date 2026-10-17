// W1 world: the baked room in three.js. Loaded on demand; the SSR shell works without it.
// Everything visible comes from the Blender bake (public/w1/room*.glb): unlit materials sampling baked atlases.
// Live extras: the window sky shader, MarmotSat's dot, glow sprites, dust in the lamp cone.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Texture,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { cover, FRAME, frameFor, type FrameKey, type P2 } from './geom'

export type HotId = 'screen' | 'amazon' | 'cubesat' | 'board' | 'notebooks' | 'pinboard' | 'window'
export const HOT_IDS: HotId[] = ['screen', 'amazon', 'cubesat', 'board', 'notebooks', 'pinboard', 'window']

export interface FrameOut {
  /** monitor screen corners tl, tr, br, bl in stage px */
  screen: [P2, P2, P2, P2]
  pins: Record<string, P2>
  /** MarmotSat dot in stage px, when it's in the window */
  sat: P2 | null
}

export interface WorldOpts {
  canvas: HTMLCanvasElement
  url: string
  reduced: boolean
  onFrame: (f: FrameOut) => void
  onHover: (id: HotId | null) => void
  onPick: (id: HotId) => void
  onProgress?: (p: number) => void
}

export interface WorldApi {
  resize(w: number, h: number): void
  hover(id: HotId | null): void
  /** Glide to an object; `shift` moves the view so it sits clear of a sheet (fraction of the stage). */
  focus(id: HotId | null, shift?: { x: number; y: number }): Promise<void>
  /** Dolly until the monitor fills `rect` (stage px), or back out. */
  zoomScreen(rect: { x: number; y: number; w: number; h: number } | null): Promise<void>
  /** sat: position inside the window opening (u: 0 left → 1 right, v: 0 bottom → 1 top), or null to hide */
  setSat(p: { u: number; v: number } | null, trail?: { u: number; v: number }[]): void
  setReduced(r: boolean): void
  setPaused(p: boolean): void
  wake(): void
  /** pin positions and screen corners for the base camera, as fractions of the poster frame (dev helper) */
  dump(): unknown
  dispose(): void
}

// Camera poses (three.js coords: Blender x, z, -y). Tuned against the poster frames.
type Pose = { pos: Vector3; tgt: Vector3; fov: number }
const POSES: Record<FrameKey, Pose> = {
  wide: { pos: new Vector3(4.7, 3.0, 3.75), tgt: new Vector3(-0.62, 0.92, -0.42), fov: 31 },
  tall: { pos: new Vector3(2.85, 2.45, 2.3), tgt: new Vector3(0.36, 0.66, -0.95), fov: 52 },
}

// distance from the object (m) along the base view direction, lift, and target drop below the pin
const FOCUS: Record<HotId, { d: number; up: number; drop: number }> = {
  screen: { d: 2.6, up: 0.1, drop: 0.2 },
  amazon: { d: 3.0, up: 0.25, drop: 0.25 },
  cubesat: { d: 1.9, up: 0.1, drop: 0.12 },
  board: { d: 1.6, up: 0.25, drop: 0.0 },
  notebooks: { d: 1.8, up: 0.25, drop: 0.0 },
  pinboard: { d: 2.4, up: 0.1, drop: 0.18 },
  window: { d: 3.4, up: 0.0, drop: 0.6 },
}

const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  r.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

const SKY_VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`
const SKY_FRAG = /* glsl */ `
uniform float uTime;
uniform vec4 uBox; // zMin, zMax, yMin, yMax of the window opening (world)
varying vec3 vW;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main() {
  // u across the window (left → right as seen from inside), v up
  vec2 uv = vec2((vW.z - uBox.x) / (uBox.y - uBox.x), (vW.y - uBox.z) / (uBox.w - uBox.z));
  vec3 top = vec3(0.012, 0.02, 0.05);
  vec3 hor = vec3(0.05, 0.085, 0.16);
  vec3 col = mix(hor, top, smoothstep(0.0, 1.1, uv.y));
  // city glow low on the horizon
  col += vec3(0.09, 0.06, 0.05) * exp(-max(uv.y, 0.0) * 9.0) * 0.6;
  // stars
  vec2 g = uv * vec2(46.0, 40.0);
  vec2 id = floor(g);
  float r = h21(id);
  vec2 f = fract(g) - 0.5 - (vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5) * 0.7;
  float star = smoothstep(0.09, 0.0, length(f)) * step(0.93, r);
  float tw = 0.65 + 0.35 * sin(uTime * (0.8 + r * 2.5) + r * 40.0);
  col += vec3(0.85, 0.9, 1.0) * star * tw * (0.35 + 0.65 * fract(r * 13.0)) * smoothstep(0.2, 0.45, uv.y);
  // moon
  vec2 mp = (uv - vec2(0.76, 0.8)) * vec2((uBox.y - uBox.x) / (uBox.w - uBox.z), 1.0);
  float md = length(mp);
  col = mix(col, vec3(0.92, 0.9, 0.82), smoothstep(0.055, 0.05, md));
  col += vec3(0.25, 0.3, 0.45) * exp(-md * 9.0) * 0.5;
  // hills: the far shore
  float hill = 0.2 + 0.05 * sin(uv.x * 5.0 + 1.3) + 0.025 * sin(uv.x * 17.0) + 0.01 * sin(uv.x * 41.0);
  col = mix(col, vec3(0.008, 0.012, 0.022), smoothstep(hill + 0.004, hill - 0.004, uv.y));
  // a few windows on the far shore
  vec2 lg = vec2(uv.x * 90.0, uv.y * 120.0);
  float lr = h21(floor(lg));
  float lit = step(0.985, lr) * step(uv.y, hill - 0.02) * step(0.06, uv.y);
  col += vec3(1.0, 0.7, 0.4) * lit * 0.5;
  gl_FragColor = vec4(col, 1.0);
}`

export async function createWorld(o: WorldOpts): Promise<WorldApi> {
  const { canvas } = o
  const mobile = matchMedia('(pointer: coarse)').matches
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  const scene = new Scene()
  const camera = new PerspectiveCamera(30, 1.6, 0.05, 60)

  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const gltf = await new Promise<{ scene: Group }>((res, rej) =>
    loader.load(o.url, (g) => res(g as unknown as { scene: Group }), (e) => e.total && o.onProgress?.(e.loaded / e.total), rej),
  )
  const root = gltf.scene
  scene.add(root)

  // ---------- materials: unlit, sampling the bake
  const hot = new Map<HotId, Mesh[]>()
  const baseMat = new Map<Mesh, MeshBasicMaterial>()
  const pins: Record<string, Object3D> = {}
  const glows: Object3D[] = []
  let screenMesh: Mesh | null = null
  let glass: Mesh | null = null
  let sky: Mesh | null = null
  const textures = new Set<Texture>()
  root.traverse((n) => {
    if (n.name.startsWith('PIN_')) pins[n.name.slice(4)] = n
    if (n.name.startsWith('GLOW_')) glows.push(n)
    const m = n as Mesh
    if (!m.isMesh) return
    const src = m.material as Material & { map?: Texture | null }
    if (m.name === 'SCREEN') {
      screenMesh = m
      m.material = new MeshBasicMaterial({ color: 0x05070c })
      return
    }
    if (m.name === 'GLASS') {
      glass = m
      m.material = new MeshBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.07, depthWrite: false })
      m.renderOrder = 2
      return
    }
    if (m.name === 'SKY') {
      sky = m
      return
    }
    const map = src.map ?? null
    if (map) {
      map.colorSpace = SRGBColorSpace
      map.anisotropy = renderer.capabilities.getMaxAnisotropy()
      textures.add(map)
    }
    const mat = new MeshBasicMaterial({ map, toneMapped: false })
    m.material = mat
    const hm = m.name.match(/^HS_([a-z]+)_/)
    if (hm) {
      const id = hm[1] as HotId
      ;(hot.get(id) ?? hot.set(id, []).get(id)!).push(m)
      const own = mat.clone()
      m.material = own
      baseMat.set(m, own)
    }
  })
  root.updateMatrixWorld(true)

  // screen corners (tl, tr, br, bl) in world space
  const corners: Vector3[] = []
  {
    const sm = screenMesh as Mesh | null
    if (sm) {
      const pos = sm.geometry.getAttribute('position')
      const pts: Vector3[] = []
      for (let i = 0; i < pos.count; i++) pts.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(sm.matrixWorld))
      const uniq = pts.filter((p, i) => pts.findIndex((q) => q.distanceTo(p) < 1e-4) === i)
      const cy = uniq.reduce((s, p) => s + p.y, 0) / uniq.length
      const top = uniq.filter((p) => p.y > cy).sort((a, b) => a.x - b.x)
      const bot = uniq.filter((p) => p.y <= cy).sort((a, b) => a.x - b.x)
      corners.push(top[0], top[1], bot[1], bot[0])
    }
  }
  const screenC = corners.length ? corners.reduce((s, p) => s.add(p), new Vector3()).multiplyScalar(0.25) : new Vector3(0.02, 1.08, -1.35)
  const screenN = corners.length ? new Vector3().subVectors(corners[1], corners[0]).cross(new Vector3().subVectors(corners[3], corners[0])).normalize().negate() : new Vector3(0, 0, 1)
  if (screenN.z < 0) screenN.negate()
  const screenH = corners.length ? corners[0].distanceTo(corners[3]) : 0.375

  // ---------- window: sky shader, the satellite and its trail
  const box = { zMin: 0, zMax: 1, yMin: 0, yMax: 1, x: -1.5 }
  {
    const g = glass as Mesh | null
    if (g) {
      g.geometry.computeBoundingBox()
      const bb = g.geometry.boundingBox!.clone().applyMatrix4(g.matrixWorld)
      box.zMin = bb.min.z
      box.zMax = bb.max.z
      box.yMin = bb.min.y
      box.yMax = bb.max.y
      box.x = (bb.min.x + bb.max.x) / 2
    }
  }
  const skyMat = new ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: { uTime: { value: 0 }, uBox: { value: [box.zMax, box.zMin, box.yMin, box.yMax] } },
  })
  // u runs left → right as seen from inside: the window is on the -x wall, so inside-left is +z (toward the viewer)
  if (sky) (sky as Mesh).material = skyMat
  const glowTex = glowTexture()
  const winPoint = (u: number, v: number, out = new Vector3()) =>
    out.set(box.x - 0.25, MathUtils.lerp(box.yMin + 0.05, box.yMax - 0.05, v), MathUtils.lerp(box.zMax - 0.04, box.zMin + 0.04, u))
  const sat = new Sprite(new SpriteMaterial({ map: glowTex, color: new Color(0.85, 0.95, 1.0), blending: AdditiveBlending, depthWrite: false, transparent: true }))
  sat.scale.setScalar(0.07)
  sat.visible = false
  scene.add(sat)
  const satCore = new Sprite(new SpriteMaterial({ map: glowTex, color: 0xffffff, blending: AdditiveBlending, depthWrite: false, transparent: true }))
  satCore.scale.setScalar(0.022)
  sat.add(satCore)
  satCore.scale.setScalar(0.35)
  const TRAIL = 48
  const trailGeo = new BufferGeometry()
  trailGeo.setAttribute('position', new BufferAttribute(new Float32Array(TRAIL * 3), 3))
  trailGeo.setAttribute('color', new BufferAttribute(new Float32Array(TRAIL * 3), 3))
  const trail = new Line(trailGeo, new LineBasicMaterial({ vertexColors: true, blending: AdditiveBlending, transparent: true, depthWrite: false }))
  trail.visible = false
  scene.add(trail)

  // ---------- glow sprites on bulbs and LEDs
  const glowSprites: { s: Sprite; base: number; ph: number }[] = []
  for (const gnode of glows) {
    const n = gnode.name
    const warm = n.includes('fairy') || n.includes('lamp') || n.includes('strip')
    const c = n.includes('board') ? new Color(0.3, 1, 0.45) : n.includes('robot') ? new Color(0.3, 0.85, 1) : warm ? new Color(1, 0.7, 0.4) : new Color(1, 1, 1)
    const s = new Sprite(new SpriteMaterial({ map: glowTex, color: c, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }))
    const base = n.includes('lamp') ? 0.34 : n.includes('fairy') ? 0.085 : n.includes('strip') ? 0.0 : 0.03
    if (!base) continue
    s.scale.setScalar(base)
    gnode.getWorldPosition(s.position)
    scene.add(s)
    glowSprites.push({ s, base, ph: Math.random() * 10 })
  }

  // ---------- dust drifting in the lamp's light
  const lampP = pins.lamp ? pins.lamp.getWorldPosition(new Vector3()) : new Vector3(-0.32, 1.12, -1.1)
  const DUST = mobile ? 40 : 90
  const dustGeo = new BufferGeometry()
  const dustBase = new Float32Array(DUST * 3)
  for (let i = 0; i < DUST; i++) {
    const t = Math.random()
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * (0.03 + t * 0.32)
    dustBase[i * 3] = lampP.x + Math.cos(a) * r + t * 0.03
    dustBase[i * 3 + 1] = lampP.y - 0.05 - t * 0.36
    dustBase[i * 3 + 2] = lampP.z + Math.sin(a) * r + t * 0.05
  }
  dustGeo.setAttribute('position', new BufferAttribute(dustBase.slice(), 3))
  const dust = new Points(dustGeo, new PointsMaterial({ map: glowTex, color: new Color(1, 0.8, 0.55), size: 0.012, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }))
  scene.add(dust)

  // ---------- camera state
  let W = 1,
    H = 1
  let frame: FrameKey = 'wide'
  const cur = { pos: new Vector3(), tgt: new Vector3(), shiftX: 0, shiftY: 0 }
  let tween: { from: typeof cur; to: typeof cur; t0: number; dur: number; done: () => void } | null = null
  let mode: 'base' | 'focus' | 'zoom' = 'base'
  let focusId: HotId | null = null
  let reduced = o.reduced
  let paused = false
  const pointer = new Vector2(0, 0)
  const par = new Vector2(0, 0)
  let lastInput = performance.now()
  const clone = (s: typeof cur) => ({ pos: s.pos.clone(), tgt: s.tgt.clone(), shiftX: s.shiftX, shiftY: s.shiftY })

  function basePose() {
    const p = POSES[frame]
    return { pos: p.pos.clone(), tgt: p.tgt.clone(), shiftX: 0, shiftY: 0 }
  }

  function applyProjection(shiftX: number, shiftY: number) {
    const f = FRAME[frame]
    const c = cover(W, H, frame)
    camera.fov = POSES[frame].fov
    camera.aspect = f.w / f.h
    camera.setViewOffset(c.w, c.h, -c.x + shiftX * W, -c.y + shiftY * H, W, H)
    camera.updateProjectionMatrix()
  }

  /** effective vertical fov of the visible viewport */
  function effFov() {
    const c = cover(W, H, frame)
    return 2 * Math.atan(Math.tan(MathUtils.degToRad(POSES[frame].fov) / 2) * (H / c.h))
  }

  function focusPose(id: HotId, shift = { x: 0, y: 0 }) {
    const p = (pins[id] ?? pins.screen).getWorldPosition(new Vector3())
    const bp = POSES[frame].pos
    const dir = new Vector3().subVectors(bp, p).normalize()
    const f = FOCUS[id]
    const tgt = p.clone().add(new Vector3(0, -f.drop, 0))
    const pos = tgt.clone().add(dir.multiplyScalar(f.d)).add(new Vector3(0, f.up, 0))
    return { pos, tgt, shiftX: shift.x, shiftY: shift.y }
  }

  function zoomPose(rect: { x: number; y: number; w: number; h: number }) {
    const fe = effFov()
    const d = (screenH * H) / (2 * Math.tan(fe / 2) * rect.h)
    const pos = screenC.clone().add(screenN.clone().multiplyScalar(d))
    // centre the screen on the rect's centre by shifting the view window
    const sx = -(rect.x + rect.w / 2 - W / 2) / W
    const sy = -(rect.y + rect.h / 2 - H / 2) / H
    return { pos, tgt: screenC.clone(), shiftX: sx, shiftY: sy }
  }

  function go(to: typeof cur, dur: number) {
    return new Promise<void>((done) => {
      if (reduced || dur === 0) {
        tween = null
        Object.assign(cur, clone(to))
        wake()
        done()
        return
      }
      tween = { from: clone(cur), to, t0: performance.now(), dur, done }
      wake()
    })
  }

  // ---------- picking
  const ray = new Raycaster()
  const hotMeshes = [...hot.values()].flat()
  if (screenMesh) {
    hotMeshes.push(screenMesh)
    hot.set('screen', [...(hot.get('screen') ?? []), screenMesh])
  }
  const idOf = (m: Object3D): HotId | null => {
    if (m === screenMesh) return 'screen'
    for (const [k, v] of hot) if (v.includes(m as Mesh)) return k
    return null
  }
  let hoverId: HotId | null = null
  let hoverFromDom: HotId | null = null
  const glowAmt = new Map<HotId, number>()
  function pick(clientX: number, clientY: number): HotId | null {
    const r = canvas.getBoundingClientRect()
    const v = new Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(v, camera)
    const hit = ray.intersectObjects(hotMeshes, false)[0]
    return hit ? idOf(hit.object) : null
  }
  let down: { x: number; y: number } | null = null
  const onMove = (e: PointerEvent) => {
    lastInput = performance.now()
    pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1)
    if (e.pointerType === 'mouse' && mode !== 'zoom') {
      const id = pick(e.clientX, e.clientY)
      if (id !== hoverId) {
        hoverId = id
        canvas.style.cursor = id ? 'pointer' : ''
        o.onHover(id)
      }
    }
    wake()
  }
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || mode === 'zoom') return
    down = null
    const id = pick(e.clientX, e.clientY)
    if (id) o.onPick(id)
  }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  const onWinMove = (e: PointerEvent) => {
    if (e.target === canvas) return
    lastInput = performance.now()
    pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1)
    wake()
  }
  addEventListener('pointermove', onWinMove, { passive: true })

  // ---------- render loop (sleeps when nothing moves)
  let raf = 0
  let running = false
  const t0 = performance.now()
  const tmp = new Vector3()
  const cubesat = hot.get('cubesat') ?? []
  const csBase = cubesat.map((m) => m.rotation.y)

  function awakeFor(now: number) {
    if (paused || document.hidden) return false
    if (tween) return true
    if (reduced) return false
    if (mode === 'zoom') return false
    return now - lastInput < 25000
  }

  function project(v: Vector3): P2 {
    tmp.copy(v).project(camera)
    return [(tmp.x * 0.5 + 0.5) * W, (-tmp.y * 0.5 + 0.5) * H]
  }

  function render(now: number) {
    const t = (now - t0) / 1000
    // tween
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.dur)
      const e = easeIO(k)
      cur.pos.lerpVectors(tween.from.pos, tween.to.pos, e)
      cur.tgt.lerpVectors(tween.from.tgt, tween.to.tgt, e)
      cur.shiftX = MathUtils.lerp(tween.from.shiftX, tween.to.shiftX, e)
      cur.shiftY = MathUtils.lerp(tween.from.shiftY, tween.to.shiftY, e)
      if (k >= 1) {
        const d = tween.done
        tween = null
        d()
      }
    }
    // breathing sway + pointer parallax (not when zoomed into the screen)
    const live = !reduced && mode !== 'zoom'
    const sway = live ? 1 : 0
    par.lerp(live ? pointer : new Vector2(0, 0), 0.06)
    const off = new Vector3().subVectors(cur.pos, cur.tgt)
    const yaw = -par.x * 0.045 + Math.sin(t * 0.21) * 0.012 * sway
    const pitch = par.y * 0.025 + Math.sin(t * 0.17 + 1.3) * 0.006 * sway
    off.applyAxisAngle(new Vector3(0, 1, 0), yaw)
    const right = new Vector3().crossVectors(off, new Vector3(0, 1, 0)).normalize()
    off.applyAxisAngle(right, pitch)
    camera.position.copy(cur.tgt).add(off)
    camera.position.y += Math.sin(t * 0.5) * 0.008 * sway
    camera.lookAt(cur.tgt)
    applyProjection(cur.shiftX, cur.shiftY)

    // hover glow (brighten the baked object a touch) and small object life
    for (const [id, meshes] of hot) {
      const target = id === hoverId || id === hoverFromDom || id === focusId ? 1 : 0
      const g = MathUtils.lerp(glowAmt.get(id) ?? 0, target, 0.14)
      glowAmt.set(id, g)
      for (const m of meshes) {
        const mat = baseMat.get(m)
        if (mat) mat.color.setScalar(1 + g * 0.28)
      }
    }
    const csg = glowAmt.get('cubesat') ?? 0
    cubesat.forEach((m, i) => (m.rotation.y = csBase[i] + Math.sin(t * 0.9) * 0.35 * csg))

    // sky, glows, dust
    skyMat.uniforms.uTime.value = t
    for (const g of glowSprites) {
      const flick = g.base > 0.2 ? 1 + Math.sin(t * 2.1) * 0.015 : 0.85 + 0.15 * Math.sin(t * 1.3 + g.ph)
      g.s.scale.setScalar(g.base * (reduced ? 1 : flick))
    }
    if (!reduced) {
      const pa = dustGeo.getAttribute('position') as BufferAttribute
      for (let i = 0; i < DUST; i++) {
        pa.setXYZ(
          i,
          dustBase[i * 3] + Math.sin(t * 0.13 + i) * 0.02,
          dustBase[i * 3 + 1] + Math.sin(t * 0.09 + i * 1.7) * 0.03,
          dustBase[i * 3 + 2] + Math.cos(t * 0.11 + i * 0.6) * 0.02,
        )
      }
      pa.needsUpdate = true
    }

    renderer.render(scene, camera)

    // DOM sync
    const pinsOut: Record<string, P2> = {}
    for (const k in pins) pinsOut[k] = project(pins[k].getWorldPosition(tmp.clone()))
    o.onFrame({
      screen: (corners.length ? corners.map((c) => project(c)) : [[0, 0], [0, 0], [0, 0], [0, 0]]) as FrameOut['screen'],
      pins: pinsOut,
      sat: sat.visible ? project(sat.position) : null,
    })
  }

  function loop(now: number) {
    render(now)
    if (awakeFor(now)) raf = requestAnimationFrame(loop)
    else running = false
  }
  function wake() {
    if (running || paused) return
    running = true
    raf = requestAnimationFrame(loop)
  }
  const onVis = () => !document.hidden && wake()
  document.addEventListener('visibilitychange', onVis)

  function resize(w: number, h: number) {
    W = Math.max(1, w)
    H = Math.max(1, h)
    const nf = frameFor(W, H)
    const changed = nf !== frame
    frame = nf
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(W, H, false)
    if (changed || (mode === 'base' && !tween)) Object.assign(cur, basePose())
    if (!running) render(performance.now())
  }

  frame = frameFor(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight)
  Object.assign(cur, basePose())
  resize(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight)

  return {
    resize,
    hover(id) {
      hoverFromDom = id
      wake()
    },
    focus(id, shift) {
      focusId = id
      mode = id ? 'focus' : 'base'
      return go(id ? focusPose(id, shift) : basePose(), id ? 1100 : 1000)
    },
    zoomScreen(rect) {
      if (rect) {
        mode = 'zoom'
        focusId = null
        return go(zoomPose(rect), 1250)
      }
      mode = 'base'
      lastInput = performance.now()
      return go(basePose(), 1100)
    },
    setSat(p, tr) {
      if (!p) {
        sat.visible = false
        trail.visible = false
      } else {
        sat.visible = true
        winPoint(p.u, p.v, sat.position)
        if (tr && tr.length > 1) {
          const pa = trailGeo.getAttribute('position') as BufferAttribute
          const ca = trailGeo.getAttribute('color') as BufferAttribute
          const n = Math.min(TRAIL, tr.length)
          const v = new Vector3()
          for (let i = 0; i < TRAIL; i++) {
            const q = tr[Math.max(0, tr.length - n + Math.min(i, n - 1))]
            winPoint(q.u, q.v, v)
            pa.setXYZ(i, v.x, v.y, v.z)
            const a = i < n ? (i / n) ** 2 * 0.8 : 0
            ca.setXYZ(i, a * 0.7, a * 0.85, a)
          }
          pa.needsUpdate = ca.needsUpdate = true
          trailGeo.setDrawRange(0, n)
          trail.visible = true
        } else trail.visible = false
      }
      if (!running) render(performance.now())
    },
    setReduced(r) {
      reduced = r
      wake()
    },
    setPaused(p) {
      paused = p
      if (!p) wake()
    },
    wake() {
      lastInput = performance.now()
      wake()
    },
    dump() {
      const out: Record<string, unknown> = {}
      for (const fk of ['wide', 'tall'] as FrameKey[]) {
        const f = FRAME[fk]
        const pw = W,
          ph = H,
          pf = frame
        W = f.w
        H = f.h
        frame = fk
        const p = POSES[fk]
        camera.position.copy(p.pos)
        camera.lookAt(p.tgt)
        applyProjection(0, 0)
        camera.updateMatrixWorld()
        const pct = (v: Vector3) => {
          const [x, y] = project(v)
          return [+((x / W) * 100).toFixed(2), +((y / H) * 100).toFixed(2)]
        }
        out[fk] = {
          screen: corners.map(pct),
          pins: Object.fromEntries(Object.entries(pins).map(([k, n]) => [k, pct(n.getWorldPosition(new Vector3()))])),
          window: [winPoint(0, 1), winPoint(1, 1), winPoint(1, 0), winPoint(0, 0)].map(pct),
        }
        W = pw
        H = ph
        frame = pf
      }
      render(performance.now())
      return out
    },
    dispose() {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      removeEventListener('pointermove', onWinMove)
      document.removeEventListener('visibilitychange', onVis)
      textures.forEach((t) => t.dispose())
      renderer.dispose()
    },
  }
}
