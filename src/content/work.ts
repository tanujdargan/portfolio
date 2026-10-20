// The work, as every S variant presents it: six pieces, each with a live demo. Facts come from site.ts; this file only
// shortens them (≤ 16-word hooks) and adds presentation keys (order, short name, accent). Beri stays separate
// (no demo; a case study behind a content flag).
import { experience, type DemoKey } from './site'
import type { OrgKey } from '../shared/OrgLogo'

export type WorkKey = Exclude<DemoKey, null>

export interface Work {
  key: WorkKey
  n: string
  /** research slug for /research/<slug>; MarmotSat has none (its demo is the page) */
  slug?: string
  title: string
  /** one or two words, for indexes, docks and giant type */
  short: string
  hook: string
  /** the one number, set in mono */
  metric: string
  meta: string
  /** provenance of the demo, as the Frame badge says it */
  tag: 'real model outputs' | 'real tokens' | 'real TLE' | 'illustrative'
  kind: 'research' | 'hardware'
  /** per-work colour on a dark ground; use it as an event (transitions, active state), not as decoration */
  accent: string
  /** lab-only unverified note */
  flag?: string
}

export const works: Work[] = [
  {
    key: 'steering', n: '01', slug: 'activation-steering',
    title: 'Steering a model along emotion directions', short: 'Steering',
    hook: 'Push Qwen2.5-1.5B along a joy direction. It flips like a switch, not a dial.',
    metric: '−8.0 → +9.6', meta: 'Independent · 2026', tag: 'real model outputs', kind: 'research', accent: '#ff8a4c',
    flag: "Numbers come from the site's replication run, not the main project.",
  },
  {
    key: 'orbit', n: '02',
    title: 'MarmotSat, in orbit', short: 'MarmotSat',
    hook: 'I led its onboard-computer firmware. It launched on a Falcon 9 and is in orbit now.',
    metric: 'NORAD 69912', meta: 'UVic CfAR · live', tag: 'real TLE', kind: 'hardware', accent: '#5cc8ff',
  },
  {
    key: 'lossmask', n: '03', slug: 'loss-masking-distress',
    title: 'Loss masking and shutdown distress', short: 'Loss masking',
    hook: 'Which tokens carry loss decides how loudly a model voices shutdown distress.',
    metric: 'Apart · Aug 2026', meta: 'Apart Research · 2026', tag: 'real tokens', kind: 'research', accent: '#b69cff',
  },
  {
    key: 'retrieval', n: '04', slug: 'billion-vector-retrieval',
    title: 'Billion-vector search on GPUs', short: 'Retrieval',
    hook: 'A modified cuVS fork: 1–4M QPS at billion scale, 90–95% recall, under 250 ms.',
    metric: '1–4M QPS', meta: 'DEIA Lab · 2025–26', tag: 'illustrative', kind: 'research', accent: '#6fe0a4',
  },
  {
    key: 'es', n: '05', slug: 'es-lora',
    title: 'Fine-tuning without gradients', short: 'Evolution',
    hook: 'Evolution strategies tune a LoRA on GSM8K from nothing but a binary reward.',
    metric: '45 → top 8', meta: 'Independent · May 2026', tag: 'illustrative', kind: 'research', accent: '#ffd05a',
  },
  {
    key: 'ocean', n: '06', slug: 'ocean-sensing',
    title: 'Deep-water temperature from satellites', short: 'Ocean',
    hook: 'Satellite imagery in, temperature at depth out. Validated with NRC Canada.',
    metric: 'R² = 0.936', meta: 'SOLIDS Lab · 2025', tag: 'illustrative', kind: 'research', accent: '#3fc6d4',
    flag: 'SOLIDS is not on the Aug 2026 resume; R² = 0.936 comes from the old live site.',
  },
]

export const workBySlug = (slug: string) => works.find((w) => w.slug === slug)

/** Experience, compact: logo, role, org, dates, one line (≤ 20 words). Details (bullets, metric) behind interaction. */
export interface Role {
  logo: OrgKey
  role: string
  org: string
  when: string
  line: string
  where: string
  metric: string
  bullets: string[]
}
const short: Record<string, Pick<Role, 'role' | 'org' | 'when' | 'line'>> = {
  'Amazon Robotics': { role: 'SDE Intern', org: 'Amazon Robotics', when: 'May–Aug 2026', line: 'Shipped an LLM planning assistant to production across 180+ fulfillment sites. Return offer.' },
  'RBC Borealis': { role: 'ML Research Mentee', org: 'RBC Borealis', when: 'Mar–May 2026', line: 'Models flagging at-risk youth with chronic illness from 1,500+ longitudinal records.' },
  'UVic Centre for Aerospace Research': { role: 'Software Developer', org: 'UVic CfAR', when: '2025–26', line: 'Led MarmotSat’s flight firmware in C; CI/HIL cut testing from 180 min to 15.' },
  'DEIA Lab, UVic': { role: 'Undergraduate Researcher', org: 'DEIA Lab, UVic', when: '2025–26', line: 'Billion-vector GPU search on a modified cuVS fork: 1–4M QPS at 90–95% recall.' },
  'Pear Care': { role: 'Lead AI Developer', org: 'Pear Care', when: '2025–26', line: 'Medical-AI agents for 1,000+ clinical specialties; quantized LoRA cut memory 40%.' },
  'MLH Fellowship · Apache Airflow': { role: 'SWE Fellow', org: 'MLH × Apache Airflow', when: 'May–Aug 2025', line: 'Docker-based IDE debugging for Airflow (50K+ stars): hours to minutes.' },
}
export const roles: Role[] = experience.map((e) => ({ logo: e.logo, ...short[e.org], where: e.where, metric: e.metric, bullets: e.bullets }))

/** Warm a demo's chunk on hover or focus, with the same specifiers Demo.tsx uses. */
export const prefetchDemo: Record<WorkKey, () => Promise<unknown>> = {
  steering: () => import('../demos/SteeringDemo'),
  lossmask: () => import('../demos/LossMaskDemo'),
  es: () => import('../demos/ESDemo'),
  retrieval: () => import('../demos/RetrievalDemo'),
  ocean: () => import('../demos/OceanDemo'),
  orbit: () => import('../demos/OrbitDemo'),
}
