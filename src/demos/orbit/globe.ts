// The WebGL globe for the MarmotSat tracker. three is imported inside createGlobe so it stays in its own lazy chunk.
// World frame is Earth-fixed (ECEF), mapped to three's Y-up axes as (x, z, -y), Earth radius 1. The Earth never
// rotates; the camera does.
import type * as T from 'three'
import { RE, VIC_UNIT, type V3 } from './model'

export type RGB = [number, number, number]
export interface GlobeSample {
  /** satellite ECEF, km */
  sat: V3
  /** satellite ECEF ~30 s later, km (sets the chase direction) */
  ahead: V3 | null
  /** Sun direction, ECEF unit */
  sun: V3
  /** Victoria has the satellite above the mask */
  inView: boolean
  /** cos of the footprint half-angle at the elevation mask */
  cosLam: number
  /** sim time, ms, for the ground track colouring */
  ms: number
  track: { pts: V3[]; times: number[] }
  /** park the camera over Victoria instead of chasing the satellite (fast warp) */
  park: boolean
}
export interface GlobeOpts {
  canvas: HTMLCanvasElement
  labels: { sat: HTMLElement | null; vic: HTMLElement | null }
  landUrl: string
  colors: { accent: RGB; fg: RGB; fg2: RGB; bg: RGB }
  reduced: boolean
  sample: () => GlobeSample | null
  onReady: () => void
  onLost: () => void
}
export interface GlobeApi {
  setRunning: (on: boolean) => void
  setReduced: (r: boolean) => void
  setPassArc: (pts: V3[]) => void
  /** place the camera on the next frame without easing (reduced motion, jumps) */
  snap: () => void
  resize: () => void
  kick: () => void
  dispose: () => void
}

const W = (p: V3, s = 1): [number, number, number] => [p[0] * s, p[2] * s, -p[1] * s]

const EARTH_VS = /* glsl */ `
varying vec3 vP;
varying vec3 vW;
void main() {
  vP = normalize(position);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

// Halftone land (dots sampled at cell centres from a 1-bit mask), day/night from the real Sun direction, a 30°
// graticule, the terminator, and the footprint (where MarmotSat is ≥ 10° above the horizon) as a tinted cap.
// Every colour is mixed from the host's tokens so the globe sits in any palette.
const EARTH_FS = /* glsl */ `
uniform sampler2D uLand;
uniform vec3 uSun;
uniform vec3 uSub;
uniform float uCosLam;
uniform vec3 uAccent;
uniform vec3 uInk;
uniform vec3 uBg;
uniform vec3 uCam;
varying vec3 vP;
varying vec3 vW;
const float PI = 3.14159265;
const float ROWS = 128.0;
void main() {
  vec3 n = normalize(vP);
  float lat = asin(clamp(n.y, -1.0, 1.0));
  float lon = atan(-n.z, n.x);
  float dLat = PI / ROWS;
  float row = floor((lat + PI * 0.5) / dLat);
  float rLat = -PI * 0.5 + (row + 0.5) * dLat;
  float cols = max(1.0, floor(2.0 * ROWS * cos(rLat)));
  float col = floor((lon + PI) / (2.0 * PI) * cols);
  float cLon = -PI + (col + 0.5) * 2.0 * PI / cols;
  float land = texture2D(uLand, vec2((cLon + PI) / (2.0 * PI), (rLat + PI * 0.5) / PI)).r;
  vec2 dd = vec2((lon - cLon) * cos(lat), lat - rLat) / dLat;
  float d = length(dd);
  float aa = fwidth(d) + 0.02;
  float dotm = (1.0 - smoothstep(0.27, 0.27 + aa, d)) * step(0.5, land);

  float ndl = dot(n, uSun);
  float day = smoothstep(-0.08, 0.18, ndl);
  vec3 V = normalize(uCam - vW);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 2.4);

  vec3 c = mix(mix(uBg, uInk, 0.03), mix(uBg, mix(uInk, uAccent, 0.3), 0.09), day);
  c = mix(c, mix(mix(uBg, uInk, 0.14), mix(uBg, uInk, 0.46), day), dotm);

  vec2 g = vec2(lat, lon) / (PI / 6.0);
  vec2 gw = fwidth(g) * 1.2;
  vec2 gl = 1.0 - smoothstep(vec2(0.0), gw, abs(fract(g + 0.5) - 0.5));
  c = mix(c, uInk, max(gl.x, gl.y) * 0.05);

  c = mix(c, uAccent, exp(-pow(ndl / 0.04, 2.0)) * 0.12);

  float fp = dot(n, uSub) - uCosLam;
  float fw = fwidth(fp) * 1.4;
  c = mix(c, uAccent, smoothstep(-fw, fw, fp) * 0.13);
  c = mix(c, uAccent, (1.0 - smoothstep(0.0, fw, abs(fp))) * 0.8);

  c = mix(c, mix(uInk, uAccent, 0.5), fres * (0.10 + 0.25 * day));
  gl_FragColor = vec4(c, 1.0);
}`

const HALO_VS = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
void main() {
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`
const HALO_FS = /* glsl */ `
uniform vec3 uCam;
uniform vec3 uSun;
uniform vec3 uColor;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec3 V = normalize(uCam - vW);
  float rim = pow(clamp(1.0 + dot(normalize(vN), V), 0.0, 1.0), 4.0);
  float lit = smoothstep(-0.4, 0.6, dot(normalize(vW), uSun));
  gl_FragColor = vec4(uColor, rim * (0.10 + 0.35 * lit));
}`

