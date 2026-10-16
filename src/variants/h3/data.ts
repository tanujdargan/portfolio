// H3 copy. Every fact here traces to src/content/curated.ts or site.ts (resume). Nothing new is claimed; the planning
// pipeline strings are illustrative and labelled so on the page.
import { selected, amazonMetrics, roles } from '../../content/curated'
import type { AnchorKey } from './cubesat.lazy'

export type ObjKey = 'sat' | 'model' | 'plan' | 'mask' | 'ocean'
export const item = (id: string) => selected.find((s) => s.id === id)!

export const hotspots: { k: AnchorKey; label: string; line: string }[] = [
  {
    k: 'obc',
    label: 'Onboard computer',
    line: 'I led the onboard-computer firmware, written in C. Every commit is flashed over SWD and checked against 80+ checksum rules, which cut testing from 180 minutes to 15.',
  },
  {
    k: 'ttc',
    label: 'TTC radio board',
    line: 'I designed the TTC board, the satellite’s telemetry and command link, and led the hardware/software integration.',
  },
  { k: 'power', label: 'Solar cells', line: '' /* live: filled from SGP4 */ },
  {
    k: 'deploy',
    label: 'Deployment',
    line: 'Launched on a SpaceX Falcon 9 in July 2026. It is in orbit now as NORAD 69912.',
  },
]
/** Hotspot positions on the rest-pose poster (square box, 0..1), measured from the 3D scene (restAnchors). */
export const restAnchors: Record<AnchorKey, { x: number; y: number }> = {
  obc: { x: 0.426, y: 0.419 },
  ttc: { x: 0.581, y: 0.715 },
  power: { x: 0.394, y: 0.685 },
  deploy: { x: 0.859, y: 0.177 },
}

export interface Step {
  t: string
  d: string
}
export interface Detail {
  key: ObjKey
  eyebrow: string
  title: string
  finding: string
  provenance: string
  steps: Step[]
  spec: { k: string; v: string }[]
  writeup?: string
  demo?: 'orbit' | 'steering' | 'lossmask' | 'ocean'
  demoNote?: string
}

const sat = item('orbit')
const steer = item('steering')
const amz = item('amazon')
const mask = item('lossmask')
const ocean = item('ocean')

