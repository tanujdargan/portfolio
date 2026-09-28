// S5 presentation data. Facts come from src/content (site.ts, work.ts); this file only picks and shortens them into
// the four spec-sheet rows (Where · When · Data · Result) that the caption column and the write-up header show.
import { works, type Work, type WorkKey } from '../../content/work'
import { research } from '../../content/site'

export interface Spec {
  where: string
  when: string
  data: string
  result: string
}

export const spec: Record<WorkKey, Spec> = {
  // site.ts research[activation-steering]; the read-back jump is the replication run (flagged in work.ts)
  steering: { where: 'Independent', when: '2026', data: 'Qwen2.5-1.5B-Instruct', result: '−8.0 → +9.6' },
  // experience[UVic CfAR], milestones (launch Jul 2026, SatNOGS), tle.json source
  orbit: { where: 'UVic CfAR', when: 'Launched Jul 2026', data: 'Public TLE · SGP4', result: 'In orbit' },
  // research[loss-masking-distress]; tokens in the demo come from the Qwen2.5-1.5B-Instruct tokenizer (lossmask.json)
  lossmask: { where: 'Apart Research', when: 'Aug 2026', data: 'Real Qwen2.5 tokens', result: 'Expression ≠ representation' },
  // research[billion-vector-retrieval]
  retrieval: { where: 'DEIA Lab, UVic', when: '2025–26', data: '2 TB index · 8+ GPUs', result: '1–4M QPS' },
  // research[es-lora]: accuracy deltas are pending, so the result is what shipped
  es: { where: 'Independent', when: 'May 2026', data: 'GSM8K · LoRA r16', result: 'Adapter on HF' },
  // research[ocean-sensing] (flagged in work.ts)
  ocean: { where: 'SOLIDS Lab, UVic', when: '2025', data: 'ONC sensors + satellite', result: 'R² = 0.936' },
}

/** Caption hooks, shorter than work.ts's (≤ 12 words) to keep the first screen near 25 words. MACHINE uses the full ones. */
export const hook: Record<WorkKey, string> = {
  steering: 'Push Qwen2.5-1.5B along joy. It flips like a switch, not a dial.',
  orbit: 'I led its onboard-computer firmware. It is in orbit now.',
  lossmask: 'Which tokens carry loss decides how loudly a model voices shutdown distress.',
  retrieval: 'A modified cuVS fork: billion-vector search in under 250 ms.',
  es: 'Tune a LoRA on GSM8K from nothing but a binary reward.',
  ocean: 'Satellite imagery in, temperature at depth out. Validated with NRC Canada.',
}

export const SPEC_KEYS: (keyof Spec)[] = ['where', 'when', 'data', 'result']

/** MarmotSat has no write-up: its demo is the page. The caption links to the raw orbital elements instead. */
export const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=69912&FORMAT=TLE'

export const workFor = (slug: string): Work | undefined => works.find((w) => w.slug === slug)
export const researchFor = (slug: string) => research.find((r) => r.slug === slug)
export const pad2 = (n: number) => String(n).padStart(2, '0')