const MARK_VS = /* glsl */ `
uniform float uSize;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize;
}`
const MARK_FS = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uBg;
uniform float uRing;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float core = 1.0 - smoothstep(0.26, 0.36, r);
  float edge = 1.0 - smoothstep(0.36, 0.46, r);
  float ring = uRing * (smoothstep(0.66, 0.74, r) - smoothstep(0.84, 0.92, r));
  float a = max(edge, ring * 0.8);
  if (a < 0.01) discard;
  vec3 c = mix(uBg, uColor, max(core, ring));
  gl_FragColor = vec4(c, a);
}`

const yieldTask = () => new Promise<void>((r) => setTimeout(r, 0))

export async function createGlobe(o: GlobeOpts): Promise<GlobeApi> {
  const THREE = await import('three')
  await yieldTask()
  const { canvas } = o
  let reduced = o.reduced
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  })
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50)
  // Shaders and line materials both write token values untouched (no linear→sRGB step), so colours match the page.
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  const raw = (c: RGB) => new THREE.Color(c[0], c[1], c[2])
  const accent = raw(o.colors.accent),
    fg = raw(o.colors.fg),
    fg2 = raw(o.colors.fg2),
    bg = raw(o.colors.bg)

  const tex = await new THREE.TextureLoader().loadAsync(o.landUrl)
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.NearestFilter
  await yieldTask()

  const sunU = { value: new THREE.Vector3(1, 0, 0) }
  const subU = { value: new THREE.Vector3(1, 0, 0) }
  const cosLamU = { value: 0.97 }
  const camU = { value: new THREE.Vector3() }
  const earthGeo = new THREE.SphereGeometry(1, 96, 64)
  scene.add(
    new THREE.Mesh(
      earthGeo,
      new THREE.ShaderMaterial({
        vertexShader: EARTH_VS,
        fragmentShader: EARTH_FS,
        uniforms: {
          uLand: { value: tex },
          uSun: sunU,
          uSub: subU,
          uCosLam: cosLamU,
          uAccent: { value: accent },
          uInk: { value: fg },
          uBg: { value: bg },
          uCam: camU,
        },
      }),
    ),
  )
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 40),
      new THREE.ShaderMaterial({
        vertexShader: HALO_VS,
        fragmentShader: HALO_FS,
        uniforms: {
          uCam: camU,
          uSun: sunU,
          uColor: { value: accent.clone().lerp(fg, 0.35) },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    ),
  )

  const lineGeo = (n: number, itemSize = 3) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    if (itemSize === 4) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4))
    g.setDrawRange(0, 0)
    return g
  }
  const lineMat = (c: T.Color, opacity: number) =>
    new THREE.LineBasicMaterial({
      color: c,
      transparent: true,
      opacity,
      depthWrite: false,
    })

  // ground track: ±1 orbit, past in ink fading out behind, future in accent fading out ahead
  const TR_MAX = 512
  const trGeo = lineGeo(TR_MAX, 4)
  const trLine = new THREE.Line(
    trGeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    }),
  )
  trLine.frustumCulled = false
  scene.add(trLine)

  // the next pass over Victoria, drawn over the track
  const PA_MAX = 256
  const paGeo = lineGeo(PA_MAX)
  const paLine = new THREE.Line(paGeo, lineMat(fg, 0.95))
  paLine.frustumCulled = false
  scene.add(paLine)

  const markMat = (c: T.Color, size: number, ring: number) =>
    new THREE.ShaderMaterial({
      vertexShader: MARK_VS,
      fragmentShader: MARK_FS,
      uniforms: {
        uColor: { value: c },
        uBg: { value: bg },
        uSize: { value: size },
        uRing: { value: ring },
      },
      transparent: true,
      depthWrite: false,
    })
  const point = (p: [number, number, number], m: T.ShaderMaterial) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p), 3))
    const pt = new THREE.Points(g, m)
    pt.frustumCulled = false
    return pt
  }
  const vicW = W(VIC_UNIT, 1.002)
  const vicMat = markMat(fg, 12, 0)
  scene.add(point(vicW, vicMat))
  const satMat = markMat(accent, 20, 1)
  const satPt = point([0, 0, 0], satMat)
  scene.add(satPt)
  const nadirGeo = lineGeo(2)
  nadirGeo.setDrawRange(0, 2)
  const nadir = new THREE.Line(nadirGeo, lineMat(accent, 0.55))
  nadir.frustumCulled = false
  scene.add(nadir)
  const losGeo = lineGeo(2)
  losGeo.setDrawRange(0, 2)
  const los = new THREE.Line(losGeo, lineMat(fg2, 0.9))
  los.frustumCulled = false
  scene.add(los)

  // ---------- camera ----------
  const up = new THREE.Vector3(0, 1, 0)
  const camDir = new THREE.Vector3()
  const target = new THREE.Vector3()
  const tmp = new THREE.Vector3(),
    tmp2 = new THREE.Vector3(),
    side = new THREE.Vector3()
  const vicDir = new THREE.Vector3(...vicW).normalize()
  let dist = 4.2
  let needSnap = true
  const drag = {
    yaw: 0,
    pitch: 0,
    vy: 0,
    vp: 0,
    down: false,
    x: 0,
    y: 0,
    idle: 0,
  }

  const setPos = (g: T.BufferGeometry, i: number, p: [number, number, number]) => (g.getAttribute('position') as T.BufferAttribute).setXYZ(i, p[0], p[1], p[2])

  let lastTrackT0 = NaN
  function update(dt: number) {
    const s = o.sample()
    if (!s) return false
    const sw = W(s.sun)
    sunU.value.set(sw[0], sw[1], sw[2])
    const r = Math.hypot(...s.sat)
    const sp = W(s.sat, 1 / RE)
    const su = W(s.sat, 1 / r)
    subU.value.set(su[0], su[1], su[2])
    cosLamU.value = s.cosLam
    ;(satPt.geometry.getAttribute('position') as T.BufferAttribute).setXYZ(0, sp[0], sp[1], sp[2])
    satPt.geometry.getAttribute('position').needsUpdate = true
    setPos(nadirGeo, 0, sp)
    setPos(nadirGeo, 1, W(s.sat, 1.001 / r))
    nadirGeo.getAttribute('position').needsUpdate = true
    los.visible = s.inView
    if (s.inView) {
      setPos(losGeo, 0, vicW)
      setPos(losGeo, 1, sp)
      losGeo.getAttribute('position').needsUpdate = true
    }
    vicMat.uniforms.uColor.value = s.inView ? accent : fg

    // ground track, rewritten only when the 30 s grid moves
    const t0 = s.track.times[0]
    if (t0 !== lastTrackT0 || !s.track.times.length) {
      lastTrackT0 = t0
      const n = Math.min(TR_MAX, s.track.pts.length)
      const pa = trGeo.getAttribute('position') as T.BufferAttribute
      const ca = trGeo.getAttribute('color') as T.BufferAttribute
      const span = (s.track.times[n - 1] - s.track.times[0]) / 2 || 1
      for (let i = 0; i < n; i++) {
        const p = W(s.track.pts[i], 1.003)
        pa.setXYZ(i, p[0], p[1], p[2])
        const dtm = (s.track.times[i] - s.ms) / span // -1 … 1
        if (dtm < 0) {
          ca.setXYZ(i, fg.r, fg.g, fg.b)
          ca.setW(i, 0.14 + 0.56 * (1 + dtm) ** 2)
        } else {
          ca.setXYZ(i, accent.r, accent.g, accent.b)
          ca.setW(i, 0.3 + 0.7 * (1 - dtm) ** 1.5)
        }
      }
      pa.needsUpdate = ca.needsUpdate = true
      trGeo.setDrawRange(0, n)
    }

    // camera
    if (s.park) target.copy(vicDir).multiplyScalar(0.9).addScaledVector(up, -0.12).normalize()
    else {
      target.set(sp[0], sp[1], sp[2]).normalize()
      if (s.ahead) {
        const aw = W(s.ahead, 1 / RE)
        tmp.set(aw[0], aw[1], aw[2]).normalize().sub(target)
        if (tmp.lengthSq() > 1e-12) target.addScaledVector(tmp.normalize(), -0.42).normalize()
      }
    }
    if (needSnap) {
      camDir.copy(target)
      needSnap = false
    } else if (!reduced) {
      // ease toward the target; faster when parking/jumping far
      camDir.lerp(target, 1 - Math.exp(-dt * 1.6)).normalize()
    }
    if (!drag.down && !reduced) {
      drag.idle += dt
      if (drag.idle > 2.5) {
        const w = 2.2
        drag.vy += (-w * w * drag.yaw - 2 * w * drag.vy) * dt
        drag.vp += (-w * w * drag.pitch - 2 * w * drag.vp) * dt
        drag.yaw += drag.vy * dt
        drag.pitch += drag.vp * dt
      }
    }
    tmp2.copy(camDir).applyAxisAngle(up, drag.yaw)
    side.crossVectors(tmp2, up)
    if (side.lengthSq() > 1e-8) tmp2.applyAxisAngle(side.normalize(), drag.pitch)
    // keep the camera off the poles so "up" stays defined
    const lat = Math.asin(Math.max(-1, Math.min(1, tmp2.y)))
    const lim = 1.25
    if (Math.abs(lat) > lim) {
      const h = Math.hypot(tmp2.x, tmp2.z) || 1
      tmp2.set((tmp2.x / h) * Math.cos(lim), Math.sign(lat) * Math.sin(lim), (tmp2.z / h) * Math.cos(lim))
    }
    camera.position.copy(tmp2).multiplyScalar(dist)
    camera.up.copy(up)
    camera.lookAt(0, 0, 0)
    camU.value.copy(camera.position)

    placeLabel(o.labels.sat, sp)
    placeLabel(o.labels.vic, vicW)
    return true
  }

  // DOM labels follow their points; hidden behind the Earth
  let cw = 1,
    ch = 1
  const lp = new THREE.Vector3()
  function occluded(p: [number, number, number]) {
    const C = camera.position
    const dx = p[0] - C.x,
      dy = p[1] - C.y,
      dz = p[2] - C.z
    const a = dx * dx + dy * dy + dz * dz
    const b = 2 * (C.x * dx + C.y * dy + C.z * dz)
    const c = C.lengthSq() - 0.999
    const disc = b * b - 4 * a * c
    if (disc < 0) return false
    const t = (-b - Math.sqrt(disc)) / (2 * a)
    return t > 0 && t < 0.999
  }
  function placeLabel(el: HTMLElement | null, p: [number, number, number]) {
    if (!el) return
    const hide = occluded(p)
    if (hide) {
      if (!el.hidden) el.hidden = true
      return
    }
    lp.set(p[0], p[1], p[2]).project(camera)
    el.hidden = false
    el.style.transform = `translate3d(${((lp.x + 1) / 2) * cw}px, ${((1 - lp.y) / 2) * ch}px, 0)`
  }

  function resize() {
    const r = canvas.getBoundingClientRect()
    cw = Math.max(1, r.width)
    ch = Math.max(1, r.height)
    const pr = Math.min(window.devicePixelRatio || 1, 1.5)
    renderer.setPixelRatio(pr)
    renderer.setSize(cw, ch, false)
    camera.aspect = cw / ch
    camera.updateProjectionMatrix()
    // the globe (plus the satellite's altitude) fills ~84% of the short side
    const half = Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect)
    dist = 1.1 / (0.84 * half)
    satMat.uniforms.uSize.value = 20 * pr
    vicMat.uniforms.uSize.value = 12 * pr
  }

  let raf = 0,
    running = false,
    last = 0,
    dead = false
  const frame = (now: number) => {
    raf = 0
    if (dead) return
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016)
    last = now
    if (update(dt)) renderer.render(scene, camera)
    // reduced motion: no loop; the host kicks one frame a second and drags kick their own frames
    if (running && !reduced) raf = requestAnimationFrame(frame)
  }
  const kick = () => {
    if (!raf && !dead) raf = requestAnimationFrame(frame)
  }

  // Drag to rotate. Touch rotates horizontally only; vertical swipes stay page scrolls (touch-action: pan-y).
  const onDown = (e: PointerEvent) => {
    drag.down = true
    drag.x = e.clientX
    drag.y = e.clientY
    drag.vy = drag.vp = 0
    drag.idle = 0
  }
  const onMove = (e: PointerEvent) => {
    if (!drag.down) return
    drag.yaw -= (e.clientX - drag.x) * 0.006
    if (e.pointerType === 'mouse') drag.pitch = Math.max(-1.1, Math.min(1.1, drag.pitch + (e.clientY - drag.y) * 0.005))
    drag.x = e.clientX
    drag.y = e.clientY
    drag.idle = 0
    kick()
  }
  const onUp = () => {
    if (!drag.down) return
    drag.down = false
    drag.idle = 0
    kick()
  }
  canvas.addEventListener('pointerdown', onDown)
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerup', onUp)
  addEventListener('pointercancel', onUp)
  const onLost = (e: Event) => {
    e.preventDefault()
    o.onLost()
  }
  canvas.addEventListener('webglcontextlost', onLost)

  resize()
  await yieldTask()
  update(0.016)
  renderer.compile(scene, camera)
  await yieldTask()
  renderer.render(scene, camera)
  o.onReady()

  return {
    setRunning(on) {
      running = on
      last = 0
      if (on) kick()
    },
    setReduced(r) {
      reduced = r
      needSnap = true
      last = 0
      kick()
    },
    setPassArc(pts) {
      const n = Math.min(PA_MAX, pts.length)
      for (let i = 0; i < n; i++) setPos(paGeo, i, W(pts[i], 1.004))
      paGeo.getAttribute('position').needsUpdate = true
      paGeo.setDrawRange(0, n)
      kick()
    },
    snap() {
      needSnap = true
      kick()
    },
    resize() {
      resize()
      kick()
    },
    kick,
    dispose() {
      dead = true
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onDown)
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerup', onUp)
      removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('webglcontextlost', onLost)
      scene.traverse((x) => {
        const m = x as T.Mesh
        m.geometry?.dispose()
        ;(m.material as T.Material | undefined)?.dispose()
      })
      tex.dispose()
      renderer.dispose()
    },
  }
}