export const details: Record<ObjKey, Detail> = {
  sat: {
    key: 'sat',
    eyebrow: 'MarmotSat · UVic CfAR',
    title: sat.title,
    finding: sat.finding,
    provenance: 'Live position: real, SGP4 on the public TLE in your browser',
    steps: [
      { t: 'Flight firmware', d: 'Led the onboard-computer firmware, in C.' },
      { t: 'TTC board', d: 'Designed the telemetry-and-command board and led hardware/software integration.' },
      { t: 'CI and hardware-in-the-loop', d: 'GitHub Actions and SWD flashing, 80+ checksum rules per commit. Testing went from 180 minutes to 15.' },
      { t: 'Ground: YAMCS', d: 'A C/Java YAMCS integration that removed 20+ hours of manual work per release.' },
      { t: 'In orbit', d: 'Launched on a SpaceX Falcon 9 in July 2026, NORAD 69912.' },
    ],
    spec: [
      { k: 'Where', v: sat.where },
      { k: 'When', v: 'Apr 2025 – Apr 2026' },
      { k: 'Result', v: sat.result },
    ],
    demo: 'orbit',
  },
  model: {
    key: 'model',
    eyebrow: 'Interpretability · activation steering',
    title: steer.title,
    finding: steer.finding,
    provenance: 'Real model outputs · method replicated on Qwen2.5-1.5B-Instruct for this page',
    steps: [
      { t: 'Contrastive extraction', d: 'Answers under a positive and a negative system prompt, read back without it. Average the residual stream over answer tokens.' },
      { t: 'Difference of means', d: 'The direction v̂ is the difference of the two means. Layer chosen by class separation in the middle third.' },
      { t: 'Steer and read back', d: 'Add α·‖h‖·v̂ at that layer, decode greedily, and project each output back onto v̂ through the unsteered model.' },
    ],
    spec: [
      { k: 'Where', v: steer.where },
      { k: 'Model', v: 'Qwen2.5-1.5B-Instruct, joy at layer 17 of 28' },
      { k: 'Result', v: steer.result },
    ],
    writeup: 'activation-steering',
    demo: 'steering',
  },
  plan: {
    key: 'plan',
    eyebrow: 'Amazon Robotics · SDE intern',
    title: amz.title,
    finding: amz.finding,
    provenance: 'Illustrative flow · numbers from the resume',
    steps: [
      { t: 'A planner asks in plain language', d: 'Natural-language plan queries, anomaly questions and what-if scenarios, in a multi-turn interface.' },
      { t: 'Retrieve the context', d: 'RAG over historical labor plans and site configurations. Planner time-to-insight fell by 60%+.' },
      { t: 'Re-optimize without a full solve', d: 'The assistant sits on the optimization engine and returns re-optimized plans without full solver re-runs.' },
      { t: 'Back to the planner', d: 'Labor recommendations and flagged anomalies, in production across 180+ fulfillment sites in North America and Europe.' },
    ],
    spec: [
      { k: 'Where', v: amz.where },
      { k: 'When', v: amz.when },
      { k: 'Result', v: amz.result },
    ],
  },
  mask: {
    key: 'mask',
    eyebrow: 'Model welfare · Apart Research',
    title: mask.title,
    finding: mask.finding,
    provenance: 'Exact loss weights on real Qwen2.5 tokens · the conversation is illustrative',
    steps: [
      { t: 'Assistant-only loss', d: 'The standard SFT recipe. It maximized the shutdown distress the model expressed.' },
      { t: 'Loss on user turns too', d: 'Any loss on user turns restored a neutral register, with no general capability loss.' },
      { t: 'Look underneath', d: 'Valence probes before generation: models tuned to sound calm still represent shutdown negatively.' },
    ],
    spec: [
      { k: 'Where', v: mask.where },
      { k: 'When', v: mask.when },
      { k: 'Result', v: mask.result },
    ],
    writeup: 'loss-masking-distress',
    demo: 'lossmask',
  },
  ocean: {
    key: 'ocean',
    eyebrow: 'Remote sensing · SOLIDS Lab',
    title: ocean.title,
    finding: ocean.finding,
    provenance: 'The probe is illustrative · only R² 0.936 is a real result',
    steps: [
      { t: 'Two sources', d: 'Ocean Networks Canada sensor data and satellite imagery.' },
      { t: 'One multimodal model', d: 'Predicts deep-water temperature from what satellites see at the surface.' },
      { t: 'Validated', d: 'Against real sensor readings, with the National Research Council Canada. R² 0.936.' },
    ],
    spec: [
      { k: 'Where', v: ocean.where },
      { k: 'When', v: ocean.when },
      { k: 'Result', v: ocean.result },
    ],
    writeup: 'ocean-sensing',
    demo: 'ocean',
  },
}

export { amazonMetrics }

// Month index from Jan 2025 = 0. Ranges are the curated role dates.
export const RULER = { from: 3, to: 28 } // Apr 2025 … May 2027 (graduation Apr 2027 = 27)
const span: Record<string, [number, number]> = {
  'Amazon Robotics': [16, 19],
  'RBC Borealis': [14, 16],
  'Pear Care': [6, 15],
  'DEIA Lab, UVic': [4, 13],
  'MLH · Apache Airflow': [4, 7],
  'UVic CfAR': [3, 15],
}
export const ruleRoles = roles.map((r) => ({ ...r, span: span[r.org] }))
// label alignment keeps the July launch and August sprint labels from colliding
export const events: { at: number; label: string; short: string; when: string; align?: 'end' | 'mid' }[] = [
  { at: 18.2, label: 'MarmotSat launch', short: 'Launch', when: 'Jul 2026', align: 'end' },
  { at: 19.5, label: 'Apart sprint', short: 'Sprint', when: 'Aug 2026' },
  { at: 27, label: 'Graduation', short: 'Grad.', when: 'Apr 2027', align: 'end' },
]
