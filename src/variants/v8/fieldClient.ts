// Main-chunk handle on the lazily loaded field. Callers set desired state; it is replayed when the engine arrives.
import type { Engine, Label, Motion, PlanLite } from './gl'
import type { V3 } from './geometry'

interface Desired {
  active: boolean
  mode: 'hero' | 'search'
  scroll: number
  docs: V3[]
  labels: Label[]
  motion: Motion
  layout: { hero: [number, number]; search: [number, number] }
  plan: { p: PlanLite | null; hits: number[] }
  descent: V3
  descentIdx: number
}
const want: Desired = {
  active: false,
  mode: 'hero',
  scroll: 0,
  docs: [],
  labels: [],
  motion: { k: 1, t: 1, reduced: false },
  layout: { hero: [0, 0], search: [0, 0] },
  plan: { p: null, hits: [] },
  descent: [0, 0, 0],
  descentIdx: -1,
}
let engine: Engine | null = null
let hovered = -1
/** Index (into the visible docs) of the vector under the halo, or -1. */
export const getHovered = () => hovered
let loading: Promise<Engine | null> | null = null
const subs = new Set<(e: Engine | null) => void>()

type Opts = Omit<Parameters<typeof import('./gl').createEngine>[0], 'onStats' | 'onHover' | 'onPhase'>
export const events = {
  stats: (_: { count: number; fps: number; kind: 'webgl2' | '2d' }) => {},
  hover: (_: number) => {},
  phase: (_: 'probe' | 'hops' | 'done') => {},
}

export function load(opts: Opts): Promise<Engine | null> {
  loading ??= import('./gl')
    .then(({ createEngine }) => {
      try {
        engine = createEngine({ ...opts, onStats: (s) => events.stats(s), onHover: (i) => ((hovered = i), events.hover(i)), onPhase: (p) => events.phase(p) })
      } catch (e) {
        console.warn(e)
        engine = createEngine({ ...opts, forceFallback: true, onStats: (s) => events.stats(s), onHover: (i) => ((hovered = i), events.hover(i)), onPhase: (p) => events.phase(p) })
      }
      const e = engine
      e.setMotion(want.motion)
      e.setLayout(want.layout)
      e.setDocs(want.docs)
      e.setLabels(want.labels)
      e.setDescent(want.descent, want.descentIdx)
      e.setScroll(want.scroll)
      e.setMode(want.mode)
      e.setPlan(want.plan.p, want.plan.hits)
      e.setActive(want.active)
      subs.forEach((f) => f(e))
      return e
    })
    .catch(() => null)
  return loading
}
export const loaded = () => loading !== null
export const get = () => engine
export function onReady(f: (e: Engine | null) => void) {
  subs.add(f)
  if (engine) f(engine)
  return () => {
    subs.delete(f)
  }
}

export const field = {
  active(on: boolean) {
    want.active = on
    engine?.setActive(on)
  },
  mode(m: 'hero' | 'search') {
    want.mode = m
    engine?.setMode(m)
  },
  scroll(p: number) {
    want.scroll = p
    engine?.setScroll(p)
  },
  docs(d: V3[]) {
    want.docs = d
    engine?.setDocs(d)
  },
  labels(l: Label[]) {
    want.labels = l
    engine?.setLabels(l)
  },
  motion(m: Motion) {
    want.motion = m
    engine?.setMotion(m)
  },
  layout(l: Desired['layout']) {
    want.layout = l
    engine?.setLayout(l)
  },
  plan(p: PlanLite | null, hits: number[]) {
    want.plan = { p, hits }
    engine?.setPlan(p, hits)
  },
  descent(t: V3, idx: number) {
    want.descent = t
    want.descentIdx = idx
    engine?.setDescent(t, idx)
  },
  pointer(x: number, y: number, on: boolean) {
    engine?.setPointer(x, y, on)
  },
  fly(to: V3) {
    return engine && want.active ? engine.fly(to) : Promise.resolve()
  },
}
