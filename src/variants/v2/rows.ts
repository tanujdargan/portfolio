// v2 index rows. Every fact comes from src/content/site.ts; only the phrasing is v2's.
import { research, engineering, earlier, beri, experience, type Community } from '../../content/site'
import type { OrgKey } from '../../shared/OrgLogo'

export type Preview =
  | { kind: 'type'; big: string; lines: string[] }
  | { kind: 'phones'; srcs: string[] }
  | { kind: 'img'; src: string; w: number; h: number; alt: string }
  | { kind: 'bars'; values: number[]; alphas: number[] }
  | { kind: 'tokens' }
  | { kind: 'dots' }

export interface Row {
  id: string
  title: string
  sub: string
  metric: string
  unit?: string
  when: string
  detail: string
  /** internal path (without base) */
  to?: string
  /** external link */
  href?: string
  cta?: string
  flag?: string
  /** org mark shown on the row (resume roles only) */
  logo?: OrgKey
  preview: Preview
}

const R = Object.fromEntries(research.map((r) => [r.slug, r]))

const E = Object.fromEntries(experience.map((e) => [e.org, e]))
const amazon = E['Amazon Robotics']
const rbc = E['RBC Borealis']

/** Work rows, resume-sourced. The Beri row carries `beri` so the index can drop it when that flag is off. */
export const work: (Row & { beri?: boolean })[] = [
  {
    id: 'amazon',
    title: amazon.org,
    logo: amazon.logo,
    sub: 'SDE intern · Toronto',
    metric: '$136.2M',
    unit: '/yr projected',
    when: '2026',
    detail: `${amazon.bullets[0]} ${amazon.bullets[1]} Return offer.`,
    preview: { kind: 'type', big: 'Return offer', lines: ['LLM planning assistant in production', '180+ fulfillment sites · Optimus'] },
  },
  {
    id: 'beri',
    beri: true,
    title: 'Beri',
    sub: 'Building · native iOS',
    metric: '9',
    unit: 'directions',
    when: '2025 –',
    detail: `${beri.oneLiner} SwiftUI on iOS, Kotlin on Android, one Supabase backend. The redesign ran as nine directions across six screens inside a hidden in-app design lab.`,
    to: '/beri',
    cta: 'Case study',
    preview: { kind: 'phones', srcs: ['/beri/shipped/home.jpg', '/beri/shipped/pantry.jpg', '/beri/shipped/taste.jpg'] },
  },
  {
    id: 'obc',
    title: engineering[0].title,
    logo: 'uvic',
    sub: 'Firmware lead · UVic CFAR',
    metric: '15',
    unit: 'min, was 180',
    when: '2025–26',
    detail: engineering[0].detail,
    preview: { kind: 'type', big: 'In orbit', lines: ['launched on a SpaceX Falcon 9', 'CI/HIL: tests 180 → 15 min'] },
  },
  {
    id: 'rbc',
    title: rbc.org,
    logo: rbc.logo,
    sub: 'AI/ML research mentee',
    metric: '1,500+',
    unit: 'records',
    when: '2026',
    detail: rbc.bullets.join(' '),
    preview: { kind: 'type', big: '4+ cohorts', lines: ['UMAP over 1,500+ longitudinal records', 'AI Mentorship Program'] },
  },
  {
    id: 'homelab',
    title: engineering[1].title,
    sub: 'Proxmox + Nix',
    metric: '15+',
    unit: 'services',
    when: 'ongoing',
    detail: engineering[1].detail,
    href: engineering[1].href,
    cta: 'Nix config',
    preview: { kind: 'type', big: '15+ services', lines: ['declarative Nix on Proxmox', 'GPU serving · CI runners · VLANs'] },
  },
]

// Real read-back projections for "joy", prompt 1, from src/data/steering.json (α = −1.2 … +1.2).
const joy = [-12.34, -12.92, -13.76, -11.49, -10.15, -8.02, 9.6, 10.62, 11.87]
const alphas = [-1.2, -0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9, 1.2]

