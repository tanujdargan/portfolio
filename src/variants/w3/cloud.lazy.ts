// Chapter 02: the joy activation cloud. 40 real points (steering.json `cloud`, 2-D projection where x is the read-back
// along the joy direction) as glass shards; they start scattered (illustrative) and settle onto their real coordinates.
// Then a bead walks the nine real steered outputs (`xy`), α −1.2 … +1.2, and jumps between +0.3 and +0.6.
import * as THREE from 'three'
import steering from '../../data/steering.json'
import { type Ctx, type Chapter, lerp, sstep, easeInOut, rnd, studioEnv, dotTexture, bakedGeometry } from './util.lazy'
import { store } from './store'

// data units → metres; x (the read-back along the joy direction) is plotted wider than y so the split reads
const SX = 0.34, SY = 0.12

export async function createCloud(ctx: Ctx, origin: THREE.Vector3): Promise<Chapter> {
  const g = new THREE.Group()
  g.position.copy(origin)
  const joy = steering.concepts.joy
  const pts = [...joy.cloud.pos.map((p) => ({ p, pos: true })), ...joy.cloud.neg.map((p) => ({ p, pos: false }))]
  const outs = joy.outputs[0].map((o) => o.xy as number[])

  const gl = await ctx.gltf.loadAsync('/w3/models/shards.glb')
  const geos = bakedGeometry(gl.scene).map((g) => g.center())
  const env = studioEnv(ctx.pmrem, 0.9)
  // ice: polished facets reflect a dark studio; the colour comes from a fresnel rim and a faint core (per-instance tint)
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#15202c'), roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMap: env, envMapIntensity: 2.4,
    specularIntensity: 1, ior: 1.31, iridescence: 0.3, iridescenceIOR: 1.33, iridescenceThicknessRange: [200, 600],
  })
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      {
        vec3 nV = normalize(vNormal); vec3 vV = normalize(vViewPosition);
        float ndv = abs(dot(nV, vV));
        float rim = pow(1.0 - ndv, 3.2);
        totalEmissiveRadiance += vColor.rgb * (rim * 2.6 + pow(ndv, 3.0) * 0.16 + 0.03);
      }`,
    )
  }
  // three instanced meshes (one per shard shape), assigned round-robin
  const meshes = geos.map((geo, k) => {
    const n = pts.filter((_, i) => i % geos.length === k).length
    const im = new THREE.InstancedMesh(geo, mat, n)
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    g.add(im)
    return im
  })
  const tint = { pos: new THREE.Color('#ffb36b'), neg: new THREE.Color('#8fc4ff') }
  const slots = pts.map((d, i) => {
    const im = meshes[i % geos.length]
    const j = Math.floor(i / geos.length)
    im.setColorAt(j, d.pos ? tint.pos : tint.neg)
    const home = new THREE.Vector3(d.p[0] * SX, d.p[1] * SY, (rnd(i, 9) - 0.5) * 0.6)
    const u = rnd(i, 1) * 2 - 1, th = rnd(i, 2) * Math.PI * 2, r = 4 + rnd(i, 3) * 5
    const away = new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(th) * r, u * r * 0.8, Math.sqrt(1 - u * u) * Math.sin(th) * r - 2)
    const rot = new THREE.Euler(rnd(i, 4) * 6.28, rnd(i, 5) * 6.28, rnd(i, 6) * 6.28)
    const scale = 0.34 + rnd(i, 7) * 0.22
    return { im, j, home, away, rot, scale, delay: rnd(i, 8) * 0.35, spin: (rnd(i, 10) - 0.5) * 0.4 }
  })
  meshes.forEach((m) => m.instanceColor && (m.instanceColor.needsUpdate = true))

  // lights coloured by side: warm on +joy, cool on −joy, for the glass to pick up
  const warm = new THREE.PointLight(0xffb066, 30, 14, 1.6)
  warm.position.set(3.2, 1.5, 2.5)
  const cool = new THREE.PointLight(0x7fb6ff, 26, 14, 1.6)
  cool.position.set(-3.2, -1.2, 2.5)
  const top = new THREE.DirectionalLight(0xdfeaff, 1.4)
  top.position.set(0.5, 3, 2)
  g.add(warm, cool, top)

  // joy axis: a thin beam of light along +x
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: { uOn: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uOn, uTime;
      void main(){ float x = vUv.x; float core = exp(-pow((vUv.y - .5) * 9., 2.));
        vec3 c = mix(vec3(.45,.7,1.), vec3(1.,.72,.38), smoothstep(.35,.65,x));
        float ends = smoothstep(0., .12, x) * (1. - smoothstep(.88, 1., x));
        float pulse = .75 + .25 * sin(x * 40. - uTime * 3.);
        gl_FragColor = vec4(c * core * ends * pulse * uOn * 1.6, 1.); }`,
  })
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.12), beamMat)
  g.add(beam)

  // the bead (steered output) and its trail through the nine real points
  const beadMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) })
  const bead = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 2), beadMat)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))
  halo.scale.setScalar(0.7)
  bead.add(halo)
  g.add(bead)
  const trailPts = outs.map((xy) => new THREE.Vector3(xy[0] * SX, xy[1] * SY, 0.15))
  const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts)
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xbfe2ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }))
  g.add(trail)
  const ticks = new THREE.Points(
    trailGeo,
    new THREE.PointsMaterial({ size: 0.07, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x9fc8ff }),
  )
  g.add(ticks)

  // dust + a far dot-grid floor for depth
  const DN = ctx.mobile ? 500 : 1400
  const dp = new Float32Array(DN * 3)
  for (let i = 0; i < DN; i++) dp.set([(rnd(i, 11) - 0.5) * 30, (rnd(i, 12) - 0.5) * 22, (rnd(i, 13) - 0.7) * 26], i * 3)
  const dg = new THREE.BufferGeometry()
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3))
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.035, map: dotTexture(), transparent: true, depthWrite: false, opacity: 0.6, color: 0x9fb8d6, blending: THREE.AdditiveBlending }))
  g.add(dust)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `varying vec2 vP; void main(){ vec2 g = abs(fract(vP / 1.2) - .5); float d = (1. - smoothstep(.0, .07, length(g))); float f = (1. - smoothstep(4., 34., length(vP)));
        gl_FragColor = vec4(vec3(.55,.7,.9) * d * f * .5, d * f * .5); }`,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -4.2
  g.add(floor)

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3()
  const camPos = new THREE.Vector3(), look = new THREE.Vector3()
  const beadW = new THREE.Vector3()
  const marks: Record<string, THREE.Vector3 | null> = { steering: null }

  return {
    group: g, near: 0.05, far: 120, bg: new THREE.Color('#05080d'), fog: new THREE.FogExp2(0x05080d, 0.045), marks,
    update(local, time) {
      const settle = local
      slots.forEach((s) => {
        const k = easeInOut(sstep(0.02 + s.delay * 0.4, 0.32 + s.delay * 0.4, settle))
        p.lerpVectors(s.away, s.home, k)
        p.y += Math.sin(time * 0.6 + s.delay * 20) * 0.04
        q.setFromEuler(new THREE.Euler(s.rot.x + time * s.spin * (1.2 - k), s.rot.y + time * s.spin, s.rot.z))
        sc.setScalar(s.scale * lerp(0.6, 1, k))
        m4.compose(p, q, sc)
        s.im.setMatrixAt(s.j, m4)
      })
      meshes.forEach((m) => (m.instanceMatrix.needsUpdate = true))
      const on = sstep(0.24, 0.36, local)
      beamMat.uniforms.uOn.value = on
      beamMat.uniforms.uTime.value = time
      // bead follows α (store.alpha is 0..8, fractional while scrolling)
      const a = Math.min(8, Math.max(0, store.alpha))
      const i0 = Math.floor(a), i1 = Math.min(8, i0 + 1), f = easeInOut(a - i0)
      bead.position.lerpVectors(trailPts[i0], trailPts[i1], f)
      const x = bead.position.x
      const warmK = sstep(-0.4, 0.4, x)
      beadMat.color.setRGB(lerp(0.75, 1.6, warmK), lerp(0.9, 1.15, warmK), lerp(1.6, 0.6, warmK))
      ;(halo.material as THREE.SpriteMaterial).color.copy(beadMat.color)
      bead.visible = halo.visible = on > 0.01
      trail.visible = ticks.visible = on > 0.01
      ;(trail.material as THREE.LineBasicMaterial).opacity = 0.5 * on
      trailGeo.setDrawRange(0, Math.max(1, Math.ceil(a) + 1))

      // camera: arrive from above (out of the cloud deck), settle in front, then track the bead a little
      const arrive = easeInOut(sstep(0, 0.3, local))
      camPos.set(lerp(0.6, 0.9, arrive) + x * 0.62 * arrive, lerp(10, 0.9, arrive), lerp(3, 12, arrive) - sstep(0.4, 1, local) * 1.4)
      if (store.mobile) camPos.z += 3.2
      look.set(x * 0.62 * arrive, lerp(-2, 0.1, arrive), 0)
      if (store.w > 760) look.x += 2.4 // the panel sits on the right; push the cloud left
      ctx.cam.position.copy(camPos).add(g.position)
      ctx.cam.lookAt(look.add(g.position))
      ctx.cam.filmOffset = 0
      dust.rotation.y = time * 0.01
      marks.steering = on > 0.5 ? bead.getWorldPosition(beadW) : null
    },
    dispose() {
      env.dispose()
    },
  }
}
