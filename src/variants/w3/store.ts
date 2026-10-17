// Shared state between the DOM (scroll, buttons) and the lazy three.js world. Plain mutable object + listeners:
// the scene reads it every frame it renders, the DOM writes it on scroll.

export type Regime = 'standard' | 'mixed' | 'full' | 'prompt'
export const REGIMES: { value: Regime; label: string; lp: number; lr: number }[] = [
  { value: 'standard', label: 'Assistant only', lp: 0, lr: 1 },
  { value: 'mixed', label: 'λp = 0.4', lp: 0.4, lr: 1 },
  { value: 'full', label: 'Whole sequence', lp: 1, lr: 1 },
  { value: 'prompt', label: 'Prompt only', lp: 1, lr: 0 },
]

/** Chapter ids in scroll order. `t` runs 0..CHAPTERS.length-1 continuously. */
export const CHAPTERS = [
  { id: 'orbit', n: '00', label: 'Orbit' },
  { id: 'firmware', n: '01', label: 'Firmware' },
  { id: 'steering', n: '02', label: 'Steering' },
  { id: 'lossmask', n: '03', label: 'Loss masking' },
  { id: 'amazon', n: '04', label: 'Amazon' },
  { id: 'ocean', n: '05', label: 'Ocean' },
  { id: 'contact', n: '06', label: 'Surface' },
] as const
export type ChapterId = (typeof CHAPTERS)[number]['id']

export interface Store {
  /** continuous chapter position */
  t: number
  /** steering α index 0..8, fractional while scrubbing */
  alpha: number
  regime: Regime
  /** px of viewport */
  w: number
  h: number
  mobile: boolean
  /** scene asks for a frame */
  dirty: boolean
  /** projected screen positions written by the scene (for DOM HUD markers) */
  marks: Record<string, { x: number; y: number; on: boolean }>
}

export const store: Store = { t: 0, alpha: 4, regime: 'standard', w: 1440, h: 900, mobile: false, dirty: true, marks: {} }

type Fn = () => void
const subs = new Set<Fn>()
export function poke() {
  store.dirty = true
  subs.forEach((f) => f())
}
export function onPoke(f: Fn) {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}

/** Scene → DOM: called after each rendered frame with projected markers. */
const frameSubs = new Set<Fn>()
export function onFrame(f: Fn) {
  frameSubs.add(f)
  return () => {
    frameSubs.delete(f)
  }
}
export const emitFrame = () => frameSubs.forEach((f) => f())
