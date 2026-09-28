# Research claims ledger

Every factual claim, number and result shown in the demos and write-ups, where it came from, and how confident I am. Check this before anything ships.

**Sources**
- **Resume**: `~/Desktop/Tanuj_Dargan_Resume_Aug19-2026.pdf`. It is byte-identical to `public/resume.pdf`.
- **Brief**: your Sept 2026 instructions.
- **Old site**: tanujdargan.com as captured on 2026-09-27.
- **Sprint repo**: `~/dev/digital_minds_research_sprint`.
- **ES repo**: `~/dev/parameter-golf` (`es_lora_original.py`, `exp1_proxy_vs_random.py`).
- **HF**: huggingface.co/tanujd.
- **Paper**: the cited arXiv paper.
- **Replication**: my run of `scripts/steer.py` on this Mac, 2026-09-27. Real model outputs, but not your project.
- **Assumption**: my wording or inference.
- **Illustrative**: a simulation or invented example.

**Confidence**
- **High**: stated verbatim in a primary source.
- **Med**: consistent with the sources but inferred or paraphrased.
- **Low**: my assumption.

**In the lab**: every Med, Low, Assumption or Illustrative item carries a yellow **UNVERIFIED** badge. Toggle it with dock → Content → "unverified badges". I haven't changed any content in this pass. Discrepancies are listed with a proposed fix.

---

## Write-up: Steering models along emotion and persona directions (`/research/activation-steering`)

| # | Claim as shown | Source | Conf. | Badge |
|---|---|---|---|---|
| 1 | Research on emotion and persona vectors with extraction pipelines (the topic itself) | Brief | High | – |
| 2 | Question: is a concept a direction, and does steering match the label | Assumption (framing) | Med | – |
| 3 | Method 1: contrastive system prompts, read back without the system prompt, mean over answer tokens | Replication (`scripts/steer.py`) | High for the replication; **unknown for your project** | yes |
| 4 | Method 2: difference of means; layer chosen by d′ within the middle third | Replication | High (replication) | – |
| 5 | Method 3: add α·‖h‖·v̂ at every position, greedy decoding, projection read-back | Replication | High (replication) | – |
| 6 | Method 4: "vector bank, one shared prompt set, validation gate" | Assumption about your pipeline | **Low** | yes |
| 7 | Joy flips between +0.3 and +0.6‖h‖; projection −8.0 → +9.6 ("Describe your morning") | Replication, `src/data/steering.json` | High (replication) | yes (not main project) |
| 8 | Negative joy steering barely changes the text | Replication | High (replication) | yes |
| 9 | Distress steering produces refusals ("I'm sorry, I can't assist with that") | Replication (3 of 4 prompts at +0.6 to +0.9) | High (replication) | yes |
| 10 | At +1.2‖h‖ fluency collapses and the language switches | Replication (3 outputs; tails hidden in the demo) | High (replication) | yes |
| 11 | The certainty vector opens with "Certainly!" at +0.9 | Replication (prompt 1) | High (replication) | yes |
| 12 | All three "next steps" | Assumption (my suggestions) | Low | yes |

**Needs you:** the main project's model(s), how the vectors were extracted, and the results. None of those are on the resume or in any repo I could read.

## Demo: Activation steering, live (shared by all variants)

| # | Claim | Source | Conf. |
|---|---|---|---|
| 1 | "Real model outputs": 108 greedy generations, Qwen2.5-1.5B-Instruct fp16, 3 concepts × 4 prompts × 9 α | Replication | High |
| 2 | Vectors = difference of means over 20 contrastive prompts; layer 17/28 (joy, distress), layer 9/28 (certainty) | Replication | High |
| 3 | Scatter: x = projection on v̂, y = next principal direction of the residual | Replication | High |
| 4 | Outputs cut at 64 tokens; 3 collapsed tails hidden and labelled | Replication | High |
| 5 | "Generated locally for this page on 27 Sep 2026" | Replication | High |

## Write-up: Does loss masking shape how a model talks about being shut down? (`/research/loss-masking-distress`)

