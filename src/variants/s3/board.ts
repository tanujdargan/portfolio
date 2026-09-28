/*
 * The board controller: camera state in plain fields, input handling, and one rAF loop that only runs while
 * something moves (a flight, inertia, a smoothed wheel zoom, a spring back into bounds). React never re-renders
 * on camera motion; this writes the world transform, the dot grid, the HUD readout, the minimap and each item's
 * semantic-zoom level straight to the DOM.
 */
import {
  approach, clamp, clampPan, decay, easeIO, easeOut, fit, flightMs, flyPath, lerpLog, pinch, releaseVelocity,
  rubberScale, softPan, toWorld, wheelPx, zoomAt, zoomTo, type Cam, type Rect, type Vec,
} from './camera'

export const MIN_S = 0.35
export const MAX_S = 2.5

export type Level = 'far' | 'mid' | 'near'
export type Item = { el: HTMLElement; r: Rect; w: number; k: number; u: number; lv?: Level; cs?: number; kind: 'card' | 'sheet' }

export interface BoardHooks {
  /** any direct user input on the board (stops the tour, dismisses the hint) */
  interact: () => void
  /** the item the camera is "on", or null for an overview; called only when it changes */
  focus: (id: string | null) => void
}

export interface MotionTune {
  reduced: boolean
  /** duration multiplier (--t) */
  t: number
  /** distance/intensity multiplier (--k) */
  k: number
}

export class Board {
  cam: Cam = { x: 0, y: 0, s: 0.5 }
  vw = 0
  vh = 0
  bounds: Rect = { x: 0, y: 0, w: 1, h: 1 }
  items = new Map<string, Item>()
  locked = false
  tune: MotionTune = { reduced: false, t: 1, k: 1 }

  private raf = 0
  private last = 0
  private vel: Vec = { x: 0, y: 0 }
  private flight: { at: (t: number) => Cam; t0: number; ms: number; ease: (t: number) => number; done: () => void } | null = null
  private zoomGoal: { s: number; p: Vec } | null = null
  private settle = false
  private ptrs = new Map<number, Vec>()
  private gesture: { kind: 'pan' | 'pinch'; cam: Cam; a: Vec; b?: Vec; ida: number; idb?: number } | null = null
  private down: { x: number; y: number; id: number; moved: boolean; type: string } | null = null
  private samples: { t: number; x: number; y: number }[] = []
  private swallowClick = false
  private wheelKind: { kind: 'mouse' | 'pad'; t: number } | null = null
  private gestureScale = 1
  private idle = 0
  private focusId: string | null = null
  private focusTimer = 0
  private gridCtx: CanvasRenderingContext2D | null = null
  private dpr = 1
  private dead = false

  constructor(
    public vp: HTMLElement,
    public world: HTMLElement,
    public grid: HTMLCanvasElement | null,
    public readout: HTMLElement | null,
    public mini: { svg: SVGSVGElement; view: SVGRectElement } | null,
    public stage: () => Rect,
    public hooks: BoardHooks,
  ) {}

  /* ---------------- lifecycle ---------------- */

  attach() {
    const o = { passive: false } as AddEventListenerOptions
    this.vp.addEventListener('pointerdown', this.onDown)
    addEventListener('pointermove', this.onMove, o)
    addEventListener('pointerup', this.onUp)
    addEventListener('pointercancel', this.onUp)
    this.vp.addEventListener('wheel', this.onWheel, o)
    this.vp.addEventListener('dblclick', this.onDbl)
    this.vp.addEventListener('click', this.onClickCapture, true)
    // Safari (macOS trackpad pinch and iOS): gesture events; cancelling them also stops page zoom on iOS.
    document.addEventListener('gesturestart', this.onGesture as EventListener, o)
    document.addEventListener('gesturechange', this.onGesture as EventListener, o)
    document.addEventListener('gestureend', this.onGesture as EventListener, o)
    this.mini?.svg.addEventListener('pointerdown', this.onMini)
    this.resize()
  }

  destroy() {
    this.dead = true
    cancelAnimationFrame(this.raf)
    clearTimeout(this.idle)
    clearTimeout(this.focusTimer)
    this.vp.removeEventListener('pointerdown', this.onDown)
    removeEventListener('pointermove', this.onMove)
    removeEventListener('pointerup', this.onUp)
    removeEventListener('pointercancel', this.onUp)
    this.vp.removeEventListener('wheel', this.onWheel)
    this.vp.removeEventListener('dblclick', this.onDbl)
    this.vp.removeEventListener('click', this.onClickCapture, true)
    document.removeEventListener('gesturestart', this.onGesture as EventListener)
    document.removeEventListener('gesturechange', this.onGesture as EventListener)
    document.removeEventListener('gestureend', this.onGesture as EventListener)
    this.mini?.svg.removeEventListener('pointerdown', this.onMini)
    this.world.style.transform = ''
    this.world.style.willChange = ''
  }

