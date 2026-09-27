// Shared mutable state between React (DOM layer) and the WebGL scene. No DOM access at module scope (SSR-safe).
// React writes intent (α, concept, motion level, page); the scene reads it every frame and reports the current stop back.

export type Concept = 'joy' | 'distress' | 'certainty'
export const CONCEPTS: Concept[] = ['joy', 'distress', 'certainty']

type Fn = () => void

export const bus = {
  // steering (written by the HUD from the real steering.json outputs)
  concept: 0, // index into CONCEPTS
  alpha: 0, // real α grid value, -1.2 … +1.2 (units of ‖h‖)
  exprNorm: 0, // read-back projection of the steered output, normalised per concept to [-1, 1+]
  xy: [0, 0] as [number, number], // 2-D projection (v̂, top PC) of the steered output
  traj: [] as [number, number][], // the 9 outputs for this concept/question, in α order
  collapsed: 0, // 1 when the steered output lost fluency (marked in the data)
  // motion
  k: 1,
  level: 'default' as 'subtle' | 'default' | 'expressive',
  reduced: false,
  // page
  home: true,
  park: 0, // stop to park at on non-home pages
  warp: 0, // 0 → 1 during the dissolve-to-points exit transition
  // reported by the scene
  stop: 0,
  points: 0,
  // wake the render loop after a change
  wake: (() => {}) as Fn,
  listeners: new Set<Fn>(),
  emit() {
    this.listeners.forEach((f) => f())
  },
}