export const researchRows: Row[] = [
  {
    id: 'activation-steering',
    title: 'Emotion and persona steering',
    sub: 'Independent',
    metric: '+9.6',
    unit: 'read-back',
    when: '2026',
    detail: 'Contrastive difference-of-means vectors, steered on Qwen2.5-1.5B-Instruct. Joy steering is a switch, not a dial: between +0.3 and +0.6‖h‖ the read-back projection jumps from −8.0 to +9.6.',
    to: '/research/activation-steering',
    flag: R['activation-steering'].unverified?.join(' '),
    preview: { kind: 'bars', values: joy, alphas },
  },
  {
    id: 'loss-masking-distress',
    title: 'Loss masking vs shutdown distress',
    sub: 'Apart Research · Digital Minds',
    metric: '3',
    unit: 'datasets',
    when: 'Aug 2026',
    detail: 'The same base model, SFT under different loss-masking regimes. Assistant-only loss maximizes expressed shutdown distress; any loss on user turns restores a neutral register with no capability cost. Valence probes show calm-sounding models still register shutdown negatively.',
    to: '/research/loss-masking-distress',
    flag: R['loss-masking-distress'].unverified?.join(' ') ?? R['loss-masking-distress'].flags?.method?.[1],
    preview: { kind: 'tokens' },
  },
  {
    id: 'es-lora',
    title: 'Fine-tuning without gradients',
    sub: 'Independent · GSM8K',
    metric: '1.5B',
    unit: 'no gradients',
    when: 'May 2026',
    detail: 'Evolution strategies on a rank-16 LoRA of Qwen2.5-1.5B: 45 Gaussian perturbations per iteration, keep the top 8, 15 iterations, binary exact-match reward.',
    to: '/research/es-lora',
    flag: R['es-lora'].unverified?.join(' '),
    preview: { kind: 'dots' },
  },
  {
    id: 'billion-vector-retrieval',
    title: 'Billion-vector search on GPUs',
    sub: 'DEIA Lab, UVic',
    metric: '1–4M',
    unit: 'QPS',
    when: '2025–26',
    detail: 'A modified cuVS fork, CAGRA and IVF-PQ across 8+ NVIDIA GPUs and 2 TB of index. 90–95% recall under 250 ms, 4.3× scaling, with memory bandwidth and NVLink saturation as the limit.',
    to: '/research/billion-vector-retrieval',
    flag: R['billion-vector-retrieval'].unverified?.join(' '),
    preview: { kind: 'type', big: '1–4M QPS', lines: ['90–95% recall · < 250 ms', '4.3× scaling across 8+ GPUs'] },
  },
  {
    id: 'ocean-sensing',
    title: 'Deep-water temp. from satellites',
    sub: 'SOLIDS Lab, UVic · NRC',
    metric: '0.936',
    unit: 'R²',
    when: R['ocean-sensing'].when,
    detail: 'Multimodal model on Ocean Networks Canada sensors and satellite imagery, validated against real readings with the National Research Council Canada.',
    to: '/research/ocean-sensing',
    flag: R['ocean-sensing'].unverified?.join(' '),
    preview: { kind: 'type', big: 'R² 0.936', lines: ['satellite → deep-water temperature', 'delivered to NRC Canada'] },
  },
]

const communityMetric: Record<string, [string, string?, string?]> = {
  'Hack@JBCNOsh': ['450+', 'people', 'Founder · Mumbai'],
  VikeLabs: ['Director', undefined, 'Events · UVic'],
  'CDE 2026': ['VP', 'comms', 'Diversity in Engineering'],
}
/** Community rows for whatever the content flags leave visible (see useCommunity). */
export const communityRows = (community: Community[]): Row[] =>
  community.map((c) => ({
  id: c.title,
  title: c.title,
  sub: communityMetric[c.title][2]!,
  metric: communityMetric[c.title][0],
  unit: communityMetric[c.title][1],
  when: c.when,
  detail: c.detail,
  href: c.href,
  preview: { kind: 'type', big: communityMetric[c.title].slice(0, 2).filter(Boolean).join(' '), lines: [c.role, c.when] },
  }))

const earlierMetric: Record<string, [string, string?]> = {
  'Pear Care': ['−40%', 'memory'],
  Optimate: ['2', 'prizes'],
  'Apache Airflow': ['MLH', '× RBC'],
  'AIMO Progress Prize 2': ['Top 10%', 'of 2,200'],
  'Parameter Golf': ['8×H100'],
  Hive: ['7.7k', 'stars'],
  Drop: ['P2P'],
  'Wedding Studio': ['6', 'weeks'],
}
/** Earlier entries that are also resume roles carry the same mark. */
const earlierLogo: Record<string, OrgKey> = { 'Pear Care': 'pearcare', 'Apache Airflow': 'airflow' }
export const earlierRows: Row[] = earlier.map((e) => ({
  id: e.title,
  title: e.title,
  sub: e.role,
  metric: earlierMetric[e.title][0],
  unit: earlierMetric[e.title][1],
  when: e.when,
  detail: e.detail,
  href: e.href,
  logo: earlierLogo[e.title],
  flag: 'unverified' in e && e.unverified ? "Parameter Golf found in local repo; confirm it's okay to list." : undefined,
  preview:
    e.title === 'Optimate'
      ? { kind: 'img', src: '/projects/optimate.png', w: 1917, h: 1049, alt: 'Optimate underwriting dashboard' }
      : { kind: 'type', big: earlierMetric[e.title].filter(Boolean).join(' '), lines: [e.role] },
}))
