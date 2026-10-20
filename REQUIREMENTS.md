# REQUIREMENTS: tanujdargan.com, the one site

Built from `DIAGNOSIS.md`, your notes, and your Phase 2 answers. Facts come from the Aug 19 2026 resume (`public/resume.pdf`) and `src/content/site.ts`, traced in `RESEARCH_CLAIMS.md`. Nothing here is invented. Where a source is weak, it says so.

**Your Phase 2 answers, as decisions**

| Question | Answer |
|---|---|
| Lab source | Pushed on `redesign`. Demos, logos and write-ups are reused from it. |
| Lead reader | Both, equal weight: research labs and recruiters/founders. |
| Hero | You want to see the options. Built as **Gate A** (below). |
| Demo depth | You want to see the options. Built as **Gate B** (below). |
| Theme | Follows system light/dark, with a manual toggle. Both themes fully designed. |
| Type | **One typeface** for everything, including numbers and demos. |
| Claims OK to show | Amazon return offer · ES-LoRA · Ocean (SOLIDS Lab, R² 0.936, NRC) |
| Claims NOT shown | Homelab, Parameter Golf, Hive, Drop, Wedding Studio, Hack@JBCNOsh (not confirmed, and not on the resume) |
| Write-ups | Yes. Restyled, at `/research/<slug>`. |

---

## 1. The 10-second test

**After 10 seconds, a visitor knows:**
1. This person ships production ML *and* does interpretability / model-welfare research.
2. The three proofs: an LLM planning assistant **in production at Amazon across 180+ sites**, **firmware for a satellite now in orbit**, and **a model-welfare finding** (loss masking decides whether a model voices shutdown distress).
3. The research is real and inspectable. Live demos are right there.

**And can, without scrolling on a 390×844 phone:**
- open the resume PDF (one tap, visible label "Resume")
- reach GitHub, LinkedIn, X, Email (one tap each)
- see that a live demo exists and start it (one tap, or it is already running, depending on Gate B)

**Within 30 seconds, they can:** try a demo, see every role with its logo, and open a write-up.

---

## 2. Sections, in order, with word budgets

Budgets count visible words in the default (collapsed) state. The whole main page is **≤ 650 visible words** (v4b had 1,561, P2 had 491).

| # | Section | Budget | Notes |
|---|---|---|---|
| 0 | Header (sticky, compact) | ≤ 10 | Wordmark, nav, Resume, socials, theme toggle |
| 1 | Hero (first screen) | ≤ 70 | Plus the demo's own text if the hero holds a demo |
| 2 | Selected work (5 items) | ≤ 300 | 4 with demos, plus Amazon |
| 3 | More work (compact rows) | ≤ 100 | |
| 4 | Experience + education | ≤ 140 | Bullets behind expand, not counted |
| 5 | Contact | ≤ 25 | |
| 6 | Footer | ≤ 15 | |
| + | Write-up pages `/research/<slug>` | ≤ 450 each | Existing copy, restyled |

---

## 3. Content per section (sourced)

### 0 · Header
- Wordmark "Tanuj Dargan" at body size (≤ 16 px, medium weight). This is the only place the name appears above the fold. **No display-size name anywhere.**
- Nav: Work · Experience · Contact.
- Resume (PDF) as a labelled button. GitHub, LinkedIn, X, Email as icon buttons with accessible names. Theme toggle.
- On mobile: wordmark, Resume, and a compact socials group, all visible. No hamburger for these.

### 1 · Hero
- **Thesis (≤ 16 words), proposed:** "I ship production ML systems and study what language models represent inside." (Paraphrases the existing site line. Final wording is yours to approve.)
- **Context line (≤ 10 words):** "CS at the University of Victoria, graduating April 2027." (Resume.)
- **Three proofs, each with a colour logo (≤ 14 words each):**
  - Amazon Robotics: "LLM planning assistant in production across 180+ fulfillment sites. Return offer." (Resume, plus your confirmation of the return offer.)
  - UVic CfAR: "Led onboard-computer firmware for MarmotSat, now in orbit after a Falcon 9 launch." (Resume.)
  - Apart Research: "Showed SFT loss masking decides whether a model voices shutdown distress." (Resume.)
- Resume + socials (same as the header, larger on mobile if the header ones are icon-only).
- Demo per Gate A.

