// The W3 world: one renderer, one camera, six sets along a vertical descent. Scroll (store.t) is followed by a damped
// spring; chapter cuts are hidden by a cloud-deck whiteout (orbit → data) and short glitch/dark fades.
// Renders on demand: frames run while scroll is settling, a regime change is animating, or for a few seconds of ambient
// motion after the last input; then the loop sleeps. Paused while the tab is hidden or the demo sheet is open.
import * as THREE from 'three'
import { store, onPoke, emitFrame } from './store'
import { Post } from './post.lazy'
import { type Ctx, type Chapter, makeCtxLoaders, sstep } from './util.lazy'
import { createOrbit } from './orbit.lazy'
import { createCloud } from './cloud.lazy'
import { createTokens } from './tokens.lazy'
import { createWarehouse } from './warehouse.lazy'
import { createOcean } from './ocean.lazy'

const MARK_KEYS = ['orbit', 'firmware', 'steering', 'lossmask', 'amazon', 'ocean']
const AMBIENT_MS = 7000

export async function createWorld(canvas: HTMLCanvasElement, onReady: () => void) {
  const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' })
  const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5)
  renderer.setPixelRatio(dpr)
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const post = new Post(renderer, mobile)
  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(40, 1, 0.01, 200)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const { gltf, load } = makeCtxLoaders(renderer)
  const ctx: Ctx = { renderer, scene, cam, mobile, gltf, tex: (u, srgb = true) => load(u, srgb, false), pmrem }

  const size = () => {
    const w = innerWidth, h = innerHeight
    renderer.setSize(w, h, false)
    post.setSize(Math.floor(w * dpr), Math.floor(h * dpr))
    cam.aspect = w / h
    // keep the subject comfortably framed on portrait screens
    cam.fov = cam.aspect < 0.8 ? 52 : 40
    cam.updateProjectionMatrix()
    store.w = w
    store.h = h
    kick()
  }

  // ---------- chapters ----------
  const orbit = await createOrbit(ctx)
  scene.add(orbit.group)
  const sets: (Chapter | null)[] = [null, null, null, null] // cloud, tokens, warehouse, ocean(+surface)
  const origins = [new THREE.Vector3(0, -1000, 0), new THREE.Vector3(0, -2000, 0), new THREE.Vector3(0, -3000, 0), new THREE.Vector3(0, -4000, 0)]
  const makers = [createCloud, createTokens, createWarehouse, createOcean]

  // ---------- timeline ----------
  let sT = store.t
  let last = performance.now()
  let lastInput = last
  let raf = 0
  let running = false
  let dead = false
  const v = new THREE.Vector3()
  const black = new THREE.Color(0, 0, 0)
  const white = new THREE.Color(1.35, 1.45, 1.6)

  function chapterAt(st: number): { idx: number; local: number } {
    if (st < 2) return { idx: -1, local: st }
    if (st < 3) return { idx: 0, local: st - 2 }
    if (st < 4) return { idx: 1, local: st - 3 }
    if (st < 5) return { idx: 2, local: st - 4 }
    return { idx: 3, local: st - 5 }
  }

  function frame(now: number) {
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    const time = now / 1000
    // follow scroll with a critically-damped-ish spring; snap long jumps (rail links) behind a flash
    const target = store.t
    const gap = target - sT
    let flash = 0
    if (Math.abs(gap) > 1.1) {
      sT = target - Math.sign(gap) * 0.04
      flash = 1
    } else sT += gap * (1 - Math.exp(-dt * 5.5))
    const st = sT
    const { idx, local } = chapterAt(st)

    // ---------- per-chapter update ----------
    orbit.group.visible = idx === -1
    sets.forEach((s, i) => s && (s.group.visible = i === idx))
    let near = 0.01, far = 200
    let bg = black
    let fog: THREE.Fog | THREE.FogExp2 | null = null
    const activeMarks: Record<string, THREE.Vector3 | null> = {}
    let earthOn = false
    if (idx === -1) {
      orbit.update(st, time)
      earthOn = true
      Object.assign(activeMarks, orbit.marks)
    } else {
      const s = sets[idx]
      if (s) {
        s.update(local, time, dt)
        near = s.near
        far = s.far
        bg = s.bg
        fog = s.fog ?? null
        Object.assign(activeMarks, s.marks)
      } else {
        cam.position.set(0, origins[idx].y + 5, 10)
        cam.lookAt(0, origins[idx].y, 0)
      }
    }
    if (cam.near !== near || cam.far !== far) {
      cam.near = near
      cam.far = far
    }
    cam.updateProjectionMatrix()
    scene.fog = fog
    renderer.setClearColor(bg, 1)

    // ---------- transitions ----------
    const u = post.u
    const white1 = sstep(1.84, 1.975, st) * (1 - sstep(2.0, 2.09, st))
    let dark = 0
    for (const b of [3, 4, 5]) dark = Math.max(dark, 1 - sstep(0, 0.07, Math.abs(st - b)))
    dark = Math.max(dark, flash)
    u.uFade.value = Math.max(white1, dark)
    ;(u.uFadeColor.value as THREE.Color).copy(white1 > dark ? white : black)
    u.uGlitch.value = Math.max(dark * 0.9, white1 * 0.5)
    u.uCA.value = 0.0035 + dark * 0.02 + white1 * 0.012 + (idx === -1 ? sstep(1.5, 1.9, st) * 0.01 : 0)
    u.uBloom.value = idx === -1 ? 0.75 : idx === 2 ? 0.85 : 1.0
    u.uVig.value = idx === 3 && local > 1.2 ? 0.4 : 0.6

    // ---------- render ----------
    post.render(() => {
      if (earthOn) orbit.renderEarth(renderer)
      renderer.render(scene, cam)
    }, time)

    // ---------- HUD marks ----------
    for (const k of MARK_KEYS) {
      const p = activeMarks[k]
      const m = (store.marks[k] ??= { x: 0, y: 0, on: false })
      if (!p) {
        m.on = false
        continue
      }
      const c = idx === -1 && orbit.markCam[k] === 'earth' ? orbit.earthCam : cam
      v.copy(p).project(c)
      m.x = (v.x * 0.5 + 0.5) * store.w
      m.y = (-v.y * 0.5 + 0.5) * store.h
      m.on = v.z < 1 && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.9 && u.uFade.value < 0.3
    }
    emitFrame()
    return Math.abs(target - sT) > 0.0004 || flash > 0
  }

  function tick(now: number) {
    raf = 0
    if (dead) return
    if (document.hidden || document.documentElement.dataset.w3sheet) {
      running = false
      return
    }
    store.dirty = false
    const moving = frame(now)
    const ambient = now - lastInput < AMBIENT_MS
    if (moving || ambient || store.dirty) raf = requestAnimationFrame(tick)
    else running = false
  }
  function kick() {
    lastInput = performance.now()
    if (running || dead) return
    running = true
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }

  size()
  addEventListener('resize', size)
  const offPoke = onPoke(kick)
  const onVis = () => !document.hidden && kick()
  document.addEventListener('visibilitychange', onVis)
  const onMove = () => kick()
  addEventListener('pointermove', onMove, { passive: true })
  // the sheet closing removes the attribute; resume then
  const mo = new MutationObserver(() => !document.documentElement.dataset.w3sheet && kick())
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-w3sheet'] })

  // first frame, then reveal
  frame(performance.now())
  await new Promise((r) => requestAnimationFrame(r))
  onReady()
  kick()

  // stream the rest, nearest chapter first
  ;(async () => {
    const order = [0, 1, 2, 3].sort((a, b) => Math.abs(a + 2 - store.t) - Math.abs(b + 2 - store.t))
    for (const i of order) {
      if (dead) return
      try {
        const s = await makers[i](ctx, origins[i])
        if (dead) return
        s.group.visible = false
        scene.add(s.group)
        sets[i] = s
        // pre-compile with this set in view so its first appearance doesn't stall
        s.group.visible = true
        const vis = orbit.group.visible
        orbit.group.visible = false
        await renderer.compileAsync(scene, cam).catch(() => {})
        orbit.group.visible = vis
        s.group.visible = false
        kick()
      } catch (e) {
        console.warn('w3: chapter failed to load', i, e)
      }
    }
  })()

  return {
    dispose() {
      dead = true
      cancelAnimationFrame(raf)
      removeEventListener('resize', size)
      removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVis)
      mo.disconnect()
      offPoke()
      orbit.dispose()
      sets.forEach((s) => s?.dispose?.())
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
      })
      post.dispose()
      pmrem.dispose()
      renderer.dispose()
    },
  }
}
