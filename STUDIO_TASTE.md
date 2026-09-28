# STUDIO_TASTE.md: what makes a studio site feel expensive

Research round, 2026-09-28. Every studio below was loaded in headless Chromium (Metal or SwiftShader WebGL) at 1440×900 and iPhone 15. I recorded a slow wheel/touch scroll, hovered the work, clicked into one case study, read computed styles, and grepped the bundles for libraries, easings and durations.

- Raw notes: `research/studios/NOTES-A.md` and `NOTES-B.md`.
- The pattern catalogue (59 patterns with sources, mechanics, fit, cost and a reduced-motion fallback): `research/PATTERNS.md`.
- Captures (screenshots and mp4 scroll recordings, 45 MB): `research/studios/<slug>/` and `research/patterns/`. They're kept locally and gitignored, since they're third-party material.

## URL log

| Studio | URL used | How it was confirmed |
|---|---|---|
| basement | https://basement.studio | Title "basement.studio \| We make cool shit that performs"; footer "the team behind the Geist typeface" |
| Cloud Studio | https://cloudstudio.es | ⚠ `cloud.studio` is an IoT SaaS. cloudstudio.es is the Awwwards entry "Cloudstudio: this site is awake" (Jul 2026, Design Agencies). Light yellow theme, so I took mechanics only |
| Shader | https://www.shader.se | Title "Shader Development Studio", Norrköping; Awwwards SOTD. `shader.studio` is unrelated |
| Analogue | https://analogueagency.com | Title "Analogue · Brand & Digital Design Agency · Amsterdam"; `analogue.agency` is parked |
| Unseen | https://unseen.co | Title "Unseen Studio®", "Design Studio of the Year – Awwwards" |
| Neon | https://www.neonrated.com | ⚠ neon.studio, neon.design and neon.co are parked or dead. The only award-level "Neon" is NEON the film studio (Awwwards SOTD, Feb 2026, by 27b). Light theme, so I took mechanics only |
| Koto | https://koto.com | `koto.studio` 301-redirects here; the site holds Koto's own Amazon, Instagram and Fitbit cases |
| Kode | https://kodemedia.com and https://kodeimmersive.com | Both Awwwards SOTD; the Immersive footer gives the kodemedia.com email. Other "Kode" domains are for sale or unrelated |
| Cofounder | https://cofounder.co | ⚠ An AI product site (designed by Altalogy), listed on Godly with an Awwwards Honorable Mention. No design studio called Cofounder has a live award-level site. Light theme, so I took mechanics only |

Three names (Cloud Studio, Neon, Cofounder) were ambiguous. I used the award-listed site in each case and flagged it. They're logged as assumptions on the board.

---

## Per studio: the concrete techniques

### basement.studio (dark; the closest to this site's temperament)
- **Type:** Geist only. H1 87px/600 at **line-height 0.9, tracking −4%**. Section heads 76px at #C4C4C4 (display in *grey*, not white). Project names 38px. Geist Mono only for the HUMAN/MACHINE toggle.
- **Colour:** #000 with a strict grey ramp (#E6E6E6, #C4C4C4, #757575, #2E2E2E) and one accent, **#FF4D00**. The accent appears only on the "Online" dot, the active nav item, and the MACHINE page.
- **First screen:** **11 words.** The hero is a real 3D scene of their own studio, drawn first as **white wireframe edges with dithered pixel noise**, which resolves into the lit render around 6s. The loading state *is* the intro.
- **Work:** a sticky accordion. The active project's media grows from a strip to ~390px while the previous one collapses. A `[View Project]` chip follows the cursor over media (200ms ease-out fade).
- **Case page:** a **240px sticky spec sheet** (Client with favicon / Year / Type / Awards / Link) with hairline rules, three short paragraphs, "More Projects" pinned at the bottom, and an edge-to-edge 8px-gap mosaic on the right.
- **Transition:** the screen goes fully black at 300ms, then the case mounts.
- **Signature:** a fixed **HUMAN / MACHINE** pill. MACHINE is an orange-on-black monospace plain-text mirror of the whole site for agents.
- **Why it feels expensive:** the craft is spent on one real object (their room), and everything else is quiet grey type.

