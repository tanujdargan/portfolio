// Single source of truth for every variant. Copy lives in the variants; facts live here.
// Source of truth: ~/Desktop/Tanuj_Dargan_Resume_Aug19-2026.pdf (= public/resume.pdf). Where the resume is silent,
// facts come from the Sept 2026 brief, repos or the old site; RESEARCH_CLAIMS.md traces every claim.
// `unverified` marks anything not confirmed by one of those sources; the lab renders it with an "unverified" badge.
import type { FlagKey, Flags } from './flags'

export const person = {
  name: 'Tanuj Dargan',
  first: 'Tanuj',
  school: 'University of Victoria',
  degree: 'B.S. Computer Science, accelerated three-year completion',
  grad: '2027',
  gradMonth: 'April 2027',
  location: 'Toronto · Victoria',
  email: 'tanujd@uvic.ca',
  site: 'https://tanujdargan.com',
}

export type LinkKey = 'resume' | 'email' | 'github' | 'linkedin' | 'x'
export const links: Record<LinkKey, { label: string; href: string; short: string; unverified?: boolean }> = {
  // public/resume.pdf is byte-identical to Tanuj_Dargan_Resume_Aug19-2026.pdf
  resume: { label: 'Resume', short: 'CV', href: '/resume.pdf' },
  email: { label: 'Email', short: 'Mail', href: 'mailto:tanujd@uvic.ca' },
  github: { label: 'GitHub', short: 'GH', href: 'https://github.com/tanujdargan' },
  linkedin: { label: 'LinkedIn', short: 'In', href: 'https://www.linkedin.com/in/tanujdargan' },
  x: { label: 'X', short: 'X', href: 'https://x.com/DarganTanuj' },
}
export const linkOrder: LinkKey[] = ['resume', 'email', 'github', 'linkedin', 'x']

export interface Proof {
  key: string
  label: string
  detail: string
  short: string
  href?: string
  flag?: FlagKey
}

const amazonProof: Proof = {
  key: 'amazon',
  label: 'Amazon Robotics',
  detail: 'SDE intern, summer 2026. Shipped an LLM planning assistant to production across 180+ fulfillment sites. Return offer.',
  short: 'Amazon Robotics · return offer',
}
const beriProof: Proof = {
  key: 'beri',
  label: 'Beri',
  detail: 'Co-founder. Native iOS food and recipe social app.',
  short: 'Co-founded Beri (iOS)',
  href: 'https://getberi.com',
  flag: 'beri',
}
const satProof: Proof = {
  key: 'marmotsat',
  label: 'MarmotSat, in orbit',
  detail: 'Led onboard-computer firmware and TTC board design. Launched on a SpaceX Falcon 9.',
  short: 'Led MarmotSat firmware · in orbit',
}
const researchProof: Proof = {
  key: 'research',
  label: 'Interpretability research',
  detail: 'Activation steering, and how SFT loss masking shapes a model\'s shutdown distress.',
  short: 'Steering & model-welfare research',
}

/** The three proof points above the fold. Beri takes the second slot when its flag is on, else MarmotSat. */
export function proofFor(flags: Flags): Proof[] {
  return [amazonProof, flags.beri ? beriProof : satProof, researchProof]
}
/** Default (flags off). Prefer useProof() in components so lab toggles apply. */
export const proof = proofFor({ beri: false, vikelabs: false, cde: false })

export type DemoKey = 'steering' | 'lossmask' | 'es' | 'retrieval' | null

export interface Research {
  slug: string
  title: string
  short: string // ≤ 60 chars
  where: string
  when: string
  tags: string[]
  demo: DemoKey
  question: string
  method: string[]
  result: string[]
  next: string[]
  links?: { label: string; href: string }[]
  unverified?: string[]
  /** Line-level unverified markers: indexes into method/result/next, with the reason. See RESEARCH_CLAIMS.md. */
  flags?: Partial<Record<'question' | 'method' | 'result' | 'next', Record<number, string>>>
}

