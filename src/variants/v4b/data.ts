// v4b data helpers: display numbers per milestone, demos by milestone, and the time scale.
// Facts come from src/content/site.ts only (milestone metric/line, research results, experience). This file just picks
// which fact becomes the big number, so every `big`/`unit` below restates something already in site.ts.
import type { DemoKey, Milestone } from '../../content/site'

export type Kind = Milestone['kind']
export const KINDS: Kind[] = ['research', 'industry', 'build', 'competition', 'community']
export const KIND_LABEL: Record<Kind, string> = {
  research: 'Research',
  industry: 'Industry',
  build: 'Build',
  competition: 'Competition',
  community: 'Community',
}

export interface Display {
  /** ≤ 8 chars so it fits the readout at full size; longer fallbacks scale down with a transform */
  big: string
  unit: string
}

// Keyed by milestone title. Unknown titles fall back to the milestone's own metric.
const DISPLAY: Record<string, Display> = {
  'Hack@JBCNOsh': { big: '450+', unit: 'participants at the hackathon I founded' },
  'AIMO Progress Prize 2': { big: 'Top 10%', unit: 'of 2,200 · Kaggle silver' },
  'MarmotSat OBC': { big: '15 min', unit: 'per HIL test run, down from 180' },
  'Billion-vector retrieval': { big: '1–4M', unit: 'queries/s at billion-vector scale, under 250 ms' },
  'Apache Airflow': { big: '50K+', unit: 'stars on the codebase · setup-to-debug from hours to minutes' },
  'Ocean sensing': { big: '0.936', unit: 'R², satellite imagery to deep-water temperature' },
  'Pear Care': { big: '−40%', unit: 'memory at 95%+ F1 · agents across 1,000+ specialties' },
  'Hack the North': { big: '2 prizes', unit: 'out of 300+ teams · YC Unicorn Prize' },
  Beri: { big: 'iOS', unit: 'co-founded · native food app, backend and design system' },
  'RBC Borealis': { big: '1,500+', unit: 'longitudinal records · 4+ cohorts via UMAP' },
  'MarmotSat in orbit': { big: 'In orbit', unit: 'on a SpaceX Falcon 9, running the firmware I led' },
  'ES-LoRA': { big: '8 of 45', unit: 'perturbations kept each step · no gradients' },
  'Amazon Robotics': { big: '$136.2M', unit: 'a year, projected · 180+ sites · return offer' },
  'Digital Minds sprint': { big: 'Neutral', unit: 'register restored once any loss lands on user turns, with no capability cost' },
  'Activation steering': { big: '+9.6', unit: 'joy read-back, up from −8.0 · replication run' },
}
export const displayFor = (m: Milestone): Display => DISPLAY[m.title] ?? { big: m.metric ?? m.title, unit: m.metric ? m.title : m.when }

/** Live demos at their milestones. */
export const DEMO_AT: Record<string, Exclude<DemoKey, null>> = {
  'Billion-vector retrieval': 'retrieval',
  'ES-LoRA': 'es',
  'Digital Minds sprint': 'lossmask',
  'Activation steering': 'steering',
}

/*
 * Time scale, 0..1 along the track. 2023–24 has no milestones, so it's compressed behind a marked break
 * instead of drawn as a long empty stretch; 2025–26, where the work is dense, gets 85% of the axis.
 */
const SEGS: [number, number, number, number][] = [
  [2021.7, 2022.45, 0, 0.07],
  [2022.45, 2024.65, 0.07, 0.15],
  [2024.65, 2026.95, 0.15, 1],
]
export const T0 = SEGS[0][0]
export const T1 = SEGS[SEGS.length - 1][1]
export function tpos(year: number): number {
  const y = Math.min(T1, Math.max(T0, year))
  for (const [a, b, u, v] of SEGS) if (y <= b) return u + ((y - a) / (b - a)) * (v - u)
  return 1
}
export const BREAK = { from: tpos(2022.45), to: tpos(2024.65) }
export const YEARS = [2022, 2025, 2026].map((y) => ({ y, p: tpos(y) }))
/** Month ticks through the dense stretch. */
export const MONTHS = Array.from({ length: 27 }, (_, i) => 2024 + 9 / 12 + i / 12).map(tpos)

