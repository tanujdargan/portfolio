// W2 · Playground: the island at dusk. Baked Blender atlases (public/w2/src/*.py) on unlit materials, a stylised
// water shader, instanced grass coloured from the bake, and a small custom arcade physics (no engine): a rover with
// spring suspension and drift, props you can knock over that settle on a face, colliders from the Blender layout.
// The loop renders on demand and sleeps when nothing moves. Nothing here touches React.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { STATION_IDS, type StationId } from './stations'

const ROOT = '/w2/world/'

interface Layout {
  grid: { n: number; min: number; step: number }
  water: number
  stations: Record<StationId, [number, number, number]>
  colliders: (['c', number, number, number] | ['b', number, number, number, number, number])[]
  lights: [number, number, number, string, number][]
  dyn: [string, number, number, number, number][]
  spawn: [number, number, number]
}

export interface Pin {
  x: number
  y: number
  on: boolean
}
export interface SteerView {
  ai: number // index into the 9 alphas
  expr: number[] // read-back projection for each alpha (same prompt)
  hue: 'joy' | 'distress' | 'certainty'
}
export interface WorldOpts {
  canvas: HTMLCanvasElement
  joy: HTMLElement | null
  mobile: boolean
  reduced: boolean
  intro: 'overview' | 'follow'
  onProgress: (p: number) => void
  onStation: (id: StationId | null) => void
  onPins: (pins: Record<StationId, Pin>, rover: Pin) => void
  onDrive: () => void
  onLost: () => void
}
export interface WorldApi {
  teleport: (id: StationId) => void
  setSteer: (s: SteerView | null) => void
  setDish: (look: { az: number; el: number; up: boolean } | null) => void
  setInsets: (i: { right: number; bottom: number; top?: number }) => void
  setControls: (on: boolean) => void
  start: () => void
  wake: () => void
  unstuck: () => void
  dispose: () => void
  /** review aid: camera presets for the poster still */
  posterCam: (k: 'd' | 'm') => void
  project: () => Record<StationId, Pin>
}

// ---------------------------------------------------------------- small helpers
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt))
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

async function fetchAll(urls: string[], onProgress: (p: number) => void) {
  // rough byte weights so the bar moves honestly before content-length arrives
  const got = new Array(urls.length).fill(0)
  const tot = new Array(urls.length).fill(0)
  const est = urls.map((u) => (u.endsWith('world.glb') ? 1.15e6 : u.endsWith('.glb') ? 1.8e5 : u.includes('props') ? 3.7e5 : 1.3e5))
  const report = () => onProgress(got.reduce((a, b) => a + b, 0) / urls.reduce((a, _, i) => a + (tot[i] || est[i]), 0))
  return Promise.all(
    urls.map(async (u, i) => {
      const r = await fetch(u)
      if (!r.ok || !r.body) throw new Error('load ' + u)
      tot[i] = +(r.headers.get('content-length') || 0) || est[i]
      const reader = r.body.getReader()
      const parts: Uint8Array[] = []
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        parts.push(value)
        got[i] += value.length
        report()
      }
      const out = new Uint8Array(got[i])
      let o = 0
      for (const p of parts) {
        out.set(p, o)
        o += p.length
      }
      return out.buffer
    }),
  )
}

// hand the main thread back between heavy steps so boot never blocks input for long
const yieldTask = () => new Promise<void>((r) => setTimeout(r, 0))

