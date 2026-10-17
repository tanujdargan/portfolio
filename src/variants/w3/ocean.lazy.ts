// Chapters 05–06: under the sea to an (illustrative) oceanographic sensor package on its mooring, then up through the
// surface to a calm dusk sea for the end card. One water plane, shaded from below (Snell's window, total internal
// reflection) and from above (sky reflection, sun path).
import * as THREE from 'three'
import { type Ctx, type Chapter, lerp, sstep, easeInOut, rnd, dotTexture } from './util.lazy'
import { store } from './store'

const WATER_VS = /* glsl */ `
varying vec3 vWP; varying vec2 vXZ;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vWP = wp.xyz; vXZ = position.xy; gl_Position = projectionMatrix * viewMatrix * wp; }`
const WATER_FS = /* glsl */ `
uniform float uTime, uFogD; uniform vec3 uCam, uSun, uSky, uHorizon, uDeep, uOrigin, uFog;
varying vec3 vWP; varying vec2 vXZ;
vec3 waveN(vec2 p, float t, float dist){
  vec2 d = vec2(0.);
  float k1 = (1. - smoothstep(10., 60., dist)), k2 = (1. - smoothstep(5., 30., dist)), k3 = (1. - smoothstep(2., 14., dist));
  d += vec2(.8, .6) * cos(dot(p, vec2(.8, .6)) * .9 + t * 1.1) * .10;
  d += vec2(-.5, .86) * cos(dot(p, vec2(-.5, .86)) * 1.7 + t * 1.5) * .06;
  d += vec2(.95, -.3) * cos(dot(p, vec2(.95, -.3)) * 3.3 + t * 2.1) * .035 * k1;
  d += vec2(.2, .98) * cos(dot(p, vec2(.2, .98)) * 7.1 + t * 3.0) * .018 * k2;
  d += vec2(-.7, -.7) * cos(dot(p, vec2(-.7, -.7)) * 13. + t * 4.2) * .009 * k3;
  return normalize(vec3(-d.x, 1., -d.y));
}
void main(){
  vec3 V = normalize(uCam - vWP);
  vec2 p = vWP.xz;
  float dist = length(uCam - vWP);
  bool above = uCam.y > uOrigin.y;
  vec3 N = waveN(above ? p * 1.7 : p, uTime, dist);
  if (above) N = normalize(vec3(N.x * .45, 1., N.z * .45));
  N = normalize(mix(N, vec3(0., 1., 0.), smoothstep(40., 160., dist)));
  vec3 col;
  if (uCam.y > uOrigin.y) {
    // from above: reflect a dusk sky, sun path, deep body colour
    vec3 R = reflect(-V, N);
    float h = max(R.y, 0.);
    vec3 sky = mix(uHorizon, uSky, smoothstep(0., .22, pow(h, .8)));
    float fres = .02 + .98 * pow(1. - max(dot(N, V), 0.), 5.);
    float sp = pow(max(dot(R, normalize(uSun)), 0.), 260.) * 7. + pow(max(dot(R, normalize(uSun)), 0.), 20.) * .25;
    col = mix(uDeep * .6, sky, fres) + vec3(1., .72, .45) * sp;
  } else {
    // from below: Snell's window (≈48.6°) bright, outside it a dark mirror of the deep
    vec3 Vd = -V; // looking up
    float c = dot(normalize(-N), V);
    float inWin = smoothstep(.55, .76, abs(dot(Vd, vec3(0., 1., 0.)) ) + (N.x + N.z) * .25);
    vec3 win = mix(vec3(.25, .62, .7), vec3(.9, 1., .95), pow(max(Vd.y, 0.), 6.));
    col = mix(uDeep * .9, win * 1.3, inWin);
    col += vec3(.6, .9, 1.) * pow(max(dot(Vd, normalize(uSun * vec3(.4, 1., .4))), 0.), 30.) * 1.5 * inWin;
  }
  float fade = (1. - smoothstep(60., above ? 2600. : 260., dist));
  if (above) col = mix(uHorizon, col, fade);
  else { float ff = 1. - exp(-pow(uFogD * .55 * dist, 2.)); col = mix(col, uFog, ff); }
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`