### Cloudstudio (light yellow; mechanics only)
- **Type:** Bricolage Grotesque 158px/700 at **−4.5% tracking, line-height 0.9**. Mono labels 10–12px uppercase in parentheses: "( CHOOSE YOUR DRIVER )". Ghost numerals at 576px and 5% alpha behind cards.
- **Motion tokens (read from `:root`):** `--ease-out (0.16,1,0.3,1)` ×51, `--ease-back (0.34,1.56,0.64,1)` ×13, and durations 200/340/500/700ms. One curve family across the whole site.
- **Work cards are working miniatures:** live animated bars, a flow graph, and bobbing chips like "$0.0142 / RUN" and "ENGINE ONLINE". Metrics count up in mono, right-aligned against the title.
- **Hover (measured):** the card goes **grey to full colour over 550ms** and the image scales over 900ms. The ↗ pops on back-out over 450ms. **The cursor morphs into a "CASE STUDY" pill** (size and radius over 300ms).
- **Transition:** an iris wipe (a black circle grows from the click point).
- **Trap:** a Matter.js physics box captured touch scroll on iPhone. Never put a drag surface in the scroll path on mobile.

### Shader (dark violet; everything is WebGL)
- **One coherent fiction:** a 1985 software company. It has a DOS boot loader (a segmented progress bar tied to real asset loading), **CRT post-processing over the entire viewport** (barrel, scanlines, fringe, bloom on type), and fax-coupon contact.
- **Work is shown inside objects:** a Commodore PET's screen cycles project clips about once a second, and a **curved 3D film strip** holds one project in focus at a time.
- **All visible type is canvas;** the DOM is a clean accessible mirror (skip link, buttons, carousel labels).
- **Section snapping** with camera moves, and the URL hash syncs.
- **Lesson:** a single idea carried into every surface, including the loader, reads as *authored*. **Cost:** WebGPU-first rendering goes black where WebGPU is broken until it falls back. Always ship the fallback.

### Analogue (light, with a navy WebGL hero)
- **Words: 133 on the whole home page.** The images carry it, and **there are no captions on the work.**
- **The label lives in the nav:** a frosted pill "WORK · analogue · ABOUT" **relabels and recolours per project as you scroll** ("Vitra: 100 years Panton · SEE CASE", in orange with the logo). This is the signature.
- **Type:** Graphik 60px at **−5% tracking**, set letter by letter. Intro glyphs fade over up to 2s on `cubic-bezier(0.44,0,0,1)` with stagger. The nav is in a dot-matrix LCD face (a tiny idiosyncratic detail).
- **Scroll:** the full-bleed hero shrinks into an inset rounded card while the headline **splits in two and slides apart**.
- **Case opener:** a solid brand-colour block, with words springing in (400ms, 75ms per word, a `linear()` spring).
- Only two CSS transitions exist site-wide. Restraint in the tool count.

### Unseen Studio (light, pink 3D world; Studio of the Year)
- **Everything is one continuous 3D world:** routes are **camera moves**, not page loads (Highway.js swaps the DOM under the canvas).
- **Type:** Saol Display (serif, italic) against Neue Montreal. **The active nav state is a change of typeface** (roman to italic), not colour. The menu is 90px serif items with 9px superscript indices.
- **Projects grid:** WebGL planes that **bend with scroll velocity** (edges curl, then relax on `expo.out` ~1s).
- **Case titles** are mask-revealed line by line (`expo.out`, ~1s, ~0.1s stagger). A hollow ring cursor has a hold state.
- **Eases in the bundle:** `expo.out` ×45, `power2.out` ×29, `expo.in` ×26. CSS: `transform 1s (0.16,1,0.3,1)`.
- **Words: 96 on home.** **Trap:** the letter-cycling route loader stalled for over 5s on a slow load.