async function bitmapTex(buf: ArrayBuffer, srgb = true) {
  const bmp = await createImageBitmap(new Blob([buf], { type: 'image/webp' }), { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
  const t = new THREE.Texture(bmp as unknown as HTMLImageElement)
  t.flipY = false
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 4
  t.needsUpdate = true
  return { t, bmp }
}

function radial(size: number, stops: [number, string][]) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [o, col] of stops) gr.addColorStop(o, col)
  g.fillStyle = gr
  g.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ---------------------------------------------------------------- world
export async function createWorld(o: WorldOpts): Promise<WorldApi> {
  const { canvas, mobile } = o
  const files = ['layout.json', 'height.bin', 'world.glb', 'dyn.glb', 'terrain.webp', 'props.webp', 'dyn.webp', 'light.webp'].map((f) => ROOT + f)
  const [layoutB, heightB, worldB, dynB, terrB, propB, dynTB, lightB] = await fetchAll(files, o.onProgress)
  await yieldTask()
  const L = JSON.parse(new TextDecoder().decode(layoutB)) as Layout
  const N = L.grid.n
  const H = new Float32Array(heightB, 0, N * N)
  const G = new Uint8Array(heightB, N * N * 4, N * N)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile || devicePixelRatio < 2, powerPreference: 'high-performance', alpha: false })
  const dprCap = mobile ? 1.5 : 2
  renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  const BG = new THREE.Color('#0d1430')
  renderer.setClearColor(BG)
  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(BG, 70, 150)
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400)

  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  const parse = (b: ArrayBuffer) => new Promise<THREE.Group>((res, rej) => loader.parse(b, '', (g) => res(g.scene), rej))
  const [terrT, propT, dynT, lightT] = await Promise.all([bitmapTex(terrB), bitmapTex(propB), bitmapTex(dynTB), bitmapTex(lightB)])
  await yieldTask()
  const worldG = await parse(worldB)
  await yieldTask()
  const dynG = await parse(dynB)
  await yieldTask()

  // CPU copy of the irradiance lightmap: tints moving things by the light where they stand
  const lc = document.createElement('canvas')
  lc.width = lightT.bmp.width
  lc.height = lightT.bmp.height
  const lctx = lc.getContext('2d', { willReadFrequently: true })!
  lctx.drawImage(lightT.bmp, 0, 0)
  const LW = lc.width
  const lpx = lctx.getImageData(0, 0, lc.width, lc.height).data
  const s2l = (v: number) => {
    v /= 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const LUT = new Float32Array(256).map((_, i) => s2l(i) * 4)
  const lightAt = (x: number, z: number, out: THREE.Color) => {
    const u = clamp((x + 40) / 80, 0, 0.999),
      v = clamp((z + 40) / 80, 0, 0.999)
    const i = (Math.floor(v * LW) * LW + Math.floor(u * LW)) * 4
    out.setRGB(LUT[lpx[i]], LUT[lpx[i + 1]], LUT[lpx[i + 2]], THREE.LinearSRGBColorSpace)
    return out
  }

  // ---------------------------------------------------------------- heightfield
  const g0 = L.grid.min,
    st = L.grid.step
  const hAt = (x: number, z: number) => {
    const fx = clamp((x - g0) / st, 0, N - 1.001),
      fz = clamp((z - g0) / st, 0, N - 1.001)
    const ix = Math.floor(fx),
      iz = Math.floor(fz)
    const tx = fx - ix,
      tz = fz - iz
    const a = H[iz * N + ix],
      b = H[iz * N + ix + 1],
      c = H[(iz + 1) * N + ix],
      d = H[(iz + 1) * N + ix + 1]
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz
  }

  // ---------------------------------------------------------------- static world
  const terrMat = new THREE.MeshBasicMaterial({ map: terrT.t })
  const propMat = new THREE.MeshBasicMaterial({ map: propT.t })
  worldG.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      const mesh = m as THREE.Mesh
      mesh.material = m.name.startsWith('terrain') ? terrMat : propMat
      mesh.matrixAutoUpdate = false
      mesh.updateMatrix()
    }
  })
  scene.add(worldG)
  worldG.updateMatrixWorld(true)
  const terrainMesh = worldG.getObjectByName('terrain') as THREE.Mesh

  // ---------------------------------------------------------------- water
  const htex = new Uint8Array(N * N)
  for (let i = 0; i < N * N; i++) htex[i] = clamp(Math.round(((H[i] + 4) / 6) * 255), 0, 255)
  const heightTex = new THREE.DataTexture(htex, N, N, THREE.RedFormat, THREE.UnsignedByteType)
  heightTex.magFilter = heightTex.minFilter = THREE.LinearFilter
  heightTex.needsUpdate = true
  const U = { uTime: { value: 0 } }
  const waterMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      ...U,
      uH: { value: heightTex },
      uFog: { value: BG },
      uFogNear: { value: 70 },
      uFogFar: { value: 150 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW; varying float vD;
      void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uH; uniform float uTime; uniform vec3 uFog; uniform float uFogNear, uFogFar;
      varying vec3 vW; varying float vD;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 uv = (vW.xz + 40.) / 80.;
        float inside = step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.);
        float h = mix(-4., texture2D(uH, uv).r * 6. - 4., inside);
        float depth = max(0., -h);
        vec3 shallow = vec3(0.13, 0.42, 0.47);
        vec3 deep = vec3(0.035, 0.085, 0.2);
        vec3 col = mix(shallow, deep, smoothstep(0.0, 2.6, depth));
        float a = mix(0.35, 0.94, smoothstep(0.0, 1.4, depth));
        // shore foam: a bright edge plus two rings that breathe in and out
        float edge = 1. - smoothstep(0.02, 0.16, depth);
        float t = uTime * 0.35;
        float rings = 0.;
        for (int k = 0; k < 2; k++) {
          float ph = fract(t + float(k) * 0.5);
          float d0 = ph * 0.9;
          rings += (1. - smoothstep(0.0, 0.035, abs(depth - d0))) * (1. - ph) * 0.85;
        }
        float n = noise(vW.xz * 1.4 + vec2(uTime * 0.2, 0.)) ;
        float foam = clamp(edge * 0.9 + rings * smoothstep(0.25, 0.75, n), 0., 1.) * step(0.001, depth);
        // sparse wave dashes on open water (Bruno-ish white strokes)
        vec2 q = vW.xz * vec2(0.55, 1.6) + vec2(uTime * 0.25, 0.);
        float dash = smoothstep(0.86, 0.95, noise(q)) * smoothstep(0.62, 0.7, noise(vW.xz * 0.21 + 3.1 + uTime * 0.03));
        dash *= smoothstep(0.6, 2.2, depth);
        col = mix(col, vec3(0.86, 0.93, 0.97), foam);
        col += vec3(0.55, 0.7, 0.85) * dash * 0.55;
        // moon glint: a soft lighter band across the water
        col += vec3(0.08, 0.1, 0.18) * smoothstep(0.55, 1.0, noise(vW.xz * 0.06 + uTime * 0.02));
        a = max(a, foam);
        float f = smoothstep(uFogNear, uFogFar, vD);
        gl_FragColor = vec4(mix(col, uFog, f), mix(a, 1., f));
        #include <colorspace_fragment>
      }`,
  })
  const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1).rotateX(-Math.PI / 2), waterMat)
  water.position.y = L.water
  water.renderOrder = 2
  scene.add(water)

  // ---------------------------------------------------------------- grass (instanced blades coloured by the bake)
  const blades = mobile ? 26000 : 70000
  const rnd = (() => {
    let s = 7
    return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  })()
  const gp: number[] = []
  const gi: number[] = []
  const goff: number[] = []
  {
    let placed = 0,
      tries = 0
    let slice = performance.now()
    while (placed < blades && tries < blades * 8) {
      tries++
      if ((tries & 1023) === 0 && performance.now() - slice > 30) {
        await yieldTask()
        slice = performance.now()
      }
      const x = g0 + rnd() * (N - 1) * st,
        z = g0 + rnd() * (N - 1) * st
      const ix = Math.round((x - g0) / st),
        iz = Math.round((z - g0) / st)
      const dens = G[iz * N + ix] / 255
      if (rnd() > dens * dens) continue
      const y = hAt(x, z)
      const hgt = 0.18 + rnd() * 0.24 * (0.6 + dens * 0.6)
      const ang = rnd() * Math.PI
      const w = 0.045 + rnd() * 0.03
      const dx = Math.cos(ang) * w,
        dz = Math.sin(ang) * w
      // a blade: two base verts and a tip
      gp.push(x - dx, y, z - dz, x + dx, y, z + dz, x, y + hgt, z)
      gi.push(0, rnd(), 0, 0, rnd(), 0, 1, rnd(), 0)
      goff.push(x, z, hgt, x, z, hgt, x, z, hgt)
      placed++
    }
  }
  const gGeo = new THREE.BufferGeometry()
  gGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3))
  gGeo.setAttribute('aTip', new THREE.Float32BufferAttribute(gi, 3))
  gGeo.setAttribute('aRoot', new THREE.Float32BufferAttribute(goff, 3))
  const grassMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...U, uMap: { value: terrT.t }, uCar: { value: new THREE.Vector3(0, 0, 0) }, uFog: { value: BG }, uFogNear: { value: 70 }, uFogFar: { value: 150 } },
    vertexShader: /* glsl */ `
      attribute vec3 aTip; attribute vec3 aRoot;
      uniform float uTime; uniform vec3 uCar;
      varying vec2 vUv; varying float vT; varying float vD; varying float vR;
      void main(){
        vec3 p = position;
        float t = aTip.x;
        vec2 root = aRoot.xy;
        float wind = sin(uTime * 1.7 + root.x * 0.35 + root.y * 0.22) * 0.5 + sin(uTime * 2.9 + root.x * 1.3) * 0.25;
        p.x += wind * 0.07 * t;
        p.z += wind * 0.04 * t;
        // part around the rover
        vec2 away = root - uCar.xz;
        float d = length(away);
        float push = (1. - smoothstep(0.6, 1.5, d)) * t;
        p.xz += normalize(away + 1e-4) * push * 0.32;
        p.y -= push * aRoot.z * 0.55;
        vUv = vec2((root.x + 40.) / 80., (root.y + 40.) / 80.);
        vT = t; vR = aTip.y;
        vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.);
        vD = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform vec3 uFog; uniform float uFogNear, uFogFar;
      varying vec2 vUv; varying float vT; varying float vD; varying float vR;
      void main(){
        vec3 base = texture2D(uMap, vUv).rgb;
        vec3 col = base * mix(0.72, 1.32 + vR * 0.25, vT);
        float f = smoothstep(uFogNear, uFogFar, vD);
        gl_FragColor = vec4(mix(col, uFog, f), 1.);
      }`,
  })
  // the map is sRGB; ShaderMaterial samples it linearised, so this matches MeshBasic output after colorspace_fragment
  grassMat.fragmentShader = grassMat.fragmentShader.replace('gl_FragColor = vec4(mix(col, uFog, f), 1.);', 'gl_FragColor = vec4(mix(col, uFog, f), 1.);\n#include <colorspace_fragment>')
  const grass = new THREE.Mesh(gGeo, grassMat)
  grass.frustumCulled = false
  scene.add(grass)

  // ---------------------------------------------------------------- lamp glows (one draw call)
  const glowGeo = new THREE.BufferGeometry()
  const gpos: number[] = [],
    gcol: number[] = [],
    gsz: number[] = []
  const tmpC = new THREE.Color()
  for (const [x, y, z, hex, s] of L.lights) {
    gpos.push(x, y, z)
    tmpC.set(hex)
    gcol.push(tmpC.r, tmpC.g, tmpC.b)
    gsz.push(s)
  }
  glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(gpos, 3))
  glowGeo.setAttribute('color', new THREE.Float32BufferAttribute(gcol, 3))
  glowGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(gsz, 1))
  const glowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: { uScale: { value: 1 }, ...U },
    vertexShader: /* glsl */ `
      attribute float aSize; uniform float uScale; uniform float uTime; varying vec3 vC;
      void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.);
        float fl = 1. + 0.04 * sin(uTime * 7. + position.x * 3.1);
        gl_PointSize = aSize * fl * uScale * 2.4 / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC;
      void main(){ vec2 d = gl_PointCoord - .5; float r = length(d) * 2.;
        float a = pow(max(0., 1. - r), 2.2) * 0.55 + pow(max(0., 1. - r * 3.), 2.) * 0.6;
        gl_FragColor = vec4(vC * a, a); }`,
  })
  const glows = new THREE.Points(glowGeo, glowMat)
  glows.renderOrder = 5
  scene.add(glows)

  // ---------------------------------------------------------------- dynamic objects
  // meshopt quantisation moves each mesh's scale/offset onto its node: bake that into a float copy of the geometry
  const dynSrc: Record<string, THREE.Mesh> = {}
  dynG.updateMatrixWorld(true)
  dynG.traverse((m) => {
    const mesh = m as THREE.Mesh
    if (!mesh.isMesh) return
    const src = mesh.geometry
    const geo = new THREE.BufferGeometry()
    for (const k of ['position', 'uv'] as const) {
      const at = src.getAttribute(k)
      if (!at) continue
      const arr = new Float32Array(at.count * at.itemSize)
      for (let i = 0; i < at.count; i++) for (let j = 0; j < at.itemSize; j++) arr[i * at.itemSize + j] = at.getComponent(i, j)
      geo.setAttribute(k, new THREE.BufferAttribute(arr, at.itemSize))
    }
    if (src.index) geo.setIndex(src.index)
    geo.applyMatrix4(mesh.matrixWorld)
    const name = mesh.name || mesh.parent?.name || ''
    dynSrc[name] = new THREE.Mesh(geo)
    if (mesh.parent && mesh.parent !== dynG && !dynSrc[mesh.parent.name]) dynSrc[mesh.parent.name] = dynSrc[name]
  })
  const getDyn = (name: string) => {
    let m = dynSrc[name]
    if (!m) {
      // the exporter names nodes after objects; meshes may live one level down
      const n = dynG.getObjectByName(name)
      n?.traverse((c) => {
        if (!m && (c as THREE.Mesh).isMesh) m = c as THREE.Mesh
      })
    }
    return m
  }
  const dynMat = () => new THREE.MeshBasicMaterial({ map: dynT.t, color: 0xffffff })
  const glowSoft = radial(128, [
    [0, 'rgba(0,0,0,0.55)'],
    [0.55, 'rgba(0,0,0,0.25)'],
    [1, 'rgba(0,0,0,0)'],
  ])
  const shadowMat = new THREE.MeshBasicMaterial({ map: glowSoft, transparent: true, depthWrite: false, color: 0x000000, opacity: 1 })
  shadowMat.blending = THREE.NormalBlending
  const blob = (w: number, d: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), shadowMat)
    m.renderOrder = 1
    return m
  }
  const tint = new THREE.Color()
  const DYN_K = 1 / 1.35
  const tintMat = (mat: THREE.MeshBasicMaterial, x: number, z: number, extra = 1) => {
    lightAt(x, z, tint)
    mat.color.setRGB(Math.min(1.5, tint.r * DYN_K * extra + 0.04), Math.min(1.5, tint.g * DYN_K * extra + 0.05), Math.min(1.5, tint.b * DYN_K * extra + 0.08), THREE.LinearSRGBColorSpace)
  }

  // rover ------------------------------------------------------------
  const WR = 0.36
  const WHEELS: [number, number][] = [
    [0.66, -0.62],
    [0.66, 0.62],
    [-0.66, -0.62],
    [-0.66, 0.62],
  ]
  const rover = new THREE.Group()
  const roverMat = dynMat()
  const body = new THREE.Group()
  const bodyMesh = new THREE.Mesh(getDyn('rover').geometry, roverMat)
  const glowM = new THREE.Mesh(getDyn('rover_glow').geometry, new THREE.MeshBasicMaterial({ map: dynT.t, color: new THREE.Color(1.6, 1.5, 1.4) }))
  body.add(bodyMesh, glowM)
  rover.add(body)
  const wheels = WHEELS.map(([x, z]) => {
    const w = new THREE.Mesh(getDyn('wheel').geometry, roverMat)
    w.position.set(x, WR, z)
    w.rotation.order = 'YZX'
    rover.add(w)
    return w
  })
  const roverShadow = blob(2.6, 1.9)
  scene.add(roverShadow)
  // headlight pools: additive decal ahead of the rover
  const beamTex = (() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 256
    const g = c.getContext('2d')!
    const gr = g.createRadialGradient(64, 250, 4, 64, 150, 150)
    gr.addColorStop(0, 'rgba(255,236,200,0.55)')
    gr.addColorStop(0.5, 'rgba(255,220,170,0.22)')
    gr.addColorStop(1, 'rgba(255,210,160,0)')
    g.fillStyle = gr
    g.beginPath()
    g.moveTo(52, 256)
    g.lineTo(0, 0)
    g.lineTo(128, 0)
    g.lineTo(76, 256)
    g.fill()
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })()
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.4).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2).translate(3.6, 0, 0), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
  beam.renderOrder = 3
  scene.add(rover, beam)

  // dust -------------------------------------------------------------
  const DUST = 260
  const dPos = new Float32Array(DUST * 3)
  const dLife = new Float32Array(DUST)
  const dVel = new Float32Array(DUST * 3)
  const dSize = new Float32Array(DUST)
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3))
  dustGeo.setAttribute('aLife', new THREE.BufferAttribute(dLife, 1))
  dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1))
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uScale: { value: 1 }, uCol: { value: new THREE.Color('#c9b7b8') } },
    vertexShader: /* glsl */ `
      attribute float aLife; attribute float aSize; uniform float uScale; varying float vL;
      void main(){ vL = aLife; vec4 mv = modelViewMatrix * vec4(position,1.);
        gl_PointSize = aSize * (1.6 - aLife * 0.6) * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCol; varying float vL;
      void main(){ if (vL <= 0.) discard; float r = length(gl_PointCoord - .5) * 2.; float a = smoothstep(1., 0.2, r) * vL * 0.55;
        gl_FragColor = vec4(uCol, a); #include <colorspace_fragment> }`,
  })
  dustMat.fragmentShader = dustMat.fragmentShader.replace(' #include <colorspace_fragment> }', '\n#include <colorspace_fragment>\n}')
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.frustumCulled = false
  dust.renderOrder = 4
  scene.add(dust)
  let dHead = 0
  const puff = (x: number, y: number, z: number, vx: number, vz: number, n: number, spread = 0.6, size = 1) => {
    for (let k = 0; k < n; k++) {
      const i = dHead
      dHead = (dHead + 1) % DUST
      dPos[i * 3] = x + (Math.random() - 0.5) * spread
      dPos[i * 3 + 1] = y + Math.random() * 0.2
      dPos[i * 3 + 2] = z + (Math.random() - 0.5) * spread
      dVel[i * 3] = vx * 0.25 + (Math.random() - 0.5) * 1.2
      dVel[i * 3 + 1] = 0.6 + Math.random() * 0.9
      dVel[i * 3 + 2] = vz * 0.25 + (Math.random() - 0.5) * 1.2
      dLife[i] = 1
      dSize[i] = (90 + Math.random() * 90) * size
    }
  }

  // props ------------------------------------------------------------
  interface Body {
    kind: string
    mesh: THREE.Group
    mat: THREE.MeshBasicMaterial
    p: THREE.Vector3
    v: THREE.Vector3
    q: THREE.Quaternion
    w: THREE.Vector3
    he: THREE.Vector3 // half extents (local)
    r: number
    sleep: number
    asleep: boolean
    shadow: THREE.Mesh
    upright: boolean // round things rest upright or on their side
  }
  const bodies: Body[] = []
  const Rk: Record<string, number> = { cone: 0.26, parcel: 0.34, crate: 0.4, barrel: 0.33 }
  let spinePos: THREE.Vector3 | null = null,
    needlePos: THREE.Vector3 | null = null,
    dishPos: THREE.Vector3 | null = null
  const spine: THREE.Mesh[] = []
  let needle: THREE.Mesh | null = null
  let yoke: THREE.Mesh | null = null,
    bowl: THREE.Mesh | null = null
  const floaters: { m: THREE.Object3D; base: THREE.Vector3; yaw: number; ph: number; amp: number }[] = []
  const box3 = new THREE.Box3()
  for (const [kind, x, y, z, rot] of L.dyn) {
    const yaw = -rot
    if (kind in Rk) {
      const src = getDyn(kind)
      const mat = dynMat()
      const mesh = new THREE.Mesh(src.geometry, mat)
      src.geometry.computeBoundingBox()
      box3.copy(src.geometry.boundingBox!)
      const c = box3.getCenter(new THREE.Vector3())
      const he = box3.getSize(new THREE.Vector3()).multiplyScalar(0.5)
      mesh.position.copy(c).negate()
      const grp = new THREE.Group()
      grp.add(mesh)
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      const p = new THREE.Vector3(x, y, z).add(c.clone().applyQuaternion(q))
      const sh = blob(Rk[kind] * 3.2, Rk[kind] * 3.2)
      scene.add(grp, sh)
      bodies.push({ kind, mesh: grp, mat, p, v: new THREE.Vector3(), q, w: new THREE.Vector3(), he, r: Rk[kind], sleep: 0, asleep: false, shadow: sh, upright: kind === 'cone' || kind === 'barrel' })
    } else if (kind === 'spine') {
      spinePos = new THREE.Vector3(x, y, z)
      const src = getDyn('spine')
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Mesh(src.geometry, dynMat())
        m.scale.setScalar(1 - i * 0.045)
        scene.add(m)
        spine.push(m)
      }
    } else if (kind === 'needle') {
      needlePos = new THREE.Vector3(x, y, z)
      needle = new THREE.Mesh(getDyn('needle').geometry, dynMat())
      needle.position.copy(needlePos)
      scene.add(needle)
    } else if (kind === 'dish') {
      dishPos = new THREE.Vector3(x, y, z)
      yoke = new THREE.Mesh(getDyn('dish_yoke').geometry, dynMat())
      bowl = new THREE.Mesh(getDyn('dish').geometry, dynMat())
      yoke.position.copy(dishPos)
      bowl.position.set(0, 0.75, 0)
      yoke.add(bowl)
      scene.add(yoke)
    } else if (kind === 'buoy' || kind === 'boat') {
      const m = new THREE.Mesh(getDyn(kind).geometry, dynMat())
      m.position.set(x, y, z)
      m.rotation.y = yaw
      scene.add(m)
      floaters.push({ m, base: new THREE.Vector3(x, y, z), yaw, ph: kind === 'boat' ? 1.3 : 0, amp: kind === 'boat' ? 0.05 : 0.09 })
      tintMat(m.material as THREE.MeshBasicMaterial, x, z, kind === 'buoy' ? 1.6 : 1.2)
    }
  }
  for (const b of bodies) tintMat(b.mat, b.p.x, b.p.z)
  for (const m of spine) tintMat(m.material as THREE.MeshBasicMaterial, spinePos!.x, spinePos!.z, 1.2)
  if (needle) tintMat(needle.material as THREE.MeshBasicMaterial, needlePos!.x, needlePos!.z, 1.4)
  if (yoke && bowl) {
    tintMat(yoke.material as THREE.MeshBasicMaterial, dishPos!.x, dishPos!.z, 1.3)
    tintMat(bowl.material as THREE.MeshBasicMaterial, dishPos!.x, dishPos!.z, 1.3)
  }

  // station rings ------------------------------------------------------
  const ringMat = (col: string) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { ...U, uOn: { value: 0 }, uCol: { value: new THREE.Color(col) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uOn; uniform vec3 uCol; varying vec2 vUv;
        void main(){ vec2 d = vUv - .5; float r = length(d) * 2.; float a = atan(d.y, d.x);
          float band = smoothstep(0.9, 0.94, r) * (1. - smoothstep(0.97, 1.0, r));
          float dashes = step(0.5, fract(a * 9.549 + uTime * 0.25 * (0.4 + uOn)));
          float inner = (1. - smoothstep(0.0, 0.92, r)) * 0.12 * uOn;
          float k = band * mix(0.35 + 0.35 * dashes, 1.0, uOn) + inner;
          gl_FragColor = vec4(uCol * k, k); }`,
    })
  const STATION_COL: Record<StationId, string> = { board: '#f3d9b0', pad: '#7fe7ff', dock: '#ffa066', model: '#ffd27a', log: '#ff9cbf', pier: '#6fe0cf' }
  const rings = {} as Record<StationId, THREE.Mesh>
  for (const id of STATION_IDS) {
    const [x, y, z] = L.stations[id]
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2).rotateX(-Math.PI / 2), ringMat(STATION_COL[id]))
    m.position.set(x, (id === 'pier' ? y : hAt(x, z)) + 0.06, z)
    m.renderOrder = 3
    scene.add(m)
    rings[id] = m
  }
  // label anchors: above the structure each station is about
  const ANCHOR: Record<StationId, THREE.Vector3> = {
    board: new THREE.Vector3(-7.0, 3.6, 2.8),
    pad: new THREE.Vector3(-6.5, 5.4, -18.0),
    dock: new THREE.Vector3(18.4, 6.2, -11.4),
    model: new THREE.Vector3(13.2, 5.6, 11.4),
    log: new THREE.Vector3(-2.4, 4.6, 18.4),
    pier: new THREE.Vector3(-26.5, 2.8, 3.0),
  }

  // ---------------------------------------------------------------- colliders
  const circles = L.colliders.filter((c) => c[0] === 'c') as ['c', number, number, number][]
  const boxes = (L.colliders.filter((c) => c[0] === 'b') as ['b', number, number, number, number, number][]).map(([, x, z, hx, hy, r]) => ({ x, z, hx, hy, rz: -r }))
  const nrm = { x: 0, z: 0, d: 0 }
  // push a circle (x,z,r) out of static colliders; returns penetration normal in nrm
  const collide = (p: { x: number; z: number }, r: number) => {
    let hit = false
    for (const [, cx, cz, cr] of circles) {
      const dx = p.x - cx,
        dz = p.z - cz
      const d2 = dx * dx + dz * dz,
        rr = r + cr
      if (d2 < rr * rr && d2 > 1e-8) {
        const d = Math.sqrt(d2)
        p.x = cx + (dx / d) * rr
        p.z = cz + (dz / d) * rr
        nrm.x = dx / d
        nrm.z = dz / d
        nrm.d = rr - d
        hit = true
      }
    }
    for (const b of boxes) {
      // Blender frame: bx = x, by = -z
      const dx = p.x - b.x,
        dy = -(p.z - b.z)
      const c = Math.cos(b.rz),
        s = Math.sin(b.rz)
      const lx = dx * c + dy * s,
        ly = -dx * s + dy * c
      const qx = clamp(lx, -b.hx, b.hx),
        qy = clamp(ly, -b.hy, b.hy)
      let ex = lx - qx,
        ey = ly - qy
      let d = Math.hypot(ex, ey)
      if (d < r) {
        if (d < 1e-6) {
          // centre inside: push out along the shallow axis
          const ox = b.hx - Math.abs(lx),
            oy = b.hy - Math.abs(ly)
          if (ox < oy) {
            ex = Math.sign(lx) || 1
            ey = 0
          } else {
            ex = 0
            ey = Math.sign(ly) || 1
          }
          d = 0
        } else {
          ex /= d
          ey /= d
        }
        const nlx = qx + ex * r,
          nly = qy + ey * r
        const wx = nlx * c - nly * s,
          wy = nlx * s + nly * c
        p.x = b.x + wx
        p.z = b.z - wy
        const nx = ex * c - ey * s,
          ny = ex * s + ey * c
        nrm.x = nx
        nrm.z = -ny
        nrm.d = r - d
        hit = true
      }
    }
    // shoreline: deep water is a soft wall (except on the pier deck, which the heightfield already raises)
    const h = hAt(p.x, p.z)
    if (h < L.water - 0.45) {
      const e = 0.6
      const gx = hAt(p.x + e, p.z) - hAt(p.x - e, p.z),
        gz = hAt(p.x, p.z + e) - hAt(p.x, p.z - e)
      const gl = Math.hypot(gx, gz) || 1
      const k = clamp((L.water - 0.45 - h) * 0.6, 0.02, 0.4)
      p.x += (gx / gl) * k
      p.z += (gz / gl) * k
      nrm.x = gx / gl
      nrm.z = gz / gl
      nrm.d = k
      hit = true
    }
    return hit
  }

  // ---------------------------------------------------------------- car state
  const car = {
    x: L.spawn[0],
    z: L.spawn[2],
    y: hAt(L.spawn[0], L.spawn[2]) + WR,
    vx: 0,
    vz: 0,
    vy: 0,
    yaw: Math.PI / 2, // facing -z (north, into the island)
    steer: 0,
    pitch: 0,
    roll: 0,
    vp: 0,
    vr: 0,
    spin: 0,
    ground: true,
    air: 0,
  }
  const wheelY = [0, 0, 0, 0]
  const input = { up: 0, down: 0, left: 0, right: 0, boost: false, jump: false }
  let joyVec: { x: number; y: number } | null = null // screen-space joystick, -1..1
  let target: THREE.Vector3 | null = null // tap-to-drive point
  let controls = true
  let started = false
  let lastActive: StationId | null = null

  const FWD = new THREE.Vector3()
  const fwdOf = (yaw: number) => FWD.set(Math.cos(yaw), 0, -Math.sin(yaw))

  function respawn(x: number, z: number, yaw: number) {
    car.x = x
    car.z = z
    car.y = hAt(x, z) + WR + 0.05
    car.vx = car.vz = car.vy = 0
    car.yaw = yaw
    car.pitch = car.roll = car.vp = car.vr = 0
    target = null
  }

  // desired heading from a screen direction (camera-relative), for the joystick and tap-to-drive
  const camYaw = () => {
    const d = new THREE.Vector3()
    camera.getWorldDirection(d)
    return Math.atan2(-d.z, d.x)
  }

  function stepCar(dt: number) {
    const F = fwdOf(car.yaw)
    const Rx = Math.sin(car.yaw),
      Rz = Math.cos(car.yaw) // right-hand side (local -z of the rover)
    let vf = car.vx * F.x + car.vz * F.z
    let vl = car.vx * Rx + car.vz * Rz
    // inputs ---------------------------------------------------
    let thr = 0,
      steerT = 0
    if (controls) {
      thr = input.up - input.down
      steerT = input.left - input.right
      let want: number | null = null,
        mag = 0
      if (joyVec && Math.hypot(joyVec.x, joyVec.y) > 0.18) {
        // screen up = camera forward on the ground
        want = camYaw() + Math.atan2(-joyVec.x, -joyVec.y)
        mag = Math.min(1, Math.hypot(joyVec.x, joyVec.y))
        target = null
      } else if (target) {
        const dx = target.x - car.x,
          dz = target.z - car.z
        const d = Math.hypot(dx, dz)
        if (d < 1.4) target = null
        else {
          want = Math.atan2(-dz, dx)
          mag = clamp(d / 4, 0.45, 1)
        }
      }
      if (want !== null) {
        const diff = wrapA(want - car.yaw)
        steerT = clamp(diff * 2.2, -1, 1)
        thr = mag * (Math.abs(diff) > 2.4 && vf < 1 ? 0.6 : 1)
      }
    }
    car.steer = damp(car.steer, steerT, 9, dt)
    const max = input.boost ? 15 : 10.5
    if (car.ground) {
      if (thr > 0) vf += thr * (vf < 0 ? 26 : 16) * dt * (vf > max ? 0 : 1)
      else if (thr < 0) vf += thr * (vf > 0 ? 26 : 10) * dt * (vf < -6 ? 0 : 1)
      else vf *= Math.exp(-1.6 * dt)
      vf *= Math.exp(-0.25 * dt)
      // drift: grip drops when cornering hard at speed
      const drifting = Math.abs(car.steer) > 0.6 && Math.abs(vf) > 6.5
      const grip = drifting ? 2.2 : 9
      vl *= Math.exp(-grip * dt)
      const turn = car.steer * 2.5 * clamp(vf / 3.2, -1, 1) * (drifting ? 1.25 : 1)
      car.yaw += turn * dt
      // dust: drifting, hard launches, rough ground
      const slip = Math.abs(vl) + (thr && Math.abs(vf) < 4 ? 2.5 * Math.abs(thr) : 0)
      if (slip > 1.4 && Math.random() < slip * 0.18) {
        for (const [wx, wz] of [WHEELS[2], WHEELS[3]]) {
          const px = car.x + Math.cos(car.yaw) * wx + Math.sin(car.yaw) * -wz,
            pz = car.z - Math.sin(car.yaw) * wx + Math.cos(car.yaw) * -wz
          puff(px, hAt(px, pz) + 0.05, pz, -car.vx, -car.vz, 1, 0.3)
        }
      }
    } else {
      car.yaw += car.steer * 0.8 * dt
    }
    const F2 = fwdOf(car.yaw)
    const R2x = Math.sin(car.yaw),
      R2z = Math.cos(car.yaw)
    const ax = F2.x * vf + R2x * vl,
      az = F2.z * vf + R2z * vl
    const accF = (vf - (car.vx * F.x + car.vz * F.z)) / dt
    car.vx = ax
    car.vz = az
    // move + collide ----------------------------------------------
    const p = { x: car.x + car.vx * dt, z: car.z + car.vz * dt }
    if (collide(p, 0.95)) {
      const vn = car.vx * nrm.x + car.vz * nrm.z
      if (vn < 0) {
        car.vx -= vn * nrm.x * 1.35
        car.vz -= vn * nrm.z * 1.35
        if (vn < -4) {
          car.vy += Math.min(3, -vn * 0.25)
          car.vr += (Math.random() - 0.5) * 3
          puff(p.x - nrm.x * 0.9, car.y, p.z - nrm.z * 0.9, 0, 0, 6, 0.6)
        }
      }
    }
    car.x = clamp(p.x, -38, 38)
    car.z = clamp(p.z, -38, 38)
    // suspension ---------------------------------------------------
    const c = Math.cos(car.yaw),
      s = Math.sin(car.yaw)
    let sum = 0
    for (let i = 0; i < 4; i++) {
      const [lx, lz] = WHEELS[i]
      const wx = car.x + c * lx + s * lz,
        wz = car.z - s * lx + c * lz
      wheelY[i] = hAt(wx, wz)
      sum += wheelY[i]
    }
    const gAvg = sum / 4 + WR
    const comp = gAvg - car.y
    const wasAir = !car.ground
    if (comp > -0.06) {
      car.ground = true
      car.vy += (comp * 260 - car.vy * 15) * dt
      if (comp > 0.35) {
        car.y = gAvg - 0.35
        car.vy = Math.max(car.vy, 0)
      }
    } else {
      car.ground = false
    }
    car.vy -= 24 * dt
    if (input.jump && car.ground && comp > -0.02) {
      car.vy = 7.2
      car.ground = false
      car.vp -= 1.5
      input.jump = false
    }
    car.y += car.vy * dt
    if (car.ground && wasAir && car.air > 0.25) {
      puff(car.x, gAvg - WR + 0.05, car.z, 0, 0, 14, 1.4, 1.3)
      car.vp += (Math.random() - 0.5) * 2
    }
    car.air = car.ground ? 0 : car.air + dt
    // body pitch / roll: terrain + inertia, spring-damped (the bounce) ---------
    const pitchT = Math.atan2((wheelY[0] + wheelY[1]) / 2 - (wheelY[2] + wheelY[3]) / 2, 1.32) - accF * 0.006
    const rollT = Math.atan2((wheelY[0] + wheelY[2]) / 2 - (wheelY[1] + wheelY[3]) / 2, 1.24) * -1 + (vl * 0.02 + car.steer * clamp(vf, -10, 10) * 0.012)
    if (car.ground) {
      car.vp += ((pitchT - car.pitch) * 140 - car.vp * 11) * dt
      car.vr += ((rollT - car.roll) * 150 - car.vr * 11) * dt
    } else {
      car.vp *= Math.exp(-1.5 * dt)
      car.vr *= Math.exp(-1.5 * dt)
    }
    car.pitch += car.vp * dt
    car.roll += car.vr * dt
    car.spin -= (vf * dt) / WR
    if (car.y < -4) respawn(L.spawn[0], L.spawn[2], Math.PI / 2)
  }

  // props physics ------------------------------------------------------
  const UP = new THREE.Vector3(0, 1, 0)
  const tv = new THREE.Vector3(),
    tq = new THREE.Quaternion(),
    tq2 = new THREE.Quaternion()
  const AX = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
  const ext = (b: Body) => {
    // OBB support along world up
    let e = 0
    for (let k = 0; k < 3; k++) {
      tv.copy(AX[k]).applyQuaternion(b.q)
      e += Math.abs(tv.y) * (k === 0 ? b.he.x : k === 1 ? b.he.y : b.he.z)
    }
    return e
  }
  const restQ = (b: Body, out: THREE.Quaternion) => {
    if (b.upright) {
      tv.copy(AX[1]).applyQuaternion(b.q)
      if (tv.y > 0.45) return out.setFromUnitVectors(tv.clone(), UP).multiply(b.q)
      const h = tv.clone().setY(0)
      if (h.lengthSq() < 1e-6) h.set(1, 0, 0)
      return out.setFromUnitVectors(tv.clone(), h.normalize()).multiply(b.q)
    }
    let best = -2,
      bv = new THREE.Vector3()
    for (let k = 0; k < 3; k++) {
      tv.copy(AX[k]).applyQuaternion(b.q)
      for (const sg of [1, -1]) {
        const d = tv.y * sg
        if (d > best) {
          best = d
          bv = tv.clone().multiplyScalar(sg)
        }
      }
    }
    return out.setFromUnitVectors(bv, UP).multiply(b.q)
  }
  function stepProps(dt: number) {
    let awake = false
    const vf = Math.hypot(car.vx, car.vz)
    for (const b of bodies) {
      // rover contact
      const dx = b.p.x - car.x,
        dz = b.p.z - car.z
      const d = Math.hypot(dx, dz),
        rr = b.r + 0.95
      if (d < rr && b.p.y - car.y < 1.3 && d > 1e-4) {
        const nx = dx / d,
          nz = dz / d
        const rel = (car.vx - b.v.x) * nx + (car.vz - b.v.z) * nz
        b.p.x = car.x + nx * rr
        b.p.z = car.z + nz * rr
        if (rel > 0.3) {
          b.v.x += nx * rel * 1.25 + car.vx * 0.2
          b.v.z += nz * rel * 1.25 + car.vz * 0.2
          b.v.y += 1.4 + rel * 0.38
          tv.set(nz, 0, -nx).multiplyScalar(rel * (2.2 + Math.random()))
          b.w.add(tv)
          b.w.y += (Math.random() - 0.5) * rel
          car.vx -= nx * rel * 0.12
          car.vz -= nz * rel * 0.12
          if (rel > 3) puff(b.p.x, b.p.y, b.p.z, 0, 0, 3, 0.4, 0.7)
        }
        b.asleep = false
        b.sleep = 0
      }
      if (b.asleep) continue
      awake = true
      b.v.y -= 22 * dt
      b.p.addScaledVector(b.v, dt)
      const wl = b.w.length()
      if (wl > 1e-5) {
        tq.setFromAxisAngle(tv.copy(b.w).divideScalar(wl), wl * dt)
        b.q.premultiply(tq).normalize()
      }
      // floor: ground or the top of a prop underneath
      const e = ext(b)
      let floor = hAt(b.p.x, b.p.z)
      for (const o of bodies) {
        if (o === b) continue
        const ddx = o.p.x - b.p.x,
          ddz = o.p.z - b.p.z
        if (ddx * ddx + ddz * ddz < (b.r + o.r) * (b.r + o.r) * 0.45) {
          const top = o.p.y + ext(o)
          if (top <= b.p.y - e + 0.2) floor = Math.max(floor, top)
        }
      }
      let onGround = false
      if (b.p.y - e < floor) {
        b.p.y = floor + e
        if (b.v.y < 0) b.v.y = b.v.y < -2.5 ? -b.v.y * 0.28 : 0
        b.v.x *= Math.exp(-7 * dt)
        b.v.z *= Math.exp(-7 * dt)
        b.w.multiplyScalar(Math.exp(-6 * dt))
        restQ(b, tq2)
        b.q.slerp(tq2, 1 - Math.exp(-9 * dt))
        onGround = true
      }
      // neighbours (side by side)
      for (const o of bodies) {
        if (o === b) continue
        const ddx = b.p.x - o.p.x,
          ddz = b.p.z - o.p.z
        const dd = Math.hypot(ddx, ddz),
          r2 = (b.r + o.r) * 0.9
        if (dd < r2 && dd > 1e-4 && Math.abs(b.p.y - o.p.y) < (ext(b) + ext(o)) * 0.85) {
          const nx = ddx / dd,
            nz = ddz / dd,
            push = (r2 - dd) * 0.5
          b.p.x += nx * push
          b.p.z += nz * push
          o.p.x -= nx * push
          o.p.z -= nz * push
          const rel = (b.v.x - o.v.x) * nx + (b.v.z - o.v.z) * nz
          if (rel < 0) {
            b.v.x -= nx * rel * 0.6
            b.v.z -= nz * rel * 0.6
            o.v.x += nx * rel * 0.6
            o.v.z += nz * rel * 0.6
            o.w.x += nz * -rel * 0.8
            o.w.z += -nx * -rel * 0.8
          }
          if (o.asleep && (push > 0.01 || rel < -0.2)) {
            o.asleep = false
            o.sleep = 0
          }
        }
      }
      const pp = { x: b.p.x, z: b.p.z }
      if (collide(pp, b.r)) {
        const vn = b.v.x * nrm.x + b.v.z * nrm.z
        if (vn < 0) {
          b.v.x -= vn * nrm.x * 1.4
          b.v.z -= vn * nrm.z * 1.4
        }
        b.p.x = pp.x
        b.p.z = pp.z
      }
      if (b.p.y < L.water - 2) {
        // fell in the sea: it bobs back to where it started
        b.v.set(0, 0, 0)
        b.p.y = L.water - 2
      }
      const still = b.v.lengthSq() < 0.004 && b.w.lengthSq() < 0.01 && onGround
      b.sleep = still ? b.sleep + 1 : 0
      if (b.sleep > 40) {
        b.asleep = true
        b.v.set(0, 0, 0)
        b.w.set(0, 0, 0)
      }
    }
    void vf
    return awake
  }

  // ---------------------------------------------------------------- steering spine + dish
  let steerView: SteerView | null = null
  let steerAnim = { bend: 0, needle: 0 }
  const HUE = { joy: new THREE.Color('#ffc95a'), distress: new THREE.Color('#9b7bff'), certainty: new THREE.Color('#62dcff') }
  const NEG = new THREE.Color('#8d6bff')
  const ALPHAS = [-1.2, -0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9, 1.2]
  const tickYaw = (i: number) => ((-120 + i * 30) * Math.PI) / 180 - Math.PI / 2
  function placeSpine(dt: number) {
    if (!spinePos || !needle) return false
    const ai = steerView ? steerView.ai : 4
    const bendT = ALPHAS[ai] * 0.085
    const needleT = tickYaw(ai)
    const k = dt > 0 ? 1 - Math.exp(-6 * dt) : 1
    steerAnim.bend += (bendT - steerAnim.bend) * k
    steerAnim.needle += wrapA(needleT - steerAnim.needle) * k
    needle.rotation.y = steerAnim.needle
    // the spine leans toward the needle's direction, bending more at higher |alpha|
    const dir = new THREE.Vector3(Math.cos(steerAnim.needle), 0, -Math.sin(steerAnim.needle))
    const axis = new THREE.Vector3(dir.z, 0, -dir.x)
    const p = spinePos.clone()
    let ang = 0
    const expr = steerView?.expr
    const mx = expr ? Math.max(...expr.map(Math.abs), 1e-3) : 1
    for (let i = 0; i < spine.length; i++) {
      const m = spine[i]
      m.position.copy(p)
      m.quaternion.setFromAxisAngle(axis, ang)
      const segH = 0.38 * (1 - i * 0.045)
      p.add(new THREE.Vector3(0, segH, 0).applyAxisAngle(axis, ang))
      ang += Math.abs(steerAnim.bend) * (i < 2 ? 0.4 : 1)
      const mat = m.material as THREE.MeshBasicMaterial
      lightAt(spinePos.x, spinePos.z, tint)
      const base = tint.multiplyScalar(DYN_K * 1.1)
      if (expr && steerView) {
        const v = expr[i] / mx
        const hue = v >= 0 ? HUE[steerView.hue] : NEG
        const lit = Math.abs(v) * (i === ai ? 1.6 : 0.9)
        mat.color.setRGB(base.r + hue.r * lit, base.g + hue.g * lit, base.b + hue.b * lit, THREE.LinearSRGBColorSpace)
      } else mat.color.setRGB(base.r + 0.05, base.g + 0.05, base.b + 0.06, THREE.LinearSRGBColorSpace)
    }
    return Math.abs(bendT - steerAnim.bend) > 1e-3 || Math.abs(wrapA(needleT - steerAnim.needle)) > 1e-3
  }
  let dishLook: { az: number; el: number; up: boolean } | null = null
  const dishAnim = { yaw: 0.6, el: 0.5 }
  function placeDish(dt: number) {
    if (!yoke || !bowl) return false
    const yawT = dishLook ? Math.PI / 2 - (dishLook.az * Math.PI) / 180 : 0.6
    const elT = dishLook ? (Math.max(dishLook.el, 4) * Math.PI) / 180 : 0.5
    const k = dt > 0 ? 1 - Math.exp(-2.5 * dt) : 1
    dishAnim.yaw += wrapA(yawT - dishAnim.yaw) * k
    dishAnim.el += (elT - dishAnim.el) * k
    yoke.rotation.y = dishAnim.yaw
    bowl.rotation.z = dishAnim.el
    return Math.abs(wrapA(yawT - dishAnim.yaw)) > 1e-3 || Math.abs(elT - dishAnim.el) > 1e-3
  }

  // ---------------------------------------------------------------- camera
  const portrait = () => innerHeight >= innerWidth
  const camCfg = () => (portrait() ? { off: new THREE.Vector3(8.5, 16.5, 17.5).multiplyScalar(1.5), fov: 40 } : { off: new THREE.Vector3(8.5, 16.5, 17.5).multiplyScalar(1.2), fov: 32 })
  const OVER = {
    d: { tgt: new THREE.Vector3(-1.5, 0, -1.5), off: new THREE.Vector3(13, 37, 40), fov: 34 },
    m: { tgt: new THREE.Vector3(-1.5, 0, -12.0), off: new THREE.Vector3(6, 84, 44), fov: 48 },
  }
  let zoom = 1
  const camT = new THREE.Vector3(car.x, car.y, car.z)
  const camP = new THREE.Vector3()
  let intro: { t: number; from: { p: THREE.Vector3; t: THREE.Vector3; fov: number } } | null = null
  const overview = () => (portrait() ? OVER.m : OVER.d)
  // the poster still is shown with object-fit: cover; match its crop so the world fades in on the same picture
  const coverFov = (fov: number, ar: number) => {
    const a = canvas.clientWidth / Math.max(1, canvas.clientHeight)
    return a > ar ? (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * (ar / a)) * 180) / Math.PI : fov
  }
  function setOverview() {
    const ov = overview()
    camT.copy(ov.tgt)
    camP.copy(ov.tgt).add(ov.off)
    camera.fov = coverFov(ov.fov, portrait() ? 390 / 844 : 1.6)
    camera.updateProjectionMatrix()
    camera.position.copy(camP)
    camera.lookAt(camT)
  }
  if (o.intro === 'overview') setOverview()
  else {
    const cc = camCfg()
    camT.set(car.x, car.y, car.z)
    camP.copy(camT).add(cc.off)
    camera.fov = cc.fov
  }
  const insets = { right: 0, bottom: 0, top: 0 }
  function stepCamera(dt: number) {
    if (!started) {
      camera.position.copy(camP)
      camera.lookAt(camT)
      return false
    }
    const cc = camCfg()
    const lead = new THREE.Vector3(car.vx, 0, car.vz).multiplyScalar(0.22)
    const tgt = new THREE.Vector3(car.x, car.y - WR + 0.6, car.z).add(lead)
    const pos = tgt.clone().add(cc.off.clone().multiplyScalar(zoom))
    if (intro) {
      intro.t += dt / (o.reduced ? 0.001 : 2.4)
      const k = ease(Math.min(1, intro.t))
      camT.lerpVectors(intro.from.t, tgt, k)
      camP.lerpVectors(intro.from.p, pos, k)
      camera.fov = intro.from.fov + (cc.fov - intro.from.fov) * k
      if (intro.t >= 1) intro = null
    } else {
      camT.x = damp(camT.x, tgt.x, 5, dt)
      camT.y = damp(camT.y, tgt.y, 3, dt)
      camT.z = damp(camT.z, tgt.z, 5, dt)
      camP.x = damp(camP.x, pos.x, 4.2, dt)
      camP.y = damp(camP.y, pos.y, 3, dt)
      camP.z = damp(camP.z, pos.z, 4.2, dt)
      camera.fov = damp(camera.fov, cc.fov, 4, dt)
    }
    camera.position.copy(camP)
    camera.lookAt(camT)
    camera.updateProjectionMatrix()
    return !!intro || camP.distanceToSquared(pos) > 1e-4
  }
  function applyInsets() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight
    if (started && (insets.right > 0 || insets.bottom > 0 || insets.top > 0)) camera.setViewOffset(w + insets.right, h + insets.bottom + insets.top, insets.right, insets.bottom, w, h)
    else camera.clearViewOffset()
  }

  // ---------------------------------------------------------------- sizing
  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    if (!started && o.intro === 'overview') setOverview()
    applyInsets()
    camera.updateProjectionMatrix()
    const s = (h * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360))
    glowMat.uniforms.uScale.value = s
    dustMat.uniforms.uScale.value = s * 0.012
    wake()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  // ---------------------------------------------------------------- pins
  const pv = new THREE.Vector3()
  function project() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight
    const out = {} as Record<StationId, Pin>
    for (const id of STATION_IDS) {
      pv.copy(ANCHOR[id])
      pv.project(camera)
      out[id] = { x: ((pv.x + 1) / 2) * w, y: ((1 - pv.y) / 2) * h, on: pv.z < 1 && pv.x > -1.05 && pv.x < 1.05 && pv.y > -1.05 && pv.y < 1.1 }
    }
    return out
  }
  const roverPin = () => {
    pv.set(car.x, car.y + 1.9, car.z).project(camera)
    return { x: ((pv.x + 1) / 2) * canvas.clientWidth, y: ((1 - pv.y) / 2) * canvas.clientHeight, on: pv.z < 1 }
  }

  // ---------------------------------------------------------------- input
  const keys: Record<string, keyof typeof input> = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  }
  const typing = () => {
    const a = document.activeElement as HTMLElement | null
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable || !!a.closest('[data-w2-sheet]'))
  }
  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (!controls || (down && typing())) return
    const k = keys[e.code]
    if (k) {
      ;(input as Record<string, number | boolean>)[k] = down ? 1 : 0
      e.preventDefault()
      if (down) firstDrive()
      wake()
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.boost = down
    else if (e.code === 'Space' && down) {
      const a = document.activeElement as HTMLElement | null
      if (a && a !== document.body && a !== canvas) return // space activates focused buttons
      input.jump = true
      e.preventDefault()
      firstDrive()
      wake()
    } else if (e.code === 'KeyR' && down && !e.metaKey && !e.ctrlKey) {
      api.unstuck()
    }
  }
  const kd = (e: KeyboardEvent) => onKey(e, true)
  const ku = (e: KeyboardEvent) => onKey(e, false)
  addEventListener('keydown', kd)
  addEventListener('keyup', ku)
  const blur = () => {
    input.up = input.down = input.left = input.right = 0
    input.boost = false
  }
  addEventListener('blur', blur)

  let drove = false
  function firstDrive() {
    if (!started) api.start()
    if (!drove) {
      drove = true
      o.onDrive()
    }
  }

  // pointer: drag = floating joystick, tap = drive to that spot, pinch = zoom
  const pts = new Map<number, { x: number; y: number; sx: number; sy: number; t: number }>()
  let pinch0 = 0,
    zoom0 = 1
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const showJoy = (sx: number, sy: number, dx: number, dy: number) => {
    if (!o.joy) return
    o.joy.style.transform = `translate3d(${sx}px, ${sy}px, 0)`
    o.joy.setAttribute('data-on', '')
    const k = o.joy.firstElementChild as HTMLElement | null
    if (k) k.style.transform = `translate3d(${dx * 34}px, ${dy * 34}px, 0)`
  }
  const hideJoy = () => o.joy?.removeAttribute('data-on')
  const pd = (e: PointerEvent) => {
    if (!controls) return
    canvas.setPointerCapture(e.pointerId)
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() })
    if (pts.size === 2) {
      const [a, b] = [...pts.values()]
      pinch0 = Math.hypot(a.x - b.x, a.y - b.y)
      zoom0 = zoom
      joyVec = null
      hideJoy()
    }
    firstDrive()
    wake()
  }
  const pm = (e: PointerEvent) => {
    const p = pts.get(e.pointerId)
    if (!p) return
    p.x = e.clientX
    p.y = e.clientY
    if (pts.size === 2) {
      const [a, b] = [...pts.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch0 > 0) zoom = clamp((zoom0 * pinch0) / d, 0.6, 1.7)
      wake()
      return
    }
    const dx = p.x - p.sx,
      dy = p.y - p.sy
    if (Math.hypot(dx, dy) > 12) {
      const len = Math.hypot(dx, dy)
      const k = Math.min(1, len / 70)
      joyVec = { x: (dx / len) * k, y: (dy / len) * k }
      showJoy(p.sx, p.sy, joyVec.x, joyVec.y)
      wake()
    }
  }
  const pu = (e: PointerEvent) => {
    const p = pts.get(e.pointerId)
    pts.delete(e.pointerId)
    if (!p) return
    const moved = Math.hypot(p.x - p.sx, p.y - p.sy)
    if (moved < 10 && performance.now() - p.t < 350 && pts.size === 0) {
      const r = canvas.getBoundingClientRect()
      ndc.set(((p.x - r.left) / r.width) * 2 - 1, -((p.y - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObject(terrainMesh, false)[0]
      if (hit) {
        target = hit.point.clone()
        puff(target.x, hAt(target.x, target.z) + 0.05, target.z, 0, 0, 5, 0.5, 0.6)
      }
    }
    if (pts.size === 0) {
      joyVec = null
      hideJoy()
    }
    wake()
  }
  canvas.addEventListener('pointerdown', pd)
  canvas.addEventListener('pointermove', pm)
  canvas.addEventListener('pointerup', pu)
  canvas.addEventListener('pointercancel', pu)
  const ctx = (e: Event) => e.preventDefault()
  canvas.addEventListener('contextmenu', ctx)
  const wheel = (e: WheelEvent) => {
    e.preventDefault()
    zoom = clamp(zoom * Math.exp(e.deltaY * 0.0012), 0.6, 1.7)
    wake()
  }
  canvas.addEventListener('wheel', wheel, { passive: false })

  // ---------------------------------------------------------------- loop (on demand)
  let raf = 0
  let running = false
  let last = 0
  let acc = 0
  let idleFor = 0
  let hidden = document.hidden
  let time = 0
  let lost = false
  const vis = () => {
    hidden = document.hidden
    if (!hidden) wake()
  }
  document.addEventListener('visibilitychange', vis)
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    lost = true
    o.onLost()
  })

  function wake() {
    idleFor = 0
    if (running || hidden || lost) return
    running = true
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  const DT = 1 / 60
  let ambientT = 0
  function frame(now: number) {
    raf = 0
    if (hidden || lost) {
      running = false
      return
    }
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    acc += dt
    time += dt
    U.uTime.value = time
    let moving = false
    let steps = 0
    while (acc >= DT && steps < 5) {
      if (started) stepCar(DT)
      if (stepProps(DT)) moving = true
      acc -= DT
      steps++
    }
    if (steps === 5) acc = 0
    // dust
    let dustOn = false
    for (let i = 0; i < DUST; i++) {
      if (dLife[i] <= 0) continue
      dustOn = true
      dLife[i] -= dt * 1.1
      dPos[i * 3] += dVel[i * 3] * dt
      dPos[i * 3 + 1] += dVel[i * 3 + 1] * dt
      dPos[i * 3 + 2] += dVel[i * 3 + 2] * dt
      dVel[i * 3 + 1] *= 0.97
      dVel[i * 3] *= 0.96
      dVel[i * 3 + 2] *= 0.96
    }
    ;(dustGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true
    ;(dustGeo.attributes.aLife as THREE.BufferAttribute).needsUpdate = true
    ;(dustGeo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true

    // rover transforms
    rover.position.set(car.x, 0, car.z)
    rover.rotation.y = car.yaw
    body.position.y = car.y
    body.rotation.order = 'ZXY'
    body.rotation.set(car.roll, 0, car.pitch)
    const c = Math.cos(car.yaw),
      s = Math.sin(car.yaw)
    for (let i = 0; i < 4; i++) {
      const w = wheels[i]
      const [lx, lz] = WHEELS[i]
      const bodyAt = car.y + Math.sin(car.pitch) * lx - Math.sin(car.roll) * lz * 0
      w.position.y = clamp(wheelY[i] + WR, bodyAt - 0.3, bodyAt + 0.12)
      w.rotation.set(0, i < 2 ? car.steer * 0.42 : 0, car.spin)
    }
    tintMat(roverMat, car.x, car.z, 1.05)
    const gy = hAt(car.x, car.z)
    const hgt = Math.max(0, car.y - WR - gy)
    roverShadow.position.set(car.x, gy + 0.04, car.z)
    roverShadow.rotation.y = car.yaw
    roverShadow.scale.setScalar(1 + hgt * 0.4)
    ;(roverShadow.material as THREE.MeshBasicMaterial).opacity = clamp(1 - hgt * 0.5, 0.25, 1)
    beam.position.set(car.x, hAt(car.x + c * 3.6, car.z - s * 3.6) + 0.05, car.z)
    beam.rotation.y = car.yaw
    ;(beam.material as THREE.MeshBasicMaterial).opacity = car.ground ? 1 : 0.4
    grassMat.uniforms.uCar.value.set(car.x, car.y, car.z)

    for (const b of bodies) {
      b.mesh.position.copy(b.p)
      b.mesh.quaternion.copy(b.q)
      const g = hAt(b.p.x, b.p.z)
      b.shadow.position.set(b.p.x, g + 0.03, b.p.z)
      const hh = Math.max(0, b.p.y - ext(b) - g)
      ;(b.shadow.material as THREE.MeshBasicMaterial).opacity = 1
      b.shadow.scale.setScalar(1 + hh * 0.3)
      if (!b.asleep) tintMat(b.mat, b.p.x, b.p.z)
    }
    for (const f of floaters) {
      f.m.position.y = f.base.y + Math.sin(time * 1.4 + f.ph) * f.amp
      f.m.rotation.set(Math.sin(time * 1.1 + f.ph) * 0.05, f.yaw, Math.cos(time * 0.9 + f.ph) * 0.06)
    }
    const sp = placeSpine(dt)
    const dp = placeDish(dt)
    const cm = stepCamera(dt)

    // station rings
    let active: StationId | null = null
    for (const id of STATION_IDS) {
      const [x, , z] = L.stations[id]
      const d = Math.hypot(car.x - x, car.z - z)
      const inside = d < (lastActive === id ? 3.1 : 2.5)
      if (inside && started) active = id
      const u = (rings[id].material as THREE.ShaderMaterial).uniforms.uOn
      u.value = damp(u.value, inside && started ? 1 : 0, 6, dt)
    }
    if (active !== lastActive) {
      lastActive = active
      o.onStation(active)
    }

    renderer.render(scene, camera)
    o.onPins(project(), roverPin())

    const carMoving = started && (Math.hypot(car.vx, car.vz) > 0.04 || !car.ground || Math.abs(car.vp) + Math.abs(car.vr) > 0.02 || Math.abs(car.vy) > 0.05)
    const inputOn = input.up || input.down || input.left || input.right || joyVec || target || pts.size > 0
    moving = moving || carMoving || !!inputOn || sp || dp || cm || dustOn
    if (moving) idleFor = 0
    else idleFor += dt
    // after motion stops: keep the water and grass alive at a low rate for a while, then sleep entirely
    if (idleFor < 0.6) raf = requestAnimationFrame(frame)
    else if (idleFor < 12 && !o.reduced) {
      ambientT = window.setTimeout(() => {
        ambientT = 0
        last = performance.now() - 1000 / 20
        raf = requestAnimationFrame(frame)
      }, 1000 / 20) as unknown as number
    } else running = false
  }

  await yieldTask()
  // compile shaders and upload textures off the critical path where the browser supports it
  for (const t of [terrT.t, propT.t, dynT.t, lightT.t]) {
    renderer.initTexture(t)
    await yieldTask()
  }
  const compileAsync = (renderer as unknown as { compileAsync?: (s: THREE.Scene, c: THREE.Camera) => Promise<unknown> }).compileAsync
  if (compileAsync) await compileAsync.call(renderer, scene, camera)
  await yieldTask()
  resize()
  // first frame (static, intro pose)
  placeSpine(0)
  placeDish(0)
  renderer.render(scene, camera)
  o.onPins(project(), roverPin())
  wake()

  const api: WorldApi = {
    start() {
      if (started) return
      started = true
      applyInsets()
      camera.updateProjectionMatrix()
      if (o.intro === 'overview') intro = { t: 0, from: { p: camP.clone(), t: camT.clone(), fov: camera.fov } }
      wake()
    },
    teleport(id) {
      const [x, y, z] = L.stations[id]
      // arrive at the ring's near side, facing the structure
      const a = ANCHOR[id]
      const yaw = Math.atan2(-(a.z - z), a.x - x)
      const back = 0.8
      respawn(x - Math.cos(yaw) * back, z + Math.sin(yaw) * back, yaw)
      if (id === 'pier') car.y = y + WR + 0.1
      puff(car.x, hAt(car.x, car.z) + 0.1, car.z, 0, 0, 22, 1.8, 1.4)
      if (!started) {
        started = true
        intro = null
        applyInsets()
      }
      // snap the camera most of the way (a cut in reduced motion)
      const cc = camCfg()
      const tgt = new THREE.Vector3(car.x, car.y - WR + 0.6, car.z)
      if (o.reduced) {
        camT.copy(tgt)
        camP.copy(tgt).add(cc.off.clone().multiplyScalar(zoom))
      } else {
        intro = { t: 0.25, from: { p: camP.clone(), t: camT.clone(), fov: camera.fov } }
      }
      wake()
    },
    setSteer(v) {
      steerView = v
      wake()
    },
    setDish(look) {
      dishLook = look
      wake()
    },
    setInsets(i) {
      insets.right = i.right
      insets.bottom = i.bottom
      insets.top = i.top ?? 0
      applyInsets()
      camera.updateProjectionMatrix()
      wake()
    },
    setControls(on) {
      controls = on
      if (!on) {
        blur()
        joyVec = null
        target = null
        hideJoy()
      }
    },
    wake,
    unstuck() {
      respawn(car.x + (Math.random() - 0.5) * 0.4, car.z + (Math.random() - 0.5) * 0.4, car.yaw)
      car.vy = 4
      puff(car.x, car.y, car.z, 0, 0, 10, 1)
      wake()
    },
    posterCam(k) {
      const ov = OVER[k]
      camT.copy(ov.tgt)
      camP.copy(ov.tgt).add(ov.off)
      camera.fov = ov.fov
      camera.position.copy(camP)
      camera.lookAt(camT)
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    },
    project,
    dispose() {
      cancelAnimationFrame(raf)
      clearTimeout(ambientT)
      ro.disconnect()
      removeEventListener('keydown', kd)
      removeEventListener('keyup', ku)
      removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', vis)
      canvas.removeEventListener('pointerdown', pd)
      canvas.removeEventListener('pointermove', pm)
      canvas.removeEventListener('pointerup', pu)
      canvas.removeEventListener('pointercancel', pu)
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('contextmenu', ctx)
      scene.traverse((m) => {
        const mesh = m as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
      })
      for (const t of [terrT.t, propT.t, dynT.t, lightT.t, heightTex, glowSoft, beamTex]) t.dispose()
      renderer.dispose()
    },
  }
  return api
}
