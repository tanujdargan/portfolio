// Curated copy shared by every round-3 variant and the agent docs (scripts/agent-docs.mjs). Facts trace to public/resume.pdf (Aug 19 2026) or Tanuj's Phase 2 confirmations (return offer,
// ES-LoRA, Ocean/SOLIDS); see REQUIREMENTS.md §3 and RESEARCH_CLAIMS.md. Excluded on purpose: Parameter Golf,
// Hive, Drop, Wedding Studio, Hack@JBCNOsh.
import { experience } from './site'
import type { WorkKey } from './work'

export type Mark = 'amazon' | 'cfar' | 'mlh' | 'rbc' | 'uvic' | 'apart' | 'pearcare'

export const thesis = 'I ship production ML systems and study what language models represent inside.'
export const context = 'CS at the University of Victoria, graduating April 2027.'

export const proofs: { mark: Mark; org: string; line: string }[] = [
  { mark: 'amazon', org: 'Amazon Robotics', line: 'LLM planning assistant in production across 180+ fulfillment sites. Return offer.' },
  { mark: 'cfar', org: 'UVic CfAR', line: 'Led onboard-computer firmware for MarmotSat, now in orbit after a Falcon 9 launch.' },
  { mark: 'apart', org: 'Apart Research', line: 'Showed SFT loss masking decides whether a model voices shutdown distress.' },
]

export interface Item {
  id: string
  demo?: WorkKey
  slug?: string
  mark?: Mark
  title: string
  finding: string
  where: string
  when: string
  result: string
}

export const selected: Item[] = [
  {
    id: 'lossmask', demo: 'lossmask', slug: 'loss-masking-distress', mark: 'apart',
    title: 'Loss masking decides whether a model voices shutdown distress',
    finding: 'Assistant-only loss maximizes expressed distress; any user-turn loss restores a neutral register with no capability loss. Calm-sounding models still represent shutdown negatively.',
    where: 'Apart Research, Digital Minds sprint', when: 'Aug 2026', result: 'Output-based welfare signals are unreliable',
  },
  {
    id: 'steering', demo: 'steering', slug: 'activation-steering',
    title: 'Steering a language model along emotion directions',
    finding: 'Joy steering is a switch, not a dial: between +0.3 and +0.6‖h‖ the read-back projection jumps from −8.0 to +9.6.',
    where: 'Method replicated on Qwen2.5-1.5B-Instruct for this page', when: '2026', result: 'A sharp flip, not a gradient',
  },
  {
    id: 'amazon', mark: 'amazon',
    title: 'An LLM planning assistant in production at Amazon',
    finding: 'Built into Optimus, the labor-planning platform for 180+ fulfillment sites in North America and Europe. RAG over historical labor plans and site configs.',
    where: 'Amazon Robotics, SDE intern', when: 'May–Aug 2026', result: 'In production, with a return offer',
  },
  {
    id: 'orbit', demo: 'orbit', mark: 'cfar',
    title: 'Satellite firmware, now in orbit',
    finding: 'Led MarmotSat’s onboard-computer firmware in C and the TTC board design. A CI and hardware-in-the-loop pipeline cut testing from 180 minutes to 15.',
    where: 'UVic Centre for Aerospace Research', when: '2025–26', result: 'Launched July 2026, NORAD 69912',
  },
  {
    id: 'ocean', demo: 'ocean', slug: 'ocean-sensing', mark: 'uvic',
    title: 'Deep-water temperature from satellite imagery',
    finding: 'A multimodal model on Ocean Networks Canada sensors and satellite imagery, validated with the National Research Council Canada.',
    where: 'SOLIDS Lab, UVic', when: '2025', result: 'R² 0.936 against deep-water sensors',
  },
]

export const amazonMetrics = [
  { n: '180+', l: 'fulfillment sites in NA and EU' },
  { n: '60%+', l: 'cut in planner time-to-insight' },
  { n: '$136.2M', l: 'projected yearly savings' },
]