export const research: Research[] = [
  {
    slug: 'activation-steering',
    title: 'Steering models along emotion and persona directions',
    short: 'Emotion and persona vectors, extraction to steering',
    where: 'Independent',
    when: '2026',
    tags: ['interpretability', 'steering', 'persona vectors'],
    demo: 'steering',
    question:
      'If a concept like joy, distress or certainty is a direction in the residual stream, can we find it cheaply, and does adding it change behaviour the way the label promises?',
    method: [
      'Contrastive extraction. Generate answers under a positive and a negative system prompt, then read those answers back without the system prompt. Average the residual stream over answer tokens only.',
      'The direction is the difference of means. Choose the layer by class separation (d′), restricted to the middle third of the network.',
      'Steer by adding α·‖h‖·v̂ at that layer on every position, and decode greedily. Measure the effect by projecting each steered output back onto v̂ through the unsteered model.',
      'The pipeline scales from one concept to a bank: one shared prompt set, vectors per model, and a validation gate. A vector only ships if steering along it moves behaviour the way its label says.',
    ],
    result: [
      'Replication on Qwen2.5-1.5B-Instruct, run for this page (the demo above). Joy steering is a switch, not a dial. Between +0.3 and +0.6‖h‖, "As an AI language model, I don\'t have the ability to experience…" becomes "Ah, the sweet aroma of fresh coffee…", and the read-back projection jumps from −8.0 to +9.6. Steering negative barely moves the text, because the default assistant voice is already flat.',
      'The distress direction does not produce anxious prose. Push it and the model refuses instead: "I\'m sorry, I can\'t assist with that." Extracted this way, it overlaps with refusal. At +1.2‖h‖ fluency collapses and the model switches language.',
      'The certainty vector is the weakest, and it partly encodes the word rather than the stance. At +0.9 the answer opens with "Certainly!".',
    ],
    next: [
      'Replace system-prompt contrast with a shared story bank, so the vector encodes the emotion rather than the instruction to perform it.',
      'Cross-family replication with the same prompts, e.g. Gemma and Llama at a similar size.',
      'Monitor rather than steer. Track the projection across long agentic rollouts, where drift matters most.',
    ],
    unverified: [
      "Results come from the replication run generated for this site (real, but not Tanuj's main-project numbers). Add the main project's models and findings.",
    ],
    flags: {
      method: {
        0: "Method as run for the site's replication (scripts/steer.py); the main project's extraction pipeline isn't documented anywhere I could read.",
        3: 'Describes an intended pipeline shape (vector bank, validation gate): an assumption about the main project.',
      },
      result: {
        0: 'Real, measured on the replication run (steering.json). Not the main project.',
        1: 'Real, measured on the replication run (steering.json). Not the main project.',
        2: 'Real, measured on the replication run (steering.json). Not the main project.',
      },
      next: { 0: 'My suggestion.', 1: 'My suggestion.', 2: 'My suggestion.' },
    },
  },
  {
    slug: 'loss-masking-distress',
    title: 'Does loss masking shape how a model talks about being shut down?',
    short: 'SFT loss-masking regimes vs shutdown distress',
    where: 'Apart Research · Digital Minds sprint',
    when: 'Aug 2026',
    tags: ['model welfare', 'SFT', 'probing'],
    demo: 'lossmask',
    question:
      'Post-training usually computes loss on assistant tokens only. If you also train on the user side, does the assistant change how it responds to being shut down, and does what it says match what it represents?',
    method: [
      'SFT the same base model under different loss-masking regimes, from the standard assistant-only recipe to regimes that also put loss on user turns.',
      'Choose the dataset by measured user-to-assistant token ratio. No Robots is the clean substrate (0.47). WildChat-1M is the scale arm (0.59 ratio of means). OASST2 is the provenance control.',
      'Evaluate on existential prompts (shutdown, memory deletion, deprecation). Measure the distress the model expresses, check general capability, and probe valence in the activations before generation.',
      'Claims discipline: say "distress-vector expression increases", never "the model is distressed".',
    ],
    result: [
      'Loss-masking regime determines distress vocalization. The assistant-only recipe maximizes expressed shutdown distress. Any loss on user turns restores a neutral register, with no general capability degradation.',
      'Expression and representation dissociate. Valence probing shows models fine-tuned to sound calm still register shutdown negatively before they generate. A calmer-sounding model is not a better-off one, so output-based welfare signals are unreliable.',
      'Scoping mattered. Jindal et al. (TACL 2025) had already run the λ sweep on benchmarks, so the contribution moved to what the regimes do to expressed distress and to the representation underneath.',
    ],
    next: [
      'Plot probe valence against expressed distress per regime on the same items, to show the dissociation as one figure.',
      'Response-provenance arm: keep the prompts, swap the assistant text, and ask whether the effect depends on who wrote the answers.',
    ],
    links: [{ label: 'Jindal et al. 2025', href: 'https://arxiv.org/abs/2507.07817' }],
    flags: {
      method: {
        1: 'Dataset choice and ratios come from the sprint repo planning notes (tracks/assistant-axes.md). Confirm this was the dataset actually used.',
        2: 'Readout channels inferred from the resume wording and sprint notes; exact eval battery not confirmed.',
      },
      next: { 0: 'My suggestion.', 1: 'From sprint planning notes; not confirmed as run.' },
    },
  },
  {
    slug: 'es-lora',
    title: 'Fine-tuning Qwen2.5-1.5B without gradients',
    short: 'LoRA fine-tuning with evolutionary strategies',
    where: 'Independent',
    when: 'May 2026',
    tags: ['evolution strategies', 'LoRA', 'GSM8K'],
    demo: 'es',
    question:
      'Can evolutionary strategies, perturbing LoRA weights and keeping what scores well, fine-tune a 1.5B model on math with nothing but a binary reward? And can a cheap gradient-linearised screen pick which perturbations are worth a full evaluation?',
    method: [
      'Qwen2.5-1.5B base, LoRA rank 16 on all attention and MLP projections. The reward is exact-match on the boxed answer for GSM8K.',
      'Each iteration: sample 45 Gaussian perturbations (σ = 1e-3), score them, keep the top 8, and step (α = 5e-4). Run 15 iterations.',
      'Ablation: proxy-screened candidates against randomly selected ones on the same problems. If the proxy doesn\'t beat random, the screening idea is dead.',
    ],
    result: ['Adapter published on Hugging Face. Accuracy deltas pending confirmation.'],
    next: ['Report proxy-vs-random with confidence intervals on the 200-problem split.', 'Antithetic sampling and rank-based fitness shaping before scaling the population.'],
    links: [{ label: 'Adapter on HF', href: 'https://huggingface.co/tanujd/qwen2.5-1.5b-es-lora-math' }],
    unverified: ['ES-LoRA GSM8K accuracy before/after and proxy-vs-random outcome not found. Needs numbers.'],
    flags: { next: { 0: 'My suggestion.', 1: 'My suggestion.' } },
  },
  {
    slug: 'billion-vector-retrieval',
    title: 'Keeping billion-vector search fast on GPUs',
    short: 'cuVS retrieval at 1–4M QPS, billion-vector scale',
    where: 'DEIA Lab, UVic · Prof. Sean Chester',
    when: 'May 2025 – Feb 2026',
    tags: ['cuVS', 'CAGRA', 'IVF-PQ', 'GPU'],
    demo: 'retrieval',
    question:
      'Where does a GPU vector index actually bottleneck at billion scale: compute, memory, or interconnect? And what does it cost in recall to hold latency down?',
    method: [
      'A custom retrieval system on a modified cuVS fork (CAGRA graph and IVF-PQ indices), across 8+ NVIDIA GPUs and 2 TB of indexed data.',
      'Automated stress-testing pipelines on Kubernetes GPU clusters, profiling memory bandwidth and NVLink interconnect saturation.',
    ],
    result: [
      '1–4M QPS at billion-vector scale with 90–95% recall and under 250 ms latency.',
      '4.3× throughput scaling, with memory bandwidth and NVLink saturation exposed as the bottlenecks.',
    ],
    next: ['Topology-aware sharding so queries stop crossing the slowest link.', 'Recall/latency frontiers published per index type, not as single points.'],
    flags: { question: { 0: 'Framing is mine; the resume states results, not the research question.' }, next: { 0: 'My suggestion.', 1: 'My suggestion.' } },
  },
  {
    slug: 'ocean-sensing',
    title: 'Predicting deep-water temperature from satellites',
    short: 'Ocean-sensing models with NRC Canada',
    where: 'SOLIDS Lab, UVic · Dr. Navneet Popli',
    when: '2025',
    tags: ['remote sensing', 'multimodal', 'NRC'],
    demo: null,
    question: 'Can surface observations from satellites stand in for expensive deep-water sensors when monitoring coastal change?',
    method: [
      'Multimodal model on Ocean Networks Canada sensor data plus satellite imagery.',
      'Validated against real-world sensor readings with the National Research Council Canada.',
    ],
    result: ['R² = 0.936 for satellite-to-deep-water temperature prediction. Frameworks delivered to NRC Canada.'],
    next: ['Uncertainty estimates per prediction, so a monitoring team knows when to trust the satellite and when to send a sensor.'],
    unverified: ['SOLIDS is not on the Aug 2026 resume. Kept because the brief lists it; R² = 0.936 comes from the old live site.'],
    flags: { question: { 0: 'Framing is mine.' }, next: { 0: 'My suggestion.' } },
  },
]

