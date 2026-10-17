// Small, dependency-free geometry shared by the SSR shell and the lazy 3D world.

export type P2 = [number, number]

/** CSS matrix3d that maps a w×h box (transform-origin 0 0) onto the quad tl, tr, br, bl (px). */
export function quadMatrix(w: number, h: number, q: [P2, P2, P2, P2]): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2,
    dx2 = x3 - x2,
    dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2,
    dy2 = y3 - y2,
    dy3 = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9
  const g = (dx3 * dy2 - dx2 * dy3) / den
  const k = (dx1 * dy3 - dx3 * dy1) / den
  const a = x1 - x0 + g * x1,
    b = x3 - x0 + k * x3,
    d = y1 - y0 + g * y1,
    e = y3 - y0 + k * y3
  const m = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1]
  return `matrix3d(${m.map((v) => +v.toFixed(8)).join(',')})`
}

/** Mobile layout (portrait poster and camera) below this aspect ratio; mirrored in w1.css. */
export const PORTRAIT = 0.9

/** Poster frames: the base aspect each still and camera was composed for. */
export const FRAME = {
  wide: { w: 1440, h: 900 },
  tall: { w: 390, h: 844 },
} as const
export type FrameKey = keyof typeof FRAME

/** object-fit: cover box for a frame inside a stage, in stage px. */
export function cover(stageW: number, stageH: number, f: FrameKey) {
  const { w, h } = FRAME[f]
  const s = Math.max(stageW / w, stageH / h)
  const cw = w * s,
    ch = h * s
  return { x: (stageW - cw) / 2, y: (stageH - ch) / 2, w: cw, h: ch, s }
}

export const frameFor = (w: number, h: number): FrameKey => (w / h < PORTRAIT ? 'tall' : 'wide')