export async function createOcean(ctx: Ctx, origin: THREE.Vector3): Promise<Chapter> {
  const g = new THREE.Group()
  g.position.copy(origin)
  const [gl, alb, orm] = await Promise.all([ctx.gltf.loadAsync('/w3/models/probe.glb'), ctx.tex('/w3/tex/probe-albedo.webp'), ctx.tex('/w3/tex/probe-orm.webp', false)])

  const sun = new THREE.Vector3(-0.9, 0.12, -1).normalize()
  const U = {
    uTime: { value: 0 }, uFogD: { value: 0.06 }, uFog: { value: new THREE.Color('#021a22') }, uCam: { value: new THREE.Vector3() }, uSun: { value: sun }, uOrigin: { value: origin.clone() },
    uSky: { value: new THREE.Color('#0a1830') }, uHorizon: { value: new THREE.Color('#c97a4c') }, uDeep: { value: new THREE.Color('#021a22') },
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: WATER_FS, uniforms: U, side: THREE.DoubleSide }))
  water.rotation.x = -Math.PI / 2
  g.add(water)

  // deep-water backdrop below the surface horizon, same colour the water plane fades to
  const deep = new THREE.Mesh(
    new THREE.SphereGeometry(2900, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uFog: U.uFog }, vertexShader: `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`, fragmentShader: `uniform vec3 uFog; void main(){ gl_FragColor = vec4(uFog, 1.); }` }),
  )
  g.add(deep)

  // sky dome above the surface (dusk): deep blue, warm horizon band, stars
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2800, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSun: { value: sun }, uSky: U.uSky, uHorizon: U.uHorizon },
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `varying vec3 vD; uniform vec3 uSun, uSky, uHorizon;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        void main(){ float y = max(vD.y, 0.);
          vec3 c = mix(uHorizon, uSky, smoothstep(0., .22, pow(y, .8)));
          c = mix(c, uSky * .55, smoothstep(.3, 1., y));
          float s = max(dot(vD, normalize(uSun)), 0.);
          c += vec3(1., .6, .32) * (pow(s, 6.) * .35 + pow(s, 80.) * .8) * (1. - y);
          vec3 q = floor(vD * 340.); float st = step(.9975, h(q)) * smoothstep(.15, .6, y);
          c += vec3(.8,.85,1.) * st * h(q + 1.) * 1.4;
          gl_FragColor = vec4(c, 1.);
          #include <colorspace_fragment>
        }`,
    }),
  )
  g.add(sky)

  // the probe
  const probe = gl.scene
  const pm = new THREE.MeshStandardMaterial({ map: alb, aoMap: orm, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1 })
  probe.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) m.material = pm
  })
  const rig = new THREE.Group()
  rig.position.set(0, -15, 0)
  rig.add(probe)
  g.add(rig)
  const lightDown = new THREE.DirectionalLight(0x9fe8ff, 2.4)
  lightDown.position.set(0.3, 10, 0.4)
  rig.add(lightDown, lightDown.target)
  const hemi = new THREE.HemisphereLight(0x3aa0b8, 0x020a0e, 0.9)
  g.add(hemi)
  const rov = new THREE.SpotLight(0xe8f6ff, 60, 18, 0.5, 0.6, 1.6)
  g.add(rov, rov.target)
  rov.target.position.copy(rig.position)

  // god rays from the surface (underwater only)
  const rayMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uOn: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime, uOn;
      void main(){ float x = vUv.x; float s = 0.;
        s += pow(.5 + .5 * sin(x * 23. + uTime * .3), 8.);
        s += pow(.5 + .5 * sin(x * 41. - uTime * .21 + 1.3), 12.) * .7;
        s += pow(.5 + .5 * sin(x * 9. + uTime * .13 + 2.), 6.) * .5;
        float fall = pow(vUv.y, 1.6) * smoothstep(0., .15, x) * (1. - smoothstep(.85, 1., x));
        gl_FragColor = vec4(vec3(.35, .8, .9) * s * fall * .16 * uOn, 1.); }`,
  })
  const rays = new THREE.Group()
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(22, 34), rayMat)
    m.position.set((i - 2) * 3, -17, -4 + (i % 2) * 3)
    m.rotation.y = (i - 2) * 0.5
    m.rotation.z = 0.12
    rays.add(m)
  }
  g.add(rays)

  // marine snow
  const SN = ctx.mobile ? 500 : 1400
  const sp = new Float32Array(SN * 3)
  for (let i = 0; i < SN; i++) sp.set([(rnd(i, 1) - 0.5) * 30, -rnd(i, 2) * 40, (rnd(i, 3) - 0.5) * 30], i * 3)
  const sg = new THREE.BufferGeometry()
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3))
  const snow = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.05, map: dotTexture(), color: 0xbfefff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }))
  g.add(snow)

  const under = new THREE.FogExp2(0x021a22, 0.06)
  const above = new THREE.FogExp2(0x2a2a3a, 0.004)
  const bgUnder = new THREE.Color('#021a22'), bgAbove = new THREE.Color('#0b1830')
  const camPos = new THREE.Vector3(), look = new THREE.Vector3()
  const marks: Record<string, THREE.Vector3 | null> = { ocean: null }
  const mp = new THREE.Vector3()
  const ch: Chapter = {
    group: g, near: 0.05, far: 3200, bg: bgUnder.clone(), fog: under, marks,
    // local spans two chapters here: 0..1 ocean, 1..2 surface
    update(local, time) {
      U.uTime.value = time
      rayMat.uniforms.uTime.value = time
      const wide = store.w > 760
      const a = easeInOut(Math.min(1, local / 1)) // ocean
      const b = easeInOut(sstep(0.82, 1.3, local)) // surfacing
      // underwater: rise from deep past the probe toward the bright surface; then break through and level out
      const y = lerp(lerp(-30, -11, a), 1.6, b)
      camPos.set(lerp(3.4, 1.4, a) * (1 - b) + b * 0, y, lerp(7.5, 5.2, a) * (1 - b) + b * 10)
      if (store.mobile) camPos.z += 3
      look.set(0, lerp(lerp(-17, -13, a), 1.2, b), lerp(0, 0, a) - b * 30)
      if (wide) camPos.x += 0
      ctx.cam.position.copy(camPos).add(g.position)
      ctx.cam.lookAt(look.add(g.position))
      ctx.cam.filmOffset = wide ? -5 * (1 - b) : 0
      U.uCam.value.copy(ctx.cam.position)
      const isAbove = ctx.cam.position.y > g.position.y
      ch.fog = isAbove ? above : under
      ch.bg.copy(isAbove ? bgAbove : bgUnder)
      rays.visible = !isAbove
      snow.visible = !isAbove
      sky.visible = isAbove || camPos.y > -2
      deep.visible = !isAbove
      probe.rotation.y = time * 0.05
      rig.position.y = -15 + Math.sin(time * 0.4) * 0.12
      rov.position.set(camPos.x + 1, camPos.y + 1.5, camPos.z)
      rov.intensity = isAbove ? 0 : 60
      snow.position.y = (time * 0.15) % 4
      marks.ocean = local > 0.15 && local < 0.9 ? rig.localToWorld(mp.set(0, 0.2, 0)) : null
    },
  }
  return ch
}