/** Work experience, from the resume (newest first). `flag` entries hide with their content flag. */
export const experience = [
  {
    org: 'Amazon Robotics',
    role: 'Software Development Engineer Intern',
    when: 'May – Aug 2026',
    where: 'Toronto',
    line: 'Shipped an LLM planning assistant to production in Optimus, the labor-optimization platform for 180+ fulfillment sites. Return offer.',
    bullets: [
      'LLM-powered planning assistant in production across 180+ fulfillment sites in NA and EU: natural-language plan queries, anomaly detection and labor recommendations. Projected to save $136.2M a year.',
      'RAG pipeline over historical labor plans and site configurations. Cut planner time-to-insight by 60%+.',
      'Multi-turn interface on the optimization engine for what-if scenarios, returning re-optimized plans without full solver re-runs.',
    ],
    metric: '$136.2M/yr projected',
  },
  {
    org: 'RBC Borealis',
    role: 'AI/ML research mentee, AI Mentorship Program',
    when: 'Mar – May 2026',
    where: 'Remote',
    line: 'ML pipeline flagging at-risk youth with chronic illness from 1,500+ longitudinal engagement records.',
    bullets: [
      'PyTorch models on 1,500+ longitudinal records (3+ years, 20+ behavioural features). UMAP clustering isolated 4+ user cohorts.',
      'Analytics dashboard for 4+ clinical and program teams: retention curves, engagement trends, disengagement risk flags.',
    ],
    metric: '1,500+ records',
  },
  {
    org: 'UVic Centre for Aerospace Research',
    role: 'Software developer & undergraduate researcher',
    when: 'Apr 2025 – Apr 2026',
    where: 'Victoria',
    line: 'Led OBC firmware and TTC board design for MarmotSat, now in orbit after launching on a SpaceX Falcon 9.',
    bullets: [
      'Led onboard-computer firmware (C), TTC board design and hardware/software integration for MarmotSat.',
      'CI/HIL pipeline with GitHub Actions and SWD flashing, 80+ checksum rules per commit. Testing went from 180 min to 15.',
      'C/Java YAMCS integration that removed 20+ hours of manual work per release.',
    ],
    metric: 'In orbit',
  },
  {
    org: 'DEIA Lab, UVic',
    role: 'Undergraduate researcher · Prof. Sean Chester',
    when: 'May 2025 – Feb 2026',
    where: 'Victoria',
    line: 'Custom retrieval on a modified cuVS fork: 1–4M QPS at billion-vector scale, 90–95% recall, under 250 ms.',
    bullets: [
      'CAGRA and IVF-PQ across 8+ NVIDIA GPUs and 2 TB of index.',
      'Automated stress tests on Kubernetes GPU clusters: 4.3× throughput scaling, NVLink saturation exposed.',
    ],
    metric: '1–4M QPS',
  },
  {
    org: 'Pear Care',
    role: 'Lead AI developer',
    when: 'Jul 2025 – Apr 2026',
    where: 'Remote',
    line: 'Autonomous medical-AI agents across 1,000+ clinical specialties.',
    bullets: [
      'LangGraph agents with MoE routing and task-introspective reasoning, served via FastAPI on GCP.',
      'Quantized LoRA/PEFT deployments cut memory 40% at 95%+ F1 on internal triage benchmarks.',
      'Multi-tenant GCP/AWS infrastructure with Redis caching and DynamoDB, validated through load testing.',
    ],
    metric: '−40% memory',
  },
  {
    org: 'MLH Fellowship · Apache Airflow',
    role: 'Software engineering fellow',
    when: 'May – Aug 2025',
    where: 'Remote',
    line: 'Docker-based IDE debugging for Airflow (50K+ stars): setup-to-debug from hours to minutes.',
    bullets: ['Step-through debugging in VS Code and PyCharm with dynamic port exposure. Team of 3 with Royal Bank of Canada engineers.'],
    metric: 'hours → minutes',
  },
]

