import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const sstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3)
/** deterministic pseudo-random in [0,1) */
export const rnd = (i: number, s = 0) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
  return x - Math.floor(x)
}

export interface Ctx {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  cam: THREE.PerspectiveCamera
  mobile: boolean
  gltf: GLTFLoader
  tex: (url: string, srgb?: boolean) => Promise<THREE.Texture>
  pmrem: THREE.PMREMGenerator
}

export interface Chapter {
  group: THREE.Object3D
  /** local 0..1 within its span; sets camera, uniforms; returns marks to project */
  update(local: number, time: number, dt: number): void
  near: number
  far: number
  bg: THREE.Color
  fog?: THREE.Fog | THREE.FogExp2 | null
  marks?: Record<string, THREE.Vector3 | null>
  dispose?: () => void
}

export function makeCtxLoaders(renderer: THREE.WebGLRenderer) {
  const gltf = new GLTFLoader()
  gltf.setMeshoptDecoder(MeshoptDecoder)
  const bmp = new THREE.ImageBitmapLoader()
  bmp.setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none' })
  const bmpNoFlip = new THREE.ImageBitmapLoader()
  bmpNoFlip.setOptions({ imageOrientation: 'none', premultiplyAlpha: 'none' })
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  /** `flip=false` for glTF-UV textures. ImageBitmaps ignore texture.flipY, so orientation is decided at decode. */
  const load = (url: string, srgb = true, flip = false) =>
    new Promise<THREE.Texture>((res, rej) => {
      ;(flip ? bmp : bmpNoFlip).load(
        url,
        (img) => {
          const t = new THREE.Texture(img as unknown as HTMLImageElement)
          t.flipY = false
          t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
          t.anisotropy = aniso
          t.generateMipmaps = true
          t.minFilter = THREE.LinearMipmapLinearFilter
          t.needsUpdate = true
          res(t)
        },
        undefined,
        rej,
      )
    })
  return { gltf, load }
}

/** A small "studio in the dark" environment: soft panels for glass and metal to reflect. */
export function studioEnv(pmrem: THREE.PMREMGenerator, warm = 0.6) {
  const s = new THREE.Scene()
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `varying vec3 vP; void main(){ float y = vP.y; vec3 c = mix(vec3(.004,.006,.012), vec3(.03,.045,.075), smoothstep(-.4,.9,y)); gl_FragColor = vec4(c,1.); }`,
    }),
  )
  s.add(sky)
  const panel = (w: number, h: number, c: THREE.ColorRepresentation, k: number, p: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }))
    m.position.set(...p)
    m.lookAt(0, 0, 0)
    s.add(m)
  }
  panel(30, 6, '#cfe2ff', 3.2, [0, 30, 6])
  panel(10, 26, '#bcd6ff', 1.6, [-30, 4, 10])
  panel(8, 20, '#ffd2a0', 2.2 * warm, [30, 0, -8])
  panel(18, 4, '#7fa6ff', 1.2, [0, -6, -30])
  const env = pmrem.fromScene(s, 0.035).texture
  s.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    }
  })
  return env
}

/** Space environment for the satellite: black sky, the sunlit Earth filling the lower hemisphere, a hot sun. */
export function spaceEnv(pmrem: THREE.PMREMGenerator, sun: THREE.Vector3, dip: number) {
  const s = new THREE.Scene()
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(50, 64, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { uSun: { value: sun.clone().normalize() }, uDip: { value: -Math.sin(dip) } },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `
        varying vec3 vP; uniform vec3 uSun; uniform float uDip;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
        float n3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        void main(){
          vec3 d = normalize(vP);
          float earth = 1. - smoothstep(uDip - .02, uDip + .02, d.y);
          float cl = smoothstep(.45, .75, n3(d * 9.) * .65 + n3(d * 23.) * .35);
          vec3 ground = mix(vec3(.02,.07,.16), vec3(.55,.62,.72), cl) * (.55 + .8 * max(dot(vec3(0.,1.,0.), uSun), 0.));
          float limb = exp(-abs(d.y - uDip) * 40.);
          vec3 c = mix(vec3(0.), ground, earth) + vec3(.25,.5,1.) * limb * .9;
          float sd = max(dot(d, uSun), 0.);
          c += vec3(1., .93, .82) * (pow(sd, 900.) * 60. + pow(sd, 40.) * .25);
          gl_FragColor = vec4(c, 1.);
        }`,
    }),
  )
  s.add(m)
  const env = pmrem.fromScene(s, 0.0).texture
  m.geometry.dispose()
  ;(m.material as THREE.Material).dispose()
  return env
}

/** Soft round sprite texture for particles. */
export function dotTexture(size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  return t
}

export function disposeTree(o: THREE.Object3D) {
  o.traverse((x) => {
    const m = x as THREE.Mesh
    if (m.geometry) m.geometry.dispose()
    const mat = m.material as THREE.Material | THREE.Material[] | undefined
    if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((mm) => mm.dispose())
  })
}

/** Pull a mesh's geometry out of a glTF scene with its node transform baked in. Meshopt-quantized attributes
 *  (normalized int16/int8) are expanded to float first, or applyMatrix4 would clamp them. */
export function bakedGeometry(root: THREE.Object3D, name?: string) {
  const out: THREE.BufferGeometry[] = []
  root.updateMatrixWorld(true)
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || (name && m.name !== name)) return
    const g = m.geometry.clone()
    for (const key of Object.keys(g.attributes)) {
      const a = g.attributes[key] as THREE.BufferAttribute
      if (a.array instanceof Float32Array && !a.normalized) continue
      const f = new Float32Array(a.count * a.itemSize)
      for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a.getComponent(i, c)
      g.setAttribute(key, new THREE.BufferAttribute(f, a.itemSize))
    }
    g.applyMatrix4(m.matrixWorld)
    out.push(g)
  })
  return out
}