### 2 · Selected work
Each item shows: **outcome title** (≤ 12 words, no codenames), **finding** (≤ 30 words), **spec row** WHERE · WHEN · RESULT (≤ 12 words), the **demo** (per Gate B), and a **Write-up →** link where one exists.

| Order | Outcome title | Finding (source) | Demo (provenance label) |
|---|---|---|---|
| 1 | Loss masking decides whether a model voices shutdown distress | Assistant-only loss maximizes expressed distress; any user-turn loss restores a neutral register without capability loss. Calm-sounding models still represent shutdown negatively, so output-based welfare signals are unreliable. (Resume) | "Where the loss lands": real Qwen2.5 tokens; the example conversation is labelled *illustrative* |
| 2 | Steering a language model along emotion directions | Joy steering is a switch, not a dial: between +0.3 and +0.6‖h‖ the read-back projection jumps −8.0 → +9.6. (Replication on Qwen2.5-1.5B-Instruct, see ⚠ below) | Live steering: real outputs, 108 greedy generations |
| 3 | LLM planning assistant in production at Amazon | Optimus, 180+ fulfillment sites (NA + EU). RAG over historical labor plans cut planner time-to-insight 60%+. $136.2M/yr projected savings. (Resume) | No demo. A typographic metric panel with the Amazon logo. No screenshots of internal tools. |
| 4 | Satellite firmware, now in orbit | Led MarmotSat OBC firmware in C and TTC board design; CI/HIL cut testing 180 → 15 min. (Resume.) NORAD 69912 (SatNOGS) | Live tracker: real TLE, SGP4 in the browser, next pass over Victoria |
| 5 | Deep-water temperature from satellite imagery | Multimodal model on Ocean Networks Canada sensors plus satellite imagery; R² 0.936, validated with NRC Canada. SOLIDS Lab, UVic. (Old resume/site, confirmed by you) | Probe: labelled *illustrative* |

> ⚠ **Sign-off needed on steering.** `RESEARCH_CLAIMS.md` shows the steering outputs and numbers come from a **replication run generated for the site** (`scripts/steer.py`, 27 Sep 2026), not from your own steering project's results. The plan is to keep the demo, label it plainly ("Method replicated on Qwen2.5-1.5B-Instruct for this page"), and make the write-up's Method section describe that run. If you have your main project's results, send them and they'll replace these numbers.

### 3 · More work (one row each: title · one line ≤ 18 words · link)
- **Billion-vector search on GPUs**: DEIA Lab, Prof. Sean Chester. Modified cuVS fork: 1–4M QPS at 90–95% recall, under 250 ms, 4.3× scaling. (Resume) → write-up
- **Fine-tuning Qwen2.5-1.5B without gradients**: evolution strategies on a LoRA, binary GSM8K reward; adapter on Hugging Face. (ES repo, confirmed by you) → write-up. *The method-line discrepancy flagged in RESEARCH_CLAIMS.md gets the proposed fix applied.*
- **Optimate (Hack the North 2025)**: 2 prizes from 300+ teams (YC Unicorn, Federato Best RiskOps). (Resume) → GitHub
- **AIMO Progress Prize 2**: silver medal, top 10% of 2,200 teams, 54% accuracy. (Resume)
- **Beri**: "A food app I'm building." Never "founder" or "co-founder". → getberi.com

### 4 · Experience + education
One row per role: colour logo · role · org · dates · one line (≤ 18 words) · expand for resume bullets. Reverse chronological by start date:

1. Amazon Robotics, SDE Intern, May–Aug 2026, Toronto
2. RBC Borealis, AI/ML Research Mentee, Mar–May 2026
3. Pear Care, Lead AI Developer, Jul 2025 – Apr 2026
4. DEIA Lab (UVic), Undergraduate Researcher, May 2025 – Feb 2026
5. MLH Fellowship · Apache Airflow, SWE Fellow, May–Aug 2025
6. UVic CfAR, Software Developer & Undergraduate Researcher, Apr 2025 – Apr 2026

Education, one line: University of Victoria, B.S. Computer Science (accelerated 3-year), April 2027, International Scholarship.

### 5 · Contact
"Research programs, labs and founders: email is fastest." Then the email with a copy button, and labelled links: GitHub, LinkedIn, X, Resume (PDF, Aug 2026).

### 6 · Footer
© 2026 Tanuj Dargan, and one line on demo provenance ("Demos run in your browser. Labels say what's real.").

---

## 4. Decision gates (first thing in Phase 3)

