# DIAGNOSIS: why eight versions produced nothing shippable

Reviewed on 2026-10-16 against the preview deployment (`/lab`). I opened every version in Chromium at 1440×900 desktop and 390×844 mobile and scrolled each one end to end. I used the interactions (steering slider by drag and keyboard, emotion tabs, every "Run demo", the MarmotSat tracker, S1 row open, S3 card fly-in and List mode, S4 Lens and channel switch, the S5 Human/Machine toggle, the lab bar's Subtle/Expressive/Content modes) and ran each version under `prefers-reduced-motion`. I also read one write-up page. The screenshots are in the session scratchpad.

## Measured, side by side

| | Page height (desktop / mobile) | Words on page | Typefaces | Lighthouse mobile perf | TBT | Name size in hero |
|---|---|---|---|---|---|---|
| v4b | 13,630 / 14,465 px | 1,561 | JetBrains Mono + Martian Mono | 83 | 660 ms | ~150 px, full width |
| v6 | 9,658 / 11,686 px | 1,467 | Newsreader + Geist Mono | 70 | 7,180 ms | ~100 px |
| P2 | 3,239 / 4,916 px | 491 | Inter + Geist Mono | **98** | 150 ms | ~48 px |
| S1 | 2,192 / 3,768 px | 342 | Geist + Geist Mono | **100** | 80 ms | 14 px (nav only) |
| S2 | 6,497 / 5,888 px | 758 | Serif + Mono | 66 | 3,320 ms | 14 px (nav only) |
| S3 | 900 (board) | 503 | IBM Plex + Mono | 92 | 240 ms | 14 px |
| S4 | 2,526 / 3,218 px | 282 | Mona Sans Condensed + Martian Mono | 66 | 3,020 ms | 14 px |
| S5 | 5,700 / 8,172 px | 1,081 | Instrument Sans + JetBrains Mono | 83 | 680 ms | 12 px caps |

(Lighthouse ran in a container with software WebGL, which inflates TBT for the canvas-heavy versions. The relative ranking holds. LCP was under 2 s everywhere, so the cost shows up as main-thread time, not load.)

---

## Per version

**v4b · Narrative: the work.** *Works:* The first screen has the best one-glance proof of any version: three cards (Amazon Robotics · MarmotSat, in orbit · Interpretability research), each with one sentence, plus Resume and socials as labelled pills. *Fails:* The name is set at ~150 px in monospace across the full width. Then come 15 scroll-pinned "pieces" in chronological order, so the 2022 high-school hackathon and AIMO come before Amazon. Each piece is led by a context-free giant stat ("Top 10%", "50K+", "Neutral", "+9.6"). An Index then repeats all of it: 14,000 px and 1,500 words, everything in mono.

**v6 · Latent space.** *Works:* The scene is real activations from Qwen2.5-1.5B, so the decoration is the research, and that's the only version where this is true. It keeps the same three-line proof stack, and the content is grouped by theme (Interpretability / Systems / Industry / Hardware / Earlier) instead of by date. *Fails:* The name is huge again. A fixed steering panel sits over the content on every screen and overlaps text on mobile. Section titles scramble through glyphs (`%?+**@!`) before they resolve. The panel at rest shows the model's dullest output ("As an AI language model, I don't have the ability…"). TBT is 7 s.

**P2 · SWE classic.** *Works:* You can read it in five seconds. Colour org logos, one outcome line with a number per role, rows that expand for detail, a solid Resume button with icon socials in the first viewport, and demos inline with honest "Real" / "Illustrative" labels and a Method link. Fastest page (98). *Fails:* It leads with Experience, so research and the demos sit below the fold behind "Run demo". It reads like a well-made template (your "plain and lifeless"). The name is the largest element on the left. On mobile the top 40 % of the first screen is empty.

**S1 · Index.** *Works:* It's the shortest and fastest, the Work list is the hero, the name is demoted to the nav, and rows open into the demo in place. *Fails:* The work titles are jargon ("Retrieval", "Evolution", "Ocean"), so a recruiter can't tell what any of them is. Amazon, the strongest credential, isn't in Work at all. The hover lens does nothing on touch. Below the list it's an Experience list and a black void with an email address.

**S2 · Latent (v6 elevated).** *Works:* The demo is the hero: drag α and the headline rewrites itself. That's the strongest single idea in the lab. *Fails:* At rest, the largest text on the whole site is a model refusal. Every section heading scrambles (`@%=] !~{!$#@ and shutdown distress`) and screenshots catch them mid-glitch. The point cloud drifts behind body copy, and a floating chapter pill stacks on top of the lab bar on mobile.

**S3 · Board.** *Works:* It's genuinely novel, the minimap is well made, and it has a List fallback. *Fails:* To read anything you have to pan and zoom. At 44 % overview the text is unreadable and the experience card shows grey skeleton bars instead of text, so it looks unfinished. On a phone it's a canvas you drag around, which is the opposite of a 10-second skim.

**S4 · Signal.** *Works:* It has a strong, distinctive frame, and the channel list (Steering / MarmotSat / …) is a clear table of contents. *Fails:* The dither turns the chart labels into pixel noise ("projection on v̂" is barely legible), the condensed type and "Tune in / Lens / CH 01" metaphor need decoding, and after the hero it's mostly empty black. TBT is 3 s.

**S5 · Spec.** *Works:* It has the most complete demo set (the MarmotSat globe with real next-pass times is the best version of the tracker). The WHERE / WHEN / DATA / RESULT table is exactly what a research reviewer wants, and the contact block is clean. *Fails:* The header crams in a UTC clock, live lat/long and a nav, inactive exhibits are dimmed so they look disabled, "Selected work" repeats on every exhibit, and the HUMAN/MACHINE switch is a gimmick. It runs 8,000 px on mobile.

---

## Recurring problems: why many rounds produced nothing

**1. The process optimized for concepts, not for the 10-second read.** Every round started from a metaphor (narrative axis, latent space, board, signal, spec sheet) and poured the same six demos and six roles into it. The metaphor became the deliverable. There was never a fixed written answer to "what must a visitor know after 10 seconds", so nobody could score a version against it. Each round was judged on taste, felt wrong, and the next round swapped metaphors instead of fixing hierarchy. Eight re-skins of identical content is the symptom.

**2. The inspiration was the wrong genre.** basement.studio, Unseen, Koto and Analogue are agencies. Their sites exist to show off visual craft because visual craft is what they sell. You're selling research judgment and shipped systems. Borrowing their spectacle (shader screens, pannable boards, scramble type, dithering) imported their goal along with it, so in every studio version the frame upstages the work.

**3. The hierarchy is wrong, and the best credential keeps getting lost.** The strongest facts are: an LLM assistant in production at Amazon across 180+ sites, firmware for a satellite now in orbit, and a model-welfare finding from the Apart sprint. These compete with your name (v4b, v6, P2), get pushed below chronology (v4b), or are missing from "Work" (S1, S3, S4 put Amazon under Experience only). Only v4b and v6 put all three in the first screen, and both bury them under a 100–150 px name.

**4. Work is labelled by internal codename, not by outcome.** "Steering", "Retrieval", "Evolution", "Ocean" mean something to you. To a recruiter they mean nothing, and to a lab reviewer they're vague. Compare "Loss masking during SFT decides whether a model voices shutdown distress". Giant context-free numbers ("Neutral", "+9.6", "8 of 45") make it worse: they're loud and unreadable.

**5. The demos don't perform at rest.** Every steering demo opens at α = 0 and shows the model's most boring sentence. The payoff (a refusal turning into "Oh, the perfect day starts with a gentle breeze…") only appears if the visitor knows to drag. The loss-masking demo opens on a λp slider at 0.0 with no stated finding above it. A demo that needs instructions to be interesting fails the 10-second test, however good it is underneath.

**6. Density swings between overload and void.** v4b and v6 run 1,500 words and 10–14k px, and v4b says everything twice (timeline, then Index). S1 and S4 drop to ~300 words and fill the rest with black. Neither extreme was set by a word budget. Every version also leans on the same "terminal HUD" micro-labels: `C02 centroid (-7, 2, -150)`, `X 1455 Y 0841 44%`, `CH 01 /06`, UTC clocks. It looks like information but it's decoration, and it makes every page feel busy without adding signal.

**7. Motion is spectacle, not explanation.** Point clouds drift behind text, headings scramble, chart labels dither, cameras fly through clusters. Little of it tells the visitor anything. Some of it actively hides content (scrambled headings, dithered labels), and it costs 3–7 s of main-thread time on mobile. The one motion that does communicate (the headline rewriting as α changes, in S2) is the idea worth keeping.

**8. Type and colour change every round, so there's no identity.** That's eight type pairings in eight versions. v4b sets body copy in monospace. All eight are near-black with one accent. The only real colour on any page is the org logos, and they sit in white squircles. That's why even the motion-heavy versions read as "lifeless": the palette has no warmth and no light/dark rhythm.

**9. Gimmicks were added to make versions feel different.** HUMAN/MACHINE, Tour, Lens, Tune in, "your cursor is a query vector", the lab-bar Expressive mode. Each one costs attention and none of them helps a reviewer decide.

**10. Mobile was an afterthought.** The hover previews (S1) don't exist on touch, S3 is a pan canvas, v6's floating panel and S2's chapter pill collide with content, and P2's first mobile screen is 40 % empty. Your audience often opens the link from LinkedIn or email on a phone.

**11. Some claims aren't on the resume.** "Return offer" appears in v4b, v6, P2 and the OG description, and it isn't on the August resume. ES-LoRA, Ocean sensing (SOLIDS Lab, R² 0.936), Homelab, Parameter Golf, Hive, Drop, Wedding Studio and Hack@JBCNOsh come from the existing site, not the resume. The lab has a `Content` flag for "UNVERIFIED badges", which suggests this was already a known worry. These need your sign-off, not mine.

---

## What v6 and P2 do right that the others don't

**Both put proof in the first viewport and label demos honestly.** P2 and v6 both have three outcome lines (or six rows) above the fold, each with a concrete number, and both mark demos "Real model outputs" or "Illustrative" with a Method link. That honesty is what makes a research reviewer trust the rest.

**v6:** The visual is the work. Real activations, not a decorative shader. Grouping by theme (Interpretability / Systems / Industry / Hardware) tells a reviewer what kind of researcher you are, which chronology never does. The serif body gives it warmth that no mono-only version has.

**P2:** Restraint and speed. It uses one type family, colour logos at a consistent size, and one line per role with progressive disclosure (expand for bullets). Resume is the primary button with socials beside it, and the page scores 98 on mobile performance. It's the only version where you could find any fact in under five seconds.

**What neither does:** neither leads with the work. P2 leads with a résumé list, v6 leads with your name, and both stay too quiet or too dark to feel alive.

The design to build is roughly P2's information architecture and speed, plus v6's "the real research is the visual" idea, without the name billboard or the HUD.

---

## Demos and components: keep, rework, cut

### Demos

| Demo | Verdict | Why / what changes |
|---|---|---|
| **Activation steering** (Qwen2.5-1.5B, joy / distress / certainty, prompt picker, read-back projection plot) | **Keep core, rework presentation** | Real outputs, and it's the best thing in the lab. Don't open at α = 0: start at a contrast (for example −0.9 vs +0.9 side by side) or play one short sweep on first view. Put the finding in one sentence above it ("Joy is a switch, not a dial: read-back jumps −8.0 → +9.6 between α +0.3 and +0.6"). The P2/S5 layout (text left, projection plot right) is the right base. |
| **Loss masking / shutdown distress** ("Where the loss lands", real tokens, regime tabs) | **Keep, rework** | The token-highlight view is clear and real. It needs the result stated above it, and the regime tabs (Assistant only / Whole sequence / Prompt only) should be the primary control, ahead of the λp slider. Pair it with the expression-vs-representation result, which is the headline finding. |
| **MarmotSat live tracker** (real TLE, SGP4 in browser, globe, next pass over Victoria) | **Keep as-is (S5/P2 version)** | It's real data, it's live, and anyone gets it instantly. Lazy-load it and keep the "Real: public TLEs, SGP4 in your browser" footnote. Cut the header telemetry ticker that S5 adds. |
| **Ocean sensing probe** (lower the probe, predicted vs sensor) | **Keep, tighten** | You asked for it, and it's intuitive. It's illustrative, so keep the label, and make the probe a single drag with one readout row instead of four stat boxes. |
| **Retrieval IVF / nprobe** | **Demote** | Illustrative, and the claim (1–4M QPS on 8+ GPUs) is about throughput, which a point cloud doesn't show. A row with the numbers is enough. Not on your keep list. |
| **ES-LoRA evolution contour** | **Demote or cut** | Illustrative and not on the resume. Not on your keep list. |
| **v6 latent point cloud** (30k real activation points) | **Cut as background.** Possibly reuse as the steering demo's plot | It's real data used as wallpaper, at 7 s TBT. |

### Components

| Component | Verdict |
|---|---|
| P2 experience row (date · colour logo · role · one-line outcome · expand) | **Keep.** Make the logos larger and show them in colour without the white tile on a light surface. Use the real Pear Care logo, not a "pc" monogram. |
| v4b/v6 three-proof hero (three short cards) | **Keep the idea** as the hero's proof line. |
| S5 WHERE / WHEN / DATA / RESULT spec table | **Keep** for each research item. |
| P2 Resume primary button + icon socials | **Keep**, and make the button label "Resume (PDF)". |
| S1 row-opens-in-place pattern | **Keep** as the way demos open. Drop the hover lens. |
| P2 "Real / Illustrative + Method" labels | **Keep** in every demo. |
| Write-up pages (Question / Method / Result / Next) | **Keep the content**, and restyle them to match the new site. They're the best long-form material you have. |
| S5 contact block (labelled rows + copy email) | **Keep.** |
| v4b scroll-pinned timeline axis, S3 board, S4 dither screen, scramble text, HUMAN/MACHINE, Tour, Lens, UTC/telemetry tickers, HUD micro-labels | **Cut.** |