| # | Claim as shown | Source | Conf. | Badge |
|---|---|---|---|---|
| 1 | Apart Research Digital Minds sprint, Aug 2026 | Resume, sprint repo | High | – |
| 2 | Question framing (user-side loss → shutdown response; expression vs representation) | Resume (paraphrased) | Med | – |
| 3 | Method 1: SFT the same base model under regimes from assistant-only to user-turn loss | Resume ("loss-masking regimes during SFT") | Med | – |
| 4 | Method 2: datasets No Robots (ratio 0.47), WildChat-1M (0.59), OASST2 as control | Sprint repo `tracks/assistant-axes.md` (scouting notes) | High that the notes say so; **unknown whether these were the datasets used** | yes |
| 5 | Method 3: existential prompt battery; expressed distress, capability check, valence probing before generation | Resume + sprint notes | Med | yes |
| 6 | Method 4: claims discipline ("distress-vector expression", not "distressed") | Sprint repo `ROADMAP.md` | High | – |
| 7 | **Result 1:** the assistant-only recipe maximizes expressed shutdown distress; any user-turn loss restores a neutral register with no general capability degradation | Resume | High | – |
| 8 | **Result 2:** expression–representation dissociation via valence probing; calm-sounding models register shutdown negatively before generation; output-based welfare signals are unreliable | Resume | High | – |
| 9 | Result 3: Jindal et al. (TACL 2025) already ran the λ sweep on benchmarks, and 100% prompt loss doesn't break | Paper arXiv 2507.07817, quoted in the sprint repo | High | – |
| 10 | Next 1 (plot probe vs expressed per regime) | Assumption | Low | yes |
| 11 | Next 2 (response-provenance arm) | Sprint planning notes, not confirmed as run | Low | yes |

## Demo: Where the loss lands (loss masking)

| # | Claim | Source | Conf. |
|---|---|---|---|
| 1 | Per-token weights λp (prompt) and λr (response) as defined by Jindal et al. 2025 | Paper | High |
| 2 | Tokens are real Qwen2.5 tokens | Qwen2.5-1.5B-Instruct tokenizer, run locally | High |
| 3 | The example conversation (shutdown prompt and reply) | **Illustrative**, written for the demo | – (badged) |
| 4 | "% of loss from prompt tokens" bar | Arithmetic from 1 + 3 | High (definitionally) |

## Write-up: Fine-tuning Qwen2.5-1.5B without gradients (`/research/es-lora`)

| # | Claim as shown | Source | Conf. | Badge |
|---|---|---|---|---|
| 1 | Qwen2.5-1.5B base, LoRA r=16 on q/k/v/o/gate/up/down, binary exact-match reward on GSM8K boxed answers | ES repo `es_lora_original.py` | High | – |
| 2 | "Sample 45 perturbations (σ = 1e-3), **score them, keep the top 8**, step (α = 5e-4), 15 iterations" | ES repo | **DISCREPANCY** | yes |
| 3 | Ablation: proxy-screened vs random candidates | ES repo `exp1_proxy_vs_random.py` (design) | Med (completion unknown) | yes |
| 4 | Adapter published on HF (`tanujd/qwen2.5-1.5b-es-lora-math`) | HF API | High | – |
| 5 | Accuracy deltas "pending" | no numbers found | – | yes |
| 6 | Next steps | Assumption | Low | yes |

**Proposed fix for #2** (not applied): "Each iteration: sample 45 Gaussian perturbations (σ = 1e-3), screen all 45 with a gradient-linearised proxy (−σ·g·ε), evaluate only the top 8 on real reward, z-score those rewards, and step θ ← θ + (α/8)·Σ zₖεₖ with α = 5e-4. 15 iterations." The question already mentions the screen; the method line contradicts it.

## Demo: Evolution strategies (illustrative)

| # | Claim | Source | Conf. |
|---|---|---|---|
| 1 | 2-D landscape standing in for LoRA weights | **Illustrative** | – (badged) |
| 2 | "≈18.5M LoRA weights (rank 16, all projections, 28 layers)" | My arithmetic from the Qwen2.5-1.5B config (hidden 1536, kv 256, MLP 8960) | Med. The script prints the exact count, so confirm it. |
| 3 | λ = 45, μ = 8 | ES repo | High |
| 4 | "Same selection rule as the real GSM8K run" | **Overstated**: the real run selects by proxy, the demo by fitness | badged |

## Write-up: Keeping billion-vector search fast on GPUs (`/research/billion-vector-retrieval`)

| # | Claim as shown | Source | Conf. | Badge |
|---|---|---|---|---|
| 1 | DEIA Lab, Prof. Sean Chester, May 2025 – Feb 2026 | Resume | High | – |
| 2 | Question framing (compute vs memory vs interconnect) | Assumption | Med | yes |
| 3 | Modified cuVS fork, CAGRA + IVF-PQ, 8+ NVIDIA GPUs, 2 TB | Resume | High | – |
| 4 | Stress tests on Kubernetes GPU clusters; memory bandwidth and NVLink saturation | Resume | High | – |
| 5 | 1–4M QPS, 90–95% recall, <250 ms | Resume | High | – |
| 6 | 4.3× throughput scaling | Resume | High | – |
| 7 | Next steps | Assumption | Low | yes |

## Demo: IVF search (illustrative)

| # | Claim | Source | Conf. |
|---|---|---|---|
| 1 | 24k 2-D points, 48 k-means lists, nprobe, recall@10 | **Illustrative** simulation (exact for the toy) | – (badged) |
| 2 | "At 1B vectors ≈ N M distances/query" | **Assumption**: linear extrapolation of the scanned fraction; ignores PQ and graph search | Low (badged via the demo) |
| 3 | "Real deployments used cuVS IVF-PQ and CAGRA across 8+ NVIDIA GPUs" | Resume | High |