### Neon (NEON film studio; light, mechanics only)
- **Per-item accent re-theme:** each film sets `--accent`, and the nav capsule, the CTA tray, the progress bar and even the **title type** tint to it (~0.3s).
- A floating nav capsule with a **context tray** whose one CTA changes per section.
- **Title-first transitions:** the new page shows black with the title already in place at 450ms, and the media fades in under it by 900ms. There's never a blank screen.
- **Tokens:** `--ease-out (0.16,1,0.3,1)`, `--ease-snappy (0.19,1,0.22,1)`, `--ease-anticipate (1,-0.4,0.35,0.95)`, and a spring written as a CSS `linear()` curve.
- Girott 160px uppercase at −3%. 10 words on the first screen.

### Koto (dark, #060606; the closest model for the "clarity" variants)
- **Display is capped at 48px** on a 1440 screen. Seven sizes total (48/38/16/14/12/11/9). **Two-tone headings** replace eyebrows: line 1 white, line 2 #989898 ("Our work / Amazon").
- A **9–11px uppercase mono metadata layer**, including a live clock ("23:59 UTC-7").
- **Focused-card index:** a sticky left column ("Our work / {project}") swaps to the card crossing the centre, and every other card dims to ~20%. One thing is lit at a time.
- **Shared-element transition:** the clicked card's media grows into the case hero in ~0.7s on `cubic-bezier(.65,0,.35,1)`, and a sticky chapter rail with an active dot fades in.
- A nav pill that **tweens its width** to fit the breadcrumb (0.4s).
- **Frame-quantised timing:** .083 / .167 / .333 / .667s (5, 10, 20, 40 frames at 60fps). Sharp symmetric in-out curves make it mechanical and deliberate.

### Kode (Kode Media and Kode Immersive)
- **One accent used as an event:** #FF4C00 appears almost only as the **full-screen page wipe** (scaleX from the left, ~0.4s in and out, `cubic-bezier(.38,.005,.215,1)`, which appears ×60 in the bundle), the asterisk, and "LONDON".
- **Caption syntax:** `TITLE / CLIENT // DIRECTOR`, with "//" as the separator everywhere.
- A `mix-blend-mode: difference` nav that never needs a background.
- **Kode Immersive:** OT Brut at 200px and **−8% tracking**. A glass chevron **refracts the actual headline** behind it. A **pinned services sequence** ("001 IDEATE / 002 / 003 DELIVER") morphs one 3D object per step, with a "[ 036 ]" scroll-percent counter. A loader counter "008 → 100" and a logo type-scramble. A Rapier physics pile of 3D letters in the footer.
- **6 visible words** on the Kode Media first screen.

### Cofounder (AI product; light, mechanics only)
- **Numbered-chapter IA** in Plex Mono 11px uppercase at +0.12em and 50% alpha: "1.0 — LAUNCH", "2.1". Two-tone statements at 80% and 50% alpha.
- **Live status toasts** with slight 3D perspective ("● Task completed").
- **Pixel-mono numeric tickers** (Departure Mono) for every changing number.
- Card media lifts 72px on hover (0.5s `(.22,1,.36,1)`), revealing the CTA underneath.
- A sticky ToC with ○/● dots and a **tick-mark minimap** of scroll position.

---

## The expensive recipe (what all nine share)

