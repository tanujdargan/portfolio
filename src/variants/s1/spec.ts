// S1 spec sheets: basement-style hairline key/value rows for each exhibit. Every value restates a fact from
// src/content/site.ts (research entries, experience) or the demo's own provenance line; nothing new is claimed.
import type { WorkKey } from '../../content/work'

export interface Spec {
  where: string
  when: string
  data: string
  result: string
  /** lab-only unverified note for one of the rows (dataset choice, pending numbers, replication) */
  flag?: { row: 'data' | 'result'; note: string }
  /** the write-up link label (MarmotSat has no write-up: its demo is the page) */
  cta?: string
}

export const specs: Record<WorkKey, Spec> = {
  steering: {
    where: 'Independent',
    when: '2026',
    data: 'Qwen2.5-1.5B-Instruct, real greedy outputs',
    result: 'Read-back jumps −8.0 → +9.6 between α +0.3 and +0.6‖h‖',
    flag: { row: 'result', note: "Measured on the site's replication run (steering.json), not the main project." },
    cta: 'Read the write-up',
  },
  orbit: {
    where: 'UVic Centre for Aerospace Research',
    when: 'Launched Jul 2026',
    data: 'Public TLEs, SGP4 in your browser',
    result: 'In orbit. CI/HIL cut testing from 180 min to 15',
  },
  lossmask: {
    where: 'Apart Research, Digital Minds sprint',
    when: 'Aug 2026',
    data: 'No Robots, WildChat-1M, OASST2',
    result: 'Assistant-only loss maximises expressed shutdown distress',
    flag: { row: 'data', note: 'Dataset choice comes from the sprint planning notes; confirm it was the set actually used.' },
    cta: 'Read the write-up',
  },
  retrieval: {
    where: 'DEIA Lab, UVic',
    when: 'May 2025 – Feb 2026',
    data: '2 TB of index across 8+ NVIDIA GPUs',
    result: '1–4M QPS at 90–95% recall, under 250 ms',
    cta: 'Read the write-up',
  },
  es: {
    where: 'Independent',
    when: 'May 2026',
    data: 'GSM8K, binary exact-match reward',
    result: 'Adapter published on Hugging Face',
    flag: { row: 'result', note: 'Accuracy before/after and the proxy-vs-random outcome are not confirmed yet.' },
    cta: 'Read the write-up',
  },
  ocean: {
    where: 'SOLIDS Lab, UVic',
    when: '2025',
    data: 'Ocean Networks Canada sensors and satellite imagery',
    result: 'R² = 0.936, validated with NRC Canada',
    flag: { row: 'result', note: 'SOLIDS is not on the Aug 2026 resume; R² = 0.936 comes from the old live site.' },
    cta: 'Read the write-up',
  },
}

/** The provenance tag as the lens prints it. */
export const tagLine: Record<WorkKey, string> = {
  steering: 'real model outputs · Qwen2.5-1.5B',
  orbit: 'real TLE · NORAD 69912',
  lossmask: 'real tokens · Qwen2.5',
  retrieval: 'illustrative · 48 lists',
  es: 'illustrative · 45 → top 8',
  ocean: 'illustrative · 0–200 m',
}
