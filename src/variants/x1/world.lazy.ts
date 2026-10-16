// The hilltop: a procedural low-poly diorama above the Strait, under the real sky over Victoria (sky.ts).
// three is imported here only, and this module is itself loaded lazily after first paint. Everything readable is DOM;
// the canvas carries shapes, light and motion. The loop renders on demand and sleeps when nothing moves.
import type * as T from 'three'
// three is loaded inside createWorld: this file shares the variant chunk, three must not.
let THREE: typeof import('three')
import type { Sky, SkyStatus } from './sky'
import { MASK_DEG, VIC_LAT } from './sky'

export type StationId = 'dish' | 'cabin' | 'dial' | 'logbook' | 'buoy' | 'board'
export const STATION_IDS: StationId[] = ['dish', 'cabin', 'dial', 'logbook', 'buoy', 'board']

export interface Screen {
  x: number
  y: number
  /** in front of the camera and inside the viewport */
  on: boolean
}
export interface FrameInfo {
  pins: Record<StationId, Screen>
  sat: (Screen & { up: boolean; el: number; az: number; sunlit: boolean }) | null
  rise: Screen | null
}
export interface WorldOpts {
  canvas: HTMLCanvasElement
  sky: Sky
  reduced: boolean
  mobile: boolean
  onPick: (id: StationId) => void
  onHover: (id: StationId | null) => void
  onDial: (step: number) => void
  onFrame: (f: FrameInfo) => void
  onSettle?: () => void
  onLost: () => void
}
export interface WorldApi {
  focus: (id: StationId | null) => void
  /** CSS px covered by DOM on each side (card, rail, sheet), so stations frame in the uncovered part of the view */
  setInset: (l: number, r: number, t: number, b: number) => void
  setDial: (index: number, warmth: number) => void
  setReduced: (r: boolean) => void
  followSat: (on: boolean) => void
  kick: (ms?: number) => void
  resize: () => void
  dispose: () => void
}

// ---------- small math ----------
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const DEG = Math.PI / 180
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function noise(x: number, y: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y)
  const fx = x - ix,
    fy = y - iy
  const u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy),
    b = hash(ix + 1, iy),
    c = hash(ix, iy + 1),
    d = hash(ix + 1, iy + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
const fbm = (x: number, y: number) => noise(x, y) * 0.6 + noise(x * 2.1, y * 2.1) * 0.28 + noise(x * 4.3, y * 4.3) * 0.12
let seed = 7
const rnd = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
/** cubic-bezier(.65,0,.35,1)-like ease for camera flights */
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Sky direction for azimuth/elevation (degrees). Scene axes: east +x, up +y, north −z. */
function skyDir(az: number, el: number, out = new THREE.Vector3()) {
  const a = az * DEG,
    e = el * DEG
  return out.set(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e))
}

export const SEA = -9
/** Terrain height: a plateau at 0, falling steeply to the sea in the south (+z), rolling up into hills in the north. */
export function height(x: number, z: number) {
  const r = Math.hypot(x * 0.95, z)
  const south = smooth(-6, 12, z)
  const fall = smooth(8, 27, r)
  let h = -fall * (4.5 + 11 * south)
  h += smooth(-26, -80, z) * (10 + 10 * fbm(x * 0.03 + 3, z * 0.03)) // northern hills
  h += (fbm(x * 0.11, z * 0.11) - 0.5) * 2.6 * smooth(6, 16, r)
  h += (noise(x * 0.9, z * 0.9) - 0.5) * 0.16
  return h
}

// ---------- shaders ----------
const SKY_VS = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`
const SKY_FS = /* glsl */ `
uniform vec3 uSun;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float sy = uSun.y;
  float day = smoothstep(-0.10, 0.22, sy);
  float tw = smoothstep(-0.32, -0.02, sy) * (1.0 - smoothstep(0.08, 0.36, sy));
  vec3 nz = vec3(0.008, 0.014, 0.038), nh = vec3(0.05, 0.08, 0.15);
  vec3 dz = vec3(0.035, 0.085, 0.21), dh = vec3(0.17, 0.26, 0.40);
  float up = pow(clamp(h, 0.0, 1.0), 0.45);
  vec3 c = mix(mix(nh, dh, day), mix(nz, dz, day), up);
  // twilight: warm low glow toward the Sun, cool above it
  float toward = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSun.x, 0.0, uSun.z))), 0.0);
  float low = 1.0 - smoothstep(0.0, 0.45, h);
  c += tw * low * (vec3(0.55, 0.22, 0.08) * pow(toward, 3.0) + vec3(0.06, 0.05, 0.09));
  // a faint airglow band at the horizon
  c += vec3(0.02, 0.05, 0.05) * exp(-pow(h / 0.06, 2.0)) * (1.0 - day);
  // the Sun itself (soft) when it's up
  float sd = max(dot(d, uSun), 0.0);
  c += vec3(1.0, 0.85, 0.6) * pow(sd, 900.0) * 3.0 * smoothstep(-0.03, 0.02, sy);
  c += vec3(0.5, 0.35, 0.2) * pow(sd, 18.0) * 0.25 * smoothstep(-0.2, 0.05, sy);
  if (h < 0.0) c = mix(c, nh * 0.6 + day * dh * 0.4, smoothstep(0.0, -0.2, h));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`

const STAR_VS = /* glsl */ `
attribute float aSize;
attribute float aMag;
uniform float uScale;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w * 0.9999;
  gl_PointSize = aSize * uScale;
  vA = aMag;
}`
const STAR_FS = /* glsl */ `
uniform float uFade;
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.2, 1.0, r)) * vA * uFade;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a);
}`

const SEA_VS = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`
const SEA_FS = /* glsl */ `
uniform float uT;
uniform vec3 uCam;
uniform vec3 uHorizon;
uniform vec3 uDeep;
uniform vec3 uWarm;
uniform vec3 uWarmPos;
uniform vec3 uSun;
varying vec3 vW;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  vec3 V = normalize(uCam - vW);
  float dist = length(uCam - vW);
  vec2 p = vW.xz;
  // two drifting wave fields give a normal for glints
  float w1 = vn(p * vec2(0.18, 0.5) + vec2(uT * 0.25, uT * 0.1));
  float w2 = vn(p * vec2(0.6, 1.4) - vec2(uT * 0.4, -uT * 0.2));
  vec3 n = normalize(vec3((w1 - 0.5) * 0.35 + (w2 - 0.5) * 0.2, 1.0, (w2 - 0.5) * 0.35));
  float fres = pow(1.0 - max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0), 4.0);
  vec3 c = mix(uDeep, uHorizon, fres);
  // glints from the cabin light and the Sun
  vec3 L = normalize(uWarmPos - vW);
  float spec = pow(max(dot(reflect(-L, n), V), 0.0), 60.0) * 1.4 / (1.0 + dist * 0.02);
  c += uWarm * spec;
  vec3 S = normalize(uSun);
  c += vec3(1.0, 0.8, 0.6) * pow(max(dot(reflect(-S, n), V), 0.0), 120.0) * smoothstep(-0.05, 0.1, S.y) * 2.0;
  c += vec3(0.5, 0.6, 0.8) * pow(max(dot(reflect(vec3(0.0, -1.0, 0.0) * -1.0, n), V), 0.0), 8.0) * 0.015;
  c = mix(c, uHorizon, smoothstep(60.0, 520.0, dist));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`

