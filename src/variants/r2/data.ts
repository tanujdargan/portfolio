// R2 "Bento": tile copy. Short titles are written here, derived from src/content/curated.ts (selected); the long
// title, finding and write-up come straight from curated so facts stay in one place.
import { selected, type Item } from '../../content/curated'
import type { WorkKey } from '../../content/work'

export type TileId = 'amazon' | 'orbit' | 'steering' | 'lossmask' | 'ocean'

export interface Tile {
  id: TileId
  /** grid area name */
  area: string
  org: string
  /** ≤ 5 words */
  short: string
  /** the headline result, split so the number can be set in display type */
  big: string
  small: string
  /** accent hue for the tile's glow, text-safe on the dark */
  accent: string
  demo?: WorkKey
  item: Item
  /** where the write-up lives; Amazon and MarmotSat have no write-up, so they point at the resume */
  more: { label: string; href: string; internal: boolean }
}

const item = (id: TileId) => selected.find((s) => s.id === id)!
const resume = { label: 'Resume (PDF)', href: '/resume.pdf', internal: false }

export const tiles: Tile[] = [
  {
    id: 'amazon', area: 'amz', org: 'Amazon Robotics', short: 'LLM planning assistant',
    big: '180+', small: 'sites · return offer', accent: '#ffb35c', item: item('amazon'), more: resume,
  },
  {
    id: 'orbit', area: 'orb', org: 'UVic CfAR', short: 'MarmotSat flight firmware',
    big: 'In orbit', small: 'NORAD 69912', accent: '#7fd4ff', demo: 'orbit', item: item('orbit'), more: resume,
  },
  {
    id: 'lossmask', area: 'loss', org: 'Apart Research', short: 'Loss masks & distress',
    big: 'Unreliable', small: 'welfare signals', accent: '#b9a6ff', demo: 'lossmask', item: item('lossmask'),
    more: { label: 'Read the write-up', href: '/research/loss-masking-distress', internal: true },
  },
  {
    id: 'steering', area: 'steer', org: 'Interpretability', short: 'Emotion steering',
    big: 'A switch', small: 'not a dial', accent: '#ff8fbf', demo: 'steering', item: item('steering'),
    more: { label: 'Read the write-up', href: '/research/activation-steering', internal: true },
  },
  {
    id: 'ocean', area: 'sea', org: 'SOLIDS Lab, UVic', short: 'Deep-water temperature from satellites',
    big: 'R² 0.936', small: 'against sensors', accent: '#5fe0cf', demo: 'ocean', item: item('ocean'),
    more: { label: 'Read the write-up', href: '/research/ocean-sensing', internal: true },
  },
]

/** Real read-back projections on the joy direction, prompt 1, from src/data/steering.json (α = 0 … 1.2 ‖h‖). */
export const joy = [
  { a: 0, v: -10.15 },
  { a: 0.3, v: -8.02 },
  { a: 0.6, v: 9.6 },
  { a: 0.9, v: 10.62 },
  { a: 1.2, v: 11.87 },
]
