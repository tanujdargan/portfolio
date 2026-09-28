/*
 * S3 camera math. Pure functions, no DOM: the board and its self-check (camera.check.ts, run with `node`) share it.
 *
 * A camera maps world to screen:  screen = world · s + (x, y).
 * Flights use van Wijk & Nuij's smooth zoom ("Smooth and efficient zooming and panning", 2003): the path runs in
 * (centre, visible width) space with the width changing exponentially, so scale is interpolated in log space and a
 * long hop zooms out a little on the way (a flight, not a slide). With no pan it reduces to a pure log-space zoom.
 */

export type Cam = { x: number; y: number; s: number }
export type Vec = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

export const toWorld = (c: Cam, p: Vec): Vec => ({ x: (p.x - c.x) / c.s, y: (p.y - c.y) / c.s })
export const toScreen = (c: Cam, p: Vec): Vec => ({ x: p.x * c.s + c.x, y: p.y * c.s + c.y })

/** Scale by `f` around a screen point, so the world point under it stays put. The new scale is clamped. */
export function zoomAt(c: Cam, f: number, p: Vec, lo = 0, hi = Infinity): Cam {
  const s = clamp(c.s * f, lo, hi)
  const k = s / c.s
  return { s, x: p.x - (p.x - c.x) * k, y: p.y - (p.y - c.y) * k }
}

/** Scale to an absolute value around a screen point (no clamp: the caller decides). */
export function zoomTo(c: Cam, s: number, p: Vec): Cam {
  const k = s / c.s
  return { s, x: p.x - (p.x - c.x) * k, y: p.y - (p.y - c.y) * k }
}

/**
 * Two-finger transform. Recomputed from where the gesture started (never accumulated per event), so it can't drift:
 * the world point under the starting midpoint follows the current midpoint, and scale follows the finger distance.
 */
export function pinch(start: Cam, a0: Vec, b0: Vec, a1: Vec, b1: Vec, soft: (s: number) => number = (s) => s): Cam {
  const d0 = Math.max(1, Math.hypot(b0.x - a0.x, b0.y - a0.y))
  const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y)
  const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }
  const m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 }
  const w = toWorld(start, m0)
  const s = soft(start.s * (d1 / d0))
  return { s, x: m1.x - w.x * s, y: m1.y - w.y * s }
}

/** Rubber band past a limit: the further you push, the less it gives (iOS-style). Identity inside [lo, hi]. */
export function rubberScale(s: number, lo: number, hi: number, k = 0.35): number {
  if (s > hi) return hi * Math.pow(s / hi, k)
  if (s < lo) return lo * Math.pow(s / lo, k)
  return s
}
/** Same for distances in px: past the edge, the offset is compressed toward `dim · c` asymptotically. */
export function rubberPx(over: number, dim: number, c = 0.55): number {
  if (over === 0) return 0
  const a = Math.abs(over)
  return Math.sign(over) * (1 - 1 / ((a * c) / dim + 1)) * dim
}

/** Frame a world rect inside a screen rect (with padding), centred. Scale is clamped. */
export function fit(r: Rect, vp: Rect, pad = 0, lo = 0, hi = Infinity): Cam {
  const s = clamp(Math.min((vp.w - pad * 2) / r.w, (vp.h - pad * 2) / r.h), lo, hi)
  return { s, x: vp.x + vp.w / 2 - (r.x + r.w / 2) * s, y: vp.y + vp.h / 2 - (r.y + r.h / 2) * s }
}

/** World point at the centre of the viewport. */
export const centre = (c: Cam, vw: number, vh: number): Vec => toWorld(c, { x: vw / 2, y: vh / 2 })

/**
 * Keep the view centre inside the world bounds (expanded by `pad` world units). Works at any zoom, and it is
 * what "you can't get lost" means on a board: some of the work is always on screen.
 * Returns the clamped camera and the overshoot in screen px (for rubber-banding and killing velocity).
 */
export function clampPan(c: Cam, b: Rect, vw: number, vh: number, pad = 0): { cam: Cam; over: Vec } {
  const m = centre(c, vw, vh)
  const cx = clamp(m.x, b.x - pad, b.x + b.w + pad)
  const cy = clamp(m.y, b.y - pad, b.y + b.h + pad)
  const over = { x: (m.x - cx) * c.s, y: (m.y - cy) * c.s }
  return { cam: { s: c.s, x: c.x + over.x, y: c.y + over.y }, over }
}

/** Apply rubber-band resistance to an out-of-bounds camera (used while a finger is down). */
export function softPan(c: Cam, b: Rect, vw: number, vh: number, pad = 0): Cam {
  const { cam, over } = clampPan(c, b, vw, vh, pad)
  return { s: c.s, x: cam.x - rubberPx(over.x, vw), y: cam.y - rubberPx(over.y, vh) }
}

/** Frame-rate independent decay: `v · decay^(dt / 16.67)`. At 0.92 per frame a flick coasts ~0.4 s. */
export const decay = (v: number, perFrame: number, dt: number) => v * Math.pow(perFrame, dt / (1000 / 60))