const yieldTask = () => new Promise<void>((r) => setTimeout(r, 0))

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  gr.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
function blobTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32)
  gr.addColorStop(0, 'rgba(0,0,0,0.7)')
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

interface Pose {
  tx: number
  ty: number
  tz: number
  yaw: number
  pitch: number
  /** radius to fit in view, metres */
  fit: number
}

export async function createWorld(o: WorldOpts): Promise<WorldApi> {
  THREE = await import('three')
  const { canvas, sky } = o
  let reduced = o.reduced
  const mobile = o.mobile
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: mobile ? 'low-power' : 'high-performance' })
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  const dprCap = mobile ? 1.5 : 2
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 1400)
  const fog = new THREE.FogExp2(0x0b1220, 0.0042)
  scene.fog = fog
  await yieldTask()

  const lambert = (color: number, extra: T.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra })
  const glowTex = glowTexture()
  const blobTex = blobTexture()
  const glow = (color: number, size: number, opacity = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }))
    s.scale.setScalar(size)
    return s
  }
  const blob = (x: number, z: number, sx: number, sz = sx, op = 0.8) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: op, depthWrite: false }))
    m.rotation.x = -Math.PI / 2
    m.scale.set(sx, sz, 1)
    m.position.set(x, height(x, z) + 0.03, z)
    scene.add(m)
  }

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0x7d93c8, 0x141820, 0.9)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0x9fb4e6, 0.9)
  key.position.set(-30, 40, -20)
  scene.add(key)
  const warmBase = new THREE.Color(1.0, 0.62, 0.32)
  const warmHot = new THREE.Color(1.0, 0.5, 0.2)
  const warmCold = new THREE.Color(0.55, 0.72, 1.0)
  const warmNow = warmBase.clone()
  const cabinLight = new THREE.PointLight(warmBase, 14, 14, 1.6)
  cabinLight.position.set(3.9, 1.6, -3.4)
  scene.add(cabinLight)
  const porchLight = new THREE.PointLight(warmBase, 5, 7, 1.8)
  porchLight.position.set(0.7, 2.0, -2.9)
  scene.add(porchLight)

  // ---------- sky ----------
  const sunU = { value: new THREE.Vector3(0, -1, 0) }
  const skyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: { uSun: sunU }, side: THREE.BackSide, depthWrite: false, fog: false }),
  )
  skyMesh.renderOrder = -2
  scene.add(skyMesh)

  // Stars are decorative (not a catalogue), placed in equatorial coordinates with a Milky Way band so they turn with
  // the real sidereal time over Victoria.
  const N_STAR = mobile ? 5000 : 9000
  const sp = new Float32Array(N_STAR * 3),
    ss = new Float32Array(N_STAR),
    sm = new Float32Array(N_STAR)
  const ngp = new THREE.Vector3().setFromSphericalCoords(1, (90 - 27.13) * DEG, 0)
  {
    const ra = 192.86 * DEG,
      dec = 27.13 * DEG
    ngp.set(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec))
  }
  const tmp = new THREE.Vector3(),
    tmp2 = new THREE.Vector3()
  for (let i = 0; i < N_STAR; i++) {
    const band = i % 2 === 0
    // random direction; band stars are pulled toward the galactic plane
    tmp.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1)
    while (tmp.lengthSq() > 1 || tmp.lengthSq() < 0.01) tmp.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1)
    tmp.normalize()
    if (band) {
      const d = tmp.dot(ngp)
      tmp2.copy(ngp).multiplyScalar(d * 0.86)
      tmp.sub(tmp2).normalize()
    }
    tmp.multiplyScalar(800)
    sp.set([tmp.x, tmp.y, tmp.z], i * 3)
    const bright = Math.pow(rnd(), band ? 5 : 3.2)
    ss[i] = 1.5 + bright * 4.6
    sm[i] = (band ? 0.3 : 0.45) + bright * 0.65
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(ss, 1))
  starGeo.setAttribute('aMag', new THREE.BufferAttribute(sm, 1))
  const starU = { uFade: { value: 1 }, uScale: { value: 1 } }
  const stars = new THREE.Points(
    starGeo,
    new THREE.ShaderMaterial({ vertexShader: STAR_VS, fragmentShader: STAR_FS, uniforms: starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
  )
  stars.matrixAutoUpdate = false
  stars.renderOrder = -1
  scene.add(stars)
  const lat = VIC_LAT * DEG
  const setSidereal = (ms: number) => {
    const L = sky.lst(ms)
    const sL = Math.sin(L),
      cL = Math.cos(L),
      sP = Math.sin(lat),
      cP = Math.cos(lat)
    // equatorial (x→RA 0, y→RA 90°, z→pole) to scene (east, up, south)
    stars.matrix.set(-sL, cL, 0, 0, cP * cL, cP * sL, sP, 0, sP * cL, sP * sL, -cP, 0, 0, 0, 0, 1)
    stars.matrixWorldNeedsUpdate = true
  }

  // the Sun disc glow and MarmotSat
  const sunGlow = glow(0xffd9a0, 90, 0.9)
  scene.add(sunGlow)
  const satGlow = glow(0xdfeaff, 34, 1)
  const satCore = glow(0xffffff, 9, 1)
  satGlow.renderOrder = satCore.renderOrder = 2
  scene.add(satGlow, satCore)
  const arcMat = new THREE.LineDashedMaterial({ color: 0x9fc2ff, dashSize: 4, gapSize: 9, transparent: true, opacity: 0.4, fog: false, depthWrite: false })
  const arcGeo = new THREE.BufferGeometry()
  const arc = new THREE.Line(arcGeo, arcMat)
  arc.renderOrder = 1
  scene.add(arc)
  let arcFor = -1
  await yieldTask()

  // ---------- terrain ----------
  const tSize = 220,
    tSeg = mobile ? 90 : 120
  const tg = new THREE.PlaneGeometry(tSize, tSize, tSeg, tSeg).toNonIndexed()
  tg.rotateX(-Math.PI / 2)
  {
    const pos = tg.attributes.position as T.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i)
      // finer detail near the hill, coarse outskirts squeezed outward
      pos.setY(i, height(x, z))
    }
    tg.computeVertexNormals()
    const col = new Float32Array(pos.count * 3)
    const grass = new THREE.Color(0x2b3a2c),
      grass2 = new THREE.Color(0x223126),
      rock = new THREE.Color(0x3c3f46),
      sand = new THREE.Color(0x4d4a40),
      c = new THREE.Color()
    const nrm = tg.attributes.normal as T.BufferAttribute
    for (let i = 0; i < pos.count; i += 3) {
      // one colour per face (flat shading look)
      let y = 0,
        ny = 0,
        x = 0,
        z = 0
      for (let k = 0; k < 3; k++) {
        y += pos.getY(i + k) / 3
        ny += nrm.getY(i + k) / 3
        x += pos.getX(i + k) / 3
        z += pos.getZ(i + k) / 3
      }
      c.copy(grass).lerp(grass2, hash(x * 0.37, z * 0.37))
      if (ny < 0.8) c.lerp(rock, smooth(0.8, 0.55, ny))
      if (y < SEA + 1.4) c.lerp(sand, smooth(SEA + 1.4, SEA + 0.2, y))
      for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3)
    }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3))
  }
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))
  scene.add(terrain)
  await yieldTask()

  // the far shore: the Olympic Mountains across the Strait, with a few lights of the towns at their foot
  {
    const pts: number[] = []
    const N = 120
    for (let i = 0; i <= N; i++) {
      const x = -700 + (1400 * i) / N
      const z = 330 + Math.sin(i * 0.21) * 20
      const ridge = 8 + 30 * fbm(i * 0.09, 2.3) * smooth(-700, -150, x) * smooth(700, 150, x) + 8 * fbm(i * 0.3, 7)
      pts.push(x, SEA - 1, z, x, SEA + ridge, z + 30)
    }
    const g = new THREE.BufferGeometry()
    const idx: number[] = []
    for (let i = 0; i < N; i++) {
      const a = i * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    scene.add(new THREE.Mesh(g, lambert(0x1a2234, { side: THREE.DoubleSide })))
    const lp: number[] = []
    for (let i = 0; i < 70; i++) {
      const x = -260 + rnd() * 380
      lp.push(x, SEA + 0.6 + rnd() * 2.5, 318 + rnd() * 10)
    }
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3))
    scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: 0xffc27a, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false })))
  }

  // ---------- sea ----------
  const seaU = {
    uT: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uHorizon: { value: new THREE.Color(0x0e1828) },
    uDeep: { value: new THREE.Color(0x03070d) },
    uWarm: { value: warmBase.clone() },
    uWarmPos: { value: cabinLight.position },
    uSun: { value: sunU.value },
  }
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1), new THREE.ShaderMaterial({ vertexShader: SEA_VS, fragmentShader: SEA_FS, uniforms: seaU }))
  sea.rotation.x = -Math.PI / 2
  sea.position.y = SEA
  scene.add(sea)
  await yieldTask()

  // ---------- vegetation and rocks (instanced) ----------
  {
    const prof = [
      [0.0, 0],
      [0.18, 0.0],
      [0.18, 0.5],
      [1.15, 0.7],
      [0.45, 1.7],
      [0.85, 1.7],
      [0.28, 2.8],
      [0.55, 2.8],
      [0.0, 4.0],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    const fir = new THREE.LatheGeometry(prof, 6)
    const N = mobile ? 70 : 110
    const trees = new THREE.InstancedMesh(fir, lambert(0x1a2a24), N)
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      s = new THREE.Vector3(),
      p = new THREE.Vector3()
    let n = 0,
      guard = 0
    while (n < N && guard++ < 6000) {
      const x = (rnd() - 0.5) * 120,
        z = (rnd() - 0.65) * 110
      const r = Math.hypot(x, z)
      const y = height(x, z)
      if (r < 9.5 || y < SEA + 1.5) continue
      if (z < -8 && Math.abs(x) < 9 + (-z - 8) * 0.5 && z > -60) continue // keep the view from the north clear
      if (z > 4 && Math.abs(x) < 34) continue // keep the sea view to the south open
      const k = 0.8 + rnd() * 0.9
      p.set(x, y - 0.1, z)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6)
      s.set(k, k * (0.9 + rnd() * 0.5), k)
      trees.setMatrixAt(n++, m.compose(p, q, s))
    }
    trees.count = n
    scene.add(trees)
    const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), lambert(0x4a4d55), 40)
    for (let i = 0; i < 40; i++) {
      const a = rnd() * Math.PI * 2,
        r = 7 + rnd() * 6
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r
      const k = 0.4 + rnd() * 1.1
      p.set(x, height(x, z) + 0.1 * k, z)
      q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3))
      s.set(k * 1.3, k * 0.7, k)
      rocks.setMatrixAt(i, m.compose(p, q, s))
    }
    scene.add(rocks)
  }
  await yieldTask()

  // ---------- the compound ----------
  const pickRoot = new THREE.Object3D()
  const proxy = (id: StationId, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz))
    b.position.set(x, y, z)
    b.userData.station = id
    pickRoot.add(b)
  }
  const pinAt: Record<StationId, T.Vector3> = {
    dish: new THREE.Vector3(),
    cabin: new THREE.Vector3(),
    dial: new THREE.Vector3(),
    logbook: new THREE.Vector3(),
    buoy: new THREE.Vector3(),
    board: new THREE.Vector3(),
  }
  const concrete = lambert(0x50545c),
    metal = lambert(0xc9cdd5),
    dark = lambert(0x262a31),
    wood = lambert(0x3d2f27),
    roofM = lambert(0x1c1f26)

  // a gravel pad under the compound
  {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(7.6, 9), lambert(0x34363a))
    pad.rotation.x = -Math.PI / 2
    pad.position.y = 0.02
    pad.scale.set(1.25, 0.82, 1)
    pad.position.set(1.2, 0.03, -0.6)
    scene.add(pad)
  }

  // Dish: az/el mount, 3.4 m reflector
  const DISH = new THREE.Vector3(-3.6, 0, 0.2)
  const dishAz = new THREE.Group()
  const dishEl = new THREE.Group()
  {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.5), concrete)
    base.position.set(DISH.x, 0.17, DISH.z)
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 1.9, 8), metal)
    ped.position.set(DISH.x, 1.3, DISH.z)
    scene.add(base, ped)
    dishAz.position.set(DISH.x, 2.3, DISH.z)
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), metal)
    dishAz.add(yoke)
    dishEl.position.y = 0.25
    dishAz.add(dishEl)
    const f = 0.95,
      R = 1.7
    const pts: T.Vector2[] = []
    for (let i = 0; i <= 8; i++) {
      const r = (R * i) / 8
      pts.push(new THREE.Vector2(r, (r * r) / (4 * f)))
    }
    const dishM = new THREE.MeshLambertMaterial({ color: 0xd8dbe2, flatShading: true, side: THREE.DoubleSide })
    const refl = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), dishM)
    refl.position.y = 0.05
    dishEl.add(refl)
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, 0.3, 8), metal)
    back.position.y = -0.1
    dishEl.add(back)
    const rimY = (R * R) / (4 * f) + 0.05
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2
      const from = new THREE.Vector3(Math.cos(a) * R * 0.92, rimY - 0.02, Math.sin(a) * R * 0.92)
      const to = new THREE.Vector3(0, f + 0.05, 0)
      const len = from.distanceTo(to)
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 4), metal)
      strut.position.copy(from).add(to).multiplyScalar(0.5)
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
      dishEl.add(strut)
    }
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 0.3, 8), dark)
    feed.position.y = f + 0.05
    dishEl.add(feed)
    const feedLed = glow(0x9fd0ff, 0.5, 0.9)
    feedLed.position.y = f + 0.24
    dishEl.add(feedLed)
    scene.add(dishAz)
    blob(DISH.x, DISH.z, 3.4, 3.4, 0.7)
    proxy('dish', DISH.x, 2.2, DISH.z, 3.8, 4.4, 3.8)
    pinAt.dish.set(DISH.x, 4.4, DISH.z)
  }

  // Cabin with a lit window and the monitor seen through it
  const windowMat = new THREE.MeshBasicMaterial({ color: warmBase.clone().multiplyScalar(0.9) })
  const windowGlow = glow(0xffa860, 4.2, 0.55)
  const doorLamp = glow(0xffb070, 1.1, 0.9)
  {
    const C = new THREE.Vector3(3.5, 0, -1.0)
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.5, 2.9), wood)
    body.position.set(C.x, 1.25, C.z)
    scene.add(body)
    const sill = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.25, 3.1), concrete)
    sill.position.set(C.x, 0.12, C.z)
    scene.add(sill)
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 1.85), roofM)
      r.position.set(C.x, 2.95, C.z + s * 0.78)
      r.rotation.x = s * 0.55
      scene.add(r)
    }
    const gable = new THREE.Shape()
    gable.moveTo(-1.45, 0)
    gable.lineTo(1.45, 0)
    gable.lineTo(0, 0.85)
    gable.closePath()
    const gg = new THREE.ExtrudeGeometry(gable, { depth: 3.7, bevelEnabled: false })
    const gm = new THREE.Mesh(gg, wood)
    gm.rotation.y = Math.PI / 2
    gm.position.set(C.x - 1.85, 2.5, C.z)
    scene.add(gm)
    const front = C.z - 1.46
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.8), windowMat)
    win.position.set(C.x + 0.55, 1.5, front - 0.005)
    win.rotation.y = Math.PI
    scene.add(win)
    const mon = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.75, 1.1) }))
    mon.position.set(C.x + 0.38, 1.36, front - 0.012)
    mon.rotation.y = Math.PI
    scene.add(mon)
    const monGlow = glow(0xa8d4ff, 0.9, 0.45)
    monGlow.position.set(C.x + 0.38, 1.36, front - 0.06)
    scene.add(monGlow)
    for (const [w, h, x, y] of [
      [1.35, 0.07, 0, 0.42],
      [1.35, 0.07, 0, -0.42],
      [0.07, 0.86, 0.66, 0],
      [0.07, 0.86, -0.66, 0],
      [0.05, 0.8, 0.14, 0],
    ] as const) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), dark)
      f.position.set(C.x + 0.55 + x, 1.5 + y, front - 0.02)
      scene.add(f)
    }
    windowGlow.position.set(C.x + 0.55, 1.5, front - 0.4)
    scene.add(windowGlow)
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.85), lambert(0x1f1814))
    door.position.set(C.x - 1.0, 0.95, front - 0.006)
    door.rotation.y = Math.PI
    scene.add(door)
    doorLamp.position.set(C.x - 1.0, 2.1, front - 0.15)
    scene.add(doorLamp)
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 6), dark)
    pipe.position.set(C.x + 1.2, 3.4, C.z + 0.6)
    scene.add(pipe)
    blob(C.x, C.z, 6, 4.6, 0.75)
    proxy('cabin', C.x + 0.4, 1.6, C.z - 0.6, 3.0, 3.0, 2.0)
    pinAt.cabin.set(C.x + 0.55, 2.35, front)
  }

  // Porch with the radio console (big dial) and the logbook
  const dialKnob = new THREE.Group()
  const vuMat = new THREE.MeshBasicMaterial({ color: warmBase.clone().multiplyScalar(1.3) })
  {
    const P = new THREE.Vector3(0.7, 0, -2.6)
    const awn = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 1.7), roofM)
    awn.position.set(P.x, 2.25, P.z + 0.15)
    awn.rotation.x = -0.12
    scene.add(awn)
    for (const sx of [-1.3, 1.3]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.25, 0.08), wood)
      post.position.set(P.x + sx, 1.12, P.z - 0.6)
      scene.add(post)
    }
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.8), wood)
    desk.position.set(P.x, 0.82, P.z)
    scene.add(desk)
    for (const sx of [-0.9, 0.9]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.8, 0.7), wood)
      leg.position.set(P.x + sx, 0.4, P.z)
      scene.add(leg)
    }
    // radio
    const radio = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.56, 0.5), lambert(0x353a44))
    radio.position.set(P.x + 0.42, 1.14, P.z + 0.06)
    scene.add(radio)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.48), lambert(0x232730))
    face.position.set(P.x + 0.42, 1.14, P.z - 0.195)
    face.rotation.y = Math.PI
    scene.add(face)
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.09, 20), lambert(0xd9d3c4))
    knob.rotation.x = Math.PI / 2
    dialKnob.add(knob)
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }))
    notch.position.set(0, 0.09, -0.05)
    dialKnob.add(notch)
    dialKnob.position.set(P.x + 0.58, 1.12, P.z - 0.24)
    scene.add(dialKnob)
    // the dial's scale: 9 tick marks, one per α
    for (let i = 0; i < 9; i++) {
      const a = (-135 + (270 * i) / 8) * DEG
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, 0.01), new THREE.MeshBasicMaterial({ color: i === 4 ? 0xffffff : 0x9aa0aa }))
      t.position.set(P.x + 0.58 - Math.sin(a) * 0.24, 1.12 + Math.cos(a) * 0.24, P.z - 0.2)
      t.rotation.z = a
      scene.add(t)
    }
    const vu = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.12), vuMat)
    vu.position.set(P.x + 0.13, 1.24, P.z - 0.2)
    vu.rotation.y = Math.PI
    scene.add(vu)
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.9, 4), metal)
    ant.position.set(P.x + 0.82, 1.85, P.z + 0.2)
    ant.rotation.z = -0.2
    scene.add(ant)
    // logbook: an open book with a lamp over it
    const L = new THREE.Vector3(P.x - 0.5, 0.87, P.z - 0.02)
    const paper = new THREE.MeshLambertMaterial({ color: 0xe9e1cc, emissive: 0x3a2e1c, flatShading: true })
    for (const s of [-1, 1]) {
      const pg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.4), paper)
      pg.position.set(L.x + s * 0.155, L.y + 0.02, L.z)
      pg.rotation.z = s * -0.08
      scene.add(pg)
    }
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.02, 0.44), lambert(0x6b2f25))
    cover.position.set(L.x, L.y, L.z)
    scene.add(cover)
    for (let r = 0; r < 6; r++) {
      for (const s of [-1, 1]) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.22 - (r === 5 ? 0.1 : 0), 0.008), new THREE.MeshBasicMaterial({ color: 0x5a5148 }))
        line.rotation.x = -Math.PI / 2
        line.position.set(L.x + s * 0.155, L.y + 0.035 + (s > 0 ? 0 : 0), L.z - 0.14 + r * 0.055)
        line.rotation.z = s * 0.08
        scene.add(line)
      }
    }
    const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 4), dark)
    lampArm.position.set(L.x - 0.38, L.y + 0.28, L.z + 0.12)
    scene.add(lampArm)
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.13, 8, 1, true), dark)
    shade.position.set(L.x - 0.3, L.y + 0.55, L.z + 0.05)
    shade.rotation.z = 0.5
    scene.add(shade)
    const bulb = glow(0xffc27a, 0.6, 0.9)
    bulb.position.set(L.x - 0.28, L.y + 0.49, L.z + 0.04)
    scene.add(bulb)
    blob(P.x, P.z, 3.0, 1.8, 0.7)
    proxy('dial', P.x + 0.45, 1.14, P.z - 0.1, 1.15, 0.8, 0.8)
    proxy('logbook', L.x, L.y + 0.1, L.z, 0.85, 0.4, 0.7)
    pinAt.dial.set(P.x + 0.58, 1.55, P.z - 0.25)
    pinAt.logbook.set(L.x, 1.15, L.z - 0.1)
  }

  // Mast with the beacon, near the edge
  const beacon = glow(0xff4a3a, 1.6, 1)
  const beaconCore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff5040 }))
  {
    const M = new THREE.Vector3(6.6, 0, 1.6)
    const H = 8.2
    const legs: T.Vector3[] = []
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.3
      legs.push(new THREE.Vector3(Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38))
    }
    const top = 0.12
    for (const l of legs) {
      const from = new THREE.Vector3(M.x + l.x, 0, M.z + l.z)
      const to = new THREE.Vector3(M.x + l.x * top, H, M.z + l.z * top)
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, from.distanceTo(to), 4), metal)
      leg.position.copy(from).add(to).multiplyScalar(0.5)
      leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
      scene.add(leg)
    }
    for (let j = 1; j < 9; j++) {
      const y = (H * j) / 9
      const k = 1 - (1 - top) * (y / H)
      for (let a = 0; a < 3; a++) {
        const p0 = legs[a].clone().multiplyScalar(k),
          p1 = legs[(a + 1) % 3].clone().multiplyScalar(k)
        const len = p0.distanceTo(p1)
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 3), metal)
        bar.position.set(M.x + (p0.x + p1.x) / 2, y, M.z + (p0.z + p1.z) / 2)
        bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize())
        scene.add(bar)
      }
    }
    // a small yagi near the top
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), metal)
    boom.rotation.z = Math.PI / 2
    boom.position.set(M.x, H - 0.6, M.z)
    scene.add(boom)
    for (let e = 0; e < 5; e++) {
      const el = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7 - e * 0.06, 3), metal)
      el.rotation.x = Math.PI / 2
      el.position.set(M.x - 0.7 + e * 0.35, H - 0.6, M.z)
      scene.add(el)
    }
    beaconCore.position.set(M.x, H + 0.1, M.z)
    beacon.position.set(M.x, H + 0.1, M.z)
    scene.add(beaconCore, beacon)
    blob(M.x, M.z, 1.6, 1.6, 0.6)
  }

  // Noticeboard by the cabin door
  {
    const B = new THREE.Vector3(6.6, 0, -2.6)
    const g = new THREE.Group()
    g.position.copy(B)
    g.rotation.y = -0.35
    for (const sx of [-0.75, 0.75]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.0, 0.09), wood)
      post.position.set(sx, 1.0, 0)
      g.add(post)
    }
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.05, 0.07), lambert(0x6e5038))
    board.position.set(0, 1.45, 0)
    g.add(board)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 0.3), roofM)
    cap.position.set(0, 2.03, 0)
    g.add(cap)
    const papers: [number, number, number, number, number, number][] = [
      [-0.45, 1.6, 0.42, 0.52, 0.05, 0xece6d6],
      [0.08, 1.55, 0.38, 0.3, -0.06, 0xf1e4b8],
      [0.5, 1.62, 0.3, 0.42, 0.04, 0xdfe6ee],
      [0.0, 1.2, 0.5, 0.3, 0.02, 0xece6d6],
      [0.5, 1.18, 0.3, 0.3, -0.05, 0xd8c6a0],
    ]
    for (const [x, y, w, h, r, c] of papers) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ color: c, emissive: 0x1c1a16 }))
      p.position.set(x, y, -0.04)
      p.rotation.set(0, Math.PI, r)
      g.add(p)
    }
    scene.add(g)
    blob(B.x, B.z, 2.2, 1.0, 0.6)
    const bp = new THREE.Vector3(0, 1.4, 0).applyMatrix4(g.matrix.compose(g.position, g.quaternion, g.scale))
    proxy('board', bp.x, 1.3, bp.z, 1.9, 2.4, 0.9)
    pinAt.board.set(bp.x, 2.35, bp.z)
  }

  // Lanterns along the path
  for (const [x, z] of [
    [-1.6, -3.4],
    [-0.6, 1.8],
    [2.2, 2.2],
  ]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 4), dark)
    post.position.set(x, 0.35, z)
    const g = glow(0xffb26a, 0.9, 0.85)
    g.position.set(x, 0.75, z)
    scene.add(post, g)
  }

  // Tide buoy in the water below
  const BUOY = new THREE.Vector3(-17, SEA, 30)
  const buoy = new THREE.Group()
  const buoyLight = glow(0xffd36a, 2.4, 1)
  {
    const red = lambert(0xc8503a)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.9, 10), red)
    body.position.y = 0.2
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.6, 1.4, 8), red)
    cone.position.y = 1.3
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.2, 10), lambert(0xe8e2d4))
    band.position.y = 0.95
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 3), metal)
    cage.position.y = 2.25
    buoy.add(body, cone, band, cage)
    buoyLight.position.y = 2.6
    buoy.add(buoyLight)
    buoy.position.copy(BUOY)
    scene.add(buoy)
    proxy('buoy', BUOY.x, SEA + 1.4, BUOY.z, 4, 4, 4)
    pinAt.buoy.set(BUOY.x, SEA + 3.6, BUOY.z)
  }
  pickRoot.updateMatrixWorld(true)
  await yieldTask()

  // ---------- camera ----------
  const poses: Record<StationId | 'home', Pose> = {
    home: { tx: 1.4, ty: 3.2, tz: 0.4, yaw: 0.12, pitch: 0.1, fit: 9.4 },
    dish: { tx: DISH.x, ty: 2.4, tz: DISH.z, yaw: -0.5, pitch: 0.2, fit: 3.2 },
    cabin: { tx: 3.9, ty: 1.55, tz: -2.6, yaw: 0.18, pitch: 0.08, fit: 1.9 },
    dial: { tx: 1.25, ty: 1.12, tz: -2.84, yaw: 0.05, pitch: 0.2, fit: 0.75 },
    logbook: { tx: 0.2, ty: 0.9, tz: -2.62, yaw: -0.15, pitch: 0.75, fit: 0.65 },
    buoy: { tx: BUOY.x, ty: SEA + 1.4, tz: BUOY.z, yaw: -0.35, pitch: 0.3, fit: 3.2 },
    board: { tx: 6.7, ty: 1.45, tz: -2.9, yaw: 0.45, pitch: 0.08, fit: 1.3 },
  }
  const cur = { ...poses.home, yaw: 0.34, pitch: 0.34, fit: 13.5 }
  const goal = { ...poses.home }
  let fly: { from: Pose; to: Pose; t0: number; dur: number } | null = null
  let focused: StationId | null = null
  let follow = false
  let zoom = 0 // 0 · 1 · 2 steps in
  const ZOOM = [1, 0.74, 0.55]
  const inset = { l: 0, r: 0, t: 0, b: 0 }
  const insetC = { l: 0, r: 0, t: 0, b: 0 }
  const look = new THREE.Vector3()
  let W = 1,
    H = 1

  const distFor = (fit: number) => {
    const vh = (camera.fov * DEG) / 2
    const fw = Math.max(80, W - insetC.l - insetC.r),
      fh = Math.max(80, H - insetC.t - insetC.b)
    // the uncovered window's own half-angles
    const vv = Math.atan(Math.tan(vh) * (fh / H))
    const hh = Math.atan(Math.tan(vh) * (fw / H))
    return fit / Math.sin(Math.min(vv, hh))
  }
  const placeCamera = () => {
    const d = distFor(cur.fit)
    const cp = Math.cos(cur.pitch)
    camera.position.set(cur.tx + Math.sin(cur.yaw) * cp * d, cur.ty + Math.sin(cur.pitch) * d, cur.tz - Math.cos(cur.yaw) * cp * d)
    const gy = height(camera.position.x, camera.position.z) + 1.2
    if (camera.position.y < gy) camera.position.y = gy
    look.set(cur.tx, cur.ty, cur.tz)
    camera.lookAt(look)
    const ox = (insetC.r - insetC.l) / 2,
      oy = (insetC.b - insetC.t) / 2
    if (Math.abs(ox) > 0.5 || Math.abs(oy) > 0.5) camera.setViewOffset(W, H, ox, oy, W, H)
    else camera.clearViewOffset()
  }
  const startFly = (to: Pose, dur = 1100) => {
    if (reduced) {
      Object.assign(cur, to)
      Object.assign(goal, to)
      fly = null
      return
    }
    fly = { from: { ...cur }, to: { ...to }, t0: performance.now(), dur }
    Object.assign(goal, to)
  }
  // the opening move: settle from a high wide view into the hilltop
  if (!reduced) startFly(poses.home, 2600)
  else Object.assign(cur, poses.home)

  // ---------- state driven by DOM ----------
  let dialGoal = 0,
    dialCur = 0,
    warmGoal = 0,
    warmCur = 0
  const dishCur = { az: 160, el: 20 }
  let ambientUntil = performance.now() + (reduced ? 0 : 11000)
  let tAmb = 0
  let hover: StationId | null = null
  let first = true

  // ---------- frame ----------
  const v = new THREE.Vector3()
  const proj = (p: T.Vector3): Screen => {
    v.copy(p).project(camera)
    const x = ((v.x + 1) / 2) * W,
      y = ((1 - v.y) / 2) * H
    return { x, y, on: v.z < 1 && x > -20 && x < W + 20 && y > -20 && y < H + 20 }
  }
  let status: SkyStatus = sky.status()
  const satDir = new THREE.Vector3(),
    sunDir = new THREE.Vector3(),
    risePt = new THREE.Vector3()
  let lastSkyFull = 0
  const updateSky = (perfNow: number) => {
    status = sky.status()
    const s = status.sun
    skyDir(s.az, s.el, sunDir)
    sunU.value.copy(sunDir)
    const day = smooth(-6, 12, s.el)
    sunGlow.position.copy(sunDir).multiplyScalar(850)
    sunGlow.visible = s.el > -2
    starU.uFade.value = 1 - smooth(-14, -2, s.el)
    hemi.intensity = 0.75 + day * 0.9
    hemi.color.setRGB(0.49 + day * 0.3, 0.58 + day * 0.25, 0.8 + day * 0.1)
    key.intensity = 0.7 + day * 1.5
    if (day > 0) key.position.copy(sunDir).multiplyScalar(60)
    else key.position.set(-30, 40, -20)
    key.color.setRGB(0.62 + day * 0.4, 0.7 + day * 0.25, 0.9 + day * 0.02)
    const fogC = new THREE.Color(0x0b1220).lerp(new THREE.Color(0x2a3c58), day)
    fog.color.copy(fogC)
    ;(seaU.uHorizon.value as T.Color).copy(new THREE.Color(0x0f1a2c).lerp(new THREE.Color(0x2c4868), day))
    ;(seaU.uDeep.value as T.Color).copy(new THREE.Color(0x03070d).lerp(new THREE.Color(0x091828), day))
    setSidereal(status.sim)
    const sat = status.sat
    if (sat && sat.el > -1) {
      skyDir(sat.az, sat.el, satDir)
      satGlow.position.copy(satDir).multiplyScalar(600)
      satCore.position.copy(satGlow.position)
      satGlow.visible = satCore.visible = true
      const c = sat.sunlit ? 0xffffff : 0xff8a70
      ;(satGlow.material as T.SpriteMaterial).color.setHex(c)
      ;(satCore.material as T.SpriteMaterial).color.setHex(c)
      ;(satGlow.material as T.SpriteMaterial).opacity = sat.sunlit ? 0.9 : 0.4
    } else satGlow.visible = satCore.visible = false
    const np = status.next
    if (np && np.aos !== arcFor) {
      arcFor = np.aos
      const pts = sky.arc(np).map((l) => skyDir(l.az, Math.max(l.el, -2), new THREE.Vector3()).multiplyScalar(620))
      arcGeo.setFromPoints(pts)
      arc.computeLineDistances()
      const a = sky.satLook(np.aos)
      if (a) skyDir(a.az, a.el, risePt).multiplyScalar(620)
    }
    arc.visible = !!np
    lastSkyFull = perfNow
  }

  const dishGoal = () => {
    const sat = status.sat
    if (sat && sat.el > 0) return { az: sat.az, el: sat.el }
    const np = status.next
    // parked toward where the next pass rises, a little above the mask
    if (np) return { az: np.aosAz, el: MASK_DEG + 4 }
    return { az: 180, el: 88 }
  }

  let raf = 0
  let last = performance.now()
  let visible = !document.hidden
  let disposed = false
  const render = () => renderer.render(scene, camera)

  const step = (now: number, dt: number) => {
    let busy = false
    // sky: warp/pass playback; refresh the sky state every frame while warping, else at most 4×/s
    if (sky.step(now)) busy = true
    if (busy || now - lastSkyFull > 250) updateSky(now)
    // camera
    if (fly) {
      const t = Math.min(1, (now - fly.t0) / fly.dur)
      const e = easeIO(t)
      const f = fly.from,
        to = fly.to
      // shortest yaw path
      let dy = to.yaw - f.yaw
      dy = Math.atan2(Math.sin(dy), Math.cos(dy))
      cur.tx = f.tx + (to.tx - f.tx) * e
      cur.ty = f.ty + (to.ty - f.ty) * e
      cur.tz = f.tz + (to.tz - f.tz) * e
      cur.yaw = f.yaw + dy * e
      cur.pitch = f.pitch + (to.pitch - f.pitch) * e
      // arc out a little on long flights so the move reads as a flight, not a zoom
      cur.fit = f.fit + (to.fit - f.fit) * e + Math.sin(Math.PI * e) * Math.min(3, Math.abs(to.fit - f.fit) * 0.35)
      if (t >= 1) {
        fly = null
        o.onSettle?.()
      }
      busy = true
    } else {
      if (follow && status.sat && status.sat.el > 0) {
        const s = status.sat
        goal.yaw = (s.az * DEG + Math.PI) % (Math.PI * 2)
        goal.pitch = -clamp(s.el * 0.6, 4, 32) * DEG
        goal.tx = DISH.x + Math.sin(s.az * DEG) * 4
        goal.tz = DISH.z - Math.cos(s.az * DEG) * 4
        goal.ty = 3 + Math.min(s.el, 45) * 0.12
        goal.fit = 7
      }
      const k = reduced ? 1 : 1 - Math.exp(-dt * 7)
      let moved = 0
      for (const key of ['tx', 'ty', 'tz', 'yaw', 'pitch', 'fit'] as const) {
        let d = goal[key] - cur[key]
        if (key === 'yaw') d = Math.atan2(Math.sin(d), Math.cos(d))
        cur[key] += d * k
        moved = Math.max(moved, Math.abs(d))
      }
      if (moved > 0.0008) busy = true
    }
    const ik = reduced ? 1 : 1 - Math.exp(-dt * 6)
    let dI = 0
    for (const k of ['l', 'r', 't', 'b'] as const) {
      const d = inset[k] - insetC[k]
      insetC[k] += d * ik
      dI += Math.abs(d)
    }
    if (dI > 0.5) busy = true
    placeCamera()

    // dish slews at a rate limit toward the satellite (or its parking direction)
    const dg = dishGoal()
    let daz = dg.az - dishCur.az
    daz = ((daz + 540) % 360) - 180
    const del = dg.el - dishCur.el
    const rate = reduced ? 999 : (sky.mode === 'pass' ? 120 : 28) * dt
    dishCur.az += clamp(daz, -rate, rate)
    dishCur.el += clamp(del, -rate * 0.7, rate * 0.7)
    if (Math.abs(daz) > 0.05 || Math.abs(del) > 0.05) busy = true
    dishAz.rotation.y = -dishCur.az * DEG
    dishEl.rotation.x = (dishCur.el - 90) * DEG

    // dial and cabin warmth
    const kd = reduced ? 1 : 1 - Math.exp(-dt * 10)
    dialCur += (dialGoal - dialCur) * kd
    warmCur += (warmGoal - warmCur) * (reduced ? 1 : 1 - Math.exp(-dt * 4))
    if (Math.abs(dialGoal - dialCur) + Math.abs(warmGoal - warmCur) > 0.002) busy = true
    dialKnob.rotation.z = dialCur
    if (warmCur >= 0) warmNow.copy(warmBase).lerp(warmHot, warmCur)
    else warmNow.copy(warmBase).lerp(warmCold, -warmCur)
    const bright = 1 + warmCur * 0.45
    cabinLight.color.copy(warmNow)
    cabinLight.intensity = 14 * bright
    porchLight.color.copy(warmNow)
    windowMat.color.copy(warmNow).multiplyScalar(0.9 * bright)
    ;(windowGlow.material as T.SpriteMaterial).color.copy(warmNow)
    vuMat.color.copy(warmNow).multiplyScalar(1.3 * bright)
    ;(seaU.uWarm.value as T.Color).copy(warmNow)

    // ambient life: water, buoy bob, beacon. Advances only while the loop is awake.
    const amb = now < ambientUntil
    if (amb) {
      tAmb += dt
      busy = true
    }
    seaU.uT.value = tAmb
    buoy.position.y = BUOY.y + Math.sin(tAmb * 1.3) * 0.12
    buoy.rotation.z = Math.sin(tAmb * 0.9) * 0.07
    buoy.rotation.x = Math.sin(tAmb * 1.1 + 1) * 0.05
    const sec = Date.now() / 1000
    const blink = amb ? Math.pow(Math.max(0, Math.sin(sec * Math.PI)), 6) : Math.floor(sec) % 2 === 0 ? 1 : 0.15
    ;(beacon.material as T.SpriteMaterial).opacity = 0.2 + 0.8 * blink
    ;(buoyLight.material as T.SpriteMaterial).opacity = 0.25 + 0.75 * (amb ? Math.pow(Math.max(0, Math.sin(sec * 2.1)), 8) : 1 - blink * 0.7)
    seaU.uCam.value.copy(camera.position)
    return busy
  }

  const emitFrame = () => {
    const pins = {} as Record<StationId, Screen>
    for (const id of STATION_IDS) pins[id] = proj(pinAt[id])
    const s = status.sat
    o.onFrame({
      pins,
      sat: s && satGlow.visible ? { ...proj(satGlow.position), up: s.el >= MASK_DEG, el: s.el, az: s.az, sunlit: s.sunlit } : null,
      rise: arc.visible && !(s && s.el > 0) ? proj(risePt) : null,
    })
  }

  const frame = (now: number) => {
    raf = 0
    if (disposed || !visible) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const busy = step(now, dt)
    render()
    emitFrame()
    if (busy) raf = requestAnimationFrame(frame)
  }
  const kick = (ms = 0) => {
    if (ms && !reduced) ambientUntil = Math.max(ambientUntil, performance.now() + ms)
    if (!raf && visible && !disposed) {
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
  }
  // idle heartbeat: the satellite and beacon move once a second (every 10 s under reduced motion)
  let beat = 0
  const startBeat = () => {
    clearInterval(beat)
    beat = window.setInterval(() => kick(), reduced ? 10000 : 1000)
  }
  startBeat()
  const onVis = () => {
    visible = !document.hidden
    if (visible) kick()
  }
  document.addEventListener('visibilitychange', onVis)

  // ---------- resize ----------
  const resize = () => {
    const r = canvas.getBoundingClientRect()
    W = Math.max(1, r.width)
    H = Math.max(1, r.height)
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap))
    renderer.setSize(W, H, false)
    camera.aspect = W / H
    camera.fov = W / H < 0.8 ? 50 : 40
    camera.updateProjectionMatrix()
    starU.uScale.value = Math.min(devicePixelRatio || 1, dprCap)
    kick()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  // ---------- input ----------
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const pick = (cx: number, cy: number): StationId | null => {
    const r = canvas.getBoundingClientRect()
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(pickRoot.children, false)[0]
    return (hit?.object.userData.station as StationId) ?? null
  }
  const pointers = new Map<number, { x: number; y: number }>()
  let down: { x: number; y: number; t: number; id: StationId | null; moved: number; dial: boolean; dialAcc: number } | null = null
  let pinch = 0
  const yawRange = () => (focused ? 0.5 : 0.85)
  const base = () => (focused ? poses[focused] : poses.home)
  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId)
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      pinch = Math.hypot(a.x - b.x, a.y - b.y)
      down = null
      return
    }
    const id = pick(e.clientX, e.clientY)
    down = { x: e.clientX, y: e.clientY, t: performance.now(), id, moved: 0, dial: id === 'dial', dialAcc: 0 }
    if (follow) follow = false
    kick(4000)
  }
  const onMove = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId)
    if (!p) {
      // hover (mouse only)
      if (e.pointerType === 'mouse') {
        const h = pick(e.clientX, e.clientY)
        if (h !== hover) {
          hover = h
          canvas.style.cursor = h ? 'pointer' : 'grab'
          o.onHover(h)
        }
      }
      return
    }
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y
    p.x = e.clientX
    p.y = e.clientY
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch && Math.abs(d - pinch) > 50) {
        setZoom(zoom + (d > pinch ? 1 : -1))
        pinch = d
      }
      return
    }
    if (!down) return
    down.moved += Math.abs(dx) + Math.abs(dy)
    if (down.dial) {
      // drag sideways (or up/down) across the dial to walk the α values
      down.dialAcc += dx - dy
      const stepPx = 26
      while (Math.abs(down.dialAcc) >= stepPx) {
        const s = Math.sign(down.dialAcc)
        down.dialAcc -= s * stepPx
        o.onDial(s)
      }
      return
    }
    const b = base()
    const r = yawRange()
    goal.yaw = clamp(goal.yaw - dx * 0.0042, b.yaw - r, b.yaw + r)
    goal.pitch = clamp(goal.pitch + dy * 0.003, Math.max(-0.12, b.pitch - 0.25), Math.min(1.1, b.pitch + 0.4))
    canvas.style.cursor = 'grabbing'
    kick(3000)
  }
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId)
    if (pointers.size < 2) pinch = 0
    if (!down) return
    const tap = down.moved < 8 && performance.now() - down.t < 600
    if (tap && down.id) o.onPick(down.id)
    else if (down.dial && down.moved >= 8) o.onPick('dial')
    canvas.style.cursor = hover ? 'pointer' : 'grab'
    down = null
  }
  let wheelAt = 0
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const now = performance.now()
    if (now - wheelAt < 280 || Math.abs(e.deltaY) < 4) return
    wheelAt = now
    setZoom(zoom + (e.deltaY < 0 ? 1 : -1))
  }
  const setZoom = (z: number) => {
    zoom = clamp(z, 0, 2)
    goal.fit = base().fit * ZOOM[zoom]
    kick(1500)
  }
  const onLeave = () => {
    if (hover) {
      hover = null
      o.onHover(null)
    }
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  const onLost = (e: Event) => {
    e.preventDefault()
    o.onLost()
  }
  canvas.addEventListener('webglcontextlost', onLost)

  // compile everything before the first visible frame so the reveal doesn't hitch
  updateSky(performance.now())
  placeCamera()
  await (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve())
  render()
  emitFrame()
  kick()

  return {
    focus(id) {
      focused = id
      follow = false
      zoom = 0
      startFly(id ? poses[id] : poses.home, id === 'buoy' || focused === 'buoy' ? 1400 : 1100)
      kick(2500)
    },
    setInset(l, r, t, b) {
      Object.assign(inset, { l, r, t, b })
      if (reduced || first) Object.assign(insetC, inset)
      first = false
      kick()
    },
    setDial(index, warmth) {
      dialGoal = (-135 + (270 * index) / 8) * DEG
      warmGoal = clamp(warmth, -1, 1)
      kick()
    },
    setReduced(r) {
      reduced = r
      if (r) ambientUntil = 0
      startBeat()
      kick()
    },
    followSat(on) {
      follow = on && !focused
      if (!on) Object.assign(goal, poses.home)
      kick(2000)
    },
    kick,
    resize,
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      clearInterval(beat)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('webglcontextlost', onLost)
      scene.traverse((x) => {
        const m = x as T.Mesh
        m.geometry?.dispose()
        const mat = m.material as T.Material | T.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((q) => q.dispose())
        else mat?.dispose()
      })
      glowTex.dispose()
      blobTex.dispose()
      renderer.dispose()
    },
  }
}
