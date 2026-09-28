// Self-check for the S3 camera math. Run: node src/variants/s3/camera.check.ts   (Node ≥ 23 strips the types)
import { bezier, clampPan, decay, fit, flyPath, lerpLog, pinch, rubberScale, toScreen, toWorld, zoomAt, releaseVelocity } from './camera.ts'
import type { Cam } from './camera.ts'

let n = 0
const ok = (c: boolean, m: string) => {
  n++
  if (!c) throw new Error(`✗ ${m}`)
}
const near = (a: number, b: number, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(a), Math.abs(b))
const camNear = (a: Cam, b: Cam, e = 1e-6) => near(a.x, b.x, e) && near(a.y, b.y, e) && near(a.s, b.s, e)

// round trip
const c: Cam = { x: 120, y: -40, s: 0.6 }
const w = toWorld(c, { x: 500, y: 300 })
const p = toScreen(c, w)
ok(near(p.x, 500) && near(p.y, 300), 'toWorld/toScreen round trip')

// zoom around the cursor keeps the world point under it fixed
for (const f of [0.5, 1.7, 3]) {
  const z = zoomAt(c, f, { x: 500, y: 300 })
  const w2 = toWorld(z, { x: 500, y: 300 })
  ok(near(w2.x, w.x) && near(w2.y, w.y), `zoomAt anchor fixed (f=${f})`)
}
// clamping: 0.35–2.5, and the anchor still holds at the clamp
const zc = zoomAt(c, 100, { x: 10, y: 20 }, 0.35, 2.5)
ok(zc.s === 2.5, 'zoomAt clamps the max')
ok(zoomAt(c, 0.01, { x: 0, y: 0 }, 0.35, 2.5).s === 0.35, 'zoomAt clamps the min')
const wc = toWorld(zc, { x: 10, y: 20 })
const w0 = toWorld(c, { x: 10, y: 20 })
ok(near(wc.x, w0.x) && near(wc.y, w0.y), 'clamped zoom keeps the anchor')

// pinch: fingers apart 2× around a midpoint doubles scale, the midpoint's world point follows the midpoint
const pc = pinch(c, { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 50, y: 150 }, { x: 250, y: 150 })
ok(near(pc.s, c.s * 2), 'pinch scales with finger distance')
const pm = toWorld(pc, { x: 150, y: 150 })
const pm0 = toWorld(c, { x: 150, y: 100 })
ok(near(pm.x, pm0.x) && near(pm.y, pm0.y), 'pinch keeps the world point under the midpoint')
// same fingers = identity
ok(camNear(pinch(c, { x: 1, y: 2 }, { x: 90, y: 40 }, { x: 1, y: 2 }, { x: 90, y: 40 }), c), 'pinch identity')

// rubber band: identity inside, compressive and monotonic outside
ok(rubberScale(1, 0.35, 2.5) === 1, 'rubber identity inside')
ok(rubberScale(5, 0.35, 2.5) > 2.5 && rubberScale(5, 0.35, 2.5) < 5, 'rubber compresses above max')
ok(rubberScale(0.1, 0.35, 2.5) < 0.35 && rubberScale(0.1, 0.35, 2.5) > 0.1, 'rubber compresses below min')
ok(rubberScale(6, 0.35, 2.5) > rubberScale(5, 0.35, 2.5), 'rubber monotonic')

// fit frames the rect centred inside the viewport, respecting padding
const vp = { x: 0, y: 0, w: 1440, h: 900 }
const r = { x: 1000, y: 400, w: 520, h: 470 }
const f = fit(r, vp, 40)
const tl = toScreen(f, { x: r.x, y: r.y })
const br = toScreen(f, { x: r.x + r.w, y: r.y + r.h })
ok(near((tl.x + br.x) / 2, 720) && near((tl.y + br.y) / 2, 450), 'fit centres the rect')
ok(near(br.y - tl.y, 820) && br.x - tl.x <= 1360 + 1e-6, 'fit uses the limiting axis with padding')

// clampPan: the view centre is kept inside the bounds
const b = { x: 0, y: 0, w: 2600, h: 1600 }
const far: Cam = { x: 5000, y: 5000, s: 0.5 }
const cl = clampPan(far, b, 1440, 900).cam
const cc = toWorld(cl, { x: 720, y: 450 })
ok(cc.x >= -1e-6 && cc.y >= -1e-6 && cc.x <= 2600 + 1e-6 && cc.y <= 1600 + 1e-6, 'clampPan keeps the centre in bounds')
ok(camNear(clampPan(f, { x: 0, y: 0, w: 5000, h: 5000 }, 1440, 900).cam, f), 'clampPan leaves an in-bounds camera alone')

// flights: exact endpoints, positive scale, and pure zooms are log-linear
const A: Cam = { x: 0, y: 0, s: 0.45 }
const B = fit(r, vp, 60)
const fp = flyPath(A, B, 1440, 900)
ok(camNear(fp.at(0), A) && camNear(fp.at(1), B), 'flyPath endpoints are exact')
ok(near(fp.at(0.999).s, B.s, 1e-2), 'flyPath is continuous at the end')
let pos = true
for (let t = 0; t <= 1; t += 0.01) pos &&= fp.at(t).s > 0 && Number.isFinite(fp.at(t).x)
ok(pos, 'flyPath scale positive and finite')
ok(fp.S > 0, 'flyPath has a positive length')
const Z = zoomAt(A, 4, { x: 720, y: 450 })
const zp = flyPath(A, Z, 1440, 900)
ok(near(zp.at(0.5).s, Math.sqrt(A.s * Z.s), 1e-6), 'pure zoom: midpoint scale is the geometric mean (log space)')
ok(near(lerpLog(A, Z, 0.5, 1440, 900).s, Math.sqrt(A.s * Z.s)), 'lerpLog midpoint scale is the geometric mean')
// a long hop at equal scale zooms out on the way (it flies)
const H1: Cam = { x: 0, y: 0, s: 1 }
const H2: Cam = { x: -3000, y: 0, s: 1 }
ok(flyPath(H1, H2, 1440, 900).at(0.5).s < 1, 'a long pan at equal scale zooms out mid-flight')

// easing
const e = bezier(0.65, 0, 0.35, 1)
ok(e(0) === 0 && e(1) === 1 && near(e(0.5), 0.5, 1e-4), 'ease-io endpoints and symmetry')
let mono = true
for (let t = 0.01, prev = 0; t < 1; t += 0.01) {
  const v = e(t)
  mono &&= v >= prev - 1e-9
  prev = v
}
ok(mono, 'ease-io monotonic')

// inertia: 0.92 per 60 Hz frame, independent of frame rate
ok(near(decay(1, 0.92, 1000 / 60), 0.92), 'decay one frame')
ok(near(decay(decay(1, 0.92, 8), 0.92, 1000 / 60 - 8), 0.92), 'decay split frames compose')
// release velocity from samples
const v = releaseVelocity([
  { t: 0, x: 0, y: 0 },
  { t: 16, x: 16, y: 8 },
  { t: 32, x: 32, y: 16 },
])
ok(near(v.x, 1) && near(v.y, 0.5), 'release velocity')

console.log(`camera ok · ${n} checks`)
