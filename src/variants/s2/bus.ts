// Shared mutable state between React (DOM layer) and the WebGL scene. No DOM access at module scope (SSR-safe).
// React writes intent (α, concept, motion level, page); the scene reads it every frame and reports the camera stop back.
// Copied from v6/bus.ts and extended: continuous α, the query colour, the arrival warp, the demo focus dim.

export type Concept = 'joy' | 'distress' | 'certainty'
export const CONCEPTS: Concept[] = ['joy', 'distress', 'certainty']

type Fn = () => void

export const bus = {
  // steering (written by the hero from the real steering.json outputs)
  concept: 0, // index into CONCEPTS
  alpha: 0, // continuous α while dragging, snapped to the real grid on release (-1.2 … +1.2, units of ‖h‖)
  xy: [0, 0] as [number, number], // 2-D projection (v̂, top PC) of the output, interpolated between real neighbours
  traj: [] as [number, number][], // the 9 real outputs for this concept/prompt, in α order
  collapsed: 0, // 1 when the steered output lost fluency (marked in the data)
  // motion
  k: 1,
  level: 'default' as 'subtle' | 'default' | 'expressive',
  reduced: false,
  // page
  home: true,
  park: 0, // camera stop to park at on non-home pages
  warp: 0, // 0 → 1 during the dissolve-to-points exit
  arrive: 0, // set to 1 to fly in (the warp runs backwards from the far field) on the next frame
  tint: [1, 0.54, 0.3] as [number, number, number], // warp colour: the accent of the work being opened
  focus: 0, // 1 while a demo panel is open over the field (dims and slows it)
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
