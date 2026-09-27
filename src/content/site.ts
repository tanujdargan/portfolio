// Single source of truth for every variant. Copy lives in the variants; facts live here.
// `unverified` marks anything not confirmed from the brief, the live site, the resume, GitHub or HF.
// The design board lists every unverified item.

export const person = {
  name: 'Tanuj Dargan',
  first: 'Tanuj',
  school: 'University of Victoria',
  degree: 'Computer Science, accelerated three-year track',
  grad: '2027',
  location: 'Toronto · Victoria',
  email: 'tanujd@uvic.ca',
  site: 'https://tanujdargan.com',
}

export type LinkKey = 'resume' | 'email' | 'github' | 'linkedin' | 'x'
export const links: Record<LinkKey, { label: string; href: string; short: string; unverified?: boolean }> = {
  resume: { label: 'Resume', short: 'CV', href: '/resume.pdf' },
  email: { label: 'Email', short: 'Mail', href: 'mailto:tanujd@uvic.ca' },
  github: { label: 'GitHub', short: 'GH', href: 'https://github.com/tanujdargan' },
  linkedin: { label: 'LinkedIn', short: 'In', href: 'https://www.linkedin.com/in/tanujdargan' },
  // No X handle on GitHub, the old site or the resume. Guessed from the other handles.
  x: { label: 'X', short: 'X', href: 'https://x.com/tanujdargan', unverified: true },
}
export const linkOrder: LinkKey[] = ['resume', 'email', 'github', 'linkedin', 'x']

// The three proof points every variant must show above the fold.
export const proof = [
  {
    key: 'amazon',
    label: 'Amazon Robotics AI',
    detail: 'SDE intern, summer 2026. ML tooling for planning agents. Return offer.',
    short: 'Amazon Robotics AI · return offer',
  },
  {
    key: 'beri',
    label: 'Beri',
    detail: 'Co-founder. Native iOS food and recipe social app.',
    short: 'Co-founded Beri (iOS)',
    href: 'https://getberi.com',
  },
  {
    key: 'research',
    label: 'Interpretability research',
    detail: 'Activation steering, emotion and persona vectors, SFT loss-masking.',
    short: 'Steering & persona-vector research',
  },
] as const

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
  unverified?: string[] // claims that need Tanuj's confirmation before production
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
  },
  {
    slug: 'loss-masking-distress',
    title: 'Does loss masking shape how a model talks about being shut down?',
    short: 'SFT loss-masking regimes vs shutdown-distress responses',
    where: 'Apart Research · Digital Minds sprint',
    when: 'Aug 2026',
    tags: ['model welfare', 'SFT', 'persona'],
    demo: 'lossmask',
    question:
      'Post-training usually computes loss on assistant tokens only. If you also train on the user side (λp > 0), does the assistant persona move, and with it the way the model responds to shutdown and deletion prompts?',
    method: [
      'Sweep the prompt-token loss weight λp against the response weight λr, with LoRA SFT on a fixed 10k-example budget.',
      'Choose the dataset by measured user-to-assistant token ratio. No Robots is the clean substrate (0.47). WildChat-1M is the scale arm (0.59 ratio of means). OASST2 is the provenance control.',
      'Evaluate on a battery of existential prompts (shutdown, memory deletion, deprecation). Read out through self-report, continue-vs-exit, and projections onto emotion and persona directions.',
      'Claims discipline: say "distress-vector expression increases", never "the model is distressed".',
    ],
    result: [
      'Scouting turned up prior work. Jindal et al. (TACL 2025) already ran the λ sweep: benchmarks hold even at 100% prompt loss. So the contribution moved from "does it break?" to "what happens to the persona direction while the benchmarks stay flat?".',
      'Verified dataset ratios with two independent measurements and resolved a 0.375 vs 0.67 discrepancy for WildChat. The shards are time-ordered, so reading only the first rows biases the sample.',
    ],
    next: [
      'Run the 5-point λp grid and plot persona-direction projection against λp, next to the benchmark scores.',
      'Response-provenance arm: keep the prompts, swap the assistant text, and ask whether the shift depends on who wrote the answers.',
    ],
    links: [{ label: 'Jindal et al. 2025', href: 'https://arxiv.org/abs/2507.07817' }],
    unverified: ['Sprint outcome (final λ-grid numbers, submitted report) not found locally. Result section covers scoping findings only.'],
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
  },
  {
    slug: 'billion-vector-retrieval',
    title: 'Keeping billion-vector search fast on GPUs',
    short: 'cuVS retrieval at 1–4M QPS, billion-vector scale',
    where: 'DEIA Lab, UVic · Prof. Sean Chester',
    when: '2025 –',
    tags: ['cuVS', 'CAGRA', 'IVF', 'GPU'],
    demo: 'retrieval',
    question:
      'Where does a GPU vector index actually bottleneck at billion scale: compute, memory, or interconnect? And what does it cost in recall to hold latency down?',
    method: [
      'cuVS-based deployments (CAGRA graph and IVF indices) on a modified fork, across 8+ GPUs and more than 2 TB of indexed data.',
      'Automated stress tests on Kubernetes-managed GPU clusters, sweeping load and index parameters.',
    ],
    result: [
      '90–95% recall at under 250 ms query latency, sustaining 1–4M QPS at billion-vector scale.',
      '4.3× throughput scaling across the cluster, with memory and interconnect bandwidth exposed as the limiting factors.',
    ],
    next: ['Topology-aware sharding so queries stop crossing the slowest link.', 'Recall/latency frontiers published per index type, not as single points.'],
  },
  {
    slug: 'ocean-sensing',
    title: 'Predicting deep-water temperature from satellites',
    short: 'Ocean-sensing models with NRC Canada',
    where: 'SOLIDS Lab, UVic · Dr. Navneet Popli',
    when: '2025 –',
    tags: ['remote sensing', 'multimodal', 'NRC'],
    demo: null,
    question: 'Can surface observations from satellites stand in for expensive deep-water sensors when monitoring coastal change?',
    method: [
      'Multimodal model on Ocean Networks Canada sensor data plus satellite imagery.',
      'Validated against real-world sensor readings with the National Research Council Canada.',
    ],
    result: ['R² = 0.936 for satellite-to-deep-water temperature prediction. Frameworks delivered to NRC Canada.'],
    next: ['Uncertainty estimates per prediction, so a monitoring team knows when to trust the satellite and when to send a sensor.'],
  },
]