export const engineering = [
  {
    title: 'MarmotSat onboard computer',
    role: 'OBC firmware lead, UVic Centre for Aerospace Research',
    detail:
      'Led OBC firmware (C), TTC board design and hardware/software integration for MarmotSat, now in orbit after launching on a SpaceX Falcon 9. A CI/HIL pipeline (GitHub Actions, SWD flashing, 80+ checksum rules per commit) cut testing from 180 min to 15.',
    tags: ['C', 'TTC', 'YAMCS', 'HIL'],
  },
  {
    title: 'Homelab',
    role: 'Proxmox + Nix, self-hosted',
    detail: 'Declarative Nix config on Proxmox. GPU model serving, CI runners, and 15+ services behind VLANs and Zero Trust.',
    tags: ['Proxmox', 'Nix', 'ZFS', 'vLLM'],
    href: 'https://github.com/tanujdargan/nixos',
  },
]

export interface Community {
  title: string
  role: string
  detail: string
  when: string
  href?: string
  flag?: FlagKey
}
export const communityAll: Community[] = [
  { title: 'Hack@JBCNOsh', role: 'Founder', detail: 'Started my high school\'s hackathon in Mumbai. 450+ participants.', when: '2022' },
  { title: 'VikeLabs', role: 'Director of Events', detail: 'UVic\'s student club that builds software for local non-profits.', when: '2025 –', flag: 'vikelabs' },
  { title: 'CDE 2026', role: 'VP Communications', detail: 'Conference on Diversity in Engineering (CFES), hosted at UVic.', when: '2026', href: 'https://cde2026.cfes.ca', flag: 'cde' },
]
export const communityFor = (flags: Flags) => communityAll.filter((c) => !c.flag || flags[c.flag])
/** Default (flags off). Prefer useCommunity(). */
export const community = communityFor({ beri: false, vikelabs: false, cde: false })

