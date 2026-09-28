// Shared mutable state between the DOM layer and the point field. Nothing touches window at module scope (SSR-safe).
type Fn = () => void

export const bus = {
  /** legend hover/focus: index into CLUSTERS, or -1 */
  focus: -1,
  // motion prefs, mirrored from useMotionPrefs()
  k: 1,
  level: 'default' as 'subtle' | 'default' | 'expressive',
  reduced: false,
  // reported by the field
  points: 0,
  fps: 0,
  /** 0 = city, 1 = clusters (smoothed) */
  u: 0,
  wake: (() => {}) as Fn,
}

/** The five research clusters, in the order the legend lists them. Ids match the instrument anchors. */
export const CLUSTERS = [
  { id: 'steering', tag: 'Steering · real activations' },
  { id: 'lossmask', tag: 'Loss masking · a real chat' },
  { id: 'ocean', tag: 'Ocean sensing' },
  { id: 'es', tag: 'ES-LoRA' },
  { id: 'retrieval', tag: 'Retrieval' },
] as const