1. **Almost no words.** First screens range from 6 to 22 visible words, and home pages from 96 to 373 (only Cloudstudio and Cofounder run over 1,000, and they're the least studio-like). The work carries the page, and labels are 9–12px mono.
2. **The work is live, not a thumbnail.** Every studio's work cards are autoplaying media. Cloudstudio's are *working miniatures*. For this site the media is the demos themselves, which is a stronger position than any studio has.
3. **One focus at a time.** Koto dims inactive cards to 20%, Shader shows one frame on a film strip, basement's accordion collapses the rest, and Analogue has one label in the pill. Hover or scroll picks *the one*; the rest recede.
4. **Display type tight and big, or capped and quiet, never in between.** Either −4% to −8% tracking at line-height 0.9 (basement, Kode, Analogue, Cloudstudio), or capped at 48px with two tones (Koto). Body copy never competes.
5. **One curve family.** Expo-out `(0.16,1,0.3,1)` shows up at Cloudstudio, Unseen and Neon (the others use near relatives: `(0.19,1,0.22,1)`, `(0.22,1,0.36,1)`, `(0.23,1,0.32,1)`), with one sharp in-out for transitions (`(.65,0,.35,1)`, `(.87,0,.13,1)`) and one back-out for pops. The durations are a short fixed set.
6. **One accent colour, used as an event.** Kode's orange is the transition itself, and basement's orange is only "live" and "active". Neon gives each item its own accent and re-themes the chrome to it.
7. **Transitions keep continuity.** Koto's card becomes the hero, Unseen moves a camera, Neon puts the title first, Kode wipes in the accent colour. No studio does a plain fade.
8. **An authored fiction or object.** Shader's 1985 company, basement's room, Unseen's pink world, Kode's glass chevron. The site has a *thing*, and the loader belongs to it.
9. **The nav does double duty.** Analogue's pill becomes the project label, Koto's pill becomes a breadcrumb, Neon's capsule carries a context CTA, and Unseen shows the active page as a typeface change.
10. **An instrument layer.** Live clocks, "Online (3)", "[ 036 ]" scroll counters, "ENGINE ONLINE" chips, count-ups. Small mono telemetry makes a site feel running.

**Traps seen live:**
- Drag or physics surfaces stealing touch scroll (Cloudstudio).
- Gates and route loaders that stall (Unseen) or that recruiters won't sit through.
- WebGPU-only rendering with no fallback (Shader goes black).
- Canvas-only text with no DOM mirror.
- Light themes. The owner won't accept them.

---

## What this means for S1+ (the rules the variants were built against)

| Rule | Source | In practice |
|---|---|---|
| ≤ 25 visible words on the first screen, excluding link labels | all nine | the name is small; the first screen is a live demo or a live index of the work |
| The work is live | Cloudstudio, Koto, Shader | index rows and cards run a real miniature of their demo (poster → live on hover or focus) |
| One lit thing | Koto, Shader, basement | hover or centre-focus dims the rest to ~25% and pauses their loops |
| Type is the motion carrier | Unseen, Analogue, Kode | line masks, scramble decodes, variable-weight settles, split headlines; every variant moves type |
| Tokens | Cloudstudio, Unseen, Neon | `--ease-out: cubic-bezier(.16,1,.3,1)`, `--ease-io: cubic-bezier(.65,0,.35,1)`, `--ease-back: cubic-bezier(.34,1.56,.64,1)`; 167 / 333 / 500 / 700 / 900 ms, scaled by `--t` |
| One accent as an event | Kode, basement, Neon | a demo's own colour floods the transition into it; otherwise greys |
| Custom transition into the work | Koto, Kode, Neon, Unseen | shared element or accent wipe or camera move, never a default fade |
| An authored object per variant | Shader, basement | each S variant has one idea that runs through the loader, the nav and the transitions |
| Instrument layer | Koto, basement, Kode | mono telemetry from real data: MarmotSat's live position and UTC, read-back projection, QPS |
| Mobile is designed, not degraded | Koto, Thibault, Gil | hover becomes a scroll-centred active row or tap-to-preview; drag surfaces never sit in the scroll path; WebGL DPR ≤ 1.5 |
| Machine mirror (borrowed idea) | basement | worth one variant: an ML engineer's site with a plain-text mode for agents |