You asked to see the options. These are **built on the same components and content**, so the comparison is fair and no work is thrown away. Only the losing compositions get deleted.

**Gate A: hero composition** (first screen only, desktop + mobile):
- **A1 · Proof line + live demo.** Thesis, three proof cards with logos, Resume + socials, and the steering demo live in a panel beside them (desktop) or directly below them (mobile).
- **A2 · Demo is the hero.** The steered sentence is the headline and the slider rewrites it. Thesis and proofs sit in a compact strip under it.
- **A3 · Work index is the hero.** Thesis line, then 5 outcome-titled work rows with logos and tiny live previews. Tap a row to open its demo in place.

**Gate B: demo depth** (the Selected work section):
- **B1 · One live, rest open in place.** Steering is live. The others show a static, data-drawn preview plus the finding and open into the full demo in place.
- **B2 · All live inline.** Each demo mounts when it scrolls near the viewport.
- **B3 · Previews on page, demos on write-ups.** Lean page, and each demo lives on its write-up.

I'll send screenshots of all six, plus the measured weight and LCP of each. You pick one A and one B, then the build continues as one site.

---

## 5. Visual direction

**Type: one family, Geist (variable).** It's used for everything: UI, headings, body, numbers, α values, model names, tokens. Data uses `font-variant-numeric: tabular-nums` and weight or colour, not a second face. Geist Mono is not loaded.
- Scale (mobile → desktop): 13 / 15 / 17 body / 22 / 28 / 40 max. **No size above 40 px anywhere.**
- Weights 400 / 500 / 600 only. Sentence case everywhere. **No all-caps tracked micro-labels.**
- Body measure 60–70 characters. Line-height 1.5 for body, 1.15 for headings.

**Density:** an airy page with dense objects. Generous section spacing (96–128 px desktop, 64–80 px mobile), but each work item is a compact block: title, finding, spec row, demo. No section is a screen of empty black or white.

**Palette:** follows system theme, with a toggle and persisted choice.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F7F6F2` warm paper | `#111113` |
| `--surface` (cards, rows) | `#FFFFFF` | `#18181B` |
| `--panel` (demo instrument) | `#EFEEE8` | `#1E1E22` |
| `--ink` | `#17171A` | `#EDECE7` |
| `--muted` | `#5D5D66` | `#9C9CA5` |
| `--rule` | `#E2E0D8` | `#2A2A2F` |
| `--accent` (links, focus, active) | `#C2410C` | `#FF8A4C` |

Colour comes from the work, not decoration: the org logos in full colour, plus demo data colours (joy orange, distress violet, satellite blue, ocean teal) used **inside demos only**. All text pairs pass WCAG AA 4.5:1 in both themes.

**Logos:** the official full-colour marks from `docs/logos/SOURCES.md` (Amazon, RBC, UVic, CfAR, MLH), 32 px in rows and 40 px in hero proofs. They sit directly on the surface. Where a mark needs a ground (the UVic reversed shield), it gets its own brand-colour tile, and no generic white squircles. Pear Care has no public logo, so it gets a neutral typographic mark. That's flagged in the "not done" list until you supply one.

**Demos:** one **demo shell** (evolved from `src/demos/Frame.tsx`), identical for every demo:
- Head: demo title (sentence case) and a provenance chip ("Real model outputs" / "Real data" / "Real tokens" / "Illustrative").
- Body: the demo on `--panel`, with a 12 px radius and a 1 px rule. No glow, no gradients.
- Foot: a one-line caption (what to try) and a "Method" disclosure.
- **Every demo has a meaningful resting state:** steering opens at a contrast (α −0.9 vs +0.9, or a shown before/after), loss masking opens on the regime that shows the finding, and the tracker opens on the live position plus next pass.

---

## 6. Motion principles

**Motion only shows cause and effect, or real time.** If a motion doesn't tell the visitor something, it doesn't ship.

| Where | What moves | What it communicates | Spec |
|---|---|---|---|
| Steering demo | The sentence changes word by word as α changes (crossfade on changed words); the projection dot slides | "This control causes this output" | ≤ 200 ms ease-out per change |
| Steering, first view (only if Gate A/B puts it on screen) | One slow sweep from α 0 → +0.9, once, then it stops | "Drag this" | ≤ 2.5 s, cancelled by any input, never repeats |
| Loss masking | Token highlights recolour when the regime changes | Where the loss moved | 150 ms |
| MarmotSat tracker | The satellite moves in real time | It's live, and it's real | Continuous, 1 Hz updates OK |
| Row expand (experience, work) | Height and opacity | The detail opened in place, here | 200–240 ms |
| Hover/focus | Colour/underline/background | Interactivity | ≤ 120 ms |

