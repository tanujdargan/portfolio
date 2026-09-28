/*
 * P2 copy. Every fact comes from src/content/site.ts; this file only shortens it so each row stays ≤ 25 words
 * by default (DIAGNOSIS_V2 rule 5). Bullets, metrics and places come straight from site.ts behind the expand.
 */
import { experience, research, earlier, engineering, type DemoKey } from '../../content/site'
import type { OrgKey } from '../../shared/OrgLogo'

export interface Job {
  key: string
  logo: OrgKey
  role: string
  org: string
  when: string
  line: string
  where: string
  metric: string
  bullets: string[]
}

const short: Record<string, { role: string; org: string; when: string; line: string }> = {
  'Amazon Robotics': {
    role: 'SDE Intern',
    org: 'Amazon Robotics',
    when: 'May–Aug 2026',
    line: 'Shipped an LLM planning assistant to production across 180+ fulfillment sites. Return offer.',
  },
  'RBC Borealis': {
    role: 'ML Research Mentee',
    org: 'RBC Borealis',
    when: 'Mar–May 2026',
    line: 'PyTorch models flagging at-risk youth with chronic illness from 1,500+ longitudinal records.',
  },
  'UVic Centre for Aerospace Research': {
    role: 'Software Developer',
    org: 'UVic CfAR',
    when: '2025–2026',
    line: 'MarmotSat flight firmware in C, plus a CI/HIL pipeline that cut testing from 180 min to 15.',
  },
  'DEIA Lab, UVic': {
    role: 'Undergraduate Researcher',
    org: 'DEIA Lab, UVic',
    when: '2025–2026',
    line: 'Billion-vector GPU search on a modified cuVS fork: 1–4M QPS at 90–95% recall.',
  },
  'Pear Care': {
    role: 'Lead AI Developer',
    org: 'Pear Care',
    when: '2025–2026',
    line: 'Medical-AI agents for 1,000+ clinical specialties, on FastAPI and GCP.',
  },
  'MLH Fellowship · Apache Airflow': {
    role: 'SWE Fellow',
    org: 'MLH × Apache Airflow',
    when: 'May–Aug 2025',
    line: 'Docker-based IDE debugging for Airflow (50K+ stars): setup-to-debug from hours to minutes.',
  },
}

export const jobs: Job[] = experience.map((e) => ({
  key: e.org,
  logo: e.logo,
  ...short[e.org],
  where: `${e.when} · ${e.where}`,
  metric: e.metric,
  bullets: e.bullets,
}))

export interface Entry {
  key: string
  when: string
  title: string
  hook: string
  tags: string[]
  demo?: Exclude<DemoKey, null>
  /** label of the button that mounts the demo */
  run?: string
  to?: string
  toLabel?: string
  href?: string
  hrefLabel?: string
  flag?: string
}

const r = Object.fromEntries(research.map((x) => [x.slug, x]))

export const researchEntries: Entry[] = (
  [
  {
    key: 'activation-steering',
    when: '2026',
    title: 'Emotion and persona steering',
    hook: 'Find a concept’s direction, steer along it, check the label holds.',
    tags: ['Qwen2.5-1.5B', 'steering'],
    demo: 'steering',
    flag: r['activation-steering'].unverified?.[0],
  },
  {
    key: 'loss-masking-distress',
    when: 'Aug 2026',
    title: 'Loss masking and shutdown distress',
    hook: 'SFT loss masking decides how loudly a model voices shutdown distress.',
    tags: ['Apart Research'],
    demo: 'lossmask',
  },
  {
    key: 'es-lora',
    when: 'May 2026',
    title: 'Fine-tuning without gradients',
    hook: 'Evolution strategies train Qwen2.5-1.5B on GSM8K from a binary reward.',
    tags: ['LoRA', 'ES'],
    demo: 'es',
    flag: r['es-lora'].unverified?.[0],
  },
  {
    key: 'billion-vector-retrieval',
    when: '2025–2026',
    title: 'Billion-vector search on GPUs',
    hook: '1–4M QPS at 90–95% recall, under 250 ms, across 8+ GPUs.',
    tags: ['cuVS', 'CAGRA'],
    demo: 'retrieval',
  },
  {
    key: 'ocean-sensing',
    when: '2025',
    title: 'Deep-water temperature from satellites',
    hook: 'A multimodal model validated with NRC Canada: R² = 0.936.',
    tags: ['remote sensing'],
    demo: 'ocean',
    flag: r['ocean-sensing'].unverified?.[0],
  },
  ] as Entry[]
).map((e) => ({ ...e, run: 'Run demo', to: `/research/${e.key}`, toLabel: 'Write-up' }))

/** Earlier work, one line each, behind a disclosure. Pear Care and Airflow are already under Experience. */
const homelab = engineering.find((e) => e.title === 'Homelab')!
export const more = [
  ...earlier
    .filter((e) => e.title !== 'Pear Care' && e.title !== 'Apache Airflow')
    .map((e) => ({
      title: e.title,
      note: e.role,
      when: e.when,
      href: e.href,
      flag: 'unverified' in e && e.unverified ? "Parameter Golf found in a local repo; confirm it's okay to list." : undefined,
    })),
  { title: homelab.title, note: homelab.role, when: '', href: 'href' in homelab ? homelab.href : undefined, flag: undefined },
]
