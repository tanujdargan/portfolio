/*
 * P4 copy: shorter lines written from the facts in src/content/site.ts (nothing here is new information).
 * Every default-visible card stays under 25 words; the long versions sit behind a tap.
 * \u2060 (word joiner) keeps ranges like 1–4M from breaking at the dash on narrow phones.
 */
import type { OrgKey } from '../../shared/OrgLogo'
import type { DemoKey } from '../../content/site'

export const line = 'I ship ML systems and study what language models do on the inside.'

/** Experience rows: short role and one line, keyed by the org tile. Bullets and metric come from site.ts. */
export const work: Partial<Record<OrgKey, { org: string; role: string; line: string }>> = {
  amazon: { org: 'Amazon Robotics', role: 'SDE intern', line: 'An LLM planning assistant, shipped to 180+ fulfillment sites. Return offer.' },
  rbc: { org: 'RBC Borealis', role: 'ML research mentee', line: 'Models that flag at-risk youth with chronic illness from 1,500+ records.' },
  cfar: { org: 'UVic Centre for Aerospace Research', role: 'Software developer', line: 'Led the onboard-computer firmware for MarmotSat, now in orbit.' },
  uvic: { org: 'DEIA Lab, UVic', role: 'Researcher', line: 'GPU vector search on a cuVS fork: 1–\u20604M QPS at billion-vector scale.' },
  pearcare: { org: 'Pear Care', role: 'Lead AI developer', line: 'Medical-AI agents across 1,000+ clinical specialties.' },
  mlh: { org: 'MLH Fellowship', role: 'Apache Airflow fellow', line: 'Docker-based IDE debugging for Airflow: setup-to-debug from hours to minutes.' },
}

export interface Item {
  slug: string
  demo: Exclude<DemoKey, null>
  title: string
  hook: string
  meta: string
}

/** Research, in reading order. The first two run inline; the rest mount on tap. */
export const featured: Item[] = [
  { slug: 'activation-steering', demo: 'steering', title: 'Steering with emotion vectors', hook: 'Add a joy direction to Qwen2.5-1.5B and watch the reply flip.', meta: 'Independent · 2026' },
  { slug: 'loss-masking-distress', demo: 'lossmask', title: 'Loss masking and shutdown distress', hook: 'Where the SFT loss lands sets how loudly a model voices distress.', meta: 'Apart Research · Aug 2026' },
]
export const more: Item[] = [
  { slug: 'es-lora', demo: 'es', title: 'Fine-tuning without gradients', hook: 'Evolution strategies on LoRA weights, scored only right or wrong on GSM8K.', meta: 'Independent · May 2026' },
  { slug: 'billion-vector-retrieval', demo: 'retrieval', title: 'Billion-vector search on GPUs', hook: '1–\u20604M queries a second at 90–\u206095% recall, across 8+ GPUs.', meta: 'DEIA Lab · 2025–26' },
  { slug: 'ocean-sensing', demo: 'ocean', title: 'Deep-water temperature from satellites', hook: 'A multimodal model validated with NRC Canada. R² = 0.936.', meta: 'SOLIDS Lab · 2025' },
]

/** Smaller things, one line each. */
export const also = [
  { title: 'Homelab', line: 'Nix on Proxmox: GPU serving, CI runners, 15+ services.', href: 'https://github.com/tanujdargan/nixos' },
  { title: 'Optimate', line: 'Hack the North 2025: two prizes from 300+ teams.', href: 'https://github.com/jruttan1/Optimate' },
  { title: 'AIMO Prize 2', line: 'Kaggle silver, top 10% of 2,200.' },
  { title: 'Drop', line: 'AirDrop without the Apple, in Rust and WebRTC.', href: 'https://github.com/tanujdargan/drop' },
]