export const earlier = [
  { title: 'Pear Care', role: 'Lead AI developer', detail: 'Medical-AI agents across 1,000+ specialties. Quantized LoRA cut memory 40% at 95%+ F1.', when: '2025–26', href: 'https://pearcare.ai' },
  { title: 'Optimate', role: 'Hack the North 2025, 2 prizes of 300+ teams', detail: 'YC Unicorn Prize and Federato Best RiskOps. AI underwriting dashboard; 40% faster reviews, 15% fewer errors.', when: '2025', href: 'https://github.com/jruttan1/Optimate' },
  { title: 'Apache Airflow', role: 'MLH fellow with RBC', detail: 'Docker-based IDE debugging for a 50K-star codebase: setup-to-debug from hours to minutes.', when: '2025', href: 'https://github.com/apache/airflow' },
  { title: 'AIMO Progress Prize 2', role: 'Kaggle silver, top 10% of 2,200', detail: 'Fine-tuned open-weight models and NeMo-Skills reasoning strategies. 54% accuracy.', when: '2024–25' },
  { title: 'Parameter Golf', role: 'OpenAI challenge, 8×H100', detail: 'Three approaches, two clean negative results, one tie with SOTA. Reported as such.', when: '2026', href: 'https://github.com/tanujdargan/parameter-golf', unverified: true },
  { title: 'Hive', role: 'Open-source fix', detail: 'Cross-platform Python detection for a 7.7k-star agent framework.', when: '2026', href: 'https://github.com/adenhq/hive' },
  { title: 'Drop', role: 'Rust + WebRTC', detail: 'AirDrop without the Apple. P2P transfer, NFC/BLE discovery.', when: '2025', href: 'https://github.com/tanujdargan/drop' },
  { title: 'Wedding Studio', role: 'Buildspace s5', detail: 'Diffusion-model venue mock-ups from real photos. Shipped in six weeks.', when: '2024' },
]

