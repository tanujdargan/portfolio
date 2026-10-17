// Chapters 00–01: beside MarmotSat (illustrative 3U model, baked AO) over a NASA Blue Marble Earth, then the dive.
// Two layers: the Earth lives in kilometres with its own camera (same orientation), the satellite in metres.
import * as THREE from 'three'
import { type Ctx, lerp, sstep, easeInOut, clamp01, spaceEnv, rnd, dotTexture } from './util.lazy'

const R = 6371
const DEG = Math.PI / 180
// Sub-camera point (~780 km SSE of Victoria, so the hero looks NNW up the coast to it) and Victoria itself.
const LAT0 = 41.7, LON0 = -120.6
const VIC = { lat: 48.4284, lon: -123.3656 }
// Pacific Northwest detail texture bounds (crop of Blue Marble tile A1).
const REG = [-150 * DEG, -94 * DEG, 24 * DEG, 66 * DEG]

/** object-space unit vector for lat/lon in the convention the shader inverts: lon 0 at +x, 90°E at −z */
const ll = (lat: number, lon: number) =>
  new THREE.Vector3(Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.sin(lat * DEG), -Math.cos(lat * DEG) * Math.sin(lon * DEG))

const EARTH_VS = /* glsl */ `
varying vec3 vObjN; varying vec3 vWN; varying vec3 vWP;
void main(){
  vObjN = normalize(position);
  vec4 wp = modelMatrix * vec4(position, 1.);
  vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normalize(position));
  gl_Position = projectionMatrix * viewMatrix * wp;
}`
const EARTH_FS = /* glsl */ `
#define PI 3.14159265
uniform sampler2D tDay, tReg, tNight, tCloud; uniform vec4 uReg; uniform vec3 uSun, uCam; uniform float uTime, uRegOn;
varying vec3 vObjN; varying vec3 vWN; varying vec3 vWP;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec3 n = normalize(vObjN);
  float lat = asin(clamp(n.y, -1., 1.)); float lon = atan(-n.z, n.x);
  vec2 uv = vec2(lon / (2. * PI) + .5, .5 - lat / PI);
  vec3 day = texture2D(tDay, uv).rgb;
  vec2 ruv = vec2((lon - uReg.x) / (uReg.y - uReg.x), (uReg.w - lat) / (uReg.w - uReg.z));
  float inR = uRegOn * smoothstep(0., .04, ruv.x) * (1. - smoothstep(.96, 1., ruv.x)) * smoothstep(0., .04, ruv.y) * (1. - smoothstep(.96, 1., ruv.y));
  if (inR > 0.) day = mix(day, texture2D(tReg, clamp(ruv, 0., 1.)).rgb, inR);
  vec3 N = normalize(vWN); vec3 V = normalize(uCam - vWP); vec3 L = normalize(uSun);
  float NL = dot(N, L);
  float dayF = smoothstep(-.12, .18, NL);
  // clouds: NASA composite + a little high-frequency breakup so they hold up close
  vec2 cuv = uv + vec2(uTime * 2e-6, 0.);
  float cl = texture2D(tCloud, cuv).r;
  float br = n2(uv * vec2(900., 450.)) * .6 + n2(uv * vec2(2300., 1150.)) * .4;
  cl = smoothstep(.3, .95, cl * (.88 + .24 * br));
  float water = smoothstep(.015, .07, day.b - max(day.r, day.g) * .9) * (1. - cl);
  vec3 alb = mix(day * 1.05, vec3(.9, .93, .97), cl * .92);
  float wrap = max(NL * .9 + .1, 0.);
  vec3 col = alb * wrap * 2.6;
  vec3 H = normalize(L + V);
  col += vec3(1., .86, .66) * pow(max(dot(N, H), 0.), 140.) * water * dayF * 5.;
  col += vec3(1., .86, .66) * pow(max(dot(N, H), 0.), 12.) * water * dayF * .12;
  float night = texture2D(tNight, uv).r;
  col += vec3(1., .66, .32) * pow(night, 2.4) * 2.2 * (1. - dayF) * (1. - cl * .8);
  // aerial perspective toward the limb
  float mu = max(dot(N, V), 0.);
  float fres = pow(1. - mu, 3.4);
  vec3 haze = mix(vec3(.18, .38, .85), vec3(.55, .75, 1.), fres);
  float sunSide = smoothstep(-.35, .35, NL + .1);
  col = mix(col, haze * (.12 + 1.1 * sunSide), clamp(fres * .9, 0., .8));
  // warm terminator band
  col += vec3(1., .45, .2) * exp(-abs(NL) * 9.) * .08 * (1. - mu);
  gl_FragColor = vec4(col, 1.);
}`

