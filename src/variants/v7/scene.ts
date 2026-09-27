// The WebGL half of v7. Loaded from an effect after first paint; three itself is imported inside createScene so the
// variant chunk never depends on the three chunk up front (vite.config pins src/variants/v7/** into variant-v7).
import type * as T from 'three'
import { A, RE, VIC_ECEF, ring, state, track, type SimClock, type V3 } from './kepler'

export interface SceneOpts {
  canvas: HTMLCanvasElement
  clock: SimClock
  landUrl: string
  colors: { accent: string; ink: string; ok: string; bg: string }
  reduced: boolean
  onReady: () => void
  onLost: () => void
}
export interface SceneApi {
  setReduced: (r: boolean) => void
  setRunning: (on: boolean) => void
  resize: () => void
  kick: () => void
  dispose: () => void
}

// world = (X, Z, -Y) of ECI/ECEF, Earth radius 1
const W = (p: V3, s = 1 / RE): [number, number, number] => [p[0] * s, p[2] * s, -p[1] * s]

const EARTH_VS = /* glsl */ `
varying vec3 vN;
varying vec3 vP;
varying vec3 vW;
void main() {
  vP = normalize(position);
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

// Halftone Earth: land as a dot grid sampled at cell centres, night side lit in the accent, a terminator line,
// a 30° graticule and a thin fresnel rim. No textures but a 7 KB 1-bit land mask.
const EARTH_FS = /* glsl */ `
uniform sampler2D uLand;
uniform vec3 uSun;
uniform vec3 uAccent;
uniform vec3 uInk;
uniform vec3 uCam;
varying vec3 vN;
varying vec3 vP;
varying vec3 vW;
const float PI = 3.14159265;
const float ROWS = 150.0;
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main() {
  float lat = asin(clamp(vP.y, -1.0, 1.0));
  float lon = atan(-vP.z, vP.x);
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
  float dotm = (1.0 - smoothstep(0.30, 0.30 + aa, d)) * step(0.5, land);

  float ndl = dot(normalize(vN), uSun);
  float day = smoothstep(-0.06, 0.16, ndl);
  vec3 V = normalize(uCam - vW);
  float fres = pow(1.0 - max(dot(normalize(vN), V), 0.0), 2.6);

  vec3 ocean = mix(vec3(0.018, 0.024, 0.03), vec3(0.05, 0.085, 0.11), day);
  vec3 col3 = ocean;
  float lights = 0.22 + 0.78 * step(0.72, hash(vec2(row, col)));
  vec3 landDay = uInk * 0.62;
  vec3 landNight = uAccent * 0.62 * lights;
  col3 += dotm * mix(landNight, landDay, day);

  // graticule every 30°
  vec2 g = vec2(lat, lon) / (PI / 6.0);
  vec2 gw = fwidth(g) * 1.2;
  vec2 gl = 1.0 - smoothstep(vec2(0.0), gw, abs(fract(g + 0.5) - 0.5));
  col3 += max(gl.x, gl.y) * uInk * 0.05;

  float term = exp(-pow(ndl / 0.05, 2.0));
  col3 += term * uAccent * 0.28;
  col3 += fres * vec3(0.35, 0.6, 0.85) * (0.12 + 0.5 * day);
  gl_FragColor = vec4(col3, 1.0);
}`

const ATMO_VS = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
void main() {
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`
const ATMO_FS = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uCam;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec3 V = normalize(uCam - vW);
  float rim = pow(clamp(1.0 + dot(normalize(vN), V) * 1.0, 0.0, 1.0), 3.0);
  float lit = smoothstep(-0.35, 0.6, dot(normalize(vN), uSun));
  float a = rim * (0.12 + 0.75 * lit);
  gl_FragColor = vec4(vec3(0.42, 0.68, 1.0) * a, a);
}`

const MARK_VS = /* glsl */ `
uniform float uSize;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize;
}`
const MARK_FS = /* glsl */ `
uniform vec3 uColor;
uniform float uRing;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float core = 1.0 - smoothstep(0.22, 0.34, r);
  float ring = uRing * (smoothstep(0.62, 0.7, r) - smoothstep(0.82, 0.9, r));
  float a = max(core, ring * 0.85);
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * a, a);
}`

const STAR_VS = /* glsl */ `
attribute float aA;
varying float vA;
uniform float uPx;
void main() {
  vA = aA;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uPx;
}`
const STAR_FS = /* glsl */ `
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.2, 0.5, r)) * vA;
  gl_FragColor = vec4(vec3(0.8, 0.86, 0.9) * a, a);
}`

// yield to the event loop between setup steps so no single task runs long on a throttled phone
const yieldTask = () => new Promise<void>((r) => setTimeout(r, 0))

export async function createScene(o: SceneOpts): Promise<SceneApi> {
  const THREE = await import('three')
  await yieldTask()
  const { canvas, clock } = o
  let reduced = o.reduced
  const dprCap = 1.5
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' })
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200)
  const c = (s: string) => new THREE.Color(s)
  const accent = c(o.colors.accent), ink = c(o.colors.ink), ok = c(o.colors.ok)

  const tex = await new THREE.TextureLoader().loadAsync(o.landUrl)
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.NearestFilter

  await yieldTask()
  const sunU = { value: new THREE.Vector3(1, 0, 0) }
  const camU = { value: new THREE.Vector3() }
  const earth = new THREE.Group()
  scene.add(earth)
  const earthMat = new THREE.ShaderMaterial({
    vertexShader: EARTH_VS,
    fragmentShader: EARTH_FS,
    uniforms: { uLand: { value: tex }, uSun: sunU, uAccent: { value: accent }, uInk: { value: ink }, uCam: camU },
  })
  const sphere = new THREE.SphereGeometry(1, 112, 72)
  earth.add(new THREE.Mesh(sphere, earthMat))

  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(1.075, 72, 48),
    new THREE.ShaderMaterial({
      vertexShader: ATMO_VS,
      fragmentShader: ATMO_FS,
      uniforms: { uSun: sunU, uCam: camU },
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  scene.add(atmo)

  await yieldTask()
  // stars, seeded
  const starMat = new THREE.ShaderMaterial({ vertexShader: STAR_VS, fragmentShader: STAR_FS, uniforms: { uPx: { value: 2 } }, transparent: true, depthWrite: false })
  {
    let s = 7
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    const n = 420
    const pos = new Float32Array(n * 3), al = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const z = r() * 2 - 1, t = r() * Math.PI * 2, q = Math.sqrt(1 - z * z)
      pos.set([q * Math.cos(t) * 60, z * 60, q * Math.sin(t) * 60], i * 3)
      al[i] = 0.15 + r() ** 3 * 0.7
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aA', new THREE.BufferAttribute(al, 1))
    scene.add(new THREE.Points(g, starMat))
  }

  const lineMat = (col: T.Color, op: number, extra: Partial<T.LineBasicMaterialParameters> = {}) =>
    new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, ...extra })

  // orbit ring (ECI, world)
  const RING_N = 256
  const ringGeo = new THREE.BufferGeometry()
  ringGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RING_N * 3), 3))
  const ringLine = new THREE.LineLoop(ringGeo, lineMat(accent, 0.42))
  scene.add(ringLine)

  // ground track (ECEF, child of earth): one orbit back, one ahead; past dimmer via vertex colours
  const TR_N = 360
  const trGeo = new THREE.BufferGeometry()
  trGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((TR_N + 1) * 3), 3))
  const trCol = new Float32Array((TR_N + 1) * 3)
  for (let i = 0; i <= TR_N; i++) {
    const past = i < TR_N / 2
    const k = past ? 0.12 + 0.5 * (i / (TR_N / 2)) : 0.85 - 0.6 * ((i - TR_N / 2) / (TR_N / 2))
    const cc = past ? ink : accent
    trCol.set([cc.r * k, cc.g * k, cc.b * k], i * 3)
  }
  trGeo.setAttribute('color', new THREE.BufferAttribute(trCol, 3))
  const trLine = new THREE.Line(trGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
  earth.add(trLine)

  // footprint (el ≥ 0° coverage circle), ECEF
  const FP_N = 96
  const fpGeo = new THREE.BufferGeometry()
  fpGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FP_N * 3), 3))
  earth.add(new THREE.LineLoop(fpGeo, lineMat(accent, 0.3)))

  // Victoria
  const vicW = W([VIC_ECEF[0] * RE * 1.004, VIC_ECEF[1] * RE * 1.004, VIC_ECEF[2] * RE * 1.004])
  const markMat = (col: T.Color, size: number, ringOn: number) =>
    new THREE.ShaderMaterial({
      vertexShader: MARK_VS,
      fragmentShader: MARK_FS,
      uniforms: { uColor: { value: col }, uSize: { value: size }, uRing: { value: ringOn } },
      transparent: true,
      depthWrite: false,
    })
  const pt = (p: number[], m: T.ShaderMaterial) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p), 3))
    return new THREE.Points(g, m)
  }
  const vicMat = markMat(ok, 14, 1)
  earth.add(pt(vicW, vicMat))

  // satellite + nadir line + line of sight to Victoria
  const satMat = markMat(accent, 22, 1)
  const sat = pt([0, 0, 0], satMat)
  scene.add(sat)
  const nadirGeo = new THREE.BufferGeometry()
  nadirGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
  scene.add(new THREE.Line(nadirGeo, lineMat(accent, 0.5)))
  const losGeo = new THREE.BufferGeometry()
  losGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
  const losLine = new THREE.Line(losGeo, lineMat(ok, 0.8))
  scene.add(losLine)

  // camera: chases the satellite from behind and above; drag adds an offset that springs back
  const camDir = new THREE.Vector3()
  let camInit = false
  const drag = { yaw: 0, pitch: 0, vy: 0, vp: 0, down: false, x: 0, y: 0 }
  let dist = 4
  const tmp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)

  const PERIOD_HALF = (2 * Math.PI * Math.sqrt((A * A * A) / 398600.4418)) / 120 // minutes, half an orbit
  let lastTrack = -Infinity
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), target = new THREE.Vector3(), side = new THREE.Vector3(), d = new THREE.Vector3()
  const setAttr = (g: T.BufferGeometry, arr: number[][]) => {
    const a = g.getAttribute('position') as T.BufferAttribute
    arr.forEach((p, i) => a.setXYZ(i, p[0], p[1], p[2]))
    a.needsUpdate = true
  }

  function update(sim: number, dt: number) {
    const s = state(sim)
    earth.rotation.y = s.gmst
    const sw = W(s.sun, 1)
    sunU.value.set(sw[0], sw[1], sw[2])
    const sp = W(s.eci)
    sat.position.set(sp[0], sp[1], sp[2])
    satMat.uniforms.uColor.value = s.sunlit ? accent : ink
    ;(nadirGeo.getAttribute('position') as T.BufferAttribute).setXYZ(0, sp[0], sp[1], sp[2])
    const sub = 1.001 / Math.hypot(...sp)
    ;(nadirGeo.getAttribute('position') as T.BufferAttribute).setXYZ(1, sp[0] * sub, sp[1] * sub, sp[2] * sub)
    nadirGeo.getAttribute('position').needsUpdate = true

    if (Math.abs(sim - lastTrack) > 15000) {
      lastTrack = sim
      setAttr(ringGeo, ring(sim, RING_N).map((p) => W(p)))
      setAttr(
        trGeo,
        track(sim, -PERIOD_HALF, PERIOD_HALF, TR_N).map((p) => W([p[0] * RE * 1.003, p[1] * RE * 1.003, p[2] * RE * 1.003])),
      )
    }
    // footprint around the sub-satellite point
    const r = Math.hypot(...s.ecef)
    const cN: V3 = [s.ecef[0] / r, s.ecef[1] / r, s.ecef[2] / r]
    const lam = Math.acos(RE / r)
    const e1n = Math.hypot(cN[1], cN[0]) || 1
    const e1: V3 = [-cN[1] / e1n, cN[0] / e1n, 0]
    const e2: V3 = [cN[1] * e1[2] - cN[2] * e1[1], cN[2] * e1[0] - cN[0] * e1[2], cN[0] * e1[1] - cN[1] * e1[0]]
    const fpA = fpGeo.getAttribute('position') as T.BufferAttribute
    const cl = Math.cos(lam) * 1.002, sl = Math.sin(lam) * 1.002
    for (let i = 0; i < FP_N; i++) {
      const t = (i / FP_N) * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t)
      const x = cN[0] * cl + (e1[0] * ct + e2[0] * st) * sl, y = cN[1] * cl + (e1[1] * ct + e2[1] * st) * sl, z = cN[2] * cl + (e1[2] * ct + e2[2] * st) * sl
      fpA.setXYZ(i, x, z, -y)
    }
    fpA.needsUpdate = true

    // line of sight when Victoria can see the satellite
    const vis = cN[0] * VIC_ECEF[0] + cN[1] * VIC_ECEF[1] + cN[2] * VIC_ECEF[2] > Math.cos(lam)
    losLine.visible = vis
    vicMat.uniforms.uSize.value = (vis ? 20 : 14) * renderer.getPixelRatio()
    if (vis) {
      earth.updateMatrixWorld()
      tmp.set(vicW[0], vicW[1], vicW[2]).applyMatrix4(earth.matrixWorld)
      const a = losGeo.getAttribute('position') as T.BufferAttribute
      a.setXYZ(0, tmp.x, tmp.y, tmp.z)
      a.setXYZ(1, sp[0], sp[1], sp[2])
      a.needsUpdate = true
    }

    // camera target: behind the satellite along track, lifted along the orbit normal
    const al = W(s.along, 1), nm = W(s.normal, 1)
    target
      .set(sp[0], sp[1], sp[2])
      .normalize()
      .multiplyScalar(Math.cos(0.5))
      .addScaledVector(vA.set(al[0], al[1], al[2]), -Math.sin(0.5))
      .addScaledVector(vB.set(nm[0], nm[1], nm[2]), 0.42)
      .normalize()
    if (!camInit) {
      camDir.copy(target)
      camInit = true
    } else camDir.lerp(target, 1 - Math.exp(-dt * 1.2)).normalize()
    // drag spring back
    if (!drag.down) {
      const w = 3.2
      drag.vy += (-w * w * drag.yaw - 2 * w * drag.vy) * dt
      drag.vp += (-w * w * drag.pitch - 2 * w * drag.vp) * dt
      drag.yaw += drag.vy * dt
      drag.pitch += drag.vp * dt
    }
    d.copy(camDir).applyAxisAngle(up, drag.yaw)
    side.crossVectors(d, up).normalize()
    d.applyAxisAngle(side, drag.pitch)
    camera.position.copy(d.multiplyScalar(dist))
    camera.lookAt(0, 0, 0)
    camU.value.copy(camera.position)
  }
  function resize() {
    const r = canvas.getBoundingClientRect()
    const w = Math.max(1, r.width), h = Math.max(1, r.height)
    const pr = Math.min(window.devicePixelRatio || 1, dprCap)
    renderer.setPixelRatio(pr)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    // Earth fills ~78% of the short side
    const half = Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect)
    dist = 1 / (0.78 * half)
    satMat.uniforms.uSize.value = 22 * pr
    starMat.uniforms.uPx.value = 2 * pr
  }

  let raf = 0, running = false, last = 0, dead = false
  const frame = (now: number) => {
    raf = 0
    if (dead) return
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016)
    last = now
    update(clock.now(Date.now()), dt)
    renderer.render(scene, camera)
    if (running && !reduced) raf = requestAnimationFrame(frame)
  }
  const kick = () => {
    if (!raf && !dead) raf = requestAnimationFrame(frame)
  }

  // pointer drag (horizontal only on touch, so vertical scroll still works: touch-action: pan-y in CSS)
  const onDown = (e: PointerEvent) => {
    drag.down = true
    drag.x = e.clientX
    drag.y = e.clientY
    drag.vy = drag.vp = 0
  }
  const onMove = (e: PointerEvent) => {
    if (!drag.down) return
    drag.yaw = Math.max(-1.4, Math.min(1.4, drag.yaw - (e.clientX - drag.x) * 0.006))
    if (e.pointerType === 'mouse') drag.pitch = Math.max(-0.7, Math.min(0.7, drag.pitch - (e.clientY - drag.y) * 0.004))
    drag.x = e.clientX
    drag.y = e.clientY
    kick()
  }
  const onUp = () => {
    drag.down = false
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
  // compile now, then first frame in a later task
  renderer.compile(scene, camera)
  await yieldTask()
  update(clock.now(Date.now()), 0.016)
  renderer.render(scene, camera)
  o.onReady()

  return {
    setReduced(r) {
      reduced = r
      last = 0
      kick()
    },
    setRunning(on) {
      running = on
      last = 0
      if (on) kick()
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
        const mat = m.material as T.Material | undefined
        mat?.dispose()
      })
      tex.dispose()
      renderer.dispose()
    },
  }
}