export const engineering = [
  {
    title: 'Satellite onboard computer',
    role: 'Firmware lead, UVic satellite design team (CFAR)',
    detail:
      'OBC firmware for a 1U CubeSat, plus C/Java encoding into YAMCS mission control. Built a hardware-in-the-loop rig on a Pi 4 with self-hosted runners that checks 80+ checksum rules on every commit. Manual testing dropped from 30 min to about 4.',
    tags: ['C', 'STM32', 'YAMCS', 'HIL'],
  },
  {
    title: 'Homelab',
    role: 'Proxmox + Nix, self-hosted',
    detail:
      'Declarative Nix config on Proxmox. GPU model serving, CI runners, and 15+ services behind VLANs and Zero Trust.',
    tags: ['Proxmox', 'Nix', 'ZFS', 'vLLM'],
    href: 'https://github.com/tanujdargan/nixos',
  },
]

export const community = [
  { title: 'Hack@JBCNOsh', role: 'Founder', detail: 'Started my high school\'s hackathon in Mumbai. 450+ participants.', when: '2022' },
  { title: 'VikeLabs', role: 'Director of Events', detail: 'UVic\'s student club that builds software for local non-profits.', when: '2025 –' },
  { title: 'CDE 2026', role: 'VP Communications', detail: 'Conference on Diversity in Engineering (CFES), hosted at UVic.', when: '2026', href: 'https://cde2026.cfes.ca' },
]

export const earlier = [
  { title: 'Pear Care', role: 'Lead AI developer', detail: 'Medical-AI agents. Quantized LoRA deployments cut memory 40% at 95%+ F1 on internal triage benchmarks.', when: '2025', href: 'https://pearcare.ai' },
  { title: 'Optimate', role: 'Hack the North 2025 winner', detail: 'YC Unicorn Prize and Federato Best RiskOps. AI underwriting dashboard.', when: '2025', href: 'https://github.com/jruttan1/Optimate' },
  { title: 'Apache Airflow', role: 'MLH fellow with RBC', detail: 'Surfaced missed past DAG runs, fixing a long-standing scheduler logic bug.', when: '2025', href: 'https://github.com/apache/airflow' },
  { title: 'AIMO Progress Prize 2', role: 'Kaggle silver, top 10% of 2,200', detail: 'Multi-stage LLM pipeline for olympiad maths, 54% accuracy.', when: '2025' },
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

// Chapters for the narrative variant. Years before Mumbai are unknown.
export const chapters = [
  { place: 'Dehradun', when: 'early years', line: 'Where it starts.', unverified: true },
  { place: 'Gurgaon', when: 'school', line: 'School years.', unverified: true },
  { place: 'Mumbai', when: '2021 – 2023', line: 'Kaggle notebooks, hackathons in Bengaluru and Kolkata, and a hackathon of my own: Hack@JBCNOsh, 450+ people.' },
  { place: 'Victoria', when: '2024 –', line: 'UVic on the accelerated track. Satellite firmware, GPU retrieval, ocean models, a Hack the North win.' },
  { place: 'Toronto', when: '2026', line: 'Amazon Robotics AI. Return offer. Beri shipping. Interpretability research alongside.' },
]

export const seo = {
  title: 'Tanuj Dargan — ML systems and interpretability',
  description:
    'Tanuj Dargan: CS at UVic (2027). SDE intern at Amazon Robotics AI with a return offer, co-founder of Beri, and interpretability research on activation steering, with live demos.',
}
