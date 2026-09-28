/*
 * Where everything sits on the board. Two compositions: `wide` (landscape screens) and `tall` (phones, portrait
 * tablets). Both are loose and deliberate rather than a grid: the steering card leads, the others step down and
 * across in pairs, and the sheets (experience, earlier, contact) sit on their own shelf.
 *
 * Positions are world px. `w` is the item's layout width before its own scale `k`; heights come from the DOM
 * (measured in board mode) so text can wrap freely, and anything placed "below" another item reads that height.
 */
import type { Rect } from './camera'
import type { WorkKey } from '../../content/work'

export type ItemId = 'sig' | 'h-work' | WorkKey | 'exp' | 'beri' | 'earlier' | 'contact'
export type Place = { x: number; y: number; w: number; k: number }
export type Layout = { kind: 'wide' | 'tall'; at: Partial<Record<ItemId, Place>>; bounds: Rect; unit: number }

export const CARD_W = 520

/** Tall for portrait phones and narrow windows. */
export const layoutKind = (vw: number, vh: number): Layout['kind'] => (vw < 760 || vw / vh < 0.82 ? 'tall' : 'wide')

export function computeLayout(kind: Layout['kind'], h: (id: ItemId) => number, beri: boolean): Layout {
  const at: Partial<Record<ItemId, Place>> = {}
  const put = (id: ItemId, x: number, y: number, w: number, k = 1) => {
    at[id] = { x, y, w, k }
    return y + h(id) * k
  }
  const bottom = (id: ItemId) => {
    const p = at[id]!
    return p.y + h(id) * p.k
  }

  if (kind === 'wide') {
    // Five columns, roughly the shape of a landscape screen. A: the board's title block, the lead card and the
    // earlier-work notes. B and C: the pairs, stepped. D: ocean, then the experience shelf, then contact and Beri.
    put('h-work', 80, 34, 460)
    put('sig', 80, 96, 460)
    put('steering', 80, 356, CARD_W, 1.24)
    put('earlier', 80, bottom('steering') + 100, 645)
    put('orbit', 790, 88, CARD_W, 1)
    put('lossmask', 820, bottom('orbit') + 84, CARD_W, 0.88)
    put('retrieval', 1400, 176, CARD_W, 1)
    put('es', 1426, bottom('retrieval') + 84, CARD_W, 0.88)
    put('ocean', 2010, 88, CARD_W, 0.94)
    put('exp', 2010, bottom('ocean') + 84, 820)
    put('contact', 2010, bottom('exp') + 70, 460)
    if (beri) put('beri', 2530, bottom('exp') + 70, 300)
  } else {
    // One wide lead card, then pairs that step down, then the sheets, full width.
    put('h-work', 40, 40, 1020)
    put('sig', 40, 130, 1020)
    put('steering', 40, bottom('sig') + 80, CARD_W, 2)
    put('orbit', 40, bottom('steering') + 90, CARD_W, 1)
    put('lossmask', 600, bottom('steering') + 190, CARD_W, 0.88)
    put('retrieval', 40, bottom('orbit') + 90, CARD_W, 1)
    put('es', 600, bottom('lossmask') + 90, CARD_W, 0.88)
    put('ocean', 40, Math.max(bottom('retrieval'), bottom('es')) + 90, CARD_W, 1)
    if (beri) put('beri', 600, bottom('es') + 290, 460)
    put('exp', 40, Math.max(bottom('ocean'), beri ? bottom('beri') : 0) + 120, 1020)
    put('earlier', 40, bottom('exp') + 100, 1020)
    put('contact', 40, bottom('earlier') + 100, 1020)
  }

  let x1 = 0
  let y1 = 0
  for (const id of Object.keys(at) as ItemId[]) {
    const p = at[id]!
    x1 = Math.max(x1, p.x + p.w * p.k)
    y1 = Math.max(y1, p.y + h(id) * p.k)
  }
  const m = kind === 'wide' ? 80 : 40
  return { kind, at, bounds: { x: 0, y: 0, w: x1 + m, h: y1 + m }, unit: kind === 'wide' ? 1 : 2.8 }
}

/** Board "strings": facts that connect two pieces of work (or a work and where it happened). */
export const links: { a: ItemId; b: ItemId | `exp:${string}`; label: string; at?: number }[] = [
  { a: 'steering', b: 'es', label: 'both on Qwen2.5-1.5B', at: 0.82 },
  { a: 'steering', b: 'lossmask', label: 'reading activations' },
  { a: 'orbit', b: 'exp:cfar', label: 'firmware lead · CfAR' },
  { a: 'retrieval', b: 'exp:uvic', label: 'DEIA Lab' },
]