/** Exponential smoothing toward a target, frame-rate independent (fraction of the gap closed per 60 Hz frame). */
export const approach = (from: number, to: number, perFrame: number, dt: number) =>
  to + (from - to) * Math.pow(1 - perFrame, dt / (1000 / 60))

/** Log-space scale interpolation with a linear view centre: the simple flight (and the reduced-effort fallback). */
export function lerpLog(a: Cam, b: Cam, t: number, vw: number, vh: number): Cam {
  const ca = centre(a, vw, vh)
  const cb = centre(b, vw, vh)
  const s = Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * t)
  const cx = ca.x + (cb.x - ca.x) * t
  const cy = ca.y + (cb.y - ca.y) * t
  return { s, x: vw / 2 - cx * s, y: vh / 2 - cy * s }
}

/**
 * van Wijk–Nuij smooth zoom between two cameras. Returns the path (t ∈ [0,1] → camera) and its length S in
 * "zoom units"; bigger S means a longer flight, which callers use to stretch duration a little.
 * rho trades zoom-out against pan (√2 is the paper's optimum; lower is flatter).
 */
export function flyPath(a: Cam, b: Cam, vw: number, vh: number, rho = 1.2): { at: (t: number) => Cam; S: number } {
  const c0 = centre(a, vw, vh)
  const c1 = centre(b, vw, vh)
  const w0 = vw / a.s
  const w1 = vw / b.s
  const dx = c1.x - c0.x
  const dy = c1.y - c0.y
  const d2 = dx * dx + dy * dy
  const d1 = Math.sqrt(d2)
  const r2 = rho * rho
  const r4 = r2 * r2
  const cam = (cx: number, cy: number, w: number): Cam => {
    const s = vw / w
    return { s, x: vw / 2 - cx * s, y: vh / 2 - cy * s }
  }
  if (d1 < 1e-6 * Math.max(w0, w1)) {
    // pure zoom: width is exponential in t, i.e. scale is linear in log space
    const S = Math.abs(Math.log(w1 / w0)) / rho
    return {
      S,
      at: (t) => {
        if (t <= 0) return { ...a }
        if (t >= 1) return { ...b }
        return cam(c0.x + dx * t, c0.y + dy * t, w0 * Math.pow(w1 / w0, t))
      },
    }
  }
  const b0 = (w1 * w1 - w0 * w0 + r4 * d2) / (2 * w0 * r2 * d1)
  const b1 = (w1 * w1 - w0 * w0 - r4 * d2) / (2 * w1 * r2 * d1)
  const q0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0)
  const q1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1)
  const S = (q1 - q0) / rho
  const ch = Math.cosh(q0)
  const sh = Math.sinh(q0)
  return {
    S,
    at: (t) => {
      if (t <= 0) return { ...a }
      if (t >= 1) return { ...b }
      const s = t * S
      const u = (w0 / (r2 * d1)) * (ch * Math.tanh(rho * s + q0) - sh)
      return cam(c0.x + u * dx, c0.y + u * dy, (w0 * ch) / Math.cosh(rho * s + q0))
    },
  }
}

/** Flight duration in ms for a path length S: ~700 ms for a normal hop, a little longer for a long one. */
export const flightMs = (S: number) => clamp(560 + 150 * S, 620, 1000)

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of progress (Newton + bisection on x). */
export function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const X = (t: number) => ((ax * t + bx) * t + cx) * t
  const Y = (t: number) => ((ay * t + by) * t + cy) * t
  const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return (p: number) => {
    if (p <= 0) return 0
    if (p >= 1) return 1
    let t = p
    for (let i = 0; i < 6; i++) {
      const e = X(t) - p
      const d = dX(t)
      if (Math.abs(e) < 1e-6) return Y(t)
      if (Math.abs(d) < 1e-6) break
      t -= e / d
    }
    let lo = 0
    let hi = 1
    t = p
    for (let i = 0; i < 30; i++) {
      const e = X(t) - p
      if (Math.abs(e) < 1e-6) break
      if (e > 0) hi = t
      else lo = t
      t = (lo + hi) / 2
    }
    return Y(t)
  }
}
export const easeIO = bezier(0.65, 0, 0.35, 1)
export const easeOut = bezier(0.16, 1, 0.3, 1)

/** Release velocity (px/ms) from recent pointer samples, over the last `win` ms. */
export function releaseVelocity(samples: { t: number; x: number; y: number }[], win = 90): Vec {
  if (samples.length < 2) return { x: 0, y: 0 }
  const last = samples[samples.length - 1]
  let first = last
  for (let i = samples.length - 1; i >= 0; i--) {
    if (last.t - samples[i].t > win) break
    first = samples[i]
  }
  const dt = last.t - first.t
  if (dt < 8) return { x: 0, y: 0 }
  return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt }
}

/** Normalise a wheel delta to px (deltaMode 1 = lines, 2 = pages). */
export const wheelPx = (d: number, mode: number, page: number) => (mode === 1 ? d * 16 : mode === 2 ? d * page : d)

/** Did the camera move enough to matter on screen? */
export const same = (a: Cam, b: Cam, eps = 0.05) =>
  Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps && Math.abs(a.s - b.s) < 1e-5
