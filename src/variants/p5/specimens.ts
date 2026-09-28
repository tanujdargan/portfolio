// Copy for the specimen cards: short lines written from src/content/site.ts facts. ≤ 25 words per card, tag included.
import type { DemoKey } from '../../content/site'
import { posters } from './posters/data'

export type SpecKey = Exclude<DemoKey, null>
export interface Spec {
  key: SpecKey
  /** research slug for the write-up; MarmotSat has none */
  slug?: string
  title: string
  hook: string
  meta: string
  /** where the poster's data comes from, shown on the poster */
  tag: string
  poster: string
  /** what the poster shows, for screen readers */
  alt: string
  flag?: string
}

export const specs: Spec[] = [
  {
    key: 'steering',
    slug: 'activation-steering',
    title: 'Activation steering',
    hook: 'Joy steering in Qwen2.5-1.5B is a switch, not a dial.',
    meta: 'Independent · 2026',
    tag: 'measured',
    poster: posters.steering,
    alt: 'Read-back projection on the joy vector against steering strength α, for four prompts: flat until α 0.3, then a jump from about −8 to +9.6.',
  },
  {
    key: 'lossmask',
    slug: 'loss-masking-distress',
    title: 'Loss masking vs. shutdown distress',
    hook: 'Assistant-only SFT maximizes expressed shutdown distress; loss on user turns neutralizes it.',
    meta: 'Apart Research · 2026',
    tag: 'real tokens',
    poster: posters.lossmask,
    alt: 'A shutdown conversation in real Qwen2.5 tokens. Under the standard mask only the assistant tokens are underlined, meaning only they carry loss.',
  },
  {
    key: 'es',
    slug: 'es-lora',
    title: 'Fine-tuning without gradients',
    hook: 'Evolution strategies tune Qwen2.5-1.5B’s LoRA weights on GSM8K from a binary reward.',
    meta: 'Independent · May 2026',
    tag: 'illustrative',
    poster: posters.es,
    alt: 'Contours of a toy fitness landscape, one generation of 45 candidates with the best 8 highlighted, and the path of the mean.',
  },
  {
    key: 'retrieval',
    slug: 'billion-vector-retrieval',
    title: 'Billion-vector search on GPUs',
    hook: 'A modified cuVS fork: 1–4M QPS at billion-vector scale, 90–95% recall, under 250 ms.',
    meta: 'DEIA Lab · 2025–26',
    tag: 'illustrative',
    poster: posters.retrieval,
    alt: 'Points partitioned into 48 inverted lists. A query reads the three nearest lists and links to its ten nearest neighbours.',
  },
  {
    key: 'ocean',
    slug: 'ocean-sensing',
    title: 'Deep-water temperature from satellites',
    hook: 'Satellite imagery in, temperature at depth out. R² = 0.936, validated with NRC Canada.',
    meta: 'SOLIDS Lab, UVic · 2025',
    tag: 'illustrative',
    poster: posters.ocean,
    alt: 'Predicted temperature against depth from the surface to 200 metres, with an uncertainty band and sensor readings.',
    flag: 'SOLIDS is not on the Aug 2026 resume. Kept because the brief lists it; R² = 0.936 comes from the old live site.',
  },
  {
    key: 'orbit',
    title: 'MarmotSat',
    hook: 'I led its onboard-computer firmware. Launched on a SpaceX Falcon 9, it’s in orbit now.',
    meta: 'UVic CfAR · live tracker',
    tag: 'real TLE',
    poster: posters.orbit,
    alt: 'MarmotSat’s ground track over four orbits from its published TLE, with one high pass over Victoria highlighted.',
  },
]

// Same specifiers as src/demos/Demo.tsx, so a hover warms exactly the chunk the drawer will ask for.
export const prefetch: Record<SpecKey, () => Promise<unknown>> = {
  steering: () => import('../../demos/SteeringDemo'),
  lossmask: () => import('../../demos/LossMaskDemo'),
  es: () => import('../../demos/ESDemo'),
  retrieval: () => import('../../demos/RetrievalDemo'),
  ocean: () => import('../../demos/OceanDemo'),
  orbit: () => import('../../demos/OrbitDemo'),
}
