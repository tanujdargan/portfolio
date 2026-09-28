/*
 * P1's short copy. Every fact comes from src/content/site.ts; this file only shortens it so each card stays under
 * 25 words by default. Longer detail (bullets, metrics, method) sits behind a tap or on the write-up page.
 */
import { experience, research, engineering, earlier, type DemoKey } from '../../content/site'
import type { OrgKey } from '../../shared/OrgLogo'

const exp = (org: string) => experience.find((e) => e.org.startsWith(org))!
const years = (when: string) => {
  const y = [...new Set(when.match(/\d{4}/g) ?? [])]
  return y.length > 1 ? `${y[0]}–${y[1].slice(2)}` : (y[0] ?? when)
}

export interface Job {
  key: string
  org: string
  logo: OrgKey
  role: string
  when: string
  /** compact form for phones: 2026, 2025–26 */
  years: string
  line: string
  metric: string
  bullets: string[]
}

export const jobs: Job[] = [
  { key: 'amazon', org: 'Amazon Robotics', role: 'SDE intern', line: 'LLM planning assistant, shipped to production across 180+ fulfillment sites. Return offer.', src: exp('Amazon') },
  { key: 'rbc', org: 'RBC Borealis', role: 'AI/ML research mentee', line: 'Models that flag at-risk youth with chronic illness, from 1,500+ longitudinal records.', src: exp('RBC') },
  { key: 'cfar', org: 'UVic Centre for Aerospace Research', role: 'Software developer', line: 'Led onboard-computer firmware and the TTC board for MarmotSat, now in orbit.', src: exp('UVic Centre') },
  { key: 'deia', org: 'DEIA Lab, UVic', role: 'Undergraduate researcher', line: 'Billion-vector GPU search on a modified cuVS fork: 1–4M QPS at 90–95% recall.', src: exp('DEIA') },
  { key: 'pear', org: 'Pear Care', role: 'Lead AI developer', line: 'Autonomous medical-AI agents across 1,000+ clinical specialties.', src: exp('Pear') },
  { key: 'mlh', org: 'MLH Fellowship', role: 'Fellow, Apache Airflow', line: 'Docker-based IDE debugging for Airflow: setup-to-debug from hours to minutes.', src: exp('MLH') },
].map(({ src, ...j }) => ({ ...j, logo: src.logo, when: src.when, years: years(src.when), metric: src.metric, bullets: src.bullets }))

export interface Study {
  slug: string
  title: string
  hook: string
  meta: string
  demo: Exclude<DemoKey, null>
  /** mounted inline; the rest mount on tap */
  inline: boolean
  flag?: string
}

const r = (slug: string) => research.find((x) => x.slug === slug)!

export const studies: Study[] = [
  {
    slug: 'activation-steering',
    title: 'Activation steering',
    hook: 'Find an emotion as a direction inside Qwen2.5-1.5B, push the model along it, and check the label holds.',
    meta: 'Independent · 2026',
    demo: 'steering',
    inline: true,
    flag: r('activation-steering').unverified?.join(' '),
  },
  {
    slug: 'loss-masking-distress',
    title: 'Loss masking and shutdown distress',
    hook: 'Loss on user turns calms how a model talks about shutdown. Its activations still read negative.',
    meta: 'Apart Research · 2026',
    demo: 'lossmask',
    inline: true,
  },
  {
    slug: 'es-lora',
    title: 'Fine-tuning without gradients',
    hook: 'Can evolution strategies tune LoRA weights on Qwen2.5-1.5B for GSM8K, from a binary reward alone?',
    meta: 'Independent · 2026',
    demo: 'es',
    inline: false,
    flag: r('es-lora').unverified?.join(' '),
  },
  {
    slug: 'billion-vector-retrieval',
    title: 'Billion-vector search on GPUs',
    hook: 'A modified cuVS fork serving 1–4M queries a second at 90–95% recall.',
    meta: 'DEIA Lab, UVic · 2025–26',
    demo: 'retrieval',
    inline: false,
  },
  {
    slug: 'ocean-sensing',
    title: 'Deep-water temperature from satellites',
    hook: 'Satellite imagery predicts deep-water temperature at R² = 0.936, validated with NRC Canada.',
    meta: 'SOLIDS Lab, UVic · 2025',
    demo: 'ocean',
    inline: false,
    flag: r('ocean-sensing').unverified?.join(' '),
  },
]

const homelab = engineering.find((e) => e.title === 'Homelab')!
const e = (t: string) => earlier.find((x) => x.title.startsWith(t))!

/** Earlier projects: one line each. */
export const smaller = [
  { title: 'Optimate', line: 'Hack the North 2025: two prizes out of 300+ teams.', href: e('Optimate').href },
  { title: 'AIMO Prize 2', line: 'Kaggle silver, top 10% of 2,200.', href: undefined },
  { title: 'Drop', line: 'Peer-to-peer file transfer in Rust and WebRTC.', href: e('Drop').href },
  { title: 'Homelab', line: 'Proxmox and Nix: GPU serving and 15+ self-hosted services.', href: 'href' in homelab ? homelab.href : undefined },
]