const ATMO_FS = /* glsl */ `
uniform vec3 uSun, uCam; varying vec3 vWN; varying vec3 vWP;
void main(){
  vec3 N = normalize(vWN); vec3 V = normalize(uCam - vWP);
  float mu = dot(N, V);
  float rim = pow(clamp(1. - mu, 0., 1.), 6.);
  float sun = smoothstep(-.4, .5, dot(N, normalize(uSun)));
  vec3 c = mix(vec3(.25, .55, 1.), vec3(.75, .9, 1.), rim) * rim * (0.15 + 2.2 * sun);
  gl_FragColor = vec4(c, rim);
}`

export async function createOrbit(ctx: Ctx) {
  const { mobile } = ctx
  const earthScene = new THREE.Scene()
  earthScene.background = new THREE.Color(0, 0, 0)
  const earthCam = new THREE.PerspectiveCamera(40, 1, 5, 90000)

  // sun: low in the west-south-west, so the coast is lit with long relief and the limb glows
  const sun = new THREE.Vector3(-0.78, 0.36, 0.42).normalize()

  const [day, reg, night, cloud] = await Promise.all([
    ctx.tex(mobile ? '/w3/tex/earth-day-2k.webp' : '/w3/tex/earth-day-4k.webp'),
    ctx.tex('/w3/tex/earth-pnw.webp'),
    ctx.tex('/w3/tex/earth-night.webp', false),
    ctx.tex('/w3/tex/earth-clouds.webp', false),
  ])
  for (const t of [day, night, cloud]) t.wrapS = THREE.RepeatWrapping

  // orientation: (LAT0, LON0) to +Y, local north to −Z, east to +X; Earth centre at (0, −R, 0)
  const up = ll(LAT0, LON0)
  const east = new THREE.Vector3(-Math.sin(LON0 * DEG), 0, -Math.cos(LON0 * DEG))
  const north = new THREE.Vector3().crossVectors(up, east).normalize()
  const basis = new THREE.Matrix4().makeBasis(east, up, north.clone().negate())
  const rot = new THREE.Quaternion().setFromRotationMatrix(basis.clone().transpose())

  const earthU = {
    tDay: { value: day }, tReg: { value: reg }, tNight: { value: night }, tCloud: { value: cloud },
    uReg: { value: new THREE.Vector4(...REG) }, uSun: { value: sun }, uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uRegOn: { value: 1 },
  }
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(R, mobile ? 192 : 320, mobile ? 96 : 160),
    new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: EARTH_FS, uniforms: earthU }),
  )
  earth.quaternion.copy(rot)
  earth.position.set(0, -R, 0)
  earthScene.add(earth)

  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R + 70, 160, 80),
    new THREE.ShaderMaterial({
      vertexShader: EARTH_VS, fragmentShader: ATMO_FS, uniforms: { uSun: earthU.uSun, uCam: earthU.uCam },
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  )
  atmo.position.copy(earth.position)
  earthScene.add(atmo)

  // stars, ride with the camera
  const N = mobile ? 1400 : 3200
  const sp = new Float32Array(N * 3), ss = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const u = rnd(i, 1) * 2 - 1, th = rnd(i, 2) * Math.PI * 2, r = Math.sqrt(1 - u * u)
    sp.set([r * Math.cos(th) * 40000, u * 40000, r * Math.sin(th) * 40000], i * 3)
    ss[i] = Math.pow(rnd(i, 3), 6) * 3 + 0.6
  }
  const sg = new THREE.BufferGeometry()
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3))
  sg.setAttribute('size', new THREE.BufferAttribute(ss, 1))
  const stars = new THREE.Points(
    sg,
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uDpr: { value: ctx.renderer.getPixelRatio() } },
      vertexShader: `attribute float size; uniform float uDpr; varying float vA; void main(){ vA = min(size, 1.6) * .55; gl_PointSize = size * uDpr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(.85,.9,1.) * vA * (1. - smoothstep(.0, .5, d)), 1.); }`,
    }),
  )
  stars.frustumCulled = false
  earthScene.add(stars)

  // sun glare (bloom does the rest)
  const glare = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(128), color: new THREE.Color(1, 0.93, 0.8).multiplyScalar(6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))
  glare.scale.setScalar(2600)
  earthScene.add(glare)

  // ---------- satellite (metres) ----------
  const group = new THREE.Group()
  const satRig = new THREE.Group()
  group.add(satRig)
  const [gl, alb, orm, mask] = await Promise.all([
    ctx.gltf.loadAsync('/w3/models/cubesat.glb'),
    ctx.tex('/w3/tex/sat-albedo.webp'),
    ctx.tex('/w3/tex/sat-orm.webp', false),
    ctx.tex('/w3/tex/sat-mask.webp', false),
  ])
  const env = spaceEnv(ctx.pmrem, sun, Math.acos(R / (R + 520)))
  const base = {
    map: alb, aoMap: orm, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1, envMap: env, envMapIntensity: 1.25, aoMapIntensity: 1,
  }
  const body = new THREE.MeshPhysicalMaterial({ ...base })
  const cells = new THREE.MeshPhysicalMaterial({
    ...base, clearcoat: 0.7, clearcoatRoughness: 0.1, iridescence: 0.45, iridescenceIOR: 1.7, iridescenceThicknessRange: [260, 520], iridescenceMap: mask,
    envMapIntensity: 1.1,
  })
  const sat = gl.scene
  sat.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const name = (m.material as THREE.Material).name
    m.material = name === 'cells' ? cells : body
  })
  satRig.add(sat)
  const key = new THREE.DirectionalLight(0xfff1dc, 4.2)
  key.position.copy(sun).multiplyScalar(5)
  group.add(key, key.target)
  const earthshine = new THREE.DirectionalLight(0x6f9ee8, 0.9)
  earthshine.position.set(0.2, -1, 0.1)
  group.add(earthshine)

  // ---------- camera rig ----------
  const fwd = new THREE.Vector3(), tmp = new THREE.Vector3()
  const vicW = ll(VIC.lat, VIC.lon).multiplyScalar(R).applyQuaternion(rot).add(earth.position)
  const antenna = new THREE.Vector3(0, 0.17, 0)
  const marks: Record<string, THREE.Vector3 | null> = { orbit: null, firmware: null }
  const markCam: Record<string, 'earth' | 'main'> = { orbit: 'earth', firmware: 'main' }

  let filmShift = 0
  function update(st: number, time: number) {
    const cam = ctx.cam
    const narrow = ctx.cam.aspect < 0.9
    // st: 0..2 (hero, firmware), the dive starts at 1.5
    const a = clamp01(st) // hero
    const b = clamp01(st - 1) // firmware
    const dive = sstep(1.5, 2.0, st)
    let yaw = lerp(-28, 18, easeInOut(a)) + lerp(0, 52, easeInOut(sstep(0, 0.75, b)))
    let pitch = lerp(-24, -21, a) + lerp(0, -12, sstep(0, 0.6, b))
    let dist = lerp(narrow ? 1.4 : 1.2, narrow ? 1.25 : 0.95, easeInOut(a)) + lerp(0, -0.12, sstep(0, 0.6, b))
    // dive: pull away, pitch down, sat leaves upward
    pitch = lerp(pitch, -78, easeInOut(dive))
    dist = lerp(dist, 9, Math.pow(dive, 1.6))
    yaw += dive * 20
    filmShift = narrow ? 0 : lerp(lerp(-5.5, -4, a), 5.5, sstep(0.0, 0.5, b)) * (1 - dive)
    const cy = Math.cos(pitch * DEG)
    fwd.set(Math.sin(yaw * DEG) * cy, Math.sin(pitch * DEG), -Math.cos(yaw * DEG) * cy)
    const target = tmp.set(0, narrow ? -0.2 : 0, 0)
    if (narrow) target.y += lerp(-0.05, 0, b)
    cam.position.copy(target).addScaledVector(fwd, -dist)
    cam.up.set(0, 1, 0)
    cam.lookAt(cam.position.clone().add(fwd))
    cam.filmGauge = 35
    cam.filmOffset = filmShift
    cam.updateProjectionMatrix()

    // satellite attitude: slow tumble, panels sweep through the sun
    satRig.rotation.set(0.32 + Math.sin(time * 0.11) * 0.05, time * 0.06 + st * 0.6, 0.12)

    // Earth camera: same orientation, altitude falls on the dive
    const alt = lerp(520, 18, Math.pow(dive, 0.7))
    earthCam.position.set(0, alt, 0)
    earthCam.quaternion.copy(cam.quaternion)
    earthCam.fov = cam.fov
    earthCam.aspect = cam.aspect
    earthCam.filmGauge = 35
    earthCam.filmOffset = filmShift
    earthCam.near = Math.max(0.5, alt * 0.4)
    earthCam.updateProjectionMatrix()
    earthU.uCam.value.copy(earthCam.position)
    earthU.uTime.value = time
    stars.position.copy(earthCam.position)
    glare.position.copy(earthCam.position).addScaledVector(sun, 30000)

    satRig.visible = dive < 0.95
    marks.orbit = st < 0.85 ? vicW : null
    marks.firmware = st > 1 && st < 1.5 ? satRig.localToWorld(antenna.clone()) : null
  }

  function renderEarth(r: THREE.WebGLRenderer) {
    r.render(earthScene, earthCam)
    r.clearDepth()
  }

  // compile everything up-front so the first scroll doesn't hitch
  await ctx.renderer.compileAsync(earthScene, earthCam)
  return {
    group, update, renderEarth, earthCam, marks, markCam,
    dispose() {
      earthScene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
      })
      ;[day, reg, night, cloud, alb, orm, mask, env].forEach((t) => t.dispose())
    },
  }
}