**Off limits:** scramble/decoding text, scroll-jacking and smooth-scroll libraries (Lenis is removed from the main route), pinned/scrubbed scroll sections, parallax, ambient particle fields or point clouds as background, shaders or dithering, cursor followers, fade-up-on-scroll for text, page transitions over 200 ms, anything looping forever except the live satellite.

**Reduced motion:** no sweep, instant swaps, rows open without animation, satellite position updates every 10 s. Every demo stays fully usable.

---

## 7. Do not (from DIAGNOSIS.md and your notes)

1. Don't put the name at display size. It appears once, at body size, in the header.
2. No section-level metaphor (timeline axis, board, signal, spec sheet, latent space). The page is a document with live figures.
3. No codename titles ("Steering", "Retrieval", "Evolution", "Ocean"). Every work title states the outcome.
4. No context-free giant numbers. A number always sits in a sentence or a labelled spec row.
5. No HUD decoration: coordinate readouts, centroid labels, UTC clocks, `CH 01 /06`, all-caps tracked micro-labels, live telemetry tickers in the header.
6. No gimmick toggles: HUMAN/MACHINE, Tour, Lens, Tune in, "your cursor is a query vector".
7. No content said twice (no timeline and then an index of the same items).
8. No photography, timelapses, stock images, video backgrounds or screenshots of internal tools. No heavily compressed media. Logos are SVG.
9. No floating panels over content, and no fixed elements besides the compact header.
10. No hover-only affordances. Everything works by tap and keyboard.
11. No demo that opens on its least interesting state.
12. No claims outside the resume or your Phase 2 confirmations. Beri is "a food app I'm building", never founder or co-founder. Steering is labelled as a replication.
13. No second typeface, and no mono body text.
14. No near-black-only palette. Both themes have warm surfaces and full-colour logos.
15. No lab dock, lab badges or "unverified" flags on the production route.

---

## 8. Performance and accessibility bar

Measured on the production build (`npm run build`, prerendered), with Lighthouse mobile preset and a real Chromium:

| Metric | Bar |
|---|---|
| LCP (mobile) | **< 2.5 s required**, < 1.5 s target |
| CLS | < 0.02 |
| TBT (mobile) | < 200 ms |
| Lighthouse performance (mobile) | ≥ 95 |
| Lighthouse accessibility | ≥ 98 (100 target) |
| Initial JS for `/` (gzip, excluding demo chunks) | ≤ 110 KB |
| Fonts | One variable woff2, subset, preloaded, metric-matched fallback (zero font-swap shift) |
| Demo loading | Each demo is its own chunk, loaded on intent (visible/near-viewport or tap). three.js loads only with the tracker. |
| Frame rate | 60 fps during demo interaction; no long task > 50 ms on input |

**Accessibility:** mobile-first from 360 px, no horizontal scroll, touch targets ≥ 44 px, visible focus rings, a skip link, semantic headings in order, sliders as native `input[type=range]` with `aria-valuetext`, segmented controls as radio groups, AA contrast in both themes, `prefers-reduced-motion` honoured (§6), `prefers-color-scheme` honoured with a toggle, and the page fully readable with JS disabled (SSR prerender already exists).

---

## 9. Build and ship plan

1. **Gate A + B** (§4): six screenshots plus measurements, and you pick.
2. Build as a new variant `main` in the existing registry, so `/lab/*` keeps working untouched. `PROD_VARIANT = 'main'`, so `/` serves the new site and `/research/<slug>` serves restyled write-ups.
3. Section by section: header + hero → selected work → more work → experience → contact/footer → write-up pages. After each one, desktop + mobile screenshots go to you, checked against this document and §7 first.
4. Finish: Lighthouse report, a short scroll recording, and a "not done" list.
5. When you approve and the build passes: squash into **one commit on `main`** and push. The Phase 1–3 docs (DIAGNOSIS.md, REQUIREMENTS.md) are included unless you say otherwise.

**Known open items (will be on the not-done list unless resolved):** a Pear Care logo, your main steering project's results (if you want them instead of the replication), final thesis wording.
