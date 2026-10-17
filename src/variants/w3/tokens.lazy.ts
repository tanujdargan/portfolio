// Chapter 03: the loss-masking conversation as a stream of ice keycaps, one per real Qwen2.5 token (lossmask.json),
// each printed with its token. Keycaps glow amber in proportion to the loss weight their role gets under the chosen
// regime (the λp / λr presets), and pool light on the floor beneath.
import * as THREE from 'three'
import lossmask from '../../data/lossmask.json'
import { type Ctx, type Chapter, lerp, sstep, easeInOut, rnd, studioEnv, bakedGeometry } from './util.lazy'
import { store, REGIMES } from './store'

export async function createTokens(ctx: Ctx, origin: THREE.Vector3): Promise<Chapter> {
  const g = new THREE.Group()
  g.position.copy(origin)
  const toks: { t: string; role: string }[] = []
  lossmask.segments.forEach((s) => s.tokens.forEach((t) => toks.push({ t, role: s.role })))
  const N = toks.length

  const gl = await ctx.gltf.loadAsync('/w3/models/tile.glb')
  const geo = bakedGeometry(gl.scene)[0].center()

  // ---- layout: the conversation in reading order, like a page of keycaps; a wider gap between turns ----
  type Slot = { x: number; z: number; w: number; row: number; i: number }
  const slots: Slot[] = []
  const roles = ['system', 'user', 'assistant']
  const wrap = 10.5
  const LINE = 0.82
  let row = 0, x = 0, z = 0
  toks.forEach((tk, i) => {
    const r = roles.indexOf(tk.role)
    if (r !== row) {
      row = r
      x = 0
      z += LINE * 1.55
    }
    const w = 0.36 + Math.max(1, tk.t.trim().length) * 0.13
    if (x + w > wrap) {
      x = 0
      z += LINE
    }
    slots.push({ x: x + w / 2, z, w, row: r, i })
    x += w + 0.08
  })
  const depth = z

  // ---- token atlas (canvas): decorative copies; the readable tokens are DOM chips in the panel ----
  const cols = 8, cellW = 256, cellH = 64
  const rows = Math.ceil(N / cols)
  const cv = document.createElement('canvas')
  cv.width = cols * cellW
  cv.height = rows * cellH
  const c2 = cv.getContext('2d')!
  await (document.fonts?.load?.('500 30px "w3 Mono"').catch(() => null) ?? Promise.resolve())
  c2.fillStyle = '#000'
  c2.fillRect(0, 0, cv.width, cv.height)
  c2.font = '500 30px "w3 Mono", ui-monospace, monospace'
  c2.textAlign = 'center'
  c2.textBaseline = 'middle'
  c2.fillStyle = '#fff'
  toks.forEach((tk, i) => {
    const cx = (i % cols) * cellW + cellW / 2, cy = Math.floor(i / cols) * cellH + cellH / 2
    c2.fillText(tk.t.replace(/ /g, '·').replace(/^·/, '·'), cx, cy, cellW - 16)
  })
  const atlas = new THREE.CanvasTexture(cv)
  atlas.colorSpace = THREE.NoColorSpace
  atlas.anisotropy = 8

  // ---- keycaps: frosted glass with an injected per-instance glow ----
  const env = studioEnv(ctx.pmrem, 1)
  const glow = new Float32Array(N)
  const glowAttr = new THREE.InstancedBufferAttribute(glow, 1)
  geo.setAttribute('aGlow', glowAttr)
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1b2633'), roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMap: env, envMapIntensity: 1.8,
  })
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlow; varying float vGlow;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ vec3 nV = normalize(vNormal); vec3 vV = normalize(vViewPosition); float rim = pow(1.0 - abs(dot(nV, vV)), 3.0);\n totalEmissiveRadiance += mix(vec3(0.45, 0.62, 0.85) * (rim * 0.9 + 0.02), vec3(1.0, 0.5, 0.15) * (0.32 + rim * 1.2), vGlow); }')
  }
  const caps = new THREE.InstancedMesh(geo, mat, N)
  g.add(caps)

  // printed faces: instanced quads sampling the atlas by instance id
  const faceGeo = new THREE.PlaneGeometry(1, 1)
  faceGeo.rotateX(-Math.PI / 2)
  const idx = new Float32Array(N).map((_, i) => i)
  faceGeo.setAttribute('aIdx', new THREE.InstancedBufferAttribute(idx, 1))
  faceGeo.setAttribute('aGlow', glowAttr)
  const faceMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { tAtlas: { value: atlas }, uGrid: { value: new THREE.Vector2(cols, rows) } },
    vertexShader: `attribute float aIdx; attribute float aGlow; varying vec2 vUv; varying float vGlow;
      uniform vec2 uGrid;
      void main(){ vec2 cell = vec2(mod(aIdx, uGrid.x), uGrid.y - 1. - floor(aIdx / uGrid.x));
        vUv = (cell + uv) / uGrid; vGlow = aGlow;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform sampler2D tAtlas; varying vec2 vUv; varying float vGlow;
      void main(){ float a = texture2D(tAtlas, vUv).r; vec3 c = mix(vec3(.55,.66,.8) * .45, vec3(1.25, .82, .45), vGlow); gl_FragColor = vec4(c * a, 1.); }`,
  })
  const faces = new THREE.InstancedMesh(faceGeo, faceMat, N)
  g.add(faces)

  // light pools on the floor under lit keys
  const poolGeo = new THREE.PlaneGeometry(1, 1)
  poolGeo.rotateX(-Math.PI / 2)
  poolGeo.setAttribute('aGlow', glowAttr)
  const poolMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aGlow; varying vec2 vUv; varying float vGlow; void main(){ vUv = uv; vGlow = aGlow; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; varying float vGlow; void main(){ vec2 d = (vUv - .5) * vec2(1., 1.); float f = exp(-dot(d,d) * 9.); gl_FragColor = vec4(vec3(1., .5, .16) * f * vGlow * .11, 1.); }`,
  })
  const pools = new THREE.InstancedMesh(poolGeo, poolMat, N)
  g.add(pools)

  // floor: dark polished ice with faint lines
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshPhysicalMaterial({ color: '#0a0f16', roughness: 0.28, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.12, envMap: env, envMapIntensity: 0.6 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.2
  g.add(floor)
  const key = new THREE.DirectionalLight(0xcfe0ff, 1.6)
  key.position.set(-4, 8, 6)
  g.add(key)
  const fill = new THREE.HemisphereLight(0x3d5a80, 0x05080c, 0.5)
  g.add(fill)

  // place instances (centered stream)
  const off = new THREE.Vector3(-wrap / 2, 0, -depth / 2)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3()
  const base: THREE.Vector3[] = []
  slots.forEach((sl, i) => {
    p.set(sl.x, 0.1, sl.z).add(off)
    base.push(p.clone())
    q.setFromEuler(new THREE.Euler(0, (rnd(i, 2) - 0.5) * 0.06, 0))
    s.set(sl.w, 1.15, 1.6)
    caps.setMatrixAt(i, m4.compose(p, q, s))
    faces.setMatrixAt(i, m4.compose(p.clone().setY(0.1 + 0.092), q, new THREE.Vector3(sl.w * 0.92, 1, 0.58)))
    pools.setMatrixAt(i, m4.compose(p.clone().setY(-0.19), q, new THREE.Vector3(sl.w * 1.7, 1, 1.5)))
  })

  const target = new Float32Array(N)
  const camPos = new THREE.Vector3(), look = new THREE.Vector3()
  const marks: Record<string, THREE.Vector3 | null> = { lossmask: null }
  const firstAssistant = toks.findIndex((t) => t.role === 'assistant')
  const markW = new THREE.Vector3()

  return {
    group: g, near: 0.05, far: 140, bg: new THREE.Color('#05070b'), fog: new THREE.FogExp2(0x05070b, 0.05), marks,
    update(local, time, dt) {
      const R = REGIMES.find((r) => r.value === store.regime)!
      // stagger the light along the stream so a regime change visibly travels
      const wave = sstep(0.05, 0.3, local)
      let moving = false
      for (let i = 0; i < N; i++) {
        const w = toks[i].role === 'assistant' ? R.lr : R.lp
        target[i] = w * sstep(i / N - 0.2, i / N + 0.05, wave * 1.25)
        const d = target[i] - glow[i]
        if (Math.abs(d) > 0.002) moving = true
        glow[i] += d * Math.min(1, dt * (4 + (i % 7)))
      }
      glowAttr.needsUpdate = true
      if (moving) store.dirty = true
      // gentle float
      for (let i = 0; i < N; i += 1) {
        const y = 0.1 + Math.sin(time * 0.9 + i * 0.7) * 0.025 + glow[i] * 0.08
        p.copy(base[i]).setY(y)
        q.setFromEuler(new THREE.Euler(0, (rnd(i, 2) - 0.5) * 0.06, 0))
        caps.setMatrixAt(i, m4.compose(p, q, s.set(slots[i].w, 1.15, 1.6)))
        faces.setMatrixAt(i, m4.compose(p.setY(y + 0.092), q, s.set(slots[i].w * 0.92, 1, 0.58)))
      }
      caps.instanceMatrix.needsUpdate = true
      faces.instanceMatrix.needsUpdate = true

      // camera: drop in from above, then a slow three-quarter glide across the rows toward the assistant turn
      const k = easeInOut(sstep(0, 0.32, local))
      const along = easeInOut(sstep(0.15, 1, local))
      const wide = store.w > 760
      const mob = store.mobile
      camPos.set(lerp(-1.6, 1.0, along), lerp(18, mob ? 17 : 12, k) - along * 1.2, lerp(2, mob ? 10 : 9.6, k) + along * 0.8)
      look.set(lerp(-0.8, 0.5, along), 0, lerp(-1.6, 0.9, along))
      ctx.cam.position.copy(camPos).add(g.position)
      ctx.cam.lookAt(look.add(g.position))
      ctx.cam.filmOffset = wide ? -9 : 0
      marks.lossmask = local > 0.25 ? caps.localToWorld(markW.copy(base[firstAssistant]).setY(0.3)) : null
    },
    dispose() {
      env.dispose()
      atlas.dispose()
    },
  }
}