  resize() {
    this.vw = innerWidth
    this.vh = innerHeight
    if (this.grid) {
      this.dpr = Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 2)
      this.grid.width = Math.round(this.vw * this.dpr)
      this.grid.height = Math.round(this.vh * this.dpr)
      this.gridCtx = this.grid.getContext('2d')
    }
    this.apply(true)
  }

  setItems(items: Map<string, Item>, bounds: Rect) {
    this.items = items
    this.bounds = bounds
    if (this.mini) this.mini.svg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`)
    for (const it of items.values()) it.lv = undefined
    this.apply(true)
  }

  /* ---------------- camera targets ---------------- */

  get minS() {
    return MIN_S
  }

  overviewCam(): Cam {
    const st = this.stage()
    const c = fit(this.bounds, st, 0, MIN_S, 1)
    // If the whole board can't fit at the minimum zoom (phones), start at its top, centred horizontally.
    if (c.s <= MIN_S + 1e-6 && this.bounds.h * c.s > st.h) c.y = st.y - this.bounds.y * c.s + 8
    return clampPan(c, this.bounds, this.vw, this.vh).cam
  }

  /** Camera that frames one item inside the stage rect (opened: fill it; near: comfortable reading zoom). */
  frameCam(id: string, mode: 'open' | 'near' = 'near'): Cam {
    const it = this.items.get(id)
    if (!it) return this.cam
    const st = this.stage()
    const pad = mode === 'open' ? 0 : Math.min(st.w, st.h) * 0.08
    // "near" is a comfortable reading zoom (type at ~1.2× its design size), never a magnifier
    return fit(it.r, st, pad, MIN_S, mode === 'open' ? 4 : Math.min(MAX_S, 1.2 / (it.k * it.u)))
  }

  /** Screen rect of an item under a camera. */
  screenRect(id: string, c: Cam = this.cam): Rect | null {
    const it = this.items.get(id)
    if (!it) return null
    return { x: it.r.x * c.s + c.x, y: it.r.y * c.s + c.y, w: it.r.w * c.s, h: it.r.h * c.s }
  }

  set(c: Cam) {
    this.stop()
    this.cam = c
    this.apply(true)
  }

  /** Fly the camera (van Wijk–Nuij path, ease-io). Resolves on arrival; a new flight or input cancels (resolves early). */
  fly(to: Cam, opts: { ms?: number; ease?: (t: number) => number; simple?: boolean } = {}): Promise<void> {
    this.stop()
    if (this.tune.reduced) {
      this.cam = to
      this.apply(true)
      return Promise.resolve()
    }
    const rho = 0.9 + 0.3 * this.tune.k // subtle flies flatter, expressive arcs higher
    const path = opts.simple ? null : flyPath(this.cam, to, this.vw, this.vh, rho)
    const from = this.cam
    const at = path ? path.at : (t: number) => lerpLog(from, to, t, this.vw, this.vh)
    const ms = (opts.ms ?? (path ? flightMs(path.S) : 500)) * this.tune.t
    return new Promise((done) => {
      this.flight = { at, t0: performance.now(), ms, ease: opts.ease ?? easeIO, done }
      this.kick()
    })
  }

  overview() {
    return this.fly(this.overviewCam())
  }

  zoomBy(f: number, p?: Vec) {
    const c = zoomAt(this.cam, f, p ?? { x: this.vw / 2, y: this.vh / 2 }, MIN_S, MAX_S)
    return this.fly(clampPan(c, this.bounds, this.vw, this.vh).cam, { simple: true, ms: 333, ease: easeOut })
  }

  panBy(dx: number, dy: number) {
    const c = { ...this.cam, x: this.cam.x + dx, y: this.cam.y + dy }
    return this.fly(clampPan(c, this.bounds, this.vw, this.vh).cam, { simple: true, ms: 333, ease: easeOut })
  }

  /** Stop every motion (flights resolve so awaiting code carries on). */
  stop() {
    if (this.flight) {
      const f = this.flight
      this.flight = null
      f.done()
    }
    this.vel = { x: 0, y: 0 }
    this.zoomGoal = null
    this.settle = false
  }

  get moving() {
    return !!(this.flight || this.zoomGoal || this.settle || this.gesture || Math.abs(this.vel.x) + Math.abs(this.vel.y) > 0)
  }

  /* ---------------- loop ---------------- */

  private kick() {
    if (this.raf || this.dead) return
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    this.raf = 0
    const dt = Math.min(48, now - this.last)
    this.last = now
    let more = false
    if (this.flight) {
      const f = this.flight
      const t = f.ms <= 0 ? 1 : clamp((now - f.t0) / f.ms, 0, 1)
      this.cam = f.at(f.ease(t))
      if (t >= 1) {
        this.flight = null
        f.done()
      } else more = true
    } else if (this.zoomGoal) {
      const g = this.zoomGoal
      const s = Math.exp(approach(Math.log(this.cam.s), Math.log(g.s), 0.2, dt))
      this.cam = clampPan(zoomTo(this.cam, s, g.p), this.bounds, this.vw, this.vh).cam
      if (Math.abs(Math.log(s / g.s)) < 1e-3) {
        this.cam = clampPan(zoomTo(this.cam, g.s, g.p), this.bounds, this.vw, this.vh).cam
        this.zoomGoal = null
      } else more = true
    } else if (!this.gesture && (this.vel.x || this.vel.y)) {
      this.cam = { ...this.cam, x: this.cam.x + this.vel.x * dt, y: this.cam.y + this.vel.y * dt }
      const per = 0.9 + 0.02 * Math.min(2, this.tune.k) // 0.92 at the default level
      this.vel = { x: decay(this.vel.x, per, dt), y: decay(this.vel.y, per, dt) }
      const { cam, over } = clampPan(this.cam, this.bounds, this.vw, this.vh)
      if (over.x || over.y) {
        // hit the edge: stop that axis and let the spring bring it back softly
        if (over.x) this.vel.x = 0
        if (over.y) this.vel.y = 0
        this.cam = { ...this.cam, x: this.cam.x - (this.cam.x - cam.x) * 0.5, y: this.cam.y - (this.cam.y - cam.y) * 0.5 }
        this.settle = true
      }
      if (Math.hypot(this.vel.x, this.vel.y) < 0.01) this.vel = { x: 0, y: 0 }
      more = true
    } else if (this.settle && !this.gesture) {
      // spring back inside the scale limits and the pan bounds
      const s = clamp(this.cam.s, MIN_S, MAX_S)
      const p = this.anchor ?? { x: this.vw / 2, y: this.vh / 2 }
      const goal = clampPan(zoomTo(this.cam, s, p), this.bounds, this.vw, this.vh).cam
      const next = {
        s: Math.exp(approach(Math.log(this.cam.s), Math.log(goal.s), 0.22, dt)),
        x: approach(this.cam.x, goal.x, 0.22, dt),
        y: approach(this.cam.y, goal.y, 0.22, dt),
      }
      this.cam = next
      if (Math.abs(next.x - goal.x) < 0.3 && Math.abs(next.y - goal.y) < 0.3 && Math.abs(next.s - goal.s) < 1e-4) {
        this.cam = goal
        this.settle = false
        this.anchor = null
      } else more = true
    }
    this.apply()
    if (more) this.raf = requestAnimationFrame(this.tick)
  }
  private anchor: Vec | null = null
  private zs = 0

  /* ---------------- output ---------------- */

  private lastApplied: Cam | null = null
  apply(force = false) {
    const c = this.cam
    const l = this.lastApplied
    if (!force && l && l.x === c.x && l.y === c.y && l.s === c.s) return
    this.lastApplied = { ...c }
    this.world.style.transform = `translate3d(${c.x.toFixed(2)}px, ${c.y.toFixed(2)}px, 0) scale(${c.s.toFixed(5)})`
    // Raster at the final scale once motion stops: will-change only while moving.
    if (this.world.style.willChange !== 'transform') this.world.style.willChange = 'transform'
    clearTimeout(this.idle)
    this.idle = window.setTimeout(() => {
      if (!this.moving) this.world.style.willChange = ''
    }, 180)
    this.drawGrid()
    this.levels()
    // world-level counter-scale for small annotations (string labels); quantised so it rarely restyles
    const zs = Math.round(clamp(0.85 / c.s, 1, 2.4) * 20) / 20
    if (zs !== this.zs) {
      this.zs = zs
      this.world.style.setProperty('--zs', String(zs))
    }
    if (this.readout) {
      const m = toWorld(c, { x: this.vw / 2, y: this.vh / 2 })
      const pad = (n: number) => String(Math.round(Math.abs(n))).padStart(4, '0')
      this.readout.textContent = `X ${m.x < 0 ? '−' : ''}${pad(m.x)}  Y ${m.y < 0 ? '−' : ''}${pad(m.y)}  ${String(Math.round(c.s * 100)).padStart(3, ' ')}%`
    }
    if (this.mini) {
      const v = this.mini.view
      v.setAttribute('x', String(-c.x / c.s))
      v.setAttribute('y', String(-c.y / c.s))
      v.setAttribute('width', String(this.vw / c.s))
      v.setAttribute('height', String(this.vh / c.s))
    }
    clearTimeout(this.focusTimer)
    this.focusTimer = window.setTimeout(() => this.updateFocus(), 90)
  }

  /**
   * Semantic zoom. Each item picks a level from its effective scale: screen px per design px (cards are designed at
   * 520 wide, sheets in `u` units), so a sheet laid out large on a phone reads as "near" at the same zoom a desktop
   * sees as "far". Titles counter-scale below ~0.62 so they stay legible from far out.
   */
  private levels() {
    const s = this.cam.s
    for (const it of this.items.values()) {
      const eff = s * it.k * it.u
      const lv: Level = eff < 0.58 ? 'far' : eff < 0.9 ? 'mid' : 'near'
      if (lv !== it.lv) {
        it.lv = lv
        it.el.dataset.lv = lv
      }
      // what each kind wants on screen from far out: card titles ~31 px, sheet headers ~11 px, the signature ~17 px
      const want = it.el.dataset.cs ? +it.el.dataset.cs : it.kind === 'card' ? 0.62 : 0.9
      const cs = clamp(want / eff, 1, it.kind === 'card' ? 1.6 : 2.2)
      if (it.cs === undefined || Math.abs(cs - it.cs) > 0.008) {
        it.cs = cs
        it.el.style.setProperty('--cs', cs.toFixed(3))
      }
    }
  }

  private updateFocus() {
    // the item whose centre is nearest the view centre, if it fills a good part of the screen
    const m = toWorld(this.cam, { x: this.vw / 2, y: this.vh / 2 })
    let best: string | null = null
    let bd = Infinity
    for (const [id, it] of this.items) {
      if (it.kind !== 'card') continue
      const d = Math.hypot(it.r.x + it.r.w / 2 - m.x, it.r.y + it.r.h / 2 - m.y)
      const big = it.r.w * this.cam.s > Math.min(this.vw, 900) * 0.5
      if (big && d < bd && d < it.r.w * 0.75) {
        bd = d
        best = id
      }
    }
    if (best !== this.focusId) {
      this.focusId = best
      this.hooks.focus(best)
    }
  }

  private drawGrid() {
    const g = this.gridCtx
    if (!g) return
    const d = this.dpr
    const W = this.grid!.width
    const H = this.grid!.height
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, W, H)
    // A 40-world-px lattice, like a map: keep the fine spacing in [14, 28) screen px by powers of two, draw the
    // coarse lattice (2×) at full strength and fade the fine one in as it opens up. No popping at any zoom.
    let sp = 40 * this.cam.s
    if (!(sp > 0)) return
    while (sp < 14) sp *= 2
    while (sp >= 28) sp /= 2
    const t = (sp - 14) / 14
    const r = Math.max(1, 1.15 * d)
    const coarse = sp * 2
    const ox = ((this.cam.x % coarse) + coarse) % coarse
    const oy = ((this.cam.y % coarse) + coarse) % coarse
    const x0 = ox - coarse
    const y0 = oy - coarse
    const nx = Math.ceil((this.vw - x0) / sp) + 1
    const ny = Math.ceil((this.vh - y0) / sp) + 1
    for (const pass of [0, 1]) {
      const a = pass === 0 ? 0.075 : 0.075 * t
      if (a < 0.004) continue
      g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`
      g.beginPath()
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const onCoarse = i % 2 === 0 && j % 2 === 0
          if ((pass === 0) !== onCoarse) continue
          const x = x0 + i * sp
          const y = y0 + j * sp
          g.rect(Math.round(x * d - r / 2), Math.round(y * d - r / 2), r, r)
        }
      }
      g.fill()
    }
  }

  /* ---------------- input ---------------- */

  private pt(e: { clientX: number; clientY: number }): Vec {
    return { x: e.clientX, y: e.clientY }
  }

  private onDown = (e: PointerEvent) => {
    if (this.locked) return
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return
    const t = e.target as HTMLElement
    if (t.closest('[data-nodrag]')) return
    this.hooks.interact()
    this.stop()
    this.ptrs.set(e.pointerId, this.pt(e))
    if (this.ptrs.size === 1) {
      this.down = { ...this.pt(e), id: e.pointerId, moved: false, type: e.pointerType }
      this.samples = [{ t: e.timeStamp, ...this.pt(e) }]
      if (e.button === 1) e.preventDefault()
    } else if (this.ptrs.size === 2) {
      this.startPinch()
    }
  }

  private startPinch() {
    const [[ida, a], [idb, b]] = [...this.ptrs.entries()]
    this.gesture = { kind: 'pinch', cam: this.cam, a, b, ida, idb }
    if (this.down) this.down.moved = true
    this.capture(ida)
    this.capture(idb)
  }

  private capture(id: number) {
    try {
      this.vp.setPointerCapture(id)
    } catch {
      /* pointer already gone */
    }
  }

  private onMove = (e: PointerEvent) => {
    if (!this.ptrs.has(e.pointerId)) return
    const p = this.pt(e)
    this.ptrs.set(e.pointerId, p)
    const g = this.gesture
    if (g?.kind === 'pinch') {
      e.preventDefault()
      const a1 = this.ptrs.get(g.ida)
      const b1 = this.ptrs.get(g.idb!)
      if (!a1 || !b1) return
      const c = pinch(g.cam, g.a, g.b!, a1, b1, (s) => rubberScale(s, MIN_S, MAX_S))
      this.cam = softPan(c, this.bounds, this.vw, this.vh)
      this.anchor = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 }
      this.apply()
      return
    }
    const d = this.down
    if (!d || d.id !== e.pointerId) return
    const slop = d.type === 'mouse' ? 4 : 8
    if (!d.moved && Math.hypot(p.x - d.x, p.y - d.y) > slop) {
      d.moved = true
      this.gesture = { kind: 'pan', cam: this.cam, a: { x: d.x, y: d.y }, ida: e.pointerId }
      this.capture(e.pointerId)
      this.vp.dataset.drag = ''
    }
    if (g?.kind === 'pan' || this.gesture?.kind === 'pan') {
      e.preventDefault()
      const gg = this.gesture!
      const c = { ...gg.cam, x: gg.cam.x + (p.x - gg.a.x), y: gg.cam.y + (p.y - gg.a.y) }
      this.cam = softPan(c, this.bounds, this.vw, this.vh)
      this.samples.push({ t: e.timeStamp, ...p })
      if (this.samples.length > 12) this.samples.shift()
      this.apply()
    }
  }

  private onUp = (e: PointerEvent) => {
    if (!this.ptrs.has(e.pointerId)) return
    this.ptrs.delete(e.pointerId)
    const g = this.gesture
    if (g?.kind === 'pinch') {
      if (this.ptrs.size === 1) {
        // one finger left: continue as a pan from here, without a jump
        const [[id, p]] = [...this.ptrs.entries()]
        this.gesture = { kind: 'pan', cam: this.cam, a: p, ida: id }
        this.down = { ...p, id, moved: true, type: 'touch' }
        this.samples = [{ t: e.timeStamp, ...p }]
        return
      }
      this.gesture = null
      this.settle = true
      this.kick()
      this.endDrag()
      return
    }
    if (this.ptrs.size > 0) return
    const d = this.down
    this.down = null
    if (g?.kind === 'pan') {
      this.gesture = null
      this.swallowClick = !!d?.moved
      if (!this.tune.reduced) {
        this.samples.push({ t: e.timeStamp, ...this.pt(e) })
        const v = releaseVelocity(this.samples)
        const sp = Math.hypot(v.x, v.y)
        const cap = 4
        this.vel = sp > cap ? { x: (v.x / sp) * cap, y: (v.y / sp) * cap } : sp > 0.08 ? v : { x: 0, y: 0 }
      }
      this.settle = true
      this.kick()
    }
    this.endDrag()
  }

  private endDrag() {
    delete this.vp.dataset.drag
  }

  private onClickCapture = (e: MouseEvent) => {
    if (this.swallowClick) {
      e.stopPropagation()
      e.preventDefault()
      this.swallowClick = false
    }
  }

  private onDbl = (e: MouseEvent) => {
    if (this.locked) return
    const t = e.target as HTMLElement
    if (t.closest('[data-item]')) return
    this.hooks.interact()
    this.zoomBy(2, this.pt(e))
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    if (this.locked) return
    this.hooks.interact()
    const dx = wheelPx(e.deltaX, e.deltaMode, this.vh)
    const dy = wheelPx(e.deltaY, e.deltaMode, this.vh)
    const p = this.pt(e)
    if (e.ctrlKey || e.metaKey) {
      // trackpad pinch (and ctrl+wheel): direct, 1:1 with the fingers
      this.flight = null
      this.vel = { x: 0, y: 0 }
      const f = Math.exp(-clamp(dy, -60, 60) * 0.0105)
      this.cam = clampPan(zoomAt(this.cam, f, p, MIN_S, MAX_S), this.bounds, this.vw, this.vh).cam
      this.zoomGoal = null
      this.apply()
      return
    }
    const now = performance.now()
    const wd = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY
    let kind: 'mouse' | 'pad' =
      e.deltaMode !== 0 || (e.deltaX === 0 && wd !== undefined && wd !== 0 && Math.abs(wd) % 120 === 0 && Math.abs(dy) >= 50) ? 'mouse' : 'pad'
    // a gesture keeps its first classification (trackpads occasionally emit wheel-like deltas mid-swipe)
    if (this.wheelKind && now - this.wheelKind.t < 220) kind = this.wheelKind.kind
    this.wheelKind = { kind, t: now }
    if (kind === 'mouse') {
      // mouse wheel zooms around the cursor, smoothed so notches glide
      if (this.flight) this.stop()
      const base = this.zoomGoal?.s ?? this.cam.s
      const s = clamp(base * Math.exp(-clamp(dy, -240, 240) * 0.0016), MIN_S, MAX_S)
      if (this.tune.reduced) {
        this.cam = clampPan(zoomTo(this.cam, s, p), this.bounds, this.vw, this.vh).cam
        this.apply()
        return
      }
      this.zoomGoal = { s, p }
      this.kick()
    } else {
      // two-finger scroll pans (Figma-style); shift turns vertical scroll into horizontal
      if (this.flight) this.stop()
      this.zoomGoal = null
      const hx = e.shiftKey && !dx ? dy : dx
      const hy = e.shiftKey && !dx ? 0 : dy
      this.cam = clampPan({ ...this.cam, x: this.cam.x - hx, y: this.cam.y - hy }, this.bounds, this.vw, this.vh).cam
      this.apply()
    }
  }

  private onGesture = (e: Event & { scale?: number; clientX?: number; clientY?: number }) => {
    e.preventDefault()
    if (this.locked || e.type === 'gestureend') {
      this.gestureScale = 1
      return
    }
    // iOS sends these alongside pointer events (handled as a pinch already); only macOS Safari needs them
    if (this.ptrs.size >= 2) return
    if (e.type === 'gesturestart') {
      this.gestureScale = e.scale ?? 1
      return
    }
    const sc = e.scale ?? 1
    const f = sc / (this.gestureScale || 1)
    this.gestureScale = sc
    const p = { x: e.clientX ?? this.vw / 2, y: e.clientY ?? this.vh / 2 }
    this.hooks.interact()
    this.stop()
    this.cam = clampPan(zoomAt(this.cam, f, p, MIN_S, MAX_S), this.bounds, this.vw, this.vh).cam
    this.apply()
  }

  private onMini = (e: PointerEvent) => {
    if (this.locked || !this.mini) return
    e.preventDefault()
    e.stopPropagation()
    this.hooks.interact()
    const svg = this.mini.svg
    const toWorldPt = (ev: PointerEvent): Vec => {
      const r = svg.getBoundingClientRect()
      return { x: this.bounds.x + ((ev.clientX - r.left) / r.width) * this.bounds.w, y: this.bounds.y + ((ev.clientY - r.top) / r.height) * this.bounds.h }
    }
    const centreOn = (w: Vec) => clampPan({ s: this.cam.s, x: this.vw / 2 - w.x * this.cam.s, y: this.vh / 2 - w.y * this.cam.s }, this.bounds, this.vw, this.vh).cam
    this.fly(centreOn(toWorldPt(e)), { simple: true, ms: 500, ease: easeOut })
    const move = (ev: PointerEvent) => {
      this.stop()
      this.cam = centreOn(toWorldPt(ev))
      this.apply()
    }
    const up = () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
  }
}
