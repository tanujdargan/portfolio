// W4/W5 · Drive: the live world, shared by the first-person (W4) and third-person (W5) variants.
// Loaded on demand (its own chunk). The static world was modelled and lit in Blender (public/drive/src): sky and lamp
// irradiance plus a sun-shadow term are baked into vertex colours, so the runtime is one PBR-lite shader (shaders.ts)
// that adds the low sun per pixel over ambientCG textures, aerial perspective from the HDRI sky, the car's own shadow,
// fir and grass impostors lit by the baked light under them, planar reflections on the river and lake, and a car with
// clearcoat paint lit by the same sky. Post: bloom, a light grade, a vignette. Resolution adapts to hold 60 fps.
// The car follows the route spline; nothing here can get lost.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { WORLD_VERT, WORLD_FRAG, SKY_VERT, SKY_FRAG, TREE_VERT, TREE_FRAG, GRASS_VERT, GRASS_FRAG, GLOW_VERT, GLOW_FRAG, WATER_VERT, WATER_FRAG, VIGNETTE } from './shaders'
import { STATION_IDS, type StationId } from './stations'

export type View = 'fp' | 'tp'
export interface Pin {
  x: number
  y: number
  on: boolean
}
interface Meta {
  len: number
  step: number
  p: number[][]
  l: number[][]
  k: number[]
  zones: { bridge: number[]; tunnel: number[]; city: number; water: number; river: number }
  stations: Record<StationId, { s: number; look?: number[]; sign?: number[] }>
  hairpin: number
  lights: [number, number, number, string][]
  sun: number[]
  moon: number[]
  city: number[]
}
export interface DriveState {
  s: number
  v: number
  frac: number
  near: StationId | null
  moving: boolean
}
export interface WorldOpts {
  canvas: HTMLCanvasElement
  view: View
  mobile: boolean
  reduced: boolean
  onProgress?: (p: number) => void
  onState?: (s: DriveState) => void
  onArrive?: (id: StationId) => void
  onPins?: (p: Record<StationId, Pin>) => void
  onLost?: () => void
}
export interface WorldApi {
  stations: Record<StationId, number>
  len: number
  start: () => void
  /** auto-drive to a station (or an arc length) and stop there */
  driveTo: (to: StationId | number, opts?: { arrive?: boolean }) => void
  /** jump without driving (deep links, the sheet opened from the rail) */
  teleport: (to: StationId | number, v0?: number) => void
  /** -1 brake / reverse … +1 throttle, held */
  throttle: (x: number) => void
  /** a wheel or scroll impulse in metres of road */
  nudge: (ds: number) => void
  /** progress scrubber, 0..1 */
  scrub: (f: number) => void
  setInsets: (i: { right?: number; bottom?: number; top?: number }) => void
  setPaused: (p: boolean) => void
  /** stills and posters: put the car at s, settle the camera, render once */
  pose: (s: number, o?: { look?: StationId; t?: number }) => void
  project: () => Record<StationId, Pin>
  dispose: () => void
}

const BASE = '/drive/'
/** where the drive begins: the poster is rendered from exactly here, so the live world fades in over it */
export const START_S = 150
const CITY_LANE = -2.6
const MTN_LANE = -2.1
const EYE = new THREE.Vector3(-0.42, 1.06, -0.37)
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt))