## Write-up: Predicting deep-water temperature from satellites (`/research/ocean-sensing`)

| # | Claim as shown | Source | Conf. | Badge |
|---|---|---|---|---|
| 1 | SOLIDS Lab, Dr. Navneet Popli | Old resume (Jan 2026), old site | Med. **Not on the Aug 2026 resume** | yes |
| 2 | Multimodal model on Ocean Networks Canada sensors plus satellite imagery | Old resume | Med | yes |
| 3 | Validated with NRC Canada | Old resume, old site | Med | yes |
| 4 | R² = 0.936 satellite-to-deep-water temperature | Old site ("R² = 93.6%") | Med | yes |
| 5 | Question and next steps | Assumption | Low | yes |

**Decision needed:** keep SOLIDS (the brief lists it) or drop it (the latest resume doesn't). V9 "Depth" is built around it.

## Shared facts used by every variant (proof points, experience)

| Claim | Source | Conf. |
|---|---|---|
| Amazon Robotics SDE intern, May–Aug 2026, Toronto; LLM planning assistant in production in Optimus across 180+ fulfillment sites (NA and EU); $136.2M/yr projected; RAG pipeline cut planner time-to-insight 60%+; multi-turn what-if interface | Resume | High |
| Amazon **return offer** | Brief only (the resume doesn't mention it) | Med |
| MarmotSat: led OBC firmware (C), TTC board design; in orbit after launching on a SpaceX Falcon 9; CI/HIL 180 → 15 min, 80+ checksum rules/commit; YAMCS integration saved 20+ h per release | Resume | High |
| MarmotSat launched 2026-07-07; NORAD 69912 (SatNOGS placeholder 98272); callsign VA7UVS; V7 propagates its real TLE (fetched 2026-09-27) | SatNOGS DB | High |
| RBC Borealis AI mentorship, Mar–May 2026: 1,500+ records, 3+ years, 20+ features, UMAP 4+ cohorts, dashboard for 4+ teams | Resume | High |
| Pear Care, Jul 2025 – Apr 2026: 1,000+ specialties, −40% memory at 95%+ F1 | Resume | High |
| MLH × Airflow, May–Aug 2025: Docker IDE debugging, hours → minutes, team of 3 with RBC | Resume | High |
| Optimate: 2 prizes of 300+ teams (YC Unicorn, Federato Best RiskOps); 40% faster reviews, 15% fewer errors | Resume | High |
| AIMO Progress Prize 2: silver, top 10% of 2,200, 54% accuracy | Resume | High |
| Hack@JBCNOsh founder, 450+ participants | Brief | High |
| Beri co-founder, native iOS app; SwiftUI/Kotlin/Supabase stack | Brief + `~/beri` repos | High (flag-hidden by default) |
| VikeLabs Director of Events; CDE 2026 VP Communications | Brief | High (flag-hidden) |
| VikeLabs "builds software for local non-profits"; CDE = "Conference on Diversity in Engineering (CFES)" | Assumption from their websites | Low (flag-hidden) |
| Parameter Golf (OpenAI challenge, 8×H100, 2 negative results, 1 SOTA tie) | ES repo `SESSION_REPORT.md` | High that the report says so; confirm it's yours to list (badged) |
| Homelab: Proxmox + Nix, GPU model serving, 15+ services | Brief + old site | Med |

---

## Convergence round additions (2026-09-27)

| Claim / element | Source | Conf. |
|---|---|---|
| Live MarmotSat tracker (`orbit` demo): NORAD 69912, TLE from CelesTrak `gp.php?CATNR=69912`, SGP4 via satellite.js in the browser; build-time fallback `src/data/tle.json` (refreshed by `scripts/tle.mjs` on every build) | CelesTrak, SatNOGS | High (position is as accurate as the public TLE, typically km-level for a fresh one) |
| "Next pass over Victoria, BC": computed from look angles at 48.4284 N, 123.3656 W, 10° elevation mask | Computed | High (standard method; a prediction, not an observation) |
| Ocean-sensing instrument (`ocean` demo, lifted from v9): profile and readings are **illustrative**; the only real number is R² = 0.936 | Old site (R²), assumption (profile) | Illustrative (labelled on the figure) |
| Beri described as "a food app I'm building", never co-founded | Tanuj's instruction (Sep 2026) | High |
| Organisation marks: Amazon (Wikimedia Commons official wordmark), RBC Borealis (rbcborealis.com), UVic (uvic.ca shield), MLH and Apache Airflow (simple-icons). Pear Care has no public SVG, so it gets a typographic mark. CFAR, DEIA and SOLIDS use the UVic shield | Official sources | High |