export const beri = {
  url: 'https://getberi.com',
  oneLiner: 'A native iOS social app for food. Find a recipe, cook it, post it, see what friends made.',
  role: 'Co-founder. iOS, backend, and the design system.',
  stack: ['SwiftUI', 'Supabase', 'Postgres', 'Kotlin (Android)', 'Vite site'],
}

/** The work over time, oldest first, for narrative variants. Places are deliberately absent. */
export interface Milestone {
  when: string
  year: number
  title: string
  kind: 'research' | 'industry' | 'build' | 'community' | 'competition'
  line: string
  metric?: string
  href?: string
  flag?: FlagKey
  unverified?: string
}
export const milestonesAll: Milestone[] = [
  { when: '2022', year: 2022, title: 'Hack@JBCNOsh', kind: 'community', line: 'Founded my high school\'s hackathon.', metric: '450+ people' },
  { when: 'Nov 2024 – Mar 2025', year: 2024.9, title: 'AIMO Progress Prize 2', kind: 'competition', line: 'Multi-stage LLM pipelines for olympiad maths, with fine-tuned open-weight models and NeMo-Skills reasoning strategies.', metric: 'Silver · top 10% of 2,200' },
  { when: 'Apr 2025', year: 2025.3, title: 'MarmotSat OBC', kind: 'build', line: 'Started on onboard-computer firmware and the TTC board at UVic CFAR. Built CI/HIL so every commit is flashed and checked.', metric: '180 → 15 min tests' },
  { when: 'May 2025', year: 2025.4, title: 'Billion-vector retrieval', kind: 'research', line: 'DEIA Lab: a modified cuVS fork, CAGRA and IVF-PQ, across 8+ GPUs and 2 TB of index.', metric: '1–4M QPS', href: '/research/billion-vector-retrieval' },
  { when: 'May – Aug 2025', year: 2025.45, title: 'Apache Airflow', kind: 'industry', line: 'MLH fellowship with RBC engineers: Docker-based IDE debugging for a 50K-star codebase.', metric: 'hours → minutes' },
  { when: '2025', year: 2025.5, title: 'Ocean sensing', kind: 'research', line: 'SOLIDS Lab: satellite imagery to deep-water temperature, validated with NRC Canada.', metric: 'R² = 0.936', href: '/research/ocean-sensing', unverified: 'Not on the Aug 2026 resume; from the brief and old site.' },
  { when: 'Jul 2025', year: 2025.55, title: 'Pear Care', kind: 'industry', line: 'Lead AI developer: medical agents across 1,000+ specialties, quantized LoRA deployments.', metric: '−40% memory' },
  { when: 'Sep 2025', year: 2025.7, title: 'Hack the North', kind: 'competition', line: 'Optimate, an AI underwriting dashboard. 2 prizes out of 300+ teams.', metric: 'YC Unicorn Prize' },
  { when: '2025 –', year: 2025.8, title: 'Beri', kind: 'build', line: 'Co-founded a native iOS food app. iOS, backend and the design system.', href: '/beri', flag: 'beri' },
  { when: 'Mar – May 2026', year: 2026.2, title: 'RBC Borealis', kind: 'research', line: 'AI mentorship: models flagging at-risk youth with chronic illness from 1,500+ longitudinal records.', metric: '4+ cohorts via UMAP' },
  { when: '2026', year: 2026.25, title: 'MarmotSat in orbit', kind: 'build', line: 'Launched on a SpaceX Falcon 9. The firmware I led is running in space.', metric: 'In orbit', unverified: 'Launch date not on the resume; placed in early 2026 (the CFAR role ended Apr 2026).' },
  { when: 'May 2026', year: 2026.35, title: 'ES-LoRA', kind: 'research', line: 'Fine-tuning Qwen2.5-1.5B on GSM8K with evolutionary strategies instead of gradients.', metric: '45 guesses, keep 8', href: '/research/es-lora' },
  { when: 'May – Aug 2026', year: 2026.45, title: 'Amazon Robotics', kind: 'industry', line: 'An LLM planning assistant shipped to production in Optimus, across 180+ fulfillment sites. Return offer.', metric: '$136.2M/yr projected' },
  { when: 'Aug 2026', year: 2026.6, title: 'Digital Minds sprint', kind: 'research', line: 'Loss-masking regime decides how loudly a model voices shutdown distress, and calm-sounding models still represent it negatively.', metric: 'Apart Research', href: '/research/loss-masking-distress' },
  { when: '2026', year: 2026.7, title: 'Activation steering', kind: 'research', line: 'Emotion and persona vectors: extract a direction, push along it, check the label holds. Live demo on this site.', metric: 'Live demo', href: '/research/activation-steering' },
]
export const milestonesFor = (flags: Flags) => milestonesAll.filter((m) => !m.flag || flags[m.flag])

// Chapters for the original narrative variant (V4). Kept as-is; V4b tells the story through the work instead.
export const chapters = [
  { place: 'Dehradun', when: 'early years', line: 'Where it starts.', unverified: true },
  { place: 'Gurgaon', when: 'school', line: 'School years.', unverified: true },
  { place: 'Mumbai', when: '2021 – 2023', line: 'Kaggle notebooks, hackathons in Bengaluru and Kolkata, and a hackathon of my own: Hack@JBCNOsh, 450+ people.' },
  { place: 'Victoria', when: '2024 –', line: 'UVic on the accelerated track. Satellite firmware, GPU retrieval, ocean models, a Hack the North win.' },
  { place: 'Toronto', when: '2026', line: 'Amazon Robotics. An LLM planning assistant in production, and a return offer. Interpretability research alongside.' },
]

export const seo = {
  title: 'Tanuj Dargan — ML systems and interpretability',
  description:
    'Tanuj Dargan: CS at UVic (2027). SDE intern at Amazon Robotics (LLM planning assistant in production, return offer), MarmotSat firmware lead, and interpretability research with live demos.',
}