// ------------------------------------------------------------------ canvas textures
function roadTex(kind: 'city' | 'mtn') {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 512
  const g = c.getContext('2d')!
  const img = g.createImageData(256, 512)
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = 0
    img.data[i + 1] = 0
    img.data[i + 2] = Math.random() * 255
    img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const line = (u: number, w: number, ch: 'r' | 'g', dash?: [number, number]) => {
    g.fillStyle = ch === 'r' ? 'rgb(255,0,128)' : 'rgb(0,255,128)'
    const x = u * 256 - (w * 256) / 2
    if (!dash) g.fillRect(x, 0, Math.max(2, w * 256), 512)
    else g.fillRect(x, dash[0] * 512, Math.max(2, w * 256), (dash[1] - dash[0]) * 512)
  }
  if (kind === 'city') {
    const u = (o: number) => (o + 10.5) / 21
    line(u(-10.0), 0.008, 'r')
    line(u(10.0), 0.008, 'r')
    line(u(-0.75), 0.006, 'g')
    line(u(0.75), 0.006, 'g')
    for (const o of [-4.4, 4.4]) line(u(o), 0.006, 'r', [0, 0.25])
  } else {
    const u = (o: number) => (o + 4.6) / 9.2
    line(u(-4.25), 0.016, 'r')
    line(u(4.25), 0.016, 'r')
    line(u(-0.09), 0.012, 'g', [0, 0.36])
    line(u(0.09), 0.012, 'g', [0, 0.36])
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.ClampToEdgeWrapping
  t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  t.colorSpace = THREE.NoColorSpace
  return t
}

function windowTex() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#000'
  g.fillRect(0, 0, 512, 512)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  // 32 bays of 1.6 m by 16 floors of 3.6 m per tile; offices lit in bands, a few warm homes, many dark
  for (let fy = 0; fy < 16; fy++) {
    const band = rnd()
    const warm = rnd() < 0.55
    let run = 0
    let on = false
    for (let wx = 0; wx < 32; wx++) {
      if (run <= 0) {
        run = 2 + Math.floor(rnd() * 7)
        on = rnd() < (band > 0.7 ? 0.8 : band > 0.35 ? 0.4 : 0.12)
      }
      run--
      if (!on) continue
      const k = 0.35 + rnd() * 0.5
      g.fillStyle = warm ? `rgb(${255 * k},${190 * k},${120 * k})` : `rgb(${175 * k},${205 * k},${255 * k})`
      g.fillRect(wx * 16 + 2, fy * 32 + 9, 12, 17)
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function chevronTex() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 160
  const g = c.getContext('2d')!
  g.fillStyle = '#f2c230'
  g.fillRect(0, 0, 128, 160)
  g.fillStyle = '#111'
  g.beginPath()
  for (const x0 of [20, 66]) {
    g.moveTo(x0 + 40, 20)
    g.lineTo(x0, 80)
    g.lineTo(x0 + 40, 140)
    g.lineTo(x0 + 58, 140)
    g.lineTo(x0 + 18, 80)
    g.lineTo(x0 + 58, 20)
    g.closePath()
  }
  g.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function flakeTex() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const img = g.createImageData(256, 256)
  for (let i = 0; i < img.data.length; i += 4) {
    const a = Math.random() * Math.PI * 2,
      r = Math.random() ** 3 * 0.9
    img.data[i] = 128 + Math.cos(a) * r * 127
    img.data[i + 1] = 128 + Math.sin(a) * r * 127
    img.data[i + 2] = 255
    img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(30, 30)
  t.colorSpace = THREE.NoColorSpace
  return t
}

function blobTex() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64)
  gr.addColorStop(0, 'rgba(0,0,0,0.85)')
  gr.addColorStop(0.55, 'rgba(0,0,0,0.5)')
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

// ------------------------------------------------------------------ the route
class Route {
  P: Float32Array
  L: Float32Array
  K: Float32Array
  n: number
  step: number
  len: number
  city: number
  constructor(m: Meta) {
    this.n = m.p.length
    this.step = m.step
    this.len = m.len
    this.city = m.zones.city
    this.P = new Float32Array(m.p.flat())
    this.L = new Float32Array(m.l.flat())
    this.K = new Float32Array(m.k)
  }
  private lerp(arr: Float32Array, s: number, out: THREE.Vector3) {
    const f = Math.min(Math.max(s / this.step, 0), this.n - 1.001)
    const i = Math.floor(f)
    const t = f - i
    const a = i * 3,
      b = (i + 1) * 3
    return out.set(arr[a] + (arr[b] - arr[a]) * t, arr[a + 1] + (arr[b + 1] - arr[a + 1]) * t, arr[a + 2] + (arr[b + 2] - arr[a + 2]) * t)
  }
  pos(s: number, out: THREE.Vector3) {
    return this.lerp(this.P, s, out)
  }
  left(s: number, out: THREE.Vector3) {
    return this.lerp(this.L, s, out).normalize()
  }
  curv(s: number) {
    const f = Math.min(Math.max(s / this.step, 0), this.n - 1.001)
    const i = Math.floor(f)
    return this.K[i] + (this.K[i + 1] - this.K[i]) * (f - i)
  }
  hw(s: number) {
    return 10.5 - 5.9 * smooth(this.city, this.city + 120, s)
  }
  lane(s: number) {
    const k = smooth(this.city, this.city + 120, s)
    return CITY_LANE + (MTN_LANE - CITY_LANE) * k
  }
  bank(s: number) {
    return Math.min(0.07, Math.max(-0.07, -this.curv(s) * 2.0))
  }
  /** a point on the driving line (lane offset and banking applied) */
  private tl = new THREE.Vector3()
  line(s: number, out: THREE.Vector3, lat = this.lane(s)) {
    const p = this.pos(s, out)
    const l = this.left(s, this.tl)
    p.addScaledVector(l, lat)
    p.y += this.bank(s) * lat
    return p
  }
  /** curvature-limited speed, m/s */
  vmax(s: number) {
    let v = 34
    for (let d = 0; d <= 90; d += 10) {
      const k = Math.abs(this.curv(s + d))
      const vl = Math.sqrt(5.2 / Math.max(k, 1e-4))
      v = Math.min(v, Math.sqrt(vl * vl + 2 * 6 * d))
    }
    return Math.max(v, 9)
  }
}
const _v1 = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _v3 = new THREE.Vector3()
const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()

// ------------------------------------------------------------------ load
async function fetchBin(url: string) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(url)
  return r.arrayBuffer()
}

export async function createWorld(o: WorldOpts): Promise<WorldApi> {
  const { canvas, view, mobile } = o
  const qs = new URLSearchParams(location.search)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', logarithmicDepthBuffer: true })
  const dprMax = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75)
  let dpr = Math.min(dprMax, mobile ? 1.25 : 1.5)
  renderer.setPixelRatio(dpr)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = Number(qs.get('exp') ?? 0.72)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  let lost = false
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
    o.onLost?.()
  }
  canvas.addEventListener('webglcontextlost', onLost)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.06, 22000)
  let lastT = performance.now()
  const clock = {
    getDelta: () => {
      const n = performance.now()
      const d = (n - lastT) / 1000
      lastT = n
      return d
    },
  }

  // progress across the files (rough byte weights)
  const parts = { world: 0, car: 0, rest: 0 }
  const report = () => o.onProgress?.(parts.world * 0.65 + parts.car * 0.15 + parts.rest * 0.2)
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const load = (url: string, key: keyof typeof parts) =>
    new Promise<THREE.Group>((res, rej) =>
      loader.load(
        BASE + url,
        (g) => {
          parts[key] = 1
          report()
          res(g.scene)
        },
        (e) => {
          if (e.total) {
            parts[key] = e.loaded / e.total
            report()
          }
        },
        rej,
      ),
    )
  const texLoader = new THREE.TextureLoader()
  let nTex = 0
  const TEXN = 20
  const loadTex = (u: string, srgb = true, rep = true) =>
    new Promise<THREE.Texture>((res, rej) =>
      texLoader.load(
        BASE + u,
        (t) => {
          t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
          if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping
          t.anisotropy = mobile ? 4 : 8
          parts.rest = ++nTex / TEXN
          report()
          res(t)
        },
        undefined,
        rej,
      ),
    )
  const LAYERS = ['grass', 'forest', 'rock', 'snow', 'gravel', 'asphalt', 'concrete'] as const
  const [meta, [treeBuf, grassBuf], worldG, carG, signs, carAo, skyTex, treeC, treeN, grassTex, ...layerTex] = await Promise.all([
    fetch(BASE + 'meta.json').then((r) => r.json() as Promise<Meta>),
    fetchBin(BASE + 'trees.bin').then((t) => Promise.all([t, fetchBin(BASE + 'grass.bin')])),
    load('world.glb', 'world'),
    load('car.glb', 'car'),
    loadTex('signs.webp', false, false),
    loadTex('car_ao.webp', false, false),
    loadTex('sky.webp', true, false),
    loadTex('trees_color.webp', true, false),
    loadTex('trees_normal.webp', false, false),
    loadTex('grass.webp', true, false),
    ...LAYERS.flatMap((l) => [loadTex(`tex/${l}_c.webp`), loadTex(`tex/${l}_nr.webp`, false)]),
  ])
  const T_ = Object.fromEntries(LAYERS.flatMap((l, i) => [[l + 'C', layerTex[i * 2]], [l + 'N', layerTex[i * 2 + 1]]])) as Record<string, THREE.Texture>
  skyTex.wrapS = THREE.RepeatWrapping
  skyTex.generateMipmaps = true
  skyTex.minFilter = THREE.LinearMipmapLinearFilter
  const route = new Route(meta)
  const sun = new THREE.Vector3(...meta.sun).normalize()
  const SUN_COL = new THREE.Color(1.0, 0.66, 0.4).multiplyScalar(Number(qs.get('sun') ?? 14))

  // ---------------------------------------------------------------- shared uniforms
  const U = {
    uSkyTex: { value: skyTex },
    uSkyGain: { value: Number(qs.get('sky') ?? 3.6) },
    uSunDir: { value: sun },
    uSunCol: { value: new THREE.Vector3(SUN_COL.r, SUN_COL.g, SUN_COL.b) },
    uFogD: { value: Number(qs.get('fog') ?? 0.00013) },
    uFogH: { value: 650 },
    uAmb: { value: Number(qs.get('amb') ?? 0.75) },
    uHL: { value: new THREE.Vector3() },
    uHD: { value: new THREE.Vector3(1, 0, 0) },
    uHon: { value: 0.3 },
    uTL: { value: new THREE.Vector3() },
    uTon: { value: 1 },
    uTime: { value: 0 },
    uCarSh: { value: null as THREE.Texture | null },
    uCarShM: { value: new THREE.Matrix4() },
    uCarShOn: { value: 0 },
    uSnowLine: { value: 1250 },
    tGrassC: { value: T_.grassC }, tGrassN: { value: T_.grassN },
    tForestC: { value: T_.forestC }, tForestN: { value: T_.forestN },
    tRockC: { value: T_.rockC }, tRockN: { value: T_.rockN },
    tSnowC: { value: T_.snowC }, tSnowN: { value: T_.snowN },
    tGravelC: { value: T_.gravelC }, tGravelN: { value: T_.gravelN },
    tAsphC: { value: T_.asphaltC }, tAsphN: { value: T_.asphaltN },
    tConcC: { value: T_.concreteC }, tConcN: { value: T_.concreteN },
  }
  const mats = new Map<string, THREE.ShaderMaterial>()
  const roadCity = roadTex('city'),
    roadMtn = roadTex('mtn'),
    wins = windowTex(),
    chev = chevronTex()
  signs.flipY = false
  signs.anisotropy = 8
  signs.needsUpdate = true
  const SIGN_CELL: Record<string, number> = { sign_dock: 0, sign_pad: 1, sign_log: 2, sign_model: 3, sign_pier: 4, sign_board: 5 }
  const CONC = new Set(['concrete', 'tunnel', 'portal', 'tower', 'stone', 'hut'])
  const METAL = new Set(['metal', 'cable', 'dish', 'frame'])
  const worldMat = (src: THREE.MeshStandardMaterial) => {
    const name = src.name
    const hit = mats.get(name)
    if (hit) return hit
    const defines: Record<string, string> = {}
    let map: THREE.Texture | null = null
    let cell = new THREE.Vector4(0, 0, 1, 1)
    let retro = 0
    let emit = 0
    if (name === 'terrain') defines.TERRAIN = ''
    else if (name === 'road_city' || name === 'road_mtn') {
      defines.ROAD = ''
      map = name === 'road_city' ? roadCity : roadMtn
      retro = 0.1
    } else if (name === 'facade_glass' || name === 'facade_stone') {
      defines.FACADE = ''
      if (name === 'facade_glass') defines.GLASS = ''
      map = wins
    } else if (name in SIGN_CELL) {
      defines.SIGN = ''
      map = signs
      const i = SIGN_CELL[name]
      cell = new THREE.Vector4((i % 2) / 2, Math.floor(i / 2) / 3, 0.5, 1 / 3)
      retro = 0.4
      emit = name === 'sign_dock' ? 1.6 : 0.9
    } else if (name === 'chevron') {
      defines.CHEVRON = ''
      map = chev
      retro = 1.6
    } else if (name === 'lamp' || name === 'red') {
      defines.EMISSIVE = ''
      emit = name === 'red' ? 6 : 4
    } else if (name === 'reflector' || name === 'post') {
      defines.PLAIN = ''
      retro = 2.5
    } else if (CONC.has(name) || name === 'gravel' || name === 'roof') defines.CONC = ''
    else if (METAL.has(name)) defines.METAL = ''
    else defines.PLAIN = ''
    const alb = src.color ? src.color.clone() : new THREE.Color(0.2, 0.2, 0.2)
    const m = new THREE.ShaderMaterial({
      name,
      defines,
      vertexColors: true,
      uniforms: { ...U, uAlb: { value: new THREE.Vector3(alb.r, alb.g, alb.b) }, uRetro: { value: retro }, uEmit: { value: emit }, uMap: { value: map }, uCell: { value: cell }, uFlipU: { value: 1 } },
      vertexShader: WORLD_VERT,
      fragmentShader: WORLD_FRAG,
      side: name === 'tunnel' || name === 'portal' ? THREE.DoubleSide : THREE.FrontSide,
    })
    mats.set(name, m)
    return m
  }

  // ---------------------------------------------------------------- world meshes
  let waterMesh: THREE.Mesh | null = null
  const worldMeshes: THREE.Mesh[] = []
  worldG.traverse((n) => (n as THREE.Mesh).isMesh && worldMeshes.push(n as THREE.Mesh))
  for (const m of worldMeshes) {
    const src = m.material as THREE.MeshStandardMaterial
    if (src.name === 'water') {
      waterMesh = m
      continue
    }
    m.material = worldMat(src)
  }
  if (waterMesh) (waterMesh as THREE.Mesh).removeFromParent()
  worldG.updateMatrixWorld(true)
  worldG.traverse((n) => {
    n.matrixAutoUpdate = false
  })
  scene.add(worldG)

  // ---------------------------------------------------------------- sky dome
  const skyMat = new THREE.ShaderMaterial({ uniforms: { ...U, uSunDisc: { value: 1 } }, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(15000, 64, 32), skyMat)
  sky.renderOrder = -10
  sky.frustumCulled = false
  scene.add(sky)

  // ---------------------------------------------------------------- water: river and lake, mirrored
  const reflectors: Reflector[] = []
  if (waterMesh) {
    const g = (waterMesh as THREE.Mesh).geometry as THREE.BufferGeometry
    const pos = g.getAttribute('position')
    const idx = g.getIndex()!
    const parent = (waterMesh as THREE.Mesh).matrixWorld
    const v = new THREE.Vector3()
    const groups: Record<'river' | 'lake', number[]> = { river: [], lake: [] }
    for (let t = 0; t < idx.count; t += 3) {
      v.fromBufferAttribute(pos, idx.getX(t)).applyMatrix4(parent)
      groups[v.y > 50 ? 'lake' : 'river'].push(idx.getX(t), idx.getX(t + 1), idx.getX(t + 2))
    }
    for (const k of ['river', 'lake'] as const) {
      const tri = groups[k]
      if (!tri.length) continue
      const P: number[] = []
      let y = 0
      for (const i of tri) {
        v.fromBufferAttribute(pos, i).applyMatrix4(parent)
        y = v.y
        P.push(v.x, -v.z, 0)
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
      const sh = {
        uniforms: { ...THREE.UniformsUtils.clone({ color: { value: new THREE.Color() }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() }, uRefl: { value: mobile ? 0 : 1 } }), ...U },
        vertexShader: WATER_VERT,
        fragmentShader: WATER_FRAG,
      }
      const r = new Reflector(geo, { shader: sh, textureWidth: Math.round(innerWidth / 3), textureHeight: Math.round(innerHeight / 3), clipBias: 0.02 })
      r.rotation.x = -Math.PI / 2
      r.position.y = y
      r.name = k
      if (mobile) r.onBeforeRender = () => {}
      scene.add(r)
      reflectors.push(r)
    }
  }

  // ---------------------------------------------------------------- trees: lit impostors of the Poly Haven fir
  /** instances baked in Blender: 12 bytes each (position u16 x3; scale, kind, light rgb (log2), sun as u8) */
  const parseInst = (buf: ArrayBuffer, every: number, cells: number, flip: boolean) => {
    const dv = new DataView(buf)
    const n = dv.getUint32(0, true)
    const lo = new Float32Array(buf, 8, 3)
    const hi = new Float32Array(buf, 20, 3)
    const qp = new Uint16Array(buf, 32, n * 3)
    const qb = new Uint8Array(buf, 32 + n * 6, n * 6)
    const m = Math.floor(n / every)
    const aPos = new Float32Array(m * 3),
      aData = new Float32Array(m * 4),
      aTint = new Float32Array(m * 3)
    for (let k = 0; k < m; k++) {
      const i = k * every
      for (let c = 0; c < 3; c++) aPos[k * 3 + c] = lo[c] + (qp[i * 3 + c] / 65535) * (hi[c] - lo[c])
      const b = i * 6
      const kind = qb[b + 1]
      aData.set([(qb[b] / 255) * 1.5, flip ? (kind + (i % 3 === 0 ? 3 : 0)) % cells : kind % cells, 0, qb[b + 5] / 255], k * 4)
      for (let c = 0; c < 3; c++) aTint[k * 3 + c] = Math.pow(2, (qb[b + 2 + c] - 160) / 24)
    }
    return { n: m, aPos, aData, aTint }
  }
  const instMesh = (inst: ReturnType<typeof parseInst>, mat: THREE.ShaderMaterial) => {
    const quad = new THREE.PlaneGeometry(1, 1)
    quad.translate(0, 0.5, 0)
    const g = new THREE.InstancedBufferGeometry()
    g.index = quad.index
    g.setAttribute('position', quad.getAttribute('position'))
    g.setAttribute('uv', quad.getAttribute('uv'))
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(inst.aPos, 3))
    g.setAttribute('aData', new THREE.InstancedBufferAttribute(inst.aData, 4))
    g.setAttribute('aTint', new THREE.InstancedBufferAttribute(inst.aTint, 3))
    g.instanceCount = inst.n
    const m = new THREE.Mesh(g, mat)
    m.frustumCulled = false
    scene.add(m)
    return m
  }
  const tInst = parseInst(treeBuf, mobile ? 2 : 1, 4, true)
  for (let k = 0; k < tInst.n; k++) {
    tInst.aPos[k * 3 + 1] -= 0.4
    tInst.aData[k * 4] *= 0.95
  }
  instMesh(tInst, new THREE.ShaderMaterial({ uniforms: { ...U, tTreeC: { value: treeC }, tTreeN: { value: treeN } }, vertexShader: TREE_VERT, fragmentShader: TREE_FRAG, side: THREE.DoubleSide }))
  instMesh(parseInst(grassBuf, mobile ? 2 : 1, 4, false), new THREE.ShaderMaterial({ uniforms: { ...U, tGrass: { value: grassTex } }, vertexShader: GRASS_VERT, fragmentShader: GRASS_FRAG, side: THREE.DoubleSide }))
  const updateTrees = (_force = false) => {}

  // ---------------------------------------------------------------- glow sprites on the lamps (they are on at sunset)
  const KIND: Record<string, [number, number, number, number, number]> = {
    sodium: [1.0, 0.62, 0.3, 1.1, 0],
    tunnel: [1.0, 0.55, 0.22, 1.0, 0],
    flood: [1.0, 0.9, 0.75, 1.6, 0],
    lantern: [1.0, 0.75, 0.42, 1.0, 0],
    red: [1.0, 0.12, 0.06, 1.6, 1],
  }
  const lamps = meta.lights.filter((l) => KIND[l[3]])
  const gp = new Float32Array(lamps.length * 3),
    gc = new Float32Array(lamps.length * 3),
    gs = new Float32Array(lamps.length),
    gb = new Float32Array(lamps.length)
  lamps.forEach((l, i) => {
    const k = KIND[l[3]]
    gp.set([l[0], l[1], l[2]], i * 3)
    gc.set([k[0] * 2.4, k[1] * 2.4, k[2] * 2.4], i * 3)
    gs[i] = k[3]
    gb[i] = k[4] ? 0.6 + ((i * 0.37) % 1) : 0
  })
  const glowGeo = new THREE.BufferGeometry()
  glowGeo.setAttribute('position', new THREE.BufferAttribute(gp, 3))
  glowGeo.setAttribute('aColor', new THREE.BufferAttribute(gc, 3))
  glowGeo.setAttribute('aSize', new THREE.BufferAttribute(gs, 1))
  glowGeo.setAttribute('aBlink', new THREE.BufferAttribute(gb, 1))
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 500 }, uTime: U.uTime, uFogD: U.uFogD },
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const glows = new THREE.Points(glowGeo, glowMat)
  glows.frustumCulled = false
  scene.add(glows)
  const sodium = lamps.filter((l) => l[3] === 'sodium' || l[3] === 'tunnel' || l[3] === 'flood' || l[3] === 'lantern').map((l) => new THREE.Vector3(l[0], l[1], l[2]))

  // ---------------------------------------------------------------- environment for the car: the same photographed sky
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  const envSky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: { ...U, uSunDisc: { value: 0.25 } },
      vertexShader: SKY_VERT.replace(/#include <logdepthbuf_[a-z_]+>/g, ''),
      fragmentShader: SKY_FRAG.replace(/#include <logdepthbuf_[a-z_]+>/g, ''),
      side: THREE.BackSide,
    }),
  )
  envScene.add(envSky)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(48, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.045, 0.04) }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1.0
  envScene.add(ground)
  const env = pmrem.fromScene(envScene, 0.01).texture
  envScene.traverse((x) => (x as THREE.Mesh).geometry?.dispose())

  // ---------------------------------------------------------------- the car
  carAo.flipY = false
  const car = new THREE.Group()
  car.add(carG)
  scene.add(car)
  const parts3: Record<string, THREE.Object3D> = {}
  carG.traverse((n) => (parts3[n.name] = n))
  const wheels = ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].map((k) => parts3[k]).filter(Boolean)
  const steer = parts3['wheel_steer']
  const steerQ = steer ? steer.quaternion.clone() : new THREE.Quaternion()
  const needles = { tach: parts3['needle_tach'], speed: parts3['needle_speed'] }
  const needleQ = { tach: needles.tach?.quaternion.clone(), speed: needles.speed?.quaternion.clone() }
  const wheelQ = wheels.map((w) => w.quaternion.clone())
  const brakeMats: THREE.MeshBasicMaterial[] = []
  let screenTex: THREE.CanvasTexture | null = null
  let screenCtx: CanvasRenderingContext2D | null = null
  const fp = view === 'fp'
  const flake = flakeTex()
  const carMeshes: THREE.Mesh[] = []
  carG.traverse((n) => (n as THREE.Mesh).isMesh && carMeshes.push(n as THREE.Mesh))
  carMeshes.forEach((m) => {
    const src = m.material as THREE.MeshStandardMaterial
    const name = src.name
    const std = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ name, envMap: env, envMapIntensity: 1, ...p })
    const isShell = m.parent?.name === 'shell' || m.name === 'shell' || m.parent?.name === 'interior' || m.name === 'interior'
    const ao = isShell && m.geometry.getAttribute('uv') ? { aoMap: carAo, aoMapIntensity: 1 } : {}
    let mat: THREE.Material
    m.castShadow = true
    m.receiveShadow = true
    switch (name) {
      case 'paint':
        // metallic red with a flake layer under a clear coat
        mat = std({ color: new THREE.Color(0.42, 0.02, 0.018), roughness: 0.42, metalness: 0.55, normalMap: flake, normalScale: new THREE.Vector2(0.18, 0.18), clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 1.3, ...ao })
        if (fp) {
          const inner = new THREE.Mesh(m.geometry, new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.92, side: THREE.BackSide, envMap: env, envMapIntensity: 0.5 }))
          m.add(inner)
        }
        break
      case 'glass':
        mat = std({ color: 0x0a0d10, roughness: 0.02, metalness: 0, transparent: true, opacity: fp ? 0.08 : 0.5, envMapIntensity: fp ? 0.4 : 1.8, depthWrite: false, side: THREE.DoubleSide })
        m.renderOrder = 5
        m.castShadow = false
        break
      case 'lens':
        mat = std({ color: 0xdfe6ee, roughness: 0.02, transparent: true, opacity: 0.3, depthWrite: false })
        m.castShadow = false
        break
      case 'chrome':
      case 'alu':
      case 'rim':
      case 'disc':
      case 'mirror':
        mat = std({ color: src.color, roughness: Math.min(src.roughness, 0.3), metalness: 1, envMapIntensity: 1.3, ...ao })
        break
      case 'tyre':
        mat = std({ color: 0x0c0c0d, roughness: 0.88, metalness: 0, envMapIntensity: 0.4 })
        break
      case 'head':
      case 'drl':
        mat = new THREE.MeshBasicMaterial({ name, color: new THREE.Color(6, 6, 6.4) })
        break
      case 'tail': {
        const b = new THREE.MeshBasicMaterial({ name, color: new THREE.Color(4, 0.12, 0.08) })
        brakeMats.push(b)
        mat = b
        break
      }
      case 'needle':
        mat = new THREE.MeshBasicMaterial({ name, color: new THREE.Color(2.2, 0.7, 0.2) })
        break
      case 'gauge': {
        const t = src.map
        if (t) t.colorSpace = THREE.SRGBColorSpace
        mat = new THREE.MeshBasicMaterial({ name, map: t, color: new THREE.Color(1.3, 1.3, 1.3) })
        break
      }
      case 'leather':
        mat = std({ color: src.color, roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(0.3, 0.15, 0.1), envMapIntensity: 0.7, ...ao })
        break
      default:
        mat = std({ color: src.color, roughness: Math.max(src.roughness, 0.3), metalness: 0, envMapIntensity: 0.8, ...ao })
    }
    if (m.name === 'screen' || m.parent?.name === 'screen') {
      const c = document.createElement('canvas')
      c.width = 512
      c.height = 220
      screenCtx = c.getContext('2d')
      screenTex = new THREE.CanvasTexture(c)
      screenTex.colorSpace = THREE.SRGBColorSpace
      mat = new THREE.MeshBasicMaterial({ map: screenTex })
    }
    m.material = mat
    m.layers.enable(1)
  })
  // light the car the world was lit with: the low sun (with shadows on itself) and the sky
  const sunL = new THREE.DirectionalLight(SUN_COL, 1.0)
  sunL.castShadow = true
  sunL.shadow.mapSize.set(1024, 1024)
  sunL.shadow.camera.left = sunL.shadow.camera.bottom = -4
  sunL.shadow.camera.right = sunL.shadow.camera.top = 4
  sunL.shadow.camera.near = 1
  sunL.shadow.camera.far = 40
  sunL.shadow.bias = -0.0006
  sunL.shadow.normalBias = 0.02
  scene.add(sunL)
  scene.add(sunL.target)
  const lampL = [new THREE.PointLight(0xffa860, 0, 40, 1.6), new THREE.PointLight(0xffa860, 0, 40, 1.6)]
  lampL.forEach((l) => scene.add(l))
  const cabin = new THREE.PointLight(0xffb070, fp ? 0.4 : 0, 1.6, 2)
  cabin.position.set(0.3, 0.95, -0.37)
  car.add(cabin)
  // contact shadow under the body (ambient occlusion on the road)
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.85 }))
  blob.rotation.x = -Math.PI / 2
  blob.position.y = 0.03
  blob.renderOrder = 1
  car.add(blob)
  // the car's shadow on the world: its depth seen from the sun, compared in the world shader
  const shTarget = new THREE.WebGLRenderTarget(mobile ? 512 : 1024, mobile ? 512 : 1024, { depthBuffer: true, type: THREE.HalfFloatType })
  const shCam = new THREE.OrthographicCamera(-6, 6, 6, -6, 1, 300)
  shCam.layers.set(1)
  // write the window depth of the car as a colour; the world compares its own projected depth against it
  const shMat = new THREE.ShaderMaterial({
    vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0); }',
    side: THREE.DoubleSide,
  })
  U.uCarSh.value = shTarget.texture
  U.uCarShOn.value = 1
  const renderCarShadow = () => {
    shCam.position.copy(car.position).addScaledVector(sun, 100)
    shCam.lookAt(car.position)
    shCam.updateMatrixWorld()
    U.uCarShM.value.multiplyMatrices(shCam.projectionMatrix, shCam.matrixWorldInverse)
    const prevOv = scene.overrideMaterial
    const cc = renderer.getClearColor(new THREE.Color())
    const ca = renderer.getClearAlpha()
    scene.overrideMaterial = shMat
    renderer.setClearColor(0xffffff, 1)
    renderer.setRenderTarget(shTarget)
    renderer.clear()
    renderer.render(scene, shCam)
    renderer.setRenderTarget(null)
    renderer.setClearColor(cc, ca)
    scene.overrideMaterial = prevOv
    sunL.position.copy(car.position).addScaledVector(sun, 20)
    sunL.target.position.copy(car.position)
  }
  // car lamps as glows (third person)
  const cl = new THREE.BufferGeometry()
  cl.setAttribute('position', new THREE.Float32BufferAttribute([-2.31, 0.8, -0.62, -2.31, 0.8, 0.62], 3))
  cl.setAttribute('aColor', new THREE.Float32BufferAttribute([1.2, 0.05, 0.03, 1.2, 0.05, 0.03], 3))
  cl.setAttribute('aSize', new THREE.Float32BufferAttribute([0.35, 0.35], 1))
  cl.setAttribute('aBlink', new THREE.Float32BufferAttribute([0, 0], 1))
  const carGlow = new THREE.Points(cl, glowMat)
  carGlow.frustumCulled = false
  carGlow.visible = !fp
  car.add(carGlow)

  // ---------------------------------------------------------------- post: bloom (the sun, the lamps, the light bar), a vignette
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: mobile ? 0 : 2 }))
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), Number(qs.get('bloom') ?? 0.35), 0.55, Number(qs.get('bth') ?? 2.6))
  composer.addPass(bloom)
  composer.addPass(new OutputPass())
  const vig = new ShaderPass(VIGNETTE)
  composer.addPass(vig)
  const draw = () => {
    sky.position.copy(camera.position)
    renderCarShadow()
    composer.render()
  }

  // ---------------------------------------------------------------- the minimap on the centre screen (W4)
  const mapPts: [number, number][] = []
  {
    let x0 = 1e9,
      x1 = -1e9,
      z0 = 1e9,
      z1 = -1e9
    for (let i = 0; i < route.n; i += 4) {
      const x = route.P[i * 3],
        z = route.P[i * 3 + 2]
      x0 = Math.min(x0, x)
      x1 = Math.max(x1, x)
      z0 = Math.min(z0, z)
      z1 = Math.max(z1, z)
    }
    const sc = Math.min(300 / (x1 - x0), 180 / (z1 - z0))
    for (let i = 0; i < route.n; i += 4) mapPts.push([150 + (route.P[i * 3] - x0) * sc, 20 + (route.P[i * 3 + 2] - z0) * sc])
  }
  const drawScreen = (s: number, v: number) => {
    const g = screenCtx
    if (!g || !screenTex) return
    g.fillStyle = '#05070b'
    g.fillRect(0, 0, 512, 220)
    g.strokeStyle = 'rgba(160,170,200,0.35)'
    g.lineWidth = 5
    g.beginPath()
    mapPts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.stroke()
    const k = Math.min(mapPts.length - 1, Math.round((s / route.len) * (mapPts.length - 1)))
    g.strokeStyle = '#ffb565'
    g.beginPath()
    mapPts.slice(0, k + 1).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.stroke()
    for (const id of STATION_IDS) {
      const j = Math.round((meta.stations[id].s / route.len) * (mapPts.length - 1))
      const [x, y] = mapPts[Math.min(j, mapPts.length - 1)]
      g.fillStyle = '#e9e4d8'
      g.beginPath()
      g.arc(x, y, 6, 0, Math.PI * 2)
      g.fill()
    }
    const [cx, cy] = mapPts[k]
    g.fillStyle = '#ffb565'
    g.beginPath()
    g.arc(cx, cy, 10, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#e9e4d8'
    g.font = '600 34px system-ui, sans-serif'
    g.fillText(`${Math.round(v * 3.6)}`, 24, 60)
    g.font = '500 18px system-ui, sans-serif'
    g.fillStyle = '#8f96a8'
    g.fillText('km/h', 26, 84)
    g.fillText(`${(s / 1000).toFixed(1)} / ${(route.len / 1000).toFixed(1)} km`, 26, 196)
    screenTex.needsUpdate = true
  }

  // ---------------------------------------------------------------- state
  const ST: Record<StationId, number> = Object.fromEntries(STATION_IDS.map((id) => [id, meta.stations[id].s])) as Record<StationId, number>
  // where the car stops for each station: a little short of the sign so it is in view
  const STOP: Record<StationId, number> = { dock: ST.dock - 25, pad: ST.pad - 18, log: ST.log - 46, model: ST.model - 24, pier: ST.pier - 8, board: route.len - 8 }
  const LOOK: Record<StationId, THREE.Vector3> = Object.fromEntries(
    STATION_IDS.map((id) => {
      const st = meta.stations[id]
      const p = id === 'board' || id === 'dock' || (id === 'pier' && view === 'fp') ? st.look : st.sign ?? st.look
      return [id, p ? new THREE.Vector3(...p) : route.pos(st.s, new THREE.Vector3())]
    }),
  ) as Record<StationId, THREE.Vector3>
  const PIN: Record<StationId, THREE.Vector3> = Object.fromEntries(
    STATION_IDS.map((id) => {
      const st = meta.stations[id]
      const p = st.sign ?? st.look
      return [id, p ? new THREE.Vector3(...p) : route.pos(st.s, new THREE.Vector3())]
    }),
  ) as Record<StationId, THREE.Vector3>
  let s = START_S,
    v = 0,
    target = START_S,
    thr = 0,
    auto: { to: number; arrive?: StationId } | null = null,
    paused = false,
    raf = 0,
    wheelRot = 0,
    lastNear: StationId | null = null,
    lookW = 0,
    lookId: StationId | null = null,
    roll = 0,
    pitchV = 0,
    steerA = 0,
    insets = { right: 0, bottom: 0, top: 0 }
  const camPos = new THREE.Vector3(),
    camLook = new THREE.Vector3(),
    carPos = new THREE.Vector3(),
    fwd = new THREE.Vector3(),
    up = new THREE.Vector3(),
    right = new THREE.Vector3()
  let camInit = false

  const resize = () => {
    const w = canvas.clientWidth || innerWidth,
      h = canvas.clientHeight || innerHeight
    renderer.setSize(w, h, false)
    composer?.setSize(w, h)
    camera.aspect = w / h
    // keep the subject centred in the part of the screen the sheet leaves free
    const r = insets.right || 0
    if (r > 0) camera.setViewOffset(w + r, h, r, 0, w, h)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    glowMat.uniforms.uScale.value = (h * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  const nearest = (sv: number): StationId | null => {
    let best: StationId | null = null,
      bd = 1e9
    for (const id of STATION_IDS) {
      const d = STOP[id] - sv
      if (d > -40 && d < 120 && Math.abs(d) < bd) {
        bd = Math.abs(d)
        best = id
      }
    }
    return best
  }

  // ---------------------------------------------------------------- per-frame placement
  const placeCar = (dt: number) => {
    const lat = route.lane(s)
    route.line(s, carPos, lat)
    const a = route.line(s - 2.2, _v1, lat)
    const b = route.line(s + 2.2, _v2, route.lane(s + 2.2))
    fwd.subVectors(b, a).normalize()
    const k = route.curv(s)
    // body roll in the bends (third person shows it), a touch of squat under braking
    roll = damp(roll, (fp ? 0.2 : 1) * Math.max(-0.045, Math.min(0.045, k * v * v * 0.0011)), 6, dt)
    const bank = Math.atan(route.bank(s))
    up.set(0, 1, 0)
    right.crossVectors(fwd, up).normalize()
    up.crossVectors(right, fwd).normalize()
    _m.makeBasis(fwd, up, right)
    car.quaternion.setFromRotationMatrix(_m)
    _q.setFromAxisAngle(_v3.set(1, 0, 0), bank + roll)
    car.quaternion.multiply(_q)
    _q.setFromAxisAngle(_v3.set(0, 0, 1), pitchV)
    car.quaternion.multiply(_q)
    car.position.copy(carPos)
    // wheels roll with distance; the steering wheel turns with the bend
    wheelRot -= (v * dt) / 0.345
    steerA = damp(steerA, Math.max(-2.4, Math.min(2.4, k * 2.45 * 15)), 8, dt)
    wheels.forEach((w, i) => {
      w.quaternion.copy(wheelQ[i])
      if (i < 2) {
        _q.setFromAxisAngle(_v3.set(0, 1, 0), steerA / 15)
        w.quaternion.premultiply(_q)
      }
      _q.setFromAxisAngle(_v3.set(0, 0, 1), wheelRot)
      w.quaternion.multiply(_q)
    })
    if (steer) {
      steer.quaternion.copy(steerQ)
      _q.setFromAxisAngle(_v3.set(1, 0, 0), -steerA)
      steer.quaternion.multiply(_q)
    }
    const kmh = v * 3.6
    const rpm = 900 + ((kmh % 70) / 70) * 5200 + Math.min(kmh, 1) * 400
    for (const [key, val] of [['tach', rpm / 9000], ['speed', kmh / 320]] as const) {
      const n = needles[key],
        bq = needleQ[key]
      if (!n || !bq) continue
      const ang = THREE.MathUtils.degToRad(-135 + 270 * Math.min(1, val))
      n.quaternion.copy(bq)
      _q.setFromAxisAngle(_v3.set(0, 1, 0), -ang)
      n.quaternion.multiply(_q)
    }
    // the world's headlight cone and the tail glow on the road
    U.uHL.value.copy(carPos).addScaledVector(fwd, 2.1).y += 0.72
    U.uHD.value.copy(fwd).addScaledVector(up, -0.09).normalize()
    U.uTL.value.copy(carPos).addScaledVector(fwd, -2.6).y += 0.4
    brakeMats.forEach((m) => m.color.setRGB(thr < 0 || (auto && v > 2 && target - s < v * v * 0.06) ? 4.5 : 2.4, 0.08, 0.05))
    // the two nearest lamps light the paint as the car passes under them
    let d0 = 1e9,
      d1 = 1e9,
      i0 = -1,
      i1 = -1
    for (let i = 0; i < sodium.length; i++) {
      const d = sodium[i].distanceToSquared(carPos)
      if (d < d0) {
        d1 = d0
        i1 = i0
        d0 = d
        i0 = i
      } else if (d < d1) {
        d1 = d
        i1 = i
      }
    }
    ;[i0, i1].forEach((ii, k2) => {
      const l = lampL[k2]
      if (ii < 0) return (l.intensity = 0)
      l.position.copy(sodium[ii])
      const d = Math.sqrt(k2 ? d1 : d0)
      l.intensity = d < 40 ? (fp ? 4 : 8) * smooth(40, 8, d) : 0
    })
  }

  const placeCamera = (dt: number, snap: boolean) => {
    const sp = Math.min(1, v / 30)
    const near = nearest(s)
    // when parked at a station, turn toward its sign
    const want = near && v < 3 && Math.abs(STOP[near] - s) < 30 ? 1 : 0
    if (near) lookId = near
    lookW = snap ? want : damp(lookW, want, 1.6, dt)
    if (fp) {
      camPos.copy(EYE).applyQuaternion(car.quaternion).add(car.position)
      const ahead = route.line(s + 18 + v * 0.6, _v1)
      ahead.y += 0.8
      const dirA = _v2.subVectors(ahead, camPos).normalize()
      const dirF = _v3.copy(fwd).addScaledVector(up, innerWidth < innerHeight ? -0.2 : -0.08).normalize()
      const dir = dirF.lerp(dirA, 0.45).normalize()
      if (lookId && lookW > 0.001) {
        const tl = _v1.subVectors(LOOK[lookId], camPos).normalize()
        dir.lerp(tl, lookW * 0.32).normalize()
      }
      camLook.copy(camPos).add(dir)
      camera.position.copy(camPos)
      camera.up.copy(up)
      camera.lookAt(camLook)
      const base = innerWidth < innerHeight ? 68 : 50
      camera.fov = base + sp * 5 - (lookId === 'board' ? lookW * 12 : 0)
    } else {
      const portrait = innerWidth < innerHeight
      const back = portrait ? 8.6 : Number(qs.get('cb') ?? 7.4),
        hgt = portrait ? 2.8 : Number(qs.get('ch') ?? 1.85)
      const want3 = _v1.copy(car.position).addScaledVector(fwd, -back - sp * 1.2)
      want3.y += hgt
      if (lookId && lookW > 0.001) {
        // swing out to the side the sign is on, so the car and the sign share the frame
        const side = Math.sign(_v2.subVectors(LOOK[lookId], car.position).dot(right)) || 1
        const sw = s < route.city ? 0.8 : 1.4
        want3.addScaledVector(right, -side * sw * lookW).addScaledVector(fwd, 1.2 * lookW)
        want3.y += 0.6 * lookW
      }
      const lk = _v2.copy(car.position).addScaledVector(fwd, 3.2)
      lk.y += Number(qs.get('cl') ?? 1.05)
      if (lookId && lookW > 0.001) lk.lerp(LOOK[lookId], lookW * 0.18)
      if (snap || !camInit) {
        camPos.copy(want3)
        camLook.copy(lk)
        camInit = true
      } else {
        camPos.x = damp(camPos.x, want3.x, 3.2, dt)
        camPos.y = damp(camPos.y, want3.y, 3.2, dt)
        camPos.z = damp(camPos.z, want3.z, 3.2, dt)
        camLook.lerp(lk, 1 - Math.exp(-6 * dt))
      }
      // never dip under the road
      const ry = route.pos(s, _v3).y
      camPos.y = Math.max(camPos.y, ry + 1.2)
      camera.position.copy(camPos)
      camera.up.set(0, 1, 0)
      camera.lookAt(camLook)
      camera.fov = (portrait ? 56 : Number(qs.get('cf') ?? 40)) + sp * 6 - (lookId === 'board' ? lookW * 10 : 0)
    }
    camera.updateProjectionMatrix()
    glowMat.uniforms.uScale.value = (renderer.domElement.height || innerHeight) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
  }

  // ---------------------------------------------------------------- driving
  const physics = (dt: number) => {
    const vm = route.vmax(s)
    if (auto) {
      const d = auto.to - s
      const dir = Math.sign(d)
      const vt = Math.min(dir > 0 ? Math.max(vm, 14) * 1.15 : 14, Math.sqrt(2 * 7 * Math.abs(d)))
      const a = vt * dir - v
      v += Math.max(-10, Math.min(7, a * 2.2)) * dt
      if (Math.abs(d) < 0.35 && Math.abs(v) < 0.6) {
        v = 0
        s = auto.to
        const id = auto.arrive
        auto = null
        target = s
        if (id) o.onArrive?.(id)
      }
    } else if (thr !== 0) {
      if (thr > 0) v += (v < vm ? 6.5 : -4) * thr * dt
      else v = v > 0.5 ? v - 11 * dt : Math.max(v - 4 * dt, -6)
      target = s
    } else {
      // wheel and scroll drive toward a target, magnetic near the stations
      const d = target - s
      const vt = Math.sign(d) * Math.min(Math.abs(d) > 0 ? (d > 0 ? vm : 12) : 0, Math.sqrt(2 * 6 * Math.abs(d)))
      v += Math.max(-11, Math.min(6.5, (vt - v) * 2.4)) * dt
      if (Math.abs(d) < 0.3 && Math.abs(v) < 0.5) v = 0
    }
    s += v * dt
    if (s < 2) {
      s = 2
      v = Math.max(v, 0)
    }
    if (s > route.len - 6) {
      s = route.len - 6
      v = Math.min(v, 0)
    }
    pitchV = damp(pitchV, 0, 4, dt)
  }

  let lastState = 0,
    lastScreen = 0,
    lastPins = 0
  const emit = (now: number) => {
    const near = nearest(s)
    if (now - lastState > 90 || near !== lastNear) {
      lastState = now
      lastNear = near
      o.onState?.({ s, v, frac: s / route.len, near, moving: Math.abs(v) > 0.5 })
    }
    if (fp && now - lastScreen > 250) {
      lastScreen = now
      drawScreen(s, Math.abs(v))
    }
    if (o.onPins && now - lastPins > 33) {
      lastPins = now
      o.onPins(project())
    }
  }

  const project = () => {
    const out = {} as Record<StationId, Pin>
    const w = canvas.clientWidth,
      h = canvas.clientHeight
    for (const id of STATION_IDS) {
      const p = _v1.copy(PIN[id])
      p.y += id === 'dock' ? 7 : id === 'log' ? 0 : 2.4
      const d = p.distanceTo(camera.position)
      p.project(camera)
      out[id] = { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, on: p.z < 1 && d > 70 && d < 300 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 }
    }
    return out
  }

  // adaptive resolution: hold ~60 fps by trading pixels, never below 0.75x
  let ft = 16.7,
    lastAdapt = 0
  const adapt = (dtRaw: number, now: number) => {
    ft = ft * 0.95 + dtRaw * 1000 * 0.05
    if (now - lastAdapt < 1200) return
    let next = dpr
    if (ft > 19.5) next = Math.max(0.75, dpr - 0.15)
    else if (ft < 13.5) next = Math.min(dprMax, dpr + 0.1)
    if (Math.abs(next - dpr) > 0.01) {
      dpr = next
      renderer.setPixelRatio(dpr)
      resize()
      lastAdapt = now
      ft = 16.7
    }
  }
  const frame = () => {
    raf = requestAnimationFrame(frame)
    if (lost || paused) return
    const dtRaw = clock.getDelta()
    const dt = Math.min(dtRaw, 1 / 20)
    if (dtRaw < 0.25) adapt(dtRaw, performance.now())
    U.uTime.value += dt
    vig.uniforms.uTime.value = U.uTime.value
    physics(dt)
    placeCar(dt)
    placeCamera(dt, false)
    updateTrees()
    draw()
    emit(performance.now())
  }

  const resolve = (to: StationId | number) => (typeof to === 'number' ? to : STOP[to])

  const api: WorldApi = {
    stations: STOP,
    len: route.len,
    start() {
      clock.getDelta()
      if (!raf) frame()
    },
    driveTo(to, opts) {
      const id = typeof to === 'string' ? to : undefined
      auto = { to: Math.min(route.len - 6, Math.max(2, resolve(to))), arrive: opts?.arrive === false ? undefined : id }
      target = auto.to
      thr = 0
    },
    teleport(to, v0 = 0) {
      s = target = Math.min(route.len - 6, Math.max(2, resolve(to)))
      v = v0
      auto = null
      placeCar(0.016)
      placeCamera(0.016, true)
      updateTrees(true)
    },
    throttle(x) {
      thr = x
      if (x !== 0) auto = null
    },
    nudge(ds) {
      auto = null
      target = Math.min(route.len - 6, Math.max(2, (Math.abs(target - s) > 400 ? s : target) + ds))
      // magnetic stops: a target that lands near a station's stop snaps to it
      for (const id of STATION_IDS) if (Math.abs(STOP[id] - target) < 14) target = STOP[id]
    },
    scrub(f) {
      auto = null
      target = Math.min(route.len - 6, Math.max(2, f * route.len))
    },
    setInsets(i) {
      insets = { ...insets, ...i }
      resize()
    },
    setPaused(p) {
      paused = p
      clock.getDelta()
    },
    pose(sv, opt) {
      s = target = sv
      v = opt?.t ?? 0
      auto = null
      placeCar(0.016)
      if (opt?.look) {
        lookId = opt.look
      }
      placeCamera(0.016, true)
      if (opt?.look) {
        lookW = 1
        placeCamera(0.016, true)
      }
      updateTrees(true)
      if (fp) drawScreen(s, v)
      draw()
    },
    project,
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('webglcontextlost', onLost)
      scene.traverse((x) => {
        const m = x as THREE.Mesh
        m.geometry?.dispose?.()
        const mm = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mm)) mm.forEach((y) => y.dispose())
        else mm?.dispose?.()
      })
      reflectors.forEach((r) => r.dispose())
      renderer.dispose()
    },
  }
  placeCar(0.016)
  placeCamera(0.016, true)
  updateTrees(true)
  return api
}