export const more: { title: string; line: string; href?: string; ext?: boolean }[] = [
  { title: 'Billion-vector search on GPUs', line: 'DEIA Lab, Prof. Sean Chester. A modified cuVS fork: 1–4M QPS at 90–95% recall, under 250 ms.', href: '/research/billion-vector-retrieval' },
  { title: 'Fine-tuning Qwen2.5-1.5B without gradients', line: 'Evolution strategies on a LoRA with a binary GSM8K reward. Adapter on Hugging Face.', href: '/research/es-lora' },
  { title: 'Optimate, Hack the North 2025', line: 'Two prizes from 300+ teams: YC Unicorn Prize and Federato Best RiskOps.', href: 'https://github.com/jruttan1/Optimate', ext: true },
  { title: 'Cut the Wire: collusion-probe ablations under controls', line: 'Apart Research, AI Collusion sprint, Oct 2026. In Signal Table, a steganographic betting game, most of the large effect of ablating collusion-probe directions decomposes into format damage and generic cost; a modest 8–15 point late-layer effect remains in Qwen2.5-7B. NARCBench’s steganography tier is separable by context length alone (AUROC 1.000).', href: 'https://apartresearch.com/sprints/projects/cut-the-wire-collusionprobe-ablation-effects-shrink-or-relocate-under-format-dose-and-placement-controls-10ps', ext: true },
  { title: 'Deleting hazardous knowledge from model weights', line: 'Independent research, Oct 2026. Deleting a 16-direction subspace from every layer of Gemma-2-2B keeps 72% of its WMDP-cyber forgetting against a LoRA relearning attack vs 13% for RMU and NPO (p = 0.0008); against full fine-tuning the edge disappears.' },
  { title: 'AIMO Progress Prize 2', line: 'Silver medal, top 10% of 2,200 teams, 54% accuracy on olympiad maths.' },
  { title: 'Beri', line: 'A food app I’m building for iOS.', href: 'https://getberi.com', ext: true },
]

const roleShort: Record<string, { role: string; org: string; mark: Mark; line: string }> = {
  'Amazon Robotics': { role: 'SDE Intern', org: 'Amazon Robotics', mark: 'amazon', line: 'LLM planning assistant shipped to production across 180+ fulfillment sites. Return offer.' },
  'RBC Borealis': { role: 'AI/ML Research Mentee', org: 'RBC Borealis', mark: 'rbc', line: 'Models flagging at-risk youth with chronic illness from 1,500+ longitudinal records.' },
  'Pear Care': { role: 'Lead AI Developer', org: 'Pear Care', mark: 'pearcare', line: 'Medical-AI agents across 1,000+ clinical specialties; quantized LoRA cut memory 40%.' },
  'DEIA Lab, UVic': { role: 'Undergraduate Researcher', org: 'DEIA Lab, UVic', mark: 'uvic', line: 'Billion-vector GPU search on a modified cuVS fork: 1–4M QPS at 90–95% recall.' },
  'MLH Fellowship · Apache Airflow': { role: 'SWE Fellow', org: 'MLH · Apache Airflow', mark: 'mlh', line: 'Docker-based IDE debugging for Airflow (50K+ stars): setup from hours to minutes.' },
  'UVic Centre for Aerospace Research': { role: 'Software Developer & Researcher', org: 'UVic CfAR', mark: 'cfar', line: 'Led MarmotSat’s flight firmware in C; CI/HIL cut testing from 180 min to 15.' },
}
// Reverse chronological by start date (REQUIREMENTS §3.4).
const order = ['Amazon Robotics', 'RBC Borealis', 'Pear Care', 'DEIA Lab, UVic', 'MLH Fellowship · Apache Airflow', 'UVic Centre for Aerospace Research']
const dates: Record<string, string> = {
  'Amazon Robotics': 'May–Aug 2026', 'RBC Borealis': 'Mar–May 2026', 'Pear Care': 'Jul 2025 – Apr 2026',
  'DEIA Lab, UVic': 'May 2025 – Feb 2026', 'MLH Fellowship · Apache Airflow': 'May–Aug 2025', 'UVic Centre for Aerospace Research': 'Apr 2025 – Apr 2026',
}
export const roles = order.map((k) => {
  const e = experience.find((x) => x.org === k)!
  return { ...roleShort[k], when: dates[k], bullets: e.bullets }
})

export const education = { school: 'University of Victoria', degree: 'B.S. Computer Science (accelerated, 3 years)', when: 'April 2027', note: 'International Scholarship' }
