// Chapter 04: an illustrative fulfillment-centre floor. One Blender rack module (light and AO baked with Cycles) is
// instanced into back-to-back rows; aisle light strips bloom; a warm route traces the aisles (an illustrative "plan").
import * as THREE from 'three'
import { type Ctx, type Chapter, lerp, sstep, easeInOut, rnd, bakedGeometry } from './util.lazy'
import { store } from './store'

export async function createWarehouse(ctx: Ctx, origin: THREE.Vector3): Promise<Chapter> {
  const g = new THREE.Group()
  g.position.copy(origin)
  const [gl, lit] = await Promise.all([ctx.gltf.loadAsync('/w3/models/rack.glb'), ctx.tex('/w3/tex/rack-lit.webp')])
  const geo = bakedGeometry(gl.scene)[0]
  // module footprint: x 0..5.4, z −1.1..0, y 0..6
  const mat = new THREE.MeshBasicMaterial({ map: lit, color: new THREE.Color(1.05, 1.0, 1.0) })
  const PAIRS = ctx.mobile ? 4 : 6
  const MODS = ctx.mobile ? 5 : 7
  const AISLE = 3.6
  const count = PAIRS * MODS * 2
  const racks = new THREE.InstancedMesh(geo, mat, count)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3()
  let n = 0
  const rowZ: number[] = []
  const pitch = 2.3 + AISLE
  const x0 = -(MODS * 5.45) / 2
  const z0 = -(PAIRS * pitch) / 2
  for (let r = 0; r < PAIRS; r++) {
    const zc = z0 + r * pitch
    rowZ.push(zc)
    for (let m = 0; m < MODS; m++) {
      const x = x0 + m * 5.45
      // front-facing row and its mirrored back-to-back partner (mirroring varies the cartons)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0)
      racks.setMatrixAt(n++, m4.compose(p.set(x, 0, zc - 0.05), q, s))
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
      racks.setMatrixAt(n++, m4.compose(p.set(x + 5.4, 0, zc + 0.05), q, s))
    }
  }
  g.add(racks)

  // floor: sealed concrete, aisle walkway lines, fiducial dots (procedural)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.ShaderMaterial({
      uniforms: { uPitch: { value: pitch }, uZ0: { value: z0 } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `varying vec2 vP; uniform float uPitch, uZ0;
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          vec2 w = vec2(vP.x, -vP.y);
          float conc = .55 + .25 * n(w * .7) + .2 * n(w * 6.);
          vec3 c = vec3(.055, .058, .064) * conc;
          // aisle edge lines (yellow, worn)
          float zr = mod(w.y - uZ0 - 1.15, uPitch);
          float line = ((1. - smoothstep(.0, .05, abs(zr - .25))) + (1. - smoothstep(.0, .05, abs(zr - 3.35)))) * step(.5, fract(w.x * .25));
          c = mix(c, vec3(.42, .33, .1) * (.6 + .4 * n(w * 3.)), line * .8);
          // fiducials every 1.2 m
          vec2 gq = abs(fract(w / 1.2) - .5);
          c += vec3(.06) * (1. - smoothstep(.02, .04, length(gq)));
          // light pools under strips
          float pool = exp(-pow(zr - 1.8, 2.) * .5);
          c += vec3(.09, .08, .065) * pool;
          float fog = (1. - smoothstep(20., 70., length(w)));
          gl_FragColor = vec4(c * fog, 1.);
          #include <colorspace_fragment>
        }`,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  g.add(floor)

  // overhead light strips over each aisle
  const stripGeo = new THREE.BoxGeometry(2.2, 0.06, 0.22)
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.5, 4.9, 4.1) })
  const strips = new THREE.InstancedMesh(stripGeo, stripMat, (PAIRS + 1) * MODS * 2)
  let k = 0
  const aisleZ = (r: number) => z0 + r * pitch + 1.15 + AISLE / 2
  for (let r = -1; r < PAIRS; r++) {
    for (let m = 0; m < MODS * 2; m++) strips.setMatrixAt(k++, m4.compose(p.set(x0 + 1.4 + m * 2.72, 8.4, aisleZ(r)), q.identity(), s.set(1, 1, 1)))
  }
  strips.count = k
  g.add(strips)

  // the route: warm flowing dashes along two aisles and a cross aisle (illustrative)
  const routeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOn: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime, uOn;
      void main(){ float dash = step(.45, fract(vUv.x * 40. - uTime * 1.2)); float core = exp(-pow((vUv.y - .5) * 6., 2.));
        float reveal = step(vUv.x, uOn);
        gl_FragColor = vec4(vec3(1., .58, .2) * (core * (.5 + .9 * dash)) * reveal * 1.6, 1.); }`,
  })
  const route = new THREE.Group()
  const seg = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.5), routeMat)
    m.rotation.x = -Math.PI / 2
    m.rotation.z = -Math.atan2(bz - az, bx - ax)
    m.position.set((ax + bx) / 2, 0.02, (az + bz) / 2)
    route.add(m)
  }
  const ra = Math.max(0, Math.floor(PAIRS / 2) - 1)
  seg(x0 - 2, aisleZ(ra), x0 + MODS * 5.45 + 2, aisleZ(ra))
  seg(x0 + MODS * 5.45 + 2, aisleZ(ra), x0 + MODS * 5.45 + 2, aisleZ(ra + 1))
  seg(x0 + MODS * 5.45 + 2, aisleZ(ra + 1), x0 - 2, aisleZ(ra + 1))
  g.add(route)

  // dust in the light
  const DN = ctx.mobile ? 300 : 900
  const dp = new Float32Array(DN * 3)
  for (let i = 0; i < DN; i++) dp.set([(rnd(i, 1) - 0.5) * 40, rnd(i, 2) * 9, (rnd(i, 3) - 0.5) * 36], i * 3)
  const dg = new THREE.BufferGeometry()
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3))
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.03, color: 0xffe2b8, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }))
  g.add(dust)

  const camPos = new THREE.Vector3(), look = new THREE.Vector3()
  const marks: Record<string, THREE.Vector3 | null> = { amazon: null }
  const markP = new THREE.Vector3()
  const az = aisleZ(ra)

  return {
    group: g, near: 0.1, far: 220, bg: new THREE.Color('#06080b'), fog: new THREE.Fog(0x06080b, 14, 62), marks,
    update(local, time) {
      routeMat.uniforms.uTime.value = time
      routeMat.uniforms.uOn.value = sstep(0.18, 0.7, local) * 1.02
      // camera: from high above the grid, swoop down into the routed aisle, glide, then rise to a wide aerial
      const a = easeInOut(sstep(0, 0.35, local))
      const glide = easeInOut(sstep(0.3, 0.75, local))
      const rise = easeInOut(sstep(0.7, 1, local))
      const wide = store.w > 760
      const startX = x0 - 4
      camPos.set(lerp(-6, startX + glide * 18, a), lerp(34, 2.6, a) + rise * 16, lerp(18, az + 0.2, a) + rise * 10 + (store.mobile ? 2 : 0))
      look.set(camPos.x + lerp(4, 9, a) - rise * 3, lerp(0, 2.2, a) - rise * 1.5, lerp(0, az - 0.4, a))
      ctx.cam.position.copy(camPos).add(g.position)
      ctx.cam.lookAt(look.add(g.position))
      ctx.cam.filmOffset = wide ? 6 : 0
      dust.position.y = Math.sin(time * 0.1) * 0.2
      marks.amazon = local > 0.25 && local < 0.95 ? markP.set(startX + 6 + glide * 18, 0.05, az).add(g.position) : null
    },
  }
}
